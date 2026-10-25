#!/usr/bin/env node
// render.mjs — frame-by-frame renderer for 《AI 也会刷分》 (Opus 5.5; adapted from the music-three-films renderer).
// Drives headless Chrome over the DevTools protocol (Node's built-in WebSocket, no npm deps). The page exposes
// window.film = { ready, error, render(t) }; every frame is a pure function of film time t. Screenshots are piped
// straight into ffmpeg (no frame files). Temporary Chrome profiles go to /dev/shm on Linux (the root disk is full).
//
//   node tools/render.mjs PAGE check
//   node tools/render.mjs PAGE stills OUTDIR 0.8:open,3.3:payoff [--png]
//   node tools/render.mjs PAGE strip OUT.jpg --from 3.0 --to 3.6 [--step 1/30] [--cols 6] [--scale 0.3]  (or --times a,b,c)
//   node tools/render.mjs PAGE video OUT.mp4 --frames N [--first a --last b] [--chunk 90] [--fps 30] [--crf 17] [--parts DIR]
//        → picture-only MP4 rendered in chunks (DIR/NNNNN-NNNNN.mp4, default OUT.parts); finished chunks are kept, so a
//          stopped render resumes; with --first/--last only that range is rendered and nothing is concatenated unless
//          every chunk of 0..N-1 exists.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const pos = [], flags = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--png') flags.png = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
  else pos.push(a);
}
const opt = (k, d) => (flags[k] !== undefined ? flags[k] : d);
const [pageArg, mode, outArg, specArg] = pos;
if (!pageArg || !mode) { console.error('usage: see header of tools/render.mjs'); process.exit(2); }
const PAGE = path.resolve(pageArg), OUT = outArg ? path.resolve(outArg) : null, PAGE_URL = `file://${PAGE}`;
const W = 1080, H = 1920, FPS = +opt('fps', 30);
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const TMP = process.platform === 'linux' && fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir();
const evalNum = (s) => (String(s).includes('/') ? String(s).split('/').reduce((a, b) => a / b) : +s);

async function openPage() {
  const profile = fs.mkdtempSync(path.join(TMP, 'pdx-chrome-'));
  const gl = process.platform === 'darwin' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--hide-scrollbars',
    '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--allow-file-access-from-files',
    '--disable-gpu-shader-disk-cache', '--disk-cache-size=1', '--media-cache-size=1', '--disable-breakpad', '--disable-component-update',
    '--js-flags=--max-old-space-size=1024',
    ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []), ...gl, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = ''; const to = setTimeout(() => rej(new Error('chrome did not start')), 30000);
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(to); res(m[1]); } });
  });
  const port = new URL(wsUrl).port;
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === 'Runtime.exceptionThrown') console.error('[page]', m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type !== 'debug') console.error('[console.' + m.params.type + ']', ...m.params.args.map((a) => a.value ?? a.description));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE_URL });
  const t0 = Date.now();
  for (;;) {
    const s = JSON.parse(await evaluate('JSON.stringify({r: !!(window.film && window.film.ready), e: window.film && window.film.error})').catch(() => '{}') || '{}');
    if (s.e) throw new Error('page error:\n' + s.e);
    if (s.r) break;
    if (Date.now() - t0 > 300000) throw new Error('timeout waiting for window.film.ready');
    await new Promise((r) => setTimeout(r, 200));
  }
  const info = JSON.parse(await evaluate('JSON.stringify({d: window.film.duration, fonts: window.film.fontFiles, scenes: window.film.scenes, ua: navigator.userAgent})'));
  const close = () => { try { ws.close(); } catch {} try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  const frame = async (t, fmt = 'png', q = 92) => {
    await evaluate(`window.film.render(${t}).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const err = await evaluate('window.film.error');
    if (err) throw new Error('page error at t=' + t + ':\n' + err);
    const shot = await send('Page.captureScreenshot', fmt === 'png' ? { format: 'png', optimizeForSpeed: true } : { format: 'jpeg', quality: q, optimizeForSpeed: true });
    return Buffer.from(shot.data, 'base64');
  };
  return { evaluate, frame, close, info };
}

if (mode === 'check') {
  const page = await openPage();
  console.log(JSON.stringify({ duration: page.info.d, fontFiles: page.info.fonts, ua: page.info.ua, scenes: page.info.scenes.length }, null, 1));
  for (const s of page.info.scenes) console.log(`${s.id.padEnd(12)} ${s.t0.toFixed(3).padStart(8)} ${s.t1.toFixed(3).padStart(8)}`);
  page.close(); process.exit(0);
}

if (mode === 'glyphs') {
  // every non-ASCII character in src/**/*.js, measured through each bundled chain ending in two different system
  // generics: equal widths ⇒ a bundled face drew it; different ⇒ it fell through to a system font (machine-dependent)
  const srcDir = path.dirname(PAGE), chars = new Set();
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'fonts') walk(p); } else if (f.endsWith('.js')) for (const ch of fs.readFileSync(p, 'utf8')) if (ch.codePointAt(0) > 126) chars.add(ch); } };
  walk(srcDir);
  const page = await openPage();
  const res = JSON.parse(await page.evaluate(`(() => {
    const cs = ${JSON.stringify([...chars].join(''))}, c = document.createElement('canvas').getContext('2d'), out = {};
    const chains = [['sans', '"F-Sans"', [400, 700, 900]], ['serif', '"F-Serif", "F-Sans"', [900]], ['mono', '"F-Mono", "F-Sans"', [400, 500, 600]], ['cond', '"F-Cond", "F-Sans"', [300, 800]]];
    for (const [k, fam, ws] of chains) for (const w of ws) {
      const miss = [];
      for (const ch of cs) { c.font = w + ' 80px ' + fam + ', serif'; const a = c.measureText(ch).width; c.font = w + ' 80px ' + fam + ', monospace'; const b = c.measureText(ch).width; if (Math.abs(a - b) > 0.01) miss.push(ch); }
      out[k + w] = miss.join('');
    }
    return JSON.stringify(out);
  })()`));
  console.log('non-ASCII characters in sources:', chars.size);
  for (const [k, v] of Object.entries(res)) console.log(k.padEnd(8), v ? 'FALLS THROUGH: ' + v : 'all bundled');
  page.close(); process.exit(0);
}

if (mode === 'stills') {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await openPage();
  for (const item of String(specArg).split(',')) {
    const [ts, name] = item.split(':'); const t1 = Date.now();
    const buf = await page.frame(evalNum(ts), flags.png ? 'png' : 'jpeg', 92);
    const file = path.join(OUT, `${name || ts}.${flags.png ? 'png' : 'jpg'}`); fs.writeFileSync(file, buf);
    console.log(`${file}  t=${ts}s  ${((Date.now() - t1) / 1000).toFixed(2)}s`);
  }
  page.close(); process.exit(0);
}

if (mode === 'strip') {
  const from = evalNum(opt('from', 0)), to = evalNum(opt('to', 1)), step = evalNum(opt('step', '1/30'));
  const cols = +opt('cols', 6), scale = +opt('scale', 0.3);
  const tmp = fs.mkdtempSync(path.join(TMP, 'pdx-strip-'));
  const page = await openPage();
  const times = [];
  if (flags.times) String(flags.times).split(',').forEach((x) => times.push(evalNum(x)));
  else for (let t = from; t <= to + 1e-6; t += step) times.push(Math.round(t * 1000) / 1000);
  const t1 = Date.now();
  for (const [i, t] of times.entries()) fs.writeFileSync(path.join(tmp, `${String(i).padStart(4, '0')}_${t.toFixed(3)}.jpg`), await page.frame(t, 'jpeg', 85));
  console.error(`${times.length} frames in ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  page.close();
  const r = spawnSync('python3', ['-I', path.join(path.dirname(new URL(import.meta.url).pathname), 'sheet.py'), tmp, OUT, String(cols), String(scale)], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(r.status);
}

if (mode === 'video') {
  const N = +opt('frames'), first = +opt('first', 0), last = +opt('last', N - 1), CH = +opt('chunk', 90), CRF = opt('crf', '17');
  if (!N) { console.error('--frames N required'); process.exit(2); }
  const partsDir = path.resolve(opt('parts', OUT.replace(/\.mp4$/, '.parts'))); fs.mkdirSync(partsDir, { recursive: true });
  const name = (a, b) => path.join(partsDir, `${String(a).padStart(5, '0')}-${String(b).padStart(5, '0')}.mp4`);
  const all = []; for (let a = 0; a < N; a += CH) all.push([a, Math.min(N - 1, a + CH - 1)]);
  const mine = all.filter(([a, b]) => a >= first && b <= last);
  const todo = mine.filter(([a, b]) => !fs.existsSync(name(a, b)));
  console.log(`${all.length} chunks total, ${mine.length} in range, ${todo.length} to render → ${partsDir}`);
  const tStart = Date.now(); let done = 0;
  if (todo.length) {
    const page = await openPage(); console.log('page:', page.info.ua, 'fonts', page.info.fonts);
    for (const [a, b] of todo) {
      const final = name(a, b), tmpf = final + '.tmp.mp4';
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',
        '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-crf', CRF, '-pix_fmt', 'yuv420p', '-profile:v', 'high',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709', '-r', String(FPS), tmpf], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f <= b; f++) {
        const buf = await page.frame(f / FPS, 'png');
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
      }
      ff.stdin.end(); const code = await new Promise((r) => ff.on('close', r));
      if (code !== 0) { console.error('ffmpeg failed on chunk', a, b); page.close(); process.exit(1); }
      fs.renameSync(tmpf, final);
      const el = (Date.now() - tStart) / 1000;
      console.log(`chunk ${a}-${b} done · ${done} frames in ${el.toFixed(0)} s (${(el / done).toFixed(2)} s/frame)`);
    }
    page.close();
  }
  if (!all.every(([a, b]) => fs.existsSync(name(a, b)))) { console.log('not all chunks present yet; skipping concat'); process.exit(0); }
  const list = path.join(partsDir, 'concat.txt');
  fs.writeFileSync(list, all.map(([a, b]) => `file '${name(a, b)}'`).join('\n') + '\n');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  console.log(`picture → ${OUT}`);
  process.exit(0);
}
console.error('unknown mode', mode); process.exit(2);
