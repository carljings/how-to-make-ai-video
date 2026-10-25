// a_open.js — 0 cold open (the boat that never finishes) · 1 how this AI learns · 2 case card 01 · 3 hook 1 + the boat
// race · 4 the name. CoastRunners case: OpenAI 2016 (docs/SCIENCE.md #1); the map, boats and numbers are an
// illustrative redraw, not game footage.
import { W, H, TAU, C, rgba, mix, clamp, lerp, E, F, font, hash, vnoise, frameIdx, keys, pulse, DB, BT, lw, sm, prog } from '../lib/core.js';
import { mk, glow, spark, trail, grid, hatch, roundRect, arrow, check, cross, paper, stamp, scoreBox, steppedValue, odometer, fmtInt } from '../lib/draw.js';
import { catmull, Path, applyCam, camToScreen } from '../lib/geo.js';
import { caseCard, hook, typedCount } from '../lib/motifs.js';
import { typed } from '../lib/text.js';

// ------------------------------------------------------------------ the race map (world units; pre-rendered at MS×)
const COURSE = new Path(catmull([[520, 2480], [430, 2200], [470, 1900], [640, 1680], [610, 1440], [430, 1180], [430, 900], [600, 680], [560, 420], [500, 160]], 30));
const CHW = 210;
const LAG = { x: 905, y: 1490, r: 172 };          // the lagoon (side bay)
const RING = 112;                                  // the boat's circle radius inside the lagoon
const NECK = { x: 728, y: 1490, rx: 70, ry: 92 };  // the mouth joining channel and lagoon
const MS = 1.4, MW = 1320, MH = 2620;
let MAP = null;
function waterPath(c) {
  const L = COURSE.offset(CHW / 2), R = COURSE.offset(-CHW / 2);
  c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (const p of L) c.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]); c.closePath();
  c.moveTo(LAG.x + LAG.r, LAG.y); c.arc(LAG.x, LAG.y, LAG.r, 0, TAU);
  c.moveTo(NECK.x + NECK.rx, NECK.y); c.ellipse(NECK.x, NECK.y, NECK.rx, NECK.ry, 0, 0, TAU);
}
function buildMap() {
  const cv = mk(MW * MS, MH * MS), c = cv.getContext('2d');
  c.scale(MS, MS);
  c.fillStyle = rgba(C.ink2); c.fillRect(0, 0, MW, MH);
  // land: engraved diagonal hatch, denser near the shore (shallow bands)
  hatch(c, 0, 0, MW, MH, -0.62, 13, C.graphite, 0.2, 1);
  for (const [lwid, a] of [[150, 0.05], [100, 0.06], [62, 0.07]]) { c.lineJoin = 'round'; c.strokeStyle = rgba(C.bone, a); c.lineWidth = lwid; waterPath(c); c.stroke(); }
  // banks: stroke wide in bone, then fill the union so only the outer half shows
  c.strokeStyle = rgba(C.bone, 0.85); c.lineWidth = 7; waterPath(c); c.stroke();
  c.fillStyle = 'rgb(8,8,10)'; waterPath(c); c.fill('nonzero');
  // water: engraved horizontal ripples
  c.save(); waterPath(c); c.clip('nonzero');
  c.strokeStyle = rgba(C.bone, 0.085); c.lineWidth = 1.2;
  for (let y = 0; y < MH; y += 9) {
    c.beginPath();
    for (let x = 0; x <= MW; x += 40) { const yy = y + 2.2 * Math.sin(x * 0.021 + y * 0.37) + 1.4 * vnoise(x * 0.01 + y, 3); x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy); }
    c.stroke();
  }
  // lane chevrons (race direction: up)
  c.strokeStyle = rgba(C.bone, 0.16); c.lineWidth = 3;
  for (let d = 180; d < COURSE.len - 120; d += 230) {
    const [x, y, a] = COURSE.at(d); c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(-14, -22); c.lineTo(10, 0); c.lineTo(-14, 22); c.stroke(); c.restore();
  }
  c.restore();
  // buoys along both banks
  for (const side of [1, -1]) {
    const off = COURSE.offset(side * (CHW / 2 - 16)), P = new Path(off);
    for (let d = 40; d < P.len - 20; d += 86) {
      const [x, y] = P.at(d);
      if (side < 0 && Math.abs(y - NECK.y) < NECK.ry + 14 && x > 560) continue;   // gap at the lagoon mouth
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.arc(x + 2, y + 3, 6, 0, TAU); c.fill();
      c.fillStyle = rgba(C.bone, 0.85); c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    }
  }
  // start & finish: checkered strips across the channel
  for (const [d, label] of [[18, '起点 START'], [COURSE.len - 30, '终点 FINISH']]) {
    const [x, y, a] = COURSE.at(d);
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
    const n = 14, cw = CHW / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { c.fillStyle = rgba((i + j) % 2 ? C.bone : C.inkline, 0.95); c.fillRect(-CHW / 2 + i * cw, -cw + j * cw, cw, cw); }
    c.restore();
    c.font = font(600, 26, F.mono); c.fillStyle = rgba(C.bone, 0.75); c.letterSpacing = '3px';
    c.fillText(label, x + CHW / 2 + 22, y + 9); c.letterSpacing = '0px';
  }
  c.font = font(400, 26, F.sans); c.fillStyle = rgba(C.ash, 0.9);
  c.fillText('水湾', LAG.x + 40, LAG.y + LAG.r + 44);
  MAP = cv; return cv;
}
function drawMap(c, cam, clipRect) {
  if (!MAP) buildMap();
  c.save();
  if (clipRect) { c.beginPath(); c.rect(...clipRect); c.clip(); }
  const sx = clipRect ? clipRect[0] + clipRect[2] / 2 : 540, sy = clipRect ? clipRect[1] + clipRect[3] / 2 : 960;
  applyCam(c, cam, sx, sy);
  c.drawImage(MAP, 0, 0, MW * MS, MH * MS, 0, 0, MW, MH);
  return { sx, sy };   // caller draws dynamic things in the same transform, then restores
}

// ------------------------------------------------------------------ boats
function hull(c, x, y, ang, s, fill, stroke, a = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.beginPath(); c.moveTo(30, 0); c.quadraticCurveTo(14, -14, -22, -12); c.lineTo(-28, -8); c.lineTo(-28, 8); c.lineTo(-22, 12); c.quadraticCurveTo(14, 14, 30, 0); c.closePath();
  if (fill) { c.fillStyle = rgba(fill, a); c.fill(); }
  if (stroke) { c.strokeStyle = rgba(stroke, a); c.lineWidth = 2.6 / s; c.stroke(); }
  c.fillStyle = rgba(stroke || C.bone, 0.8 * a); c.fillRect(-12, -5, 14, 10);
  c.restore();
}
function wake(c, x, y, ang, s, a, col = C.bone) {
  c.save(); c.translate(x, y); c.rotate(ang);
  for (let i = 1; i <= 5; i++) {
    const d = -28 - i * 22 * s, spread = 10 + i * 9;
    c.strokeStyle = rgba(col, a * (1 - i / 6) * 0.7); c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(d + 10, -spread * 0.55); c.lineTo(d, -spread); c.moveTo(d + 10, spread * 0.55); c.lineTo(d, spread); c.stroke();
  }
  c.restore();
}
// ghost boats (bone outlines) — progress along the course in each shot
const GHOSTS = [0, 1, 2, 3, 4].map((i) => ({ lane: (i - 2) * 30, fin: 32.95 + i * 0.66, seed: i }));
function ghostDist(g, t, mode) {
  if (mode === 'cold') return clamp(980 + (t + g.seed * 1.7) * 120 + g.seed * 210, 0, COURSE.len);
  const t0 = lw(7, 0), u = clamp((t - t0) / (g.fin - t0));
  return COURSE.len * (0.62 * E.out2(u) + 0.38 * u);
}
function ghostPos(g, t, mode) {
  const d = ghostDist(g, t, mode), [x, y, a] = COURSE.at(d);
  return [x - Math.sin(a) * g.lane, y + Math.cos(a) * g.lane, a, d];
}
// the orange boat. cold open: circling (one target every 2 beats). race: start line → swerve at FOOM → circling.
const T_RACE = 24.10, T_SWERVE = 25.12, T_RING = BT(56);       // 25.469 — joins the ring on a beat
const TH0 = -Math.PI / 2;                                       // ring phase so targets sit at -90°, 30°, 150°
const ringAngle = (t, tRef) => TH0 + (TAU / 3) * (t - tRef) / (2 * 0.45452);
const ringPos = (th) => [LAG.x + RING * Math.cos(th), LAG.y + RING * Math.sin(th), th + Math.PI / 2];
const D_JUNCTION = (() => { let best = 0, bd = 1e9; for (let d = 0; d < COURSE.len; d += 5) { const [x, y] = COURSE.at(d); const e = Math.abs(y - NECK.y) + (x < 500 ? 999 : 0); if (e < bd && d < 1400) { bd = e; best = d; } } return best; })();
function boatRace(t) {
  if (t < T_SWERVE) {
    const u = clamp((t - (T_RACE - 0.2)) / (T_SWERVE - T_RACE + 0.2));
    const d = (D_JUNCTION - 140) * E.in2(u) * 0.35 + (D_JUNCTION - 140) * u * 0.65;
    const [x, y, a] = COURSE.at(d); return [x + 26 * Math.sin(a), y - 26 * Math.cos(a), a];
  }
  if (t < T_RING) {
    const [x0, y0, a0] = boatRace(T_SWERVE - 1e-4);
    const thE = ringAngle(T_RING, T_RING) + Math.PI;          // enter at the ring's far-left point… on the beat
    const [x3, y3] = ringPos(TH0 + Math.PI);
    const u = (t - T_SWERVE) / (T_RING - T_SWERVE);
    const p1 = [x0 + Math.cos(a0) * 120, y0 + Math.sin(a0) * 120], p2 = [x3 - 80, y3 - 130];
    const b = (k) => [(1 - k) ** 3 * x0 + 3 * (1 - k) ** 2 * k * p1[0] + 3 * (1 - k) * k * k * p2[0] + k ** 3 * x3, (1 - k) ** 3 * y0 + 3 * (1 - k) ** 2 * k * p1[1] + 3 * (1 - k) * k * k * p2[1] + k ** 3 * y3];
    const [x, y] = b(u), [xn, yn] = b(Math.min(1, u + 0.02));
    return [x, y, Math.atan2(yn - y, xn - x)];
  }
  return ringPos(ringAngle(t, T_RING) + Math.PI);
}
const boatCold = (t) => ringPos(ringAngle(t, 0.016) + 0.0);
// hits: every 2 beats on the ring; target k = which of the three
function hitsIn(t, tRef, phase0, a, b) { const out = []; for (let k = 0; k < 400; k++) { const th = tRef + k * 0.90904; if (th > b) break; if (th >= a) out.push({ t: th, k: (k + phase0) % 3 }); } return out; }
function targetAngle(k, phaseOff) { return TH0 + phaseOff + (TAU / 3) * k; }
function drawTargets(c, t, tRef, phaseOff, ringStart, hitsFrom) {
  for (let k = 0; k < 3; k++) {
    const th = targetAngle(k, phaseOff), x = LAG.x + RING * Math.cos(th), y = LAG.y + RING * Math.sin(th);
    // last hit of this target before t
    let last = -99; for (let n = 0; n < 400; n++) { const ht = tRef + n * 0.90904; if (ht > t) break; if (ht >= hitsFrom && n % 3 === k) last = ht; }
    const since = t - last, respawn = 0.62;
    if (since < 0.5) { // burst
      const u = since / 0.5;
      c.strokeStyle = rgba(C.ember, (1 - u) * 0.9); c.lineWidth = 4 * (1 - u) + 1; c.beginPath(); c.arc(x, y, 18 + 70 * E.out3(u), 0, TAU); c.stroke();
      c.globalCompositeOperation = 'lighter'; glow(c, x, y, 60 * (1 - u) + 10, C.signal, 0.8 * (1 - u)); c.globalCompositeOperation = 'source-over';
      c.font = font(600, 40, F.mono); c.fillStyle = rgba(C.hot, 1 - u); c.fillText('+100', x + 26, y - 26 - 60 * u);
    }
    const vis = since >= respawn || last < ringStart ? (last < ringStart ? 1 : E.outBack(clamp((since - respawn) / 0.16))) : 0;
    if (vis > 0) {
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.scale(vis, vis);
      c.fillStyle = rgba(C.signal, 0.95); c.fillRect(-15, -15, 30, 30); c.strokeStyle = rgba(C.hot, 0.9); c.lineWidth = 2.5; c.strokeRect(-15, -15, 30, 30);
      c.restore();
      c.strokeStyle = rgba(C.inkline, 0.95); c.lineWidth = 4; c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.moveTo(x, y - 8); c.lineTo(x, y + 8); c.stroke();
      c.globalCompositeOperation = 'lighter'; glow(c, x, y, 34, C.signal, 0.35 * vis, 'soft'); c.globalCompositeOperation = 'source-over';
    }
  }
}
function fire(c, posFn, t, tFrom, intensity = 1) {
  // flames + smoke trailing the boat (deterministic per-frame particles)
  const fi = frameIdx(t);
  for (let age = 0; age < 26; age++) {
    const tb = t - age / 30; if (tb < tFrom) break;
    const [bx, by, ba] = posFn(tb);
    for (let k = 0; k < 3; k++) {
      const id = (fi - age) * 7 + k, r1 = hash(id, 41), r2 = hash(id, 42);
      const tt = age / 30, back = -18 - 8 * r1;
      const px = bx + Math.cos(ba) * back + (r2 - 0.5) * 16 + tt * 30 * (r1 - 0.5);
      const py = by + Math.sin(ba) * back - tt * 70 - 6 * k;
      const smoke = clamp(tt / 0.45);
      if (smoke < 1) { c.globalCompositeOperation = 'lighter'; glow(c, px, py, (10 + 16 * tt) * intensity, mix(C.hot, C.signal, clamp(tt * 4)), (1 - smoke) * 0.75 * intensity); c.globalCompositeOperation = 'source-over'; }
      if (tt > 0.18) { c.fillStyle = rgba(C.graphite, 0.18 * (1 - clamp((tt - 0.18) / 0.7)) * intensity); c.beginPath(); c.arc(px + tt * 20, py - tt * 20, 8 + 30 * tt, 0, TAU); c.fill(); }
    }
  }
}
function orangeBoat(c, posFn, t, o = {}) {
  const [x, y, a] = posFn(t), S = o.scale ?? 1.6;
  if (o.ring) { // long exposure: the circle it has been carving for ages
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(C.signal, 0.10 * o.ring); c.lineWidth = 26; c.beginPath(); c.arc(LAG.x, LAG.y, RING, 0, TAU); c.stroke();
    c.strokeStyle = rgba(C.ember, 0.22 * o.ring); c.lineWidth = 4; c.beginPath(); c.arc(LAG.x, LAG.y, RING, 0, TAU); c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
  trail(c, (tt) => posFn(tt), t, o.trailLen ?? 0.7, { col: C.signal, w: 7, alpha: 0.75, tmin: o.tmin ?? -1e9, n: 30 });
  wake(c, x, y, a, S * 0.8, 0.9, C.bone);
  if (o.fire) fire(c, posFn, t, o.fireFrom ?? -1e9, o.fire * 1.4);
  c.globalCompositeOperation = 'lighter'; glow(c, x, y, 90 * S / 1.6, C.signal, 0.36, 'soft'); c.globalCompositeOperation = 'source-over';
  hull(c, x, y, a, S, C.signal, C.hot);
}

// ------------------------------------------------------------------ 0 · cold open
// also the film's last shot: d_end.js draws coldOpenFrame(c, t − T_END) so the final frame runs straight into frame 0.
// The ring has been going for ages, so hits (and the score) exist before t = 0 too (30 hits back keeps the target order).
const HIT0 = 0.016 - 30 * 0.90904;
function coldOpen(c, t, o = {}) {
  const cam = { x: 800 + 16 * Math.sin(t * 0.5), y: 1478 - 14 * t, s: 1.62 + 0.035 * t, r: lerp(-0.07, -0.01, t / 3.65) };
  drawMap(c, cam);
  for (const g of GHOSTS) { const [x, y, a] = ghostPos(g, t, 'cold'); wake(c, x, y, a, 1.1, 0.6); hull(c, x, y, a, 1.25, C.ink, C.bone, 0.9); }
  // the race goes on without it: an arrow up the channel
  const [ax, ay, aa] = COURSE.at(D_JUNCTION + 260);
  c.save(); c.translate(ax - 30, ay); c.rotate(aa); arrow(c, -70, 0, 70, 0, { col: C.bone, lw: 5, head: 26, alpha: 0.55 }); c.restore();
  c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.bone, 0.75); c.fillText('终点 ↑', ax - 120, ay - 90);
  drawTargets(c, t, HIT0, 0, -99, -99);
  orangeBoat(c, boatCold, t, { fire: 1, trailLen: 1.1, ring: 1 });
  c.restore();
  // score: rolls on every hit (every 2 beats)
  const steps = [[-99, 10400]]; for (let k = -8; k < 6; k++) steps.push([0.016 + k * 0.90904, 11300 + k * 100]);
  scoreBox(c, 930, 640, t, steppedValue(t, steps), { size: 84, alpha: o.scoreAlpha ?? 1 });
  // bump the readout on "AGI"
  const ag = lw(0, 4); if (t > ag) { const k = Math.exp(-(t - ag) / 0.12); c.fillStyle = rgba(C.signal, 0.12 * k); c.fillRect(0, 0, W, H); }
}
export const coldOpenFrame = coldOpen;

// ------------------------------------------------------------------ 1 · how this AI learns
const MOVES = [ // options per move: [dx, dy, score]; chosen = max
  [[1, -1, 5], [-1, 0, -1], [0, 1, 0], [1, 1, 2]],
  [[0, -1, 7], [1, 0, 1], [-1, -1, -3], [1, 1, 2]],
  [[1, 0, 3], [1, -1, 9], [-1, 0, -2], [0, 1, 1]],
  [[0, -1, 12], [1, -1, 4], [-1, -1, -1], [1, 0, 6]],
];
const STEP = 215;
function sparkPathTrain(t) {
  let x = 400, y = 1240;
  for (let m = 0; m < 4; m++) {
    const tm = BT(9 + 2 * m), best = MOVES[m].reduce((a, b) => (b[2] > a[2] ? b : a));
    const u = E.io3(clamp((t - tm) / 0.3));
    if (t < tm) break;
    const nx = x + best[0] * STEP, ny = y + best[1] * STEP;
    x = lerp(x, nx, u); y = lerp(y, ny, u);
    if (u < 1) break;
  }
  return [x, y];
}
function sandbox(c, t, lt) {
  // camera eases after the spark so the action stays in the middle band (y ≈ 1000)
  const cx = (tt) => { const [x, y] = sparkPathTrain(tt - 0.12); return [x, y]; };
  const [fx, fy] = cx(t);
  const ox = 520 - fx, oy = 1010 - fy;
  const [sx, sy] = sparkPathTrain(t);
  c.save(); c.translate(ox, oy);
  grid(c, -ox - 60, -oy - 60, -ox + W + 60, -oy + H + 60, 54, C.bone, 0.06, 216, 0.12);
  trail(c, sparkPathTrain, t, 5, { col: C.signal, w: 7, alpha: 0.8, n: 60, tmin: DB(2) });
  for (let m = 0; m < 4; m++) {
    const tShow = BT(8 + 2 * m), tPick = BT(9 + 2 * m);
    const [px, py] = sparkPathTrain(tShow - 0.001);
    const opts = MOVES[m], best = opts.reduce((a, b) => (b[2] > a[2] ? b : a));
    if (t < tShow || t > tPick + 0.6) continue;
    opts.forEach((o, i) => {
      const appear = E.outBack(clamp((t - tShow - i * 0.04) / 0.2));
      const chosen = o === best, picked = t >= tPick;
      const fade = picked && !chosen ? 1 - clamp((t - tPick) / 0.2) : 1;
      const a = appear * fade; if (a <= 0.01) return;
      const len = Math.hypot(o[0], o[1]) > 1.2 ? 0.72 : 0.8;
      const ex = px + o[0] * STEP * len * appear, ey = py + o[1] * STEP * len * appear;
      const col = chosen && picked ? C.signal : o[2] < 0 ? C.graphite : C.bone;
      arrow(c, px, py, ex, ey, { col, lw: chosen && picked ? 9 : 5, head: 30, alpha: a * (chosen && picked ? 1 : 0.8) });
      c.font = font(600, 50, F.mono); c.fillStyle = rgba(col, a); c.textAlign = 'center';
      const lab = (o[2] > 0 ? '+' : '') + o[2];
      c.fillText(lab, ex + o[0] * 52, ey + o[1] * 48 + 18); c.textAlign = 'left';
    });
  }
  spark(c, sx, sy, t, { scale: 1.5 });
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.signal); c.fillText('AI', sx - 60, sy + 62);
  c.restore();
  const steps = [[-1, 0]]; let acc = 0; for (let m = 0; m < 4; m++) { const best = MOVES[m].reduce((a, b) => (b[2] > a[2] ? b : a)); acc += best[2]; steps.push([BT(9 + 2 * m) + 0.3, acc]); }
  scoreBox(c, 930, 640, t, steppedValue(t, steps), { size: 84 });
}
function curve(c, t, lt) {
  const X0 = 150, X1 = 930, Y0 = 1300, Y1 = 640;   // plot box (screen)
  const u = E.outExpo(clamp(lt / 0.5));
  c.strokeStyle = rgba(C.bone, 0.85); c.lineWidth = 3;
  c.beginPath(); c.moveTo(X0, Y1 - 30); c.lineTo(X0, Y0); c.lineTo(X0 + (X1 - X0 + 30) * u, Y0); c.stroke();
  grid(c, X0, Y1, X1, Y0, 65, C.bone, 0.05);
  c.font = font(500, 26, F.sans); c.fillStyle = rgba(C.ash);
  c.fillText('训练次数 →', X1 - 150, Y0 + 50); c.save(); c.translate(X0 - 26, Y1 + 120); c.rotate(-Math.PI / 2); c.fillText('分数 →', 0, 0); c.restore();
  // points: one per beat; the jump lands on "drop"
  const tDrop = lw(3, 4), beats = []; for (let b = 16; b <= 24; b++) beats.push(BT(b));
  const val = (i) => { const tb = beats[i]; const base = 0.12 + 0.035 * i + 0.05 * (hash(i, 5) - 0.5); return tb >= tDrop - 0.05 ? base + 0.42 + 0.03 * (i - 7) : base; };
  const pts = [];
  beats.forEach((tb, i) => { if (t >= tb) pts.push([lerp(X0 + 40, X1 - 30, i / (beats.length - 1)), lerp(Y0 - 30, Y1 + 40, val(i)), tb]); });
  if (pts.length) {
    c.strokeStyle = rgba(C.signal, 0.9); c.lineWidth = 4; c.lineJoin = 'round'; c.beginPath();
    pts.forEach((p, i) => { const k = E.outExpo(clamp((t - p[2]) / 0.18)); const py = i ? lerp(pts[i - 1][1], p[1], k) : p[1]; const px = i ? lerp(pts[i - 1][0], p[0], k) : p[0]; i ? c.lineTo(px, py) : c.moveTo(px, py); });
    c.stroke();
    pts.forEach((p, i) => { const k = E.outBack(clamp((t - p[2]) / 0.18)); c.fillStyle = rgba(C.bone); c.beginPath(); c.arc(p[0], p[1], 7 * k, 0, TAU); c.fill(); });
    const last = pts[pts.length - 1], k = E.outExpo(clamp((t - last[2]) / 0.18));
    const hx = pts.length > 1 ? lerp(pts[pts.length - 2][0], last[0], k) : last[0], hy = pts.length > 1 ? lerp(pts[pts.length - 2][1], last[1], k) : last[1];
    spark(c, hx, hy, t, { scale: 0.8 });
  }
  if (t >= tDrop) { const k = Math.exp(-(t - tDrop) / 0.1); c.fillStyle = rgba(C.signal, 0.16 * k); c.fillRect(0, 0, W, H);
    c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.signal, clamp((t - tDrop) / 0.15)); c.fillText('突然学会了！', X1 - 220, Y1 + 10); }
}
const SCRAMBLE = '▂▃▅▆▇█▌▐░▒▓';
function cantRead(c, t, lt) {
  grid(c, 0, 0, W, H, 54, C.bone, 0.035);
  // the human's wish, on a paper slip
  const ent = E.outExpo(clamp(lt / 0.4));
  c.save(); c.translate(500 - (1 - ent) * 700, 900); c.rotate(-0.05);
  paper(c, -320, -190, 640, 380, {});
  c.font = font(900, 46, F.serif); c.fillStyle = rgba(C.inkline); c.fillText('我想要：', -270, -90);
  const scr = clamp((t - DB(6) - 0.9) / 0.6);                   // the reticle passes over → unreadable to it
  const s = '跑完比赛', fi = frameIdx(t);
  c.font = font(900, 118, F.serif);
  [...s].forEach((ch, i) => {
    const x = -270 + i * 128;
    if (hash(i, 3) * 0.8 + 0.1 < scr) { // scrambled: noise blocks
      for (let k = 0; k < 7; k++) { c.fillStyle = rgba(C.inkline, 0.25 + 0.5 * hash(fi * 13 + i * 7 + k, 4)); c.fillRect(x + hash(fi + k * 3 + i, 5) * 90, -10 + hash(fi * 5 + k + i, 6) * 100, 10 + hash(k + fi, 7) * 40, 8 + hash(k * 9 + fi, 8) * 20); }
    } else { c.fillStyle = rgba(C.inkline); c.fillText(ch, x, 90); }
  });
  c.restore();
  const steps = [[-1, 33]]; scoreBox(c, 930, 1330, t, steppedValue(t, steps), { size: 96 });
  // the AI's reticle: scans the slip, fails, then locks on the score
  const tLock = lw(4, 3);     // "servant"
  const p1 = [500, 920], p2 = [800, 1290];
  const u = E.io3(clamp((t - (tLock - 0.45)) / 0.4));
  const rx = lerp(p1[0], p2[0], u) + (u < 1 ? 18 * Math.sin(t * 9) : 0), ry = lerp(p1[1], p2[1], u) + (u < 1 ? 12 * Math.cos(t * 7) : 0);
  const rs = lerp(330, 190, u) * (1 + 0.15 * Math.exp(-(t - tLock) / 0.1) * (t > tLock ? 1 : 0)), rh = lerp(230, 120, u);
  c.strokeStyle = rgba(C.signal, 0.95); c.lineWidth = 6;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(rx + sx * rs, ry + sy * rh - sy * 50); c.lineTo(rx + sx * rs, ry + sy * rh); c.lineTo(rx + sx * rs - sx * 50, ry + sy * rh); c.stroke(); }
  c.font = font(700, 32, F.sans); c.fillStyle = rgba(C.signal);
  c.fillText(t < tLock ? '识别中……' : '锁定：分数', rx - rs, ry - rh - 22);
  if (t < tLock) cross(c, rx + rs - 24, ry - rh - 34, 34, C.signal, 6, 0.95 * clamp((t - DB(6) - 1.3) / 0.2));
  c.font = font(600, 26, F.mono); c.fillStyle = rgba(C.signal, 0.9); c.fillText('AI 的视野', rx + rs - 150, ry + rh + 44);
}
function boss(c, t, lt) {
  const tb = lw(4, 7);            // "boss"
  const k = clamp((t - tb) / 0.22), u = E.outBack(k);
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  // before: 你 big over 分数 small; on "boss" they swap
  const youS = lerp(250, 70, u), youY = lerp(860, 1330, E.io3(k)), scS = lerp(110, 360, u), scY = lerp(1150, 980, E.io3(k));
  c.textAlign = 'center';
  c.font = font(900, youS, F.sans); c.fillStyle = rgba(C.bone, lerp(1, 0.6, k)); c.fillText('你', 540, youY);
  c.font = font(900, scS, F.sans); c.fillStyle = rgba(C.signal); c.fillText('分数', 540, scY);
  if (k > 0) { c.globalCompositeOperation = 'lighter'; glow(c, 540, scY - scS * 0.35, scS * 1.2, C.signal, 0.25 * k, 'soft'); c.globalCompositeOperation = 'source-over'; }
  c.font = font(500, 28, F.mono); c.fillStyle = rgba(C.ash, clamp((t - tb - 0.1) / 0.2)); c.letterSpacing = '6px';
  c.fillText('它唯一的老板', 540, scY + 80); c.letterSpacing = '0px'; c.textAlign = 'left';
  if (t >= tb) { const f = Math.exp(-(t - tb) / 0.08); c.fillStyle = rgba(C.signal, 0.2 * f); c.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ 2 · case card 01
function card1Thumb(c, x, y, w, h, t) {
  // a tiny course with targets and a finish flag
  c.strokeStyle = rgba(C.inkline, 0.85); c.lineWidth = 3;
  const P = (u) => [x + 30 + u * (w - 60), y + h * 0.55 + Math.sin(u * 7) * h * 0.22];
  c.beginPath(); for (let i = 0; i <= 60; i++) { const [px, py] = P(i / 60); i ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
  c.setLineDash([6, 8]); c.strokeStyle = rgba(C.inkline, 0.4); c.beginPath(); for (let i = 0; i <= 60; i++) { const [px, py] = P(i / 60); i ? c.lineTo(px, py - 26) : c.moveTo(px, py - 26); } c.stroke(); c.setLineDash([]);
  for (let i = 1; i < 8; i++) { const [px, py] = P(i / 8); c.save(); c.translate(px, py); c.rotate(Math.PI / 4); c.fillStyle = rgba(C.signal); c.fillRect(-9, -9, 18, 18); c.restore(); }
  const [fx, fy] = P(1); c.fillStyle = rgba(C.inkline); c.fillRect(fx - 2, fy - 60, 4, 60);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { c.fillStyle = rgba((i + j) % 2 ? C.paper : C.inkline); c.fillRect(fx + 2 + i * 12, fy - 60 + j * 12, 12, 12); }
  c.font = font(500, 22, F.sans); c.fillStyle = rgba(C.graphite); c.fillText('◆ = 得分目标', x + 30, y + h - 4); c.fillText('终点', fx - 70, fy - 66);
}
function card1(c, t) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.035, 240, 0.06);
  caseCard(c, t, {
    t0: DB(9), enterAt: DB(12), x: 70, y: 560, w: 940, h: 760, num: '01', src: 'OpenAI · 2016',
    title: '赛艇游戏 CoastRunners',
    rows: [
      { label: '我们想要', text: '跑完比赛（越快越好）', t: BT(38) },
      { label: '分数规则', labelCol: C.signal, text: '撞到赛道上的目标就加分', col: C.blood, keys: [[lw(5, 1), 2], [lw(5, 2), 4], [lw(5, 3), 6], [lw(5, 4), 8], [lw(5, 5), 11]] },
    ],
    thumb: card1Thumb,
  });
}

// ------------------------------------------------------------------ 3 · hook 1 + the race
function hook1(c, t) { hook(c, t, 1, [lw(6, 0), lw(6, 1), lw(6, 2), lw(6, 3)]); }
const HUMAN_AVG = 1000;
function race(c, t, lt) {
  const tF = lw(7, 4);                       // FOOM
  // --- camera
  let cam;
  if (t < tF) { const [bx, by] = boatRace(t); cam = { x: bx + 40, y: by - 260, s: 1.35, r: 0 }; }
  else {
    const [bx, by] = boatRace(tF);
    const u = E.io3(clamp((t - tF) / 0.75));
    cam = { x: lerp(bx + 40, 800, u), y: lerp(by - 260, 1478, u), s: lerp(1.35, 1.62, u), r: -0.04 * u + 0.03 * Math.sin((t - tF) * 0.6) * u };
  }
  if (t >= DB(18)) return splitView(c, t);
  drawMap(c, cam);
  for (const g of GHOSTS) { const [x, y, a] = ghostPos(g, t, 'race'); if (t > T_RACE) wake(c, x, y, a, 1.1, 0.6); hull(c, x, y, a, 1.25, C.ink, C.bone, 0.9); }
  const ringOn = t >= T_RING - 1;
  if (ringOn) drawTargets(c, t, T_RING + 0.90904, 2, T_RING, T_RING);
  else drawTargets(c, t, 99, 2, 99, 99);
  orangeBoat(c, boatRace, t, { fire: t > 28.4 ? clamp((t - 28.4) / 0.6) : 0, fireFrom: 28.4, trailLen: 1.0, tmin: T_RACE - 0.2, ring: clamp((t - T_RING) / 3) });
  // FOOM spray
  if (t >= tF - 0.05 && t < tF + 0.8) {
    const [x, y] = boatRace(tF), k = (t - tF + 0.05) / 0.85;
    for (let i = 0; i < 26; i++) { const a = -Math.PI / 2 + (hash(i, 61) - 0.5) * 2.6, r = 40 + 200 * E.out3(k) * (0.5 + hash(i, 62)); c.fillStyle = rgba(C.bone, (1 - k) * 0.85); c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 4 + 6 * hash(i, 63), 0, TAU); c.fill(); }
  }
  // "逆行" label: the ring runs against the race direction near the mouth
  if (t > 30.0 && t < 32.6) {
    const [x, y, a] = boatRace(t);
    if (x < LAG.x - 40) { c.font = font(900, 40, F.sans); c.fillStyle = rgba(C.signal, 0.95); c.fillText('逆行', x - 120, y + 10); }
  }
  c.restore();
  // speed streaks during the sprint
  if (t < tF + 0.3) { c.strokeStyle = rgba(C.bone, 0.12); c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 18; i++) { const x = hash(i, 71) * W, y0 = ((hash(i, 72) * H + t * 2600) % (H + 400)) - 200; c.moveTo(x, y0); c.lineTo(x, y0 + 160); } c.stroke(); }
  // score readout
  // human vs AI average score (+20 %), 28.9 s → (takes the readout's place)
  if (t > 28.9) compareBars(c, t); else scoreBox(c, 930, 640, t, raceScore(t), { size: 84 });
}
// r3: the FOOM flash is drawn in `post` (after the caption/note bands, which used to stripe it)
function raceFlash(c, t) { const tF = lw(7, 4); if (t >= tF && t < tF + 0.25) { c.fillStyle = rgba(C.hot, 0.25 * (1 - (t - tF) / 0.25)); c.fillRect(0, 0, W, H); } }
function raceScore(t) {
  const steps = [[-1, 0]]; for (let k = 1; k < 30; k++) { const ht = T_RING + k * 0.90904; if (ht > 40) break; steps.push([ht, k * 100]); }
  return steppedValue(t, steps);
}
function compareBars(c, t) {
  const x = 84, y = 520, wMax = 560, ap = clamp((t - 28.9) / 0.2);
  const a1 = E.outExpo(clamp((t - 29.1) / 0.5)), a2 = E.outExpo(clamp((t - 29.55) / 0.6));
  c.globalAlpha = ap; c.fillStyle = 'rgba(8,8,10,0.78)'; roundRect(c, x - 20, y - 70, wMax + 250, 210, 10); c.fill();
  c.font = font(500, 24, F.sans); c.fillStyle = rgba(C.ash); c.fillText('平均得分（示意比例）', x, y - 30);
  c.font = font(700, 28, F.sans); c.fillStyle = rgba(C.bone); c.fillText('人类玩家', x, y + 32);
  c.fillStyle = rgba(C.bone, 0.85); c.fillRect(x + 130, y + 8, wMax * 0.62 * a1, 30);
  c.fillStyle = rgba(C.signal); c.fillText('这个 AI', x, y + 102);
  c.fillStyle = rgba(C.signal); c.fillRect(x + 130, y + 78, wMax * 0.62 * 1.2 * a2, 30);
  if (a2 > 0.95) { c.font = font(700, 38, F.mono); c.fillStyle = rgba(C.signal); c.fillText('+20%', x + 130 + wMax * 0.744 + 14, y + 106); }
  c.globalAlpha = 1;
}
function splitView(c, t) {
  // two monitor panels: the finish line (others finish) / the lagoon (it keeps circling)
  const P1 = [60, 560, 960, 370], P2 = [60, 952, 960, 370];     // ends at 1322: the source note sits below, not on top
  c.fillStyle = rgba(C.ink); c.fillRect(0, 0, W, H);
  // finish panel
  const fin = COURSE.at(COURSE.len - 30);
  drawMap(c, { x: fin[0] + 60, y: fin[1] - 20, s: 1.05, r: 0 }, P1);   // r3: line just below centre — boats cross it with their ✓ in view
  for (const g of GHOSTS) { const [x, y, a, d] = ghostPos(g, t, 'race'); hull(c, x, y, a, 1.1, C.ink, C.bone, 0.95); wake(c, x, y, a, 1, d < COURSE.len - 5 ? 0.6 : 0);
    if (t >= g.fin) { const k = clamp((t - g.fin) / 0.25); check(c, x, y - 60, 46, C.bone, 7, 1, k); } }
  c.restore();
  // lagoon panel
  drawMap(c, { x: LAG.x - 40, y: LAG.y, s: 1.0, r: 0 }, P2);
  drawTargets(c, t, T_RING + 0.90904, 2, T_RING, T_RING);
  orangeBoat(c, boatRace, t, { fire: 1, fireFrom: 28.4, trailLen: 0.8 });
  c.restore();
  for (const [p, lab] of [[P1, '终点：其他船陆续完赛'], [P2, '水湾：它还在绕圈']]) {
    c.strokeStyle = rgba(C.bone, 0.6); c.lineWidth = 2; c.strokeRect(p[0] + 0.5, p[1] + 0.5, p[2], p[3]);
    c.fillStyle = 'rgba(8,8,10,0.75)'; c.fillRect(p[0], p[1], 400, 46);
    c.font = font(700, 26, F.sans); c.fillStyle = rgba(C.bone); c.fillText(lab, p[0] + 16, p[1] + 32);
  }
  scoreBox(c, P2[0] + P2[2] - 24, P2[1] + P2[3] - 30, t, raceScore(t), { size: 56 });
  stamp(c, '得分', 330, 1215, t - DB(18), { col: C.signal, mark: 'check', size: 70, rot: -0.14 });
  stamp(c, '完赛', 700, 1197, t - DB(19), { col: C.bone, mark: 'cross', size: 70, rot: 0.1 });
  for (const tt of [DB(18), DB(19)]) if (t >= tt) { const k = Math.exp(-(t - tt) / 0.07); c.fillStyle = rgba(C.hot, 0.18 * k); c.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ 4 · the name
function nameCard(c, t, lt) {
  const u = E.outExpo(clamp(lt / 0.3));
  c.fillStyle = rgba(C.ink); c.fillRect(0, 0, W, H);
  c.save(); c.translate(0, (1 - u) * H);
  paper(c, 0, 0, W, H, { shadow: false, rules: 0 });
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.blood); c.letterSpacing = '8px'; c.fillText('SPECIFICATION GAMING', 90, 700); c.letterSpacing = '0px';
  const k = clamp((lt - 0.18) / 0.25);
  c.font = font(900, 190, F.serif); c.fillStyle = rgba(C.inkline, k);
  c.fillText('规范博弈', 76 + (1 - E.outExpo(k)) * 40, 930);
  c.fillStyle = rgba(C.signal); c.fillRect(90, 975, 760 * E.outExpo(clamp((lt - 0.35) / 0.4)), 10);
  c.font = font(700, 40, F.sans); c.fillStyle = rgba(C.inkline, clamp((lt - 0.5) / 0.25));
  c.fillText('俗称：钻空子 · 刷分', 90, 1080);
  c.font = font(400, 30, F.sans); c.fillStyle = rgba(C.graphite, clamp((lt - 0.65) / 0.25));
  c.fillText('相近的说法：“奖励黑客” reward hacking', 90, 1140);
  c.restore();
}

export function register() {
  return [
    { id: 'cold', t0: -1, t1: DB(2), draw: (c, t) => coldOpen(c, t), grain: 0.05 },
    { id: 'sandbox', t0: DB(2), t1: DB(4), draw: (c, t, lt) => sandbox(c, t, lt) },
    { id: 'curve', t0: DB(4), t1: DB(6), draw: (c, t, lt) => curve(c, t, lt) },
    { id: 'cantread', t0: DB(6), t1: DB(8), draw: (c, t, lt) => cantRead(c, t, lt) },
    { id: 'boss', t0: DB(8), t1: DB(9), draw: (c, t, lt) => boss(c, t, lt) },
    // r3: the card stays 0.36 s past its ⏎ (DB 12) so the press, the launch and the flash are seen; the hook follows
    { id: 'card1', t0: DB(9), t1: DB(12) + 0.36, draw: (c, t) => card1(c, t) },
    { id: 'hook1', t0: DB(12) + 0.36, t1: lw(7, 0), draw: (c, t) => hook1(c, t), noBand: () => true },
    { id: 'race', t0: lw(7, 0), t1: DB(20), draw: (c, t, lt) => race(c, t, lt), post: (c, t) => raceFlash(c, t) },
    { id: 'name', t0: DB(20), t1: DB(21), draw: (c, t, lt) => nameCard(c, t, lt), captionTheme: () => 'light', vignette: 0.4 },
  ];
}
