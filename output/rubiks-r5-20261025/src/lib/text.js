// text.js — headlines, kickers, footnotes and big numbers. Fonts are bundled subsets (tools/fonts.py) under private
// family names, so nothing can silently fall back to a system font.
import { clamp, seg, expoOut, easeOut, easeIn, rgba } from './core.js';

export const SANS = '"F-Sans"', COND = '"F-Cond"', MONO = '"F-Mono"';
export const INK = '#f4f2ee', MUTED = 'rgba(244,242,238,0.58)';

// Parse "普通**重点**普通" into runs [{s, accent}]
export function runs(line) {
  const out = []; let acc = false;
  for (const part of line.split('**')) { if (part) out.push({ s: part, accent: acc }); acc = !acc; }
  return out;
}

/**
 * headline(ctx, t, { t0, t1, lines, kicker, accent, x, y, size, lh, align, stagger })
 * Glyphs rise in one by one from t0; everything lifts out over the last 0.25 s before t1.
 */
export function headline(ctx, t, o) {
  const { t0, t1 = 1e9, lines, kicker = null, accent = '#ffd21a', x = 72, y = 330, size = 78, lh = 1.24, stagger = 0.02, color = INK, maxW = 940 } = o;
  if (t < t0 || t > t1) return;
  const out = 1 - easeIn(seg(t, t1 - 0.25, t1));
  const lift = -24 * (1 - out);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  if (kicker) {
    const k = easeOut(seg(t, t0, t0 + 0.35));
    ctx.globalAlpha = k * out;
    ctx.fillStyle = accent; ctx.fillRect(x, y - size * 1.42 - 12 + lift, 44 * k, 6);
    ctx.font = `700 28px ${SANS}`; ctx.letterSpacing = '3px';
    ctx.fillStyle = accent; ctx.fillText(kicker, x + 60, y - size * 1.42 - 3 + lift);
    ctx.letterSpacing = '0px';
  }
  let i = 0;
  lines.forEach((line, li) => {
    let sz = size;
    ctx.font = `900 ${sz}px ${SANS}`;
    const plain = line.replace(/\*\*/g, '');
    let w = ctx.measureText(plain).width;
    if (w > maxW) { sz = Math.floor((sz * maxW) / w); ctx.font = `900 ${sz}px ${SANS}`; }
    let cx = o.align === 'center' ? 540 - ctx.measureText(plain).width / 2 : x;
    const by = y + li * size * lh + lift;
    for (const r of runs(line)) {
      for (const ch of r.s) {
        const k = seg(t, t0 + i * stagger, t0 + i * stagger + 0.32);
        const a = clamp(k * 2.2) * out;
        const dy = 34 * (1 - expoOut(k));
        const cw = ctx.measureText(ch).width;
        if (a > 0) {
          ctx.globalAlpha = a;
          ctx.fillStyle = r.accent ? accent : color;
          ctx.fillText(ch, cx, by + dy);
        }
        cx += cw; i++;
      }
    }
  });
  ctx.restore();
}

export function footnote(ctx, t, { t0, t1 = 1e9, text, y = 1452, x = 72, size = 32, alpha = 0.6 }) {
  if (t < t0 || t > t1) return;
  size = Math.max(size, 32); // r5: legible at phone size (r4 used 25–28 px)
  const a = Math.min(seg(t, t0, t0 + 0.4), 1 - seg(t, t1 - 0.3, t1)) * alpha;
  ctx.save(); ctx.globalAlpha = a; ctx.font = `400 ${size}px ${SANS}`; ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y); ctx.restore();
}

// Simple text with options
export function label(ctx, s, x, y, { size = 32, weight = 700, family = SANS, color = INK, align = 'left', alpha = 1, base = 'alphabetic', spacing = 0 } = {}) {
  if (alpha <= 0) return 0;
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px ${family}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(s, x, y); const w = ctx.measureText(s).width; ctx.restore(); return w;
}

// Big condensed number with optional glow
export function bigNumber(ctx, s, x, y, { size = 300, color = INK, align = 'center', alpha = 1, glow = 0, glowColor = null, spacing = 0, weight = 800 } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${weight} ${size}px ${COND}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (glow > 0) { ctx.shadowColor = glowColor || color; ctx.shadowBlur = glow; }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
  ctx.restore();
}
