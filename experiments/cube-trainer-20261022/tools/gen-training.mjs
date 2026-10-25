import { writeFileSync } from "node:fs";
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore, invertNames, derotate } from "../src/solver/core.js";
import { CrossPlanner, inspect, SLOTS, tracked } from "../src/learning/engine.js";

const kp = await cube3x3x3.kpuzzle(), core = new CubeCore(kp), planner = new CrossPlanner(core);
let seed = 20261022;
const rand = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor(seed / 4294967296 * n); };
const scramble = (n) => { const a = []; while (a.length < n) { const f = "UDLRFB"[rand(6)]; if (a.length && a.at(-1)[0] === f) continue; a.push(f + ["", "2", "'"][rand(3)]); } return a; };
const bank = { cross: [], prediction: [], extended: [] };
for (const [level, min, max, length] of [["one", 1, 1, 1], ["short", 2, 4, 5], ["normal", 5, 8, 22]]) {
  const seen = new Set();
  for (let tries = 0, count = 0; count < 12 && tries < 2000; tries++) {
    const setup = scramble(length), key = setup.join(" "); if (seen.has(key)) continue;
    const solution = planner.solve(setup); if (solution.distance < min || solution.distance > max) continue;
    seen.add(key); if (!inspect(kp, setup, solution.moves).cross) throw new Error("十字目标不成立");
    bank.cross.push({ id: `${level}-${++count}`, level, setup, solution: solution.moves, distance: solution.distance, alternatives: planner.alternatives(setup) });
  }
  if (bank.cross.filter((x) => x.level === level).length !== 12) throw new Error("题库不足");
}
for (const [i, q] of bank.cross.filter((x) => x.level !== "one").entries()) {
  const slot = Object.keys(SLOTS)[i % 4];
  bank.prediction.push({ ...q, id: "predict-" + i, slot, expected: tracked(kp, q.setup, q.solution, slot) });
}
const rotations = { FR: "", FL: "y'", BR: "y", BL: "y2" };
for (const n of [1, 2, 3]) for (let j = 0; j < 6; j++) {
  let q;
  for (let tries = 0; tries < 100; tries++) {
    const selected = Object.keys(SLOTS).filter((_, i) => ((i + j) % 4) < n);
    const goalSetup = Object.keys(SLOTS).filter((k) => !selected.includes(k)).flatMap((k) => {
      const y = rotations[k], a = ["R", "U2", "R'"];
      return y ? derotate([y, ...a, ...invertNames([y])]) : a;
    });
    const goal = inspect(kp, goalSetup); if (!goal.cross || goal.slots.length !== n) throw new Error("扩展十字终点构造错误");
    const route = scramble(4 + rand(3)), setup = [...goalSetup, ...invertNames(route)];
    if (inspect(kp, setup).cross) continue;
    const end = inspect(kp, setup, route); if (!end.cross || end.slots.join() !== goal.slots.join()) throw new Error("扩展路线验算错误");
    const shortest = planner.solve(setup);
    q = { id: `extended-${n}-${j}`, n, setup, solution: route, slots: end.slots, distance: shortest.distance, crossSolution: shortest.moves, crossSlots: inspect(kp, setup, shortest.moves).slots };
    break;
  }
  if (!q) throw new Error("扩展题生成失败");
  bank.extended.push(q);
}
const reachable = Array.from(planner.table.dist).filter((x) => x !== 255);
const report = { seed: 20261022, cross: bank.cross.length, prediction: bank.prediction.length, extended: bank.extended.length, crossStates: reachable.length, crossMaxDistance: reachable.reduce((a, b) => Math.max(a, b), 0), kind: "固定题库；常规题来自随机22步，不宣称均匀随机状态；扩展路线可行但不宣称最短" };
if (report.crossStates !== 190080 || report.crossMaxDistance !== 8) throw new Error("十字状态空间不符");
writeFileSync(new URL("../src/data/training.json", import.meta.url), JSON.stringify({ report, ...bank }));
console.log(JSON.stringify(report));
