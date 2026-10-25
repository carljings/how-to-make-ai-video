// score.mjs (v3 「比墙还陡」): the film's sound, synthesised in code on the SAME clock as the picture.
//   node scripts/v3/score.mjs     → $V3_AUDIO_OUT (default out/v3-audio): {music,amb,sfx,voice,mix,master}.wav + sound.json
//
// Inputs (nothing is hand-timed here): v3/cues.json (sections and their source clocks), v3/timing.json (the measured
// narration in support/narration-v3, placed at its edit starts, never sped up) and the word anchors / strobe times
// that blender/tools/export_v3_overlay.py writes to src/v3/data/plates.json.
// Arc: frame zero lands on an impact under a choked, heavy fan whir; the real-speed wide opens into venue air and a
// rising motor; the freeze is a tape-stop into a sub drop and one thin held "pressure" tone. The explanation runs on a
// quiet D-minor bed: a granular rain of air clicks that is pumped away (a falling glide), then resolves into a pitched
// tone and a deep thump on 压; a hiss for 吸, a slam for 压; rubber under load for the tyres; plate-shutter clicks and
// an ascending arpeggio that lands on the tonic at 往上. At the lip a pad rises and the fan glides up as its load
// falls; one dry jet hiss; a granular scatter when the press is gone; a beat of near-silence. Glass and a metallic ping
// for the vessels, an upward rush on 接力, layered cold-gas hiss and a heavy whumph into the cloud. Silence at each
// black cut. The kickflip reuses v2's roar / whirr / impact language. The ending: a warm chord on 借, a glassy chord on
// 花, shutter clicks for the fly-out, the hiss going out one jet at a time, a last valve exhale and a low tone fading.
// Voice always on top: music and effects duck under it and return in its pauses.
// Master: FFmpeg EBU R128 measurement, gain to −14 LUFS integrated, then a look-ahead limiter whose ceiling is lowered
// until the true peak is ≤ −2.0 dBTP (delivery ≤ −1.5 after AAC). Deterministic: seeded noise only.
// DSP kit, voice compressor, ducking, WAV writer, R128 measurement and limiter: v2's (scripts/v2/score.mjs), verbatim.
import {spawnSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_ENV = process.env.V3_AUDIO_OUT || 'out/v3-audio';
const OUT = isAbsolute(OUT_ENV) ? OUT_ENV : join(ROOT, OUT_ENV);
mkdirSync(OUT, {recursive: true});
const cues = JSON.parse(readFileSync(join(ROOT, 'v3/cues.json'), 'utf8'));
const timing = JSON.parse(readFileSync(join(ROOT, 'v3/timing.json'), 'utf8'));
const plates = JSON.parse(readFileSync(join(ROOT, 'src/v3/data/plates.json'), 'utf8'));
const sha = (f) => spawnSync('sha256sum', [f], {encoding: 'utf8'}).stdout.split(' ')[0];
if (timing.cues_sha256 !== sha(join(ROOT, 'v3/cues.json'))) throw new Error('v3/timing.json is stale: run python3 blender/tools/retime_v3.py');
if (plates.cues_sha256 !== timing.cues_sha256) throw new Error('src/v3/data/plates.json is stale: run python3 blender/tools/export_v3_overlay.py');
const SR = 48000, DUR = cues.duration_s, N = Math.round(DUR * SR);
const TARGET_LUFS = -14, TP_MAX = -2.0;            // delivery spec is ≤ −1.5 dBTP; −2.0 leaves room for AAC overshoot
const VOICE_MAKEUP = Math.pow(10, 6 / 20);
const VOICE_CEILING_DB = -14.0;                    // voice-bus peak ceiling (stem level, before the master gain)

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


// ------------------------------------------------------------------------------------------------ v3 timeline
const ramp = (t, a, b) => (b > a ? smooth((t - a) / (b - a)) : t >= a ? 1 : 0);
const SEC = Object.fromEntries(cues.sections.map((s) => [s.id, s]));
const A = plates.anchors;
const lineById = Object.fromEntries(timing.lines.map((l) => [l.id, l]));
const L = (id) => lineById[id];
// film time at which a section's source clock reaches ev (piecewise-linear clocks, first crossing)
function tAt(secId, ev) {
  const k = SEC[secId].clock.keys;
  for (let i = 0; i + 1 < k.length; i++) {
    const [t0, e0] = k[i], [t1, e1] = k[i + 1];
    if (e1 !== e0 && ev >= Math.min(e0, e1) && ev <= Math.max(e0, e1)) return t0 + (ev - e0) / (e1 - e0) * (t1 - t0);
  }
  return ev <= k[0][1] ? k[0][0] : k[k.length - 1][0];
}
const T = {
  evidence: SEC.evidence.start, freeze: SEC.freeze.start, p1: SEC.press_a.start, gap: SEC.press_gap.start,
  pressB: SEC.press_b.start, tyre: SEC.press_tyre.start, chrono: SEC.chrono.start, lip: SEC.lip.start, xray: SEC.xray.start,
  jets: SEC.jets.start, sep1: SEC.sep1.start, k1: SEC.k1.start, k2: SEC.k2.start, k3: SEC.k3.start, sep2: SEC.sep2.start,
  ending: SEC.ending.start, end: DUR,
  firstJet: tAt('lip', 9.45), sealOpen: tAt('lip', 9.2), offLip: A.unpress, underJets: tAt('jets', 10.3),
  cloud: tAt('jets', 11.55), flyOut: SEC.ending.clock.keys[2][0],
};
const ghostRampT = plates.ghosts_ramp.map((ev) => tAt('chrono', ev));
const ghostAirT = plates.ghosts_air.map((ev) => tAt('ending', ev));
const lastVoiceEnd = Math.max(...timing.lines.map((l) => l.end_s));
const used = [];
const mark = (what, t, extra = {}) => used.push({what, t: +t.toFixed(3), ...extra});
// silence windows: the two black separations (a hard gate on every bus except the reverb tail of the music)
const SEPS = [[T.sep1, T.k1], [T.sep2, T.ending]];
const inSep = (t) => SEPS.some(([a, b]) => t >= a && t < b);

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

// ------------------------------------------------------------------------------------------------ helpers
function addPad(dst, notes, t0, dur, opt, gain) {
  notes.forEach((nm, k) => addStereo(dst, padVoice(NOTE(nm), dur, {seed: 40 + k * 7 + Math.round(t0 * 10), ...opt}), t0, gain));
}
const ping = (dst, nm, t, g = 0.15, pan = 0, ratio = 3.5, dur = 2.6) => { addMono(dst, bell(NOTE(nm), {dur, ratio, index: 1.8, seed: Math.round(t * 1000)}), t, g, pan); mark('ping ' + nm, t); };
// a filtered-noise layer between t0 and t1 with fades (a, d) and an optional per-sample gain shape g(u)
function noiseBed(dst, seed, t0, t1, {type = 'bp', f = 1000, q = 0.7, a = 0.1, d = 0.2, gain = 1, pan = 0, pink: usePink = true, shape = null, am = 0} = {}) {
  const n = S(t1 - t0); if (n <= 0) return;
  const x = filt(usePink ? pink(seed, n) : white(seed, n), type, f, q);
  const m = am ? filt(white(seed + 1, n), 'lp', am) : null;
  for (let i = 0; i < n; i++) { const t = i / SR, u = i / n; x[i] *= clamp(t / a) * clamp((t1 - t0 - t) / d) * (shape ? shape(u, t0 + t) : 1) * (m ? 0.6 + 9 * m[i] : 1); }
  addMono(dst, x, t0, gain, pan);
}
// clicks: a sparse granular rain of tiny bandpassed ticks, density per second d(t)
function rain(dst, seed, t0, t1, dens, {f = 3600, gain = 0.5} = {}) {
  const r = rng(seed);
  for (let t = t0; t < t1;) {
    const rate = Math.max(1, dens(t));
    t += -Math.log(1 - r()) / rate;
    if (t >= t1) break;
    addMono(dst, click(Math.round(t * 9973), {f: f * (0.7 + 0.6 * r()), ping: 1400 + 1800 * r(), dur: 0.02, decay: 0.0025}), t, gain * (0.4 + 0.6 * r()), r() * 1.6 - 0.8);
  }
}
// fan: a choked rotor whir: noise through a resonant band whose centre follows f(t), with blade-rate amplitude flutter
function fan(dst, seed, t0, t1, fHz, {gain = 1, q = 3.0, blade = 38, a = 0.2, d = 0.3, pan = 0} = {}) {
  const n = S(t1 - t0); if (n <= 0) return;
  const x = filt(pink(seed, n), 'bp', (i) => fHz(t0 + i / SR), q);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= (0.75 + 0.25 * Math.sin(TAU * blade * t)) * clamp(t / a) * clamp((t1 - t0 - t) / d); }
  addMono(dst, x, t0, gain, pan);
}
// a pitched sine with glide f(t) and envelope (used for the held pressure tone and the resolving tone)
function tone(dst, t0, t1, fHz, {gain = 0.1, a = 0.05, d = 0.3, pan = 0, harm = 0} = {}) {
  const n = S(t1 - t0); if (n <= 0) return;
  const x = mono(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR; ph += TAU * fHz(t0 + t) / SR; x[i] = (Math.sin(ph) + harm * Math.sin(2 * ph) * 0.5) * clamp(t / a) * clamp((t1 - t0 - t) / d); }
  addMono(dst, x, t0, gain, pan);
}

// ------------------------------------------------------------------------------------------------ 2. music
function score() {
  const m = stereo();
  // hook: low open fifth under the question (cut dead on the hard cut), one glint on each title
  addPad(m, ['D2', 'A2', 'D3'], 0.0, T.evidence - 0.05, {attack: 0.3, release: 0.1, bright: 5}, 0.7);
  ping(m, 'A5', 0.05, 0.08, -0.3, 2.0); ping(m, 'E6', A.hook_small, 0.06, 0.35, 2.0);
  // evidence: a rising pulse into the freeze (D, eighths at 120 bpm, filter opening)
  const step = 60 / 120 / 2;
  for (let t = T.evidence, k = 0; t < T.freeze - 0.05; t += step, k++) {
    const u = (t - T.evidence) / (T.freeze - T.evidence);
    addMono(m, pluck(NOTE(k % 8 === 7 ? 'C2' : 'D2'), {dur: 0.2, cutoff: 360 + 2600 * u * u, seed: 300 + k}), t, 0.5 + 0.35 * u, k % 2 ? 0.15 : -0.15);
  }
  mark('pulse', T.evidence);
  // explanation bed: a quiet D-minor add9 pad from the first cross-section to the end of the strobe plate
  addPad(m, ['D3', 'F3', 'A3', 'E4'], T.p1, T.lip - T.p1 + 0.4, {attack: 1.6, release: 0.6, bright: 4}, 0.42);
  // the ticks resolve into one pitched tone (many small pushes become one force), landing on 压
  tone(m, A.ticks_on + 0.4, A.press_land + 1.6, (t) => 220 * (t < A.press_land ? 1 : 1), {gain: 0.05, a: 1.2, d: 0.8});
  tone(m, A.press_land, A.press_land + 2.4, () => 110, {gain: 0.06, a: 0.02, d: 1.6, harm: 0.6});
  // strobe: an ascending D-minor arpeggio, one note per press arrow, landing on the tonic at 往上
  const arp = ['D4', 'F4', 'A4', 'C5', 'D5', 'F5', 'A5'];
  plates.ghosts_ramp.forEach((_, i) => ping(m, arp[i % arp.length], A.ghost_arrows + 0.22 * i, 0.075, -0.5 + i / 6, 3.0, 1.8));
  ping(m, 'D6', A.up_flare, 0.11, 0.1, 2.0, 3.2); ping(m, 'D5', A.up_flare + 0.02, 0.08, -0.1, 2.0, 3.2);
  // the lip: a rising pad, gone at the moment the press is gone (then a beat of near-silence)
  addPad(m, ['D3', 'A3', 'E4', 'A4'], T.lip + 0.2, T.offLip - T.lip - 0.15, {attack: 3.2, release: 0.12, bright: 5}, 0.5);
  // the vessels: glass and a metallic ping; air is cold from here
  for (const [nm, dt, pan] of [['E5', 0, -0.4], ['B5', 0.07, 0.4], ['E6', 0.15, 0], ['G#6', 0.24, 0.2]]) ping(m, nm, A.scan + 0.05 + dt, 0.07, pan, 2.0);
  ping(m, 'B4', A.vessel_label, 0.09, 0.3, 1.414, 3.0);
  addPad(m, ['E3', 'B3', 'F#4'], T.xray + 0.3, T.sep1 - T.xray - 0.3, {attack: 1.0, release: 0.15, bright: 3}, 0.32);
  // kickflip: a held suspension, a ping on 重心 and on the turn
  addPad(m, ['D3', 'G3', 'A3'], T.k1 + 0.1, T.sep2 - T.k1 - 0.1, {attack: 0.8, release: 0.2, bright: 4}, 0.32);
  ping(m, 'A4', A.k2_com, 0.11, 0); ping(m, 'D5', A.k2_arc, 0.1, 0.3);
  // ending: warm chord for 借 (air), glassy chord for 花 (gas), a low tone that outlasts the picture
  const jie = L('L12').phrases[1].start_s, hua = L('L13').phrases[1].start_s;
  addPad(m, ['F2', 'C3', 'F3', 'A3', 'C4'], jie - 0.05, T.end - jie - 0.3, {attack: 0.6, release: 0.5, bright: 6}, 0.5);
  mark('warm chord', jie);
  addPad(m, ['E4', 'G#4', 'B4', 'D#5'], hua - 0.05, T.end - hua - 0.4, {attack: 0.25, release: 0.5, bright: 3}, 0.3);
  for (const [nm, dt, pan] of [['B5', 0, -0.3], ['E6', 0.06, 0.3], ['G#6', 0.12, 0]]) ping(m, nm, hua + dt, 0.07, pan, 2.0, 3.4);
  mark('glass chord', hua);
  // music bus: hard silence in the separations (the hall answers with its tail), final fade
  for (let i = 0; i < N; i++) { const t = i / SR; const g = (inSep(t) ? 0 : 1) * (1 - smooth((t - A.fade_out) / (T.end - A.fade_out - 0.05))); m[0][i] *= g; m[1][i] *= g; }
  const wet = reverb(m, {room: 0.86, damp: 0.4, width: 1});
  for (let i = 0; i < N; i++) { m[0][i] = m[0][i] * 0.8 + wet[0][i] * 0.55; m[1][i] = m[1][i] * 0.8 + wet[1][i] * 0.55; }
  return m;
}

// ------------------------------------------------------------------------------------------------ 3. ambience (diegetic)
function ambience() {
  const g = stereo();
  // hook (slow motion): a choked, heavy fan whir and a low tyre-on-concrete grind, slowed
  fan(g, 11, 0, T.evidence, () => 140, {gain: 1.6, q: 2.2, blade: 22, a: 0.05, d: 0.03});
  noiseBed(g, 12, 0, T.evidence, {type: 'lp', f: 260, q: 0.8, gain: 1.4, a: 0.05, d: 0.03, am: 1.2});
  // evidence (real speed): venue air, a motor rising, the fan at speed; tape-stop into the freeze
  noiseBed(g, 21, T.evidence, T.freeze + 0.02, {type: 'lp', f: 900, gain: 0.7, a: 0.01, d: 0.02, pan: -0.2,
    shape: (u, t) => t < T.freeze - 0.16 ? 1 : 1 - clamp((t - (T.freeze - 0.16)) / 0.16) ** 1.5});
  tone(g, T.evidence, T.freeze, (t) => 180 + 140 * clamp((t - T.evidence) / (T.freeze - T.evidence)) - (t > T.freeze - 0.16 ? 260 * clamp((t - (T.freeze - 0.16)) / 0.16) : 0), {gain: 0.05, a: 0.02, d: 0.02, harm: 0.8});
  fan(g, 22, T.evidence, T.freeze, () => 420, {gain: 0.9, q: 2.5, blade: 55, a: 0.01, d: 0.02, pan: 0.2});
  mark('venue + motor + fan', T.evidence); mark('tape stop', T.freeze - 0.16);
  // the frozen moment: one very thin held tone (the sound of pressure) under the first cross-section
  tone(g, T.freeze + 0.05, T.gap + 0.4, () => 2790, {gain: 0.012, a: 0.4, d: 0.6, pan: 0.3});
  // air: a granular rain of micro-clicks, densest at the surfaces; pumped away from the gap (falling glide)
  rain(g, 31, A.air_on, T.tyre - 0.1, (t) => 26 + 70 * ramp(t, A.air_on, A.air_on + 1.0) - 40 * ramp(t, A.press_land - 0.6, A.press_land + 0.2), {gain: 0.32});
  noiseBed(g, 32, A.pump, A.pump + 1.3, {type: 'bp', f: 2400, q: 1.4, gain: 0.5, a: 0.05, d: 0.5,
    shape: (u) => (1 - u) ** 1.4});
  tone(g, A.pump, A.pump + 1.2, (t) => 900 * Math.pow(0.35, clamp((t - A.pump) / 1.2)), {gain: 0.02, a: 0.05, d: 0.4});
  mark('air rain', A.air_on); mark('pump glide', A.pump);
  // the fan under the floor (choked) through the cross-sections, then the tyres under load
  fan(g, 33, T.p1, T.tyre, () => 120, {gain: 0.75, q: 2.0, blade: 30, a: 0.6, d: 0.4});
  noiseBed(g, 34, T.tyre, T.chrono, {type: 'lp', f: 180, q: 0.9, gain: 1.6, a: 0.25, d: 0.3, am: 2.2});
  noiseBed(g, 35, T.tyre, T.chrono, {type: 'bp', f: 700, q: 2.0, gain: 0.35, a: 0.3, d: 0.3, am: 3.5});
  mark('rubber under load', T.tyre);
  // the lip: the fan glides up as its load falls (the gap opens from the front)
  fan(g, 41, T.lip, T.offLip + 0.15, (t) => 130 + 520 * ramp(t, T.sealOpen, T.offLip), {gain: 0.85, q: 2.6, blade: 34, a: 0.6, d: 0.12});
  mark('fan glide', T.sealOpen);
  // jets (replay B, slowed): cold-gas hiss in layers as the jets come on, rumble from the cloud
  noiseBed(g, 51, T.jets, T.sep1, {type: 'bp', f: 2600, q: 0.35, gain: 0.55, a: 0.008, d: 0.03, am: 6,
    shape: (u, t) => 0.45 + 0.55 * ramp(t, T.underJets - 0.1, T.underJets + 0.3)});
  noiseBed(g, 52, T.jets + 0.009, T.sep1, {type: 'bp', f: 4200, q: 0.6, gain: 0.3, a: 0.008, d: 0.03, pan: 0.4, am: 7,
    shape: (u, t) => ramp(t, T.underJets - 0.1, T.underJets + 0.3)});
  noiseBed(g, 53, T.cloud, T.sep1, {type: 'lp', f: 220, gain: 1.2, a: 0.6, d: 0.03, am: 0.6});
  mark('cold gas', T.jets); mark('cloud rumble', T.cloud);
  // kickflip (v2 language): roar, whirr while it turns, roar back after the flip
  noiseBed(g, 61, T.k1, T.k2, {type: 'bp', f: 2000, q: 0.35, gain: 0.5, a: 0.01, d: 0.05, am: 6});
  noiseBed(g, 62, T.k2, T.k3, {type: 'bp', f: 600, q: 2.5, gain: 0.9, a: 0.3, d: 0.1, shape: (u) => 0.6 + 0.4 * u});
  tone(g, T.k2 + 0.2, T.k3, (t) => 160 * Math.pow(2.2, clamp((t - T.k2) / (T.k3 - T.k2))), {gain: 0.025, a: 0.4, d: 0.1, harm: 0.5});
  noiseBed(g, 63, T.k3, T.sep2, {type: 'bp', f: 2000, q: 0.35, gain: 0.55, a: 0.006, d: 0.04, am: 6, shape: (u) => 1 - 0.5 * u});
  noiseBed(g, 64, T.k3 + 0.3, T.sep2, {type: 'lp', f: 230, gain: 1.1, a: 0.8, d: 0.04, am: 0.6});
  // ending: the fly-out jets, then the hiss goes out one jet at a time; the cloud thins
  noiseBed(g, 71, T.flyOut, A.jets_out + 2.0, {type: 'bp', f: 3000, q: 0.4, gain: 0.4, a: 0.05, d: 0.6, am: 5,
    shape: (u, t) => 1 - plates.ghosts_air.reduce((acc, _, i) => acc + ramp(t, A.jets_out - 0.3 + 0.22 * i, A.jets_out - 0.3 + 0.22 * i + 0.3) / plates.ghosts_air.length, 0)});
  noiseBed(g, 72, T.flyOut + 1.4, T.end, {type: 'lp', f: 200, gain: 1.1, a: 1.0, d: 1.5, am: 0.5});
  for (let i = 0; i < N; i++) { const t = i / SR; if (inSep(t)) { g[0][i] = 0; g[1][i] = 0; } }
  return g;
}

// ------------------------------------------------------------------------------------------------ 4. effects
function sfx() {
  const f = stereo();
  const hit = (t, f0, f1, dur, decay, g, seed) => { addMono(f, sub(f0, f1, dur, decay, seed, 0.35), t, g, 0); mark('hit', t, {f0, f1}); };
  const burst = (t, g, seed, lp = 2400, dec = 0.16) => { const n = S(0.9), b = filt(white(seed, n), 'lp', lp, 0.7); for (let i = 0; i < n; i++) b[i] *= Math.exp(-i / SR / dec) * Math.min(1, i / (0.002 * SR)); addMono(f, b, t, g, 0); };
  const shutter = (t, k, g = 0.5) => { addMono(f, click(500 + k, {f: 2400 + 260 * k, ping: 1200 + 180 * k, dur: 0.06, decay: 0.008}), t, g, -0.3 + 0.1 * k); addMono(f, click(600 + k, {f: 5200, ping: 2600 + 150 * k, dur: 0.03, decay: 0.004}), t + 0.045, g * 0.6, 0.2); };
  // frame zero lands on an impact; the hard cut to the real-speed wide
  hit(0.0, 70, 34, 1.9, 0.8, 1.0, 1); burst(0.0, 0.3, 2, 1100);
  hit(T.evidence, 90, 42, 1.0, 0.4, 0.6, 3);
  // v4 light-sheet (times from plates.sheet, i.e. v3_film.SHEET_IN): a bright tick as it ignites beyond the far edge
  // (screen left), a thin laser tone that travels with the plane (pan left -> right) and brightens into the lock, a
  // faint air layer under it, then a glass click on the lock -- 0.14 s before the freeze shutter
  {
    const sh = plates.sheet, d = sh.lock - sh.in, n = S(d + 0.3), x = mono(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, u = clamp(t / d);
      ph += TAU * (1480 + 900 * u * u) / SR;
      const env = Math.min(1, t / 0.015) * (t < d ? 0.5 + 0.5 * u : Math.exp(-(t - d) / 0.09));
      x[i] = (Math.sin(ph) + 0.22 * Math.sin(2.01 * ph)) * env;
    }
    const o = S(sh.in);
    for (let i = 0; i < n; i++) {
      const k = o + i; if (k < 0 || k >= N) continue;
      const [gl, gr] = panGains(-0.6 + clamp(i / S(d)) * 1.0);
      f[0][k] += x[i] * 0.07 * gl; f[1][k] += x[i] * 0.07 * gr;
    }
    addMono(f, click(41, {f: 6200, ping: 3100, dur: 0.05, decay: 0.006}), sh.in, 0.42, -0.55);
    addMono(f, whoosh(42, d, {f0: 2000, f1: 6400, q: 1.1, shape: 'swell'}), sh.in, 0.12, 0);
    addMono(f, click(43, {f: 5200, ping: 2640, dur: 0.06, decay: 0.011}), sh.lock, 0.5, 0.4);
    mark('sheet ignite', sh.in); mark('sheet lock', sh.lock);
    // the plane slides out to the near wheel (a short falling glide), and at the end the boundary is drawn (a soft
    // rising shimmer under 腾了空; the voice stays on top through the ducking)
    { const m = S(sh.tyre_slide), y = mono(m); let p2 = 0;
      for (let i = 0; i < m; i++) { const u = i / m; p2 += TAU * (2380 - 620 * u) / SR; y[i] = Math.sin(p2) * Math.sin(Math.PI * u); }
      addMono(f, y, sh.tyre, 0.045, 0.2); mark('sheet slide', sh.tyre); }
    addMono(f, whoosh(44, 0.6, {f0: 1800, f1: 7000, q: 1.4, shape: 'sine'}), sh.boundary - 0.05, 0.12, -0.1);
    { const m = S(1.2), y = mono(m); for (let i = 0; i < m; i++) { const t = i / SR; y[i] = Math.sin(TAU * 2380 * t) * Math.min(1, t / 0.05) * Math.exp(-t / 0.45); }
      addMono(f, y, sh.boundary, 0.035, -0.1); mark('sheet boundary', sh.boundary); }
  }
  // FREEZE: shutter, sub drop
  addMono(f, click(7, {f: 4200, ping: 2200, dur: 0.06, decay: 0.009}), T.freeze, 0.8, 0);
  hit(T.freeze, 130, 28, 2.4, 1.1, 1.0, 8);
  // the cut into the cross-section, the gap close-up
  addMono(f, whoosh(9, 0.5, {f0: 300, f1: 1400, q: 0.7, shape: 'sine'}), T.p1 - 0.1, 0.25, -0.2);
  addMono(f, whoosh(10, 0.6, {f0: 500, f1: 2400, q: 0.7, shape: 'sine'}), T.gap - 0.15, 0.22, 0.2);
  // 压 lands (the ticks integrate): a deep thump
  hit(A.press_land, 64, 36, 1.4, 0.45, 0.5, 13);          // hits on spoken words stay under the limiter
  // 吸: a hiss; 压: the slam
  { const d = 0.45, n = S(d), x = filt(white(14, n), 'bp', 5200, 1.1); for (let i = 0; i < n; i++) { const u = i / n; x[i] *= Math.sin(Math.PI * u) ** 1.2; } addMono(f, x, A.xi_on - 0.05, 0.35, -0.2); mark('xi hiss', A.xi_on); }
  addMono(f, click(15, {f: 1800, ping: 900, dur: 0.05, decay: 0.01}), L('L04').phrases[1].start_s, 0.3, 0);   // the strike-through
  hit(A.ya_on, 58, 30, 1.8, 0.7, 0.6, 16); burst(A.ya_on, 0.18, 17, 900, 0.1);
  // tyres: contact and grip
  hit(A.contact_on, 85, 50, 0.6, 0.18, 0.3, 18);
  addMono(f, whoosh(19, 0.7, {f0: 180, f1: 600, q: 1.2, shape: 'sine'}), A.traction_on - 0.1, 0.3, 0.1);
  // strobe plate: one shutter per exposure, rising in pitch
  ghostRampT.forEach((t, k) => shutter(t, k, 0.42)); mark('strobe shutters', ghostRampT[0]);
  // the lip: the first jet (dry, short), the press gone (granular scatter), then near-silence
  { const n = S(0.5), x = filt(white(21, n), 'hp', 2200, 0.7); for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.004) * Math.exp(-t / 0.16); } addMono(f, x, T.firstJet, 0.35, -0.3); mark('first jet', T.firstJet); }
  rain(f, 22, T.offLip, T.offLip + 0.5, (t) => 260 * (1 - clamp((t - T.offLip) / 0.5)), {f: 2600, gain: 0.5});
  mark('scatter', T.offLip);
  // the vessels and the relay
  addMono(f, whoosh(23, 0.9, {f0: 700, f1: 5200, q: 0.8, shape: 'swell'}), A.relay - 0.55, 0.32, 0.1);
  // jets: a hard attack on the cut, the heavy whumph into the cloud
  burst(T.jets, 0.45, 24, 5200, 0.12);
  hit(T.cloud, 52, 30, 2.2, 0.8, 0.5, 25); burst(T.cloud, 0.22, 26, 700, 0.35);
  // kickflip: cut in, the torque freeze flash, the impact after the flip
  hit(T.k1, 95, 44, 1.1, 0.4, 0.7, 27); burst(T.k1, 0.45, 28, 3600);
  addMono(f, click(29, {f: 4200, ping: 2200, dur: 0.06, decay: 0.009}), T.k2, 0.6, 0);
  hit(T.k3, 100, 40, 1.3, 0.5, 0.6, 30); burst(T.k3, 0.4, 31, 3000);
  // ending: shutters for the fly-out exposures; the last sound is a valve exhale
  ghostAirT.forEach((t, k) => shutter(t, k + 2, 0.32));
  {
    const t0 = Math.max(lastVoiceEnd + 0.2, A.fade_out - 0.9), d = 1.6, n = S(d);
    const x = filt(filt(pink(32, n), 'bp', (i) => 1600 * Math.pow(0.5, i / n), 0.9), 'hp', 280);
    for (let i = 0; i < n; i++) { const t = i / SR; x[i] *= Math.min(1, t / 0.12) ** 1.5 * Math.exp(-Math.max(0, t - 0.12) / 0.5); }
    addMono(f, x, t0, 0.8, 0.05); mark('valve exhale', t0);
  }
  for (let i = 0; i < N; i++) { const t = i / SR; if (inSep(t)) { f[0][i] = 0; f[1][i] = 0; } }
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
const voiceComp = compressVoice(voice, {thresholdDb: -25, ratio: 3.0, kneeDb: 8});
// the TTS keeps a ~16 dB peak-to-loudness ratio after compression: limit the voice bus on its own first, so its
// consonant peaks no longer pump the whole mix through the master limiter
const voiceLimit = limit(voice, VOICE_CEILING_DB);
const music = score();
const amb = ambience();
const fx = sfx();
for (const c of [0, 1]) { filt(fx[c], 'hp', 45, 0.7); filt(fx[c], 'hp', 45, 0.7); }   // sub energy phones cannot play
const GAIN_DB = {music: -12.5, amb: -14.5, sfx: -8.0, voice: 0};
const DUCK_DB = {music: -11, amb: -14, sfx: -8};
const G = Object.fromEntries(Object.entries(GAIN_DB).map(([k, v]) => [k, db(v)]));
const DUCK = Object.fromEntries(Object.entries(DUCK_DB).map(([k, v]) => [k, db(v)]));
const mix = stereo();
for (let i = 0; i < N; i++) {
  const sm = musicDuckEnv[i], sf = fxDuckEnv[i];
  const dm = 1 - sm * (1 - DUCK.music), dg = 1 - sf * (1 - DUCK.amb), df = 1 - sf * (1 - DUCK.sfx);
  for (let c = 0; c < 2; c++) mix[c][i] = music[c][i] * G.music * dm + amb[c][i] * G.amb * dg + fx[c][i] * G.sfx * df + voice[c][i] * G.voice;
}
// phones reproduce nothing below ~80 Hz; remove inaudible sub-30 Hz energy that only costs headroom
for (const c of [0, 1]) { filt(mix[c], 'hp', 32, 0.6); filt(mix[c], 'hp', 32, 0.6); }
writeWav(join(OUT, 'music.wav'), music); writeWav(join(OUT, 'amb.wav'), amb); writeWav(join(OUT, 'sfx.wav'), fx);
writeWav(join(OUT, 'voice.wav'), voice); writeWav(join(OUT, 'mix.wav'), mix);
const bed = stereo();
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) bed[c][i] = mix[c][i] - voice[c][i] * G.voice;
const rmsDb = (bus, pred) => { let a = 0, n = 0; for (let i = 0; i < N; i += 4) if (pred(i)) { a += 0.5 * (bus[0][i] ** 2 + bus[1][i] ** 2); n++; } return n ? +(10 * Math.log10(a / n + 1e-12)).toFixed(1) : null; };
const voiceWhileSpeaking = rmsDb(voice, (i) => speech[i] > 0.6), bedWhileSpeaking = rmsDb(bed, (i) => speech[i] > 0.6), bedInPauses = rmsDb(bed, (i) => speech[i] < 0.1);
const before = measure(join(OUT, 'mix.wav'));
// the report records the gain and ceiling of the master.wav actually written (the loop may stop on its pass limit)
let gainDb = TARGET_LUFS - before.I, ceiling = -2.0, after, limited = 0, applied = null, converged = false;
for (let pass = 0; pass < 10; pass++) {
  const m = [Float32Array.from(mix[0]), Float32Array.from(mix[1])];
  const g = db(gainDb);
  for (let i = 0; i < N; i++) { m[0][i] *= g; m[1][i] *= g; }
  limited = limit(m, ceiling);
  writeWav(join(OUT, 'master.wav'), m, 24);
  after = measure(join(OUT, 'master.wav'));
  applied = {gain_db: +gainDb.toFixed(2), ceiling_dbfs: +ceiling.toFixed(2), pass};
  console.log(`pass ${pass}: gain ${gainDb.toFixed(2)} dB, ceiling ${ceiling.toFixed(2)} dBFS → I ${after.I} LUFS, TP ${after.TP} dBTP, limiter ${JSON.stringify(limited)}`);
  if (after.TP > TP_MAX) { ceiling -= (after.TP - TP_MAX) + 0.15; continue; }
  if (Math.abs(after.I - TARGET_LUFS) > 0.1) { gainDb += TARGET_LUFS - after.I; continue; }
  converged = true;
  break;
}
if (!converged && (after.TP > -1.5 || Math.abs(after.I - TARGET_LUFS) > 0.3)) throw new Error('master did not meet −14 ±0.3 LUFS / ≤ −1.5 dBTP: ' + JSON.stringify(after));
const report = {
  film: 'v3 比墙还陡', sample_rate: SR, duration_s: DUR, cues_sha256: timing.cues_sha256, stems: ['music.wav', 'amb.wav', 'sfx.wav', 'voice.wav'],
  mix_gains_db: GAIN_DB, ducking_db_under_speech: DUCK_DB, narration: timing.lines.map((l) => ({id: l.id, file: l.file, start_s: l.start_s, end_s: l.end_s})),
  silence_windows_s: SEPS, voice_makeup_db: 6, voice_compressor: voiceComp, voice_limiter: {ceiling_dbfs: VOICE_CEILING_DB, ...voiceLimit},
  mix_before_master: before,
  levels_pre_master: {voice_rms_db_while_speaking: voiceWhileSpeaking, bed_rms_db_while_speaking: bedWhileSpeaking, bed_rms_db_in_pauses: bedInPauses,
    speech_to_bed_gap_db: +(voiceWhileSpeaking - bedWhileSpeaking).toFixed(1)},
  master: {file: 'master.wav (48 kHz stereo 24-bit PCM, TPDF dither)', gain_db: applied.gain_db, limiter_ceiling_dbfs: applied.ceiling_dbfs,
    passes: applied.pass + 1, converged, limiter: limited, ...after,
    targets: {integrated_lufs: TARGET_LUFS, true_peak_max_dbtp: TP_MAX}},
  events: used, seconds: +((Date.now() - t0) / 1000).toFixed(1),
  note: 'Technical measurements only. No subjective listening by the author; the human sound review is a separate gate.',
};
writeFileSync(join(OUT, 'sound.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.master));
