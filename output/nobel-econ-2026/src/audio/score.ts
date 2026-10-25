// score.ts: the soundtrack, synthesized offline with Web Audio from the cues in timeline.ts. No voice: the music tells
// the story with the pictures. 120 BPM in F major (F–C–Dm–Bb, one chord per bar). A whistled tune is the film's
// signature; marimba, pizzicato, a round bass and light drums underneath; every picture event has its own sound.
import {DUR, BEAT, BAR, SCENES, HOOK, SPLIT, NOBEL, SPREAD, SURPRISE, TYPES, SHOPS, BANK, THEN, GLOBE, CROWD, END, scene} from '../timeline';
import {rng} from '../lib/math';

const SR = 48000;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]; // F, C, Dm, Bb
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR + 1e-6) % 4];
const PENTA = [65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91]; // F major pentatonic, rising
const E8 = BEAT / 2;
// the tune, in eighth notes: [start, note, length]. A asks, B answers; each is four bars.
const TUNE_A: [number, number, number][] = [[0, 72, 1.6], [2, 69, 1.6], [4, 65, 1.6], [6, 69, 0.8], [7, 72, 1.8], [8, 76, 1.6], [10, 74, 1.6], [12, 72, 3.5],
  [16, 74, 1.6], [18, 77, 1.6], [20, 76, 1.6], [22, 74, 0.8], [23, 72, 1.8], [24, 74, 6]];
const TUNE_B: [number, number, number][] = [[0, 72, 1.6], [2, 69, 1.6], [4, 65, 1.6], [6, 67, 0.8], [7, 69, 1.8], [8, 67, 1.6], [10, 64, 1.6], [12, 72, 3.5],
  [16, 74, 1.6], [18, 72, 1.6], [20, 69, 1.6], [22, 70, 0.8], [23, 69, 1.8], [24, 65, 6]];

// How busy the music is in each scene
interface Section { kick: 'four' | 'half' | null; hats: 0 | 8 | 16; bass: boolean; mar: 0 | 4 | 8 | 16; pad: number; snap?: boolean; pizz?: boolean; wood?: boolean; marAmp?: number }
const SECTION: Record<string, Section> = {
  hook: {kick: 'four', hats: 8, bass: true, mar: 8, pad: 0, snap: true, pizz: true},
  split: {kick: null, hats: 0, bass: false, mar: 0, pad: 0.03, pizz: true},
  nobel: {kick: 'half', hats: 8, bass: true, mar: 8, pad: 0.06},
  spread: {kick: 'four', hats: 8, bass: true, mar: 8, pad: 0.03, snap: true, pizz: true},
  surprise: {kick: 'four', hats: 8, bass: true, mar: 8, pad: 0.03, wood: true},
  types: {kick: 'four', hats: 8, bass: true, mar: 8, pad: 0.03, snap: true, pizz: true},
  shops: {kick: 'four', hats: 16, bass: true, mar: 16, pad: 0.03, snap: true, marAmp: 0.06},
  bank: {kick: 'half', hats: 0, bass: true, mar: 4, pad: 0.08},
  then: {kick: 'half', hats: 8, bass: true, mar: 0, pad: 0.04},
  globe: {kick: 'half', hats: 8, bass: true, mar: 16, pad: 0.08, marAmp: 0.05},
  crowd: {kick: 'four', hats: 16, bass: true, mar: 8, pad: 0.08, snap: true},
  end: {kick: 'four', hats: 8, bass: true, mar: 8, pad: 0.03, snap: true, pizz: true},
};
const sectionAt = (t: number) => SECTION[(SCENES.find((s) => t >= s.a - 1e-6 && t < s.b - 1e-6) ?? SCENES[SCENES.length - 1]).id];

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(DUR * SR), SR), R = rng(2026);
  // Every gain node starts at 0 and only then gets its level, so nothing clicks on
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = 0; if (v) g.gain.setValueAtTime(v, 0); return g; };
  const env = (p: AudioParam, t: number, peak: number, atk: number, dec: number, hold = 0) => {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + atk); p.setValueAtTime(peak, t + atk + hold);
    p.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec); p.setValueAtTime(0, t + atk + hold + dec + 0.01);
  };
  // ---- buses ----
  // master: halved, then a tanh soft clip (unity at normal levels, rounds off only the loudest peaks)
  const master = gain(0.85), clip = ctx.createWaveShaper(), half = gain(0.5);
  clip.curve = Float32Array.from({length: 4097}, (_, i) => Math.tanh(((i - 2048) / 2048) * 2));
  clip.oversample = '4x';
  master.connect(half); half.connect(clip); clip.connect(ctx.destination);
  master.gain.setValueAtTime(0.85, DUR - 0.2); master.gain.linearRampToValueAtTime(0, DUR - 0.01);
  const fx = gain(1), drums = gain(1), drive = ctx.createWaveShaper();
  drive.curve = Float32Array.from({length: 2049}, (_, i) => Math.tanh(((i - 1024) / 1024) * 1.8) / 1.8); drive.oversample = '4x';
  // music: section gain → filter → kick duck → master
  const section = gain(1), lp = ctx.createBiquadFilter(), duck = gain(1);
  lp.type = 'lowpass'; lp.Q.value = 0.8; lp.frequency.value = 18000;
  section.connect(lp); lp.connect(duck); duck.connect(master);
  drums.connect(drive); drive.connect(master);
  fx.connect(master);
  const lead = gain(1); lead.connect(master);                 // the whistle stays out of the duck and the filter
  const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.4, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp((-i / SR) * 3.0); }
  verb.buffer = ir;
  const revIn = gain(1), revLP = ctx.createBiquadFilter(), revOut = gain(0.24);
  revLP.type = 'lowpass'; revLP.frequency.value = 6000;
  revIn.connect(verb); verb.connect(revLP); revLP.connect(revOut); revOut.connect(master);
  const dly = ctx.createDelay(1), fb = gain(0.28), dlp = ctx.createBiquadFilter(), dlyIn = gain(1), dlyOut = gain(0.16);
  dly.delayTime.value = BEAT * 0.75; dlp.type = 'lowpass'; dlp.frequency.value = 3800;
  dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dlyOut); dlyOut.connect(master);
  // ---- sources ----
  const NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const noise = (t: number, dur: number, type: BiquadFilterType, f: number, q = 0.7) => {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter();
    s.buffer = NOISE; s.loop = true; flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    s.connect(flt); s.start(t, R() * 1.5); s.stop(Math.min(DUR, t + dur + 0.05));
    return flt;
  };
  const osc = (type: OscillatorType, f: number, t: number, stop: number) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(Math.min(DUR, stop)); return o; };
  const pan = (v: number, to: AudioNode) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(to); return p; };
  const kicks: number[] = [];

  // ---- instruments ----
  function kick(t: number, amp: number) {
    const o = osc('sine', 150, t, t + 0.4), g = gain(); o.frequency.exponentialRampToValueAtTime(46, t + 0.09); o.connect(g); g.connect(drums);
    env(g.gain, t, amp, 0.002, 0.3);
    const c = noise(t, 0.012, 'highpass', 3000), cg = gain(); c.connect(cg); cg.connect(drums); env(cg.gain, t, amp * 0.18, 0.001, 0.01);
    kicks.push(t);
  }
  function snap(t: number, amp: number) { // a finger snap: a short bright click with a little room
    const n = noise(t, 0.06, 'bandpass', 2600, 2.2), g = gain(); n.connect(g); g.connect(drums); g.connect(revIn); env(g.gain, t, amp, 0.001, 0.05);
  }
  function hat(t: number, amp: number) { const n = noise(t, 0.05, 'highpass', 8000), g = gain(); n.connect(g); g.connect(pan(((t * 7.3) % 1) * 0.6 - 0.3, drums)); env(g.gain, t, amp, 0.001, 0.03); }
  function woodblock(t: number, amp: number, f = 900) { const o = osc('sine', f, t, t + 0.08), g = gain(); o.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.05); o.connect(g); g.connect(pan(0.35, drums)); env(g.gain, t, amp, 0.001, 0.05); }
  // marimba: a sine with a quick 4th-harmonic strike, short decay
  function marimba(t: number, n: number, amp: number, p = 0) {
    const g = gain(), h = gain(); const o = osc('sine', midi(n), t, t + 0.6), o4 = osc('sine', midi(n) * 4, t, t + 0.08);
    o.connect(g); o4.connect(h); h.connect(g); const pn = pan(p, section); g.connect(pn); g.connect(revIn);
    env(g.gain, t, amp, 0.002, 0.42); env(h.gain, t, 0.35, 0.001, 0.05);
  }
  function pizz(t: number, n: number, amp: number, p = 0) {
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    osc('sawtooth', midi(n), t, t + 0.3).connect(f); f.connect(g); g.connect(pan(p, section)); g.connect(revIn); env(g.gain, t, amp, 0.003, 0.18);
  }
  function glock(t: number, n: number, amp: number, p = 0) { // glockenspiel: bright sine pair, long ring
    const g = gain(); osc('sine', midi(n), t, t + 1.2).connect(g); const o2 = osc('sine', midi(n) * 2.76, t, t + 0.4), g2 = gain(); o2.connect(g2); g2.connect(g);
    g.connect(pan(p, fx)); g.connect(revIn); g.connect(dlyIn); env(g.gain, t, amp, 0.002, 1.0); env(g2.gain, t, 0.3, 0.001, 0.2);
  }
  function bass(t: number, n: number, len: number, amp: number) { // a round sub with a filtered square on top for warmth
    const g = gain(), f = ctx.createBiquadFilter(), sub = gain(0.6), sq = gain(0.75); f.type = 'lowpass'; f.frequency.value = 700; f.connect(sq); sq.connect(g); sub.connect(g); g.connect(section);
    osc('sine', midi(n), t, t + len + 0.1).connect(sub); osc('square', midi(n), t, t + len + 0.1).connect(f);
    env(g.gain, t, amp, 0.01, len);
  }
  function pad(t: number, notes: number[], len: number, amp: number) {
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.value = 1800; f.connect(g); g.connect(section); g.connect(revIn);
    for (const n of notes) for (const d of [-6, 6]) { const o = osc('triangle', midi(n), t, t + len + 0.9); o.detune.value = d; o.connect(pan(d < 0 ? -0.4 : 0.4, f)); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.3); g.gain.setValueAtTime(amp, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.8);
  }
  // the whistle: a sine with delayed vibrato, a soft breath and a little scoop up into each note
  function whistle(t: number, n: number, len: number, amp: number) {
    const f = midi(n), o = osc('sine', f * 0.97, t, t + len + 0.15), g = gain(), vib = osc('sine', 5.6, t, t + len + 0.15), vd = gain();
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    vib.connect(vd); vd.connect(o.frequency); vd.gain.setValueAtTime(0, t); vd.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.35, len));
    o.connect(g); g.connect(lead); g.connect(revIn); g.connect(dlyIn);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.03); g.gain.setValueAtTime(amp * 0.85, t + Math.max(0.04, len - 0.06)); g.gain.linearRampToValueAtTime(0, t + len);
    const b = noise(t, len, 'bandpass', f * 2, 6), bg = gain(); b.connect(bg); bg.connect(lead); env(bg.gain, t, amp * 0.06, 0.02, len * 0.8);
  }
  function musicBox(t: number, n: number, amp: number) { glock(t, n + 12, amp, 0.2); }
  function brass(t: number, notes: number[], len: number, amp: number) { // a soft brass stab for the fanfare
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.06); f.frequency.exponentialRampToValueAtTime(1200, t + len);
    for (const n of notes) for (const d of [-8, 8]) { const o = osc('sawtooth', midi(n), t, t + len + 0.2); o.detune.value = d; o.connect(f); }
    f.connect(g); g.connect(section); g.connect(revIn); env(g.gain, t, amp, 0.03, 0.3, len - 0.2);
  }
  const playTune = (t0: number, tune: [number, number, number][], amp: number, until = Infinity, up = 0, inst: 'whistle' | 'box' = 'whistle') => {
    for (const [s, n, l] of tune) { const t = t0 + s * E8; if (t >= until - 0.05) continue; inst === 'box' ? musicBox(t, n + up, amp) : whistle(t, n + up, Math.min(l * E8, until - t), amp); }
  };
  // ---- sound effects ----
  function bell(t: number, n: number, amp: number, len = 1.2) {
    const c = osc('sine', midi(n), t, t + len + 0.1), m = osc('sine', midi(n) * 3.5, t, t + len + 0.1), mg = gain(), g = gain();
    m.connect(mg); mg.connect(c.frequency); mg.gain.setValueAtTime(midi(n) * 0.8, t); mg.gain.exponentialRampToValueAtTime(1, t + len * 0.35);
    c.connect(g); g.connect(fx); g.connect(revIn); env(g.gain, t, amp, 0.003, len);
  }
  function ding(t: number, amp = 0.16) { bell(t, 88, amp, 1.1); bell(t + 0.11, 93, amp * 0.9, 1.4); }               // the payment chime
  function coinTick(t: number, amp: number, f = 2600, p = 0) {
    const o = osc('sine', f, t, t + 0.12), o2 = osc('sine', f * 1.47, t, t + 0.12), g = gain(); o.connect(g); o2.connect(g); g.connect(pan(p, fx)); env(g.gain, t, amp, 0.001, 0.09);
  }
  function pop(t: number, f: number, amp: number) { const o = osc('sine', f, t, t + 0.14), g = gain(); o.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.06); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.002, 0.1); }
  function boing(t: number, f: number, amp: number) { const o = osc('triangle', f, t, t + 0.35), g = gain(); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.3); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.003, 0.28); }
  function tick(t: number, amp: number, f = 1800, p = 0) { const o = osc('sine', f, t, t + 0.05), g = gain(); o.connect(g); g.connect(pan(p, fx)); env(g.gain, t, amp, 0.001, 0.03); }
  function clack(t: number, amp: number) { const n = noise(t, 0.05, 'bandpass', 2500, 2), g = gain(); n.connect(g); g.connect(fx); env(g.gain, t, amp, 0.001, 0.04); tick(t + 0.03, amp * 0.6, 1100); }
  function thump(t: number, amp0: number, f = 70) { const amp = amp0 * 0.6, o = osc('sine', f, t, t + 0.35), g = gain(); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.004, 0.28); }
  function stamp(t: number) { thump(t, 0.45, 110); const n = noise(t, 0.12, 'lowpass', 1800), g = gain(); n.connect(g); g.connect(fx); env(g.gain, t, 0.25, 0.001, 0.09); }
  function impact(t: number, amp0: number) {
    const amp = amp0 * 0.6, o = osc('sine', 80, t, t + 1.3), g = gain(); o.frequency.exponentialRampToValueAtTime(32, t + 1.0); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.003, 1.1);
    const n = noise(t, 0.4, 'lowpass', 1400), ng = gain(); n.connect(ng); ng.connect(fx); ng.connect(revIn); env(ng.gain, t, amp * 0.45, 0.002, 0.3);
  }
  function crash(t: number, amp0: number) {
    const amp = amp0 * 0.7, n = noise(t, 1.2, 'highpass', 4500), f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.value = 8500;
    n.connect(f); f.connect(g); g.connect(fx); g.connect(revIn); env(g.gain, t, amp, 0.002, 1.0);
  }
  function whoosh(tc: number, amp = 0.18, len = 0.4, up = true) {
    const t = tc - len, n = noise(t, len + 0.3, 'bandpass', up ? 300 : 3000, 1.1), g = gain();
    n.frequency.exponentialRampToValueAtTime(up ? 3000 : 300, tc); n.connect(g); g.connect(fx);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, tc - 0.04); g.gain.linearRampToValueAtTime(0, tc + 0.2);
  }
  function riser(a: number, b: number, amp: number) { // tonal, no hiss
    const f = ctx.createBiquadFilter(), g = gain(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, a); f.frequency.exponentialRampToValueAtTime(3000, b); f.connect(g); g.connect(fx); g.connect(revIn);
    for (const n of [65, 72, 77]) { const o = osc('triangle', midi(n - 12), a, b + 0.05); o.frequency.exponentialRampToValueAtTime(midi(n), b); o.connect(f); }
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(amp, b - 0.03); g.gain.linearRampToValueAtTime(0, b);
  }
  function fall(a: number, b: number, amp: number) { // a falling whistle for the medal drop
    const o = osc('sine', 1800, a, b + 0.02), g = gain(); o.frequency.exponentialRampToValueAtTime(400, b); o.connect(g); g.connect(fx);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(amp, a + 0.05); g.gain.setValueAtTime(amp, b - 0.03); g.gain.linearRampToValueAtTime(0, b);
  }
  function scratch(t: number) { // a record stop for the freeze
    const n = noise(t, 0.3, 'bandpass', 2400, 3), g = gain(); n.frequency.exponentialRampToValueAtTime(300, t + 0.22); n.connect(g); g.connect(fx); env(g.gain, t, 0.3, 0.003, 0.24);
    const o = osc('sawtooth', 300, t, t + 0.25), f = ctx.createBiquadFilter(), og = gain(); o.frequency.exponentialRampToValueAtTime(60, t + 0.22); f.type = 'lowpass'; f.frequency.value = 1200;
    o.connect(f); f.connect(og); og.connect(fx); env(og.gain, t, 0.08, 0.003, 0.22);
  }
  function zap(t: number) {
    const o = osc('sawtooth', 110, t, t + 0.6), lfo = osc('square', 37, t, t + 0.6), depth = gain(80), f = ctx.createBiquadFilter(), g = gain();
    lfo.connect(depth); depth.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.8; o.connect(f); f.connect(g); g.connect(fx); env(g.gain, t, 0.22, 0.003, 0.5);
  }
  function shutter(t: number, amp: number) { for (const d of [0, 0.045]) { const n = noise(t + d, 0.03, 'highpass', 3500), g = gain(); n.connect(g); g.connect(pan(0.3, fx)); env(g.gain, t + d, amp, 0.001, 0.025); } }

  // ---- music: walk the film on a 16th-note grid ----
  const S16 = BEAT / 4;
  for (let k = 0; k * S16 < DUR - 0.3; k++) {
    const t = k * S16, s = sectionAt(t), c = chordAt(t), beat = k % 4 === 0, eighth = k % 2 === 0, inBar = k % 16;
    if (t >= SPLIT.freeze && t < SPLIT.apart + 0.2) continue; // the freeze: a beat of silence
    if (beat && s.kick === 'four') kick(t, 0.42);
    if (s.kick === 'half' && (inBar === 0 || inBar === 8)) kick(t, 0.42);
    if (s.snap && (inBar === 4 || inBar === 12)) snap(t, 0.22);
    if (s.hats === 16) hat(t, eighth ? 0.028 : 0.045);
    if (s.hats === 8 && !eighth) hat(t, 0.045);
    if (s.wood && eighth) woodblock(t, k % 4 === 0 ? 0.09 : 0.06, k % 4 === 0 ? 1000 : 760);
    // the bass sits on the off-beats, between the kicks, so the two never stack into one big low peak
    if (s.bass && (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14)) bass(t, c[0] - 24 + (inBar === 14 ? 7 : 0), S16 * 1.7, 0.26);
    if (s.mar && (s.mar === 16 || (s.mar === 8 ? eighth : beat))) {
      const order = [0, 2, 1, 2, 0, 2, 1, 2], step = s.mar === 16 ? k : k / 2 | 0, n = c[order[step % 8]] + 12 + (inBar >= 8 ? 12 : 0);
      marimba(t, n, (s.marAmp ?? 0.08) * 1.25 * (beat ? 1.1 : 0.85), (step % 2 ? 0.3 : -0.3));
    }
    if (s.pizz && (inBar === 2 || inBar === 10 || inBar === 7)) pizz(t, c[inBar === 7 ? 2 : 1] + 12, 0.05, 0.4);
    if (inBar === 0 && s.pad > 0) pad(t, c, BAR - 0.05, s.pad * 1.5);
  }
  // the twist after the freeze: a tiptoeing pizzicato while you think it over
  for (let t = SPLIT.apart + 0.25, i = 0; t < scene('split').b - 0.1; t += BEAT / 2, i++) pizz(t, [65, 69, 72, 69, 67, 70, 74, 70][i % 8], 0.07, i % 2 ? 0.4 : -0.4);

  // ---- the tune ----
  playTune(0, TUNE_A, 0.13, scene('hook').b);                         // the hook: the first half of the question
  playTune(NOBEL.medal + 0.15, TUNE_B, 0.11, scene('nobel').b, 12);     // the prize: the answer, an octave up
  playTune(scene('then').a, TUNE_A, 0.06, THEN.now, 0, 'box');         // 1994: the same tune on a music box
  playTune(scene('crowd').a + 0.5, TUNE_A, 0.13, scene('end').a);       // the crowd: the question again, full
  playTune(scene('end').a, TUNE_B, 0.13, DUR);                         // the end: the answer, back where we started

  // ---- the story's events ----
  ding(0.0, 0.2); impact(0.0, 0.3);
  for (let i = 0; i < 16; i++) coinTick(HOOK.coins + i * 0.025 + 0.02, 0.05 + R() * 0.04, 2200 + R() * 1600, (i % 2 ? 1 : -1) * 0.5);
  pop(HOOK.buttons[0], 520, 0.14); pop(HOOK.buttons[1], 700, 0.14);
  for (let t = HOOK.cursor + BEAT * 0.62; t < scene('hook').b - 0.1; t += BEAT) tick(t, 0.06, 1500);
  scratch(SPLIT.freeze); tick(SPLIT.freeze + 0.02, 0.15, 900);
  whoosh(SPLIT.apart + 0.3, 0.12, 0.3);
  pop(SPLIT.once - 0.1, 600, 0.12); pop(SPLIT.monthly - 0.1, 800, 0.12);
  for (let i = 0; i < 12; i++) glock(SPLIT.monthly + i * 0.13 + 0.12, PENTA[i % PENTA.length] + 12, 0.035, 0.4);
  glock(SPLIT.once + 0.12, 84, 0.05, -0.4);
  // the prize: the curtain falls, the medal whistles down and lands on a fanfare
  whoosh(scene('nobel').a + 0.35, 0.2, 0.45, false);
  fall(NOBEL.medal - 0.4, NOBEL.medal, 0.05);
  impact(NOBEL.medal, 0.9); crash(NOBEL.medal, 0.1); brass(NOBEL.medal, [65, 69, 72], 0.9, 0.12); brass(NOBEL.medal + 1.0, [67, 72, 76], 0.45, 0.08);
  for (const [n, a] of [[77, 0.05], [81, 0.045], [84, 0.04], [89, 0.03]] as const) bell(NOBEL.medal, n, a, 2.2);
  glock(NOBEL.shine, 96, 0.04); glock(NOBEL.shine + 0.08, 100, 0.035);
  whoosh(NOBEL.names + 0.25, 0.12, 0.3); whoosh(NOBEL.names + 0.37, 0.1, 0.3);
  // Hall
  whoosh(scene('spread').a + 0.2, 0.18, 0.35);
  for (let i = 0; i < 10; i++) glock(SPREAD.burst + i * 0.07 + 0.55, PENTA[i] + 12, 0.035, (i / 9) * 1.2 - 0.6);
  riser(SPREAD.monthly - 0.35, SPREAD.monthly + 0.1, 0.06); thump(SPREAD.monthly + 0.1, 0.5, 80); bell(SPREAD.now, 89, 0.05, 1.0);
  whoosh(scene('surprise').a + 0.15, 0.15, 0.35);
  stamp(SURPRISE.stamp1); stamp(SURPRISE.stamp2);
  zap(SURPRISE.bolt); impact(SURPRISE.bolt, 0.8); crash(SURPRISE.bolt, 0.09);
  whoosh(scene('types').a + 0.2, 0.18, 0.35);
  for (let i = 0; i < 10; i++) pop(TYPES.row + i * 0.04, 380 + i * 25, 0.04);
  for (let i = 0; i < 8; i++) glock(TYPES.eighty + i * 0.07, PENTA[i] + 12, 0.04, (i / 7) - 0.5);
  for (let j = 0; j < 2; j++) boing(TYPES.twenty + j * 0.12, 420, 0.13);
  // Woodford: prices creep up, then the bank calms them
  whoosh(scene('shops').a + 0.2, 0.18, 0.35);
  for (let i = 0; i < 4; i++) pop(SHOPS.think + i * 0.12, 500 + i * 80, 0.1);
  for (let i = 0; i < 4; i++) clack(SHOPS.flip + i * 0.16 + 0.1, 0.26);
  riser(SHOPS.flip, SHOPS.real, 0.07); impact(SHOPS.real, 0.4); crash(SHOPS.real, 0.05);
  whoosh(scene('bank').a + 0.3, 0.2, 0.45);
  thump(scene('bank').a + 0.5, 0.3, 120); tick(scene('bank').a + 0.55, 0.12, 700);
  thump(BANK.mic, 0.35, 110); thump(BANK.mic + 0.16, 0.3, 110);
  for (const [n, a] of [[72, 0.05], [77, 0.045], [81, 0.04]] as const) bell(BANK.calm, n, a, 1.6);
  whoosh(scene('then').a + 0.25, 0.15, 0.35);
  { // vinyl crackle while it is 1994
    const a = scene('then').a, b = THEN.now;
    for (let t = a; t < b; t += 0.03 + R() * 0.06) tick(t, 0.01 + R() * 0.02, 3000 + R() * 4000, R() - 0.5);
    const n = noise(a, b - a, 'bandpass', 1200, 0.6), g = gain(); n.connect(g); g.connect(fx); g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.02, a + 0.2); g.gain.setValueAtTime(0.02, b - 0.1); g.gain.linearRampToValueAtTime(0, b);
  }
  bell(THEN.now, 86, 0.05, 1.0);
  for (const [, , at] of THEN.flashes) shutter(at, 0.12);
  // the end
  whoosh(scene('globe').a + 0.15, 0.15, 0.35);
  for (let i = 0; i < 19; i++) glock(GLOBE.pins + i * 0.09, PENTA[i % PENTA.length], 0.03, ((i % 5) / 4) - 0.5);
  for (let i = 0; i < 3; i++) bell(GLOBE.model + i * 0.15, [77, 81, 84][i], 0.045, 1.0);
  impact(scene('crowd').a, 0.7); crash(scene('crowd').a, 0.07);
  { // the crowd murmur swells as the camera pulls back
    const a = scene('crowd').a, b = scene('crowd').b, n = noise(a, b - a, 'bandpass', 700, 0.5), g = gain(); n.connect(g); g.connect(fx);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.03, CROWD.wave); g.gain.linearRampToValueAtTime(0, b);
  }
  riser(CROWD.tomorrow, CROWD.wave, 0.08); crash(CROWD.wave, 0.08); brass(CROWD.wave, [65, 69, 72], 0.8, 0.09);
  for (const [n, a] of [[77, 0.05], [81, 0.045], [84, 0.04], [89, 0.03]] as const) bell(CROWD.wave, n, a, 2.0);
  whoosh(scene('end').a + 0.3, 0.18, 0.4);
  ding(scene('end').a + 0.15, 0.16);
  pop(END.options, 520, 0.12); pop(END.options + 0.18, 700, 0.12);
  for (let t = END.options + 0.5 + BEAT * 0.62; t < DUR - 0.2; t += BEAT) tick(t, 0.06, 1500);

  // ---- automation, applied in time order ----
  // 1994 sounds like an old record until "现在"; the shops' tension opens the filter as prices rise
  const then = scene('then');
  lp.frequency.setValueAtTime(18000, 0);
  lp.frequency.setValueAtTime(18000, SHOPS.think); lp.frequency.exponentialRampToValueAtTime(1600, SHOPS.think + 0.3); lp.frequency.exponentialRampToValueAtTime(18000, SHOPS.real);
  lp.frequency.setValueAtTime(18000, then.a); lp.frequency.exponentialRampToValueAtTime(900, then.a + 0.3);
  lp.frequency.setValueAtTime(900, THEN.now); lp.frequency.exponentialRampToValueAtTime(18000, THEN.now + 0.25);
  // the bank: the music settles while the bubble speaks, then breathes out on the calm chord
  section.gain.setValueAtTime(1, 0);
  section.gain.setValueAtTime(1, BANK.mic - 0.1); section.gain.linearRampToValueAtTime(0.55, BANK.mic + 0.1); section.gain.setValueAtTime(0.55, BANK.calm); section.gain.linearRampToValueAtTime(1, BANK.calm + 0.6);
  // sidechain: the music breathes with the kick
  kicks.sort((a, b) => a - b).forEach((t) => { duck.gain.setTargetAtTime(0.55, t, 0.004); duck.gain.setTargetAtTime(1, t + 0.03, 0.06); });

  return ctx.startRendering();
}

export function toWav(buffer: AudioBuffer) {
  const ch = buffer.numberOfChannels, len = buffer.length, data = new ArrayBuffer(44 + len * ch * 4), v = new DataView(data);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  // 32-bit float WAV, so nothing is clipped before mastering
  str(0, 'RIFF'); v.setUint32(4, data.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, ch, true);
  v.setUint32(24, buffer.sampleRate, true); v.setUint32(28, buffer.sampleRate * ch * 4, true); v.setUint16(32, ch * 4, true); v.setUint16(34, 32, true); str(36, 'data'); v.setUint32(40, len * ch * 4, true);
  const chans = Array.from({length: ch}, (_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { v.setFloat32(o, chans[c][i], true); o += 4; }
  return new Uint8Array(data);
}
