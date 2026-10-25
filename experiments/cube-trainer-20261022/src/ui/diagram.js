// 顶层小图（俯视）：U 面 3×3 加四周侧面一排，按真实状态着色。
// mode：oll（只看黄色朝向）、pll（全部颜色）、cmll（只看角块）
import { GeoCube, FACE_COLOR, FACE_NORMAL, mulMV } from "../render/geometry.js";

const GREY = "#2b3242";
export function llDiagram(moveNames, mode = "pll") {
  const geo = new GeoCube().applyAll(moveNames);
  // 收集 U 层每个小块的贴纸：位置 + 朝向面 → 原始颜色面
  const cell = {}; // key "x,z,face"
  for (const c of geo.cubies) {
    if (c.pos[1] !== 1) continue;
    for (const f of c.piece.faces) {
      const n = mulMV(c.rot, FACE_NORMAL[f]);
      const face = Object.keys(FACE_NORMAL).find((k) => FACE_NORMAL[k].every((v, i) => v === n[i]));
      cell[`${c.pos[0]},${c.pos[2]},${face}`] = { f, type: c.piece.type };
    }
  }
  const color = (k) => {
    const x = cell[k];
    if (!x) return GREY;
    if (mode === "oll") return x.f === "U" ? FACE_COLOR.U : GREY;
    if (mode === "cmll" && x.type === "edge") return GREY;
    return FACE_COLOR[x.f];
  };
  const S = 22, G = 3, side = 7, off = side + G;
  const W = off * 2 + S * 3 + G * 2;
  let svg = `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="顶层俯视图" class="ll-diagram">`;
  // U 面：x 从左到右 -1..1，z 从后到前 -1..1（图上方 = 后）
  for (let zi = 0; zi < 3; zi++) for (let xi = 0; xi < 3; xi++) {
    const x = xi - 1, z = zi - 1;
    svg += `<rect x="${off + xi * (S + G)}" y="${off + zi * (S + G)}" width="${S}" height="${S}" rx="4" fill="${color(`${x},${z},U`)}"/>`;
  }
  for (let i = 0; i < 3; i++) {
    const a = off + i * (S + G);
    svg += `<rect x="${a}" y="0" width="${S}" height="${side}" rx="2" fill="${color(`${i - 1},-1,B`)}"/>`;
    svg += `<rect x="${a}" y="${W - side}" width="${S}" height="${side}" rx="2" fill="${color(`${i - 1},1,F`)}"/>`;
    svg += `<rect x="0" y="${a}" width="${side}" height="${S}" rx="2" fill="${color(`-1,${i - 1},L`)}"/>`;
    svg += `<rect x="${W - side}" y="${a}" width="${side}" height="${S}" rx="2" fill="${color(`1,${i - 1},R`)}"/>`;
  }
  return svg + "</svg>";
}
