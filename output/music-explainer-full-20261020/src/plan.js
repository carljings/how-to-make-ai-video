// plan.js — 《这首开智小曲，为什么上头？》 full film (flat 2D): timing, script, palette, Clawd's choreography. No drawing.
// Everything is a pure function of film time; every musical moment comes from src/cues.js (measured on the original BGM).
import { CUES } from './cues.js';
export const E = CUES.events, FPS = CUES.fps, FRAMES = CUES.frames, END = CUES.end_s, AUDIO_END = CUES.audio_end_s, BEAT = CUES.beat_s;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const easeOut = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const env = (arr, t) => { const x = clamp(t * FPS - 0.5, 0, arr.length - 1), i = Math.floor(x), u = x - i; return lerp(arr[i], arr[Math.min(arr.length - 1, i + 1)], u); };
export const rms = (t) => (t < 0 ? 0 : env(CUES.rms, t)), sub = (t) => (t < 0 ? 0 : env(CUES.sub, t));
export const ONSETS = CUES.onsets;
export const lastOnset = (t) => { let o = null; for (const x of ONSETS) { if (x.t <= t) o = x; else break; } return o; };

// ── palette: Anthropic's published brand colours (claude.com brand-guidelines skill example), used for EVERYTHING
export const C = {
  dark: '#141413', dark2: '#1d1c1a', dark3: '#262522', light: '#faf9f5', pale: '#e8e6dc', grey: '#b0aea5',
  orange: '#d97757', blue: '#6a9bcc', green: '#788c5d',
};
export const CLAWD_FILL = C.orange, CLAWD_EYE = C.dark;      // Clawd: flat, exactly the brand orange; eyes the brand dark

// ── acts (film seconds)
export const ACT = {
  rule: [0, 9.9],                       // ① the beat repeats → you expect the next one → the drop lands on it
  reward: [9.9, E.bar16],               // ② Salimpoor 2011: waiting and the peak both engage the reward system (schematic)
  balance: [E.bar16, E.bar6b],          // ③ Cheung 2019: uncertainty × surprise (chords; schematic map)
  again: [E.bar6b, E.dropB + 1.25],     // ④ the opening build again (same source audio, measured) + repeated-listening study
  answer: [E.dropB + 1.25, END + 1],    // the answer, the music fades, hold
};
export const actOf = (t) => Object.keys(ACT).find((k) => t >= ACT[k][0] && t < ACT[k][1]) || 'answer';

// ── prediction grids (示意): fitted to the first six measured onsets; the second pass is the same grid, shifted
const PRED = CUES.prediction;
const mkGrid = (arr) => arr.map((g, i) => ({ t: g.t, i, bar: i % 8 === 0, hit: g.onset !== null, onset: g.onset }));
export const GRID_A = mkGrid(PRED.gridA), GRID_B = mkGrid(PRED.gridB);
export const MISS = GRID_A.find((g) => !g.hit);
export const MISS_B = GRID_B.find((g) => !g.hit);
export const near = (grid, t) => grid.reduce((b, g) => (Math.abs(g.t - t) < Math.abs(b.t - t) ? g : b));
export const DROP_RING = near(GRID_A, E.drop), DROP_RING_B = near(GRID_B, E.dropB);
export const LEARN = GRID_A[1].t;
export const SHIFT_B = PRED.shiftB_s;

// ── headlines: one idea at a time; each claim after the moment that shows it. accent = the coloured words.
export const HEAD = [
  { from: 0, to: 1.66, lines: [{ s: '这首开智小曲', w: 500, px: 62 }, { s: '为什么上头？', w: 900, px: 128, accent: '上头', ac: C.orange }] },
  { from: 1.8, to: 2.98, lines: [{ s: '少了一下，', w: 900, px: 104 }, { s: '你却在等它', w: 900, px: 104, accent: '等它', ac: C.blue }] },
  { from: 2.98, to: 4.26, lines: [{ s: '节拍一重复，', w: 900, px: 96 }, { s: '大脑就预期下一拍', w: 900, px: 96, accent: '预期', ac: C.orange }] },
  { from: E.drop, to: 6.35, punch: true, lines: [{ s: '等到了！', w: 900, px: 164, accent: '等到', ac: C.orange }, { s: '重拍正落在预期的那一拍', w: 500, px: 54 }] },
  { from: 8.45, to: 9.95, lines: [{ s: '原因①', w: 900, px: 64, accent: '原因①', ac: C.orange }, { s: '听出规律 → 预期 → 等到', w: 900, px: 70, accent: '预期', ac: C.orange }] },
  { from: 10.15, to: E.thin2, lines: [{ s: '那“等”的那几秒，', w: 900, px: 84 }, { s: '为什么也上头？', w: 900, px: 92, accent: '上头', ac: C.orange }] },
  { from: E.thin2, to: E.drop3, lines: [{ s: '等的时候：', w: 900, px: 96 }, { s: '尾状核更活跃', w: 900, px: 112, accent: '尾状核', ac: C.blue }] },
  { from: E.drop3, to: E.drop3 + 1.2, punch: true, lines: [{ s: '落下的那一刻：', w: 900, px: 96 }, { s: '伏隔核更活跃', w: 900, px: 112, accent: '伏隔核', ac: C.orange }] },
  { from: E.drop3 + 1.2, to: E.bar16, lines: [{ s: '原因②', w: 900, px: 64, accent: '原因②', ac: C.blue }, { s: '等待本身，也在奖赏里', w: 900, px: 76, accent: '等待本身', ac: C.blue }] },
  { from: E.bar16 + 0.1, to: E.bar17, lines: [{ s: '那么，', w: 900, px: 92 }, { s: '越意外越好听？', w: 900, px: 104, accent: '意外', ac: C.orange }] },
  { from: E.bar17, to: E.join, punch: true, lines: [{ s: '不一定。', w: 900, px: 150 }] },
  { from: E.join, to: E.bar5b, lines: [{ s: '很好猜的时候，', w: 900, px: 92 }, { s: '来点意外更好听', w: 900, px: 100, accent: '意外', ac: C.orange }] },
  { from: E.bar5b, to: E.bar6b, lines: [{ s: '很难猜的时候，', w: 900, px: 92 }, { s: '落回预期更好听', w: 900, px: 100, accent: '预期', ac: C.blue }] },
  { from: E.bar6b, to: E.thinB, lines: [{ s: '原因③', w: 900, px: 64, accent: '原因③', ac: C.green }, { s: '再听一遍会怎样？', w: 900, px: 96 }] },
  { from: E.thinB, to: E.buildB, lines: [{ s: '这一段，', w: 900, px: 96 }, { s: '开头听过', w: 900, px: 112, accent: '听过', ac: C.green }] },
  { from: E.buildB, to: E.dropB, lines: [{ s: '这一次，', w: 900, px: 96 }, { s: '你知道它要来', w: 900, px: 112, accent: '知道', ac: C.green }] },
  { from: E.dropB, to: ACT.answer[0], punch: true, lines: [{ s: '又等到了！', w: 900, px: 132, accent: '等到', ac: C.orange }] },
  { from: ACT.answer[0], to: END + 1, lines: [{ s: '为什么上头？', w: 900, px: 112, accent: '上头', ac: C.orange }] },
];
// the closing answer list, one line per beat
export const ANSWER = [
  { n: '①', s: '听出规律，大脑就会预期', c: C.orange },
  { n: '②', s: '等待的时候，奖赏系统已在参与', c: C.blue },
  { n: '③', s: '好猜里带点意外，常更好听', c: C.pale },
  { n: '④', s: '听熟了，往往更喜欢', c: C.green },
];
export const ANSWER_NOTE = '这些是一部分原因，因人而异';
export const ANSWER_T0 = ACT.answer[0] + 0.1;
// callouts pinned to things (text, colour, window)
export const CALL = {
  heard: { s: '听到的 · 实测', c: C.pale, from: 0.15, to: 1.66 },
  expect: { s: '预期的 · 示意', c: C.pale, from: 0.62, to: 1.66 },
  miss: { s: '这一下没出现', c: C.blue, from: 1.66, to: 2.98 },
  big: { s: '重拍 · 该来了', c: C.orange, from: 3.45, to: 4.27 },
  bass: { s: '低音回来 · 实测', c: C.orange, from: E.drop + 0.5, to: 6.35 },
  same: { s: '同一段原曲 · 实测', c: C.green, from: E.thinB + 0.25, to: E.dropB - 0.1 },
};
// footnotes (sources), small, bottom of the safe area
export const FOOT = [
  { from: E.thin2 - 0.4, to: E.bar16, lines: ['一项小研究：Salimpoor 等 2011，Nature Neuroscience', '8 人听自选的“起鸡皮疙瘩”音乐 · PET+fMRI · 图为示意'] },
  { from: E.bar17, to: E.bar6b, lines: ['Cheung 等 2019，Current Biology · 和弦序列实验', '不确定性 × 意外 → 好听程度 · 图为示意'] },
  { from: E.bar6b, to: ACT.answer[0], lines: ['Madison & Schiölde 2017，Frontiers in Neuroscience', '重复聆听实验：听得越多，往往越喜欢'] },
];
export const LABELS = ['现在', '规律', '少一下', '等到', '尾状核', '伏隔核', '期待', '高潮', '示意', '不确定性：难猜 →', '意外 ↑', '更好听', '第一遍', '这一遍'];

// ── Clawd: flat sprite poses. y = hop height (px), sy = squash, arm = [left, right] lift (grid units), flip = horizontal
// scale (for a spin), eye = gaze (grid units), blink 0..1 (1 = open)
const pop = (dt, a) => (dt < 0 ? 0 : a * (1 - Math.exp(-dt * 70)) * Math.exp(-dt * 9) * Math.cos(dt * 22));
const hopsFrom = (beats, h, d) => beats.map((b) => [b, h, d]);
export function clawdPose(t) {
  const p = { y: 0, sy: 1, arm: [0, 0], wave: 0, tuck: 0, flip: 1, roll: 0, eye: [0, 0], blink: 1 };
  const o = lastOnset(t), dt = o ? t - o.t : 9;
  const big = (d) => [E.drop, E.drop3, E.dropB].some((x) => Math.abs(x - d) < 1e-3);
  let hop = null;
  const hops = [[E.drop, 120, 0.6], [E.drop3, 45, 0.45], [E.dropB, 130, 0.62],
    ...hopsFrom(E.drop_beats.filter((b) => b > E.drop + 0.55 && b < 8.4), 26, 0.27),
    ...hopsFrom(E.dropB_beats.filter((b) => b > E.dropB + 0.6 && b < ANSWER_T0 + 0.3), 26, 0.27)];
  for (const h of hops) if (t >= h[0] && t < h[0] + h[2]) hop = h;
  if (hop) {
    const u = (t - hop[0]) / hop[2]; p.y = 4 * hop[1] * u * (1 - u); p.tuck = 0.7 * Math.sin(Math.PI * u); p.arm = [1.6 * Math.sin(Math.PI * u), 1.6 * Math.sin(Math.PI * u)];
    if (hop[0] === E.drop || hop[0] === E.dropB) p.flip = Math.cos(2 * Math.PI * easeInOut(u));
  } else {
    p.sy -= pop(dt, o && big(o.t) ? 0.25 : 0.1);
    if (dt < 0.12) p.y = 6 * (1 - dt / 0.12);
  }
  // the miss: startled, looks up at the empty ring
  if (t >= MISS.t && t < E.pickup + 0.15) { const u = smooth((t - MISS.t) / 0.1); p.eye = [-0.15 * u, -0.25 * u]; p.arm = [0.9 * u, 0.3 * u]; p.roll = 0.12 * u; }
  // builds: brace and look ahead (right)
  for (const [a, b] of [[E.build_downbeat, E.drop], [E.build2, E.drop3], [E.buildB, E.dropB]]) if (t >= a && t < b) { const u = smooth((t - a) / 1.5); p.sy *= 1 - 0.14 * u; p.eye = [0.25 * u, -0.15 * u]; p.arm = [-0.3 * u, -0.3 * u]; }
  // the map: Clawd is the probe — happy glow in the warm corners
  // the answer: wave
  if (t >= ANSWER_T0 + 0.5) { const w = t - ANSWER_T0 - 0.5; p.arm = [0.2, 2.2 * smooth(w / 0.15)]; p.wave = Math.sin(w * 13) * smooth(w / 0.2); }
  if ([0.95, 3.4, 11.6, 21.1, 26.4, 33.0, 38.6].some((b) => t >= b && t < b + 0.1)) p.blink = 0.15;
  return p;
}
