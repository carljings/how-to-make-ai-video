#!/usr/bin/env node
// textcheck.mjs — reading holds and overlaps of the cards (as drawn by film.js: glyph i starts at at + 0.022 i and lands
// 0.3 s later; a 'cut' card vanishes on its cut frame), plus: every drawn character exists in the font subset.
// Rule (≈ 8 CJK chars/s): each line stays ≥ max(0.8, 0.3 + 0.13 × CJK) s after landing; the card ≥ 0.3 + 0.11 × all CJK.
import fs from 'node:fs';
import path from 'node:path';
import { CARDS, cjk, END, FPS, frameOf, allText } from '../src/timeline.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const need = (s) => Math.max(0.8, 0.3 + 0.13 * cjk(s));
const landed = (l) => l.at + 0.3 + 0.022 * ([...l.text].length - 1);
let bad = 0;
for (const c of CARDS) {
  const out = c.exit === 'cut' ? frameOf(c.out) / FPS : c.out, all = c.lines.map((l) => l.text).join('');
  const per = c.lines.map((l) => ({ text: l.text, hold: out - landed(l), need: need(l.text) }));
  const whole = { hold: out - landed(c.lines[0]), need: 0.3 + 0.11 * cjk(all) };
  const ok = per.every((p) => p.hold >= p.need - 0.05) && whole.hold >= whole.need - 0.05;
  if (!ok) bad++;
  console.log(`${ok ? 'pass' : 'FAIL'} ${c.id.padEnd(7)} card ${whole.hold.toFixed(2)}/${whole.need.toFixed(2)}  ${per.map((p) => `${p.text} ${p.hold.toFixed(2)}/${p.need.toFixed(2)}`).join(' | ')}`);
}
for (let i = 0; i < CARDS.length; i++) for (let j = i + 1; j < CARDS.length; j++) {
  const a = CARDS[i], b = CARDS[j], tail = (c) => (c.exit === 'cut' ? 0 : 0.35), a1 = a.out + tail(a), b1 = b.out + tail(b);
  const ov = Math.min(a1, b1) - Math.max(a.lines[0].at, b.lines[0].at);
  if (ov > 0.001 && Math.abs(a.y - b.y) < 260) { console.log(`OVERLAP ${a.id} × ${b.id} ${ov.toFixed(2)} s`); bad++; }
}
const have = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/fonts/fonts.json'), 'utf8')).chars);
const missing = [...new Set(allText().join(''))].filter((ch) => !have.has(ch) && ch.trim());
if (missing.length) { console.log('MISSING GLYPHS', missing.join('')); bad++; }
console.log(`${CARDS.length} cards, ${CARDS.reduce((n, c) => n + c.lines.reduce((m, l) => m + cjk(l.text), 0), 0)} CJK chars, END ${END.toFixed(3)}; glyphs ${missing.length ? 'MISSING' : 'all in subset'}`);
process.exit(bad ? 1 : 0);
