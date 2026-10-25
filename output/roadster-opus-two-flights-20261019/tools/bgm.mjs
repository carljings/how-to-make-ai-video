#!/usr/bin/env node
// bgm.mjs — the soundtrack (v5): the user's chosen music at its own level (0 dB gain; no duck, no compression, no limiter,
// no time-stretch, no pitch change) with ONE splice that gives it an ending.
//
//   node tools/bgm.mjs [--ref PATH/reference-original.m4a]      → out/audio/master.wav + out/audio/bgm.json
//
// Audio map (film time ← source time), all constants from src/timeline.js:
//   A  film [0, SPLICE+XFADE)        ← source [0, SPLICE+XFADE)              (the song as is, up to just before bar 21's downbeat)
//   B  film [SPLICE, FADE_A1]        ← source film − OFF_END                  (the song's own first two bars and its own stop)
//   A and B overlap for XFADE (15 ms, equal-power); the opening is digital silence there (≤ −93 dBFS until 0.05 s), so B's first
//   hit — the strongest onset of the file — lands on bar 21's downbeat. After the song's own stop (STOP_F) its faint room
//   tail is faded to digital zero by FADE_A1; silence to END. The source's mid-bar hard cut (36.01 s) and the platform
//   end-card sound (37.07–37.48 s) are never used.
// A static trim is applied only if the true peak (native stereo, BS.1770 4× oversampled via ffmpeg ebur128) would exceed −1 dBTP.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { END, FADE_A0, FADE_A1, HARD_CUT, SPLICE, XFADE, OFF_END, STOP, STOP_F } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const REF = path.resolve(ROOT, opt('ref', '../../.omx/artifacts/roadster-reference-bgm-20261019/reference-original.m4a'));
const AUD = path.join(ROOT, 'out/audio'); fs.mkdirSync(AUD, { recursive: true });
const TP_MAX = -1.0;
const run = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.error(`ffmpeg failed (${r.status}):\n${r.stderr}`); process.exit(1); }
  return r;
};
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
export const meter = (file, pre = [], map = []) => {
  const e = run([...pre, '-i', file, ...map, '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true+sample', '-f', 'null', '-']).stderr, s = e.slice(e.lastIndexOf('Summary'));
  const num = (re, from = s) => +re.exec(from)[1];
  return { I: num(/I:\s+(-?[\d.]+) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.inf]+) dBFS/, s.slice(s.indexOf('True peak'))), SP: num(/Peak:\s+(-?[\d.inf]+) dBFS/, s.slice(s.indexOf('Sample peak'))) };
};
const pcm = (file, ss, t) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(ss), '-t', String(t), '-i', file, '-ac', '2', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }); return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4); };
// best normalised correlation over ±10 ms of lag (AAC seeking is not sample-exact), on the stereo-summed signal
const corr = (a, b) => {
  const m = (v) => { const o = new Float32Array(v.length / 2); for (let i = 0; i < o.length; i++) o[i] = v[2 * i] + v[2 * i + 1]; return o; };
  const x = m(a), y = m(b), n = Math.min(x.length, y.length) - 1000; let best = { c: -1, lag: 0 };
  for (let lag = -480; lag <= 480; lag++) {
    let s = 0, na = 0, nb = 0; for (let i = 500; i < n; i += 1) { const q = y[i + lag]; s += x[i] * q; na += x[i] * x[i]; nb += q * q; }
    const c = s / Math.sqrt(na * nb + 1e-20); if (c > best.c) best = { c, lag };
  }
  return best;
};
if (!fs.existsSync(REF)) { console.error(`missing music: ${REF}`); process.exit(1); }
if (!(SPLICE + XFADE < HARD_CUT) || !(FADE_A1 - OFF_END < HARD_CUT)) { console.error('the edit must stay clear of the source’s hard cut'); process.exit(1); }

const B0 = SPLICE - OFF_END, B1 = FADE_A1 - OFF_END + 0.01;
const graph = (gainDb) => [
  // two independent decodes of the same file (one stream split two ways stalls: part B needs its first 3.7 s, part A 35.5 s)
  `[0:a]atrim=end=${(SPLICE + XFADE).toFixed(5)},asetpts=PTS-STARTPTS[a]`,
  `[1:a]atrim=start=${B0.toFixed(5)}:end=${B1.toFixed(5)},asetpts=PTS-STARTPTS[b]`,
  `[a][b]acrossfade=d=${XFADE}:c1=qsin:c2=qsin,aresample=48000,aformat=sample_fmts=flt:channel_layouts=stereo,` +
  `afade=t=in:st=0:d=0.003,afade=t=out:st=${FADE_A0.toFixed(5)}:d=${(FADE_A1 - FADE_A0).toFixed(4)}:curve=tri,volume=${gainDb}dB,` +
  `atrim=end=${FADE_A1.toFixed(5)},apad=whole_dur=${END},atrim=end=${END}[out]`,
].join(';');
const pre = path.join(AUD, 'pre.wav');
run(['-y', '-i', REF, '-i', REF, '-filter_complex', graph(0), '-map', '[out]', '-c:a', 'pcm_f32le', pre]);
const m0 = meter(pre);
const trim = m0.TP > TP_MAX ? TP_MAX - m0.TP : 0;
const master = path.join(AUD, 'master.wav');
run(['-y', '-i', REF, '-i', REF, '-filter_complex', graph(trim.toFixed(3)), '-map', '[out]', '-c:a', 'pcm_s24le', master]);
fs.rmSync(pre);
const m1 = meter(master);
// levels: part A against the source over the same span; part B (the ending bars, before the stop) against its source span
const aEnd = SPLICE - 0.05, bS = SPLICE + 0.05, bE = STOP_F - 0.1;
const refA = meter(REF, ['-t', aEnd.toFixed(3)]), mA = meter(master, ['-t', aEnd.toFixed(3)]);
const refB = meter(REF, ['-ss', (bS - OFF_END).toFixed(3), '-t', (bE - bS).toFixed(3)]), mB = meter(master, ['-ss', bS.toFixed(3), '-t', (bE - bS).toFixed(3)]);
// sample identity of both parts (correlation at the mapped times) and the splice: largest sample step within ±20 ms of it,
// against the 99.9th percentile of steps over the whole master
const cA = corr(pcm(master, 30, 2), pcm(REF, 30, 2)), cB = corr(pcm(master, bS, 2), pcm(REF, bS - OFF_END, 2));
const all = pcm(master, 0, END), steps = [];
for (let i = 2; i < all.length; i += 2) steps.push(Math.abs(all[i] - all[i - 2]));
const sorted = Float32Array.from(steps).sort(), p999 = sorted[Math.floor(sorted.length * 0.999)];
let spliceStep = 0; for (let i = Math.floor((SPLICE - 0.02) * 48000); i < (SPLICE + XFADE + 0.02) * 48000; i++) spliceStep = Math.max(spliceStep, steps[i] ?? 0);
const tail = run(['-ss', String(FADE_A1 + 0.005), '-i', master, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
const rep = {
  about: 'User-chosen music at 0 dB with one splice into its own opening two bars and its own stop (the ending). Third-party music: rights not cleared (SOURCES.md).',
  source: { file: path.relative(ROOT, REF), sha256: sha(REF), whole: meter(REF) },
  edit: { map: [{ film: [0, +(SPLICE + XFADE).toFixed(4)], source: [0, +(SPLICE + XFADE).toFixed(4)] }, { film: [+SPLICE.toFixed(4), +FADE_A1.toFixed(4)], source: [+B0.toFixed(4), +(FADE_A1 - OFF_END).toFixed(4)] }],
    offset_ending_s: +OFF_END.toFixed(4), crossfade_s: XFADE, song_stop_source_s: STOP, song_stop_film_s: +STOP_F.toFixed(4), tail_fade_s: [+FADE_A0.toFixed(4), +FADE_A1.toFixed(4)],
    silence_s: [+FADE_A1.toFixed(4), END], end_s: END, gain_db: +trim.toFixed(3), duck: 'none', limiter: 'none', time_stretch: 'none', splices: 1 },
  master: { file: path.relative(ROOT, master), sha256: sha(master), whole: m1, part_A: mA, part_B: mB, corr_A_vs_source: { c: +cA.c.toFixed(6), lag_ms: +(cA.lag / 48).toFixed(3) }, corr_B_vs_source: { c: +cB.c.toFixed(6), lag_ms: +(cB.lag / 48).toFixed(3) },
    splice_max_step: +spliceStep.toFixed(5), all_steps_p999: +p999.toFixed(5), tail_after_fade_max_volume: /max_volume:\s+(-?[\d.inf]+) dB/.exec(tail)?.[1] },
  source_same_spans: { part_A: refA, part_B: refB },
};
rep.checks = {
  part_A_same_level_as_source: Math.abs(mA.I - refA.I) <= 0.3,
  part_B_same_level_as_source: Math.abs(mB.I - refB.I) <= 0.3,
  // same music at the same time: r ≥ 0.99 within ±1 ms (separately seeked AAC decodes differ by a fractional-sample phase)
  both_parts_are_the_source: cA.c >= 0.99 && cB.c >= 0.99 && Math.abs(cA.lag) <= 48 && Math.abs(cB.lag) <= 48,
  splice_no_click: spliceStep <= p999,
  true_peak: m1.TP <= TP_MAX,
  silent_tail: rep.master.tail_after_fade_max_volume === '-inf' || +rep.master.tail_after_fade_max_volume <= -90,   // volumedetect reports digital zero as −91 dB
};
fs.writeFileSync(path.join(AUD, 'bgm.json'), JSON.stringify(rep, null, 1) + '\n');
console.log(JSON.stringify(rep, null, 1));
process.exit(Object.values(rep.checks).every(Boolean) ? 0 : 2);
