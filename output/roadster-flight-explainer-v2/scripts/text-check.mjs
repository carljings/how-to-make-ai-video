// text-check.mjs: every string the film puts on screen must be covered by the bundled font subset
// (support/fonts/subset-characters.txt, built by Codex). Collects: src/film/copy.ts and the cover's string literals,
// the film.py / shots.py diagram labels and notes exported in src/data/overlay.json, and the approved captions.
//   node scripts/text-check.mjs            → prints missing characters (exit 1 if any), writes out/text-inventory.json
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const subset = new Set([...read('support/fonts/subset-characters.txt')]);
const strings = new Map();   // text → where
const add = (text, where) => { if (/[^\x00-\x7f]/.test(text)) strings.set(text, strings.get(text) ?? where); };
for (const file of ['src/film/copy.ts', 'src/film/Cover.tsx', 'src/film/Type.tsx', 'src/film/Labels.tsx', 'src/film/Plate.tsx']) {
  for (const m of read(file).matchAll(/'([^'\n]*)'|`([^`]*)`/g)) add(m[1] ?? m[2], file);
}
const overlay = JSON.parse(read('src/data/overlay.json'));
for (const [id, text] of Object.entries(overlay.texts)) add(text, 'overlay:' + id);
for (const c of JSON.parse(read('support/narration/caption-cues.json')).cues) add(c.display_text, 'caption:' + c.id);
const missing = new Map();
for (const [text, where] of strings) {
  for (const ch of text) {
    if (ch === '\n' || subset.has(ch)) continue;
    if (!missing.has(ch)) missing.set(ch, []);
    missing.get(ch).push(where + ' «' + text.replace(/\n/g, '⏎') + '»');
  }
}
mkdirSync(join(ROOT, 'out'), {recursive: true});
const inventory = {checked_against: 'support/fonts/subset-characters.txt', strings: [...strings].map(([text, where]) => ({text, where})),
  missing: Object.fromEntries([...missing].map(([ch, w]) => [ch, w]))};
writeFileSync(join(ROOT, 'out/text-inventory.json'), JSON.stringify(inventory, null, 1) + '\n');
console.log(`${strings.size} on-screen strings checked; ${missing.size} missing characters`);
for (const [ch, w] of missing) console.log(`  MISSING ${ch} (U+${ch.codePointAt(0).toString(16).toUpperCase()}) in ${w[0]}`);
process.exit(missing.size ? 1 : 0);
