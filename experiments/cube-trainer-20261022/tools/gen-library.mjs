// 生成“公式库”数据 src/data/library.json。
//   F2L 41（前右槽）、OLL 57、PLL 21、CMLL 42：情况集合由本站程序枚举（按状态归类），
//   参考编号/分组/社区公式（SpeedCubeDB 首条写法）只按“状态匹配”挂到对应情况上，不依赖数组顺序；匹配必须一一对应。
//   每个情况保留两种写法：社区写法（主写法，原样记号，可能含 y/x 整体转动）与本站程序验算写法（无整体转动）。
//   层先法入门公式：每条配一个演示情况；LSE：从 ⟨M,U⟩ 状态空间穷举后确定性挑选典型例子。
// 独立验算见 tools/verify-library.mjs（cubing.js KPuzzle，在同一情况的多种完整状态上检查目标与保持条件）。
// 用法：node tools/gen-library.mjs [reference-cases.json]
// 本版在初稿基础上修正 LSE 示例并接入参考编号；旧草稿仅保留在本地。
import { cube3x3x3 } from "cubing/puzzles";
import { readFileSync, writeFileSync } from "node:fs";
import { CubeCore, CubeState, invertNames, simplifyNames } from "../src/solver/core.js";
import { OLL_ALGS, PLL_ALGS, LBL_ALGS } from "../src/solver/algs.js";
import { MethodSolver } from "../src/solver/methods.js";
import { algToNames, physicalNames } from "../src/solver/notation.js";
import F2L_TABLE from "../src/data/f2l.json" with { type: "json" };
import CMLL_TABLE from "../src/data/cmll.json" with { type: "json" };

const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const solver = new MethodSolver(core);
const P = solver.P;
const toks = (a) => a.trim().split(/\s+/).filter(Boolean);
const apply = (s, names) => s.applyAll(core, core.parse(names));
const stateOf = (names) => apply(CubeState.solved(), names);
const U = ["", "U", "U2", "U'"].map((x) => (x ? [x] : []));
const llOriented = (s) => [0, 1, 2, 3].every((i) => s.eo[i] === 0 && s.co[i] === 0);
const cornersOkU = (s) => [0, 1, 2, 3].every((i) => s.cp[i] === i && s.co[i] === 0);
const fail = (msg) => { throw new Error(msg); };

const refPath = process.argv[2] || new URL("./reference-cases.json", import.meta.url).pathname;
const refs = JSON.parse(readFileSync(refPath, "utf8"));

// 一条写法的完整描述：显示用原文、动画用转动名（含整体转动）、物理等价写法、演示用 setup（= 物理写法的逆，固定黄顶绿前）
function variant(text, extra = {}) {
  const names = algToNames(text);
  const ph = physicalNames(names);
  return { text, names, physical: ph.moves, hasRotation: ph.hasRotation, setup: invertNames(ph.moves), ...extra };
}

// ---------------- 各集合的情况归类 ----------------
const uMove = core.idx("U");
const f2lClassOf = (s) => { let cc = s.cornerCodeOf(4), ec = s.edgeCodeOf(8); const ks = []; for (let n = 0; n < 4; n++) { ks.push(`${cc},${ec}`); cc = core.cCode[uMove][cc]; ec = core.eCode[uMove][ec]; } return ks.sort()[0]; };
const ollPatternKey = (s) => [0, 1, 2, 3].map((i) => s.co[i]).join("") + "/" + [0, 1, 2, 3].map((i) => s.eo[i]).join("");
const ollClassOf = (s) => U.map((a) => ollPatternKey(apply(s.clone(), a))).sort()[0];
// 顶层置换/角状态的“前后 AUF”归类：枚举 U^a · X · U^b，取最小键
function llClass(s, key) {
  const ks = [];
  for (const a of U) for (const b of U) {
    const x = stateOf(a); const y = stateOf(b);
    const r = CubeState.solved();
    for (let i = 0; i < 4; i++) { r.cp[i] = x.cp[s.cp[i]]; r.co[i] = (x.co[s.cp[i]] + s.co[i]) % 3; r.ep[i] = x.ep[s.ep[i]]; r.eo[i] = (x.eo[s.ep[i]] + s.eo[i]) % 2; }
    const r2 = CubeState.solved();
    for (let i = 0; i < 4; i++) { r2.cp[i] = r.cp[y.cp[i]]; r2.co[i] = (r.co[y.cp[i]] + y.co[i]) % 3; r2.ep[i] = r.ep[y.ep[i]]; r2.eo[i] = (r.eo[y.ep[i]] + y.eo[i]) % 2; }
    ks.push(key(r2));
  }
  return ks.sort()[0];
}
const pllClassOf = (s) => llClass(s, (r) => `${Array.from(r.cp.slice(0, 4)).join("")}/${Array.from(r.ep.slice(0, 4)).join("")}`);
const cmllClassOf = (s) => llClass(s, (r) => `${Array.from(r.cp.slice(0, 4)).join("")}/${Array.from(r.co.slice(0, 4)).join("")}`);
const otherSlotsOk = (s) => [5, 6, 7].every((c) => s.cornerOk(c)) && [9, 10, 11].every((e) => s.edgeOk(e));

// 每个集合：前置条件、归类函数、完成判定
const SETS = {
  F2L: { pre: (s) => P.cross(s) && otherSlotsOk(s) && !(s.cornerOk(4) && s.edgeOk(8)), cls: f2lClassOf, done: (s) => P.f2l(s) },
  OLL: { pre: (s) => P.f2l(s) && !llOriented(s), cls: ollClassOf, done: (s) => P.f2l(s) && llOriented(s) },
  PLL: { pre: (s) => P.f2l(s) && llOriented(s) && !s.isSolved(), cls: pllClassOf, done: (s) => s.isSolved() },
  CMLL: { pre: (s) => P.sb(s) && !U.some((a) => cornersOkU(apply(s.clone(), a))), cls: cmllClassOf, done: (s) => P.cmll(s) },
};

// ---------------- 本站写法：枚举全部情况 ----------------
const own = { F2L: new Map(), OLL: new Map(), PLL: new Map(), CMLL: new Map() };
function addOwn(set, text, extra = {}) {
  const v = variant(text, extra);
  const s = stateOf(v.setup);
  if (!SETS[set].pre(s)) fail(`${set} 本站写法的情况不满足前置条件：${text}`);
  if (!SETS[set].done(apply(s.clone(), v.physical))) fail(`${set} 本站写法无效：${text}`);
  const cls = SETS[set].cls(s);
  const prev = own[set].get(cls);
  if (!prev || v.physical.length < prev.physical.length) own[set].set(cls, { ...v, cls });
}
for (const alg of Object.values(F2L_TABLE.FR.cases)) addOwn("F2L", alg);
for (const alg of OLL_ALGS) { try { addOwn("OLL", alg); } catch (e) { if (!/前置条件|无效/.test(e.message)) throw e; } }
for (const { name, alg } of PLL_ALGS) addOwn("PLL", alg, { pllName: name });
for (const alg of CMLL_TABLE.algs) addOwn("CMLL", alg);
const EXPECT = { F2L: 41, OLL: 57, PLL: 21, CMLL: 42 };
for (const [k, n] of Object.entries(EXPECT)) if (own[k].size !== n) fail(`${k} 本站枚举得到 ${own[k].size} 类，应为 ${n}`);

// ---------------- 参考编号：按状态匹配，必须一一对应 ----------------
const byClass = { F2L: new Map(), OLL: new Map(), PLL: new Map(), CMLL: new Map() };
for (const r of refs) {
  const set = r.set;
  if (!SETS[set]) fail(`未知集合 ${set}`);
  const v = variant(r.alg, { url: r.url, source: "SpeedCubeDB" });
  const s = stateOf(v.setup);
  if (!SETS[set].pre(s)) fail(`参考 ${r.id} 的情况不满足 ${set} 前置条件`);
  if (!SETS[set].done(apply(s.clone(), v.physical))) fail(`参考 ${r.id} 写法执行后未达成 ${set} 目标`);
  const cls = SETS[set].cls(s);
  if (!own[set].has(cls)) fail(`参考 ${r.id} 不对应本站任何情况`);
  if (byClass[set].has(cls)) fail(`参考 ${r.id} 与 ${byClass[set].get(cls).id} 是同一情况`);
  byClass[set].set(cls, { id: r.id, group: r.group, ref: v });
}
for (const [k, n] of Object.entries(EXPECT)) if (byClass[k].size !== n) fail(`${k} 参考只匹配到 ${byClass[k].size}/${n} 类`);

// ---------------- 情况说明（本站自写） ----------------
const CORNER_FACES = ["UFR", "URB", "UBL", "ULF", "DRF", "DFL", "DLB", "DBR"];
const EDGE_FACES = ["UF", "UR", "UB", "UL", "DF", "DR", "DB", "DL", "FR", "FL", "BR", "BL"];
const FACE_WORD = { U: "上", D: "下", F: "前", B: "后", R: "右", L: "左" };
const cName = ["前右", "后右", "后左", "前左"], eName = ["前", "右", "后", "左"];
const whiteFace = (cc) => { const pos = (cc / 3) | 0, ori = cc % 3; return CORNER_FACES[pos][(3 - ori) % 3]; };
const greenFace = (ec) => EDGE_FACES[ec >> 1][ec & 1];
function f2lDesc(s) {
  const cc = s.cornerCodeOf(4), ec = s.edgeCodeOf(8);
  const cPos = (cc / 3) | 0, ePos = ec >> 1;
  const corner = cPos < 4 ? `角块在顶层${cName[cPos]}，白色朝${FACE_WORD[whiteFace(cc)]}` : cPos === 4 ? `角块在槽里，白色朝${FACE_WORD[whiteFace(cc)]}` : "角块在别的槽";
  const edge = ePos < 4 ? `棱块在顶层${eName[ePos]}，绿色朝${FACE_WORD[greenFace(ec)]}` : ePos === 8 ? `棱块在槽里，${ec & 1 ? "方向反了" : "方向正确"}` : "棱块在别的槽";
  const where = cPos < 4 && ePos < 4 ? "both-up" : cPos === 4 && ePos === 8 ? "both-slot" : cPos === 4 ? "corner-slot" : "edge-slot";
  return { text: `${corner}；${edge}`, where };
}
const F2L_GROUP_WHERE = { "Free Pairs": "both-up", "Disconnected Pairs": "both-up", "Connected Pairs": "both-up", "Corner In Slot": "corner-slot", "Edge In Slot": "edge-slot", "Pieces In Slot": "both-slot" };
function ollShape(s) {
  const e = [0, 1, 2, 3].filter((k) => s.eo[k] === 0).length, c = [0, 1, 2, 3].filter((k) => s.co[k] === 0).length;
  const eShape = e === 4 ? "棱已成十字" : e === 0 ? "棱为“点”" : ((s.eo[0] === 0 && s.eo[2] === 0) || (s.eo[1] === 0 && s.eo[3] === 0)) ? "棱为“一字”" : "棱为“L 形”";
  return { text: `${eShape}，${c} 个角已朝上`, edgesUp: e, cornersUp: c };
}
// CMLL 朝向分组：用公认的 OCLL 公式反算每种角朝向图案的组名，再与参考分组核对
const coKey = (s) => [0, 1, 2, 3].map((i) => s.co[i]).join("");
const coClass = (s) => U.map((a) => coKey(apply(s.clone(), a))).sort()[0];
const OCLL_REF = { H: "R U R' U R U' R' U R U2 R'", Pi: "R U2 R2 U' R2 U' R2 U2 R", U: "R2 D R' U2 R D' R' U2 R'", T: "r U R' U' r' F R F'", L: "F R' F' r U R U' r'", Sune: "R U R' U R U2 R'", "Anti Sune": "R U2 R' U' R U' R'" };
const groupOfCo = new Map([["0000", "Solved"]]);
for (const [g, alg] of Object.entries(OCLL_REF)) groupOfCo.set(coClass(stateOf(invertNames(toks(alg)))), g);

// ---------------- 组装四个标准集合 ----------------
const lib = {};
for (const set of ["F2L", "OLL", "PLL", "CMLL"]) {
  const cases = [];
  for (const [cls, o] of own[set]) {
    const m = byClass[set].get(cls);
    const s = stateOf(m.ref.setup); // 主写法（社区写法）的演示情况
    const c = { set, id: m.id, group: m.group, cls, primary: "ref", ref: m.ref, own: { text: o.names.join(" "), names: o.names, physical: o.physical, setup: o.setup } };
    if (set === "F2L") {
      const d = f2lDesc(s); c.desc = d.text;
      if (F2L_GROUP_WHERE[m.group] !== d.where) fail(`F2L ${m.id} 分组 ${m.group} 与本站判定 ${d.where} 不一致`);
    } else if (set === "OLL") {
      const d = ollShape(s); c.desc = d.text;
      if (m.group === "Dot Case" && d.edgesUp !== 0) fail(`OLL ${m.id} 应为点型`);
      if (m.group === "OCLL" && !(d.edgesUp === 4 && d.cornersUp < 4)) fail(`OLL ${m.id} 应为 OCLL`);
      if (m.group === "All Corners Oriented" && d.cornersUp !== 4) fail(`OLL ${m.id} 应为角全朝上`);
    } else if (set === "PLL") {
      const solvedCorners = U.some((a) => { const t = apply(s.clone(), a); return [0, 1, 2, 3].every((i) => t.cp[i] === i); });
      if ((m.group === "EPLL") !== solvedCorners) fail(`PLL ${m.id} 分组 ${m.group} 与角块状态不符`);
      c.ownName = o.pllName;
      if (o.pllName && o.pllName !== m.id) fail(`PLL 本站名称 ${o.pllName} 与参考 ${m.id} 对不上`);
      c.desc = m.group === "EPLL" ? "只换棱：四个角已经对好" : m.group === "Adj Swap" ? "需要交换相邻的两个角" : "需要交换对角的两个角";
    } else if (set === "CMLL") {
      const g = groupOfCo.get(coClass(s));
      const want = m.group;
      if (g !== want) fail(`CMLL ${m.id} 参考分组 ${want} 与本站角朝向判定 ${g} 不一致`);
      const up = [0, 1, 2, 3].filter((i) => s.co[i] === 0).length;
      c.desc = g === "Solved" ? "四个角都已朝上，只差位置" : `${up} 个角朝上`;
    }
    cases.push(c);
  }
  // 按参考编号自然顺序排列（编号来自状态匹配，不是数组位置）
  const num = (id) => { const x = id.match(/(\d+)$/); return x ? Number(x[1]) : 0; };
  const refOrder = refs.filter((r) => r.set === set).map((r) => r.id);
  cases.sort((a, b) => (set === "F2L" || set === "OLL" ? num(a.id) - num(b.id) : refOrder.indexOf(a.id) - refOrder.indexOf(b.id)));
  lib[set] = cases;
}

// ---------------- 层先法入门公式：每条配演示情况 ----------------
const lbl = [];
{
  const trig = toks(LBL_ALGS.cornerTrigger.DRF);
  for (const reps of [1, 3, 5]) {
    const names = [].concat(...Array(reps).fill(trig));
    const setup = invertNames(names);
    const s = stateOf(setup);
    if (!P.cross(s) || s.cornerOk(4)) fail("层先法角演示异常");
    const pos = [0, 1, 2, 3, 4, 5, 6, 7].find((i) => s.cp[i] === 4);
    const wf = whiteFace(pos * 3 + s.co[pos]);
    lbl.push({ id: `corner-${reps}`, step: "底层四角", title: `白色朝${FACE_WORD[wf]}：重复 ${reps} 次`, alg: LBL_ALGS.cornerTrigger.DRF, reps, moves: names, setup, focus: { c: [4], e: [] }, keep: "cross", show: "firstLayer", cam: "side", goal: "白绿橙角块归位，十字和其他底角不受影响。" });
  }
}
for (const [id, key, step, keep, title, goal, focus] of [
  ["edge-right", "edgeRight", "中层四棱", "firstLayer", "中层棱：向右插入", "顶层的绿橙棱块对准绿色中心后，插入右前槽；底层不受影响。", { e: [8], c: [] }],
  ["edge-left", "edgeLeft", "中层四棱", "firstLayer", "中层棱：向左插入", "顶层的绿红棱块对准绿色中心后，插入左前槽；底层不受影响。", { e: [9], c: [] }],
  ["yellow-cross", "yellowCross", "顶层十字", "f2l", "顶层十字：一字 → 十字", "黄色“一字”横放时做一次，顶面出现黄十字。L 形和点要多做几次（L 形放左后）。", { e: [0, 1, 2, 3], c: [] }],
  ["sune", "sune", "顶面同色", "f2l", "顶面同色：小鱼公式", "顶面已有黄十字和一个黄角（小鱼头朝左下）时做一次，顶面全黄。", { e: [], c: [0, 1, 2, 3] }],
  ["corner-cycle", "cornerCycle", "顶层角归位", "f2l", "顶层角：A 型换角", "同一侧两个角颜色一致（“车灯”）放在后面，做一次，三个角循环换位。", { e: [], c: [0, 1, 2, 3] }],
  ["edge-cycle-a", "edgeCycleA", "顶层棱归位", "f2l", "顶层棱：U 型换棱（一个方向）", "已对好的一面放在后面，前、左、右三条棱循环换位。", { e: [0, 1, 2, 3], c: [] }],
  ["edge-cycle-b", "edgeCycleB", "顶层棱归位", "f2l", "顶层棱：U 型换棱（另一个方向）", "已对好的一面放在后面，三条棱沿另一个方向循环。", { e: [0, 1, 2, 3], c: [] }],
]) {
  const alg = LBL_ALGS[key];
  const names = algToNames(alg);
  const ph = physicalNames(names).moves;
  const setup = invertNames(ph);
  const s = stateOf(setup);
  if (!P[keep](s) || s.isSolved() || !apply(s.clone(), ph).isSolved()) fail(`层先法演示 ${id} 异常`);
  const show = keep === "firstLayer" ? "f2l" : "all";
  lbl.push({ id, step, title, alg, moves: names, setup, focus, keep, show, cam: keep === "firstLayer" ? "side" : "top", goal });
}

// ---------------- LSE：穷举 ⟨M,U⟩ 状态空间后确定性挑选 ----------------
// 只取“中心与顶层角都已对齐”的状态（中心对齐时坏棱的数法与人工判断一致）。坏棱数分布见报告。
const lseMoves = ["M", "M'", "M2", "U", "U'", "U2"].map((n) => core.idx(n));
const seen = new Map([[CubeState.solved().key(), CubeState.solved()]]);
let frontier = [CubeState.solved()];
while (frontier.length) {
  const next = [];
  for (const s of frontier) for (const m of lseMoves) { const t = s.clone().apply(core, m); const k = t.key(); if (!seen.has(k)) { seen.set(k, t); next.push(t); } }
  frontier = next;
}
const eoBad = (s) => [0, 1, 2, 3, 4, 6].filter((p) => s.eo[p] !== 0).length;
const aligned = [...seen.entries()].filter(([, s]) => s.zp[0] === 0 && cornersOkU(s)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
const lseDist = {};
for (const [, s] of aligned) lseDist[eoBad(s)] = (lseDist[eoBad(s)] || 0) + 1;
const lse = [];
const LSE_SUB = [["4a", "棱块定向（EO）", P.lseEOFree, { e: [0, 1, 2, 3, 4, 6], c: [] }], ["4b", "放好左右两棱（UL / UR）", P.lseULUR, { e: [1, 3], c: [] }], ["4c", "完成 M 层，中心一起归位", P.rouxSolved, { e: [0, 2, 4, 6], c: [] }]];
for (const want of [2, 4, 6]) {
  const cands = [];
  for (const [key, s0] of aligned) {
    if (eoBad(s0) !== want) continue;
    const t = s0.clone();
    const stages = [];
    let ok = true;
    for (const [gi, [id, title, goal, focus]] of LSE_SUB.entries()) {
      const mv = solver.lseSearch(t, gi, 16);
      if (!mv || !mv.length) { ok = false; break; }
      apply(t, mv);
      if (!goal(t)) { ok = false; break; }
      stages.push({ id, title, moves: mv, focus });
    }
    if (!ok || !t.isSolved()) continue;
    cands.push({ key, stages, len: stages.reduce((n, x) => n + x.moves.length, 0) });
    if (cands.length >= 240) break;
  }
  if (!cands.length) fail(`LSE：坏棱 ${want} 条的例子不存在？`);
  cands.sort((a, b) => a.len - b.len || (a.key < b.key ? -1 : 1));
  const pick = cands[Math.floor(cands.length / 2)];
  lse.push({ id: `lse-${want}`, title: `坏棱 ${want} 条`, bad: want, setup: invertNames(pick.stages.flatMap((x) => x.moves)), stages: pick.stages, len: pick.len });
}

const out = {
  generatedAt: new Date().toISOString(),
  reference: { file: "tools/reference-cases.json", sha256: "f71d44d2a628761e7808d88b33c3a8034340e5e0a11b9cc24e0995e2716f7a87", source: "SpeedCubeDB（每个情况取其首条社区写法；编号与分组按状态匹配）" },
  counts: { F2L: lib.F2L.length, OLL: lib.OLL.length, PLL: lib.PLL.length, CMLL: lib.CMLL.length, LBL: lbl.length, LSE: lse.length },
  lseStateSpace: { reachable: seen.size, alignedCentersAndCorners: aligned.length, badEdgeDistribution: lseDist },
  F2L: lib.F2L, OLL: lib.OLL, PLL: lib.PLL, CMLL: lib.CMLL, LBL: lbl, LSE: lse,
};
writeFileSync(new URL("../src/data/library.json", import.meta.url), JSON.stringify(out));
console.log(JSON.stringify(out.counts), "LSE 状态空间", JSON.stringify(out.lseStateSpace));
const rot = Object.values(lib).flat().filter((c) => c.ref.hasRotation).length;
console.log(`社区写法含整体转动：${rot} 条；与本站写法完全相同：${Object.values(lib).flat().filter((c) => c.ref.physical.join(" ") === c.own.physical.join(" ")).length} 条`);
