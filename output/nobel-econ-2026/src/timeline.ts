// timeline.ts: the single source of truth for timing. Scenes, on-screen text and the score all read from here.
// There is no narration: the story is told in short text beats (one or two lines, at most about 10 characters a line,
// each held at least 1.5 s), the pictures and the music. 120 BPM: a beat is 0.5 s, a bar 2 s; cuts sit on beats.
import {rng} from './lib/math';

export const W = 1080, H = 1920, FPS = 30, BPM = 120;
export const BEAT = 60 / BPM, BAR = 4 * BEAT;
export const DUR = 58;
export const FRAMES = Math.round(DUR * FPS);

export type SceneId = 'hook' | 'split' | 'nobel' | 'spread' | 'surprise' | 'types' | 'shops' | 'bank' | 'then' | 'globe' | 'crowd' | 'end';
// a..b: when the scene owns the screen; the cut is at b (= the next scene's a)
export const SCENES: {id: SceneId; a: number; b: number; name: string}[] = [
  {id: 'hook', a: 0, b: 4, name: '01 Hook: 多给你1000块'},
  {id: 'split', a: 4, b: 8.5, name: '02 Twist: 只发一次 vs 每月都有'},
  {id: 'nobel', a: 8.5, b: 13, name: '03 The prize'},
  {id: 'spread', a: 13, b: 19, name: '04 Hall: spread it out'},
  {id: 'surprise', a: 19, b: 25, name: '05 Hall 1978: only surprises'},
  {id: 'types', a: 25, b: 30.5, name: '06 Hall & Mishkin: 80 / 20'},
  {id: 'shops', a: 30.5, b: 36.5, name: '07 Woodford: prices look ahead'},
  {id: 'bank', a: 36.5, b: 41, name: '08 The central bank speaks'},
  {id: 'then', a: 41, b: 46, name: '09 1994 vs now'},
  {id: 'globe', a: 46, b: 49.5, name: '10 Central banks everywhere'},
  {id: 'crowd', a: 49.5, b: 55, name: '11 Millions of you'},
  {id: 'end', a: 55, b: DUR, name: '12 Back to the 1000'},
];
export const scene = (id: SceneId) => SCENES.find((s) => s.id === id)!;
export type CutKind = 'freeze' | 'curtain' | 'whip' | 'zoom' | 'rise' | 'iris' | 'flash' | 'wipe';
export const CUT_KIND: Partial<Record<SceneId, CutKind>> = {
  split: 'freeze', nobel: 'curtain', spread: 'whip', surprise: 'zoom', types: 'whip', shops: 'whip', bank: 'rise', then: 'iris', globe: 'zoom', crowd: 'flash', end: 'wipe',
};
export const TRANSITION = 0.45; // seconds a transition takes after its cut
export const YELLOW_SCENES: SceneId[] = ['hook', 'split', 'end'];

// ---- the words: one beat at a time. **keyword** takes the accent colour ----
export interface Beat { a: number; b: number; kicker?: string; lines: string[] }
export const NOBEL_KICKER = '2026诺贝尔经济学奖 · 刚刚揭晓';
export const BEATS: Beat[] = [
  {a: 0, b: 4, kicker: NOBEL_KICKER, lines: ['多给你**1000**块', '你会花，还是存？']},
  {a: 4.1, b: 6.1, kicker: NOBEL_KICKER, lines: ['先别急！']},
  {a: 6.1, b: 8.5, kicker: NOBEL_KICKER, lines: ['这两种', '你花得**一样**吗？']},
  {a: 8.85, b: 13, kicker: '2026 · 刚刚揭晓', lines: ['这个问题背后的道理', '刚拿了**诺贝尔奖**']},
  {a: 13.1, b: 15.1, kicker: '发现① · 霍尔', lines: ['花钱，看的是**明天**']},
  {a: 15.1, b: 17.1, kicker: '发现① · 霍尔', lines: ['一次性的钱', '**摊开**慢慢花']},
  {a: 17.1, b: 19, kicker: '发现① · 霍尔', lines: ['每月都有', '才会**马上**多花']},
  {a: 19.1, b: 21.1, kicker: '霍尔 · 1978', lines: ['花钱的变化', '几乎**没法预测**']},
  {a: 21.1, b: 23.1, kicker: '霍尔 · 1978', lines: ['能预料的', '早就**算进去了**']},
  {a: 23.1, b: 25, kicker: '霍尔 · 1978', lines: ['只有**意外**', '才会让你改主意']},
  {a: 25.1, b: 26.8, kicker: '霍尔、米什金 · 1982', lines: ['测了两千多户家庭']},
  {a: 26.8, b: 28.6, kicker: '霍尔、米什金 · 1982', lines: ['约**八成**：往前看']},
  {a: 28.6, b: 30.5, kicker: '霍尔、米什金 · 1982', lines: ['**两成**：挣多少花多少']},
  {a: 30.6, b: 32.5, kicker: '发现② · 伍德福德', lines: ['商家定价', '也看**明天**']},
  {a: 32.5, b: 34.5, kicker: '发现② · 伍德福德', lines: ['都觉得要涨价', '就**提前涨**']},
  {a: 34.5, b: 36.5, kicker: '发现② · 伍德福德', lines: ['涨价', '就**真的来了**']},
  {a: 36.6, b: 38.4, kicker: '央行的武器', lines: ['除了**利率**']},
  {a: 38.4, b: 41, kicker: '央行的武器', lines: ['还有一句', '**让人相信的话**']},
  {a: 41.1, b: 43.8, kicker: '冷知识', lines: ['**1994**年以前', '美联储开完会**不说**']},
  {a: 43.8, b: 46, kicker: '冷知识', lines: ['现在：', '**提前告诉你**下一步']},
  {a: 46.1, b: 49.5, kicker: '新凯恩斯模型', lines: ['全世界的**央行**', '都在用这类模型']},
  {a: 49.6, b: 51.3, lines: ['千千万万个**你**']},
  {a: 51.3, b: 53, lines: ['对**明天**的判断']},
  {a: 53, b: 55, lines: ['加起来', '= **经济的起落**']},
  {a: 55.1, b: DUR, kicker: NOBEL_KICKER, lines: ['那**1000**块', '你会花吗？']},
];

// ---- progress bar: four chapters ----
export const CHAPTERS: [number, string][] = [[0, '问题'], [13, '霍尔'], [30.5, '伍德福德'], [46, '答案']];

// ---- story cues (absolute seconds) ----
export const HOOK = {coins: 0.05, buttons: [0.62, 0.8] as [number, number], cursor: 1.1};
export const SPLIT = {freeze: 4, apart: 4.25, once: 4.75, monthly: 5.25};
export const NOBEL = {medal: 9.35, names: 10.3, shine: 10.9};
export const SPREAD = {burst: 15.25, slow: 16.0, monthly: 17.25, now: 17.6};
export const SURPRISE = {stamp1: 21.35, stamp2: 22.1, bolt: 23.25};
export const TYPES = {row: 25.25, eighty: 26.9, twenty: 28.7};
export const SHOPS = {think: 32.6, flip: 33.3, real: 34.6};
export const BANK = {mic: 38.5, calm: 39.5};
export const THEN = (() => {
  const now = 43.8, R = rng(5);
  // camera flashes at the press conference: [x, y, time]
  const flashes = Array.from({length: 9}, () => [590 + R() * 320, 760 + R() * 420, now + 0.15 + R() * 1.9] as [number, number, number]);
  return {now, tell: 44.5, flashes};
})();
export const GLOBE = {pins: 46.5, model: 48.0};
export const CROWD = {zoom: 49.65, tomorrow: 51.3, sum: 53.0, wave: 53.0};
export const END = {options: 55.5, which: 56.5};

// ---- helpers ----
export const sceneAt = (t: number) => SCENES.find((s) => t >= s.a && t < s.b) ?? SCENES[SCENES.length - 1];
// 1 right after each event, decaying with time constant k (s)
export const pulse = (t: number, times: number[], k = 0.25) => {
  let v = 0;
  for (const p of times) if (t >= p && t - p < 8 * k) v = Math.max(v, Math.exp(-(t - p) / k));
  return v;
};
