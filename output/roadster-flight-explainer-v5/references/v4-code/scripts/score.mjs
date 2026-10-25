// score.mjs: the film's sound, synthesised in code on the SAME clock as the picture.
//   node scripts/score.mjs            → out/audio/{music,gas,sfx,voice,mix,master}.wav + out/audio/sound.json
//
// Inputs (nothing is hand-timed here):
//   blender/data/film_cues.json         narration lines and phrase starts (the single cue table)
//   src/data/events.json                per-frame valve level of every drawn port, valve open/close edges, cuts,
//                                       touchdowns, act starts and the car's screen pan, exported from film.state()
//   support/narration/narration-stem-75s.wav   the approved narration, placed at its canonical starts (unchanged)
// Layers: a restrained D-minor score that resolves to D major on the last phrase; gas hiss that follows each port's
// drawn valve level (darker and quieter far away or in slow motion); valve clicks only where valves are pictured;
// impacts at the drawn touchdowns; cut accents, the rewind into the first principle cutaway, the pump and the
// surface-tilt cues. Music and effects duck under the narration and come back in its pauses.
// Master: measured with FFmpeg EBU R128, gain to −14 LUFS integrated, then a look-ahead peak limiter whose ceiling is
// lowered until the measured true peak is ≤ −1.5 dBTP. No compressor, no tempo change of the narration.
// Deterministic: seeded noise only; the same inputs give the same samples.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'out/audio');
mkdirSync(OUT, {recursive: true});
const cues = JSON.parse(readFileSync(join(ROOT, 'blender/data/film_cues.json'), 'utf8'));
const ev = JSON.parse(readFileSync(join(ROOT, 'src/data/events.json'), 'utf8'));
const SR = 48000, DUR = cues.duration_s, N = Math.round(DUR * SR), FPS = ev.fps;
const B = ev.beats;                                    // named narration beats (film seconds)
const TARGET_LUFS = -14, TP_MAX = -1.5;

// ------------------------------------------------------------------------------------------------ DSP kit
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mono = (n = N) => new Float32Array(n);
const stereo = () => [mono(), mono()];
const db = (d) => Math.pow(10, d / 20);
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const S = (t) => Math.round(t * SR);
const TAU = 2 * Math.PI;

function biquadCoefs(type, f, q = 0.707, gainDb = 0) {
  const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * c; a2 = 1 - a; }
  else if (type === 'peak') { b0 = 1 + a * A; b1 = -2 * c; b2 = 1 - a * A; a0 = 1 + a / A; a1 = -2 * c; a2 = 1 - a / A; }
  else if (type === 'lowshelf') { const sq = 2 * Math.sqrt(A) * a; b0 = A * ((A + 1) - (A - 1) * c + sq); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - sq); a0 = (A + 1) + (A - 1) * c + sq; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - sq; }
  else { const sq = 2 * Math.sqrt(A) * a; b0 = A * ((A + 1) + (A - 1) * c + sq); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - sq); a0 = (A + 1) - (A - 1) * c + sq; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - sq; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
// filter in place; f may be a number or a function of the sample index (coefficients refreshed every 32 samples)
function filt(x, type, f, q = 0.707, gainDb = 0) {
  let k = biquadCoefs(type, typeof f === 'function' ? f(0) : f, q, gainDb);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (typeof f === 'function' && (i & 31) === 0) k = biquadCoefs(type, f(i), q, gainDb);
    const y = k[0] * x[i] + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
const white = (seed, n = N) => { const r = rng(seed), b = mono(n); for (let i = 0; i < n; i++) b[i] = r() * 2 - 1; return b; };
const pink = (seed, n = N) => {
  const r = rng(seed), b = mono(n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; b[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
  return b;
};
const panGains = (p) => [Math.cos((clamp(p, -1, 1) + 1) * Math.PI / 4), Math.sin((clamp(p, -1, 1) + 1) * Math.PI / 4)];
function addMono(dst, src, t0, gain = 1, pan = 0) {
  const [gl, gr] = panGains(pan), o = S(t0);
  for (let i = 0; i < src.length; i++) { const k = o + i; if (k < 0 || k >= N) continue; dst[0][k] += src[i] * gain * gl; dst[1][k] += src[i] * gain * gr; }
}
function addStereo(dst, [l, r], t0, gain = 1) {
  const o = S(t0);
  for (let i = 0; i < l.length; i++) { const k = o + i; if (k < 0 || k >= N) continue; dst[0][k] += l[i] * gain; dst[1][k] += r[i] * gain; }
}
// Freeverb-style stereo reverb (8 damped combs + 4 allpasses per side), returns the wet signal only
function reverb([inL, inR], {room = 0.84, damp = 0.35, width = 1.0} = {}) {
  const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225], spread = 23;
  const run = (input, off) => {
    const out = mono(input.length);
    for (const L0 of combs) {
      const L = Math.round((L0 + off) * sc), buf = new Float32Array(L); let idx = 0, store = 0;
      for (let i = 0; i < input.length; i++) { const y = buf[idx]; store = y * (1 - damp) + store * damp; buf[idx] = input[i] * 0.015 + store * room; idx = idx + 1 === L ? 0 : idx + 1; out[i] += y; }
    }
    for (const L0 of alls) {
      const L = Math.round((L0 + off) * sc), buf = new Float32Array(L); let idx = 0;
      for (let i = 0; i < out.length; i++) { const b = buf[idx], x = out[i]; out[i] = -x + b; buf[idx] = x + b * 0.5; idx = idx + 1 === L ? 0 : idx + 1; }
    }
    return out;
  };
  const wl = run(inL, 0), wr = run(inR, spread);
  const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
  const l = mono(), r = mono();
  for (let i = 0; i < N; i++) { l[i] = wl[i] * w1 + wr[i] * w2; r[i] = wr[i] * w1 + wl[i] * w2; }
  return [l, r];
}
const env = (n, a, d) => { const b = mono(n); for (let i = 0; i < n; i++) { const t = i / SR; b[i] = Math.min(1, t / a) * Math.exp(-Math.max(0, t - a) / d); } return b; };

// ------------------------------------------------------------------------------------------------ instruments
const NOTE = (name) => { const m = /^([A-G])(#|b)?(-?\d)$/.exec(name); const base = {C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2}[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * Math.pow(2, (base + (+m[3] - 4) * 12) / 12); };
// soft detuned pad voice (two slightly detuned saw-ish additive stacks), slow attack/release
function padVoice(freq, dur, {attack = 1.2, release = 1.6, bright = 6, seed = 1} = {}) {
  const n = S(dur + release), l = mono(n), r = mono(n), r0 = rng(seed);
  const ph = [r0() * TAU, r0() * TAU, r0() * TAU, r0() * TAU];
  for (let h = 1; h <= bright; h++) {
    const amp = 1 / (h * h * 0.8 + 0.2);
    for (const [det, side, k] of [[0.9965, 0, 0], [1.0035, 1, 1], [1.0, 0, 2], [1.0012, 1, 3]]) {
      const w = TAU * freq * h * det / SR, p = ph[k] * h, out = side ? r : l;
      for (let i = 0; i < n; i++) out[i] += Math.sin(w * i + p) * amp;
    }
  }
  for (let i = 0; i < n; i++) { const t = i / SR; const e = Math.min(1, t / attack) * (t > dur ? Math.exp(-(t - dur) / (release / 3)) : 1); l[i] *= e * 0.12; r[i] *= e * 0.12; }
  return [l, r];
}
// FM bell / glass pluck
function bell(freq, {dur = 2.4, ratio = 3.5, index = 2.2, seed = 2} = {}) {
  const n = S(dur), b = mono(n), r0 = rng(seed), p0 = r0() * TAU;
  for (let i = 0; i < n; i++) { const t = i / SR; const ie = index * Math.exp(-t / 0.35); b[i] = Math.sin(TAU * freq * t + p0 + ie * Math.sin(TAU * freq * ratio * t)) * Math.exp(-t / (dur / 4.5)) * Math.min(1, t / 0.004); }
  return b;
}
// plucked low synth for the pulse ostinato
function pluck(freq, {dur = 0.3, cutoff = 900, seed = 3} = {}) {
  const n = S(dur + 0.25), b = mono(n);
  for (let h = 1; h <= 8; h++) { const w = TAU * freq * h / SR; for (let i = 0; i < n; i++) b[i] += Math.sin(w * i) / h; }
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] *= Math.exp(-t / (dur * 0.55)) * Math.min(1, t / 0.003) * 0.35; }
  return filt(b, 'lp', cutoff, 0.9);
}
function sub(f0, f1, dur, decay, seed = 4, noiseAmt = 0.25) {
  const n = S(dur), b = mono(n), nz = filt(white(seed, n), 'lp', 260);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = f1 + (f0 - f1) * Math.exp(-t * 14); ph += TAU * f / SR; b[i] = (Math.sin(ph) + nz[i] * noiseAmt) * Math.exp(-t / decay) * Math.min(1, t / 0.003); }
  return b;
}
function click(seed, {f = 3100, ping = 1750, dur = 0.05, decay = 0.007} = {}) {
  const n = S(dur), b = filt(white(seed, n), 'bp', f, 1.3);
  for (let i = 0; i < n; i++) { const t = i / SR; b[i] = (b[i] * 1.7 + Math.sin(TAU * ping * t) * 0.45) * Math.exp(-t / decay); }
  return b;
}
function whoosh(seed, dur, {f0 = 400, f1 = 2400, q = 0.8, shape = 'swell'} = {}) {
  const n = S(dur), b = filt(pink(seed, n), 'bp', (i) => f0 * Math.pow(f1 / f0, i / n), q);
  for (let i = 0; i < n; i++) { const u = i / n; const e = shape === 'swell' ? Math.pow(u, 2.2) * (u < 0.96 ? 1 : (1 - u) / 0.04) : Math.sin(Math.PI * u) ** 1.5; b[i] *= e; }
  return b;
}

// ------------------------------------------------------------------------------------------------ timeline helpers
const levelAt = (arr, t) => { const x = t * FPS, i = Math.floor(x); if (i < 0) return arr[0]; if (i >= arr.length - 1) return arr[arr.length - 1]; const f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
const actAt = (t) => (ev.acts.find((a) => t >= a.start && t < a.end) ?? ev.acts[ev.acts.length - 1]).name;
const shotAt = (t) => (t < ev.source_cuts[0] ? 'A' : t < ev.source_cuts[1] ? 'B' : t < ev.source_cuts[2] ? 'C' : 'D');
const lineStart = (id) => cues.lines.find((l) => l.id === id).audio_start_s;

// ------------------------------------------------------------------------------------------------ 1. narration
function loadVoice() {
  const file = join(ROOT, 'support/narration/narration-stem-75s.wav');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], {maxBuffer: 1 << 29});
  if (r.status) throw new Error(String(r.stderr));
  const all = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const v = stereo();
  for (let i = 0; i < Math.min(N, all.length / 2); i++) { v[0][i] = all[2 * i]; v[1][i] = all[2 * i + 1]; }
  return v;
}
// gentle stereo-linked compressor on the narration only (2.8:1 above a soft knee, 3 ms attack, 120 ms release): lowers the
// speech peak-to-loudness ratio so the final limiter only shaves; timing and speed are untouched
function compressVoice([l, r], {thresholdDb = -24, ratio = 2.8, kneeDb = 8} = {}) {
  const win = S(0.005), atk = Math.exp(-1 / (0.003 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  let acc = 0, y = 0, maxGr = 0, over2 = 0;
  const sq = new Float32Array(N);
  for (let i = 0; i < N; i++) sq[i] = Math.max(l[i] * l[i], r[i] * r[i]);
  for (let i = 0; i < N; i++) {
    acc += sq[i] - (i >= win ? sq[i - win] : 0);
    const lev = 10 * Math.log10(Math.max(acc, 1e-12) / win), over = lev - thresholdDb;
    const gr = over <= -kneeDb / 2 ? 0 : over >= kneeDb / 2 ? over * (1 - 1 / ratio) : (1 - 1 / ratio) * Math.pow(over + kneeDb / 2, 2) / (2 * kneeDb);
    y = gr > y ? atk * y + (1 - atk) * gr : rel * y + (1 - rel) * gr;
    const g = db(-y);
    l[i] *= g; r[i] *= g;
    if (y > maxGr) maxGr = y;
    if (y > 2) over2++;
  }
  return {threshold_dbfs: thresholdDb, ratio, knee_db: kneeDb, max_gain_reduction_db: +maxGr.toFixed(2), percent_of_time_over_2db: +(100 * over2 / N).toFixed(2)};
}

// hold a ducking envelope through short pauses (commas) so the bed does not pump between phrases
function holdRelease(e, holdS, releaseS) {
  const out = mono(), hold = S(holdS), rel = Math.exp(-1 / (releaseS * SR));
  let peak = 0, since = 0, y = 0;
  for (let i = 0; i < N; i++) {
    if (e[i] >= peak || since > hold) { peak = e[i]; since = 0; } else since++;
    const target = Math.max(e[i], since <= hold ? peak : e[i]);
    y = target > y ? target : rel * y + (1 - rel) * target;
    out[i] = y;
  }
  return out;
}

// speech presence 0..1 from the stem itself (30 ms RMS, fast attack, slow release), for ducking
function speechEnvelope(v) {
  const e = mono(), win = S(0.03);
  let acc = 0; const sq = mono();
  for (let i = 0; i < N; i++) sq[i] = 0.5 * (v[0][i] * v[0][i] + v[1][i] * v[1][i]);
  let y = 0; const atk = Math.exp(-1 / (0.012 * SR)), rel = Math.exp(-1 / (0.28 * SR));
  for (let i = 0; i < N; i++) {
    acc += sq[i] - (i >= win ? sq[i - win] : 0);
    const rms = Math.sqrt(Math.max(0, acc) / win), x = clamp((20 * Math.log10(rms + 1e-9) + 56) / 13);   // −56 dBFS → 0, −43 → 1 (quiet syllables duck fully)
    y = x > y ? atk * y + (1 - atk) * x : rel * y + (1 - rel) * x;
    e[i] = y;
  }
  return e;
}

// ------------------------------------------------------------------------------------------------ 2. score
function score() {
  const mus = stereo();
  const chord = (names, t0, dur, gain, opts = {}) => { names.forEach((nm, k) => addStereo(mus, padVoice(NOTE(nm), dur, {...opts, seed: Math.round(t0 * 100) + k}), t0, gain)); };
  // hook: low D drone that opens up toward the cut back to the wide shot; sub hits on the source cuts
  {
    const n = S(5.7), l = mono(n), r = mono(n);
    for (const [f, a] of [[NOTE('D1'), 0.55], [NOTE('D2'), 0.3], [NOTE('A2'), 0.12], [NOTE('D3'), 0.05]]) {
      for (let i = 0; i < n; i++) { const t = i / SR, w = 1 + 0.002 * Math.sin(TAU * 0.21 * t); l[i] += a * Math.sin(TAU * f * w * t); r[i] += a * Math.sin(TAU * f * 1.0015 * w * t + 0.7); }
    }
    for (let i = 0; i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.08) * (t < 5.2 ? 1 : Math.max(0, 1 - (t - 5.2) / 0.5)); l[i] *= e * 0.16; r[i] *= e * 0.16; }
    addStereo(mus, [filt(l, 'lp', (i) => 220 + 1400 * Math.pow(i / n, 2)), filt(r, 'lp', (i) => 220 + 1400 * Math.pow(i / n, 2))], 0, 1);
  }
  // replay (5.155–13.6): 96 bpm eighth-note ostinato over Dm – Bb – F – C, with a pad underneath
  {
    const t0 = ev.source_cuts[2], beat = 60 / 96, eighth = beat / 2;
    const prog = [['D2', ['D3', 'F3', 'A3']], ['Bb1', ['Bb2', 'D3', 'F3']], ['F2', ['F3', 'A3', 'C4']], ['C2', ['C3', 'E3', 'G3']]];
    const barLen = beat * 3;
    let k = 0;
    for (let t = t0; t < 13.55; t += barLen, k++) {
      const [root, triad] = prog[k % 4];
      const dur = Math.min(barLen, 13.55 - t);
      chord(triad, t, dur + 0.4, 0.55, {attack: 0.6, release: 1.2, bright: 5});
      const pat = [0, 7, 12, 7, 3, 7];
      for (let j = 0; j < 6; j++) {
        const tt = t + j * eighth;
        if (tt >= 13.55) break;
        addMono(mus, pluck(NOTE(root) * Math.pow(2, pat[j] / 12), {cutoff: 700 + 500 * (k % 2), seed: k * 10 + j}), tt, 0.5 * (j === 0 ? 1.2 : 0.85), j % 2 ? 0.25 : -0.25);
      }
    }
  }
  // first principle cutaway (14–27): spacious Dm9 – Bbmaj7 – Gm9 – Asus4/A
  {
    const prog = [['D3', 'F3', 'A3', 'E4'], ['Bb2', 'D3', 'F3', 'A3'], ['G2', 'Bb2', 'D3', 'A3'], ['A2', 'D3', 'E3', 'A3']];
    prog.forEach((c, k) => chord(c, 14.05 + k * 3.24, 3.3, 0.5, {attack: 1.0, release: 1.8, bright: 4}));
    addStereo(mus, padVoice(NOTE('C#3'), 1.3, {attack: 0.6, release: 1.4, bright: 3, seed: 77}), 25.6, 0.35);    // sus4 → A
    for (const [t, nm] of [[B.pump, 'A5'], [B.low, 'F5'], [B.outside, 'D5'], [B.toward, 'E5'], [B.not_down, 'A4']]) addMono(mus, bell(NOTE(nm), {seed: Math.round(t * 10)}), t, 0.05, 0.2);
  }
  // reaction (27–40): pad continues, drops away before the gas pulse, returns for the ballistic float
  {
    chord(['D3', 'F3', 'A3', 'C4'], 27.0, 2.2, 0.45, {attack: 0.4, release: 0.9, bright: 4});
    addMono(mus, sub(NOTE('D2'), NOTE('D1'), 4.0, 2.2, 31, 0.0), B.gas_out - 0.45, 0.18);                        // the held breath
    chord(['F2', 'C3', 'A3'], B.push + 1.1, 3.0, 0.42, {attack: 1.4, release: 1.2, bright: 4});
    chord(['C3', 'E3', 'G3', 'D4'], B.push + 4.0, 2.6, 0.4, {attack: 1.0, release: 1.6, bright: 4});
    for (const [t, nm] of [[B.no_burn, 'E5'], [B.react_word, 'A5']]) addMono(mus, bell(NOTE(nm), {seed: Math.round(t * 10)}), t, 0.06, -0.15);
    chord(['D3', 'G3', 'A3'], 38.2, 1.7, 0.38, {attack: 0.8, release: 0.6, bright: 3});
  }
  // torque (40–52.1): quiet ticking tension, Dm – Dm/C – Bb – A; a short stinger on 翻转 ≠ 悬停
  {
    const prog = [['D2', 'A2', 'F3'], ['C2', 'A2', 'F3'], ['Bb1', 'F2', 'D3'], ['A1', 'E2', 'C#3']];
    prog.forEach((c, k) => chord(c, 40.08 + k * 3.0, 3.0, 0.42, {attack: 0.7, release: 1.3, bright: 4}));
    for (let t = 40.1; t < 52.0; t += 0.5) addMono(mus, click(Math.round(t * 100), {f: 6200, ping: 4100, decay: 0.004}), t, 0.035, 0.35);
    addMono(mus, sub(NOTE('D2') * 1.5, NOTE('D1'), 1.8, 0.9, 52, 0.1), B.not_hover, 0.32);
    addMono(mus, bell(NOTE('D4'), {dur: 2.8, ratio: 2.0, index: 1.4, seed: 53}), B.not_hover + 0.02, 0.06);
  }
  // reserve (52.1–64.5): calm glass arpeggio over Bb – F – Gm – Dm; a rising two-note question on 气从哪来
  {
    const prog = [['Bb2', ['D4', 'F4', 'Bb4']], ['F2', ['C4', 'F4', 'A4']], ['G2', ['D4', 'G4', 'Bb4']], ['D2', ['D4', 'F4', 'A4']]];
    prog.forEach(([root, notes], k) => {
      const t0 = 52.2 + k * 3.08;
      chord([root, notes[0]], t0, 3.1, 0.42, {attack: 1.2, release: 1.8, bright: 3});
      notes.forEach((nm, j) => addMono(mus, bell(NOTE(nm), {seed: k * 7 + j}), t0 + 0.25 + j * 0.77, 0.045, (j - 1) * 0.4));
    });
    addMono(mus, bell(NOTE('A4'), {seed: 61}), 52.12, 0.06, -0.3);
    addMono(mus, bell(NOTE('D5'), {seed: 62}), 52.5, 0.06, 0.3);
  }
  // limits (64.5–75): Gm – Bb – C – Dsus4 → D major on 能量和安全, ringing out to the end
  {
    chord(['G2', 'D3', 'Bb3'], 64.55, 2.3, 0.44, {attack: 1.0, release: 1.2, bright: 4});
    chord(['Bb2', 'F3', 'D4'], 66.85, 2.3, 0.44, {attack: 0.9, release: 1.2, bright: 4});
    chord(['C3', 'G3', 'E4'], 69.15, 2.1, 0.42, {attack: 0.9, release: 1.0, bright: 4});
    chord(['D3', 'G3', 'A3'], 71.2, 2.25, 0.42, {attack: 0.8, release: 0.8, bright: 4});
    const tEnd = B.energy;
    chord(['D2', 'D3', 'F#3', 'A3', 'D4'], tEnd, DUR - tEnd + 0.2, 0.5, {attack: 0.25, release: 0.4, bright: 5});
    addMono(mus, bell(NOTE('F#5'), {dur: 3.0, seed: 75}), tEnd + 0.05, 0.05, 0.25);
    addMono(mus, bell(NOTE('D5'), {dur: 3.0, seed: 76}), tEnd + 0.4, 0.05, -0.25);
  }
  // hall
  const wet = reverb(mus, {room: 0.86, damp: 0.3});
  for (let i = 0; i < N; i++) { mus[0][i] += wet[0][i] * 0.32; mus[1][i] += wet[1][i] * 0.32; }
  // final fade so the film ends cleanly at 75 s
  for (let i = S(DUR - 0.45); i < N; i++) { const g = clamp((N - i) / S(0.45)); mus[0][i] *= g; mus[1][i] *= g; }
  return mus;
}

// ------------------------------------------------------------------------------------------------ 3. gas
// every drawn port's hiss follows its valve level; far (wide source shots) and slow-motion moments are darker
function gas() {
  const out = stereo();
  const ports = Object.keys(ev.valve_levels);
  const portGain = {FL: 1.0, FR: 1.0, RL: 1.0, RR: 1.0, NOSE: 0.75, SL: 0.55};
  const portPan = {FL: -0.12, RL: -0.12, FR: 0.12, RR: 0.12, NOSE: 0, SL: -0.2};
  const slowMo = (t) => (t >= B.gas_out && t < B.torque) || t >= B.flip + 0.25 && t < B.reserve;
  // per-sample colour/level by context, from the picture's shot and act
  const ctx = (t) => {
    const a = actAt(t);
    if (a === 'source') { const s = shotAt(t); return s === 'A' || s === 'D' ? {g: 0.42, dark: 0.75} : {g: 0.8, dark: 0.15}; }
    return {g: 0.9, dark: slowMo(t) ? 0.65 : 0.2};
  };
  ports.forEach((p, k) => {
    const lv = ev.valve_levels[p];
    if (!lv.some((v) => v > 0.01)) return;
    const hiss = filt(filt(white(100 + k), 'hp', 1500), 'lp', 8500);
    const body = filt(filt(pink(200 + k), 'bp', 650, 0.6), 'lp', 2800);
    const dark = filt(filt(white(300 + k), 'hp', 300), 'lp', 2200);
    let y = 0; const sm = Math.exp(-1 / (0.012 * SR));
    for (let i = 0; i < N; i++) {
      const t = i / SR, target = Math.pow(levelAt(lv, t), 1.2);
      y = sm * y + (1 - sm) * target;                                // no zipper from 30 fps steps
      if (y < 1e-5) continue;
      const c = ctx(t), bright = 1 - c.dark;
      const v = (hiss[i] * 0.62 * bright + body[i] * 0.55 + dark[i] * 0.7 * c.dark) * y * c.g * portGain[p] * 0.22;
      const pan = clamp(levelAt(ev.car_pan, t) * 0.8 + portPan[p], -0.9, 0.9);
      const [gl, gr] = panGains(pan);
      out[0][i] += v * gl; out[1][i] += v * gr;
    }
  });
  const wet = reverb(out, {room: 0.7, damp: 0.5});
  for (let i = 0; i < N; i++) { out[0][i] += wet[0][i] * 0.18; out[1][i] += wet[1][i] * 0.18; }
  return out;
}

// ------------------------------------------------------------------------------------------------ 4. effects
function sfx() {
  const fx = stereo();
  const used = [];
  const log = (t, what) => used.push({t: +t.toFixed(3), what});
  // frame 0: the opening low impact and the pressure about to break out (the cloud and jet appear ~0.4 s later)
  addMono(fx, sub(85, 38, 0.9, 0.32, 401, 0.35), 0, 0.85); log(0, 'opening low impact');
  {
    const n = S(0.7), b = filt(white(402, n), 'hp', 900);
    for (let i = 0; i < n; i++) { const u = i / n; b[i] *= Math.pow(u, 1.6) * (u < 0.9 ? 1 : (1 - u) / 0.1); }
    addMono(fx, b, 0.0, 0.16, 0.45); log(0, 'pressure hiss building toward the first jet');
  }
  // source cuts: weight on each hard cut of the original edit, and the pass whooshes in the close shots
  ev.source_cuts.forEach((t, k) => { addMono(fx, sub(70, 36, 0.8, 0.28, 410 + k, 0.2), t, 0.5); log(t, 'source cut'); });
  addMono(fx, whoosh(420, 1.25, {f0: 300, f1: 1800, shape: 'arc'}), ev.source_cuts[0] + 0.05, 0.22, 0.4); log(ev.source_cuts[0] + 0.05, 'close pass B (right to left)');
  addMono(fx, whoosh(421, 1.6, {f0: 260, f1: 1500, shape: 'arc'}), ev.source_cuts[1] + 0.05, 0.2, -0.2); log(ev.source_cuts[1] + 0.05, 'close pass C (left to right)');
  // label/statement ticks (soft) where text cards appear
  const chipTimes = [3.35, ev.source_cuts[2], cues.lines.find((l) => l.id === '02').phrases[2].start_s];   // source, replay, attribution chips
  for (const t of chipTimes) { addMono(fx, click(Math.round(t * 97), {f: 5200, ping: 2600, decay: 0.006}), t, 0.08, -0.4); log(t, 'chip tick'); }
  // rewind into the first principle cutaway, then the flash
  {
    const n = S(0.42), b = filt(pink(430, n), 'hp', (i) => 400 + 5000 * (i / n));
    for (let i = 0; i < n; i++) { const u = i / n; b[i] *= Math.pow(u, 2.6); }
    const tape = mono(n); let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n; ph += TAU * (900 - 650 * u) / SR; tape[i] = Math.sin(ph) * Math.pow(u, 2) * 0.35; }
    addMono(fx, b, 14 - 0.42, 0.42); addMono(fx, tape, 14 - 0.42, 0.18); log(13.58, 'rewind swell');
    addMono(fx, sub(110, 45, 0.7, 0.22, 431, 0.5), 14.0, 0.45); log(14, 'flash into the principle cutaway');
  }
  // pump: air drawn out from under the floor (follows film.py's pump window), then the low-pressure settle
  {
    const t0 = B.pump, t1 = B.low + 1.2, n = S(t1 - t0), b = filt(pink(440, n), 'bp', (i) => 1400 - 1000 * (i / n), 0.9);
    for (let i = 0; i < n; i++) { const t = t0 + i / SR; b[i] *= Math.min(smooth((t - t0) / 0.4), 1 - smooth((t - (B.low + 0.6)) / 0.6)); }
    addMono(fx, b, t0, 0.3, -0.1); log(t0, 'pump airflow');
  }
  // surface tilts (吸附朝向路面，不一定朝下): a low mechanical swell and a contact click when it stops
  {
    const t0 = B.not_down, n = S(1.45), b = mono(n);
    for (let i = 0; i < n; i++) { const t = i / SR, u = t / 1.45; b[i] = (Math.sin(TAU * 55 * t) * 0.6 + Math.sin(TAU * 110.5 * t) * 0.25) * Math.sin(Math.PI * u) * 0.5; }
    addMono(fx, b, t0, 0.35); addMono(fx, click(450, {f: 1800, ping: 900, decay: 0.02, dur: 0.12}), t0 + 1.4, 0.3); log(t0, 'surface tilt + contact');
  }
  // air rushing back under the car when the attachment is gone (可离开路面…)
  addMono(fx, whoosh(460, 1.1, {f0: 250, f1: 1600, shape: 'swell'}), B.no_attach, 0.2, 0.1); log(B.no_attach, 'inrush');
  // valve clicks where valves are pictured (explanatory acts); the hiss itself is the gas layer
  for (const e of ev.valve_edges) {
    if (e.act === 'source') continue;
    addMono(fx, click(Math.round(e.t * 1000) + (e.kind === 'open' ? 1 : 2), e.kind === 'open' ? {} : {f: 2400, ping: 1300, decay: 0.006}), e.t, e.kind === 'open' ? 0.26 : 0.16, e.pan);
  }
  log(0, `${ev.valve_edges.filter((e) => e.act !== 'source').length} valve clicks (explanatory acts)`);
  // control pulses in the hover (they blink, no pitch/pressure mapping): soft ticks at the blink peaks
  for (let k = 0; k < 4; k++) {
    for (let t = B.control + 0.1; t < B.demo - 0.2; t += 0.01) {
      const ph = 5.0 * t - 1.6 * k, prev = 5.0 * (t - 0.01) - 1.6 * k;
      if (Math.floor((ph - Math.PI / 2) / TAU) !== Math.floor((prev - Math.PI / 2) / TAU)) {
        const damp = Math.exp(-Math.max(0, t - B.control) / 1.3);
        if (damp > 0.12) addMono(fx, click(Math.round(t * 1000) + k, {f: 4200, ping: 2100, decay: 0.004}), t, 0.12 * damp, k % 2 ? 0.25 : -0.25);
      }
    }
  }
  // the roll: a fast swirl while the car turns (47.3–48.9)
  addMono(fx, whoosh(470, 1.6, {f0: 500, f1: 2600, q: 1.2, shape: 'arc'}), B.attitude + 0.05, 0.22); log(B.attitude + 0.05, 'roll swirl');
  // the slow fall after the flip: a soft descending glide (schematic slow motion)
  {
    const t0 = B.flip + 0.25, n = S(B.reserve - t0), b = mono(n); let ph = 0;
    for (let i = 0; i < n; i++) { const u = i / n; ph += TAU * (330 - 120 * u) / SR; b[i] = Math.sin(ph) * Math.sin(Math.PI * u) * 0.25; }
    addMono(fx, filt(b, 'lp', 900), t0, 0.35); log(t0, 'slow fall glide');
  }
  // explicit cuts (camera and CoM jump): a dark thud through the dip
  for (const t of ev.hard_cuts.slice(1)) { addMono(fx, sub(90, 40, 0.6, 0.18, Math.round(t * 10), 0.4), t, 0.4); log(t, 'explicit cut'); }
  // x-ray reveal shimmer
  {
    const t0 = B.reserve + 0.3, n = S(1.6), b = filt(white(480, n), 'bp', (i) => 3000 + 4000 * (i / n), 2.0);
    for (let i = 0; i < n; i++) { const u = i / n; b[i] *= Math.sin(Math.PI * u) ** 2; }
    addMono(fx, b, t0, 0.08, 0.2); log(t0, 'x-ray shimmer');
  }
  // touchdowns at the drawn contact times: muffled in the slow-motion hop, clear for the hover's set-down
  ev.impacts.forEach((imp, k) => {
    const slow = imp.what.includes('slow');
    addMono(fx, filt(sub(80, 34, 0.9, slow ? 0.35 : 0.22, 490 + k, 0.5), 'lp', slow ? 300 : 1200), imp.t, slow ? 0.55 : 0.8);
    if (!slow) {
      const n = S(0.25), b = mono(n);
      for (let i = 0; i < n; i++) { const t = i / SR; b[i] = (Math.sin(TAU * 182 * t) * 0.6 + Math.sin(TAU * 431 * t) * 0.3) * Math.exp(-t / 0.045); }
      addMono(fx, b, imp.t + 0.03, 0.25);
    }
    log(imp.t, 'touchdown: ' + imp.what);
  });
  const wet = reverb(fx, {room: 0.8, damp: 0.4});
  for (let i = 0; i < N; i++) { fx[0][i] += wet[0][i] * 0.22; fx[1][i] += wet[1][i] * 0.22; }
  return {fx, used};
}

// ------------------------------------------------------------------------------------------------ mix and master
function writeWav(file, [l, r], bits = 32) {
  const bytes = bits / 8, b = Buffer.alloc(44 + N * 2 * bytes);
  b.write('RIFF', 0); b.writeUInt32LE(36 + N * 2 * bytes, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(bits === 32 ? 3 : 1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2 * bytes, 28);
  b.writeUInt16LE(2 * bytes, 32); b.writeUInt16LE(bits, 34); b.write('data', 36); b.writeUInt32LE(N * 2 * bytes, 40);
  const r0 = rng(9001);
  for (let i = 0; i < N; i++) {
    for (const [c, x] of [[0, l[i]], [1, r[i]]]) {
      const o = 44 + (i * 2 + c) * bytes;
      if (bits === 32) b.writeFloatLE(x, o);
      else { const d = (r0() - r0()) / 8388608; b.writeIntLE(Math.max(-8388608, Math.min(8388607, Math.round((x + d) * 8388607))), o, 3); }   // TPDF dither
    }
  }
  writeFileSync(file, b);
}
function measure(file) {
  const e = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], {encoding: 'utf8'}).stderr;
  const g = (re) => +(e.match(re) || [])[1];
  return {I: g(/I:\s+(-?[\d.]+) LUFS/), LRA: g(/LRA:\s+(-?[\d.]+) LU/), TP: g(/Peak:\s+(-?[\d.]+) dBFS/)};
}
// look-ahead peak limiter: per-sample required gain from the sample and interpolated inter-sample peaks, minimum
// over a 4 ms look-ahead window, a short attack so the gain is down before the peak arrives, 80 ms release
function limit([l, r], ceilingDb) {
  const ceil = db(ceilingDb), look = S(0.004);
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let pk = Math.max(Math.abs(l[i]), Math.abs(r[i]));
    if (i + 1 < N) for (const f of [0.25, 0.5, 0.75]) {
      pk = Math.max(pk, Math.abs(l[i] + (l[i + 1] - l[i]) * f) * 1.08, Math.abs(r[i] + (r[i + 1] - r[i]) * f) * 1.08);
    }
    need[i] = pk > ceil ? ceil / pk : 1;
  }
  const ahead = new Float32Array(N), dq = new Int32Array(N);
  let head = 0, tail = 0;
  for (let i = 0; i < N; i++) {
    while (tail > head && need[dq[tail - 1]] >= need[i]) tail--;
    dq[tail++] = i;
    const j = i - look;
    if (j >= 0) { while (dq[head] < j) head++; ahead[j] = need[dq[head]]; }
  }
  for (let j = Math.max(0, N - look); j < N; j++) { let m = 1; for (let k = j; k < N; k++) m = Math.min(m, need[k]); ahead[j] = m; }
  const atk = Math.exp(-1 / (look / 5)), rel = Math.exp(-1 / (0.08 * SR));
  let y = 1;
  const over = {db0_5: 0, db1: 0, db2: 0, db3: 0, db6: 0}, max = {gr: 0};
  for (let i = 0; i < N; i++) {
    const target = ahead[i];
    y = target < y ? atk * y + (1 - atk) * target : rel * y + (1 - rel) * target;
    const g = Math.min(y, need[i]);                       // never let a sample through above the ceiling
    l[i] *= g; r[i] *= g;
    const gr = -20 * Math.log10(g);
    if (gr > 0.5) over.db0_5++; if (gr > 1) over.db1++; if (gr > 2) over.db2++; if (gr > 3) over.db3++; if (gr > 6) over.db6++;
    if (gr > max.gr) max.gr = gr;
  }
  return {max_gain_reduction_db: +max.gr.toFixed(2), percent_of_time_over: Object.fromEntries(Object.entries(over).map(([k, v]) => [k.replace('db', '').replace('_', '.') + ' dB', +(100 * v / N).toFixed(2)]))};
}

const t0 = Date.now();
const voice = loadVoice();
const speech = speechEnvelope(voice);              // ducking follows the untouched stem
const musicDuckEnv = holdRelease(speech, 0.5, 0.45);   // music returns only in real pauses (between lines)
const fxDuckEnv = holdRelease(speech, 0.08, 0.2);      // event sounds may still land in short gaps
const voiceComp = compressVoice(voice);
const music = score();
const gasBus = gas();
const {fx, used} = sfx();
const GAIN_DB = {music: -8.0, gas: -6.0, sfx: -5.0, voice: 0};
const DUCK_DB = {music: -14, gas: -14, sfx: -10};
const G = Object.fromEntries(Object.entries(GAIN_DB).map(([k, v]) => [k, db(v)]));
const DUCK = Object.fromEntries(Object.entries(DUCK_DB).map(([k, v]) => [k, db(v)]));
const mix = stereo();
for (let i = 0; i < N; i++) {
  const sm = musicDuckEnv[i], sf = fxDuckEnv[i];
  const dm = 1 - sm * (1 - DUCK.music), dg = 1 - sf * (1 - DUCK.gas), df = 1 - sf * (1 - DUCK.sfx);
  for (let c = 0; c < 2; c++) mix[c][i] = music[c][i] * G.music * dm + gasBus[c][i] * G.gas * dg + fx[c][i] * G.sfx * df + voice[c][i] * G.voice;
}
writeWav(join(OUT, 'music.wav'), music); writeWav(join(OUT, 'gas.wav'), gasBus); writeWav(join(OUT, 'sfx.wav'), fx);
writeWav(join(OUT, 'voice.wav'), voice); writeWav(join(OUT, 'mix.wav'), mix);
// the bed (everything but the voice) as it sits in the mix, to report its level against the narration
const bed = stereo();
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) bed[c][i] = mix[c][i] - voice[c][i] * G.voice;
writeWav(join(OUT, 'bed.wav'), bed);
const bedLevel = measure(join(OUT, 'bed.wav')), voiceLevel = measure(join(OUT, 'voice.wav'));
// bed level while the narrator speaks vs in the pauses (RMS dB, same gains as the mix)
const rmsDb = (pred) => { let a = 0, n = 0; for (let i = 0; i < N; i += 4) if (pred(i)) { a += 0.5 * (bed[0][i] ** 2 + bed[1][i] ** 2); n++; } return n ? +(10 * Math.log10(a / n + 1e-12)).toFixed(1) : null; };
const bedUnderSpeech = rmsDb((i) => speech[i] > 0.6), bedInPauses = rmsDb((i) => speech[i] < 0.1);
let va = 0, vn = 0; for (let i = 0; i < N; i += 4) if (speech[i] > 0.6) { va += 0.5 * (voice[0][i] ** 2 + voice[1][i] ** 2); vn++; }
const voiceUnderSpeech = +(10 * Math.log10(va / vn)).toFixed(1);
// each layer's level under speech, after its gain and ducking (which layer competes with the voice)
const layerUnderSpeech = {};
for (const [name, bus, duck, envl] of [['music', music, DUCK.music, musicDuckEnv], ['gas', gasBus, DUCK.gas, fxDuckEnv], ['sfx', fx, DUCK.sfx, fxDuckEnv]]) {
  let a = 0, n = 0;
  for (let i = 0; i < N; i += 4) if (speech[i] > 0.6) { const d = (1 - envl[i] * (1 - duck)) * G[name]; a += 0.5 * ((bus[0][i] * d) ** 2 + (bus[1][i] * d) ** 2); n++; }
  layerUnderSpeech[name] = +(10 * Math.log10(a / n + 1e-12)).toFixed(1);
}
const before = measure(join(OUT, 'mix.wav'));
let gainDb = TARGET_LUFS - before.I, ceiling = -2.0, after, limited = 0;
for (let pass = 0; pass < 6; pass++) {
  const m = [Float32Array.from(mix[0]), Float32Array.from(mix[1])];
  const g = db(gainDb);
  for (let i = 0; i < N; i++) { m[0][i] *= g; m[1][i] *= g; }
  limited = limit(m, ceiling);
  writeWav(join(OUT, 'master.wav'), m, 24);
  after = measure(join(OUT, 'master.wav'));
  console.log(`pass ${pass}: gain ${gainDb.toFixed(2)} dB, ceiling ${ceiling.toFixed(2)} dBFS → I ${after.I} LUFS, TP ${after.TP} dBTP, limiter ${JSON.stringify(limited)}`);
  if (after.TP > TP_MAX) { ceiling -= (after.TP - TP_MAX) + 0.15; continue; }
  if (Math.abs(after.I - TARGET_LUFS) > 0.15) { gainDb += TARGET_LUFS - after.I; continue; }
  break;
}
const report = {
  sample_rate: SR, duration_s: DUR, stems: ['music.wav', 'gas.wav', 'sfx.wav', 'voice.wav'], mix_gains_db: GAIN_DB,
  ducking_db_under_speech: DUCK_DB, ducking_envelopes: {music: 'hold 0.5 s, release 0.45 s', gas_and_sfx: 'hold 0.08 s, release 0.2 s'},
  narration: 'support/narration/narration-stem-75s.wav, unchanged timing and speed', voice_compressor: voiceComp,
  mix_before_master: before, levels_pre_master: {voice: voiceLevel, bed: bedLevel, voice_rms_db_while_speaking: voiceUnderSpeech,
    bed_rms_db_under_speech: bedUnderSpeech, bed_rms_db_in_pauses: bedInPauses, speech_to_bed_gap_db: +(voiceUnderSpeech - bedUnderSpeech).toFixed(1), layer_rms_db_under_speech: layerUnderSpeech},
  master: {file: 'master.wav (24-bit PCM, TPDF dither)', gain_db: +gainDb.toFixed(2), limiter_ceiling_dbfs: +ceiling.toFixed(2),
    limiter: limited, ...after, targets: {integrated_lufs: TARGET_LUFS, true_peak_max_dbtp: TP_MAX}},
  events: used, seconds: +((Date.now() - t0) / 1000).toFixed(1),
  note: 'Technical measurements only. No subjective listening has been done by the author; a human sound review is a separate gate.',
};
writeFileSync(join(OUT, 'sound.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.master));
