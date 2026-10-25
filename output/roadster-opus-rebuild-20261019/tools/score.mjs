#!/usr/bin/env node
// score.mjs — the original soundtrack of 《看不见的十吨》 (v2: a 120 BPM groove locked to the cut grid): quiet, pulsing, additive synthesis only (no noise source, no
// samples, no voice). Every onset is an instant of src/timeline.js (T). Writes out/audio/{pad,pulse,bells,low,air}.wav
// (raw stems), out/audio/master.wav (−20 LUFS integrated, true peak ≤ −6 dBTP, static gain, no limiter) and
// out/audio/score.json (events + measurements).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SR, TAU, Bus, rng, panLR, clamp, smooth, Biquad, freeverb, writeWav, lufs, truePeakTrack } from './dsp.mjs';
import { T, END, FPS, FRAMES } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'out/audio');
const N = FRAMES * (SR / FPS), SEC = N / SR, I = (t) => Math.round(t * SR);
const R = rng(20261019);
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rc = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x));
function curve(pts) {
  const out = new Float32Array(N); let j = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR; while (j < pts.length - 2 && t >= pts[j + 1][0]) j++;
    const [ta, va] = pts[j], [tb, vb] = pts[j + 1];
    out[i] = t <= ta ? va : t >= tb ? vb : va + (vb - va) * smooth((t - ta) / (tb - ta));
  }
  return out;
}
const STEMS = {}; for (const k of ['pad', 'pulse', 'bells', 'low', 'air']) STEMS[k] = { dry: new Bus(SEC), send: new Bus(SEC) };
const events = [];

// ------------------------------------------------------------------------------------------- v2: a 120 BPM groove
// One beat = 0.5 s (timeline BEAT). Every cut sits on a beat, so the music and the picture share one grid.
const B = 0.5, S16 = B / 4;
const V = {
  Bm: [47, 54, 59, 62, 66], G: [43, 50, 59, 62, 67], D: [50, 57, 62, 66, 69], Em: [52, 59, 64, 67, 71], A: [45, 52, 61, 64, 69],
  Gmaj7: [43, 50, 59, 62, 66, 71], Dhome: [50, 57, 62, 66, 69, 74],
};
const BASSROOT = { Bm: 35, G: 31, D: 38, Em: 40, A: 33, Gmaj7: 31, Dhome: 38 };
const CH = [[0, 'Bm'], [4.0, 'G'], [T.ten, 'Em'], [T.tenHit, 'D'], [T.dirs, 'G'], [T.plate, 'A'], [T.under, 'Bm'], [T.push, 'G'], [T.five, 'D'],
  [T.chase, 'A'], [T.drop, null], [T.catch, 'Gmaj7'], [33.5, 'A'], [T.ansA, 'Dhome']];
const chordAt = (t) => { let c = 'Bm'; for (const [tt, cc] of CH) if (t >= tt - 1e-9) c = cc; return c; };
CH.forEach(([t, c]) => events.push({ t, kind: 'chord', chord: c || 'rest' }));

// section levels (0..1) per voice
const KICK = curve([[0, 0], [T.q - 0.01, 0], [T.q, 0.55], [T.ten - 0.01, 0.55], [T.ten, 0.85], [T.chase, 0.85], [T.drop - 0.01, 0.85], [T.drop, 0], [T.catch - 0.01, 0], [T.catch, 0.6], [T.answer - 0.01, 0.6],
  [T.answer, 0.75], [39.0, 0.65], [40.0, 0], [END, 0]]);
const BASS = curve([[0, 0], [T.ten - 0.01, 0], [T.ten, 0.7], [T.drop - 0.01, 0.7], [T.drop, 0], [T.catch - 0.01, 0], [T.catch, 0.6], [T.answer - 0.01, 0.6], [T.answer, 0.7], [39.5, 0.7], [40.4, 0], [END, 0]]);
const ARP = curve([[0, 0.55], [T.air, 0.65], [T.under, 0.8], [T.chase, 0.95], [T.drop - 0.2, 0.9], [T.drop, 0], [T.catch - 0.01, 0], [T.catch, 0.8], [T.answer, 0.75], [T.fadeStart, 0.55], [END - 0.4, 0], [END, 0]]);
const STAB = curve([[0, 0], [T.under - 0.01, 0], [T.under, 0.7], [T.drop - 0.01, 0.7], [T.drop, 0], [T.catch - 0.01, 0], [T.catch, 0.6], [T.answer, 0.6], [39.0, 0.4], [40.0, 0], [END, 0]]);
const PAD = curve([[0, 0.0], [0.3, 0.5], [T.ten, 0.55], [T.tenHit, 0.8], [T.under, 0.6], [T.drop - 0.3, 0.5], [T.drop, 0.18], [T.catch - 0.05, 0.25], [T.catch + 0.3, 0.68], [T.answer, 0.7],
  [T.ansA, 0.72], [T.fadeStart, 0.62], [END - 0.4, 0.0], [END, 0.0]]);
const kicks = [];

// kick: a sine whose pitch falls 110 → 45 Hz in 70 ms, 5 ms attack, 0.22 s decay, gently saturated — a soft round thump, no click, no noise
function kick(t0, vel) {
  const a = I(t0), n = Math.min(I(0.6), N - a), { dry, send } = STEMS.low; let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR, f = 45 + 65 * Math.exp(-t / 0.035); ph += TAU * f / SR;
    const raw = Math.sin(ph) * rc(t / 0.005) * Math.exp(-t / 0.22), v = Math.tanh(2.4 * raw) / Math.tanh(2.4) * 0.3 * vel;   // soft saturation: harmonics that read on phone speakers, lower crest
    dry.L[a + k] += v; dry.R[a + k] += v; send.L[a + k] += v * 0.05; send.R[a + k] += v * 0.05;
  }
  kicks.push(t0);
}
// bass: additive, rounded (fundamental + 2 soft harmonics), short notes on eighths
function bass(t0, m, vel, dur = 0.22) {
  const f = mtof(m), a = I(t0), n = Math.min(I(dur + 0.25), N - a), { dry } = STEMS.low;
  for (let k = 0; k < n; k++) {
    const t = k / SR, env = rc(t / 0.008) * (t < dur ? 1 : Math.exp(-(t - dur) / 0.06)) * Math.exp(-t / 0.5);
    const v = (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t + 0.3) + 0.12 * Math.sin(TAU * 3 * f * t + 0.7)) * env * 0.32 * vel;
    dry.L[a + k] += v; dry.R[a + k] += v;
  }
}
// pad (held chords), pumped by the kicks (side-chain style breath)
function padNote(m, t0, t1, atk = 0.6, rel = 1.0) {
  const f = mtof(m), H = clamp(Math.floor(2400 / f), 1, 9), a = Math.max(0, I(t0)), b = Math.min(N, I(t1 + rel));
  const ph = Array.from({ length: H }, () => R() * TAU), [gl, gr] = panLR(((m * 7) % 12) / 11 * 0.8 - 0.4), g = m < 48 ? 0.45 : 0.75;
  const { dry, send } = STEMS.pad;
  for (let i = a; i < b; i++) {
    const t = i / SR, env = rc((t - t0) / atk) * (t > t1 ? 1 - rc((t - t1) / rel) : 1), lv = env * PAD[i] * g * PUMP[i];
    if (lv < 1e-6) continue;
    let v = 0; for (let h = 1; h <= H; h++) v += Math.sin(TAU * f * h * t * (1 + 0.0007 * (h - 1)) + ph[h - 1]) * h ** -1.3 * Math.exp(-(h - 1) * f / 800);
    v *= lv; dry.L[i] += v * gl; dry.R[i] += v * gr; send.L[i] += v * gl * 0.6; send.R[i] += v * gr * 0.6;
  }
}
function mallet(stem, t0, m, vel, { pan = 0, send = 0.5, bright = 1, dec = 1 } = {}) {
  const f = mtof(m), P = [[1, 1, 1.0 * dec], [2, 0.18 * bright, 0.45 * dec], [3, 0.05 * bright, 0.25 * dec], [4.07, 0.04 * bright, 0.12 * dec]];
  const a = I(t0), n = Math.min(I(4), N - a), [gl, gr] = panLR(pan), { dry, send: sd } = STEMS[stem];
  const d = P.map(([, , tau]) => Math.exp(-1 / (tau * SR))), lv = P.map(([, A]) => A * vel);
  for (let k = 0; k < n; k++) {
    const t = k / SR; let v = 0;
    for (let p = 0; p < P.length; p++) { v += lv[p] * Math.sin(TAU * f * P[p][0] * t); lv[p] *= d[p]; }
    v *= rc(t / (stem === 'pulse' ? 0.012 : 0.004)) * 0.25 * rc((n - k) / SR / 0.3);
    dry.L[a + k] += v * gl; dry.R[a + k] += v * gr; sd.L[a + k] += v * gl * send; sd.R[a + k] += v * gr * send;
  }
}
function low(t0, m, vel) {
  const a = I(t0), n = Math.min(I(3), N - a), P = [[1, 0.6, 1.2], [2, 1, 0.8], [3, 0.15, 0.4]], { dry, send } = STEMS.low;
  const d = P.map(([, , tau]) => Math.exp(-1 / (tau * SR))), lv = P.map(([, A]) => A * vel), f = mtof(m);
  for (let k = 0; k < n; k++) {
    const t = k / SR; let v = 0; for (let p = 0; p < P.length; p++) { v += lv[p] * Math.sin(TAU * f * P[p][0] * t + p); lv[p] *= d[p]; }
    v *= rc(t / 0.02) * 0.3 * rc((n - k) / SR / 0.3);
    dry.L[a + k] += v; dry.R[a + k] += v; send.L[a + k] += v * 0.25; send.R[a + k] += v * 0.25;
  }
  events.push({ t: t0, kind: 'low', note: m });
}
function air(t0, t1, notes, lvl) {
  const { dry, send } = STEMS.air;
  for (const m of notes) {
    const f = mtof(m), a = I(t0), b = Math.min(N, I(t1 + 1.0)), p0 = R() * TAU, p1 = R() * TAU;
    for (let i = a; i < b; i++) {
      const t = i / SR, env = rc((t - t0) / 0.8) * (t > t1 ? 1 - rc((t - t1) / 1.0) : 1);
      const v = env * lvl * 0.1 * (Math.sin(TAU * (f - 0.2) * t + p0) + 0.6 * Math.sin(TAU * (f + 0.2) * t + p1));
      dry.L[i] += v * 0.8; dry.R[i] += v * 0.6; send.L[i] += v; send.R[i] += v;
    }
  }
}

// ---- the grid: kicks, bass, arp (16ths), offbeat stabs
for (let k = 0; ; k++) {
  const t = k * B; if (t >= END - 0.4) break;
  const kl = KICK[Math.min(N - 1, I(t))], half = t < T.ten;            // half-time feel before the ten-tonne climb
  if (kl > 0.01 && (!half || k % 2 === 0)) kick(t, kl);
}
// the build into the edge: the kick doubles (eighths) for the last bar of the chase
for (let t = T.chase + 1.0; t < T.drop - 0.01; t += B / 2) if (Math.abs((t / B) % 1) > 0.01) kick(t, 0.45);
const ARPS = { Bm: [71, 74, 78, 74, 83, 78, 74, 71], G: [67, 71, 74, 79, 74, 71, 74, 79], D: [69, 74, 78, 81, 78, 74, 78, 81], Em: [71, 76, 79, 83, 79, 76, 79, 83],
  A: [69, 73, 76, 81, 76, 73, 76, 81], Gmaj7: [71, 74, 78, 83, 78, 74, 78, 83], Dhome: [74, 78, 81, 86, 81, 78, 81, 86] };
for (let k = 0; ; k++) {
  const t = 0.0 + k * S16; if (t >= T.fadeStart + 0.6) break;
  const c = chordAt(t); if (!c) continue;
  const lv = ARP[Math.min(N - 1, I(t))]; if (lv < 0.02) continue;
  const accent = k % 4 === 0 ? 1 : k % 2 === 0 ? 0.62 : 0.42;
  mallet('pulse', t, ARPS[c][k % 8], 0.36 * lv * accent, { pan: [-0.4, 0.3, -0.15, 0.4][k % 4], send: 0.3, bright: 0.6, dec: 0.32 });
}
for (let k = 0; ; k++) {
  const t = k * B / 2; if (t >= END - 0.4) break;
  const c = chordAt(t); if (!c) continue;
  const bl = BASS[Math.min(N - 1, I(t))]; if (bl > 0.01) bass(t, BASSROOT[c] + (k % 4 === 3 ? 7 : 0), bl * (k % 2 ? 0.7 : 1));
  const sl = STAB[Math.min(N - 1, I(t))];
  if (sl > 0.01 && k % 2 === 1) for (const m of V[c].slice(-3)) mallet('pulse', t, m, 0.11 * sl, { pan: 0, send: 0.45, bright: 0.5, dec: 0.18 });
}
// pump: pad ducks by up to 45 % right after each kick, back over ~0.22 s
const PUMP = new Float32Array(N).fill(1);
for (const tk of kicks) { const a = I(tk), n = Math.min(I(0.4), N - a); for (let k = 0; k < n; k++) PUMP[a + k] = Math.min(PUMP[a + k], 1 - 0.45 * Math.exp(-(k / SR) / 0.11)); }
{ // pad chords → held notes
  const active = new Map();
  CH.forEach(([t, c]) => {
    const want = new Set(c ? V[c] : []);
    for (const [m, o] of active) if (!want.has(m)) { padNote(m, o, t - 0.1, 0.5, c === null ? 0.3 : 0.6); active.delete(m); }
    for (const m of want) if (!active.has(m)) active.set(m, t + 0.02);
  });
  for (const [m, o] of active) padNote(m, o, T.fadeStart + 0.4, 0.5, 1.4);
}
// the fall: a high held tone under the silence, then a swell into the catch
air(T.drop + 0.1, T.catch - 0.2, [86], 0.7);
// bells on the reveals; the roll plays the rising line, one note per visible surface; the catch lands on the downbeat
const BELL = [
  [T.q, 81, 0.42, 'question lands'], [T.airWord, 86, 0.48, '空气'], [T.tenHit, 74, 0.45, '10 吨'], [T.tenHit + 0.012, 86, 0.28, '10 吨 (octave)'],
  [T.plate + 0.5, 78, 0.32, '= cancels'], [T.fan, 76, 0.3, '风扇+密封'], [T.push, 81, 0.36, '外面压得更重'], [T.five, 86, 0.45, '5%'],
  [T.tipOff, 69, 0.42, 'leaves the deck'], [T.flankOn, 74, 0.46, 'thin side'], [T.underOn, 76, 0.5, 'underside'], [T.level, 78, 0.52, 'level'],
  [T.catch, 81, 0.36, 'catch'], [T.ansA, 74, 0.48, '外面的空气'], [T.ansA + 0.015, 62, 0.28, 'home octave'], [T.ansB, 81, 0.4, '把它按在坡上'],
];
for (const [t, m, v, what] of BELL) { mallet('bells', t, m, v, { pan: 0.1, send: 0.75, bright: 1, dec: 1.4 }); events.push({ t, kind: 'bell', note: m, what }); }
low(T.catch, 31, 0.3); low(T.ansA, 38, 0.3);
air(T.air + 0.2, T.ten - 0.2, [78, 83], 0.9); air(T.answer + 0.3, T.fadeStart, [78, 81, 86], 0.8);

// ------------------------------------------------------------------------------------------- space, stems, master
const ROOM = { pad: [0.84, 0.5, 0.45, -25], pulse: [0.78, 0.45, 0.35, -1], bells: [0.86, 0.3, 0.7, -4.5], low: [0.6, 0.6, 0.15, -11], air: [0.88, 0.4, 0.9, -18] };
const hp = (bus, f) => { for (const ch of [bus.L, bus.R]) { const q = new Biquad('hp', f, 0.707); for (let i = 0; i < ch.length; i++) ch[i] = q.run(ch[i]); } };
const rms = (b) => { let e = 0; for (let i = 0; i < b.n; i++) e += b.L[i] * b.L[i] + b.R[i] * b.R[i]; return Math.sqrt(e / (2 * b.n)); };
fs.mkdirSync(OUT, { recursive: true });
const mixBus = new Bus(SEC), stems = {};
for (const [k, S] of Object.entries(STEMS)) {
  const [room, damp, wet, trim] = ROOM[k];
  hp(S.send, 180);
  const w = freeverb(S.send, { room, damp, predelay: 0.03 }), wg = rms(w) > 0 ? wet * rms(S.dry) / rms(w) : 0, g = 10 ** (trim / 20), o = new Bus(SEC);
  for (let i = 0; i < N; i++) { o.L[i] = (S.dry.L[i] + w.L[i] * wg) * g; o.R[i] = (S.dry.R[i] + w.R[i] * wg) * g; }
  hp(o, k === 'low' ? 30 : 60);
  stems[k] = o;
}
// the end: everything fades with the picture; the last 0.4 s is digital silence
const FIN = curve([[0, 1], [T.fadeStart, 1], [END - 0.4, 0], [END, 0]]);
for (const o of Object.values(stems)) for (let i = 0; i < N; i++) { o.L[i] *= FIN[i]; o.R[i] *= FIN[i]; if (i >= I(END - 0.4)) { o.L[i] = 0; o.R[i] = 0; } }
for (const o of Object.values(stems)) for (let i = 0; i < N; i++) { mixBus.L[i] += o.L[i]; mixBus.R[i] += o.R[i]; }
const L0 = lufs(mixBus.L, mixBus.R), gain = 10 ** ((-20 - L0) / 20);
for (const b of [mixBus, ...Object.values(stems)]) for (let i = 0; i < N; i++) { b.L[i] *= gain; b.R[i] *= gain; }
const tpTrack = truePeakTrack([mixBus.L, mixBus.R]); let tpMax = 0; for (let i = 0; i < tpTrack.length; i++) if (tpTrack[i] > tpMax) tpMax = tpTrack[i]; const tpDb = 20 * Math.log10(tpMax);
let tpAt = 0; for (let i = 0; i < tpTrack.length; i++) if (tpTrack[i] === tpMax) { tpAt = i; break; }
const contrib = Object.fromEntries(Object.entries(stems).map(([k, o]) => { let m = 0; for (let i = Math.max(0, tpAt - 200); i < Math.min(N, tpAt + 200); i++) m = Math.max(m, Math.abs(o.L[i]), Math.abs(o.R[i])); return [k, +(20 * Math.log10(m + 1e-12)).toFixed(1)]; }));
console.log(`true peak ${tpDb.toFixed(2)} dBTP at ${(tpAt / SR).toFixed(3)} s; stem peaks there (dBFS): ${JSON.stringify(contrib)}`);
if (tpDb > -6) { console.error('true peak > −6 dBTP: rebalance, no limiter'); process.exitCode = 3; }
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = {};
for (const [k, o] of Object.entries(stems)) { const f = path.join(OUT, `stem-${k}.wav`); writeWav(f, o, 24); files[k] = sha(f); }
const mf = path.join(OUT, 'master.wav'); writeWav(mf, mixBus, 24); files.master = sha(mf);
const report = { about: '《看不见的十吨》 original score; additive synthesis only (no noise generator, no samples, no voice). Stems × the same master gain sum to the master.',
  seconds: SEC, samples: N, sample_rate: SR, frames: FRAMES, fps: FPS, integrated_lufs_after: lufs(mixBus.L, mixBus.R), true_peak_dbtp: tpDb, gain_db: 20 * Math.log10(gain),
  silent_tail_s: 0.4, files, events: events.sort((a, b) => a.t - b.t).map((e) => ({ ...e, t: Math.round(e.t * 1000) / 1000, frame: Math.round(e.t * FPS) })) };
fs.writeFileSync(path.join(OUT, 'score.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`master: ${SEC.toFixed(3)} s, ${report.integrated_lufs_after.toFixed(2)} LUFS, ${tpDb.toFixed(2)} dBTP, gain ${report.gain_db.toFixed(2)} dB`);
