// motion.js — Clawd's choreography and the camera, pure functions of time, driven by the MEASURED cues (no three.js).
import { CUES } from './cues.js';
import { KEYS } from './keys.js';
import { T_FLOOD, E, END, DROP, DH, DT, X_FLAT, X_GAP, CLAWD_SPOT, IMPACT, MONO, clamp, lerp, smooth, hash, sub } from './world.js';
const CH = E.chain, X0 = -1.6, SP = 0.62, BEATS = E.drop_beats, BAR2 = E.bar_lines[1], BAR3 = E.bar_lines[2];
const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * clamp(x)));
const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
const pop = (dt, a, f = 22, k = 10) => (dt < 0 ? 0 : a * (1 - Math.exp(-dt * 70)) * Math.exp(-dt * k) * Math.cos(dt * f));
const hopY = (u, h) => 4 * h * u * (1 - u);
export const T_SHOCK_CLAWD = DROP + Math.hypot(CLAWD_SPOT.x - IMPACT.x, CLAWD_SPOT.z - IMPACT.z) / 70;

// Clawd: pose fields for poseClawd; yaw is an OFFSET from facing the camera (the picture turns Clawd toward the lens)
export function clawd(t) {
  const p = { x: X0, y: DH, z: 0, yaw: 0, lean: 0, roll: 0, sy: 1, arm: [0, 0], wave: 0, tuck: 0, eye: { x: 0, y: 0, s: 1, blink: 1 } };
  let land = -1, amp = 0;
  if (t < CH[CH.length - 1]) {                                  // ① hop along the tops, one eighth note each
    let k = 0; while (k + 1 < CH.length && t >= CH[k + 1]) k++;
    if (t < CH[0]) { p.x = X0; }
    else { const u = (t - CH[k]) / (CH[k + 1] - CH[k]); p.x = lerp(X0 + SP * k, X0 + SP * (k + 1), smooth(u * 0.85 + 0.075)); p.y = DH + hopY(u, 0.32); p.tuck = 0.6 * Math.sin(Math.PI * u); p.arm = [0.8 * Math.sin(Math.PI * u), 0.8 * Math.sin(Math.PI * u)]; p.lean = 0.12 * Math.sin(Math.PI * u); land = CH[k]; amp = 0.18; }
  } else if (t < 1.80) {                                        // ② the gap: ride the last domino down, then look at it — and at you
    const t5 = CH[CH.length - 1], th = Math.min(Math.PI / 2, (Math.PI / 2) * ((t - t5) / 0.3) ** 2);
    const rx = X_FLAT + Math.sin(th) * DH * 0.85, ry = Math.cos(th) * DH * 0.85 + DT;
    p.x = rx; p.y = Math.max(DT, ry); land = t5; amp = 0.12;
    if (th >= Math.PI / 2) { land = t5 + 0.3; amp = 0.3; }
    p.lean = -0.25 * Math.sin(th); p.arm = [1.2 * Math.sin(th), 1.2 * Math.sin(th)];
    const look = smooth((t - 1.66) / 0.08), back = smooth((t - 1.74) / 0.06);
    p.eye.x = 0.9 * look * (1 - back); p.eye.y = -0.2 * look; p.yaw = lerp(0.5, 0, back); p.eye.s = 1 + 0.12 * back;
  } else if (t < 2.12) {                                        // ③ the pickup: wind up, bump domino 6 ON the hit, bounce back
    const k0 = 1.80, k1 = E.pickup;
    if (t < k1) { const u = (t - k0) / (k1 - k0); p.x = lerp(X_FLAT + 0.85, X_GAP - 0.5, u * u); p.y = DT + hopY(u * 0.5 + 0.5, 0.25) * 0 + 0.1 * Math.sin(Math.PI * u); p.lean = 0.4 * u; p.sy = 1 - 0.15 * Math.sin(Math.PI * u); p.yaw = 0.9; }
    else { const u = (t - k1) / (2.12 - k1); p.x = lerp(X_GAP - 0.5, CLAWD_SPOT.x, smooth(u)); p.z = lerp(0, CLAWD_SPOT.z, smooth(u)); p.y = lerp(DT, 0, u) + hopY(u, 0.3); p.lean = -0.3 * Math.sin(Math.PI * u); p.yaw = lerp(0.9, 0.5, u); p.arm = [0.6, 0.6]; p.eye.blink = u > 0.3 && u < 0.6 ? 0.2 : 1; }
    land = 2.12; amp = 0;
  } else {                                                       // ④ watch, brace, celebrate, dance on the beat, wave
    p.x = CLAWD_SPOT.x; p.z = CLAWD_SPOT.z; p.y = 0; land = 2.12; amp = 0.25; p.yaw = t < DROP ? 0.6 : 0;
    p.eye.x = t < DROP ? 0.6 : 0; p.eye.y = t < DROP ? 0.15 : 0;
    for (const b of E.build) if (t >= b && b > 2.9) { p.y += 0.04 * Math.exp(-(t - b) * 25); }
    const mono = E.build[E.build.length - 1];
    if (t >= mono && t < DROP) { const u = (t - mono) / (DROP - mono); p.sy = 1 - 0.14 * smooth(u * 2); p.eye.s = 1 + 0.25 * smooth(u * 3); p.arm = [-0.4 * smooth(u * 2), -0.4 * smooth(u * 2)]; }
    if (t >= DROP) {
      // joy jump on the drop, the shock bounce, then a hop on every beat; a big spin when the falling front reaches it
      const hops = [[DROP, 0.62, 0.33], ...BEATS.filter((b) => b > DROP + 0.4 && b < BAR3 - 0.01).map((b, i) => [b, Math.abs(b - T_FLOOD) < 0.02 ? 0.95 : 0.22, b === T_FLOOD ? 0.53 : 0.26]), [BAR3, 0.5, 0.36]];
      let hop = null; for (const h of hops) if (t >= h[0] && t < h[0] + h[2]) hop = h;
      let lastLand = DROP; for (const h of hops) if (t >= h[0] + h[2]) lastLand = h[0] + h[2];
      p.eye.x = 0; p.eye.y = 0; land = lastLand; amp = 0.22;
      if (hop) { const u = (t - hop[0]) / hop[2]; p.y = hopY(u, hop[1]); p.tuck = 0.6 * Math.sin(Math.PI * u); p.arm = [1.6 * Math.sin(Math.PI * u), 1.6 * Math.sin(Math.PI * u)]; if (hop[0] === T_FLOOD) { p.yaw += 2 * Math.PI * smooth(u); } }
      const bi = BEATS.filter((b) => t >= b).length; p.roll = t < BAR3 ? 0.12 * (bi % 2 ? 1 : -1) * smooth((t - BEATS[Math.max(0, bi - 1)]) / 0.15) : 0;
      if (t >= T_SHOCK_CLAWD && t < T_SHOCK_CLAWD + 0.4) p.y += 0.12 * Math.sin(Math.PI * (t - T_SHOCK_CLAWD) / 0.4);
      if (t >= BAR3 + 0.36) { const w = t - BAR3 - 0.36; p.arm = [0.3, 2.4 * smooth(w / 0.15)]; p.wave = Math.sin(w * 16) * smooth(w / 0.2); p.yaw = 0; }
    }
  }
  if (land >= 0) p.sy *= 1 - pop(t - land, amp);
  if ([0.75, 2.6, 9.25].some((b) => t >= b && t < b + 0.1)) p.eye.blink = 0.15;
  return p;
}

// camera: [pos, look, fov]; most shots keep Clawd ≈ 10–15 % of the frame height; the world does the spectacle
const V = (x, y, z) => [x, y, z];
const mixV = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));

export function camera(t) {
  let i = 0; while (i + 1 < KEYS.length && t >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[Math.min(KEYS.length - 1, i + 1)];
  const u0 = b === a ? 1 : (t - a[0]) / (b[0] - a[0]);
  const u = b[4] === 'expo' ? easeOutExpo(u0) : b[4] === 'lin' ? clamp(u0) : easeInOut(u0);
  const c = { pos: mixV(a[1], b[1], u), look: mixV(a[2], b[2], u), fov: lerp(a[3], b[3], u) };
  // follow Clawd's x during the chain (the camera trucks along with it)
  // impact shake (deterministic), strongest on the slam, small on the shock and the big beats
  const hits = [[DROP, 0.35], [T_SHOCK_CLAWD, 0.08], [BAR2, 0.06], [BAR3, 0.05]];
  const k = hits.reduce((s, [h, a2]) => s + (t >= h ? a2 * Math.exp(-(t - h) * 7) : 0), 0), f = t * 30;
  c.pos[0] += k * (hash(f * 1.7) - 0.5); c.pos[1] += k * (hash(f * 2.3 + 5) - 0.5);
  c.fov += t >= DROP ? 3 * Math.exp(-(t - DROP) * 5) : 0;
  return c;
}
export { sub };
