#!/usr/bin/env node
// textcheck.mjs — reading holds and overlaps of the type cards (timing as drawn by film.js: a line's glyph i starts at
// at + 0.022 i and lands 0.3 s later; the card fades from `out`). v2 rule (faster short-video pacing, ~8 CJK chars/s):
//   1. after a line has landed it stays ≥ max(0.8, 0.3 + 0.13 × CJK chars) s;  2. from the first landing to the exit the
//   whole card stays ≥ 0.3 + 0.11 × all its CJK chars;  3. no two cards are on screen at once in the same band.
// (v1.x used max(1.2, 0.4 + 0.2 × chars); the user asked for a faster film and said the heuristic is not a hard limit.)
import { CARDS, cjk, END, FPS, frameOf } from '../src/timeline.js';
const readNeed = (s) => Math.max(0.8, 0.3 + 0.13 * cjk(s));
let bad = 0;
const landed = (l) => l.at + 0.3 + 0.022 * ([...l.text].length - 1);   // film.js: glyph i starts at at + 0.022 i, lands 0.3 s later
const rows = CARDS.map((c) => {
  const first = landed(c.lines[0]), all = c.lines.map((l) => l.text).join('');
  const out = c.exit === 'cut' ? frameOf(c.out) / FPS : c.out;   // a cut exit vanishes on the cut's frame
  const per = c.lines.map((l) => ({ text: l.text, hold: out - landed(l), need: l.role === 'note' ? 1.2 : readNeed(l.text) }));
  const whole = { hold: out - first, need: c.lines.every((l) => l.role === 'note') ? 1.2 : 0.3 + 0.11 * cjk(all) };
  const ok = per.every((p) => p.hold >= p.need - 0.05) && whole.hold >= whole.need - 0.05;
  if (!ok) bad++;
  return { id: c.id, ok, whole: `${whole.hold.toFixed(2)}/${whole.need.toFixed(2)}`, lines: per.map((p) => `${p.text} ${p.hold.toFixed(2)}/${p.need.toFixed(2)}`).join(' | ') };
});
for (const r of rows) console.log(`${r.ok ? 'pass' : 'FAIL'} ${r.id.padEnd(7)} card ${r.whole}  ${r.lines}`);
// overlaps (time windows incl. exit, and vertical bands)
for (let i = 0; i < CARDS.length; i++) for (let j = i + 1; j < CARDS.length; j++) {
  const a = CARDS[i], b = CARDS[j], tail = (c) => (c.exit === 'fall' ? 0.8 : c.exit === 'cut' ? 0 : 0.25), a1 = a.out + tail(a), b1 = b.out + tail(b);
  const tOverlap = Math.min(a1, b1) - Math.max(a.lines[0].at, b.lines[0].at);
  if (tOverlap > 0 && Math.abs(a.y - b.y) < 260) { console.log(`OVERLAP ${a.id} × ${b.id} for ${tOverlap.toFixed(2)} s`); bad++; }
}
console.log(`${CARDS.length} cards, ${CARDS.reduce((n, c) => n + c.lines.reduce((m, l) => m + cjk(l.text), 0), 0)} CJK characters, END ${END}`);
process.exit(bad ? 1 : 0);
