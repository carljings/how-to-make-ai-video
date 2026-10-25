// text.js — every string the preview draws (the font subset and tools/textcheck.mjs read this list). Music only: no narration.
import { CUES } from './cues.js';
const E = CUES.events;
export const TEXT = {
  title: { lines: [{ s: '这首开智小曲', w: 500, px: 62, y: 300 }, { s: '为什么上头？', w: 900, px: 128, y: 450, accent: '上头' }], from: 0, to: E.withheld[0] + 0.3 },
  ask: { lines: [{ s: '下一拍？', w: 900, px: 88, y: 1220 }], from: E.launch + 0.06, to: E.drop },  // between Clawd and the ghost stone
  land: { lines: [{ s: '先让你猜中，', w: 900, px: 84, y: 310 }, { s: '再给你意外', w: 900, px: 84, y: 420, accent: '意外' }], from: E.final + 0.35, to: CUES.end_s },
};
export const allText = () => Object.values(TEXT).flatMap((b) => b.lines.map((l) => l.s));
