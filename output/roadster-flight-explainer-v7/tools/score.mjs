#!/usr/bin/env node
// score.mjs — v7 「空气现形」: the quiet original score, rebuilt from zero after the v6 score was judged noisy and
// unpleasant. A sparse, warm pad on consonant triads (D major), a small five-note motif on a soft glass-mallet tone, six
// soft low accents on the causal turns, a faint tonal shimmer while the air is visible, and long quiet spaces. Purely
// additive synthesis: there is no noise source anywhere (no rain, crackle, hats, dust ticks, whines, glitches, booms,
// risers or hiss), no voice, no samples, nothing from the v6 score or master. Every onset is an instant of
// web/engine/cues.js (E), the schedule the picture uses. Deterministic: a seeded PRNG (oscillator phases only), and the
// Freeverb and biquads of tools/dsp.mjs.
//
//   node tools/score.mjs [--out /ABS/out/audio/score]
//
// Writes four raw (unmastered) stems, each exactly FRAMES / FPS long (1770 / 30 = 59.0 s; 48 kHz, 24-bit stereo):
// pad.wav, motif.wav, accents.wav, air.wav — and score.cues.json (every chord, note and accent with its cues.js instant
// and frame). tools/mix.mjs sums the stems and masters them (one static gain to −20 LUFS, true peak ≤ −6 dBTP).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { SR, TAU, Bus, rng, panLR, clamp, smooth, Biquad, freeverb, writeWav } from './dsp.mjs';
import { E, END, FPS, FRAMES } from '../web/engine/cues.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const outDir = path.resolve(ROOT, arg('out', 'out/audio/score'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const r4 = (x) => Math.round(x * 10000) / 10000;

if (SR % FPS) throw new Error(`${SR} Hz is not a whole number of samples per frame at ${FPS} fps`);
const N = FRAMES * (SR / FPS);                 // 1770 × 1600 = 2,832,000 samples: exactly the picture
const SEC = N / SR;
if (Math.abs(SEC - END) > 1 / FPS) throw new Error(`audio ${SEC} s vs film ${END} s`);
const R = rng(71018);
const I = (t) => Math.round(t * SR);
const frameOf = (t) => Math.round(t * FPS);
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nn = (m) => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const rc = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * x));   // raised-cosine ramp 0 → 1

// piecewise automation [(t, value)…] with smoothstep segments, sampled once per sample
function curve(pts) {
  const out = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    while (j < pts.length - 2 && t >= pts[j + 1][0]) j++;
    const [ta, va] = pts[j], [tb, vb] = pts[j + 1];
    out[i] = t <= ta ? va : t >= tb ? vb : va + (vb - va) * smooth((t - ta) / (tb - ta));
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the plan
// Harmony: D major, one chord per causal step. Voicings keep every third at or above F#3 (no low-register mud) and
// contain no seconds (no clusters). A change is a breath, not a smear: tones leaving release over REL from LEAD s before
// the instant, tones arriving start GAP s later and swell over ATK, so a step-wise move (G → A) never sounds as a
// sustained second; common tones simply hold.
const V = {
  Bm: [35, 42, 54, 59, 62],              // B1 F#2 F#3 B3 D4
  G: [31, 43, 50, 59, 62],               // G1 G2 D3 B3 D4
  D: [38, 45, 54, 57, 62],               // D2 A2 F#3 A3 D4
  Em: [40, 47, 55, 59, 64],              // E2 B2 G3 B3 E4
  A: [33, 45, 52, 61, 64],               // A1 A2 E3 C#4 E4
  Gsus: [31, 43, 50, 57, 62],            // G1 G2 D3 A3 D4: open fifths, the hover
  Dhome: [38, 45, 54, 57, 62, 66],       // D2 A2 F#3 A3 D4 F#4: home
};
// the air shimmer: three chord tones an octave or two above the pad
const AIRV = { Bm: [71, 74, 78], G: [71, 74, 79], D: [74, 78, 81], Em: [71, 76, 79], A: [73, 76, 81], Gsus: [69, 74, 79], Dhome: [74, 78, 81] };
const LEAD = 0.55, GAP = 0.3, ATK = 1.5, REL = 1.0;
const CHORDS = [
  { t: E.hook, c: 'Bm', what: 'A1 the poster: the pad enters, near silent' },
  { t: E.ask, c: 'G', what: 'A2 吸附从何而来？ — the motif asks' },
  { t: E.ping, c: 'D', what: 'A3 the Ping: the air becomes visible' },
  { t: E.plate1, c: 'G', what: 'B1 plate 1 (fan + seal)' },
  { t: E.lowP, c: 'Em', what: 'B1 低压区·有空气' },
  { t: E.converge, c: 'A', what: 'B2 the impacts converge into one push' },
  { t: E.cut56, c: 'D', what: 'B3 才抓得住 — a gentle resolution' },
  { t: E.cut67, c: 'G', what: 'C1 the pad climbs' },
  { t: E.gravAll, c: 'A', what: 'C1 重力，始终向下' },
  { t: E.cut78, c: 'Bm', what: 'D1 the free end: space' },
  { t: E.weak, c: 'G', what: 'D2 吸附减弱' },
  { t: E.plate2, c: 'Em', what: 'E1 plate 2 (stored gas): cool' },
  { t: E.cut1011, c: 'A', what: 'E2 exhaust down, thrust up' },
  { t: E.black, c: null, what: 'S black: the pad has gone', lead: 0.3, rel: 0.6 },
  { t: E.lot, c: 'Gsus', what: 'F1 the other demonstration: the hover' },
  { t: E.flip, c: 'Bm', what: 'F1 the flip' },
  { t: E.cut1314, c: 'G', what: 'G1 summary' },
  { t: E.refill, c: 'A', what: 'G1 储气有限，需补气' },
  { t: E.title, c: 'Dhome', what: 'title 空气现形: home', lead: 0.3, gap: 0.15, atk: 0.9, rel: 0.7 },
];

// Loudness shape of the pad (0–1): soft in the night shots, fuller where a causal step lands, near silence at the free
// end (D1), the drop (D3) and the separator (S).
const PAD = curve([
  [0.0, 0.0], [2.6, 0.5], [3.45, 0.55],                                // A1
  [3.7, 0.6], [5.7, 0.62],                                             // A2
  [6.1, 0.72], [7.15, 0.8], [9.3, 0.78],                               // A3
  [9.7, 0.62], [13.6, 0.68],                                           // B1
  [14.1, 0.76], [16.8, 0.82], [17.55, 1.0], [20.6, 0.9],              // B2
  [21.2, 0.68], [23.4, 0.68],                                          // B3
  [23.8, 0.72], [27.4, 0.92],                                          // C1
  [28.1, 0.3], [30.25, 0.32],                                          // D1
  [30.55, 0.6], [32.6, 0.45], [33.0, 0.3], [33.6, 0.3],                // D2, D3
  [34.0, 0.62], [37.1, 0.66],                                          // E1
  [37.45, 0.74], [38.55, 0.8], [40.3, 0.7], [41.0, 0.0],               // E2, E3 → black
  [42.0, 0.0], [42.9, 0.55], [47.05, 0.6], [47.9, 0.8], [49.8, 0.75], // S, F1
  [50.1, 0.72], [53.95, 0.76], [56.4, 0.8], [END, 0.82],               // G1, title
]);
// the shimmer follows the air-vision worlds (A3–B2, C1, D2, E1–E2, the F1 plate), faint in G1
const AIR = curve([
  [0.0, 0.0], [5.95, 0.0], [7.0, 0.9], [9.4, 0.9], [9.9, 0.6], [13.6, 0.6], [14.1, 0.95], [20.6, 0.95], [21.15, 0.0],
  [23.6, 0.0], [24.4, 0.85], [27.6, 0.85], [28.05, 0.0],
  [30.45, 0.0], [31.1, 0.7], [32.6, 0.6], [33.05, 0.0],
  [33.8, 0.0], [34.5, 0.7], [37.3, 0.7], [37.7, 0.8], [40.0, 0.8], [40.6, 0.0],
  [43.1, 0.0], [43.7, 0.75], [47.05, 0.75], [47.7, 0.0],
  [49.95, 0.0], [50.9, 0.5], [56.4, 0.6], [END, 0.6],
]);
// one shared ending: the home chord rings from the title, then everything fades with the picture (to 0 at the last
// sample)
const FINAL = curve([[0, 1], [57.6, 1], [END, 0]]);
// pad brightness: a little more open while the air is visible
const BRIGHT = new Float32Array(N);
for (let i = 0; i < N; i++) BRIGHT[i] = 640 + 300 * AIR[i];

// The motif: five notes, rising a fourth then by steps — the question ends one step above home (E), the answer lands
// on home (D). It returns at the question, plate 1 (an octave lower: low pressure), plate 2 (cool, a step higher in the
// pentatonic) and the close (augmented, resolving on the title).
const Q = { notes: [69, 74, 76, 78, 76], at: [0, 0.32, 0.56, 0.8, 1.36], vel: [0.72, 0.86, 0.78, 0.9, 0.66] };
const MOTIF = [
  { name: 'question', t: E.ask + 0.15, ...Q, what: 'A2 吸附从何而来？' },
  { name: 'low (plate 1)', t: E.fanOn, notes: Q.notes.map((m) => m - 12), at: Q.at.map((x) => x * 1.05), vel: Q.vel.map((v) => v * 1.3), what: 'B1 风扇 + 密封 / 维持车底低压' },
  { name: 'cool (plate 2)', t: E.plate2 + 0.35, notes: [71, 76, 78, 81, 78], at: Q.at, vel: Q.vel.map((v) => v * 0.92), cool: true, what: 'E1 车载高压气体' },
  { name: 'answer (home)', t: E.title - 2.4, notes: [69, 74, 76, 78, 74], at: [0, 0.6, 1.2, 1.8, 2.4], vel: [0.8, 0.92, 0.9, 0.92, 0.8], damp: 0.08, what: 'G1 储气有限，需补气 → title' },
];
// single tones: the Ping, the separator, and home's lower octave under the last note of the answer (rolled 15 ms
// after it, as a hand would, so the octave does not strike in phase)
const TONES = [
  { t: E.ping, m: 81, vel: 0.5, pan: 0.25, what: 'A3 the Ping' },
  { t: E.sepIn, m: 69, vel: 0.56, pan: -0.1, what: 'S 另一场演示' },
  { t: E.title + 0.015, m: 62, vel: 0.32, pan: -0.15, what: 'title: home, lower octave' },
];
// six soft low accents, one per causal turn: no click, no pitch sweep, a 30 ms attack; m is the sub of the soft octave
// (D2 = a D2 + D3 octave). The seal one descends a major third (B → G) as the adhesion weakens.
const ACCENTS = [
  { t: E.press, m: 38, vel: 0.72, what: 'A3 压: air presses on every surface' },
  { t: E.beam, m: 33, vel: 0.9, what: 'B2 压力差: the push' },
  { t: E.open, m: 35, m1: 31, glide: 1.25, vel: 0.78, what: 'D2 密封被破坏 → 吸附减弱 (descending)' },
  { t: E.push, m: 33, vel: 0.8, what: 'E2 推力向上' },
  { t: E.flip, m: 35, vel: 0.84, what: 'F1 the flip' },
  { t: E.title + 0.3, m: 38, vel: 0.55, what: 'title 空气现形 lands: a soft bloom under the resolved motif (the softest accent)' },
];

// ------------------------------------------------------------------------------------------------ instruments
const STEMS = {};
for (const k of ['pad', 'motif', 'accents', 'air']) STEMS[k] = { dry: new Bus(SEC), send: new Bus(SEC) };

// Pad voice: additive harmonics with a soft low-pass roll-off (a_h = h^-1.15 · e^(-(h-1) f / B), B = BRIGHT) and a slow
// ±10 % breath. Below C3 one steady oscillator; above, a main oscillator and a quieter one 5 cents apart (1 : 0.45,
// panned apart) — a gentle shimmer, never the full-depth beating of an equal detuned pair. Harmonics come from the
// Chebyshev recurrence on one sin/cos pair per oscillator.
const padGain = (m) => (m < 40 ? 0.32 : m < 48 ? 0.55 : m < 60 ? 0.85 : 0.74);      // moderate low end
const padPan = (m) => (m < 40 ? 0 : clamp(((m * 7) % 12) / 11 * 0.9 - 0.45, -0.45, 0.45));
function padNote(nt, sendLevel = 0.55) {
  const f = mtof(nt.m), H = clamp(Math.floor(2600 / f), 1, nt.m < 40 ? 6 : 10), g = padGain(nt.m);
  const a = Math.max(0, I(nt.t0)), b = Math.min(N, I(nt.t1 + nt.rel));
  const layout = nt.m < 48 ? [[0, 0.75, 0]] : [[-1, 0.62, -0.2], [1, 0.28, 0.2]];   // [detune sign, amplitude, pan offset]
  const oscs = layout.map(([s, k, dp]) => {
    const th = Array.from({ length: H }, () => R() * TAU);
    const [gl, gr] = panLR(clamp(padPan(nt.m) + dp, -1, 1));
    return { w: TAU * f * 2 ** (s * 2.5 / 1200), ch: th.map(Math.cos), sh: th.map(Math.sin), gl: gl * k, gr: gr * k };
  });
  const lfoF = 0.05 + 0.07 * R(), lfoP = R() * TAU;
  const amp = new Float64Array(H);
  const { dry, send } = STEMS.pad;
  let ampAt = -Infinity;
  for (let i = a; i < b; i++) {
    const t = i / SR;
    const env = rc((t - nt.t0) / nt.atk) * (t > nt.t1 ? 1 - rc((t - nt.t1) / nt.rel) : 1);
    const lv = env * PAD[i] * g * (1 + 0.1 * Math.sin(TAU * lfoF * t + lfoP));
    if (lv < 1e-6) continue;
    if (i - ampAt >= 256) { ampAt = i; for (let h = 1; h <= H; h++) amp[h - 1] = h ** -1.15 * Math.exp(-(h - 1) * f / BRIGHT[i]); }
    let l = 0, r = 0;
    for (const o of oscs) {
      const x = o.w * t, sx = Math.sin(x), cx = Math.cos(x);
      let s0 = 0, c0 = 1, s1 = sx, c1 = cx, v = amp[0] * (s1 * o.ch[0] + c1 * o.sh[0]);
      for (let h = 2; h <= H; h++) {
        const s2 = 2 * cx * s1 - s0, c2 = 2 * cx * c1 - c0;
        v += amp[h - 1] * (s2 * o.ch[h - 1] + c2 * o.sh[h - 1]);
        s0 = s1; s1 = s2; c0 = c1; c1 = c2;
      }
      l += v * o.gl; r += v * o.gr;
    }
    l *= lv; r *= lv;
    dry.L[i] += l; dry.R[i] += r;
    send.L[i] += l * sendLevel; send.R[i] += r * sendLevel;
  }
}

// Glass mallet: a soft 6 ms attack, near-harmonic partials that decay faster the higher they are. "cool" is purer
// (fewer upper partials, a longer ring). `damp` (s): from then on the note is dampened (τ 0.22 s), as a player stills a
// bar when the next one sounds, so neighbouring melody notes overlap only briefly.
function mallet(t0, m, vel, { cool = false, pan = 0, sendLevel = 0.7, damp = Infinity } = {}) {
  const f = mtof(m);
  const P = cool ? [[1, 1, 1.9], [2, 0.08, 0.7], [3, 0.02, 0.3]] : [[1, 1, 1.5], [2, 0.2, 0.6], [3, 0.055, 0.3], [4.07, 0.045, 0.16]];
  const a = I(t0), n = Math.min(I(8), N - a);
  const [gl, gr] = panLR(pan);
  const dec = P.map(([, , tau]) => Math.exp(-1 / (tau * SR))), lv = P.map(([, amp]) => amp * vel);
  const { dry, send } = STEMS.motif;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let v = 0;
    for (let p = 0; p < P.length; p++) { v += lv[p] * Math.sin(TAU * f * P[p][0] * t); lv[p] *= dec[p]; }
    v *= rc(t / 0.006) * 0.25 * (t > damp ? Math.exp(-(t - damp) / 0.22) : 1) * rc((n - k) / SR / 0.5);   // no step at the buffer end
    dry.L[a + k] += v * gl; dry.R[a + k] += v * gr;
    send.L[a + k] += v * gl * sendLevel; send.R[a + k] += v * gr * sendLevel;
  }
}

// Soft low accent: a soft octave — the low note m as a quiet sub under its upper octave (which carries the accent and
// still reads on a phone speaker), a 30 ms raised-cosine attack, no click, no noise, partials offset in phase so the
// waveform stays round; optionally a slow glide (smoothstep over `glide` s) from m to m1.
function accent(t0, m, vel, { m1 = m, glide = 0, sendLevel = 0.3 } = {}) {
  const f0 = mtof(m), f1 = mtof(m1);
  const P = [[1, 0.2, 1.8, 0], [2, 1, 1.4, 0], [4, 0.28, 0.8, 1.3], [6, 0.09, 0.45, 2.1]];
  const a = I(t0), n = Math.min(I(7), N - a);
  const dec = P.map(([, , tau]) => Math.exp(-1 / (tau * SR))), lv = P.map(([, amp]) => amp * vel);
  const { dry, send } = STEMS.accents;
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    const f = glide > 0 ? f0 * (f1 / f0) ** smooth(t / glide) : f0;
    ph += TAU * f / SR;
    let v = 0;
    for (let p = 0; p < P.length; p++) { v += lv[p] * Math.sin(P[p][0] * ph + P[p][3]); lv[p] *= dec[p]; }
    v *= rc(t / 0.03) * 0.3 * rc((n - k) / SR / 0.5);
    dry.L[a + k] += v; dry.R[a + k] += v;
    send.L[a + k] += v * sendLevel; send.R[a + k] += v * sendLevel;
  }
}

// Air shimmer: each tone is a pair of sines 0.42 Hz apart (1 : 0.55, so the slow beat never cancels), wide in the
// stereo field, with a faint second harmonic and a slow breath; it exists only where AIR > 0.
function airNote(nt, sendLevel = 0.9) {
  const f = mtof(nt.m);
  const a = Math.max(0, I(nt.t0)), b = Math.min(N, I(nt.t1 + nt.rel));
  const p = [R() * TAU, R() * TAU, R() * TAU, R() * TAU];
  const lfoF = 0.1 + 0.09 * R(), lfoP = R() * TAU;
  const [gl0, gr0] = panLR(-0.6), [gl1, gr1] = panLR(0.6);
  const { dry, send } = STEMS.air;
  for (let i = a; i < b; i++) {
    const t = i / SR;
    const env = rc((t - nt.t0) / nt.atk) * (t > nt.t1 ? 1 - rc((t - nt.t1) / nt.rel) : 1);
    const lv = env * AIR[i] * (0.7 + 0.3 * Math.sin(TAU * lfoF * t + lfoP)) * 0.12;
    if (lv < 1e-6) continue;
    const x0 = TAU * (f - 0.21) * t, x1 = TAU * (f + 0.21) * t;
    const v0 = (Math.sin(x0 + p[0]) + 0.1 * Math.sin(2 * x0 + p[2])) * lv, v1 = (Math.sin(x1 + p[1]) + 0.1 * Math.sin(2 * x1 + p[3])) * lv * 0.55;
    const l = v0 * gl0 + v1 * gl1, r = v0 * gr0 + v1 * gr1;
    dry.L[i] += l; dry.R[i] += r;
    send.L[i] += l * sendLevel; send.R[i] += r * sendLevel;
  }
}

// ------------------------------------------------------------------------------------------------ render
// chords → held notes: a pitch in consecutive chords is one note (common tones hold); others release as the next
// chord attacks
function heldNotes(voicing, { atk, rel, gap }) {
  const notes = [], active = new Map();
  for (const ch of CHORDS) {
    const ts = ch.t - (ch.lead ?? LEAD);
    const want = new Set(ch.c ? voicing[ch.c] : []);
    for (const [m, o] of active) if (!want.has(m)) { o.t1 = ts; o.rel = ch.rel ?? rel; active.delete(m); }
    for (const m of want) if (!active.has(m)) { const o = { m, t0: ts + (ch.gap ?? gap), t1: END, atk: ch.atk ?? atk, rel }; notes.push(o); active.set(m, o); }
  }
  return notes;
}
const padNotes = heldNotes(V, { atk: ATK, rel: REL, gap: GAP });
for (const nt of padNotes) padNote(nt);
const airNotes = heldNotes(AIRV, { atk: 2.0, rel: 1.4, gap: 0.4 });
for (const nt of airNotes) airNote(nt);

const sheet = { chords: [], motif: [], tones: [], accents: [] };
for (const ch of CHORDS) sheet.chords.push({ t: r4(ch.t), frame: frameOf(ch.t), chord: ch.c || 'rest', notes: ch.c ? V[ch.c].map(nn) : [], what: ch.what });
const pans = [-0.22, 0.12, -0.06, 0.2, 0];
for (const M of MOTIF) {
  const notes = M.notes.map((m, j) => {
    const t = M.t + M.at[j];
    mallet(t, m, M.vel[j], { cool: !!M.cool, pan: pans[j], damp: j < M.notes.length - 1 ? M.at[j + 1] - M.at[j] + (M.damp ?? 0.18) : Infinity });
    return { t: r4(t), frame: frameOf(t), note: nn(m), vel: r4(M.vel[j]) };
  });
  sheet.motif.push({ name: M.name, what: M.what, notes });
}
for (const T of TONES) { mallet(T.t, T.m, T.vel, { pan: T.pan }); sheet.tones.push({ t: r4(T.t), frame: frameOf(T.t), note: nn(T.m), vel: T.vel, what: T.what }); }
for (const A of ACCENTS) {
  accent(A.t, A.m, A.vel, { m1: A.m1 ?? A.m, glide: A.glide || 0 });
  const oct = (m) => `${nn(m)}+${nn(m + 12)}`;                       // the soft octave: sub + main
  sheet.accents.push({ t: r4(A.t), frame: frameOf(A.t), notes: A.m1 ? `${oct(A.m)} → ${oct(A.m1)} over ${A.glide} s` : oct(A.m), vel: A.vel, what: A.what });
}

// ------------------------------------------------------------------------------------------------ space, filters, stems
// Each stem carries its own reverb so the stems stay self-contained. The send is high-passed (no low-end wash); the wet
// return is set to a fixed RMS ratio of the dry; every stem is high-passed below its musical range (moderate low end, no
// subsonic energy) and takes the shared ending fade.
// Stem trims (dB) set the balance by measurement (BS.1770 per shot): the motif ≈ 4–6 LU above the pad when it plays,
// the accents ≈ 1–4 LU above it, the shimmer ≈ 7–10 LU below it.
const ROOMS = {
  pad: { verb: { room: 0.86, damp: 0.5, predelay: 0.02 }, sendHp: 140, wetRatio: 0.5, trimDb: -17.6, hp: 50 },
  motif: { verb: { room: 0.87, damp: 0.32, predelay: 0.035 }, sendHp: 200, wetRatio: 0.75, trimDb: -6, hp: 80 },
  accents: { verb: { room: 0.8, damp: 0.6, predelay: 0.01 }, sendHp: 90, wetRatio: 0.35, trimDb: -5.5, hp: 40 },
  air: { verb: { room: 0.9, damp: 0.4, predelay: 0.045 }, sendHp: 300, wetRatio: 1.0, trimDb: -17, hp: 150 },
};
const rms = (bus) => { let e = 0; for (let i = 0; i < bus.n; i++) e += bus.L[i] * bus.L[i] + bus.R[i] * bus.R[i]; return Math.sqrt(e / (2 * bus.n)); };
const hpf = (bus, f) => { for (const ch of [bus.L, bus.R]) { const q = new Biquad('hp', f, 0.707); for (let i = 0; i < ch.length; i++) ch[i] = q.run(ch[i]); } };
fs.mkdirSync(outDir, { recursive: true });
const stems = [];
for (const [name, S] of Object.entries(STEMS)) {
  const P = ROOMS[name];
  hpf(S.send, P.sendHp);
  const wet = freeverb(S.send, P.verb);
  const dr = rms(S.dry), wr = rms(wet), wg = wr > 0 ? P.wetRatio * dr / wr : 0;
  const out = new Bus(SEC), g = 10 ** (P.trimDb / 20);
  for (let i = 0; i < N; i++) { out.L[i] = (S.dry.L[i] + wet.L[i] * wg) * g * FINAL[i]; out.R[i] = (S.dry.R[i] + wet.R[i] * wg) * g * FINAL[i]; }
  hpf(out, P.hp);
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(out.L[i]), Math.abs(out.R[i]));
  if (pk >= 0.98) throw new Error(`${name}: raw peak ${pk.toFixed(3)} would clip; lower its level`);
  const file = path.join(outDir, `${name}.wav`);
  writeWav(file, out, 24);
  stems.push({ name, file: path.relative(ROOT, file), sha256: sha256(fs.readFileSync(file)), samples: out.n, peak_dbfs: r4(20 * Math.log10(pk + 1e-12)),
    rms_dbfs: r4(20 * Math.log10(rms(out) + 1e-12)), trim_db: P.trimDb, highpass_hz: P.hp, reverb: P.verb, wet_ratio: P.wetRatio });
  console.log(`  ${name.padEnd(8)} peak ${(20 * Math.log10(pk + 1e-12)).toFixed(1)} dBFS, rms ${(20 * Math.log10(rms(out) + 1e-12)).toFixed(1)} dBFS → ${file}`);
}

const cuesBuf = fs.readFileSync(path.join(ROOT, 'web/engine/cues.js'));
const report = {
  about: 'v7 「空气现形」 quiet score: raw stems (unmastered) and every musical event with its cues.js instant. Generated by tools/score.mjs; mastered by tools/mix.mjs.',
  cues_js_sha256: sha256(cuesBuf), node: process.version, seed: 71018,
  film: { fps: FPS, frames: FRAMES, seconds: END }, samples: N, sample_rate: SR, bits: 24, channels: 2,
  sources: 'additive synthesis only; no noise generator, no samples, no voice/TTS, nothing from the v6 score or master',
  key: 'D major', chord_change: { lead_s: LEAD, gap_s: GAP, attack_s: ATK, release_s: REL },
  counts: { chords: CHORDS.filter((c) => c.c).length, motif_statements: MOTIF.length, motif_notes: MOTIF.length * 5, single_tones: TONES.length, low_accents: ACCENTS.length },
  ...sheet, stems,
};
fs.writeFileSync(path.join(outDir, 'score.cues.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`score → ${outDir}: ${N} samples (${FRAMES} frames × ${SR / FPS}), ${report.counts.chords} chords, ${MOTIF.length} motif statements, ${TONES.length} tones, ${ACCENTS.length} accents`);
