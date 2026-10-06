// emerge.js: nobody gives the plant the angle. Buds from a repulsion model (after Douady & Couder, 1992):
// each new bud forms on the rim of the growing tip where it has the most room; the angle between buds
// starts at 180°, then settles near 137.5° on its own. The positions come from assets/emerge.json.
import { TAU, clamp, lerp, seg, smooth, easeOut, easeInOut, win, css } from '../lib.js';
import { CUE, GOLDEN } from '../timeline.js';
import { F, C, label } from '../text.js';

const [E0, E1] = CUE.emerge;
const T0 = 108.6, T1 = 125.6, KAPPA = 2.2;
const CX = 680, CY = 470, R0 = 52;
const BUD = [190, 230, 120], TIP = [255, 220, 150];
const CH = { x0: 1130, x1: 1720, y0: 270, y1: 640, lo: 120, hi: 182 };
let D = null;
export const BUD_EVENTS = []; // { t, k, deg }

export async function init() {
  D = await (await fetch('assets/emerge.json')).json();
  const n = D.theta.length;
  for (let k = 0; k < n; k++) BUD_EVENTS.push({ t: budTime(k), k, deg: (((D.theta[k] * 180) / Math.PI) % 360 + 360) % 360 });
}
const tauAt = t => { const n = D.theta.length - 1, u = clamp((t - T0) / (T1 - T0)); return n * (Math.exp(KAPPA * u) - 1) / (Math.exp(KAPPA) - 1); };
function budTime(k) { const n = D.theta.length - 1, f = k / n; return T0 + (T1 - T0) * Math.log(1 + f * (Math.exp(KAPPA) - 1)) / KAPPA; }
function logGrowthAt(tau) { const L = D.logGrowth, i = Math.min(L.length - 2, Math.floor(tau)); return lerp(L[i], L[i + 1], clamp(tau - i)); }

export function draw(g, t) {
  const a = win(t, E0, E1, 0.8, 1.0);
  if (a <= 0 || !D) return;
  const tau = tauAt(t), Lt = logGrowthAt(tau), nb = Math.floor(tau + 1e-9);
  // the growing tip
  g.glow(CX, CY, R0 * 3.2, [170, 220, 140], 0.18 * a, 'halo');
  g.glow(CX, CY, R0 * 1.3, [210, 240, 180], 0.35 * a, 'glow');
  const rim = []; for (let i = 0; i <= 72; i++) rim.push([CX + Math.cos((i / 72) * TAU) * R0, CY + Math.sin((i / 72) * TAU) * R0]);
  g.glowLine(rim, [210, 240, 180], 0.35 * a, 1.2);
  // buds drift outward as the tip grows; each one keeps the angle it was born at
  for (let k = 0; k <= nb && k < D.theta.length; k++) {
    // displayed distance is compressed (r^0.6) so more buds stay in view; angles are exact
    const r = Math.pow(Math.exp(Lt - D.logGrowth[k]), 0.6), th = D.theta[k];
    const x = CX + Math.cos(th) * r * R0, y = CY + Math.sin(th) * r * R0;
    if (x < -40 || x > 1960 || y < -40 || y > 1120) continue;
    const age = tau - k, fresh = Math.exp(-age * 1.4);
    const size = 5 + 6 * Math.pow(r, 0.7);
    g.glow(x, y, size * 2.4, BUD, (0.18 + 0.12 * fresh) * a, 'halo'); // the room each bud claims
    g.glow(x, y, size, fresh > 0.3 ? TIP : BUD, (0.55 + 0.45 * fresh) * a);
    if (fresh > 0.05 && k > 0) { const ring = 10 + age * 40; g.glowLine(Array.from({ length: 33 }, (_, i) => [x + Math.cos((i / 32) * TAU) * ring, y + Math.sin((i / 32) * TAU) * ring]), TIP, 0.5 * fresh * a, 1); }
  }
  // the angle between the two newest buds, drawn around the tip
  if (nb >= 1 && nb < D.theta.length) {
    const th0 = D.theta[nb - 1], th1 = D.theta[nb];
    let d = th1 - th0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    const arc = []; for (let i = 0; i <= 40; i++) { const an = th0 + d * (i / 40); arc.push([CX + Math.cos(an) * R0 * 0.62, CY + Math.sin(an) * R0 * 0.62]); }
    g.glowLine(arc, [255, 206, 120], 0.8 * a, 1.6);
    for (const an of [th0, th1]) g.glowLine([[CX, CY], [CX + Math.cos(an) * R0 * 0.95, CY + Math.sin(an) * R0 * 0.95]], [255, 236, 200], 0.4 * a, 1);
  }
  // chart: the angle between successive buds
  const ca = a * seg(t, T0 + 0.6, T0 + 1.6);
  if (ca > 0.003) {
    const X = k => lerp(CH.x0, CH.x1, k / (D.divergence.length - 1)), Y = v => lerp(CH.y1, CH.y0, (v - CH.lo) / (CH.hi - CH.lo));
    g.glowLine([[CH.x0, Y(GOLDEN)], [CH.x1, Y(GOLDEN)]], [255, 200, 110], 0.55 * ca, 1.2);
    const pts = [];
    for (let k = 0; k < Math.min(nb, D.divergence.length); k++) pts.push([X(k), Y(D.divergence[k])]);
    if (pts.length > 1) g.glowLine(pts, [235, 228, 215], 0.75 * ca, 1.5);
    if (pts.length) { const [lx, ly] = pts[pts.length - 1]; g.glow(lx, ly, 12, [255, 236, 200], ca); }
  }
}

export function overlay(ctx, t) {
  const a = win(t, E0 + 0.4, E1, 0.8, 1.0);
  if (a <= 0.003 || !D) return;
  const tau = tauAt(t), nb = Math.floor(tau + 1e-9);
  label(ctx, '生长点 GROWING TIP', CX, CY + R0 + 40, { size: 16, alpha: a * 0.8 * (1 - seg(t, 116, 118)), align: 'center', spacing: 3 });
  const ca = a * seg(t, T0 + 0.6, T0 + 1.6);
  if (ca <= 0.003) return;
  const Y = v => lerp(CH.y1, CH.y0, (v - CH.lo) / (CH.hi - CH.lo));
  label(ctx, '新芽之间的角度', CH.x0, CH.y0 - 64, { size: 22, font: F.zh, weight: 600, color: C.warm, alpha: ca, spacing: 4 });
  label(ctx, 'ANGLE BETWEEN NEW BUDS', CH.x0, CH.y0 - 36, { size: 15, alpha: ca * 0.8, spacing: 4 });
  for (const v of [180, 160, 120]) label(ctx, `${v}°`, CH.x0 - 14, Y(v) + 6, { size: 16, alpha: ca * 0.6, align: 'right' });
  label(ctx, '137.5°', CH.x0 - 14, Y(GOLDEN) + 6, { size: 18, color: C.gold, alpha: ca, align: 'right' });
  ctx.globalAlpha = 0.3 * ca; ctx.strokeStyle = css(C.dim); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(CH.x0, CH.y0); ctx.lineTo(CH.x0, CH.y1); ctx.lineTo(CH.x1, CH.y1); ctx.stroke(); ctx.globalAlpha = 1;
  const k = Math.max(0, Math.min(D.divergence.length - 1, nb - 1));
  if (nb >= 1) {
    const v = D.divergence[k];
    label(ctx, `${v.toFixed(1)}°`, CH.x1, CH.y1 + 78, { size: 56, font: F.math, color: Math.abs(v - GOLDEN) < 1.5 ? C.gold : C.warm, alpha: ca, align: 'right' });
    label(ctx, `第 ${nb + 1} 个 · BUD ${nb + 1}`, CH.x1, CH.y1 + 112, { size: 15, alpha: ca * 0.7, align: 'right', spacing: 2 });
  }
  label(ctx, 'Douady & Couder, 1992', CH.x0, CH.y1 + 112, { size: 15, font: F.en, alpha: ca * 0.6, spacing: 0 });
  void smooth; void easeOut; void easeInOut;
}
