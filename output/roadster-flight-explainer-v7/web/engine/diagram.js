// diagram.js — v7 diagram plates (Canvas2D, drawn by text.js in the type layer over the air-vision void or a veil).
// They exist so the film never draws guessed internals inside the car (SCIENCE_AUDIT A02, A12, A16): each plate is a
// separate, visibly abstract system — an abstract block for the body, engineering symbols for fan / valve / nozzle /
// centre of mass, flowing dots — with a readable header (「功能示意 · 非实车布局」 or 「原理示意 · 长度不按比例」).
// Pure function of (plate, t): no state between frames. Geometry lives here (PLATE_LAYOUT, 1080×1920 units); every
// string and entry time comes from cues.js PLATES. No Chinese literals in this file.
import { E, COLORS, PLATE_FADE, LABEL_IN } from './cues.js';
import { clamp, mix, lin, ramp, easeOut, hash1 } from './math.js';

const ICE = '166, 224, 255', CYAN = '98, 230, 255', GOLD = '255, 196, 107', WHITE = '238, 243, 248', DIMW = '200, 212, 228';
const rgba = (c, a) => `rgba(${c}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`;
const fract = (x) => x - Math.floor(x);

// ------------------------------------------------------------------------------------------------ layout (pure data)
// box: the plate; labels: anchor x, baseline y, alignment, size (px), colour (COLORS key) — used by diagram.js to draw and
// by tools/text_inventory.mjs to check boxes and collisions.
export const PLATE_LAYOUT = {
  P1: { box: { x0: 130, y0: 440, x1: 950, y1: 1100 }, header: { x: 172, y: 500 }, labels: {
    surface: { x: 900, y: 560, align: 'right', size: 28, color: 'dim' },
    body: { x: 282, y: 872, align: 'left', size: 28, color: 'dim' },
    seal: { x: 238, y: 654, align: 'right', size: 28, color: 'white' },
    fan: { x: 668, y: 850, align: 'center', size: 28, color: 'ice' },
    low: { x: 292, y: 655, align: 'left', size: 28, color: 'ice' } } },
  P2: { box: { x0: 130, y0: 440, x1: 950, y1: 1100 }, header: { x: 172, y: 500 }, labels: {
    store: { x: 222, y: 572, align: 'left', size: 28, color: 'cyan' },
    valve: { x: 792, y: 770, align: 'left', size: 28, color: 'white' },
    nozzle: { x: 762, y: 902, align: 'left', size: 28, color: 'white' },
    jet: { x: 800, y: 1012, align: 'left', size: 28, color: 'cyan' },
    thrust: { x: 594, y: 896, align: 'right', size: 30, color: 'cyan' } } },
  P3: { box: { x0: 130, y0: 430, x1: 950, y1: 1080 }, header: { x: 172, y: 490 }, labels: {
    comL: { x: 359, y: 769, align: 'left', size: 26, color: 'white' },
    comR: { x: 769, y: 769, align: 'left', size: 26, color: 'white' },
    none: { x: 335, y: 1022, align: 'center', size: 30, color: 'white' },
    arm: { x: 702, y: 750, align: 'center', size: 26, color: 'gold' },
    some: { x: 745, y: 1022, align: 'center', size: 30, color: 'cyan' } } },
};

// ------------------------------------------------------------------------------------------------ helpers
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function pointAt(pts, d) {          // the point at arc length d along the polyline
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= l || i === pts.length - 1) { const u = l > 0 ? clamp(d / l) : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
    d -= l;
  }
  return pts[pts.length - 1];
}
// stroke a polyline up to fraction k of its length
function strokePart(ctx, pts, k, S) {
  if (k <= 0) return;
  const L = polyLen(pts) * clamp(k);
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * S, pts[0][1] * S);
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d + l >= L) { const u = l > 0 ? (L - d) / l : 0; ctx.lineTo((a[0] + (b[0] - a[0]) * u) * S, (a[1] + (b[1] - a[1]) * u) * S); break; }
    ctx.lineTo(b[0] * S, b[1] * S);
    d += l;
  }
  ctx.stroke();
}
function glowStroke(ctx, color, a, w, S, glow = 14) {
  ctx.strokeStyle = rgba(color, a);
  ctx.lineWidth = w * S;
  ctx.shadowColor = rgba(color, 0.65 * a);
  ctx.shadowBlur = glow * S;
}
function dot(ctx, x, y, r, color, a, S) {
  if (a <= 0.003) return;
  ctx.fillStyle = rgba(color, a);
  ctx.beginPath(); ctx.arc(x * S, y * S, r * S, 0, Math.PI * 2); ctx.fill();
}
// a straight arrow from (x0, y0) to (x1, y1), head at the end; k = drawn fraction
function arrow(ctx, x0, y0, x1, y1, k, color, a, w, S, head = 22) {
  if (k <= 0 || a <= 0) return;
  const xe = x0 + (x1 - x0) * k, ye = y0 + (y1 - y0) * k;
  const L = Math.hypot(xe - x0, ye - y0);
  if (L < 1) return;
  const ux = (xe - x0) / L, uy = (ye - y0) / L, h = Math.min(head, L * 0.6);
  glowStroke(ctx, color, a, w, S);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0 * S, y0 * S); ctx.lineTo((xe - ux * h * 0.8) * S, (ye - uy * h * 0.8) * S); ctx.stroke();
  ctx.fillStyle = rgba(color, a);
  ctx.beginPath();
  ctx.moveTo(xe * S, ye * S);
  ctx.lineTo((xe - ux * h - uy * h * 0.55) * S, (ye - uy * h + ux * h * 0.55) * S);
  ctx.lineTo((xe - ux * h + uy * h * 0.55) * S, (ye - uy * h - ux * h * 0.55) * S);
  ctx.closePath(); ctx.fill();
}
function dashed(ctx, x0, y0, x1, y1, k, color, a, S) {
  if (k <= 0 || a <= 0) return;
  ctx.save();
  ctx.setLineDash([10 * S, 9 * S]);
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 2 * S; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(x0 * S, y0 * S); ctx.lineTo((x0 + (x1 - x0) * k) * S, (y0 + (y1 - y0) * k) * S); ctx.stroke();
  ctx.restore();
}
function roundRect(ctx, x0, y0, x1, y1, r, S) {
  ctx.beginPath();
  ctx.moveTo((x0 + r) * S, y0 * S);
  ctx.arcTo(x1 * S, y0 * S, x1 * S, y1 * S, r * S); ctx.arcTo(x1 * S, y1 * S, x0 * S, y1 * S, r * S);
  ctx.arcTo(x0 * S, y1 * S, x0 * S, y0 * S, r * S); ctx.arcTo(x0 * S, y0 * S, x1 * S, y0 * S, r * S);
  ctx.closePath();
}

// ------------------------------------------------------------------------------------------------ the plate frame
function frame(ctx, L, header, a, t, from, S, font) {
  const b = L.box;
  ctx.save();
  // dark glass
  roundRect(ctx, b.x0, b.y0, b.x1, b.y1, 20, S);
  ctx.fillStyle = `rgba(3, 8, 16, ${(0.72 * a).toFixed(4)})`;
  ctx.fill();
  ctx.strokeStyle = rgba(ICE, 0.22 * a); ctx.lineWidth = 1.5 * S; ctx.stroke();
  // corner ticks
  ctx.strokeStyle = rgba(ICE, 0.8 * a); ctx.lineWidth = 2.5 * S; ctx.lineCap = 'round';
  const c = 30;
  for (const [x, y, dx, dy] of [[b.x0, b.y0, 1, 1], [b.x1, b.y0, -1, 1], [b.x0, b.y1, 1, -1], [b.x1, b.y1, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo((x + dx * 8) * S, (y + dy * (8 + c)) * S); ctx.lineTo((x + dx * 8) * S, (y + dy * 8) * S); ctx.lineTo((x + dx * (8 + c)) * S, (y + dy * 8) * S); ctx.stroke();
  }
  // header: a square bullet, the label in readable type, a hairline under it
  const h = L.header;
  const ha = a * clamp((t - from - 0.05) / 0.25);
  ctx.fillStyle = rgba(ICE, ha);
  ctx.fillRect((h.x - 22) * S, (h.y - 20) * S, 11 * S, 11 * S);
  ctx.font = font(700, 34);
  ctx.letterSpacing = `${4 * S}px`;
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba(ICE, ha);
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8 * S;
  ctx.fillText(header, h.x * S, h.y * S);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(ICE, 0.22 * a); ctx.lineWidth = 1 * S;
  ctx.beginPath(); ctx.moveTo((b.x0 + 22) * S, (h.y + 22) * S); ctx.lineTo((b.x1 - 22) * S, (h.y + 22) * S); ctx.stroke();
  ctx.restore();
}

function label(ctx, L, k, text, at, a, t, S, font) {
  const l = L.labels[k];
  const e = easeOut(clamp((t - at) / LABEL_IN), 2.5);
  const al = a * e;
  if (al <= 0.003) return;
  ctx.save();
  ctx.font = font(l.size >= 30 ? 700 : 500, l.size);
  ctx.letterSpacing = `${2 * S}px`;
  ctx.textAlign = l.align;
  ctx.fillStyle = COLORS[l.color] || l.color;
  ctx.globalAlpha = al;
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 10 * S; ctx.shadowOffsetY = 2 * S;
  ctx.fillText(text, l.x * S, (l.y + 8 * (1 - e)) * S);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ plate 1: fan + seal
// Surface on top (as on the ceiling); an abstract body block below it; the gap between them. Ambient air in the gap is
// drawn out through an inlet → duct → generic fan symbol → outlet; the seals limit what leaks back in, so the fan has to
// keep running; a thin residual air stays (lower pressure, never empty space). Late: gold ticks of the outside pressure
// on the body, small ice ticks for the lower gap pressure (qualitative: outside higher, gap lower — no magnitudes).
const GAP = { x0: 250, x1: 830, y0: 614, y1: 674 }, BODY = { x0: 250, y0: 674, x1: 830, y1: 896 };
const INLET = { x0: 522, x1: 558 }, DUCT_Y = 772, FAN = [668, 772], OUT_X = 925;
const PATH_L = [[272, 644], [520, 644], [540, 664], [540, DUCT_Y], [FAN[0], DUCT_Y], [BODY.x1, DUCT_Y], [OUT_X, DUCT_Y]];
const PATH_R = [[808, 644], [560, 644], [540, 664], [540, DUCT_Y], [FAN[0], DUCT_Y], [BODY.x1, DUCT_Y], [OUT_X, DUCT_Y]];
function plateSeal(ctx, P, a, t, S, font) {
  const L = PLATE_LAYOUT.P1, f = P.from;
  const kSurf = ramp(t, f + 0.25, f + 0.55), kBody = ramp(t, f + 0.45, f + 0.8), kSeal = ramp(t, E.sealOn - 0.1, E.sealOn + 0.2);
  const kDuct = ramp(t, E.fanOn - 0.2, E.fanOn + 0.2), kFan = ramp(t, E.fanOn - 0.05, E.fanOn + 0.25);
  const evac = ramp(t, E.fanOn + 0.1, E.lowP + 0.2);                 // ambient → low pressure in the gap
  const kLeak = ramp(t, E.leakOn, E.leakOn + 0.4), kTicks = ramp(t, E.leakOn + 0.35, E.leakOn + 0.8);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the surface: a bar with hatching on its far side
  if (kSurf > 0) {
    ctx.fillStyle = rgba(DIMW, 0.55 * a * kSurf);
    ctx.fillRect(180 * S, 604 * S, (720 * kSurf) * S, 10 * S);
    ctx.strokeStyle = rgba(DIMW, 0.35 * a * kSurf); ctx.lineWidth = 2 * S; ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let x = 186; x < 180 + 720 * kSurf - 20; x += 24) { ctx.moveTo(x * S, 602 * S); ctx.lineTo((x + 22) * S, 574 * S); }
    ctx.stroke();
  }
  // the gap: tinted by how far it has been pumped down (ambient = pale, low = ice)
  if (kBody > 0) {
    const g = ctx.createLinearGradient(0, GAP.y0 * S, 0, GAP.y1 * S);
    g.addColorStop(0, rgba(ICE, a * kBody * mix(0.05, 0.16, evac)));
    g.addColorStop(1, rgba(ICE, a * kBody * mix(0.03, 0.1, evac)));
    ctx.fillStyle = g;
    ctx.fillRect(GAP.x0 * S, GAP.y0 * S, (GAP.x1 - GAP.x0) * S, (GAP.y1 - GAP.y0) * S);
  }
  // the body: an abstract rounded block (deliberately not car-shaped), with the inlet opening in its gap-facing face
  if (kBody > 0) {
    roundRect(ctx, BODY.x0, BODY.y0, BODY.x1, BODY.y1, 44, S);
    ctx.fillStyle = `rgba(9, 20, 36, ${(0.92 * a * kBody).toFixed(4)})`;
    ctx.fill();
    const r = 44;
    glowStroke(ctx, WHITE, 0.85 * a, 2.5, S, 10);
    // left part of the top edge → around the block → right part of the top edge (the inlet stays open)
    ctx.beginPath();
    ctx.moveTo(INLET.x0 * S, BODY.y0 * S);
    ctx.lineTo((BODY.x0 + r) * S, BODY.y0 * S);
    ctx.arcTo(BODY.x0 * S, BODY.y0 * S, BODY.x0 * S, BODY.y1 * S, r * S);
    ctx.arcTo(BODY.x0 * S, BODY.y1 * S, BODY.x1 * S, BODY.y1 * S, r * S);
    ctx.arcTo(BODY.x1 * S, BODY.y1 * S, BODY.x1 * S, BODY.y0 * S, r * S);
    ctx.lineTo(BODY.x1 * S, (DUCT_Y + 18) * S);
    ctx.moveTo(BODY.x1 * S, (DUCT_Y - 18) * S);
    ctx.arcTo(BODY.x1 * S, BODY.y0 * S, BODY.x0 * S, BODY.y0 * S, r * S);
    ctx.lineTo(INLET.x1 * S, BODY.y0 * S);
    ctx.globalAlpha = kBody;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // the duct and the fan symbol
  if (kDuct > 0) {
    glowStroke(ctx, ICE, 0.75 * a, 2, S, 8);
    strokePart(ctx, [[INLET.x0, BODY.y0], [INLET.x0, DUCT_Y + 18], [BODY.x1, DUCT_Y + 18]], kDuct, S);
    strokePart(ctx, [[INLET.x1, BODY.y0], [INLET.x1, DUCT_Y - 18], [BODY.x1, DUCT_Y - 18]], kDuct, S);
  }
  if (kFan > 0) {
    const [fx, fy] = FAN;
    ctx.fillStyle = `rgba(9, 20, 36, ${(a * kFan).toFixed(4)})`;
    ctx.beginPath(); ctx.arc(fx * S, fy * S, 34 * S, 0, Math.PI * 2); ctx.fill();
    glowStroke(ctx, ICE, 0.95 * a * kFan, 2.5, S, 12);
    ctx.beginPath(); ctx.arc(fx * S, fy * S, 34 * S, 0, Math.PI * 2); ctx.stroke();
    const spin = (t - E.fanOn) > 0 ? 2 * Math.PI * (1.6 * (t - E.fanOn) - 0.8 * (1 - Math.exp(-(t - E.fanOn) / 0.5))) : 0;
    ctx.fillStyle = rgba(ICE, 0.85 * a * kFan);
    for (let k = 0; k < 4; k++) {
      const an = spin + k * Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse((fx + Math.cos(an) * 15) * S, (fy + Math.sin(an) * 15) * S, 14 * S, 6 * S, an + 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    dot(ctx, fx, fy, 5, WHITE, a * kFan, S);
  }
  // seals at both ends of the gap: soft lips bridging body and surface
  if (kSeal > 0) {
    for (const x of [GAP.x0 + 2, GAP.x1 - 20]) {
      roundRect(ctx, x, GAP.y0 + 2 + (1 - kSeal) * 50, x + 18, GAP.y1, 6, S);
      ctx.fillStyle = rgba(WHITE, 0.8 * a * kSeal);
      ctx.shadowColor = rgba(WHITE, 0.4 * a); ctx.shadowBlur = 10 * S;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba('120, 140, 165', 0.9 * a * kSeal); ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      for (const dx of [5, 9, 13]) { ctx.moveTo((x + dx) * S, (GAP.y0 + 8) * S); ctx.lineTo((x + dx) * S, (GAP.y1 - 6) * S); }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  // the air in the gap: ambient dots; once the fan runs most are drawn out (inlet → duct → fan → outlet); a residual
  // share never leaves (lower pressure with air still in it, not empty space)
  if (kBody > 0) {
    const N = 84, RESID = 0.22;
    for (let i = 0; i < N; i++) {
      const hx = hash1(i, 3), hy = hash1(i, 5), hs = hash1(i, 7);
      const x0 = mix(GAP.x0 + 26, GAP.x1 - 26, hx), y0 = mix(GAP.y0 + 8, GAP.y1 - 8, hy);
      const jx = 3 * Math.sin(t * 7 + i * 1.7), jy = 2.5 * Math.sin(t * 9 + i * 2.3);
      const stays = hs < RESID;
      const tDep = mix(E.fanOn + 0.1, E.lowP, hash1(i, 11));
      if (stays || t < tDep) { dot(ctx, x0 + jx, y0 + jy, 2.6, WHITE, 0.75 * a * kBody, S); continue; }
      // departing: along the gap to the inlet, then down the duct and out
      const path = x0 < 540 ? [[x0, y0], ...PATH_L.slice(2)] : [[x0, y0], ...PATH_R.slice(2)];
      const d = (t - tDep) * 330 * (0.85 + 0.3 * hash1(i, 13));
      const Lp = polyLen(path);
      if (d > Lp) continue;
      const p = pointAt(path, d);
      dot(ctx, p[0], p[1], 2.6, WHITE, 0.8 * a * (1 - lin(d, Lp - 90, Lp)), S);
    }
    // steady through-flow once pumped down: the fan keeps moving air that leaks in past the seals
    const flow = ramp(t, E.lowP - 0.3, E.lowP + 0.3);
    if (flow > 0) {
      for (let i = 0; i < 26; i++) {
        const path = i % 2 ? PATH_L : PATH_R, Lp = polyLen(path);
        const d = fract(hash1(i, 17) + (t - E.lowP) * 0.32) * Lp;
        dot(ctx, pointAt(path, d)[0], pointAt(path, d)[1], 2.3, ICE, 0.7 * a * flow * (1 - lin(d, Lp - 90, Lp)), S);
      }
    }
    // leakage: a trickle from outside past each seal into the gap
    if (kLeak > 0) {
      for (let i = 0; i < 10; i++) {
        const left = i % 2 === 0, ph = fract(hash1(i, 19) + (t - E.leakOn) * 0.55);
        const y = 630 + 28 * hash1(i, 23);
        const x = left ? mix(196, 300, ph) : mix(884, 780, ph);
        dot(ctx, x, y, 2.2, ICE, 0.75 * a * kLeak * Math.sin(Math.PI * ph), S);
      }
    }
  }
  // the outlet: air leaves the body
  if (kDuct > 0.6) arrow(ctx, BODY.x1 + 8, DUCT_Y, OUT_X, DUCT_Y, ramp(t, E.fanOn, E.fanOn + 0.4), ICE, 0.6 * a, 2.5, S, 18);
  // pressure ticks: outside (gold, larger) on the bottom and sides; inside the gap (ice, small) — qualitative only
  if (kTicks > 0) {
    for (const x of [330, 435, 540, 645, 750]) arrow(ctx, x, 962, x, 904, kTicks, GOLD, 0.85 * a, 3, S, 16);
    for (const y of [732, 846]) arrow(ctx, 186, y, 240, y, kTicks, GOLD, 0.85 * a, 3, S, 16);
    for (const y of [712, 850]) arrow(ctx, 894, y, 840, y, kTicks, GOLD, 0.85 * a, 3, S, 16);
    for (const x of [606, 700, 780]) arrow(ctx, x, 648, x, 670, kTicks, ICE, 0.75 * a, 2, S, 8);
  }
  for (const l of P.labels) label(ctx, L, l.k, l.text, l.at, a, t, S, font);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ plate 2: stored gas
// A crowded reservoir → a control valve (symbol + actuator box) → a nozzle (converging–diverging symbol). When the valve
// opens, gas flows and leaves downward; the cyan thrust arrow points up. The reservoir thins a little (finite).
const TANK = { x0: 220, y0: 590, x1: 600, y1: 710 }, VX = 700, VALVE_Y = 760, NOZ = { y0: 850, yt: 874, y1: 920 };
function plateGas(ctx, P, a, t, S, font) {
  const L = PLATE_LAYOUT.P2, f = P.from;
  const kTank = ramp(t, f + 0.15, f + 0.45), kPipe = ramp(t, f + 0.5, f + 0.8), kNoz = ramp(t, f + 0.75, f + 1.0);
  const open = ramp(t, E.valve - 0.1, E.valve + 0.15), kJet = ramp(t, E.valve + 0.05, E.valve + 0.4), kThrust = ramp(t, E.valve + 0.2, E.valve + 0.5);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // reservoir capsule
  if (kTank > 0) {
    roundRect(ctx, TANK.x0, TANK.y0, TANK.x1, TANK.y1, 60, S);
    ctx.fillStyle = `rgba(8, 22, 34, ${(0.9 * a * kTank).toFixed(4)})`;
    ctx.fill();
    glowStroke(ctx, CYAN, 0.9 * a * kTank, 2.5, S, 12);
    ctx.stroke();
    // crowded, fast-jittering gas; a little thinner once the valve has been open a while (finite reserve)
    const N = 230, keep = 1 - 0.16 * lin(t, E.valve, E.cut1011);
    const step = Math.floor(t * 24);
    for (let i = 0; i < N; i++) {
      if (hash1(i, 31) > keep) continue;
      const hx = hash1(i, 33), hy = hash1(i, 35);
      let x = mix(TANK.x0 + 22, TANK.x1 - 22, hx), y = mix(TANK.y0 + 14, TANK.y1 - 14, hy);
      const ex = Math.max(0, Math.abs(x - (TANK.x0 + TANK.x1) / 2) - ((TANK.x1 - TANK.x0) / 2 - 60));
      if (ex > 0) { const r = Math.sqrt(Math.max(0, 52 * 52 - ex * ex)); y = mix(660 - r, 660 + r, hy); }
      x += 6 * (hash1(i * 7 + step, 37) - 0.5); y += 6 * (hash1(i * 11 + step, 39) - 0.5);
      dot(ctx, x, y, 2.2, CYAN, 0.85 * a * kTank, S);
    }
  }
  // pipe, valve, pipe, nozzle
  const pipe1 = [[TANK.x1, 650], [VX, 650], [VX, VALVE_Y - 24]], pipe2 = [[VX, VALVE_Y + 24], [VX, NOZ.y0]];
  if (kPipe > 0) {
    glowStroke(ctx, CYAN, 0.8 * a, 3, S, 8);
    strokePart(ctx, pipe1, kPipe, S);
    strokePart(ctx, pipe2, kPipe, S);
    // valve: bow-tie symbol, filled when open; an actuator stem and box to the side
    ctx.beginPath();
    ctx.moveTo((VX - 24) * S, (VALVE_Y - 24) * S); ctx.lineTo((VX + 24) * S, (VALVE_Y - 24) * S); ctx.lineTo(VX * S, VALVE_Y * S); ctx.closePath();
    ctx.moveTo((VX - 24) * S, (VALVE_Y + 24) * S); ctx.lineTo((VX + 24) * S, (VALVE_Y + 24) * S); ctx.lineTo(VX * S, VALVE_Y * S); ctx.closePath();
    ctx.fillStyle = rgba(CYAN, a * kPipe * mix(0.08, 0.55, open));
    ctx.fill();
    glowStroke(ctx, WHITE, 0.9 * a * kPipe, 2.5, S, 8);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VX * S, VALVE_Y * S); ctx.lineTo((VX + 44) * S, VALVE_Y * S); ctx.stroke();
    roundRect(ctx, VX + 44, VALVE_Y - 14, VX + 76, VALVE_Y + 14, 4, S);
    ctx.stroke();
  }
  if (kNoz > 0) {
    glowStroke(ctx, WHITE, 0.9 * a * kNoz, 2.5, S, 8);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo((VX + sgn * 20) * S, NOZ.y0 * S); ctx.lineTo((VX + sgn * 8) * S, NOZ.yt * S); ctx.lineTo((VX + sgn * 32) * S, NOZ.y1 * S);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  // flow through the open valve, and the exhaust leaving the nozzle downward (no flame: cold, high-pressure gas)
  if (open > 0) {
    const path = [[TANK.x1 - 10, 650], [VX, 650], [VX, NOZ.y1]], Lp = polyLen(path);
    for (let i = 0; i < 16; i++) {
      const d = fract(hash1(i, 41) + (t - E.valve) * 1.1) * Lp;
      const p = pointAt(path, d);
      dot(ctx, p[0], p[1], 2.4, CYAN, 0.85 * a * open, S);
    }
  }
  if (kJet > 0) {
    for (let i = 0; i < 70; i++) {
      const u = fract(hash1(i, 43) + (t - E.valve) * 1.3);
      const spread = (hash1(i, 47) - 0.5) * 2;
      const y = NOZ.y1 + 6 + u * 150, x = VX + spread * (22 + 70 * u);
      dot(ctx, x, y, 2.2 + 2.5 * u, CYAN, 0.75 * a * kJet * (1 - u) * (0.6 + 0.4 * hash1(i, 53)), S);
    }
    arrow(ctx, 782, 966, 782, 1030, kJet, CYAN, 0.75 * a, 2.5, S, 14);
  }
  // the reaction on the vehicle: thrust up, opposite to the exhaust momentum
  if (kThrust > 0) arrow(ctx, 620, 940, 620, 800, kThrust, CYAN, a, 7, S, 30);
  for (const l of P.labels) label(ctx, L, l.k, l.text, l.at, a, t, S, font);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ plate 3: torque
// Two identical abstract bodies with the nozzle at the same off-centre spot. Left: the thrust points along the line
// through the centre of mass → no torque about it. Right: the thrust line misses the centre of mass → a lever arm and a
// torque (clockwise arc). A general r×F schematic: not the real car's COM, nozzles, forces or controller.
function comMarker(ctx, x, y, a, S) {
  ctx.save();
  ctx.strokeStyle = rgba(WHITE, a); ctx.lineWidth = 2.5 * S; ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.arc(x * S, y * S, 13 * S, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = rgba(WHITE, a);
  ctx.beginPath(); ctx.moveTo(x * S, y * S); ctx.arc(x * S, y * S, 13 * S, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x * S, y * S); ctx.arc(x * S, y * S, 13 * S, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function nozzleMark(ctx, x, y, dx, dy, a, S) {     // a small nozzle at (x, y) whose exhaust leaves along (−dx, −dy)
  const px = -dy, py = dx;
  ctx.save();
  glowStroke(ctx, WHITE, a, 2.5, S, 6);
  ctx.beginPath();
  ctx.moveTo((x + px * 7) * S, (y + py * 7) * S); ctx.lineTo((x - dx * 18 + px * 13) * S, (y - dy * 18 + py * 13) * S);
  ctx.moveTo((x - px * 7) * S, (y - py * 7) * S); ctx.lineTo((x - dx * 18 - px * 13) * S, (y - dy * 18 - py * 13) * S);
  ctx.stroke();
  ctx.restore();
}
function exhaust(ctx, x, y, dx, dy, a, t, S, seed) {
  for (let i = 0; i < 26; i++) {
    const u = fract(hash1(i, seed) + t * 1.4), sp = (hash1(i, seed + 2) - 0.5) * 2;
    const px = -dy, py = dx;
    const qx = x - dx * (22 + 110 * u) + px * sp * (6 + 34 * u), qy = y - dy * (22 + 110 * u) + py * sp * (6 + 34 * u);
    dot(ctx, qx, qy, 2 + 2 * u, CYAN, 0.7 * a * (1 - u), S);
  }
}
function plateTorque(ctx, P, a, t, S, font) {
  const L = PLATE_LAYOUT.P3, f = E.kfOff;
  const kBody = ramp(t, f + 0.3, f + 0.6);
  const kL = ramp(t, f + 0.6, f + 0.9), kLd = ramp(t, f + 0.75, f + 1.1);
  const kR = ramp(t, f + 1.1, f + 1.4), kRd = ramp(t, f + 1.2, f + 1.5), kArm = ramp(t, f + 1.35, f + 1.6), kArc = ramp(t, f + 1.6, f + 2.0);
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // the divider between the two cases
  ctx.strokeStyle = rgba(ICE, 0.18 * a * kBody); ctx.lineWidth = 1.5 * S;
  ctx.beginPath(); ctx.moveTo(540 * S, 560 * S); ctx.lineTo(540 * S, 1040 * S); ctx.stroke();
  const panels = [{ cx: 335, cy: 760 }, { cx: 745, cy: 760 }];
  for (const p of panels) {
    if (kBody <= 0) break;
    roundRect(ctx, p.cx - 120, p.cy - 55, p.cx + 120, p.cy + 55, 26, S);
    ctx.fillStyle = `rgba(9, 20, 36, ${(0.92 * a * kBody).toFixed(4)})`;
    ctx.fill();
    glowStroke(ctx, WHITE, 0.85 * a * kBody, 2.5, S, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    comMarker(ctx, p.cx, p.cy, a * kBody, S);
  }
  // left: the thrust points through the centre of mass
  {
    const nx = 249, ny = 815, cx = 335, cy = 760;
    const dl = Math.hypot(cx - nx, cy - ny), ux = (cx - nx) / dl, uy = (cy - ny) / dl;
    if (kBody > 0) nozzleMark(ctx, nx, ny, ux, uy, a * kBody, S);
    if (kL > 0) { exhaust(ctx, nx, ny, ux, uy, a * kL, t, S, 61); arrow(ctx, nx, ny, nx + ux * 74, ny + uy * 74, kL, CYAN, a, 6, S, 22); }
    dashed(ctx, nx - ux * 70, ny - uy * 70, nx + ux * 230, ny + uy * 230, kLd, CYAN, 0.75 * a, S);
  }
  // right: the same nozzle, thrust straight up; its line misses the centre of mass
  {
    const nx = 659, ny = 815, cx = 745, cy = 760;
    if (kBody > 0) nozzleMark(ctx, nx, ny, 0, -1, a * kBody, S);
    if (kR > 0) { exhaust(ctx, nx, ny, 0, -1, a * kR, t, S, 71); arrow(ctx, nx, ny, nx, ny - 80, kR, CYAN, a, 6, S, 22); }
    dashed(ctx, nx, 930, nx, 600, kRd, CYAN, 0.75 * a, S);
    if (kArm > 0) {
      ctx.save();
      glowStroke(ctx, GOLD, a * kArm, 3, S, 8);
      ctx.beginPath(); ctx.moveTo(cx * S, cy * S); ctx.lineTo((cx - (cx - nx) * kArm) * S, cy * S); ctx.stroke();
      ctx.shadowBlur = 0; ctx.lineWidth = 2 * S;
      ctx.beginPath(); ctx.moveTo((nx + 12) * S, cy * S); ctx.lineTo((nx + 12) * S, (cy - 12) * S); ctx.lineTo(nx * S, (cy - 12) * S); ctx.stroke();
      ctx.restore();
    }
    if (kArc > 0) {               // clockwise torque arc over the body, arrowhead at its end
      const R = 150, a0 = 215 * Math.PI / 180, a1 = mix(a0, 325 * Math.PI / 180, kArc);
      ctx.save();
      glowStroke(ctx, CYAN, a, 4, S, 12);
      ctx.beginPath(); ctx.arc(cx * S, cy * S, R * S, a0, a1 - 0.06); ctx.stroke();
      const hx = cx + Math.cos(a1) * R, hy = cy + Math.sin(a1) * R, tx = -Math.sin(a1), ty = Math.cos(a1);
      ctx.fillStyle = rgba(CYAN, a);
      ctx.beginPath();
      ctx.moveTo((hx + tx * 16) * S, (hy + ty * 16) * S);
      ctx.lineTo((hx - tx * 6 + Math.cos(a1) * 11) * S, (hy - ty * 6 + Math.sin(a1) * 11) * S);
      ctx.lineTo((hx - tx * 6 - Math.cos(a1) * 11) * S, (hy - ty * 6 - Math.sin(a1) * 11) * S);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  for (const l of P.labels) label(ctx, L, l.k, l.text, l.at, a, t, S, font);
  ctx.restore();
}

// ------------------------------------------------------------------------------------------------ entry point
export function plateAlpha(P, t) { return Math.min(lin(t, P.from, P.from + PLATE_FADE), 1 - lin(t, P.to - PLATE_FADE, P.to)); }

export function drawPlate(ctx, P, t, S, font) {
  const a = plateAlpha(P, t);
  if (a <= 0) return;
  frame(ctx, PLATE_LAYOUT[P.id], P.header, a, t, P.from, S, font);
  if (P.kind === 'seal') plateSeal(ctx, P, a, t, S, font);
  else if (P.kind === 'gas') plateGas(ctx, P, a, t, S, font);
  else if (P.kind === 'torque') plateTorque(ctx, P, a, t, S, font);
}
