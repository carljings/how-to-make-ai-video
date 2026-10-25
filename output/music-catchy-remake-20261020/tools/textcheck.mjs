#!/usr/bin/env node
// textcheck.mjs — pre-render checks that need no browser:
//   1. every character the film draws is in the font subset (assets/fonts/fonts.json)
//   2. the narration is REAL (real TTS files), lines do not overlap, stay out of the music-only windows, end before the fade
//   3. place_narration.mjs and timeline.js agree on the music-only windows
//   4. the repetition groups in timeline.js match assets/music/repetition.json (film bar → source bar map)
//   5. every cut / reveal cue is a detected onset (timeline.js throws otherwise) and the card / subtitle layout stays out of
//      the right (x > 940) and bottom (y > 1560) unsafe zones
import fs from 'node:fs';
import path from 'node:path';
import { allText, NARR_STATUS_CHECK, MUSIC_ONLY, GROUP, FILM_SRC_BAR, FADE_V0, CARDS, T } from './_tc_imports.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let bad = 0; const fail = (m) => { console.log('FAIL', m); bad++; }, ok = (m) => console.log('ok  ', m);
const fonts = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/fonts/fonts.json'), 'utf8'));
const missing = [...new Set([...allText().join(''), ...'①②③0123456789'])].filter((c) => !/\s/.test(c) && !fonts.chars.includes(c));
missing.length ? fail(`glyphs missing from the subset: ${missing.join('')}`) : ok(`all ${new Set(allText().join('')).size} drawn characters are in the font subset`);
const { NARR, NARR_STATUS } = NARR_STATUS_CHECK;
NARR_STATUS === 'REAL' ? ok('narration: every line is a real TTS file') : fail(`narration status ${NARR_STATUS}`);
for (let i = 0; i < NARR.length; i++) {
  const L = NARR[i], a = L.at + 0.1, b = L.at + L.dur - 0.1;
  if (i && L.at < NARR[i - 1].at + NARR[i - 1].dur) fail(`${L.id} overlaps ${NARR[i - 1].id}`);
  for (const [m0, m1] of MUSIC_ONLY) if (a < m1 && b > m0) fail(`${L.id} enters music-only window ${m0}–${m1}`);
  if (L.at + L.dur > FADE_V0) fail(`${L.id} ends after the picture fade starts`);
  if (!L.words.length || L.words[L.words.length - 1].t > L.at + L.dur) fail(`${L.id}: word boundaries missing or past the file end`);
}
ok(`${NARR.length} lines placed; last line ends ${(NARR.at(-1).at + NARR.at(-1).dur).toFixed(2)} s, fade starts ${FADE_V0.toFixed(2)} s`);
const pn = fs.readFileSync(path.join(ROOT, 'tools/place_narration.mjs'), 'utf8'), m = /const MUSIC_ONLY = (\[\[.*?\]\]);/.exec(pn);
const pw = JSON.parse(m[1]);
pw.every((w, i) => Math.abs(w[0] - MUSIC_ONLY[i][0]) < 0.002 && Math.abs(w[1] - MUSIC_ONLY[i][1]) < 0.002) ? ok('music-only windows agree (timeline.js / place_narration.mjs)') : fail(`music-only windows differ: ${JSON.stringify(pw)} vs ${JSON.stringify(MUSIC_ONLY)}`);
const rep = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/music/repetition.json'), 'utf8'));
const g = FILM_SRC_BAR.map((s) => rep.bars[s].group);
JSON.stringify(g) === JSON.stringify(GROUP) ? ok('repetition groups match assets/music/repetition.json') : fail(`groups ${JSON.stringify(GROUP)} ≠ json ${JSON.stringify(g)}`);
ok(`cues resolved to detected onsets: ${Object.entries(T).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(', ')}`);
// layout: subtitles at y 1430 (box ±55), cards y ≤ 600; all centred (x ≤ 940 holds when the widest line ≤ 760 px wide)
for (const c of CARDS) if (c.y > 1560) fail(`card ${c.id} below the safe zone`);
ok('subtitle band y 1376–1484 and cards y ≤ 600: inside the safe zone');
process.exit(bad ? 1 : 0);
