// score.mjs (v2 「一口气」): the film's sound, synthesised in code on the SAME clock as the picture.
//   node scripts/v2/score.mjs          → out/v2/audio/{music,gas,sfx,voice,mix,master}.wav + out/v2/audio/sound.json
//
// Inputs (nothing is hand-timed here): v2/cues.json (sections, beats, titles) and v2/timing.json (the measured
// narration clips in support/narration-v2, placed at their edit starts, never sped up).
// Arc: frame zero opens on an impact and a slowed, underwater roar under the giant question; the cut to the source
// shot snaps to the full-band gas roar with a rising pulse; the freeze is a tape-stop into a sub drop and a frozen
// D-minor pad; each explanatory reveal gets one tonal ping (forces, line of action, centre of mass, the turn, the
// glass x-ray); the resume cut slams the roar back and the harmony opens to D major on 一口气; the last sound is a
// single exhale as the cloud thins. Music and effects duck under the voice and return in its pauses.
// Master: FFmpeg EBU R128 measurement, gain to −14 LUFS integrated, then a look-ahead limiter whose ceiling is lowered
// until the true peak is ≤ −1.5 dBTP. Deterministic: seeded noise only.
// DSP kit, voice compressor, ducking, WAV writer, R128 measurement and limiter are v1's (scripts/score.mjs), verbatim.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, process.env.V2_AUDIO_OUT || 'out/v2/audio');
mkdirSync(OUT, {recursive: true});
const cues = JSON.parse(readFileSync(join(ROOT, 'v2/cues.json'), 'utf8'));
const timing = JSON.parse(readFileSync(join(ROOT, 'v2/timing.json'), 'utf8'));
const SR = 48000, DUR = cues.duration_s, N = Math.round(DUR * SR);
const B = cues.beats;
const SEC = Object.fromEntries(cues.sections.map((s) => [s.id, s]));
const TARGET_LUFS = -14, TP_MAX = -2.0;            // delivery spec is ≤ −1.5 dBTP; −2.0 leaves room for AAC overshoot
const VOICE_MAKEUP = Math.pow(10, 6 / 20);

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


// ------------------------------------------------------------------------------------------------ v2 timeline
const T = {
  cutSource: SEC.source.start, freeze: B.freeze, flyEnd: SEC.flyin.end, resume: B.resume, end: DUR,
  bigWord: cues.titles.end.big_at, fade: B.fade_out,
};
const lineById = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
const lastVoiceEnd = Math.max(...timing.lines.map((l) => l.end_s));
const used = [];
const mark = (what, t, extra = {}) => used.push({what, t: +t.toFixed(3), ...extra});

// ------------------------------------------------------------------------------------------------ 1. narration
function decodeMono(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], {maxBuffer: 1 << 28});
  if (r.status) throw new Error(String(r.stderr));
  return new Float32Array(r.stdout.buffer.slice(r.stdout.byteOffset, r.stdout.byteOffset + r.stdout.length));
}
function loadVoice() {
  const v = stereo();
  for (const l of timing.lines) {
    const x = decodeMono(join(ROOT, l.file));
    addMono(v, x, l.start_s, 1, 0);
    mark('voice ' + l.id, l.start_s, {dur_s: +(x.length / SR).toFixed(3)});
  }
  return v;
}

// ------------------------------------------------------------------------------------------------ 2. music
function gateEnv(n, a, d, t0, t1) {           // 0 outside [t0, t1], fades a (in) / d (out)
  const e = mono(n);
  for (let i = 0; i < n; i++) { const t = i / SR; e[i] = clamp((t - t0) / a) * clamp((t1 - t) / d); }
  return e;
}
function addPad(dst, notes, t0, dur, opt, gain) {
  notes.forEach((nm, k) => addStereo(dst, padVoice(NOTE(nm), dur, {seed: 40 + k * 7 + Math.round(t0 * 10), ...opt}), t0, gain));
}
function score() {
  const m = stereo();
  // teaser: low open fifth under the question, cut dead at the hard cut
  addPad(m, ['D2', 'A2', 'D3'], 0.0, T.cutSource - 0.05, {attack: 0.35, release: 0.12, bright: 5}, 1.0);
  for (const [nm, t] of [['A5', 0.32], ['D6', 1.36], ['E6', 2.6]]) { addMono(m, bell(NOTE(nm), {dur: 2.2, ratio: 2.0, index: 1.2, seed: Math.round(t * 100)}), t, 0.10, t < 1 ? -0.3 : 0.35); mark('glint', t); }
  // source: driving pulse, filter opening into the freeze (132 bpm eighths)
  const step = 60 / 132 / 2;
  for (let t = T.cutSource, k = 0; t < T.freeze - 0.05; t += step, k++) {
    const u = (t - T.cutSource) / (T.freeze - T.cutSource);
    const nm = k % 8 === 6 ? 'F2' : k % 8 === 7 ? 'E2' : 'D2';
    addMono(m, pluck(NOTE(nm), {dur: 0.22, cutoff: 380 + 3200 * u * u, seed: 300 + k}), t, 0.55 + 0.35 * u, (k % 2 ? 0.15 : -0.15));
  }
  mark('pulse', T.cutSource);
  // frozen time: a quiet D minor add9 pad that hangs under the whole explanation
  addPad(m, ['D3', 'F3', 'A3', 'E4'], T.freeze + 0.15, T.resume - T.freeze - 0.35, {attack: 1.4, release: 0.25, bright: 4}, 0.55);
  // reveal pings, one per new idea
  const ping = (nm, t, g = 0.16, pan = 0, ratio = 3.5) => { addMono(m, bell(NOTE(nm), {dur: 2.6, ratio, index: 1.8, seed: Math.round(t * 1000)}), t, g, pan); mark('ping ' + nm, t); };
  ping('A4', B.beams_on, 0.17, -0.2);
  ping('D5', B.merge_on + 0.45, 0.10, 0.2);
  ping('E5', B.lines_on, 0.13, 0.25);
  ping('D5', B.com_on, 0.16, 0); ping('D6', B.com_on + 0.02, 0.06, 0);
  ping('F4', B.arc_on, 0.13, -0.3); ping('A4', B.arc_on + 0.16, 0.15, 0.3);
  for (const [nm, dt, pan] of [['D5', 0, -0.4], ['A5', 0.07, 0.4], ['E6', 0.15, 0], ['A6', 0.24, 0.2]]) ping(nm, B.xray_on + dt, 0.09, pan, 2.0);
  ping('F5', B.vessel_label, 0.08, 0.3);
  // resume: the harmony opens; D major blooms on 一口气
  addPad(m, ['D2', 'A2', 'D3', 'F#3', 'A3'], T.resume + 0.05, T.end - T.resume - 0.6, {attack: 1.1, release: 0.5, bright: 6}, 0.8);
  addPad(m, ['F#4', 'A4', 'D5'], T.bigWord - 0.05, T.end - T.bigWord - 0.7, {attack: 0.45, release: 0.6, bright: 5}, 0.55);
  for (const [nm, dt, pan] of [['D5', 0, -0.3], ['A5', 0.05, 0.3], ['F#6', 0.1, 0]]) addMono(m, bell(NOTE(nm), {dur: 3.6, ratio: 2.0, index: 1.0, seed: 77 + dt * 100}), T.bigWord + dt, 0.12, pan);
  mark('bloom', T.bigWord);
  // master fade of the music bus
  for (let i = 0; i < N; i++) { const t = i / SR; const g = 1 - smooth((t - T.fade) / (T.end - T.fade - 0.05)); m[0][i] *= g; m[1][i] *= g; }
  const wet = reverb(m, {room: 0.86, damp: 0.4, width: 1});
  for (let i = 0; i < N; i++) { m[0][i] = m[0][i] * 0.8 + wet[0][i] * 0.55; m[1][i] = m[1][i] * 0.8 + wet[1][i] * 0.55; }
  return m;
}

// ------------------------------------------------------------------------------------------------ 3. gas (diegetic)
function gas() {
  const g = stereo();
  // slowed, low-passed roar for the slow-motion teaser
  {
    const n = S(T.cutSource), x = filt(filt(pink(11, n), 'lp', 520, 0.8), 'lowshelf', 120, 0.7, 4);
    const am = filt(white(12, n), 'lp', 0.9);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= (0.75 + 18 * am[i]) * clamp(t / 0.08) * clamp((T.cutSource - t) / 0.03); }
    addMono(g, x, 0, 2.2, -0.1); addMono(g, x, 0.013, 1.6, 0.25);
    mark('slow roar', 0);
  }
  // real-time jets: bright full-band hiss with turbulence; tape-stop into the freeze
  {
    const t0 = T.cutSource, t1 = T.freeze, n = S(t1 - t0 + 0.02);
    const tapeStart = t1 - 0.16;
    const x = filt(filt(white(21, n), 'hp', 380, 0.7), 'peak', 3200, 0.9, 5);
    const lpf = (i) => { const t = t0 + i / SR; return t < tapeStart ? 16000 : 16000 * Math.pow(0.012, clamp((t - tapeStart) / 0.16)); };
    filt(x, 'lp', lpf, 0.8);
    const am = filt(white(22, n), 'lp', 7);
    for (let i = 0; i < n; i++) {
      const t = t0 + i / SR, u = (t - t0) / (t1 - t0);
      const tape = t < tapeStart ? 1 : 1 - clamp((t - tapeStart) / 0.16) ** 1.5;
      x[i] *= (0.55 + 0.45 * u) * (0.8 + 6 * am[i]) * clamp((t - t0) / 0.012) * tape;
    }
    const xr = Float32Array.from(x); filt(xr, 'peak', 5200, 1.2, 3);
    addMono(g, x, t0, 1.0, -0.35); addMono(g, xr, t0 + 0.009, 0.9, 0.4);
    mark('jets', t0); mark('tape stop', tapeStart);
  }
  // schematic flow while the gas particles are drawn: quiet airy breath
  {
    const t0 = B.particles_on, t1 = T.resume - 0.05, n = S(t1 - t0);
    const x = filt(filt(pink(31, n), 'bp', 2600, 0.7), 'hp', 900);
    const am = filt(white(32, n), 'lp', 1.5);
    for (let i = 0; i < n; i++) { const t = t0 + i / SR; x[i] *= (0.6 + 9 * am[i]) * clamp((t - t0) / 0.6) * clamp((t1 - t) / 0.4); }
    addMono(g, x, t0, 0.35, 0.2);
    mark('flow breath', t0);
  }
  // torque: a slow rising whirr while the car turns
  {
    const t0 = B.arc_on - 0.1, t1 = B.xray_on + 0.4, n = S(t1 - t0);
    const x = filt(pink(41, n), 'bp', (i) => 260 * Math.pow(3.2, i / n), 3.0);
    for (let i = 0; i < n; i++) { const t = t0 + i / SR; x[i] *= clamp((t - t0) / 0.5) * clamp((t1 - t) / 0.5) * (0.7 + 0.3 * Math.sin(TAU * 3.1 * (t - t0))); }
    addMono(g, x, t0, 1.1, -0.2);
    mark('whirr', t0);
  }
  // resume: the roar slams back and leaves with the car; the cloud rumbles on
  {
    const t0 = T.resume, carGone = t0 + 2.9, n = S(T.end - t0);
    const x = filt(filt(white(51, n), 'hp', 300, 0.7), 'peak', 2800, 0.9, 4);
    const am = filt(white(52, n), 'lp', 6);
    for (let i = 0; i < n; i++) { const t = t0 + i / SR; x[i] *= (0.8 + 6 * am[i]) * clamp((t - t0) / 0.01) * (1 - smooth((t - (carGone - 1.2)) / 1.4)); }
    filt(x, 'lp', (i) => 14000 * Math.pow(0.15, clamp((i / SR - 1.0) / 2.2)), 0.7);
    addMono(g, x, t0, 1.0, -0.3); addMono(g, x, t0 + 0.011, 0.8, 0.35);
    const r = filt(filt(pink(53, n), 'lp', 240, 0.8), 'lowshelf', 90, 0.7, 5);
    const sw = filt(white(54, n), 'lp', 0.5);
    for (let i = 0; i < n; i++) { const t = t0 + i / SR; r[i] *= (0.7 + 14 * sw[i]) * clamp((t - t0 - 0.4) / 1.6) * (1 - smooth((t - T.fade) / (T.end - T.fade))); }
    addMono(g, r, t0, 2.0, 0);
    mark('roar back', t0); mark('cloud rumble', t0 + 0.4);
  }
  return g;
}

// ------------------------------------------------------------------------------------------------ 4. effects
function sfx() {
  const f = stereo();
  const hit = (t, f0, f1, dur, decay, g, seed) => { addMono(f, sub(f0, f1, dur, decay, seed, 0.35), t, g, 0); mark('hit', t, {f0, f1}); };
  const burst = (t, g, seed, lp = 2400) => { const n = S(0.9), b = filt(white(seed, n), 'lp', lp, 0.7); for (let i = 0; i < n; i++) b[i] *= Math.exp(-i / SR / 0.16) * Math.min(1, i / (0.002 * SR)); addMono(f, b, t, g, 0); };
  // frame zero: the image arrives on an impact
  hit(0.0, 72, 36, 1.8, 0.75, 0.95, 1); burst(0.0, 0.35, 2, 1200);
  // hard cut to the source: the cloud bursts
  hit(T.cutSource, 95, 44, 1.2, 0.45, 0.85, 3); burst(T.cutSource, 0.7, 4, 3600);
  // the car passes overhead: a whoosh following its rise across frame
  addMono(f, whoosh(5, 1.6, {f0: 300, f1: 2600, q: 0.7, shape: 'sine'}), T.cutSource + 1.05, 0.65, 0.4); mark('pass whoosh', T.cutSource + 1.05);
  // riser into the freeze
  addMono(f, whoosh(6, 1.2, {f0: 500, f1: 7000, q: 0.9, shape: 'swell'}), T.freeze - 1.2, 0.5, 0); mark('riser', T.freeze - 1.2);
  // FREEZE: shutter click, sub drop, a high frozen shimmer
  addMono(f, click(7, {f: 4200, ping: 2200, dur: 0.06, decay: 0.009}), T.freeze, 0.8, 0);
  hit(T.freeze, 130, 30, 2.4, 1.1, 1.0, 8);
  {
    const n = S(2.6), x = filt(white(9, n), 'bp', 8200, 3.5);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.02) * Math.exp(-t / 0.9); }
    addMono(f, x, T.freeze, 0.22, 0.3); mark('ice shimmer', T.freeze);
  }
  // camera moves: the fly-in push, the orbit to the rear, the rise to the x-ray
  addMono(f, whoosh(10, T.flyEnd - T.freeze - 0.3, {f0: 250, f1: 1800, q: 0.6, shape: 'sine'}), T.freeze + 0.3, 0.55, -0.1); mark('fly-in', T.freeze + 0.3);
  addMono(f, whoosh(11, 1.1, {f0: 300, f1: 1200, q: 0.6, shape: 'sine'}), B.orbit_rear, 0.3, 0.3);
  addMono(f, whoosh(12, 1.3, {f0: 600, f1: 3400, q: 0.7, shape: 'sine'}), B.xray_on - 0.1, 0.3, -0.2);
  // a soft heartbeat under the explanation
  for (let t = T.flyEnd + 0.1; t < T.resume - 0.5; t += 0.96) { addMono(f, sub(66, 46, 0.35, 0.09, Math.round(t * 100), 0.12), t, 0.26, 0); addMono(f, sub(60, 44, 0.3, 0.07, Math.round(t * 100) + 1, 0.12), t + 0.24, 0.16, 0); }
  mark('heartbeat', T.flyEnd + 0.1);
  // resume cut: impact
  hit(T.resume, 100, 40, 1.4, 0.5, 0.95, 13); burst(T.resume, 0.6, 14, 3000);
  // into 一口气: a reversed swell landing on the word
  {
    const d = 1.0, n = S(d), x = filt(pink(15, n), 'bp', (i) => 900 * Math.pow(6, i / n), 0.8);
    for (let i = 0; i < n; i++) { const u = i / n; x[i] *= u ** 2.5; }
    addMono(f, x, T.bigWord - d, 0.55, 0); mark('swell', T.bigWord - d);
  }
  hit(T.bigWord, 58, 34, 2.2, 0.9, 0.6, 16);
  // the last sound: one long exhale as the cloud thins
  {
    const t0 = Math.max(lastVoiceEnd + 0.25, T.fade - 0.6), d = 1.7, n = S(d);
    const x = filt(filt(pink(17, n), 'bp', (i) => 1700 * Math.pow(0.55, i / n), 0.9), 'hp', 300);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.14) ** 1.5 * Math.exp(-Math.max(0, t - 0.14) / 0.55); }
    addMono(f, x, t0, 0.9, 0.05); mark('exhale', t0);
  }
  return f;
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

// ------------------------------------------------------------------------------------------------ mix and master
const t0 = Date.now();
const voice = loadVoice();
for (let i = 0; i < N; i++) { voice[0][i] *= VOICE_MAKEUP; voice[1][i] *= VOICE_MAKEUP; }   // TTS arrives ~10 dB low
const speech = speechEnvelope(voice);
const musicDuckEnv = holdRelease(speech, 0.45, 0.4);
const fxDuckEnv = holdRelease(speech, 0.08, 0.2);
const voiceComp = compressVoice(voice, {thresholdDb: -23, ratio: 2.4, kneeDb: 8});
const music = score();
const gasBus = gas();
const fx = sfx();
const GAIN_DB = {music: -11.0, gas: -13.0, sfx: -7.5, voice: 0};
const DUCK_DB = {music: -13, gas: -18, sfx: -10};
const G = Object.fromEntries(Object.entries(GAIN_DB).map(([k, v]) => [k, db(v)]));
const DUCK = Object.fromEntries(Object.entries(DUCK_DB).map(([k, v]) => [k, db(v)]));
const mix = stereo();
for (let i = 0; i < N; i++) {
  const sm = musicDuckEnv[i], sf = fxDuckEnv[i];
  const dm = 1 - sm * (1 - DUCK.music), dg = 1 - sf * (1 - DUCK.gas), df = 1 - sf * (1 - DUCK.sfx);
  for (let c = 0; c < 2; c++) mix[c][i] = music[c][i] * G.music * dm + gasBus[c][i] * G.gas * dg + fx[c][i] * G.sfx * df + voice[c][i] * G.voice;
}
// phones reproduce nothing below ~80 Hz; remove inaudible sub-30 Hz energy that only costs headroom
for (const c of [0, 1]) { filt(mix[c], 'hp', 32, 0.6); filt(mix[c], 'hp', 32, 0.6); }
writeWav(join(OUT, 'music.wav'), music); writeWav(join(OUT, 'gas.wav'), gasBus); writeWav(join(OUT, 'sfx.wav'), fx);
writeWav(join(OUT, 'voice.wav'), voice); writeWav(join(OUT, 'mix.wav'), mix);
const bed = stereo();
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) bed[c][i] = mix[c][i] - voice[c][i] * G.voice;
const rmsDb = (bus, pred) => { let a = 0, n = 0; for (let i = 0; i < N; i += 4) if (pred(i)) { a += 0.5 * (bus[0][i] ** 2 + bus[1][i] ** 2); n++; } return n ? +(10 * Math.log10(a / n + 1e-12)).toFixed(1) : null; };
const voiceWhileSpeaking = rmsDb(voice, (i) => speech[i] > 0.6), bedWhileSpeaking = rmsDb(bed, (i) => speech[i] > 0.6), bedInPauses = rmsDb(bed, (i) => speech[i] < 0.1);
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
  film: 'v2 一口气', sample_rate: SR, duration_s: DUR, cues_sha256: timing.cues_sha256, stems: ['music.wav', 'gas.wav', 'sfx.wav', 'voice.wav'],
  mix_gains_db: GAIN_DB, ducking_db_under_speech: DUCK_DB, narration: timing.lines.map((l) => ({id: l.id, file: l.file, start_s: l.start_s, end_s: l.end_s})),
  voice_makeup_db: 6, voice_compressor: voiceComp, mix_before_master: before,
  levels_pre_master: {voice_rms_db_while_speaking: voiceWhileSpeaking, bed_rms_db_while_speaking: bedWhileSpeaking, bed_rms_db_in_pauses: bedInPauses,
    speech_to_bed_gap_db: +(voiceWhileSpeaking - bedWhileSpeaking).toFixed(1)},
  master: {file: 'master.wav (24-bit PCM, TPDF dither)', gain_db: +gainDb.toFixed(2), limiter_ceiling_dbfs: +ceiling.toFixed(2), limiter: limited, ...after,
    targets: {integrated_lufs: TARGET_LUFS, true_peak_max_dbtp: TP_MAX}},
  events: used, seconds: +((Date.now() - t0) / 1000).toFixed(1),
  note: 'Technical measurements only. No subjective listening by the author; the human sound review is a separate gate.',
};
writeFileSync(join(OUT, 'sound.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.master));
