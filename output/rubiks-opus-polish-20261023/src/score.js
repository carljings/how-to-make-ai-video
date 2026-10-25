// score.js — the original soundtrack, synthesized offline with Web Audio from the same timeline as the picture.
// 120 BPM in D minor; one arc for the whole film (build → drop on “20” → breakdown → drive → resolve to D major).
// No samples: drums are shaped noise and sine sweeps, bass is saw + sine, keys are FM, the reverb is generated noise.
// Every GainNode starts at 0 before its envelope (no clicks); no DynamicsCompressor (loudness is set in mastering).
import { CUE, DURATION, SHELL_TIMES } from './timeline.js';
import { allTurns, S } from './seqs.js';
import { rng } from './lib/core.js';

const SR = 48000;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
let ctx, bus, music, sfx, revIn, NOISE, R;

function env(g, t, a, peak, d, sustain = 0, rel = 0.05, hold = 0) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (sustain > 0) { g.gain.setTargetAtTime(peak * sustain, t + a, d / 3); g.gain.setValueAtTime(peak * sustain, t + a + hold); g.gain.linearRampToValueAtTime(0, t + a + hold + rel); }
  else g.gain.setTargetAtTime(0, t + a, d / 4);
}
function out(dest, pan = 0, send = 0) {
  const g = ctx.createGain(); g.gain.value = 0;
  const p = ctx.createStereoPanner(); p.pan.value = pan;
  g.connect(p); p.connect(dest);
  if (send > 0) { const s = ctx.createGain(); s.gain.value = send; p.connect(s); s.connect(revIn); }
  return g;
}
function noise(t, dur, offset = null) {
  const s = ctx.createBufferSource(); s.buffer = NOISE; s.loop = true; s.start(t, offset ?? R() * 1.5, dur + 0.05); return s;
}
function filt(type, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

// ── drums ──
function kick(t, v = 1) {
  const o = ctx.createOscillator(), g = out(music, 0, 0.05);
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.09); o.frequency.exponentialRampToValueAtTime(38, t + 0.4);
  o.connect(g); env(g, t, 0.002, 0.95 * v, 0.42); o.start(t); o.stop(t + 0.6);
  const n = noise(t, 0.02), hp = filt('highpass', 2500), g2 = out(music); n.connect(hp); hp.connect(g2); env(g2, t, 0.001, 0.25 * v, 0.02);
}
function snare(t, v = 1) {
  const n = noise(t, 0.3), bp = filt('bandpass', 1900, 0.8), g = out(music, 0.05, 0.22); n.connect(bp); bp.connect(g); env(g, t, 0.001, 0.42 * v, 0.2);
  const o = ctx.createOscillator(), g2 = out(music); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08); o.connect(g2); env(g2, t, 0.001, 0.3 * v, 0.09); o.start(t); o.stop(t + 0.2);
}
function clap(t, v = 1) {
  for (const [dt, a] of [[0, 0.6], [0.011, 0.7], [0.023, 1]]) {
    const n = noise(t + dt, 0.22), bp = filt('bandpass', 1300, 1.1), g = out(music, -0.05, 0.3); n.connect(bp); bp.connect(g); env(g, t + dt, 0.001, 0.32 * a * v, dt === 0.023 ? 0.2 : 0.012);
  }
}
function hat(t, v = 1, open = false, pan = 0.2) {
  const n = noise(t, open ? 0.3 : 0.06), hp = filt('highpass', 7600), g = out(music, pan, 0.04); n.connect(hp); hp.connect(g); env(g, t, 0.001, 0.13 * v, open ? 0.22 : 0.035);
}
function tom(t, f = 110, v = 1) {
  const o = ctx.createOscillator(), g = out(music, 0, 0.2); o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); o.connect(g); env(g, t, 0.002, 0.7 * v, 0.35); o.start(t); o.stop(t + 0.6);
}
function impact(t, v = 1) {
  const o = ctx.createOscillator(), g = out(music, 0, 0.35);
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2); o.connect(g); env(g, t, 0.003, 1.0 * v, 1.6); o.start(t); o.stop(t + 2.2);
  const n = noise(t, 1.2), lp = filt('lowpass', 2400), g2 = out(music, 0, 0.6); n.connect(lp); lp.connect(g2); env(g2, t, 0.002, 0.5 * v, 0.9);
  kick(t, v);
}
function riser(t0, t1, v = 1) {
  const n = noise(t0, t1 - t0 + 0.1), bp = filt('bandpass', 400, 2), g = out(music, 0, 0.3);
  bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7000, t1);
  n.connect(bp); bp.connect(g); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.22 * v, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1 + 0.03);
}
function swell(t0, t1, v = 1) { // reverse cymbal
  const n = noise(t0, t1 - t0 + 0.1), hp = filt('highpass', 3000), g = out(music, 0, 0.5);
  n.connect(hp); hp.connect(g); g.gain.setValueAtTime(0, t0); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.2 * v, t1); g.gain.linearRampToValueAtTime(0, t1 + 0.02);
}
function whoosh(t, dur = 0.5, v = 1) {
  const n = noise(t, dur), bp = filt('bandpass', 600, 1.4), g = out(sfx, 0, 0.3);
  bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
  n.connect(bp); bp.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25 * v, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
}

// ── tonal ──
function bass(t, n, dur, v = 1) {
  const o = ctx.createOscillator(), s = ctx.createOscillator(), lp = filt('lowpass', 900, 2), g = out(music);
  o.type = 'sawtooth'; o.frequency.value = midi(n); s.frequency.value = midi(n);
  lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, 0.35));
  o.connect(lp); lp.connect(g);
  const gs = ctx.createGain(); gs.gain.value = 0.9; s.connect(gs); gs.connect(g);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.27 * v, t + 0.006); g.gain.setTargetAtTime(0.19 * v, t + 0.01, 0.08); g.gain.setValueAtTime(0.19 * v, t + dur - 0.03); g.gain.linearRampToValueAtTime(0, t + dur);
  o.start(t); s.start(t); o.stop(t + dur + 0.05); s.stop(t + dur + 0.05);
}
function pluck(t, n, v = 1, pan = 0, dec = 0.28) { // FM pluck, marimba-ish
  const f = midi(n), c = ctx.createOscillator(), m = ctx.createOscillator(), d = ctx.createGain(), g = out(music, pan, 0.28);
  c.frequency.value = f; m.frequency.value = f * 2; d.gain.setValueAtTime(f * 2.2, t); d.gain.exponentialRampToValueAtTime(f * 0.05, t + dec);
  m.connect(d); d.connect(c.frequency); c.connect(g); env(g, t, 0.003, 0.085 * v, dec);
  c.start(t); m.start(t); c.stop(t + dec * 2 + 0.1); m.stop(t + dec * 2 + 0.1);
}
function bell(t, n, v = 1, pan = 0, dec = 2.0) {
  const f = midi(n), c = ctx.createOscillator(), m = ctx.createOscillator(), d = ctx.createGain(), g = out(music, pan, 0.5);
  c.frequency.value = f; m.frequency.value = f * 3.5; d.gain.setValueAtTime(f * 1.6, t); d.gain.exponentialRampToValueAtTime(1, t + dec * 0.6);
  m.connect(d); d.connect(c.frequency); c.connect(g); env(g, t, 0.003, 0.07 * v, dec);
  c.start(t); m.start(t); c.stop(t + dec * 1.5); m.stop(t + dec * 1.5);
}
function pad(t0, t1, notes, v = 1, cutoff = 1800, att = 0.6, rel = 1.2) {
  notes.forEach((n, i) => {
    const lp = filt('lowpass', cutoff * 0.5, 0.5), g = out(music, (i % 2 ? 1 : -1) * 0.35, 0.45);
    lp.frequency.setValueAtTime(cutoff * 0.4, t0); lp.frequency.linearRampToValueAtTime(cutoff, t0 + att + 0.4);
    lp.connect(g);
    for (const dt of [-9, 9]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = dt; o.connect(lp); o.start(t0); o.stop(t1 + rel + 0.1); }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.022 * v, t0 + att); g.gain.setValueAtTime(0.022 * v, t1); g.gain.linearRampToValueAtTime(0, t1 + rel);
  });
}
function sub(t0, t1, n, v = 1) {
  const o = ctx.createOscillator(), g = out(music); o.frequency.value = midi(n); o.connect(g);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.3 * v, t0 + 0.05); g.gain.setValueAtTime(0.3 * v, t1 - 0.2); g.gain.linearRampToValueAtTime(0, t1);
  o.start(t0); o.stop(t1 + 0.05);
}

// ── sound effects ──
function turnClick(t, q, v = 1) {
  const n = noise(t, 0.05), bp = filt('bandpass', 2600 + R() * 1800, 1.6), g = out(sfx, (R() - 0.5) * 0.5, 0.06);
  n.connect(bp); bp.connect(g); env(g, t, 0.001, 0.2 * v, q === 2 ? 0.05 : 0.028);
  const n2 = noise(t + 0.004, 0.03), lp = filt('lowpass', 700), g2 = out(sfx); n2.connect(lp); lp.connect(g2); env(g2, t + 0.004, 0.001, 0.18 * v, 0.02);
}
function tick(t, v = 1, f = 3400) {
  const o = ctx.createOscillator(), g = out(sfx, 0, 0.1); o.type = 'square'; o.frequency.value = f; o.connect(g); env(g, t, 0.0005, 0.035 * v, 0.012); o.start(t); o.stop(t + 0.05);
}
function flap(t, v = 1) { const n = noise(t, 0.04), bp = filt('bandpass', 1500, 2), g = out(sfx, 0, 0.1); n.connect(bp); bp.connect(g); env(g, t, 0.001, 0.3 * v, 0.025); }
function beep(t, f = 1000, dur = 0.12, v = 1) { const o = ctx.createOscillator(), g = out(sfx, 0, 0.15); o.frequency.value = f; o.connect(g); env(g, t, 0.004, 0.08 * v, dur, 0.8, 0.03, dur); o.start(t); o.stop(t + dur + 0.1); }

// ── harmony ──
const CH = { Dm: [62, 65, 69], Bb: [58, 62, 65], F: [60, 65, 69], C: [60, 64, 67], Gm: [62, 67, 70], A: [61, 64, 69], D: [62, 66, 69] };
const BASS = { Dm: 38, Bb: 34, F: 41, C: 36, Gm: 43, A: 33, D: 38 };
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
function arp(t0, bars, prog, { v = 1, oct = 12, step = 0.125, pan = 0.25, skip = 0 } = {}) {
  const end = t0 + bars * 2;
  for (let b = 0; b < bars; b++) {
    const ch = CH[prog[b % prog.length]], tones = [...ch, ch[0] + 12];
    for (let i = 0; i < 16; i++) { if (skip && i % skip === skip - 1) continue; const t = t0 + b * 2 + i * step; if (step * i >= 2 || t >= end) break; pluck(t, tones[ARP[i % 8]] + oct, v * (i % 4 === 0 ? 1 : 0.7), (i % 2 ? 1 : -1) * pan); }
  }
}
function bassline(t0, bars, prog, pattern = 'eighths', v = 1) {
  for (let b = 0; b < bars; b++) {
    const n = BASS[prog[b % prog.length]], tb = t0 + b * 2;
    if (pattern === 'eighths') for (let i = 0; i < 16; i++) { if (i % 2 === 0) bass(tb + i * 0.125, n + (i % 8 === 6 ? 12 : 0), 0.22, v * (i % 4 === 0 ? 1 : 0.8)); }
    else if (pattern === 'offbeat') for (let i = 0; i < 4; i++) bass(tb + i * 0.5 + 0.25, n, 0.22, v);
    else if (pattern === 'pulse') for (let i = 0; i < 4; i++) bass(tb + i * 0.5, n, 0.42, v * (i === 0 ? 1 : 0.7));
    else if (pattern === 'long') bass(tb, n, 1.9, v);
  }
}
function drums(t0, bars, { kickP = 'four', clapOn = true, hats = 8, hv = 1, kv = 1, open = true } = {}) {
  const end = t0 + bars * 2;
  for (let b = 0; b < bars; b++) {
    const tb = t0 + b * 2;
    for (let i = 0; i < 4; i++) {
      const tbeat = tb + i * 0.5;
      if (tbeat >= end) continue;
      if (kickP === 'four' || (kickP === 'half' && (i === 0)) || (kickP === 'two' && (i === 0 || i === 2))) kick(tbeat, kv);
      if (clapOn && (i === 1 || i === 3)) { if (kickP === 'half') { if (i === 3) snare(tbeat, 0.8); } else clap(tbeat); }
    }
    if (hats) for (let i = 0; i < hats; i++) { const th = tb + (i * 2) / hats; if (th < end) hat(th, hv * (i % 2 ? 1 : 0.6), open && hats === 8 && i % 2 === 1 && i % 4 === 3); }
  }
}

export async function renderScore() {
  R = rng(4325);
  ctx = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = new Float32Array(SR * 2), r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; NOISE.copyToChannel(d, 0); }
  bus = ctx.createGain(); bus.gain.value = 0.8; bus.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 1; music.connect(bus);
  sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(bus);
  // reverb
  const conv = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.4, SR), r2 = rng(21);
  for (let c = 0; c < 2; c++) { const d = new Float32Array(SR * 2.4); for (let i = 0; i < d.length; i++) d[i] = (r2() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); ir.copyToChannel(d, c); }
  conv.buffer = ir; revIn = ctx.createGain(); revIn.gain.value = 0.5; revIn.connect(conv); const rv = ctx.createGain(); rv.gain.value = 0.55; conv.connect(rv); rv.connect(bus);

  const C = CUE;
  // ── 0 · cold open: ticking hats into the impact at 2.5
  for (let i = 0; i < 20; i++) hat(i * 0.125, 0.4 + i * 0.03, false, i % 2 ? 0.3 : -0.3);
  for (let i = 0; i < 5; i++) kick(i * 0.5, 0.45);
  riser(0.2, C.solveEnd, 1.1); sub(0, C.solveEnd, 38, 0.5);
  impact(C.solveEnd, 1); pad(C.solveEnd, 8, [50, 57, 62, 65], 1.2, 1400, 0.05, 0.4);
  bassline(4, 2, ['Dm', 'Bb'], 'eighths', 0.9); drums(4, 2, { hats: 8 }); arp(4, 2, ['Dm', 'Bb'], { v: 0.8 });
  bass(3.0, 38, 1.0, 0.8); for (let i = 0; i < 4; i++) snare(3.0 + i * 0.25, 0.3 + i * 0.12);
  for (let i = 0; i < 6; i++) flap(C.board + 0.12 + i * 0.11 + (i === 5 ? 0.35 : 0), 0.8);
  impact(C.why, 0.75); swell(C.why + 0.2, C.tiles, 1);
  tom(C.tiles, 98); tom(C.tiles + 0.25, 82); tom(C.tiles + 0.5, 65, 1.1); whoosh(C.origin - 0.35, 0.4, 0.8);
  // ── 1 · origin: lighter keys
  const pO = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb'];
  const originBars = (C.count - C.origin) / 2;
  arp(C.origin, originBars, pO, { v: 1.2, step: 0.25 }); arp(C.origin + 4, originBars - 2, pO.slice(2), { v: 0.45, oct: 24, step: 0.125, skip: 2 }); bassline(C.origin, originBars, pO, 'long', 0.8);
  for (let b = 0; b < originBars; b++) { kick(C.origin + b * 2, 0.7); kick(C.origin + b * 2 + 1, 0.5); if (b >= 2) clap(C.origin + b * 2 + 1.5, 0.5); for (let i = 0; i < 8; i++) hat(C.origin + b * 2 + i * 0.25, 0.45); }
  pad(C.origin, C.count, [50, 57, 62], 0.7, 1200, 1.5, 1);
  for (let i = 0; i < 12; i++) tick(C.y1975 + 0.15 + i * 0.07, 0.6, 2600); // parts separating
  riser(C.y1980 - 0.6, C.y1980 + 0.35, 0.6); bell(C.y1980 + 0.4, 74, 1.2); bell(C.y1980 + 0.4, 81, 0.8, 0.3);
  whoosh(C.wall, 1.8, 0.9); swell(C.count - 1, C.count, 0.8);
  // ── 2 · 4325 亿亿
  const pC = ['Dm', 'Dm', 'Bb', 'Bb', 'F', 'F', 'C', 'C', 'Dm', 'Dm', 'Bb'];
  drums(C.count, 2, { kickP: 'two', hats: 8, hv: 0.8 }); bassline(C.count, 2, pC, 'pulse', 0.8); arp(C.count, 2, pC, { v: 0.7 });
  impact(C.explode, 0.7);
  drums(C.explode, 9, { hats: 8, hv: 0.9 }); bassline(C.explode, 9, pC.slice(2), 'eighths', 0.9); arp(C.explode, 9, pC.slice(2), { v: 0.8 });
  for (const tc of [C.f8, C.f3, C.f12, C.f2]) { bell(tc, 74, 0.9); bell(tc, 81, 0.6, 0.2); }
  for (let i = 0; i < 16; i++) snare(C.par + i * 0.125, 0.25 + i * 0.045); riser(C.par, C.total, 0.9);
  impact(C.total, 1.2); pad(C.total, C.twenty - 0.5, [50, 57, 62, 64, 69], 1.3, 2200, 0.05, 1.2); sub(C.total, C.years, 38, 0.8);
  for (let i = 0; i < 12; i++) bell(C.years + 0.4 + i * 0.16, [69, 72, 74, 76, 77, 81][i % 6] + (i > 5 ? 12 : 0), 0.35, (i % 2 ? 0.4 : -0.4), 0.8);
  riser(C.twenty - 1.5, C.twenty, 0.8);
  // ── 3 · 20
  pad(C.twenty, C.bounds, [50, 57, 62, 65], 0.9, 1100, 1, 1);
  for (let b = 0; b < (C.bounds - C.twenty) / 2; b++) { const tb = C.twenty + b * 2; kick(tb, 0.85); kick(tb + 0.25, 0.55); kick(tb + 1, 0.6); kick(tb + 1.25, 0.4); bass(tb, 38, 1.0, 0.75); for (let i = 0; i < 4; i++) hat(tb + 0.25 + i * 0.5, 0.45, false, 0.35); }
  for (let d = 1; d <= 15; d++) pluck(SHELL_TIMES[d - 1], [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89, 91, 93, 96][d - 1], 0.9, (d % 2 ? 0.3 : -0.3), 0.5);
  swell(C.outer, C.bounds, 1);
  const pB = ['Dm', 'Bb', 'Gm', 'A', 'Dm'];
  drums(C.bounds, 2, { kickP: 'four', hats: 8, hv: 0.7, clapOn: false }); bassline(C.bounds, 2, pB, 'eighths', 0.8); arp(C.bounds, 2, pB, { v: 0.6 });
  bass(C.bounds + 4, 34, 0.5, 0.8);
  impact(C.superflip, 0.6); pad(C.superflip, C.gap, [58, 62, 65], 0.8, 1500, 0.3, 0.6);
  bell(S.superflip.times[19][1], 81, 1.2); bell(S.superflip.times[19][1], 74, 0.9);
  drums(C.gap, 1, { hats: 16, hv: 0.6, clapOn: false }); bassline(C.gap, 1, ['Gm'], 'eighths', 0.8); arp(C.gap + 1.5, 1, ['A'], { v: 0.6 });
  bass(C.gap + 2, 33, 0.5, 0.9);
  const pP = ['Dm', 'Bb', 'Gm', 'A'];
  drums(C.proof, 4, { hats: 16, hv: 0.8 }); bassline(C.proof, 4, pP, 'eighths', 1); arp(C.proof, 4, pP, { v: 0.8 });
  for (let i = 0; i < 16; i++) snare(C.slam - 2 + i * 0.125, 0.25 + i * 0.05);
  riser(C.slam - 2, C.slam - 0.06, 1.2);
  // DROP
  impact(C.slam, 1.5); pad(C.slam, C.human, [50, 57, 62, 65, 69], 1.3, 2600, 0.05, 1);
  const pD = ['Dm', 'Bb', 'F', 'C'];
  drums(C.slam, 4, { hats: 16, hv: 1, kv: 1.1 }); bassline(C.slam, 4, pD, 'eighths', 1.1); arp(C.slam, 4, pD, { v: 0.9 });
  const lead = [74, 77, 81, 79, 77, 76, 74, 72, 74, 77, 81, 84, 81, 79, 77, 76];
  lead.forEach((n, i) => bell(C.slam + i * 0.5, n, 0.9, 0, 0.9));
  // ── 4 · 2.51: half-time breakdown
  const pH = ['Bb', 'F', 'Gm', 'A', 'Bb', 'F'];
  impact(C.human + 0.85, 0.7);
  drums(C.human, 6, { kickP: 'half', hats: 4, hv: 0.6 }); bassline(C.human, 6, pH, 'long', 0.8); pad(C.human, C.methods, [58, 62, 65], 0.9, 1300, 1, 1);
  for (let i = 0; i < 5; i++) flap(C.ao5 + 0.2 + i * 0.12, 0.8);
  whoosh(C.trim + 0.45, 0.5, 0.8); bell(C.merge + 0.45, 81, 1); bell(C.merge + 0.45, 74, 0.8);
  for (let i = 0; i < 15; i++) tick(C.inspect + 0.2 + (i / 15) * 1.55, 0.9, 2900);
  // ── 5 · methods: drive
  const pM = ['Dm', 'Bb', 'F', 'C'];
  const methodBars = (C.race - C.methods) / 2;
  drums(C.methods, methodBars, { hats: 16, hv: 0.7 }); bassline(C.methods, methodBars, pM, 'offbeat', 0.9); arp(C.methods, methodBars, pM, { v: 0.6, skip: 4 });
  for (let i = 0; i < 4; i++) bell(C.methods + i * 0.5, [74, 77, 81, 86][i], 0.7);
  for (const e of [...S.lblStageEnds, ...S.cfopStageEnds, ...S.rouxStageEnds]) bell(e, 86, 0.45, 0.3, 0.7);
  riser(C.tri, C.triHit, 1); impact(C.triHit, 1);
  // ── 6 · the race
  pad(C.race, C.rule, [50, 57, 62, 65], 0.9, 900, 0.5, 0.3);
  for (let i = 0; i < (C.rule - C.race) / 0.25; i++) bass(C.race + i * 0.25, 38, 0.2, 0.55);
  for (let i = 0; i < (C.rule - C.race) / 0.125; i++) tick(C.race + i * 0.125, 0.35, 5200);
  drums(C.race, (C.rule - C.race) / 2, { kickP: 'half', hats: 8, hv: 0.7, clapOn: false }); arp(C.race, (C.rule - C.race) / 2, ['Dm', 'Dm', 'Bb'], { v: 0.55, oct: 0 }); riser(C.rule - 1, C.rule - 0.02, 0.8);
  for (let i = 0; i < 5; i++) flap(C.r2 + 0.2 + i * 0.12, 0.8);
  bell(C.r2 + 1.0, 86, 0.8); bell(C.r2 + 1.0, 93, 0.5);
  impact(C.rule, 1.1); whoosh(C.rule + 0.35, 0.6, 1);
  const pR = ['Dm', 'Bb', 'Gm', 'A'];
  drums(C.rule + 1, (C.final - C.rule - 1) / 2, { kickP: 'two', hats: 8, hv: 0.6 }); bassline(C.rule + 1, 1, pR, 'pulse', 0.8);
  bell(C.r2avg + 0.45, 74, 0.9);
  drums(C.final, 3, { hats: 8, hv: 0.8 }); bassline(C.final, 3, pR, 'eighths', 0.9); arp(C.final, 3, pR, { v: 0.6 });
  for (let i = 0; i < 10; i++) flap(C.final + 0.2 + (i % 5) * 0.08 + (i >= 5 ? 0.2 : 0), 0.6);
  whoosh(C.finalTrim, 0.5, 0.7); impact(C.finalAvg, 0.8);
  const recentBars = (C.ending - C.recent) / 2;
  drums(C.recent, recentBars, { hats: 16, hv: 0.9 }); bassline(C.recent, recentBars, ['Gm', 'A'], 'eighths', 1); arp(C.recent, recentBars, ['Gm', 'A'], { v: 0.8 });
  for (let i = 0; i < 4; i++) tom(C.recent + 0.1 + i * 0.32, 120 - i * 12, 0.6);
  for (let i = 0; i < 8; i++) snare(C.ending - 1 + i * 0.125, 0.3 + i * 0.07);
  // ── 7 · ending: resolve to D major
  impact(C.ending, 0.8); pad(C.ending, C.chord, [50, 57, 62, 66], 1.1, 1800, 0.3, 0.8);
  arp(C.ending, 1, ['D'], { v: 0.6, step: 0.25 }); bassline(C.ending, 1, ['D'], 'long', 0.8);
  bass(C.ending + 2, 34, 1.0, 0.7); bass(C.ending + 2.5 + 0.5, 36, 0.5, 0.7);
  // final chord
  sub(C.chord, C.end - 0.5, 38, 0.9); pad(C.chord, C.reset + 1.2, [50, 57, 62, 66, 69, 74], 1.5, 2400, 0.04, 3.2);
  for (const [n, d] of [[74, 0], [78, 0.08], [81, 0.16], [86, 0.24]]) bell(C.chord + d, n, 1, (d - 0.12) * 3, 3);
  kick(C.chord, 1); swell(C.chord - 0.5, C.chord, 0.6);
  beep(C.reset, 1200, 0.08, 0.6); bell(C.reset + 1.0, 86, 0.5, 0, 2.5);
  // ── all turn clicks
  for (const tr of allTurns()) turnClick(tr.t + 0.005, tr.q, tr.gain);
  // the opening timer start beep
  beep(0, 1500, 0.05, 0.5);

  bus.gain.setValueAtTime(0.8, C.fade);
  bus.gain.linearRampToValueAtTime(0, C.end - 0.01);

  const buf = await ctx.startRendering();
  return buf;
}

// 16-bit PCM WAV
export function wav(buf) {
  const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, ch, true); out.setUint32(24, SR, true); out.setUint32(28, SR * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => { const d = new Float32Array(n); buf.copyFromChannel(d, c); return d; });
  let peak = 0; for (const d of data) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const g = peak > 0.98 ? 0.98 / peak : 1;
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i] * g)); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return { bytes: new Uint8Array(out.buffer), peak, gain: g };
}
