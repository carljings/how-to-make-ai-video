// text.js — every string the film draws (tools/fonts.mjs subsets exactly these). No narration.
// One short claim per musical moment; measured things say 实测, schematics say 示意 (see SCIENCE.md).
import { E, LAP2 } from './track.js';
// headlines: [from, to, lines]; a line = { s, px, w, accent }
export const HEAD = [
  [0, 2.1, [{ s: '这首开智小曲', px: 64, w: 500 }, { s: '为什么上头？', px: 120, w: 900, accent: '上头' }]],
  [E.build_downbeat, E.drop - 0.03, [{ s: '感觉到了吗？', px: 70, w: 500 }, { s: '它要冲了', px: 128, w: 900, accent: '冲' }]],
  [E.drop, 5.35, [{ s: '冲！', px: 260, w: 900, accent: '冲！' }]],
  [5.45, 8.45, [{ s: '鼓点一下接一下', px: 88, w: 900 }, { s: '间隔几乎一样', px: 88, w: 900, accent: '一样' }]],
  [8.5, 10.6, [{ s: '大脑很快学会', px: 88, w: 900 }, { s: '猜下一下在哪', px: 88, w: 900, accent: '猜' }]],
  [10.62, E.thin2 - 0.05, [{ s: '拍子好猜，', px: 88, w: 900 }, { s: '就容易跟着动', px: 88, w: 900, accent: '跟着动' }]],
  [E.thin2, E.build2 - 0.05, [{ s: '低音抽走，', px: 88, w: 900 }, { s: '开始爬坡', px: 104, w: 900, accent: '爬坡' }]],
  [E.build2, E.drop3 - 0.03, [{ s: '还没冲下去，', px: 80, w: 900 }, { s: '大脑已经在期待', px: 88, w: 900, accent: '期待' }]],
  [E.drop3, E.bar16 - 0.05, [{ s: '等待和冲下，', px: 80, w: 900 }, { s: '亮起的不是同一处', px: 84, w: 900, accent: '不是同一处' }]],
  [E.bar16, E.bar17 - 0.03, [{ s: '很好猜的时候……', px: 88, w: 900 }]],
  [E.bar17, E.join - 0.05, [{ s: '来点意外，', px: 104, w: 900, accent: '意外' }, { s: '更好听', px: 104, w: 900 }]],
  [E.join, E.bar5b - 0.03, [{ s: '很难猜的时候……', px: 88, w: 900 }]],
  [E.bar5b, E.bar6b - 0.05, [{ s: '落回预期，', px: 104, w: 900, accent: '预期' }, { s: '也更好听', px: 104, w: 900 }]],
  [E.bar6b, E.thinB - 0.05, [{ s: '那么，', px: 80, w: 900 }, { s: '再听一遍呢？', px: 104, w: 900, accent: '再听一遍' }]],
  [E.thinB, E.buildB - 0.05, [{ s: '同一段原曲，', px: 80, w: 900 }, { s: '第二圈', px: 128, w: 900, accent: '第二圈' }]],
  [E.buildB, E.dropB - 0.03, [{ s: '这一次，', px: 80, w: 900 }, { s: '你知道它要来', px: 104, w: 900, accent: '知道' }]],
  [E.dropB, 35.0, [{ s: '冲！', px: 260, w: 900, accent: '冲！' }]],
  [35.05, 36.3, [{ s: '听熟了，', px: 88, w: 900 }, { s: '往往更喜欢', px: 104, w: 900, accent: '更喜欢' }]],
].map(([from, to, lines]) => ({ from, to, lines }));

// the answer (from ANS_T0; one line per beat), then a modest note
export const ANS_T0 = 36.36;
export const ANSWER_TITLE = { s: '为什么上头？', accent: '上头' };
export const ANSWER = [
  { n: '1', s: '拍子好猜，跟得上', c: '#FFB38A' },
  { n: '2', s: '等待本身，也在奖赏里', c: '#7FC8FF' },
  { n: '3', s: '好猜里带点意外', c: '#FFE07A' },
  { n: '4', s: '听熟了，往往更喜欢', c: '#9EE6A8' },
];
export const ANSWER_NOTE = '这些是一部分原因，因人而异';

// small labels pinned to things in the scene / tags under the headline
export const CALL = {
  beat: { s: '鼓点 · 原曲实测', from: 5.6, to: 8.4 },
  guess: { s: '预期 · 示意', from: 8.65, to: 10.55 },
  thin: { s: '低音变薄 · 原曲实测', from: E.thin2 + 0.25, to: E.build2 - 0.1 },
  same: { s: '和开头是同一段原曲音频 · 实测', from: E.thinB + 0.25, to: E.buildB - 0.1 },
  brain: { s: '大脑 · 示意', from: E.build2 - 0.05, to: E.bar16 - 0.1 },        // after the "低音变薄" tag has gone (same place)
  wait: { s: '等待时 · 尾状核', from: E.build2 - 0.05, to: E.bar16 - 0.1 },
  peak: { s: '冲下时 · 伏隔核', from: E.build2 - 0.05, to: E.bar16 - 0.1 },
};
// footnotes (bottom): [from, to, lines]
export const FOOT = [
  [E.build2, E.bar16 - 0.1, ['一项小研究：Salimpoor 等 2011，Nature Neuroscience', '8 人自选“起鸡皮疙瘩”音乐 · PET+fMRI · 图为示意']],
  [E.bar16 + 0.2, E.bar6b - 0.1, ['Cheung 等 2019，Current Biology · 和弦序列实验', '好不好听，取决于“难猜”和“意外”的搭配 · 图为示意']],
  [35.1, 36.3, ['Madison & Schiölde 2017', 'Frontiers in Neuroscience · 反复聆听实验']],
  [ANS_T0 + 2.2, 99, ['画面为示意 · 鼓点、低音与重放段落取自原曲实测']],
].map(([from, to, lines]) => ({ from, to, lines }));
export const allText = () => [...HEAD.flatMap((h) => h.lines.map((l) => l.s)), ANSWER_TITLE.s, ...ANSWER.flatMap((a) => [a.n, a.s]), ANSWER_NOTE,
  ...Object.values(CALL).map((c) => c.s), ...FOOT.flatMap((f) => f.lines)];
export { LAP2 };
