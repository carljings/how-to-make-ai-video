import { cube3x3x3 } from "cubing/puzzles";
import { Alg } from "cubing/alg";
const kp = await cube3x3x3.kpuzzle();
const def = kp.definition;
console.log(Object.keys(def));
console.log(JSON.stringify(def.orbits));
console.log("defaultPattern", JSON.stringify(def.defaultPattern));
console.log("moves", Object.keys(def.moves));
console.log("derived", def.derivedMoves && Object.keys(def.derivedMoves));
for (const m of ["U","R","F","M","r","x"]) {
  const t = kp.moveToTransformation(m);
  console.log(m, JSON.stringify(t.transformationData));
}
const p = kp.defaultPattern().applyAlg("R U R' U'");
console.log(JSON.stringify(p.patternData));
console.log("solved?", kp.defaultPattern().applyAlg("R U R' U' U R U' R'").experimentalIsSolved({ignorePuzzleOrientation:true, ignoreCenterOrientation:true}));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(p)));
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(kp)));
const a = Alg.fromString("[R, U] (R U)2 M' r2 x y'");
console.log(a.toString(), "|", a.expand().toString(), "|", a.invert().toString());
console.log([...a.expand().experimentalLeafMoves()].map(m=>[m.family, m.amount, m.innerLayer, m.outerLayer].join(":")).join(" "));
