// 求解 Worker：在后台线程里分阶段求解，并立即用 cubing.js KPuzzle 独立复核。
import { cube3x3x3 } from "cubing/puzzles";
import { CubeCore } from "../solver/core.js";
import { MethodSolver } from "../solver/methods.js";
import { makeVerifier } from "../solver/verify.js";

const ready = (async () => {
  const kp = await cube3x3x3.kpuzzle();
  const core = new CubeCore(kp);
  return { kp, core, solver: new MethodSolver(core), verifier: makeVerifier(kp) };
})();

self.onmessage = async (e) => {
  const { id, method, scramble } = e.data;
  try {
    const { solver, verifier } = await ready;
    const t0 = performance.now();
    const res = solver.solve(method, scramble);
    const ms = performance.now() - t0;
    const check = verifier.verify(method, scramble, null, res);
    self.postMessage({ id, ok: true, res, ms, check });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
self.postMessage({ hello: true });
