// timeline.js — the film as a pure function of time. Shots, cameras, lights and every explanatory event are keyed
// to the aligned voice (word times), not to fixed seconds: if the voice changes, the events move with it.
import { Voice } from './voice.js';
import { filmEvents } from './events.js';
import { m4, add, sub, scale, norm, len, cross, dot, mix, clamp, smooth, ramp, lin, win, easeOut, easeIn, easeInOut,
  keyedSmooth, lerp3, hash1, deg } from './math.js';

const NIGHT_POST = {
  exposure: 1.0, bloom: 0.12, streak: 0.10, vignette: 0.5, ca: 0.0018, grain: 0.035, sat: 1.06, contrast: 1.07,
  lift: [0.0, 0.0035, 0.007], gamma: [1.0, 1.0, 1.0], gain: [1.0, 1.0, 1.0], flash: [1, 1, 1, 0], threshold: 1.4, knee: 0.8,
};
const AIR_POST = Object.assign({}, NIGHT_POST, { bloom: 0.22, streak: 0.05, sat: 1.12, contrast: 1.05, lift: [0.0, 0.002, 0.006], threshold: 1.0 });
const AIR = { bg: [0.0035, 0.008, 0.017], rim: [0.36, 0.74, 1.0], contour: 0.32 };
const GOLD = [1.0, 0.62, 0.2];
const CYAN = [0.35, 0.85, 1.0];
const WHITE = [2.0, 2.1, 2.3];
const NOZ = ['NOSE', 'FL', 'FR', 'RL', 'RR', 'SL'];
const WHEELS = [[1.33, 0.857], [1.33, -0.857], [-1.32, 0.86], [-1.32, -0.86]];
// schematic pressure vessels (two capsules, car-local x0, x1, |y|, z; radius): position and shape are illustrative
const VESSEL = { vessel: [-1.45, 1.15, 0.4, 0.36], radius: 0.15 };
const SLATE_TESLA = 'CG重建 · 据特斯拉 2026.10.16 发布的视频';
const SLATE_MUSK = 'CG重建 · 据马斯克 2026.10.16 发布的视频';
const SLATE_AIR = '原理示意 · 非实拍';

// monotone cubic through [[x, y], ...] (no overshoot; equal neighbours give a smooth hold)
function pchip(keys) {
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const n = xs.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m.push(0);
    else {
      const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
      m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]));
    }
  }
  m.push(d[n - 2]);
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// smooth camera path through keys [[t, pos, target, fov], ...] (each coordinate monotone-cubic)
function camPath(keys) {
  const f = [];
  for (let j = 0; j < 3; j++) f.push(pchip(keys.map((k) => [k[0], k[1][j]])));
  for (let j = 0; j < 3; j++) f.push(pchip(keys.map((k) => [k[0], k[2][j]])));
  f.push(pchip(keys.map((k) => [k[0], k[3]])));
  return (t) => ({ pos: [f[0](t), f[1](t), f[2](t)], target: [f[3](t), f[4](t), f[5](t)], fov: f[6](t) });
}
// floodlights on the venue floor (staging for the CG reconstruction; aims fixed in world space)
export const FLOODS = {
  near: { pos: [-10.5, -13.0, 0.55], aim: [-2.6, 0.0, 15.0] },
  far: { pos: [-5.0, 12.5, 0.55], aim: [-2.2, 0.0, 15.1] },
  curl: { pos: [9.0, -14.5, 0.55], aim: [5.0, 0.0, 9.5] },
  back: { pos: [6.5, 13.5, 0.55], aim: [5.5, 0.0, 8.0] },
};

export class Timeline {
  constructor(film) {
    this.film = film;
    this.poses = film.poses;
    this.ramp = film.ramp;
    this.v = new Voice(film.lines.lines, film.timing);
    this.car = film.assets.carMeta;
    this.flight = film.flight;
    this.fps = film.opts.fps;
    this._events();
    this._clocks();
  }

  _events() {
    this.E = filmEvents(this.v);
    this.duration = this.E.end;
    this.frameCount = Math.ceil(this.E.end * this.fps);
  }

  // source clocks per shot (slow motion, snap-backs and holds), all keyed to words
  _clocks() {
    const E = this.E;
    this.ev06 = pchip([[E.cut56, 8.8], [E.zhua, 8.92], [E.zhua + 0.4, 9.02], [E.cut67, 9.3]]);
    this.ev07 = pchip([[E.cut67, 4.25], [E.wall, 5.95], [E.ceil + 0.05, 8.42], [E.ceil + 0.9, 8.56], [E.cut78, 8.68]]);
    this.ev08 = pchip([[E.cut78, 8.6], [E.cut89, 9.05]]);
    this.ev09 = pchip([[E.cut89, 9.05], [E.open, 9.22], [E.lose, 9.8], [E.drop, 9.88]]);
    this.ev09b = pchip([[E.drop, 9.88], [E.cut910, 10.1]]);
    this.ev10 = pchip([[E.cut910, 10.1], [E.cut1011, 10.42]]);
    this.ev11 = pchip([[E.cut1011, 10.42], [E.spray, 10.62], [E.push, 11.0], [E.plunge, 11.12]]);
    this.ev11b = pchip([[E.plunge, 11.12], [E.plunge + 0.3, 11.62], [E.black, 12.95]]);
    this.src13 = pchip([[E.lot, 5.45], [E.kfJet, 6.75], [E.kfOff, 6.99], [E.kfOff + 0.25, 7.0], [E.kfResume - 0.05, 7.0],
      [E.kfResume + 0.25, 7.08], [E.flip, 8.25], [E.over, 8.7], [E.cut1314, 10.6]]);
    // the ramp flight path (centre of mass, lip → landing) for the 「花」 trace
    const P = new Float32Array(48 * 4);
    for (let k = 0; k < 48; k++) {
      const ev = 9.75 + (12.95 - 9.75) * k / 47;
      P.set([...m4.xfPoint(this.carAt(ev).M, this.car.com), 0], k * 4);
    }
    this.flightPath = P;
  }

  // car pose on the ramp at source time ev → matrices
  carAt(ev) {
    const M = this.poses.carMatrix(ev);
    return { M, inv: m4.invert(M), wheels: this.poses.wheelMatrices(M, ev), ev };
  }
  local(M, p) { return m4.xfPoint(M, p); }

  base(t) {
    return {
      t, sim: t, dustT: t,
      cam: { pos: [0, -10, 10], target: [0, 0, 10], up: [0, 0, 1], fov: 50, near: 0.03, far: 500 },
      dof: [0, 10, 1.2, 60],
      sky: { top: [0.0005, 0.0007, 0.0011], horizon: [0.0016, 0.0019, 0.0026], ground: [0.0006, 0.0006, 0.0007] },
      fog: { color: [0.0012, 0.0016, 0.0022], density: 0.004 },
      spots: [], cards: [],
      air: { center: [0, 0, 0], radius: 0, band: 3, ring: 0, floor: 0, sky: 0, ...AIR },
      gap: { evac: 0, residual: 0.12, flow: 0, glow: 1 }, press: { outer: 0, glints: 0, contact: 0, beam: 0 },
      lamps: [1, 1, 1, 0],
      objAir: { car: [1, 1, 1, 1], ramp: [1, 0.7, 1, 1], neon: [0.35, 0.35, 1, 1], lattice: [0.25, 0.05, 0, 1], venue: [1, 1, 1, 1], floor: [1, 1, 1, 1] },
      vol: { density: 0, maxDist: 60, scale: 0.15, steps: this.film.opts.volSteps, gain: 1 },
      shell: 0, beams: [], textItems: [], slate: null, textFx: 0,
      post: Object.assign({}, NIGHT_POST, { flash: [1, 1, 1, 0] }),
      gapBox: [-1.52, 1.47, 0.72, 0.125], fanA: [0.62, 0, 0.122, 0.28], fanB: [-0.68, 0, 0.122, 0.28],
      particleShutter: 0.02,
    };
  }

  at(t) {
    const E = this.E;
    t = clamp(t, 0, this.duration);
    const ov = this.film.opts.camOverride;
    let st;
    if (t < E.cut12) st = this.s01(t);
    else if (t < E.cut23) st = this.s02(t);
    else if (t < E.cut34) st = this.s03(t);
    else if (t < E.cut45) st = this.s04(t);
    else if (t < E.cut56) st = this.s05(t);
    else if (t < E.cut67) st = this.s06(t);
    else if (t < E.cut78) st = this.s07(t);
    else if (t < E.cut89) st = this.s08(t);
    else if (t < E.drop) st = this.s09(t);
    else if (t < E.cut910) st = this.s09b(t);
    else if (t < E.cut1011) st = this.s10(t);
    else if (t < E.plunge) st = this.s11(t);
    else if (t < E.black) st = this.s11b(t);
    else if (t < E.lot) st = this.s12(t);
    else if (t < E.cut1314) st = this.s13(t);
    else st = this.s14(t);
    this.captions(st, t);
    if (ov) {   // test-only: cam=x,y,z,tx,ty,tz,fov[,ev] in world coordinates
      st.cam.pos = ov.slice(0, 3); st.cam.target = ov.slice(3, 6); st.cam.fov = ov[6]; st.cam.up = [0, 0, 1];
      st.dof[1] = len(sub(st.com, st.cam.pos));
    }
    return st;
  }

  // ---------------------------------------------------------------------------------------------- shared rigs
  setCar(st, ev) {
    const c = this.carAt(ev);
    st.carM = c.M; st.carInv = c.inv; st.wheels = c.wheels; st.ev = ev;
    st.com = m4.xfPoint(c.M, this.car.com);
    return c;
  }

  // floods for the ceiling (fixed in world space; fixtures drawn by film.js): a near key with shadows, a far-side
  // backlight/rim, the curl flood, and the car's own headlight wash along the deck
  ceilingLights(st, c, k = 1, opt = {}) {
    const nose = m4.xfPoint(c.M, [2.15, 0, 0.6]);
    const fwd = m4.xfDir(c.M, [1, 0, 0]);
    const F = FLOODS;
    st.spots = [
      { pos: F.near.pos, dir: sub(F.near.aim, F.near.pos), color: [0.8, 0.88, 1.0], intensity: 1250 * k * (opt.key ?? 1),
        outer: 10, inner: 4, range: 80, shadow: true, beam: 0.55 * (opt.beams ?? 1), surface: 1 },
      { pos: F.far.pos, dir: sub(F.far.aim, F.far.pos), color: [1.0, 0.93, 0.86], intensity: 1700 * k * (opt.rim ?? 1),
        outer: 7, inner: 2.5, range: 80, beam: 0.8 * (opt.beams ?? 1), surface: 1 },
      { pos: F.curl.pos, dir: sub(F.curl.aim, F.curl.pos), color: [0.85, 0.92, 1.0], intensity: 1300 * k,
        outer: 13, inner: 5, range: 80, beam: 0.45 * (opt.beams ?? 1), surface: 1 },
      { pos: add(nose, scale(fwd, 0.1)), dir: add(fwd, [0, 0, 0.18]), color: [1.0, 0.98, 0.94], intensity: 45 * (opt.head ?? 1),
        outer: 30, inner: 10, range: 22, beam: 0.35 * (opt.beams ?? 1), surface: 1 },
    ];
    const from = st.com;
    const lens = (f, k2) => ({ dir: sub(f.pos, from), hw: 0.035, hh: 0.035, roll: 0, soft: 0.004, color: [40 * k2, 42 * k2, 46 * k2], diffuse: 0.0 });
    st.cards = [
      lens(F.near, 1.0), lens(F.far, 0.9),
      { dir: [0.0, -1.0, -0.62], hw: 2.2, hh: 0.022, roll: 0, soft: 0.006, color: [3.0, 3.2, 3.5], diffuse: 0.02 },
      { dir: [0.35, 1.0, -0.55], hw: 1.6, hh: 0.02, roll: 0, soft: 0.006, color: [2.4, 2.3, 2.2], diffuse: 0.02 },
      { dir: [-1.0, -0.15, -0.35], hw: 0.5, hh: 0.02, roll: 0, soft: 0.006, color: [2.6, 0.12, 0.15], diffuse: 0.0 },
      { dir: [0.0, 0.0, -1.0], hw: 1.4, hh: 1.4, roll: 0, soft: 0.3, color: [0.012, 0.014, 0.018], diffuse: 1.0 },
    ];
    st.pools = Object.values(F).map((f) => [f.pos[0], f.pos[1], 5.5, 0.05]);
    st.vol = Object.assign(st.vol, { density: 0.006, maxDist: 80, scale: 0.16 });
    st.refl = { on: true, strength: 1.0, lod: 0.6, wobble: 0.006 };
  }

  // a skimming light from the far side, level with the slit (lights the slab underside and the slot's far end)
  skim(st, c) {
    const p = m4.xfPoint(c.M, [0.0, 3.2, 0.02]);
    const a = m4.xfPoint(c.M, [0.0, -1.0, 0.04]);
    st.spots[2] = { pos: p, dir: sub(a, p), color: [0.85, 0.92, 1.0], intensity: 22, outer: 40, inner: 15, range: 12, beam: 0, surface: 1 };
  }

  dustAround(st, center, gain = 1) {
    st.dust = { min: [center[0] - 8, center[1] - 9, center[2] - 9], size: [16, 15, 12], count: 90000, fall: 0.42,
      ambient: 0.0025, gain, shutter: 0.035 };
  }

  airField(st, center, gain = 1) {
    st.airMotes = { min: [center[0] - 6, center[1] - 9, center[2] - 7], size: [12, 15, 10], count: 42000, jitter: 0.32, fade: 9, gain: 1.5 * gain };
  }

  camLocal(st, M, pos, target, fov, extra = {}, upLocal = null) {
    st.cam = Object.assign(st.cam, { pos: m4.xfPoint(M, pos), target: m4.xfPoint(M, target), fov,
      up: upLocal ? m4.xfDir(M, upLocal) : [0, 0, 1] }, extra);
  }

  shake(st, t0, t, amp, dur = 0.5) {
    const u = t - t0;
    if (u < 0 || u > dur) return;
    const k = amp * Math.exp(-u * 9) * (1 - u / dur);
    const f = 31;
    const o = [Math.sin(u * f * 1.3) * k, Math.sin(u * f * 0.9 + 1.7) * k * 0.6, Math.sin(u * f * 1.1 + 4.1) * k];
    st.cam.pos = add(st.cam.pos, o);
    st.cam.target = add(st.cam.target, scale(o, 0.4));
  }

  // ---------------------------------------------------------------------------------------------- S01 倒挂
  s01(t) {
    const E = this.E;
    const st = this.base(t);
    const u = t / E.cut12;
    const ev = 8.55 + 0.062 * t;
    const c = this.setCar(st, ev);
    this.ceilingLights(st, c);
    const com = st.com;
    // one crane move: the whole C-ramp with the car hanging at its top → low under the car, pinned to the ceiling.
    // Keys are relative to the car's centre x (the camera tracks the car), so the whole car stays in frame (nose
    // margin ≥ 80 px) while it grows from ~55 % to ~85 % of the frame width.
    const e = easeInOut(u, 2.2);
    const P = [[0.0, [-3.75, -11.3, 13.2], [1.65, 0.0, 10.65], 70],
               [0.55, [-1.5, -8.6, 11.5], [0.25, 0.0, 12.35], 67],
               [1.0, [0.0, -6.9, 10.1], [0.05, 0.0, 13.6], 64]];
    const k = (i) => P[i];
    const rel = (p) => [com[0] + p[0], p[1], p[2]];
    const seg = e < P[1][0] ? 0 : 1;
    const v = (e - k(seg)[0]) / (k(seg + 1)[0] - k(seg)[0]);
    const vv = smooth(v);
    st.cam.pos = lerp3(rel(k(seg)[1]), rel(k(seg + 1)[1]), vv);
    st.cam.target = lerp3(rel(k(seg)[2]), rel(k(seg + 1)[2]), vv);
    st.cam.fov = mix(k(seg)[3], k(seg + 1)[3], vv);
    const roll = mix(-2.5, 2.0, e) * deg;
    const fwd = norm(sub(st.cam.target, st.cam.pos));
    const right = norm(cross(fwd, [0, 0, 1]));
    st.cam.up = norm(add([0, 0, 1], scale(right, Math.sin(roll))));
    st.dof = [26, len(sub(com, st.cam.pos)), 1.15, 90];
    this.dustAround(st, com, 1.0);
    st.post.exposure = 1.0 + 0.5 * Math.exp(-t * 7);       // light slam on frame 0
    st.slate = 'CG重建 · 据特斯拉 2026.10.16 发布的视频';
    st.kinetic = { kind: 'v01', t };
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S02 以为是吸
  s02(t) {
    const E = this.E;
    const st = this.base(t);
    const c = this.setCar(st, 8.75);
    this.ceilingLights(st, c, 0.9, { key: 0.3, rim: 1.0, beams: 0.8, head: 0.12 });
    const u = (t - E.cut12) / (E.cut23 - E.cut12);
    const spin = ramp(t, E.cut12 + 0.2, E.cut23);
    st.gap.flow = 0.6 * (t - E.cut12) * spin;
    st.lamps = [1, 1, 1, 0.25 + 0.5 * spin];
    // head-on from past the deck's free end: the car upside down under the ceiling, headlights at the camera
    const e2 = easeOut(u, 1.5);
    this.camLocal(st, c.M, lerp3([9.8, -0.35, 1.9], [8.2, -0.25, 1.65], e2), [0.0, 0.0, 0.25], 36);
    st.xiAt = m4.xfPoint(c.M, [2.0, 0, 0.07]);         // where the slit meets the front of the car
    st.dof = [12, 8.5, 1.15, 70];
    this.dustAround(st, st.com, 0.8);
    st.dust.min = sub(st.cam.pos, [5, 5, 3]);
    st.dust.size = [10, 10, 6];
    st.slate = 'CG重建 · 据特斯拉 2026.10.16 发布的视频';
    st.kinetic = { kind: 'xi', t };
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S03 其实是压 (Ping)
  s03(t) {
    const E = this.E;
    const st = this.base(t);
    const c = this.setCar(st, 8.75);
    this.ceilingLights(st, c, 0.9, { head: 0.12 });
    st.gap.flow = 0.6 * (E.cut23 - E.cut12) + 0.6 * (t - E.cut23);
    st.lamps = [1, 1, 1, 0.75];
    // pull out from the slit to a low three-quarter view under the car
    const u = easeInOut(clamp((t - E.cut23) / 1.15), 1.8);
    const pA = [8.2, -0.25, 1.65], tA = [0.0, 0.0, 0.25];
    const pB = [1.3, -9.0, 4.9], tB = [0.0, 0.0, 1.0];
    const arc = lerp3(pA, pB, u);
    arc[1] -= 3.0 * Math.sin(Math.PI * u);           // swing out to the side on the way
    this.camLocal(st, c.M, arc, lerp3(tA, tB, u), mix(36, 44, u));
    // slow drift after the pull
    const drift = (t - E.cut23) * 0.06;
    st.cam.pos = add(st.cam.pos, [-drift, 0, 0]);
    st.dof = [14, len(sub(st.com, st.cam.pos)), 1.15, 60];
    this.dustAround(st, st.com, 0.9);
    // the Ping
    const tp = t - E.ping;
    if (tp > 0) {
      const r = 42 * easeOut(tp / 1.5, 2.4);
      st.air = Object.assign(st.air, { center: st.com, radius: r, band: 1.6 + 2.5 * clamp(tp / 1.0), ring: 1.3 * (1 - lin(tp, 0.6, 1.5)),
        floor: 0, sky: lin(r, 14, 30) });
      st.shell = 1.0 - lin(tp, 0.4, 1.3);
      this.airField(st, st.com, 1);
      st.carAirAlpha = 0.6;
      st.post = Object.assign({}, AIR_POST, { flash: [0.7, 0.85, 1.0, 0.16 * Math.exp(-tp * 14)] });
      st.slate = '原理示意 · 非实拍';
      st.objAir.ramp = [1.0, 0.8, 1.0, 1.0];
    } else st.slate = 'CG重建 · 据特斯拉 2026.10.16 发布的视频';
    // silence → ping: a dip in exposure just before (the "breath")
    if (tp > -0.3 && tp <= 0) st.post.exposure *= 1 - 0.35 * lin(tp, -0.3, 0);
    // 压: impact storm on the outside, the beam slams into the ceiling
    const tq = t - E.press;
    if (tq > 0) {
      st.press.glints = clamp(tq / 0.08) * 0.35;
      st.press.outer = 0.6 * Math.exp(-tq * 2.2) + 0.3;
      st.press.contact = 0.0;
      st.glintRate = 10;
      st.post.flash = [1.0, 0.75, 0.4, 0.14 * Math.exp(-tq * 18)];
      this.shake(st, E.press, t, 0.05, 0.6);
      this.pushBeam(st, c, clamp(tq / 0.16), 1.0, t);
      st.textFx = Math.exp(-tq * 6);
      st.yaAt = m4.xfPoint(c.M, [-0.35, 0, 3.15]);
    }
    st.kinetic = { kind: 'ya', t };
    return st;
  }

  // the net push toward the surface: from outside the roof (car-local +Z) through the car into the slab (z = 0)
  pushBeam(st, c, progress, alpha, t, width = 0.62) {
    const a = m4.xfPoint(c.M, [-0.35, 0, 3.15]);
    const b = m4.xfPoint(c.M, [-0.35, 0, 0.0]);
    st.beams.push({ a, b, width, color: scale(GOLD, 2.6), shaft: 0.34, head: 0.22, progress, flow: t * 2.2, alpha });
  }

  gravityArrow(st, progress, alpha, c) {
    const a = m4.xfPoint(c.M, [0.75, 0, 0.5]);
    const b = add(a, [0, 0, -1.45]);
    st.beams.push({ a, b, width: 0.26, color: [2.0, 2.1, 2.3], shaft: 0.22, head: 0.32, progress, flow: 0, alpha });
  }

  airVision(st, c) {
    st.air = Object.assign(st.air, { center: st.com, radius: 500, band: 3, ring: 0, floor: 1, sky: 1 });
    this.airField(st, st.com, 1);
    st.post = Object.assign({}, AIR_POST);
    st.slate = '原理示意 · 非实拍';
    st.lamps = [0.5, 0.5, 0.4, 1.0];
  }

  // ---------------------------------------------------------------------------------------------- S04 抽走
  s04(t) {
    const E = this.E;
    const st = this.base(t);
    const c = this.setCar(st, 8.75);
    this.ceilingLights(st, c, 0.9);
    this.airVision(st, c);
    st.vol.density = 0;
    const u = (t - E.cut34) / (E.cut45 - E.cut34);
    // below the car, looking up through the smoked-glass body at the sheet of air in the slit
    const e4 = easeInOut(u, 1.6);
    this.camLocal(st, c.M, lerp3([0.35, -0.9, 6.6], [0.1, -0.35, 5.9], e4), lerp3([0.15, 0.0, 0.05], [0.0, 0.0, 0.05], e4), 46, {}, [1, 0, 0]);
    st.carAirAlpha = 0.38;
    st.dof = [8, 6.0, 1.15, 50];
    this.dustAround(st, st.com, 0.35);
    // the fans pull the slit empty
    const ev = clamp((t - E.evacStart) / E.evacDur);
    st.gap.evac = smooth(ev);
    st.gap.flow = (t - E.cut23) * 0.6 + 2.0 * Math.max(0, t - E.evacStart);
    st.gapVol = { color: [1.0, 0.86, 0.62], gain: 0.42 };
    st.gapMotes = { count: 14000, gain: 2.2, evac: [E.evacStart, E.evacDur, 0.12, 0.55] };
    st.particleShutter = 0.05;
    st.leak = { count: 1600, level: ramp(t, E.evacStart + 0.8, E.evacStart + 1.6), period: 0.9 };
    st.wake = { count: 5000, level: ramp(t, E.evacStart, E.evacStart + 0.4), period: 0.7, speed: 4.5, spread: 0.25 };
    st.press.glints = 0.1;
    st.press.outer = 0.12;
    st.press.contact = 0.0;
    st.lamps[3] = 0.6 + 0.6 * ramp(t, E.fans, E.suck);
    st.fanXray = ramp(t, E.fans - 0.15, E.fans + 0.2);     // the rotors light up through the glass on 「风扇」
    st.labels = [{ text: '风扇（示意）', at: m4.xfPoint(c.M, [0.62, 0.0, 0.12]), dx: 150, dy: -230, alpha: win(t, E.fans, E.fans + 0.3, E.cut45 - 0.3, E.cut45) }];
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S05 一重一轻 → 一束力
  s05(t) {
    const E = this.E;
    const st = this.base(t);
    const c = this.setCar(st, 8.75);
    this.ceilingLights(st, c, 0.9);
    this.airVision(st, c);
    st.vol.density = 0;
    // swing from the plan view to the side while the line is spoken: 「外面」 lights the whole outside, 「缝里」 is
    // seen edge-on as the dark band between the car and the ceiling
    const tPull = E.outer + 0.35;
    const u = easeInOut(clamp((t - tPull) / 1.6), 2.2);
    const pA = [0.1, -0.35, 5.9], tA = [0.0, 0.0, 0.05];
    const pB = [1.2, -9.4, 5.6], tB = [0.0, 0.0, 1.35];
    // the up vector swings from the car's nose (plan view) to world up (side view)
    const upA = m4.xfDir(c.M, [1, 0, 0]);
    this.camLocal(st, c.M, lerp3(pA, pB, u), lerp3(tA, tB, u), mix(46, 42, u));
    st.cam.up = norm(lerp3(upA, [0, 0, 1], smooth(u)));
    st.cam.pos = add(st.cam.pos, scale(m4.xfDir(c.M, [-1, 0, 0]), (t - E.cut45) * 0.04));
    st.carAirAlpha = mix(0.38, 0.62, u);
    st.dof = [10, len(sub(st.com, st.cam.pos)), 1.15, 50];
    this.dustAround(st, st.com, 0.35);
    st.gap.evac = 1;
    st.gap.flow = (t - E.cut23) * 0.6 + 2.0 * (t - E.evacStart);
    st.gapVol = { color: [1.0, 0.86, 0.62], gain: 0.42 };
    st.gapMotes = { count: 14000, gain: 2.2, evac: [E.evacStart, E.evacDur, 0.12, 0.55] };
    st.leak = { count: 1600, level: 1, period: 0.9 };
    st.wake = { count: 5000, level: 1, period: 0.7, speed: 4.5, spread: 0.25 };
    st.lamps[3] = 1.2;
    st.fanXray = mix(0.55, 0.3, u);                         // the fans keep running, but the pressure is the subject
    // 外面: the outside blazes with impacts; 缝里: the slit stays dark
    st.press.glints = 0.12 + 0.6 * ramp(t, E.outer - 0.05, E.outer + 0.35);
    st.press.outer = 0.12 + 0.22 * ramp(t, E.outer - 0.05, E.outer + 0.35);
    st.press.contact = 0.0;
    st.glintRate = 11;
    st.glintGain = 1.5;
    // 缝里: a cold outline pulse marks the drained slit
    st.gapVol.gain = 0.42 + 0.0 * win(t, E.inner, E.inner + 0.2, E.inner + 0.9, E.inner + 1.3);
    // convergence → one beam into the surface, then gravity for comparison
    const tc = t - E.converge;
    if (tc > -0.05) {
      st.conv = { launch: E.converge, dur: 0.9, level: 0.55, entryZ: 2.35, headZ: 0.05 };
      const bp = clamp((tc - 0.55) / 0.35);
      if (bp > 0) this.pushBeam(st, c, bp, 1.0, t);
      const gp = clamp((tc - 1.05) / 0.3);
      if (gp > 0) this.gravityArrow(st, gp, 1.0, c);
      if (bp > 0) this.shake(st, E.converge + 0.55, t, 0.025, 0.4);
      st.labels = [
        { text: '空气压力（示意）', at: m4.xfPoint(c.M, [-0.35, 0, 1.9]), dx: -90, dy: 110, alpha: lin(tc, 0.75, 1.0), color: '#ffc271' },   // clear of the caption band
        { text: '重力', at: add(m4.xfPoint(c.M, [0.75, 0, 0.5]), [0, 0, -1.3]), dx: 90, dy: 40, alpha: lin(tc, 1.2, 1.45), color: '#e8eef5' },
      ];
    }
    // 「按」: the one push spreads into the four tyres, and their contact patches take the load
    const ta = t - E.an;
    if (ta > -0.05) {
      const k4 = ramp(ta, 0.0, 0.4);
      st.press.contact = 0.9 * k4;
      for (const w of WHEELS) {
        const a = m4.xfPoint(c.M, [mix(-0.35, w[0], k4), mix(0, w[1], k4), mix(2.2, 1.25, k4)]);
        const b = m4.xfPoint(c.M, [w[0], w[1], 0.0]);
        st.beams.push({ a, b, width: 0.26, color: scale(GOLD, 2.2), shaft: 0.34, head: 0.34, progress: k4, flow: t * 2.2, alpha: k4 });
      }
      this.shake(st, E.an, t, 0.02, 0.4);
      st.post.flash = [1.0, 0.75, 0.4, 0.06 * Math.exp(-Math.max(ta, 0) * 14) * (ta > 0 ? 1 : 0)];
    }
    return st;
  }

  // ============================================================================================== helpers (V06–V17)
  postMix(k) {   // night (0) → air vision (1) grade
    const o = Object.assign({}, NIGHT_POST);
    for (const key of ['bloom', 'streak', 'sat', 'contrast', 'threshold']) o[key] = mix(NIGHT_POST[key], AIR_POST[key], k);
    o.lift = NIGHT_POST.lift.map((v, i) => mix(v, AIR_POST.lift[i], k));
    o.flash = [1, 1, 1, 0];
    return o;
  }

  // the Ping from a point: night → air vision (tp = t − the ping instant)
  pingTo(st, center, tp, { reach = 40, dur = 1.4, ring = 1.3, shell = 1 } = {}) {
    const r = reach * easeOut(tp / dur, 2.4);
    st.air = Object.assign(st.air, { center, radius: r, band: 1.6 + 2.5 * clamp(tp / 1.0), ring: ring * (1 - lin(tp, 0.6, dur)),
      floor: lin(tp, dur * 0.85, dur * 1.25), sky: lin(r, reach * 0.35, reach * 0.75) });
    st.shell = shell * (1.0 - lin(tp, 0.4, 1.2));
    st.post = Object.assign(this.postMix(1), { flash: [0.7, 0.85, 1.0, 0.14 * Math.exp(-tp * 14)] });
  }

  // and back: air vision folds into a point (tq = t − start)
  pingOut(st, center, tq, { reach = 40, dur = 0.55 } = {}) {
    const k = 1 - easeIn(clamp(tq / dur), 2);
    st.air = Object.assign(st.air, { center, radius: reach * k, band: 2.5, ring: 0.9 * k, floor: 0, sky: k });
    st.post = this.postMix(k);
  }

  comVel(ev, h = 0.01) {
    const a = m4.xfPoint(this.carAt(ev - h).M, this.car.com), b = m4.xfPoint(this.carAt(ev + h).M, this.car.com);
    return scale(sub(b, a), 1 / (2 * h));
  }

  // under-body columns stretch toward the floor during the descent (v4: plume_scale = clamp(z / 3, 1, 3.6))
  plumeScale(M) { return clamp(m4.xfPoint(M, this.car.nozzles.FL.pos)[2] / 3, 1, 3.6); }

  jetState(st, M, levels, dirs, o = {}) {
    const P = new Float32Array(24), D = new Float32Array(24);
    NOZ.forEach((n, k) => {
      const nz = this.car.nozzles[n];
      P.set([nz.pos[0], nz.pos[1], nz.pos[2], 0], k * 4);
      const d = (dirs && dirs[n]) || nz.dir;
      D.set([d[0], d[1], d[2], Math.max(0, (levels[n] || 0) * (o.gain ?? 1))], k * 4);
    });
    st.jets = { count: o.count ?? 9000, P, D, vel: o.vel || [0, 0, 0], jet: [o.period ?? 0.42, o.speed ?? 9, o.scale ?? 1, o.spread ?? 0.3],
      look: [o.cyan ?? 0, o.night ?? 0.02, o.air ?? 0.035, o.size ?? 1], shutter: o.shutter ?? 0.03 };
  }

  // the ramp's cloud (v4 v3_ramp.cloud_puffs) at source time ev
  rampCloud(st, ev, gain = 1, o = {}) {
    const P = new Float32Array(18 * 4), D = new Float32Array(18 * 4);
    let n = 0;
    for (const p of this.film.assets.poses.cloud_puffs) {
      const age = ev - p.birth;
      if (age <= 0 || n >= 18) continue;
      const g = 1 - Math.exp(-age / 0.55);
      const r = (0.6 + (p.r1 - 0.6) * g) * (o.grow ?? 1);
      P.set([p.x + p.drift * g, p.y, 0.35 * r + p.rise * g, r], n * 4);
      D.set([0.95 * smooth(age / 0.35), o.flat ?? 0.62, age, 0], n * 4);
      n++;
    }
    st.puffs = { n, per: o.per ?? 420, P, D, clock: o.clock ?? ev, size: o.size ?? 1, look: [o.ambient ?? 0.05, o.spot ?? 1, o.cyan ?? 0, 0], gain };
  }

  // the kickflip's cloud (v4 motion.cloud_state) at source time s
  flightCloud(st, s, gain = 1, o = {}) {
    const P = new Float32Array(18 * 4), D = new Float32Array(18 * 4);
    const puffs = this.flight.puffs(s).slice(0, 18);
    puffs.forEach((p, n) => { P.set([...p.c, p.r], n * 4); D.set([p.density, p.flatten, 0, 0], n * 4); });
    st.puffs = { n: puffs.length, per: o.per ?? 420, P, D, clock: s, size: o.size ?? 1, look: [o.ambient ?? 0.05, o.spot ?? 1, o.cyan ?? 0, 0], gain };
  }

  // floods for the landing area under the deck's free end (the ceiling floods aim up at the deck)
  landingLights(st, c) {
    const nose = m4.xfPoint(c.M, [2.15, 0, 0.6]), fwd = m4.xfDir(c.M, [1, 0, 0]);
    st.spots = [
      { pos: [-4.0, -17.0, 0.6], dir: sub([-15.5, 0, 2.5], [-4.0, -17.0, 0.6]), color: [0.82, 0.9, 1.0], intensity: 1500, outer: 22, inner: 9, range: 90, shadow: true, beam: 0.5, surface: 1 },
      { pos: [-24.0, 13.0, 0.6], dir: sub([-15.0, 0, 4.0], [-24.0, 13.0, 0.6]), color: [1.0, 0.95, 0.88], intensity: 1700, outer: 18, inner: 7, range: 90, beam: 0.9, surface: 1 },
      { pos: FLOODS.near.pos, dir: sub(FLOODS.near.aim, FLOODS.near.pos), color: [0.8, 0.88, 1.0], intensity: 1100, outer: 10, inner: 4, range: 80, beam: 0.45, surface: 1 },
      { pos: add(nose, scale(fwd, 0.1)), dir: add(fwd, [0, 0, -0.1]), color: [1.0, 0.98, 0.94], intensity: 45, outer: 30, inner: 10, range: 22, beam: 0.3, surface: 1 },
    ];
    st.cards = [
      { dir: [0.0, -1.0, 0.25], hw: 2.0, hh: 0.03, roll: 0, soft: 0.006, color: [2.6, 2.8, 3.0], diffuse: 0.02 },
      { dir: [-0.6, 0.8, 0.35], hw: 1.4, hh: 0.025, roll: 0, soft: 0.006, color: [2.2, 2.1, 2.0], diffuse: 0.02 },
      { dir: [0.0, 0.0, 1.0], hw: 1.4, hh: 1.4, roll: 0, soft: 0.3, color: [0.01, 0.012, 0.016], diffuse: 1.0 },
    ];
    st.pools = Object.values(FLOODS).map((f) => [f.pos[0], f.pos[1], 5.5, 0.05]);
    st.vol = Object.assign(st.vol, { density: 0.006, maxDist: 80, scale: 0.16 });
    st.refl = { on: true, strength: 1.0, lod: 0.6, wobble: 0.006 };
  }

  // the night lot (v4 staging lights): backlights behind the lineup throw shadows toward the camera, two front floods
  lotLights(st) {
    const L = Object.fromEntries(this.film.assets.kickflip.lights.map((l) => [l.name, l]));
    const spot = (l, k, extra) => ({ pos: l.location, dir: sub(l.target, l.location), color: l.color, intensity: k,
      outer: l.spot_deg / 2, inner: l.spot_deg / 2 * (1 - l.blend), range: 170, surface: 1, ...extra });
    st.spots = [
      spot(L.back_centre, 9500, { shadow: true, beam: 0.45 }),
      spot(L.flood_left, 14000, { beam: 0.0 }),
      spot(L.flood_right, 14000, { beam: 0.0 }),
      spot(L.back_right, 7000, { beam: 0.3 }),
    ];
    st.cards = [
      { dir: [0.0, 1.0, 0.12], hw: 3.0, hh: 0.02, roll: 0, soft: 0.006, color: [2.4, 2.5, 2.7], diffuse: 0.02 },
      { dir: [0.0, -1.0, 0.45], hw: 2.2, hh: 0.03, roll: 0, soft: 0.006, color: [1.6, 1.7, 1.8], diffuse: 0.02 },
      { dir: [0.0, 0.0, 1.0], hw: 1.4, hh: 1.4, roll: 0, soft: 0.3, color: [0.012, 0.013, 0.016], diffuse: 1.0 },
    ];
    st.pools = [];
    st.refl = { on: false };
    st.vol = Object.assign(st.vol, { density: 0.0008, maxDist: 120, scale: 0.07 });
    st.sky = { top: [0.0004, 0.0005, 0.0008], horizon: [0.0022, 0.0024, 0.003], ground: [0.004, 0.004, 0.004] };
  }

  // ---------------------------------------------------------------------------------------------- S06 抓地 (night macro)
  s06(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev06(t);
    const c = this.setCar(st, ev);
    st.sim = t;
    this.ceilingLights(st, c, 0.75, { key: 0.6, rim: 0.9, beams: 0.5, head: 0.35 });
    st.cards.push({ dir: [0.25, 1.0, 0.2], hw: 0.9, hh: 0.05, roll: 0, soft: 0.01, color: [2.4, 2.5, 2.7], diffuse: 0.0 });
    // beside the car under the ceiling, on the front-left tyre; on 「抓」 the camera lets go and the car pulls away
    const camL = [-0.8, 3.5, 0.82], tgtL = [1.36, 0.86, 0.2];
    const cz = this.carAt(this.ev06(Math.min(t, E.zhua)));
    const follow = 1 - ramp(t, E.zhua, E.zhua + 0.22);
    st.cam.pos = lerp3(m4.xfPoint(cz.M, camL), m4.xfPoint(c.M, camL), follow);
    st.cam.target = lerp3(lerp3(m4.xfPoint(cz.M, tgtL), m4.xfPoint(c.M, tgtL), 0.35), m4.xfPoint(c.M, tgtL), follow);
    st.cam.fov = mix(34, 38, ramp(t, E.zhua, E.cut67));
    st.dof = [18, len(sub(m4.xfPoint(c.M, [1.33, 0.86, 0.0]), st.cam.pos)), 1.15, 70];
    // the load through the tyres made visible: gold contact patches; a short push into the front-left patch
    const z = t - E.zhua;
    st.press.contact = 0.6 + 0.25 * ramp(t, E.cut56, E.tyre) + (z > 0 ? 1.1 * Math.exp(-z * 5) : 0);
    if (z > 0) this.shake(st, E.zhua, t, 0.01, 0.35);
    this.dustAround(st, st.cam.pos, 0.9);
    st.dust.min = sub(st.cam.pos, [3, 3, 3.5]);
    st.dust.size = [6, 6, 5];
    st.slate = SLATE_AIR;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S07 整条坡 (air vision)
  s07(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev07(t);
    const c = this.setCar(st, ev);
    this.ceilingLights(st, c, 0.9);
    this.airVision(st, c);
    st.airMotes = null;
    st.vol.density = 0;
    st.carAirAlpha = 0.58;
    st.objAir.ramp = [1.0, 1.0, 1.35, 1.0];
    // the whole ramp, side-on, in a slow orbit and push
    const u = clamp((t - E.cut67) / (E.cut78 - E.cut67));
    const az = mix(-20, 6, easeInOut(u, 1.6)) * deg;
    const look = [0.9, 0, mix(8.3, 8.6, u)];
    const dist = mix(37, 35, easeInOut(u, 1.4));
    st.cam.pos = [look[0] + Math.sin(az) * dist, -Math.cos(az) * dist, look[2] + mix(1.2, 0.2, u)];
    st.cam.target = look;
    st.cam.fov = 42;
    st.dof = [0, 30, 1.15, 40];
    // a replay that leaves the car's pose behind at each station (multiple exposure); every pose keeps its push
    const STATIONS = [4.62, 5.95, 6.85, 7.62];
    st.ghosts = [];
    const pushers = [];
    STATIONS.forEach((g, k) => {
      if (ev < g) return;
      const tg = this._tAtEv07(g);
      const age = t - tg;
      const M = this.carAt(g).M;
      st.ghosts.push({ M, wheels: this.poses.wheelMatrices(M, g), aa: 0.4 * ramp(age, 0, 0.12) + 0.35 * Math.exp(-age * 5) });
      pushers.push({ M, born: tg, k });
    });
    pushers.push({ M: c.M, born: E.cut67 - 1, k: STATIONS.length });
    // the push always into the surface (it turns with the ramp): a wave on 「始终」, a slam on 「压向坡面」
    pushers.forEach((p) => {
      const wave = Math.exp(-Math.pow((t - (E.always + 0.11 * p.k)) / 0.13, 2));
      const ts = t - (E.toward + 0.05 * p.k);
      const slam = ts > 0 ? Math.exp(-ts * 6) : 0;
      const a = m4.xfPoint(p.M, [-0.35, 0, 3.15]), b = m4.xfPoint(p.M, [-0.35, 0, 0.0]);
      st.beams.push({ a, b, width: 0.66 * (1 + 0.25 * wave + 0.2 * slam), color: scale(GOLD, 2.4 * (1 + 0.6 * wave + 0.8 * slam)),
        shaft: 0.34, head: 0.22, progress: ramp(t - p.born, 0.0, 0.25), flow: t * 2.2, alpha: 1 });
    });
    // gravity on every pose: always straight down, parallel, against the fan of pushes
    pushers.forEach((p) => {
      const g = ramp(t, E.force + 0.1 * p.k, E.force + 0.1 * p.k + 0.3);
      if (g <= 0) return;
      const a = m4.xfPoint(p.M, this.car.com);
      st.beams.push({ a, b: add(a, [0, 0, -1.25]), width: 0.26, color: WHITE, shaft: 0.22, head: 0.32, progress: g, flow: 0, alpha: 0.9 });
    });
    st.dust = { min: [-7, -3.5, -0.5], size: [16, 7, 18], count: 70000, fall: 0.6, ambient: 0.02, gain: 1.6, shutter: 0.05 };
    st.slate = SLATE_AIR;
    return st;
  }

  _tAtEv07(g) {    // invert the monotone replay clock
    let lo = this.E.cut67, hi = this.E.cut78;
    for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi); if (this.ev07(m) < g) lo = m; else hi = m; }
    return 0.5 * (lo + hi);
  }

  // ---------------------------------------------------------------------------------------------- S08 尽头 (night chase)
  s08(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev08(t);
    const c = this.setCar(st, ev);
    this.ceilingLights(st, c, 1.0, { key: 0.9, rim: 1.1, beams: 1.0, head: 1.8 });
    const com = st.com;
    const u = clamp((t - E.cut78) / (E.cut89 - E.cut78));
    // out past the deck's free end, just under its level: the edge in the foreground, the car coming at us upside
    // down along the ceiling, headlights first, the drop below
    st.cam.pos = [mix(-11.4, -11.7, u), mix(-2.7, -2.9, u), mix(12.55, 12.4, u)];
    st.cam.target = [com[0] + 0.4, 0.6, 14.65];
    st.cam.fov = 44;
    st.dof = [10, len(sub(com, st.cam.pos)), 1.15, 60];
    // 「尽头」: the deck's free end lights up as a white edge
    const L = this.film.ramp.m.LIP, Wd = this.film.ramp.m.W;
    const k = ramp(t, E.endOf - 0.05, E.endOf + 0.3);
    if (k > 0) st.beams.push({ a: [L[0], -Wd / 2, L[2] - 0.006], b: [L[0], Wd / 2, L[2] - 0.006], width: 0.05, color: [3.2, 3.3, 3.5],
      shaft: 1.0, head: 0.0, progress: k, flow: 0, alpha: 1 });
    this.dustAround(st, com, 1.0);
    st.slate = SLATE_TESLA;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S09 敞开 → 压不住
  s09(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev09(t);
    const c = this.setCar(st, ev);
    this.ceilingLights(st, c, 1.0, { head: 1.4 });
    const L = this.film.ramp.m.LIP;
    // side-on at the deck's free end, tracking the car with lead room ahead: the whole car stays in frame (≥ 130 px
    // margin) while the free end passes under it from the nose to the tail
    const xc = st.com[0] - 0.3;
    st.cam.pos = [xc + 0.4, -12.4, 14.75];
    st.cam.target = [xc, 0, 15.0];
    st.cam.fov = 54;
    st.dof = [10, 12.4, 1.15, 60];
    this.dustAround(st, st.com, 0.9);
    const tp = t - (E.open - 0.06);
    const lipLocal = m4.xfPoint(c.M, [0, 0, 0])[0] - L[0];   // car-local x of the deck's end (inverted car runs along −X)
    if (tp > 0) {
      // 「敞开」: air vision; the slit opens to the outside from its front, outside air pours in, the floor-side impacts
      // return, so the difference (the gold push) shrinks and breaks; gravity alone is left
      this.pingTo(st, [L[0], 0, L[2] - 0.1], tp, { reach: 38, dur: 1.1 });
      this.airField(st, st.com, 0.9);
      st.slate = SLATE_AIR;
      st.carAirAlpha = 0.6;
      st.gap.evac = 1;
      st.gap.flow = 3.0 + t;
      st.gapVol = { color: [1.0, 0.86, 0.62], gain: 0.12 };
      st.gapMotes = { count: 14000, gain: 0.55, evac: [-50, 1.0, 0.12, 0.55] };
      st.open = [lipLocal - 0.25, 0.3, 0, 1];
      st.inrush = { count: 4000, level: 0.7 * win(t, E.open - 0.05, E.open + 0.25, E.lose + 0.15, E.lose + 0.6), period: 0.55, run: 2.6 };
      st.press.glints = 0.75;
      st.press.outer = 0.3;
      st.glintRate = 11;
      st.glintGain = 1.3;
      const sealed = clamp((lipLocal + 1.55) / (1.5 + 1.55));
      const brk = E.lose - 0.08;
      if (t < brk) {
        const a = m4.xfPoint(c.M, [-0.35, 0, mix(1.5, 3.15, sealed)]), b = m4.xfPoint(c.M, [-0.35, 0, 0.0]);
        st.beams.push({ a, b, width: 0.62 * mix(0.5, 1, sealed), color: scale(GOLD, 2.4), shaft: 0.34, head: 0.22, progress: 1,
          flow: t * 2.2, alpha: mix(0.45, 1, sealed) });
      }
      st.shards = { count: 4500, a: m4.xfPoint(c.M, [-0.35, 0, 2.0]), b: m4.xfPoint(c.M, [-0.35, 0, 0.05]), t0: brk, dur: 1.2, speed: 2.4,
        level: t > brk ? 1 : 0 };
      const ga = m4.xfPoint(c.M, [0.75, 0, 0.5]);
      st.beams.push({ a: ga, b: add(ga, [0, 0, -1.45]), width: 0.26, color: WHITE, shaft: 0.22, head: 0.32,
        progress: ramp(t, E.open + 0.3, E.open + 0.6), flow: 0, alpha: 1 });
      st.labels = [{ text: '重力', at: add(ga, [0, 0, -1.35]), dx: 80, dy: 40, alpha: ramp(t, E.lose, E.lose + 0.3), color: '#e8eef5' }];
    } else st.slate = SLATE_TESLA;
    if (tp > -0.3 && tp <= 0) st.post.exposure *= 1 - 0.3 * lin(tp, -0.3, 0);
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S09b the drop (night)
  s09b(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev09b(t);
    const c = this.setCar(st, ev);
    st.sim = ev;
    st.dustT = 20 + ev * 0.4;                  // hang time: the dust almost stops
    this.ceilingLights(st, c, 1.0, { key: 1.0, rim: 1.2, beams: 1.0, head: 1.4 });
    const L = this.film.ramp.m.LIP;
    const u = clamp((t - E.drop) / (E.cut910 - E.drop));
    // from far below: the car leaves the ceiling's end and starts to drop toward us, the deck and gantry above it
    st.cam.pos = [mix(-12.0, -12.2, u), mix(-7.2, -7.4, u), mix(6.6, 6.4, u)];
    st.cam.target = add(st.com, [-0.3, 0.2, 0.3]);     // aimed at the car (nose ≥ 120 px inside), the deck's end at right
    st.cam.fov = 56;
    st.dof = [12, len(sub(st.com, st.cam.pos)), 1.15, 70];
    this.dustAround(st, st.com, 1.1);
    st.slate = SLATE_TESLA;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S10 自带的高压气 (scan)
  s10(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev10(t);
    const c = this.setCar(st, ev);
    st.sim = ev;
    st.dustT = 20 + ev * 0.4;
    this.ceilingLights(st, c, 1.0, { key: 1.0, rim: 1.2, beams: 0.9, head: 0.8 });
    const com = st.com;
    const u = clamp((t - E.cut910) / (E.cut1011 - E.cut910));
    // from below the falling car, its long axis up the frame (nose at the top): it rolls like a log above the camera,
    // the deck's underside beyond it; the scan line will run down the frame from nose to tail
    st.cam.pos = add(com, [mix(-0.25, -0.1, u), mix(-2.6, -2.2, u), mix(-7.6, -7.2, u)]);
    st.cam.target = add(com, [-0.15, 0, 0]);
    st.cam.up = [-1, 0, 0];
    st.cam.fov = 42;
    st.dof = [10, len(sub(com, st.cam.pos)), 1.15, 60];
    this.dustAround(st, com, 0.8);
    // 「换」: a scan plane sweeps nose → tail; behind it the body is glass and the stored gas shows (schematic)
    const X = norm(m4.xfDir(c.M, [1, 0, 0]));
    const s0 = E.swap - 0.1, s1 = E.swap + 0.45;
    if (t > s0) {
      const sweep = clamp((t - s0) / (s1 - s0));
      const R = 60;
      st.air = Object.assign(st.air, { center: add(com, scale(X, 2.3 + R)), radius: R + 4.9 * easeInOut(sweep, 1.5), band: 0.3,
        ring: 0.9 * (1 - lin(t, s1, s1 + 0.3)), floor: lin(t, s1, s1 + 0.6), sky: lin(t, s0 + 0.2, s1 + 0.5) });
      st.post = this.postMix(lin(t, s0, s1));
      st.carAirAlpha = 0.5;
      this.airField(st, com, lin(t, s0, s1 + 0.4) * 0.7);
      st.slate = SLATE_AIR;
      // 「自带」 the vessels fill with light; 「高压气」 crowded, violently jittering gas
      const hot = ramp(t, E.hp - 0.05, E.hp + 0.35);
      st.store = { ...VESSEL, count: 9000, outlineCount: 3000, level: 1, rate: mix(14, 30, hot), amp: mix(0.05, 0.085, hot),
        outline: ramp(t, s0 + 0.2, E.own), gain: ramp(t, E.own - 0.25, E.own + 0.15) * mix(1.1, 1.8, hot) };
      st.labels = [{ text: '储气（示意）', at: m4.xfPoint(c.M, [0.3, -0.4, 0.36]), dx: 130, dy: 220, alpha: ramp(t, E.own, E.own + 0.3), color: '#9be8ff' }];
    } else st.slate = SLATE_TESLA;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S11 喷 / 推 (air vision)
  s11(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev11(t);
    const c = this.setCar(st, ev);
    st.sim = ev;
    st.dustT = 20 + ev * 0.4;
    this.ceilingLights(st, c, 1.0);
    this.airVision(st, c);
    this.airField(st, st.com, 0.7);
    st.vol.density = 0;
    st.carAirAlpha = 0.5;
    const com = st.com;
    const u = clamp((t - E.cut1011) / (E.plunge - E.cut1011));
    st.cam.pos = add(com, [mix(-5.2, -5.8, u), mix(-8.6, -9.2, u), mix(0.6, 1.2, u)]);
    st.cam.target = add(com, [0, 0, mix(-0.9, -1.6, u)]);
    st.cam.fov = 50;
    st.dof = [8, len(sub(com, st.cam.pos)), 1.15, 50];
    this.dustAround(st, com, 0.4);
    // the reserve runs to the nozzles and out
    const flowing = ramp(t, E.spray - 0.3, E.spray);
    st.store = { ...VESSEL, count: 9000, outlineCount: 3000, level: 1 - 0.14 * ramp(t, E.spray, E.plunge), rate: 26, amp: 0.08, outline: 1, gain: 1.6 };
    for (const [from, n] of [[[1.15, 0.4, 0.36], 'FL'], [[1.15, -0.4, 0.36], 'FR'], [[-1.45, 0.4, 0.36], 'RL'], [[-1.45, -0.4, 0.36], 'RR']]) {
      st.beams.push({ a: m4.xfPoint(c.M, from), b: m4.xfPoint(c.M, this.car.nozzles[n].pos), width: 0.05, color: scale(CYAN, 2.6),
        shaft: 1.0, head: 0.0, progress: flowing, flow: t * 3, alpha: flowing });
    }
    // 「喷」 straight down (source plume schedule; nozzles schematic)
    this.jetState(st, c.M, this.poses.jets(ev), this.film.assets.poses.flight_dirs,
      { vel: this.comVel(ev), cyan: 1, period: 0.42, speed: 9, scale: this.plumeScale(c.M), air: 0.035, gain: 1.4 * ramp(t, E.spray - 0.15, E.spray + 0.1) });
    // 「推」 the reaction, exactly opposite the exhaust: up through the car
    const pk = ramp(t, E.push - 0.05, E.push + 0.3);
    if (pk > 0) st.beams.push({ a: m4.xfPoint(c.M, [-0.2, 0, 0.35]), b: m4.xfPoint(c.M, [-0.2, 0, 2.55]), width: 0.62, color: scale(CYAN, 2.4),
      shaft: 0.34, head: 0.22, progress: pk, flow: t * 2.2, alpha: 1 });
    const ga = m4.xfPoint(c.M, [0.95, 0.0, 0.5]);
    st.beams.push({ a: ga, b: add(ga, [0, 0, -1.3]), width: 0.24, color: WHITE, shaft: 0.22, head: 0.32, progress: ramp(t, E.cut1011, E.cut1011 + 0.3), flow: 0, alpha: 0.8 });
    st.labels = [{ text: '喷气（示意）', at: m4.xfPoint(c.M, [-1.5, -0.52, -0.9]), dx: -60, dy: 170, alpha: ramp(t, E.spray, E.spray + 0.3), color: '#9be8ff' }];
    st.slate = SLATE_AIR;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S11b into its cloud (night)
  s11b(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = this.ev11b(t);
    const c = this.setCar(st, ev);
    st.sim = ev;
    this.landingLights(st, c);
    const u = clamp((t - E.plunge) / (E.black - E.plunge));
    st.cam.pos = [mix(-10.8, -11.4, u), mix(-11.5, -11.0, u), mix(1.4, 1.1, u)];
    st.cam.target = lerp3([-14.2, 0, 5.2], [-15.8, 0, 2.6], easeInOut(u, 1.4));
    st.cam.fov = 56;
    st.dof = [8, len(sub(st.com, st.cam.pos)), 1.15, 60];
    this.jetState(st, c.M, this.poses.jets(ev), this.film.assets.poses.flight_dirs,
      { vel: this.comVel(ev), cyan: 0, night: 0.024, period: 0.42, speed: 9, scale: this.plumeScale(c.M), gain: 1.2 });
    this.rampCloud(st, ev, 0.016);
    this.dustAround(st, st.com, 0.8);
    st.slate = SLATE_TESLA;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S12 separator
  s12(t) {
    const st = this.base(t);
    st.world = 'black';
    st.carVisible = false;
    st.sky = { top: [0, 0, 0], horizon: [0, 0, 0], ground: [0, 0, 0] };
    st.spots = [];
    st.cards = [];
    st.kinetic = { kind: 'sep', t };
    st.post.vignette = 0;
    st.post.grain = 0.02;
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S13 the kickflip (lot)
  s13(t) {
    const E = this.E;
    const st = this.base(t);
    const s = this.src13(t);
    const F = this.flight;
    const M = F.carMatrix(s);
    st.world = 'lot';
    st.carM = M; st.carInv = m4.invert(M); st.ev = s;
    st.wheels = this.poses.wheelMatricesAt(M, 2.0 * s);
    st.com = m4.xfPoint(M, this.car.com);
    st.sim = s;
    st.dustT = s;
    this.lotLights(st);
    // low on the lot in front of the lineup, panning with the car from the cloud at the right to the left
    const cc = F.centre(s);
    const lag = F.centre(Math.max(5.45, s - 0.35));
    const aim = lerp3(lag, cc, 0.6);
    const fr = (t - E.kfOff) / (E.kfResume - E.kfOff);
    const orbit = (t > E.kfOff && t < E.kfResume + 0.6) ? Math.sin(Math.PI * clamp((t - E.kfOff) / (E.kfResume + 0.6 - E.kfOff))) : 0;
    const base = [mix(6.0, -4.0, smooth((aim[0] - 14) / -26)), 10.2, 1.9];
    // while time is frozen the camera swings round to face the car's nose (the roll circle faces the lens)
    const Xw = m4.xfDir(M, [1, 0, 0]);
    const v0 = sub(base, st.com);
    const v1 = add(scale(norm([Xw[0], Xw[1], 0]), 8.6), [0, 0, 1.0]);
    const k = smooth(orbit);
    const vv = norm(lerp3(norm(v0), norm(v1), k));
    st.cam.pos = add(st.com, scale(vv, mix(len(v0), len(v1), k)));
    st.cam.target = lerp3(add(aim, [0, 0, -0.6]), st.com, k);
    st.cam.fov = mix(44, 40, k);
    st.dof = [10, len(sub(st.com, st.cam.pos)), 1.15, 60];
    // plumes (v4 windows) from the schematic nozzles, turning with the car; the source cloud; the overhead lines
    const vel = scale(sub(F.centre(s + 0.01), F.centre(s - 0.01)), 50);
    this.jetState(st, M, F.plumes(s), null, { vel, cyan: 0, night: 0.022, period: 0.4, speed: 8, scale: 1.3, gain: 1.0 });
    this.flightCloud(st, s, 0.011);
    st.cables = { gain: 1 };
    st.dust = { min: [aim[0] - 8, aim[1] - 9, -0.2], size: [16, 16, 10], count: 60000, fall: 0.45, ambient: 0.003, gain: 0.8, shutter: 0.035 };
    st.slate = SLATE_MUSK;
    st.labels = [];
    // 「偏离重心」: time stops in air vision; the off-centre push turns the car about its centre of mass
    const tf = t - (E.kfOff - 0.04);
    const tr = t - E.kfResume;
    if (tf > 0 && tr < 0.6) {
      if (tr < 0) this.pingTo(st, st.com, tf, { reach: 36, dur: 0.8, shell: 0.6 });
      else this.pingOut(st, st.com, tr, { reach: 36, dur: 0.55 });
      st.carAirAlpha = 0.55;
      st.jets.look[0] = 1;
      st.slate = SLATE_AIR;
      const k = ramp(tf, 0.15, 0.45) * (1 - ramp(tr, 0.0, 0.4));
      const X = m4.xfDir(M, [1, 0, 0]), Y = m4.xfDir(M, [0, 1, 0]), Z = m4.xfDir(M, [0, 0, 1]);
      const com = st.com;
      // the net push of the jets, off the centre of mass (to the car's right): schematic
      const a = m4.xfPoint(M, [0.0, -0.62, -0.8]), b = m4.xfPoint(M, [0.0, -0.62, 0.55]);
      st.beams.push({ a, b, width: 0.5, color: scale(CYAN, 2.4), shaft: 0.34, head: 0.26, progress: k, flow: t * 2.2, alpha: k });
      // and the turn it makes about the centre of mass (the roll to the left that follows)
      const ka = ramp(tf, 0.4, 0.75) * (1 - ramp(tr, 0.0, 0.4));
      st.arcs = [{ c: add(com, scale(X, 0.15)), u: norm(Y), v: norm(Z), r: 1.35, a0: 115 * deg, a1: -25 * deg, width: 0.16, color: scale(CYAN, 2.6),
        shaft: 0.34, head: 0.12, progress: ka, flow: t * 1.5, alpha: ka }];
      st.labels = [
        { text: '重心', at: com, dx: -150, dy: -120, alpha: ka, color: '#e8eef5' },
        { text: '喷气（示意）', at: m4.xfPoint(M, [0.0, -0.62, -0.7]), dx: 110, dy: 150, alpha: k, color: '#9be8ff', plate: true },
      ];
    }
    // the overhead lines stay in the picture and are named as what they are: visible, role not stated. The camera
    // pans fast, so the dot rides the top wire (near span + far span) where it crosses screen column x = 900 and the
    // text holds still top right, clear of the car, its plumes and the caption
    const OL = this.film.assets.kickflip.overhead_lines;
    st.labels.push({ text: '画面中可见细线，\n作用未公开', path: [...OL[0].points, ...OL[1].points.slice(1)], col: 900, textAt: [880, 560],
      plate: true, small: true, color: '#d9e2ec', alpha: win(t, E.kfResume + 0.52, E.kfResume + 0.77, E.cut1314 - 0.3, E.cut1314 - 0.05) });
    return st;
  }

  // ---------------------------------------------------------------------------------------------- S14 借 / 花 / 喷完
  s14(t) {
    const E = this.E;
    const st = this.base(t);
    const ev = 13.6;
    const c = this.setCar(st, ev);
    st.sim = t;
    this.landingLights(st, c);
    // one move: the whole ramp and the car in its thinning cloud → in on the car → up and away
    const cam = this._cam14(t);
    st.cam.pos = cam.pos; st.cam.target = cam.target; st.cam.fov = cam.fov;
    st.dof = [6, len(sub(st.com, st.cam.pos)), 1.15, 50];
    this.rampCloud(st, 13.6 + 0.4 * (t - E.cut1314), 0.006 * (1 - ramp(t, E.cut1314 + 0.5, E.spend)), { clock: t * 0.6, grow: 1.6, flat: 0.3 });
    this.dustAround(st, st.cam.target, 0.9);
    st.dust.size = [26, 26, 22];
    st.dust.min = sub(st.cam.target, [13, 13, 9]);
    // 「借」: borrowed air presses on the whole ramp (gold sweeps up the driving surface and stays)
    const kb = ramp(t, E.borrow - 0.1, E.borrow + 0.3);
    st.rampGold = [kb * 0.9, mix(-6.5, 30, ramp(t, E.borrow - 0.1, E.borrow + 1.0)), 1, 0];
    // 「花」: the spent gas along the airborne path (ice cyan); it drains on 「喷完」
    st.path = { count: 26000, P: this.flightPath, drawn: ramp(t, E.spend - 0.1, E.spend + 0.8), drained: ramp(t, E.empty - 0.25, E.lastWord + 0.25),
      radius: 0.32, flow: t, gain: 1.25 };
    // 「自己的气」: air vision on the car; the reserve drains through the nozzles until it is empty
    const tp = t - (E.own2 - 0.1), tq = t - (E.lastWord + 0.32);
    if (tp > 0) {
      if (tq < 0) this.pingTo(st, st.com, tp, { reach: 30, dur: 0.9, shell: 0.7 });
      else this.pingOut(st, st.com, tq, { reach: 30, dur: 0.9 });
      st.carAirAlpha = 0.5;
      this.airField(st, st.com, 0.5 * (1 - ramp(tq, 0, 0.6)));
      const level = mix(0.4, 0.0, smooth((t - (E.own2 + 0.5)) / (E.empty + 0.45 - (E.own2 + 0.5))));
      st.store = { ...VESSEL, count: 9000, outlineCount: 3000, level, rate: 22, amp: 0.07,
        outline: (1 - 0.65 * ramp(t, E.lastWord, E.lastWord + 0.4)) * (1 - ramp(tq, 0.2, 0.7)), gain: 1.5 };
      const puff = level > 0.004 ? 0.35 + 0.65 * Math.max(0, Math.sin((t - E.own2) * 9)) : 0;
      const lv = { FL: puff * level * 2.2, FR: puff * level * 2.2, RL: puff * level * 2.2, RR: puff * level * 2.2 };
      this.jetState(st, c.M, lv, this.film.assets.poses.flight_dirs, { cyan: 1, period: 0.35, speed: 5, scale: 1.0, air: 0.04, size: 0.8 });
      st.labels = [{ text: '储气（示意）', at: m4.xfPoint(c.M, [0.3, 0.4, 0.36]), dx: 120, dy: -200, alpha: win(t, E.own2 + 0.2, E.own2 + 0.5, E.lastWord, E.lastWord + 0.3), color: '#9be8ff' }];
    }
    st.slate = t > E.borrow - 0.1 ? SLATE_AIR : SLATE_TESLA;
    if (t > E.title - 0.2) st.slate = null;
    st.kinetic = { kind: 'ending', t };
    // the last frames close to black
    st.post.exposure *= 1 - ramp(t, E.end - 0.45, E.end - 0.02);
    st.textFade = 1 - ramp(t, E.end - 0.45, E.end - 0.02);
    return st;
  }

  _cam14(t) {
    if (!this._c14) {
      const E = this.E;
      this._c14 = camPath([
        [E.cut1314, [-34.0, -24.0, 9.0], [-9.6, 0.0, 4.6], 56],
        [E.spend + 1.2, [-32.5, -23.0, 8.5], [-10.0, 0.0, 4.4], 55],
        [E.empty + 0.1, [-24.6, -7.4, 3.2], [-17.5, 0.0, 0.7], 46],      // close on the car: nose kept in frame
        [E.lastWord + 0.45, [-25.6, -9.0, 4.0], [-16.7, 0.0, 1.2], 47],
        [E.end, [-40.0, -30.0, 17.0], [-9.6, 0.0, 4.8], 54],
      ]);
    }
    return this._c14(t);
  }

  // ---------------------------------------------------------------------------------------------- captions
  captions(st, t) {
    const caps = this.film.lines.lines.map((l) => l.id).filter((id) => id !== 'V01' && this.v.has(id));
    st.captions = [];
    caps.forEach((id, k) => {
      const c = this.v.clip(id);
      const next = k + 1 < caps.length ? this.v.start(caps[k + 1]) : Infinity;
      const off = Math.min(c.end + 0.4, next - 0.1);
      const a = win(t, c.start - 0.08, c.start + 0.04, off - 0.12, off);
      if (a > 0) st.captions.push({ id, text: c.text, alpha: a, chars: c.chars, t });
    });
    st.voice = this.v;
    st.E = this.E;
  }
}
