// verify.mjs: technical checks on the timing, the source and both finished films; writes out/verification.json.
//   node scripts/verify.mjs
// Checks: the beat grid and syllables, the two playlists, font coverage, frame determinism, each film's loop, the music
// cuts, media format, full decode, loudness, and that each film's audio is its music cut with no offset (the visuals
// are timed to it), including the 40-second cut's splice. Passing says nothing about whether the films are good to
// watch: that still needs a person with sound on.
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FILMS = [{cut: 'full', comp: 'Full', video: 'out/tomorrow-mv-full.mp4'}, {cut: 'short', comp: 'Short40', video: 'out/tomorrow-mv-40s.mp4'}];
const report = {checked: new Date().toISOString().slice(0, 10), pass: [], fail: [], media: {}, frameHashes: {}};
const ok = (name, cond, detail = '') => { (cond ? report.pass : report.fail).push(detail ? `${name}: ${detail}` : name); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

// ---- timing (load timeline.ts through esbuild so this script needs no TypeScript runtime) ----
const tl = await build({entryPoints: [join(ROOT, 'src/timeline.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error'});
const tmp = join(ROOT, 'out/.timeline.mjs');
writeFileSync(tmp, tl.outputFiles[0].text);
const T = await import(pathToFileURL(tmp).href);
const syl = T.LINES.flatMap((l) => l.syl.map((s) => ({...s, bar: l.bar})));
const off = syl.filter((s) => { const n = (s.t - T.T0 - s.bar * T.BAR) / T.HALF; return Math.abs(n - Math.round(n)) * T.HALF > (s.ch === '年' && s.bar === 5 ? 0.12 : 1e-6); });
ok('124 sung syllables in 16 bars, each on the half-pulse grid (年 in bar 6 within 0.12 s)', syl.length === 124 && T.LINES.length === 16 && off.length === 0, off.map((s) => s.ch).join(''));
ok('syllables are in order and each starts inside its bar (火 closes bar 11 on the next downbeat)', syl.every((s, i) => (i === 0 || s.t > syl[i - 1].t) && s.t >= T.BARLINE[s.bar] - 1e-9 && s.t <= T.BARLINE[s.bar + 1] + 1e-9));
ok('lyrics read as the song (two verses)', T.LINES.map((l) => l.text).join('') === '轻轻敲醒沉睡的心灵慢慢张开你的眼睛看看忙碌的世界是否依然孤独的转个不停春风不解风情吹动少年的心让昨日脸上的泪痕随记忆风干了抬头寻找天空的翅膀候鸟出现它的影迹带来远处的饥荒无情的战火依然存在的消息玉山白雪飘零燃烧少年的心使真情溶化成音符倾诉遥远的祝福');
for (const {cut} of FILMS) {
  const C = T.CUTS[cut], E = C.entries;
  const contiguous = E[0].filmA === 0 && Math.abs(E.at(-1).filmB - C.dur) < 1e-9 && E.every((e, i) => i === 0 || Math.abs(E[i - 1].filmB - e.filmA) < 1e-9);
  const onBars = E.every((e, i) => i === 0 || Math.abs(e.filmA + e.offset - T.BARLINE[e.bar]) < 1e-9);
  const bars = E.length, songLen = bars * T.BAR;
  ok(`${cut}: ${bars} bars, contiguous, every cut on a downbeat, ${C.dur} s = ${C.frames} frames (loops on the beat)`, contiguous && onBars && Math.abs(songLen - C.dur) < 0.01 && C.frames === Math.round(C.dur * T.FPS), `${bars} × ${T.BAR.toFixed(4)} s = ${songLen.toFixed(3)} s`);
}

// ---- fonts: every non-ASCII character in the source is in the shipped subset ----
const src = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && src.push(readFileSync(p, 'utf8')); } };
walk(join(ROOT, 'src'));
const subset = new Set(readFileSync(join(ROOT, 'public/fonts/subset-characters.txt'), 'utf8'));
const missing = [...new Set([...src.join('')].filter((c) => c.codePointAt(0) > 0x7f && !subset.has(c)))];
ok('fonts cover every character used', missing.length === 0, missing.join(''));

// ---- determinism and the loops ----
const serveUrl = await bundle({entryPoint: join(ROOT, 'src/index.ts'), onProgress: () => {}});
const browser = await openBrowser('chrome');
const hash = (b) => createHash('sha256').update(b).digest('hex');
for (const {cut, comp} of FILMS) {
  const inputProps = {cut, audio: false};
  const composition = await selectComposition({serveUrl, id: comp, inputProps, puppeteerInstance: browser});
  const png = async (frame) => (await renderStill({composition, serveUrl, frame, imageFormat: 'png', inputProps, puppeteerInstance: browser})).buffer;
  const N = composition.durationInFrames, probes = [0, 26, 99, 290, 600, 770, 1000, 1230, 1300, 1450, 1520, 1535].filter((f) => f < N).concat(cut === 'short' ? [767, 770, 1140, 1151] : []);
  const first = {};
  for (const f of probes) first[f] = hash(await png(f));
  let same = true;
  for (const f of [...probes].reverse()) { await png(Math.min(N - 1, f + 37)); if (hash(await png(f)) !== first[f]) same = false; }
  ok(`${cut}: frames are pure functions of time`, same, `${probes.length} frames rendered twice in different orders`);
  report.frameHashes[cut] = first;
  writeFileSync(join(ROOT, 'out/.first.png'), await png(0));
  writeFileSync(join(ROOT, 'out/.last.png'), await png(N - 1));
  const psnr = spawnSync('ffmpeg', ['-hide_banner', '-i', join(ROOT, 'out/.last.png'), '-i', join(ROOT, 'out/.first.png'), '-lavfi', 'psnr', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const db = +(psnr.match(/average:([\d.]+|inf)/)?.[1] ?? 0);
  ok(`${cut}: the last frame leads straight back into the first (loop)`, db > 28, `PSNR ${db} dB`);
}
await browser.close({silent: true});

// ---- the music cuts and the films ----
const pcm = (file, a = 0, d = 3) => { const b = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(a), '-t', String(d), '-i', file, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], {maxBuffer: 1 << 28}).stdout; return new Float32Array(b.buffer, b.byteOffset, b.length / 4); };
const xcorr = (x, y) => { let best = -1, lag = 0; for (let L = -2400; L <= 2400; L += 4) { let s = 0, ex = 0, ey = 0; for (let i = 3000; i < x.length - 3000; i += 2) { const p = x[i], q = y[i + L] ?? 0; s += p * q; ex += p * p; ey += q * q; } const r = s / Math.sqrt(ex * ey + 1e-20); if (r > best) { best = r; lag = L; } } return {r: best, ms: lag / 48}; };
const fullWav = join(ROOT, 'public/music-full.wav');
for (const {cut, video} of FILMS) {
  const C = T.CUTS[cut], wav = join(ROOT, `public/${C.music}`), V = join(ROOT, video);
  const mp = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', wav], {encoding: 'utf8'}).stdout).streams[0];
  ok(`${cut}: music cut ${C.dur} s, 48 kHz stereo`, existsSync(wav) && Math.abs(+mp.duration - C.dur) < 0.002 && +mp.sample_rate === 48000 && mp.channels === 2, `${mp.duration} s`);
  if (cut === 'short') { // the second half of the short cut is song bars 13–16: compare with the full cut at the same song time.
    // The two cuts are resampled separately, so their samples sit a fraction of a sample apart: r is a little under 1.
    const e = C.entries[8], a = e.filmA + 0.5, x = xcorr(pcm(fullWav, a + e.offset, 3), pcm(wav, a, 3));
    ok('short: after the splice it plays song bar 13 onward, on the beat', x.r > 0.95 && Math.abs(x.ms) <= 1, `r = ${x.r.toFixed(4)} at ${x.ms.toFixed(2)} ms`);
  }
  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', V], {encoding: 'utf8'}).stdout);
  const v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
  ok(`${cut}: video 1080×1920, 30 fps, ${C.frames} frames`, v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && +v.nb_frames === C.frames, `${v.width}×${v.height} ${v.r_frame_rate} ${v.nb_frames}`);
  ok(`${cut}: H.264 High, yuv420p, BT.709 limited range; AAC 48 kHz stereo`, v.codec_name === 'h264' && v.pix_fmt === 'yuv420p' && v.color_space === 'bt709' && v.color_range === 'tv' && a.codec_name === 'aac' && +a.sample_rate === 48000 && a.channels === 2, `${v.profile} ${v.pix_fmt} ${v.color_space}`);
  ok(`${cut}: audio and video start together and last ${C.dur} s`, Math.abs(+a.start_time) < 0.01 && Math.abs(+v.start_time) < 0.01 && Math.abs(+probe.format.duration - C.dur) < 0.05, `${(+probe.format.duration).toFixed(3)} s`);
  const dec = spawnSync('ffmpeg', ['-v', 'error', '-i', V, '-f', 'null', '-'], {encoding: 'utf8'});
  ok(`${cut}: decodes end to end without errors`, dec.status === 0 && !dec.stderr.trim());
  const lo = spawnSync('ffmpeg', ['-hide_banner', '-i', V, '-vn', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const I = +lo.match(/I:\s+(-?[\d.]+) LUFS/)[1], TP = +lo.match(/Peak:\s+(-?[\d.]+) dBFS/)[1], LRA = +lo.match(/LRA:\s+(-?[\d.]+) LU/)[1];
  ok(`${cut}: loudness about −11.7 LUFS (gain only, as loud as the true-peak limit allows)`, Math.abs(I + 11.7) <= 0.5, `${I} LUFS, range ${LRA} LU`);
  ok(`${cut}: true peak at or under −1.5 dBTP`, TP <= -1.5, `${TP} dBTP`);
  const xs = [0, C.dur / 2, C.dur - 3.5].map((s) => xcorr(pcm(wav, s, 3), pcm(V, s, 3)));
  ok(`${cut}: the film's audio is its music cut, in sync with the picture (start, middle, end)`, xs.every((x) => x.r > 0.98 && Math.abs(x.ms) <= 1), xs.map((x) => `r ${x.r.toFixed(4)} @ ${x.ms.toFixed(2)} ms`).join('; '));
  report.media[cut] = {frames: +v.nb_frames, duration: +probe.format.duration, video: `${v.codec_name} ${v.profile} ${v.pix_fmt} ${v.color_space}`, audio: `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`, sizeMB: +(probe.format.size / 1048576).toFixed(1), loudness: {I, TP, LRA}};
}
writeFileSync(join(ROOT, 'out/verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(report.fail.length ? `\n${report.fail.length} check(s) failed` : `\nall ${report.pass.length} checks passed → out/verification.json`);
process.exitCode = report.fail.length ? 1 : 0;
