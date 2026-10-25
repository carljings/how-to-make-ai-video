// 求解器内核：所有转动的置换/朝向数据都直接取自 cubing.js 的 3x3x3 KPuzzle 定义，
// 这里只把它们整理成查表数组，便于高速搜索；不另写一套群运算。
//
// 位置编号（与 cubing.js 一致）：
//   EDGES   0 UF, 1 UR, 2 UB, 3 UL, 4 DF, 5 DR, 6 DB, 7 DL, 8 FR, 9 FL, 10 BR, 11 BL
//   CORNERS 0 UFR, 1 URB, 2 UBL, 3 ULF, 4 DRF, 5 DFL, 6 DLB, 7 DBR
//   CENTERS 0 U, 1 L, 2 F, 3 R, 4 B, 5 D

export const EDGE_NAMES = ["UF", "UR", "UB", "UL", "DF", "DR", "DB", "DL", "FR", "FL", "BR", "BL"];
export const CORNER_NAMES = ["UFR", "URB", "UBL", "ULF", "DRF", "DFL", "DLB", "DBR"];
export const CENTER_NAMES = ["U", "L", "F", "R", "B", "D"];

const FAMILIES = ["U", "D", "L", "R", "F", "B", "M", "E", "S", "u", "d", "l", "r", "f", "b", "x", "y", "z"];
const SUFFIXES = ["", "2", "'"];

export class CubeCore {
  constructor(kpuzzle) {
    this.kpuzzle = kpuzzle;
    this.moveNames = [];
    this.moveIndex = new Map();
    this.ePerm = []; this.eDelta = [];
    this.cPerm = []; this.cDelta = [];
    this.zPerm = [];
    for (const fam of FAMILIES) {
      for (const suf of SUFFIXES) {
        const name = fam + suf;
        const t = kpuzzle.moveToTransformation(name).transformationData;
        const idx = this.moveNames.length;
        this.moveNames.push(name);
        this.moveIndex.set(name, idx);
        this.ePerm.push(Int8Array.from(t.EDGES.permutation));
        this.eDelta.push(Int8Array.from(t.EDGES.orientationDelta));
        this.cPerm.push(Int8Array.from(t.CORNERS.permutation));
        this.cDelta.push(Int8Array.from(t.CORNERS.orientationDelta));
        this.zPerm.push(Int8Array.from(t.CENTERS.permutation));
      }
    }
    this.moveCount = this.moveNames.length;
    // 单个块的“代码”转移：边 code = 位置*2 + 朝向（0..23），角 code = 位置*3 + 朝向（0..23）。
    // KPuzzle 语义：新状态位置 i 上的块来自旧位置 perm[i]，朝向 += delta[i]。
    // 因此旧位置 o 上的块会去到满足 perm[n] = o 的新位置 n。
    this.eCode = []; this.cCode = []; this.zPos = [];
    for (let m = 0; m < this.moveCount; m++) {
      const ec = new Int8Array(24), cc = new Int8Array(24), zc = new Int8Array(6);
      for (let n = 0; n < 12; n++) {
        const o = this.ePerm[m][n];
        for (let ori = 0; ori < 2; ori++) ec[o * 2 + ori] = n * 2 + ((ori + this.eDelta[m][n]) % 2);
      }
      for (let n = 0; n < 8; n++) {
        const o = this.cPerm[m][n];
        for (let ori = 0; ori < 3; ori++) cc[o * 3 + ori] = n * 3 + ((ori + this.cDelta[m][n]) % 3);
      }
      for (let n = 0; n < 6; n++) zc[this.zPerm[m][n]] = n;
      this.eCode.push(ec); this.cCode.push(cc); this.zPos.push(zc);
    }
  }

  idx(name) {
    const i = this.moveIndex.get(name);
    if (i === undefined) throw new Error(`未知转动：${name}`);
    return i;
  }

  // 文本转动序列 → 下标数组（只接受单个基础转动，空格分隔）
  parse(seq) {
    if (Array.isArray(seq)) return seq.map((s) => (typeof s === "number" ? s : this.idx(s)));
    const toks = seq.trim().split(/\s+/).filter(Boolean);
    return toks.map((t) => this.idx(t.replace("2'", "2")));
  }

  names(moves) { return moves.map((m) => this.moveNames[m]); }

  solved() { return CubeState.solved(); }
}

export class CubeState {
  constructor(ep, eo, cp, co, zp) { this.ep = ep; this.eo = eo; this.cp = cp; this.co = co; this.zp = zp; }
  static solved() {
    return new CubeState(
      Int8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), new Int8Array(12),
      Int8Array.from([0, 1, 2, 3, 4, 5, 6, 7]), new Int8Array(8),
      Int8Array.from([0, 1, 2, 3, 4, 5]),
    );
  }
  clone() { return new CubeState(this.ep.slice(), this.eo.slice(), this.cp.slice(), this.co.slice(), this.zp.slice()); }
  // 原地施加一个转动（core 下标）
  apply(core, m) {
    const ep = this.ep, eo = this.eo, cp = this.cp, co = this.co, zp = this.zp;
    const P = core.ePerm[m], D = core.eDelta[m];
    const nep = new Int8Array(12), neo = new Int8Array(12);
    for (let i = 0; i < 12; i++) { nep[i] = ep[P[i]]; neo[i] = (eo[P[i]] + D[i]) % 2; }
    const Q = core.cPerm[m], E = core.cDelta[m];
    const ncp = new Int8Array(8), nco = new Int8Array(8);
    for (let i = 0; i < 8; i++) { ncp[i] = cp[Q[i]]; nco[i] = (co[Q[i]] + E[i]) % 3; }
    const Z = core.zPerm[m];
    const nzp = new Int8Array(6);
    for (let i = 0; i < 6; i++) nzp[i] = zp[Z[i]];
    this.ep = nep; this.eo = neo; this.cp = ncp; this.co = nco; this.zp = nzp;
    return this;
  }
  applyAll(core, moves) { for (const m of moves) this.apply(core, m); return this; }
  // 某个块（按块编号）当前的代码
  edgeCodeOf(piece) { for (let i = 0; i < 12; i++) if (this.ep[i] === piece) return i * 2 + this.eo[i]; return -1; }
  cornerCodeOf(piece) { for (let i = 0; i < 8; i++) if (this.cp[i] === piece) return i * 3 + this.co[i]; return -1; }
  edgeOk(pos) { return this.ep[pos] === pos && this.eo[pos] === 0; }
  cornerOk(pos) { return this.cp[pos] === pos && this.co[pos] === 0; }
  centersOk() { for (let i = 0; i < 6; i++) if (this.zp[i] !== i) return false; return true; }
  isSolved() {
    for (let i = 0; i < 12; i++) if (!this.edgeOk(i)) return false;
    for (let i = 0; i < 8; i++) if (!this.cornerOk(i)) return false;
    return this.centersOk();
  }
  key() { return `${this.ep.join(",")}|${this.eo.join("")}|${this.cp.join(",")}|${this.co.join("")}|${this.zp.join("")}`; }
  // 与 cubing.js KPattern 的 patternData 相互转换
  toPatternData() {
    return {
      EDGES: { pieces: Array.from(this.ep), orientation: Array.from(this.eo) },
      CORNERS: { pieces: Array.from(this.cp), orientation: Array.from(this.co) },
      CENTERS: { pieces: Array.from(this.zp), orientation: [0, 0, 0, 0, 0, 0], orientationMod: [1, 1, 1, 1, 1, 1] },
    };
  }
  static fromPatternData(d) {
    return new CubeState(
      Int8Array.from(d.EDGES.pieces), Int8Array.from(d.EDGES.orientation),
      Int8Array.from(d.CORNERS.pieces), Int8Array.from(d.CORNERS.orientation),
      Int8Array.from(d.CENTERS.pieces),
    );
  }
}

// ---------- 转动序列工具 ----------
const AXIS_OF = { U: 0, D: 0, E: 0, u: 0, d: 0, y: 0, L: 1, R: 1, M: 1, l: 1, r: 1, x: 1, F: 2, B: 2, S: 2, f: 2, b: 2, z: 2 };

export function splitMove(name) {
  const fam = name[0];
  const suf = name.slice(1);
  const amt = suf === "" ? 1 : suf === "2" ? 2 : 3;
  return { fam, amt };
}
export function joinMove(fam, amt) {
  amt = ((amt % 4) + 4) % 4;
  if (amt === 0) return null;
  return fam + (amt === 1 ? "" : amt === 2 ? "2" : "'");
}
export function invertNames(names) {
  return names.slice().reverse().map((n) => { const { fam, amt } = splitMove(n); return joinMove(fam, 4 - amt); });
}
// 合并相邻同一层的转动（如 U U2 → U'，R R' → 消去）。只合并同一 family，保证语义不变。
export function simplifyNames(names) {
  const out = [];
  for (const n of names) {
    if (!n) continue;
    const { fam, amt } = splitMove(n);
    if (out.length) {
      const last = splitMove(out[out.length - 1]);
      if (last.fam === fam) {
        out.pop();
        const j = joinMove(fam, last.amt + amt);
        if (j) out.push(j);
        continue;
      }
    }
    out.push(n);
  }
  return out;
}
export function axisOf(name) { return AXIS_OF[name[0]]; }

// 整体转向重写：把含 x/y/z 的公式改写成不含整体转动的等价序列（净转向须为单位，否则报错）。
// 做法：维护“观察者朝向”映射，后续每个面/层名称换成物理上的对应名称。
const ROT_MAP = {
  // 记号 x：沿 R 方向转整个魔方。转后观察者看到的 U 面，物理上是原来的 F 面，依此类推。
  x: { U: "F", F: "D", D: "B", B: "U", R: "R", L: "L" },
  y: { F: "R", R: "B", B: "L", L: "F", U: "U", D: "D" },
  z: { U: "L", L: "D", D: "R", R: "U", F: "F", B: "B" },
};
const SLICE_OF = { M: ["L", "R"], E: ["D", "U"], S: ["F", "B"] }; // [同向面, 反向面]
export function derotate(names, { allowNet = false } = {}) {
  // view[f] = 观察者称为 f 的面，物理上是哪个面
  let view = { U: "U", D: "D", F: "F", B: "B", R: "R", L: "L" };
  const out = [];
  const applyRot = (rot, amt) => {
    for (let k = 0; k < amt; k++) {
      const m = ROT_MAP[rot];
      const nv = {};
      for (const f of Object.keys(view)) nv[f] = view[m[f]];
      view = nv;
    }
  };
  for (const n of names) {
    const { fam, amt } = splitMove(n);
    if (fam === "x" || fam === "y" || fam === "z") { applyRot(fam, amt); continue; }
    const upper = fam.toUpperCase();
    if ("UDFBRL".includes(upper)) {
      const phys = view[upper];
      out.push(joinMove(fam === upper ? phys : phys.toLowerCase(), amt));
    } else if (fam in SLICE_OF) {
      // 中层：方向跟随它的“同向面”
      const [same] = SLICE_OF[fam];
      const phys = view[same];
      const physSlice = { L: ["M", 1], R: ["M", -1], D: ["E", 1], U: ["E", -1], F: ["S", 1], B: ["S", -1] }[phys];
      out.push(joinMove(physSlice[0], physSlice[1] * amt));
    } else throw new Error(`无法重写：${n}`);
  }
  const ident = Object.keys(view).every((f) => view[f] === f);
  if (allowNet) return { moves: out, netIdentity: ident, view };
  if (!ident) throw new Error("公式净整体转向不为零，不能直接改写");
  return out;
}
