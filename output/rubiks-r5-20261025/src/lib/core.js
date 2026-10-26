// core.js — deterministic helpers. Every frame is a pure function of t: nothing here reads the clock or Math.random().

export const TAU = Math.PI * 2;
export const W = 1080, H = 1920, FPS = 30;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (k) => k * k * (3 - 2 * k);
export const smoother = (k) => k * k * k * (k * (k * 6 - 15) + 10);
export const easeOut = (k) => 1 - (1 - k) ** 3;
export const easeOut5 = (k) => 1 - (1 - k) ** 5;
export const easeIn = (k) => k * k * k;
export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const expoOut = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
export const backOut = (k, s = 1.70158) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;
export const elastic = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 2 ** (-10 * k) * Math.sin((k * 10 - 0.75) * (TAU / 3)) + 1);
// 0 → 1 → 0 window over [a, b] with fade lengths
export const win = (t, a, b, fin = 0.3, fout = 0.3) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));

export function kf(t, keys, ef = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, ef((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// hash noise in [0,1) for integer-ish inputs (deterministic grain / flicker)
export function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

// colour helpers
export function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgba = (c, a = 1) => { const [r, g, b] = Array.isArray(c) ? c : hex(c); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; };
export const mix = (a, b, k) => { const A = Array.isArray(a) ? a : hex(a), B = Array.isArray(b) ? b : hex(b); return [lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k)]; };
export const shade = (c, k) => { const A = Array.isArray(c) ? c : hex(c); return k >= 0 ? A.map((v) => v + (255 - v) * k) : A.map((v) => v * (1 + k)); };

// Group digits of a BigInt / number string with commas
export const commas = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
