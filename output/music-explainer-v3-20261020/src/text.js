// text.js — every string drawn: one headline at a time (top) and short callouts pinned to what they name. No narration.
// Claims at the strength the sources support (SCIENCE.md): measured things say 实测, expectation graphics say 示意,
// no numbers about any brain. Each claim appears only after the event that shows it.
import { LINES, DROP } from './plan.js';
export const HEAD = [
  { key: 'title', lines: [{ s: '这首开智小曲', w: 500, px: 62 }, { s: '为什么上头？', w: 900, px: 128, accent: '上头' }] },
  { key: 'gap', lines: [{ s: '少了一下，', w: 900, px: 104 }, { s: '你却在等它', w: 900, px: 104, accent: '等它' }] },
  { key: 'rule', lines: [{ s: '节拍一重复，', w: 900, px: 96 }, { s: '大脑就预期下一拍', w: 900, px: 96, accent: '预期' }] },
  { key: 'drop', lines: [{ s: '等到了！', w: 900, px: 164, accent: '等到' }, { s: '重拍正落在预期的那一拍', w: 500, px: 54 }] },
  { key: 'sum', lines: [{ s: '上头的原因之一：', w: 500, px: 58 }, { s: '听出规律 → 预期 → 等到', w: 900, px: 70, accent: '预期' }] },
].map((h) => ({ ...h, from: LINES[h.key][0], to: LINES[h.key][1] }));
export const CALL = {
  heard: { s: '听到的 · 实测', from: 0.15, to: 1.66 },
  expect: { s: '预期的 · 示意', from: 0.62, to: 1.66 },
  miss: { s: '这一下没出现', from: 1.66, to: 2.98, color: '#5EE6FF' },
  big: { s: '重拍 · 该来了', from: 3.45, to: 4.27 },
  bass: { s: '低音回来 · 实测', from: DROP + 0.5, to: 6.4, color: '#FF9A4D' },
  now: { s: '现在', from: 0, to: 8.45 },
};
// recap labels over the whole record
export const RECAP_LABELS = [{ s: '规律', key: 'rule' }, { s: '少一下', key: 'miss' }, { s: '等到', key: 'drop' }];
export const allText = () => [...HEAD.flatMap((h) => h.lines.map((l) => l.s)), ...Object.values(CALL).map((c) => c.s), ...RECAP_LABELS.map((r) => r.s)];
