#!/usr/bin/env node
// render.mjs — frame-by-frame renderer for the three films (Opus 5.5). Drives headless Chrome over the DevTools
// protocol (Node's built-in WebSocket, no npm deps). The page exposes window.film = { ready, error, render(t) }, where
// every frame is a pure function of film time t. Frames are screenshots of the whole page (WebGL/canvas + HTML captions)
// and are piped straight into ffmpeg: no frame files on disk.
//
//   node tools/render.mjs PAGE stills OUTDIR 0.8:open,3.3:payoff [--png]
//   node tools/render.mjs PAGE strip OUT.jpg --from 3.0 --to 3.6 [--step 1/30] [--cols 6] [--scale 0.3]
//        → consecutive frames tiled into one labelled sheet (to review motion between keyframes)
//   node tools/render.mjs PAGE video OUT.mp4 --frames N [--first a --last b] [--chunk 90] [--fps 30] [--crf 17]
//        → picture-only MP4, rendered in chunks (OUT.parts/NNNNN.mp4); finished chunks are kept, so a stopped
//          render resumes where it left off; the parts are concatenated (stream copy) into OUT.mp4 at the end.
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
if (!pageArg || !mode || !outArg) { console.error('usage: see header of tools/render.mjs'); process.exit(2); }
const [pagePath, pageQuery] = pageArg.split('?');
const PAGE = path.resolve(pagePath), OUT = path.resolve(outArg), PAGE_URL = `file://${PAGE}` + (pageQuery ? '?' + pageQuery : '');
const W = 1080, H = 1920, FPS = +opt('fps', 30);
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const GL = opt('gl', process.platform === 'darwin' ? 'metal' : 'swiftshader');
const evalNum = (s) => (String(s).includes('/') ? String(s).split('/').reduce((a, b) => a / b) : +s);

async function openPage() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'three-films-chrome-'));
  const glFlags = GL === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--hide-scrollbars',
    '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--allow-file-access-from-files',
    '--disable-gpu-shader-disk-cache', '--disk-cache-size=1', '--media-cache-size=1', '--disable-breakpad', '--disable-component-update',
    ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []), ...glFlags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
    await new Promise((r) => setTimeout(r, 250));
  }
  const info = await evaluate('JSON.stringify({d: window.film.duration || null, gl: (() => { const c = document.createElement("canvas").getContext("webgl2"); const e = c && c.getExtension("WEBGL_debug_renderer_info"); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })()})');
  const close = () => { try { ws.close(); } catch {} try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  // render(t), wait two animation frames so DOM captions and the canvas are composited, then screenshot the page
  const frame = async (t, fmt = 'png', q = 92) => {
    await evaluate(`window.film.render(${t}).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const shot = await send('Page.captureScreenshot', fmt === 'png' ? { format: 'png', optimizeForSpeed: true } : { format: 'jpeg', quality: q, optimizeForSpeed: true });
    return Buffer.from(shot.data, 'base64');
  };
  return { evaluate, frame, close, info: JSON.parse(info) };
}

if (mode === 'stills') {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await openPage();
  console.error('renderer:', page.info.gl);
  for (const item of String(specArg).split(',')) {
    const [ts, name] = item.split(':'); const t1 = Date.now();
    const buf = await page.frame(evalNum(ts), flags.png ? 'png' : 'jpeg', 92);
    const file = path.join(OUT, `${name}.${flags.png ? 'png' : 'jpg'}`); fs.writeFileSync(file, buf);
    console.log(`${file}  t=${ts}s  ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  }
  page.close(); process.exit(0);
}

if (mode === 'strip') {
  const from = evalNum(opt('from', 0)), to = evalNum(opt('to', 1)), step = evalNum(opt('step', '1/30'));
  const cols = +opt('cols', 6), scale = +opt('scale', 0.3);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'strip-'));
  const page = await openPage(); console.error('renderer:', page.info.gl);
  const times = [];
  if (flags.times) String(flags.times).split(',').forEach((x) => times.push(evalNum(x)));
  else for (let t = from; t <= to + 1e-6; t += step) times.push(Math.round(t * 1000) / 1000);
  for (const [i, t] of times.entries()) fs.writeFileSync(path.join(tmp, `${String(i).padStart(4, '0')}_${t.toFixed(3)}.jpg`), await page.frame(t, 'jpeg', 85));
  page.close();
  const r = spawnSync('python3', ['-I', path.join(path.dirname(new URL(import.meta.url).pathname), 'sheet.py'), tmp, OUT, String(cols), String(scale)], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(r.status);
}

if (mode === 'video') {
  const N = +opt('frames'), first = +opt('first', 0), last = +opt('last', N - 1), CH = +opt('chunk', 90), CRF = opt('crf', '17');
  if (!N) { console.error('--frames N required'); process.exit(2); }
  const partsDir = OUT.replace(/\.mp4$/, '.parts'); fs.mkdirSync(partsDir, { recursive: true });
  const chunks = []; for (let a = first; a <= last; a += CH) chunks.push([a, Math.min(last, a + CH - 1)]);
  const todo = chunks.filter(([a, b]) => !fs.existsSync(path.join(partsDir, `${String(a).padStart(5, '0')}-${String(b).padStart(5, '0')}.mp4`)));
  console.log(`${chunks.length} chunks, ${todo.length} to render`);
  const tStart = Date.now(); let done = 0;
  if (todo.length) {
    const page = await openPage(); console.log('renderer:', page.info.gl);
    for (const [a, b] of todo) {
      const final = path.join(partsDir, `${String(a).padStart(5, '0')}-${String(b).padStart(5, '0')}.mp4`), tmpf = final + '.tmp.mp4';
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
  const list = path.join(partsDir, 'concat.txt');
  fs.writeFileSync(list, chunks.map(([a, b]) => `file '${path.join(partsDir, `${String(a).padStart(5, '0')}-${String(b).padStart(5, '0')}.mp4`)}'`).join('\n') + '\n');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
  console.log(`picture → ${OUT}`);
  process.exit(0);
}
console.error('unknown mode', mode); process.exit(2);
