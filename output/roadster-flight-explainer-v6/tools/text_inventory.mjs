#!/usr/bin/env node
// text_inventory.mjs — every on-screen string of v6 「空气现形」 and the checks on it, from web/engine/cues.js (the only
// place strings and times live) and the bundled web fonts. Writes TEXT_INVENTORY.zh-CN.json (repo root by default).
//
//   node tools/text_inventory.mjs [--out /ABS/TEXT_INVENTORY.zh-CN.json]
//
// Checks (exit 1 if any fails):
//   1. coverage   every character of every string has a glyph in each of the four bundled faces (web/assets/fonts,
//                 read straight from the WOFF2 files the page loads: cmap through Brotli, no system fallback)
//   2. reading    every explanatory card meets the cues.js rule, R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters):
//                 after its last line has landed it holds ≥ R(that line), and from its first line's landing to its exit
//                 ≥ R(whole card). "Landed" is cues.landed(); the per-animation settle time is reported alongside.
//   3. layout     card glyphs, arrows and the edge rule stay inside the safe area x 110–970, y 200–1460 (text.js
//                 layout reproduced with the fonts' own advance widths, including the auto-fit to each role's maxW)
//   4. collisions no two cards, and no card and the fixed small type (tag, cable note), share screen space while both
//                 are visible
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as C from '../web/engine/cues.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const r3 = (x) => Math.round(x * 1000) / 1000;
const EPS = 1e-6;
const W = 1080, H = 1920, SAFE = { x0: 110, x1: 970, y0: 200, y1: 1460 };

// ------------------------------------------------------------------------------------------------ fonts (WOFF2 → cmap/hmtx)
const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC',
  'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar',
  'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];
function readWoff2(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'wOF2') throw new Error(`${file}: not WOFF2`);
  const numTables = b.readUInt16BE(12), compressed = b.readUInt32BE(20);
  let p = 48;
  const u128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const d = b[p++]; v = v * 128 + (d & 127); if (!(d & 128)) return v; } throw new Error('bad UIntBase128'); };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = b[p++];
    const tag = (flags & 63) === 63 ? b.toString('ascii', p, (p += 4)) : KNOWN[flags & 63];
    const ver = flags >> 6, orig = u128();
    const transformed = tag === 'glyf' || tag === 'loca' ? ver !== 3 : ver !== 0;
    dir.push({ tag, transformed, len: transformed ? u128() : orig });
  }
  const data = zlib.brotliDecompressSync(b.subarray(p, p + compressed));
  const T = {};
  let off = 0;
  for (const t of dir) { T[t.tag] = { ...t, d: data.subarray(off, off + t.len) }; off += t.len; }
  if (T.hmtx.transformed) throw new Error(`${file}: transformed hmtx is not supported here`);
  const upem = T.head.d.readUInt16BE(18), nH = T.hhea.d.readUInt16BE(34), nG = T.maxp.d.readUInt16BE(4);
  const adv = (g) => T.hmtx.d.readUInt16BE(4 * Math.min(g, nH - 1));
  // cmap: Windows Unicode full (format 12) or BMP (format 4)
  const cm = T.cmap.d, recs = [];
  for (let i = 0; i < cm.readUInt16BE(2); i++) recs.push({ pid: cm.readUInt16BE(4 + 8 * i), eid: cm.readUInt16BE(6 + 8 * i), off: cm.readUInt32BE(8 + 8 * i) });
  const pick = recs.find((r) => r.pid === 3 && r.eid === 10) || recs.find((r) => r.pid === 3 && r.eid === 1) || recs.find((r) => r.pid === 0);
  const s = pick.off, fmt = cm.readUInt16BE(s);
  let glyph;
  if (fmt === 12) {
    const n = cm.readUInt32BE(s + 12);
    glyph = (cp) => { for (let i = 0; i < n; i++) { const o = s + 16 + 12 * i, a = cm.readUInt32BE(o), z = cm.readUInt32BE(o + 4); if (cp >= a && cp <= z) return cm.readUInt32BE(o + 8) + cp - a; } return 0; };
  } else if (fmt === 4) {
    const seg = cm.readUInt16BE(s + 6) / 2, end = s + 14, start = end + 2 * seg + 2, delta = start + 2 * seg, ro = delta + 2 * seg;
    glyph = (cp) => {
      for (let i = 0; i < seg; i++) {
        if (cp > cm.readUInt16BE(end + 2 * i)) continue;
        const a = cm.readUInt16BE(start + 2 * i);
        if (cp < a) return 0;
        const r = cm.readUInt16BE(ro + 2 * i);
        if (!r) return (cp + cm.readInt16BE(delta + 2 * i)) & 0xffff;
        const g = cm.readUInt16BE(ro + 2 * i + r + 2 * (cp - a));
        return g ? (g + cm.readInt16BE(delta + 2 * i)) & 0xffff : 0;
      }
      return 0;
    };
  } else throw new Error(`${file}: cmap format ${fmt}`);
  return { upem, glyphs: nG, glyph, advance: (ch) => adv(glyph(ch.codePointAt(0))) / upem, sha256: sha256(b) };
}
const FACES = {};
for (const w of [300, 500, 700, 900]) {
  const f = path.join(ROOT, `web/assets/fonts/V5Sans-${w}.woff2`);
  FACES[w] = { file: path.relative(ROOT, f), ...readWoff2(f) };
}

// ------------------------------------------------------------------------------------------------ text.js layout, reproduced
// (keep in step with web/engine/text.js: ROLE table, layoutLine, card, tag, cableNote)
const ROLE = {
  hero: { w: 900, size: 122, track: 4, maxW: 800, lead: 1.3 }, support: { w: 500, size: 60, track: 6, maxW: 860, lead: 1.55 },
  heavy: { w: 900, size: 112, track: 10, maxW: 800, lead: 1.32 }, light: { w: 300, size: 112, track: 10, maxW: 800, lead: 1.32 },
  chapter: { w: 700, size: 76, track: 16, maxW: 860, lead: 1.5 }, source: { w: 500, size: 28, track: 2, maxW: 900, lead: 1.6 },
  title: { w: 900, size: 156, track: 18, maxW: 900, lead: 1.25 }, credit: { w: 500, size: 27, track: 2, maxW: 900, lead: 1.75 },
};
const ASC = 0.88, DESC = 0.12;                  // the faces' ideographic em box (typo ascender / descender per em)
function layoutLine(line) {
  const R = ROLE[line.role], face = FACES[R.w], chars = [...line.text];
  const scale = chars.map(() => 1);
  for (const sp of line.spans || []) {
    const i = line.text.indexOf(sp.k);
    if (i < 0) throw new Error(`span '${sp.k}' not in '${line.text}'`);
    const i0 = [...line.text.slice(0, i)].length;
    for (let j = 0; j < [...sp.k].length; j++) scale[i0 + j] = sp.scale ?? 1;
  }
  const measure = (sz) => chars.map((ch, i) => (ch === ' ' ? 0.45 * sz : face.advance(ch) * sz * scale[i]) + (i < chars.length - 1 ? R.track : 0));
  let size = R.size, widths = measure(size), total = widths.reduce((a, b) => a + b, 0);
  if (total > R.maxW) { size *= R.maxW / total; widths = measure(size); total = widths.reduce((a, b) => a + b, 0); }
  return { R, chars, scale, size, total, maxScale: Math.max(...scale) };
}
function cardBoxes(c) {
  const L = c.lines.map((l) => ({ line: l, ...layoutLine(l) }));
  const heights = L.map((l) => l.size * l.R.lead);
  const blockH = heights.reduce((a, b) => a + b, 0);
  let y = c.y - blockH / 2;
  const lines = L.map((l, li) => {
    const base = y + heights[li] * 0.5 + l.size * 0.36;
    y += heights[li];
    const mid = base - l.size * 0.36, k = l.maxScale;   // glyphs scale about the em centre (text.js glyph())
    const box = { x0: W / 2 - l.total / 2, x1: W / 2 + l.total / 2, y0: mid - (ASC - 0.36) * l.size * k, y1: mid + (0.36 + DESC) * l.size * k };
    if (c.edge && li === L.length - 1) box.x1 = Math.max(box.x1, W / 2 + l.total / 2 + 30 + 7);      // 尽头 edge rule
    if (l.line.arrow) box.x1 = Math.max(box.x1, W / 2 + l.total / 2 + 52 + 24);                       // 往下喷 / 往上推 arrows
    return { text: l.line.text, role: l.line.role, size: r3(l.size), fitted: l.size < l.R.size - 1e-9, box };
  });
  const box = { x0: Math.min(...lines.map((l) => l.box.x0)), x1: Math.max(...lines.map((l) => l.box.x1)),
    y0: Math.min(...lines.map((l) => l.box.y0)), y1: Math.max(...lines.map((l) => l.box.y1)) };
  return { lines, box };
}
const roundBox = (b) => ({ x0: Math.round(b.x0), x1: Math.round(b.x1), y0: Math.round(b.y0), y1: Math.round(b.y1) });
const inside = (b) => b.x0 >= SAFE.x0 - EPS && b.x1 <= SAFE.x1 + EPS && b.y0 >= SAFE.y0 - EPS && b.y1 <= SAFE.y1 + EPS;
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
// fixed small type, top left (text.js tag: 26 px weight 500, letter-spacing 3, from x 106, baseline 214, a dash at x 64;
// cable note: 32 px weight 500, letter-spacing 2, on a plate from x 64, y 262–314)
const runW = (text, w, px, ls) => [...text].reduce((a, ch) => a + FACES[w].advance(ch) * px + ls, 0);
const tagBox = (text) => ({ x0: 64, x1: 106 + runW(text, 500, 26, 3), y0: 214 - ASC * 26, y1: 214 + DESC * 26 });
const noteBox = { x0: 64, x1: 64 + runW(C.TAGS.cableNote.text, 500, 32, 2) + 32, y0: 262, y1: 314 };

// ------------------------------------------------------------------------------------------------ 1 · strings and coverage
const items = C.inventory();
const roleWeight = { tag: 500, note: 500, mark: 500 };
const strings = items.map((it) => {
  const w = ROLE[it.role] ? ROLE[it.role].w : roleWeight[it.role];
  const uniq = [...new Set([...it.text])];
  return { ...it, from: r3(it.from), to: r3(it.to), frames: [Math.ceil(it.from * C.FPS - EPS), Math.min(C.FRAMES - 1, Math.floor(it.to * C.FPS + EPS))],
    weight: w, cjk: C.cjkCount(it.text), chars: uniq.join(''), missing_in_its_weight: uniq.filter((ch) => !/\s/.test(ch) && !FACES[w].glyph(ch.codePointAt(0))).join('') };
});
const all = [...new Set(items.flatMap((it) => [...it.text]))].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
const drawn = all.filter((ch) => !/\s/.test(ch));
const fonts = Object.entries(FACES).map(([w, f]) => ({ file: f.file, weight: +w, sha256: f.sha256, units_per_em: f.upem, glyphs: f.glyphs,
  required: drawn.length, missing: drawn.filter((ch) => !f.glyph(ch.codePointAt(0))).join(''), space_glyph: !!f.glyph(32) }));
const coverageOk = fonts.every((f) => !f.missing && f.space_glyph) && strings.every((s) => !s.missing_in_its_weight);

// ------------------------------------------------------------------------------------------------ 2 · reading rule
// settle: when the line's motion is complete in text.js (rise: last glyph +0.3 s; drop: +0.26 s and a short squash;
// float: +0.75 s, ≥ 84 % in at cues.landed(); down/up/flip: whole line, 0.45–0.5 s; none: instant)
const settle = (l) => {
  const n = [...l.text].length, a = l.anim || 'rise', last = l.at + C.STAGGER * (n - 1);
  return a === 'rise' ? last + C.ENTRY : a === 'drop' ? last + 0.26 + 0.1 : a === 'float' ? last + 0.75 : a === 'flip' ? l.at + 0.5
    : a === 'down' || a === 'up' ? l.at + 0.45 : l.at;
};
const EXPLANATORY = C.CARDS.filter((c) => /^C\d+$/.test(c.id));
const reading = C.CARDS.map((c) => {
  const first = c.lines[0], last = c.lines[c.lines.length - 1];
  const all2 = c.lines.map((l) => l.text).join('');
  const lastHold = c.out - C.landed(last), totalHold = c.out - C.landed(first);
  const needLast = C.readNeed(last.text), needTotal = C.readNeed(all2);
  const explanatory = EXPLANATORY.includes(c);
  const linesOk = c.lines.length <= 2 && c.lines.every((l) => C.cjkCount(l.text) <= 10);
  const pass = lastHold >= needLast - EPS && totalHold >= needTotal - EPS;
  return { id: c.id, kind: explanatory ? 'explanatory' : c.id === 'CH' ? 'separator' : 'title', lines: c.lines.map((l) => l.text),
    cjk: c.lines.map((l) => C.cjkCount(l.text)), at: c.lines.map((l) => r3(l.at)), landed: c.lines.map((l) => r3(C.landed(l))),
    settled: c.lines.map((l) => r3(settle(l))), out: r3(c.out), gone: r3(C.cardGone(c)),
    lastHold: r3(lastHold), needLast: r3(needLast), totalHold: r3(totalHold), needTotal: r3(needTotal),
    marginFrames: Math.floor(Math.min(lastHold - needLast, totalHold - needTotal) * C.FPS + EPS),
    holdAfterSettle: r3(c.out - settle(last)), pass: explanatory ? pass && linesOk : null,
    ...(explanatory ? {} : { note: c.id === 'CH'
      ? `separator slate: the chapter line holds ${r3(c.out - C.landed(first))} s after landing (R = ${r3(C.readNeed(first.text))} s); the source line is provenance small print, on screen ${r3(C.cardGone(c) - c.lines[1].at)} s here and again on the title card`
      : `title card: the title lands at ${r3(C.landed(first))} s; the credits type on until ${r3(Math.max(...c.lines.slice(1).map(C.landed)))} s; type and picture fade together over ${r3(C.END - 0.45)}–${r3(C.END - 0.02)} s (film end ${C.END} s)` }) };
});
const readingOk = reading.filter((r) => r.kind === 'explanatory').every((r) => r.pass);

// ------------------------------------------------------------------------------------------------ 3 · layout, 4 · collisions
const layout = C.CARDS.map((c) => { const L = cardBoxes(c); return { id: c.id, y: c.y, box: roundBox(L.box), inSafeArea: inside(L.box),
  lines: L.lines.map((l) => ({ text: l.text, role: l.role, size: l.size, fitted: l.fitted, box: roundBox(l.box), inSafeArea: inside(l.box) })) }; });
const layoutOk = layout.every((l) => l.inSafeArea);
const win = (c) => [c.lines[0].at, C.cardGone(c)];
// the tag is one slot: the full source line crossfades in place into the compact tag (3.0–3.3 s), which follows the world
const tagSlot = [C.TAGS.sourceIntro.text, C.STR.tagNight, C.STR.tagAir].map(tagBox)
  .reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) }));
const fixed = [
  { id: 'TAG', box: tagSlot, w: [0, C.TAGS.hideFrom] },
  { id: 'NOTE.cable', box: noteBox, w: [C.TAGS.cableNote.from, C.TAGS.cableNote.to] },
];
const regions = [...C.CARDS.map((c) => ({ id: c.id, box: cardBoxes(c).box, w: win(c) })), ...fixed];
const collisions = [], handoffs = [];
for (let i = 0; i < regions.length; i++) for (let j = i + 1; j < regions.length; j++) {
  const a = regions[i], b = regions[j], dt = Math.min(a.w[1], b.w[1]) - Math.max(a.w[0], b.w[0]);
  if (dt <= EPS) continue;
  if (overlap(a.box, b.box)) collisions.push({ a: a.id, b: b.id, seconds: r3(dt) });
  else if (i < C.CARDS.length && j < C.CARDS.length) handoffs.push({ a: a.id, b: b.id, seconds: r3(dt), note: 'cards overlap in time only, in separate screen zones' });
}
const collisionOk = collisions.length === 0;

// ------------------------------------------------------------------------------------------------ write + report
const cuesBuf = fs.readFileSync(path.join(ROOT, 'web/engine/cues.js'));
const report = {
  about: 'v6 「空气现形」 on-screen text inventory: every string, its window and characters, and the coverage / reading / layout / collision checks. Generated by tools/text_inventory.mjs from web/engine/cues.js and the bundled web fonts.',
  film: { fps: C.FPS, frames: C.FRAMES, seconds: C.END }, cues_js_sha256: sha256(cuesBuf),
  rule: { reading: 'R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters); hold after the last line lands ≥ R(that line); first landing → exit ≥ R(card)',
    lines: '≤ 2 lines per card, ≤ 10 CJK characters per line', safeArea: SAFE, entry: C.ENTRY, stagger: C.STAGGER, exit: C.EXIT },
  summary: { strings: strings.length, unique_characters: drawn.length, explanatory_cards: EXPLANATORY.length,
    explanatory_pass: reading.filter((r) => r.kind === 'explanatory' && r.pass).length, coverage: coverageOk, reading: readingOk,
    layout: layoutOk, collisions: collisions.length },
  chars: drawn.join(''), codepoints: drawn.map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')),
  fonts, strings, reading, layout, fixedSmallType: fixed.map((f) => ({ id: f.id, box: roundBox(f.box), window: f.w.map(r3) })),
  collisions, handoffs,
};
const dst = path.resolve(ROOT, arg('out', 'TEXT_INVENTORY.zh-CN.json'));
fs.writeFileSync(dst, JSON.stringify(report, null, 1) + '\n');

console.log(`text inventory → ${dst}`);
console.log(`  ${strings.length} strings, ${drawn.length} unique characters (spaces excluded); fonts: ${fonts.map((f) => `${f.weight}${f.missing ? ' MISSING ' + f.missing : ' ok'}`).join(', ')}`);
for (const r of reading) {
  const tag = r.pass === null ? '  —  ' : r.pass ? ' pass' : ' FAIL';
  console.log(`  ${r.id.padEnd(5)}${tag}  last ${r.lastHold.toFixed(2)}/${r.needLast.toFixed(2)}  total ${r.totalHold.toFixed(2)}/${r.needTotal.toFixed(2)} s  (+${r.marginFrames} f)  ${r.lines.join(' / ')}`);
}
for (const l of layout) if (!l.inSafeArea) console.log(`  layout: ${l.id} box ${JSON.stringify(l.box)} leaves the safe area`);
for (const c of collisions) console.log(`  collision: ${c.a} / ${c.b} share space for ${c.seconds} s`);
for (const h of handoffs) console.log(`  handoff (time overlap, separate zones): ${h.a} / ${h.b} ${h.seconds} s`);
for (const r of reading) if (r.note) console.log(`  ${r.id}: ${r.note}`);
console.log(`  coverage ${coverageOk ? 'ok' : 'FAIL'} · reading ${readingOk ? 'ok' : 'FAIL'} (${report.summary.explanatory_pass}/${EXPLANATORY.length}) · layout ${layoutOk ? 'ok' : 'FAIL'} · collisions ${collisions.length}`);
process.exit(coverageOk && readingOk && layoutOk && collisionOk ? 0 : 1);
