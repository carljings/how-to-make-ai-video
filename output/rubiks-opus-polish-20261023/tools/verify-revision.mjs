// Regression checks for the annotation and timing failures identified in the encoded base film.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { openFilm, ROOT } from './native-film.mjs';

const film = await openFilm();
const { S } = await import('../src/seqs.js');
const { CUE, DURATION } = await import('../src/timeline.js');
const { allHome, isIdentity } = await import('../src/lib/cube.js');
const { constraintTarget } = await import('../src/scenes/count.js');
const { activeF2LPair, stageLayout } = await import('../src/scenes/methods.js');
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('PASS', name); }
const ctx = film.canvas.getContext('2d');

check('Complete local Chinese font, including the question mark', () => {
  for (const weight of [400, 700, 900]) {
    ctx.font = `${weight} 70px "F-Sans"`;
    for (const ch of '还原一个魔方，最快要几秒？') assert.ok(ctx.measureText(ch).actualBoundingBoxRight > 0, `${weight}: ${ch}`);
  }
});
check('158 seconds, ordered cues, original nine-second ending', () => {
  assert.equal(DURATION, 158); assert.equal(CUE.end - CUE.ending, 9);
  const values = Object.values(CUE); values.forEach((v, i) => { if (i) assert.ok(v > values[i - 1]); });
});
check('Constraint markers follow the swapped corner and edge identities', () => {
  const state = S.countScramble.end;
  const corners = state.filter((c) => c.type === 'corner'), edges = state.filter((c) => c.type === 'edge');
  const a = constraintTarget(CUE.f3 + 3.2), b = constraintTarget(CUE.f2 + 3.2);
  assert.equal(a.id, corners.at(-1).id); assert.equal(b.id, edges.at(-1).id);
  assert.deepEqual(a.p, corners[0].pos.map((v) => v * 2.25));
  assert.deepEqual(b.p, edges[4].pos.map((v) => v * 1.75));
  assert.ok(CUE.f12 - 0.18 - (CUE.f3 + 2.79) >= 0.8);
  assert.ok(CUE.par - 0.18 - (CUE.f2 + 2.82) >= 0.8);
});
check('All F2L labels 1–4 identify a real pair and retain it through its result hold', () => {
  for (let i = 1; i <= 4; i++) {
    const active = activeF2LPair(S.cfopStageStarts[i] + 0.01);
    assert.equal(active.index, i); assert.equal(active.names.size, 2);
    assert.ok(allHome(S.cfop.at(S.cfopStageEnds[i] + 0.01).state, [...active.names]));
    assert.equal(activeF2LPair(S.cfopStageEnds[i] + 0.1).index, i);
  }
});
check('Every method has real completed states and clear stage holds', () => {
  for (const name of ['lbl', 'cfop', 'roux']) {
    assert.ok(isIdentity(S[name].end), name);
    for (const end of S[`${name}StageEnds`]) assert.equal(S[name].at(end + 0.2).turn, null, `${name}: ${end}`);
  }
});
check('Stage labels stay separated and within the image at every completion state', () => {
  for (const names of [['底层十字', '底层角', '中层棱', '顶层'], ['十字', 'F2L ×4 对', 'OLL 顶面', 'PLL 顶层'], ['左桥墩', '右桥墩', 'CMLL 顶角', 'LSE 中层']]) {
    for (let done = 0; done <= names.length; done++) {
      const row = stageLayout(ctx, names, done);
      assert.ok(row[0].x >= 54); assert.ok(row.at(-1).x + row.at(-1).width <= 1026);
      row.slice(1).forEach((item, i) => assert.ok(item.x - row[i].x - row[i].width >= 13.9));
    }
  }
});
for (const t of [0.5, 34.3, 111.6, 146]) {
  await film.render(t); const a = createHash('sha256').update(film.canvas.toBuffer('image/png')).digest('hex');
  await film.render(t + 0.4); await film.render(t);
  const b = createHash('sha256').update(film.canvas.toBuffer('image/png')).digest('hex');
  check(`Frame at ${t}s is independent of render order`, () => assert.equal(a, b));
}
check('Original source and delivered base movie are unchanged', () => {
  const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'baseline-sha256.json'), 'utf8'));
  for (const [file, expected] of Object.entries(baseline.files)) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(baseline.base, file))).digest('hex');
    assert.equal(actual, expected, file);
  }
});
fs.writeFileSync(path.join(ROOT, 'out', 'revision-checks.json'), JSON.stringify({ pass: true, checks }, null, 2));
