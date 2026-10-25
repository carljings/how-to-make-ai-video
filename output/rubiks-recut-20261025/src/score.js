// score.js — the original soundtrack, synthesized offline with Web Audio from the same timeline as the picture.
// 120 BPM in D minor; one arc for the whole film (build → drop on “20” → breakdown → drive → resolve to D major).
// No samples: drums are shaped noise and sine sweeps, bass is saw + sine, keys are FM, the reverb is generated noise.
// Every GainNode starts at 0 before its envelope (no clicks); no DynamicsCompressor (loudness is set in mastering).
import { CUE, DURATION } from './timeline.js';
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
function turnClick(t, q, v = 1, pan = null) {
  const n = noise(t, 0.05), bp = filt('bandpass', 2600 + R() * 1800, 1.6);
  const defaultPan = (R() - 0.5) * 0.5;
  const g = out(sfx, pan ?? defaultPan, 0.06);
  n.connect(bp); bp.connect(g); env(g, t, 0.001, 0.2 * v, q === 2 ? 0.05 : 0.028);
  const n2 = noise(t + 0.004, 0.03), lp = filt('lowpass', 700), g2 = out(sfx, pan ?? 0); n2.connect(lp); lp.connect(g2); env(g2, t + 0.004, 0.001, 0.18 * v, 0.02);
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
  for (let b = 0; b < bars; b++) {
    const ch = CH[prog[b % prog.length]], tones = [...ch, ch[0] + 12];
    for (let i = 0; i < 16; i++) { if (skip && i % skip === skip - 1) continue; const t = t0 + b * 2 + i * step; if (step * i >= 2) break; pluck(t, tones[ARP[i % 8]] + oct, v * (i % 4 === 0 ? 1 : 0.7), (i % 2 ? 1 : -1) * pan); }
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
  for (let b = 0; b < bars; b++) {
    const tb = t0 + b * 2;
    for (let i = 0; i < 4; i++) {
      const tbeat = tb + i * 0.5;
      if (kickP === 'four' || (kickP === 'half' && (i === 0)) || (kickP === 'two' && (i === 0 || i === 2))) kick(tbeat, kv);
      if (clapOn && (i === 1 || i === 3)) { if (kickP === 'half') { if (i === 3) snare(tbeat, 0.8); } else clap(tbeat); }
    }
    if (hats) for (let i = 0; i < hats; i++) { const th = tb + (i * 2) / hats; hat(th, hv * (i % 2 ? 1 : 0.6), open && hats === 8 && i % 2 === 1 && i % 4 === 3); }
  }
}

export async function renderScore() {
  R = rng(4325);
  ctx = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR);
  NOISE = ctx.createBuffer(1, SR * 2, SR);
  { const d = NOISE.getChannelData(0), r = rng(9); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  bus = ctx.createGain(); bus.gain.value = 0.8; bus.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 1; music.connect(bus);
  sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(bus);
  // reverb
  const conv = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.4, SR), r2 = rng(21);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (r2() * 2 - 1) * Math.pow(1 - i / d.length, 3.2); }
  conv.buffer = ir; revIn = ctx.createGain(); revIn.gain.value = 0.5; revIn.connect(conv); const rv = ctx.createGain(); rv.gain.value = 0.55; conv.connect(rv); rv.connect(bus);

  const C = CUE;
  // Fade the reverb and every instrument together with the final picture.
  bus.gain.setValueAtTime(0.8, C.fade);
  bus.gain.linearRampToValueAtTime(0, C.end);
  // ── 0 · cold open: ticking hats into the impact at 2.5
  for (let i = 0; i < 20; i++) hat(i * 0.125, 0.4 + i * 0.03, false, i % 2 ? 0.3 : -0.3);
  for (let i = 0; i < 5; i++) kick(i * 0.5, 0.45);
  riser(0.2, C.solveEnd, 1.1); sub(0, C.solveEnd, 38, 0.5);
  impact(C.solveEnd, 1); pad(C.solveEnd, C.why, [50, 57, 62, 65], 1.2, 1400, 0.05, 0.4);
  bassline(4, 1, ['Dm'], 'eighths', 0.9); drums(4, 1, { hats: 8 }); arp(4, 1, ['Dm'], { v: 0.8 });
  bass(3.0, 38, 1.0, 0.8); for (let i = 0; i < 4; i++) snare(3.0 + i * 0.25, 0.3 + i * 0.12);
  pad(C.why, C.origin, [50, 57, 62, 64], 0.8, 1200, 0.2, 0.5);
  bassline(C.why, (C.origin - C.why) / 2, ['Dm', 'Bb'], 'pulse', 0.55);
  drums(C.why, (C.origin - C.why) / 2, { kickP: 'half', hats: 4, hv: 0.35, clapOn: false });
  swell(C.origin - 1, C.origin, 0.6); whoosh(C.origin - 0.35, 0.4, 0.65);
  // ── 1 · origin: lighter keys
  const pO = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb'];
  arp(C.origin, 6, pO, { v: 1.2, step: 0.25 }); arp(C.origin + 4, 4, pO.slice(2), { v: 0.45, oct: 24, step: 0.125, skip: 2 }); bassline(C.origin, 6, pO, 'long', 0.8);
  for (let b = 0; b < 6; b++) { kick(C.origin + b * 2, 0.7); kick(C.origin + b * 2 + 1, 0.5); if (b >= 2) clap(C.origin + b * 2 + 1.5, 0.5); for (let i = 0; i < 8; i++) hat(C.origin + b * 2 + i * 0.25, 0.45); }
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
  // ── 3 · 20: two searches answer each other, then the full proof gathers momentum.
  pad(C.twenty, C.shells, [50, 57, 62, 65], 0.75, 1000, 0.6, 0.6);
  for (let t = C.twenty; t < C.shells; t += 1) { kick(t, 0.55); kick(t + 0.25, 0.28); }
  for (let t = C.twenty; t < C.shells; t += 2) bass(t, 38, Math.min(1.7, C.shells - t - 0.05), 0.55);
  pad(C.shells, C.searchMeet, [50, 57, 62, 65], 0.75, 1250, 0.5, 0.7);
  for (let t = C.shells; t < C.searchMeet; t += 2) { kick(t, 0.45); bass(t, 38, 1.65, 0.5); }
  for (let t = C.shells; t < C.searchMeet; t += 0.5) hat(t, 0.24, false, (Math.round(t * 2) % 2 ? 0.2 : -0.2));
  const searchNotes = [62, 65, 69, 72, 74, 77, 79, 81, 84, 86];
  searchNotes.forEach((n, i) => {
    const left = C.shells + i * 0.5, right = C.searchBoth + i * 0.5;
    pluck(left, n, 0.65, -0.55, 0.45); pluck(left + 0.25, n, 0.18, 0.55, 0.3);
    pluck(right, searchNotes[9 - i], 0.65, 0.55, 0.45); pluck(right + 0.25, searchNotes[9 - i], 0.18, -0.55, 0.3);
  });
  swell(C.searchMeet - 0.6, C.searchMeet, 0.65);
  impact(C.searchMeet, 0.75); bell(C.searchMeet, 74, 0.9, 0, 1.5); bell(C.searchMeet, 81, 0.65, 0, 1.5);
  pad(C.searchMeet, C.searchJoin, [50, 57, 62, 65, 69], 0.85, 1800, 0.15, 0.6);
  drums(C.searchMeet, 2, { kickP: 'two', hats: 8, hv: 0.4, clapOn: false }); bassline(C.searchMeet, 2, ['Dm', 'Bb'], 'pulse', 0.6);
  bass(C.searchJoin - 1, 38, 0.75, 0.5);
  whoosh(C.searchJoin, 0.7, 0.7); bell(C.searchJoin, 74, 0.85, 0, 1.2);
  [74, 77, 81, 79, 77, 74, 72, 69].forEach((n, i) => pluck(C.searchJoin + i * 0.5, n, 0.5, -0.45 + i * 0.13, 0.4));
  drums(C.searchJoin, 2, { kickP: 'two', hats: 8, hv: 0.4 }); bassline(C.searchJoin, 2, ['Dm', 'C'], 'pulse', 0.65);
  bass(C.challenge - 1, 33, 0.75, 0.5);
  // The universal-coverage question gets four seconds of space, with no new drums.
  pad(C.challenge, C.proof - 0.3, [50, 57, 64, 69], 0.5, 850, 0.4, 0.5);
  sub(C.challenge, C.proof - 0.5, 38, 0.35);
  pluck(C.challenge + 0.25, 69, 0.35, 0, 1); pluck(C.challenge + 2.25, 64, 0.25, 0, 0.8);
  swell(C.proof - 0.75, C.proof, 0.7);
  impact(C.proof, 0.8);
  const groupBars = (C.cover - C.proof) / 2, coverBars = (C.sweep - C.cover) / 2, sweepBars = (C.recheck - C.sweep) / 2;
  drums(C.proof, groupBars, { hats: 8, hv: 0.5 }); bassline(C.proof, groupBars, ['Dm', 'Bb'], 'pulse', 0.75); arp(C.proof, groupBars, ['Dm', 'Bb'], { v: 0.5, step: 0.25 });
  whoosh(C.cover, 0.6, 0.6);
  drums(C.cover, coverBars, { hats: 8, hv: 0.65 }); bassline(C.cover, coverBars, ['Gm', 'A'], 'offbeat', 0.85); arp(C.cover, coverBars, ['Gm', 'A'], { v: 0.6, skip: 4 });
  bell(C.sweep, 81, 0.7, 0, 0.9);
  drums(C.sweep, sweepBars, { hats: 16, hv: 0.7 }); bassline(C.sweep, sweepBars, ['Dm', 'Bb'], 'eighths', 0.95); arp(C.sweep, sweepBars, ['Dm', 'Bb'], { v: 0.7 });
  drums(C.recheck, 1, { hats: 16, hv: 0.75 }); bassline(C.recheck, 1, ['Gm'], 'eighths', 0.95); arp(C.recheck, 1, ['Gm'], { v: 0.7 });
  for (let i = 0; i < 3; i++) flap(C.recheck + i * 0.4, 0.45);
  kick(C.superflip - 1, 0.8); clap(C.superflip - 0.5, 0.7);
  bass(C.superflip - 1, 33, 0.85, 0.85);
  for (let i = 0; i < 8; i++) { hat(C.superflip - 1 + i * 0.125, 0.65); pluck(C.superflip - 1 + i * 0.125, [73, 76, 81, 85][i % 4], 0.5, (i % 2 ? 0.2 : -0.2)); }
  riser(C.superflip - 0.5, C.superflip, 0.6);
  impact(C.superflip, 0.75); pad(C.superflip, C.gap, [58, 62, 65], 0.8, 1500, 0.3, 0.6);
  drums(C.superflip, (C.gap - C.superflip) / 2, { kickP: 'half', hats: 8, hv: 0.45, clapOn: false }); bassline(C.superflip, (C.gap - C.superflip) / 2, ['Bb', 'A'], 'long', 0.75);
  bell(S.superflip.times[19][1], 81, 1); bell(S.superflip.times[19][1], 74, 0.75);
  for (let i = 0; i < 8; i++) snare(C.gap + i * 0.125, 0.25 + i * 0.065);
  bass(C.gap, 33, 0.85, 0.8); riser(C.slam - 1.5, C.slam - 0.06, 1.1);
  // DROP
  impact(C.slam, 1.5); pad(C.slam, C.human, [50, 57, 62, 65, 69], 1.3, 2600, 0.05, 1);
  const pD = ['Dm', 'Bb', 'F', 'C'];
  const dropBars = (C.human - C.slam) / 2;
  drums(C.slam, dropBars, { hats: 16, hv: 1, kv: 1.1 }); bassline(C.slam, dropBars, pD, 'eighths', 1.1); arp(C.slam, dropBars, pD, { v: 0.9 });
  const lead = [74, 77, 81, 79, 77, 76, 74, 72];
  lead.forEach((n, i) => bell(C.slam + i * 0.5, n, 0.9, 0, 0.9));
  // ── 4 · 2.51: half-time breakdown
  const pH = ['Bb', 'F', 'Gm', 'A', 'Bb', 'F'];
  impact(C.human + 0.85, 0.7);
  const humanBars = (C.methods - C.human) / 2;
  drums(C.human, humanBars, { kickP: 'half', hats: 4, hv: 0.6 }); bassline(C.human, humanBars, pH, 'long', 0.8); pad(C.human, C.methods, [58, 62, 65], 0.9, 1300, 1, 1);
  for (let i = 0; i < 5; i++) flap(C.ao5 + 0.2 + i * 0.12, 0.8);
  whoosh(C.trim + 0.45, 0.5, 0.8); bell(C.merge + 0.45, 81, 1); bell(C.merge + 0.45, 74, 0.8);
  for (let i = 0; i < 15; i++) tick(C.inspect + 0.2 + (i / 15) * (C.methods - C.inspect - 0.45), 0.9, 2900);
  // ── 5 · methods: drive
  const pM = ['Dm', 'Bb', 'F', 'C'];
  const methodBars = (C.race - C.methods) / 2;
  drums(C.methods, methodBars, { hats: 16, hv: 0.7 }); bassline(C.methods, methodBars, pM, 'offbeat', 0.9); arp(C.methods, methodBars, pM, { v: 0.6, skip: 4 });
  for (let i = 0; i < 4; i++) bell(C.methods + 1.0 + i * 0.5, [74, 77, 81, 86][i], 0.7);
  for (const e of [...S.lblStageEnds, ...S.cfopStageEnds, ...S.rouxStageEnds]) bell(e, 86, 0.45, 0.3, 0.7);
  riser(C.tri, C.triHit, 1); impact(C.triHit, 1);
  // ── 6 · the race
  pad(C.race, C.final, [50, 57, 62, 65], 0.8, 900, 0.5, 0.3);
  for (let t = C.race; t < C.final; t += 0.5) bass(t, 38, 0.4, 0.45);
  for (let t = C.race; t < C.r2; t += 0.25) tick(t, 0.2, 5200);
  drums(C.race, (C.final - C.race) / 2, { kickP: 'half', hats: 8, hv: 0.6, clapOn: false }); arp(C.race, (C.final - C.race) / 2, ['Dm', 'Dm', 'Bb', 'A'], { v: 0.45, oct: 0 });
  for (let i = 0; i < 5; i++) flap(C.r2 + 0.2 + i * 0.12, 0.8);
  bell(C.r2 + 1.0, 86, 0.8); bell(C.r2 + 1.0, 93, 0.5);
  bell(C.rule, 81, 0.65); bell(C.rule, 74, 0.5); // record stays valid; no "discarded record" impact
  const pR = ['Dm', 'Bb', 'Gm', 'A'];
  riser(C.final - 0.6, C.final - 0.06, 0.7);
  drums(C.final, (C.recent - C.final) / 2, { hats: 8, hv: 0.8 }); bassline(C.final, (C.recent - C.final) / 2, pR, 'eighths', 0.9); arp(C.final, (C.recent - C.final) / 2, pR, { v: 0.6 });
  for (let i = 0; i < 10; i++) flap(C.final + 0.2 + (i % 5) * 0.08 + (i >= 5 ? 0.2 : 0), 0.6);
  whoosh(C.finalTrim, 0.5, 0.7); impact(C.finalAvg, 0.8);
  drums(C.recent, (C.ending - C.recent) / 2, { hats: 8, hv: 0.65 }); bassline(C.recent, (C.ending - C.recent) / 2, ['Gm', 'A'], 'eighths', 0.85); arp(C.recent, (C.ending - C.recent) / 2, ['Gm', 'A'], { v: 0.6 });
  bell(C.recent, 74, 0.6); tom(C.ending - 0.5, 98, 0.45);
  for (let i = 0; i < 8; i++) snare(C.ending - 1 + i * 0.125, 0.2 + i * 0.035);
  swell(C.ending - 0.6, C.ending, 0.6);
  // ── 7 · ending: resolve to D major
  impact(C.ending, 0.8); pad(C.ending, C.chord, [50, 57, 62, 66], 1.1, 1800, 0.3, 0.8);
  arp(C.ending, (C.chord - C.ending) / 2, ['D'], { v: 0.5, step: 0.25 }); bassline(C.ending, (C.chord - C.ending) / 2, ['D'], 'long', 0.65);
  // final chord
  sub(C.chord, C.end + 0.1, 38, 0.7); pad(C.chord, C.end, [50, 57, 62, 66, 69, 74], 1.5, 2400, 0.04, 3.5);
  for (const [n, d] of [[74, 0], [78, 0.08], [81, 0.16], [86, 0.24]]) bell(C.chord + d, n, 1, (d - 0.12) * 3, 3);
  kick(C.chord, 1); swell(C.chord - 0.5, C.chord, 0.6);
  beep(C.reset, 1200, 0.08, 0.45); bell(C.reset + 1.0, 86, 0.35, 0, 2.5);
  bell(C.cta, 81, 0.32, 0, 3); bell(C.cta + 0.5, 74, 0.4, 0, 3);
  // ── all turn clicks
  const turnPan = { 'search-left': -0.35, 'search-right': 0.35, join: 0 };
  for (const tr of allTurns()) turnClick(tr.t + 0.005, tr.q, tr.gain, turnPan[tr.tag]);
  // the opening timer start beep
  beep(0, 1500, 0.05, 0.5);

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
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let peak = 0; for (const d of data) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  const g = peak > 0.98 ? 0.98 / peak : 1;
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i] * g)); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return { bytes: new Uint8Array(out.buffer), peak, gain: g };
}
