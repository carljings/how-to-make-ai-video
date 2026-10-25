// 记号工具：用 cubing.js 的 Alg 解析任意标准写法（含 r、M、S、x/y/z 等），转成本站的转动名；
// 并给出“去掉整体转动后的物理等价写法”（整体转动只改变观察方向，不改变块相对中心的状态）。
import { Alg } from "cubing/alg";
import { derotate, simplifyNames } from "./core.js";

const OK_FAMILIES = new Set(["U", "D", "L", "R", "F", "B", "M", "E", "S", "u", "d", "l", "r", "f", "b", "x", "y", "z"]);
const WIDE = { Uw: "u", Dw: "d", Lw: "l", Rw: "r", Fw: "f", Bw: "b" };

export function algToNames(text) {
  const out = [];
  for (const mv of Alg.fromString(text).expand().experimentalLeafMoves()) {
    let fam = mv.family;
    if (WIDE[fam] && (mv.outerLayer == null || mv.outerLayer === 2) && mv.innerLayer == null) fam = WIDE[fam];
    else if (mv.innerLayer != null || mv.outerLayer != null) throw new Error(`不支持的层记号：${mv.toString()}`);
    if (!OK_FAMILIES.has(fam)) throw new Error(`不支持的记号：${mv.toString()}`);
    const a = ((mv.amount % 4) + 4) % 4;
    if (a === 1) out.push(fam); else if (a === 2) out.push(fam + "2"); else if (a === 3) out.push(fam + "'");
  }
  return out;
}

// 物理等价写法：把整体转动之后的面名换成实际转到的面；末尾的净整体转动丢弃（只改变观察方向）
export function physicalNames(names) {
  const r = derotate(names, { allowNet: true });
  return { moves: simplifyNames(r.moves), hasRotation: names.some((n) => "xyz".includes(n[0])), netIdentity: r.netIdentity };
}
