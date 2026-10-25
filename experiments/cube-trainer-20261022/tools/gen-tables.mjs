// 离线生成：CFOP 的 F2L 槽位表、Roux 的 CMLL 公式表。
// 两者都由 IDA* 搜索得到，并在生成后逐条模拟验证；结果写入 src/data/*.json。
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore, CubeState, simplifyNames } from "../src/solver/core.js";
import { buildTable, PieceSearch } from "../src/solver/search.js";
import { writeFileSync } from "node:fs";

const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
const mv = (s) => s.split(" ").map((x) => core.idx(x));
const fam = (f) => [f, f + "2", f + "'"].map((x) => core.idx(x));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

// ---------------- F2L ----------------
const SLOTS = {
  FR: { corner: 4, edge: 8, faces: ["R", "U", "F"] },
  FL: { corner: 5, edge: 9, faces: ["L", "U", "F"] },
  BR: { corner: 7, edge: 10, faces: ["R", "U", "B"] },
  BL: { corner: 6, edge: 11, faces: ["L", "U", "B"] },
};
const U_EDGES = [0, 1, 2, 3], U_CORNERS = [0, 1, 2, 3];
const f2l = {};
for (const [slot, def] of Object.entries(SLOTS)) {
  const moves = def.faces.flatMap(fam);
  // 这些转动会碰到的非顶层位置：都必须复原
  const touchedE = new Set(), touchedC = new Set();
  for (const m of moves) {
    for (let i = 0; i < 12; i++) if (core.ePerm[m][i] !== i && !U_EDGES.includes(i)) touchedE.add(i);
    for (let i = 0; i < 8; i++) if (core.cPerm[m][i] !== i && !U_CORNERS.includes(i)) touchedC.add(i);
  }
  const keepE = [...touchedE].filter((p) => p !== def.edge).sort((a, b) => a - b);
  const keepC = [...touchedC].filter((p) => p !== def.corner).sort((a, b) => a - b);
  const edges = [def.edge, ...keepE], corners = [def.corner, ...keepC];
  const tables = [
    buildTable(core, [def.edge], [def.corner], moves),
    buildTable(core, keepE, [], moves),
    buildTable(core, [], corners, moves),
    buildTable(core, [def.edge, keepE[0], keepE[1]], [keepC[0]], moves),
    buildTable(core, [def.edge, keepE[2], keepE[3]], [keepC[1]], moves),
  ];
  const search = new PieceSearch(core, { edges, corners, moves, tables });
  const entries = {};
  let maxLen = 0, total = 0, n = 0;
  const cCodes = [...U_CORNERS, def.corner].flatMap((p) => [p * 3, p * 3 + 1, p * 3 + 2]);
  const eCodes = [...U_EDGES, def.edge].flatMap((p) => [p * 2, p * 2 + 1]);
  for (const cc of cCodes) for (const ec of eCodes) {
    if (cc === def.corner * 3 && ec === def.edge * 2) continue;
    // 构造一个只关心被跟踪块的状态：把目标角/棱放到指定代码，其余跟踪块在家
    const s = CubeState.solved();
    const placeCorner = (piece, code) => { const pos = (code / 3) | 0, ori = code % 3; const other = s.cp[pos]; const from = s.cp.indexOf(piece); s.cp[from] = other; s.co[from] = 0; s.cp[pos] = piece; s.co[pos] = ori; };
    const placeEdge = (piece, code) => { const pos = code >> 1, ori = code & 1; const other = s.ep[pos]; const from = s.ep.indexOf(piece); s.ep[from] = other; s.eo[from] = 0; s.ep[pos] = piece; s.eo[pos] = ori; };
    placeCorner(def.corner, cc); placeEdge(def.edge, ec);
    const sol = search.solve(s, { maxDepth: 16, maxNodes: 3e8 });
    if (!sol) throw new Error(`F2L ${slot} ${cc}/${ec} 无解`);
    const names = core.names(sol);
    // 验证：对该状态施加后，目标对与所有需保持的位置复原
    const v = s.clone().applyAll(core, sol);
    if (!edges.every((p) => v.edgeOk(p)) || !corners.every((p) => v.cornerOk(p))) throw new Error("F2L 验证失败");
    entries[`${cc},${ec}`] = names.join(" ");
    maxLen = Math.max(maxLen, sol.length); total += sol.length; n++;
  }
  f2l[slot] = { corner: def.corner, edge: def.edge, moveSet: def.faces.join(""), cases: entries };
  log(`F2L ${slot}: ${n} 种情况，平均 ${(total / n).toFixed(2)} 步，最长 ${maxLen}`);
}
writeFileSync(new URL("../src/data/f2l.json", import.meta.url), JSON.stringify(f2l));

// ---------------- CMLL ----------------
// 目标：两侧 1×2×3 块（FB+SB）不变，顶层 4 角归位；M 层棱块、UL/UR 棱、M 层中心随意。
const cmllMoves = ["R", "U", "F", "L"].flatMap(fam);
const blockE = [5, 7, 8, 9, 10, 11];
const allC = [0, 1, 2, 3, 4, 5, 6, 7];
const cmTables = [
  buildTable(core, [], [0, 1, 2, 3], cmllMoves),
  buildTable(core, [], [4, 5, 6, 7], cmllMoves),
  buildTable(core, [7, 9, 11], [], cmllMoves),
  buildTable(core, [5, 8, 10], [], cmllMoves),
  buildTable(core, [8, 9], [4, 5], cmllMoves),
  buildTable(core, [10, 11], [6, 7], cmllMoves),
];
log("CMLL 剪枝表完成");
const cmSearch = new PieceSearch(core, { edges: blockE, corners: allC, moves: cmllMoves, tables: cmTables });
const U = core.idx("U");
function cornerState(perm, ori) {
  const s = CubeState.solved();
  for (let i = 0; i < 4; i++) { s.cp[i] = perm[i]; s.co[i] = ori[i]; }
  return s;
}
const perms = []; (function rec(a, rest) { if (!rest.length) perms.push(a); rest.forEach((x, i) => rec([...a, x], rest.filter((_, j) => j !== i))); })([], [0, 1, 2, 3]);
const oris = [];
for (let c = 0; c < 27; c++) { const o = [c % 3, ((c / 3) | 0) % 3, ((c / 9) | 0) % 3]; o.push((6 - o[0] - o[1] - o[2]) % 3); oris.push(o); }
const keyC = (s) => Array.from(s.cp.slice(0, 4)).join("") + Array.from(s.co.slice(0, 4)).join("");
// 状态与 AUF 的复合
const AUFS = [[], [U], [core.idx("U2")], [core.idx("U'")]];
const classOf = (s) => {
  const ks = [];
  for (const a of AUFS) for (const b of AUFS) {
    // 前置 AUF（先对“已还原”转 a，再施加状态 s 的置换，再转 b）
    const x = CubeState.solved().applyAll(core, a);
    const r = CubeState.solved();
    for (let i = 0; i < 4; i++) { r.cp[i] = x.cp[s.cp[i]]; r.co[i] = (x.co[s.cp[i]] + s.co[i]) % 3; }
    const y = CubeState.solved().applyAll(core, b);
    const r2 = CubeState.solved();
    for (let i = 0; i < 4; i++) { r2.cp[i] = r.cp[y.cp[i]]; r2.co[i] = (r.co[y.cp[i]] + y.co[i]) % 3; }
    ks.push(keyC(r2));
  }
  return ks.sort()[0];
};
const classes = new Map();
for (const p of perms) for (const o of oris) {
  const s = cornerState(p, o);
  const c = classOf(s);
  if (!classes.has(c)) classes.set(c, s);
}
log(`CMLL：顶层角状态 ${perms.length * oris.length} 个，按前后 AUF 归为 ${classes.size} 类（含已还原）`);
const cmll = [];
const cornersSolved = (s) => [0, 1, 2, 3, 4, 5, 6, 7].every((i) => s.cornerOk(i));
for (const [cls, rep] of classes) {
  if (cornersSolved(rep)) continue;
  let best = null;
  for (const a of AUFS) {
    const s = rep.clone().applyAll(core, a);
    const sol = cmSearch.solve(s, { maxDepth: 16, maxNodes: 2e9 });
    if (sol && (!best || sol.length < best.length)) best = sol;
  }
  // 去掉首尾的 U（由运行时的前后 AUF 负责）
  let names = core.names(best);
  while (names.length && names[0][0] === "U") names.shift();
  while (names.length && names[names.length - 1][0] === "U") names.pop();
  names = simplifyNames(names);
  cmll.push({ cls, alg: names.join(" ") });
  log(`CMLL ${cmll.length}: ${names.join(" ")} (${names.length})`);
}
// 覆盖性验证：所有 648 个状态都能被（前AUF + 某公式 + 后AUF）解决，且两侧块不变
let uncovered = 0;
for (const p of perms) for (const o of oris) {
  const s0 = cornerState(p, o);
  if ([0, 1, 2, 3].every((i) => s0.cp[i] === i && s0.co[i] === 0)) continue;
  let ok = false;
  outer: for (const a of AUFS) for (const c of cmll) for (const b of AUFS) {
    const s = s0.clone().applyAll(core, a).applyAll(core, mv(c.alg)).applyAll(core, b);
    if (cornersSolved(s) && blockE.every((e) => s.edgeOk(e))) { ok = true; break outer; }
    // 也允许只差 AUF 的状态（纯 U 转动）
  }
  if (!ok) {
    // 纯 AUF 情况
    const pure = AUFS.some((a) => cornersSolved(s0.clone().applyAll(core, a)));
    if (!pure) uncovered++;
  }
}
log(`CMLL 公式 ${cmll.length} 条；未覆盖状态 ${uncovered}`);
if (uncovered) throw new Error("CMLL 覆盖不完整");
writeFileSync(new URL("../src/data/cmll.json", import.meta.url), JSON.stringify({ moveSet: "RUFL", algs: cmll.map((c) => c.alg) }));
log("完成");
