// score.js: the soundtrack, synthesized offline with Web Audio from the same timeline as the picture.
// No samples: pads are detuned sawtooth waves, bells are FM synthesis, the reverb is generated noise.
import { DUR, CUE, seedCount } from './timeline.js';
import { rng } from './lib.js';

const SR = 48000;
const midi = n => 440 * 2 ** ((n - 69) / 12);
const CH = {
  Am9: [45, 57, 60, 64, 71], // A2 A3 C4 E4 B4
  Fmaj7: [41, 57, 60, 64, 69],
  G6: [43, 55, 59, 62, 64],
  Cmaj9: [36, 55, 59, 62, 64, 67],
};
const PENTA = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96, 98]; // A minor pentatonic, rising

let ctx, music, revIn, R;

// Each voice gets its own gain (starting at 0, so nothing clicks), a pan and a reverb send
function voice(pan = 0, send = 0.4) {
  const g = ctx.createGain(), p = ctx.createStereoPanner(), s = ctx.createGain();
  g.gain.value = 0;
  p.pan.value = pan;
  s.gain.value = send;
  g.connect(p); p.connect(music); p.connect(s); s.connect(revIn);
  return g;
}

function pad(t0, t1, notes, { gain = 0.03, cutoff = 1600, attack = 1.5, release = 2 } = {}) {
  notes.forEach((n, i) => {
    const g = voice((i % 2 ? 1 : -1) * 0.4 * (i / notes.length), 0.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(cutoff * 0.5, t0);
    lp.frequency.linearRampToValueAtTime(cutoff, t0 + attack);
    lp.connect(g);
    for (const d of [-8, 8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(n);
      o.detune.value = d + (R() - 0.5) * 4;
      o.connect(lp);
      o.start(t0); o.stop(t1 + release + 0.1);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.setValueAtTime(gain, t1);
    g.gain.linearRampToValueAtTime(0, t1 + release);
  });
}

function bell(t, n, { gain = 0.06, decay = 2.4, pan = 0 } = {}) {
  const f = midi(n), g = voice(pan, 0.55);
  const car = ctx.createOscillator(), mod = ctx.createOscillator(), depth = ctx.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * 3.5;
  depth.gain.setValueAtTime(f * 2, t);
  depth.gain.exponentialRampToValueAtTime(1, t + decay * 0.5);
  mod.connect(depth); depth.connect(car.frequency); car.connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  for (const o of [car, mod]) { o.start(t); o.stop(t + decay + 0.1); }
}

function riser(t0, t1, gain = 0.05) {
  const len = Math.ceil((t1 - t0 + 0.2) * SR), buf = ctx.createBuffer(1, len, SR), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = R() * 2 - 1;
  const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = voice(0, 0.6);
  src.buffer = buf;
  bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t0);
  bp.frequency.exponentialRampToValueAtTime(6000, t1);
  src.connect(bp); bp.connect(g);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t1 - 0.05);
  g.gain.linearRampToValueAtTime(0, t1 + 0.05);
  src.start(t0); src.stop(t1 + 0.2);
}

function boom(t, gain = 0.5) {
  const o = ctx.createOscillator(), g = voice(0, 0.25);
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.8);
  o.connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  o.start(t); o.stop(t + 2.3);
}

export async function renderScore() {
  ctx = new OfflineAudioContext(2, Math.ceil(DUR * SR), SR);
  R = rng(137);

  // Busses: music → master, plus a generated-noise reverb
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  music = ctx.createGain();
  music.connect(master);
  const rev = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 3, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp(-i / SR * 2.3); }
  rev.buffer = ir;
  revIn = ctx.createGain();
  revIn.gain.value = 0.35;
  revIn.connect(rev); rev.connect(master);

  // Harmony follows the scenes
  pad(0.3, CUE.grow[0], CH.Am9, { gain: 0.022, cutoff: 1100, attack: 2.5 });
  pad(CUE.grow[0], 7.0, CH.Fmaj7, { gain: 0.024, cutoff: 1500, attack: 1.2, release: 1.2 });
  pad(7.0, CUE.title - 0.1, CH.G6, { gain: 0.026, cutoff: 2000, attack: 1.0, release: 0.4 });
  pad(CUE.title, DUR - 2.4, CH.Cmaj9, { gain: 0.03, cutoff: 2600, attack: 0.05, release: 2.2 });

  // The first point of light
  bell(CUE.spark, 81, { gain: 0.07, decay: 3.2 });

  // A bell each time the seed count passes a Fibonacci number, climbing the scale
  const FIB = [2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
  FIB.forEach((F, k) => {
    let t = CUE.grow[0];
    while (t < CUE.grow[1] && seedCount(t) < F) t += 0.001;
    bell(t, PENTA[k], { gain: 0.045, decay: 1.8, pan: k % 2 ? 0.35 : -0.35 });
  });

  // Into the title: a noise riser, a low boom and one high bell
  riser(CUE.gather[0], CUE.title);
  boom(CUE.title);
  bell(CUE.title + 0.02, 84, { gain: 0.06, decay: 4 });

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
