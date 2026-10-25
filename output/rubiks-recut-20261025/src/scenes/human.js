// human.js — steps vs seconds, the official average of five, then timed inspection.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, rgba } from '../lib/core.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { timeCard, rr } from '../lib/ui.js';
import { CUE } from '../timeline.js';
import { HEFEI_WANG } from '../data.js';

const RED = '#ff3b3b', VIO = '#9b7bff', GOLD = '#ffc61a', GREEN = '#2ee58a';
const KICK = '04 · 2.51';

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: RED, k: lerp(0.06, 0.16, seg(t, C.human, C.human + 1)), ly: 960 });
  if (t < C.ao5) flip(ctx, t);
  else if (t < C.inspect) ao5(ctx, t);
  else inspect(ctx, t);
  headline(ctx, t, { t0: C.human + 0.3, t1: C.ao5, kicker: KICK, lines: ['数学研究**最少几步**，', '赛场记录**还原时间**'], accent: RED });
  headline(ctx, t, { t0: C.ao5, t1: C.inspect, kicker: KICK, lines: ['5 次，去掉最快和最慢', '取其余 3 次的**平均**'], accent: RED, stagger: 0.016 });
  headline(ctx, t, { t0: C.inspect, t1: C.methods, kicker: KICK, lines: ['开拧前，', '先**观察与规划**'], accent: RED });
  footnote(ctx, t, { t0: C.human + 0.3, t1: C.inspect, text: 'WCA 官方三阶纪录 · 截至 2026-10-25', y: 505 });
  vignette(ctx, 0.6);
  flash(ctx, seg(t, C.methods - 0.1, C.methods) * 0.4);
}

// 20 → 2.51, split-flap
function flip(ctx, t) {
  const C = CUE;
  const k = seg(t, C.human + 0.35, C.human + 0.85);
  const cy = 1050;
  ctx.save();
  if (k < 0.5) {
    const s = Math.cos(k * Math.PI);
    ctx.translate(540, cy - 230); ctx.scale(1, s); ctx.translate(-540, -(cy - 230));
    bigNumber(ctx, '20', 540, cy, { size: 600, color: '#ffffff', glow: 30, glowColor: VIO });
  } else {
    const s = Math.sin((k - 0.5) * Math.PI);
    ctx.translate(540, cy - 200); ctx.scale(1, s); ctx.translate(-540, -(cy - 200));
    bigNumber(ctx, '2.51', 540, cy, { size: 480, color: '#ffffff', glow: 30 + 40 * Math.exp(-(t - C.human - 0.85) * 4), glowColor: RED });
  }
  ctx.restore();
  // flap seam
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(160, cy - 205, 760, 6);
  const a = easeOut(seg(t, C.human + 0.9, C.human + 1.3));
  label(ctx, '秒', 945, cy - 20, { size: 70, weight: 900, color: RED, alpha: a });
  label(ctx, '单次世界纪录 · 耿暄一', 540, cy + 130, { size: 46, weight: 900, align: 'center', alpha: a });
  label(ctx, '单次：一把的成绩', 540, cy + 200, { size: 34, weight: 500, align: 'center', alpha: a * 0.65 });
}

// average of five, Hefei final (Wang Yiheng)
function ao5(ctx, t) {
  const C = CUE;
  const vals = HEFEI_WANG, best = vals.indexOf(Math.min(...vals)), worst = vals.indexOf(Math.max(...vals));
  const xs = [190, 365, 540, 715, 890], y = 1000;
  const keep = vals.map((_, i) => i).filter((i) => i !== best && i !== worst);
  const head = easeOut(seg(t, C.ao5 + 0.1, C.ao5 + 0.4));
  label(ctx, '王艺衡 · 2026 年 6 月 · 合肥 · 决赛的五把', 540, 790, { size: 36, weight: 700, align: 'center', alpha: head * 0.85 * (1 - seg(t, C.inspect - 0.3, C.inspect)) });
  const merge = easeInOut(seg(t, C.merge, C.merge + 0.6));
  vals.forEach((v, i) => {
    const kin = backOut(seg(t, C.ao5 + 0.2 + i * 0.12, C.ao5 + 0.5 + i * 0.12), 1.8);
    if (kin <= 0) return;
    const isB = i === best, isW = i === worst;
    const tr = seg(t, C.trim + 0.5, C.trim + 1.0);
    let x = xs[i], yy = y + 80 * (1 - kin), a = clamp(kin * 2);
    if (isB || isW) { yy += (isB ? 1 : -1) * 260 * easeIn(tr); a *= 1 - tr; }
    else { const j = keep.indexOf(i); x = lerp(x, 540 + (j - 1) * 4, merge); a *= 1 - seg(t, C.merge + 0.45, C.merge + 0.6); }
    const tagK = easeOut(seg(t, C.trim, C.trim + 0.25));
    timeCard(ctx, x, yy, v, { a, w: 150, h: 196, hl: 0, strike: isB || isW ? tagK : 0, tag: isB ? '最快 · 去掉' : isW ? '最慢 · 去掉' : null, tagColor: isB ? GREEN : RED, scale: 1 });
    if ((isB || isW) && tagK > 0 && tr < 1) label(ctx, isB ? '最快' : '最慢', x, yy - 140, { size: 32, weight: 900, color: isB ? GREEN : RED, align: 'center', alpha: tagK * (1 - tr) });
  });
  const ak = seg(t, C.merge + 0.45, C.merge + 0.8);
  if (ak > 0) {
    const sc = lerp(1.4, 1, expoOut(ak));
    ctx.save(); ctx.translate(540, 1080); ctx.scale(sc, sc);
    bigNumber(ctx, '3.51', 0, 0, { size: 300, color: GOLD, glow: 40 * Math.exp(-(t - C.merge - 0.45) * 3), alpha: clamp(ak * 3) * (1 - seg(t, C.inspect - 0.3, C.inspect)) });
    ctx.restore();
    const a2 = easeOut(seg(t, C.merge + 0.8, C.merge + 1.1)) * (1 - seg(t, C.inspect - 0.3, C.inspect));
    label(ctx, '平均世界纪录 · 王艺衡', 540, 1190, { size: 46, weight: 900, align: 'center', alpha: a2 });
    label(ctx, '(3.68 + 3.41 + 3.45) ÷ 3 ≈ 3.51', 540, 1260, { size: 36, weight: 500, family: MONO, align: 'center', alpha: a2 * 0.7 });
  }
}

// 15-second inspection, time compressed
function inspect(ctx, t) {
  const C = CUE;
  const k = seg(t, C.inspect + 0.2, C.methods - 0.25);
  const a = easeOut(seg(t, C.inspect, C.inspect + 0.3)) * (1 - seg(t, C.methods - 0.2, C.methods));
  const cx = 540, cy = 1000, r = 230;
  ctx.save(); ctx.globalAlpha = a;
  ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = RED; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)); ctx.stroke();
  ctx.restore();
  bigNumber(ctx, String(Math.max(1, Math.ceil(15 * (1 - k)))), cx, cy + 70, { size: 220, alpha: a });
  label(ctx, '15 秒前开始还原', cx, cy + r + 90, { size: 42, weight: 900, align: 'center', alpha: a });
  label(ctx, '超时有罚则 · 画面加速', cx, cy + r + 146, { size: 30, weight: 500, align: 'center', alpha: a * 0.7 });
}
