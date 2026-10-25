// lib.js — small pure helpers (copied from the author’s earlier project). Every frame is a pure function of t: no Math.random, no clock reads.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const mix = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const smoother = (x) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const ramp = (x, a, b) => (b > a ? smooth((x - a) / (b - a)) : (x >= a ? 1 : 0));
export const lin = (x, a, b) => (b > a ? clamp((x - a) / (b - a)) : (x >= a ? 1 : 0));
export const win = (x, a, b, c, d) => Math.min(ramp(x, a, b), 1 - ramp(x, c, d));
export const easeOut = (x, p = 3) => 1 - Math.pow(1 - clamp(x), p);
export const easeIn = (x, p = 3) => Math.pow(clamp(x), p);
export const easeInOut = (x, p = 3) => { const t = clamp(x); return t < 0.5 ? Math.pow(2 * t, p) / 2 : 1 - Math.pow(2 - 2 * t, p) / 2; };
export const backOut = (x, s = 1.70158) => { const t = clamp(x) - 1; return t * t * ((s + 1) * t + s) + 1; };
export const fract = (x) => x - Math.floor(x);
export const hash = (i, k = 0) => fract(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453);
export const lerp3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
export const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const len3 = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm3 = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// seeded generator (mulberry32) for load-time precomputation
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// monotone cubic (Fritsch–Carlson) through [[x, y], ...]: no overshoot, equal neighbours hold
export function pchip(keys) {
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]), n = xs.length;
  const d = []; for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = [d[0]];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m.push(0);
    else { const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i])); }
  }
  m.push(d[n - 2]);
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
// a path of vectors keyed in time: [[t, [x,y,z]], ...]
export function pchip3(keys) {
  const f = [0, 1, 2].map((j) => pchip(keys.map((k) => [k[0], k[1][j]])));
  return (t) => [f[0](t), f[1](t), f[2](t)];
}
