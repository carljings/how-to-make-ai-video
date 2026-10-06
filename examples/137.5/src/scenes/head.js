// head.js: the sunflower head through Acts I–III. One seed; the 137.5° turn; growth to 1,500 seeds;
// the 34 and 55 spiral arms; Fibonacci families from the centre outward; regrowth at other angles; the bloom.
import { TAU, clamp, lerp, seg, smooth, easeInOut, expOut, win, css, kf, camera } from '../lib.js';
import { CUE, GOLDEN, NMAX, TRIALS } from '../timeline.js';
import { F, C, label, richText } from '../text.js';
import { drawSeeds, drawPetals, seedLocal, toWorld } from '../flower.js';

export const SEED_EVENTS = []; // { t, k, deg } births to sonify
export const COUNT_EVENTS = []; // { t, i, fam } arm counts
const GOLD = [255, 204, 110], ROSE = [255, 140, 160], DIM = 0.32;
const BANDS = [8, 13, 21, 34, 55, 89];
const bandTime = i => CUE.bands[0] + i * ((CUE.bands[1] - CUE.bands[0]) / BANDS.length);
const RANK = {}; // family → rank of each arm in angular order, for alternating stripes

// ── state as functions of time ───────────────────────────────────────────────
function trialAt(t) { for (let i = TRIALS.length - 1; i >= 0; i--) if (t >= TRIALS[i][0]) return i; return -1; }
export function seedsAt(t) {
  if (t < CUE.firstSeed) return 0;
  if (t < CUE.slow[0]) return clamp((t - CUE.firstSeed) / 0.4);
  if (t < CUE.fast[0]) { let n = 1; for (let i = 0; i < 8; i++) n += smooth(seg(t, CUE.slow[0] + i * 0.62, CUE.slow[0] + i * 0.62 + 0.42)); return n; }
  if (t < CUE.fast[1]) { const u = (t - CUE.fast[0]) / (CUE.fast[1] - CUE.fast[0]); return 9 + (NMAX - 9) * (Math.exp(5 * u) - 1) / (Math.exp(5) - 1); }
  const tr = CUE.trials;
  if (t < tr[0]) return NMAX;
  if (t < TRIALS[0][0]) return NMAX * (1 - easeInOut(seg(t, tr[0] + 0.2, tr[0] + 1.0)));
  const i = trialAt(t), s0 = TRIALS[i][0], next = i + 1 < TRIALS.length ? TRIALS[i + 1][0] : Infinity;
  const grow = (Math.exp(4 * seg(t, s0, s0 + 1.25)) - 1) / (Math.exp(4) - 1);
  const shrink = next < Infinity ? 1 - easeInOut(seg(t, next - 0.28, next)) : 1;
  return Math.max(0.0, NMAX * grow * shrink);
}
export function angleAt(t) { const i = trialAt(t); return t >= CUE.trials[0] && i >= 0 ? TRIALS[i][1] : GOLDEN; }
const spinAt = t => 0.03 * t;
function zoomAt(t) {
  const b = CUE.bands;
  return kf(t, [[b[0] - 0.4, 1], [b[0] + 0.6, 4.6], [bandTime(1) + 0.3, 2.9], [bandTime(2) + 0.3, 1.85], [bandTime(3) + 0.3, 1.2], [bandTime(4) + 0.3, 1.0], [b[1], 1]], easeInOut);
}
function opacityAt(t) {
  const dimMath = 1 - 0.72 * win(t, CUE.ratios[0] - 0.4, CUE.split[1] + 0.2, 0.6, 0.4);
  const dimFrac = 1 - 0.76 * win(t, CUE.fraction[0] - 0.2, CUE.fraction[1] + 0.2, 0.6, 0.8);
  return dimMath * dimFrac * (1 - seg(t, 84.0, 85.0));
}
const tiltAt = t => 0.55 * easeInOut(seg(t, CUE.bloom[0] + 0.2, CUE.bloom[0] + 2.8));
export function camAt(t) {
  const z = zoomAt(t), back = 2.9 * easeInOut(seg(t, CUE.bloom[0], CUE.bloom[0] + 3.2));
  const D = 4.8 / z + back;
  const ty = lerp(-0.16, -0.05, seg(z, 1, 4.6)) + 0.1 * tiltAt(t);
  return camera([0, ty + 0.25 * tiltAt(t), D], [0, ty, 0], { fov: 34 });
}
const poseAt = t => ({ c: [0, 0, 0], tilt: tiltAt(t), spin: spinAt(t), scale: 1 });

export function init() {
  // Act I births, sampled every 2 ms. The first nine seeds sound as they start to appear (20% emerged),
  // so each bell lands with the light; in the flood a seed sounds when it is fully born.
  const threshold = k => (k < 9 ? k + 0.2 : k + 1);
  for (let t = 0, k = 0; t < CUE.fast[1] + 0.5 && k < NMAX; t += 0.002) {
    const n = seedsAt(t);
    while (k < NMAX && n >= threshold(k)) { SEED_EVENTS.push({ t, k, deg: (((k * angleAt(t)) % 360) + 360) % 360 }); k++; }
  }
  // arm counting order: sweep around the head by the angle of each arm's outermost seed
  for (const Fm of [8, 13, 21, 34, 55, 89]) {
    const order = Array.from({ length: Fm }, (_, j) => j).sort((a, b) => ((a * GOLDEN) % 360) - ((b * GOLDEN) % 360));
    RANK[Fm] = new Array(Fm); order.forEach((j, r) => { RANK[Fm][j] = r; });
  }
  const step34 = 2.4 / 34, step55 = 2.6 / 55;
  for (let i = 0; i < 34; i++) COUNT_EVENTS.push({ t: CUE.arms34[0] + 0.3 + i * step34, i, fam: 34 });
  for (let i = 0; i < 55; i++) COUNT_EVENTS.push({ t: CUE.arms55[0] + 0.3 + i * step55, i, fam: 55 });
}

// Colour override per phase: highlights for arm counting and the Fibonacci bands
function colorFn(t) {
  const [a0, a1] = CUE.arms34, [b0, b1] = CUE.arms55;
  if (t >= a0 && t < b1 + 0.6) {
    const c34 = Math.floor((t - a0 - 0.3) / (2.4 / 34)) + 1, c55 = Math.floor((t - b0 - 0.3) / (2.6 / 55)) + 1;
    const f34 = 1 - seg(t, b0, b0 + 0.6), f55 = win(t, b0, b1 + 0.6, 0.2, 0.6);
    // counted arms become alternating stripes; the arm just counted flashes
    const stripe = (Fm, cnt, hue, k, base) => {
      const r = RANK[Fm][k % Fm];
      if (r >= cnt) return [base, DIM];
      const flash = r === cnt - 1 ? 1.9 : 1;
      return r % 2 ? [hue.map(v => v * 0.62), 0.9 * flash] : [hue, 1.55 * flash];
    };
    return (k, age, base) => {
      let col = base, gain = 1;
      if (f34 > 0) { const [c, g2] = stripe(34, c34, GOLD, k, base); const w = f34 * seg(t, a0, a0 + 0.3); col = w > 0.5 ? c : base; gain = lerp(1, g2, w); }
      if (f55 > 0 && t >= b0) { const [c, g2] = stripe(55, c55, ROSE, k, base); col = f55 > 0.5 ? c : col; gain = lerp(gain, g2, f55); }
      return [col, gain];
    };
  }
  if (t >= CUE.bands[0] && t < CUE.bands[1] + 0.4) {
    const i = Math.min(BANDS.length - 1, Math.floor((t - CUE.bands[0]) / ((CUE.bands[1] - CUE.bands[0]) / BANDS.length)));
    const Fm = BANDS[i], lo = (Fm / 2.6) ** 2, hi = (Fm / 1.2) ** 2, fade = win(t, CUE.bands[0], CUE.bands[1] + 0.4, 0.4, 0.6);
    return (k, age, base) => {
      const inBand = age >= lo && age <= hi;
      if (!inBand) return [base, lerp(1, DIM, fade)];
      return RANK[Fm][k % Fm] % 2 ? [base, lerp(1, 0.5, fade)] : [GOLD, lerp(1, 1.7, fade)];
    };
  }
  return null;
}

export function draw(g, t) {
  const n = seedsAt(t), a = opacityAt(t);
  if (n <= 0 || a <= 0.003) return;
  const cam = camAt(t), pose = poseAt(t), alpha = angleAt(t);
  const focus = cam.project([0, 0, 0])?.z ?? 4.8;
  const c0 = cam.project([0, 0, 0]);
  if (c0 && n > 30) g.glow(c0.x, c0.y, 0.62 * c0.s * Math.min(1, n / 400) + 40, [255, 176, 80], 0.13 * a * Math.min(1, n / 300), 'halo');
  drawPetals(g, cam, pose, { n, alpha, open: seg(t, CUE.bloom[0] + 0.8, CUE.bloom[0] + 4.6), a: a, focus, aperture: 8 });
  // spokes stack many seeds on a few lines; dim them so they glow instead of burning out
  const spoky = { 90: 0.38, 120: 0.38, 144: 0.42 }[Math.round(alpha)] ?? (Math.abs(alpha - 138.46) < 0.01 ? 0.62 : 1);
  drawSeeds(g, cam, pose, { n, alpha, focus, aperture: 8, a: a * spoky, color: colorFn(t), twinkle: t * 2.2 });
  if (t > CUE.bloom[0]) { // warm light on the bloom
    const c = cam.project([0, 0, 0]);
    g.glow(c.x - 160, c.y - 220, 900, [255, 190, 110], 0.12 * seg(t, CUE.bloom[0], CUE.bloom[0] + 2) * a, 'halo');
  }
}

// Screen position of the direction of seed k at radius rr (in head units)
function dirPoint(t, k, rr) {
  const al = (angleAt(t) * Math.PI) / 180, th = k * al;
  return camAt(t).project(toWorld([Math.cos(th) * rr, Math.sin(th) * rr, 0], poseAt(t)));
}

export function overlay(ctx, t) {
  // Act I: the protractor between the two newest seeds
  const pa = win(t, CUE.slow[0], CUE.fast[0] + 0.8, 0.3, 0.6);
  if (pa > 0.003) {
    const n = seedsAt(t), k = Math.max(1, Math.min(8, Math.floor(n + 0.3) - 1));
    const c = camAt(t).project([0, 0, 0]), p0 = dirPoint(t, k - 1, 0.62), p1 = dirPoint(t, k, 0.62);
    const ka = pa * smooth(seg(n, k + 0.5, k + 0.9) + (k === 8 ? 1 : 0));
    if (c && p0 && p1) {
      ctx.globalAlpha = 0.55 * pa; ctx.strokeStyle = css(C.warm); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(p0.x, p0.y); ctx.moveTo(c.x, c.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      const a0 = Math.atan2(p0.y - c.y, p0.x - c.x), a1 = Math.atan2(p1.y - c.y, p1.x - c.x);
      let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
      ctx.globalAlpha = 0.9 * pa; ctx.strokeStyle = css(C.gold); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 70, a0, a0 + d * Math.max(0.05, ka), d < 0); ctx.stroke();
      const am = a0 + d / 2;
      label(ctx, '137.5°', c.x + Math.cos(am) * 112, c.y + Math.sin(am) * 112 + 7, { size: 24, color: C.gold, alpha: pa * ka, align: 'center', weight: 500 });
    }
  }
  // Act II: counts of the two arm families
  for (const [fam, [s0, s1], col] of [[34, CUE.arms34, C.gold], [55, CUE.arms55, ROSE]]) {
    const ca = win(t, s0 + 0.2, (fam === 34 ? CUE.arms55[1] : CUE.arms55[1]) + 0.4, 0.3, 0.5);
    if (ca <= 0.003) continue;
    const cnt = Math.min(fam, Math.max(0, Math.floor((t - s0 - 0.3) / ((fam === 34 ? 2.4 : 2.6) / fam)) + 1));
    const x = fam === 34 ? 300 : 1620;
    label(ctx, String(cnt), x, 520, { size: 92, color: col, alpha: ca * (t >= s0 ? 1 : 0), align: 'center', weight: 500, font: F.math });
    // a small curved arrow: clockwise for 34, counter-clockwise for 55
    const cw = fam === 34, r0 = 26, a0 = cw ? -2.4 : -0.74, a1 = cw ? -0.74 : -2.4;
    ctx.globalAlpha = ca * 0.85; ctx.strokeStyle = css(col); ctx.fillStyle = css(col); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, 600, r0, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    const ex = x + Math.cos(a1) * r0, ey = 600 + Math.sin(a1) * r0, tx = cw ? -Math.sin(a1) : Math.sin(a1), ty = cw ? Math.cos(a1) : -Math.cos(a1);
    ctx.beginPath(); ctx.moveTo(ex + tx * 10, ey + ty * 10); ctx.lineTo(ex - ty * 7, ey + tx * 7); ctx.lineTo(ex + ty * 7, ey - tx * 7); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    void s1;
  }
  // Act II: the Fibonacci sequence, each family lighting up as it is shown
  const fa = win(t, CUE.bands[0] - 0.2, CUE.ratios[1], 0.6, 0.6);
  if (fa > 0.003) {
    const seq = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const cur = Math.min(BANDS.length - 1, Math.floor((t - CUE.bands[0]) / ((CUE.bands[1] - CUE.bands[0]) / BANDS.length)));
    ctx.font = `500 40px ${F.math}`; ctx.letterSpacing = '0px';
    const parts = seq.map(String), ws = parts.map(s => ctx.measureText(s).width), gap = 34, total = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
    let x = 960 - total / 2;
    parts.forEach((s, i) => {
      const bi = i - 5, shown = i < 5 ? seg(t, CUE.bands[0] + i * 0.12, CUE.bands[0] + i * 0.12 + 0.4) : seg(t, bandTime(bi) - 0.1, bandTime(bi) + 0.3);
      const active = i >= 5 && bi === cur && t < CUE.bands[1];
      label(ctx, s, x + ws[i] / 2, 120, { size: 40, font: F.math, color: active ? C.gold : C.warm, alpha: fa * shown * (active ? 1 : 0.7), align: 'center', weight: 500 });
      x += ws[i] + gap;
    });
    // label the band being shown, at its outer edge
    if (t < CUE.bands[1]) {
      const Fm = BANDS[cur], age = (Fm / 1.25) ** 2, rr = Math.sqrt(age) / Math.sqrt(NMAX - 1);
      const p = camAt(t).project(toWorld([rr * 1.06, 0, 0], { ...poseAt(t), spin: 0 }));
      const ba = win(t, bandTime(cur), bandTime(cur) + (CUE.bands[1] - CUE.bands[0]) / BANDS.length, 0.25, 0.25);
      if (p) label(ctx, String(Fm), p.x + 18, p.y + 12, { size: 44, font: F.math, color: C.gold, alpha: fa * ba, weight: 500 });
    }
  }
  // Act III: the angle under trial
  const ta = win(t, TRIALS[0][0] - 0.1, CUE.trials[1], 0.3, 0.4);
  if (ta > 0.003) {
    const i = Math.max(0, trialAt(t)), [s0, , text] = TRIALS[i];
    const next = i + 1 < TRIALS.length ? TRIALS[i + 1][0] : CUE.trials[1];
    const la = win(t, s0 + 0.05, next, 0.2, 0.25) * ta;
    richText(ctx, text.split(' · ')[0], 960, 132, `500 56px ${F.math}`, i === TRIALS.length - 1 ? C.gold : C.warm, { alpha: la });
    label(ctx, text.split(' · ').slice(1).join(' · '), 960, 176, { size: 20, font: F.zh, color: C.en, alpha: la * 0.9, align: 'center', weight: 500, spacing: 3 });
  }
  void expOut; void seedLocal;
}
