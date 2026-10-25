#!/usr/bin/env node
// stills.mjs — render proposal keyframes from a page in headless Chrome (DevTools protocol over Node's built-in
// WebSocket; no npm deps). The page must expose window.film = { ready, error, render(t) -> Promise }.
//
//   node tools/stills.mjs src/p1/index.html keyframes/P1 0.8:P1-01-open,3.3:P1-02-sync [--png] [--gl swiftshader|metal]
//
// Each still is a 1080×1920 JPEG (quality 92) named <name>.jpg, captured after render(t) resolves.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const argv = process.argv.slice(2);
const pos = [], flags = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--png') flags.png = true;
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
  else pos.push(a);
}
const opt = (k, d) => flags[k] ?? d;
const [pageArg, outArg, specArg] = pos;
if (!pageArg || !outArg || !specArg) { console.error('usage: node tools/stills.mjs <page.html> <outdir> t:name[,t:name...] [--png]'); process.exit(2); }
const PAGE = path.resolve(pageArg), OUT = path.resolve(outArg);
const PNG = !!flags.png;
const CHROME = opt('chrome', process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)));
const GL = opt('gl', process.platform === 'darwin' ? 'metal' : 'swiftshader');
const W = +opt('w', 1080), H = +opt('h', 1920);
fs.mkdirSync(OUT, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'five-proposals-chrome-'));
const glFlags = GL === 'metal' ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${W},${H}`, '--hide-scrollbars',
  '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--force-device-scale-factor=1', '--allow-file-access-from-files', ...(process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : []), ...glFlags, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'] });
const cleanup = () => { try { proc.kill('SIGKILL'); } catch {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

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
  if (m.method === 'Runtime.consoleAPICalled') console.error('[console.' + m.params.type + ']', ...m.params.args.map((a) => a.value ?? a.description));
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `file://${PAGE}` });
const t0 = Date.now();
for (;;) {
  const s = JSON.parse(await evaluate('JSON.stringify({r: !!(window.film && window.film.ready), e: window.film && window.film.error})').catch(() => '{}') || '{}');
  if (s.e) { console.error('page error:\n' + s.e); process.exit(1); }
  if (s.r) break;
  if (Date.now() - t0 > 240000) { console.error('timeout waiting for window.film.ready'); process.exit(1); }
  await new Promise((r) => setTimeout(r, 250));
}
const renderer = await evaluate('(() => { const c = document.createElement("canvas").getContext("webgl2"); const e = c && c.getExtension("WEBGL_debug_renderer_info"); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?"; })()');
console.error('renderer:', renderer);

for (const item of specArg.split(',')) {
  const [ts, name] = item.split(':');
  const t = +ts;
  const t1 = Date.now();
  await evaluate(`window.film.render(${t})`);
  await new Promise((r) => setTimeout(r, 120));
  const shot = await send('Page.captureScreenshot', PNG ? { format: 'png' } : { format: 'jpeg', quality: 92 });
  const file = path.join(OUT, `${name}.${PNG ? 'png' : 'jpg'}`);
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`${file}  t=${t}s  ${((Date.now() - t1) / 1000).toFixed(1)}s`);
}
ws.close();
cleanup();
process.exit(0);
