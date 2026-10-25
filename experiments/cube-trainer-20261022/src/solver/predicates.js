// 阶段目标判定。输入是“类状态”对象 {ep, eo, cp, co, zp}（块编号/朝向数组），
// 既可以是求解器内部的 CubeState，也可以是 cubing.js KPattern 的 patternData 适配结果。
// 这样验证程序可以用 cubing.js 独立算出的状态来检查同一组阶段目标。

const edgeOk = (s, p) => s.ep[p] === p && s.eo[p] === 0;
const cornerOk = (s, p) => s.cp[p] === p && s.co[p] === 0;
const centersOk = (s) => [0, 1, 2, 3, 4, 5].every((i) => s.zp[i] === i);
const allE = (s, list) => list.every((p) => edgeOk(s, p));
const allC = (s, list) => list.every((p) => cornerOk(s, p));
// 顶层四角只差一个 U 层转动（朝向全对，位置是整体轮换）
const cornersUpToAuf = (s) => [0, 1, 2, 3].every((i) => s.co[i] === 0) && [0, 1, 2, 3].some((k) => [0, 1, 2, 3].every((i) => s.cp[i] === (i + k) % 4));

export const CROSS_E = [4, 5, 6, 7];
export const DCORNERS = [4, 5, 6, 7];
export const MID_E = [8, 9, 10, 11];
export const FB_E = [7, 9, 11], FB_C = [5, 6];
export const SB_E = [5, 8, 10], SB_C = [4, 7];
export const UCORNERS = [0, 1, 2, 3];
export const LSE_E = [0, 1, 2, 3, 4, 6];

// M 层中心对齐：Roux 的最后一步可能让中心偏移，判定 EO/UL-UR 时先把 M 层“虚拟转正”
// mTrans 为 cubing.js 给出的 M 转动数据 {ePerm, eDelta, zPerm}
export function alignM(s, mTrans) {
  let cur = { ep: Array.from(s.ep), eo: Array.from(s.eo), cp: Array.from(s.cp), co: Array.from(s.co), zp: Array.from(s.zp) };
  for (let j = 0; j < 4; j++) {
    if (cur.zp[0] === 0) return cur;
    const ep = new Array(12), eo = new Array(12), zp = new Array(6);
    for (let i = 0; i < 12; i++) { ep[i] = cur.ep[mTrans.ePerm[i]]; eo[i] = (cur.eo[mTrans.ePerm[i]] + mTrans.eDelta[i]) % 2; }
    for (let i = 0; i < 6; i++) zp[i] = cur.zp[mTrans.zPerm[i]];
    cur = { ep, eo, cp: cur.cp, co: cur.co, zp };
  }
  return null; // 中心不在 M 层轨道上（不应发生）
}

export function makePredicates(mTrans) {
  const P = {
    cross: (s) => centersOk(s) && allE(s, CROSS_E),
    firstLayer: (s) => P.cross(s) && allC(s, DCORNERS),
    f2l: (s) => P.firstLayer(s) && allE(s, MID_E),
    llEdgesOriented: (s) => P.f2l(s) && [0, 1, 2, 3].every((i) => s.eo[i] === 0),
    oll: (s) => P.llEdgesOriented(s) && [0, 1, 2, 3].every((i) => s.co[i] === 0),
    llCorners: (s) => P.oll(s) && allC(s, UCORNERS),
    solved: (s) => P.llCorners(s) && allE(s, [0, 1, 2, 3]),
    fb: (s) => allE(s, FB_E) && allC(s, FB_C) && s.zp[1] === 1,
    sb: (s) => P.fb(s) && allE(s, SB_E) && allC(s, SB_C) && s.zp[3] === 3,
    cmll: (s) => P.sb(s) && allC(s, UCORNERS),
    lseEO: (s) => { if (!P.cmll(s)) return false; const a = alignM(s, mTrans); return !!a && LSE_E.every((p) => a.eo[p] === 0); },
    // 4a 的真实目标：棱块定向完成即可，顶层可以还差一个 AUF（顶层角相对两侧块只差整体转动）
    lseEOFree: (s) => { if (!P.sb(s) || !cornersUpToAuf(s)) return false; const a = alignM(s, mTrans); return !!a && LSE_E.every((p) => a.eo[p] === 0); },
    lseULUR: (s) => { if (!P.lseEO(s)) return false; const a = alignM(s, mTrans); return edgeOk(a, 1) && edgeOk(a, 3); },
    rouxSolved: (s) => P.cmll(s) && centersOk(s) && allE(s, LSE_E),
  };
  return P;
}

// F2L 单槽（十字 + 若干已完成槽）
export const SLOT_PIECES = { FR: { c: 4, e: 8 }, FL: { c: 5, e: 9 }, BR: { c: 7, e: 10 }, BL: { c: 6, e: 11 } };
export function slotsOk(s, slots) {
  return slots.every((k) => cornerOk(s, SLOT_PIECES[k].c) && edgeOk(s, SLOT_PIECES[k].e));
}
export { edgeOk, cornerOk, centersOk };
