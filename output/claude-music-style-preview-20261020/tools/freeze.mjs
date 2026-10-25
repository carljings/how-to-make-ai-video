#!/usr/bin/env node
// freeze.mjs — checksum every source file of the preview (not node_modules, not out/) → SOURCE_MANIFEST.sha256
//   node tools/freeze.mjs            write the manifest
//   node tools/freeze.mjs --check    compare the tree with the manifest (exit 1 on any difference)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SKIP = new Set(['node_modules', 'out', 'SOURCE_MANIFEST.sha256']);
const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => {
  const rel = d ? `${d}/${e.name}` : e.name; if (SKIP.has(e.name) || e.name.startsWith('.')) return [];
  return e.isDirectory() ? walk(rel) : e.isFile() ? [rel] : [];
});
const lines = walk('').sort().map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex')}  ${f}`);
const body = lines.join('\n') + '\n', file = path.join(ROOT, 'SOURCE_MANIFEST.sha256');
if (process.argv.includes('--check')) {
  const want = fs.readFileSync(file, 'utf8'); const ok = want === body;
  if (!ok) { const a = new Set(want.split('\n')), b = new Set(body.split('\n')); for (const l of a) if (!b.has(l)) console.log('manifest only:', l); for (const l of b) if (!a.has(l)) console.log('tree only:    ', l); }
  console.log(ok ? `source matches manifest (${lines.length} files)` : 'SOURCE DIFFERS FROM MANIFEST'); process.exit(ok ? 0 : 1);
}
fs.writeFileSync(file, body);
console.log(`${lines.length} files → SOURCE_MANIFEST.sha256  (manifest sha256 ${crypto.createHash('sha256').update(body).digest('hex')})`);
