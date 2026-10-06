// tools/fonts.mjs: download subsetted OFL fonts from Google Fonts for exactly the glyphs the film uses.
// Run after changing any on-screen text:  node tools/fonts.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { CAPTIONS, STRINGS, CHAPTERS } from '../src/timeline.js';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0 Safari/537.36';
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const all = [...CAPTIONS.flatMap(c => [c.zh, c.en]), ...STRINGS, ...CHAPTERS.flatMap(c => [c.num, c.zh, c.en])].join('').replace(/[{}]/g, '');
const uniq = s => [...new Set([...s])].sort().join('');
const cjk = uniq(all + ascii);
const latin = uniq([...all].filter(ch => ch.codePointAt(0) < 0x2e80).join('') + ascii + '’‘“”—–…·×≈−°é');

const FACES = [
  // [css family, Google family, italic, weight, text]
  ['Noto Serif SC', 'Noto Serif SC', 0, 500, cjk],
  ['Noto Serif SC', 'Noto Serif SC', 0, 600, cjk],
  ['Noto Serif SC', 'Noto Serif SC', 0, 900, cjk],
  ['EB Garamond', 'EB Garamond', 0, 400, latin],
  ['EB Garamond', 'EB Garamond', 1, 400, latin],
  ['EB Garamond', 'EB Garamond', 0, 500, latin],
  ['IBM Plex Mono', 'IBM Plex Mono', 0, 400, latin],
  ['IBM Plex Mono', 'IBM Plex Mono', 0, 500, latin],
  ['STIX Two Text', 'STIX Two Text', 0, 400, latin],
  ['STIX Two Text', 'STIX Two Text', 1, 400, latin],
];

mkdirSync('fonts', { recursive: true });
let css = '/* Subsetted from Google Fonts by tools/fonts.mjs. All families are under the SIL Open Font License 1.1. */\n';
for (const [fam, gfam, ital, wght, text] of FACES) {
  const spec = ital ? `ital,wght@1,${wght}` : `wght@${wght}`;
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(gfam).replace(/%20/g, '+')}:${spec}&text=${encodeURIComponent(text)}&display=block`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${gfam} ${spec}: HTTP ${res.status}`);
  const sheet = await res.text();
  const src = sheet.match(/url\((https:[^)]+)\)/);
  if (!src) throw new Error(`${gfam} ${spec}: no font URL in response`);
  const file = `${fam.replace(/\s+/g, '')}-${wght}${ital ? 'i' : ''}.woff2`;
  const bin = Buffer.from(await (await fetch(src[1], { headers: { 'User-Agent': UA } })).arrayBuffer());
  writeFileSync(`fonts/${file}`, bin);
  css += `@font-face { font-family: "${fam}"; font-style: ${ital ? 'italic' : 'normal'}; font-weight: ${wght}; font-display: block; src: url("${file}") format("woff2"); }\n`;
  console.log(`${file.padEnd(28)} ${(bin.length / 1024).toFixed(1).padStart(7)} KB  (${[...text].length} glyphs requested)`);
}
writeFileSync('fonts/fonts.css', css);
console.log('wrote fonts/fonts.css');
