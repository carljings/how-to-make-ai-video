// lib.js: small deterministic helpers.
// Every frame is a pure function of time, so nothing here may read the clock or call Math.random().

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 progress through [a, b]

// Easing: map 0..1 progress to 0..1 motion
export const smooth = k => k * k * (3 - 2 * k);
export const easeOut = k => 1 - (1 - k) ** 3;
export const easeInOut = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

// 0 → 1 → 0 window over [a, b] with fade-in and fade-out lengths
export const win = (t, a, b, fin = 0.5, fout = 0.5) => Math.min(seg(t, a, a + fin), 1 - seg(t, b - fout, b));

// Keyframes: kf(t, [[t0, v0], [t1, v1], ...], ease)
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

// Seeded random numbers: the same seed always gives the same sequence
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
