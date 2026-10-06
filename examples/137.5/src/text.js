// text.js: captions, chapter tags and labels. Type is drawn in normal (non-additive) mode, after bloom.
import { clamp, seg, win, easeOut, css } from './lib.js';
import { W } from './gfx.js';

export const F = {
  zh: '"Noto Serif SC", serif',
  en: '"EB Garamond", serif',
  mono: '"IBM Plex Mono", monospace',
  math: '"STIX Two Text", serif',
};
export const C = {
  warm: [246, 240, 230],
  en: [214, 206, 192],
  gold: [255, 204, 120],
  dim: [150, 160, 175],
};

// "{gold}" markup → [[text, isGold], ...]
export function spans(s) {
  const out = [];
  let hi = false, buf = '';
  for (const ch of s) {
    if (ch === '{' || ch === '}') { if (buf) out.push([buf, hi]); buf = ''; hi = ch === '{'; }
    else buf += ch;
  }
  if (buf) out.push([buf, hi]);
  return out;
}
export const plain = s => s.replace(/[{}]/g, '');

// Draw a line of mixed-colour text centred (or aligned) at x, with per-character reveal.
// reveal(i, n) returns 0..1 for character i of n.
export function richText(g, s, x, y, font, base, { align = 'center', alpha = 1, reveal = null, rise = 0, gold = C.gold, spacing = 0, shadow = 18 } = {}) {
  if (alpha <= 0.003) return 0;
  g.font = font;
  g.letterSpacing = spacing + 'px';
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  const chars = [];
  for (const [txt, hi] of spans(s)) for (const ch of txt) chars.push([ch, hi]);
  const widths = chars.map(([ch]) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  g.shadowColor = 'rgba(0,0,0,0.92)';
  g.shadowBlur = shadow;
  for (let i = 0; i < chars.length; i++) {
    const [ch, hi] = chars[i];
    const k = reveal ? reveal(i, chars.length) : 1;
    if (k > 0.003) {
      g.globalAlpha = clamp(alpha * k);
      g.fillStyle = css(hi ? gold : base);
      g.fillText(ch, cx, y + rise * (1 - k));
    }
    cx += widths[i];
  }
  g.shadowBlur = 0;
  g.letterSpacing = '0px';
  return total;
}

// A caption: Chinese line with a quick per-character reveal, English line easing in just after
export function caption(g, cap, t, { y = 912, fade = 1 } = {}) {
  const a = win(t, cap.t0, cap.t1, 0.45, 0.55) * fade;
  if (a <= 0.003) return;
  const lt = t - cap.t0;
  const n = plain(cap.zh).length;
  const per = Math.min(0.04, 0.6 / Math.max(1, n));
  richText(g, cap.zh, W / 2, y, `600 50px ${F.zh}`, C.warm, {
    alpha: a, rise: 10, spacing: 3,
    reveal: i => easeOut(seg(lt, i * per, i * per + 0.38)),
  });
  const ea = easeOut(seg(lt, 0.22, 0.85));
  richText(g, cap.en, W / 2, y + 56, `italic 400 35px ${F.en}`, C.en, { alpha: a * ea, rise: 8 * (1 - ea), spacing: 0.3 });
}

// Chapter tag in the top-left corner: a coloured dot, the numeral and both names
export function chapterTag(g, t, ch) {
  const a = win(t, ch.t0, ch.t1, 0.9, 0.9) * 0.7;
  if (a <= 0.003) return;
  const x = 86, y = 92;
  g.globalAlpha = a;
  g.fillStyle = css(ch.color);
  g.shadowColor = css(ch.color, 0.9); g.shadowBlur = 12;
  g.beginPath(); g.arc(x, y - 7, 5, 0, Math.PI * 2); g.fill();
  g.shadowBlur = 0;
  g.font = `500 19px ${F.mono}`; g.letterSpacing = '4px'; g.fillStyle = css(C.warm); g.textAlign = 'left';
  g.fillText(ch.num, x + 20, y);
  const w1 = g.measureText(ch.num).width;
  g.font = `600 21px ${F.zh}`; g.letterSpacing = '6px';
  g.fillText(ch.zh, x + 20 + w1 + 20, y);
  const w2 = g.measureText(ch.zh).width;
  g.font = `500 17px ${F.mono}`; g.letterSpacing = '5px'; g.fillStyle = css(C.en);
  g.fillText(ch.en, x + 20 + w1 + 20 + w2 + 16, y);
  g.letterSpacing = '0px'; g.globalAlpha = 1;
}

// Small technical label (mono) with optional Chinese prefix
export function label(g, s, x, y, { size = 20, color = C.dim, alpha = 1, align = 'left', font = F.mono, weight = 400, spacing = 2 } = {}) {
  if (alpha <= 0.003) return;
  g.font = `${weight} ${size}px ${font}`;
  g.letterSpacing = spacing + 'px';
  g.textAlign = align; g.textBaseline = 'alphabetic';
  g.globalAlpha = clamp(alpha); g.fillStyle = css(color);
  g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 10;
  g.fillText(s, x, y);
  g.shadowBlur = 0; g.letterSpacing = '0px'; g.globalAlpha = 1;
}

// Text with superscripts: segments = [[text, isSuperscript], ...]. Returns the drawn width.
export function sci(g, segments, x, y, { size = 22, color = C.warm, alpha = 1, align = 'left', font = F.mono, weight = 400, supColor = null } = {}) {
  if (alpha <= 0.003) return 0;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.letterSpacing = '0px';
  const fontOf = sup => `${weight} ${sup ? Math.round(size * 0.62) : size}px ${font}`;
  const widths = segments.map(([s, sup]) => { g.font = fontOf(sup); return g.measureText(s).width; });
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  g.globalAlpha = clamp(alpha); g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 10;
  segments.forEach(([s, sup], i) => {
    g.font = fontOf(sup); g.fillStyle = css(sup && supColor ? supColor : color);
    g.fillText(s, cx, sup ? y - size * 0.42 : y);
    cx += widths[i];
  });
  g.shadowBlur = 0; g.globalAlpha = 1;
  return total;
}
