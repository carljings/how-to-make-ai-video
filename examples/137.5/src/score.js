// score.js: the soundtrack of "137.5°", synthesized offline with Web Audio from the same timeline as the picture.
// The seeds are audible: every seed, scale and bud plays a note chosen by its angle, so a simple-fraction angle
// is heard as a short loop and the golden angle as a melody that never repeats.
import { DUR, BEAT, CUE, GOLDEN, TRIALS } from './timeline.js';
import { rng } from './lib.js';
import { SEED_EVENTS, COUNT_EVENTS } from './scenes/head.js';
import { MATH_EVENTS } from './scenes/math.js';
import { PLANT_EVENTS } from './scenes/plants.js';
import { BUD_EVENTS } from './scenes/emerge.js';

const SR = 48000;
const midi = n => 440 * 2 ** ((n - 69) / 12);
const N = { C2: 36, G2: 43, A2: 45, F2: 41, C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, G5: 79, A5: 81, C6: 84 };
// two octaves of C major pentatonic: an angle chooses one of these ten notes
const SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
const noteOf = deg => SCALE[Math.min(9, Math.floor(((deg % 360) + 360) % 360 / 36))];

let ctx, master, music, sfx, revIn, noiseBuf, R;

function makeIR(seconds, decay) {
  const len = Math.floor(SR * seconds), buf = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR, k = Math.min(0.95, 0.15 + t * 0.35);
      lp = lp * k + (R() * 2 - 1) * (1 - k);
      d[i] = (t < 0.02 ? 0 : lp) * Math.exp((-6.9 * t) / decay);
    }
  }
  return buf;
}
function makeNoise() {
  const len = SR * 4, buf = ctx.createBuffer(2, len, SR);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = R() * 2 - 1; }
  return buf;
}
function out(bus, pan = 0, send = 0.3) {
  const g = ctx.createGain(), p = ctx.createStereoPanner();
  g.gain.value = 0; // silent until its envelope starts, so no stray first sample
  p.pan.value = Math.max(-1, Math.min(1, pan));
  g.connect(p); p.connect(bus);
  if (send > 0) { const s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(revIn); }
  return g;
}
function adsr(param, t0, t1, a, peak, r, sus = peak) {
  param.setValueAtTime(0, t0);
  param.linearRampToValueAtTime(peak, t0 + a);
  param.linearRampToValueAtTime(sus, Math.max(t0 + a + 0.01, t1));
  param.linearRampToValueAtTime(0, t1 + r);
}
function perc(param, t0, peak, decay, attack = 0.003) {
  param.setValueAtTime(0, t0);
  param.linearRampToValueAtTime(peak, t0 + attack);
  param.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

// Instruments
function pad(t0, t1, notes, { gain = 0.03, cutoff = 1400, attack = 2, release = 3, pan = 0.35, detune = 7, bus = music, send = 0.5, wave = 'sawtooth' } = {}) {
  notes.forEach((n, i) => {
    const f = midi(n), o = out(bus, (i % 2 ? 1 : -1) * pan * ((i + 1) / notes.length), send);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(cutoff * 0.5, t0); lp.frequency.linearRampToValueAtTime(cutoff, t0 + attack * 1.5);
    lp.connect(o);
    for (const d of [-detune, detune]) { const os = ctx.createOscillator(); os.type = wave; os.frequency.value = f; os.detune.value = d + (R() - 0.5) * 3; os.connect(lp); os.start(t0); os.stop(t1 + release + 0.1); }
    adsr(o.gain, t0, t1, attack, gain, release);
  });
}
function bell(t, n, { gain = 0.08, decay = 2.6, ratio = 3.5, index = 2.2, pan = 0, bus = music, send = 0.55, f = null } = {}) {
  const fr = f || midi(n), o = out(bus, pan, send);
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
  mg.gain.value = 0;
  car.frequency.value = fr; mod.frequency.value = fr * ratio;
  perc(mg.gain, t, fr * index, decay * 0.5);
  mod.connect(mg); mg.connect(car.frequency); car.connect(o);
  const p2 = ctx.createOscillator(), g2 = ctx.createGain(); g2.gain.value = 0; p2.frequency.value = fr * 2.005; p2.connect(g2); g2.connect(o); perc(g2.gain, t, 0.25, decay * 0.4);
  perc(o.gain, t, gain, decay);
  for (const x of [car, mod, p2]) { x.start(t); x.stop(t + decay + 0.2); }
}
function pluck(t, n, { gain = 0.06, decay = 1.2, pan = 0, bright = 3200, bus = music, send = 0.35, f = null } = {}) {
  const fr = f || midi(n), o = out(bus, pan, send);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
  lp.frequency.setValueAtTime(bright, t); lp.frequency.exponentialRampToValueAtTime(Math.max(200, fr * 1.2), t + decay * 0.5);
  lp.connect(o);
  for (const [type, g] of [['triangle', 1], ['sawtooth', 0.35]]) { const os = ctx.createOscillator(), gg = ctx.createGain(); os.type = type; os.frequency.value = fr; gg.gain.value = g; os.connect(gg); gg.connect(lp); os.start(t); os.stop(t + decay + 0.1); }
  perc(o.gain, t, gain, decay);
}
function noise(t, dur, { type = 'bandpass', f0 = 1000, f1 = null, q = 1, gain = 0.1, attack = 0.01, release = null, pan = 0, bus = sfx, send = 0.3, shape = 'perc' } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f0, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const o = out(bus, pan, send);
  src.connect(fl); fl.connect(o);
  if (shape === 'perc') perc(o.gain, t, gain, dur, attack);
  else adsr(o.gain, t, t + dur - (release ?? dur * 0.4), attack, gain, release ?? dur * 0.4);
  src.start(t, R() * 3); src.stop(t + dur + (release ?? 0) + 0.2);
}
function kick(t, { gain = 0.3, f0 = 110, f1 = 42, decay = 0.4, bus = music, send = 0.05 } = {}) {
  const os = ctx.createOscillator(), o = out(bus, 0, send);
  os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + 0.12);
  os.connect(o); perc(o.gain, t, gain, decay); os.start(t); os.stop(t + decay + 0.1);
}
function drone(t0, t1, n, { gain = 0.05, attack = 2, release = 3, bus = music, send = 0.4, wave = 'sine' } = {}) {
  const os = ctx.createOscillator(), o = out(bus, 0, send); os.type = wave; os.frequency.value = midi(n);
  os.connect(o); adsr(o.gain, t0, t1, attack, gain, release); os.start(t0); os.stop(t1 + release + 0.1);
}
function glassPing(t, f, { gain = 0.05, decay = 0.25, pan = 0, send = 0.4 } = {}) {
  const os = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), o = out(sfx, pan, send);
  os.frequency.value = f; mod.frequency.value = f * 2.76; perc(mg.gain, t, f * 1.2, decay * 0.6);
  mod.connect(mg); mg.connect(os.frequency); os.connect(o); perc(o.gain, t, gain, decay);
  os.start(t); mod.start(t); os.stop(t + decay + 0.1); mod.stop(t + decay + 0.1);
}

const CH = {
  Cadd9: [48, 55, 64, 74], Am9: [45, 52, 60, 67, 71], Fmaj7: [41, 48, 57, 64], C: [48, 55, 64, 72],
  G6: [43, 50, 59, 64], Fmaj7s11: [41, 48, 57, 64, 71], Cmaj9: [48, 55, 64, 71, 74], Am: [45, 52, 60, 64],
};
const panOf = deg => Math.cos((deg * Math.PI) / 180) * 0.6;
const goldenTheme = (t0, step, shift, gain) => { for (let k = 0; k < 8; k++) bell(t0 + k * step, noteOf(k * GOLDEN) + shift, { gain, decay: 3.4, ratio: 2.76, index: 1.1, pan: panOf(k * GOLDEN) }); };

export async function renderScore() {
  R = rng(1375);
  ctx = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
  noiseBuf = makeNoise();
  // the mix is rendered dry; loudness and peak limiting happen in ffmpeg when the film is encoded
  master = ctx.createGain(); master.gain.value = 1.0; master.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = makeIR(5.0, 4.2);
  revIn = ctx.createGain(); revIn.gain.value = 0.75; revIn.connect(verb); verb.connect(master);
  music = ctx.createGain(); music.gain.value = 1.0; music.connect(master);
  sfx = ctx.createGain(); sfx.gain.value = 1.0; sfx.connect(master);

  // ── Act I: one seed, then the rule, then the flood
  pad(0.6, 20.6, CH.Cadd9, { gain: 0.015, cutoff: 1400, attack: 4, release: 3, detune: 6 });
  drone(0.8, 20.5, N.C2, { gain: 0.04, attack: 3, release: 3 });
  let lastT = -1;
  for (const e of SEED_EVENTS) {
    if (e.t > CUE.fast[1] + 0.3) break;
    if (e.k < 9) { bell(e.t, noteOf(e.deg), { gain: 0.09, decay: 3.2, ratio: 2.76, index: 1.2, pan: panOf(e.deg) }); continue; }
    if (e.t - lastT < 1 / 22) continue;
    lastT = e.t;
    const d = Math.min(1, (e.t - CUE.fast[0]) / (CUE.fast[1] - CUE.fast[0]));
    pluck(e.t, noteOf(e.deg) + (d > 0.55 ? 12 : 0), { gain: 0.05 * (1 - 0.55 * d), decay: 0.9, pan: panOf(e.deg), bright: 3600 });
  }
  noise(CUE.fast[0] + 2, CUE.fast[1] - CUE.fast[0] - 1.6, { type: 'bandpass', f0: 600, f1: 6000, q: 0.7, gain: 0.03, shape: 'swell', attack: 5.5, release: 0.8, send: 0.6 });
  pad(16.5, 21.2, [60, 64, 67, 74], { gain: 0.02, cutoff: 2600, attack: 1.2, release: 2 });
  bell(16.6, N.C5, { gain: 0.06, decay: 4 });

  // ── Act II: hidden numbers
  pad(21.0, 25.2, CH.Am9, { gain: 0.017, cutoff: 1500, attack: 1.5, release: 1.4 });
  pad(25.0, 29.2, CH.Fmaj7, { gain: 0.017, cutoff: 1500, attack: 1.2, release: 1.4 });
  for (const c of COUNT_EVENTS) {
    const note = SCALE[Math.min(9, Math.floor((c.i / c.fam) * 10))] + 12;
    if (c.fam === 34) pluck(c.t, note, { gain: 0.032, decay: 0.45, pan: (c.i / 34 - 0.5) * 1.2, bright: 4200 });
    else bell(c.t, note, { gain: 0.022, decay: 0.7, ratio: 2.0, index: 0.6, pan: (0.5 - c.i / 55) * 1.2 });
  }
  [[29.0, CH.C], [33.0, CH.G6], [37.0, CH.Am9]].forEach(([t0, ch]) => pad(t0, t0 + 4.2, ch, { gain: 0.017, cutoff: 1700, attack: 1.0, release: 1.2 }));
  const bandT = i => CUE.bands[0] + i * ((CUE.bands[1] - CUE.bands[0]) / 6);
  for (let i = 0; i < 6; i++) { bell(bandT(i) + 0.05, SCALE[(i * 2) % 10] + 12, { gain: 0.05, decay: 2.4, pan: (i - 2.5) * 0.2 }); }
  for (let t = CUE.bands[0]; t < CUE.bands[1] - 0.1; t += 1.0) kick(t, { gain: 0.06, f0: 90, f1: 42, decay: 0.35 });
  // ratios: a steady A, and each ratio as a tone whose distance from A shrinks as the ratio nears φ
  const PHI = (1 + Math.sqrt(5)) / 2;
  drone(CUE.ratios[0] + 0.2, CUE.ratios[1] + 0.2, N.A4, { gain: 0.012, attack: 0.8, release: 1 });
  for (const m of MATH_EVENTS) {
    if (m.kind === 'ratio') { const RAT = [2, 1.5, 5 / 3, 1.6, 13 / 8, 21 / 13, 34 / 21, 55 / 34, 89 / 55][m.i]; pluck(m.t, 0, { f: 440 * Math.pow(RAT / PHI, 4), gain: 0.05, decay: 1.1, bright: 3000 }); }
    else if (m.kind === 'sweep') noise(m.t, 1.5, { type: 'bandpass', f0: 400, f1: 4000, q: 1.2, gain: 0.04, shape: 'swell', attack: 1.2, release: 0.3, send: 0.5 });
    else if (m.kind === 'golden') { bell(m.t, N.A5, { gain: 0.06, decay: 3.5 }); bell(m.t + 0.12, N.E5, { gain: 0.04, decay: 3.5 }); }
    else if (m.kind === 'level') { const seq = [81, 76, 72, 69, 64, 60, 57, 52]; bell(m.t, seq[m.i], { gain: 0.05 * (1 - m.i * 0.08), decay: 3.2, ratio: 2.76, index: 1, pan: (m.i - 3.5) * 0.15 }); }
  }
  pad(CUE.split[0], CUE.split[1] + 0.3, CH.Fmaj7, { gain: 0.018, cutoff: 1900, attack: 1.6, release: 1.2 });

  // ── Act III: other angles loop audibly; the golden angle wanders
  noise(CUE.trials[0] + 0.1, 1.0, { type: 'bandpass', f0: 4000, f1: 500, q: 1, gain: 0.03, shape: 'swell', attack: 0.6, release: 0.3 });
  drone(CUE.trials[0], CUE.trials[1], N.C2, { gain: 0.035, attack: 1.5, release: 1.2 });
  TRIALS.forEach(([s0, ang], i) => {
    const next = i + 1 < TRIALS.length ? TRIALS[i + 1][0] : CUE.trials[1];
    noise(s0, 0.025, { type: 'highpass', f0: 3000, gain: 0.05, send: 0.15 });
    noise(s0 + 0.02, 0.9, { type: 'bandpass', f0: 500, f1: 3000, q: 0.8, gain: 0.025, shape: 'swell', attack: 0.7, release: 0.2, send: 0.3 });
    for (let k = 0, t = s0 + 0.3; t < next - 0.3; k++, t += 1 / 8) pluck(t, noteOf(k * ang) + 12, { gain: 0.045, decay: 0.55, pan: panOf(k * ang), bright: 4000 });
    if (i === TRIALS.length - 1) pad(s0 + 0.1, CUE.trials[1] + 0.2, CH.Cadd9, { gain: 0.022, cutoff: 2200, attack: 0.8, release: 0.6 });
  });
  pad(CUE.fraction[0] + 0.2, CUE.fraction[1], CH.Fmaj7s11, { gain: 0.015, cutoff: 1300, attack: 3, release: 1.5 });
  // the bloom: the golden melody's first statement
  pad(CUE.bloom[0], CUE.bloom[1] + 0.6, CH.Cmaj9, { gain: 0.026, cutoff: 2600, attack: 2.5, release: 1.4 });
  noise(CUE.bloom[0] + 0.5, 5, { type: 'highpass', f0: 6500, gain: 0.012, shape: 'swell', attack: 2.5, release: 2, send: 0.7 });
  goldenTheme(CUE.bloom[0] + 0.9, 0.5, 12, 0.05);

  // ── Act IV: a light groove; every scale, fruitlet and leaf sounds its angle
  for (let t = CUE.pinecone[0]; t < CUE.rosette[1] - 0.2; t += 1.0) kick(t, { gain: 0.065, f0: 95, f1: 42, decay: 0.32 });
  for (let t = CUE.pinecone[0]; t < CUE.rosette[1] - 0.2; t += 0.25) noise(t, 0.05, { type: 'highpass', f0: 7000, gain: 0.008 + (Math.round(t * 4) % 2 ? 0 : 0.005), send: 0.05 });
  [[84, CH.C], [88, CH.Am9], [92, CH.Fmaj7], [96, CH.G6], [100, CH.C], [104, CH.Fmaj7]].forEach(([t0, ch]) => pad(t0, t0 + 4.2, ch, { gain: 0.017, cutoff: 1800, attack: 0.8, release: 1.0 }));
  let lp = -1;
  for (const e of PLANT_EVENTS) {
    if (e.t - lp < 1 / 16) continue; lp = e.t;
    if (e.kind === 'cone') pluck(e.t, noteOf(e.deg), { gain: 0.045, decay: 0.4, pan: panOf(e.deg), bright: 2200 });
    else if (e.kind === 'apple') pluck(e.t, noteOf(e.deg) + 12, { gain: 0.035, decay: 0.3, pan: panOf(e.deg), bright: 4500 });
    else bell(e.t, noteOf(e.deg) + 12, { gain: 0.03, decay: 1.4, ratio: 2.76, index: 0.9, pan: panOf(e.deg) });
  }

  // ── Act V: the buds start out alternating, and the melody finds its way to the golden one
  drone(CUE.emerge[0], CUE.emerge[0] + 3.5, N.A2, { gain: 0.03, attack: 0.5, release: 2 });
  [[108.6, CH.Am], [114.0, CH.Fmaj7], [120.0, CH.C], [126.0, CH.G6]].forEach(([t0, ch], i) => pad(t0, t0 + 6.2, ch, { gain: 0.012 + i * 0.004, cutoff: 1200 + i * 450, attack: 1.6, release: 1.4 }));
  for (const e of BUD_EVENTS) pluck(e.t, noteOf(e.deg) + 12, { gain: 0.045, decay: 1.0, pan: panOf(e.deg), bright: 3400 });
  bell(121.2, N.C6, { gain: 0.05, decay: 4 });

  // ── Finale: the whole field, and the golden melody once more
  [[130.8, CH.C], [134.8, CH.Am9], [138.4, CH.Fmaj7], [142.4, CH.G6], [145.2, CH.Cmaj9]].forEach(([t0, ch], i) => pad(t0, i === 4 ? 148.6 : t0 + 4.2, ch, { gain: 0.024, cutoff: 2000, attack: 1.2, release: i === 4 ? 3 : 1.2 }));
  drone(130.8, 148.6, N.C2, { gain: 0.05, attack: 2, release: 3 });
  goldenTheme(CUE.title[0] + 0.2, 0.5, 12, 0.055);
  goldenTheme(CUE.title[0] + 4.6, 0.5, 0, 0.04);
  bell(147.4, N.C6, { gain: 0.05, decay: 5, ratio: 3.5, index: 1.4 });

  return ctx.startRendering();
}

// 16-bit PCM WAV
export function toWav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
