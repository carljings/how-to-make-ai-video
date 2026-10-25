// 独立验算：用 cubing.js KPuzzle 重新计算每一步之后的状态，逐阶段检查方法目标，最后检查还原。
// 用法：node tools/verify-solvers.mjs [每种方法的随机打乱数] [随机种子]
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore } from "../src/solver/core.js";
import { MethodSolver } from "../src/solver/methods.js";
import { makePredicates, slotsOk } from "../src/solver/predicates.js";
import { writeFileSync } from "node:fs";

const N = Number(process.argv[2] || 200);
let seed = Number(process.argv[3] || 20261021);
const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor((seed / 2147483648) * n); };
const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const solver = new MethodSolver(core);
const M = kp.moveToTransformation("M").transformationData;
const P = makePredicates({ ePerm: M.EDGES.permutation, eDelta: M.EDGES.orientationDelta, zPerm: M.CENTERS.permutation });
// KPattern → 判定函数所需的数组视图（完全来自 cubing.js 的计算结果）
const view = (pat) => { const d = pat.patternData; return { ep: d.EDGES.pieces, eo: d.EDGES.orientation, cp: d.CORNERS.pieces, co: d.CORNERS.orientation, zp: d.CENTERS.pieces }; };
const STAGE_GOAL = {
  lbl: { cross: P.cross, corners: P.firstLayer, middle: P.f2l, llcross: P.llEdgesOriented, llface: P.oll, llcorners: P.llCorners, lledges: P.solved },
  cfop: { cross: P.cross, f2l: P.f2l, oll: P.oll, pll: P.solved },
  roux: { fb: P.fb, sb: P.sb, cmll: P.cmll, lse: P.rouxSolved },
};
// “阶段目标在该阶段之前尚未达成”的统计（证明不是空跑）；以及每阶段必须保持前面阶段的成果
const FACES = ["U", "D", "L", "R", "F", "B"], SUF = ["", "2", "'"];
function randomScramble(len) {
  const out = []; let lastAxis = -1, lastFace = "";
  while (out.length < len) {
    const f = FACES[rand(6)];
    const axis = "UDLRFB".indexOf(f) >> 1;
    if (f === lastFace) continue;
    if (axis === lastAxis && out.length >= 2 && "UDLRFB".indexOf(out[out.length - 2][0]) >> 1 === axis) continue;
    out.push(f + SUF[rand(3)]); lastFace = f; lastAxis = axis;
  }
  return out.join(" ");
}
const special = [
  "", "R", "U", "F2", "R U R' U'",
  "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", // superflip（20 步 HTM）
  "R2 L2 U2 D2 F2 B2", // 棋盘格
  "F R U R' U' F'", "R U R' U R U2 R'", "R U R' U' R' F R2 U' R' U' R U R' F'",
];
const report = { generatedAt: new Date().toISOString(), cubing: "cubing@0.66.1 KPuzzle", perMethod: {}, failures: [] };
for (const method of ["lbl", "cfop", "roux"]) {
  const stats = { solves: 0, ok: 0, totalMoves: [], stageMoves: {}, ms: [], stageActive: {} };
  const scrambles = [...special, ...Array.from({ length: N }, () => randomScramble(25))];
  for (const scr of scrambles) {
    stats.solves++;
    const t0 = performance.now();
    let res;
    try { res = solver.solve(method, scr); } catch (e) { report.failures.push({ method, scr, err: String(e) }); continue; }
    stats.ms.push(performance.now() - t0);
    // 独立复算
    let pat = kp.defaultPattern().applyAlg(scr);
    let good = true;
    const passed = [];
    for (const st of res.stages) {
      const goal = STAGE_GOAL[method][st.id];
      const before = goal(view(pat));
      stats.stageActive[st.id] = (stats.stageActive[st.id] || 0) + (before ? 0 : 1);
      for (const step of st.steps) {
        if (step.moves.length) pat = pat.applyAlg(step.moves.join(" "));
        if (method === "cfop" && st.id === "f2l" && step.slot) {
          passed.push(step.slot);
          if (!P.cross(view(pat)) || !slotsOk(view(pat), passed)) { good = false; report.failures.push({ method, scr, err: "F2L 小步检查失败" }); }
        }
      }
      if (!goal(view(pat))) { good = false; report.failures.push({ method, scr, err: `阶段 ${st.id} 目标未达成` }); break; }
      // 之前阶段的目标仍保持（逐层/逐块方法的单调性）
      for (const prev of Object.keys(STAGE_GOAL[method])) { if (prev === st.id) break; if (!STAGE_GOAL[method][prev](view(pat))) { good = false; report.failures.push({ method, scr, err: `阶段 ${st.id} 破坏了 ${prev}` }); } }
      (stats.stageMoves[st.id] ||= []).push(st.moveCount);
    }
    const solved = pat.experimentalIsSolved({ ignorePuzzleOrientation: false, ignoreCenterOrientation: true });
    if (!solved) { good = false; report.failures.push({ method, scr, err: "最终未还原（KPuzzle）" }); }
    if (good) stats.ok++;
    stats.totalMoves.push(res.total);
  }
  const summ = (a) => a.length ? { mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), max: Math.max(...a), min: Math.min(...a) } : null;
  report.perMethod[method] = {
    solves: stats.solves, verifiedOk: stats.ok, totalMoves: summ(stats.totalMoves), timeMs: summ(stats.ms.map((x) => +x.toFixed(1))),
    stages: Object.fromEntries(Object.entries(stats.stageMoves).map(([k, v]) => [k, { ...summ(v), neededIn: stats.stageActive[k] }])),
  };
  console.log(method, JSON.stringify(report.perMethod[method]));
}
console.log("failures:", report.failures.length, report.failures.slice(0, 5));
writeFileSync(new URL(`../reports/verify-solvers-${N}.json`, import.meta.url), JSON.stringify(report, null, 1));
process.exit(report.failures.length ? 1 : 0);
