import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { cube3x3x3 } from "cubing/puzzles";
import LIB from "../src/data/library.json" with { type: "json" };
import BANK from "../src/data/training.json" with { type: "json" };
import { inspect, caseSequence, parsePlan, tracked, CrossPlanner } from "../src/learning/engine.js";
import { CubeCore } from "../src/solver/core.js";

const kp = await cube3x3x3.kpuzzle(), core = new CubeCore(kp), planner = new CrossPlanner(core);
const report = { library: 0, libraryBackgrounds: 0, cross: 0, prediction: 0, extended: 0, independentlyComparedBfsStates: 0, failures: [] };
for (const [set, cases] of Object.entries(LIB).filter(([, v]) => Array.isArray(v))) {
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const item of cases) {
    const seq = caseSequence(set, item);
    assert(inspect(kp, seq.setup, seq.moves)[seq.goal], `${set}/${item.id} goal`);
    if (["F2L", "OLL", "PLL", "CMLL"].includes(set)) assert(!inspect(kp, seq.setup)[seq.goal], `${set}/${item.id} starts unsolved`);
    if (set === "F2L" || set === "OLL" || set === "CMLL") {
      const backgrounds = set === "CMLL" ? LIB.LSE.map((x) => x.setup) : LIB.PLL.slice(0, 5).map((x) => x.ref.physical);
      for (const background of backgrounds) {
        const setup = [...background, ...seq.setup];
        assert(inspect(kp, setup, seq.moves)[seq.goal], `${set}/${item.id} nontrivial background`);
        report.libraryBackgrounds++;
      }
    }
    if (set === "LSE") {
      let p = kp.defaultPattern().applyAlg(seq.setup.join(" "));
      const bad = [0, 1, 2, 3, 4, 6].filter((i) => p.patternData.EDGES.orientation[i] !== 0).length;
      assert.equal(bad, item.bad);
      for (let i = 0; i < item.stages.length; i++) {
        p = p.applyAlg(item.stages[i].moves.join(" "));
        let aligned = p;
        for (let k = 0; k < 4 && aligned.patternData.CENTERS.pieces[0] !== 0; k++) aligned = aligned.applyMove("M");
        assert([0, 1, 2, 3, 4, 6].every((e) => aligned.patternData.EDGES.orientation[e] === 0), "LSE EO");
        if (i === 1) assert([1, 3].every((e) => aligned.patternData.EDGES.pieces[e] === e), "LSE UL/UR");
      }
    }
    report.library++;
  }
}
for (const q of BANK.cross) {
  assert(!inspect(kp, q.setup).cross);
  assert(inspect(kp, q.setup, q.solution).cross);
  assert.equal(q.distance, planner.solve(q.setup).distance);
  for (const alt of q.alternatives) { assert.equal(alt.length, q.distance); assert(inspect(kp, q.setup, alt).cross); }
  report.cross++;
}
for (const q of BANK.prediction) { assert.deepEqual(tracked(kp, q.setup, q.solution, q.slot), q.expected); report.prediction++; }
for (const q of BANK.extended) {
  const end = inspect(kp, q.setup, q.solution);
  assert(!inspect(kp, q.setup).cross); assert(end.cross); assert.equal(end.slots.length, q.n); assert.deepEqual(end.slots, q.slots); report.extended++;
}
// 单独以 KPattern 走广度优先，不复用搜索器的状态转移或距离表。
const key = (p) => { const d = p.patternData.EDGES; return [4, 5, 6, 7].map((e) => { const pos = d.pieces.indexOf(e); return `${pos}:${d.orientation[pos]}`; }).join("|"); };
let layer = [kp.defaultPattern()]; const seen = new Set([key(layer[0])]);
const faces = ["U", "D", "L", "R", "F", "B"].flatMap((f) => [f, f + "2", f + "'"]);
for (let depth = 0; depth <= 3; depth++) {
  const next = [];
  for (const p of layer) {
    const s = planner.core.solved();
    const e = p.patternData.EDGES;
    s.ep.set(e.pieces); s.eo.set(e.orientation);
    assert.equal(planner.search.h(planner.search.codesOf(s)), depth); report.independentlyComparedBfsStates++;
    if (depth === 3) continue;
    for (const f of faces) { const q = p.applyMove(f), k = key(q); if (!seen.has(k)) { seen.add(k); next.push(q); } }
  }
  layer = next;
}
assert(parsePlan("M U").error); assert(parsePlan("").error); assert(parsePlan("R3").error);
assert.deepEqual(parsePlan("R U2 F’").moves, ["R", "U2", "F'"]);
assert.equal(report.library, 174); assert.equal(report.cross, 36); assert.equal(report.prediction, 24); assert.equal(report.extended, 18);
writeFileSync(new URL("../verification-learning.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
