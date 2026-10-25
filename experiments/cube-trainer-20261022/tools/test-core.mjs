// 核对：本地查表施加转动 ≡ cubing.js KPuzzle.applyMove；derotate 改写保持效果。
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore, CubeState, derotate, simplifyNames, invertNames } from "../src/solver/core.js";

const kp = await cube3x3x3.kpuzzle();
const core = new CubeCore(kp);
let rng = 12345;
const rand = (n) => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng % n; };

function samePattern(state, pat) {
  const d = pat.patternData;
  const a = state.toPatternData();
  return JSON.stringify(a.EDGES) === JSON.stringify({ pieces: d.EDGES.pieces, orientation: d.EDGES.orientation })
    && JSON.stringify(a.CORNERS) === JSON.stringify({ pieces: d.CORNERS.pieces, orientation: d.CORNERS.orientation })
    && JSON.stringify(a.CENTERS.pieces) === JSON.stringify(d.CENTERS.pieces);
}

let fails = 0;
for (let trial = 0; trial < 3000; trial++) {
  const len = 1 + rand(40);
  const moves = Array.from({ length: len }, () => rand(core.moveCount));
  const names = core.names(moves);
  const s = CubeState.solved().applyAll(core, moves);
  const p = kp.defaultPattern().applyAlg(names.join(" "));
  if (!samePattern(s, p)) { fails++; if (fails < 5) console.log("MISMATCH", names.join(" ")); }
  // 单块代码转移与整体状态一致
  for (let piece = 0; piece < 12; piece++) {
    let c = piece * 2;
    for (const m of moves) c = core.eCode[m][c];
    if (c !== s.edgeCodeOf(piece)) { fails++; if (fails < 5) console.log("ECODE", piece); }
  }
  for (let piece = 0; piece < 8; piece++) {
    let c = piece * 3;
    for (const m of moves) c = core.cCode[m][c];
    if (c !== s.cornerCodeOf(piece)) { fails++; if (fails < 5) console.log("CCODE", piece); }
  }
}
console.log("apply/code mismatches:", fails);

// derotate：含整体转动的公式改写后，效果（含中心）应完全相同
const withRot = [
  "x R' U R' D2 R U' R' D2 R2 x'",
  "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
  "R' U R' U' y R' F' R2 U' R' U R' F R F y'",
  "y R U R' y' F R U R' U' F'",
  "z R U R' z' x2 M U M' x2",
  "x2 y M' U2 M y' x2",
];
let rfails = 0;
for (const a of withRot) {
  const names = a.split(" ");
  const dr = derotate(names);
  const p1 = kp.defaultPattern().applyAlg(a);
  const s2 = CubeState.solved().applyAll(core, core.parse(dr));
  if (!samePattern(s2, p1)) { rfails++; console.log("DEROTATE MISMATCH", a, "=>", dr.join(" ")); }
  else console.log("ok", a, "=>", dr.join(" "));
}
console.log("derotate mismatches:", rfails);
console.log(simplifyNames(["U", "U2", "R", "R'", "F", "F", "F"]).join(" "), "|", invertNames(["R", "U2", "F'"]).join(" "));
process.exit(fails || rfails ? 1 : 0);
