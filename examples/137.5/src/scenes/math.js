// math.js: the numbers behind the spiral, drawn as type over the dimmed seed head.
// Ratios of neighbouring Fibonacci numbers close in on φ; a full turn split by φ leaves 137.5°;
// the continued fraction of φ is all ones.
import { TAU, clamp, lerp, seg, smooth, easeInOut, easeOut, expOut, win, css } from '../lib.js';
import { CUE, PHI, GOLDEN } from '../timeline.js';
import { F, C, label, sci } from '../text.js';

const RATIOS = [[2, 1], [3, 2], [5, 3], [8, 5], [13, 8], [21, 13], [34, 21], [55, 34], [89, 55]];
export const MATH_EVENTS = []; // { t, kind, i } for the score
const rTime = i => CUE.ratios[0] + 0.4 + i * 0.42;
const fracLevel = i => CUE.fraction[0] + 0.3 + i * 0.55;
const LEVELS = 8;

export function init() {
  RATIOS.forEach((_, i) => MATH_EVENTS.push({ t: rTime(i), kind: 'ratio', i }));
  MATH_EVENTS.push({ t: CUE.split[0] + 0.1, kind: 'sweep' }, { t: CUE.split[0] + 1.6, kind: 'golden' });
  for (let i = 0; i < LEVELS; i++) MATH_EVENTS.push({ t: fracLevel(i), kind: 'level', i });
}

export function draw(g, t) {
  // the split circle glows as light
  const sa = win(t, CUE.split[0], CUE.split[1], 0.4, 0.5);
  if (sa <= 0.003) return;
  const cx = 960, cy = 470, R = 230, start = -Math.PI / 2;
  const big = (222.5 * Math.PI) / 180, sw = easeInOut(seg(t, CUE.split[0] + 0.1, CUE.split[0] + 1.5));
  const ring = (a0, a1, col, al, w) => { const pts = []; for (let i = 0; i <= 90; i++) { const a = lerp(a0, a1, i / 90); pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } g.glowLine(pts, col, al, w); };
  ring(0, TAU, [200, 190, 170], 0.12 * sa, 1);
  ring(start, start + big * sw, [235, 228, 215], 0.6 * sa, 1.6);
  const gs = easeOut(seg(t, CUE.split[0] + 1.6, CUE.split[0] + 2.6));
  if (gs > 0) ring(start + big, start + big + (TAU - big) * gs, [255, 200, 110], sa, 2.6);
  for (const a of [start, start + big * sw]) g.glowLine([[cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R]], [235, 228, 215], 0.5 * sa, 1.3);
}

export function overlay(ctx, t) {
  ratios(ctx, t);
  split(ctx, t);
  fraction(ctx, t);
}

function ratios(ctx, t) {
  const a = win(t, CUE.ratios[0], CUE.ratios[1], 0.4, 0.5);
  if (a <= 0.003) return;
  const zoom = 1 + 13 * easeInOut(seg(t, rTime(RATIOS.length - 1) + 0.3, CUE.ratios[1] - 0.4));
  const X = v => 960 + (v - lerp(1.5, PHI, seg(zoom, 1, 2))) * 900 * zoom, y = 580;
  const arcFade = 1 - seg(zoom, 1.3, 2.6);
  ctx.globalAlpha = 0.45 * a; ctx.strokeStyle = css(C.warm); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(260, y); ctx.lineTo(1660, y); ctx.stroke();
  for (const v of [1, 1.5, 2, 1.6, 1.62, 1.61, 1.63]) {
    const x = X(v); if (x < 280 || x > 1640) continue;
    if ((v === 1.6 || v === 1.62 || v === 1.61 || v === 1.63) && zoom < 4) continue;
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    label(ctx, v.toFixed(zoom > 4 ? 2 : 1), x, y + 40, { size: 22, alpha: a * 0.75, align: 'center' });
  }
  // φ marker
  const px = X(PHI);
  ctx.globalAlpha = a; ctx.strokeStyle = css(C.gold); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, y - 120); ctx.lineTo(px, y + 14); ctx.stroke();
  label(ctx, 'φ = 1.6180339887…', px, y - 140, { size: 38, font: F.math, color: C.gold, alpha: a, align: 'center' });
  // the ratios hop across φ
  let last = null;
  RATIOS.forEach(([p, q], i) => {
    const k = expOut(seg(t, rTime(i), rTime(i) + 0.35));
    if (k <= 0) return;
    const v = p / q, x = X(v);
    if (last && arcFade > 0) {
      const [lx] = last, mid = (lx + x) / 2, hgt = Math.min(70, Math.abs(x - lx) * 0.4);
      ctx.globalAlpha = 0.4 * a * arcFade; ctx.strokeStyle = css(C.warm); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(lx, y); ctx.quadraticCurveTo(mid, y - hgt * 2, lerp(lx, x, k), y); ctx.stroke();
    }
    if (x < 250 || x > 1670) { last = [x]; return; }
    ctx.globalAlpha = a * k; ctx.fillStyle = css(i === RATIOS.length - 1 ? C.gold : C.warm);
    ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU); ctx.fill();
    if (zoom < 3 || i >= 6) label(ctx, `${p}/${q}`, x, y - 26 - (i % 2) * 30, { size: 21, font: F.math, alpha: a * k * 0.9, align: 'center' });
    last = [x];
  });
  // the newest ratio, large
  const cur = Math.max(0, Math.min(RATIOS.length - 1, Math.floor((t - rTime(0)) / 0.42)));
  if (t >= rTime(0)) {
    const [p, q] = RATIOS[cur];
    label(ctx, `${p} ÷ ${q} = ${(p / q).toFixed(6)}`, 960, 750, { size: 46, font: F.math, color: cur === RATIOS.length - 1 ? C.gold : C.warm, alpha: a, align: 'center' });
  }
}

function split(ctx, t) {
  const a = win(t, CUE.split[0] + 0.2, CUE.split[1], 0.4, 0.5);
  if (a <= 0.003) return;
  const cx = 960, cy = 470, R = 230, start = -Math.PI / 2, big = (222.5 * Math.PI) / 180;
  const l1 = seg(t, CUE.split[0] + 1.2, CUE.split[0] + 1.7), l2 = seg(t, CUE.split[0] + 2.4, CUE.split[0] + 2.9);
  const m1 = start + big / 2, m2 = start + big + (TAU - big) / 2;
  label(ctx, '222.5°', cx + Math.cos(m1) * (R + 60), cy + Math.sin(m1) * (R + 60) + 8, { size: 30, font: F.math, alpha: a * l1, align: 'center' });
  label(ctx, '137.5°', cx + Math.cos(m2) * (R + 64), cy + Math.sin(m2) * (R + 64) + 8, { size: 34, font: F.math, color: C.gold, alpha: a * l2, align: 'center' });
  const l3 = seg(t, CUE.split[0] + 3.2, CUE.split[0] + 3.8);
  label(ctx, '222.5 ÷ 137.5 = 1.618… = φ', cx, cy + 6, { size: 30, font: F.math, alpha: a * l3, align: 'center' });
  const l4 = seg(t, CUE.split[0] + 3.9, CUE.split[0] + 4.5);
  label(ctx, '360° ÷ φ² ≈ 137.5°', cx, cy + 54, { size: 32, font: F.math, color: C.gold, alpha: a * l4, align: 'center' });
}

function fraction(ctx, t) {
  const a = win(t, CUE.fraction[0], CUE.fraction[1] + 0.2, 0.4, 0.8);
  if (a <= 0.003) return;
  const push = easeInOut(seg(t, fracLevel(LEVELS - 1) + 0.4, CUE.fraction[1]));
  ctx.save();
  // a slow push into the tower of ones
  const fx = 1060, fy = 600, z = 1 + 0.32 * push;
  ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  let x = 640, y = 330;
  const XEND = 1560;
  ctx.font = `400 76px ${F.math}`;
  const head = 'φ = ';
  label(ctx, head, x - ctx.measureText(head).width, y, { size: 76, font: F.math, color: C.gold, alpha: a * seg(t, fracLevel(0) - 0.3, fracLevel(0)) });
  for (let i = 0; i < LEVELS; i++) {
    const k = easeOut(seg(t, fracLevel(i), fracLevel(i) + 0.4)), s = Math.pow(0.8, i), fs = 76 * s;
    if (k <= 0) break;
    const fade = a * k * (1 - i * 0.07);
    ctx.font = `400 ${fs}px ${F.math}`;
    const lead = i === LEVELS - 1 ? '1 + …' : '1 + ', wl = ctx.measureText(lead).width;
    label(ctx, lead, x, y, { size: fs, font: F.math, color: C.warm, alpha: fade });
    if (i === LEVELS - 1) break;
    const bx0 = x + wl, barY = y - fs * 0.32;
    ctx.globalAlpha = fade; ctx.strokeStyle = css(C.warm); ctx.lineWidth = Math.max(1, 2.4 * s);
    ctx.beginPath(); ctx.moveTo(bx0, barY); ctx.lineTo(lerp(bx0, XEND, k), barY); ctx.stroke();
    label(ctx, '1', (bx0 + XEND) / 2, barY - fs * 0.22, { size: fs, font: F.math, color: C.warm, alpha: fade, align: 'center' });
    x = bx0 + 6 * s; y = barY + fs * 0.8 * 1.25 + 8 * s;
  }
  ctx.restore();
  const la = a * seg(t, fracLevel(LEVELS - 1), fracLevel(LEVELS - 1) + 0.6) * (1 - push * 0.6);
  label(ctx, '连分数 · CONTINUED FRACTION', 300, 792, { size: 18, alpha: la, spacing: 4 });
  label(ctx, 'φ = [1; 1, 1, 1, 1, 1, 1, …]', 300, 756, { size: 26, font: F.math, color: C.gold, alpha: la });
  void sci; void smooth; void clamp; void GOLDEN;
}
