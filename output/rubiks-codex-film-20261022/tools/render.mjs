import { renderFrame, TIMELINE as T, WIDTH, HEIGHT, FPS, EVENTS } from '../src/film.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url)), OUT = join(ROOT, 'out');
await mkdir(join(OUT, 'review'), { recursive: true });
await writeFile(join(OUT, 'events.json'), JSON.stringify(EVENTS, null, 2) + '\n');
const signature = createHash('sha256');
for (const path of ['src/film.js', 'src/cubes.js', 'src/timeline.json', 'assets/fonts/NotoSC-400.ttf', 'assets/fonts/NotoSC-700.ttf']) signature.update(await readFile(join(ROOT, path)));
const hash = signature.digest('hex');

if (process.argv.includes('--sheet')) {
  const shots = [{ id: 'first-frame', time: .20 }, ...T.scenes.map((s) => ({ id: s.id, time: s.start + (s.end - s.start) * .57 })), { id: 'last-frame', time: T.duration - 1 / FPS }];
  for (const s of shots) {
    const p = join(OUT, 'review', s.id + '.png');
    await writeFile(p, await renderFrame(s.time).encode('png')); s.file = p;
  }
  for (let begin = 0; begin < shots.length; begin += 9) {
    const block = shots.slice(begin, begin + 9), sheet = createCanvas(1080, Math.ceil(block.length / 3) * 670), c = sheet.getContext('2d');
    c.fillStyle = '#e9e7e2'; c.fillRect(0, 0, sheet.width, sheet.height);
    for (let i = 0; i < block.length; i++) {
      const x = i % 3 * 360, y = Math.floor(i / 3) * 670;
      c.drawImage(await loadImage(block[i].file), x, y, 360, 640);
      c.fillStyle = '#1d2930'; c.font = '700 18px MovieSans'; c.fillText(`${block[i].id} · ${block[i].time.toFixed(2)}s`, x + 10, y + 661);
    }
    await writeFile(join(OUT, 'review', `sheet-${Math.floor(begin / 9) + 1}.jpg`), await sheet.encode('jpeg', 91));
  }
  await writeFile(join(OUT, 'review', 'shots.json'), JSON.stringify({ signature: hash, shots }, null, 2) + '\n');
  console.log(JSON.stringify({ mode: 'sheet', frames: shots.length, directory: join(OUT, 'review') }));
  process.exit(0);
}

const partDir = join(OUT, 'parts'); await mkdir(partDir, { recursive: true });
const CHUNK = 300, jobs = [];
for (let a = 0; a < T.frames; a += CHUNK) jobs.push({ a, b: Math.min(T.frames, a + CHUNK) });
const started = Date.now();
async function encode({ a, b }) {
  const name = `${String(a).padStart(5, '0')}-${String(b - 1).padStart(5, '0')}`, path = join(partDir, name + '.mp4'), meta = join(partDir, name + '.json');
  try {
    const old = JSON.parse(await readFile(meta, 'utf8'));
    if (old.signature === hash && (await stat(path)).size === old.bytes) { console.log(JSON.stringify({ cached: name })); return path; }
  } catch {}
  const tmp = join(partDir, name + '.rendering.mp4');
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${WIDTH}x${HEIGHT}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an',
    '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', tmp];
  const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let errors = ''; child.stderr.on('data', (b) => { errors = (errors + b).slice(-4000); });
  child.stdin.on('error', () => {});
  const done = once(child, 'close');
  for (let frame = a; frame < b; frame++) {
    const canvas = renderFrame(frame / FPS), data = canvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT).data;
    if (!child.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength))) await once(child.stdin, 'drain');
  }
  child.stdin.end(); const [code] = await done;
  if (code !== 0) throw new Error(`ffmpeg ${name}: ${errors}`);
  const fs = await import('node:fs/promises'); await fs.rename(tmp, path);
  const bytes = (await stat(path)).size;
  await writeFile(meta, JSON.stringify({ a, b, signature: hash, bytes }, null, 2) + '\n');
  console.log(JSON.stringify({ part: name, frames: b - a, bytes, elapsedSeconds: Math.round((Date.now() - started) / 1000) }));
  return path;
}
const paths = new Array(jobs.length);
let next = 0;
await Promise.all([0, 1].map(async () => { while (next < jobs.length) { const i = next++; paths[i] = await encode(jobs[i]); } }));
const list = join(OUT, 'concat.txt'); await writeFile(list, paths.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
const joined = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-map', '0:v:0', '-c', 'copy', '-movflags', '+faststart', join(OUT, 'picture.mp4')], { stdio: ['ignore', 'ignore', 'inherit'] });
const [code] = await once(joined, 'close'); if (code) throw new Error('concat failed');
await writeFile(join(OUT, 'render-report.json'), JSON.stringify({ signature: hash, frames: T.frames, duration: T.duration, parts: paths, renderSeconds: (Date.now() - started) / 1000 }, null, 2) + '\n');
console.log(JSON.stringify({ picture: join(OUT, 'picture.mp4'), frames: T.frames, seconds: (Date.now() - started) / 1000 }));
