// race.js — 146–164 s: a round-two single record and a separately scored final.
import { seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, rgba } from '../lib/core.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber } from '../lib/text.js';
import { timeCard, rr } from '../lib/ui.js';
import { camera, drawCube, shadow } from '../lib/draw3d.js';
import { S } from '../seqs.js';
import { CUE, KICK as KICKS } from '../timeline.js';
import { GZ_FINAL_WANG, GZ_FINAL_GENG } from '../data.js';

const ORANGE = '#ff8a1f', RED = '#ff3b3b', GOLD = '#ffc61a';
const KICK = KICKS.race; // the light cut opens on the two record holders (owners); full and mid start at round two

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: t >= C.r2 && t < C.final ? RED : ORANGE, k: 0.12, ly: 960 });
  if (t < C.r2) owners(ctx, t);
  else if (t < C.final) round2(ctx, t);
  else final(ctx, t);
  headline(ctx, t, { t0: C.race, t1: C.r2, kicker: KICK, lines: ['破了世界纪录，', '就一定能**夺冠**吗？'], accent: ORANGE });
  headline(ctx, t, { t0: C.r2, t1: C.final, kicker: KICK, lines: ['耿暄一的 **2.51 秒**，', '发生在广州赛**第二轮**'], accent: RED, size: 76 });
  headline(ctx, t, { t0: C.final, t1: C.finalAvg, kicker: KICK, lines: ['到了决赛，**重新比五次**', '按这一轮的平均成绩排名'], accent: GOLD, size: 74 });
  headline(ctx, t, { t0: C.finalAvg, t1: C.ending, kicker: KICK, lines: ['单次纪录，记下一次巅峰；', '决赛名次，看**这一轮**的表现'], accent: ORANGE, size: 72, stagger: 0.015 });
  footnote(ctx, t, { t0: C.race + 0.3, t1: C.ending, text: 'WCA 官方三阶速拧成绩 · 截至 2026-10-25', y: 505 });
  vignette(ctx, 0.6);
  flash(ctx, (t >= C.r2 ? Math.exp(-(t - C.r2) * 10) * 0.28 : 0) + seg(t, C.ending - 0.1, C.ending) * 0.3);
}

function owners(ctx, t) {
  const C = CUE;
  const cards = [['耿暄一', '2.51', '单次世界纪录', 'WCA 三阶速拧', RED, -1], ['王艺衡', '3.51', '平均世界纪录', 'WCA 三阶速拧', GOLD, 1]];
  for (const [name, big, what, other, col, side] of cards) {
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
    ctx.fillStyle = `rgba(255,255,255,${0.15 * a})`; ctx.fillRect(x - 170, y + 165, 340, 2);
    label(ctx, other, x, y + 230, { size: 32, weight: 500, align: 'center', alpha: a * 0.7 });
  }
}

function round2(ctx, t) {
  const C = CUE;
  const a = easeOut(seg(t, C.r2 + 0.1, C.r2 + 0.45)) * (1 - seg(t, C.final - 0.3, C.final));
  label(ctx, '广州 · 第二轮', 540, 670, { size: 42, weight: 900, align: 'center', alpha: a * 0.8 });
  const pulse = 1 + 0.045 * Math.exp(-(t - C.r2) * 3.5);
  bigNumber(ctx, '2.51', 540, 990, { size: 360 * pulse, color: '#ffffff', alpha: a, glow: 36, glowColor: RED });
  label(ctx, '耿暄一 · 单次世界纪录', 540, 1080, { size: 44, weight: 900, color: RED, align: 'center', alpha: a });
  const cam = camera({ yaw: 0.35 + (t - C.r2) * 0.12, pitch: 0.42, dist: 38, cy: 1320 });
  shadow(ctx, cam, [0, 0, 0], 0.72, 0.6 * a);
  drawCube(ctx, cam, { state: S.open.end, scale: 0.72, rim: 0.5, alpha: a });
  label(ctx, '单次纪录在这一轮成立', 540, 1550, { size: 38, weight: 700, align: 'center', alpha: a * 0.85 });
}

function final(ctx, t) {
  const C = CUE;
  const rows = [['王艺衡', GZ_FINAL_WANG, '4.20', '冠军', GOLD, 820], ['耿暄一', GZ_FINAL_GENG, '4.81', '第 6', RED, 1200]];
  const head = easeOut(seg(t, C.final + 0.1, C.final + 0.4)) * (1 - seg(t, C.ending - 0.3, C.ending));
  label(ctx, '广州 · 三阶决赛', 540, 640, { size: 36, weight: 700, align: 'center', alpha: head * 0.85 });
  rows.forEach(([name, vals, avg, rank, col, y], ri) => {
    const best = vals.indexOf(Math.min(...vals)), worst = vals.indexOf(Math.max(...vals));
    const tr = seg(t, C.finalTrim, C.finalTrim + 0.6), merge = easeInOut(seg(t, C.finalAvg - 0.6, C.finalAvg));
    const out = seg(t, C.ending - 0.3, C.ending);
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

