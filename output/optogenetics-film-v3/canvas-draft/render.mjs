// render.mjs: drive index.html in headless Chrome and turn it into a video.
//   node render.mjs --serve                          studio in your browser (http://localhost:8123)
//   node render.mjs --range=0:15:1 [--cols=4]        contact sheet of a time range (start:end:step) → out/sheet.jpg
//   node render.mjs --sheet=4,4.8,5.2                contact sheet of chosen times
//   node render.mjs --frames [=0:15] [--workers=4]   every frame → out/frames (resumable: finished frames are skipped)
//   node render.mjs --audio                          synthesize the soundtrack → out/mix.wav
//   node render.mjs --encode [--out=out/film.mp4]    master the sound to −10 LUFS and mux it with the frames
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, renameSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, DUR, W, H } from './src/timeline.js';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const ROOT = dirname(fileURLToPath(import.meta.url));
const CHROME = args.chrome || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
const FRAMES = join(ROOT, 'out/frames');
const PORT = +(args.port || 8123);
const TOTAL = Math.round(DUR * FPS);

// Static file server. POST /save?path=out/x writes the request body (the page uses it to export the audio).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.png': 'image/png' };
function serve(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/save') {
      const file = resolve(ROOT, normalize(url.searchParams.get('path') || ''));
      if (!file.startsWith(join(ROOT, 'out') + sep)) { res.writeHead(403); return res.end('only out/ is writable'); }
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); });
      return;
    }
    const file = join(ROOT, normalize(decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}

const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => (c ? bad(new Error(`${cmd} exited ${c}`)) : ok())); });

async function launch() {
  if (!CHROME) throw new Error('Chrome not found: pass --chrome=<path> or set CHROME_PATH');
  return puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 0,
    args: ['--no-sandbox', `--window-size=${W},${H}`, '--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
      ...(args.gpu ? [] : ['--enable-unsafe-swiftshader'])],
  });
}
async function openPage(browser, tag = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(`[page${tag}] ${m.text()}`); });
  page.on('pageerror', e => { console.log(`[page error${tag}] ${e.message}`); process.exitCode = 1; });
  await page.goto(`http://localhost:${PORT}/index.html?render`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.READY === true', { timeout: 120000 });
  return page;
}
const b64 = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const frameFile = i => join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`);

const server = await serve(PORT);
try {
  if (args.serve) {
    console.log(`studio: http://localhost:${PORT}/  (Ctrl+C to stop)`);
    await new Promise(() => {});
  } else if (args.sheet || args.range) {
    let times;
    if (args.sheet) times = String(args.sheet).split(',').map(Number);
    else { const [a, b, st = 1] = String(args.range).split(':').map(Number); times = []; for (let t = a; t <= Math.min(b, DUR - 1 / FPS) + 1e-9; t += st) times.push(+t.toFixed(3)); }
    const browser = await launch(), page = await openPage(browser);
    const out = args.out || 'out/sheet.jpg';
    mkdirSync(dirname(join(ROOT, out)), { recursive: true });
    const { url, ms } = await page.evaluate((ts, c, w) => window.sheet(ts, c, w), times, +(args.cols || 4), +(args.w || 480));
    writeFileSync(join(ROOT, out), b64(url));
    console.log(`${out}  ms/frame: ${ms.map(x => x.toFixed(0)).join(' ')}`);
    await browser.close();
  } else if (args.frames) {
    const [a, b] = args.frames === true ? [0, DUR] : String(args.frames).split(':').map(Number);
    const workers = +(args.workers || 4);
    mkdirSync(FRAMES, { recursive: true });
    const todo = [];
    for (let i = Math.round(a * FPS); i < Math.min(TOTAL, Math.round(b * FPS)); i++) if (!existsSync(frameFile(i)) || statSync(frameFile(i)).size < 2000) todo.push(i);
    console.log(`${todo.length} frames to render, ${workers} workers`);
    let next = 0, done = 0;
    const start = Date.now();
    // Each worker is its own Chrome; frames are independent, so they can be shared out in any order
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const browser = await launch(), page = await openPage(browser, '#' + w);
      while (next < todo.length) {
        const i = todo[next++];
        const url = await page.evaluate(t => window.frame(t, 0.95), i / FPS);
        writeFileSync(frameFile(i) + '.tmp', b64(url)); renameSync(frameFile(i) + '.tmp', frameFile(i));
        if (++done % 60 === 0 || done === todo.length) {
          const el = (Date.now() - start) / 1000;
          console.log(`frame ${done}/${todo.length}  ${((el / done) * 1000).toFixed(0)} ms/frame  eta ${((todo.length - done) * el / done).toFixed(0)} s`);
        }
      }
      await browser.close();
    }));
  } else if (args.audio) {
    const browser = await launch(), page = await openPage(browser);
    const info = await page.evaluate(() => window.renderAudio('out/mix.wav'));
    console.log(`out/mix.wav  ${info.seconds.toFixed(1)} s  peak ${info.peakDb.toFixed(1)} dBFS`);
    await browser.close();
  } else if (args.encode) {
    const out = args.out || 'out/film.mp4';
    const n = existsSync(FRAMES) ? readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length : 0;
    if (n < TOTAL) console.log(`warning: only ${n} of ${TOTAL} frames present`);
    // Master the sound: gain to −10 LUFS (the level of comparable Douyin films; the user chose this over the repo's −14),
    // then a limiter at 4× sample rate so the true peak stays under −1 dBTP. Repeat until the loudness is within 0.3 LU.
    const measure = f => {
      const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=I=-10:TP=-1:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const j = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
      return { I: +j.input_i, TP: +j.input_tp };
    };
    const mix = join(ROOT, 'out/mix.wav'), norm = join(ROOT, 'out/mix_norm.wav');
    const src = measure(mix);
    let gain = -10 - src.I, fin;
    for (let k = 0; k < 4; k++) {
      await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', mix,
        '-af', `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.87:attack=3:release=80:level=disabled,aresample=48000`, '-c:a', 'pcm_s16le', norm]);
      fin = measure(norm);
      if (Math.abs(fin.I + 10) < 0.3) break;
      gain += -10 - fin.I;
    }
    console.log(`sound ${src.I.toFixed(1)} → ${fin.I.toFixed(1)} LUFS, true peak ${fin.TP.toFixed(1)} dBTP`);
    // Picture: JPEG frames → H.264, with a little film grain to avoid banding in dark gradients
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-stats',
      '-framerate', String(FPS), '-i', join(FRAMES, 'f%05d.jpg'), '-i', norm, '-map', '0:v', '-map', '1:a',
      '-vf', `noise=c0s=${args.grain ?? 4}:c0f=t+u,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 20), '-profile:v', 'high',
      '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', join(ROOT, out)]);
    console.log(`wrote ${out} (${(statSync(join(ROOT, out)).size / 1048576).toFixed(1)} MB)`);
  } else {
    console.log('nothing to do; see the usage at the top of render.mjs');
  }
} finally {
  server.close();
}
