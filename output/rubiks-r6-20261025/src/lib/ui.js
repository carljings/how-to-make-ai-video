// ui.js — shared graphic pieces: rounded rects, chips, odometer digits, solve-time cards, marks.
import { clamp, seg, lerp, easeOut, expoOut, backOut, rgba, hash } from './core.js';
import { SANS, COND, MONO, INK, label } from './text.js';

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// pill chip with text; returns width
export function chip(ctx, s, x, y, { size = 30, color = INK, bg = 'rgba(255,255,255,0.08)', border = null, alpha = 1, align = 'left', pad = 22, h = null, weight = 700 } = {}) {
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px ${SANS}`;
  const w = ctx.measureText(s).width + pad * 2, hh = h || size * 1.75;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  rr(ctx, x0, y - hh / 2, w, hh, hh / 2); ctx.fillStyle = bg; ctx.fill();
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(s, x0 + pad, y + size * 0.04);
  ctx.restore(); return w;
}

/**
 * odometer(ctx, target, k, x, y, opts) — digits spin and land right-to-left as k goes 0 → 1.
 * target: string ("43,252,003,…"); non-digits are static. align 'center' | 'left' | 'right'.
 */
export function odometer(ctx, target, k, x, y, { size = 120, color = INK, align = 'center', spins = 2, spread = 0.5, alpha = 1, weight = 800, family = COND, seed = 1, fixed = 0 } = {}) {
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px ${family}`; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  const dw = ctx.measureText('0').width;
  const widths = [...target].map((ch) => (/\d/.test(ch) ? dw : ctx.measureText(ch).width));
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const n = target.length;
  [...target].forEach((ch, i) => {
    const w = widths[i];
    if (!/\d/.test(ch)) { if (k > 0.05) ctx.fillText(ch, cx, y); cx += w; return; }
    const delay = ((n - 1 - i) / Math.max(1, n - 1)) * spread;
    const ki = i < fixed ? 1 : clamp((k - delay) / (1 - spread));
    const d = +ch;
    const v = d + 10 * (spins + (hash(i * 31 + seed) * 2 | 0)) * (1 - expoOut(ki));
    const lo = Math.floor(v), f = v - lo;
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 2, y - size * 0.9, w + 4, size * 1.08); ctx.clip();
    const top = (lo % 10), next = ((lo + 1) % 10);
    const hh = size * 0.95;
    ctx.fillText(String(top), cx, y + f * hh);
    ctx.fillText(String(next), cx, y + f * hh - hh);
    ctx.restore();
    cx += w;
  });
  ctx.restore();
  return total;
}

// solve-time card. state: { a (alpha), dx, dy, hl (0..1 gold), out (0..1 red strike), scale, tag }
export function timeCard(ctx, x, y, value, { w = 168, h = 214, a = 1, hl = 0, strike = 0, scale = 1, tag = null, tagColor = '#ff5a5a', accent = '#ffc61a', sub = null } = {}) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(scale, scale);
  rr(ctx, -w / 2, -h / 2, w, h, 22);
  const bg = hl > 0 ? `rgba(${lerp(26, 70, hl) | 0},${lerp(28, 56, hl) | 0},${lerp(34, 12, hl) | 0},0.96)` : 'rgba(26,28,34,0.94)';
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = hl > 0 ? rgba(accent, 0.4 + 0.6 * hl) : 'rgba(255,255,255,0.14)'; ctx.stroke();
  ctx.font = `800 ${Math.round(w * 0.5)}px ${COND}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hl > 0 ? accent : INK; ctx.fillText(value.toFixed(2), 0, h * 0.13);
  if (sub) { ctx.font = `500 ${Math.round(w * 0.13)}px ${SANS}`; ctx.fillStyle = 'rgba(244,242,238,0.5)'; ctx.fillText(sub, 0, h * 0.36); }
  if (strike > 0) {
    ctx.strokeStyle = tagColor; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w * 0.36, h * 0.02 - 30); ctx.lineTo(-w * 0.36 + w * 0.72 * clamp(strike * 1.4), h * 0.02 - 30 - 0 * strike); ctx.stroke();
  }
  ctx.restore();
  if (tag) label(ctx, tag, x, y + (h / 2) * scale + 46, { size: 28, weight: 900, color: tagColor, align: 'center', alpha: a });
}

export function check(ctx, x, y, s, color = '#19d46e', k = 1, lw = 6) {
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.15, y + s * 0.35); ctx.lineTo(x + s * 0.55, y - s * 0.4);
  ctx.setLineDash([s * 2.2]); ctx.lineDashOffset = s * 2.2 * (1 - clamp(k)); ctx.stroke(); ctx.restore();
}
export function crossMark(ctx, x, y, s, color = '#ff3b3b', k = 1, lw = 9) {
  if (k <= 0) return;
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x - s + 2 * s * a, y - s + 2 * s * a);
  if (b > 0) { ctx.moveTo(x + s, y - s); ctx.lineTo(x + s - 2 * s * b, y - s + 2 * s * b); }
  ctx.stroke(); ctx.restore();
}
export function padlock(ctx, x, y, s, color = '#ffc61a', a = 1, open = 0) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.14;
  ctx.beginPath(); ctx.arc(x, y - s * 0.25 - open * s * 0.2, s * 0.32, Math.PI, 0); ctx.stroke();
  rr(ctx, x - s * 0.5, y - s * 0.25, s, s * 0.8, s * 0.14); ctx.fill();
  ctx.restore();
}
