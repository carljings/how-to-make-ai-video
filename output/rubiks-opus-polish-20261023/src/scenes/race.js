// race.js — act 6 (128–149 s): back to Guangzhou. The record solve is the fastest of five, and the average drops it.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, rgba } from '../lib/core.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { timeCard, rr, chip } from '../lib/ui.js';
import { CUE } from '../timeline.js';
import { GZ_R2_GENG, GZ_FINAL_WANG, GZ_FINAL_GENG } from '../data.js';

const ORANGE = '#ff8a1f', RED = '#ff3b3b', GOLD = '#ffc61a', GREEN = '#2ee58a';
const KICK = '06 · 回到那场比赛';

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: t >= C.rule && t < C.rule + 0.6 ? RED : ORANGE, k: 0.12, ly: 960 });
  if (t < C.r2) owners(ctx, t);
  else if (t < C.final) round2(ctx, t);
  else if (t < C.recent) final(ctx, t);
  else recent(ctx, t);
  headline(ctx, t, { t0: C.race, t1: C.r2, kicker: KICK, lines: ['两项世界纪录，', '分属**两个人**'], accent: ORANGE });
  headline(ctx, t, { t0: C.r2, t1: C.rule, kicker: KICK, lines: ['回到广州：', '耿暄一**复赛**的五把'], accent: ORANGE });
  headline(ctx, t, { t0: C.rule, t1: C.final, kicker: KICK, lines: ['**2.51** 是最快的一把——', '按规则，**它要被去掉**'], accent: RED });
  headline(ctx, t, { t0: C.final, t1: C.recent, kicker: KICK, lines: ['决赛，重新再来五把：', '排名看的还是**五把平均**'], accent: GOLD });
  headline(ctx, t, { t0: C.recent, t1: C.ending, kicker: KICK, lines: ['破纪录的不一定夺冠，', '夺冠的不一定破纪录'], accent: ORANGE });
  footnote(ctx, t, { t0: C.race + 0.3, t1: C.ending, text: '成绩来自 WCA 官方结果，截至 2026-10-23', y: 505 });
  vignette(ctx, 0.6);
  flash(ctx, (t >= C.rule ? Math.exp(-(t - C.rule) * 10) * 0.4 : 0) + seg(t, C.ending - 0.1, C.ending) * 0.3, t < C.rule + 1 ? '#ff8080' : '#ffffff');
}

function owners(ctx, t) {
  const C = CUE;
  const cards = [['耿暄一', '2.51', '单次世界纪录', RED, -1], ['王艺衡', '3.51', '平均世界纪录', GOLD, 1]];
  for (const [name, big, what, col, side] of cards) {
    const k = expoOut(seg(t, C.race + 0.15 + (side > 0 ? 0.2 : 0), C.race + 0.75 + (side > 0 ? 0.2 : 0)));
    const out = easeIn(seg(t, C.r2 - 0.3, C.r2));
    const x = 540 + side * 245 + side * 500 * (1 - k), y = 1000;
    const w = 450, h = 600;
    ctx.save(); ctx.globalAlpha = clamp(k * 2) * (1 - out); ctx.translate(x, y);
    rr(ctx, -w / 2, -h / 2, w, h, 30); ctx.fillStyle = 'rgba(24,26,32,0.96)'; ctx.fill(); ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = 4; ctx.stroke();
    ctx.restore();
    const a = clamp(k * 2) * (1 - out);
    label(ctx, name, x, y - 190, { size: 58, weight: 900, align: 'center', alpha: a });
    bigNumber(ctx, big, x, y + 50, { size: 210, color: col, alpha: a });
    label(ctx, what, x, y + 120, { size: 38, weight: 900, align: 'center', alpha: a, color: col });
  }
}

const XS = [190, 365, 540, 715, 890];
function round2(ctx, t) {
  const C = CUE;
  const vals = GZ_R2_GENG; // 2.51 is index 0
  const best = 0, worst = vals.indexOf(Math.max(...vals));
  const keep = [1, 2, 3];
  const y = 1000;
  const head = easeOut(seg(t, C.r2 + 0.1, C.r2 + 0.4)) * (1 - seg(t, C.final - 0.3, C.final));
  label(ctx, '广州 · 2026 年 10 月 · 三阶复赛 · 耿暄一', 540, 790, { size: 36, weight: 700, align: 'center', alpha: head * 0.85 });
  const glow = seg(t, C.r2 + 1.0, C.r2 + 1.3);
  const tr = seg(t, C.rule + 0.35, C.rule + 0.95);
  const merge = easeInOut(seg(t, C.r2avg, C.r2avg + 0.6));
  vals.forEach((v, i) => {
    const kin = backOut(seg(t, C.r2 + 0.2 + i * 0.12, C.r2 + 0.5 + i * 0.12), 1.8);
    if (kin <= 0) return;
    let x = XS[i], yy = y + 80 * (1 - kin), a = clamp(kin * 2), sc = 1;
    const isB = i === best, isW = i === worst;
    if (isB) { sc = 1 + 0.12 * easeOut(glow) * (1 - tr); }
    if (isB || isW) { yy += (isB ? 1 : -1) * 300 * easeIn(tr); a *= 1 - tr; }
    else { const j = keep.indexOf(i); x = lerp(x, 540 + (j - 1) * 4, merge); a *= 1 - seg(t, C.r2avg + 0.45, C.r2avg + 0.6); }
    const strike = (isB || isW) ? easeOut(seg(t, C.rule, C.rule + 0.25)) : 0;
    timeCard(ctx, x, yy, v, { a, w: 150, h: 196, hl: isB ? glow * (1 - strike) : 0, strike, scale: sc, accent: GOLD, tag: (isB || isW) && strike > 0 ? (isB ? '最快 · 去掉' : '最慢 · 去掉') : null, tagColor: RED });
    if (isB && glow > 0 && t < C.rule) label(ctx, '世界纪录！', x, yy - 150, { size: 38, weight: 900, color: GOLD, align: 'center', alpha: easeOut(glow) });
  });
  // the rule stamp
  if (t >= C.rule && t < C.r2avg + 0.3) {
    const k = backOut(seg(t, C.rule, C.rule + 0.25), 2.2), out = seg(t, C.r2avg, C.r2avg + 0.3);
    ctx.save(); ctx.translate(540, 1300); ctx.rotate(-0.04); ctx.scale(k, k); ctx.globalAlpha = clamp(k) * (1 - out);
    ctx.strokeStyle = RED; ctx.lineWidth = 6; rr(ctx, -330, -50, 660, 100, 16); ctx.stroke();
    label(ctx, '五把平均：去掉最快和最慢', 0, 16, { size: 46, weight: 900, color: RED, align: 'center' });
    ctx.restore();
  }
  const ak = seg(t, C.r2avg + 0.45, C.r2avg + 0.8);
  if (ak > 0) {
    const sc = lerp(1.4, 1, expoOut(ak)), out = seg(t, C.final - 0.3, C.final);
    ctx.save(); ctx.translate(540, 1080); ctx.scale(sc, sc);
    bigNumber(ctx, '3.87', 0, 0, { size: 300, color: '#ffffff', alpha: clamp(ak * 3) * (1 - out) });
    ctx.restore();
    const a2 = easeOut(seg(t, C.r2avg + 0.8, C.r2avg + 1.1)) * (1 - out);
    label(ctx, '这一轮的平均：纪录那一把不算在内', 540, 1190, { size: 44, weight: 900, align: 'center', alpha: a2 });
    label(ctx, '(3.99 + 3.21 + 4.42) ÷ 3 ≈ 3.87', 540, 1260, { size: 36, weight: 500, family: MONO, align: 'center', alpha: a2 * 0.7 });
  }
}

function final(ctx, t) {
  const C = CUE;
  const rows = [['王艺衡', GZ_FINAL_WANG, '4.20', '冠军', GOLD, 820], ['耿暄一', GZ_FINAL_GENG, '4.81', '第 6', RED, 1200]];
  const head = easeOut(seg(t, C.final + 0.1, C.final + 0.4)) * (1 - seg(t, C.recent - 0.3, C.recent));
  label(ctx, '广州 · 三阶决赛', 540, 640, { size: 36, weight: 700, align: 'center', alpha: head * 0.85 });
  rows.forEach(([name, vals, avg, rank, col, y], ri) => {
    const best = vals.indexOf(Math.min(...vals)), worst = vals.indexOf(Math.max(...vals));
    const tr = seg(t, C.finalTrim, C.finalTrim + 0.6), merge = easeInOut(seg(t, C.finalAvg - 0.6, C.finalAvg));
    const out = seg(t, C.recent - 0.3, C.recent);
    label(ctx, name, 72, y - 120, { size: 44, weight: 900, alpha: head });
    const xs = [190, 365, 540, 715, 890];
    vals.forEach((v, i) => {
      const kin = backOut(seg(t, C.final + 0.2 + ri * 0.2 + i * 0.08, C.final + 0.5 + ri * 0.2 + i * 0.08), 1.8);
      if (kin <= 0) return;
      const isB = i === best, isW = i === worst;
      let x = xs[i], yy = y + 60 * (1 - kin), a = clamp(kin * 2) * (1 - out);
      if (isB || isW) { yy += (isB ? 1 : -1) * 160 * easeIn(tr); a *= 1 - tr; }
      else { x = lerp(x, 540, merge); a *= 1 - seg(t, C.finalAvg - 0.15, C.finalAvg); }
      timeCard(ctx, x, yy, v, { a, w: 140, h: 172, strike: (isB || isW) ? easeOut(seg(t, C.finalTrim - 0.3, C.finalTrim)) : 0, tagColor: RED });
    });
    const ak = seg(t, C.finalAvg - 0.1, C.finalAvg + 0.25);
    if (ak > 0) {
      bigNumber(ctx, avg, 470, y + 80, { size: 230, color: col, alpha: clamp(ak * 3) * (1 - out), align: 'right' });
      label(ctx, rank, 510, y + 40, { size: 96, weight: 900, color: col, alpha: clamp(ak * 3) * (1 - out) });
    }
  });
}

function recent(ctx, t) {
  const C = CUE;
  const items = [
    ['6/17', '合肥', '王艺衡 平均 3.51', '世界纪录', GOLD],
    ['10/1–3', '北京', '王 4.26 冠军 · 耿 4.33 亚军', '决赛', ORANGE],
    ['10/5–6', '广州', '复赛：耿 单次 2.51 世界纪录', '决赛：王 4.20 冠军 · 耿 4.81 第 6', RED],
    ['10/18', '桂林', '决赛：耿 5.32 亚军', '冠军 沈懿 4.66', ORANGE],
  ];
  const out = seg(t, C.ending - 0.3, C.ending);
  ctx.save(); ctx.globalAlpha = 1 - out;
  const x0 = 140, y0 = 640, step = 220;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0 - 30); ctx.lineTo(x0, y0 + step * 3 + 60); ctx.stroke();
  items.forEach(([date, city, l1, l2, col], i) => {
    const k = expoOut(seg(t, C.recent + 0.1 + i * 0.55, C.recent + 0.5 + i * 0.55));
    if (k <= 0) return;
    const y = y0 + i * step, dx = 60 * (1 - k);
    ctx.globalAlpha = clamp(k * 2) * (1 - out);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x0, y, i === 2 ? 16 : 11, 0, Math.PI * 2); ctx.fill();
    label(ctx, date, x0 + 40 + dx, y - 34, { size: 30, weight: 800, family: COND, alpha: 0.7 });
    label(ctx, city, x0 + 40 + dx, y + 26, { size: 52, weight: 900, color: col });
    label(ctx, l1, x0 + 180 + dx, y + 2, { size: 36, weight: 700 });
    if (l2) label(ctx, l2, x0 + 180 + dx, y + 50, { size: 32, weight: 500, alpha: 0.7 });
  });
  ctx.restore();
}
