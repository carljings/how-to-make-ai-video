// film.js — composes frame f: the 3D world, 3D-anchored labels, HUD, type, tag, fades. Every frame is a pure function of f.
import { W, H, FPS, END, FRAMES, T, SHOTS, CARDS, TAGS, C, BEAT, frameOf, FADE_V0, FADE_V1, STOP_END } from './timeline.js';
const TAU = Math.PI * 2;
import { clamp, mix, ramp, lin, win, smooth, easeOut, easeIn, easeInOut, backOut, pchip, pchip3, lerp3, add3, sub3, scale3, norm3, len3, hash } from './lib.js';
import { World, loadModel } from './world3d.js';
import { MUSIC } from './music.js';

const FONT = (w, px) => `${w} ${px}px "NSC", sans-serif`;
const ROLE = { hero: { w: 900, px: 112, track: 5 }, big: { w: 900, px: 220, track: 12 }, support: { w: 500, px: 56, track: 4 }, note: { w: 500, px: 38, track: 2 } };
const COL = (c) => C[c] || c;
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// shot index by frame: a cut is on the frame nearest its cue time
const SHOT_F = SHOTS.map((s) => ({ ...s, f0: frameOf(s.t0), f1: frameOf(s.t1) }));
const shotOfFrame = (f) => SHOT_F.find((s) => f >= s.f0 && f < s.f1) || SHOT_F[SHOT_F.length - 1];
// a small lens pulse on the music's strong detected onsets (strength ≥ 3.5): the picture breathes with the accents
const ACCENTS = MUSIC.onsets.filter((o) => o[1] >= 3.5).map((o) => [o[0], Math.min(1, (o[1] - 3) / 4)]);
const accent = (t) => { let v = 0; for (const [ta, k] of ACCENTS) if (t >= ta && t - ta < 0.4) v = Math.max(v, k * Math.exp(-(t - ta) * 12)); return v; };

// light rigs (spot slots 0–3: {pos, aim, color, cd, angle}); intensities in candela (decay 2)
const RAMP_RIG = (k = {}) => [
  { pos: [-10.5, -13.0, 0.6], aim: [-2.6, 0, 15.0], color: 0xd8e4ff, cd: 1800 * (k.key ?? 1), angle: 24 },
  { pos: [-5.0, 12.5, 0.6], aim: [-2.2, 0, 15.1], color: 0xffe9d6, cd: 1900 * (k.rim ?? 1), angle: 18 },
  { pos: [9.0, -14.5, 0.6], aim: [5.0, 0, 9.5], color: 0xdfe8ff, cd: 1300 * (k.curl ?? 1), angle: 30 },
  ...(k.extra ? [k.extra] : []),
];
const LOT_RIG = (k = 1) => [
  { pos: [-22, -48, 19], aim: [-3, 27, 3], color: 0xf4f8ff, cd: 4500 * k, angle: 26, range: 220, beam: 0 },
  { pos: [18, -50, 20], aim: [4, 27, 4], color: 0xf4f8ff, cd: 4500 * k, angle: 26, range: 220, beam: 0 },
  { pos: [0, 85, 10], aim: [0, 8, 0], color: 0xeef3ff, cd: 5000 * k, angle: 30, range: 220, beam: 0 },
  { pos: [26, 40, 11], aim: [0, 22, 0], color: 0xfff6ec, cd: 2600 * k, angle: 38, range: 120, beam: 0 },
];
// the lab is filmed from behind the cars (−y): key from behind-left-high, rim from the right side (never facing the lens)
const LAB_RIG = () => [
  { pos: [-7, -11, 10], aim: [0, 0, 2.5], color: 0xe4ecff, cd: 520, angle: 34, beam: 0 },
  { pos: [11, 1, 6], aim: [0, 0, 2.8], color: 0xffe2c8, cd: 260, angle: 30, beam: 0 },
];

export class Film {
  async init(base) {
    this.model = await loadModel(base);
    this.world = new World(W, H, this.model);
    const out = this.out = document.getElementById('out');
    out.width = W; out.height = H;
    this.ctx = out.getContext('2d');
    this.frameCount = FRAMES;
    this.lip = this.model.sceneMeta.ramp.LIP;
    this._clocks();
  }

  _clocks() {
    // source clocks: ev = seconds of Tesla's continuous wide take (v9 fit); s = seconds of the kickflip video
    this.evA = pchip([[T.hook, 5.62], [T.inv, 7.35], [T.run, 8.42], [T.stop, 9.69]]);                         // ≈1.15× (变速)
    // in the song's own silence: off the end, then BULLET TIME with the car on its side (ev 9.97–10.06 over 0.55 s while
    // the camera orbits), then the swell pulls it upright for the catch on the returning beat
    this.evLeave = pchip([[T.stop, 9.69], [4.0, 9.97], [4.55, 10.06], [STOP_END, 10.52], [T.slam, 10.76]]);
    this.leaveOrbit = pchip([[T.stop, -1.78], [4.0, -1.95], [4.55, -2.55], [T.slam, -2.7]]);   // swings to the front: the roll reads as the silhouette turning
    this.evCatch = pchip([[T.slam, 10.76], [T.rew, 12.45]]);                                                      // ≈1.35×
    this.evRew = (t) => mix(12.45, 8.58, easeInOut(lin(t, T.rew, T.cut - 0.05), 2.2));                           // reverse
    this.evSec = pchip([[T.cut, 8.58], [T.press, 8.72], [T.lip, 9.0]]);                                           // creeping (bullet time)
    this.evRel = pchip([[T.lip, 9.0], [T.lip + 0.9, 9.42], [T.jets, 9.9]]);                                       // ≈0.43×
    this.evThr = pchip([[T.jets, 10.62], [T.map, 12.95]]);                                                        // ≈0.78×
    // the kickflip ≈1:1, except BULLET TIME mid-roll (s 7.95→8.08 over 0.85 s, camera orbiting) and a 2.4× snap after it
    this.sFly = pchip([[T.lift, 5.75], [T.roll, 7.42], [T.btIn, 7.95], [T.btOut, 8.08], [T.wide, 9.12], [T.lab, 11.0]]);
    this.flipOrbit = pchip([[T.roll, -0.55], [T.btIn, -0.35], [T.btOut, 1.75], [T.wide, 1.95]]);
    this.sReplay = pchip([[T.replay, 7.35], [T.lines, 8.85]]);
    this.sLines = pchip([[T.lines, 8.85], [T.sum1, 10.55]]);
  }

  // ------------------------------------------------------------------------------------------- helpers
  rampPose(ev) { const w = this.world, M = w.rampM(ev); return { M, com: w.com(M), wa: w.poses.wheelAngle(ev) }; }
  kickPose(s) { const w = this.world, M = w.kickM(s), com = w.com(M); return { M: com[2] > 0.15 ? M : null, com }; }
  base(world, t) { return { world, cam: { pos: [0, -20, 5], target: [0, 0, 10], fov: 40 }, exposure: 1.0, bloom: 0.55, arrows: [], spheres: [], dashes: [], arcs: [], rings: [], labels: [], t, shake: 0.05 }; }
  // an expanding shock ring born at t0 (centre, normal); used on ignitions
  shock(st, t, t0, c, normal, color, rMax = 4, life = 0.55, glow = 1.4) { const age = t - t0; if (age < 0 || age > life) return; const u = age / life;
    st.rings.push({ c, normal, r: 0.15 + rMax * easeOut(u, 2.2), color, alpha: 0.85 * (1 - u) * (1 - u), glow }); }
  burst(t, t0, len = 0.42) { return ramp(t, t0 - 0.01, t0 + 0.05) * (1 - ramp(t, t0 + len - 0.12, t0 + len)); }
  rampJets(ev, gain = 1) { return { levels: this.world.poses.jets(ev), dirs: this.model.poses.flight_dirs, time: ev * 1.6, gain, nose: 0.55, len: 3.0 }; }
  vel(M0, M1, dt) { return scale3(sub3(this.world.com(M1), this.world.com(M0)), 1 / dt); }
  // the push of the outside air: from below the car, through it, into the deck (car-local −Z = toward the deck when inverted)
  pushArrow(M, k, beat = 0, from = 3.0) {
    const w = this.world, a = w.apply(M, [0.0, 0, from]), b = w.apply(M, [0.0, 0, 0.05]);
    return { a, b, width: 0.34 * (1 + 0.12 * beat), color: C.orange, k, glow: 1.3 + 0.4 * beat };
  }
  lipLocal(M) { const inv = M.clone().invert(); return this.world.apply(inv, this.lip)[0]; }

  // ------------------------------------------------------------------------------------------- Demo ① cold open
  climb(t) {
    const ev = this.evA(t), P = this.rampPose(ev), st = this.base('ramp', t);
    const u = lin(t, T.hook, T.inv);
    // worm's-eye at the foot of the wall, looking up as the car climbs and starts to curve over
    st.cam.pos = [mix(1.2, 0.6, u), mix(-3.6, -4.4, u), 0.45];
    st.cam.target = add3(P.com, [mix(-0.4, -1.2, u), 0, mix(1.0, 1.8, u)]);
    st.cam.fov = mix(60, 54, easeOut(u, 2)); st.cam.roll = mix(0.10, 0.04, u);
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.75, rim: 1.2, curl: 0.95 }), exposure: 0.95, bloom: 0.6 });
    return st;
  }
  over(t) {
    const ev = this.evA(t), P = this.rampPose(ev), st = this.base('ramp', t);
    const u = lin(t, T.inv, T.run);
    // under the deck looking up: the car arrives on the ceiling
    st.cam.pos = [mix(-2.2, -3.2, u), mix(-7.2, -7.8, u), mix(8.8, 9.2, u)];
    st.cam.target = add3(P.com, [-0.6, 0, -0.3]);
    st.cam.fov = mix(50, 47, u); st.cam.roll = mix(-0.08, -0.02, u);
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.4, rim: 1.0, curl: 0.6 }), exposure: 0.84, bloom: 0.55 });
    return st;
  }
  run(t) {
    const ev = this.evA(t), P = this.rampPose(ev), st = this.base('ramp', t);
    const u = lin(t, T.run, T.stop);
    // tracking alongside and below, the lit free end ahead
    st.cam.pos = add3(P.com, [mix(3.4, 2.2, u), mix(-6.6, -6.0, u), mix(-3.2, -3.0, u)]);
    st.cam.target = add3(P.com, [mix(-2.4, -3.4, u), 0.4, mix(-0.2, -0.1, u)]);
    st.cam.fov = mix(48, 52, u); st.cam.roll = 0.05 * Math.sin(t * 2.4);
    st.lip = ramp(t, T.run, T.run + 0.3);
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.75, rim: 1.2 }), exposure: 0.98, bloom: 0.65 });
    return st;
  }
  leave(t) {
    const ev = this.evLeave(t), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    const u = lin(t, T.stop, T.slam), phi = this.leaveOrbit(t), R = mix(10.5, 9.0, u);
    // the camera hangs beside the end of the deck and swings ~50° round the car while it hangs on its side
    st.cam.pos = add3(P.com, [R * Math.cos(phi), R * Math.sin(phi), mix(-2.0, -0.9, easeInOut(u, 2))]);
    st.cam.target = add3(P.com, [mix(1.0, 0.2, u), 0, mix(0.3, -0.2, u)]);
    st.cam.fov = mix(46, 44, u);
    st.lip = 1 - ramp(t, T.stop, T.stop + 0.5);
    st.jets = this.rampJets(ev, 1.0);
    st.zoomBlur = 0.6 * Math.exp(-Math.max(0, t - T.stop) * 8);           // the moment the music cuts out
    st.shake = 0;
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.7, rim: 1.2, curl: 0.4, extra: { pos: [-15.5, -7.5, 0.6], aim: P.com, cd: 900, angle: 11, color: 0xdde8ff } }), exposure: 0.95, bloom: 0.6 });
    return st;
  }
  catch(t) {
    const ev = this.evCatch(t), P = this.rampPose(ev), st = this.base('ramp', t);
    const u = lin(t, T.slam, T.rew);
    // from the floor, looking up into the four plumes
    st.cam.pos = [mix(-13.4, -14.4, u), mix(-6.4, -7.4, u), 0.5];
    st.cam.target = add3(P.com, [0.2, 0, mix(1.2, 0.4, u)]);
    st.cam.fov = mix(52, 56, u); st.cam.roll = mix(0.06, 0.0, u);
    st.jets = this.rampJets(ev, 0.85);
    st.puffs = this.world.poses.cloud(ev).map((p) => ({ ...p, a: p.a * 0.6 }));
    // the catch on the returning beat: ignition rings at the four floor nozzles, a lens punch
    const dn = this.world.dir(P.M, [0, 0, -1]);
    for (const n of ['FL', 'FR', 'RL', 'RR']) this.shock(st, t, T.slam, this.world.apply(P.M, this.model.carMeta.nozzles[n].pos), dn, C.mint, 1.6, 0.45);
    st.zoomBlur = 0.8 * Math.exp(-Math.max(0, t - T.slam) * 7); st.shake = 0.12;
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.6, rim: 1.1, curl: 0.3, extra: { pos: [-4.0, -17.0, 0.6], aim: [-15.5, 0, 2.5], cd: 1500, angle: 24 } }), exposure: 0.95, bloom: 0.65 });
    return st;
  }
  rewind(t) {
    const ev = this.evRew(t), P = this.rampPose(ev), st = this.base('ramp', t);
    st.cam.pos = [-5.5, -19.0, 7.0]; st.cam.target = lerp3(P.com, [-4.0, 0, 11.0], 0.35); st.cam.fov = 52;
    st.jets = ev > 10.4 ? this.rampJets(ev, 1.0) : null;
    st.puffs = this.world.poses.cloud(ev);
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.8, rim: 1.2 }), exposure: 1.0, bloom: 0.6, blur: { n: 4, dt: 0.025 } });
    st.hudRew = 1;
    return st;
  }

  // ------------------------------------------------------------------------------------------- Demo ① principles
  sectionState(st, M, t, k) {   // the cut-open view (shared by section / pressure / release)
    st.cut = { on: true, x: k.x ?? 5.2, laser: k.laser ?? 0, diff: k.diff ?? 1, fan: k.fan ?? 1, seal: k.seal ?? 1, lip: this.lipLocal(M), deck: 1, alpha: k.alpha ?? 1, time: t };
  }
  section(t) {
    const ev = this.evSec(t), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    const u = lin(t, T.cut, T.press), sweep = easeInOut(lin(t, T.cut, T.cut + 0.55), 2);
    const push = easeInOut(lin(t, T.gap - 0.15, T.gap + 0.55), 2.5);
    // beside and below the inverted car, then pushing in toward the gap at the bar line
    const back = w.apply(P.M, [-1.2, 0, 0.3]);
    const off = lerp3([0.2, -11.6, -0.5], [-0.3, -5.6, -0.25], push);
    st.cam.pos = add3(lerp3(P.com, back, push), off); st.cam.target = add3(lerp3(P.com, back, push), [0, 0.0, mix(-0.1, 0.1, push)]);
    st.cam.fov = mix(42, 40, u); st.cam.roll = 0;
    this.sectionState(st, P.M, t, { x: mix(-3.2, 3.2, sweep), laser: 1 - ramp(sweep, 0.85, 1), fan: ramp(t, T.cut + 0.3, T.cut + 0.9), seal: ramp(t, T.gap - 0.1, T.gap + 0.2) });
    st.impacts = { outer: 0.3 * ramp(sweep, 0.6, 1), gap: 0.6 * ramp(sweep, 0.6, 1), time: t };
    const kL = ramp(t, T.gap, T.gap + 0.25);
    if (kL > 0) {
      st.labels.push({ p: w.apply(P.M, [0.1, 0, 0.05]), text: '低压', color: C.blue, a: kL, dx: 0, dy: -150 });
      st.labels.push({ p: w.apply(P.M, [1.5, 0, 0.06]), text: '密封', color: C.white, a: kL, dx: 120, dy: 120 });
      st.labels.push({ p: w.apply(P.M, [-2.6, 0, 0.18]), text: '抽气', color: C.blue, a: kL, dx: -40, dy: 150 });
    }
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.55, rim: 1.0, curl: 0.4 }), exposure: 0.92, bloom: 0.6, fog: 0.008 });
    return st;
  }
  pressure(t) {
    const ev = this.evSec(t), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    const u = easeInOut(lin(t, T.press, T.lip), 1.6);
    st.cam.pos = add3(P.com, [mix(-0.8, 0.6, u), mix(-12.6, -13.4, u), mix(-1.8, -2.4, u)]);
    st.cam.target = add3(P.com, [0, 0, -0.75]);
    st.cam.fov = mix(44, 42, u);
    this.sectionState(st, P.M, t, {});
    st.impacts = { outer: 0.45, gap: 0.6, time: t };
    st.air = { alpha: 0.35, time: t * 0.7, centre: P.com, color: 0xffc89a };
    const kA = ramp(t, T.press, T.press + 0.3), kG = ramp(t, T.weight, T.weight + 0.3);
    const beat = Math.exp(-(((t - T.press) / BEAT) % 1 + 1) % 1 * 6);
    if (kA > 0) { st.arrows.push(this.pushArrow(P.M, kA, beat)); st.labels.push({ p: w.apply(P.M, [0, 0, 2.6]), text: '压差合力', color: C.orange, a: kA, dx: 190, dy: 30 }); }
    if (kG > 0) { const g0 = w.apply(P.M, [0.9, 0, 0.5]); st.arrows.push({ a: g0, b: add3(g0, [0, 0, -1.25]), width: 0.17, color: '#ffffff', k: kG, glow: 1.1 }); st.labels.push({ p: add3(g0, [0, 0, -1.25]), text: '重力', color: C.white, a: kG, dx: -150, dy: 40 }); }
    st.labels.push({ p: w.apply(P.M, [2.9, 0, 1.4]), text: '外面空气', color: C.orange, a: ramp(t, T.press + 0.1, T.press + 0.4), dx: 60, dy: -60 });
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.55, rim: 1.0, curl: 0.45 }), exposure: 0.9, bloom: 0.62, fog: 0.008 });
    return st;
  }
  release(t) {
    const ev = this.evRel(t), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    const u = lin(t, T.lip, T.jets);
    st.cam.pos = [mix(-4.6, -6.4, u), mix(-11.4, -12.0, u), mix(13.8, 12.6, u)];
    st.cam.target = add3(P.com, [0.6, 0, mix(0.2, -0.4, u)]);
    st.cam.fov = 44;
    const lipX = this.lipLocal(P.M);
    // the seal opens when the floor's front end passes the lip; the low pressure collapses over ~0.6 m of travel (not
    // instantly at the first opening — SCIENCE_AUDIT A10)
    const diff = 1 - smooth((1.5 - lipX) / 0.6);
    this.sectionState(st, P.M, t, { diff, fan: 1, seal: 1 - smooth((1.5 - lipX) / 0.4), alpha: 1 - ramp(t, T.jets - 0.45, T.jets - 0.05) });
    st.impacts = { outer: 0.9 * (0.3 + 0.7 * diff), gap: 0.5 * diff, time: t };
    if (diff > 0.02) st.arrows.push(this.pushArrow(P.M, diff));
    const g0 = w.apply(P.M, [0.0, 0, 0.5]); st.arrows.push({ a: g0, b: add3(g0, [0, 0, -1.25]), width: 0.17, color: '#ffffff', k: 1, glow: 1.1 });
    st.labels.push({ p: add3(g0, [0, 0, -1.25]), text: '重力', color: C.white, a: 1, dx: -140, dy: 40 });
    st.lip = 0.22;
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.6, rim: 1.1, curl: 0.4, extra: { pos: [-15.5, -7.5, 0.6], aim: P.com, cd: 700, angle: 11, color: 0xdde8ff } }), exposure: 0.93, bloom: 0.6 });
    return st;
  }
  thrust(t) {
    const ev = this.evThr(t), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    const u = easeInOut(lin(t, T.jets, T.map), 1.5);
    st.cam.pos = [mix(-12.0, -15.0, u), mix(-11.5, -12.5, u), mix(8.0, 2.8, u)];
    st.cam.target = add3(P.com, [0.0, 0, mix(-1.1, -0.2, u)]);
    st.cam.fov = mix(48, 52, u);
    st.jets = this.rampJets(ev, 1.15);
    st.puffs = w.poses.cloud(ev).map((p) => ({ ...p, a: p.a * 0.45 }));
    const lv = w.poses.jets(ev), k = ramp(t, T.jets, T.jets + 0.25) * (1 - ramp(t, T.map - 0.5, T.map - 0.1));
    // reaction arrows at the four floor nozzles (opposite to their exhaust), and the still-downward velocity
    const up = w.dir(P.M, [0, 0, 1]);
    for (const n of ['FL', 'FR', 'RL', 'RR']) {
      const L = Math.sqrt(Math.max(0, lv[n] || 0)); if (L < 0.05) continue;
      const p0 = w.apply(P.M, this.model.carMeta.nozzles[n].pos);
      st.arrows.push({ a: p0, b: add3(p0, scale3(up, 1.15 * L)), width: 0.12, color: C.mint, k, glow: 1.6 });
    }
    st.labels.push({ p: add3(w.apply(P.M, this.model.carMeta.nozzles.FL.pos), scale3(up, 1.1)), text: '推力', color: C.mint, a: k, dx: -60, dy: -90 });
    const v = this.vel(w.rampM(ev - 0.04), w.rampM(ev + 0.04), 0.08), sp = len3(v);
    if (sp > 0.5) {
      const c0 = add3(P.com, [0, 0, -0.7]), vv = scale3(norm3(v), Math.min(3.2, 0.33 * sp));
      st.dashes.push({ a: c0, b: add3(c0, vv), width: 0.09, color: '#ffffff', alpha: k, period: 0.3, duty: 0.6, scroll: -t * 3 });
      st.arrows.push({ a: add3(c0, scale3(vv, 0.82)), b: add3(c0, vv), width: 0.12, color: '#ffffff', k: 1, alpha: k, glow: 1.2 });
      st.labels.push({ p: add3(c0, scale3(vv, 0.55)), text: '仍在下落', color: C.white, a: k * ramp(t, T.jets + 0.3, T.jets + 0.6), dx: 210, dy: 40 });
    }
    st.hudGas = { a: ramp(t, T.jets + 0.4, T.jets + 0.7) * (1 - ramp(t, T.map - 0.35, T.map - 0.05)), level: mix(1.0, 0.32, easeInOut(lin(t, T.jets + 0.4, T.map - 0.3), 1.3)) };
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.6, rim: 1.1, curl: 0.3, extra: { pos: [-4.0, -17.0, 0.6], aim: [-15.5, 0, 2.5], cd: 1500, angle: 24 } }), exposure: 0.95, bloom: 0.62 });
    return st;
  }

  // ------------------------------------------------------------------------------------------- Demo ② the parking lot
  lotCommon(st, s, gain = 1) {
    const P = this.kickPose(s), F = this.world.flight;
    st.carM = P.M; st.wheelAng = 0;
    st.jets = P.M ? { levels: F.plumes(s), time: s * 1.5, gain: 0.55 * gain, nose: 0.5, len: 2.4, size: 0.12 } : null;
    st.puffs = F.cloud(s);
    st.rig = LOT_RIG(); st.hemi = 0.18; st.fog = 0.006; st.exposure = 1.0; st.bloom = 0.55;
    return P;
  }
  // ------------------------------------------------------------------------------------------- the jet map (schematic positions)
  // one car floating in the lab, seen from BEHIND (its left = screen left). On the beats: the left group, the right group,
  // then nose + floor fire; each nozzle is marked and colour-coded (left cyan, right pink, nose white).
  labFrame(com, th = 0) {   // nose along +y (away from a camera at −y), rolled by th about the long axis
    const X = [0, 1, 0], Y0 = [-1, 0, 0], Z0 = [0, 0, 1];
    const Y = add3(scale3(Y0, Math.cos(th)), scale3(Z0, Math.sin(th))), Z = add3(scale3(Y0, -Math.sin(th)), scale3(Z0, Math.cos(th)));
    const O = sub3(com, scale3(Z, 0.5));
    return { M: this.world.rampM(0).clone().set(X[0], Y[0], Z[0], O[0], X[1], Y[1], Z[1], O[1], X[2], Y[2], Z[2], O[2], 0, 0, 0, 1), Y, Z };
  }
  jetmap(t) {
    const st = this.base('lab', t), w = this.world, com = [0, 0, 3.0], { M } = this.labFrame(com);
    const u = lin(t, T.map, T.lift);
    // stays BEHIND the car (±20°) so its left group is always on screen-left and its right group on screen-right
    const a = pchip([[T.map, -0.36], [T.mapL, -0.2], [T.mapR, 0.2], [T.mapN, 0.3], [T.lift, 0.36]])(t);
    const R = mix(12.0, 10.6, u), h = pchip([[T.map, 4.2], [T.mapR, 3.0], [T.lift, 2.2]])(t);
    st.cam.pos = add3(com, [R * Math.sin(a), -R * Math.cos(a), h]); st.cam.target = add3(com, [0, 0.6, -0.9]); st.cam.fov = 44;
    st.carM = M; st.wheelAng = 0; st.rig = LAB_RIG(); st.hemi = 0.14; st.fog = 0.02; st.bloom = 0.62; st.grid = 1; st.lampK = 0.35; st.redK = 0.3; st.shake = 0.03;
    const N = this.model.carMeta.nozzles, gL = this.burst(t, T.mapL), gR = this.burst(t, T.mapR), gN = this.burst(t, T.mapN, 0.5);
    st.jets = { levels: { FL: Math.max(gL, gN), RL: Math.max(gL, gN), SL: gL, FR: Math.max(gR, gN), RR: Math.max(gR, gN), SR: gR, NOSE: gN },
      colors: { FL: C.L, RL: C.L, SL: C.L, FR: C.R, RR: C.R, SR: C.R, NOSE: '#dfe8ff' }, time: t * 1.6, gain: 0.85, nose: 0.6, len: 2.6 };
    const ground = (n) => { const p = w.apply(M, N[n].pos); return [p[0], p[1], 0.02]; };
    for (const [n, t0, col] of [['SL', T.mapL, C.L], ['SR', T.mapR, C.R]]) this.shock(st, t, t0, w.apply(M, N[n].pos), w.dir(M, N[n].dir), col, 1.4, 0.4, 1.8);
    for (const n of ['FL', 'RL']) this.shock(st, t, T.mapL, ground(n), [0, 0, 1], C.L, 3.0, 0.6);
    for (const n of ['FR', 'RR']) this.shock(st, t, T.mapR, ground(n), [0, 0, 1], C.R, 3.0, 0.6);
    this.shock(st, t, T.mapN, [com[0], com[1], 0.02], [0, 0, 1], '#ffffff', 6.0, 0.6);
    st.zoomBlur = 0.55 * Math.max(Math.exp(-Math.max(0, t - T.mapL) * 9) * (t >= T.mapL ? 1 : 0), Math.exp(-Math.max(0, t - T.mapR) * 9) * (t >= T.mapR ? 1 : 0), Math.exp(-Math.max(0, t - T.mapN) * 8) * (t >= T.mapN ? 1.3 : 0));
    // nozzle markers + labels
    const kM = ramp(t, T.map, T.map + 0.25);
    // floor nozzles: small dots; side nozzles (SL/SR): a larger dot inside a ring facing their plume — two different kinds
    for (const [n, col, g] of [['FL', C.L, Math.max(gL, gN)], ['RL', C.L, Math.max(gL, gN)], ['FR', C.R, Math.max(gR, gN)], ['RR', C.R, Math.max(gR, gN)], ['NOSE', '#ffffff', gN]])
      st.spheres.push({ p: w.apply(M, N[n].pos), r: 0.065 + 0.04 * g, color: col, alpha: kM, glow: 1.8 + 1.2 * g });
    for (const [n, col, g] of [['SL', C.L, gL], ['SR', C.R, gR]]) {
      const p0 = w.apply(M, N[n].pos);
      st.spheres.push({ p: p0, r: 0.09 + 0.05 * g, color: col, alpha: kM, glow: 2.0 + 1.2 * g });
      st.rings.push({ c: p0, normal: w.dir(M, N[n].dir), r: 0.26, color: col, alpha: kM * 0.9, glow: 1.6 });
    }
    st.labels.push({ p: w.apply(M, N.SL.pos), text: '左侧喷口', color: C.L, a: kM, dx: -130, dy: -120 });
    st.labels.push({ p: w.apply(M, N.SR.pos), text: '右侧喷口', color: C.R, a: kM, dx: 130, dy: -120 });
    st.labels.push({ p: w.apply(M, N.RL.pos), text: '左底喷口', color: C.L, a: kM * ramp(t, T.mapL, T.mapL + 0.15), dx: -150, dy: 150 });
    st.labels.push({ p: w.apply(M, N.RR.pos), text: '右底喷口', color: C.R, a: kM * ramp(t, T.mapR, T.mapR + 0.15), dx: 150, dy: 150 });
    st.labels.push({ p: w.apply(M, N.NOSE.pos), text: '车头', color: '#ffffff', a: kM * ramp(t, T.mapR, T.mapR + 0.2), dx: 0, dy: -120 });

    return st;
  }
  lift(t) {
    const s = this.sFly(t), st = this.base('lot', t), w = this.world;
    const P = this.lotCommon(st, s, 1.1);
    const u = lin(t, T.lift, T.roll);
    st.zoomBlur = 0.7 * Math.exp(-Math.max(0, t - T.lift) * 7); st.shake = 0.08;
    if (P.M) this.shock(st, t, T.lift + 0.28, [P.com[0], P.com[1], 0.03], [0, 0, 1], C.mint, 7.0, 0.7);
    st.cam.pos = [mix(16.5, 13.0, u), mix(18.0, 17.0, u), mix(1.2, 2.6, u)];
    st.cam.target = add3(P.com, [0, 0, 0.3]); st.cam.fov = mix(44, 42, u);
    if (P.M) {
      const lv = w.flight.plumes(s), up = w.dir(P.M, [0, 0, 1]), k = ramp(t, T.lift + 0.25, T.lift + 0.5);
      for (const n of ['FL', 'FR', 'RL', 'RR']) {
        const L = Math.sqrt(Math.max(0, lv[n] || 0)); if (L < 0.05) continue;
        const p0 = w.apply(P.M, this.model.carMeta.nozzles[n].pos);
        st.arrows.push({ a: p0, b: add3(p0, scale3(up, 1.1 * L)), width: 0.12, color: C.mint, k, glow: 1.6 });
      }
      st.labels.push({ p: add3(P.com, scale3(up, 1.7)), text: '推力', color: C.mint, a: k, dx: 120, dy: -30 });
    }
    return st;
  }
  flip(t) {
    const s = this.sFly(t), st = this.base('lot', t);
    const P = this.lotCommon(st, s, 0.9);
    const a = this.flipOrbit(t), R = 10.5, u = lin(t, T.roll, T.wide);
    // close; in bullet time the camera swings ~120° round the nearly frozen car (plumes frozen in the air), then snaps
    st.cam.pos = add3(P.com, [-R * Math.cos(a), -R * Math.sin(a) - 1.0, mix(-1.6, -0.6, u)]);
    st.cam.target = add3(P.com, [0.3, 0, 0.1]); st.cam.fov = 42;
    const snap = t >= T.btOut ? Math.exp(-(t - T.btOut) * 7) : 0;
    st.zoomBlur = 0.9 * snap; st.shake = 0.06 + 0.1 * snap;
    st.blur = t > T.btOut && t < T.btOut + 0.3 ? { n: 3, dt: 0.012 } : null;
    return st;
  }
  flipWide(t) {
    const s = this.sFly(t), st = this.base('lot', t);
    const P = this.lotCommon(st, s, 0.7);
    const u = lin(t, T.wide, T.lab);
    st.cam.pos = add3(P.com, [mix(4.0, 2.0, u), mix(-12.5, -13.5, u), mix(-3.2, -2.4, u)]); st.cam.target = add3(P.com, [0, 0, -0.6]); st.cam.fov = 46;
    st.lineGlow = 0.6;
    return st;
  }

  // ------------------------------------------------------------------------------------------- the torque lab (schematic)
  // two identical cars float in the dark lab, seen from BEHIND (left on the left). Only thrust is drawn (no gravity), slow
  // motion. A: left AND right floor jets together → the resultant passes through the centre of mass → it only rises.
  // B: LEFT pair only for 0.75 s → the thrust line misses the centre of mass by a lever arm → torque → it rolls; it coasts;
  // at the next bar its RIGHT pair fires for 0.75 s → opposite torque → the roll stops after exactly one turn, level.
  labCar(t, x0, fire, mode) {
    const U1 = 0.75, A = 1.15, Tb = T.brake - fire, ALPHA = TAU / (U1 * Tb);   // α·U1·Tb = 2π: one full turn, then at rest
    const u = Math.max(0, t - fire), dt = 1 / 240;
    let th = 0, w = 0, vx = 0, vz = 0, px = 0, pz = 0;
    const on = (q) => ({ L: q < U1 ? 1 : 0, R: mode === 'kick' ? (q >= Tb && q < Tb + U1 ? 1 : 0) : (q < U1 ? 1 : 0) });
    for (let q = 0; q < u; q += dt) {
      const h = Math.min(dt, u - q), o = on(q);
      if (mode === 'kick') w += ALPHA * (o.L - o.R) * h;
      const f = mode === 'kick' ? o.L + o.R : o.L;   // thrust along the car's own up axis (A: both sides = one unit)
      vx += Math.sin(th) * A * f * h; vz += Math.cos(th) * A * f * h;    // car up axis = (sin θ, 0, cos θ) (left = −x)
      th += w * h; px += vx * h; pz += vz * h;
    }
    const com = [x0 + px, 0, 2.6 + pz], F = this.labFrame(com, th);
    const o = on(u), tail = (k, t0) => (u >= t0 ? Math.max(0, 1 - (u - t0) / 0.12) : 0);
    const L = u > 0 ? Math.max(o.L, tail(0, U1)) : 0, Rr = mode === 'kick' ? Math.max(o.R, u >= Tb + U1 ? tail(0, Tb + U1) : 0) : L;
    const levels = mode === 'kick' ? { FL: L, RL: L, FR: Rr, RR: Rr } : { FL: L, RL: L, FR: L, RR: L };
    return { ...F, com, th, w, L, R: Rr, levels, u };
  }
  lab(t) {
    const st = this.base('lab', t), w = this.world, N = this.model.carMeta.nozzles;
    const A = this.labCar(t, -2.8, T.fireA, 'both'), B = this.labCar(t, 2.8, T.fireB, 'kick');
    st.carM = A.M; st.car2M = B.M;
    const dn = { FL: [0, 0, -1], FR: [0, 0, -1], RL: [0, 0, -1], RR: [0, 0, -1] }, cols = { FL: C.L, RL: C.L, FR: C.R, RR: C.R };
    st.jets = { levels: A.levels, dirs: dn, colors: cols, time: t * 1.6, gain: 0.85, len: 2.4 };
    st.jets2 = { levels: B.levels, dirs: dn, colors: cols, time: t * 1.6 + 3, gain: 0.85, len: 2.4 };
    // camera: on A; whip to B on the phrase; stay on B for the brake; pull back to both at the end
    const whip = easeInOut(lin(t, T.fireB - 0.12, T.fireB + 0.22), 2.4), back = easeInOut(lin(t, T.brake + 0.85, T.replay - 0.1), 2.0);
    const fa = add3(A.com, [0, 0, 0.2]), fb = add3(B.com, [0, 0, 0.2]);
    const focus = lerp3(lerp3(fa, fb, whip), [0, 0, 0.5 * (A.com[2] + B.com[2]) + 0.3], back);
    st.cam.pos = add3(focus, [mix(-0.8, 0.5, whip) * (1 - back), mix(-8.8, -8.6, whip) * (1 - back) - 18.0 * back, mix(1.3, 2.6, back)]);
    st.cam.target = add3(focus, [0, 0, 0.15]); st.cam.fov = mix(42, 44, back);
    st.blur = (t > T.fireB - 0.12 && t < T.fireB + 0.22) ? { n: 5, dt: 0.02 } : null;
    st.rig = LAB_RIG(); st.hemi = 0.12; st.fog = 0.02; st.bloom = 0.62; st.exposure = 1.0; st.grid = 1; st.lampK = 0.35; st.redK = 0.3; st.shake = 0.03;
    // ignition rings and lens punches on the three firings
    for (const [S, t0, side, col] of [[A, T.fireA, 'both', C.white], [B, T.fireB, 'L', C.L], [B, T.brake, 'R', C.R]]) {
      const ns = side === 'both' ? ['FL', 'RL', 'FR', 'RR'] : side === 'L' ? ['FL', 'RL'] : ['FR', 'RR'];
      for (const n of ns) this.shock(st, t, t0, w.apply(S.M, N[n].pos), scale3(S.Z, -1), side === 'R' ? C.R : side === 'L' ? C.L : C.mint, 1.3, 0.45, 1.8);
    }
    st.zoomBlur = 0.6 * Math.max(...[T.fireA, T.fireB, T.brake].map((t0) => (t >= t0 ? Math.exp(-(t - t0) * 8) : 0)));
    // geometry: centre of mass, left/right nozzle markers, the active thrust line, lever arm, the turn arc
    const draw = (S, kind, kk) => {
      if (kk <= 0) return;
      st.spheres.push({ p: S.com, r: 0.11, color: C.yellow, alpha: kk, glow: 2.2 });
      for (const [n, col, g] of [['FL', C.L, S.L], ['RL', C.L, S.L], ['FR', C.R, S.R], ['RR', C.R, S.R]]) st.spheres.push({ p: w.apply(S.M, N[n].pos), r: 0.07 + 0.05 * g, color: col, alpha: kk, glow: 1.8 + 1.4 * g });
      st.labels.push({ p: w.apply(S.M, [-0.24, 0.62, 0.1]), text: '左底', color: C.L, a: kk, dx: -105, dy: 30 });
      st.labels.push({ p: w.apply(S.M, [-0.24, -0.62, 0.1]), text: '右底', color: C.R, a: kk, dx: 105, dy: 30 });
      const act = kind === 'A' ? (S.L > 0.02 ? 'both' : null) : (S.L > 0.02 ? 'L' : S.R > 0.02 ? 'R' : null);
      if (!act) return;
      const y = act === 'both' ? 0 : act === 'L' ? 0.52 : -0.52, P0 = w.apply(S.M, [-0.24, y, 0.1]), g = act === 'R' ? S.R : S.L, col = act === 'L' ? C.L : act === 'R' ? C.R : C.mint;
      st.dashes.push({ a: add3(P0, scale3(S.Z, -2.4)), b: add3(P0, scale3(S.Z, 3.2)), width: 0.045, color: col, alpha: kk, period: 0.28, duty: 0.6, scroll: t * 1.5 });
      st.arrows.push({ a: P0, b: add3(P0, scale3(S.Z, 1.9)), width: 0.2, color: col, k: g, glow: 1.7 });
      if (act === 'both') { st.labels.push({ p: add3(P0, scale3(S.Z, 2.5)), text: '推力过重心', color: C.mint, a: kk * g, dx: 40, dy: -40 }); return; }
      const foot = add3(P0, scale3(S.Z, dot3(sub3(S.com, P0), S.Z)));
      st.dashes.push({ a: S.com, b: foot, width: 0.06, color: C.yellow, alpha: kk, period: 0.12, duty: 0.65 });
      st.labels.push({ p: lerp3(S.com, foot, 0.5), text: '力臂', color: C.yellow, a: kk, dx: act === 'L' ? -40 : 40, dy: 120 });
      const Xax = w.dir(S.M, [1, 0, 0]), sgn = act === 'L' ? 1 : -1;
      st.arcs.push({ c: S.com, axis: scale3(Xax, sgn), ref: [0, 0, 1], r: 1.6, a0: 0.3, a1: 0.3 + 2.0 * g, width: 0.08, color: C.yellow, alpha: kk * g, glow: 2.0 });
      st.labels.push({ p: add3(S.com, [0, 0, 1.85]), text: act === 'L' ? '力矩' : '反向力矩', color: C.yellow, a: kk * g, dx: 0, dy: -60 });
    };
    draw(A, 'A', ramp(t, T.lab + 0.05, T.lab + 0.35));
    draw(B, 'B', ramp(t, T.fireB - 0.25, T.fireB + 0.05));
    st.labels.push({ p: add3(A.com, [0, 0, -1.4]), text: 'A', color: C.white, a: 0.9 * ramp(t, T.lab, T.lab + 0.3), dx: 0, dy: 0, big: true });
    st.labels.push({ p: add3(B.com, [0, 0, -1.4]), text: 'B', color: C.white, a: 0.9 * ramp(t, T.fireB - 0.3, T.fireB), dx: 0, dy: 0, big: true });
    return st;
  }

  replay(t) {
    const s = this.sReplay(t), st = this.base('lot', t), w = this.world, N = this.model.carMeta.nozzles;
    const P = this.lotCommon(st, s, 0.75);
    const u = lin(t, T.replay, T.lines), a = mix(-0.35, 0.25, easeInOut(u, 1.5));
    // from BEHIND the car (it flies toward −x): its left on screen-left; jets colour-coded by side
    st.cam.pos = add3(P.com, [9.4 * Math.cos(a), 9.4 * Math.sin(a), -0.6]);
    st.cam.target = P.com; st.cam.fov = 42; st.exposure = 0.92;
    if (P.M) {
      st.jets.colors = { FL: C.L, RL: C.L, SL: C.L, FR: C.R, RR: C.R, SR: C.R, NOSE: '#ffffff' };
      const k = ramp(t, T.replay + 0.1, T.replay + 0.4), Xax = w.dir(P.M, [1, 0, 0]);
      st.spheres.push({ p: P.com, r: 0.12, color: C.yellow, alpha: k, glow: 2.2 });
      st.dashes.push({ a: add3(P.com, scale3(Xax, -3.4)), b: add3(P.com, scale3(Xax, 3.4)), width: 0.04, color: C.yellow, alpha: 0.7 * k, period: 0.25 });
      st.arcs.push({ c: P.com, axis: scale3(Xax, -1), ref: [0, 0, 1], r: 1.8, a0: 0.2, a1: 0.2 + 2.6 * k, width: 0.09, color: C.yellow, alpha: k, glow: 2.0 });
      for (const [n, col] of [['FL', C.L], ['RL', C.L], ['SL', C.L], ['FR', C.R], ['RR', C.R], ['SR', C.R]]) st.spheres.push({ p: w.apply(P.M, N[n].pos), r: 0.08, color: col, alpha: k, glow: 2.4 });
      st.labels.push({ p: w.apply(P.M, [-0.2, 0.75, 0.15]), text: '左侧', color: C.L, a: k, dx: -150, dy: -40 });
      st.labels.push({ p: w.apply(P.M, [-0.2, -0.75, 0.15]), text: '右侧', color: C.R, a: k, dx: 150, dy: 40 });
      st.labels.push({ p: P.com, text: '重心', color: C.yellow, a: k, dx: 120, dy: 130 });
    }
    return st;
  }
  lines(t) {
    const s = this.sLines(t), st = this.base('lot', t);
    const P = this.lotCommon(st, s, 0.65);
    const u = easeInOut(lin(t, T.lines, T.sum1), 1.4);
    st.cam.pos = [mix(-2.2, -3.6, u), mix(9.5, 11.0, u), mix(2.0, 2.4, u)]; st.cam.target = lerp3(P.com, [mix(-9.0, -11.0, u), 27, mix(6.4, 6.0, u)], 0.55); st.cam.fov = 46;
    const pulse = 0.5 + 0.5 * Math.cos(((t - T.lines) / BEAT) * Math.PI * 2);
    st.lineGlow = 0.6 + 2.6 * ramp(t, T.lines, T.lines + 0.25) * (0.75 + 0.25 * pulse);
    const L = this.model.kick.overhead_lines[0].points;
    const near = L.reduce((b, q) => (Math.abs(q[1] - 26) < Math.abs(b[1] - 26) ? q : b), L[0]);
    st.labels.push({ p: near, text: '细线', color: '#9fe2ff', a: ramp(t, T.lines + 0.15, T.lines + 0.4), dx: 120, dy: -110 });
    void P;
    return st;
  }

  // ------------------------------------------------------------------------------------------- summary
  sum1(t) {
    const ev = 8.8 + 0.08 * (t - T.sum1), P = this.rampPose(ev), st = this.base('ramp', t);
    const u = lin(t, T.sum1, T.sum2);
    st.cam.pos = add3(P.com, [mix(-2.0, -1.2, u), mix(-8.4, -7.6, u), mix(-4.2, -3.8, u)]); st.cam.target = add3(P.com, [0, 0, -0.6]); st.cam.fov = 46;
    st.air = { alpha: 0.3, time: t * 0.7, centre: P.com, color: 0xffc89a };
    st.arrows.push(this.pushArrow(P.M, ramp(t, T.sum1, T.sum1 + 0.2)));
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.55, rim: 1.1, curl: 0.5 }), exposure: 0.92, bloom: 0.62, dim: 0.2 });
    return st;
  }
  sum2(t) {
    const ev = 11.25 + 0.5 * (t - T.sum2), P = this.rampPose(ev), st = this.base('ramp', t), w = this.world;
    st.cam.pos = add3(P.com, [-3.2, -8.8, -3.4]); st.cam.target = add3(P.com, [0, 0, -0.8]); st.cam.fov = 46;
    st.jets = this.rampJets(ev, 1.15); st.puffs = w.poses.cloud(ev);
    const up = w.dir(P.M, [0, 0, 1]); st.arrows.push({ a: add3(P.com, [0, 0, -0.3]), b: add3(P.com, scale3(up, 2.4)), width: 0.3, color: C.mint, k: ramp(t, T.sum2, T.sum2 + 0.2), glow: 1.6 });
    Object.assign(st, { carM: P.M, wheelAng: P.wa, rig: RAMP_RIG({ key: 0.6, rim: 1.1, curl: 0.3, extra: { pos: [-4.0, -17.0, 0.6], aim: [-15.5, 0, 2.5], cd: 1500, angle: 24 } }), exposure: 0.92, bloom: 0.62, dim: 0.2 });
    return st;
  }
  sum3(t) {
    const s = 8.0 + 0.9 * (t - T.sum3), st = this.base('lot', t), w = this.world;
    const P = this.lotCommon(st, s, 0.9);
    st.cam.pos = add3(P.com, [-7.0, -3.2, -0.6]); st.cam.target = P.com; st.cam.fov = 42;
    if (P.M) { const Xax = w.dir(P.M, [1, 0, 0]), k = ramp(t, T.sum3, T.sum3 + 0.2); st.spheres.push({ p: P.com, r: 0.12, color: C.yellow, alpha: k }); st.arcs.push({ c: P.com, axis: scale3(Xax, -1), ref: [0, 0, 1], r: 1.7, a0: 0.2, a1: 2.8, width: 0.09, color: C.yellow, alpha: k }); }
    st.dim = 0.2;
    return st;
  }
  // the lot car comes down and touches down exactly on the song's first hit (the ending's downbeat); the summary stays up
  outro(t) {
    const st = this.base('lot', t), w = this.world, TD = 11.72;
    const s = pchip([[T.outro, 10.55], [T.land, TD]])(t), after = Math.max(0, t - T.land);
    const P = this.lotCommon(st, Math.min(s, TD), 0.8);
    st.puffs = w.flight.cloud(TD + after * 0.8 + Math.min(0, s - TD));
    if (after > 0 && P.M) {   // landed: the pose of the touchdown, sliding to a stop along its heading (the fit continues below ground)
      const fwd = w.dir(P.M, [1, 0, 0]), d = 1.7 * (1 - Math.exp(-after * 2.4));
      P.M.elements[12] += fwd[0] * d; P.M.elements[13] += fwd[1] * d; P.com = w.com(P.M); st.carM = P.M; st.jets = null;
    }
    const u = easeInOut(lin(t, T.outro, T.title), 1.5);
    st.cam.pos = add3(P.com, [mix(-3.6, -6.2, u), mix(-11.0, -15.5, u), mix(-0.6, 1.6, u)]); st.cam.target = add3(P.com, [0, 0, mix(0.2, 0.6, u)]); st.cam.fov = 44;
    this.shock(st, t, T.land, [P.com[0], P.com[1], 0.03], [0, 0, 1], '#dff6ff', 9.0, 0.9, 1.3);
    st.zoomBlur = t >= T.land ? 0.7 * Math.exp(-after * 7) : 0; st.shake = 0.06 + (t >= T.land ? 0.12 * Math.exp(-after * 5) : 0);
    st.rig[2] = null;   // the back spot faced the lens from this side: its glint on the roof glass bloomed into a white ball
    st.dim = 0.15;
    return st;
  }
  // the last image: both flights at once (two renders, each cropped to its central band), the title across the seam
  finale(t) {
    const u = lin(t, T.title, END), w = this.world;
    const ev = 8.62 + 0.06 * (t - T.title), R = this.rampPose(ev), top = this.base('ramp', t);
    top.cam.pos = add3(R.com, [mix(-1.2, -0.6, u), mix(-11.5, -12.5, u), -3.6]); top.cam.target = add3(R.com, [0, 0, -0.4]); top.cam.fov = 40;
    top.arrows.push(this.pushArrow(R.M, ramp(t, T.title, T.title + 0.3), 0, 1.9));   // short: it ends above the title
    Object.assign(top, { carM: R.M, wheelAng: R.wa, rig: RAMP_RIG({ key: 0.55, rim: 1.1, curl: 0.5 }), exposure: 0.92, bloom: 0.6 });
    const sK = 8.12 + 0.12 * (t - T.title), bot = this.base('lot', t), K = this.lotCommon(bot, sK, 0.75), a = mix(0.05, 0.3, u);
    bot.cam.pos = add3(K.com, [9.2 * Math.cos(a), 9.2 * Math.sin(a), -0.5]); bot.cam.target = K.com; bot.cam.fov = 40;
    if (bot.jets) bot.jets.colors = { FL: C.L, RL: C.L, SL: C.L, FR: C.R, RR: C.R, SR: C.R, NOSE: '#ffffff' };
    if (K.M) { const Xax = w.dir(K.M, [1, 0, 0]); bot.spheres.push({ p: K.com, r: 0.12, color: C.yellow, alpha: 1 }); bot.arcs.push({ c: K.com, axis: scale3(Xax, -1), ref: [0, 0, 1], r: 1.7, a0: 0.2, a1: 2.8, width: 0.09, color: C.yellow, alpha: 0.9 }); }
    return { split: [top, bot], cam: { pos: [0, -1, 0], target: [0, 0, 0], fov: 40 }, labels: [], t };
  }

  // ------------------------------------------------------------------------------------------- 2D layers
  layoutLine(ctx, line) {
    const R = ROLE[line.role]; ctx.font = FONT(R.w, R.px);
    const chars = [...line.text]; let x = 0; const xs = [];
    for (const ch of chars) { xs.push(x); x += ctx.measureText(ch).width + R.track; }
    const width = x - R.track, fit = Math.min(1, 980 / width);
    return { chars, xs, width, fit, R };
  }
  colorOf(line, i) {
    for (const s of line.spans || []) { const k = line.text.indexOf(s.k); if (k >= 0 && i >= k && i < k + [...s.k].length) return COL(s.c); }
    return line.role === 'note' ? C.dim : C.white;
  }
  drawCards(ctx, t) {
    for (const card of CARDS) {
      if (t < card.lines[0].at - 0.01 || t > card.out + 1.2) continue;
      const lays = card.lines.map((l) => this.layoutLine(ctx, l));
      const heights = lays.map((L) => L.R.px * L.fit * 1.3);
      const total = heights.reduce((a, b) => a + b, 0);
      const vis = Math.min(1, lin(t, card.lines[0].at - 0.1, card.lines[0].at + 0.25)) * (card.exit === 'cut' ? (t < frameOf(card.out) / FPS - 1e-6 ? 1 : 0) : 1 - lin(t, card.out, card.out + 0.3));
      if (vis > 0) {   // scrim behind the block
        const y0 = card.y - total / 2 - 130, y1 = card.y + total / 2 + 130;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, `rgba(0,0,0,${0.46 * vis})`); g.addColorStop(0.7, `rgba(0,0,0,${0.46 * vis})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
      }
      let y = card.y - total / 2;
      card.lines.forEach((line, li) => {
        const L = lays[li], h = heights[li]; y += h;
        const base = y - h * 0.24, px = L.R.px * L.fit;
        ctx.font = FONT(L.R.w, px); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const x0 = W / 2 - L.width * L.fit / 2;
        L.chars.forEach((ch, i) => {
          const ta = line.at + 0.022 * i, k = lin(t, ta, ta + 0.3);
          if (k <= 0) return;
          let dy = (1 - backOut(k, 1.2)) * px * 0.42, a = Math.min(1, k * 1.6), rot = 0, dx = 0;
          if (card.exit === 'fall') {
            const tf = t - (card.out + 0.03 * i);
            if (tf > 0) { dy += 1300 * tf * tf + 80 * tf; rot = (hash(i, 3) - 0.5) * 2.4 * tf; dx = (hash(i, 4) - 0.5) * 140 * tf; a *= 1 - lin(tf, 0.35, 0.75); }
          } else if (card.exit === 'cut') { if (t >= frameOf(card.out) / FPS - 1e-6) a = 0; }   // gone on the cut's own frame
          else a *= 1 - lin(t, card.out + 0.012 * i, card.out + 0.2 + 0.012 * i);
          if (a <= 0.003) return;
          const X = x0 + L.xs[i] * L.fit + dx, Y = base + dy;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(X, Y); if (rot) ctx.rotate(rot);
          ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, px * 0.07); ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.strokeText(ch, 0, 0); ctx.fillStyle = this.colorOf(line, i); ctx.fillText(ch, 0, 0);
          ctx.restore();
        });
      });
    }
  }
  drawTag(ctx, t) {
    const g = TAGS.find((x) => t >= x.from && t < x.to); if (!g) return;
    const a = g.from === 0 ? 1 : Math.min(lin(t, g.from, g.from + 0.2), 1 - lin(t, g.to - 0.15, g.to));
    ctx.save(); ctx.globalAlpha = 0.85 * a;
    ctx.fillStyle = 'rgba(230,236,245,0.9)'; ctx.fillRect(56, 150, 26, 3);
    ctx.font = FONT(500, 30); ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6ecf5';
    const text = g.text, fit = Math.min(1, 930 / ctx.measureText(text).width);
    ctx.translate(96, 152); ctx.scale(fit, 1);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.strokeText(text, 0, 0); ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  // a label at a projected 3D point: a dot at the anchor, a leader, and a pill with the word
  drawLabels(ctx, st) {
    for (const L of st.labels || []) {
      if (!(L.a > 0.01)) continue;
      const [x, y, ok] = this.world.project(L.p); if (!ok) continue;
      const px = L.big ? 64 : 44;
      ctx.save(); ctx.globalAlpha = L.a; ctx.font = FONT(900, px); ctx.textBaseline = 'middle';
      const tw = ctx.measureText(L.text).width, lx = clamp(x + (L.dx ?? 0), 40 + tw / 2 + 18, W - 40 - tw / 2 - 18), ly = clamp(y + (L.dy ?? 0), 230, H - 260);
      if (!L.big) {
        ctx.strokeStyle = L.color; ctx.lineWidth = 3; ctx.globalAlpha = L.a * 0.9;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = L.color; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = L.a;
        ctx.fillStyle = 'rgba(6,9,14,0.78)'; const pw = tw + 36, ph = px + 22;
        ctx.beginPath(); ctx.roundRect(lx - pw / 2, ly - ph / 2, pw, ph, ph / 2); ctx.fill();
        ctx.strokeStyle = L.color; ctx.lineWidth = 2.5; ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(L.text, lx, ly + 2);
      ctx.fillStyle = L.color; ctx.fillText(L.text, lx, ly + 2);
      ctx.restore();
    }
  }
  drawGas(ctx, g) {   // the stored-gas gauge (schematic level, no data)
    if (!g || g.a <= 0.01) return;
    const x = 900, y = 520, w = 70, h = 380;
    ctx.save(); ctx.globalAlpha = g.a;
    ctx.fillStyle = 'rgba(6,9,14,0.7)'; ctx.beginPath(); ctx.roundRect(x - 22, y - 70, w + 44, h + 120, 24); ctx.fill();
    ctx.strokeStyle = C.mint; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.stroke();
    const lh = (h - 12) * g.level; ctx.fillStyle = C.mint; ctx.globalAlpha = g.a * 0.85;
    ctx.beginPath(); ctx.roundRect(x + 6, y + h - 6 - lh, w - 12, lh, 9); ctx.fill();
    ctx.globalAlpha = g.a; ctx.font = FONT(900, 40); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.mint;
    ctx.fillText('储气', x + w / 2, y - 36);
    ctx.restore();
  }
  drawRewind(ctx, t) {
    const a = win(t, T.rew, T.rew + 0.08, T.cut - 0.1, T.cut);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = 0.16 * a; ctx.fillStyle = '#9fd8ff';
    for (let y = (t * 900) % 12; y < H; y += 12) ctx.fillRect(0, y, W, 2);
    ctx.globalAlpha = a; ctx.font = FONT(900, 92); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText('倒带').width, x0 = W / 2 - (150 + tw) / 2, y = 520;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6;
    for (const dx of [0, 62]) { ctx.beginPath(); ctx.moveTo(x0 + dx, y); ctx.lineTo(x0 + dx + 58, y - 40); ctx.lineTo(x0 + dx + 58, y + 40); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.lineWidth = 8; ctx.strokeText('倒带', x0 + 150, y); ctx.fillText('倒带', x0 + 150, y);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------- frame
  async render(f) {
    const t = Math.min(f / FPS, END - 1e-6), ctx = this.ctx, shot = shotOfFrame(f);
    const since = (f - shot.f0) / FPS, punch = shot.f0 > 0 ? Math.exp(-since * 10) : 0;   // a short kick on every cut
    const make = (tt) => {
      const st = this[shot.fn](tt), ac = accent(tt);
      st.cam.fov *= (1 - 0.06 * punch) * (1 - 0.03 * ac);
      const sh = (st.shake ?? 0) * (ac + 0.6 * punch);   // deterministic shake on accents and cuts
      if (sh > 0) { const n = (k) => Math.sin(tt * (37.1 + 11 * k) + k * 1.7) * 0.6 + Math.sin(tt * (71.3 + 7 * k) + k) * 0.4; st.cam.target = add3(st.cam.target, [sh * n(1), sh * n(2), sh * n(3)]); }
      return st;
    };
    const st = make(t);
    if (st.split) {   // two worlds, each cropped to the central half of its own frame
      st.split.forEach((sub, i) => { sub.cam.fov *= 1 - 0.04 * punch; this.world.set(sub); ctx.drawImage(this.world.render(), 0, H / 4, W, H / 2, 0, i * H / 2, W, H / 2); });
      const k = lin(t, T.title, T.title + 0.25), g = ctx.createLinearGradient(0, H / 2 - 60, 0, H / 2 + 60);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.55 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, H / 2 - 60, W, 120);
      ctx.fillStyle = `rgba(150,220,255,${0.9 * k})`; ctx.fillRect(W * (0.5 - 0.5 * k), H / 2 - 2, W * k, 4);
      ctx.save(); ctx.font = FONT(900, 46); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      // ① sits under the (short) push arrow, above the title — not on the car; ② under its car
      for (const [txt, y, col] of [['演示① 坡道倒挂', 760, C.orange], ['演示② 停车场翻转', H - 300, C.yellow]]) {
        ctx.globalAlpha = lin(t, T.title + 0.1, T.title + 0.35); ctx.strokeText(txt, W / 2, y); ctx.fillStyle = col; ctx.fillText(txt, W / 2, y);
      }
      ctx.restore();
    } else if (st.blur && st.blur.n > 1) {   // motion blur: average n sub-frames around t (rewind, whip pans)
      for (let k = 0; k < st.blur.n; k++) {
        const tt = t + (k / (st.blur.n - 1) - 0.5) * st.blur.dt * 2, s2 = make(tt);
        this.world.set(s2); ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(this.world.render(), 0, 0);
      }
      ctx.globalAlpha = 1; this.world.set(st);
    } else { this.world.set(st); ctx.drawImage(this.world.render(), 0, 0); }
    if ((st.zoomBlur ?? 0) > 0.02) {   // radial zoom streaks on big hits: the frame drawn over itself, scaled up, faint
      const k = Math.min(1, st.zoomBlur), tmp = this.tmp || (this.tmp = Object.assign(document.createElement('canvas'), { width: W, height: H }));
      tmp.getContext('2d').drawImage(this.out, 0, 0);
      for (const [sc, al] of [[1 + 0.035 * k, 0.32 * k], [1 + 0.08 * k, 0.2 * k], [1 + 0.14 * k, 0.1 * k]]) {
        // normal blending (streaks, never brighter); scaled about the frame's optical centre
        ctx.save(); ctx.globalAlpha = al; ctx.translate(W / 2, H * 0.45); ctx.scale(sc, sc); ctx.translate(-W / 2, -H * 0.45);
        ctx.drawImage(tmp, 0, 0); ctx.restore();
      }
    }
    if (st.dim) { ctx.fillStyle = `rgba(0,0,0,${st.dim})`; ctx.fillRect(0, 0, W, H); }
    this.drawLabels(ctx, st);
    this.drawGas(ctx, st.hudGas);
    // a quick light sweep on every cut (no white frame)
    if (shot.f0 > 0 && since < 0.15) {
      const u = since / 0.15, y = mix(-200, H + 200, easeOut(u, 2)), g = ctx.createLinearGradient(0, y - 160, 0, y + 160);
      g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, `rgba(160,210,255,${0.16 * (1 - u)})`); g.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, y - 160, W, 320);
    }
    this.drawRewind(ctx, t);
    this.drawTag(ctx, t);
    this.drawCards(ctx, t);
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const fade = lin(t, FADE_V0, FADE_V1);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
    return true;
  }
}
