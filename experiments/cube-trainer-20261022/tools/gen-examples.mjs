// 生成“示例教学”：用 cubing.js 随机状态打乱，三法分别求解；挑选“每个阶段都有实际动作”且长度适中的打乱。
// 每个示例都再用 cubing.js KPuzzle 逐步复算并检查阶段目标，结果写入 src/data/examples.json 与 public/verification-examples.json。
import { randomScrambleForEvent } from "cubing/scramble";
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore } from "../src/solver/core.js";
import { MethodSolver } from "../src/solver/methods.js";
import { makePredicates, slotsOk } from "../src/solver/predicates.js";
import { writeFileSync, mkdirSync } from "node:fs";

const WANT = Number(process.argv[2] || 3);
const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const solver = new MethodSolver(core);
const Mt = kp.moveToTransformation("M").transformationData;
const P = makePredicates({ ePerm: Mt.EDGES.permutation, eDelta: Mt.EDGES.orientationDelta, zPerm: Mt.CENTERS.permutation });
const view = (pat) => { const d = pat.patternData; return { ep: d.EDGES.pieces, eo: d.EDGES.orientation, cp: d.CORNERS.pieces, co: d.CORNERS.orientation, zp: d.CENTERS.pieces }; };
const GOAL = {
  lbl: { cross: P.cross, corners: P.firstLayer, middle: P.f2l, llcross: P.llEdgesOriented, llface: P.oll, llcorners: P.llCorners, lledges: P.solved },
  cfop: { cross: P.cross, f2l: P.f2l, oll: P.oll, pll: P.solved },
  roux: { fb: P.fb, sb: P.sb, cmll: P.cmll, lse: P.rouxSolved },
};
const GOAL_TEXT = {
  cross: "十字", firstLayer: "第一层", f2l: "前两层", llEdgesOriented: "顶层十字", oll: "顶面同色", llCorners: "顶层角归位", solved: "全部还原",
  fb: "第一块", sb: "第二块", cmll: "顶层四角", rouxSolved: "全部还原（含中心）",
};
function verify(method, scramble, res) {
  let pat = kp.defaultPattern().applyAlg(scramble);
  const ids = Object.keys(GOAL[method]);
  const log = [];
  for (const st of res.stages) {
    const before = GOAL[method][st.id](view(pat));
    const f2lSlots = [];
    for (const step of st.steps) {
      if (step.moves.length) pat = pat.applyAlg(step.moves.join(" "));
      if (step.slot) { f2lSlots.push(step.slot); if (!(P.cross(view(pat)) && slotsOk(view(pat), f2lSlots))) throw new Error("F2L 小步失败"); }
    }
    const k = ids.indexOf(st.id);
    const kept = ids.slice(0, k + 1).every((id) => GOAL[method][id](view(pat)));
    if (!kept) throw new Error(`${method} ${st.id} 目标未保持`);
    log.push({ stage: st.id, moves: st.moveCount, goalBefore: before, goalAfter: true, earlierGoalsKept: true });
  }
  const solved = pat.experimentalIsSolved({ ignorePuzzleOrientation: false, ignoreCenterOrientation: true });
  if (!solved) throw new Error("未还原");
  return { stages: log, finalSolvedByKPuzzle: solved };
}
const picked = [];
let tried = 0;
while (picked.length < WANT && tried < 3000) {
  tried++;
  const scramble = (await randomScrambleForEvent("333")).toString();
  const sols = {};
  let ok = true;
  for (const m of ["lbl", "cfop", "roux"]) {
    const r = solver.solve(m, scramble);
    if (r.stages.some((st) => st.steps.some((s) => s.kind === "skip") || st.moveCount === 0)) { ok = false; break; }
    sols[m] = r;
  }
  if (!ok) continue;
  const f2lExtract = sols.cfop.stages[1].steps.some((s) => s.detail && s.detail.includes("取出"));
  const lim = { lbl: [95, 125], cfop: [46, 56], roux: [38, 46] };
  if (!Object.entries(lim).every(([m, [lo, hi]]) => sols[m].total >= lo && sols[m].total <= hi)) continue;
  // 第一个示例：F2L 不需要“先取出”，便于入门观看；其余示例至少有一次“取出”
  if (picked.length === 0 && f2lExtract) continue;
  if (picked.length === 1 && !f2lExtract) continue;
  const evidence = Object.fromEntries(Object.entries(sols).map(([m, r]) => [m, verify(m, scramble, r)]));
  picked.push({ id: `ex${picked.length + 1}`, scramble, solutions: sols, evidence });
  console.log(`示例 ${picked.length}: ${scramble}  LBL ${sols.lbl.total} / CFOP ${sols.cfop.total} / Roux ${sols.roux.total}（试了 ${tried} 个）`);
}
if (picked.length < WANT) throw new Error("示例不足");
writeFileSync(new URL("../src/data/examples.json", import.meta.url), JSON.stringify(picked.map(({ evidence, ...x }) => x)));
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/verification-examples.json", import.meta.url), JSON.stringify({
  generatedAt: new Date().toISOString(), tool: "tools/gen-examples.mjs", checker: "cubing@0.66.1 KPuzzle（独立复算每一步）",
  goals: GOAL_TEXT, examples: picked.map(({ id, scramble, solutions, evidence }) => ({ id, scramble, totals: Object.fromEntries(Object.entries(solutions).map(([m, r]) => [m, r.total])), evidence })),
}, null, 1));
process.exit(0);
