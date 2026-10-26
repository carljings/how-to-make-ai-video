// Concentric BFS frontiers and a polygonal route, following Polylog's CubeMITM
// treatment (MIT; see docs/references/polylog-LICENSE.txt and
// docs/references/polylog-cube_solution.py.txt).
// The layout is schematic; the highlighted 10 + 10 example uses real cube states.
import { seg, clamp, lerp, easeOut, easeInOut, rgba } from '../lib/core.js';
import { camera, drawCube } from '../lib/draw3d.js';
import { label, bigNumber, INK } from '../lib/text.js';
import { S } from '../seqs.js';
import { CUE } from '../timeline.js';

const CYAN = '#36d6ff', VIO = '#9b7bff', GREEN = '#a5dba9';
const GRAY = '#aeb2bd', PAPER = '#08090e';
const LEFT = [300, 1000], RIGHT = [780, 1000], MEET = [540, 1000];
const RADII = Array.from({ length: 10 }, (_, i) => 60 + i * 20);
const SCALE = 0.18, BELOW = 145;

function makePath(center, side, offsets) {
  return [center, ...RADII.map((r, i) => {
    const dy = offsets[i];
    return [center[0] + side * Math.sqrt(r * r - dy * dy), center[1] + dy];
  })];
}
// Each numbered node lies on its corresponding radius. Last nodes coincide exactly.
const LEFT_PATH = makePath(LEFT, 1, [-18, 15, -22, 21, -15, 25, 10, -19, 16, 0]);
const RIGHT_PATH = makePath(RIGHT, -1, [18, -15, 24, -20, 15, -22, 17, -12, -10, 0]);
// The right-hand sequence is scramble -> meeting; the left sequence is reversed.
const ROUTE = [...RIGHT_PATH, ...LEFT_PATH.slice(0, -1).reverse()];

export const SEARCH_LAYOUT = {
  left: LEFT, right: RIGHT, meeting: MEET, radii: RADII,
  leftPath: LEFT_PATH, rightPath: RIGHT_PATH, route: ROUTE,
  cubeScale: SCALE, travelerOffset: BELOW, finalCubePosition: [LEFT[0], LEFT[1] + BELOW],
};

function depth(seq, t) {
  const q = seq.at(t);
  return q.done + (q.turn ? q.turn.k : 0);
}
function radiusAt(d) {
  if (d <= 1) return RADII[0] * d;
  const i = Math.min(9, Math.floor(d) - 1);
  return lerp(RADII[i], RADII[Math.min(9, i + 1)], d - Math.floor(d));
}
function rings(ctx, center, d, color, alpha = 1, quiet = 0) {
  d = clamp(d, 0, 10);
  if (d <= 0) return;
  ctx.save(); ctx.shadowBlur = 0;
  ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(GRAY, 0.40 * alpha);
  for (let i = 1; i < Math.ceil(d); i++) {
    ctx.beginPath(); ctx.arc(center[0], center[1], RADII[i - 1], 0, Math.PI * 2); ctx.stroke();
  }
  const radius = radiusAt(d);
  ctx.lineWidth = lerp(2.5, 1.7, quiet); ctx.strokeStyle = rgba(color, alpha * lerp(0.95, 0.42, quiet));
  ctx.beginPath(); ctx.arc(center[0], center[1], radius, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Counter follows the active circle, outside its upper outer quadrant.
  const side = center === LEFT ? -1 : 1, r = radius + 34;
  const labelIn = d < 1 ? easeOut(seg(radius, 42, 60)) : 1;
  label(ctx, Math.min(10, Math.ceil(d)) + ' 步', center[0] + side * r * 0.70, center[1] - r * 0.70,
    { size: 31, weight: 700, color, align: 'center', alpha: alpha * labelIn * (1 - 0.55 * quiet) });
}
function littleCube(ctx, state, x, y, alpha = 1, turn = null) {
  if (alpha <= 0) return;
  const cam = camera({ yaw: 0.62, pitch: 0.42, dist: 42, cx: x, cy: y });
  drawCube(ctx, cam, { state, turn, scale: SCALE, alpha, rim: 0.3 });
}
function pathPosition(points, step) {
  step = clamp(step, 0, points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(step)), k = step - i;
  return [lerp(points[i][0], points[i + 1][0], k), lerp(points[i][1], points[i + 1][1], k)];
}
function pathLine(ctx, points, step, color, width, alpha) {
  step = clamp(step, 0, points.length - 1);
  if (step <= 0 || alpha <= 0) return;
  const end = pathPosition(points, step);
  ctx.save(); ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i <= Math.floor(step); i++) ctx.lineTo(...points[i]);
  if (step % 1) ctx.lineTo(...end);
  ctx.stroke(); ctx.restore();
}
function nodes(ctx, points, step, color, alpha = 1, sharedIndex = -1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.shadowBlur = 0;
  points.forEach((p, i) => {
    if (i === sharedIndex) return;
    const hit = i <= Math.floor(step), r = hit ? 5.5 : 4;
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fillStyle = hit ? color : PAPER; ctx.fill();
    ctx.strokeStyle = hit ? color : rgba(GRAY, 0.75); ctx.lineWidth = 1.5; ctx.stroke();
  });
  ctx.restore();
}
function sharedNode(ctx, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.shadowBlur = 0;
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(...MEET, 12, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(...MEET, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawSearch(ctx, t) {
  const C = CUE, enter = easeOut(seg(t, C.shells, C.shells + 0.3));
  const found = easeOut(seg(t, C.searchMeet + 0.1, C.searchMeet + 0.5));
  rings(ctx, LEFT, depth(S.searchLeft, t), CYAN, enter, found);
  rings(ctx, RIGHT, depth(S.searchRight, t), VIO, enter, found);
  if (t >= C.searchMeet) {
    const pathIn = easeOut(seg(t, C.searchMeet, C.searchMeet + 0.25));
    const step = 10 * seg(t, C.searchMeet + 0.35, C.searchJoin - 0.6);
    for (const [points, color] of [[LEFT_PATH, CYAN], [RIGHT_PATH, VIO]]) {
      pathLine(ctx, points, 10, GRAY, 1.5, 0.30 * pathIn);
      pathLine(ctx, points, step, color, 3.4, pathIn);
      nodes(ctx, points, step, color, pathIn, 10);
    }
    sharedNode(ctx, found);
    littleCube(ctx, S.searchMid, MEET[0], MEET[1] + BELOW, found);
    label(ctx, '共同状态', MEET[0], 1320, { size: 32, weight: 700, color: GREEN, align: 'center', alpha: found });
  }
  littleCube(ctx, S.searchLeft.snaps[0], ...LEFT, enter);
  littleCube(ctx, S.searchRight.snaps[0], ...RIGHT, enter * (t < C.searchBoth ? 0.58 : 1));
  label(ctx, '还原态', LEFT[0], 1320, { size: 34, weight: 700, color: CYAN, align: 'center', alpha: enter });
  label(ctx, '当前打乱', RIGHT[0], 1320, { size: 34, weight: 700, color: VIO, align: 'center', alpha: enter });
}

export function drawJoin(ctx, t) {
  const C = CUE, q = S.searchSolve.at(t), step = q.done + (q.turn ? q.turn.k : 0);
  const enter = easeInOut(seg(t, C.searchJoin, S.searchSolve.times[0][0]));
  rings(ctx, LEFT, 10, CYAN, 1, 1); rings(ctx, RIGHT, 10, VIO, 1, 1);
  pathLine(ctx, ROUTE, 20, GRAY, 1.7, 0.45);
  pathLine(ctx, ROUTE, step, GREEN, 3.8, 1);
  nodes(ctx, ROUTE, step, GREEN, 1, 10); sharedNode(ctx);
  // Source cubes remain small; the moving example travels below the route.
  littleCube(ctx, S.searchLeft.snaps[0], ...LEFT, 1 - easeOut(seg(step, 16, 20)));
  littleCube(ctx, S.searchMid, MEET[0], MEET[1] + BELOW, 1 - enter);
  const p = pathPosition(ROUTE, step);
  littleCube(ctx, q.state, p[0], p[1] + BELOW * enter, 1, q.turn);
  label(ctx, q.done === 20 ? '还原完成' : '还原态', LEFT[0], 1320, { size: 34, weight: 700, color: CYAN, align: 'center' });
  label(ctx, '打乱态', RIGHT[0], 1320, { size: 34, weight: 700, color: VIO, align: 'center' });
  label(ctx, '共同状态', MEET[0], 1320, { size: 32, weight: 700, color: GREEN, align: 'center', alpha: 0.85 });
  bigNumber(ctx, '10 + 10 = 20', 540, 1480, { size: 100, color: INK, alpha: easeOut(seg(t, C.searchJoin, C.searchJoin + 0.3)) });
  label(ctx, '本例：' + q.done + ' / 20 步', 540, 1540, { size: 30, weight: 700, align: 'center', alpha: 0.75 });
}
