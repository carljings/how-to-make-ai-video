// verify.mjs: technical checks on the timing, the source and the finished film; writes out/verification.json.
//   node scripts/verify.mjs [--video=out/tomorrow-mv.mp4]
// Checks: the beat grid and syllables, font coverage, frame determinism, the loop, the music cut, media format, full
// decode, loudness, and that the film's audio is the music cut with no offset (the visuals are timed to it).
// Passing says nothing about whether the film is good to watch: that still needs a person with sound on.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=')]; }));
const VIDEO = resolve(ROOT, args.video || 'out/tomorrow-mv.mp4');
const MUSIC = join(ROOT, 'public/music.wav');
const report = {checked: new Date().toISOString().slice(0, 10), pass: [], fail: []};
const ok = (name, cond, detail = '') => { (cond ? report.pass : report.fail).push(detail ? `${name}: ${detail}` : name); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

// ---- timing (load timeline.ts through esbuild so this script needs no TypeScript runtime) ----
const tl = await build({entryPoints: [join(ROOT, 'src/timeline.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tmp = join(ROOT, 'out/.timeline.mjs');
writeFileSync(tmp, tl.outputFiles[0].text);
const T = await import(pathToFileURL(tmp).href);
ok(`the film is six bars long, so it loops on the beat`, Math.abs(6 * T.BAR - T.DUR) < 0.01 && T.FRAMES === Math.round(T.DUR * T.FPS), `6 × ${T.BAR.toFixed(4)} s = ${(6 * T.BAR).toFixed(3)} s; film ${T.DUR} s, ${T.FRAMES} frames`);
const scenesOk = T.SCENES[0].a === 0 && T.SCENES.at(-1).b === T.DUR && T.SCENES.every((s, i) => i === 0 || (Math.abs(T.SCENES[i - 1].b - s.a) < 1e-9 && Math.abs(s.a - T.BARLINE[i]) < 1e-9));
ok('scenes cover the film without gaps and each cut is on a downbeat', scenesOk);
const syl = T.LINES.flatMap((l) => l.syl.map((s) => ({...s, bar: l.bar})));
const off = syl.filter((s) => { const n = (s.t - T.T0 - s.bar * T.BAR) / T.HALF; return Math.abs(n - Math.round(n)) * T.HALF > (s.ch === '年' ? 0.12 : 1e-6); });
ok('47 sung syllables, each on the half-pulse grid (年 within 0.12 s)', syl.length === 47 && off.length === 0, off.map((s) => s.ch).join(''));
ok('syllables are in order and each stays inside its bar', syl.every((s, i) => (i === 0 || s.t > syl[i - 1].t) && s.t >= T.BARLINE[s.bar] - 1e-9 && s.t < (T.BARLINE[s.bar + 1] ?? T.DUR)));
ok('lyrics read as the song: 轻轻敲醒沉睡的心灵 … 吹动少年的心', T.LINES.map((l) => l.text).join('/') === '轻轻敲醒沉睡的心灵/慢慢张开你的眼睛/看看忙碌的世界是否依然/孤独的转个不停/春风不解风情/吹动少年的心');

// ---- fonts: every non-ASCII character in the source is in the shipped subset ----
const src = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && src.push(readFileSync(p, 'utf8')); } };
walk(join(ROOT, 'src'));
const subset = new Set(readFileSync(join(ROOT, 'public/fonts/subset-characters.txt'), 'utf8'));
const missing = [...new Set([...src.join('')].filter((c) => c.codePointAt(0) > 0x7f && !subset.has(c)))];
ok('fonts cover every character used', missing.length === 0, missing.join(''));

// ---- determinism and the loop ----
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => {}});
const browser = await openBrowser('chrome');
const inputProps = {audio: false};
const composition = await selectComposition({serveUrl, id: 'Film', inputProps, puppeteerInstance: browser});
const png = async (frame) => (await renderStill({composition, serveUrl, frame, imageFormat: 'png', inputProps, puppeteerInstance: browser})).buffer;
const hash = (b) => createHash('sha256').update(b).digest('hex');
const probes = [0, 14, 90, 99, 200, 290, 300, 380, 470, 487, 560, 575];
const first = {};
for (const f of probes) first[f] = hash(await png(f));
let same = true;
for (const f of [...probes].reverse()) { await png(Math.min(T.FRAMES - 1, f + 37)); if (hash(await png(f)) !== first[f]) same = false; }
ok('frames are pure functions of time', same, `${probes.length} frames rendered twice in different orders`);
writeFileSync(join(ROOT, 'out/.first.png'), await png(0));
writeFileSync(join(ROOT, 'out/.last.png'), await png(T.FRAMES - 1));
await browser.close({silent: true});
const psnr = spawnSync('ffmpeg', ['-hide_banner', '-i', join(ROOT, 'out/.last.png'), '-i', join(ROOT, 'out/.first.png'), '-lavfi', 'psnr', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const db = +(psnr.match(/average:([\d.]+|inf)/)?.[1] ?? 0);
ok('the last frame leads straight back into the first (loop)', db > 28, `PSNR ${db} dB between frame ${T.FRAMES - 1} and frame 0`);

// ---- the music cut ----
const mp = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', MUSIC], {encoding: 'utf8'}).stdout).streams[0];
ok('music cut: 19.2 s, 48 kHz stereo', existsSync(MUSIC) && Math.abs(+mp.duration - T.DUR) < 0.002 && +mp.sample_rate === 48000 && mp.channels === 2, `${mp.duration} s`);

// ---- the finished film ----
const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', VIDEO], {encoding: 'utf8'}).stdout);
const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
ok(`video 1080×1920, 30 fps, ${T.FRAMES} frames`, v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && +v.nb_frames === T.FRAMES, `${v.width}×${v.height} ${v.r_frame_rate} ${v.nb_frames}`);
ok('H.264 High, yuv420p, BT.709 limited range', v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.color_space === 'bt709' && v.color_range === 'tv', `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space} ${v.color_range}`);
ok('AAC 48 kHz stereo', a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2);
ok(`audio and video start together and last ${T.DUR} s`, Math.abs(+a.start_time) < 0.01 && Math.abs(+v.start_time) < 0.01 && Math.abs(+probe.format.duration - T.DUR) < 0.05, `${(+probe.format.duration).toFixed(3)} s`);
const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-f', 'null', '-'], {encoding: 'utf8'});
ok('decodes end to end without errors', dec.status === 0 && !dec.stderr.trim());
const lo = spawnSync('ffmpeg', ['-hide_banner', '-i', VIDEO, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
const I = +lo.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP = +lo.match(/Peak:\s+(-?[\d.]+) dBFS/)[1], LRA = +lo.match(/LRA:\s+(-?[\d.]+) LU/)[1];
ok('loudness about −12 LUFS (the user chose gain only, as loud as the true-peak limit allows)', Math.abs(I + 11.9) <= 0.5, `${I} LUFS, range ${LRA} LU`);
ok('true peak at or under −1.5 dBTP', TP <= -1.5, `${TP} dBTP`);
// the film's audio must be the music cut, not shifted: cross-correlate the first 3 s at ±50 ms
const pcm = (file) => { const b = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-t', '3', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28}).stdout; return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const x = pcm(MUSIC), y = pcm(VIDEO);
let best = -1, lag = 0;
for (let L = -2400; L <= 2400; L += 4) { let s = 0, ex = 0, ey = 0; for (let i = 3000; i < 141000; i += 2) { const p = x[i], q = y[i + L] ?? 0; s += p * q; ex += p * p; ey += q * q; } const r = s / Math.sqrt(ex * ey); if (r > best) { best = r; lag = L; } }
ok('the film\'s audio is the music cut, in sync with the picture', best > 0.98 && Math.abs(lag) <= 48, `r = ${best.toFixed(4)} at ${(lag / 48).toFixed(2)} ms`);
report.media = {width: v.width, height: v.height, fps: v.r_frame_rate, frames: +v.nb_frames, duration: +probe.format.duration, video: `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space}`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`, sizeMB: +(probe.format.size / 1048576).toFixed(1), loudness: {I, TP, LRA}};
report.frameHashes = first;
writeFileSync(join(ROOT, 'out/verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report.fail.length ? `\n${report.fail.length} check(s) failed` : `\nall ${report.pass.length} checks passed → out/verification.json`);
process.exitCode = report.fail.length ? 1 : 0;
