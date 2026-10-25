// world.js — the layout and every domino's fall time, as pure data/functions of the MEASURED cues (no three.js here).
// One rule the viewer can see from the first frame: each beat of the song knocks over the next domino. A small chain
// (Clawd hops along its tops on the thin bar's eighth notes), a gap where the song leaves out an eighth, an escalating
// line (each domino bigger, one per build onset) that ends in a monolith, and a whole plain of standing dominos set up
// around it — visibly waiting. The monolith lands on the drop; the plain falls outward, its front pushed by the
// song's low end, revealing glowing pips that keep breathing with the bass.
import { CUES } from './cues.js';
import { KEYS } from './keys.js';
export const E = CUES.events, FPS = CUES.fps, END = CUES.end_s;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const deg = Math.PI / 180;
// per-frame music envelopes (measured), sampled at any time
export const env = (arr, t) => { const x = clamp(t * FPS - 0.5, 0, arr.length - 1), i = Math.floor(x), u = x - i; return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], u); };
export const sub = (t) => env(CUES.sub, t), low = (t) => env(CUES.low, t);

export const DW = 0.5, DH = 1.0, DT = 0.16;          // domino width / height / thickness (base size)
export const dominos = [];                            // { x, z, ang (fall heading, rad, 0 = +x), s (scale), tHit, tContact, rest, kind }
const add = (o) => { dominos.push(o); return o; };

// ── the small chain: 6 dominos along +x, one per eighth-note onset of the thin bar
const CH = E.chain, X0 = -1.6, SP = 0.62;
CH.forEach((t, k) => add({ x: X0 + SP * k, z: 0, ang: 0, s: 1, tHit: t, tContact: k + 1 < CH.length ? CH[k + 1] : null, rest: k + 1 < CH.length ? 72 * deg : 90 * deg, kind: 'chain', sp: SP }));
// the last one falls flat into the gap; the next stands out of reach
export const X_FLAT = X0 + SP * (CH.length - 1);
export const X_GAP = X_FLAT + 1.5;
// ── the escalation: domino 6 (kicked by Clawd on the pickup) then one bigger domino per build onset, then the monolith
const B = E.build, GROW = 1.22;
let L = 0, h = 1;
const heading = (l) => (40 + 30 * Math.sin(l * 0.36)) * deg * smooth(l / 2.5);   // a snaking line toward the monolith: never stacked behind itself in the lens
let px = X_GAP, pz = 0;
const esc = [];
const hits = [E.pickup, ...B];                         // 12 hits: domino 6, then 7 … 16, then the monolith
for (let j = 0; j < hits.length; j++) {
  const last = j === hits.length - 1;
  const s = last ? 9 : h;
  const a = last ? 8 * deg : heading(L);    // the monolith falls across the view (profile), toward the plain's centre
  const d = add({ x: px, z: pz, ang: a, s, tHit: hits[j], tContact: last ? null : hits[j + 1], rest: last ? 90 * deg : 70 * deg, kind: last ? 'monolith' : 'esc' });
  esc.push(d);
  if (last) break;
  const step = 0.52 * s; d.sp = step;
  const a2 = heading(L + step / 2); px += Math.cos(a2) * step; pz -= Math.sin(a2) * step; L += step;
  h = j === 0 ? 1.25 : h * GROW;
}
export const MONO = esc[esc.length - 1];
export const DROP = E.drop;
// where the monolith's top lands = the centre of the plain's cascade
export const IMPACT = { x: MONO.x + Math.cos(MONO.ang) * MONO.s * DH, z: MONO.z - Math.sin(MONO.ang) * MONO.s * DH };
export const CLAWD_SPOT = { x: X_FLAT + 0.85, z: 0.55 };     // where Clawd stands from the kick to the end

const LINE = dominos.slice();      // the path (chain + escalation + monolith), placed above
// keep-out zones for the plain: a tight corridor along the path (each domino's own footprint), the monolith's fall
// footprint, a clearing round Clawd, and the sight lines from every camera key to Clawd
const segDist = (px2, pz2, ax, az, bx, bz) => { const vx = bx - ax, vz = bz - az, u = clamp(((px2 - ax) * vx + (pz2 - az) * vz) / (vx * vx + vz * vz + 1e-9)); return Math.hypot(px2 - ax - u * vx, pz2 - az - u * vz); };
const lineDist = (x, z) => {
  let m = 1e9;
  for (const d of LINE) { const L2 = d.s * DH * (d.kind === 'monolith' ? 1.05 : 1), hx = Math.cos(d.ang), hz = -Math.sin(d.ang);
    const r = segDist(x, z, d.x - hx * 0.3, d.z - hz * 0.3, d.x + hx * L2, d.z + hz * L2) - (DW * d.s) / 2 - 0.45; if (r < m) m = r; }
  return m;
};
// only the LOW camera keys can be blocked by 1.45-high dominos: clear their sight line near the subject
const LENS = KEYS.filter((k) => k[1][1] < 4.5).map((k) => [k[1][0], k[1][2]]);
const near = (x, z, sx, sz, cx, cz) => { const L2 = Math.hypot(cx - sx, cz - sz), u = 4.5 / L2; return segDist(x, z, sx, sz, sx + (cx - sx) * u, sz + (cz - sz) * u) < 1.1; };
const inSight = (x, z) => LENS.some(([cx, cz]) => near(x, z, CLAWD_SPOT.x, CLAWD_SPOT.z, cx, cz) || near(x, z, X0, 0, cx, cz));
// ── the plain: rings of standing dominos around the impact, facing it, falling outward
export const R_MAX = 50, PS = 1.45, CLEAR_R = 2.6;   // plain domino scale; a clearing around Clawd keeps the lens and the rule unobstructed
const plainStart = dominos.length;
for (let r = 4.5; r < R_MAX; r += 0.74 * PS) {
  const n = Math.floor((2 * Math.PI * r) / (0.66 * PS)), off = hash(r * 7.3) * 2 * Math.PI;
  for (let i = 0; i < n; i++) {
    const th = off + (i / n) * 2 * Math.PI, x = IMPACT.x + r * Math.cos(th), z = IMPACT.z + r * Math.sin(th);
    if (lineDist(x, z) < 0) continue;
    if (Math.hypot(x - CLAWD_SPOT.x, z - CLAWD_SPOT.z) < CLEAR_R) continue;
    if (Math.abs(z) < 1.2 && x > X0 - 1 && x < X_GAP + 1) continue;          // the small chain's lane
    if (inSight(x, z)) continue;
    // fall heading = outward; ang measured from +x toward −z (same convention as the chain)
    add({ x, z, ang: Math.atan2(-(z - IMPACT.z), x - IMPACT.x), r, th, s: PS, tHit: 0, tContact: null, rest: (74 + 8 * hash(dominos.length)) * deg, kind: 'plain' });
  }
}
// the front: its speed follows the song's measured low band, scaled so it reaches Clawd's clearing on T_FLOOD
const D_CLAWD = Math.hypot(CLAWD_SPOT.x - IMPACT.x, CLAWD_SPOT.z - IMPACT.z);
export const T_FLOOD = E.drop_beats[2];      // the falling front reaches Clawd's clearing on the drop's 3rd beat (≈1 s after the slam)
const DT_INT = 1 / 240, tTo = T_FLOOD;
let acc = 0; for (let t = DROP; t < tTo; t += DT_INT) acc += (0.35 + low(t)) * DT_INT;
const K = (D_CLAWD - CLEAR_R - 4.5) / acc;
const RT = []; { let R = 4.5; for (let t = DROP; t <= END + 1; t += DT_INT) { RT.push([t, R]); R += K * (0.35 + low(t)) * DT_INT; } }
export const frontR = (t) => (t < DROP ? 0 : RT[Math.min(RT.length - 1, Math.floor((t - DROP) / DT_INT))][1]);
const timeAt = (r) => { let lo = 0, hi = RT.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (RT[m][1] < r) lo = m + 1; else hi = m; } return RT[lo][0]; };
// five spiral arms race ahead of the front (energy paths)
export const ARMS = 5;
const armDist = (r, th) => {
  let best = 1e9; for (let a = 0; a < ARMS; a++) { const phi = a * 2 * Math.PI / ARMS + 1.1 * Math.log(r / 4.5); let d = ((th - phi) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; best = Math.min(best, Math.abs(d) * r); } return best;
};
for (let i = plainStart; i < dominos.length; i++) {
  const d = dominos[i]; const onArm = armDist(d.r, d.th) < 0.55;
  d.arm = onArm;
  d.tHit = onArm ? timeAt(4.5 + (d.r - 4.5) / 1.7) : timeAt(d.r) + 0.05 * hash(i * 1.3);
  d.tShock = DROP + d.r / 70;                 // the slam's shock ring (a hop) reaches it first
}

// angle of a domino at time t (0 = standing; rest = leaning/flat) and the time it settles
export function fallAngle(d, t) {
  if (t <= d.tHit) return 0;
  const g = d.s * DH, gap = d.sp && d.tContact ? d.sp - DT * d.s : null;
  if (d.tContact !== null && d.tContact !== undefined && gap) {
    const c = Math.asin(clamp(gap / g, 0, 0.99)), Tc = d.tContact - d.tHit;
    if (t < d.tContact) return c * ((t - d.tHit) / Tc) ** 2;
    return c + (d.rest - c) * smooth((t - d.tContact) / 0.45);
  }
  const T = d.kind === 'monolith' ? DROP - d.tHit : d.kind === 'chain' ? 0.3 : 0.34, u = (t - d.tHit) / T;
  if (u < 1) return d.rest * u ** (d.kind === 'monolith' ? 2.6 : 2);
  const b = t - d.tHit - T; return d.rest - 0.07 * Math.exp(-b * 9) * Math.abs(Math.sin(b * 22));
}
export const landTime = (d) => (d.kind === 'plain' ? d.tHit + 0.34 : d.kind === 'monolith' ? DROP : d.tContact ?? d.tHit + 0.3);
