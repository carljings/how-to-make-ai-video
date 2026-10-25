#!/usr/bin/env node
// fonts.mjs — subset Noto Sans SC (SIL OFL 1.1) to exactly the characters this preview draws (src/text.js),
// via the Google Fonts css2 API `text=` parameter → assets/fonts/NotoSansSC-{500,900}.woff2 + fonts.json (URLs, sha256, chars).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { allText } from '../src/text.js';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/fonts');
const chars = [...new Set([...allText().join(''), ...'？，'])].sort().join('');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const manifest = { family: 'Noto Sans SC', license: 'SIL Open Font License 1.1 (Google Fonts)', chars, files: [] };
fs.mkdirSync(OUT, { recursive: true });
for (const w of [500, 900]) {
  const url = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@${w}&text=${encodeURIComponent(chars)}`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const src = [...css.matchAll(/url\((https:[^)]+)\)\s*format\('woff2'\)/g)].map((m) => m[1]);
  if (src.length !== 1) throw new Error(`weight ${w}: expected one woff2 subset, got ${src.length}\n${css}`);
  const buf = Buffer.from(await (await fetch(src[0])).arrayBuffer());
  const file = `NotoSansSC-${w}.woff2`;
  fs.writeFileSync(path.join(OUT, file), buf);
  manifest.files.push({ weight: w, file, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), css: url, src: src[0] });
  console.log(`${file}: ${buf.length} bytes`);
}
fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`${chars.length} characters`);
