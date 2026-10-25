// text.js — every string drawn (fonts.mjs subsets exactly these; render.mjs --textcheck checks their boxes). No narration.
import { CUES } from './cues.js';
const E = CUES.events;
export const TEXT = {
  title: { from: 0, to: E.gap[0] + 0.12, fadeOut: 0.18, lines: [{ s: '这首开智小曲', w: 500, px: 62, y: 285 }, { s: '为什么上头？', w: 900, px: 124, y: 430, accent: '上头' }] },
  ask: { from: E.gap[0] + 0.14, to: E.build_downbeat, fadeOut: 0.12, rise: 14, lines: [{ s: '下一下呢？', w: 900, px: 92, y: 400 }] },
  land: { from: E.bar_lines[2] + 0.2, to: CUES.end_s + 1, rise: 16, lines: [{ s: '明知道要来，', w: 900, px: 80, y: 300 }, { s: '还是忍不住等它', w: 900, px: 80, y: 410, accent: '等它' }] },
};
export const allText = () => Object.values(TEXT).flatMap((b) => b.lines.map((l) => l.s));
