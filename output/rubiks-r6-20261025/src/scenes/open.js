// open.js — the official single record, then the number the film is really about: 2.51 flips to 20.
// r5: the 2.51 card holds 1.5 s (r4: 2.5 s) and turns into the promise that matches the title, instead of a
// slow re-scramble and a history lesson. The cube glides into the next act's opening position.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn } from '../lib/core.js';
import { camera, drawCube, shadow, blurred } from '../lib/draw3d.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber } from '../lib/text.js';
import { rr } from '../lib/ui.js';
import { S } from '../seqs.js';
import { heroBack } from '../hero.js';
import { CUE, ACT, PLAN } from '../timeline.js';

const RED = '#ff3b3b', GOLD = '#ffc61a', VIO = '#9b7bff';
const drift = (t) => [Math.sin(t * 1.3) * 0.014 + Math.sin(t * 3.1 + 1) * 0.006, Math.sin(t * 1.7 + 2) * 0.012];
// the act after the opening, and the camera it starts from (count.js / origin.js at their first frame)
const next = () => (PLAN.origin ? CUE.origin : CUE.count);
const NEXT_CAM = () => (PLAN.origin ? { yaw: 0.62, pitch: 0.42, dist: 25, cy: 980 } : { yaw: 0.55, pitch: 0.42, dist: 24, cy: 960 });
// the record's number at the end of its slam, and the pivot of the split-flap (half the digit height)
const N0 = { y: 860, size: 430 }, PIVOT = N0.y - 0.4 * N0.size, N20 = { size: 560, y: PIVOT + 0.4 * 560 };

export function draw(ctx, t) {
  const C = CUE, E = C.solveEnd, NX = next();
  const hand = easeInOut(seg(t, NX - 0.6, NX)); // hand-off into the next act
  backdrop(ctx, { color: t < E ? ACT.open : RED, k: t < E ? 0.16 : 0.2, ly: 900 });
  // after the flip the act light turns violet (the colour of 20), then towards the next act's light
  const vio = easeInOut(seg(t, C.flip + 0.3, C.flip + 0.9));
  if (vio > 0) { ctx.save(); ctx.globalAlpha = vio * (1 - hand); backdrop(ctx, { color: VIO, k: 0.16, ly: 900 }); ctx.restore(); }
  if (hand > 0) {
    ctx.save(); ctx.globalAlpha = hand;
    if (PLAN.origin) backdrop(ctx, { color: ACT.origin, k: 0.16, base: '#030c18', ly: 900 });
    else backdrop(ctx, { color: GOLD, k: 0.11, ly: 900 });
    ctx.restore();
  }
  heroBack(ctx, t); // r6: rays behind 2.51, then behind 20
  if (t < C.flip) solveAndSlam(ctx, t);
  else flipTo20(ctx, t, hand);
  vignette(ctx, 0.6);
  // stable factual labels stay outside the cube and the timer
  footnote(ctx, t, { t0: -1, t1: next(), text: 'WCA 官方三阶单次纪录 · 截至 2026-10-25', y: 492, size: 32, alpha: 0.76 }); // stays under “人类纪录 2.51 秒”
  footnote(ctx, t, { t0: -1, t1: C.flip, text: '演示打乱与程序解法，非纪录原解', y: 1680, size: 32, alpha: 0.72 });
}

// the record cube's camera once the slam has settled, drifting
function settledCam(t) {
  const [dy, dp] = drift(t);
  return { yaw: 0.62 + 0.35 + dy, pitch: 0.5 + dp, dist: 41, cy: 1360 };
}

function solveAndSlam(ctx, t) {
  const C = CUE, E = C.solveEnd;
  const k = seg(t, 0, E), slam = seg(t, E, E + 0.55);
  const [dy, dp] = drift(t);
  const whip = 1 - easeOut(seg(t, 0, 0.75)); // r6: the cube rushes in, turning, during the first 0.75 s
  const cam = camera({ yaw: lerp(-0.3, 0.62, easeInOut(k)) + 0.35 * easeOut(slam) + dy - 1.25 * whip, pitch: lerp(0.3, 0.5, k) + dp + 0.18 * whip, dist: lerp(22.5, 25, easeInOut(k)) + 16 * easeOut(slam) + 15 * whip, cy: lerp(980, 1360, easeOut(slam)) });
  const cubeA = 1 - 0.68 * easeOut(slam);
  shadow(ctx, cam, [0, 0, 0], 1, 0.8 * cubeA);
  // Three identical post-solve samples keep the group opacity applied by blurred().
  blurred(ctx, t, (st, c) => drawCube(c, cam, { ...S.open.at(st), alpha: 1 }), { samples: t < E + 0.05 ? 5 : 3, alpha: cubeA });

  const val = Math.min(t + 0.01, 2.51);
  const pulse = t >= E ? Math.exp(-(t - E) * 5) : 0;
  const out = 1 - easeIn(seg(t, C.flip - 0.3, C.flip)); // the stamp and the name leave before the flip
  const ty = lerp(1630, N0.y, expoOut(slam)), ts = lerp(170, N0.size, expoOut(slam)) * (1 + 0.07 * pulse);
  bigNumber(ctx, val.toFixed(2), 540, ty, { size: ts, color: t >= E ? '#ffffff' : 'rgba(244,242,238,0.94)', glow: 50 * pulse, glowColor: RED, spacing: 2, split: 22 * Math.exp(-Math.max(0, t - E) * 7) * (t >= E ? 1 : 0) });
  label(ctx, '秒', 760, 1628, { size: 32, weight: 700, alpha: 0.65 * (1 - slam) });
  if (t >= E + 0.12) {
    const s = backOut(seg(t, E + 0.12, E + 0.42), 2.4);
    ctx.save(); ctx.translate(540, 990); ctx.rotate(-0.055); ctx.scale(1.7 - 0.7 * s, 1.7 - 0.7 * s); ctx.globalAlpha = clamp(s * 1.5) * out;
    ctx.strokeStyle = RED; ctx.lineWidth = 7; rr(ctx, -255, -60, 510, 120, 18); ctx.stroke();
    label(ctx, '单次世界纪录', 0, 22, { size: 64, weight: 900, color: RED, align: 'center', alpha: out }); // fades with its box (label() sets its own alpha)
    ctx.restore();
    label(ctx, '耿暄一 · 2026 年 10 月 · 广州', 540, 1120, { size: 38, weight: 700, align: 'center', alpha: easeOut(seg(t, E + 0.15, E + 0.45)) * out, color: 'rgba(244,242,238,0.9)' }); // with the stamp: the card holds only 1.5 s
  }
  flash(ctx, t >= E ? Math.exp(-(t - E) * 12) * 0.6 : 0);
  headline(ctx, t, { t0: -0.7, t1: E, kicker: 'WCA · 官方三阶速拧', lines: ['三阶魔方，', '单次世界纪录有**多快**？'], accent: GOLD, size: 80 });
  headline(ctx, t, { t0: E, t1: C.flip, lines: ['**2.51 秒**', '纪录保持者：耿暄一'], accent: RED, size: 76, stagger: 0.008 }); // all glyphs in by E + 0.44
}

// 2.51 → 20, split-flap; the cube waits below, then rises into the next act
function flipTo20(ctx, t, hand) {
  const C = CUE, F = C.flip, NX = next();
  const A = settledCam(t), B = NEXT_CAM();
  const cam = camera({ yaw: lerp(A.yaw, B.yaw, hand), pitch: lerp(A.pitch, B.pitch, hand), dist: lerp(A.dist, B.dist, hand), cy: lerp(A.cy, B.cy, hand) });
  const cubeA = lerp(0.32, 1, hand);
  shadow(ctx, cam, [0, 0, 0], 1, 0.8 * cubeA);
  // group opacity through blurred(), as in the slam (two identical samples of a still cube)
  blurred(ctx, t, (st, c) => drawCube(c, cam, { state: S.open.end, rim: lerp(0.35, 0.45, hand) }), { samples: 2, alpha: cubeA });

  const k = seg(t, F, F + 0.5);
  const leave = easeOut(seg(t, NX - 0.62, NX - 0.3)); // the number lifts out before the rising cube reaches it
  const keep = 1 - leave; // passed to every helper: label() and bigNumber() set globalAlpha themselves
  ctx.save(); ctx.translate(0, -150 * leave);
  ctx.save();
  if (k < 0.5) {
    const s = Math.cos(k * Math.PI);
    ctx.translate(540, PIVOT); ctx.scale(1, s); ctx.translate(-540, -PIVOT);
    bigNumber(ctx, '2.51', 540, N0.y, { size: N0.size, color: '#ffffff', spacing: 2, alpha: keep });
  } else {
    const s = Math.sin((k - 0.5) * Math.PI);
    ctx.translate(540, PIVOT); ctx.scale(1, s); ctx.translate(-540, -PIVOT);
    bigNumber(ctx, '20', 540, N20.y, { size: N20.size, color: '#ffffff', glow: 30 + 40 * Math.exp(-Math.max(0, t - F - 0.5) * 4), glowColor: VIO, alpha: keep, split: 16 * Math.exp(-Math.max(0, t - F - 0.5) * 7) });
  }
  ctx.restore();
  // the flap seam shows while the leaves turn, then clears
  const seam = 0.55 * (1 - easeOut(seg(t, F + 0.5, F + 0.9)));
  if (seam > 0) { ctx.fillStyle = `rgba(0,0,0,${seam * keep})`; ctx.fillRect(160, PIVOT - 3, 760, 6); }
  const a = easeOut(seg(t, F + 0.55, F + 0.9));
  label(ctx, '步', 855, N20.y - 24, { size: 84, weight: 900, color: VIO, alpha: a * keep });
  label(ctx, '上帝之数', 540, N20.y + 104, { size: 50, weight: 900, color: '#d9ccff', align: 'center', alpha: a * keep, spacing: 8 });
  ctx.restore();
  flash(ctx, Math.exp(-Math.max(0, t - F - 0.5) * 12) * 0.32 * (t >= F + 0.5 ? 1 : 0), '#e9e1ff');
  headline(ctx, t, { t0: F + 0.05, t1: NX, lines: ['人类纪录 2.51 秒；', '数学说：**20 步**就够'], accent: VIO, size: 80 });
}
