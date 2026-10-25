// 几何模型（渲染器所用）与 cubing.js KPuzzle 的逐块对照：随机序列下块编号与朝向必须完全一致。
import { cube3x3x3 } from "cubing/puzzles";
import { GeoCube, geoToPattern } from "../src/render/geometry.js";

const kp = await cube3x3x3.kpuzzle();
const NAMES = ["U", "D", "L", "R", "F", "B", "M", "E", "S", "u", "d", "l", "r", "f", "b", "x", "y", "z"].flatMap((f) => [f, f + "2", f + "'"]);
let seed = 99;
const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor((seed / 2147483648) * n); };
let bad = 0;
for (let t = 0; t < 3000; t++) {
  const seq = Array.from({ length: 1 + rand(30) }, () => NAMES[rand(NAMES.length)]);
  const g = geoToPattern(new GeoCube().applyAll(seq));
  const d = kp.defaultPattern().applyAlg(seq.join(" ")).patternData;
  const same = JSON.stringify([g.ep, g.eo, g.cp, g.co, g.zp]) === JSON.stringify([d.EDGES.pieces, d.EDGES.orientation, d.CORNERS.pieces, d.CORNERS.orientation, d.CENTERS.pieces]);
  if (!same) { bad++; if (bad < 4) console.log("MISMATCH", seq.join(" "), JSON.stringify(g), JSON.stringify(d)); }
}
console.log("geometry vs KPuzzle mismatches:", bad, "/ 3000");
process.exit(bad ? 1 : 0);
