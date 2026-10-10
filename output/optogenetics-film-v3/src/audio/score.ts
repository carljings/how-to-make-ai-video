// score.ts: the soundtrack, synthesized offline with Web Audio from the cues in timeline.ts. No voice.
// 120 BPM, D minor (Dm–Bb–F–C, one chord per bar). Every section has its own density, and the story's events
// (light on/off, the zap, the drop, the brake) each get a sound on the exact time the picture uses.
import {
  DUR, BEAT, BAR, HOOK_LIGHT, PAY_LIGHT, TITLE_FIRE, COUNT, SCAN, ELECTRODE_IN, ZAP, ELECTRODE_OUT, QUIZ_CARDS, COUNTDOWN,
  REVEAL, MAGNIFY, ALGA_OPEN, GATE_LIGHT, GATE_OPEN, GATE_SPIKES, PACK, FLY, DROP, CHANNEL_TIMES, PULSES, AMBER_ON,
  GOGGLES_ON, RETINA_ON, OBJECTS, END_FIRE, CTA,
} from '../timeline';
import {rng} from '../lib/math';
import {FOOTSTEPS} from '../art/mouse';
import {LOCK_TIMES} from '../art/field';

const SR = 48000;
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]]; // Dm, Bb, F, C
const chordAt = (t: number) => CHORDS[Math.floor(t / BAR + 1e-6) % 4];
const PENTA = [50, 53, 55, 57, 60, 62, 65, 67, 69, 72, 74, 77]; // D minor pentatonic, rising

// How busy the music is in each stretch of the film
type Kick = 'four' | 'half' | 'quiz' | 'soft' | null;
interface Section { a: number; b: number; kick: Kick; hats: 0 | 8 | 16; bass: 'sub' | 'drive' | 'eighths' | 'growl' | 'bounce' | null; arp: 0 | 8 | 16; pad: number; clap?: boolean; stabs?: boolean; shaker?: boolean; arpAmp?: number }
const SECTIONS: Section[] = [
  {a: 0, b: 2, kick: 'four', hats: 8, bass: 'drive', arp: 16, pad: 0.05},
  {a: 2, b: 3.5, kick: 'four', hats: 0, bass: 'sub', arp: 0, pad: 0.05},          // light off: muffled
  {a: 3.5, b: 4.5, kick: 'four', hats: 8, bass: 'drive', arp: 16, pad: 0.05},
  {a: 4.5, b: 6, kick: null, hats: 0, bass: null, arp: 8, pad: 0.06},            // the question: drums out, riser
  {a: 6, b: 10, kick: 'half', hats: 8, bass: 'sub', arp: 8, pad: 0.07, clap: true},
  {a: 10, b: 14.5, kick: 'four', hats: 16, bass: 'eighths', arp: 16, pad: 0.05},
  {a: 15, b: 18, kick: 'four', hats: 16, bass: 'eighths', arp: 16, pad: 0.05, clap: true},
  {a: 18, b: 22.4, kick: 'quiz', hats: 8, bass: 'bounce', arp: 8, pad: 0, arpAmp: 0.13},
  {a: 22.4, b: 30, kick: 'half', hats: 0, bass: 'sub', arp: 8, pad: 0.07},        // underwater
  {a: 30, b: 31, kick: null, hats: 0, bass: 'sub', arp: 0, pad: 0.04},
  {a: 31, b: 33.5, kick: null, hats: 16, bass: 'sub', arp: 16, pad: 0.06},
  {a: 33.5, b: 36, kick: 'four', hats: 16, bass: 'eighths', arp: 16, pad: 0.05},
  {a: 36, b: 37, kick: 'four', hats: 8, bass: 'eighths', arp: 16, pad: 0.05},      // build, filter opening
  {a: 37, b: 38, kick: null, hats: 0, bass: null, arp: 16, pad: 0.05},             // one bar without drums before the drop
  {a: 38, b: 48, kick: 'four', hats: 16, bass: 'growl', arp: 16, pad: 0.05, clap: true, stabs: true},
  {a: 51, b: 56, kick: 'four', hats: 16, bass: 'drive', arp: 16, pad: 0.05, clap: true, shaker: true},
  {a: 56, b: 60, kick: 'soft', hats: 0, bass: 'sub', arp: 8, pad: 0.09},          // warm
  {a: 60, b: 64, kick: 'half', hats: 8, bass: 'sub', arp: 8, pad: 0.08, clap: true},
];
const sectionAt = (t: number) => SECTIONS.find((s) => t >= s.a - 1e-6 && t < s.b - 1e-6);
const inLight = (t: number, w: [number, number][]) => w.some(([a, b]) => t >= a && t < b);

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, Math.ceil(DUR * SR), SR), R = rng(2026);
  // Every gain node starts at 0 and only then gets its level, so nothing clicks on
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = 0; if (v) g.gain.setValueAtTime(v, 0); return g; };
  const env = (p: AudioParam, t: number, peak: number, atk: number, dec: number, hold = 0) => {
    p.setValueAtTime(0, t); p.linearRampToValueAtTime(peak, t + atk); p.setValueAtTime(peak, t + atk + hold);
    p.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec); p.setValueAtTime(0, t + atk + hold + dec + 0.01);
  };
  // ---- buses ----
  const master = gain(0.85), clip = ctx.createWaveShaper();
  // gentle saturation on the master: unity gain at normal levels, rounding off only the loudest peaks
  clip.curve = Float32Array.from({length: 2049}, (_, i) => Math.tanh((i - 1024) / 1024));
  clip.oversample = '4x';
  master.connect(clip); clip.connect(ctx.destination);
  master.gain.setValueAtTime(0.85, DUR - 0.3); master.gain.linearRampToValueAtTime(0, DUR - 0.01);
  // drums go through their own soft saturation, which rounds off the kick's peaks and keeps the crest factor down
  const fx = gain(1), drums = gain(1), drive = ctx.createWaveShaper();
  drive.curve = Float32Array.from({length: 2049}, (_, i) => Math.tanh(((i - 1024) / 1024) * 1.8) / 1.8); drive.oversample = '4x';
  fx.connect(master); drums.connect(drive); drive.connect(master);
  // music: section gain → filter → sidechain duck → master
  const section = gain(1), lp = ctx.createBiquadFilter(), duck = gain(1);
  lp.type = 'lowpass'; lp.Q.value = 0.9; lp.frequency.value = 18000;
  section.connect(lp); lp.connect(duck); duck.connect(master);
  // reverb (seeded noise impulse) and a dotted-eighth delay, both on sends
  const verb = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.6, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp((-i / SR) * 2.8); }
  verb.buffer = ir;
  const revIn = gain(1), revLP = ctx.createBiquadFilter(), revOut = gain(0.26);
  revLP.type = 'lowpass'; revLP.frequency.value = 6500;
  revIn.connect(verb); verb.connect(revLP); revLP.connect(revOut); revOut.connect(master);
  const dly = ctx.createDelay(1), fb = gain(0.32), dlp = ctx.createBiquadFilter(), dlyIn = gain(1), dlyOut = gain(0.17);
  dly.delayTime.value = BEAT * 0.75; dlp.type = 'lowpass'; dlp.frequency.value = 3500;
  dlyIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dlyOut); dlyOut.connect(master);
  // tape stop: one control signal added to the detune of every musical oscillator
  const pitch = ctx.createConstantSource(); pitch.offset.value = 0; pitch.start(0);
  // ---- sources ----
  const NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const noise = (t: number, dur: number, type: BiquadFilterType, f: number, q = 0.7) => {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter();
    s.buffer = NOISE; s.loop = true; flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    s.connect(flt); s.start(t, R() * 1.5); s.stop(Math.min(DUR, t + dur + 0.05));
    return flt;
  };
  const osc = (type: OscillatorType, f: number, t: number, stop: number, musical = false) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (musical) pitch.connect(o.detune);
    o.start(t); o.stop(Math.min(DUR, stop));
    return o;
  };
  const pan = (v: number, to: AudioNode) => { const p = ctx.createStereoPanner(); p.pan.value = v; p.connect(to); return p; };
  const ducks: number[] = [];

  // ---- instruments ----
  function kick(t: number, amp: number) {
    const o = osc('sine', 160, t, t + 0.45), g = gain(0); o.frequency.exponentialRampToValueAtTime(44, t + 0.1); o.connect(g); g.connect(drums);
    env(g.gain, t, amp, 0.002, 0.38);
    const c = noise(t, 0.012, 'highpass', 3500), cg = gain(0); c.connect(cg); cg.connect(drums); env(cg.gain, t, amp * 0.22, 0.001, 0.01);
    ducks.push(t);
  }
  function clap(t: number, amp: number) {
    for (const [d, k] of [[0, 1], [0.011, 0.8], [0.022, 0.9]]) {
      const n = noise(t + d, 0.2, 'bandpass', 1300, 1.1), g = gain(0); n.connect(g); g.connect(drums); g.connect(revIn);
      env(g.gain, t + d, amp * k, 0.001, d === 0.022 ? 0.16 : 0.012);
    }
  }
  function snare(t: number, amp: number) {
    const n = noise(t, 0.15, 'bandpass', 2200, 0.8), g = gain(0); n.connect(g); g.connect(drums); g.connect(revIn); env(g.gain, t, amp, 0.001, 0.1);
    const o = osc('triangle', 190, t, t + 0.1), og = gain(0); o.connect(og); og.connect(drums); env(og.gain, t, amp * 0.5, 0.001, 0.06);
  }
  function hat(t: number, amp: number, open = false) {
    const n = noise(t, open ? 0.3 : 0.06, 'highpass', open ? 7000 : 8500), g = gain(0); n.connect(g); g.connect(pan(((t * 7.3) % 1) * 0.6 - 0.3, drums));
    env(g.gain, t, amp, 0.001, open ? 0.22 : 0.04);
  }
  function shaker(t: number, amp: number) { const n = noise(t, 0.08, 'bandpass', 5200, 1.4), g = gain(0); n.connect(g); g.connect(pan(0.25, drums)); env(g.gain, t, amp, 0.008, 0.05); }
  function pluck(t: number, n: number, amp: number, p: number, bright = 5200) {
    const f = ctx.createBiquadFilter(), g = gain(0), g2 = gain(0.35);
    const o1 = osc('triangle', midi(n), t, t + 0.5, true), o2 = osc('sine', midi(n) * 2, t, t + 0.5, true);
    o2.connect(g2); g2.connect(f); o1.connect(f);
    f.type = 'lowpass'; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(800, t + 0.28);
    f.connect(g); const pn = pan(p, section); g.connect(pn); g.connect(dlyIn); g.connect(revIn);
    env(g.gain, t, amp, 0.003, 0.36);
  }
  function bass(t: number, n: number, len: number, amp: number, kind: Section['bass']) {
    const g = gain(0); g.connect(section);
    if (kind === 'sub') {
      osc('sine', midi(n), t, t + len + 0.1, true).connect(g); env(g.gain, t, amp * 1.4, 0.02, len, 0);
      return;
    }
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.connect(g);
    const o = osc('sawtooth', midi(n), t, t + len + 0.1, true); o.connect(f);
    if (kind === 'growl') {
      const o2 = osc('square', midi(n) * 1.004, t, t + len + 0.1, true), s = osc('sine', midi(n - 12), t, t + len + 0.1, true), sg = gain(0.7);
      o2.connect(f); s.connect(sg); sg.connect(g);
      f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1700, t + 0.04); f.frequency.exponentialRampToValueAtTime(380, t + len);
    } else f.frequency.value = kind === 'bounce' ? 900 : 520;
    env(g.gain, t, amp, 0.006, len);
  }
  function pad(t: number, notes: number[], len: number, amp: number, cutoff = 1500) {
    const f = ctx.createBiquadFilter(), g = gain(0); f.type = 'lowpass'; f.frequency.value = cutoff; f.connect(g); g.connect(section); g.connect(revIn);
    for (const n of notes) for (const d of [-7, 7]) { const o = osc('sawtooth', midi(n), t, t + len + 0.9, true); o.detune.value = d; o.connect(pan(d < 0 ? -0.4 : 0.4, f)); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.35); g.gain.setValueAtTime(amp, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.8);
  }
  function stab(t: number, notes: number[], amp: number) {
    const f = ctx.createBiquadFilter(), g = gain(0); f.type = 'lowpass'; f.frequency.setValueAtTime(4000, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.12); f.connect(g); g.connect(section); g.connect(dlyIn);
    for (const n of notes) osc('sawtooth', midi(n + 12), t, t + 0.2, true).connect(f);
    env(g.gain, t, amp, 0.002, 0.13);
  }
  function bell(t: number, n: number, amp: number, len = 1.4, to: AudioNode = fx) {
    const c = osc('sine', midi(n), t, t + len + 0.1), m = osc('sine', midi(n) * 3.5, t, t + len + 0.1), mg = gain(0), g = gain(0);
    m.connect(mg); mg.connect(c.frequency); mg.gain.setValueAtTime(midi(n) * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + len * 0.6);
    c.connect(g); g.connect(to); g.connect(revIn); g.connect(dlyIn); env(g.gain, t, amp, 0.003, len);
  }
  // ---- sound effects ----
  function impact(t: number, amp: number) {
    const o = osc('sine', 82, t, t + 1.5), g = gain(0); o.frequency.exponentialRampToValueAtTime(30, t + 1.2); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.003, 1.3);
    const n = noise(t, 0.5, 'lowpass', 1500), ng = gain(0); n.connect(ng); ng.connect(fx); ng.connect(revIn); env(ng.gain, t, amp * 0.55, 0.002, 0.4);
  }
  function crash(t: number, amp: number) { const n = noise(t, 2.2, 'highpass', 5000), g = gain(0); n.connect(g); g.connect(fx); g.connect(revIn); env(g.gain, t, amp, 0.002, 1.9); }
  function riser(a: number, b: number, amp: number) {
    const n = noise(a, b - a, 'highpass', 300), g = gain(0); n.frequency.exponentialRampToValueAtTime(7000, b); n.connect(g); g.connect(fx); g.connect(revIn);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(amp, b - 0.02); g.gain.linearRampToValueAtTime(0, b);
    const o = osc('sawtooth', 110, a, b), of = ctx.createBiquadFilter(), og = gain(0); of.type = 'lowpass'; of.frequency.setValueAtTime(400, a); of.frequency.exponentialRampToValueAtTime(5000, b);
    o.frequency.exponentialRampToValueAtTime(880, b); o.connect(of); of.connect(og); og.connect(fx);
    og.gain.setValueAtTime(0, a); og.gain.linearRampToValueAtTime(amp * 0.25, b - 0.02); og.gain.linearRampToValueAtTime(0, b);
  }
  function swell(a: number, b: number, amp: number) { // a reversed-cymbal swell that ends on a hit
    const n = noise(a, b - a, 'bandpass', 800, 0.6), g = gain(0); n.frequency.exponentialRampToValueAtTime(9000, b); n.connect(g); g.connect(fx); g.connect(revIn);
    g.gain.setValueAtTime(0, a); g.gain.setTargetAtTime(amp, a, (b - a) / 2.2); g.gain.setValueAtTime(amp * 0.9, b - 0.005); g.gain.linearRampToValueAtTime(0, b);
  }
  function whoosh(tc: number, amp = 0.22, len = 0.45) {
    const t = tc - len, n = noise(t, len + 0.3, 'bandpass', 300, 1.1), g = gain(0);
    n.frequency.exponentialRampToValueAtTime(3000, tc); n.frequency.exponentialRampToValueAtTime(700, tc + 0.2);
    n.connect(g); g.connect(pan(0, fx)); g.connect(revIn);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, tc - 0.04); g.gain.linearRampToValueAtTime(0, tc + 0.22);
  }
  function tick(t: number, amp: number, f = 1800, p = 0) {
    const o = osc('sine', f, t, t + 0.05), g = gain(0); o.connect(g); g.connect(pan(p, fx)); env(g.gain, t, amp, 0.001, 0.03);
    const n = noise(t, 0.02, 'highpass', 5000), ng = gain(0); n.connect(ng); ng.connect(pan(p, fx)); env(ng.gain, t, amp * 0.5, 0.001, 0.012);
  }
  function blip(t: number, f: number, amp: number, up = 2) {
    const o = osc('sine', f, t, t + 0.16), g = gain(0); o.frequency.exponentialRampToValueAtTime(f * up, t + 0.07); o.connect(g); g.connect(fx); g.connect(dlyIn); env(g.gain, t, amp, 0.002, 0.11);
  }
  function lightOnFx(t: number) {
    bell(t, 86, 0.05, 0.9); bell(t, 93, 0.035, 0.9);
    const n = noise(t, 0.4, 'lowpass', 900), g = gain(0); n.frequency.exponentialRampToValueAtTime(5000, t + 0.1); n.connect(g); g.connect(fx); env(g.gain, t, 0.22, 0.004, 0.32);
    const o = osc('sine', 70, t, t + 0.5), og = gain(0); o.frequency.exponentialRampToValueAtTime(40, t + 0.35); o.connect(og); og.connect(fx); env(og.gain, t, 0.55, 0.002, 0.4);
  }
  function powerDown(t: number) { const o = osc('sawtooth', 520, t, t + 0.4), f = ctx.createBiquadFilter(), g = gain(0); o.frequency.exponentialRampToValueAtTime(90, t + 0.32); f.type = 'lowpass'; f.frequency.value = 1400; o.connect(f); f.connect(g); g.connect(fx); env(g.gain, t, 0.07, 0.005, 0.3); }
  function zap(t: number) {
    const o = osc('sawtooth', 96, t, t + 0.7), lfo = osc('square', 31, t, t + 0.7), depth = gain(70), sh = ctx.createWaveShaper(), f = ctx.createBiquadFilter(), g = gain(0);
    sh.curve = Float32Array.from({length: 1025}, (_, i) => Math.tanh(((i - 512) / 512) * 6)); lfo.connect(depth); depth.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.7; o.connect(sh); sh.connect(f); f.connect(g); g.connect(fx); env(g.gain, t, 0.3, 0.003, 0.6);
    const n = noise(t, 0.6, 'bandpass', 3800, 0.5), ng = gain(0); n.connect(ng); ng.connect(fx); env(ng.gain, t, 0.25, 0.002, 0.5);
  }
  function stutter(t: number, n: number, amp: number) { for (let i = 0; i < n; i++) { const s = t + i * (BEAT / 8); tick(s, amp * (1 - i / n), 300 + R() * 2400, (R() - 0.5) * 0.8); } }
  function bubble(t: number, amp: number) { const f0 = 350 + R() * 500, o = osc('sine', f0, t, t + 0.09), g = gain(0); o.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + 0.06); o.connect(g); g.connect(pan((R() - 0.5) * 1.2, fx)); g.connect(revIn); env(g.gain, t, amp, 0.004, 0.05); }
  function pop(t: number, f: number, amp: number) { blip(t, f, amp, 2.6); tick(t, amp * 0.4, f * 2); }
  function thump(t: number, amp: number, f = 62) { const o = osc('sine', f, t, t + 0.3), g = gain(0); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.2); o.connect(g); g.connect(fx); env(g.gain, t, amp, 0.01, 0.22); }

  // ---- music: walk the film on a 16th-note grid ----
  const S16 = BEAT / 4;
  for (let k = 0; k * S16 < DUR - 0.25; k++) {
    const t = k * S16, s = sectionAt(t);
    if (!s) continue;
    const c = chordAt(t), beat = k % 4 === 0, eighth = k % 2 === 0, inBar = k % 16;
    if (beat && s.kick) {
      if (s.kick === 'four') kick(t, 0.8);
      else if (s.kick === 'half' && (inBar === 0 || inBar === 8)) kick(t, 0.78);
      else if (s.kick === 'soft' && inBar === 0) kick(t, 0.5);
    }
    if (s.kick === 'quiz' && (inBar === 0 || inBar === 6 || inBar === 8 || inBar === 11)) kick(t, 0.72);
    if (s.clap && (inBar === 4 || inBar === 12)) clap(t, 0.4);
    if (s.hats === 16) hat(t, eighth ? 0.045 : 0.075, inBar === 14);
    if (s.hats === 8 && !eighth) hat(t, 0.075);
    if (s.shaker && !(inLight(t, [[53.5, 54.5]]))) shaker(t, eighth ? 0.05 : 0.08);
    if (s.bass) {
      if (s.bass === 'sub' && inBar % 8 === 0) bass(t, c[0] - 24, BEAT * 2 - 0.05, 0.36, 'sub');
      // driving basses sit on the offbeats, between the kicks, so the two pump against each other instead of stacking
      if (s.bass === 'drive' && k % 4 === 2) bass(t, c[0] - 12, S16 * 1.8, 0.26, 'drive');
      if (s.bass === 'drive' && k % 4 === 3) bass(t, c[0], S16 * 0.8, 0.12, 'drive');
      if (s.bass === 'eighths' && k % 4 === 2) bass(t, c[0] - 12, S16 * 1.8, 0.24, 'eighths');
      if (s.bass === 'growl' && k % 2 === 1 && k % 4 !== 1) bass(t, c[0] - 12, S16 * 1.6, 0.24, 'growl');
      if (s.bass === 'growl' && k % 4 === 2) bass(t, c[0] - 12, S16 * 1.8, 0.26, 'growl');
      if (s.bass === 'bounce' && eighth) bass(t, (k % 4 === 0 ? c[0] : c[2]) - 12, S16 * 0.9, 0.22, 'bounce');
    }
    if (s.arp && (s.arp === 16 || eighth)) {
      const order = [0, 1, 2, 1, 2, 0, 2, 1], n = c[order[(s.arp === 16 ? k : k / 2) % 8]] + 12 + ((k >> 3) % 2) * 12;
      pluck(t, n, (s.arpAmp ?? 0.1) * (eighth ? 1 : 0.7), k % 2 ? 0.35 : -0.35, t >= 22.4 && t < 30 ? 2600 : 5200);
    }
    if (s.stabs && (inBar === 2 || inBar === 6 || inBar === 10 || inBar === 14)) stab(t, c, 0.07);
    // pads start on each bar, or straight away when a section starts mid-bar
    if ((inBar === 0 || Math.abs(t - s.a) < 1e-6) && s.pad > 0) pad(t, c, Math.min(BAR - (t % BAR), s.b - t), s.pad * 1.6, t >= 56 && t < 60 ? 2600 : 1500);
  }
  // build into the drop: a snare roll that speeds up
  for (let t = 36; t < DROP - 0.01;) { snare(t, 0.08 + 0.18 * ((t - 36) / 2)); t += t < 37 ? BEAT / 2 : t < 37.5 ? BEAT / 4 : BEAT / 8; }
  for (let t = 17.5; t < 18 - 0.01; t += BEAT / 8) snare(t, 0.06 + 0.12 * ((t - 17.5) / 0.5));
  // the brake: only a heartbeat, a low amber hum and a muffled chord (on the effects bus, so the tape stop spares them)
  for (let t = AMBER_ON + 0.5; t < 50.8; t += 1.0) { thump(t, 0.24); thump(t + 0.24, 0.14); }
  {
    const h1 = osc('sine', 110, AMBER_ON, 51.1), h2 = osc('sine', 165, AMBER_ON, 51.1), hg = gain(0), trem = osc('sine', 4, AMBER_ON, 51.1), tg = gain(0.015);
    h1.connect(hg); h2.connect(hg); hg.connect(fx); trem.connect(tg); tg.connect(hg.gain);
    hg.gain.setValueAtTime(0, AMBER_ON); hg.gain.linearRampToValueAtTime(0.035, AMBER_ON + 0.6); hg.gain.setValueAtTime(0.035, 50.4); hg.gain.linearRampToValueAtTime(0, 51.0);
    const f = ctx.createBiquadFilter(), pg = gain(0); f.type = 'lowpass'; f.frequency.value = 420; f.connect(pg); pg.connect(fx); pg.connect(revIn);
    for (const n of [50, 53, 57]) osc('triangle', midi(n - 12), AMBER_ON, 51.1).connect(f);
    pg.gain.setValueAtTime(0, AMBER_ON); pg.gain.linearRampToValueAtTime(0.05, AMBER_ON + 0.8); pg.gain.setValueAtTime(0.05, 50.5); pg.gain.linearRampToValueAtTime(0, 51.0);
  }

  // ---- the story's events ----
  impact(0, 0.7);
  for (const [a, b] of HOOK_LIGHT) { lightOnFx(a); powerDown(b); }
  for (const [a, b] of PAY_LIGHT) { lightOnFx(a); if (b < 56) powerDown(b); }
  for (const f of FOOTSTEPS) { const n = noise(f.t, 0.06, 'lowpass', 1800), g = gain(0); n.connect(g); g.connect(pan(-0.15, fx)); env(g.gain, f.t, 0.12 * f.v, 0.002, 0.05); thump(f.t, 0.12 * f.v, 140); }
  riser(4.5, 6.0, 0.16); swell(5.0, 6.0, 0.18); whoosh(6.0, 0.25);
  impact(6.0, 0.95); crash(6.0, 0.08); for (const [n, a] of [[74, 0.06], [81, 0.045], [86, 0.035]] as const) bell(6.0, n, a, 2.2);
  for (const t of TITLE_FIRE.slice(1)) { tick(t, 0.12, 2400); blip(t, 900, 0.05, 1.6); }
  // the counter rolls fast, then slower, and lands
  for (let t = COUNT[0], dt = 0.03; t < COUNT[1]; t += dt, dt *= 1.09) tick(t, 0.07, 2600, 0.2);
  bell(COUNT[1], 81, 0.05, 1.0);
  { const n = noise(SCAN[0], SCAN[1] - SCAN[0], 'bandpass', 300, 3), g = gain(0); n.frequency.exponentialRampToValueAtTime(3200, SCAN[1]); n.connect(g); g.connect(fx); g.gain.setValueAtTime(0, SCAN[0]); g.gain.linearRampToValueAtTime(0.06, SCAN[0] + 0.3); g.gain.linearRampToValueAtTime(0, SCAN[1]); }
  blip(SCAN[0], 1300, 0.06, 1.0);
  { const n = noise(ELECTRODE_IN, 0.3, 'bandpass', 6000, 2), g = gain(0); n.connect(g); g.connect(fx); g.connect(revIn); env(g.gain, ELECTRODE_IN, 0.12, 0.002, 0.25); bell(ELECTRODE_IN, 103, 0.02, 0.5); }
  zap(ZAP); impact(ZAP, 0.9); stutter(ZAP, 8, 0.12);
  whoosh(ELECTRODE_OUT + 0.3, 0.1, 0.3);
  LOCK_TIMES.forEach((t, i) => blip(t, midi(PENTA[i % PENTA.length] + 12), 0.04, 1.02));
  stutter(18.0, 6, 0.1); impact(18.0, 0.5);
  QUIZ_CARDS.forEach((t, i) => pop(t, 420 + i * 140, 0.12));
  COUNTDOWN.forEach((t, i) => { tick(t, 0.2, 1200); tick(t + 0.25, 0.08, 800); blip(t, 500 + i * 160, 0.05, 1.0); });
  bell(REVEAL, 88, 0.08, 1.4); bell(REVEAL, 93, 0.05, 1.4); impact(REVEAL, 0.35); crash(REVEAL, 0.05);
  whoosh(22.4, 0.18, 0.45);
  for (let i = 0; i < 46; i++) bubble(22.4 + R() * 7.2, 0.025 + R() * 0.03);
  whoosh(MAGNIFY + 0.2, 0.08, 0.3);
  for (const [n, d] of [[81, 0], [84, 0.08], [88, 0.16]] as const) bell(ALGA_OPEN + d, n, 0.035, 1.2);
  impact(27.0, 0.25); bell(27.0, 74, 0.04, 1.6);
  riser(29.0, 30.0, 0.12); whoosh(30.0, 0.2, 0.4);
  thump(30.0, 0.4, 55);
  // the beam, the gate, the ions, the voltage, the spikes
  { const n = noise(GATE_LIGHT, 2.4, 'lowpass', 600), g = gain(0); n.frequency.exponentialRampToValueAtTime(3500, GATE_LIGHT + 0.15); n.connect(g); g.connect(fx); g.connect(revIn); g.gain.setValueAtTime(0, GATE_LIGHT); g.gain.linearRampToValueAtTime(0.14, GATE_LIGHT + 0.05); g.gain.exponentialRampToValueAtTime(0.02, GATE_LIGHT + 2.3); g.gain.linearRampToValueAtTime(0, GATE_LIGHT + 2.4); }
  impact(GATE_LIGHT, 0.6); bell(GATE_LIGHT, 86, 0.05, 1.2);
  tick(GATE_OPEN, 0.3, 420); tick(GATE_OPEN + 0.035, 0.22, 360); thump(GATE_OPEN, 0.3, 90);
  for (let i = 0; i < 70; i++) { const t = GATE_OPEN + 0.12 + R() * 3.2; tick(t, 0.02 + R() * 0.025, 3000 + R() * 3000, (R() - 0.5) * 1.4); }
  { const o = osc('sine', 180, GATE_OPEN + 0.15, 33.4), g = gain(0); o.frequency.exponentialRampToValueAtTime(720, 33.3); o.connect(g); g.connect(fx); g.gain.setValueAtTime(0, GATE_OPEN + 0.15); g.gain.linearRampToValueAtTime(0.045, GATE_OPEN + 0.6); g.gain.setValueAtTime(0.045, 33.25); g.gain.linearRampToValueAtTime(0, 33.4); }
  for (const s of GATE_SPIKES) { tick(s, 0.22, 2600); thump(s, 0.35, 100); }
  impact(GATE_SPIKES[0], 0.45);
  whoosh(36.0, 0.22, 0.3);
  // 2005: pack, fly, drop, then the gates appear one per sixteenth
  { const n = noise(PACK, 0.4, 'highpass', 800), g = gain(0); n.frequency.exponentialRampToValueAtTime(9000, PACK + 0.35); n.connect(g); g.connect(fx); env(g.gain, PACK, 0.08, 0.3, 0.08); }
  { const n = noise(FLY[0], FLY[1] - FLY[0] + 0.1, 'bandpass', 500, 1.5), g = gain(0); n.frequency.exponentialRampToValueAtTime(4000, FLY[1] - 0.1); n.connect(g); g.connect(fx); g.gain.setValueAtTime(0, FLY[0]); g.gain.linearRampToValueAtTime(0.14, FLY[1] - 0.05); g.gain.linearRampToValueAtTime(0, FLY[1] + 0.05); }
  riser(36.0, DROP, 0.13);
  impact(DROP, 1.0); crash(DROP, 0.12);
  CHANNEL_TIMES.forEach((t, i) => blip(t, midi(PENTA[i % PENTA.length] + 12), 0.045, 1.0));
  { const o = osc('sawtooth', 160, 41.1, 41.8), f = ctx.createBiquadFilter(), g = gain(0); o.frequency.linearRampToValueAtTime(320, 41.7); f.type = 'bandpass'; f.frequency.value = 900; o.connect(f); f.connect(g); g.connect(fx); g.gain.setValueAtTime(0, 41.1); g.gain.linearRampToValueAtTime(0.03, 41.2); g.gain.linearRampToValueAtTime(0, 41.75); }
  // each light pulse is a percussion hit: the flash (high) and the spike it causes (a click and a thump)
  for (const p of PULSES) {
    const n = chordAt(p)[PULSES.indexOf(p) % 3] + 24, onBeat = Math.abs(p / BEAT - Math.round(p / BEAT)) < 1e-6;
    blip(p, midi(n), 0.035, 1.0); tick(p + 0.004, 0.1, 3200);
    if (!onBeat) thump(p + 0.004, 0.14, 120); // on the beat the kick already lands there
  }
  riser(46.0, AMBER_ON, 0.1);
  // the brake: tape stop on everything musical
  impact(AMBER_ON, 0.45);
  swell(50.2, 51.0, 0.2);
  impact(51.0, 0.95); crash(51.0, 0.1);
  // clinic and end
  whoosh(56.0, 0.15, 0.5);
  { const o = osc('sine', 200, GOGGLES_ON, GOGGLES_ON + 0.8), g = gain(0); o.frequency.exponentialRampToValueAtTime(800, GOGGLES_ON + 0.5); o.connect(g); g.connect(fx); g.connect(revIn); env(g.gain, GOGGLES_ON, 0.04, 0.2, 0.5); }
  for (const [n, d] of [[77, 0], [81, 0.1], [84, 0.2], [89, 0.3]] as const) bell(RETINA_ON + d, n, 0.03, 1.6);
  OBJECTS.forEach((t, i) => { bell(t, 86 + i * 3, 0.04, 1.4); });
  riser(59.0, 60.0, 0.12);
  impact(60.0, 0.9); crash(60.0, 0.09); for (const [n, a] of [[77, 0.05], [81, 0.04], [86, 0.03]] as const) bell(60.0, n, a, 2.6);
  for (const t of END_FIRE.slice(1)) { tick(t, 0.1, 2400); blip(t, 900, 0.04, 1.6); }
  pop(CTA.at, 520, 0.14); CTA.chips.forEach((_, i) => pop(CTA.at + 0.5 + i * BEAT, 600 + i * 120, 0.09));

  // ---- automation, applied in time order ----
  // section gain: a one-beat silence after the zap; the tape stop fades the music out
  section.gain.setValueAtTime(1, 0);
  section.gain.setValueAtTime(1, ZAP); section.gain.linearRampToValueAtTime(0, ZAP + 0.02); section.gain.setValueAtTime(0, 14.99); section.gain.linearRampToValueAtTime(1, 15.0);
  section.gain.setValueAtTime(1, AMBER_ON); section.gain.linearRampToValueAtTime(0, AMBER_ON + 0.55); section.gain.setValueAtTime(0, 50.98); section.gain.linearRampToValueAtTime(1, 51.0);
  pitch.offset.setValueAtTime(0, AMBER_ON); pitch.offset.linearRampToValueAtTime(-2400, AMBER_ON + 0.55); pitch.offset.setValueAtTime(0, 50.9);
  // filter: closes when the light goes off, opens over the build, warm in the clinic
  const F: [number, number, 'set' | 'exp'][] = [
    [0, 18000, 'set'], [2.0, 18000, 'set'], [2.15, 600, 'exp'], [3.5, 600, 'set'], [3.53, 18000, 'exp'], [4.5, 18000, 'set'], [5.95, 1400, 'exp'], [6.0, 18000, 'set'],
    [22.4, 18000, 'set'], [22.6, 3800, 'exp'], [27.0, 3800, 'set'], [27.5, 9000, 'exp'], [30.0, 9000, 'set'], [30.1, 2200, 'exp'], [31.0, 2200, 'set'], [31.1, 18000, 'exp'],
    [36.0, 800, 'set'], [DROP - 0.02, 18000, 'exp'], [AMBER_ON, 18000, 'set'], [AMBER_ON + 0.5, 300, 'exp'], [51.0, 18000, 'set'],
    [53.5, 18000, 'set'], [53.65, 600, 'exp'], [54.5, 600, 'set'], [54.53, 18000, 'exp'], [56.0, 18000, 'set'], [56.3, 6500, 'exp'], [60.0, 18000, 'set'],
  ];
  for (const [t, v, kind] of F) kind === 'set' ? lp.frequency.setValueAtTime(v, t) : lp.frequency.exponentialRampToValueAtTime(v, t);
  // sidechain: the music ducks under every kick
  ducks.sort((a, b) => a - b).forEach((t) => { duck.gain.setTargetAtTime(0.42, t, 0.004); duck.gain.setTargetAtTime(1, t + 0.035, 0.07); });

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
