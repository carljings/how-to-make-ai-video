// ending.js — act 7 (149–158 s): the same cube, solved, in a spotlight. 20 is proven; 2.51 is still open.
import { W, H, seg, clamp, lerp, easeOut, expoOut, easeInOut, easeIn } from '../lib/core.js';
import { camera, drawCube, shadow } from '../lib/draw3d.js';
import { backdrop, vignette } from '../lib/stage.js';
import { headline, label, bigNumber, MONO, INK } from '../lib/text.js';
import { S } from '../seqs.js';
import { CUE } from '../timeline.js';

const VIO = '#9b7bff', RED = '#ff3b3b', GREEN = '#2ee58a';

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: '#d9d4ff', k: 0.1, ly: 760, r: 900, base: '#040406' });
  // spotlight cone
  const g = ctx.createRadialGradient(540, 980, 40, 540, 980, 620);
  g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const k = easeOut(seg(t, C.ending, C.ending + 0.8));
  const cam = camera({ yaw: 0.2 + (t - C.ending) * 0.11, pitch: 0.42, dist: lerp(30, 27, easeInOut(seg(t, C.ending, C.end))), cy: 960 });
  shadow(ctx, cam, [0, 0, 0], 1, 0.7 * k);
  drawCube(ctx, cam, { state: S.open.end, rim: 0.5, alpha: k });
  // the two numbers
  const nk = easeOut(seg(t, C.ending + 0.8, C.ending + 1.3)), nout = easeIn(seg(t, C.reset - 0.4, C.reset));
  bigNumber(ctx, '20', 290, 1430, { size: 190, color: VIO, alpha: nk * (1 - nout) });
  label(ctx, '已证明', 290, 1490, { size: 36, weight: 900, align: 'center', alpha: nk * (1 - nout) });
  bigNumber(ctx, '2.51', 790, 1430, { size: 190, color: RED, alpha: nk * (1 - nout) });
  label(ctx, '截至 2026-10-23', 790, 1490, { size: 34, weight: 700, align: 'center', alpha: nk * (1 - nout) * 0.85 });
  // the timer resets, ready light blinking
  const rk = easeOut(seg(t, C.reset, C.reset + 0.5));
  if (rk > 0) {
    bigNumber(ctx, '0.00', 540, 1450, { size: 200, color: INK, alpha: rk });
    const blink = Math.sin((t - C.reset) * Math.PI * 2) > 0 ? 1 : 0.25;
    ctx.save(); ctx.globalAlpha = rk * blink; ctx.fillStyle = GREEN; ctx.shadowColor = GREEN; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(540, 1520, 13, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    label(ctx, 'carljings.top/cube · 三种方法 3D 分步演示', 540, 1590, { size: 32, weight: 600, align: 'center', alpha: easeOut(seg(t, C.reset + 0.6, C.reset + 1.0)) * 0.7 });
  }
  headline(ctx, t, { t0: C.ending + 0.3, t1: C.end + 1, kicker: '终', lines: ['上帝之数，早已钉死在 **20**；', '人类的数字，**下一把**是多少？'], accent: VIO, size: 72 });
  vignette(ctx, 0.7);
  // fade to black at the very end
  const f = easeInOut(seg(t, C.fade, C.end - 0.15));
  if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
}
