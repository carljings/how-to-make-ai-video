// text.js — every string the film draws (tools/fonts.mjs subsets exactly these glyphs). No narration.
import { HEAD, ANSWER, ANSWER_NOTE, CALL, FOOT, LABELS } from './plan.js';
export const allText = () => [...HEAD.flatMap((h) => h.lines.map((l) => l.s)), ...ANSWER.flatMap((a) => [a.n, a.s]), ANSWER_NOTE,
  ...Object.values(CALL).map((c) => c.s), ...FOOT.flatMap((f) => f.lines), ...LABELS];
