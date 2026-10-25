import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cube3x3x3 } from 'cubing/puzzles';
import { createCanvas } from '@napi-rs/canvas';
import { makeVerifier } from '../src/solver/verify.js';
import { geoToPattern, FACE_NORMAL, mulMV } from '../src/render/geometry.js';
import { METHODS, OPEN, CLOSE, SUPER, rot } from '../src/cubes.js';
import { renderFrame, TIMELINE as T, EVENTS } from '../src/film.js';
import EXAMPLE from '../assets/reference/example.json' with { type: 'json' };

const kp = await cube3x3x3.kpuzzle(), verify = makeVerifier(kp), report = { failures: [], prefixStates: 0, animatedTurnEndpoints: 0, methodGoals: {}, deterministicFrames: 0, captionCount: T.captions.length };
const project = (d) => ({ ep: d.EDGES.pieces, eo: d.EDGES.orientation, cp: d.CORNERS.pieces, co: d.CORNERS.orientation, zp: d.CENTERS.pieces });
for (const [method, data] of Object.entries(METHODS)) {
  const r = verify.verify(method, EXAMPLE.scramble, null, data.result);
  assert(r.ok && r.solved, `${method} goals failed`); report.methodGoals[method] = r;
}
for (const sequence of [OPEN, CLOSE, SUPER, ...Object.values(METHODS).map((m) => m.sequence)]) {
  let pattern = kp.defaultPattern().applyAlg(sequence.setup.join(' '));
  for (let i = 0; i < sequence.states.length; i++) {
    assert.deepEqual(geoToPattern({ cubies: sequence.states[i] }), project(pattern.patternData)); report.prefixStates++;
    if (i >= sequence.moves.length) break;
    // Test the actual floating-point turn function used by the drawing code against the next exact state.
    const sample = sequence.sample((i + .999) / sequence.moves.length), next = sequence.states[i + 1];
    sample.state.forEach((c, j) => {
      const moving = sample.spec.layers.includes(c.pos[sample.spec.axis]);
      const pos = moving ? rot(c.pos, sample.spec.axis, sample.angle) : c.pos;
      const normal = mulMV(c.rot, FACE_NORMAL[c.piece.faces[0]]);
      const n = moving ? rot(normal, sample.spec.axis, sample.angle) : normal;
      assert(pos.every((v, k) => Math.abs(v - next[j].pos[k]) < 1e-10));
      const expected = mulMV(next[j].rot, FACE_NORMAL[c.piece.faces[0]]);
      assert(n.every((v, k) => Math.abs(v - expected[k]) < 1e-10));
    });
    report.animatedTurnEndpoints++; pattern = pattern.applyMove(sequence.moves[i]);
  }
}
const flip = kp.defaultPattern().applyAlg(SUPER.setup.join(' ')).patternData;
assert(flip.EDGES.pieces.every((x, i) => x === i) && flip.EDGES.orientation.every((x) => x === 1));
assert(flip.CORNERS.pieces.every((x, i) => x === i) && flip.CORNERS.orientation.every((x) => x === 0));
assert(kp.defaultPattern().applyAlg([...SUPER.setup, ...SUPER.moves].join(' ')).experimentalIsSolved({ ignorePuzzleOrientation: false, ignoreCenterOrientation: true }));
report.superflipVerified = true;
const factorial = (n) => { let a = 1n; for (let i = 2n; i <= n; i++) a *= i; return a; };
assert.equal(factorial(8n) * 3n ** 7n * factorial(12n) * 2n ** 10n, 43252003274489856000n);
assert.equal(2217093120n * 19508428800n, 43252003274489856000n);
const mean = (3.68 + 3.41 + 3.45) / 3; assert.equal(mean.toFixed(2), '3.51'); report.mathVerified = true;
assert(T.duration >= 120 && T.duration <= 180, 'duration outside requested 2–3 minutes');
assert.equal(T.captionFallbackCount, 0);
assert.equal(T.frames, Math.round(T.duration * 30));
const metrics = createCanvas(4, 4).getContext('2d'); metrics.font = '700 49px MovieSans';
let maxLines = 0, maxChineseCps = 0, previousEnd = 0;
for (const c of T.captions) {
  assert(c.end > c.start && c.start >= previousEnd - .001);
  assert(c.end <= T.duration);
  previousEnd = c.end;
  let lines = 1, row = '';
  for (const char of c.text) { if (metrics.measureText(row + char).width > 840 && row) { lines++; row = ''; } row += char; }
  maxLines = Math.max(maxLines, lines); assert(lines <= 2, 'caption exceeds two lines: ' + c.text);
  const chars = (c.text.match(/[\u4e00-\u9fff]/g) || []).length;
  maxChineseCps = Math.max(maxChineseCps, chars / (c.end - c.start));
}
report.maxCaptionLines = maxLines; report.maxChineseCaptionCharsPerSecond = Number(maxChineseCps.toFixed(2));
for (const time of [.2, 44.5, 119, T.duration - .1]) {
  const a = createHash('sha256').update(renderFrame(time).getContext('2d').getImageData(0, 0, 1080, 1920).data).digest('hex');
  renderFrame(62.3);
  const b = createHash('sha256').update(renderFrame(time).getContext('2d').getImageData(0, 0, 1080, 1920).data).digest('hex');
  assert.equal(a, b, 'render depends on previous frame'); report.deterministicFrames++;
}
report.frames = T.frames; report.duration = T.duration; report.events = EVENTS.length;
await writeFile(new URL('../out/verification.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, methodGoals: Object.fromEntries(Object.entries(report.methodGoals).map(([k, v]) => [k, { ok: v.ok, stages: v.stages.length }])) }));
