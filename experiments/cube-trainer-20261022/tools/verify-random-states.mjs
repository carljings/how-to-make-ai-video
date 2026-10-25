// 均匀随机合法状态（直接随机排列/朝向，满足奇偶与朝向约束）上的三法验算。
// 起始状态直接交给 cubing.js 的 KPattern，求解序列逐阶段在 KPuzzle 上复算。
import { cube3x3x3 } from "cubing/puzzles";
import { KPattern } from "cubing/kpuzzle";
import { CubeCore, CubeState } from "../src/solver/core.js";
import { MethodSolver } from "../src/solver/methods.js";
import { makePredicates } from "../src/solver/predicates.js";
import { writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";

const N = Number(process.argv[2] || 1000);
const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const solver = new MethodSolver(core);
const M = kp.moveToTransformation("M").transformationData;
const P = makePredicates({ ePerm: M.EDGES.permutation, eDelta: M.EDGES.orientationDelta, zPerm: M.CENTERS.permutation });
const view = (pat) => { const d = pat.patternData; return { ep: d.EDGES.pieces, eo: d.EDGES.orientation, cp: d.CORNERS.pieces, co: d.CORNERS.orientation, zp: d.CENTERS.pieces }; };
const GOAL = {
  lbl: { cross: P.cross, corners: P.firstLayer, middle: P.f2l, llcross: P.llEdgesOriented, llface: P.oll, llcorners: P.llCorners, lledges: P.solved },
  cfop: { cross: P.cross, f2l: P.f2l, oll: P.oll, pll: P.solved },
  roux: { fb: P.fb, sb: P.sb, cmll: P.cmll, lse: P.rouxSolved },
};
function shuffle(n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function parity(a) { let p = 0; const seen = new Array(a.length).fill(false); for (let i = 0; i < a.length; i++) { if (seen[i]) continue; let j = i, len = 0; while (!seen[j]) { seen[j] = true; j = a[j]; len++; } p += len - 1; } return p % 2; }
function randomState() {
  const cp = shuffle(8), ep = shuffle(12);
  if (parity(cp) !== parity(ep)) [ep[0], ep[1]] = [ep[1], ep[0]];
  const co = Array.from({ length: 7 }, () => randomInt(3)); co.push((3 - (co.reduce((x, y) => x + y, 0) % 3)) % 3);
  const eo = Array.from({ length: 11 }, () => randomInt(2)); eo.push(eo.reduce((x, y) => x + y, 0) % 2);
  return { EDGES: { pieces: ep, orientation: eo }, CORNERS: { pieces: cp, orientation: co }, CENTERS: { pieces: [0, 1, 2, 3, 4, 5], orientation: [0, 0, 0, 0, 0, 0], orientationMod: [1, 1, 1, 1, 1, 1] } };
}
const out = { generatedAt: new Date().toISOString(), samples: N, kind: "uniform random legal states", perMethod: {}, failures: [] };
const acc = { lbl: { t: [], m: [], st: {} }, cfop: { t: [], m: [], st: {} }, roux: { t: [], m: [], st: {} } };
for (let i = 0; i < N; i++) {
  const data = randomState();
  const startPat = new KPattern(kp, data);
  const start = CubeState.fromPatternData(data);
  for (const method of ["lbl", "cfop", "roux"]) {
    const t0 = performance.now();
    let res;
    try { res = solver.solve(method, null, start); } catch (e) { out.failures.push({ method, data, err: String(e) }); continue; }
    acc[method].t.push(performance.now() - t0);
    let pat = startPat;
    const ids = Object.keys(GOAL[method]);
    for (const st of res.stages) {
      for (const step of st.steps) if (step.moves.length) pat = pat.applyAlg(step.moves.join(" "));
      const k = ids.indexOf(st.id);
      for (let j = 0; j <= k; j++) if (!GOAL[method][ids[j]](view(pat))) out.failures.push({ method, data, err: `阶段 ${st.id} 后 ${ids[j]} 不成立` });
      (acc[method].st[st.id] ||= []).push(st.moveCount);
    }
    if (!pat.experimentalIsSolved({ ignorePuzzleOrientation: false, ignoreCenterOrientation: true })) out.failures.push({ method, data, err: "未还原" });
    acc[method].m.push(res.total);
  }
  if ((i + 1) % 100 === 0) console.log(`${i + 1}/${N}`, "failures", out.failures.length);
}
const summ = (a) => ({ mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p95: +a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.95)].toFixed(1), max: +Math.max(...a).toFixed(1) });
for (const m of ["lbl", "cfop", "roux"]) out.perMethod[m] = { totalMoves: summ(acc[m].m), timeMs: summ(acc[m].t), stages: Object.fromEntries(Object.entries(acc[m].st).map(([k, v]) => [k, summ(v)])) };
console.log(JSON.stringify(out.perMethod, null, 1));
console.log("failures:", out.failures.length);
writeFileSync(new URL(`../reports/verify-random-states-${N}.json`, import.meta.url), JSON.stringify(out, null, 1));
process.exit(out.failures.length ? 1 : 0);
