#!/usr/bin/env node
// render.mjs — deterministic frame renderer for the v6 WebGL film. Zero npm dependencies: serves the project over
// localhost, drives headless Chrome through the DevTools protocol (Node's built-in WebSocket), and writes one image
// per frame. Each frame is a pure function of its number, so ranges can be split across runs and resumed.
//
//   node tools/render.mjs --out /ABS/out/frames --frames 0-419 [--chrome PATH] [--gl metal|swiftshader|default]
//        [--scale 1] [--sub 8] [--vol 1] [--steps 48] [--ps 1] [--format png|jpg] [--skip-existing] [--info] [--proof]
//   --frames accepts a-b, a-b:step, or a comma list (12,40,96). --proof = the prototype range from cues.js (PROOF).
//   --info prints the film's frame count, shots, events and text cards (all from web/engine/cues.js).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return acc;
}, []));
const opt = (k, d) => (args[k] === undefined ? d : args[k]);

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
];
const chrome = opt('chrome', CHROME_CANDIDATES.find((p) => fs.existsSync(p)));
if (!chrome) throw new Error('no Chrome found; pass --chrome /path/to/chrome');
const glMode = opt('gl', process.platform === 'darwin' ? 'metal' : 'swiftshader');
const scale = +opt('scale', 1), W = Math.round(1080 * scale), H = Math.round(1920 * scale);
const fmt = opt('format', 'png');
const outDir = opt('out', path.join(ROOT, 'out', 'frames'));

// ------------------------------------------------------------------------------------------------ static server
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png' };
const useHttp = !!args.http;   // default: file:// (+ --allow-file-access-from-files); some hosts' Chrome cannot load http://127.0.0.1
const server = !useHttp ? null : http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const p = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ''));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
if (server) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server ? server.address().port : 0;

// ------------------------------------------------------------------------------------------------ chrome
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'v6-chrome-'));
const glFlags = glMode === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : glMode === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist'];
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--force-device-scale-factor=1', '--allow-file-access-from-files', ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []),
  ...glFlags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const to = setTimeout(() => reject(new Error('chrome did not start')), 30000);
  proc.stderr.on('data', (d) => {
    buf += d.toString();
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
    if (m) { clearTimeout(to); resolve(m[1]); }
  });
});
const browserPort = new URL(wsUrl).port;
const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let msgId = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  if (m.method === 'Runtime.consoleAPICalled' && opt('verbose', false)) console.log('[page]', ...m.params.args.map((a) => a.value ?? a.description));
  if (m.method === 'Runtime.exceptionThrown') console.error('[page exception]', m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++msgId; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const q = new URLSearchParams({ scale: String(scale), sub: String(opt('sub', 1)), vol: String(opt('vol', 0.5)), steps: String(opt('steps', 40)),
  ps: String(opt('ps', 1)), shadow: String(opt('shadow', 2048)), ...(args.cam ? { cam: String(args.cam) } : {}) });
const pageUrl = useHttp ? `http://127.0.0.1:${port}/web/index.html?${q}` : `file://${ROOT}/web/index.html?${q}`;
await send('Page.navigate', { url: pageUrl });
const t0 = Date.now();
for (;;) {
  const st = await evaluate('JSON.stringify({ready: !!(window.v6 && window.v6.ready), error: window.v6 && window.v6.error})').catch(() => '{}');
  const s = JSON.parse(st || '{}');
  if (s.error) { console.error('page error:\n' + s.error); cleanup(1); }
  if (s.ready) break;
  if (Date.now() - t0 > 120000) { console.error('timeout waiting for the film'); cleanup(1); }
  await new Promise((r) => setTimeout(r, 200));
}
const info = await evaluate('({frameCount: v6.frameCount, duration: v6.duration, events: v6.events, shots: v6.shots, fonts: v6.fonts, glints: v6.glints, renderer: (() => { const gl = v6.film.gl; const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })()})');
console.log(`film: ${info.frameCount} frames (${info.duration.toFixed(3)} s), cues web/engine/cues.js, fonts ${JSON.stringify(info.fonts)}, renderer ${info.renderer}`);
const CUES = await import(path.join(ROOT, 'web/engine/cues.js'));
if (args.info) {
  for (const s of info.shots) console.log(`${s.id.padEnd(3)} ${s.t0.toFixed(2).padStart(6)}–${s.t1.toFixed(2).padStart(6)} s  f${Math.round(s.t0 * 30)}–${Math.round(s.t1 * 30) - 1}  ${s.world.padEnd(9)} ${s.what}`);
  for (const c of CUES.CARDS) for (const l of c.lines) console.log(`  ${c.id.padEnd(5)} ${l.at.toFixed(2).padStart(6)} → ${Math.min(c.out + CUES.EXIT, CUES.END).toFixed(2).padStart(6)}  ${l.role.padEnd(7)} ${l.text}`);
  console.log(JSON.stringify(info.events));
  cleanup(0);
}

// ------------------------------------------------------------------------------------------------ frames
function parseFrames(spec, n) {
  if (!spec || spec === true) return Array.from({ length: n }, (_, i) => i);
  const out = [];
  for (const part of String(spec).split(',')) {
    const m = /^(\d+)(?:-(\d+))?(?::(\d+))?$/.exec(part.trim());
    if (!m) throw new Error('bad --frames ' + part);
    const a = +m[1], b = m[2] !== undefined ? +m[2] : a, st = m[3] ? +m[3] : 1;
    for (let f = a; f <= Math.min(b, n - 1); f += st) out.push(f);
  }
  return out;
}
const frames = args.proof ? parseFrames(`${CUES.PROOF.from}-${CUES.PROOF.to}`, info.frameCount) : parseFrames(args.frames, info.frameCount);
fs.mkdirSync(outDir, { recursive: true });
const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
let done = 0;
const tStart = Date.now();
for (const f of frames) {
  const file = path.join(outDir, `f${String(f).padStart(5, '0')}.${fmt}`);
  if (args['skip-existing'] && fs.existsSync(file)) continue;
  const tf = Date.now();
  const data = await evaluate(`v6.render(${f}).then(() => document.getElementById('c').toDataURL('${mime}', 0.94))`);
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  done++;
  console.log(`f${f}  ${((Date.now() - tf) / 1000).toFixed(2)} s  → ${file}`);
}
console.log(`rendered ${done} frames in ${((Date.now() - tStart) / 1000).toFixed(1)} s`);
cleanup(0);

function cleanup(code) {
  try { ws.close(); } catch (e) { /* ignore */ }
  try { proc.kill('SIGKILL'); } catch (e) { /* ignore */ }
  if (server) server.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  process.exit(code);
}
