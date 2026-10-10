// score.js: original music and sound effects, rendered offline on the shared timeline. No narration in V3.
import { DUR, BEAT, ACTS, FLASHES, PULSES, ZAP, GATE_OPEN, DELIVER, AMBER_ON, MOUSE_LIGHT, GOGGLES_ON, lightOn } from './timeline.js';
import { rng } from './lib.js';
const SR = 48000, midi = n => 440 * 2 ** ((n - 69) / 12);
const PROG = [[50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60]]; // Dm, Bb, F, C: one chord per bar
const BAR = 4 * BEAT, chord = t => PROG[Math.floor(t / BAR + 1e-6) % 4], ARP = [0, 1, 2, 3, 2, 1, 3, 2];
const inAny = (t, spans) => spans.some(([a, b]) => t >= a && t < b);

export async function renderScore() {
  const ctx = new OfflineAudioContext(2, DUR * SR, SR), R = rng(2026);
  // Every gain node starts at 0 and only then gets its level, so nothing clicks on.
  const gain = (v = 0) => { const g = ctx.createGain(); g.gain.value = 0; g.gain.setValueAtTime(v, 0); return g; };
  const env = (g, t, a, atk, dec, hold = 0) => {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + atk); g.gain.setValueAtTime(a, t + atk + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec); g.gain.setValueAtTime(0, t + atk + hold + dec + 0.01);
  };
  const master = gain(0.8); master.connect(ctx.destination);
  master.gain.setValueAtTime(0.8, DUR - 0.6); master.gain.linearRampToValueAtTime(0, DUR - 0.02);
  const harm = gain(1), drums = gain(1), fx = gain(1);
  for (const b of [harm, drums, fx]) b.connect(master);
  const reverb = ctx.createConvolver(), ir = ctx.createBuffer(2, SR * 2.4, SR);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.exp((-i / SR) * 3.2); }
  reverb.buffer = ir; const revSend = gain(1), revOut = gain(0.2); revSend.connect(reverb); reverb.connect(revOut); revOut.connect(master);
  const delay = ctx.createDelay(1), fb = gain(0.3), dlp = ctx.createBiquadFilter(), delSend = gain(1), delOut = gain(0.16);
  delay.delayTime.value = BEAT * 0.75; dlp.type = 'lowpass'; dlp.frequency.value = 3000;
  delSend.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(delOut); delOut.connect(master);
  const noise = ctx.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const noiseThrough = (t, dur, type, freq, q = 0.7) => {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(); s.buffer = noise; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    s.connect(f); s.start(t, R() * 1.5); s.stop(Math.min(DUR, t + dur)); return f;
  };
  const osc = (type, f, t, stop) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(Math.min(DUR, stop)); return o; };

  function pluck(t, n, amp, pan) {
    const f = ctx.createBiquadFilter(), g = gain(0), p = ctx.createStereoPanner(), g2 = gain(0.35);
    const o1 = osc('triangle', midi(n), t, t + 0.5), o2 = osc('sine', midi(n) * 2, t, t + 0.5);
    o2.connect(g2); g2.connect(f); o1.connect(f);
    f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.3);
    f.connect(g); g.connect(p); p.pan.value = pan; p.connect(harm); p.connect(delSend); p.connect(revSend);
    env(g, t, amp, 0.004, 0.4);
  }
  function kick(t, amp, lp = 0) {
    const o = osc('sine', 150, t, t + 0.42), g = gain(0); o.frequency.exponentialRampToValueAtTime(45, t + 0.09); o.connect(g);
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; g.connect(f); f.connect(fx); } else g.connect(drums);
    env(g, t, amp, 0.003, 0.34);
    if (!lp) { const c = noiseThrough(t, 0.01, 'highpass', 3000), cg = gain(0); c.connect(cg); cg.connect(drums); env(cg, t, amp * 0.2, 0.001, 0.008); }
  }
  function hat(t, amp) { const f = noiseThrough(t, 0.07, 'highpass', 7500), g = gain(0); f.connect(g); g.connect(drums); env(g, t, amp, 0.001, 0.05); }
  function bass(t, n, len, amp) {
    const o = osc('sawtooth', midi(n), t, t + len + 0.1), f = ctx.createBiquadFilter(), g = gain(0);
    f.type = 'lowpass'; f.frequency.value = 420; o.connect(f); f.connect(g); g.connect(harm); env(g, t, amp, 0.01, len, 0);
  }
  function pad(t, notes, len, amp, lp = 1400) {
    const f = ctx.createBiquadFilter(), g = gain(0); f.type = 'lowpass'; f.frequency.value = lp; f.connect(g); g.connect(harm); g.connect(revSend);
    for (const n of notes) for (const d of [-6, 6]) { const o = osc('triangle', midi(n), t, t + len + 0.8); o.detune.value = d; o.connect(f); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.5); g.gain.setValueAtTime(amp, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.7);
  }
  function whoosh(tc, amp = 0.22) {
    const t = tc - 0.45, f = noiseThrough(t, 0.65, 'bandpass', 300, 1.2), g = gain(0);
    f.frequency.exponentialRampToValueAtTime(2600, tc); f.frequency.exponentialRampToValueAtTime(900, tc + 0.18);
    f.connect(g); g.connect(fx); g.connect(revSend);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, tc - 0.05); g.gain.linearRampToValueAtTime(0, tc + 0.2);
  }
  function riser(a, b, amp = 0.16) {
    const f = noiseThrough(a, b - a, 'highpass', 500), g = gain(0); f.frequency.exponentialRampToValueAtTime(6000, b); f.connect(g); g.connect(fx);
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(amp, b - 0.02); g.gain.setValueAtTime(0, b);
    const o = osc('sine', 220, a, b), og = gain(0); o.frequency.exponentialRampToValueAtTime(880, b); o.connect(og); og.connect(fx);
    og.gain.setValueAtTime(0, a); og.gain.linearRampToValueAtTime(amp * 0.25, b - 0.02); og.gain.setValueAtTime(0, b);
  }
  function impact(t, amp) {
    const o = osc('sine', 72, t, t + 1.4), g = gain(0); o.frequency.exponentialRampToValueAtTime(32, t + 1.1); o.connect(g); g.connect(fx); env(g, t, amp, 0.004, 1.2);
    const n = noiseThrough(t, 0.4, 'lowpass', 1100), ng = gain(0); n.connect(ng); ng.connect(fx); ng.connect(revSend); env(ng, t, amp * 0.5, 0.002, 0.3);
  }
  function sparkle(t, amp) {
    for (const [f, k] of [[1568, 1], [2349, 0.6], [3136, 0.4]]) { const o = osc('sine', f, t, t + 1.3), g = gain(0); o.connect(g); g.connect(fx); g.connect(revSend); env(g, t, amp * k, 0.004, 1.1); }
  }
  function zap(t) {
    const o = osc('sawtooth', 110, t, t + 0.55), lfo = osc('square', 34, t, t + 0.55), depth = gain(60), f = ctx.createBiquadFilter(), g = gain(0);
    lfo.connect(depth); depth.connect(o.frequency); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.8; o.connect(f); f.connect(g); g.connect(fx); env(g, t, 0.35, 0.005, 0.5);
    const n = noiseThrough(t, 0.5, 'bandpass', 3500, 0.6), ng = gain(0); n.connect(ng); ng.connect(fx); env(ng, t, 0.22, 0.002, 0.45);
  }
  function tick(t, amp, freq = 1800) {
    const o = osc('sine', freq, t, t + 0.04), g = gain(0); o.connect(g); g.connect(fx); env(g, t, amp, 0.001, 0.025);
    const n = noiseThrough(t, 0.02, 'highpass', 4000), ng = gain(0); n.connect(ng); ng.connect(fx); env(ng, t, amp * 0.5, 0.001, 0.012);
  }
  function blip(t, amp) { const o = osc('sine', 420, t, t + 0.12), g = gain(0); o.frequency.exponentialRampToValueAtTime(960, t + 0.08); o.connect(g); g.connect(fx); g.connect(revSend); env(g, t, amp, 0.003, 0.09); }

  // Harmony and groove
  const arpSpans = [[0, 43.2, 1], [48, 64, 1]], kickSpans = [[3, 15], [23, 43.2], [48, 55], [59, 63.4]], hatSpans = [[3, 15], [30, 43.2], [48, 55], [60, 63.4]], bassSpans = [[30, 43.2], [48, 55], [60, 63.4]];
  for (let k = 0; k * BEAT / 2 < DUR - 0.5; k++) {
    const t = (k * BEAT) / 2, c = chord(t);
    if (inAny(t, arpSpans)) {
      const algae = t >= 15 && t < 23, amp = algae ? 0.06 : t >= 30 && t < 43.2 ? 0.09 : t >= 55 && t < 60 ? 0.065 : 0.08;
      pluck(t, c[ARP[k % 8]] + 12 + (algae ? 12 : 0), amp, k % 2 ? 0.3 : -0.3);
    }
    if (k % 2 === 0 && inAny(t, kickSpans)) kick(t, t >= 55 && t < 59 ? 0.5 : 0.85);
    if (k % 2 === 1 && inAny(t, hatSpans)) hat(t, 0.05);
    if (k % 2 === 0 && inAny(t, bassSpans)) bass(t, c[0] - 12, BEAT * 0.8, 0.12);
  }
  for (let t = 0; t < DUR - 0.5; t += BAR) {
    const c = chord(t), end = t + BAR, a = Math.max(t, AMBER_ON), b = Math.min(end, 48);
    if (t < AMBER_ON || t >= 48) pad(t, c, (t < AMBER_ON ? Math.min(end, AMBER_ON) : end) - t, t >= 55 && t < 60 ? 0.045 : 0.026, t >= 15 && t < 23 ? 2400 : 1400);
    if (b > a) pad(a, c.map(n => n - 12), b - a, 0.03, 520);
  }
  for (let t = 23; t < 30; t += BAR) bass(t, chord(t)[0] - 12, BAR * 0.9, 0.07);
  // Sound design on the story's events
  for (const s of ACTS) if (s.a > 0 && s.id !== 'brake') whoosh(s.a, s.id === 'network' ? 0.14 : 0.22);
  riser(13.4, 15); riser(28.5, 30); riser(58.6, 60, 0.12);
  for (const f of FLASHES) { sparkle(f, f === 60.6 ? 0.1 : 0.07); impact(f, f === 60.6 ? 0.75 : 0.3); }
  zap(ZAP); impact(ZAP, 0.85); impact(30, 0.75); impact(DELIVER, 0.4); impact(57, 0.3);
  tick(GATE_OPEN, 0.3, 380); impact(GATE_OPEN, 0.28);
  { const f = noiseThrough(GATE_OPEN + 0.1, 4.5, 'lowpass', 1300), g = gain(0); f.connect(g); g.connect(fx); g.gain.setValueAtTime(0, GATE_OPEN + 0.1); g.gain.linearRampToValueAtTime(0.06, GATE_OPEN + 0.8); g.gain.linearRampToValueAtTime(0, GATE_OPEN + 4.5); }
  { const o = osc('sine', 220, GATE_OPEN + 0.3, GATE_OPEN + 2.6), g = gain(0); o.frequency.exponentialRampToValueAtTime(660, GATE_OPEN + 2.4); o.connect(g); g.connect(fx); g.gain.setValueAtTime(0, GATE_OPEN + 0.3); g.gain.linearRampToValueAtTime(0.05, GATE_OPEN + 0.8); g.gain.linearRampToValueAtTime(0, GATE_OPEN + 2.55); }
  for (let i = 0; i < 14; i++) blip(15.4 + R() * 7, 0.035 + R() * 0.03);
  for (const p of PULSES) tick(p, 0.16);
  impact(AMBER_ON, 0.5); for (let t = 43.5; t < 47.9; t += 1) { kick(t, 0.8, 180); kick(t + 0.22, 0.5, 180); }
  for (let t = 48; t < 55; t += 0.125) { const on = lightOn(t, MOUSE_LIGHT); if (on || Math.round(t * 8) % 3 === 0) tick(t, on ? 0.05 : 0.025, 2500); }
  sparkle(GOGGLES_ON, 0.04);
  return ctx.startRendering();
}
export function toWav(buffer) {
  const channels = buffer.numberOfChannels, length = buffer.length, data = new ArrayBuffer(44 + length * channels * 2), v = new DataView(data);
  const str = (offset, s) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, data.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true); v.setUint32(24, buffer.sampleRate, true); v.setUint32(28, buffer.sampleRate * channels * 2, true); v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, length * channels * 2, true);
  const samples = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i)); let off = 44;
  for (let i = 0; i < length; i++) for (let c = 0; c < channels; c++) { const a = Math.max(-1, Math.min(1, samples[c][i])); v.setInt16(off, Math.round(a * (a < 0 ? 32768 : 32767)), true); off += 2; }
  return new Uint8Array(data);
}
