// open.js — the official single record flows into the same cube's internal structure.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn } from '../lib/core.js';
import { camera, drawCube, shadow, blurred } from '../lib/draw3d.js';
import { backdrop, vignette, grid, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber } from '../lib/text.js';
import { rr } from '../lib/ui.js';
import { S } from '../seqs.js';
import { CUE, ACT } from '../timeline.js';

const RED = '#ff3b3b', GOLD = '#ffc61a', BLUE = '#5aa9ff';
const WIRE = { line: [150, 205, 255], fill: [6, 18, 36], width: 2.4 };
const drift = (t) => [Math.sin(t * 1.3) * 0.014 + Math.sin(t * 3.1 + 1) * 0.006, Math.sin(t * 1.7 + 2) * 0.012];

export function draw(ctx, t) {
  const C = CUE, wire = easeInOut(seg(t, C.tiles, C.origin));
  backdrop(ctx, { color: t < C.solveEnd ? ACT.open : RED, k: t < C.solveEnd ? 0.16 : 0.2, ly: 900 });
  if (t < C.board) solveAndSlam(ctx, t);
  else {
    // The existing hero changes material rather than being replaced by a new scene.
    ctx.save(); ctx.globalAlpha = easeInOut(seg(t, 8.25, C.tiles));
    backdrop(ctx, { color: ACT.origin, k: 0.16, base: '#030c18', ly: 900 });
    ctx.restore();
    grid(ctx, { step: 54, color: BLUE, a: 0.07 * wire, ox: -t * 6, oy: -t * 4 });
    grid(ctx, { step: 270, color: BLUE, a: 0.1 * wire, ox: -t * 6, oy: -t * 4 });
    revealStructure(ctx, t, wire);
  }
  vignette(ctx, lerp(0.6, 0.62, wire));
  // Stable factual labels stay outside the cube and timer, including their motion envelopes.
  footnote(ctx, t, { t0: -1, t1: C.origin, text: 'WCA 官方三阶单次纪录 · 截至 2026-10-25', y: 492, size: 28, alpha: 0.76 });
  footnote(ctx, t, { t0: -1, t1: C.origin, text: '画面为演示用打乱与程序解法，非纪录原解', y: 1680, size: 28, alpha: 0.72 });
}

function solveAndSlam(ctx, t) {
  const E = CUE.solveEnd;
  const k = seg(t, 0, E), slam = seg(t, E, E + 0.55);
  const [dy, dp] = drift(t);
  const cam = camera({ yaw: lerp(-0.3, 0.62, easeInOut(k)) + 0.35 * easeOut(slam) + dy, pitch: lerp(0.3, 0.5, k) + dp, dist: lerp(22.5, 25, easeInOut(k)) + 16 * easeOut(slam), cy: lerp(980, 1360, easeOut(slam)) });
  const cubeA = 1 - 0.68 * easeOut(slam);
  shadow(ctx, cam, [0, 0, 0], 1, 0.8 * cubeA);
  // Three identical post-solve samples keep the group opacity applied by blurred().
  blurred(ctx, t, (st, c) => drawCube(c, cam, { ...S.open.at(st), alpha: 1 }), { samples: t < E + 0.05 ? 5 : 3, alpha: cubeA });

  const val = Math.min(t + 0.01, 2.51);
  const pulse = t >= E ? Math.exp(-(t - E) * 5) : 0;
  const out = 1 - easeIn(seg(t, CUE.board - 0.3, CUE.board));
  const ty = lerp(1630, 860, expoOut(slam)), ts = lerp(170, 430, expoOut(slam)) * (1 + 0.07 * pulse);
  bigNumber(ctx, val.toFixed(2), 540, ty, { size: ts, color: t >= E ? '#ffffff' : 'rgba(244,242,238,0.94)', glow: 50 * pulse, glowColor: RED, spacing: 2, alpha: out });
  label(ctx, '秒', 760, 1628, { size: 32, weight: 700, alpha: 0.65 * (1 - slam) });
  if (t >= E + 0.12) {
    const s = backOut(seg(t, E + 0.12, E + 0.42), 2.4);
    ctx.save(); ctx.translate(540, 990); ctx.rotate(-0.055); ctx.scale(1.7 - 0.7 * s, 1.7 - 0.7 * s); ctx.globalAlpha = clamp(s * 1.5) * out;
    ctx.strokeStyle = RED; ctx.lineWidth = 7; rr(ctx, -255, -60, 510, 120, 18); ctx.stroke();
    label(ctx, '单次世界纪录', 0, 22, { size: 64, weight: 900, color: RED, align: 'center' });
    ctx.restore();
    label(ctx, '耿暄一 · 2026 年 10 月 · 广州', 540, 1120, { size: 38, weight: 700, align: 'center', alpha: easeOut(seg(t, 3.0, 3.4)) * out, color: 'rgba(244,242,238,0.9)' });
  }
  flash(ctx, t >= E ? Math.exp(-(t - E) * 12) * 0.6 : 0);
  headline(ctx, t, { t0: -0.7, t1: E, kicker: 'WCA · 官方三阶速拧', lines: ['三阶魔方，', '单次世界纪录有**多快**？'], accent: GOLD, size: 80 });
  headline(ctx, t, { t0: E + 0.05, t1: CUE.board, lines: ['**2.51 秒**', '纪录保持者：耿暄一'], accent: RED, size: 76 });
}

function revealStructure(ctx, t, wire) {
  const C = CUE;
  const p = easeInOut(seg(t, C.board, C.tiles)), pull = easeInOut(seg(t, C.board, 6.2));
  const [dy0, dp0] = drift(C.board);
  const cam = camera({
    yaw: lerp(0.97 + dy0, 0.62, p) + 0.22 * Math.sin(Math.PI * p),
    pitch: lerp(0.5 + dp0, 0.42, p), dist: lerp(41, 25, pull), cy: lerp(1360, 980, pull),
  });
  const alpha = lerp(0.32, 1, easeOut(seg(t, C.board, C.board + 0.8)));
  shadow(ctx, cam, [0, 0, 0], 1, 0.8 * alpha * (1 - wire));
  if (wire <= 0) {
    blurred(ctx, t, (st, c) => drawCube(c, cam, { ...S.reveal.at(st), rim: 0.45 }), { samples: 3, alpha });
  } else {
    const st = S.reveal.at(t), y = lerp(520, 1450, wire);
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, H - y); ctx.clip();
    drawCube(ctx, cam, { ...st, rim: 0.45 }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y); ctx.clip();
    drawCube(ctx, cam, { ...st, style: 'wire', wire: WIRE }); ctx.restore();
    const line = ctx.createLinearGradient(0, y - 7, 0, y + 7);
    line.addColorStop(0, 'rgba(150,205,255,0)'); line.addColorStop(0.5, 'rgba(205,235,255,0.75)'); line.addColorStop(1, 'rgba(150,205,255,0)');
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * wire); ctx.fillStyle = line; ctx.fillRect(140, y - 7, 800, 14); ctx.restore();
  }
  headline(ctx, t, { t0: C.board, t1: C.origin, lines: ['可这个小方块，', '为什么会**这么难**？'], accent: BLUE, size: 82 });
}
