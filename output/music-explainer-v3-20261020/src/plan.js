// plan.js — 「声音长廊」 v3 r2: timing, layout and motion as pure functions of time (no three.js), all from src/cues.js.
// The one claim this preview teaches (one contributor to 上头, not all of it):
//   the beat repeats → the brain picks up the regularity and expects the next sound (示意) → one expected attack doesn't
//   come, and you notice → the big beat comes where the pattern pointed: the expectation is met.
// LEFT of the playhead = what has actually sounded: the original BGM's MEASURED loudness bars (bass = the orange base)
// and measured attacks. RIGHT of the playhead = only what is expected: hollow rings on a beat grid fitted to the first six
// measured onsets (CUES.prediction) — conceptual, never brain data. A ring fills when a real attack meets it.
import { CUES } from './cues.js';
export const E = CUES.events, P = CUES.prediction, FPS = CUES.fps, END = CUES.end_s, DROP = E.drop;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)));
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const env = (arr, t) => { const x = clamp(t * FPS - 0.5, 0, arr.length - 1), i = Math.floor(x), u = x - i; return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], u); };
export const rms = (t) => (t < 0 ? 0 : env(CUES.rms, t)), sub = (t) => (t < 0 ? 0 : env(CUES.sub, t));

// ── the prediction grid (示意) and the measured attacks
export const GRID = P.grid8.map((g, i) => ({ t: g.t, i, bar: i % 8 === 0, hit: g.onset !== null, onset: g.onset }));
export const LEARN = GRID[1].t;                                       // expectations firm up after two measured attacks
export const MISS = GRID.find((g) => !g.hit);                        // the one expected eighth with no attack (1.62 s)
export const DROP_RING = GRID.reduce((b, g) => (Math.abs(g.t - DROP) < Math.abs(b.t - DROP) ? g : b));
export const ONSETS = CUES.onsets;

// ── layout (world units): the strip's baseline, the ring row above it, Clawd on the floor under the playhead
export const Y_BASE = 1.3, Y_RING = Y_BASE + 2.55, BAR_DT = 1 / 15;   // one loudness bar per 1/15 s of music
export const RECAP = [8.45, 9.25];                                    // the timeline zooms out to show the whole record
export const S0 = 1.75, S1 = 0.6;                                    // world units per second of music: normal / recap
export const scaleAt = (t) => lerp(S0, S1, easeInOut((t - RECAP[0]) / (RECAP[1] - RECAP[0])));
export const xOf = (te, t) => (te - t) * scaleAt(t);                  // playhead at x = 0; past left, future right

// ── text windows: each claim appears AFTER the event that shows it, one idea at a time
export const LINES = {
  title: [0.0, 1.66],            // the question; the strip and the guesses introduce themselves with two short callouts
  gap: [1.8, 2.98],              // only after the expected eighth (1.62 s) has passed without an attack
  rule: [2.98, 4.26],            // the causal sentence, while the big expected beat approaches
  drop: [DROP, 6.4],             // the payoff
  sum: [RECAP[0], END + 1],      // the whole record + the takeaway, held to the end
};

// ── Clawd: small reactor on the floor under the playhead. Bobs on attacks, startles at the miss, braces in the build,
// is launched by the drop, dances on the beat, waves for the recap.
const pop = (dt, a) => (dt < 0 ? 0 : a * (1 - Math.exp(-dt * 70)) * Math.exp(-dt * 9) * Math.cos(dt * 22));
export function clawd(t) {
  const p = { x: 0, y: 0, z: 1.0, yaw: 0, lean: 0, roll: 0, sy: 1, arm: [0, 0], wave: 0, tuck: 0, eye: { x: 0, y: 0.25, s: 1, blink: 1 } };
  const hits = ONSETS.filter((o) => o.t <= t && o.t < DROP - 0.01), last = hits.length ? hits[hits.length - 1].t : -9;
  if (t < DROP) {
    p.sy -= pop(t - last, 0.12); p.y = 0.06 * Math.exp(-(t - last) * 14) * (t >= last ? 1 : 0);
    if (t >= MISS.t && t < E.pickup + 0.1) {                                   // the miss: a startled look up at the empty ring
      const u = smooth((t - MISS.t) / 0.1); p.y += 0.12 * Math.sin(Math.PI * clamp((t - MISS.t) / 0.25)); p.roll = 0.25 * u; p.eye.s = 1 + 0.25 * u; p.eye.y = 0.5 * u; p.arm = [0.8 * u, 0.2 * u];
    }
    if (t >= E.build_downbeat) {                                               // the build: look right, toward the big one, brace
      const u = smooth((t - E.build_downbeat) / 1.6); p.eye.x = 0.7 * u; p.eye.y = 0.45 * u; p.eye.s = 1 + 0.2 * u; p.sy *= 1 - 0.16 * u; p.arm = [-0.4 * u, -0.4 * u]; p.yaw = 0.35 * u;
    }
  } else {
    const beats = E.drop_beats, jump = 0.6;
    const hops = [[DROP, 1.25, jump], ...beats.filter((b) => b > DROP + jump && b < RECAP[0] - 0.05).map((b) => [b, 0.26, 0.27])];
    let hop = null, land = DROP; for (const h of hops) { if (t >= h[0] && t < h[0] + h[2]) hop = h; if (t >= h[0] + h[2]) land = h[0] + h[2]; }
    p.sy -= pop(t - land, 0.24);
    if (hop) { const u = (t - hop[0]) / hop[2]; p.y = 4 * hop[1] * u * (1 - u); p.tuck = 0.6 * Math.sin(Math.PI * u); p.arm = [1.8 * Math.sin(Math.PI * u), 1.8 * Math.sin(Math.PI * u)]; if (hop[0] === DROP) p.yaw += 2 * Math.PI * smooth(u); }
    const bi = beats.filter((b) => t >= b).length; if (t < RECAP[0]) p.roll = 0.12 * (bi % 2 ? 1 : -1) * smooth((t - beats[Math.max(0, bi - 1)]) / 0.15);
    p.eye.y = 0.15;
    if (t >= RECAP[0] + 0.3) { const w = t - RECAP[0] - 0.3; p.arm = [0.3, 2.4 * smooth(w / 0.15)]; p.wave = Math.sin(w * 14) * smooth(w / 0.2); p.eye.y = 0; }
  }
  if ([0.95, 3.4, 9.4].some((b) => t >= b && t < b + 0.1)) p.eye.blink = 0.15;
  return p;
}

// ── camera: a flat, frontal "diagram" view for the explanation; a low 3/4 swing into the corridor on the drop;
// back to a wide frontal view for the recap. Keys: [t, pos, look, fov, ease-into].
const V = (x, y, z) => [x, y, z];
export const KEYS = [
  [0.0, V(0.0, 2.35, 14.0), V(0.0, 2.35, 0.0), 32, 'io'],
  [1.5, V(-0.15, 2.45, 13.2), V(-0.15, 2.45, 0.0), 32, 'io'],
  [2.2, V(-0.35, 2.65, 11.6), V(-0.35, 2.75, 0.0), 30, 'io'],
  [3.0, V(0.3, 2.45, 13.4), V(0.3, 2.45, 0.0), 32, 'io'],
  [DROP - 0.03, V(0.85, 2.5, 12.4), V(0.85, 2.6, 0.0), 30, 'io'],
  [DROP + 0.75, V(5.6, 1.25, 8.4), V(-1.3, 2.1, -0.8), 44, 'expo'],
  [E.bar_lines[1], V(5.0, 1.5, 9.0), V(-1.4, 2.2, -0.8), 44, 'io'],
  [RECAP[0], V(4.4, 1.3, 9.2), V(-1.2, 2.3, -0.8), 44, 'io'],
  [RECAP[1], V(-2.3, 2.6, 23.0), V(-2.3, 2.75, 0.0), 34, 'io'],
  [END, V(-2.3, 2.6, 22.5), V(-2.3, 2.75, 0.0), 34, 'io'],
];
const mixV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
export function camera(t) {
  let i = 0; while (i + 1 < KEYS.length && t >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const u0 = b === a ? 1 : (t - a[0]) / (b[0] - a[0]), u = b[4] === 'expo' ? easeOutExpo(u0) : easeInOut(u0);
  const c = { pos: mixV(a[1], b[1], u), look: mixV(a[2], b[2], u), fov: lerp(a[3], b[3], u) };
  const k = t >= DROP ? 0.16 * Math.exp(-(t - DROP) * 6) : 0, f = t * 30;
  c.pos[0] += k * (hash(f * 1.7) - 0.5); c.pos[1] += k * (hash(f * 2.3 + 5) - 0.5);
  c.fov += t >= DROP ? 4 * Math.exp(-(t - DROP) * 5) : 0;
  return c;
}
