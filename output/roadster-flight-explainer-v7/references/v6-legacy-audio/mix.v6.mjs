#!/usr/bin/env node
// mix.mjs — v6 master: the voice-free procedural score → the film's master (48 kHz / 24-bit stereo WAV + a JSON
// report next to it). There is no voice in v6, so nothing is placed, levelled against speech or ducked: the score from
// tools/score.mjs is the whole soundtrack. No TTS, no v5 clips, no v5 mixed master.
//
//   node tools/mix.mjs            full film: exactly FRAMES / FPS of web/engine/cues.js (1623 / 30 = 54.1 s)
//   node tools/mix.mjs --proof    the prototype range cues.PROOF (frames 0–386, 12.9 s) → out/audio/master.proof.wav
//   options: [--score out/audio/score.wav] [--out out/audio/master.wav]
//
// Chain: trim to the frame count (sample-exact: 48000 / 30 = 1600 samples per frame) → 3 ms fade in, 0.3 s cosine
// fade out → gain to −14 LUFS integrated (BS.1770) → oversampled look-ahead limiter at −2.0 dBTP (0.1 dB margin) →
// ffmpeg ebur128 re-measures the written file: true peak above −1.9 dBTP, or loudness more than 0.5 LU off target, is
// an error.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SR, Bus, writeWav, lufs, limit } from './dsp.mjs';
import { FPS, FRAMES, END, PROOF } from '../web/engine/cues.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const has = (k) => argv.includes('--' + k);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const TARGET_LUFS = -14, CEILING_DBTP = -2.0, FAIL_DBTP = -1.9, FAIL_LU = 0.5;

const proof = has('proof');
const scorePath = path.resolve(ROOT, arg('score', 'out/audio/score.wav'));
const outPath = path.resolve(ROOT, arg('out', proof ? 'out/audio/master.proof.wav' : 'out/audio/master.wav'));
const frames = proof ? PROOF.to - PROOF.from + 1 : FRAMES;
const first = proof ? PROOF.from : 0;
if (SR % FPS) throw new Error(`${SR} Hz is not a whole number of samples per frame at ${FPS} fps`);
const n = frames * (SR / FPS), i0 = first * (SR / FPS);
const seconds = n / SR;

// ------------------------------------------------------------------------------------------------ the score
if (!fs.existsSync(scorePath)) throw new Error(`${scorePath} missing: run node tools/score.mjs first`);
const score = readWavStereo(scorePath);
if (score.n < i0 + n) throw new Error(`${scorePath}: ${(score.n / SR).toFixed(3)} s, the cut needs ${((i0 + n) / SR).toFixed(3)} s`);
const bus = new Bus(seconds);
for (let i = 0; i < n; i++) { bus.L[i] = score.L[i0 + i]; bus.R[i] = score.R[i0 + i]; }
const scoreLufs = lufs(bus.L, bus.R);

// ------------------------------------------------------------------------------------------------ master
const fadeIn = Math.round(0.003 * SR), fadeOut = Math.round(0.3 * SR);
for (let i = 0; i < fadeIn && i < n; i++) { const g = i / fadeIn; bus.L[i] *= g; bus.R[i] *= g; }
for (let i = Math.max(0, n - fadeOut); i < n; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * (i - (n - fadeOut)) / fadeOut); bus.L[i] *= g; bus.R[i] *= g; }
const preLufs = lufs(bus.L, bus.R);
const src = { L: Float32Array.from(bus.L), R: Float32Array.from(bus.R) };
let gain = Math.pow(10, (TARGET_LUFS - preLufs) / 20), out = preLufs, gr = null;
function master(ceilDb) {           // gain to the target loudness through the limiter at ceilDb (a few passes)
  const ceiling = Math.pow(10, ceilDb / 20);
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < n; i++) { bus.L[i] = src.L[i] * gain; bus.R[i] = src.R[i] * gain; }
    gr = limit(bus, ceiling, { lookahead: 0.0015, release: 0.09 });
    out = lufs(bus.L, bus.R);
    if (Math.abs(out - TARGET_LUFS) < 0.1) break;
    gain *= Math.pow(10, (TARGET_LUFS - out) / 20);
  }
}
// independent measurement of the written file
const measure = () => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', outPath, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const grab = (re) => { const m = [...(r.stderr || '').matchAll(re)]; return m.length ? +m[m.length - 1][1] : null; };
  return { I: grab(/I:\s+(-?[\d.]+) LUFS/g), TP: grab(/Peak:\s+(-?[\d.]+) dBFS/g), LRA: grab(/LRA:\s+(-?[\d.]+) LU/g) };
};
// the limiter's own 4× true-peak estimate reads a little low on dense high-frequency material, so its ceiling is
// calibrated against ffmpeg's BS.1770 true-peak meter until the written file measures ≤ −2.0 dBTP
fs.mkdirSync(path.dirname(outPath), { recursive: true });
let ceilDb = CEILING_DBTP - 0.1, ff = null;
for (let tries = 0; tries < 5; tries++) {
  master(ceilDb);
  writeWav(outPath, bus);
  ff = measure();
  if (ff.TP === null || ff.TP <= CEILING_DBTP) break;
  ceilDb -= ff.TP - CEILING_DBTP + 0.05;
}
let maxGr = 0, limited = 0, over1 = 0;
for (let i = 0; i < n; i++) { if (gr[i] < 0.999) limited++; if (gr[i] < 0.891) over1++; maxGr = Math.min(maxGr, dB(gr[i])); }
const ffI = ff.I, ffTP = ff.TP, ffLRA = ff.LRA;
const cuesPath = path.join(ROOT, 'web/engine/cues.js'), sheetPath = scorePath.replace(/\.wav$/, '.cues.json');
const report = {
  mode: proof ? 'proof' : 'full', voice: 'none', ducking: 'none', tts: 'none',
  fps: FPS, first_frame: first, frames, seconds: +seconds.toFixed(4), samples: n, samples_per_frame: SR / FPS, sample_rate: SR,
  film: { frames: FRAMES, seconds: END }, cues_js_sha256: sha256(cuesPath),
  score: path.relative(ROOT, scorePath), score_sha256: sha256(scorePath),
  score_cues: fs.existsSync(sheetPath) ? path.relative(ROOT, sheetPath) : null,
  levels: { score_lufs_in_cut: +scoreLufs.toFixed(2), gain_db: +dB(gain).toFixed(2) },
  master: { target_lufs: TARGET_LUFS, ceiling_dbtp: CEILING_DBTP, limiter_ceiling_db: +ceilDb.toFixed(2), lufs_js: +out.toFixed(2),
    lufs_ffmpeg: ffI, true_peak_ffmpeg_dbtp: ffTP, lra_ffmpeg_lu: ffLRA, limiter_max_gr_db: +maxGr.toFixed(2),
    limiter_active_pct: +(100 * limited / n).toFixed(2), limiter_over_1db_pct: +(100 * over1 / n).toFixed(2) },
  wav: path.relative(ROOT, outPath), wav_sha256: sha256(outPath),
};
fs.writeFileSync(outPath.replace(/\.wav$/, '.json'), JSON.stringify(report, null, 1));
console.log(`master → ${outPath}: ${seconds.toFixed(4)} s = ${frames} frames @ ${FPS} (${n} samples), ${ffI} LUFS, ${ffTP} dBTP, LRA ${ffLRA} LU `
  + `(score ${scoreLufs.toFixed(1)} LUFS, gain ${dB(gain).toFixed(1)} dB, limiter max ${maxGr.toFixed(1)} dB, > 1 dB on ${report.master.limiter_over_1db_pct} % of samples, ceiling ${ceilDb.toFixed(2)} dB)`);
if (ffTP === null || ffTP > FAIL_DBTP) { console.error(`true peak ${ffTP} dBTP exceeds ${FAIL_DBTP}`); process.exit(1); }
if (ffI === null || Math.abs(ffI - TARGET_LUFS) > FAIL_LU) { console.error(`integrated loudness ${ffI} LUFS is not ${TARGET_LUFS} ± ${FAIL_LU}`); process.exit(1); }

function readWavStereo(p) {
  const b = fs.readFileSync(p);
  if (b.readUInt16LE(22) !== 2 || b.readUInt16LE(34) !== 24 || b.readUInt32LE(24) !== SR) throw new Error(`${p}: expected the 48 kHz 24-bit stereo score from tools/score.mjs`);
  const m = (b.length - 44) / 6;
  const L = new Float32Array(m), R = new Float32Array(m);
  for (let i = 0; i < m; i++) { L[i] = b.readIntLE(44 + i * 6, 3) / 8388608; R[i] = b.readIntLE(47 + i * 6, 3) / 8388608; }
  return { n: m, L, R };
}
