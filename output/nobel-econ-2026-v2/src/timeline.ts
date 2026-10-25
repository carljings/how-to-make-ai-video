// timeline.ts: the single source of truth for timing. Four Seedance clips play one after another; the text, labels and
// subtitles laid over them are timed here in absolute seconds. Clip lengths come from src/clips.json (scripts/prep.mjs);
// subtitle timings from src/captions.json (scripts/captions.py: the script as spoken, timed by a transcription).
import CLIPS from './clips.json';
import CAPS from './captions.json';

export const W = 1080, H = 1920, FPS = 24;
export const CLIP_LIST = (() => {
  let at = 0;
  return CLIPS.clips.map((c) => { const x = {...c, a: at, b: at + c.dur}; at += c.dur; return x; });
})();
export const DUR = CLIP_LIST[CLIP_LIST.length - 1].b;
export const FRAMES = Math.round(DUR * FPS);
const [C1, C2, C3, C4] = CLIP_LIST.map((c) => c.a);

export interface Caption { a: number; b: number; text: string; clip: string }
export const CAPTIONS: Caption[] = CAPS;

// ---- the big text at the top: kicker + one or two lines; **keyword** turns gold ----
export interface Head { a: number; b: number; kicker?: string; lines: string[]; at?: number[]; size?: number }
export const NOBEL_KICKER = '2026诺贝尔经济学奖 · 刚刚揭晓';
export const HEADS: Head[] = [
  {a: 0, b: C1 + 3.5, kicker: NOBEL_KICKER, lines: ['多给你**1000**块', '你会花，还是存？']},
  {a: C1 + 3.5, b: C1 + 9.0, kicker: NOBEL_KICKER, lines: ['你花得**一样**吗？']},
  {a: C1 + 9.2, b: C1 + 12.9, kicker: '2026 · 刚刚揭晓', lines: ['**诺贝尔经济学奖**']},
  {a: C2 + 0.0, b: C2 + 5.6, kicker: '发现① · 霍尔', lines: ['一次性的钱', '**摊开**慢慢花'], at: [C2 + 0.1, C2 + 2.6]},
  {a: C2 + 5.6, b: C2 + 8.4, kicker: '发现① · 霍尔', lines: ['每月都有', '**马上**多花']},
  {a: C2 + 8.4, b: C2 + 12.4, kicker: '霍尔 · 1978', lines: ['能预料的', '早就**算进去了**']},
  {a: C2 + 12.4, b: C3, kicker: '霍尔 · 1978', lines: ['只有**意外**', '才会改主意']},
  {a: C3 + 0.0, b: C3 + 6.0, kicker: '霍尔、米什金 · 1982', lines: ['约**80%** 往前看', '**20%** 挣多少花多少'], at: [C3 + 0.2, C3 + 3.7]},
  {a: C3 + 6.0, b: C3 + 10.9, kicker: '发现② · 伍德福德', lines: ['商家定价', '也看**明天**']},
  {a: C3 + 10.9, b: C4, kicker: '发现② · 伍德福德', lines: ['觉得要涨，就**提前涨**', '涨价就**真来了**'], at: [C3 + 11.0, C3 + 13.5]},
  {a: C4 + 0.0, b: C4 + 7.3, kicker: '央行的武器', lines: ['除了利率，', '还有**一句话**'], at: [C4 + 3.6, C4 + 5.0]},
  {a: C4 + 7.3, b: C4 + 11.2, lines: ['经济的起落', '= 千千万万个**你**'], at: [C4 + 7.3, C4 + 8.2]},
  {a: C4 + 11.2, b: DUR, kicker: NOBEL_KICKER, lines: ['那**1000**块', '你会花吗？']},
];

// ---- labels placed in the picture ----
export const MONEY = {a: 0.0, b: C1 + 2.8};                       // "+¥1000" sticker by the phone, gone before the cut at 3 s
export const PILLS = {a: C1 + 3.7, b: C1 + 6.75, once: [300, 840] as [number, number], monthly: [640, 840] as [number, number], monthlyAt: C1 + 5.6};
export const LAUREATES = {a: C1 + 12.9, b: C2, reason: '获奖理由：为宏观经济稳定政策奠定微观经济学基础'};
export const FINE = {a: C3 + 0.3, b: C3 + 6.0, text: 'Hall & Mishkin 1982 · 美国2309户家庭 · 比例因时因地而异'};
export const TAGS = {a: C3 + 9.3, b: C3 + 11.75, from: '¥10', to: '¥12', flip: C3 + 10.0};
export const WORLD = {a: C4 + 5.2, b: C4 + 7.3, text: '全世界的央行，都在用这类模型'};
export const CTA = {a: C4 + 11.6, b: DUR, options: ['往前看', '挣多少花多少'], call: '评论区说说：你是哪种人？'};

// ---- progress: one segment per clip ----
export const CHAPTERS = CLIP_LIST.map((c) => [c.a, c.b] as [number, number]);
