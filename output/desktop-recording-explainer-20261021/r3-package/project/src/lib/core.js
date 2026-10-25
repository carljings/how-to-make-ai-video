// core.js — math, easing, hashing, palette, fonts and the music clock for 《AI 也会刷分》 (Opus 5.5).
// Every frame is a pure function of film time t (seconds of the user's recording); nothing here keeps state
// between frames except caches of pre-rendered sprites.
export const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30;

// ------------------------------------------------------------------ math
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (u) => u * u * (3 - 2 * u);
export const sm = (a, b, x) => smooth(prog(a, b, x));
export const E = {
  lin: (u) => u,
  in2: (u) => u * u, out2: (u) => 1 - (1 - u) * (1 - u), io2: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  in3: (u) => u * u * u, out3: (u) => 1 - Math.pow(1 - u, 3), io3: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out4: (u) => 1 - Math.pow(1 - u, 4), out5: (u) => 1 - Math.pow(1 - u, 5),
  inExpo: (u) => (u <= 0 ? 0 : Math.pow(2, 10 * u - 10)), outExpo: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  ioExpo: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2),
  outBack: (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  outBack2: (u) => { const c1 = 2.6, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  outElastic: (u) => (u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * (TAU / 3)) + 1),
  ioSine: (u) => -(Math.cos(Math.PI * u) - 1) / 2,
};
/** keys(t, [[t0, v0], [t1, v1, ease?], ...]) — piecewise interpolation; ease applies to the segment ending at that key */
export function keys(t, ks) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [a, va] = ks[i - 1], [b, vb, ez] = ks[i];
      const u = b > a ? (t - a) / (b - a) : 1;
      return lerp(va, vb, (ez || E.io3)(u));
    }
  }
  return ks[ks.length - 1][1];
}
export function hash(i, seed = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const hash2 = (i, j, seed = 0) => hash(Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663), seed);
export function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i; return lerp(hash(i, seed), hash(i + 1, seed), smooth(f)) * 2 - 1; }
export function fbm(x, seed = 0) { return 0.6 * vnoise(x, seed) + 0.3 * vnoise(x * 2.1, seed + 7) + 0.1 * vnoise(x * 4.3, seed + 13); }
export const frameIdx = (t) => Math.round(t * FPS);
export const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// ------------------------------------------------------------------ palette (semantic: SIGNAL = the score, BONE = what you meant)
export const C = {
  ink: [11, 11, 13], ink2: [20, 20, 23], ink3: [31, 30, 33], graphite: [88, 86, 82], ash: [150, 145, 137],
  bone: [236, 230, 217], paper: [231, 225, 211], paper2: [219, 211, 194], inkline: [24, 22, 20],
  signal: [255, 90, 31], ember: [255, 142, 64], hot: [255, 228, 204], blood: [176, 42, 12],
  red: [226, 64, 38], blue: [72, 118, 214],
};
export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
export const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];

// ------------------------------------------------------------------ fonts (bundled subsets, unique family names: never a silent system fallback)
// mono / condensed are Latin-only faces: CJK in them falls back to the bundled F-Sans, never to a system font
export const F = { sans: '"F-Sans"', serif: '"F-Serif", "F-Sans"', mono: '"F-Mono", "F-Sans"', cond: '"F-Cond", "F-Sans"' };
export const font = (w, px, fam = F.sans) => `${w} ${px}px ${fam}`;

// ------------------------------------------------------------------ music clock (src/timing.json; film time = recording time)
export const T = { beat: 0.45452, bar: 1.81808, beats: [], downbeats: [], kick: [], snare: [], hat: [], words: [], sections: [], env: {} };
export function setTiming(j) {
  T.beat = j.beat_s; T.bar = 4 * j.beat_s;
  T.beats = j.beats; T.downbeats = j.downbeats; T.sections = j.sections;
  T.kick = j.onsets.kick.map((x) => x[0]); T.kickS = j.onsets.kick.map((x) => x[1]);
  T.snare = j.onsets.snare.map((x) => x[0]); T.hat = j.onsets.hat.map((x) => x[0]);
  T.words = j.words; T.env = j.env20;
}
/** downbeat k (0.016 + k·bar) and beat k on the measured grid */
export const DB = (k) => 0.016 + k * 1.81808;
export const BT = (k) => 0.016 + k * 0.45452;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9()]/g, '');
/** time of the nth sung word matching q (start, or end with which = 't1') */
export function wt(q, nth = 0, which = 't0') {
  const n = norm(q); let k = 0;
  for (const w of T.words) if (norm(w.w) === n) { if (k === nth) return w[which]; k++; }
  throw new Error('word not found: ' + q + ' #' + nth);
}
/** time of word #idx of lyric line #line (indices as printed by tools/timing.py; avoids ambiguous words like "I'm") */
export function lw(line, idx, which = 't0') {
  const ws = T.words.filter((w) => w.line === line);
  if (!ws[idx]) throw new Error(`no word ${idx} on line ${line}`);
  return ws[idx][which];
}
function lastBefore(arr, t) {
  let lo = 0, hi = arr.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t + 1e-6) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
}
export const lastIdx = lastBefore;
/** decaying pulse from the latest onset of a kind ('kick' | 'snare' | 'hat' | 'beat' | 'down') */
export function pulse(kind, t, tau = 0.12) {
  const arr = kind === 'beat' ? T.beats : kind === 'down' ? T.downbeats : T[kind];
  const i = lastBefore(arr, t); if (i < 0) return 0;
  return Math.exp(-(t - arr[i]) / tau);
}
export function onsetsIn(kind, a, b) { const arr = kind === 'beat' ? T.beats : kind === 'down' ? T.downbeats : T[kind]; return arr.filter((x) => x >= a && x < b); }
export function env(name, t) {
  const e = T.env[name]; if (!e) return 0;
  const f = clamp(t * 20, 0, e.length - 1), i = Math.floor(f), k = f - i;
  return lerp(e[i], e[Math.min(e.length - 1, i + 1)], k);
}
/** count of onsets of kind in [a, t] (for "one more hit per kick" counters) */
export function countIn(kind, a, t) { const arr = kind === 'beat' ? T.beats : T[kind]; let n = 0; for (const x of arr) { if (x >= a - 1e-6 && x <= t + 1e-6) n++; else if (x > t) break; } return n; }
