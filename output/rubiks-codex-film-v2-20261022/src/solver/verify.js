// 独立复核：用 cubing.js KPuzzle（不经过求解器内部的状态表示）从打乱开始逐步复算，
// 每个阶段结束检查该阶段及之前所有阶段的目标，最后检查整体还原。浏览器与 Node 共用。
import { KPattern } from "cubing/kpuzzle";
import { makePredicates, slotsOk } from "./predicates.js";

export const STAGE_ORDER = {
  lbl: ["cross", "corners", "middle", "llcross", "llface", "llcorners", "lledges"],
  cfop: ["cross", "f2l", "oll", "pll"],
  roux: ["fb", "sb", "cmll", "lse"],
};

export function makeVerifier(kp) {
  const M = kp.moveToTransformation("M").transformationData;
  const P = makePredicates({ ePerm: M.EDGES.permutation, eDelta: M.EDGES.orientationDelta, zPerm: M.CENTERS.permutation });
  const GOAL = {
    lbl: { cross: P.cross, corners: P.firstLayer, middle: P.f2l, llcross: P.llEdgesOriented, llface: P.oll, llcorners: P.llCorners, lledges: P.solved },
    cfop: { cross: P.cross, f2l: P.f2l, oll: P.oll, pll: P.solved },
    roux: { fb: P.fb, sb: P.sb, cmll: P.cmll, lse: P.rouxSolved },
  };
  const view = (pat) => { const d = pat.patternData; return { ep: d.EDGES.pieces, eo: d.EDGES.orientation, cp: d.CORNERS.pieces, co: d.CORNERS.orientation, zp: d.CENTERS.pieces }; };
  // startPatternData 与 scramble 二选一
  function verify(method, scramble, startPatternData, result) {
    const scr = Array.isArray(scramble) ? scramble.join(" ") : scramble || "";
    let pat = startPatternData ? new KPattern(kp, startPatternData) : kp.defaultPattern().applyAlg(scr);
    const order = STAGE_ORDER[method];
    const stages = [];
    let allOk = true;
    for (const st of result.stages) {
      const before = GOAL[method][st.id](view(pat));
      const slots = [];
      let stepsOk = true;
      for (const step of st.steps) {
        if (step.moves.length) pat = pat.applyAlg(step.moves.join(" "));
        if (step.slot) { slots.push(step.slot); if (!(P.cross(view(pat)) && slotsOk(view(pat), slots))) stepsOk = false; }
      }
      const k = order.indexOf(st.id);
      const reached = GOAL[method][st.id](view(pat));
      const kept = order.slice(0, k).every((id) => GOAL[method][id](view(pat)));
      const ok = reached && kept && stepsOk;
      allOk &&= ok;
      stages.push({ id: st.id, before, reached, kept, ok });
    }
    const solved = pat.experimentalIsSolved({ ignorePuzzleOrientation: false, ignoreCenterOrientation: true });
    return { ok: allOk && solved, solved, stages };
  }
  return { verify, GOAL, P, view };
}
