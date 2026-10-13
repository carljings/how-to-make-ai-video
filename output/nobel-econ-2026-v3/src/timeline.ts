// timeline.ts: the single source of truth for timing. Three Seedance clips play one after another; the text, labels and
// subtitles laid over them are timed here in absolute seconds. Clip lengths come from src/clips.json (scripts/prep.mjs);
// subtitle timings from src/captions.json (scripts/captions.py: the script as spoken, timed by a transcription). The cue
// times below are word onsets from the same transcriptions (tasks/*.asr-medium.json), measured from each clip's start.
import CLIPS from './clips.json';
import CAPS from './captions.json';

export const W = 1080, H = 1920, FPS = 24;
export const CLIP_LIST = (() => {
  let at = 0;
  return CLIPS.clips.map((c) => { const x = {...c, a: at, b: at + c.dur}; at += c.dur; return x; });
})();
export const DUR = CLIP_LIST[CLIP_LIST.length - 1].b;
export const FRAMES = Math.round(DUR * FPS);
const [A, B, C] = CLIP_LIST.map((c) => c.a);

export interface Caption { a: number; b: number; text: string; clip: string }
export const CAPTIONS: Caption[] = CAPS;

// ---- the big text at the top: kicker + one or two lines; **keyword** takes the head's key colour ----
// quiet: the head says what the narrator says, so the subtitle steps aside. tip: lines fall in like dominoes.
// y: the first line's top (the kicker sits just above it); the default leaves the middle of the picture to the faces.
export type Tone = 'bad' | 'gold' | 'good';
export interface Head { a: number; b: number; kicker?: string; lines: string[]; at?: number[]; tone?: Tone; size?: number; y?: number; quiet?: boolean; tip?: boolean; rumor?: boolean }
export const HOOK_KICKER = '看懂2026诺贝尔经济学奖';
export const HEADS: Head[] = [
  {a: 0, b: A + 3.125, kicker: HOOK_KICKER, lines: ['一句话，', '让整个小镇**破产**了'], tone: 'bad', quiet: true},
  {a: A + 6.48, b: A + 9.875, lines: ['“听说明年，', '日子要**不好过**了”'], at: [A + 6.48, A + 8.62], tone: 'bad', quiet: true, rumor: true},
  {a: A + 10.24, b: A + 12.88, lines: ['传遍了**整个小镇**'], tone: 'bad'},
  {a: A + 12.88, b: B, lines: ['于是每个人都想：', '先**省着点**吧'], at: [A + 12.88, A + 14.16], tone: 'bad'},
  {a: B + 0.0, b: B + 2.52, lines: ['没客人', '→ 不进面粉'], at: [B + 0.05, B + 1.38], tone: 'bad', tip: true},
  {a: B + 2.52, b: B + 4.94, lines: ['没生意', '→ 辞掉伙计'], at: [B + 2.52, B + 3.7], tone: 'bad', tip: true},
  {a: B + 4.94, b: B + 7.0, lines: ['没工资', '→ **更不敢花**'], at: [B + 4.94, B + 6.12], tone: 'bad', tip: true},
  {a: B + 8.16, b: B + 10.2, lines: ['谣言，', '自己变成了**真的**'], at: [B + 8.16, B + 8.68], tone: 'bad', quiet: true, y: 1000, size: 124},
  {a: B + 11.4, b: C, kicker: '2026 · 刚刚揭晓', lines: ['这背后的道理', '拿了**诺贝尔经济学奖**'], at: [B + 11.4, B + 11.75], tone: 'gold'},
  {a: C + 2.94, b: C + 6.04, kicker: '得主的发现', lines: ['花不花钱，', '看**对明天的判断**'], at: [C + 2.94, C + 4.32], tone: 'gold'},
  {a: C + 6.84, b: C + 11.45, kicker: '今天央行的武器', lines: ['除了调利率，', '还有：**说话**'], at: [C + 8.22, C + 10.66], tone: 'gold', quiet: true, y: 1100},
  {a: C + 14.2, b: C + 16.875, lines: ['一句让人**相信**的话', '大家又**敢花钱**了'], at: [C + 14.2, C + 15.82], tone: 'good'},
];

// ---- labels placed in the picture ----
export const STAMP = {a: A + 3.125, b: A + 6.0, text: '三天前'};                    // lands on the cut to the sunny square
export const LAUREATES = {a: C + 0.0, b: C + 2.94, reason: '获奖理由：为宏观经济稳定政策奠定微观经济学基础'};
export const BUBBLE = {a: C + 11.5, b: C + 13.25, text: '我们会稳住经济！'};         // the bank chief's own line, under his mouth
export const FABLE = '寓言示意 · 非真实事件';
export const POLL = {a: C + 17.6, b: DUR, title: ['下次听到“日子要不好过了”', '你会先省钱吗？'], options: ['先省钱', '照常花'], call: '评论区说说'};

// ---- progress: one segment per clip ----
export const CHAPTERS = CLIP_LIST.map((c) => [c.a, c.b] as [number, number]);
