#!/usr/bin/env node
// render.mjs — (renderer infrastructure reused from the author’s earlier projects; logic unchanged) drives headless Chrome over the DevTools protocol (Node's built-in WebSocket; no npm deps), renders
// frames of index.html and either saves a few stills or streams PNG frames straight into ffmpeg (no frame files on
// disk). Every frame is a pure function of its number, so ranges can be split across workers and concatenated.
//
//   node tools/render.mjs --stills 0,27,120 [--scale 0.5] [--out out/stills]      → JPEG stills + contact sheet
//   node tools/render.mjs --video [--from 0 --to 239] [--workers 2] [--out out/picture.mp4] [--gl swiftshader|metal]
//   node tools/render.mjs --textcheck                                                → key text inside the safe area, every frame
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const has = (k) => argv.includes('--' + k);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const CHROME = opt('chrome', process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)));
const GL = opt('gl', process.platform === 'darwin' ? 'metal' : 'swiftshader');

async function openPage() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'explainer-full-chrome-'));
  const glFlags = GL === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1080,1920', '--hide-scrollbars',
    '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--force-device-scale-factor=1', '--allow-file-access-from-files', ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []), ...glFlags, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((res, rej) => {
    let buf = ''; const to = setTimeout(() => rej(new Error('chrome did not start')), 30000);
    proc.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(to); res(m[1]); } });
  });
  const port = new URL(wsUrl).port;
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    if (m.method === 'Runtime.exceptionThrown') console.error('[page]', m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('[console]', ...m.params.args.map((a) => a.value ?? a.description));
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `file://${ROOT}/index.html` });
  const t0 = Date.now();
  for (;;) {
    const s = JSON.parse(await evaluate('JSON.stringify({r: !!(window.film && window.film.ready), e: window.film && window.film.error})').catch(() => '{}') || '{}');
    if (s.e) throw new Error('page error:\n' + s.e);
    if (s.r) break;
    if (Date.now() - t0 > 180000) throw new Error('timeout waiting for the film');
    await new Promise((r) => setTimeout(r, 250));
  }
  const renderer = await evaluate('(() => { const c = document.createElement("canvas").getContext("webgl2"); const e = c && c.getExtension("WEBGL_debug_renderer_info"); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })()');
  const close = () => { try { ws.close(); } catch {} try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { evaluate, close, renderer, frameCount: await evaluate('window.film.frameCount') };
}

async function grab(page, f, type = 'image/png', q = 0.95) {
  const url = await page.evaluate(`window.film.render(${f}).then(() => window.film.grab('${type}', ${q}))`);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

if (has('textcheck')) {   // every frame: key text must stay inside x 60–940, y 120–1560 (platform UI safe area)
  const page = await openPage(); let bad = 0, n = 0;
  const step = +opt('step', 1);   // --step N samples every Nth frame (quick local check; the M4 runs every frame)
  for (let f = 0; f < page.frameCount; f += step) for (const b of await page.evaluate(`window.film.textBoxes(${f})`)) {
    n++; if (b.x0 < 60 || b.x1 > 940 || b.y0 < 120 || b.y1 > 1560) { bad++; console.log('OUTSIDE', JSON.stringify(b)); }
  }
  page.close(); console.log(`textcheck: ${n} text boxes over ${page.frameCount} frames, ${bad} outside the safe area`); process.exit(bad ? 1 : 0);
}

if (has('stills')) {
  const frames = String(opt('stills', '0')).split(',').map(Number);
  const out = path.resolve(ROOT, opt('out', 'out/stills')), scale = +opt('scale', 0.5);
  fs.mkdirSync(out, { recursive: true });
  const page = await openPage();
  console.log(`renderer: ${page.renderer}`);
  const files = [];
  for (const f of frames) {
    const t0 = Date.now(); const buf = await grab(page, f, 'image/jpeg', 0.93);
    const file = path.join(out, `f${String(f).padStart(5, '0')}.jpg`); fs.writeFileSync(file, buf); files.push(file);
    console.log(`f${f} ${((Date.now() - t0) / 1000).toFixed(2)} s`);
  }
  page.close();
  if (files.length > 1) {   // contact sheet with frame labels
    const cols = Math.min(+opt('cols', 6), files.length), w = Math.round(1080 * scale * 0.5), h = Math.round(1920 * scale * 0.5);
    const inputs = files.flatMap((f) => ['-i', f]);
    const filt = files.map((f, i) => `[${i}:v]scale=${w}:${h},drawtext=text='${path.basename(f, '.jpg')}':x=6:y=6:fontsize=${Math.round(18 * scale * 2)}:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';');
    const lay = files.map((f, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
    const sheet = path.join(out, opt('sheet', 'sheet.jpg'));
    const stack = (labels) => {
      const f = labels ? filt : files.map((f, i) => `[${i}:v]scale=${w}:${h}[v${i}]`).join(';');
      return spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${f};${files.map((f, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${lay}:fill=black`, '-frames:v', '1', '-q:v', '3', sheet], { encoding: 'utf8' });
    };
    // labels need ffmpeg's drawtext (libfreetype); without it, make the sheet unlabelled (order = the --stills list) instead
    let r = stack(true);
    if (r.status !== 0) { console.warn('contact sheet: drawtext unavailable or failed; writing an unlabelled sheet (tiles in --stills order)'); r = stack(false); }
    if (r.status !== 0) { console.error('contact sheet failed:\n' + r.stderr); process.exit(1); }
    console.log('sheet →', sheet);
  }
  process.exit(0);
}

if (has('video')) {
  const from = +opt('from', 0), workers = +opt('workers', 1), outFile = path.resolve(ROOT, opt('out', 'out/picture.mp4'));
  let to = +opt('to', -1);
  const probe = await openPage(); console.log(`renderer: ${probe.renderer}`); if (to < 0) to = probe.frameCount - 1; probe.close();
  const n = to - from + 1, per = Math.ceil(n / workers), segs = [];
  // optional explicit boundaries (--split 1201,…): segment w starts at bounds[w] (balances heavy 3D against light 2D)
  const bounds = opt('split') ? [from, ...String(opt('split')).split(',').map(Number)] : null;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const enc = (file) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', '30', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p',   // convert RGB→YUV with the SAME matrix the stream is tagged with (BT.709), so brand colours survive
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
    '-r', '30', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const tStart = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = bounds ? bounds[w] : from + w * per, b = bounds ? (w + 1 < bounds.length ? bounds[w + 1] - 1 : to) : Math.min(to, a + per - 1); if (a > b) return;
    const seg = workers > 1 ? outFile.replace(/\.mp4$/, `.part${w}.mp4`) : outFile; segs[w] = seg;
    const page = await openPage(), ff = enc(seg);
    for (let f = a; f <= b; f++) {
      const buf = await grab(page, f);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - a) % 30 === 0) console.log(`[w${w}] f${f}/${b}  ${((Date.now() - tStart) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end(); await new Promise((r) => ff.on('close', r)); page.close();
  }));
  if (workers > 1) {
    const list = path.join(path.dirname(outFile), 'concat.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n') + '\n');
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' });
    for (const s of segs.filter(Boolean)) fs.rmSync(s); fs.rmSync(list);
  }
  console.log(`picture → ${outFile} (${n} frames, ${((Date.now() - tStart) / 1000).toFixed(0)} s)`);
  process.exit(0);
}
console.log('usage: --stills a,b,c | --video [--from a --to b --workers n] | --textcheck');
