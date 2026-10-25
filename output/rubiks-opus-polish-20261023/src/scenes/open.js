// open.js — cold open (0–10 s): the 2.51-second solve, the record, 6th place in the final, the question.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, smooth, rgba } from '../lib/core.js';
import { camera, drawCube, orient, shadow, blurred } from '../lib/draw3d.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { rr, chip } from '../lib/ui.js';
import { S } from '../seqs.js';
import { CUE, ACT } from '../timeline.js';
import { GZ_FINAL } from '../data.js';

const RED = '#ff3b3b', GOLD = '#ffc61a', VIOLET = '#9b7bff';
const drift = (t) => [Math.sin(t * 1.3) * 0.014 + Math.sin(t * 3.1 + 1) * 0.006, Math.sin(t * 1.7 + 2) * 0.012];

export function draw(ctx, t) {
  const E = CUE.solveEnd;
  backdrop(ctx, { color: t < E ? ACT.open : RED, k: t < E ? 0.16 : 0.2, ly: 900 });
  if (t < CUE.board) solveAndSlam(ctx, t);
  else if (t < CUE.why) board(ctx, t);
  else whyAndTiles(ctx, t);
  vignette(ctx, 0.6);
}

function solveAndSlam(ctx, t) {
  const E = CUE.solveEnd;
  const k = seg(t, 0, E), slam = seg(t, E, E + 0.55);
  const [dy, dp] = drift(t);
  const cam = camera({ yaw: lerp(-0.3, 0.62, easeInOut(k)) + 0.35 * easeOut(slam) + dy, pitch: lerp(0.3, 0.5, k) + dp, dist: lerp(12.5, 23, easeInOut(k)) + 16 * easeOut(slam), cy: lerp(930, 1330, easeOut(slam)) });
  const cubeA = 1 - 0.68 * easeOut(slam);
  shadow(ctx, cam, [0, 0, 0], 1, 0.8 * cubeA);
  blurred(ctx, t, (st, c) => drawCube(c, cam, { ...S.open.at(st), alpha: 1 }), { samples: t < E + 0.05 ? 5 : 1, alpha: cubeA });

  // Keep the opening readable while bright faces pass behind the headline.
  if (t < E) {
    const shade = ctx.createLinearGradient(0, 120, 0, 650);
    shade.addColorStop(0, 'rgba(0,0,0,0.92)');
    shade.addColorStop(0.62, 'rgba(0,0,0,0.80)');
    shade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, W, 650);
    rr(ctx, 326, 1275, 428, 294, 30);
    ctx.fillStyle = 'rgba(4,7,12,0.86)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; ctx.stroke();
  }

  // timer: under the cube while solving, then slams to the middle
  const val = Math.min(t + 0.01, 2.51);
  const pulse = t >= E ? Math.exp(-(t - E) * 5) : 0;
  const ty = lerp(1470, 860, expoOut(slam)), ts = lerp(190, 430, expoOut(slam)) * (1 + 0.07 * pulse);
  bigNumber(ctx, val.toFixed(2), 540, ty, { size: ts, color: t >= E ? '#ffffff' : 'rgba(244,242,238,0.94)', glow: 50 * pulse, glowColor: RED, spacing: 2 });
  label(ctx, 'SECONDS', 540, 1525, { size: 24, weight: 500, family: MONO, align: 'center', alpha: 0.5 * (1 - slam), spacing: 8 });
  if (t >= E + 0.12) {
    const s = backOut(seg(t, E + 0.12, E + 0.42), 2.4), out = 1 - seg(t, CUE.board - 0.25, CUE.board);
    ctx.save(); ctx.translate(540, 990); ctx.rotate(-0.055); ctx.scale(1.7 - 0.7 * s, 1.7 - 0.7 * s); ctx.globalAlpha = clamp(s * 1.5) * out;
    ctx.strokeStyle = RED; ctx.lineWidth = 7; rr(ctx, -255, -60, 510, 120, 18); ctx.stroke();
    label(ctx, '单次世界纪录', 0, 22, { size: 64, weight: 900, color: RED, align: 'center' });
    ctx.restore();
    label(ctx, '耿暄一 · 2026 年 10 月 · 广州', 540, 1140, { size: 38, weight: 700, align: 'center', alpha: easeOut(seg(t, 3.0, 3.4)) * out, color: 'rgba(244,242,238,0.82)' });
  }
  flash(ctx, t >= E ? Math.exp(-(t - E) * 12) * 0.6 : 0);
  headline(ctx, t, { t0: -0.7, t1: E, lines: ['还原一个魔方，', '最快要**几秒**？'], accent: GOLD, size: 86 });
  headline(ctx, t, { t0: E + 0.05, t1: CUE.board, lines: ['答案：**2.51 秒**'], accent: RED, size: 86 });
  footnote(ctx, t, { t0: -1, t1: CUE.board, text: '画面为演示用打乱与程序解法，非纪录原解', y: 505 });
}

// results board, rows flip in; row 6 lights red
const BX = 72, BW = 860, BY = 600, RH = 118;
function board(ctx, t) {
  const B = CUE.board;
  const ha = easeOut(seg(t, B, B + 0.3));
  label(ctx, '广州 · 2026 · 三阶决赛', BX, BY - 34, { size: 34, weight: 700, alpha: ha * 0.85 });
  label(ctx, '五把平均', BX + BW, BY - 34, { size: 30, weight: 500, alpha: ha * 0.6, align: 'right' });
  ctx.fillStyle = `rgba(255,255,255,${0.25 * ha})`; ctx.fillRect(BX, BY - 12, BW * ha, 2);
  GZ_FINAL.forEach(([name, avg], i) => {
    const t0 = B + 0.12 + i * 0.11 + (i === 5 ? 0.35 : 0);
    const k = seg(t, t0, t0 + 0.32);
    if (k <= 0) return;
    const y = BY + i * RH + (i === 5 ? 26 : 0);
    const sy = backOut(k, 1.6);
    const me = i === 5, hl = me ? easeOut(seg(t, B + 1.05, B + 1.35)) : 0;
    const dim = me ? 0 : 0.55 * easeOut(seg(t, B + 1.1, B + 1.5));
    ctx.save(); ctx.translate(0, y + RH / 2); ctx.scale(1, sy); ctx.translate(0, -(y + RH / 2));
    rr(ctx, BX, y + 6, BW, RH - 12, 16);
    ctx.fillStyle = me ? `rgba(${lerp(30, 120, hl) | 0},${lerp(32, 18, hl) | 0},${lerp(38, 22, hl) | 0},0.95)` : 'rgba(30,32,38,0.9)'; ctx.fill();
    if (me) { ctx.strokeStyle = rgba(RED, hl); ctx.lineWidth = 4; ctx.stroke(); }
    const a = 1 - dim;
    label(ctx, String(i + 1), BX + 64, y + RH / 2 + 26, { size: 76, weight: 800, family: COND, align: 'center', alpha: a });
    label(ctx, name, BX + 140, y + RH / 2 + 17, { size: 48, weight: 900, alpha: a });
    label(ctx, avg.toFixed(2), BX + BW - 34, y + RH / 2 + 26, { size: 76, weight: 800, family: COND, align: 'right', alpha: a, color: me ? '#ffffff' : INK });
    if (me && hl > 0) chip(ctx, '单次纪录 2.51 的主人', BX + 300, y + RH / 2, { size: 28, color: '#fff', bg: rgba(RED, 0.9 * hl), alpha: hl });
    ctx.restore();
  });
  headline(ctx, t, { t0: B + 0.05, t1: CUE.why, lines: ['可同一场比赛的决赛，', '他只拿了**第 6**'], accent: RED, size: 86 });
}

function whyAndTiles(ctx, t) {
  const W0 = CUE.why, T0 = CUE.tiles;
  // the board falls away
  if (t < W0 + 0.8) {
    const k = easeIn(seg(t, W0, W0 + 0.7));
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(0, 900 * k * k); boardRowsOnly(ctx); ctx.restore();
  }
  // 为什么？
  const wk = seg(t, W0, W0 + 0.25), wout = seg(t, T0 - 0.3, T0 - 0.02);
  if (wout < 1) {
    const sc = lerp(1.6, 1, expoOut(wk)) * (1 - 0.3 * wout);
    const shake = Math.exp(-(t - W0) * 8) * 14;
    ctx.save(); ctx.globalAlpha = clamp(wk * 3) * (1 - wout); ctx.translate(540 + Math.sin(t * 90) * shake, 990); ctx.scale(sc, sc);
    label(ctx, '为什么？', 0, 70, { size: 210, weight: 900, align: 'center' });
    ctx.restore();
  }
  // three numbers
  const tiles = [['4325', '亿亿种状态', GOLD], ['20', '步', VIOLET], ['2.51', '秒', RED]];
  tiles.forEach(([n, sub, col], i) => {
    const t0 = T0 + i * 0.25, k = seg(t, t0, t0 + 0.28);
    if (k <= 0) return;
    const x = 66 + i * 322, y = 800, w = 302, h = 380;
    const s = backOut(k, 2), out = seg(t, CUE.origin - 0.22, CUE.origin);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2 - 120 * (1 - easeOut(k))); ctx.scale(s, s); ctx.globalAlpha = clamp(k * 2) * (1 - out);
    rr(ctx, -w / 2, -h / 2, w, h, 28); ctx.fillStyle = 'rgba(22,24,30,0.96)'; ctx.fill(); ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    const a = clamp(k * 2) * (1 - out), cy = y + h / 2 - 120 * (1 - easeOut(k));
    ctx.save(); ctx.translate(x + w / 2, cy); ctx.scale(s, s);
    bigNumber(ctx, n, 0, 40, { size: n.length > 3 ? 132 : 180, color: col, alpha: a });
    label(ctx, sub, 0, 130, { size: 38, weight: 700, align: 'center', alpha: a * 0.85 });
    ctx.restore();
  });
  headline(ctx, t, { t0: T0, t1: CUE.origin, lines: ['答案，藏在**三个数**里'], accent: GOLD, size: 86, stagger: 0.015 });
  flash(ctx, (t >= W0 ? Math.exp(-(t - W0) * 16) * 0.25 : 0) + seg(t, CUE.origin - 0.12, CUE.origin) * 0.5);
}

// the board's rows as they stand at the end of the board shot (no headline)
function boardRowsOnly(ctx) {
  const B = CUE.board;
  GZ_FINAL.forEach(([name, avg], i) => {
    const y = BY + i * RH + (i === 5 ? 26 : 0), me = i === 5;
    ctx.save(); ctx.translate(540, y + RH / 2); ctx.rotate((i - 2.5) * 0.04); ctx.translate(-540, -(y + RH / 2));
    rr(ctx, BX, y + 6, BW, RH - 12, 16); ctx.fillStyle = me ? 'rgba(120,18,22,0.95)' : 'rgba(30,32,38,0.9)'; ctx.fill();
    const a = me ? 1 : 0.45;
    label(ctx, String(i + 1), BX + 64, y + RH / 2 + 26, { size: 76, weight: 800, family: COND, align: 'center', alpha: a });
    label(ctx, name, BX + 140, y + RH / 2 + 17, { size: 48, weight: 900, alpha: a });
    label(ctx, avg.toFixed(2), BX + BW - 34, y + RH / 2 + 26, { size: 76, weight: 800, family: COND, align: 'right', alpha: a });
    ctx.restore();
  });
}
