// brain.js — a coronal (front-facing) SCHEMATIC slice through the anterior striatum, drawn with paths. Not to scale.
// Anatomy kept honest: the caudate head lies lateral to the frontal horn of the lateral ventricle; the internal capsule
// separates it from the putamen further lateral; the nucleus accumbens lies ventrally where caudate and putamen meet
// beneath the capsule. A grey-matter ribbon and sulci make it read as a brain slice. Units: x ∈ [−1, 1] (right = viewer's
// right), y down; drawn at centre (cx, cy), scale s px/unit.
import { C } from './timeline.js';
import { clamp } from './lib.js';

const RIGHT_OUTLINE = [   // the right half of the cerebrum, top midline → bottom midline (start point, then cubic segments)
  [0.0, -0.80], [0.30, -0.82, 0.62, -0.74, 0.84, -0.50], [0.98, -0.30, 0.99, 0.02, 0.90, 0.18],
  [0.84, 0.24, 0.76, 0.25, 0.74, 0.27], [0.86, 0.34, 0.90, 0.56, 0.78, 0.68], [0.66, 0.78, 0.48, 0.72, 0.42, 0.56],
  [0.36, 0.44, 0.22, 0.42, 0.12, 0.50], [0.07, 0.54, 0.02, 0.52, 0.0, 0.50],
];
// surface points (right half) where a sulcus starts, with its depth (units)
const SULCI = [[0.22, -0.80, 0.14], [0.45, -0.76, 0.16], [0.66, -0.64, 0.15], [0.82, -0.46, 0.15], [0.93, -0.24, 0.14], [0.96, -0.02, 0.13],
  [0.84, 0.40, 0.12], [0.84, 0.56, 0.11], [0.70, 0.70, 0.10], [0.52, 0.68, 0.09]];

function outline(ctx, X, Y) {
  const R = RIGHT_OUTLINE;
  ctx.beginPath(); ctx.moveTo(X(R[0][0]), Y(R[0][1]));
  for (let i = 1; i < R.length; i++) ctx.bezierCurveTo(X(R[i][0]), Y(R[i][1]), X(R[i][2]), Y(R[i][3]), X(R[i][4]), Y(R[i][5]));
  for (let i = R.length - 1; i >= 1; i--) {   // mirrored, back up the left side
    const p = R[i], q = R[i - 1];
    ctx.bezierCurveTo(X(-p[2]), Y(p[3]), X(-p[0]), Y(p[1]), X(-(q.length === 2 ? q[0] : q[4])), Y(q.length === 2 ? q[1] : q[5]));
  }
  ctx.closePath();
}
function blob(ctx, X, Y, cx, cy, rx, ry, rot) {
  ctx.beginPath(); ctx.ellipse(X(cx), Y(cy), Math.abs(X(rx) - X(0)), Math.abs(Y(ry) - Y(0)), rot, 0, Math.PI * 2);
}
function glow(ctx, x, y, r, color, a) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}

// opts: { cx, cy, s, alpha, caudate 0..1, nacc 0..1, labels 0..1, ring 0..1 (PET detector ring), t }
export function drawBrain(ctx, o) {
  const { cx, cy, s } = o, a = o.alpha ?? 1;
  if (a <= 0.01) return;
  const X = (u) => cx + u * s, Y = (v) => cy + v * s;
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
  // PET ring: a circle of detector blocks, slowly turning, a highlight sweeping round
  if ((o.ring ?? 0) > 0.01) {
    const n = 44, R0 = 1.22 * s, R1 = 1.36 * s;
    ctx.save(); ctx.globalAlpha = a * o.ring;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2 + (o.t ?? 0) * 0.15;
      const lit = 0.35 + 0.65 * Math.max(0, Math.cos(th - (o.t ?? 0) * 2.2)) ** 6;
      ctx.save(); ctx.translate(cx + Math.cos(th) * (R0 + R1) / 2, cy + Math.sin(th) * (R0 + R1) / 2); ctx.rotate(th);
      ctx.fillStyle = `rgba(150,215,255,${0.10 + 0.35 * lit})`; ctx.strokeStyle = `rgba(190,235,255,${0.25 + 0.5 * lit})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(-(R1 - R0) / 2, -s * 0.06, R1 - R0, s * 0.12, 4); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  // cerebrum: grey-matter ribbon (outline fill) over white matter (the outline shrunk 0.86 about the centre)
  outline(ctx, X, Y);
  ctx.fillStyle = 'rgba(70,84,112,0.62)'; ctx.fill();
  ctx.strokeStyle = 'rgba(205,222,255,0.6)'; ctx.lineWidth = Math.max(2, s * 0.012); ctx.stroke();
  const Xi = (u) => cx + u * s * 0.86, Yi = (v) => cy + (v * 0.86 - 0.02) * s;
  outline(ctx, Xi, Yi); ctx.fillStyle = 'rgba(28,36,54,0.92)'; ctx.fill();
  // sulci: short folds from the surface inward
  ctx.strokeStyle = 'rgba(205,222,255,0.30)'; ctx.lineWidth = Math.max(1.5, s * 0.009); ctx.lineCap = 'round';
  for (const [u, v, depth] of SULCI) for (const sg of [1, -1]) {
    const ny = v + 0.05, L = Math.hypot(u, ny) || 1;
    ctx.beginPath(); ctx.moveTo(X(sg * u), Y(v));
    ctx.quadraticCurveTo(X(sg * (u - (u / L) * depth * 0.5 + 0.02)), Y(v - (ny / L) * depth * 0.5), X(sg * (u - (u / L) * depth)), Y(v - (ny / L) * depth)); ctx.stroke();
  }
  // interhemispheric fissure, corpus callosum
  ctx.strokeStyle = 'rgba(205,222,255,0.45)'; ctx.lineWidth = Math.max(1.5, s * 0.01);
  ctx.beginPath(); ctx.moveTo(X(0), Y(-0.80)); ctx.lineTo(X(0), Y(-0.36)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(-0.40), Y(-0.30)); ctx.quadraticCurveTo(X(0), Y(-0.46), X(0.40), Y(-0.30));
  ctx.lineWidth = Math.max(4, s * 0.05); ctx.strokeStyle = 'rgba(225,235,255,0.20)'; ctx.stroke();
  // lateral ventricles: frontal horns, narrow slits beside the midline
  ctx.fillStyle = 'rgba(4,6,12,0.95)'; ctx.strokeStyle = 'rgba(205,222,255,0.3)'; ctx.lineWidth = 1.5;
  for (const sg of [1, -1]) {
    ctx.beginPath(); ctx.moveTo(X(sg * 0.025), Y(-0.33)); ctx.quadraticCurveTo(X(sg * 0.13), Y(-0.34), X(sg * 0.15), Y(-0.26));
    ctx.quadraticCurveTo(X(sg * 0.12), Y(-0.16), X(sg * 0.06), Y(-0.08)); ctx.lineTo(X(sg * 0.025), Y(-0.10)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  const cau = clamp(o.caudate ?? 0), na = clamp(o.nacc ?? 0);
  for (const sg of [1, -1]) {
    // internal capsule: a pale band of white matter between caudate and putamen
    ctx.beginPath(); ctx.moveTo(X(sg * 0.22), Y(-0.36)); ctx.quadraticCurveTo(X(sg * 0.34), Y(-0.12), X(sg * 0.36), Y(0.10));
    ctx.lineWidth = Math.max(4, s * 0.055); ctx.strokeStyle = 'rgba(225,235,255,0.13)'; ctx.stroke();
    // putamen (neutral): a lens lateral to the capsule
    blob(ctx, X, Y, sg * 0.50, -0.02, 0.10, 0.23, sg * 0.22);
    ctx.fillStyle = 'rgba(126,136,158,0.32)'; ctx.fill(); ctx.strokeStyle = 'rgba(205,218,242,0.38)'; ctx.lineWidth = 1.5; ctx.stroke();
    // caudate head: a comma hugging the lateral wall of the frontal horn
    ctx.beginPath(); ctx.moveTo(X(sg * 0.15), Y(-0.33)); ctx.bezierCurveTo(X(sg * 0.24), Y(-0.40), X(sg * 0.33), Y(-0.30), X(sg * 0.30), Y(-0.17));
    ctx.bezierCurveTo(X(sg * 0.28), Y(-0.06), X(sg * 0.22), Y(0.02), X(sg * 0.17), Y(0.04)); ctx.bezierCurveTo(X(sg * 0.15), Y(-0.04), X(sg * 0.17), Y(-0.20), X(sg * 0.15), Y(-0.33)); ctx.closePath();
    ctx.fillStyle = cau > 0.02 ? `rgba(70,227,255,${0.25 + 0.6 * cau})` : 'rgba(126,136,158,0.34)'; ctx.fill();
    ctx.strokeStyle = cau > 0.02 ? `rgba(160,240,255,${0.5 + 0.5 * cau})` : 'rgba(205,218,242,0.42)'; ctx.lineWidth = 2; ctx.stroke();
    // nucleus accumbens: ventral, where caudate and putamen meet beneath the capsule
    blob(ctx, X, Y, sg * 0.25, 0.12, 0.10, 0.065, sg * -0.15);
    ctx.fillStyle = na > 0.02 ? `rgba(255,92,126,${0.25 + 0.65 * na})` : 'rgba(126,136,158,0.34)'; ctx.fill();
    ctx.strokeStyle = na > 0.02 ? `rgba(255,170,190,${0.5 + 0.5 * na})` : 'rgba(205,218,242,0.42)'; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const sg of [1, -1]) { glow(ctx, X(sg * 0.24), Y(-0.17), s * 0.36, 'rgba(70,227,255,0.9)', cau * 0.75); glow(ctx, X(sg * 0.25), Y(0.12), s * 0.34, 'rgba(255,92,126,0.95)', na * 0.8); }
  // labels on the viewer's left (away from the platform's right-hand buttons)
  const L = o.labels ?? 0;
  if (L > 0.01) {
    ctx.font = `900 ${Math.round(Math.max(34, s * 0.13))}px "NSC", sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (const [px, py, lx, ly, text, col, on] of [[-0.25, -0.20, -0.62, -0.98, '尾状核', C.wait, cau], [-0.25, 0.12, -0.70, 0.78, '伏隔核', C.hit, na]]) {
      ctx.globalAlpha = a * L * (0.55 + 0.45 * on); ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X(px), Y(py)); ctx.lineTo(X(lx + 0.06), Y(ly)); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(px), Y(py), 5, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.strokeText(text, X(lx), Y(ly)); ctx.fillText(text, X(lx), Y(ly));
    }
    ctx.globalAlpha = a * L * 0.85; ctx.textAlign = 'center'; ctx.font = `500 ${Math.round(Math.max(26, s * 0.085))}px "NSC", sans-serif`; ctx.fillStyle = C.dim;
    ctx.fillText('示意图（冠状切面）', X(0.70), Y(-0.98));
  }
  ctx.restore();
}
