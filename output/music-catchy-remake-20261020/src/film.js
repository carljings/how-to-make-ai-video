// film.js — every frame is a pure function of its number: the listener's hops, the stones, the ghosts, the camera, and the
// 2D layer (title, section labels, word-timed subtitles, explanation labels, tags). Opus 5.5.
import { World } from './world.js';
import { W, H, FPS, T, BARS, BEAT, STONES, GROUP, GROUP_COLORS, ROW, SP, SCENES, sceneAt, C, CARDS, TAGS, ANSWER, FINAL_LINE,
  FADE_V0, FADE_V1, END, FRAMES, SUB, KICK, SPEC, frameOf } from './timeline.js';
import { NARR } from './narration.js';
import { clamp, mix, ramp, lin, win, smooth, easeOut, easeIn, easeInOut, backOut, hash } from './lib.js';
import { MUSIC } from './music.js';

const NB = MUSIC.bands;
const FONT = (w, px) => `${w} ${px}px "NSC", "Noto Sans SC", sans-serif`;
const COL = (k) => C[k] ?? k;
const lineAt = (id) => NARR.find((n) => n.id === id);
const tagTime = (v) => (typeof v === 'number' ? v : v === 'END' ? END : lineAt(v).at);

// ---- stone geometry (sizes in world units)
const STONE_W = 1.32, BIG_W = 3.3, BIG_H = 1.9, BIG_TOP = 0.75, FINAL_W = 2.2, FINAL_TOP = 0.32, FALL = 0.24;
const thick = (sub) => 0.1 + 0.52 * clamp((sub - 0.5) / 0.3);     // measured sub-bass → stone thickness
for (const s of STONES) {
  s.h = s.big ? BIG_H : s.final ? 1.0 : s.i === 0 ? 0.55 : thick(s.sub);   // stone 0: the listener's starting stone (not a beat stone)
  s.top = s.big ? BIG_TOP : s.final ? FINAL_TOP : 0;
  s.w = s.big ? BIG_W : s.final ? FINAL_W : STONE_W;
  s.thin = !s.big && !s.final && s.h < 0.36;
}
const INTRO_SKIP = STONES.filter((s) => s.t < T.d1 - 0.05 && s.i > 0).map((s) => s.i);   // intro beats: stones appear, the listener waits
// the listener's landings: stone 0 from the start, then every stone from drop 1 on
const LAND = [{ t: 0, s: STONES[0] }, ...STONES.filter((s) => s.t >= T.d1 - 0.05).map((s) => ({ t: s.t, s }))];
const BUILDS = [[BARS[0], T.d1], [T.build2, T.d2], [T.build3, T.d3]];   // charging windows (intro build, build bars)
const NOD0 = T.nod;

function landingIndex(t) { let k = 0; while (k + 1 < LAND.length && LAND[k + 1].t <= t) k++; return k; }
const lastLanding = (t) => LAND[landingIndex(t)];

// the listener at time t
function listener(t) {
  const k = landingIndex(t), A = LAND[k], B = LAND[k + 1];
  const pa = [A.s.x, A.s.top, A.s.z];
  let pos = pa.slice(), squash = 0, air = false, u = 0, dirX = 0, dirZ = 0, groundY = A.s.top, tuck = 0;
  const age = t - A.t;
  if (B) {
    const gap = B.t - A.t, big = B.s.big || B.s.final, lead = A.s.i === 0 ? 0.62 : Math.min(gap - 0.08, big ? 0.46 : gap * 0.82);
    const t0 = B.t - lead;
    dirX = B.s.x - A.s.x; dirZ = B.s.z - A.s.z;
    if (t >= t0) {   // in the air
      air = true; u = clamp((t - t0) / lead);
      const d = Math.hypot(dirX, dirZ), hgt = (big ? 2.2 : 0.42 + 0.12 * d) + Math.max(0, B.s.top - A.s.top);
      const ue = easeInOut(u, 1.6);
      pos = [mix(A.s.x, B.s.x, ue), mix(A.s.top, B.s.top, u) + hgt * 4 * u * (1 - u), mix(A.s.z, B.s.z, ue)];
      squash = 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) - 0.1 * ramp(u, 0.85, 1);
      tuck = Math.sin(Math.PI * u);
      groundY = u < 0.5 ? A.s.top : B.s.top;
    } else {        // on a stone: absorb the landing, crouch before the next take-off
      squash = -0.55 * Math.exp(-age * 15) - 0.4 * ramp(t, t0 - 0.12, t0);
    }
  }
  if (!air) squash -= 0.0;
  // charge: in a build the listener sinks lower and glows
  let charge = 0;
  for (const [a, b] of BUILDS) if (t >= a && t < b) charge = Math.max(charge, lin(t, a, b));
  if (!air) squash -= 0.18 * charge;
  // facing: the next stone, except in the opening (looks at us) and after the final landing
  let yaw = Math.atan2(dirX, dirZ || 1e-6);
  if (B === undefined) yaw = 0;
  const lookUs = t < T.d1 - 0.75 ? 1 : t > T.hit + 0.35 ? ramp(t, T.hit + 0.35, T.hit + 0.9) : 0;
  // nodding: from ① "nod" on, a forward nod on each landing (stronger while the line says so)
  const nodK = t >= NOD0 ? (t < T.thin2 ? 1 : 0.55) : 0.15;
  const beatAge = age;
  const nod = nodK * 0.42 * Math.exp(-beatAge * 7) * Math.sin(Math.min(Math.PI, beatAge * 9)) + (lookUs > 0.5 && t > T.hit ? 0.22 * Math.max(0, Math.sin((t - T.hit) * 2 * Math.PI / (2 * BEAT))) * ramp(t, T.hit + 0.6, T.hit + 1.0) : 0);
  const intro = t < T.d1 - 0.62 ? 0.07 * Math.sin(t * 2 * Math.PI / (2 * BEAT)) : 0;   // swaying in the dark
  const happy = t >= NOD0 && t < T.thin2 ? ramp(t, NOD0, NOD0 + 0.4) * 0.85 : t > T.hit + 0.6 ? 0.85 : 0;
  return { pos, squash, air, u, yaw, lookUs, nod, tilt: intro, charge, groundY: air && pos[1] - groundY > 3 ? null : groundY, tuck, A, B, eyeClose: happy * (1 - (air ? 1 : 0)),
    antenna: -0.5 * Math.exp(-age * 6) * Math.cos(age * 22) * (air ? 0.4 : 1) + (air ? -0.35 * Math.sin(Math.PI * u) : 0) };
}

// stone states
function stoneStates(t, mode) {
  const out = [];
  for (const s of STONES) {
    const preview = mode.preview ?? 0;
    let vis = false, y = s.top, sq = 1, glow = 0, alpha = 1, edge = 0;
    const age = t - s.t;
    if (s.i === 0) { vis = true; glow = 0.25 + 0.5 * Math.exp(-Math.max(0, age) * 4) * (age >= 0 ? 1 : 0); }
    else if (t >= s.t - FALL) {
      vis = true;
      // normal stones drop in from above; the drop stones and the podium RISE from the depth, so they meet the descending
      // listener exactly at the onset (falling from above, they passed under it in mid-air and read as an early landing)
      if (age < 0) { const u = (t - (s.t - FALL)) / FALL; y = s.big || s.final ? s.top - 8 * Math.pow(1 - u, 2) : s.top + 5 * Math.pow(1 - u, 2); }
      else { sq = 1 - (s.big ? 0.22 : 0.15) * Math.exp(-age * 12) * Math.cos(age * 30); glow = (s.big ? 0.38 : 0.7) * Math.exp(-age * (s.big ? 3.5 : 5.5)); }
    }
    const intro = INTRO_SKIP.includes(s.i);
    if (intro && vis) { alpha = 0.7; glow *= 0.6; }
    let color = 0xb9b3c9, glowColor = 0xff7a59, edgeColor = 0xffffff;
    if (s.thin) { alpha = Math.min(alpha, 0.5); edge = 0.85; color = 0xbfe9ff; edgeColor = 0x9fe9ff; }
    if (s.final) { color = 0xffe2a0; glowColor = 0xffd15c; }
    // ③ colour = the bar's repetition group (only groups with ≥ 2 bars)
    const gc = GROUP_COLORS[GROUP[s.r]];
    const tint = mode.tint ?? 0;
    if (gc && tint > 0) { glowColor = gc; edgeColor = gc; edge = Math.max(edge, 0.9 * tint); glow = Math.max(glow, 0.55 * tint); }
    if (!vis && preview > 0.01 && !s.final) { vis = true; alpha = 0.16 * preview; edge = 0.7 * preview; edgeColor = gc ?? 0x6c7896; color = 0x6c7896; glow = gc ? 0.4 * preview : 0; glowColor = gc ?? 0x000000; }
    // rows the listener has left behind sink into the depth (clean foreground); in ③ the whole song rises back as rows
    const keep = s.big && Math.abs(s.t - T.d2) < 0.06 && t < T.p3;   // the drop-2 stone stays for the comparison
    const rEnd = BARS[Math.min(BARS.length - 1, s.r + 1)];   // the listener leaves row r here
    let sink = keep || s.final ? 0 : ramp(t, rEnd + 0.05, rEnd + 0.75);
    sink *= 1 - win(t, T.p3 - 0.3, T.p3 + 0.9, T.extra - 0.5, T.extra);
    if (sink > 0.985) vis = false;
    y -= 4.5 * easeIn(sink, 2); alpha *= 1 - sink; glow *= 1 - sink; edge *= 1 - sink;
    const h = s.h * sq;
    out.push({ vis, x: s.x, y, z: s.z, w: s.w, h, d: s.w, alpha, glow, glowColor, color, edge, edgeColor, thin: s.thin, matte: s.big || s.final });
  }
  return out;
}
// ghosts: where the next stone will be — appear ~1.4 beats ahead, normal size even before a drop
function ghostStates(t) {
  const out = [];
  const on = t >= T.ghosts;
  for (const s of STONES) {
    let a = 0;
    if (on && s.i > 0) a = ramp(t, s.t - 0.78, s.t - 0.42) * (1 - ramp(t, s.t - 0.02, s.t + 0.04));
    // the drop-2 ghost stays as the comparison (guessed vs real)
    if (s.big && Math.abs(s.t - T.d2) < 0.06 && t >= s.t) a = ramp(t, s.t + 0.35, s.t + 0.9) * (1 - ramp(t, T.p3 - 0.4, T.p3));
    const frozen = s.big && Math.abs(s.t - T.d2) < 0.06 && t >= s.t;   // the guess sits on top of the real stone: same moment, a fraction of the size
    out.push({ a, x: s.x, y: frozen ? s.top + 0.55 : 0, z: s.z, w: STONE_W * 1.02, h: 0.55, d: STONE_W * 1.02, color: 0x5ee6ff });
  }
  return out;
}
// rings: small ripple on each landing, big rings on drops / the final hit
function ringStates(t) {
  const R = [];
  for (let k = LAND.length - 1; k >= 0 && R.length < 8; k--) {
    const L = LAND[k], age = t - L.t; if (age < 0) continue; if (age > 1.6) break;
    const big = L.s.big || L.s.final;
    if (big) {
      for (const [d, col, rmax] of [[0, L.s.final ? 0xffd15c : 0xff7a59, 11], [0.08, 0x5ee6ff, 8], [0.16, 0xff5fa2, 5.5]]) {   // rings start outside the stone's footprint (not under the listener's face)
        const a = age - d; if (a < 0 || a > 1.4) continue; const u = a / 1.4;
        R.push({ c: [L.s.x, L.s.top + 0.03, L.s.z], r: L.s.w * 0.78 + rmax * easeOut(u, 2.2), a: 0.75 * (1 - u) * (1 - u), color: col });
      }
    } else if (age < 0.5) { const u = age / 0.5; R.push({ c: [L.s.x, L.s.top + 0.02, L.s.z], r: 0.75 + 0.9 * easeOut(u, 2), a: 0.45 * (1 - u), color: 0xffb59f }); }
  }
  return R.slice(0, 8);
}

// ---- cameras (one per shot; hard cuts happen on detected onsets = scene / shot boundaries)
const V = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
function smoothChar(t, lag = 0.18) {   // a camera-friendly (lagged, de-bounced) listener position: average over the last `lag` s
  let p = [0, 0, 0]; const n = 6;
  for (let i = 0; i < n; i++) { const q = listener(t - lag * i / (n - 1)).pos; p = add(p, [q[0] / n, 0, q[2] / n]); }
  return p;
}
const stone = (i) => STONES[i];
const D2 = STONES.find((s) => s.big && Math.abs(s.t - T.d2) < 0.06), D3 = STONES.find((s) => s.big && Math.abs(s.t - T.d3) < 0.06), FIN = STONES.find((s) => s.final);
const SHOTS = [
  { t0: 0, t1: T.d1 - 0.55, cam: (t) => { const u = lin(t, 0, T.d1); const c = [STONES[0].x, 0, 0];
    return { pos: add(c, [mix(-2.2, -1.8, u), mix(1.7, 1.45, u), mix(7.6, 6.4, u)]), target: add(c, [mix(1.0, 0.85, u), 0.55, -0.6]), fov: 40 }; } },
  { t0: T.d1 - 0.55, t1: T.p1, cam: (t) => { const c = smoothChar(t, 0.3), u = lin(t, T.d1 - 0.55, T.p1);
    return { pos: add(c, [mix(-3.0, 0.6, u), mix(3.0, 5.0, u), mix(7.5, 8.6, u)]), target: add(c, [0.4, 0.3, mix(-0.8, -3.6, u)]), fov: 46 }; } },
  { t0: T.p1, t1: T.nod, cam: (t) => { const c = smoothChar(t, 0.6), rz = c[2];
    return { pos: [c[0] * 0.55, 6.2, rz + 9.5], target: [c[0] * 0.55, -0.3, rz - 1.4], fov: 48 }; } },
  { t0: T.nod, t1: BARS[6], cam: (t) => { const c = smoothChar(t, 0.12), d = Math.sign(STONES.find((s) => s.r === 5 && s.j === 3).x - STONES.find((s) => s.r === 5 && s.j === 0).x);
    return { pos: add(c, [d * 3.9, 1.9, 5.0]), target: add(c, [0, 0.8, 0]), fov: 38 }; } },
  { t0: BARS[6], t1: T.thin2, cam: (t) => { const c = smoothChar(t, 0.12), d = Math.sign(STONES.find((s) => s.r === 6 && s.j === 3).x - STONES.find((s) => s.r === 6 && s.j === 0).x);
    return { pos: add(c, [d * 3.9, 1.9, 5.0]), target: add(c, [0, 0.8, 0]), fov: 38 }; } },
  { t0: T.thin2, t1: T.build2, cam: (t) => { const c = smoothChar(t, 0.4), u = lin(t, T.thin2, T.build2);
    const d = -1;   // row 7 runs right→left
    return { pos: add(c, [mix(1.6, 0.6, u), 2.9, 6.4]), target: add(c, [d * 1.2, 0.35, -1.0]), fov: 44 }; } },
  { t0: T.build2, t1: T.d2, cam: (t) => { const c = smoothChar(t, 0.4), u = easeInOut(lin(t, T.build2, T.d2), 2);
    return { pos: add(c, [mix(-0.8, -2.5, u), mix(1.6, 5.0, u), mix(5.6, 9.5, u)]), target: V(add(c, [0.5, 0.3, -1]), [D2.x, 0.3, D2.z], u * 0.75), fov: 46 }; } },
  { t0: T.d2, t1: T.cmp, cam: (t) => { const u = lin(t, T.d2, T.cmp), a = mix(-0.75, -0.25, easeOut(u, 2));
    return { pos: [D2.x + Math.sin(a) * 9.0, mix(4.2, 5.2, u), D2.z + Math.cos(a) * 9.0], target: [D2.x - 0.4, 0.3, D2.z - 0.6], fov: 44 }; } },
  { t0: T.cmp, t1: T.p3, cam: (t) => { const u = lin(t, T.cmp, T.p3), rise = easeInOut(lin(t, T.p3 - 1.6, T.p3), 2);
    const base = { pos: [D2.x - 6.2 + 0.8 * u, 5.2, D2.z + 8.4 - 0.6 * u], target: [D2.x - 0.4, 0.2, D2.z - 0.6] };
    return { pos: V(base.pos, [1.0, 30, -8], rise), target: V(base.target, [1.2, 0, -25], rise), fov: mix(42, 52, rise) }; } },
  { t0: T.p3, t1: T.extra, cam: (t) => { const u = lin(t, T.p3, T.extra);
    return { pos: [mix(1.0, 1.6, u), mix(30, 47, easeOut(lin(t, T.p3, T.p3 + 1.6), 2)), mix(-8, -10, u)], target: [1.2, 0, -26], fov: 52 }; } },
  { t0: T.extra, t1: T.d3, cam: (t) => { const c = smoothChar(t, 0.4), u = easeInOut(lin(t, T.extra, T.d3), 2);
    return { pos: add(c, [mix(-2.2, -3.4, u), mix(2.4, 4.4, u), mix(6.4, 9.0, u)]), target: V(add(c, [0.6, 0.35, -1]), [D3.x, 0.3, D3.z], u * 0.7), fov: 46, roll: 0.05 * Math.sin(t * 9) * u }; } },
  { t0: T.d3, t1: T.d3 + 1.07, cam: (t) => { const u = lin(t, T.d3, T.d3 + 1.07), a = mix(0.9, -0.2, easeOut(u, 2.5));
    const c = smoothChar(t, 0.2), tg = V([D3.x, 0.4, D3.z], [c[0], 0.6, c[2]], easeInOut(u, 2));
    return { pos: [tg[0] + Math.sin(a) * 10.5, mix(1.6, 4.0, u), tg[2] + Math.cos(a) * 10.5], target: tg, fov: 48 }; } },
  { t0: T.d3 + 1.07, t1: T.coda, cam: (t) => { const c = smoothChar(t, 0.15);   // row 16 runs left→right
    return { pos: add(c, [4.2, 2.0, 4.4]), target: add(c, [0.3, 0.8, 0]), fov: 40 }; } },
  { t0: T.coda, t1: T.hit - 0.5, cam: (t) => { const c = smoothChar(t, 0.15);       // row 17 runs right→left
    return { pos: add(c, [-4.2, 2.0, 4.4]), target: add(c, [-0.3, 0.8, 0]), fov: 40 }; } },
  { t0: T.hit - 0.5, t1: END + 1, cam: (t) => { const u = easeOut(lin(t, T.hit - 0.5, T.hit + 2.5), 2);
    return { pos: [FIN.x + mix(0, 0.2, u), FIN.top + mix(2.6, 1.55, u), FIN.z + mix(7.4, 4.6, u)], target: [FIN.x, FIN.top + 0.95, FIN.z], fov: 38 }; } },
];
const shotAt = (t) => SHOTS.findIndex((s) => t >= s.t0 && t < s.t1);

export class Film {
  async init() {
    this.out = document.getElementById('out'); this.out.width = W; this.out.height = H; this.ctx = this.out.getContext('2d');
    const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
    this.world = new World(); await this.world.init(gl);
    this.frameCount = FRAMES;
  }
  bands(f) { const i = Math.max(0, Math.min(MUSIC.frames - 1, f)); return SPEC.subarray(i * NB, i * NB + NB); }
  state(t, f) {
    const L = listener(t), si = Math.max(0, shotAt(t)), S = SHOTS[si];
    const cam = S.cam(t);
    // a short punch on every cut, a shake on big landings
    const since = t - S.t0, punch = si > 0 ? Math.exp(-since * 9) : 0;
    cam.fov *= 1 - 0.05 * punch;
    const last = lastLanding(t), bigAge = t - last.t, shake = (last.s.big || last.s.final) && bigAge >= 0 && bigAge < 0.8 ? 0.22 * Math.exp(-bigAge * 5) : 0;
    if (shake) { const n = (k) => Math.sin(t * (41 + 9 * k) + k) * 0.6 + Math.sin(t * (77 + 5 * k) + 2 * k) * 0.4; cam.target = add(cam.target, [shake * n(1), shake * n(2), shake * n(3)]); }
    const kick = KICK[Math.min(KICK.length - 1, f)] ?? 0;
    const sc = sceneAt(t).fn;
    const mode = {
      tint: t >= T.p3 + 0.6 ? ramp(t, T.p3 + 0.6, T.p3 + 1.6) : 0,
      preview: win(t, T.p3 + 0.2, T.p3 + 1.2, T.extra - 0.5, T.extra),
    };
    const dark = t < T.d1 ? 1 : 0;
    const rows = {};
    if (t >= T.p3) for (let r = 0; r < BARS.length; r++) rows[r] = 0.85 * win(t, T.p3 + 0.8 + r * 0.04, T.p3 + 1.4 + r * 0.04, T.extra - 0.4, T.extra);
    const arcs = {};
    if (t >= T.p3) for (const A of this.world.arcs) arcs[`${A.r0}-${A.r1}`] = clamp((t - (T.p3 + 1.2 + 0.18 * A.r0)) / 0.9) * (1 - ramp(t, T.extra - 0.5, T.extra));
    const bigFlash = (last.s.big || last.s.final) && bigAge >= 0 ? Math.exp(-bigAge * 2.5) : 0;
    const yawUs = Math.atan2(cam.pos[0] - L.pos[0], cam.pos[2] - L.pos[2]);
    const yaw = L.lookUs > 0 ? mixAngle(L.yaw, yawUs, L.lookUs) : L.yaw;
    return {
      t, cam,
      exposure: dark ? mix(0.62, 0.95, ramp(t, T.d1 - 0.4, T.d1)) : 1.0,
      bloom: 0.42 + 0.1 * bigFlash + 0.1 * kick * (dark ? 0 : 1),
      fog: sc === 'repeat' ? 0.004 : 0.013,
      skyGlow: dark ? 0.18 : 0.32 + 0.35 * bigFlash,
      grid: dark ? 0.15 : 0.55,
      hemi: dark ? 0.3 : 0.55,
      keyK: dark ? 1.2 : 1.8, rimK: dark ? 2.0 : 1.4,
      charLight: 2.0 * L.charge + 0.5 * bigFlash,
      eqK: dark ? 0.25 : sc === 'finale' && t < T.d3 + 1.07 ? 1.25 : 0.9, eqAlpha: dark ? 0.35 : 0.85, dustK: dark ? 0.3 : 0.5 + 0.4 * bigFlash,
      bands: this.bands(f),
      char: { pos: L.pos, yaw, squash: L.squash, nod: L.nod, tilt: L.tilt, antenna: L.antenna, cupGlow: 0.6 * kick * (dark ? 0.3 : 1) + 1.5 * L.charge, eyeClose: L.eyeClose,
        tuck: L.tuck, halo: Math.max(L.charge * 0.9, 0), haloColor: L.charge > 0.6 ? 0xff7a59 : 0x5ee6ff, groundY: L.groundY },
      stones: stoneStates(t, mode), ghosts: ghostStates(t), rings: ringStates(t), arcs, rowMarks: rows,
      L, shot: si,
    };
  }

  async render(f) {
    const t = Math.min(f / FPS, END - 1e-6), ctx = this.ctx;
    const st = this.state(t, f);
    this.world.set(st);
    ctx.drawImage(this.world.render(), 0, 0);
    this.overlay(ctx, t, st, f);
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const fade = lin(t, FADE_V0, FADE_V1);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
    return true;
  }

  // ------------------------------------------------------------------ 2D layer
  overlay(ctx, t, st, f) {
    this.drawCards(ctx, t);
    if (t >= T.p1 && t < T.ghosts + 0.6) this.drawRuler(ctx, t);
    if (t >= T.ghosts - 0.2 && t < T.nod + 0.3) this.drawGhostLabel(ctx, t);
    if (t >= T.thin2 && t < T.d2) this.drawBassMeter(ctx, t, f);
    if (t >= T.d2 + 0.3 && t < T.p3) this.drawCompare(ctx, t);
    if (t >= T.p3 + 0.8 && t < T.extra) this.drawRepeat(ctx, t);
    if (t >= lineAt('L10').at - 0.05) this.drawAnswer(ctx, t);
    this.drawSubtitles(ctx, t);
    this.drawTag(ctx, t);
  }
  text(ctx, s, x, y, o = {}) {   // stroked text, centred unless o.align
    ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.font = FONT(o.w ?? 900, o.px ?? 48); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = o.stroke ?? Math.max(5, (o.px ?? 48) * 0.12); ctx.strokeStyle = o.strokeColor ?? 'rgba(4,6,18,0.72)';
    ctx.strokeText(s, x, y); ctx.fillStyle = o.color ?? C.white; ctx.fillText(s, x, y); ctx.restore();
  }
  pill(ctx, s, x, y, o = {}) {
    ctx.save(); ctx.globalAlpha = o.a ?? 1; ctx.font = FONT(o.w ?? 900, o.px ?? 40);
    const tw = ctx.measureText(s).width, pw = tw + (o.padX ?? 40), ph = (o.px ?? 40) * 1.55;
    ctx.fillStyle = o.bg ?? 'rgba(8,10,26,0.72)'; ctx.beginPath(); ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, ph / 2); ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.color ?? C.white; ctx.fillText(s, x, y + 2); ctx.restore();
    return pw;
  }
  spansText(ctx, line, x, y, px, a, k = 1) {   // a line with coloured spans, glyphs rising in one by one (k: 0..1 reveal)
    ctx.save(); ctx.font = FONT(900, px); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const chars = [...line.text], widths = chars.map((c) => ctx.measureText(c).width), total = widths.reduce((p, q) => p + q, 0);
    let cx = x - total / 2;
    chars.forEach((ch, i) => {
      const ki = clamp(k * chars.length * 1.0 - i * 0.55), dy = (1 - backOut(ki, 1.4)) * px * 0.5;
      let col = C.white; for (const s of line.spans || []) { const p = line.text.indexOf(s.k); if (p >= 0 && i >= p && i < p + [...s.k].length) col = COL(s.c); }
      ctx.globalAlpha = a * Math.min(1, ki * 1.5);
      ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.13; ctx.strokeStyle = 'rgba(4,6,18,0.75)'; ctx.strokeText(ch, cx, y + dy);
      ctx.fillStyle = col; ctx.fillText(ch, cx, y + dy); cx += widths[i];
    });
    ctx.restore();
  }
  drawCards(ctx, t) {
    for (const card of CARDS) {
      const t0 = card.lines[0].at; if (t < t0 - 0.01) continue;
      const outF = frameOf(card.out) / FPS; if (t >= outF - 1e-6) continue;
      if (card.id === 'title') {
        const a = 1 - ramp(t, T.d1 - 0.5, T.d1 - 0.02);
        card.lines.forEach((l, i) => this.spansText(ctx, l, W / 2, card.y + i * 138, 112, a, 1));   // the whole question is on screen from frame 0
      } else {   // section label: a chip that slides in from the left
        const l = card.lines[0], k = easeOut(lin(t, l.at, l.at + 0.35), 3);
        const x = mix(-200, W / 2, k);
        this.drawSection(ctx, l, x, card.y, k);
      }
    }
  }
  drawSection(ctx, l, x, y, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.font = FONT(900, 70);
    const tw = ctx.measureText(l.text).width, pw = tw + 80, ph = 112;
    ctx.fillStyle = 'rgba(8,10,26,0.66)'; ctx.beginPath(); ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 28); ctx.fill();
    const col = COL(l.spans?.[0]?.c ?? 'white'); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    this.spansText(ctx, l, x, y + 2, 70, a, 1);
  }
  // subtitles: the current line, words lighting up on the voice's own word boundaries
  drawSubtitles(ctx, t) {
    const L = NARR.find((n) => t >= n.at && t < n.at + n.dur + 0.3);
    if (!L || L.id === 'L11') return;   // the last line is the final card
    const a = ramp(t, L.at, L.at + 0.12) * (1 - ramp(t, L.at + L.dur + 0.1, L.at + L.dur + 0.3));
    const px = [...L.text].length > 13 ? 56 : 62, y = 1430;
    ctx.save(); ctx.font = FONT(900, px); ctx.textBaseline = 'middle';
    const chars = [...L.text], widths = chars.map((c) => ctx.measureText(c).width), total = widths.reduce((p, q) => p + q, 0);
    const bw = Math.min(W - 80, total + 70), bh = px * 1.75;
    ctx.globalAlpha = a * 0.62; ctx.fillStyle = 'rgba(6,8,22,0.85)'; ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, y - bh / 2, bw, bh, bh / 2); ctx.fill();
    // which characters have been spoken: map word boundaries onto the text
    const spokenUpTo = spokenChars(L, t);
    let x = W / 2 - total / 2;
    chars.forEach((ch, i) => {
      const on = i < spokenUpTo;
      ctx.globalAlpha = a * (on ? 1 : 0.55); ctx.lineJoin = 'round'; ctx.lineWidth = px * 0.12; ctx.strokeStyle = 'rgba(4,6,18,0.8)';
      ctx.strokeText(ch, x, y); ctx.fillStyle = on ? C.white : '#9aa3b8'; ctx.fillText(ch, x, y); x += widths[i];
    });
    ctx.restore();
  }
  drawTag(ctx, t) {
    const g = TAGS.find((x) => t >= tagTime(x.from) && t < tagTime(x.to)); if (!g) return;
    const a = Math.min(lin(t, tagTime(g.from), tagTime(g.from) + 0.25), 1 - lin(t, tagTime(g.to) - 0.2, tagTime(g.to)));
    ctx.save(); ctx.globalAlpha = 0.85 * a; ctx.font = FONT(500, 30); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const fit = Math.min(1, 820 / ctx.measureText(g.text).width);
    ctx.fillStyle = 'rgba(230,236,245,0.9)'; ctx.fillRect(60, 150, 24, 3);
    ctx.translate(96, 152); ctx.scale(fit, 1); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(g.text, 0, 0); ctx.fillStyle = '#e6ecf5'; ctx.fillText(g.text, 0, 0);
    ctx.restore();
  }
  // ① the ruler: equal gaps between the landed stones of the current row, "≈0.53 秒" between neighbours
  drawRuler(ctx, t) {
    const a = ramp(t, T.p1 + 0.2, T.p1 + 0.6) * (1 - ramp(t, T.ghosts + 0.1, T.ghosts + 0.6));
    const last4 = STONES.filter((s) => s.t <= t && s.t >= T.p1 - 0.05 && !s.big).slice(-4), rs = last4.filter((s) => s.r === last4[last4.length - 1]?.r);   // landed stones of the current row
    ctx.save(); ctx.globalAlpha = a;
    const pts = rs.map((s) => this.world.project([s.x, -s.h - 0.25, s.z + STONE_W / 2]));
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i], k = easeOut(lin(t, rs[i].t, rs[i].t + 0.2), 2);
      ctx.strokeStyle = C.beat; ctx.lineWidth = 5; ctx.globalAlpha = a * k; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();
      if (i > 0 && rs[i - 1].r === rs[i].r) {   // only neighbours on the same row
        const [x0, y0] = pts[i - 1]; ctx.globalAlpha = a * k; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
        this.pill(ctx, '≈0.53 秒', (x0 + x) / 2, (y0 + y) / 2 + 52, { px: 34, a: a * k, color: C.beat, border: 'rgba(255,122,89,0.6)' });
      }
    }
    ctx.restore();
  }
  // ① ghosts: label the next ghost "猜的" once
  drawGhostLabel(ctx, t) {
    const a = ramp(t, T.ghosts + 0.1, T.ghosts + 0.4) * (1 - ramp(t, T.nod - 0.15, T.nod + 0.2));
    const next = STONES.find((s) => s.t > t + 0.05); if (!next || a <= 0) return;
    const [x, y, ok] = this.world.project([next.x, 0.95, next.z]); if (!ok) return;
    this.pill(ctx, '猜的', x, y - 60, { px: 38, a, color: C.ghost, border: 'rgba(94,230,255,0.7)' });
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.ghost; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x, y - 6); ctx.stroke(); ctx.restore();
  }
  // ② the measured bass: a meter whose level is the master's sub-bass right now; thin bar shaded
  drawBassMeter(ctx, t, f) {
    const a = ramp(t, T.thin2 + 0.1, T.thin2 + 0.45) * (1 - ramp(t, T.d2 - 0.25, T.d2));
    const x = 120, y0 = 1180, hgt = 430, w = 54;
    let v = 0; for (let j = -3; j <= 3; j++) v += SUB[Math.max(0, Math.min(SUB.length - 1, f + j))] ?? 0; v /= 7;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,10,26,0.66)'; ctx.beginPath(); ctx.roundRect(x - 34, y0 - hgt - 86, w + 68, hgt + 128, 26); ctx.fill();
    ctx.strokeStyle = 'rgba(159,233,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y0 - hgt, w, hgt, 12); ctx.stroke();
    const lh = (hgt - 10) * clamp(v); const g = ctx.createLinearGradient(0, y0, 0, y0 - hgt); g.addColorStop(0, '#5ee6ff'); g.addColorStop(1, '#ff7a59');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 5, y0 - 5 - lh, w - 10, lh, 8); ctx.fill();
    ctx.restore();
    this.text(ctx, '低音', x + w / 2, y0 - hgt - 44, { px: 36, a, color: '#9fe9ff' });
  }
  // ② guessed vs real: labels on the frozen ghost and the giant stone, then the two chips on the L06 words
  drawCompare(ctx, t) {
    const a = ramp(t, T.d2 + 0.6, T.d2 + 1.0);
    const [gx, gy, ok1] = this.world.project([D2.x, D2.top + 0.6, D2.z]), [rx, ry, ok2] = this.world.project([D2.x, D2.top - BIG_H * 0.55, D2.z + BIG_W / 2]);
    if (ok1) this.pill(ctx, '猜的', gx, gy - 95, { px: 46, a: a * (1 - ramp(t, T.p3 - 1.6, T.p3 - 1.1)), color: C.ghost, border: 'rgba(94,230,255,0.7)' });
    if (ok2) this.pill(ctx, '真的', rx, ry, { px: 46, a: a * (1 - ramp(t, T.p3 - 1.6, T.p3 - 1.1)), color: C.beat, border: 'rgba(255,122,89,0.7)' });
    const L6 = lineAt('L06'), w1 = wordTime(L6, '猜'), w2 = wordTime(L6, '意外');
    const k1 = ramp(t, w1 ?? L6.at + 0.2, (w1 ?? L6.at + 0.2) + 0.3), k2 = ramp(t, w2 ?? L6.at + 1.6, (w2 ?? L6.at + 1.6) + 0.3);
    const out = 1 - ramp(t, T.p3 - 1.6, T.p3 - 1.1);
    this.pill(ctx, '时间：猜中了', W / 2, 440, { px: 46, a: k1 * out, color: C.ghost, border: 'rgba(94,230,255,0.6)' });
    this.pill(ctx, '力度：没想到', W / 2, 545, { px: 46, a: k2 * out, color: C.beat, border: 'rgba(255,122,89,0.6)' });
  }
  // ③ the song as rows: legend, row numbers on twin rows, then the repeated-listening chart on L09
  drawRepeat(ctx, t) {
    const a = ramp(t, T.p3 + 1.0, T.p3 + 1.5) * (1 - ramp(t, T.extra - 0.4, T.extra));
    this.pill(ctx, '同色 = 相似的小节', W / 2, 400, { px: 46, a: a * (1 - ramp(t, lineAt('L09').at - 0.2, lineAt('L09').at + 0.2)), w: 500 });
    // the listener's current bar
    const cur = listener(t).A.s.r;
    const [x, y, ok] = this.world.project([-4.4, 0, -cur * ROW]);
    if (ok) this.pill(ctx, `第${cur + 1}小节`, x - 40, y, { px: 34, a: a * 0.9, w: 500, color: C.white });
    // L09: liking over repeated listening (study result, schematic bars)
    const L9 = lineAt('L09'), k = ramp(t, L9.at + 0.1, L9.at + 0.5) * a;
    if (k > 0.01) {
      const bx = 110, by = 760, bw = 440, bh = 240;
      ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(8,10,26,0.72)'; ctx.beginPath(); ctx.roundRect(bx - 30, by - bh - 70, bw + 60, bh + 150, 26); ctx.fill(); ctx.restore();
      this.text(ctx, '喜欢', bx + 10, by - bh - 30, { px: 42, a: k, align: 'left', color: C.gold });
      this.text(ctx, '研究示意', bx + bw - 10, by - bh - 30, { px: 30, w: 500, a: k * 0.85, align: 'right', color: C.dim });
      ['第1遍', '第2遍', '第3遍'].forEach((s, i) => {
        const g = easeOut(lin(t, L9.at + 0.4 + i * 0.35, L9.at + 0.8 + i * 0.35), 2.5), hh = bh * (0.42 + 0.17 * i) * g, cx = bx + 75 + i * 145;
        ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.roundRect(cx - 40, by - hh, 80, hh, 10); ctx.fill(); ctx.restore();
        this.text(ctx, s, cx, by + 40, { px: 34, w: 500, a: k });
      });
    }
  }
  // the answer: three chips on the words of L10, then the final line
  drawAnswer(ctx, t) {
    const L10 = lineAt('L10'), out = 1 - ramp(t, T.hit - 0.1, T.hit + 0.35);
    ANSWER.forEach((A, i) => {
      const wt = wordTime(L10, A.word) ?? L10.at + 0.2 + i * 0.85, k = easeOut(lin(t, wt, wt + 0.3), 3);
      const y = 380 + i * 120, x = W / 2 + (1 - k) * (i % 2 ? 240 : -240);
      this.pill(ctx, `${['①', '②', '③'][i]} ${A.k}`, x, y, { px: 62, a: k * out, color: COL(A.c), border: COL(A.c), bg: 'rgba(8,10,26,0.7)' });
    });
    const L11 = lineAt('L11');
    if (t >= L11.at) {
      const a = ramp(t, L11.at + 0.05, L11.at + 0.35);
      this.spansText(ctx, { text: FINAL_LINE, spans: [{ k: '上头', c: 'beat' }] }, W / 2, 420, 104, a, lin(t, L11.at, L11.at + 0.9));
    }
  }
}
// how many characters of L.text have been spoken by t (word boundaries mapped in order onto the text, punctuation skipped)
function spokenChars(L, t) {
  if (!L.words || !L.words.length) return Math.floor([...L.text].length * clamp((t - L.at) / L.dur));
  const chars = [...L.text]; let pos = 0, upto = 0;
  for (const w of L.words) {
    const idx = L.text.indexOf(w.w, charIndexToUtf16(chars, pos)); if (idx < 0) continue;
    const ci = [...L.text.slice(0, idx)].length; pos = ci + [...w.w].length;
    if (t >= w.t) upto = pos;
  }
  if (t >= L.at + L.dur - 0.12) upto = chars.length;   // trailing punctuation
  return upto;
}
const charIndexToUtf16 = (chars, i) => chars.slice(0, i).join('').length;
function wordTime(L, w) { const x = (L.words || []).find((q) => q.w.includes(w) || w.includes(q.w)); return x ? x.t : null; }
function mixAngle(a, b, k) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; }
