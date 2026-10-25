// score.ts: the music bed under the Seedance soundtrack (which already carries the narration and the sound effects).
// Synthesized offline with Web Audio: 120 BPM in F major (F–C–Dm–Bb), marimba, pizzicato, a round bass, a soft pad and
// light drums, with no lead melody so nothing competes with the voice. scripts/score.mjs ducks it under the voice.
import {DUR, CLIP_LIST} from '../timeline';
import {rng} from '../lib/math';

const SR = 48000, BEAT = 0.5, BAR = 2;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]; // F, C, Dm, Bb
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR + 1e-6) % 4];
const [C1, C2, C3, C4] = CLIP_LIST.map((c) => c.a);
const PRICES_UP = C3 + 9.0, CROWD = C4 + 7.3, END = C4 + 11.2;

interface Section { a: number; b: number; kick: 'four' | 'half' | null; hats: 0 | 8 | 16; mar: 0 | 8 | 16; pad: number; snap?: boolean; pizz?: boolean }
const SECTIONS: Section[] = [
  {a: 0, b: C2, kick: 'half', hats: 8, mar: 8, pad: 0.05, pizz: true},
  {a: C2, b: C3, kick: 'four', hats: 8, mar: 8, pad: 0.04, snap: true, pizz: true},
  {a: C3, b: PRICES_UP, kick: 'four', hats: 8, mar: 8, pad: 0.04, pizz: true},
  {a: PRICES_UP, b: C4, kick: 'four', hats: 16, mar: 16, pad: 0.05, snap: true},
  {a: C4, b: CROWD, kick: 'half', hats: 0, mar: 8, pad: 0.08},
  {a: CROWD, b: END, kick: 'four', hats: 16, mar: 16, pad: 0.09, snap: true},
  {a: END, b: DUR, kick: 'half', hats: 8, mar: 8, pad: 0.07, pizz: true},
];
const sectionAt = (t: number) => SECTIONS.find((s) => t >= s.a - 1e-6 && t < s.b - 1e-6) ?? SECTIONS[SECTIONS.length - 1];

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(DUR * SR), SR), R = rng(2026);
  // Every gain node starts at 0 and only then gets its level, so nothing clicks on
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = 0; if (v) g.gain.setValueAtTime(v, 0); return g; };
  const env = (p: AudioParam, t: number, peak: number, atk: number, dec: number, hold = 0) => {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + atk); p.setValueAtTime(peak, t + atk + hold);
    p.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec); p.setValueAtTime(0, t + atk + hold + dec + 0.01);
  };
  const master = gain(0.85), clip = ctx.createWaveShaper(), half = gain(0.5);
  clip.curve = Float32Array.from({length: 4097}, (_, i) => Math.tanh(((i - 2048) / 2048) * 2)); clip.oversample = '4x';
  master.connect(half); half.connect(clip); clip.connect(ctx.destination);
  master.gain.setValueAtTime(0.85, DUR - 1.2); master.gain.linearRampToValueAtTime(0, DUR - 0.02);
  const music = gain(1), lp = ctx.createBiquadFilter(), duck = gain(1), drums = gain(1);
  lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.value = 16000;
  music.connect(lp); lp.connect(duck); duck.connect(master); drums.connect(master);
  const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.2, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp((-i / SR) * 3.0); }
  verb.buffer = ir;
  const revIn = gain(1), revOut = gain(0.22); revIn.connect(verb); verb.connect(revOut); revOut.connect(master);
  const NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const noise = (t: number, dur: number, type: BiquadFilterType, f: number, q = 0.7) => {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(); s.buffer = NOISE; s.loop = true; flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    s.connect(flt); s.start(t, R() * 1.5); s.stop(Math.min(DUR, t + dur + 0.05)); return flt;
  };
  const osc = (type: OscillatorType, f: number, t: number, stop: number) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(Math.min(DUR, stop)); return o; };
  const pan = (v: number, to: AudioNode) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(to); return p; };
  const kicks: number[] = [];

  function kick(t: number, amp: number) {
    const o = osc('sine', 140, t, t + 0.35), g = gain(); o.frequency.exponentialRampToValueAtTime(48, t + 0.09); o.connect(g); g.connect(drums); env(g.gain, t, amp, 0.003, 0.26); kicks.push(t);
  }
  function snap(t: number, amp: number) { const n = noise(t, 0.06, 'bandpass', 2600, 2.2), g = gain(); n.connect(g); g.connect(drums); g.connect(revIn); env(g.gain, t, amp, 0.001, 0.05); }
  function hat(t: number, amp: number) { const n = noise(t, 0.05, 'highpass', 8500), g = gain(); n.connect(g); g.connect(pan(((t * 7.3) % 1) * 0.6 - 0.3, drums)); env(g.gain, t, amp, 0.001, 0.03); }
  function marimba(t: number, n: number, amp: number, p = 0) {
    const g = gain(), h = gain(); const o = osc('sine', midi(n), t, t + 0.6), o4 = osc('sine', midi(n) * 4, t, t + 0.08);
    o.connect(g); o4.connect(h); h.connect(g); g.connect(pan(p, music)); g.connect(revIn); env(g.gain, t, amp, 0.002, 0.42); env(h.gain, t, 0.3, 0.001, 0.05);
  }
  function pizz(t: number, n: number, amp: number, p = 0) {
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    osc('sawtooth', midi(n), t, t + 0.3).connect(f); f.connect(g); g.connect(pan(p, music)); g.connect(revIn); env(g.gain, t, amp, 0.003, 0.18);
  }
  function bass(t: number, n: number, len: number, amp: number) {
    const g = gain(), f = ctx.createBiquadFilter(), sub = gain(0.6), sq = gain(0.7); f.type = 'lowpass'; f.frequency.value = 650; f.connect(sq); sq.connect(g); sub.connect(g); g.connect(music);
    osc('sine', midi(n), t, t + len + 0.1).connect(sub); osc('square', midi(n), t, t + len + 0.1).connect(f); env(g.gain, t, amp, 0.01, len);
  }
  function pad(t: number, notes: number[], len: number, amp: number) {
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.value = 1700; f.connect(g); g.connect(music); g.connect(revIn);
    for (const n of notes) for (const d of [-6, 6]) { const o = osc('triangle', midi(n), t, t + len + 0.9); o.detune.value = d; o.connect(pan(d < 0 ? -0.4 : 0.4, f)); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.3); g.gain.setValueAtTime(amp, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.8);
  }
  function bell(t: number, n: number, amp: number, len = 1.6) {
    const c = osc('sine', midi(n), t, t + len + 0.1), m = osc('sine', midi(n) * 3.5, t, t + len + 0.1), mg = gain(), g = gain();
    m.connect(mg); mg.connect(c.frequency); mg.gain.setValueAtTime(midi(n) * 0.6, t); mg.gain.exponentialRampToValueAtTime(1, t + len * 0.35);
    c.connect(g); g.connect(music); g.connect(revIn); env(g.gain, t, amp, 0.003, len);
  }
  function swell(a: number, b: number, amp: number) {
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, a); f.frequency.exponentialRampToValueAtTime(3200, b); f.connect(g); g.connect(music); g.connect(revIn);
    for (const n of [65, 72, 77]) { const o = osc('triangle', midi(n - 12), a, b + 0.05); o.frequency.exponentialRampToValueAtTime(midi(n), b); o.connect(f); }
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(amp, b - 0.03); g.gain.linearRampToValueAtTime(0, b);
  }

  const S16 = BEAT / 4;
  for (let k = 0; k * S16 < DUR - 0.6; k++) {
    const t = k * S16, s = sectionAt(t), c = chordAt(t), beat = k % 4 === 0, eighth = k % 2 === 0, inBar = k % 16;
    if (beat && s.kick === 'four') kick(t, 0.4);
    if (s.kick === 'half' && (inBar === 0 || inBar === 8)) kick(t, 0.4);
    if (s.snap && (inBar === 4 || inBar === 12)) snap(t, 0.2);
    if (s.hats === 16) hat(t, eighth ? 0.025 : 0.04);
    if (s.hats === 8 && !eighth) hat(t, 0.04);
    if (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14) bass(t, c[0] - 24 + (inBar === 14 ? 7 : 0), S16 * 1.7, 0.24);
    if (s.mar && (s.mar === 16 || eighth)) {
      const order = [0, 2, 1, 2, 0, 2, 1, 2], step = s.mar === 16 ? k : (k / 2) | 0, n = c[order[step % 8]] + 12 + (inBar >= 8 ? 12 : 0);
      marimba(t, n, (s.mar === 16 ? 0.06 : 0.085) * (beat ? 1.1 : 0.85), step % 2 ? 0.3 : -0.3);
    }
    if (s.pizz && (inBar === 3 || inBar === 11)) pizz(t, c[1] + 12, 0.05, 0.4);
    if ((inBar === 0 || Math.abs(t - s.a) < S16 / 2) && s.pad > 0) pad(t, c, Math.min(BAR - (t % BAR), s.b - t), s.pad * 1.5);
  }
  // a few musical accents on the story's turns (Seedance carries the sound effects themselves)
  for (const [n, a] of [[77, 0.05], [81, 0.045], [84, 0.04]] as const) bell(C1 + 9.4, n, a, 2.2);   // the medal
  swell(PRICES_UP + 3.0, C4, 0.06);                                                                  // prices run away
  for (const [n, a] of [[72, 0.05], [77, 0.045], [81, 0.04]] as const) bell(C4 + 3.6, n, a, 1.8);    // the bank speaks
  swell(CROWD - 1.2, CROWD + 0.1, 0.07);                                                              // the city of lights
  for (const [n, a] of [[65, 0.06], [72, 0.05], [77, 0.045], [81, 0.04]] as const) bell(DUR - 3.0, n, a, 2.8);   // home
  // tension while prices rise: the filter closes a little then opens wide
  lp.frequency.setValueAtTime(16000, 0); lp.frequency.setValueAtTime(16000, PRICES_UP); lp.frequency.exponentialRampToValueAtTime(2200, PRICES_UP + 0.4);
  lp.frequency.exponentialRampToValueAtTime(16000, C4);
  kicks.sort((a, b) => a - b).forEach((t) => { duck.gain.setTargetAtTime(0.6, t, 0.004); duck.gain.setTargetAtTime(1, t + 0.03, 0.06); });
  return ctx.startRendering();
}

export function toWav(buffer: AudioBuffer) {
  const ch = buffer.numberOfChannels, len = buffer.length, data = new ArrayBuffer(44 + len * ch * 4), v = new DataView(data);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, data.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, ch, true);
  v.setUint32(24, buffer.sampleRate, true); v.setUint32(28, buffer.sampleRate * ch * 4, true); v.setUint16(32, ch * 4, true); v.setUint16(34, 32, true); str(36, 'data'); v.setUint32(40, len * ch * 4, true);
  const chans = Array.from({length: ch}, (_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { v.setFloat32(o, chans[c][i], true); o += 4; }
  return new Uint8Array(data);
}
