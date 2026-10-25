#!/usr/bin/env node
// mix.mjs — v7 master: the four score stems of tools/score.mjs → the film's soundtrack. Quiet by request: ONE static
// gain to −20 LUFS integrated (ITU-R BS.1770), true peak ≤ −6 dBTP. No limiter, no compressor, no normalisation to any
// other target; if the true peak would exceed the ceiling the score is wrong and this script fails instead of hiding it.
// No voice, TTS, old master or ducking: the score is the whole soundtrack.
//
//   node tools/mix.mjs [--stems out/audio/score] [--out out/audio] [--trim-pad 0] [--trim-motif 0] [--trim-accents 0] [--trim-air 0]
//   --trim-<stem> dB rebalances one stem (default 0 = the balance written by score.mjs); the master gain is recomputed,
//   so the master stays at −20 LUFS.
//
// Writes, each exactly FRAMES × 1600 samples (1770 / 30 = 59.0 s; 48 kHz, 24-bit stereo):
//   <out>/master.wav + master.json     the soundtrack and its measurements
//   <out>/stems/<stem>.wav             pad, motif, accents, air × the same gain — they sum to the master
//   <out>/master.proof.wav + .json     the proof range cues.PROOF (frames 0–413) at the film's own gain, 0.3 s fade-out
// Checks (exit 1): the sample counts; ffmpeg ebur128 on the written master: −20 ± 1 LUFS and true peak ≤ −6.0 dBTP; the
// proof cut's true peak ≤ −6.0 dBTP.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SR, Bus, writeWav, lufs, truePeakTrack } from './dsp.mjs';
import { FPS, FRAMES, END, PROOF, SHOTS } from '../web/engine/cues.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);
const TARGET_LUFS = -20, TOL_LU = 1.0, CEILING_DBTP = -6.0;
const STEMS = ['pad', 'motif', 'accents', 'air'];

const stemDir = path.resolve(ROOT, arg('stems', 'out/audio/score'));
const outDir = path.resolve(ROOT, arg('out', 'out/audio'));
if (SR % FPS) throw new Error(`${SR} Hz is not a whole number of samples per frame at ${FPS} fps`);
const SPF = SR / FPS, N = FRAMES * SPF;
const SEC = N / SR;

// ------------------------------------------------------------------------------------------------ stems → sum
const trims = Object.fromEntries(STEMS.map((k) => [k, +arg('trim-' + k, 0)]));
const stems = STEMS.map((name) => {
  const file = path.join(stemDir, `${name}.wav`);
  if (!fs.existsSync(file)) throw new Error(`${file} missing: run node tools/score.mjs first`);
  const s = readWavStereo(file);
  if (s.n !== N) throw new Error(`${file}: ${s.n} samples, the film needs exactly ${N}`);
  const g = 10 ** (trims[name] / 20);
  if (g !== 1) for (let i = 0; i < N; i++) { s.L[i] *= g; s.R[i] *= g; }
  return { name, file, sha: sha256(file), ...s };
});
const sum = new Bus(SEC);
for (const s of stems) for (let i = 0; i < N; i++) { sum.L[i] += s.L[i]; sum.R[i] += s.R[i]; }
// guard ramps at the edges (3 ms); score.mjs already starts from silence and fades to zero with the picture
const edge = Math.round(0.003 * SR);
for (const b of [sum, ...stems]) for (let k = 0; k < edge; k++) for (const i of [k, N - 1 - k]) { b.L[i] *= k / edge; b.R[i] *= k / edge; }

// ------------------------------------------------------------------------------------------------ one static gain
const inLufs = lufs(sum.L, sum.R);
const gain = 10 ** ((TARGET_LUFS - inLufs) / 20);
for (const b of [sum, ...stems]) for (let i = 0; i < N; i++) { b.L[i] *= gain; b.R[i] *= gain; }
const tpTrack = truePeakTrack([sum.L, sum.R]);
let tpMax = 0;
for (let i = 0; i < N; i++) if (tpTrack[i] > tpMax) tpMax = tpTrack[i];
const tpJs = dB(tpMax);
fs.mkdirSync(path.join(outDir, 'stems'), { recursive: true });
const masterPath = path.join(outDir, 'master.wav');
writeWav(masterPath, sum, 24);
const stemOut = stems.map((s) => {
  const file = path.join(outDir, 'stems', `${s.name}.wav`);
  writeWav(file, s, 24);
  return { name: s.name, file: path.relative(ROOT, file), sha256: sha256(file), trim_db: trims[s.name], ...measure(file) };
});
const ff = measure(masterPath);

// the written stems sum back to the written master (24-bit rounding only)
const back = readWavStereo(masterPath), parts = stemOut.map((s) => readWavStereo(path.join(ROOT, s.file)));
let sumErr = 0;
for (let i = 0; i < N; i++) for (const c of ['L', 'R']) { let v = 0; for (const p of parts) v += p[c][i]; sumErr = Math.max(sumErr, Math.abs(v - back[c][i])); }

// ------------------------------------------------------------------------------------------------ the proof cut
const p0 = PROOF.from * SPF, pn = (PROOF.to - PROOF.from + 1) * SPF;
const proof = new Bus(pn / SR);
const pf = Math.round(0.3 * SR);
for (let i = 0; i < pn; i++) {
  const g = i >= pn - pf ? 0.5 + 0.5 * Math.cos(Math.PI * (i - (pn - pf) + 1) / pf) : 1;
  proof.L[i] = sum.L[p0 + i] * g; proof.R[i] = sum.R[p0 + i] * g;
}
const proofPath = path.join(outDir, 'master.proof.wav');
writeWav(proofPath, proof, 24);
const ffProof = measure(proofPath);

// ------------------------------------------------------------------------------------------------ report
// loudness over time (3 s windows, 1 s hop) and per shot (gated over the shot; max momentary = 400 ms)
const win = (a, b) => lufs(sum.L.subarray(Math.round(a * SR), Math.round(b * SR)), sum.R.subarray(Math.round(a * SR), Math.round(b * SR)));
const shortTerm = [];
for (let t = 0; t + 3 <= SEC + 1e-9; t += 1) shortTerm.push([t, r2(win(t, t + 3))]);
const shots = SHOTS.map((s) => {
  let mx = -Infinity;
  for (let t = s.t0; t + 0.4 <= s.t1 + 1e-9; t += 0.1) mx = Math.max(mx, win(t, t + 0.4));
  return { id: s.id, t0: s.t0, t1: s.t1, lufs: r2(win(s.t0, s.t1)), max_momentary: r2(mx) };
});
const scoreSheet = path.join(stemDir, 'score.cues.json');
const report = {
  about: 'v7 「空气现形」 master: four score stems summed and raised by one static gain to −20 LUFS. No limiter, compressor, voice, TTS, old master or ducking. Generated by tools/mix.mjs.',
  node: process.version, voice: 'none', ducking: 'none', tts: 'none', limiter: 'none', compressor: 'none',
  fps: FPS, frames: FRAMES, seconds: SEC, film_seconds: END, samples: N, samples_per_frame: SPF, sample_rate: SR, bits: 24, channels: 2,
  cues_js_sha256: sha256(path.join(ROOT, 'web/engine/cues.js')),
  score: { stems: stems.map((s) => ({ name: s.name, file: path.relative(ROOT, s.file), sha256: s.sha })), cue_sheet: fs.existsSync(scoreSheet) ? path.relative(ROOT, scoreSheet) : null },
  master: { target_lufs: TARGET_LUFS, tolerance_lu: TOL_LU, ceiling_dbtp: CEILING_DBTP, sum_lufs_before_gain: r2(inLufs), static_gain_db: r2(dB(gain)),
    true_peak_js_dbtp: r2(tpJs), lufs_ffmpeg: ff.I, true_peak_ffmpeg_dbtp: ff.TP, lra_ffmpeg_lu: ff.LRA },
  wav: path.relative(ROOT, masterPath), wav_sha256: sha256(masterPath),
  stems: stemOut, stems_sum_max_error_lsb: Math.round(sumErr * 8388608),
  proof: { frames: [PROOF.from, PROOF.to], samples: pn, seconds: pn / SR, gain: 'the full film\'s static gain (not renormalised)', fade_out_s: 0.3,
    wav: path.relative(ROOT, proofPath), wav_sha256: sha256(proofPath), lufs_ffmpeg: ffProof.I, true_peak_ffmpeg_dbtp: ffProof.TP },
  loudness_by_shot: shots, short_term_3s: shortTerm,
};
fs.writeFileSync(path.join(outDir, 'master.json'), JSON.stringify(report, null, 1) + '\n');
fs.writeFileSync(proofPath.replace(/\.wav$/, '.json'), JSON.stringify({ ...report.proof, master: report.wav, master_sha256: report.wav_sha256 }, null, 1) + '\n');

console.log(`master → ${masterPath}: ${SEC.toFixed(4)} s = ${FRAMES} frames × ${SPF} samples (${N}), ${ff.I} LUFS, ${ff.TP} dBTP, LRA ${ff.LRA} LU `
  + `(stems sum ${inLufs.toFixed(2)} LUFS, static gain ${dB(gain) >= 0 ? '+' : ''}${dB(gain).toFixed(2)} dB, no limiter)`);
for (const s of stemOut) console.log(`  stem ${s.name.padEnd(8)} ${String(s.I).padStart(6)} LUFS, ${String(s.TP).padStart(6)} dBTP → ${s.file}`);
console.log(`  stems sum to the master within ${report.stems_sum_max_error_lsb} LSB (24-bit)`);
console.log(`  proof frames ${PROOF.from}–${PROOF.to} → ${proofPath}: ${ffProof.I} LUFS, ${ffProof.TP} dBTP`);
console.log('  by shot (LUFS / max momentary): ' + shots.map((s) => `${s.id} ${s.lufs}/${s.max_momentary}`).join(', '));
let fail = false;
if (ff.I === null || Math.abs(ff.I - TARGET_LUFS) > TOL_LU) { console.error(`integrated loudness ${ff.I} LUFS is not ${TARGET_LUFS} ± ${TOL_LU}`); fail = true; }
if (ff.TP === null || ff.TP > CEILING_DBTP) { console.error(`true peak ${ff.TP} dBTP exceeds ${CEILING_DBTP} dBTP — fix the score, do not limit`); fail = true; }
if (ffProof.TP === null || ffProof.TP > CEILING_DBTP) { console.error(`proof true peak ${ffProof.TP} dBTP exceeds ${CEILING_DBTP}`); fail = true; }
if (back.n !== N || ffProof.I === null) { console.error('sample count or proof measurement failed'); fail = true; }
process.exit(fail ? 1 : 0);

// ------------------------------------------------------------------------------------------------ helpers
// independent measurement of a written file: ffmpeg's BS.1770 meter (integrated, true peak, loudness range)
function measure(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const grab = (re) => { const m = [...(r.stderr || '').matchAll(re)]; return m.length ? +m[m.length - 1][1] : null; };
  return { I: grab(/I:\s+(-?[\d.]+) LUFS/g), TP: grab(/Peak:\s+(-?[\d.]+) dBFS/g), LRA: grab(/LRA:\s+(-?[\d.]+) LU/g) };
}
function readWavStereo(p) {
  const b = fs.readFileSync(p);
  if (b.readUInt16LE(22) !== 2 || b.readUInt16LE(34) !== 24 || b.readUInt32LE(24) !== SR) throw new Error(`${p}: expected 48 kHz 24-bit stereo`);
  const m = (b.length - 44) / 6;
  const L = new Float32Array(m), R = new Float32Array(m);
  for (let i = 0; i < m; i++) { L[i] = b.readIntLE(44 + i * 6, 3) / 8388608; R[i] = b.readIntLE(47 + i * 6, 3) / 8388608; }
  return { n: m, L, R };
}
