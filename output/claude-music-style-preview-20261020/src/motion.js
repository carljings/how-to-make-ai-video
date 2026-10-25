// motion.js — every movement in the preview as a pure function of time (s). No three.js here, so tools can check framing.
// Story: the music lays one stone per beat and Clawd lands on each one (THE RULE). Ghost frames show where the next
// beats will be. Two beats are WITHHELD (no stone, no kick): Clawd crouches, then leaps across the gap on faith. The DROP
// lands exactly on the predicted beat: the stone slams into existence and the whole world erupts out of the dark; the
// repeated hook then builds a giant Clawd out of the floor, row by row, one row per note, locking on the final hit.
import { CUES } from './cues.js';
export const E = CUES.events, BEAT = CUES.beat_s, DROP = E.drop, FINAL = E.final, LAUNCH = E.launch;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)));
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export const S = 2.4;                       // stone spacing (world units); Clawd is 2.4 wide, 2.4 tall (u = 0.3)
export const U = 0.3;
export const RULE = CUES.kicks.filter((k) => k.kind === 'rule').map((k) => k.t);          // 0 … 2.5: landings
export const STOMPS = CUES.kicks.filter((k) => k.t > DROP + 1e-6).map((k) => k.t);        // 4.5, 5, 5.5, 6 (final)
export const ROLL = CUES.roll.map((r) => r.t);
export const GRID = CUES.grid_beats;
export const stoneZ = (k) => k * S;
export const K_LAND = Math.round(DROP / BEAT);                                            // grid beat 8 = the drop
export const ZL = stoneZ(K_LAND);
export const STONES = [...RULE.map((t, k) => ({ k, t })), { k: K_LAND, t: DROP }];      // real stones (6 + the drop)
export const GHOSTS = GRID.filter((t) => t > 0 && t <= DROP + 1e-6).map((t) => ({ k: Math.round(t / BEAT), t, withheld: E.withheld.some((w) => Math.abs(w - t) < 1e-6) }));
// the giant is built by the drop's hook: each group of rows locks on a hook note (or the final hit)
export const DROP_NOTES = CUES.lead.filter((n) => n.kind === 'saw').map((n) => n.t);
export const BUILD = [                       // rows of the front grid (0 = top) → the note they lock on
  { rows: [6, 7], t: DROP_NOTES[3] }, { rows: [5], t: DROP_NOTES[4] }, { rows: [4], t: DROP_NOTES[5] },
  { rows: [3], t: DROP_NOTES[6] }, { rows: [2], t: DROP_NOTES[7] }, { rows: [0, 1], t: FINAL }];
export const FLIGHT = 0.4;
export const G = 1.1, ZG = -4.2;            // giant voxel size, giant centre z

const landPop = (dt, a) => (dt < 0 ? 0 : a * (1 - Math.exp(-dt * 70)) * Math.exp(-dt * 9) * Math.cos(dt * 22));   // peaks ~1 frame after contact
// Clawd: position (feet centre), squash, lean, arm lift, leg tuck, eyes, seam glow
export function clawd(t) {
  let z = 0, y = 0, air = 0, lean = 0, sq = 0, crouch = 0, stretch = 0, tuck = 0, arm = 0, seam = 0, eyeY = 0, eyeX = 0;
  const lastRule = RULE[RULE.length - 1];
  if (t < lastRule) {
    let k = 0; while (k + 1 < RULE.length && t >= RULE[k + 1]) k++;
    const t0 = RULE[k] + 0.1, t1 = RULE[k + 1];
    z = stoneZ(k); sq = landPop(t - RULE[k], 0.24); seam = RULE[k] === 0 ? 0 : 0.7 * Math.exp(-(t - RULE[k]) * 7);
    if (t > t0) { const u = (t - t0) / (t1 - t0); z = lerp(stoneZ(k), stoneZ(k + 1), smooth(u * 0.9 + 0.05)); y = 4 * 0.85 * u * (1 - u); air = Math.sin(Math.PI * u); }
  } else if (t < LAUNCH) {                     // the withheld beats: no stone arrives, Clawd charges up
    z = stoneZ(RULE.length - 1); sq = landPop(t - lastRule, 0.24);
    const c = smooth((t - (lastRule + 0.12)) / (LAUNCH - lastRule - 0.16));
    crouch = 0.34 * c; seam = 0.4 * Math.exp(-(t - lastRule) * 7) + 1.5 * c * c;
    for (const r of ROLL) if (t >= r) crouch += 0.035 * Math.exp(-(t - r) * 30), seam += 0.35 * Math.exp(-(t - r) * 18);
    arm = -0.6 * c; eyeY = -0.12 * c;
  } else if (t < DROP) {                       // the leap: fast up, hang in the silence, fast down onto the predicted beat
    const s = (t - LAUNCH) / (DROP - LAUNCH);
    const u = s + 0.82 * Math.sin(2 * Math.PI * s) / (2 * Math.PI);
    z = lerp(stoneZ(RULE.length - 1), ZL, u); y = 4 * 3.1 * u * (1 - u);
    air = 1; stretch = 0.32 * Math.exp(-s * 9) + 0.06; tuck = smooth(s * 3); arm = 0.9 * smooth(s * 2.5) - 1.2 * smooth((s - 0.82) / 0.18);
    lean = -0.1 + 0.3 * smooth((s - 0.55) / 0.45); seam = 1.5 + 0.3 * Math.sin(s * 40); eyeY = -0.22 * smooth((s - 0.3) / 0.4);
  } else {                                      // the drop: stomps on every beat, then the final landing and a hold
    z = ZL; let tl = DROP, amp = 0.55;
    for (let i = 0; i < STOMPS.length; i++) if (t >= STOMPS[i]) { tl = STOMPS[i]; amp = STOMPS[i] === FINAL ? 0.42 : 0.3; }
    sq = landPop(t - tl, amp); seam = (tl === DROP ? 2.6 : 1.5) * Math.exp(-(t - tl) * 5) + (t < FINAL ? 0.35 : 0.2);
    const nxt = STOMPS.find((s) => s > t);
    if (nxt !== undefined) { const t0 = tl + 0.14, u = clamp((t - t0) / (nxt - t0)); if (t > t0) { y = 4 * 0.5 * u * (1 - u); air = Math.sin(Math.PI * u); } }
    arm = t >= FINAL ? 1.1 * (1 - Math.exp(-(t - FINAL) * 9)) - 0.25 * Math.exp(-(t - FINAL) * 4) * Math.sin((t - FINAL) * 20) : 0.5 * air;
  }
  stretch += 0.1 * air; tuck = Math.max(tuck, 0.45 * air); if (t < lastRule) lean = 0.12 * air;
  if (t < lastRule) arm = 0.55 * air;
  const blink = [1.2, 7.05].some((b) => t >= b && t < b + 0.12) ? 0.15 : 1;
  eyeX = t > FINAL + 0.6 ? 0.08 * Math.sin((t - FINAL) * 2) : 0;
  const sy = (1 - sq - crouch) * (1 + stretch), sxz = 1 / Math.sqrt(Math.max(0.3, sy));
  return { x: 0, y, z, sy, sxz, lean, arm, tuck, seam, eyeX, eyeY, blink, air };
}

// impacts that shake the camera / flash the light: [time, strength]
export const HITS = [...RULE.map((t) => [t, 0.12]), [LAUNCH, 0.25], [DROP, 1], ...STOMPS.map((t) => [t, t === FINAL ? 0.7 : 0.35])];
export const hitEnv = (t, tau = 0.22) => HITS.reduce((a, [h, s]) => a + (t >= h ? s * Math.exp(-(t - h) / tau) : 0), 0);

// camera: [pos, look, fov]; the first beats follow Clawd, the gap looks up at him, the drop whips out to the world
const V = (x, y, z) => [x, y, z];
const mixV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
function camA(t) { const zl = (S / BEAT) * Math.min(t, RULE[RULE.length - 1]); return { pos: V(1.7 - 0.15 * t, 2.9, zl + 13.0), look: V(0, 1.15, zl + 0.6), fov: 42 }; }
const B1 = { pos: V(0.8, 1.5, 28.0), look: V(0, 2.3, 16.5), fov: 50 };
const C1 = { pos: V(3.2, 8.0, 43.0), look: V(0, 3.6, 9.0), fov: 42 };
const D1 = { pos: V(1.4, 7.4, 40.0), look: V(0, 2.6, 7.0), fov: 42 };
const E1 = { pos: V(0.6, 7.0, 38.5), look: V(0, 2.5, 7.0), fov: 41 };
export function camera(t) {
  let c;
  const tB = RULE[RULE.length - 1];
  if (t <= tB) c = camA(t);
  else if (t < DROP) {
    const a = camA(tB), u = easeInOut((t - tB) / (LAUNCH - tB + 0.2));
    c = { pos: mixV(a.pos, B1.pos, u), look: mixV(a.look, B1.look, u), fov: lerp(a.fov, B1.fov, u) };
    const h = smooth((t - LAUNCH) / (DROP - LAUNCH)); c.pos[2] += 0.5 * h; c.look[1] += 0.25 * Math.sin(Math.PI * h);
  } else if (t < DROP + 0.75) {
    const u = easeOutExpo((t - DROP) / 0.75), b = { pos: [...B1.pos], look: [...B1.look] }; b.pos[2] += 0.5;
    c = { pos: mixV(b.pos, C1.pos, u), look: mixV(b.look, C1.look, u), fov: lerp(B1.fov, C1.fov, u) };
  } else if (t < FINAL) {
    const u = easeInOut((t - DROP - 0.75) / (FINAL - DROP - 0.75));
    c = { pos: mixV(C1.pos, D1.pos, u), look: mixV(C1.look, D1.look, u), fov: C1.fov };
  } else {
    const u = easeInOut((t - FINAL) / (CUES.end_s - FINAL));
    c = { pos: mixV(D1.pos, E1.pos, u), look: mixV(D1.look, E1.look, u), fov: lerp(D1.fov, E1.fov, u) - 2.2 * Math.exp(-(t - FINAL) * 3) };
  }
  // tension roll during the withheld beats, shake on impacts (deterministic)
  const roll = t > tB && t < DROP ? 0.05 * smooth((t - tB) / (LAUNCH - tB)) : 0;
  const k = hitEnv(t, 0.16) * (t >= DROP ? 0.55 : 0.12), f = t * 30;
  const sh = [k * (hash(f * 1.3) - 0.5), k * (hash(f * 2.1 + 7) - 0.5), 0];
  c.pos = c.pos.map((v, i) => v + sh[i]); c.roll = roll;
  return c;
}
