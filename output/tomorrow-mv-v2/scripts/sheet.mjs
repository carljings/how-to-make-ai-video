// sheet.mjs: render chosen moments of a composition and tile them into one time-stamped contact sheet.
//   node scripts/sheet.mjs --range=0:6:0.5 [--cols=6] [--w=270] [--out=out/sheet.jpg]
//   node scripts/sheet.mjs --times=0,1.5,14.5 [--comp=Film]
// The bundle is built once and the stills render four at a time in one browser.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {spawnSync} from 'node:child_process';
import {mkdirSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const id = args.comp || 'Film', cols = +(args.cols || 6), w = +(args.w || 270), out = resolve(ROOT, args.out || 'out/sheet.jpg');
let times;
if (args.range) { const [a, b, st = 1] = String(args.range).split(':').map(Number); times = []; for (let t = a; t <= b + 1e-9; t += st) times.push(+t.toFixed(3)); }
else times = String(args.times || '0').split(',').map(Number);

const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => {}});
const browser = await openBrowser('chrome');
const inputProps = {audio: false};
const composition = await selectComposition({serveUrl, id, inputProps, puppeteerInstance: browser});
const tmp = join(ROOT, 'out/.sheet');
rmSync(tmp, {recursive: true, force: true}); mkdirSync(tmp, {recursive: true});
const start = Date.now();
let next = 0;
await Promise.all(Array.from({length: 4}, async () => {
  while (next < times.length) {
    const i = next++, t = times[i], frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
    const file = join(tmp, `f${String(i).padStart(3, '0')}.jpg`);
    await renderStill({composition, serveUrl, output: file, frame, imageFormat: 'jpeg', jpegQuality: 90, inputProps, puppeteerInstance: browser});
    // burn the time into the tile, then shrink it
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-vf', `scale=${w}:-2,drawtext=text='${t.toFixed(2)}s':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=4`, '-q:v', '3', file + '.l.jpg']);
  }
}));
await browser.close({silent: true});
const rows = Math.ceil(times.length / cols);
mkdirSync(dirname(out), {recursive: true});
const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', join(tmp, 'f%03d.jpg.l.jpg'), '-vf', `tile=${cols}x${rows}:padding=4:margin=4:color=0x222222`, '-frames:v', '1', '-q:v', '3', out]);
if (r.status) throw new Error(String(r.stderr));
console.log(`${out}  ${times.length} frames in ${((Date.now() - start) / 1000).toFixed(1)} s`);
