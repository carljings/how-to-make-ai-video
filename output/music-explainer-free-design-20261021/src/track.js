// track.js — the coaster: geometry (a closed circuit built by a "turtle"), the car's time→distance map, and the gates.
// Pure math, no three.js, so node can test it (closure, clearance, lengths).
//
// Idea (Opus 5.5): the song is a ride. The car's progress is timed to the user's ORIGINAL BGM (src/cues.js):
//   climbs = the measured thin/build bars, plunges = the drops, gates = the MEASURED onsets (one gate per attack), a loop on
//   the bar where the film shows "surprise", fog where it shows "hard to guess". At film 29.785 s the soundtrack replays the
//   opening passage (same source audio), and the car is back at the same point of the same hill: lap 2 = familiarity.
import { CUES } from './cues.js';
export const E = CUES.events;
const D = Math.PI / 180, DS = 0.25;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, u) => a + (b - a) * u;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const fwd = (yaw, pitch) => [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];

export const LAP2 = E.thinB - E.chain[0];                 // 29.7854: film offset of the replayed opening (same source audio)
export const START = { p: [0, 12, 0], yaw: 0, pitch: 35 * D };

// segments: [name, t_end (film s, lap 1), length, yawDelta°, pitchTarget°] or [name, t_end, 'loop', radius, drift]
// the last segment's yaw is solved so the circuit closes in heading; the position error is spread over the return
export const SEG = [
  ['climb1', 3.95, 11, 0, 35],
  ['crest1', E.drop, 2.6, 0, -4],
  ['plunge1', 4.86, 16, 0, -62],
  ['pull1', 5.40, 12, -20, 0],
  ['groove1a', 7.30, 34, 25, 7],
  ['groove1b', 9.20, 34, 64.4, -7],
  ['groove1c', 11.10, 34, 58.8, 5],
  ['groove1d', E.thin2 - 0.2, 26, 40, 0],
  ['lead2', E.thin2 + 0.35, 4, 0, 40],
  ['climb2', 16.85, 18, 0, 40],
  ['crest2', E.drop3, 2.2, 0, -4],
  ['plunge2', 17.66, 18, 0, -66],
  ['pull2', 18.30, 14, 30, 0],
  ['straight', E.bar17, 36, 0, 0],
  ['loop', 22.90, 'loop', 6.6, 4.0],
  ['runout', E.join, 9, 0, 0],
  ['fogA', 24.50, 18, -20, 0],
  ['fogB', E.bar5b, 18, 45, 0],
  ['land', 26.90, 44.75, 110, 0],
  ['return', 28.60, 40, null, 0],
  ['lift', LAP2, 13, 0, 35],
];
// (turn angles and the straight/land/return lengths were solved numerically so the circuit closes: tools/solve_track.mjs)

export function build(SEG) {
  const S = []; let p = START.p.slice(), yaw = START.yaw, pitch = START.pitch;
  const segStart = {};
  const push = (pos, f, u, r, roll) => S.push({ p: pos, f, u, r, roll });
  const solidYaw = SEG.filter((s) => s[2] !== 'loop' && s[3] !== null).reduce((a, s) => a + s[3], 0);
  for (const sg of SEG) {
    segStart[sg[0]] = S.length * DS;
    if (sg[2] === 'loop') {
      const R = sg[3], drift = sg[4], f0 = fwd(yaw, pitch), r0 = norm(cross(f0, [0, 1, 0])), u0 = cross(r0, f0), n = Math.round(2 * Math.PI * R / DS);
      for (let i = 0; i < n; i++) {
        const th = 2 * Math.PI * i / n, d = drift * smooth(i / n);
        const pos = add(add(add(p, mul(f0, R * Math.sin(th))), mul(u0, R * (1 - Math.cos(th)))), mul(r0, d));
        push(pos, norm(add(mul(f0, Math.cos(th)), mul(u0, Math.sin(th)))), add(mul(f0, -Math.sin(th)), mul(u0, Math.cos(th))), r0, 0);
      }
      p = add(p, mul(r0, drift));
      continue;
    }
    const len = sg[2], dYaw = (sg[3] === null ? 360 - solidYaw : sg[3]) * D, p1 = sg[4] * D, n = Math.round(len / DS), y0 = yaw, q0 = pitch;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n; yaw = y0 + dYaw * smooth(u); pitch = q0 + (p1 - q0) * smooth(u);
      const f = fwd(yaw, pitch), rate = dYaw * 6 * u * (1 - u) / len;          // d(yaw)/ds
      const roll = clamp(-rate * 7, -0.75, 0.75);
      let r = norm(cross(f, [0, 1, 0])), up = cross(r, f);
      const c = Math.cos(roll), s = Math.sin(roll), fr = cross(f, up);           // rotate up toward right by roll
      const up2 = add(mul(up, c), mul(fr, s)), r2 = norm(cross(f, up2));
      push(p.slice(), f, up2, r2, roll);
      p = add(p, mul(f, DS));
    }
  }
  // close the circuit: spread the position error over 'fogA' → end
  const err = [START.p[0] - p[0], START.p[1] - p[1], START.p[2] - p[2]], k0 = Math.round(segStart.fogA / DS), N = S.length;
  for (let i = k0; i < N; i++) { const w = smooth((i - k0) / (N - k0)); S[i].p = add(S[i].p, mul(err, w)); }
  return { S, segStart, err, endYaw: yaw, endPitch: pitch };
}
const B = build(SEG);
export const SAMPLES = B.S, SEG_START = B.segStart, CLOSE_ERR = B.err, L = SAMPLES.length * DS;
export const STEP = DS;

// frame at distance s (wraps): position, forward, up, right
export function at(s) {
  const n = SAMPLES.length, x = (((s / DS) % n) + n) % n, i = Math.floor(x), k = x - i, a = SAMPLES[i], b = SAMPLES[(i + 1) % n];
  const L3 = (u, v) => [lerp(u[0], v[0], k), lerp(u[1], v[1], k), lerp(u[2], v[2], k)];
  return { p: L3(a.p, b.p), f: norm(L3(a.f, b.f)), u: norm(L3(a.u, b.u)), r: norm(L3(a.r, b.r)) };
}

// time → distance (lap 1 keys at segment ends, monotone cubic); lap 2 = lap 1 shifted by LAP2 and one lap length
const KEYS = [[0, 0]]; { let acc = 0; for (const sg of SEG) { acc = SEG_START[sg[0]] + (sg[2] === 'loop' ? Math.round(2 * Math.PI * sg[3] / DS) * DS : Math.round(sg[2] / DS) * DS); KEYS.push([sg[1], acc]); } }
export const TKEYS = KEYS;
function pchip(keys) {
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]), n = xs.length, d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m.push(0); else { const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i])); } }
  m.push(d[n - 2]);
  return (x) => { if (x <= xs[0]) return ys[0] + (x - xs[0]) * d[0]; if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]) * d[n - 2];
    let i = 0; while (x > xs[i + 1]) i++; const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]; };
}
const S1 = pchip(KEYS);
export const sOf = (t) => (t < LAP2 ? S1(t) : L + S1(t - LAP2));
export const speedOf = (t) => (sOf(t + 0.02) - sOf(t - 0.02)) / 0.04;

// gates: one per MEASURED onset (lap 2 onsets land on lap 1's gates — same audio, same place). Slow stretches (climbs)
// get small lamps on the rails instead of rings.
export const GATES = [];
for (const o of CUES.onsets) {
  const s = ((sOf(o.t) % L) + L) % L;
  const g = GATES.find((q) => Math.abs(q.s - s) < 0.35);
  if (g) { g.times.push(o.t); continue; }
  GATES.push({ s, times: [o.t], lamp: speedOf(o.t) < 8, strength: o.s });
}
GATES.sort((a, b) => a.s - b.s);
