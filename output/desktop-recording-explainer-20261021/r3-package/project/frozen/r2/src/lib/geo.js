// geo.js — splines with arc-length lookup (race course, paths), 2D camera, tiny 3D projection.
import { clamp, lerp } from './core.js';

/** dense Catmull-Rom polyline through points (open curve) */
export function catmull(pts, seg = 24) {
  const out = [];
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < seg; k++) {
      const u = k / seg, u2 = u * u, u3 = u2 * u;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
export class Path {
  constructor(poly) {
    this.p = poly; this.L = [0];
    for (let i = 1; i < poly.length; i++) this.L.push(this.L[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    this.len = this.L[this.L.length - 1];
  }
  /** point at arc length d (clamped): [x, y, angle] */
  at(d) {
    d = clamp(d, 0, this.len);
    let lo = 0, hi = this.L.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.L[m] <= d) lo = m; else hi = m; }
    const a = this.p[lo], b = this.p[hi], k = (d - this.L[lo]) / Math.max(1e-9, this.L[hi] - this.L[lo]);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  atFrac(s) { return this.at(s * this.len); }
  /** offset polyline (left side positive) */
  offset(dist) {
    return this.p.map((q, i) => {
      const a = this.p[Math.max(0, i - 1)], b = this.p[Math.min(this.p.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [q[0] - (dy / l) * dist, q[1] + (dx / l) * dist];
    });
  }
}
/** apply a 2D camera: world point (cx, cy) at screen centre (sx, sy), scale s, rotation r */
export function applyCam(c, cam, sx = 540, sy = 960) {
  c.translate(sx, sy); if (cam.r) c.rotate(cam.r); c.scale(cam.s, cam.s); c.translate(-cam.x, -cam.y);
}
export function camToScreen(cam, x, y, sx = 540, sy = 960) {
  let dx = (x - cam.x) * cam.s, dy = (y - cam.y) * cam.s;
  if (cam.r) { const c = Math.cos(cam.r), s = Math.sin(cam.r); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
  return [sx + dx, sy + dy];
}
/** tiny perspective camera: eye, target, up=(0,-1,0) in a y-down world; returns project(p) → [x, y, depth, scale] */
export function lookAt(eye, target, f = 1100, cx = 540, cy = 960) {
  const fw = norm3(sub3(target, eye)), up = [0, -1, 0];
  const rt = norm3(cross3(fw, up)), u2 = cross3(rt, fw);
  return (p) => {
    const d = sub3(p, eye), z = dot3(d, fw), x = dot3(d, rt), y = dot3(d, u2);
    const s = f / Math.max(1e-3, z);
    return [cx + x * s, cy - y * s, z, s];
  };
}
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
