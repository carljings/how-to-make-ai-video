// verify.mjs: technical checks on the source and the finished film; writes out/verification.json.
//   node scripts/verify.mjs [--video=out/nobel-econ-2026-v2.mp4]
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
const VIDEO = resolve(ROOT, args.video || 'out/nobel-econ-2026-v2.mp4');
const report = {checked: new Date().toISOString().slice(0, 10), pass: [], fail: []};
const ok = (name, cond, detail = '') => { (cond ? report.pass : report.fail).push(detail ? `${name}: ${detail}` : name); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const tl = await build({entryPoints: [join(ROOT, 'src/timeline.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error', loader: {'.json': 'json'}});
const tmp = join(ROOT, 'out/.timeline.mjs'); writeFileSync(tmp, tl.outputFiles[0].text);
const T = await import(pathToFileURL(tmp).href);
const clips = JSON.parse(readFileSync(join(ROOT, 'src/clips.json'), 'utf8'));
ok('the film uses the 1080p Seedance finals', clips.source === '1080p' && clips.clips.length === 4, clips.clips.map((c) => c.src).join(', '));
ok('frame 0 shows the whole question (both lines)', T.HEADS[0].a === 0 && T.HEADS[0].lines.length === 2);
const C = T.CAPTIONS;
const short = C.filter((c) => c.b - c.a < 0.5);
ok('every subtitle stays at least 0.5 s', short.length === 0, short.map((c) => c.text).join(' / '));
const capLen = Math.max(...C.map((c) => [...c.text].length));
ok('subtitle lines are at most 15 characters', capLen <= 15, `longest ${capLen}`);
ok('subtitles stay inside the film', C.every((c) => c.a >= 0 && c.b <= T.DUR + 1e-6));
const headLen = Math.max(...T.HEADS.flatMap((h) => h.lines.map((l) => [...l.replace(/\*\*/g, '')].length)));
ok('headline lines are at most 12 characters', headLen <= 12, `longest ${headLen}`);
ok('the laureates are named on screen and in the subtitles', C.some((c) => c.text.includes('霍尔和伍德福德')) && C.some((c) => c.text.includes('伍德福德')));

const src = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|json)$/.test(f) && src.push(readFileSync(p, 'utf8')); } };
walk(join(ROOT, 'src'));
const subset = new Set(readFileSync(join(ROOT, 'public/fonts/subset-characters.txt'), 'utf8'));
const missing = [...new Set([...src.join('')].filter((c) => c.codePointAt(0) > 0x7f && !subset.has(c)))];
ok('fonts cover every character used', missing.length === 0, missing.join(''));

const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => {}});
const browser = await openBrowser('chrome');
const inputProps = {audio: false};
const composition = await selectComposition({serveUrl, id: 'Film', inputProps, puppeteerInstance: browser});
const still = async (frame) => createHash('sha256').update((await renderStill({composition, serveUrl, frame, imageFormat: 'png', inputProps, puppeteerInstance: browser})).buffer).digest('hex');
const probes = [0, 30, 250, 400, 640, 900, 1250, 1420];
const first = {};
for (const f of probes) first[f] = await still(f);
let same = true;
for (const f of [...probes].reverse()) { await still(Math.min(T.FRAMES - 1, f + 37)); if ((await still(f)) !== first[f]) same = false; }
ok('frames are pure functions of time', same, `${probes.length} frames rendered twice in different orders`);
await browser.close({silent: true});

const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO], {encoding: 'utf8'}).stdout);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
ok(`video 1080×1920, 24 fps, ${T.FRAMES} frames`, v.width === 1080 && v.height === 1920 && v.r_frame_rate === '24/1' && +v.nb_frames === T.FRAMES, `${v.width}×${v.height} ${v.r_frame_rate} ${v.nb_frames}`);
ok('H.264 High, yuv420p, BT.709', v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.color_space === 'bt709', `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space} ${v.color_range}`);
ok('AAC 48 kHz stereo', a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2);
ok(`audio and video start together and last ${T.DUR.toFixed(2)} s`, Math.abs(+a.start_time) < 0.01 && Math.abs(+v.start_time) < 0.01 && Math.abs(+probe.format.duration - T.DUR) < 0.06, `${(+probe.format.duration).toFixed(3)} s`);
const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-f', 'null', '-'], {encoding: 'utf8'});
ok('decodes end to end without errors', dec.status === 0 && !dec.stderr.trim());
const lo = spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const I = +lo.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP = +lo.match(/Peak:\s+(-?[\d.]+) dBFS/)[1], LRA = +lo.match(/LRA:\s+(-?[\d.]+) LU/)[1];
ok('loudness about −10 LUFS (the user\'s target)', Math.abs(I + 10) <= 0.5, `${I} LUFS, range ${LRA} LU`);
ok('true peak at or under −1.5 dBTP', TP <= -1.5, `${TP} dBTP`);
const head = spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vn', '-af', 'atrim=0:0.2,astats=metadata=0', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const headRms = +(head.match(/RMS level dB:\s+(-?[\d.inf]+)/) || [0, '-inf'])[1];
ok('sound starts on frame 0 (first 200 ms not silent)', headRms > -40, `${headRms} dB RMS`);
report.media = {width: v.width, height: v.height, fps: v.r_frame_rate, frames: +v.nb_frames, duration: +probe.format.duration, sizeMB: +(probe.format.size / 1048576).toFixed(1), loudness: {I, TP, LRA}};
report.frameHashes = first;
writeFileSync(join(ROOT, 'out/verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report.fail.length ? `\n${report.fail.length} check(s) failed` : `\nall ${report.pass.length} checks passed → out/verification.json`);
process.exitCode = report.fail.length ? 1 : 0;
