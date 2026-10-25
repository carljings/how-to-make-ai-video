import { CubeState, invertNames } from "../solver/core.js";
import { buildTable, PieceSearch } from "../solver/search.js";
import { GeoCube, FACE_NORMAL, mulMV } from "../render/geometry.js";

export const SLOTS = { FR: { c: 4, e: 8, label: "右前", color: "绿", face: "F" }, FL: { c: 5, e: 9, label: "左前", color: "绿", face: "F" }, BR: { c: 7, e: 10, label: "右后", color: "蓝", face: "B" }, BL: { c: 6, e: 11, label: "左后", color: "蓝", face: "B" } };
export const EDGE_POS = ["UF", "UR", "UB", "UL", "DF", "DR", "DB", "DL", "FR", "FL", "BR", "BL"];
export const CORNER_POS = ["UFR", "URB", "UBL", "ULF", "DRF", "DFL", "DLB", "DBR"];
export const FACE_LABEL = { U: "上", D: "下", F: "前", B: "后", L: "左", R: "右" };

// 从 cubing.js 的独立重算结果检查目标，不读取搜索器的“成功”标记。
export function inspect(kp, setup, moves = []) {
  const p = kp.defaultPattern().applyAlg([...setup, ...moves].join(" ")).patternData;
  const edge = (i) => p.EDGES.pieces[i] === i && p.EDGES.orientation[i] === 0;
  const corner = (i) => p.CORNERS.pieces[i] === i && p.CORNERS.orientation[i] === 0;
  const centers = p.CENTERS.pieces.every((x, i) => x === i);
  const cross = centers && [4, 5, 6, 7].every(edge);
  const slots = Object.entries(SLOTS).filter(([, s]) => edge(s.e) && corner(s.c)).map(([k]) => k);
  const f2l = cross && slots.length === 4;
  const oll = f2l && [0, 1, 2, 3].every((i) => p.EDGES.orientation[i] === 0 && p.CORNERS.orientation[i] === 0);
  const blocks = [7, 9, 11, 5, 8, 10].every(edge) && [4, 5, 6, 7].every(corner);
  const cmll = blocks && [0, 1, 2, 3].every(corner);
  const solved = centers && Array.from({ length: 12 }, (_, i) => i).every(edge) && Array.from({ length: 8 }, (_, i) => i).every(corner);
  return { p, cross, slots, f2l, oll, cmll, solved, edges: [4, 5, 6, 7].map((i) => ({ name: EDGE_POS[i], ok: edge(i), position: EDGE_POS[p.EDGES.pieces.indexOf(i)], oriented: p.EDGES.orientation[p.EDGES.pieces.indexOf(i)] === 0 })) };
}

export function parsePlan(text) {
  const t = text.replace(/[’‘′]/g, "'").trim();
  if (!t) return { error: "先写出你的方案，或用下方按钮逐步组成。" };
  const moves = t.split(/\s+/);
  if (moves.length > 80 || moves.some((m) => !/^[UDLRFB](2|')?$/.test(m))) return { error: "这里练固定白底十字，只用 U D L R F B、逆时针 ' 和半圈 2，最多 80 步。" };
  return { moves };
}

export function tracked(kp, setup, moves, slot) {
  const { p } = inspect(kp, setup, moves), s = SLOTS[slot];
  const geo = new GeoCube().applyAll([...setup, ...moves]);
  const facing = (key, face) => {
    const c = geo.cubies.find((x) => x.piece.key === key);
    const n = mulMV(c.rot, FACE_NORMAL[face]);
    return Object.keys(FACE_NORMAL).find((f) => FACE_NORMAL[f].every((v, i) => v === n[i]));
  };
  return { corner: CORNER_POS[p.CORNERS.pieces.indexOf(s.c)], edge: EDGE_POS[p.EDGES.pieces.indexOf(s.e)], white: facing("C" + s.c, "D"), color: facing("E" + s.e, s.face) };
}

export class CrossPlanner {
  constructor(core) {
    this.core = core;
    this.moves = ["U", "D", "L", "R", "F", "B"].flatMap((f) => [f, f + "2", f + "'"]).map((n) => core.idx(n));
    this.table = buildTable(core, [4, 5, 6, 7], [], this.moves);
    this.search = new PieceSearch(core, { edges: [4, 5, 6, 7], moves: this.moves, tables: [this.table] });
  }
  state(setup) { return CubeState.solved().applyAll(this.core, this.core.parse(setup)); }
  solve(setup) {
    const s = this.state(setup), distance = this.search.h(this.search.codesOf(s));
    const result = this.search.solve(s, { maxDepth: 8, maxNodes: 2000000 });
    if (!result) throw new Error("十字搜索未完成");
    return { moves: this.core.names(result), distance };
  }
  alternatives(setup, limit = 3) {
    const s = this.state(setup), distance = this.search.h(this.search.codesOf(s));
    if (!distance) return [[]];
    const out = [];
    for (const m of this.moves) {
      const next = s.clone().apply(this.core, m);
      if (this.search.h(this.search.codesOf(next)) !== distance - 1) continue;
      const tail = this.search.solve(next, { maxDepth: distance - 1, maxNodes: 2000000 });
      if (tail) out.push([this.core.moveNames[m], ...this.core.names(tail)]);
      if (out.length === limit) break;
    }
    return out;
  }
}

export function caseSequence(set, item) {
  if (set === "LSE") return { setup: item.setup, stages: item.stages, moves: item.stages.flatMap((x) => x.moves), goal: "solved" };
  if (set === "LBL") return { setup: item.setup, moves: item.moves, goal: "solved", stages: [{ title: item.title, moves: item.moves }] };
  const a = item.ref || item.own;
  return { setup: a.setup || invertNames(a.physical), moves: a.physical, goal: { F2L: "f2l", OLL: "oll", PLL: "solved", CMLL: "cmll" }[set], stages: [{ title: set, moves: a.physical }] };
}
