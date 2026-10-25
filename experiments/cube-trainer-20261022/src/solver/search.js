// 通用“块子集”剪枝表 + IDA* 搜索。
// 被跟踪的块用代码表示：边 code = 位置*2+朝向，角 code = 位置*3+朝向，取值 0..23。
// 某组块的目标：每个块回到自己的家（piece*2 或 piece*3，朝向 0）。

import { axisOf } from "./core.js";

const FAMILY_ORDER = { U: 0, u: 1, E: 2, d: 3, D: 4, R: 0, r: 1, M: 2, l: 3, L: 4, F: 0, f: 1, S: 2, b: 3, B: 4, x: 9, y: 9, z: 9 };

// 预计算：连续两步 a→b 是否允许（同轴只允许按固定顺序，避免可交换的重复搜索）
export function makeMovePruner(core, moves) {
  const n = moves.length;
  const allow = [];
  for (let i = 0; i <= n; i++) {
    const row = new Uint8Array(n);
    for (let j = 0; j < n; j++) {
      if (i === n) { row[j] = 1; continue; }
      const a = core.moveNames[moves[i]], b = core.moveNames[moves[j]];
      if (axisOf(a) !== axisOf(b)) { row[j] = 1; continue; }
      row[j] = FAMILY_ORDER[b[0]] > FAMILY_ORDER[a[0]] ? 1 : 0;
    }
    allow.push(row);
  }
  return allow; // allow[prevIndex or n(none)][nextIndex]
}

// 精确距离表：跟踪 edges（块编号）与 corners（块编号），在给定 moves 下 BFS
export function buildTable(core, edges, corners, moves) {
  const k = edges.length + corners.length;
  const size = 24 ** k;
  const dist = new Uint8Array(size).fill(255);
  const trans = [];
  for (const m of moves) {
    const row = [];
    for (let i = 0; i < edges.length; i++) row.push(core.eCode[m]);
    for (let i = 0; i < corners.length; i++) row.push(core.cCode[m]);
    trans.push(row);
  }
  const home = [...edges.map((p) => p * 2), ...corners.map((p) => p * 3)];
  let goal = 0;
  for (let i = k - 1; i >= 0; i--) goal = goal * 24 + home[i];
  dist[goal] = 0;
  let frontier = new Int32Array([goal]);
  let depth = 0;
  const codes = new Int32Array(k);
  while (frontier.length) {
    const next = [];
    for (let f = 0; f < frontier.length; f++) {
      let x = frontier[f];
      for (let i = 0; i < k; i++) { codes[i] = x % 24; x = (x / 24) | 0; }
      for (let m = 0; m < moves.length; m++) {
        const tr = trans[m];
        let y = 0;
        for (let i = k - 1; i >= 0; i--) y = y * 24 + tr[i][codes[i]];
        if (dist[y] === 255) { dist[y] = depth + 1; next.push(y); }
      }
    }
    frontier = Int32Array.from(next);
    depth++;
  }
  return { edges, corners, dist, k, maxDepth: depth - 1 };
}

// 一个搜索问题：跟踪块（边、角），若干张剪枝表（每张表覆盖跟踪块的子集）
export class PieceSearch {
  constructor(core, { edges = [], corners = [], moves, tables = [] }) {
    this.core = core;
    this.edges = edges; this.corners = corners;
    this.moves = moves;
    this.k = edges.length + corners.length;
    this.allow = makeMovePruner(core, moves);
    // 每步的代码转移表
    this.trans = moves.map((m) => [...edges.map(() => core.eCode[m]), ...corners.map(() => core.cCode[m])]);
    this.home = [...edges.map((p) => p * 2), ...corners.map((p) => p * 3)];
    // 表 → 在跟踪数组中的下标
    this.tables = tables.map((t) => {
      const idx = [
        ...t.edges.map((p) => { const i = edges.indexOf(p); if (i < 0) throw new Error("表中边块未被跟踪"); return i; }),
        ...t.corners.map((p) => { const i = corners.indexOf(p); if (i < 0) throw new Error("表中角块未被跟踪"); return edges.length + i; }),
      ];
      return { dist: t.dist, idx };
    });
  }
  codesOf(state) {
    return Int32Array.from([...this.edges.map((p) => state.edgeCodeOf(p)), ...this.corners.map((p) => state.cornerCodeOf(p))]);
  }
  h(codes) {
    let best = 0;
    for (const t of this.tables) {
      let x = 0;
      for (let i = t.idx.length - 1; i >= 0; i--) x = x * 24 + codes[t.idx[i]];
      const d = t.dist[x];
      if (d > best) best = d;
    }
    return best;
  }
  isGoal(codes) { for (let i = 0; i < this.k; i++) if (codes[i] !== this.home[i]) return false; return true; }

  // 返回最短解（moves 中元素组成的 core 下标数组）；超过 maxDepth 或 maxNodes 返回 null
  solve(state, { maxDepth = 20, maxNodes = 5e7, extraGoal = null } = {}) {
    const start = this.codesOf(state);
    const k = this.k;
    const n = this.moves.length;
    const path = new Int32Array(maxDepth + 1);
    const stack = [];
    for (let d = 0; d <= maxDepth + 1; d++) stack.push(new Int32Array(k));
    let nodes = 0;
    const self = this;
    function dfs(depth, bound, prev) {
      const cur = stack[depth];
      if (self.isGoal(cur) && (!extraGoal || extraGoal(path.subarray(0, depth)))) return depth;
      const hv = self.h(cur);
      if (depth + hv > bound) return -1;
      if (depth === bound) return -1;
      if (++nodes > maxNodes) return -3;
      const nxt = stack[depth + 1];
      const allowRow = self.allow[prev];
      for (let j = 0; j < n; j++) {
        if (!allowRow[j]) continue;
        const tr = self.trans[j];
        for (let i = 0; i < k; i++) nxt[i] = tr[i][cur[i]];
        path[depth] = j;
        const r = dfs(depth + 1, bound, j);
        if (r >= 0 || r === -3) return r;
      }
      return -1;
    }
    stack[0].set(start);
    if (this.isGoal(start) && (!extraGoal || extraGoal(path.subarray(0, 0)))) return [];
    for (let bound = Math.max(1, this.h(start)); bound <= maxDepth; bound++) {
      const r = dfs(0, bound, n);
      if (r === -3) return null;
      if (r >= 0) return Array.from(path.subarray(0, r), (j) => this.moves[j]);
    }
    return null;
  }
}

// 同时跟踪多个候选（比如“先做哪一个 F2L 槽/哪一侧方块”）时，挑总步数最少的
export function pickBest(cands) {
  let best = null;
  for (const c of cands) if (c && (!best || c.len < best.len)) best = c;
  return best;
}
