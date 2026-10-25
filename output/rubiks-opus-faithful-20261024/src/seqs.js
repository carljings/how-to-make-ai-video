// seqs.js — every timed move sequence in the film, built once. Scenes draw them; score.js clicks on them.
import { solved, applyAlg, sequence, timed, paced, parseAlg } from './lib/cube.js';
import { EX, stagesOf, SUPERFLIP } from './data.js';
import { CUE } from './timeline.js';

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
export const S = {};

// steps: [[moves...], ...]; pauses[i] = pause after step i; fills [t0, t1] exactly
function fit(start, steps, t0, t1, pauses, overlap = 0.04) {
  const n = steps.reduce((a, s) => a + s.length, 0);
  const P = pauses.reduce((a, b) => a + b, 0);
  const d = (t1 - t0 - P) / n;
  const list = [];
  steps.forEach((s, si) => s.forEach((m, mi) => list.push([d * (1 - overlap), (mi === s.length - 1 ? pauses[si] || 0 : 0) + d * overlap])));
  return sequence(start, steps.flat(), timed(t0, list), ease);
}

export function buildSeqs() {
  const scr = applyAlg(solved(), EX.scramble);
  S.scrambled = scr;
  // cold open: the CFOP demo solve in 0.00–2.50, 0.05 s look-ahead between steps
  const cfopSteps = EX.solutions.cfop.stages.flatMap((st) => st.steps.map((s) => s.moves));
  S.open = fit(scr, cfopSteps, 0, CUE.solveEnd, cfopSteps.map((_, i) => (i < cfopSteps.length - 1 ? 0.05 : 0)), 0.04);
  // origin: the wire cube turns its top layer once
  S.originTurn = sequence(solved(), ['U'], [[11.4, 12.3]], ease);
  // count act: the cube scrambles itself
  S.countScramble = sequence(solved(), EX.scramble, paced(EX.scramble.split(' ').length, 22.3, 0.11, 0.047), ease);
  // twenty: 1 move = 90° or 180°
  S.rule90 = sequence(solved(), ['R'], [[51.0, 51.45]], ease);
  S.rule180 = sequence(solved(), ['R2'], [[51.6, 52.3]], ease);
  // superflip solved by its 20 moves
  const sf = applyAlg(solved(), SUPERFLIP);
  S.superflipState = sf;
  S.superflip = sequence(sf, SUPERFLIP, paced(20, CUE.superflip + 0.45, 0.085, 0.015), ease);
  // methods
  const lbl = stagesOf('lbl'), cfop = stagesOf('cfop'), roux = stagesOf('roux');
  // LBL: four visible floors (cross, corners, middle, last layer); pauses at each
  const lblSteps = [lbl[0].moves, lbl[1].moves, lbl[2].moves, [...lbl[3].moves, ...lbl[4].moves, ...lbl[5].moves, ...lbl[6].moves]];
  S.lbl = fit(scr, lblSteps, CUE.lbl + 0.3, CUE.cfop - 0.4, [0.3, 0.3, 0.3, 0], 0.08);
  S.lblStageEnds = stageEnds(S.lbl, lblSteps.map((s) => s.length));
  // CFOP: cross, four pairs, OLL, PLL
  const cfopVis = [cfop[0].moves, ...cfop[1].steps.map((s) => s.moves), cfop[2].moves, cfop[3].moves];
  S.cfop = fit(scr, cfopVis, CUE.cfop + 0.3, CUE.roux - 0.4, [0.3, 0.2, 0.2, 0.2, 0.3, 0.3, 0], 0.06);
  S.cfopStageEnds = stageEnds(S.cfop, cfopVis.map((s) => s.length));
  S.cfopFocus = cfop[1].steps.map((s) => s.focus);
  // Roux: first block, second block, CMLL, LSE
  const rouxVis = roux.map((s) => s.moves);
  S.roux = fit(scr, rouxVis, CUE.roux + 0.3, CUE.tri - 0.35, [0.35, 0.35, 0.3, 0], 0.06);
  S.rouxStageEnds = stageEnds(S.roux, rouxVis.map((s) => s.length));
  // triptych: the last stage of each method, all finishing on the downbeat
  const last = (seq, n) => ({ start: seq.snaps[seq.moves.length - n], moves: seq.moves.slice(-n).map((m) => m.name) });
  const tri = [last(S.lbl, 11), last(S.cfop, 10), last(S.roux, 5)];
  S.tri = tri.map(({ start, moves }) => sequence(start, moves, paced(moves.length, CUE.triHit - moves.length * (1.3 / moves.length), (1.3 / moves.length) * 0.92, (1.3 / moves.length) * 0.08), ease));
  return S;
}
// times at which each visible stage is complete
function stageEnds(seq, counts) {
  const out = []; let i = 0;
  for (const n of counts) { i += n; out.push(seq.times[i - 1][1]); }
  return out;
}

// every move with its start time, for the sound of the turns
export function allTurns() {
  const out = [];
  const add = (seq, gain = 1, tag = '') => seq.moves.forEach((m, i) => out.push({ t: seq.times[i][0], d: seq.times[i][1] - seq.times[i][0], q: m.quarters, gain, tag }));
  add(S.open, 0.9, 'open'); add(S.originTurn, 0.5, 'wire'); add(S.countScramble, 0.8); add(S.rule90, 1); add(S.rule180, 1);
  add(S.superflip, 0.9, 'sf'); add(S.lbl, 0.55); add(S.cfop, 0.75); add(S.roux, 0.75);
  S.tri.forEach((s) => add(s, 0.45));
  return out.sort((a, b) => a.t - b.t);
}
