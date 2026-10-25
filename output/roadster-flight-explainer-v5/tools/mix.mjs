#!/usr/bin/env node
// mix.mjs — voice + score → master (48 kHz / 24-bit stereo WAV + a JSON report next to it).
//
//   node tools/mix.mjs --prototype   prototype cut: only lines.prototype_lines (V01–V05)
//   node tools/mix.mjs               full film: all 17 lines
//   options: [--score out/audio/score.wav] [--out out/audio/master.wav] [--until SECONDS] [--fps 30]
//            [--voice-over 3] (voice LU above the score bed) [--duck 7] (dB of score ducking under the voice)
//
// The voice is the REAL aligned narration (narration/timing.json; the estimate is refused, file hashes are checked).
// Clips are placed by the same rule the picture uses (web/engine/voice.js placeClips). The cut length comes from the
// same events module as the picture (web/engine/events.js), so the master is exactly as long as the frame sequence:
// ceil(E.end * fps) / fps. A selected line that would not finish before that is an error: narration is never
// truncated. Lines that are not selected are left out entirely.
//
// Chain: voice HP 80 Hz → soft-knee compression → level set relative to the score; score ducked under the voice;
// master gain to −14 LUFS (BS.1770) → oversampled look-ahead limiter at −2.0 dBTP (headroom so the AAC encode stays
// ≤ −1.5 dBTP) → short fades at the ends. ffmpeg ebur128 re-measures the written file; > −1.9 dBTP is an error.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SR, Bus, readWavMono, writeWav, Biquad, lufs, limit, compress } from './dsp.mjs';
import { placeClips, Voice } from '../web/engine/voice.js';
import { filmEvents } from '../web/engine/events.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const has = (k) => argv.includes('--' + k);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const dB = (x) => 20 * Math.log10(Math.max(x, 1e-12));
const TARGET_LUFS = -14, CEILING_DBTP = -2.0, FAIL_DBTP = -1.9;

const prototype = has('prototype');
const FPS = +arg('fps', 30);
const scorePath = path.resolve(ROOT, arg('score', 'out/audio/score.wav'));
const outPath = path.resolve(ROOT, arg('out', 'out/audio/master.wav'));
const voiceOver = +arg('voice-over', 3);
const duckDb = +arg('duck', 7);

// ------------------------------------------------------------------------------------------------ the real voice
const linesPath = path.join(ROOT, 'narration/lines.zh-CN.json');
const spec = JSON.parse(fs.readFileSync(linesPath, 'utf8'));
const tPath = path.join(ROOT, 'narration/timing.json');
if (!fs.existsSync(tPath)) throw new Error('narration/timing.json missing: the master needs the real aligned voice (the estimate is not audio)');
const timing = JSON.parse(fs.readFileSync(tPath, 'utf8'));
if (timing.spec_sha256 && timing.spec_sha256 !== sha256(linesPath)) throw new Error('narration/timing.json was made for a different lines.zh-CN.json');
const E = filmEvents(new Voice(spec.lines, timing));
const frames = Math.ceil(E.end * FPS);
const until = +arg('until', frames / FPS);
const placed = placeClips(spec.lines, timing);
const want = prototype ? spec.prototype_lines : spec.lines.map((l) => l.id);
const chosen = want.map((id) => {
  const c = placed.find((p) => p.id === id);
  if (!c) throw new Error(`no aligned clip for ${id} in narration/timing.json`);
  if (c.end > until - 0.05) {
    throw new Error(`${c.id} (${c.start.toFixed(3)}–${c.end.toFixed(3)} s) does not finish before the cut ends at ${until.toFixed(3)} s; `
      + 'narration is never truncated' + (prototype ? '' : ' (full mode needs the picture timeline to cover every line: web/engine/events.js E.end)'));
  }
  return c;
});
const skipped = placed.filter((c) => !want.includes(c.id) && c.start < until).map((c) => c.id);

const n = Math.round(until * SR);
const voice = new Float32Array(n);
const clipsReport = [];
for (const c of chosen) {
  const f = path.resolve(ROOT, c.file || `narration/clips/${c.id}.wav`);
  if (!fs.existsSync(f)) throw new Error(`missing clip ${f}`);
  const meta = timing.clips.find((x) => x.id === c.id);
  const h = sha256(f);
  if (meta.sha256 && meta.sha256 !== h) throw new Error(`${f}: sha256 differs from narration/timing.json`);
  const w = readWavMono(f);
  if (w.sr !== SR) throw new Error(`${f}: ${w.sr} Hz (need ${SR})`);
  if (Math.abs(w.data.length / SR - c.duration) > 0.01) throw new Error(`${f}: ${(w.data.length / SR).toFixed(3)} s, timing says ${c.duration}`);
  const i0 = Math.round(c.start * SR);
  for (let k = 0; k < w.data.length; k++) voice[i0 + k] += w.data[k];
  clipsReport.push({ id: c.id, start: +c.start.toFixed(4), end: +c.end.toFixed(4), file: path.relative(ROOT, f), sha256: h });
  console.log(`${c.id} @ ${c.start.toFixed(3)}–${c.end.toFixed(3)} s  ${c.text}`);
}
if (skipped.length) console.log(`not in this cut: ${skipped.join(' ')}`);

// ------------------------------------------------------------------------------------------------ voice chain
const hp = new Biquad('hp', 80, 0.7);
for (let i = 0; i < n; i++) voice[i] = hp.run(voice[i]);
compress(voice, { thresh: -22, ratio: 3, knee: 10, attack: 0.002, release: 0.1 });

// ------------------------------------------------------------------------------------------------ score bed
const score = readWavStereo(scorePath);
const bedL = new Float32Array(n), bedR = new Float32Array(n);
for (let i = 0; i < n && i < score.n; i++) { bedL[i] = score.L[i]; bedR[i] = score.R[i]; }
const bedLufs = lufs(bedL, bedR);
const voiceLufs0 = lufs(voice, voice);
const gV = Math.pow(10, (bedLufs + voiceOver - voiceLufs0) / 20);
for (let i = 0; i < n; i++) voice[i] *= gV;
// TTS speech peaks ~18 dB over its loudness; the master budget is 12 dB (−14 LUFS / −2 dBTP). Hold the voice's own
// peaks 10.5 dB over its level here, so the master limiter only meets the occasional score hit, not every syllable.
const voiceGr = limit({ n, L: voice, R: new Float32Array(n) }, Math.pow(10, (bedLufs + voiceOver + 10.5) / 20), { lookahead: 0.0015, release: 0.05 });
let voiceMaxGr = 0;
for (let i = 0; i < n; i++) voiceMaxGr = Math.min(voiceMaxGr, dB(voiceGr[i]));

// duck: follower on the voice (attack 30 ms, release 250 ms), saturating at a quarter of its loud-speech level
const fol = new Float32Array(n);
let e = 0;
const aUp = 1 - Math.exp(-1 / (0.03 * SR)), aDn = 1 - Math.exp(-1 / (0.25 * SR));
for (let i = 0; i < n; i++) { const x = Math.abs(voice[i]); e += (x - e) * (x > e ? aUp : aDn); fol[i] = e; }
const speech = Array.from(fol).filter((x) => x > 1e-4).sort((a, b) => a - b);
const ref = speech.length ? speech[Math.floor(speech.length * 0.9)] : 1;
const floor = Math.pow(10, -duckDb / 20);

const bus = new Bus(until);
for (let i = 0; i < n; i++) {
  const g = 1 - (1 - floor) * Math.min(1, fol[i] / (0.25 * ref));
  bus.L[i] = bedL[i] * g + voice[i];
  bus.R[i] = bedR[i] * g + voice[i];
}

// ------------------------------------------------------------------------------------------------ master
const fadeIn = Math.round(0.003 * SR), fadeOut = Math.round(0.3 * SR);
const fades = () => {
  for (let i = 0; i < fadeIn && i < n; i++) { const g = i / fadeIn; bus.L[i] *= g; bus.R[i] *= g; }
  for (let i = Math.max(0, n - fadeOut); i < n; i++) { const g = 0.5 + 0.5 * Math.cos(Math.PI * (i - (n - fadeOut)) / fadeOut); bus.L[i] *= g; bus.R[i] *= g; }
};
fades();
const preLufs = lufs(bus.L, bus.R);
const ceiling = Math.pow(10, (CEILING_DBTP - 0.1) / 20);
const src = { L: Float32Array.from(bus.L), R: Float32Array.from(bus.R) };
let gain = Math.pow(10, (TARGET_LUFS - preLufs) / 20), out = preLufs, gr = null;
for (let pass = 0; pass < 4; pass++) {
  for (let i = 0; i < n; i++) { bus.L[i] = src.L[i] * gain; bus.R[i] = src.R[i] * gain; }
  gr = limit(bus, ceiling, { lookahead: 0.0015, release: 0.09 });
  out = lufs(bus.L, bus.R);
  if (Math.abs(out - TARGET_LUFS) < 0.1) break;
  gain *= Math.pow(10, (TARGET_LUFS - out) / 20);
}
let maxGr = 0, limited = 0;
for (let i = 0; i < n; i++) { if (gr[i] < 0.999) limited++; maxGr = Math.min(maxGr, dB(gr[i])); }

fs.mkdirSync(path.dirname(outPath), { recursive: true });
writeWav(outPath, bus);

// independent measurement of the written file
const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', outPath, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const grab = (re) => { const m = [...(r.stderr || '').matchAll(re)]; return m.length ? +m[m.length - 1][1] : null; };
const ffI = grab(/I:\s+(-?[\d.]+) LUFS/g), ffTP = grab(/Peak:\s+(-?[\d.]+) dBFS/g);
const report = {
  mode: prototype ? 'prototype' : 'full', fps: FPS, frames, seconds: +until.toFixed(4), samples: n,
  timing: 'narration/timing.json', spec_sha256: timing.spec_sha256 || null, score: path.relative(ROOT, scorePath), score_sha256: sha256(scorePath),
  clips: clipsReport, not_in_cut: skipped,
  levels: { bed_lufs: +bedLufs.toFixed(2), voice_lufs_after_level: +(voiceLufs0 + dB(gV)).toFixed(2), voice_over_bed_lu: voiceOver, duck_db: duckDb,
    voice_peak_limiter_max_gr_db: +voiceMaxGr.toFixed(2) },
  master: { target_lufs: TARGET_LUFS, ceiling_dbtp: CEILING_DBTP, lufs_js: +out.toFixed(2), lufs_ffmpeg: ffI, true_peak_ffmpeg_dbtp: ffTP,
    limiter_max_gr_db: +maxGr.toFixed(2), limiter_active_pct: +(100 * limited / n).toFixed(2) },
  wav: path.relative(ROOT, outPath), wav_sha256: sha256(outPath),
};
fs.writeFileSync(outPath.replace(/\.wav$/, '.json'), JSON.stringify(report, null, 1));
console.log(`master → ${outPath}: ${until.toFixed(4)} s (${frames} frames @ ${FPS}), ${ffI} LUFS, ${ffTP} dBTP `
  + `(bed ${bedLufs.toFixed(1)} LUFS, voice +${voiceOver} LU, limiter max ${maxGr.toFixed(1)} dB on ${report.master.limiter_active_pct} % of samples)`);
if (ffTP === null || ffTP > FAIL_DBTP) { console.error(`true peak ${ffTP} dBTP exceeds ${FAIL_DBTP}`); process.exit(1); }

function readWavStereo(p) {
  const b = fs.readFileSync(p);
  if (b.readUInt16LE(22) !== 2 || b.readUInt16LE(34) !== 24 || b.readUInt32LE(24) !== SR) throw new Error(`${p}: expected the 48 kHz 24-bit stereo score from tools/score.mjs`);
  const m = (b.length - 44) / 6;
  const L = new Float32Array(m), R = new Float32Array(m);
  for (let i = 0; i < m; i++) { L[i] = b.readIntLE(44 + i * 6, 3) / 8388608; R[i] = b.readIntLE(47 + i * 6, 3) / 8388608; }
  return { n: m, L, R };
}
