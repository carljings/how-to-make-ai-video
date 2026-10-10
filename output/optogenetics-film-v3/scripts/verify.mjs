// verify.mjs: technical checks on the source and the finished film; writes out/verification.json.
//   node scripts/verify.mjs [--video=out/optogenetics-v3.mp4]
// Checks: timeline and text continuity, font coverage, frame determinism, media format, full decode, loudness.
// Passing says nothing about whether the film is good to watch: that still needs a person with sound on.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=')]; }));
const VIDEO = resolve(ROOT, args.video || 'out/optogenetics-v3.mp4');
const report = {checked: new Date().toISOString().slice(0, 10), pass: [], fail: []};
const ok = (name, cond, detail = '') => { (cond ? report.pass : report.fail).push(detail ? `${name}: ${detail}` : name); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

// ---- timeline (load timeline.ts through esbuild so this script needs no TypeScript runtime) ----
const tl = await build({entryPoints: [join(ROOT, 'src/timeline.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tmp = join(ROOT, 'out/.timeline.mjs');
writeFileSync(tmp, tl.outputFiles[0].text);
const T = await import(pathToFileURL(tmp).href);
const contiguous = (xs) => xs[0].a === 0 && xs.at(-1).b === T.DUR && xs.every((s, i) => i === 0 || Math.abs(xs[i - 1].b - s.a) < 1e-9);
ok('scenes cover 0–64 s without gaps', contiguous(T.SCENES));
ok('text blocks cover 0–64 s without gaps', contiguous(T.TEXTS));
const short = T.TEXTS.filter((x) => x.b - x.a < 1 - 1e-9);
ok('every text block stays at least 1 s', short.length === 0, short.map((x) => x.lines.join('')).join(' / '));
const longest = Math.max(...T.TEXTS.flatMap((x) => x.lines.map((l) => [...l.replace(/\*\*/g, '')].length)));
ok('headline lines are at most 10 characters', longest <= 10, `longest ${longest}`);
const bounds = new Set(T.SCENES.map((s) => s.b));
ok('every cut sits on a scene boundary', Object.keys(T.CUTS).every((k) => bounds.has(+k)));
ok('the hook shows the phenomenon on frame 0', T.HOOK_LIGHT[0][0] === 0 && T.TEXTS[0].a === 0);

// ---- fonts: every non-ASCII character in the source is in the shipped subset ----
const src = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && src.push(readFileSync(p, 'utf8')); } };
walk(join(ROOT, 'src'));
const subset = new Set(readFileSync(join(ROOT, 'public/fonts/subset-characters.txt'), 'utf8'));
const missing = [...new Set([...src.join('')].filter((c) => c.codePointAt(0) > 0x7f && !subset.has(c)))];
ok('fonts cover every character used', missing.length === 0, missing.join(''));

// ---- determinism: the same frame renders identically whatever was rendered before it ----
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => {}});
const browser = await openBrowser('chrome');
const inputProps = {audio: false};
const composition = await selectComposition({serveUrl, id: 'Film', inputProps, puppeteerInstance: browser});
const still = async (frame) => createHash('sha256').update((await renderStill({composition, serveUrl, frame, imageFormat: 'png', inputProps, puppeteerInstance: browser})).buffer).digest('hex');
const probes = [0, 435, 660, 1000, 1290, 1440, 1560, 1850];
const first = {};
for (const f of probes) first[f] = await still(f);
let same = true;
for (const f of [...probes].reverse()) { await still(Math.min(1919, f + 37)); if ((await still(f)) !== first[f]) same = false; }
ok('frames are pure functions of time', same, `${probes.length} frames rendered twice in different orders`);
await browser.close({silent: true});

// ---- the finished film ----
const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO], {encoding: 'utf8'}).stdout);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
ok('video 1080×1920, 30 fps, 1920 frames', v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && +v.nb_frames === 1920, `${v.width}×${v.height} ${v.r_frame_rate} ${v.nb_frames}`);
ok('H.264 High, yuv420p, BT.709 limited range', v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.color_space === 'bt709' && v.color_range === 'tv', `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space} ${v.color_range}`);
ok('AAC 48 kHz stereo', a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2);
ok('audio and video start together and last 64 s', Math.abs(+a.start_time) < 0.01 && Math.abs(+v.start_time) < 0.01 && Math.abs(+probe.format.duration - 64) < 0.05, `${(+probe.format.duration).toFixed(3)} s`);
const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-f', 'null', '-'], {encoding: 'utf8'});
ok('decodes end to end without errors', dec.status === 0 && !dec.stderr.trim());
const lo = spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const I = +lo.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP = +lo.match(/Peak:\s+(-?[\d.]+) dBFS/)[1], LRA = +lo.match(/LRA:\s+(-?[\d.]+) LU/)[1];
ok('loudness about −10 LUFS (the user\'s target for this film)', Math.abs(I + 10) <= 0.5, `${I} LUFS, range ${LRA} LU`);
ok('true peak at or under −1.5 dBTP', TP <= -1.5, `${TP} dBTP`);
report.media = {width: v.width, height: v.height, fps: v.r_frame_rate, frames: +v.nb_frames, duration: +probe.format.duration, video: `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space}`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`, sizeMB: +(probe.format.size / 1048576).toFixed(1), loudness: {I, TP, LRA}};
report.frameHashes = first;
writeFileSync(join(ROOT, 'out/verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report.fail.length ? `\n${report.fail.length} check(s) failed` : `\nall ${report.pass.length} checks passed → out/verification.json`);
process.exitCode = report.fail.length ? 1 : 0;
