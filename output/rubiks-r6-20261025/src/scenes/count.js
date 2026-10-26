// count.js — act 2 (22–50 s): how many states? The pieces show each factor of 8!·3⁷·12!·2¹¹÷2 by doing it.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, smooth, hex, rgba, hash, commas } from '../lib/core.js';
import { camera, drawCube, shadow, axisAngle, vec, blurred } from '../lib/draw3d.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { odometer, rr, padlock, crossMark } from '../lib/ui.js';
import { S } from '../seqs.js';
import { heroBack } from '../hero.js';
import { CUE, ACT, KICK as KICKS } from '../timeline.js';
import { TOTAL } from '../data.js';

const GOLD = '#ffc61a', CYAN = '#2fe0ff', RED = '#ff3b3b';
const EXC = 2.25, EXE = 1.75; // explode factors for corners and edges
const KICK = KICKS.count;
const F = 40320n, V = [F, F * 2187n, F * 2187n * 479001600n, F * 2187n * 479001600n * 2048n, TOTAL];

// piece choreography: swaps (permutations) and twists/flips, precomputed
let CS = null, ES = null, CORNERS = null, EDGES = null;
export function init() {
  const st = S.countScramble.end;
  CORNERS = st.filter((c) => c.type === 'corner').map((c) => c.id);
  EDGES = st.filter((c) => c.type === 'edge').map((c) => c.id);
  CS = swaps([[0, 5], [2, 7], [1, 4], [3, 6], [0, 2], [5, 1]], CUE.f8 + 0.2, 0.42, 0.34);
  ES = swaps([[0, 7], [3, 10], [5, 1], [9, 2], [4, 11], [6, 8], [0, 3]], CUE.f12 + 0.2, 0.42, 0.32);
}
function swaps(pairs, t0, dur, step) {
  return { ev: pairs.map(([a, b], i) => ({ a, b, t0: t0 + i * step, t1: t0 + i * step + dur })) };
}
// which slot piece #i (index in its group) occupies at time t: {from, to, k}
function slotOf(sw, i, t) {
  let slot = i;
  for (const e of sw.ev) {
    if (t <= e.t0) break;
    if (slot === e.a || slot === e.b) {
      const other = slot === e.a ? e.b : e.a;
      if (t < e.t1) return { from: slot, to: other, k: easeInOut((t - e.t0) / (e.t1 - e.t0)) };
      slot = other;
    }
  }
  return { from: slot, to: slot, k: 0 };
}

export function draw(ctx, t) {
  backdrop(ctx, { color: GOLD, k: 0.11, ly: 900 });
  heroBack(ctx, t); // r6: rays behind the hero numbers
  const ex = easeInOut(seg(t, CUE.explode, CUE.explode + 1.0)) * (1 - expoOut(seg(t, CUE.total, CUE.total + 0.35)));
  const cubeOut = easeIn(seg(t, CUE.total + 0.5, CUE.total + 1.1));
  const yaw = 0.55 + (t - CUE.count) * 0.06;
  const cam = camera({ yaw, pitch: 0.42 + 0.1 * ex, dist: lerp(24, 44, ex) + 30 * cubeOut, cy: lerp(960, 840, ex) - 200 * cubeOut });
  const st = S.countScramble.at(t);
  if (cubeOut < 1) {
    shadow(ctx, cam, [0, -0.8 * ex, 0], 1, 0.7 * (1 - cubeOut));
    const groups = ex > 0 ? placement(t, ex) : null;
    if (t < CUE.explode) {
      // r5: the scramble now runs at ~12 turns a second under the opening promise; sample it like the record solve
      blurred(ctx, t, (tt, c) => drawCube(c, cam, { ...S.countScramble.at(tt), rim: 0.5 }), { samples: 3 });
    } else drawCube(ctx, cam, {
      ...st, alpha: 1 - cubeOut, rim: 0.5,
      place: groups ? (c) => groups.get(c.id) : null,
      look: ex > 0 ? (c) => lookOf(c, t, ex) : null,
    });
    if (ex > 0.5) overlays(ctx, cam, t, ex, groups);
  }
  if (t < CUE.explode + 0.3) slots(ctx, t, 1 - seg(t, CUE.explode, CUE.explode + 0.3));
  if (t >= CUE.f8 - 0.2 && t < CUE.total + 0.6) formula(ctx, t);
  if (t >= CUE.total) totalShot(ctx, t);

  // r5: the opening promise (it answers the title); the count act then shows where 4325 亿亿 comes from
  headline(ctx, t, { t0: CUE.count, t1: CUE.explode, kicker: KICK, lines: ['超 4325 亿亿种打乱，', '每一种都能 **20 步内**还原？'], accent: GOLD });
  headline(ctx, t, { t0: CUE.explode, t1: CUE.f8, kicker: KICK, lines: ['以中心块为参照，', '**8 个角块**、**12 个棱块**'], accent: GOLD, stagger: 0.016 });
  headline(ctx, t, { t0: CUE.f8, t1: CUE.f3, kicker: KICK, lines: ['8 个角互换位置：', '**8!** = 40,320 种'], accent: GOLD });
  headline(ctx, t, { t0: CUE.f3, t1: CUE.f12, kicker: KICK, lines: ['角块有 3 种朝向，', '最后一个由**前 7 个**决定'], accent: GOLD, stagger: 0.016 });
  headline(ctx, t, { t0: CUE.f12, t1: CUE.f2, kicker: KICK, lines: ['12 个棱互换位置：', '**12!** 种'], accent: CYAN });
  headline(ctx, t, { t0: CUE.f2, t1: CUE.par, kicker: KICK, lines: ['棱块有 2 种朝向，', '最后一个由**前 11 个**决定'], accent: CYAN, stagger: 0.016 });
  headline(ctx, t, { t0: CUE.par, t1: CUE.total, kicker: KICK, lines: ['只换两个角，其他不动？', '**做不到**'], accent: RED, stagger: 0.006 });
  headline(ctx, t, { t0: CUE.total, t1: CUE.years, kicker: KICK, lines: ['一共约 **4325 亿亿**种'], accent: GOLD });
  headline(ctx, t, { t0: CUE.years, t1: CUE.twenty, kicker: KICK, lines: ['每秒看 1 种，', '要看 **1.37 万亿年**'], accent: GOLD });
  footnote(ctx, t, { t0: CUE.par, t1: CUE.total, text: '角、棱排列的奇偶性须一致：再 ÷ 2', y: 1585 });
  footnote(ctx, t, { t0: CUE.total + 0.5, t1: CUE.years, text: '只计正常转动可达的状态' });
  footnote(ctx, t, { t0: CUE.years + 0.5, t1: CUE.twenty, text: '宇宙年龄按约 138 亿年计' });
  vignette(ctx, 0.6);
  flash(ctx, (t >= CUE.explode ? Math.exp(-(t - CUE.explode) * 10) * 0.35 : 0) + (t >= CUE.total ? Math.exp(-(t - CUE.total) * 9) * 0.55 : 0) + seg(t, CUE.twenty - 0.1, CUE.twenty) * 0.5);
}

// cube-local placement of every cubie in the exploded view
function placement(t, ex) {
  const m = new Map();
  const st = S.countScramble.end;
  const posOfId = new Map(st.map((c) => [c.id, c.pos]));
  const cPos = CORNERS.map((id) => posOfId.get(id)), ePos = EDGES.map((id) => posOfId.get(id));
  for (const c of st) {
    if (c.type === 'center') { m.set(c.id, { p: c.pos.map((v) => v * lerp(1, 1.15, ex)) }); continue; }
    const isC = c.type === 'corner';
    const grp = isC ? CORNERS : EDGES, P = isC ? cPos : ePos, sw = isC ? CS : ES, f = isC ? EXC : EXE;
    const gi = grp.indexOf(c.id);
    const s = slotOf(sw, gi, t);
    const a = P[s.from].map((v) => v * f), b = P[s.to].map((v) => v * f);
    let p = a.map((v, i) => lerp(v, b[i], s.k));
    if (s.k > 0 && s.k < 1) p = vec.add(p, vec.scl(vec.norm(p.map((v) => v || 1e-6)), Math.sin(Math.PI * s.k) * 1.6));
    // parity: two corners try to swap alone, then spring back
    if (isC && (gi === 1 || gi === 6) && t > CUE.par && t < CUE.total) {
      const other = P[gi === 1 ? 6 : 1].map((v) => v * f);
      const k = tryK(t);
      p = p.map((v, i) => lerp(v, other[i], k * 0.42));
    }
    p = p.map((v, i) => lerp(c.pos[i], v, ex)); // grow out of the cube
    const radial = vec.norm(p.map((v) => v || 1e-6));
    const ang = isC ? twist(t, gi) : flip(t, gi);
    m.set(c.id, { p, E: ang ? axisAngle(radial, ang) : null });
  }
  return m;
}
const tryK = (t) => { const a = seg(t, CUE.par + 0.15, CUE.par + 0.6), b = seg(t, CUE.par + 0.95, CUE.par + 1.3); return easeOut(a) * (1 - backOut(b, 2)); };
// corner twists: 7 free ones in sequence, then the 8th turns by itself
function twist(t, i) {
  const t0 = CUE.f3 + 0.25 + (i < 7 ? i * 0.26 : 7 * 0.26 + 0.3);
  return easeInOut(seg(t, t0, t0 + 0.42)) * ((Math.PI * 2) / 3);
}
function flip(t, i) {
  const t0 = CUE.f2 + 0.25 + (i < 11 ? i * 0.17 : 11 * 0.17 + 0.3);
  return easeInOut(seg(t, t0, t0 + 0.4)) * Math.PI;
}
function lookOf(c, t, ex) {
  if (c.type === 'center') return { dim: 0.8 * ex };
  const isC = c.type === 'corner';
  const act = t < CUE.f8 || (isC ? (t >= CUE.f8 && t < CUE.f12) || (t >= CUE.par && t < CUE.total) : t >= CUE.f12 && t < CUE.par);
  const gi = (isC ? CORNERS : EDGES).indexOf(c.id);
  const locked = (isC && t >= CUE.f3 && t < CUE.f12 && gi === 7) || (!isC && t >= CUE.f2 && t < CUE.par && gi === 11);
  return { glow: (act ? 0.55 : 0.1) * ex, glowColor: hex(locked ? RED : isC ? GOLD : CYAN), dim: act ? 0 : 0.6 };
}

function overlays(ctx, cam, t, ex, positions) {
  const a = clamp((ex - 0.5) * 2);
  const la = a * easeOut(seg(t, CUE.explode + 0.6, CUE.explode + 1.0)) * (1 - seg(t, CUE.f8 - 0.3, CUE.f8));
  if (la > 0) {
    label(ctx, '8 个角块', 270, 1360, { size: 64, weight: 900, color: GOLD, alpha: la, align: 'center' });
    label(ctx, '每块 3 个色面', 270, 1416, { size: 32, weight: 400, alpha: la * 0.75, align: 'center' });
    label(ctx, '12 个棱块', 810, 1360, { size: 64, weight: 900, color: CYAN, alpha: la, align: 'center' });
    label(ctx, '每块 2 个色面', 810, 1416, { size: 32, weight: 400, alpha: la * 0.75, align: 'center' });
    label(ctx, '+ 6 个中心块：位置不动', 540, 1500, { size: 32, weight: 700, alpha: la * 0.6, align: 'center' });
  }
  const st = S.countScramble.end;
  const lockC = t >= CUE.f3 + 0.2 && t < CUE.f12 - 0.2, lockE = t >= CUE.f2 + 0.2 && t < CUE.par - 0.2;
  if (lockC || lockE) {
    const grp = lockC ? CORNERS : EDGES, id = grp[grp.length - 1];
    const c = st.find((x) => x.id === id);
    const p = cam.project(positions.get(c.id).p);
    const t0 = lockC ? CUE.f3 : CUE.f2, t1 = lockC ? CUE.f12 : CUE.par;
    const aa = easeOut(seg(t, t0 + 0.2, t0 + 0.5)) * (1 - seg(t, t1 - 0.5, t1 - 0.2));
    padlock(ctx, p[0], p[1] - 104, 40, RED, aa);
    label(ctx, lockC ? '由前 7 个决定' : '由前 11 个决定', p[0], p[1] - 50, { size: 32, weight: 900, color: RED, align: 'center', alpha: aa });
  }
  if (t > CUE.par + 0.55 && t < CUE.total) {
    const c1 = st.find((x) => x.id === CORNERS[1]), c2 = st.find((x) => x.id === CORNERS[6]);
    const p1 = cam.project(c1.pos.map((v) => v * EXC)), p2 = cam.project(c2.pos.map((v) => v * EXC));
    const k = seg(t, CUE.par + 0.55, CUE.par + 0.85), out = seg(t, CUE.total - 0.3, CUE.total);
    ctx.save(); ctx.globalAlpha = 1 - out;
    crossMark(ctx, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, 64, RED, k, 15);
    ctx.restore();
  }
}

// formula strip and the running product
function formula(ctx, t) {
  const terms = [['8', '!', '', CUE.f8, GOLD], ['× 3', '', '7', CUE.f3, GOLD], ['× 12', '!', '', CUE.f12, CYAN], ['× 2', '', '11', CUE.f2, CYAN], ['÷ 2', '', '', CUE.par, RED]];
  const out = seg(t, CUE.total, CUE.total + 0.4);
  const y = 1470, sz = 92, gap = 26;
  ctx.save(); ctx.textBaseline = 'alphabetic';
  const parts = terms.map(([b, bang, sup]) => { ctx.font = `800 ${sz}px ${COND}`; const wb = ctx.measureText(b + bang).width; ctx.font = `800 ${sz * 0.55}px ${COND}`; return wb + (sup ? ctx.measureText(sup).width + 4 : 0); });
  const total = parts.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  let x = 540 - total / 2;
  terms.forEach(([b, bang, sup, t0, col], i) => {
    const k = seg(t, t0, t0 + 0.3);
    const cur = t >= t0 && (i === terms.length - 1 || t < terms[i + 1][3]);
    if (k > 0) {
      const dy = 40 * (1 - expoOut(k));
      ctx.globalAlpha = (1 - out) * clamp(k * 2) * (cur ? 1 : 0.55);
      ctx.fillStyle = cur ? col : INK;
      ctx.font = `800 ${sz}px ${COND}`; ctx.fillText(b + bang, x, y + dy);
      const wb = ctx.measureText(b + bang).width;
      if (sup) { ctx.font = `800 ${sz * 0.55}px ${COND}`; ctx.fillText(sup, x + wb + 4, y - sz * 0.42 + dy); }
    }
    x += parts[i] + gap;
  });
  ctx.restore();
  const idx = t < CUE.f3 ? 0 : t < CUE.f12 ? 1 : t < CUE.f2 ? 2 : t < CUE.par ? 3 : 4;
  const t0 = [CUE.f8, CUE.f3, CUE.f12, CUE.f2, CUE.par][idx];
  const s = commas(V[idx].toString());
  const size = Math.min(110, 980 / (s.length * 0.47));
  odometer(ctx, s, seg(t, t0 + 0.15, t0 + 1.1), 540, 1335, { size, color: INK, alpha: (1 - out) * easeOut(seg(t, CUE.f8, CUE.f8 + 0.3)), spins: 1, spread: 0.45, seed: idx + 3 });
}

// slot-machine digits while the answer is unknown
function slots(ctx, t, a) {
  if (a <= 0) return;
  const s = commas(TOTAL.toString());
  ctx.save(); ctx.globalAlpha = a * 0.55 * easeOut(seg(t, CUE.count + 0.3, CUE.count + 0.8));
  ctx.font = `800 82px ${COND}`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
  const dw = ctx.measureText('0').width, cw = ctx.measureText(',').width;
  const w = [...s].reduce((acc, ch) => acc + (ch === ',' ? cw : dw), 0);
  let x = 540 - w / 2;
  const f = Math.floor(t * 24);
  [...s].forEach((ch, i) => {
    if (ch === ',') { ctx.fillText(',', x, 1450); x += cw; return; }
    ctx.fillText(String(Math.floor(hash(f * 97 + i * 13) * 10)), x, 1450); x += dw;
  });
  label(ctx, '？', 540, 1560, { size: 60, weight: 900, align: 'center', color: GOLD, alpha: a * easeOut(seg(t, CUE.count + 0.3, CUE.count + 0.8)) }); // label() sets its own alpha
  ctx.restore();
}

function totalShot(ctx, t) {
  const T = CUE.total, Y = CUE.years;
  if (t < Y) {
    const k = seg(t, T, T + 0.5), out = seg(t, Y - 0.25, Y);
    const s = commas(TOTAL.toString());
    const sc = lerp(1.25, 1, expoOut(k));
    ctx.save(); ctx.translate(540, 930); ctx.scale(sc, sc);
    bigNumber(ctx, s, 0, 0, { size: 86, color: '#ffffff', alpha: clamp(k * 3) * (1 - out) });
    ctx.restore();
    const k2 = seg(t, T + 0.5, T + 0.9);
    ctx.save(); ctx.globalAlpha = clamp(k2 * 2) * (1 - out);
    ctx.font = `800 260px ${COND}`; ctx.textBaseline = 'alphabetic';
    const nw = ctx.measureText('4325').width; ctx.font = `900 120px ${SANS}`; const uw = ctx.measureText('亿亿').width;
    const x0 = 540 - (nw + uw + 20) / 2, y0 = 1210 + 30 * (1 - expoOut(k2));
    ctx.shadowColor = GOLD; ctx.shadowBlur = 40 * Math.exp(-Math.max(0, t - T - 0.5) * 3);
    ctx.fillStyle = GOLD; ctx.font = `800 260px ${COND}`; ctx.fillText('4325', x0, y0);
    ctx.font = `900 120px ${SANS}`; ctx.fillText('亿亿', x0 + nw + 20, y0 - 8);
    ctx.restore();
    const numberAlpha = clamp(k2 * 2) * 0.7 * (1 - out);
    ctx.save(); ctx.font = `600 44px ${MONO}`;
    const baseWidth = ctx.measureText('≈ 4.3 × 10').width;
    ctx.font = `600 28px ${MONO}`; const powerWidth = ctx.measureText('19').width;
    const numberX = 540 - (baseWidth + powerWidth + 3) / 2; ctx.restore();
    label(ctx, '≈ 4.3 × 10', numberX, 1330, { size: 44, weight: 600, family: MONO, alpha: numberAlpha });
    label(ctx, '19', numberX + baseWidth + 3, 1310, { size: 28, weight: 600, family: MONO, alpha: numberAlpha });
    return;
  }
  // 1.37 万亿年 ≈ 100 ages of the universe
  const k = seg(t, Y, Y + 0.3), out = seg(t, CUE.twenty - 0.2, CUE.twenty);
  const N = 10, cell = 66, gap = 10, gw = N * cell + (N - 1) * gap, x0 = 540 - gw / 2, y0 = 620;
  const fill = seg(t, Y + 0.4, Y + 2.2);
  ctx.save(); ctx.globalAlpha = 1 - out;
  label(ctx, '1 格 = 宇宙年龄（约 138 亿年）', x0, y0 - 30, { size: 32, weight: 700, alpha: easeOut(k) * 0.85 });
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / N), c = i % N;
    const on = clamp((fill * 100 - i) * 0.5);
    const x = x0 + c * (cell + gap), y = y0 + r * (cell + gap);
    rr(ctx, x, y, cell, cell, 10);
    ctx.fillStyle = on > 0 ? rgba(GOLD, 0.15 + 0.75 * on) : 'rgba(255,255,255,0.06)'; ctx.fill();
    if (i === 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  const n = Math.max(1, Math.round(fill * 100));
  bigNumber(ctx, `≈ ${n} 倍`.replace(' 倍', ''), 540, y0 + gw + 180, { size: 160, color: GOLD, alpha: easeOut(k) });
  label(ctx, '个宇宙年龄', 540, y0 + gw + 250, { size: 44, weight: 900, align: 'center', alpha: easeOut(seg(t, Y + 2.2, Y + 2.5)) });
  ctx.restore();
}
