// 验证 OLL/PLL/层先法公式：合法性（只动允许的块）+ 覆盖率（所有情况都能被某条公式解决）。
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore, CubeState, derotate } from "../src/solver/core.js";
import { OLL_ALGS, PLL_ALGS, LBL_ALGS } from "../src/solver/algs.js";
import { writeFileSync } from "node:fs";

const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const toMoves = (a) => core.parse(derotate(a.split(/\s+/)));
const F2L_E = [4, 5, 6, 7, 8, 9, 10, 11], F2L_C = [4, 5, 6, 7];
const f2lOk = (s) => F2L_E.every((p) => s.edgeOk(p)) && F2L_C.every((p) => s.cornerOk(p)) && s.centersOk();
const llOriented = (s) => [0, 1, 2, 3].every((i) => s.eo[i] === 0 && s.co[i] === 0);
const AUF = [[], [core.idx("U")], [core.idx("U2")], [core.idx("U'")]];
const report = { oll: {}, pll: {}, lbl: {} };

// ---------- OLL ----------
const ollValid = [];
for (const a of OLL_ALGS) {
  const mv = toMoves(a);
  const s = CubeState.solved().applyAll(core, mv);
  if (!f2lOk(s)) { console.log("OLL 不合格（破坏 F2L/中心）:", a); continue; }
  ollValid.push({ alg: a, moves: mv });
}
// 所有 216 种顶面朝向图案
const patterns = [];
for (let c = 0; c < 27; c++) for (let e = 0; e < 8; e++) {
  const co = [c % 3, ((c / 3) | 0) % 3, ((c / 9) | 0) % 3];
  co.push((6 - co[0] - co[1] - co[2]) % 3);
  const eo = [e & 1, (e >> 1) & 1, (e >> 2) & 1];
  eo.push((eo[0] + eo[1] + eo[2]) % 2);
  patterns.push({ co, eo });
}
const keyOf = (s) => [0, 1, 2, 3].map((i) => s.co[i]).join("") + "/" + [0, 1, 2, 3].map((i) => s.eo[i]).join("");
let ollUncovered = [];
const ollClass = new Map(); // 以 U 旋转等价归类
for (const p of patterns) {
  const s0 = CubeState.solved();
  for (let i = 0; i < 4; i++) { s0.co[i] = p.co[i]; s0.eo[i] = p.eo[i]; }
  // 类代表：四种 AUF 下 key 的最小值
  const keys = AUF.map((au) => keyOf(s0.clone().applyAll(core, au))).sort();
  const cls = keys[0];
  let best = null;
  if (!llOriented(s0)) {
    for (let k = 0; k < 4; k++) for (const v of ollValid) {
      const s = s0.clone().applyAll(core, AUF[k]).applyAll(core, v.moves);
      if (llOriented(s) && f2lOk(s)) { const len = AUF[k].length + v.moves.length; if (!best || len < best.len) best = { len, alg: v.alg }; }
    }
    if (!best) ollUncovered.push(keyOf(s0));
  }
  if (!ollClass.has(cls)) ollClass.set(cls, { solvedBy: new Set(), orientedAlready: llOriented(s0) });
  if (best) ollClass.get(cls).solvedBy.add(best.alg);
}
report.oll.validAlgs = ollValid.length;
report.oll.classesIncludingSolved = ollClass.size;
report.oll.uncoveredPatterns = ollUncovered;
console.log(`OLL: 合格公式 ${ollValid.length}/${OLL_ALGS.length}；顶面图案类（含已完成）${ollClass.size}；未覆盖图案 ${ollUncovered.length}`);

// ---------- PLL ----------
function perms4() { const r = []; const rec = (a, rest) => { if (!rest.length) r.push(a); rest.forEach((x, i) => rec([...a, x], rest.filter((_, j) => j !== i))); }; rec([], [0, 1, 2, 3]); return r; }
const parity = (p) => { let c = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (p[i] > p[j]) c++; return c % 2; };
const pllValid = [];
for (const { name, alg } of PLL_ALGS) {
  const mv = toMoves(alg);
  const s = CubeState.solved().applyAll(core, mv);
  if (!f2lOk(s) || !llOriented(s)) { console.log("PLL 不合格:", name, alg); continue; }
  // 置换结构：角/棱各自的轮换类型
  const cyc = (perm) => { const seen = Array(4).fill(false); const out = []; for (let i = 0; i < 4; i++) { if (seen[i]) continue; let j = i, len = 0; while (!seen[j]) { seen[j] = true; j = perm[j]; len++; } if (len > 1) out.push(len); } return out.sort().join("+") || "id"; };
  const cp = Array.from(s.cp.slice(0, 4)), ep = Array.from(s.ep.slice(0, 4));
  pllValid.push({ name, alg, moves: mv, cornerCycles: cyc(cp), edgeCycles: cyc(ep) });
}
const P = perms4();
const pllStates = [];
for (const c of P) for (const e of P) if (parity(c) === parity(e)) pllStates.push({ c, e });
const pllClassOf = new Map();
let pllUncovered = 0, pllAufOnly = 0;
const pllNamesCovering = new Map();
const llKey = (s) => Array.from(s.cp.slice(0, 4)).join("") + "/" + Array.from(s.ep.slice(0, 4)).join("");
for (const st of pllStates) {
  const s0 = CubeState.solved();
  for (let i = 0; i < 4; i++) { s0.cp[i] = st.c[i]; s0.ep[i] = st.e[i]; }
  // 类代表：pre-AUF 和 post-AUF 都考虑
  const keys = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    // 等价：U^a X U^b 的状态（对状态而言，X 前后接 AUF）
    const s = CubeState.solved().applyAll(core, AUF[a]);
    // 组合：先 U^a 再施加 X 的“状态置换”，再 U^b —— 用状态直接模拟：
    const t = s0.clone();
    const u = CubeState.solved().applyAll(core, AUF[b]);
    keys.push(llKey(composeLL(composeLL(s, t), u)));
  }
  keys.sort();
  const cls = keys[0];
  let best = null;
  if (!s0.isSolved()) {
    // 顶层整体错位（只差 U / U2 / U'）只需调整顶层，不用 PLL 公式
    for (let a = 1; a < 4 && !best; a++) if (s0.clone().applyAll(core, AUF[a]).isSolved()) { best = { len: AUF[a].length, name: "AUF" }; pllAufOnly++; }
    if (!best) for (let a = 0; a < 4; a++) for (const v of pllValid) for (let b = 0; b < 4; b++) {
      const s = s0.clone().applyAll(core, AUF[a]).applyAll(core, v.moves).applyAll(core, AUF[b]);
      if (s.isSolved()) { const len = AUF[a].length + v.moves.length + AUF[b].length; if (!best || len < best.len) best = { len, name: v.name }; }
    }
    if (!best) pllUncovered++;
  }
  if (!pllClassOf.has(cls)) pllClassOf.set(cls, new Set());
  if (best) { pllClassOf.get(cls).add(best.name); pllNamesCovering.set(best.name, (pllNamesCovering.get(best.name) || 0) + 1); }
}
// 状态复合：把 b 的置换接在 a 之后（只对顶层 4 角 4 棱有意义）
function composeLL(a, b) {
  const r = CubeState.solved();
  for (let i = 0; i < 4; i++) { r.cp[i] = a.cp[b.cp[i]]; r.ep[i] = a.ep[b.ep[i]]; }
  return r;
}
report.pll.valid = pllValid.map(({ name, alg, cornerCycles, edgeCycles }) => ({ name, alg, cornerCycles, edgeCycles }));
report.pll.classesIncludingSolved = pllClassOf.size;
report.pll.uncoveredStates = pllUncovered;
report.pll.aufOnlyStates = pllAufOnly;
console.log(`PLL: 合格 ${pllValid.length}/${PLL_ALGS.length}；排列类（含已完成）${pllClassOf.size}；只需调整顶层的状态 ${pllAufOnly}；未覆盖状态 ${pllUncovered}`);
for (const v of pllValid) console.log(`  ${v.name.padEnd(3)} 角:${v.cornerCycles.padEnd(5)} 棱:${v.edgeCycles.padEnd(5)} 选用次数:${pllNamesCovering.get(v.name) || 0}`);

// ---------- 层先法公式 ----------
const lblChecks = [];
for (const [slot, a] of Object.entries(LBL_ALGS.cornerTrigger)) {
  const mv = toMoves(a);
  const s = CubeState.solved().applyAll(core, mv);
  // 只能动：顶层块 + 该槽的角 + 中层棱（中层此时还未完成）；十字与其他底角必须不动
  const slotPos = { DRF: 4, DFL: 5, DLB: 6, DBR: 7 }[slot];
  const crossOk = [4, 5, 6, 7].every((p) => s.edgeOk(p));
  const otherCorners = [4, 5, 6, 7].filter((p) => p !== slotPos).every((p) => s.cornerOk(p));
  let order = 0; const t = CubeState.solved(); do { t.applyAll(core, mv); order++; } while (!t.isSolved() && order < 20);
  lblChecks.push({ alg: a, slot, crossOk, otherCorners, order });
}
for (const key of ["edgeRight", "edgeLeft"]) {
  const s = CubeState.solved().applyAll(core, toMoves(LBL_ALGS[key]));
  lblChecks.push({ alg: LBL_ALGS[key], key, firstLayerOk: [4, 5, 6, 7].every((p) => s.edgeOk(p)) && [4, 5, 6, 7].every((p) => s.cornerOk(p)) });
}
for (const key of ["yellowCross", "sune", "cornerCycle", "edgeCycleA", "edgeCycleB"]) {
  const s = CubeState.solved().applyAll(core, toMoves(LBL_ALGS[key]));
  lblChecks.push({ alg: LBL_ALGS[key], key, f2lOk: f2lOk(s), keepsOrientation: llOriented(s) });
}
report.lbl = lblChecks;
console.log("LBL:", JSON.stringify(lblChecks));
writeFileSync(new URL("../reports/algs-report.json", import.meta.url), JSON.stringify(report, null, 1));
