// methods.js — act 5 (98–128 s): fast transitions, readable target states.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, hex, rgba } from '../lib/core.js';
import { camera, drawCube, shadow, blurred } from '../lib/draw3d.js';
import { EDGE_POS, CORNER_POS, posOf, atHome } from '../lib/cube.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { chip, check, rr } from '../lib/ui.js';
import { S } from '../seqs.js';
import { CUE } from '../timeline.js';

const GREEN = '#19d46e', GOLD = '#ffc61a', CYAN = '#36d6ff', BLUE = '#4f8bff', WHITE = [255, 255, 255];
const KICK = '05 · 方法';
const same = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: GREEN, k: 0.11, ly: 900 });
  if (t < C.lbl) intro(ctx, t);
  else if (t < C.cfop) lbl(ctx, t);
  else if (t < C.roux) cfop(ctx, t);
  else if (t < C.tri) roux(ctx, t);
  else tri(ctx, t);
  headline(ctx, t, { t0: C.methods, t1: C.lbl, kicker: KICK, lines: ['手再快，也得有**方法**：', '把大难题拆成几个小目标'], accent: GREEN });
  headline(ctx, t, { t0: C.lbl, t1: C.cfop, kicker: KICK, lines: ['**层先法**：像盖楼，', '一层一层来'], accent: GREEN });
  headline(ctx, t, { t0: C.cfop, t1: C.roux, kicker: KICK, lines: ['**CFOP**：十字之后，', '角块棱块**配对**插进槽'], accent: GOLD });
  headline(ctx, t, { t0: C.roux, t1: C.tri, kicker: KICK, lines: ['**桥式 Roux**：先搭两座“桥墩”，', '最后只拧 M 和 U'], accent: CYAN, stagger: 0.016 });
  headline(ctx, t, { t0: C.tri, t1: C.race, kicker: KICK, lines: ['三种只是代表，', '**适合自己的**最好'], accent: GREEN });
  footnote(ctx, t, { t0: C.lbl, t1: C.race, text: '演示为程序分阶段求解，不是选手实拧复盘', y: 500 });
  vignette(ctx, 0.6);
  flash(ctx, (t >= C.triHit ? Math.exp(-(t - C.triHit) * 10) * 0.45 : 0) + seg(t, C.race - 0.1, C.race) * 0.3);
}

const cam0 = (t, dy = 0) => camera({ yaw: 0.5 + Math.sin((t - CUE.methods) * 0.35) * 0.35, pitch: 0.36 + dy, dist: 28, cy: 860 });

// stage chips along the bottom; done = number completed, cur = index in progress
export function stageLayout(ctx, names, done) {
  const gap = 14, size = 32, pad = 18;
  const texts = names.map((s, i) => (i < done ? '✓ ' : '') + s);
  ctx.save(); ctx.font = `700 ${size}px ${SANS}`;
  const ws = texts.map((s) => ctx.measureText(s).width + pad * 2);
  ctx.restore();
  const total = ws.reduce((a, b) => a + b, 0) + gap * (names.length - 1);
  let x = 540 - total / 2;
  return texts.map((text, i) => { const item = { text, x, width: ws[i], size, pad }; x += ws[i] + gap; return item; });
}
function stageChips(ctx, names, done, col, t0) {
  stageLayout(ctx, names, done).forEach((item, i) => {
    const a = easeOut(seg(t0.t, t0.a + i * 0.08, t0.a + 0.3 + i * 0.08));
    const d = i < done, c = i === done;
    chip(ctx, item.text, item.x, 1350, { size: item.size, pad: item.pad, color: d ? '#06120b' : INK, bg: d ? col : c ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)', border: c ? col : null, alpha: a });
  });
}
const doneCount = (ends, t) => ends.filter((e) => t >= e).length;

function intro(ctx, t) {
  const C = CUE;
  const cam = cam0(t);
  const a = easeOut(seg(t, C.methods, C.methods + 0.4));
  shadow(ctx, cam, [0, 0, 0], 1, 0.6 * a);
  drawCube(ctx, cam, { state: S.scrambled, rim: 0.45, alpha: a });
  label(ctx, '还是开头那个打乱', 540, 1270, { size: 34, weight: 700, align: 'center', alpha: easeOut(seg(t, C.methods + 0.5, C.methods + 0.9)) * 0.7 });
  // four small goals light on the beats
  for (let i = 0; i < 4; i++) {
    const k = backOut(seg(t, C.methods + i * 0.5, C.methods + 0.3 + i * 0.5), 2);
    if (k <= 0) continue;
    const x = 540 + (i - 1.5) * 200, y = 1400;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    rr(ctx, -80, -60, 160, 120, 22); ctx.fillStyle = 'rgba(25,212,110,0.16)'; ctx.fill(); ctx.strokeStyle = GREEN; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    label(ctx, `小目标 ${i + 1}`, x, y + 12, { size: 32, weight: 900, align: 'center', alpha: clamp(k) });
    if (i < 3) label(ctx, '→', x + 100, y + 12, { size: 34, weight: 900, align: 'center', alpha: clamp(k) * 0.6 });
  }
}

// ── LBL ──
const LBL_SETS = [['DF', 'DR', 'DB', 'DL'], ['DFR', 'DFL', 'DBL', 'DBR'], ['FR', 'FL', 'BR', 'BL'], ['UF', 'UR', 'UB', 'UL', 'UFR', 'UFL', 'UBL', 'UBR']];
function lbl(ctx, t) {
  const C = CUE;
  const cam = cam0(t, -0.08);
  const done = doneCount(S.lblStageEnds, t);
  const sets = new Set(LBL_SETS.slice(0, done).flat());
  shadow(ctx, cam, [0, 0, 0], 1, 0.6);
  blurred(ctx, t, (st, c) => {
    const s = S.lbl.at(st);
    drawCube(c, cam, { ...s, rim: 0.45, look: (cb) => (sets.has(cb.name) && atHome(cb) ? { glow: 0.28, glowColor: hex(GREEN) } : { dim: done > 0 ? 0.25 : 0 }) });
  }, { samples: S.lbl.at(t).turn ? 3 : 1, shutter: 0.45 / 30 });
  // floor labels
  const floors = [[-1, '1F', 2], [0, '2F', 3], [1, '3F', 4]];
  for (const [y, name, need] of floors) {
    const p = cam.project([0, y, 0]);
    const k = easeOut(seg(t, S.lblStageEnds[need - 1], S.lblStageEnds[need - 1] + 0.3));
    if (k > 0) { chip(ctx, name + ' ✓', 70, p[1], { size: 34, color: '#06120b', bg: GREEN, alpha: k, weight: 900 }); }
  }
  stageChips(ctx, ['底层十字', '底层角', '中层棱', '顶层'], done, GREEN, { t, a: C.lbl });
}

// ── CFOP ──
function cfop(ctx, t) {
  const C = CUE;
  const home = posOf(CORNER_POS[S.cfopFocus[0].c[0]]);
  const cam = camera({ yaw: Math.atan2(home[0], home[2]) + Math.sin((t - C.cfop) * 0.35) * 0.08, pitch: 0.40, dist: 28, cy: 860 });
  const ends = S.cfopStageEnds; // cross, pair1..4, OLL, PLL
  const step = doneCount(ends, t);
  const vis = step === 0 ? 0 : step <= 4 ? 1 : step === 5 ? 2 : step === 6 ? 3 : 4;
  const pairNow = activeF2LPair(t);
  shadow(ctx, cam, [0, 0, 0], 1, 0.6);
  blurred(ctx, t, (st, c) => {
    const s = S.cfop.at(st);
    drawCube(c, cam, { ...s, rim: 0.45, look: (cb) => {
      if (pairNow && pairNow.names.has(cb.name)) return { glow: 0.75, glowColor: hex(GOLD) };
      if (step >= 5 && cb.pos[1] === 1) return { glow: 0.3, glowColor: hex(GOLD) };
      return null;
    } });
  }, { samples: S.cfop.at(t).turn ? 3 : 1, shutter: 0.35 / 30 });
  if (pairNow) {
    const k = easeOut(seg(t, ends[0], ends[0] + 0.3));
    label(ctx, `第 ${pairNow.index} 对：角块 + 棱块 → 一起入槽`, 540, 1268, { size: 36, weight: 900, color: GOLD, align: 'center', alpha: k });
  }
  stageChips(ctx, ['十字', 'F2L ×4 对', 'OLL 顶面', 'PLL 顶层'], vis, GOLD, { t, a: C.cfop });
}
export function activeF2LPair(t) {
  const ends = S.cfopStageEnds;
  if (t < ends[0]) return null;
  for (let i = 1; i <= 4; i++) if (t < S.cfopStageStarts[i + 1]) {
    const f = S.cfopFocus[i - 1];
    return { index: i, names: new Set([EDGE_POS[f.e[0]], CORNER_POS[f.c[0]]].map(canon)) };
  }
  return null;
}
// cubing.js position names (e.g. 'DBR', 'BR') → our cubie names (U D F B R L order)
const canon = (n) => { const order = 'UDFBRL'; return [...n].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(''); };

// ── Roux ──
const FB = new Set(['L', 'DL', 'FL', 'BL', 'DFL', 'DBL']), SB = new Set(['R', 'DR', 'FR', 'BR', 'DFR', 'DBR']);
function roux(ctx, t) {
  const C = CUE;
  const cam = camera({ yaw: 0.05 + Math.sin((t - C.roux) * 0.5) * 0.25, pitch: 0.42, dist: 28, cy: 860 });
  const ends = S.rouxStageEnds;
  const done = doneCount(ends, t);
  shadow(ctx, cam, [0, 0, 0], 1, 0.6);
  blurred(ctx, t, (st, c) => {
    const s = S.roux.at(st);
    drawCube(c, cam, { ...s, rim: 0.45, look: (cb) => {
      if (done >= 1 && FB.has(cb.name) && atHome(cb)) return { glow: 0.45, glowColor: hex(CYAN) };
      if (done >= 2 && SB.has(cb.name) && atHome(cb)) return { glow: 0.45, glowColor: hex(CYAN) };
      if (done >= 3 && cb.pos[0] === 0) return { glow: 0.35, glowColor: hex(BLUE) };
      return null;
    } });
  }, { samples: S.roux.at(t).turn ? 3 : 1, shutter: 0.35 / 30 });
  // pier labels
  for (const [x, i, s] of [[-1, 0, '左桥墩'], [1, 1, '右桥墩']]) {
    const k = easeOut(seg(t, ends[i], ends[i] + 0.3));
    if (k <= 0) continue;
    const p = cam.project([x * 1.0, -0.5, 0.6]);
    const lx = x < 0 ? 70 : 1010, ly = 1150;
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = CYAN; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(x < 0 ? lx + 150 : lx - 150, ly - 28); ctx.stroke();
    ctx.fillStyle = CYAN; ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    chip(ctx, s + ' 1×2×3', lx, ly, { size: 32, color: '#001a22', bg: CYAN, align: x < 0 ? 'left' : 'right', alpha: k, weight: 900 });
  }
  if (done >= 3) label(ctx, '只拧 M 和 U', 540, 1268, { size: 38, weight: 900, color: CYAN, align: 'center', alpha: easeOut(seg(t, ends[2], ends[2] + 0.3)) });
  stageChips(ctx, ['左桥墩', '右桥墩', 'CMLL 顶角', 'LSE 中层'], done, CYAN, { t, a: C.roux });
}

// ── all three finish on the downbeat ──
function tri(ctx, t) {
  const C = CUE;
  const cam = camera({ yaw: 0.0, pitch: 0.38, dist: 40, cy: 960 });
  const names = ['层先法', 'CFOP', '桥式 Roux'], cols = [GREEN, GOLD, CYAN];
  const a = easeOut(seg(t, C.tri, C.tri + 0.3));
  S.tri.forEach((seq, i) => {
    const x = (i - 1) * 3.6, pos = [x, 0, 0];
    const yaw = 0.6;
    shadow(ctx, cam, pos, 0.75, 0.5 * a);
    drawCube(ctx, cam, { ...seq.at(t), pos, scale: 0.75, rot: rotY(0.62), rim: 0.45, alpha: a, look: t >= C.triHit ? () => ({ glow: 0.3 * Math.exp(-(t - C.triHit) * 2), glowColor: hex(cols[i]) }) : null });
    const p = cam.project([x, -2.1, 0]);
    label(ctx, names[i], p[0], p[1] + 60, { size: 40, weight: 900, color: cols[i], align: 'center', alpha: a });
    check(ctx, p[0], p[1] + 140, 50, cols[i], seg(t, C.triHit, C.triHit + 0.3), 9);
  });
}
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
