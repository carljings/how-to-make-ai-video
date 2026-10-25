#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createCanvas, openFilm, ROOT } from './native-film.mjs';

const args = process.argv.slice(2), mode = args[0];
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const OUT = path.join(ROOT, 'out');
const FPS = 30, WIDTH = 1080, HEIGHT = 1920, FRAMES = 4740, CHUNK = 120;
fs.mkdirSync(path.join(OUT, 'review'), { recursive: true });

function fingerprint() {
  const hash = createHash('sha256');
  function scan(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const f = path.join(dir, name), st = fs.statSync(f);
      if (st.isDirectory()) scan(f);
      else { hash.update(path.relative(ROOT, f)); hash.update(fs.readFileSync(f)); }
    }
  }
  scan(path.join(ROOT, 'src'));
  for (const file of ['tools/native-film.mjs', 'tools/render-native.mjs', 'package-lock.json']) hash.update(fs.readFileSync(path.join(ROOT, file)));
  return hash.digest('hex');
}

if (mode === 'stills') {
  const project = path.resolve(opt('source', ROOT));
  const film = await openFilm(project);
  const times = opt('times', '0,0.5,1,3,15,27,33,34.5,40.5,41.5,55,58.5,78.8,94,101,103,108,110.5,111.6,113.3,114.5,116,120.5,122.3,125.5,134,141,146,155,157.9').split(',').map(Number);
  const target = path.resolve(opt('out', path.join(OUT, 'review', 'keyframes')));
  fs.mkdirSync(target, { recursive: true });
  const cols = Number(opt('cols', 5)), width = Number(opt('width', 270));
  const height = width * HEIGHT / WIDTH, rowHeight = height + 34;
  const sheet = createCanvas(cols * width, Math.ceil(times.length / cols) * rowHeight), c = sheet.getContext('2d');
  c.fillStyle = '#17191f'; c.fillRect(0, 0, sheet.width, sheet.height);
  for (const [i, t] of times.entries()) {
    await film.render(t);
    fs.writeFileSync(path.join(target, `t${t.toFixed(3)}.png`), film.canvas.toBuffer('image/png'));
    const x = i % cols * width, y = Math.floor(i / cols) * rowHeight;
    c.drawImage(film.canvas, x, y, width, height);
    c.font = '600 18px "F-Mono"'; c.fillStyle = '#f4f2ee'; c.textBaseline = 'alphabetic';
    c.fillText(`${t.toFixed(3)} s`, x + 9, y + height + 25);
  }
  fs.writeFileSync(`${target}.jpg`, sheet.toBuffer('image/jpeg', 91));
  fs.writeFileSync(`${target}.json`, JSON.stringify({ source: project, times, columns: cols, frames: times.length }, null, 2));
  console.log(JSON.stringify({ sheet: `${target}.jpg`, frames: times.length }));
} else if (mode === 'audio') {
  const { OfflineAudioContext } = await import('node-web-audio-api');
  globalThis.OfflineAudioContext = OfflineAudioContext;
  const { buildSeqs } = await import('../src/seqs.js'); buildSeqs();
  const { renderScore, wav } = await import('../src/score.js');
  const begin = Date.now(), audio = wav(await renderScore());
  const target = path.resolve(opt('out', path.join(OUT, 'audio', 'score-raw.wav')));
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, audio.bytes);
  const report = { file: target, frames: 158 * 48000, sampleRate: 48000, channels: 2, peak: audio.peak, safetyGain: audio.gain, seconds: (Date.now() - begin) / 1000 };
  fs.writeFileSync(target.replace('.wav', '.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} else if (mode === 'worker') {
  const first = Number(opt('first', 0)), last = Number(opt('last', FRAMES)), signature = opt('signature', fingerprint());
  const film = await openFilm(), parts = path.join(OUT, 'picture.parts'); fs.mkdirSync(parts, { recursive: true });
  for (let a = first; a < last; a += CHUNK) {
    const b = Math.min(a + CHUNK, last), name = `${String(a).padStart(5, '0')}-${String(b - 1).padStart(5, '0')}`;
    const final = path.join(parts, `${name}.mp4`), meta = path.join(parts, `${name}.json`);
    if (fs.existsSync(final) && fs.existsSync(meta)) {
      const previous = JSON.parse(fs.readFileSync(meta, 'utf8'));
      if (previous.signature === signature && fs.statSync(final).size === previous.bytes) { console.log(`cached ${name}`); continue; }
    }
    const start = Date.now(), tmp = final.replace('.mp4', '.rendering.mp4');
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${WIDTH}x${HEIGHT}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an',
      '-vf', 'scale=in_range=pc:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709,format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-threads', '2', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', tmp], { stdio: ['pipe', 'ignore', 'pipe'] });
    let error = ''; ff.stderr.on('data', (d) => { error = (error + d).slice(-4000); }); ff.stdin.on('error', () => {});
    const done = once(ff, 'close');
    for (let n = a; n < b; n++) {
      await film.render(n / FPS);
      const data = film.canvas.getContext('2d').getImageData(0, 0, WIDTH, HEIGHT).data;
      if (!ff.stdin.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength))) await once(ff.stdin, 'drain');
    }
    ff.stdin.end(); const [code] = await done;
    if (code) throw new Error(`Encoding ${name} failed: ${error}`);
    fs.renameSync(tmp, final);
    fs.writeFileSync(meta, JSON.stringify({ signature, first: a, last: b, frames: b - a, bytes: fs.statSync(final).size }));
    console.log(JSON.stringify({ part: name, frames: b - a, seconds: (Date.now() - start) / 1000 }));
  }
} else if (mode === 'video') {
  const signature = fingerprint(), begin = Date.now(), split = 2400;
  const script = fileURLToPath(import.meta.url);
  const results = await Promise.allSettled([[0, split], [split, FRAMES]].map(async ([first, last]) => {
    const child = spawn(process.execPath, [script, 'worker', '--first', String(first), '--last', String(last), '--signature', signature], { stdio: ['ignore', 'inherit', 'inherit'] });
    const [code] = await once(child, 'close'); if (code) throw new Error(`Render worker ${first} exited ${code}`);
  }));
  const failed = results.find((x) => x.status === 'rejected'); if (failed) throw failed.reason;
  const parts = [];
  for (let a = 0; a < FRAMES; a += CHUNK) parts.push(path.join(OUT, 'picture.parts', `${String(a).padStart(5, '0')}-${String(Math.min(a + CHUNK, FRAMES) - 1).padStart(5, '0')}.mp4`));
  const list = path.join(OUT, 'picture.parts', 'concat.txt'); fs.writeFileSync(list, parts.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join('\n') + '\n');
  const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', path.join(OUT, 'picture.mp4')], { stdio: ['ignore', 'ignore', 'inherit'] });
  const [code] = await once(ff, 'close'); if (code) throw new Error('Picture concatenation failed');
  const report = { signature, duration: 158, frames: FRAMES, size: '1080x1920', renderer: '@napi-rs/canvas 1.0.13', parts: parts.length, renderSeconds: (Date.now() - begin) / 1000 };
  fs.writeFileSync(path.join(OUT, 'render-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} else {
  throw new Error('Use: node tools/render-native.mjs stills|video|audio');
}
