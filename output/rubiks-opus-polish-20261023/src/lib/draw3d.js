// draw3d.js — Canvas 2D renderer for glossy stickerless speed cubes. Perspective camera, back-face culling,
// slab-ordered painter's algorithm (correct during layer turns), per-tile gloss and specular, optional
// per-cubie placement/rotation (for exploded views and piece dances) and a line-art "blueprint" style.
import { COLOR, rotF, mul, mv, ID } from './cube.js';
import { hex, clamp, lerp, W, H } from './core.js';

const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const T = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
export const vec = { norm, sub, add, scl, dot, cross, T };

// rotation about an arbitrary unit axis (Rodrigues)
export function axisAngle(a, th) {
  const [x, y, z] = norm(a), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
export function orient(yaw = 0, pitch = 0, roll = 0) { return mul(rotF(1, yaw), mul(rotF(0, pitch), rotF(2, roll))); }

export function camera({ yaw = 0.6, pitch = 0.45, dist = 24, fov = 26, cx = 540, cy = 960, target = [0, 0, 0], roll = 0 } = {}) {
  const pos = add(target, [dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.cos(yaw)]);
  const fwd = norm(sub(target, pos));
  let right = norm(cross(fwd, [0, 1, 0]));
  let up = cross(right, fwd);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2 = add(scl(right, c), scl(up, s)); up = add(scl(up, c), scl(right, -s)); right = r2; }
  const f = 960 / Math.tan((fov * Math.PI) / 360);
  return {
    pos, fwd, right, up, f, cx, cy,
    project(p) { const d = sub(p, pos); const z = dot(d, fwd); return [cx + (f * dot(d, right)) / z, cy - (f * dot(d, up)) / z, z]; },
  };
}

function roundSquare(r, n = 4) {
  const pts = [];
  for (const [sx, sy, a0] of [[1, 1, 0], [-1, 1, 0.5], [-1, -1, 1], [1, -1, 1.5]]) {
    const cx = sx * (1 - r), cy = sy * (1 - r);
    for (let i = 0; i <= n; i++) { const a = (a0 + (i / n) * 0.5) * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  }
  return pts;
}
const TILE = roundSquare(0.2, 4);
const BODY = roundSquare(0.1, 2);
const SQUARE = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const tangents = (n) => (n[0] ? [[0, 0, n[0]], [0, 1, 0]] : n[1] ? [[1, 0, 0], [0, 0, -n[1]]] : [[n[2], 0, 0], [0, 1, 0]]);
const RGB = Object.fromEntries(Object.entries(COLOR).map(([k, v]) => [k, hex(v)]));
export const LIGHT = norm([-0.45, 0.85, 0.55]);
const RIM = norm([0.7, 0.2, -0.7]);
const css = (c, a = 1) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;

function stickerOn(c, n) {
  for (const s of c.stickers) { const d = mv(c.rot, s.dir); if (d[0] === n[0] && d[1] === n[1] && d[2] === n[2]) return s.face; }
  return null;
}

/**
 * drawCube(ctx, cam, cube)
 *  state, turn {move,k}|null, pos, rot, scale, alpha
 *  place(c) → { p: cube-local centre, E: extra rotation about the cubie centre } (optional; overrides offset)
 *  offset(c) → cube-local offset (optional)
 *  look(c) → { dim, glow, glowColor, alpha, white } (optional)
 *  style: 'solid' | 'wire'; wire: { line, fill, width }
 *  body: rgb of the plastic; rim: rim light strength (0..1, for dark backgrounds); specTint: rgb
 */
export function drawCube(ctx, cam, cube) {
  const { state, turn = null, pos = [0, 0, 0], rot = ID, scale = 1, alpha = 1, offset = null, place = null, look = null } = cube;
  const style = cube.style || 'solid';
  const bodyRGB = cube.body || [17, 18, 22];
  const rimK = cube.rim ?? 0.35;
  const inset = cube.inset ?? 0.9;
  const spin = turn ? rotF(turn.move.axis, turn.move.angle * turn.k) : null;
  const camLocal = mv(T(rot), scl(sub(cam.pos, pos), 1 / scale));
  let ax;
  if (turn) ax = turn.move.axis;
  else { const a = camLocal.map(Math.abs); ax = a[0] > a[1] ? (a[0] > a[2] ? 0 : 2) : a[1] > a[2] ? 1 : 2; }
  const free = !!(offset || place);
  const toWorld = (p, R) => add(pos, scl(mv(rot, R ? mv(R, p) : p), scale));
  const items = [];
  for (const c of state) {
    let centre, E = null;
    if (place) { const pl = place(c); if (!pl) continue; centre = pl.p; E = pl.E || null; }
    else centre = offset ? add(c.pos, offset(c)) : c.pos;
    const R = turn && turn.move.layers.includes(c.pos[turn.move.axis]) ? spin : null;
    const wc = toWorld(centre, R);
    items.push({ c, centre, E, R, d: dot(sub(wc, cam.pos), cam.fwd), slab: c.pos[ax] });
  }
  const sgn = camLocal[ax] > 0 ? 1 : -1;
  items.sort(free ? (a, b) => b.d - a.d : (a, b) => (a.slab - b.slab) * sgn || b.d - a.d);

  const px = cam.f * scale; // pixels per cube unit at distance 1
  for (const it of items) {
    const { c, centre, E, R } = it;
    const lk = look ? look(c) : null;
    const dim = lk?.dim || 0, glow = lk?.glow || 0, la = (lk && lk.alpha != null ? lk.alpha : 1) * alpha;
    if (la <= 0.003) continue;
    const sz = lk?.size ?? 1;
    for (const n0 of AXES) {
      const n = E ? mv(E, n0) : n0;
      const fc = add(centre, scl(n, 0.48 * sz));
      const nw = mv(rot, R ? mv(R, n) : n);
      const fw = toWorld(fc, R);
      const toCam = sub(cam.pos, fw);
      if (dot(nw, toCam) <= 0) continue;
      let [t1, t2] = tangents(n0);
      if (E) { t1 = mv(E, t1); t2 = mv(E, t2); }
      const lambert = Math.max(0, dot(nw, LIGHT));
      const rim = Math.max(0, dot(nw, RIM));
      if (style === 'wire') {
        const w = cube.wire || {};
        const bp = SQUARE.map(([u, v]) => cam.project(toWorld(add(fc, add(scl(t1, u * 0.48 * sz), scl(t2, v * 0.48 * sz))), R)));
        ctx.beginPath(); bp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.fillStyle = css(w.fill || [5, 16, 31], la); ctx.fill();
        ctx.lineWidth = w.width || 2.2; ctx.lineJoin = 'round';
        ctx.strokeStyle = css(w.line || [150, 205, 255], la * (0.55 + 0.45 * lambert)); ctx.stroke();
        continue;
      }
      // body face
      const bp = BODY.map(([u, v]) => cam.project(toWorld(add(fc, add(scl(t1, u * 0.48 * sz), scl(t2, v * 0.48 * sz))), R)));
      ctx.beginPath(); bp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      const bl = 0.55 + 0.7 * lambert + rimK * 1.6 * rim;
      ctx.fillStyle = css((lk?.bodyRGB || bodyRGB).map((v) => v * bl + rimK * 26 * rim), la); ctx.fill();
      const sticker = stickerOn(c, n0);
      if (!sticker) continue;
      const fc2 = add(centre, scl(n, 0.486 * sz));
      const tp = TILE.map(([u, v]) => cam.project(toWorld(add(fc2, add(scl(t1, u * 0.48 * inset * sz), scl(t2, v * 0.48 * inset * sz))), R)));
      let col = RGB[sticker];
      if (lk?.white) col = col.map((v) => lerp(v, 255, lk.white));
      if (dim > 0) { const g = col[0] * 0.3 + col[1] * 0.55 + col[2] * 0.15; col = col.map((v) => lerp(v, g * 0.28 + 16, dim)); }
      const lit = 0.52 + 0.6 * lambert + 0.25 * rim;
      const viewDir = norm(toCam);
      const refl = sub(scl(nw, 2 * dot(nw, LIGHT)), LIGHT);
      const spec = Math.pow(Math.max(0, dot(refl, viewDir)), 16) * (1 - dim * 0.85);
      const hi = col.map((v) => v * lit + 50), lo = col.map((v) => v * lit * 0.74);
      const g = ctx.createLinearGradient(tp[0][0], tp[0][1], tp[10][0], tp[10][1]);
      g.addColorStop(0, css(hi, la)); g.addColorStop(0.55, css(col.map((v) => v * lit), la)); g.addColorStop(1, css(lo, la));
      ctx.beginPath(); tp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      if (spec > 0.02) { ctx.fillStyle = `rgba(255,255,255,${(spec * 0.5 * la).toFixed(3)})`; ctx.fill(); }
      ctx.lineWidth = Math.max(1, (px * 0.014) / it.d);
      ctx.strokeStyle = `rgba(255,255,255,${((0.08 + 0.26 * lambert + 0.2 * rim) * la * (1 - dim * 0.75)).toFixed(3)})`;
      ctx.stroke();
      if (glow > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = css(lk.glowColor || [255, 255, 255], Math.min(1, glow) * la); ctx.lineWidth = Math.max(2, (px * 0.05) / it.d);
        ctx.stroke(); ctx.fillStyle = css(lk.glowColor || [255, 255, 255], Math.min(1, glow) * 0.2 * la); ctx.fill();
        ctx.restore();
      }
    }
  }
}

// soft contact shadow under a cube
export function shadow(ctx, cam, pos, scale, k = 1, drop = 1.75) {
  const p = cam.project([pos[0], pos[1] - drop * scale, pos[2]]);
  if (p[2] <= 0) return;
  const r = (cam.f * scale * 2.3) / p[2];
  const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
  g.addColorStop(0, `rgba(0,0,0,${0.6 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(p[0], p[1]); ctx.scale(1, 0.26); ctx.translate(-p[0], -p[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

// ── motion blur: average sub-frame renders of fn(subT, ctx) into the target context ─────────────────
let BUF = null;
function bufs() {
  if (BUF) return BUF;
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = b.width = W; a.height = b.height = H;
  BUF = { a, actx: a.getContext('2d'), b, bctx: b.getContext('2d') };
  return BUF;
}
export function blurred(ctx, t, fn, { samples = 5, shutter = 0.8 / 30, alpha = 1 } = {}) {
  if (samples <= 1) { fn(t, ctx); return; }
  const B = bufs();
  for (let i = 0; i < samples; i++) {
    B.bctx.setTransform(1, 0, 0, 1, 0, 0); B.bctx.clearRect(0, 0, W, H);
    fn(t - shutter * (i / (samples - 1) - 0.5), B.bctx);
    B.actx.globalCompositeOperation = i === 0 ? 'copy' : 'source-over';
    B.actx.globalAlpha = 1 / (i + 1);
    B.actx.drawImage(B.b, 0, 0);
  }
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(B.a, 0, 0); ctx.restore();
}

// pre-render a cube to its own canvas (for instancing many cubes)
export function cubeSprite(state, { size = 256, yaw = 0.62, pitch = 0.5, dist = 30, rim = 0.3 } = {}) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c2 = cv.getContext('2d');
  const cam = camera({ yaw, pitch, dist, fov: 26, cx: size / 2, cy: size / 2 });
  const k = size / 1920; // camera f is set for 1920 px height; scale geometry so the cube fills the sprite
  const cam2 = { ...cam, f: cam.f * k * 2.4, project(p) { const d = sub(p, cam.pos); const z = dot(d, cam.fwd); return [size / 2 + (cam.f * k * 2.4 * dot(d, cam.right)) / z, size / 2 - (cam.f * k * 2.4 * dot(d, cam.up)) / z, z]; } };
  drawCube(c2, cam2, { state, rim });
  return cv;
}
