// 三种方法的分阶段求解器：层先法（LBL）、CFOP、桥式（Roux）。
// 每个阶段结束时都用 predicates.js 中的阶段目标检查一次；不满足就抛错（绝不“假装完成”）。

import { CubeState, derotate, simplifyNames, splitMove, joinMove, EDGE_NAMES, CORNER_NAMES } from "./core.js";
import { buildTable, PieceSearch } from "./search.js";
import { makePredicates, SLOT_PIECES, slotsOk, CROSS_E, FB_E, FB_C, SB_E, SB_C, LSE_E } from "./predicates.js";
import { OLL_ALGS, PLL_ALGS, LBL_ALGS } from "./algs.js";
import F2L_TABLE from "../data/f2l.json" with { type: "json" };
import CMLL_TABLE from "../data/cmll.json" with { type: "json" };

// ---------- 颜色与块名（显示用：黄顶、白底、绿前、橙右、红左、蓝后） ----------
export const FACE_COLOR_NAME = { U: "黄", D: "白", F: "绿", B: "蓝", R: "橙", L: "红" };
const pieceName = (letters) => letters.split("").map((f) => FACE_COLOR_NAME[f]).join("");
export const EDGE_LABEL = EDGE_NAMES.map((n) => pieceName(n) + "棱");
export const CORNER_LABEL = CORNER_NAMES.map((n) => pieceName(n) + "角");
const SLOT_LABEL = { FR: "右前槽", FL: "左前槽", BR: "右后槽", BL: "左后槽" };

export class MethodSolver {
  constructor(core) {
    this.core = core;
    const M = core.idx("M");
    this.P = makePredicates({ ePerm: core.ePerm[M], eDelta: core.eDelta[M], zPerm: core.zPerm[M] });
    this.face18 = ["U", "D", "L", "R", "F", "B"].flatMap((f) => [f, f + "2", f + "'"]).map((n) => core.idx(n));
    this.AUF = [[], ["U"], ["U2"], ["U'"]];
    this.cache = new Map();
    // 预处理公式（改写整体转动 → 下标）
    const prep = (a) => { const names = derotate(a.split(/\s+/)); return { text: a, names, moves: core.parse(names) }; };
    this.oll = OLL_ALGS.map(prep).filter((x) => this.P.f2l(CubeState.solved().applyAll(core, x.moves)));
    this.pll = PLL_ALGS.map((p) => ({ name: p.name, ...prep(p.alg) }));
    this.cmll = CMLL_TABLE.algs.map(prep);
    this.lbl = {};
    for (const [k, v] of Object.entries(LBL_ALGS)) {
      if (typeof v === "string") this.lbl[k] = prep(v);
      else this.lbl[k] = Object.fromEntries(Object.entries(v).map(([s, a]) => [s, prep(a)]));
    }
    // 中层插入公式：以 y^k 视角共轭，得到 4 个方向 × 左右两种
    this.midAlgs = [];
    const views = ["", "y", "y2", "y'"];
    const viewName = ["前面", "右面", "后面", "左面"];
    const rightSlot = ["FR", "BR", "BL", "FL"], leftSlot = ["FL", "FR", "BR", "BL"];
    views.forEach((v, i) => {
      for (const [key, slots, dir] of [["edgeRight", rightSlot, "向右"], ["edgeLeft", leftSlot, "向左"]]) {
        const base = LBL_ALGS[key];
        const full = v ? `${v} ${base} ${invRot(v)}` : base;
        const names = derotate(full.split(" "));
        this.midAlgs.push({ names, moves: core.parse(names), slot: slots[i], label: `从${viewName[i]}${dir}插入`, base });
      }
    });
    // U 型换棱的四个方向（避免顶层整体转动破坏已完成的角）
    this.uPerms = [];
    views.forEach((v, i) => {
      for (const key of ["edgeCycleA", "edgeCycleB"]) {
        const base = LBL_ALGS[key];
        const names = derotate((v ? `${v} ${base} ${invRot(v)}` : base).split(" "));
        this.uPerms.push({ names, moves: core.parse(names), label: `已对好的一面放在${["后面", "左面", "前面", "右面"][i]}`, base });
      }
    });
    // F2L：取出卡在其他槽里的块
    this.extract = {
      FR: ["R U R'", "R U' R'", "F' U' F", "F' U F"], FL: ["L' U' L", "L' U L", "F U F'", "F U' F'"],
      BR: ["R' U' R", "R' U R", "B U B'", "B U' B'"], BL: ["L U L'", "L U' L'", "B' U' B", "B' U B'"],
    };
  }

  table(key, edges, corners, moves) {
    if (!this.cache.has(key)) this.cache.set(key, buildTable(this.core, edges, corners, moves));
    return this.cache.get(key);
  }

  // 沿精确距离表下降（表覆盖目标的全部块时，得到最少步数解）
  descend(state, tab, moves) {
    const core = this.core;
    const codes = () => [...tab.edges.map((p) => state.edgeCodeOf(p)), ...tab.corners.map((p) => state.cornerCodeOf(p))];
    const idxOf = (c) => { let x = 0; for (let i = c.length - 1; i >= 0; i--) x = x * 24 + c[i]; return x; };
    const out = [];
    let c = codes();
    let d = tab.dist[idxOf(c)];
    if (d === 255) throw new Error("不可达");
    while (d > 0) {
      let found = false;
      for (const m of moves) {
        const nc = c.map((x, i) => (i < tab.edges.length ? core.eCode[m][x] : core.cCode[m][x]));
        if (tab.dist[idxOf(nc)] === d - 1) { out.push(m); state.apply(core, m); c = nc; d--; found = true; break; }
      }
      if (!found) throw new Error("距离表下降失败");
    }
    return out;
  }

  // 公式组合搜索：若干次（可选 AUF + 公式），最后可选 AUF；返回最少公式数、其次最少步数的方案
  macroSearch(state, macros, goal, { maxMacros = 3, preAUF = true, postAUF = true } = {}) {
    const core = this.core;
    const aufs = preAUF ? this.AUF : [[]];
    const posts = postAUF ? this.AUF : [[]];
    let frontier = [{ s: state.clone(), seq: [] }];
    for (let depth = 0; depth <= maxMacros; depth++) {
      let best = null;
      for (const node of frontier) for (const p of posts) {
        const s = node.s.clone().applyAll(core, core.parse(p));
        if (goal(s)) {
          const seq = [...node.seq, ...(p.length ? [{ auf: p }] : [])];
          const len = seq.reduce((n, x) => n + (x.auf ? x.auf.length : x.macro.names.length), 0);
          if (!best || len < best.len) best = { seq, len };
        }
      }
      if (best) return best.seq;
      if (depth === maxMacros) break;
      const next = [];
      for (const node of frontier) for (const a of aufs) for (const m of macros) {
        const s = node.s.clone().applyAll(core, core.parse(a)).applyAll(core, m.moves);
        next.push({ s, seq: [...node.seq, ...(a.length ? [{ auf: a }] : []), { macro: m }] });
      }
      frontier = next;
    }
    return null;
  }

  // 在状态上执行一段并记录为一个“小步”
  step(state, names, info) {
    const moves = this.core.parse(names);
    state.applyAll(this.core, moves);
    return { moves: names.slice(), ...info };
  }

  finishStage(state, stage, predicate) {
    if (!predicate(state)) throw new Error(`阶段目标未达成：${stage.title}`);
    stage.moveCount = stage.steps.reduce((n, s) => n + s.moves.length, 0);
    return stage;
  }

  // ======================= 层先法 =======================
  solveLBL(scramble, start = null) {
    const core = this.core, P = this.P;
    const s = start ? start.clone() : CubeState.solved().applyAll(core, core.parse(scramble));
    const stages = [];

    // 1 底层十字：一次一条棱，每条都用最少步数
    {
      const st = { id: "cross", steps: [] };
      const done = [];
      while (done.length < 4) {
        let best = null;
        for (const e of CROSS_E) {
          if (done.includes(e)) continue;
          const set = [...done, e].sort((a, b) => a - b);
          const tab = this.table("cross:" + set.join(","), set, [], this.face18);
          const trial = s.clone();
          const mv = this.descend(trial, tab, this.face18);
          if (!best || mv.length < best.mv.length) best = { e, mv };
        }
        st.steps.push(this.step(s, core.names(best.mv), { label: best.mv.length ? `放好${EDGE_LABEL[best.e]}` : `${EDGE_LABEL[best.e]}已在正确位置`, focus: { e: [best.e], c: [] }, kind: best.mv.length ? "intuitive" : "skip" }));
        done.push(best.e);
      }
      stages.push(this.finishStage(s, st, P.cross));
    }
    // 2 底层角：转到正上方，重复右手公式
    {
      const st = { id: "corners", steps: [] };
      const above = { 4: 0, 5: 3, 6: 2, 7: 1 };
      const slotOf = { 4: "DRF", 5: "DFL", 6: "DLB", 7: "DBR" };
      const done = [];
      while (done.length < 4) {
        let best = null;
        for (const c of [4, 5, 6, 7]) {
          if (done.includes(c)) continue;
          const t = s.clone();
          const parts = [];
          let pos = posOfCorner(t, c);
          if (pos >= 4 && pos !== c) { parts.push({ names: this.lbl.cornerTrigger[slotOf[pos]].names, note: "先从错误位置取出" }); t.applyAll(core, this.lbl.cornerTrigger[slotOf[pos]].moves); pos = posOfCorner(t, c); }
          if (pos < 4) {
            let k = 0; while (pos !== above[c]) { t.apply(core, core.idx("U")); pos = posOfCorner(t, c); k++; }
            if (k) parts.push({ names: [joinMove("U", k)], note: "转到目标位置正上方" });
          }
          let reps = 0; const trig = this.lbl.cornerTrigger[slotOf[c]];
          while (!t.cornerOk(c)) { t.applyAll(core, trig.moves); reps++; if (reps > 6) throw new Error("底层角重复次数异常"); }
          if (reps) parts.push({ names: [].concat(...Array(reps).fill(trig.names)), note: `重复 ${trig.names.join(" ")} ×${reps}` });
          const len = parts.reduce((n, p) => n + p.names.length, 0);
          if (!best || len < best.len) best = { c, parts, len, trig, reps };
        }
        const names = simplifyNames(best.parts.flatMap((p) => p.names));
        st.steps.push(this.step(s, names, names.length ? {
          label: `${CORNER_LABEL[best.c]}归位`, focus: { e: [], c: [best.c] }, kind: "alg",
          detail: best.parts.map((p) => p.note).join("，"), alg: best.trig.names.join(" "), reps: best.reps,
        } : { label: `${CORNER_LABEL[best.c]}已在正确位置`, focus: { e: [], c: [best.c] }, kind: "skip" }));
        done.push(best.c);
      }
      stages.push(this.finishStage(s, st, P.firstLayer));
    }
    // 3 中层棱
    {
      const st = { id: "middle", steps: [] };
      const done = [];
      while (done.length < 4) {
        let best = null;
        for (const e of [8, 9, 10, 11]) {
          if (done.includes(e)) continue;
          const goal = (x) => P.firstLayer(x) && done.every((d) => x.edgeOk(d)) && x.edgeOk(e);
          const seq = this.macroSearch(s, this.midAlgs, goal, { maxMacros: 2, postAUF: false });
          if (!seq) continue;
          const len = seq.reduce((n, x) => n + (x.auf ? x.auf.length : x.macro.names.length), 0);
          if (!best || len < best.len) best = { e, seq, len };
        }
        if (!best) throw new Error("中层棱求解失败");
        const macros = best.seq.filter((x) => x.macro);
        if (!macros.length) {
          st.steps.push({ moves: [], label: `${EDGE_LABEL[best.e]}已在正确位置`, focus: { e: [best.e], c: [] }, kind: "skip" });
          done.push(best.e);
          continue;
        }
        const notes = [];
        if (macros.length === 2) notes.push(`先用“${macros[0].macro.label}”把卡住的棱块换出来`);
        const last = macros[macros.length - 1].macro;
        notes.push(`转顶层对准颜色，${last.label}`);
        st.steps.push(this.step(s, seqNames(best.seq), {
          label: `${EDGE_LABEL[best.e]}插入${SLOT_LABEL[last.slot]}`, focus: { e: [best.e], c: [] }, kind: "alg",
          detail: notes.join("；"), alg: last.names.join(" "),
        }));
        done.push(best.e);
      }
      stages.push(this.finishStage(s, st, P.f2l));
    }
    // 4 顶层十字
    {
      const st = { id: "llcross", steps: [] };
      const shape = llEdgeShape(s);
      const seq = this.macroSearch(s, [this.lbl.yellowCross], P.llEdgesOriented, { maxMacros: 3, postAUF: false });
      if (!seq) throw new Error("顶层十字失败");
      splitMacroSteps(seq).forEach((part) => {
        const before = llEdgeShape(s);
        const step = this.step(s, part, { focus: { e: [0, 1, 2, 3], c: [] }, kind: "alg", alg: this.lbl.yellowCross.text });
        step.label = `${before} → ${llEdgeShape(s)}`;
        st.steps.push(step);
      });
      if (!seq.length) st.steps.push({ moves: [], label: "顶层已是十字，跳过", focus: { e: [0, 1, 2, 3], c: [] }, kind: "skip" });
      st.startShape = shape;
      stages.push(this.finishStage(s, st, P.llEdgesOriented));
    }
    // 5 顶面（小鱼公式）
    {
      const st = { id: "llface", steps: [] };
      const seq = this.macroSearch(s, [this.lbl.sune], P.oll, { maxMacros: 4, postAUF: false });
      if (!seq) throw new Error("顶面失败");
      splitMacroSteps(seq).forEach((part) => {
        const n = [0, 1, 2, 3].filter((i) => s.co[i] === 0).length;
        st.steps.push(this.step(s, part, { label: `顶面已有 ${n} 个角朝上`, focus: { e: [], c: [0, 1, 2, 3] }, kind: "alg", alg: this.lbl.sune.text }));
      });
      if (!seq.length) st.steps.push({ moves: [], label: "顶面已全部朝上，跳过", focus: { e: [], c: [0, 1, 2, 3] }, kind: "skip" });
      stages.push(this.finishStage(s, st, P.oll));
    }
    // 6 顶层角归位
    {
      const st = { id: "llcorners", steps: [] };
      const seq = this.macroSearch(s, [this.lbl.cornerCycle], P.llCorners, { maxMacros: 2 });
      if (!seq) throw new Error("顶层角失败");
      const parts = splitMacroSteps(seq, true);
      parts.forEach((part) => {
        const isAuf = part.every((n) => n[0] === "U");
        st.steps.push(this.step(s, part, { label: isAuf ? "转顶层，让四个角对准" : "换角（A 型公式）", focus: { e: [], c: [0, 1, 2, 3] }, kind: isAuf ? "auf" : "alg", alg: isAuf ? undefined : this.lbl.cornerCycle.text }));
      });
      if (!parts.length) st.steps.push({ moves: [], label: "顶层角已归位，跳过", focus: { e: [], c: [0, 1, 2, 3] }, kind: "skip" });
      stages.push(this.finishStage(s, st, P.llCorners));
    }
    // 7 顶层棱归位
    {
      const st = { id: "lledges", steps: [] };
      const seq = this.macroSearch(s, this.uPerms, P.solved, { maxMacros: 2, preAUF: false, postAUF: false });
      if (!seq) throw new Error("顶层棱失败");
      for (const x of seq) st.steps.push(this.step(s, x.macro.names, { label: `换棱（U 型公式）：${x.macro.label}`, focus: { e: [0, 1, 2, 3], c: [] }, kind: "alg", alg: x.macro.base }));
      if (!seq.length) st.steps.push({ moves: [], label: "已经还原，跳过", focus: { e: [0, 1, 2, 3], c: [] }, kind: "skip" });
      stages.push(this.finishStage(s, st, P.solved));
    }
    return this.pack("lbl", scramble, stages, s);
  }

  // ======================= CFOP =======================
  solveCFOP(scramble, start = null) {
    const core = this.core, P = this.P;
    const s = start ? start.clone() : CubeState.solved().applyAll(core, core.parse(scramble));
    const stages = [];
    // Cross：4 条棱一起，最少步数
    {
      const st = { id: "cross", steps: [] };
      const tab = this.table("cross:4,5,6,7", CROSS_E, [], this.face18);
      const mv = this.descend(s.clone(), tab, this.face18);
      st.steps.push(this.step(s, core.names(mv), { label: mv.length ? `一次做好十字（本步最少 ${mv.length} 步）` : "十字已完成", focus: { e: CROSS_E, c: [] }, kind: "intuitive" }));
      stages.push(this.finishStage(s, st, P.cross));
    }
    // F2L：四组角棱
    {
      const st = { id: "f2l", steps: [] };
      const done = [];
      while (done.length < 4) {
        let best = null;
        for (const slot of ["FR", "FL", "BR", "BL"]) {
          if (done.includes(slot)) continue;
          const r = this.solvePair(s, slot, done);
          if (r && (!best || r.names.length < best.names.length)) best = { slot, ...r };
        }
        if (!best) throw new Error("F2L 求解失败");
        const { c, e } = SLOT_PIECES[best.slot];
        st.steps.push(this.step(s, best.names, {
          label: `第 ${done.length + 1} 组：${CORNER_LABEL[c]} + ${EDGE_LABEL[e]} → ${SLOT_LABEL[best.slot]}`,
          focus: { e: [e], c: [c] }, kind: "alg", detail: best.detail, slot: best.slot,
        }));
        done.push(best.slot);
        if (!P.cross(s) || !slotsOk(s, done)) throw new Error("F2L 中间检查失败");
      }
      stages.push(this.finishStage(s, st, P.f2l));
    }
    // OLL
    {
      const st = { id: "oll", steps: [] };
      const pattern = llPattern(s);
      if (P.oll(s)) st.steps.push({ moves: [], label: "顶面已经全黄（OLL 跳过）", focus: { e: [0, 1, 2, 3], c: [0, 1, 2, 3] }, kind: "skip" });
      else {
        let best = null;
        for (const a of this.AUF) for (const o of this.oll) {
          const t = s.clone().applyAll(core, core.parse(a)).applyAll(core, o.moves);
          if (P.oll(t)) { const names = simplifyNames([...a, ...o.names]); if (!best || names.length < best.names.length) best = { names, o, a }; }
        }
        if (!best) throw new Error("OLL 未覆盖");
        st.steps.push(this.step(s, best.names, { label: `OLL：${ollShapeName(pattern)}`, focus: { e: [0, 1, 2, 3], c: [0, 1, 2, 3] }, kind: "alg", alg: best.o.text, auf: best.a.join(" "), llPattern: pattern }));
      }
      stages.push(this.finishStage(s, st, P.oll));
    }
    // PLL
    {
      const st = { id: "pll", steps: [] };
      const perm = llPermPattern(s);
      if (P.solved(s)) st.steps.push({ moves: [], label: "已经还原（PLL 跳过）", focus: { e: [0, 1, 2, 3], c: [0, 1, 2, 3] }, kind: "skip" });
      else {
        let best = null;
        for (const a of this.AUF) {
          const t0 = s.clone().applyAll(core, core.parse(a));
          if (P.solved(t0)) { const names = a.slice(); if (!best || names.length < best.names.length) best = { names, p: null, a, b: [] }; }
          for (const p of this.pll) {
            const t1 = t0.clone().applyAll(core, p.moves);
            for (const b of this.AUF) {
              const t = t1.clone().applyAll(core, core.parse(b));
              if (P.solved(t)) { const names = simplifyNames([...a, ...p.names, ...b]); if (!best || names.length < best.names.length) best = { names, p, a, b }; }
            }
          }
        }
        if (!best) throw new Error("PLL 未覆盖");
        st.steps.push(this.step(s, best.names, {
          label: best.p ? `PLL：${best.p.name} 型` : "只需转顶层（AUF）", focus: { e: [0, 1, 2, 3], c: [0, 1, 2, 3] },
          kind: best.p ? "alg" : "auf", alg: best.p ? best.p.text : undefined, pllName: best.p ? best.p.name : undefined, llPerm: perm,
        }));
      }
      stages.push(this.finishStage(s, st, P.solved));
    }
    return this.pack("cfop", scramble, stages, s);
  }

  // F2L 单组：必要时先取出卡在别的槽里的块，然后查表
  solvePair(state, slot, done) {
    const core = this.core;
    const { c, e } = SLOT_PIECES[slot];
    const U_OR = (pos, home, isCorner) => pos < 4 || pos === home;
    const tryFrom = (st, pre, depth) => {
      const cp = posOfCorner(st, c), ep = posOfEdge(st, e);
      if (U_OR(cp, c, true) && U_OR(ep, e, false)) {
        const key = `${st.cornerCodeOf(c)},${st.edgeCodeOf(e)}`;
        if (st.cornerOk(c) && st.edgeOk(e)) return { names: simplifyNames(pre.flatMap((p) => p.names)), extracted: pre };
        const alg = F2L_TABLE[slot].cases[key];
        if (!alg) throw new Error(`F2L 表缺少 ${slot} ${key}`);
        return { names: simplifyNames([...pre.flatMap((p) => p.names), ...alg.split(" ")]), extracted: pre };
      }
      if (depth >= 2) return null;
      // 找出卡住块的槽
      const stuck = [];
      for (const [k, v] of Object.entries(SLOT_PIECES)) {
        if (k === slot || done.includes(k)) continue;
        if (cp === v.c || ep === v.e) stuck.push(k);
      }
      let best = null;
      for (const k of stuck) for (const ex of this.extract[k]) {
        const names = ex.split(" ");
        const t = st.clone().applyAll(core, core.parse(names));
        if (!this.P.cross(t) || !slotsOk(t, done)) continue;
        const r = tryFrom(t, [...pre, { slot: k, names }], depth + 1);
        if (r && (!best || r.names.length < best.names.length)) best = r;
      }
      return best;
    };
    const r = tryFrom(state, [], 0);
    if (!r) return null;
    const t = state.clone().applyAll(core, core.parse(r.names));
    if (!(this.P.cross(t) && slotsOk(t, [...done, slot]))) return null;
    const detail = r.extracted.length ? `先把卡在${r.extracted.map((x) => SLOT_LABEL[x.slot]).join("、")}的块取出，再配对插入` : "角块和棱块在顶层配成一对，再插入";
    return { names: r.names, detail };
  }

  // ======================= 桥式（Roux） =======================
  solveRoux(scramble, start = null) {
    const core = this.core, P = this.P;
    const s = start ? start.clone() : CubeState.solved().applyAll(core, core.parse(scramble));
    const stages = [];
    const fbMoves = [...this.face18, ...["M", "M2", "M'"].map((n) => core.idx(n))];
    const sbMoves = ["R", "R2", "R'", "U", "U2", "U'", "M", "M2", "M'"].map((n) => core.idx(n));
    // 1 第一块：先 1×2×2 方块，再补一组
    {
      const st = { id: "fb", steps: [] };
      const options = [
        { sq: { e: [7, 9], c: [5] }, name: "左前" },
        { sq: { e: [7, 11], c: [6] }, name: "左后" },
      ];
      let best = null;
      for (const o of options) {
        const t = s.clone();
        const tab = this.table(`fbsq:${o.sq.e}:${o.sq.c}`, o.sq.e, o.sq.c, fbMoves);
        const m1 = this.descend(t, tab, fbMoves);
        const m2 = this.blockSearch(t, FB_E, FB_C, fbMoves, "fb", [["fbsqF", [7, 9], [5]], ["fbsqB", [7, 11], [6]], ["fbpair", [9, 11], [5, 6]]]);
        if (m2 === null) continue;
        const len = m1.length + m2.length;
        if (!best || len < best.len) best = { o, m1, m2, len };
      }
      if (!best) throw new Error("第一块失败");
      const rest = best.o.name === "左前" ? { e: [11], c: [6] } : { e: [9], c: [5] };
      st.steps.push(this.step(s, core.names(best.m1), { label: `先拼${best.o.name} 1×2×2 方块`, focus: best.o.sq, kind: "intuitive" }));
      st.steps.push(this.step(s, core.names(best.m2), { label: `补上${CORNER_LABEL[rest.c[0]]} + ${EDGE_LABEL[rest.e[0]]}`, focus: rest, kind: "intuitive" }));
      stages.push(this.finishStage(s, st, P.fb));
    }
    // 2 第二块：只用 R、U、M（r = R M'），不碰第一块
    {
      const st = { id: "sb", steps: [] };
      const options = [
        { sq: { e: [5, 8], c: [4] }, name: "右前" },
        { sq: { e: [5, 10], c: [7] }, name: "右后" },
      ];
      let best = null;
      for (const o of options) {
        const t = s.clone();
        const tab = this.table(`sbsq:${o.sq.e}:${o.sq.c}`, o.sq.e, o.sq.c, sbMoves);
        const m1 = this.descend(t, tab, sbMoves);
        const m2 = this.blockSearch(t, SB_E, SB_C, sbMoves, "sb", [["sbsqF", [5, 8], [4]], ["sbsqB", [5, 10], [7]], ["sbpair", [8, 10], [4, 7]]]);
        if (m2 === null) continue;
        const len = m1.length + m2.length;
        if (!best || len < best.len) best = { o, m1, m2, len };
      }
      if (!best) throw new Error("第二块失败");
      const rest = best.o.name === "右前" ? { e: [10], c: [7] } : { e: [8], c: [4] };
      st.steps.push(this.step(s, mergeWide(core.names(best.m1)), { label: `先拼${best.o.name} 1×2×2 方块`, focus: best.o.sq, kind: "intuitive" }));
      st.steps.push(this.step(s, mergeWide(core.names(best.m2)), { label: `补上${CORNER_LABEL[rest.c[0]]} + ${EDGE_LABEL[rest.e[0]]}`, focus: rest, kind: "intuitive" }));
      stages.push(this.finishStage(s, st, P.sb));
    }
    // 3 CMLL
    {
      const st = { id: "cmll", steps: [] };
      const pattern = llPattern(s);
      if (P.cmll(s)) st.steps.push({ moves: [], label: "顶层四角已经对好（跳过）", focus: { e: [], c: [0, 1, 2, 3] }, kind: "skip" });
      else {
        let best = null;
        for (const a of this.AUF) {
          const t0 = s.clone().applyAll(core, core.parse(a));
          if (P.cmll(t0)) { if (!best || a.length < best.names.length) best = { names: a.slice(), alg: null }; continue; }
          for (const c of this.cmll) {
            const t1 = t0.clone().applyAll(core, c.moves);
            for (const b of this.AUF) {
              const t = t1.clone().applyAll(core, core.parse(b));
              if (P.cmll(t)) { const names = simplifyNames([...a, ...c.names, ...b]); if (!best || names.length < best.names.length) best = { names, alg: c.text }; }
            }
          }
        }
        if (!best) throw new Error("CMLL 未覆盖");
        st.steps.push(this.step(s, best.names, { label: best.alg ? "一次调好顶层四个角" : "只需转顶层", focus: { e: [], c: [0, 1, 2, 3] }, kind: best.alg ? "alg" : "auf", alg: best.alg || undefined, llPattern: pattern }));
      }
      stages.push(this.finishStage(s, st, P.cmll));
    }
    // 4 LSE：只用 M 和 U
    {
      const st = { id: "lse", steps: [] };
      const sub = [
        { goal: P.lseEO, label: "4a 棱块定向（EO）", focus: { e: LSE_E, c: [] } },
        { goal: P.lseULUR, label: "4b 放好左右两棱（UL / UR）", focus: { e: [1, 3], c: [] } },
        { goal: P.rouxSolved, label: "4c 完成 M 层，中心一起归位", focus: { e: [0, 2, 4, 6], c: [] } },
      ];
      for (const [gi, x] of sub.entries()) {
        const names = this.lseSearch(s, gi, 16);
        if (!names) throw new Error("LSE 失败：" + x.label);
        st.steps.push(this.step(s, names, { label: names.length ? x.label : x.label + "（已满足，跳过）", focus: x.focus, kind: names.length ? "intuitive" : "skip" }));
      }
      stages.push(this.finishStage(s, st, P.rouxSolved));
    }
    return this.pack("roux", scramble, stages, s);
  }

  // 1×2×3 块：IDA*，用若干张子集精确表取最大值作启发
  blockSearch(state, edges, corners, moves, tag, tabDefs) {
    const tables = tabDefs.map(([k, e, c]) => this.table(`${tag}:${k}`, e, c, moves));
    const search = new PieceSearch(this.core, { edges, corners, moves, tables });
    const sol = search.solve(state, { maxDepth: 16, maxNodes: 4e7 });
    if (sol === null) return null;
    state.applyAll(this.core, sol);
    return sol;
  }

  // LSE 专用迭代加深搜索：状态压缩为 6 条棱的代码 + U 中心位置 + 顶层角偏移，只用 M/U。
  // goalId：0 = 棱块定向（M 层虚拟对齐后 6 棱朝向都对），1 = 再加 UL/UR 归位且顶层角对齐，2 = 全部还原。
  lseSearch(state, goalId, maxDepth) {
    const core = this.core;
    const pieces = LSE_E;
    const names = ["M", "M'", "M2", "U", "U'", "U2"];
    const mv = names.map((n) => core.idx(n));
    const famOf = names.map((n) => n[0]);
    const codes0 = pieces.map((p) => state.edgeCodeOf(p));
    const uc0 = Array.from(state.zp).indexOf(0);
    const cc0 = state.cornerCodeOf(0);
    // 中心对齐：U 中心在位置 uc 时，需要的 M 次幂
    const alignFor = {};
    for (let uc = 0; uc < 6; uc++) {
      for (const pw of [[], [mv[0]], [mv[2]], [mv[1]]]) {
        let pos = uc;
        for (const m of pw) pos = core.zPos[m][pos];
        if (pos === 0) { alignFor[uc] = pw; break; }
      }
    }
    const home = pieces.map((p) => p * 2);
    const goal = (codes, uc, cc) => {
      if (goalId === 2) return uc === 0 && cc === 0 && codes.every((c, i) => c === home[i]);
      const pw = alignFor[uc];
      if (!pw) return false;
      const al = codes.map((c) => { for (const m of pw) c = core.eCode[m][c]; return c; });
      if (!al.every((c) => (c & 1) === 0)) return false;
      if (goalId === 0) return true;
      return cc === 0 && al[1] === home[1] && al[3] === home[3];
    };
    const path = [];
    const dfs = (codes, uc, cc, depth, lastFam) => {
      if (goal(codes, uc, cc)) return true;
      if (depth === 0) return false;
      for (let i = 0; i < 6; i++) {
        if (famOf[i] === lastFam) continue;
        const m = mv[i];
        const nc = codes.map((c) => core.eCode[m][c]);
        path.push(names[i]);
        if (dfs(nc, core.zPos[m][uc], core.cCode[m][cc], depth - 1, famOf[i])) return true;
        path.pop();
      }
      return false;
    };
    for (let d = 0; d <= maxDepth; d++) {
      path.length = 0;
      if (dfs(codes0, uc0, cc0, d, "")) return path.slice();
    }
    return null;
  }

  // 广度优先：在给定转动集合下找最少步数达成 goal
  bfs(state, moveNames, goal, maxDepth) {
    const core = this.core;
    if (goal(state)) return [];
    const moves = moveNames.map((n) => core.idx(n));
    const seen = new Set([state.key()]);
    let frontier = [{ s: state, path: [] }];
    for (let d = 0; d < maxDepth; d++) {
      const next = [];
      for (const node of frontier) {
        const last = node.path.length ? node.path[node.path.length - 1][0] : "";
        for (let i = 0; i < moves.length; i++) {
          if (moveNames[i][0] === last) continue;
          const t = node.s.clone().apply(core, moves[i]);
          const k = t.key();
          if (seen.has(k)) continue;
          seen.add(k);
          const path = [...node.path, moveNames[i]];
          if (goal(t)) return path;
          next.push({ s: t, path });
        }
      }
      frontier = next;
    }
    return null;
  }

  pack(method, scramble, stages, finalState) {
    if (!finalState.isSolved()) throw new Error("最终状态未还原");
    const total = stages.reduce((n, st) => n + st.moveCount, 0);
    return { method, scramble: scramble === null ? null : this.core.names(this.core.parse(scramble)), stages, total };
  }

  solve(method, scramble, start = null) {
    if (method === "lbl") return this.solveLBL(scramble, start);
    if (method === "cfop") return this.solveCFOP(scramble, start);
    if (method === "roux") return this.solveRoux(scramble, start);
    throw new Error("未知方法");
  }
}

// ---------- 工具 ----------
function invRot(r) { const { fam, amt } = splitMove(r); return joinMove(fam, 4 - amt); }
function posOfCorner(s, piece) { for (let i = 0; i < 8; i++) if (s.cp[i] === piece) return i; return -1; }
function posOfEdge(s, piece) { for (let i = 0; i < 12; i++) if (s.ep[i] === piece) return i; return -1; }
function seqNames(seq) { return simplifyNames(seq.flatMap((x) => (x.auf ? x.auf : x.macro.names))); }
// 把公式组合切成“每次（AUF + 公式）一小步”；尾部 AUF 单独一步
function splitMacroSteps(seq, tailAufSeparate = false) {
  const parts = [];
  let cur = [];
  for (const x of seq) {
    if (x.auf) cur.push(...x.auf);
    else { cur.push(...x.macro.names); parts.push(simplifyNames(cur)); cur = []; }
  }
  if (cur.length) { if (tailAufSeparate || !parts.length) parts.push(cur); else parts[parts.length - 1] = simplifyNames([...parts[parts.length - 1], ...cur]); }
  return parts;
}
// R M' → r（同理 R' M → r'，R2 M2 → r2）：只是记号合并，效果相同
function mergeWide(names) {
  const out = [];
  for (let i = 0; i < names.length; i++) {
    const a = names[i], b = names[i + 1];
    if (b && a[0] === "R" && b[0] === "M") {
      const ra = splitMove(a).amt, mb = splitMove(b).amt;
      if ((ra + mb) % 4 === 0) { out.push(joinMove("r", ra)); i++; continue; }
    }
    if (b && a[0] === "M" && b[0] === "R") {
      const ma = splitMove(a).amt, rb = splitMove(b).amt;
      if ((ma + rb) % 4 === 0) { out.push(joinMove("r", rb)); i++; continue; }
    }
    out.push(a);
  }
  return out;
}
// 顶层棱朝向形状（层先法顶层十字讲解用）
function llEdgeShape(s) {
  const good = [0, 1, 2, 3].map((i) => s.eo[i] === 0);
  const n = good.filter(Boolean).length;
  if (n === 4) return "十字";
  if (n === 0) return "点";
  if ((good[0] && good[2]) || (good[1] && good[3])) return "一字";
  return "L 形";
}
// 顶层朝向图案：用于界面画 OLL/CMLL 小图（U 面 9 格 + 侧面 12 格是否为黄）
export function llPattern(s) {
  return { co: Array.from(s.co.slice(0, 4)), eo: Array.from(s.eo.slice(0, 4)), cp: Array.from(s.cp.slice(0, 4)), ep: Array.from(s.ep.slice(0, 4)) };
}
function llPermPattern(s) { return { cp: Array.from(s.cp.slice(0, 4)), ep: Array.from(s.ep.slice(0, 4)) }; }
function ollShapeName(p) {
  const e = p.eo.filter((x) => x === 0).length;
  const c = p.co.filter((x) => x === 0).length;
  const eName = e === 4 ? "棱已成十字" : e === 0 ? "棱为“点”" : ((p.eo[0] === 0 && p.eo[2] === 0) || (p.eo[1] === 0 && p.eo[3] === 0)) ? "棱为“一字”" : "棱为“L 形”";
  return `${eName}，${c} 个角已朝上`;
}
