// math.ts: small deterministic helpers.
// Every frame is a pure function of time, so nothing here may read the clock or call Math.random().

export const TAU = Math.PI * 2;
export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a)); // 0..1 progress through [a, b]

// Easing: map 0..1 progress to 0..1 motion
export const smooth = (k: number) => k * k * (3 - 2 * k);
export const easeOut = (k: number) => 1 - (1 - k) ** 3;
export const easeIn = (k: number) => k * k * k;
export const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
export const expoOut = (k: number) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
// Overshoots then settles: good for things that pop in
export const backOut = (k: number, s = 1.8) => 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2;

// A damped spring evaluated in closed form: 0 at t = 0, settling at 1. Pure, so any frame can be computed alone.
export const springAt = (t: number, freq = 2.6, damp = 0.42) => {
  if (t <= 0) return 0;
  const w = TAU * freq, z = damp, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
};

// Keyframes: kf(t, [[t0, v0], [t1, v1], ...], ease)
export function kf(t: number, keys: [number, number][], ef: (k: number) => number = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, ef((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

// Seeded random numbers: the same seed always gives the same sequence
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise in -1..1, a pure function of (x, seed): used for jitter and shake
const hash = (i: number, seed: number) => {
  let x = Math.imul(i ^ Math.imul(seed, 0x9e3779b1), 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return ((x >>> 0) / 4294967296) * 2 - 1;
};
export const noise1 = (x: number, seed = 0) => {
  const i = Math.floor(x), f = x - i;
  return lerp(hash(i, seed), hash(i + 1, seed), smooth(f));
};
