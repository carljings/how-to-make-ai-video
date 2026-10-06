// render.mjs: drive index.html in headless Chrome.
//   node render.mjs --serve                                   preview server for a normal browser (http://localhost:8123)
//   node render.mjs --sheet=4,4.8,5.2 [--cols=4] [--w=480]    contact sheet → out/sheet.jpg (or --out=...)
//   node render.mjs --range=0:14:1 [--cols=5]                 contact sheet of a time range (start:end:step)
//   node render.mjs --stills=12.5,40 --out=out/stills         full-resolution JPEG stills
//   node render.mjs --frames=0:170 [--workers=4]              every frame → out/frames (resumable)
//   node render.mjs --audio                                   synthesize the soundtrack → out/mix.wav
//   node render.mjs --encode [--out=out/137.5.mp4]            loudness-normalize the mix and mux it with the frames
//   node render.mjs --clip=40:50                              quick MP4 preview of a range, with sound if out/mix.wav exists
//   node render.mjs --srt                                     bilingual subtitles → out/137.5.srt
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, renameSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve, normalize } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const ROOT = resolve(dirname(new URL(import.meta.url).pathname));
const CHROME = args.chrome || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(p => existsSync(p));
import { FPS, DUR } from './src/timeline.js';
const FRAMES = join(ROOT, 'out/frames');
const PORT = +(args.port || 8123);

// Static file server; POST /save?path=out/x writes the request body (used to export the audio)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.jpg': 'image/jpeg', '.png': 'image/png' };
function serve(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/save') {
      const rel = normalize(url.searchParams.get('path') || '').replace(/^(\.\.[/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(join(ROOT, 'out'))) { res.writeHead(403); return res.end('only out/ is writable'); }
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

const run = (cmd, a, opts = {}) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit', ...opts }); p.on('close', c => (c ? bad(new Error(`${cmd} exited ${c}`)) : ok())); });

async function launch() {
  if (!CHROME) throw new Error('Chrome not found: pass --chrome=<path> or set CHROME_PATH');
  return puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 0,
    args: ['--no-sandbox', '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars', '--mute-audio',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
      '--autoplay-policy=no-user-gesture-required', ...(args.gpu ? [] : ['--enable-unsafe-swiftshader'])],
  });
}
async function openPage(browser, tag = '') {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(`[page${tag}] ${m.text()}`); });
  page.on('pageerror', e => { console.log(`[page error${tag}] ${e.message}`); process.exitCode = 1; });
  await page.goto(`http://localhost:${PORT}/index.html?render`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.READY === true', { timeout: 120000 });
  return page;
}
const b64 = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const parseTimes = s => String(s).split(',').map(Number);
const parseRange = s => { const [a, b, st] = String(s).split(':').map(Number); const out = []; for (let t = a; t <= b + 1e-9; t += st || 1) out.push(+t.toFixed(3)); return out; };

const server = await serve(PORT);
try {
  if (args.serve) {
    console.log(`studio: http://localhost:${PORT}/  (Ctrl+C to stop)`);
    await new Promise(() => {});
  } else if (args.sheet || args.range) {
    const times = args.sheet ? parseTimes(args.sheet) : parseRange(args.range);
    const browser = await launch(), page = await openPage(browser);
    const out = args.out || 'out/sheet.jpg';
    mkdirSync(dirname(join(ROOT, out)), { recursive: true });
    const { url, ms } = await page.evaluate((ts, c, w) => window.sheet(ts, c, w), times, +(args.cols || 4), +(args.w || 480));
    writeFileSync(join(ROOT, out), b64(url));
    console.log(`${out}  ms/frame: ${ms.map(x => x.toFixed(0)).join(' ')}`);
    await browser.close();
  } else if (args.stills) {
    const browser = await launch(), page = await openPage(browser);
    const out = args.out || 'out/stills';
    mkdirSync(join(ROOT, out), { recursive: true });
    for (const t of parseTimes(args.stills)) {
      const t0 = Date.now(), url = await page.evaluate(t => window.frame(t, 0.95), t);
      const f = `${out}/t${t.toFixed(2).replace('.', '_')}.jpg`;
      writeFileSync(join(ROOT, f), b64(url));
      console.log(`${f}  ${Date.now() - t0} ms`);
    }
    await browser.close();
  } else if (args.frames) {
    const [a, b] = String(args.frames).split(':').map(Number), workers = +(args.workers || 4);
    mkdirSync(FRAMES, { recursive: true });
    const first = Math.round(a * FPS), last = Math.min(Math.round(DUR * FPS) - 1, Math.round(b * FPS) - 1);
    const todo = [];
    for (let i = first; i <= last; i++) { const f = join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`); if (!existsSync(f) || statSync(f).size < 2000) todo.push(i); }
    console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), ${workers} workers`);
    let next = 0, done = 0;
    const start = Date.now();
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const browser = await launch(), page = await openPage(browser, '#' + w);
      while (next < todo.length) {
        const i = todo[next++], f = join(FRAMES, `f${String(i).padStart(5, '0')}.jpg`);
        let url;
        try { url = await page.evaluate(t => window.frame(t, 0.95), i / FPS); }
        catch (e) { console.log(`frame ${i} (t=${(i / FPS).toFixed(3)}) failed: ${e.message.split('\n')[0]}`); process.exitCode = 1; continue; }
        writeFileSync(f + '.tmp', b64(url)); renameSync(f + '.tmp', f);
        if (++done % 60 === 0 || done === todo.length) {
          const el = (Date.now() - start) / 1000;
          console.log(`frame ${done}/${todo.length}  ${((el / done) * 1000).toFixed(0)} ms/frame effective  eta ${(((todo.length - done) * el) / done / 60).toFixed(1)} min`);
        }
      }
      await browser.close();
    }));
  } else if (args.audio) {
    const browser = await launch(), page = await openPage(browser);
    const t0 = Date.now();
    const info = await page.evaluate(() => window.renderAudio('out/mix.wav'));
    console.log(`out/mix.wav  ${info.seconds.toFixed(1)} s  peak ${info.peakDb.toFixed(1)} dBFS  rms ${info.rmsDb.toFixed(1)} dBFS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    await browser.close();
  } else if (args.encode) {
    const out = args.out || 'out/137.5.mp4';
    const n = readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length;
    if (n < Math.round(DUR * FPS)) console.log(`warning: only ${n} of ${Math.round(DUR * FPS)} frames present`);
    // Master the mix: gain to -14 LUFS integrated, then a lookahead limiter at 4× oversampling (catches inter-sample peaks). Iterate until within 0.3 LU.
    const measure = f => { const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
      const j = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1)); return { I: +j.input_i, TP: +j.input_tp }; };
    const src = measure(join(ROOT, 'out/mix.wav'));
    let gain = -14 - src.I, fin;
    for (let k = 0; k < 4; k++) {
      await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', join(ROOT, 'out/mix.wav'),
        '-af', `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.74:attack=3:release=80:level=disabled,aresample=48000`, '-c:a', 'pcm_s16le', join(ROOT, 'out/mix_norm.wav')]);
      fin = measure(join(ROOT, 'out/mix_norm.wav'));
      if (Math.abs(fin.I + 14) < 0.3) break;
      gain += -14 - fin.I;
    }
    console.log(`mix ${src.I.toFixed(1)} LUFS → ${fin.I.toFixed(1)} LUFS, true peak ${fin.TP.toFixed(1)} dBTP (gain ${gain.toFixed(1)} dB)`);
    await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-stats',
      '-framerate', String(FPS), '-i', join(FRAMES, 'f%05d.jpg'), '-i', join(ROOT, 'out/mix_norm.wav'),
      '-map', '0:v', '-map', '1:a',
      '-vf', `noise=c0s=${args.grain ?? 5}:c0f=t+u,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf || 20), '-profile:v', 'high', '-tune', 'film',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', join(ROOT, out)]);
    console.log(`wrote ${out} (${(statSync(join(ROOT, out)).size / 1048576).toFixed(1)} MB)`);
  } else if (args.srt) {
    // Bilingual subtitles from the timeline, plus the closing title
    const { CAPTIONS, CUE } = await import('./src/timeline.js');
    const extra = [{ t0: CUE.title[0], t1: CUE.title[1], zh: '137.5° · 一个角度', en: '137.5° · One angle' }];
    const all = [...CAPTIONS, ...extra].sort((p, q) => p.t0 - q.t0);
    const ts = x => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
    const body = all.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${c.zh.replace(/[{}]/g, '')}\n${c.en.replace(/[{}]/g, '')}\n`).join('\n');
    const out = args.out || 'out/137.5.srt';
    writeFileSync(join(ROOT, out), body);
    console.log(`wrote ${out} (${all.length} cues)`);
  } else if (args.clip) {
    const [a, b] = String(args.clip).split(':').map(Number);
    const out = args.out || `out/clip_${a}_${b}.mp4`;
    const browser = await launch(), page = await openPage(browser);
    const hasAudio = existsSync(join(ROOT, 'out/mix.wav'));
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...(hasAudio ? ['-ss', String(a), '-t', String(b - a), '-i', join(ROOT, 'out/mix.wav'), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '160k'] : []),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-shortest', join(ROOT, out)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round((b - a) * FPS), start = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = b64(await page.evaluate(t => window.frame(t, 0.9), a + i / FPS));
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log(`wrote ${out}  (${((Date.now() - start) / n).toFixed(0)} ms/frame)`);
    await browser.close();
  } else {
    console.log('nothing to do; see the usage at the top of render.mjs');
  }
} finally {
  server.close();
}
