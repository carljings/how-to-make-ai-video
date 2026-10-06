// lib.js: deterministic math helpers.
// Every frame of the film is a pure function of time, so nothing here may read the clock or call Math.random().

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 progress through [a, b]
export const frac = x => x - Math.floor(x);

// Easing
export const smooth = k => k * k * (3 - 2 * k);
export const smoother = k => k * k * k * (k * (k * 6 - 15) + 10);
export const easeIn = k => k * k * k;
export const easeOut = k => 1 - (1 - k) ** 3;
export const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const expOut = k => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
export const expIn = k => (k <= 0 ? 0 : 2 ** (10 * k - 10));
export const backOut = (k, s = 1.70158) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;
export const sineInOut = k => -(Math.cos(Math.PI * k) - 1) / 2;

// 0 → 1 → 0 window with fade-in and fade-out lengths
export const win = (t, a, b, fin = 0.5, fout = 0.5) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));

// Keyframes: kf(t, [[t0, v0], [t1, v1], ...], ease). Values may be numbers or arrays.
export function kf(t, keys, ef = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      const k = ef((t - t0) / (t1 - t0));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

// Hashing and seeded randomness
export function hash(n) {
  n = (n | 0) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b) >>> 0;
  n = (n ^ (n >>> 16)) >>> 0;
  return n / 4294967296;
}
export const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
export const hash3 = (a, b, c) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663) ^ Math.imul(c | 0, 83492791));

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function gauss(r) {
  let u = r();
  while (u <= 1e-12) u = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r());
}

// Value noise
const fade5 = smoother;
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  return lerp(hash2(i, seed), hash2(i + 1, seed), fade5(f)) * 2 - 1;
}
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = fade5(x - ix), fy = fade5(y - iy);
  const a = hash3(ix, iy, seed), b = hash3(ix + 1, iy, seed), c = hash3(ix, iy + 1, seed), d = hash3(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy) * 2 - 1;
}
export function noise3(x, y, z, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fade5(x - ix), fy = fade5(y - iy), fz = fade5(z - iz);
  const h = (a, b, c) => hash3(ix + a, iy + b, (iz + c) * 7919 + seed);
  const x00 = lerp(h(0, 0, 0), h(1, 0, 0), fx), x10 = lerp(h(0, 1, 0), h(1, 1, 0), fx);
  const x01 = lerp(h(0, 0, 1), h(1, 0, 1), fx), x11 = lerp(h(0, 1, 1), h(1, 1, 1), fx);
  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz) * 2 - 1;
}
export function fbm2(x, y, oct = 4, seed = 0) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f, seed + i * 101); f *= 2.03; a *= 0.5; }
  return s;
}

// Reflection inside [lo, hi]: returns [position, directionSign] for an unbounded coordinate x
export function fold(x, lo, hi) {
  const L = hi - lo, u = (x - lo) / L, m = ((u % 2) + 2) % 2;
  return m <= 1 ? [lo + m * L, 1] : [lo + (2 - m) * L, -1];
}

// Colour: [r, g, b] in 0..255
export function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// 3D vectors as [x, y, z]
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]; }
export function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]]; }
export function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; }
export function rotAxis(p, k, a) { // Rodrigues; k must be unit length
  const c = Math.cos(a), s = Math.sin(a), d = dot(k, p), x = cross(k, p);
  return [p[0] * c + x[0] * s + k[0] * d * (1 - c), p[1] * c + x[1] * s + k[1] * d * (1 - c), p[2] * c + x[2] * s + k[2] * d * (1 - c)];
}

// Perspective camera. project() returns screen x, y, view depth z and pixels-per-unit s (or null behind the lens).
export function camera(pos, target, { fov = 38, w = 1920, h = 1080, up = [0, 1, 0], roll = 0 } = {}) {
  const f = norm(sub(target, pos));
  let r = norm(cross(f, up));
  let u = cross(r, f);
  if (roll) { r = rotAxis(r, f, roll); u = rotAxis(u, f, roll); }
  const focal = (h / 2) / Math.tan((fov * Math.PI) / 360);
  return {
    pos, f, r, u, focal, w, h,
    project(p) {
      const d = [p[0] - pos[0], p[1] - pos[1], p[2] - pos[2]];
      const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
      if (z < 0.05) return null;
      const s = focal / z;
      return { x: w / 2 + (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) * s, y: h / 2 - (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) * s, z, s };
    },
  };
}

// Text → point cloud. Rasterizes text off-screen and samples filled pixels on a jittered grid.
export function textPoints(text, font, { step = 4, size = 600, seed = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = size * Math.max(1, text.length) * 1.2; c.height = size * 1.3;
  const g = c.getContext('2d');
  g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#fff';
  g.fillText(text, c.width / 2, c.height / 2);
  const d = g.getImageData(0, 0, c.width, c.height).data, pts = [], r = rng(seed);
  for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) {
    const jx = x + (r() - 0.5) * step, jy = y + (r() - 0.5) * step;
    const xi = Math.min(c.width - 1, Math.max(0, jx | 0)), yi = Math.min(c.height - 1, Math.max(0, jy | 0));
    if (d[(yi * c.width + xi) * 4 + 3] > 128) pts.push([(jx - c.width / 2) / size, (c.height / 2 - jy) / size]);
  }
  return pts;
}
