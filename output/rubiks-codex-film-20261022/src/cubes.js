import EXAMPLE from '../assets/reference/example.json' with { type: 'json' };
import { GeoCube, moveSpec, FACE_NORMAL, FACE_COLOR, mulMV } from './render/geometry.js';

export { FACE_NORMAL, FACE_COLOR, moveSpec, mulMV };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (moves) => [...moves].reverse().map((m) => m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : m + "'");
const snap = (g) => g.cubies.map((c) => ({ piece: c.piece, pos: [...c.pos], rot: c.rot.map((r) => [...r]) }));

export class Sequence {
  constructor(setup, moves) {
    this.setup = setup; this.moves = moves;
    const g = new GeoCube().applyAll(setup);
    this.states = [snap(g)];
    for (const m of moves) { g.apply(m); this.states.push(snap(g)); }
  }
  sample(u) {
    const p = clamp(u) * this.moves.length;
    const index = Math.min(this.moves.length, Math.floor(p));
    const f = smooth((p - index - .07) / .86);
    const spec = index < this.moves.length ? moveSpec(this.moves[index]) : null;
    return { state: this.states[index], spec, angle: spec ? spec.quarter * Math.PI / 2 * f : 0, index, move: this.moves[index] };
  }
}

export const OPEN = new Sequence([], ['R', 'U', 'F2', "L'", 'D', 'B2', "R'", 'U']);
export const CLOSE = new Sequence(OPEN.moves, inv(OPEN.moves));
export const SOLVED = new Sequence([], []);
export const SUPERFLIP = "R L U2 F U' D F2 R2 B2 L U2 F' B' U R2 D F2 U R2 U".split(' ');
export const SUPER = new Sequence(SUPERFLIP, inv(SUPERFLIP));
const META = {
  cross: '底层十字', corners: '底层四角', middle: '中层四棱', llcross: '顶层十字', llface: '顶面同色', llcorners: '顶角归位', lledges: '完整还原',
  f2l: '角棱配对 · 前两层', oll: '顶面定向', pll: '顶层排列', fb: '左侧 1×2×3 块', sb: '右侧 1×2×3 块', cmll: '顶层四角', lse: '最后六棱与中心',
};
const WEIGHTS = { lbl: [.18, .16, .18, .12, .12, .12, .12], cfop: [.14, .43, .21, .22], roux: [.27, .27, .20, .26] };
export const METHODS = {};
for (const method of ['lbl', 'cfop', 'roux']) {
  const result = EXAMPLE.solutions[method];
  const moves = [], stages = [];
  let fraction = 0;
  result.stages.forEach((s, i) => {
    const start = moves.length;
    for (const step of s.steps) moves.push(...step.moves);
    stages.push({ id: s.id, title: META[s.id], start, end: moves.length, a: fraction, b: fraction + WEIGHTS[method][i] });
    fraction += WEIGHTS[method][i];
  });
  METHODS[method] = { sequence: new Sequence(EXAMPLE.scramble.split(' '), moves), stages, result };
}

export function methodFrame(method, u) {
  const { sequence, stages } = METHODS[method];
  const stageIndex = stages.findIndex((s) => u < s.b);
  const i = stageIndex < 0 ? stages.length - 1 : stageIndex;
  const stage = stages[i], p = clamp((u - stage.a) / (stage.b - stage.a));
  const count = stage.start + (stage.end - stage.start) * smooth(clamp(p / .79));
  return { ...sequence.sample(count / sequence.moves.length), stage, stageIndex: i, stages, held: p >= .79 };
}

export const FOCUS = {
  cross: new Set(['E4', 'E5', 'E6', 'E7']),
  corners: new Set(['C4', 'C5', 'C6', 'C7', 'E4', 'E5', 'E6', 'E7']),
  middle: new Set(['C4', 'C5', 'C6', 'C7', ...Array.from({ length: 8 }, (_, i) => 'E' + (i + 4))]),
  f2l: new Set(['C4', 'C5', 'C6', 'C7', ...Array.from({ length: 8 }, (_, i) => 'E' + (i + 4))]),
  fb: new Set(['E7', 'E9', 'E11', 'C5', 'C6', 'Z1']),
  sb: new Set(['E7', 'E9', 'E11', 'C5', 'C6', 'Z1', 'E5', 'E8', 'E10', 'C4', 'C7', 'Z3']),
  cmll: new Set(['C0', 'C1', 'C2', 'C3']),
  lse: new Set(['E0', 'E1', 'E2', 'E3', 'E4', 'E6', 'Z0', 'Z2', 'Z4', 'Z5']),
};

export function rot(v, axis, angle) {
  const c = Math.cos(angle), s = Math.sin(angle), [x, y, z] = v;
  return axis === 0 ? [x, c * y - s * z, s * y + c * z] : axis === 1 ? [c * x + s * z, y, -s * x + c * z] : [c * x - s * y, s * x + c * y, z];
}

export function moveEvents(scene) {
  if (!METHODS[scene.id]) return [];
  const { stages, sequence } = METHODS[scene.id], span = scene.end - scene.start;
  const events = [];
  for (const stage of stages) {
    const duration = (stage.b - stage.a) * span * .79, count = stage.end - stage.start;
    for (let i = 0; i < count; i++) {
      // Invert the same smoothstep used by methodFrame so sound and the drawn turn finish together.
      let a = 0, b = 1, target = (i + .96) / count;
      for (let k = 0; k < 18; k++) { const m = (a + b) / 2; if (smooth(m) < target) a = m; else b = m; }
      events.push({ time: scene.start + stage.a * span + (a + b) / 2 * duration, kind: 'turn', move: sequence.moves[stage.start + i], method: scene.id });
    }
    events.push({ time: scene.start + stage.a * span + duration, kind: 'goal', method: scene.id, stage: stage.id });
  }
  return events;
}
