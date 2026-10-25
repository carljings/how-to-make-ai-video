// text.js — captions and typography (Canvas 2D). Markup in cue text: [[word]] = highlighted (signal orange, heavier),
// "\n" = line break. Captions are the explanation track (no narration): main captions top-left inside the phone-UI
// safe area, notes (sources / boundaries) small at the bottom of the safe area.
import { W, H, C, rgba, mix, clamp, lerp, E, F, font } from './core.js';

export function parseRuns(line) {
  const runs = []; const re = /\[\[(.+?)\]\]/g; let i = 0, m;
  while ((m = re.exec(line))) { if (m.index > i) runs.push({ s: line.slice(i, m.index), hi: false }); runs.push({ s: m[1], hi: true }); i = m.index + m[0].length; }
  if (i < line.length) runs.push({ s: line.slice(i), hi: false });
  return runs;
}
export const plain = (s) => s.replace(/\[\[|\]\]/g, '');
/** draw one line of runs at (x, y); returns width. o: size, weight, hiWeight, col, hiCol, alpha, align */
export function drawRuns(c, runs, x, y, o) {
  const size = o.size, wN = o.weight ?? 700, wH = o.hiWeight ?? 900;
  let tw = 0; const widths = runs.map((r) => { c.font = font(r.hi ? wH : wN, size, o.fam ?? F.sans); const w = c.measureText(r.s).width; tw += w; return w; });
  let cx = o.align === 'center' ? x - tw / 2 : o.align === 'right' ? x - tw : x;
  runs.forEach((r, i) => {
    c.font = font(r.hi ? wH : wN, size, o.fam ?? F.sans);
    c.fillStyle = rgba(r.hi ? (o.hiCol ?? C.signal) : (o.col ?? C.bone), o.alpha ?? 1);
    c.fillText(r.s, cx, y); cx += widths[i];
  });
  return tw;
}
export function measureRuns(c, runs, size, wN = 700, wH = 900, fam = F.sans) {
  let tw = 0; for (const r of runs) { c.font = font(r.hi ? wH : wN, size, fam); tw += c.measureText(r.s).width; } return tw;
}
/** wrap plain text (CJK-aware, no break before closing punctuation) to maxW; returns lines */
const NOBREAK_BEFORE = '，。、；：？！）》」』”’…·%,.;:?!)';
export function wrap(c, text, maxW) {
  const out = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (c.measureText(test).width > maxW && line && !NOBREAK_BEFORE.includes(ch)) {
        // keep latin words together
        const m = /[A-Za-z0-9.\-/]+$/.exec(line);
        if (m && /[A-Za-z0-9]/.test(ch) && m[0].length < line.length) { out.push(line.slice(0, -m[0].length)); line = m[0] + ch; }
        else { out.push(line); line = ch; }
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// ------------------------------------------------------------------ captions
export const CAP = { x: 84, y: 262, size: 60, lh: 1.34, noteY: 1418, noteSize: 25, noteW: 860 };
/** main caption: lines rise into place (staggered), fade out at t1 */
export function mainCaption(c, cue, t, theme = 'dark') {
  const fadeIn = 0.16, fadeOut = 0.14;
  const a = clamp(Math.min((t - cue.t0) / fadeIn, (cue.t1 - t) / fadeOut));
  if (a <= 0) return;
  const size = cue.size ?? CAP.size, lh = size * CAP.lh, x = cue.x ?? CAP.x, y0 = cue.y ?? CAP.y;
  const lines = cue.text.split('\n');
  const col = theme === 'light' ? C.inkline : C.bone, hiCol = theme === 'light' ? C.blood : C.signal;
  lines.forEach((ln, i) => {
    const u = E.outExpo(clamp((t - cue.t0 - i * 0.07) / 0.42));
    const dy = (1 - u) * 34, la = a * clamp((t - cue.t0 - i * 0.07) / 0.12);
    drawRuns(c, parseRuns(ln), x, y0 + i * lh + dy, { size, weight: 700, hiWeight: 900, col, hiCol, alpha: la, align: cue.align });
  });
  // orange rule above the caption (draws in)
  const ru = E.outExpo(clamp((t - cue.t0) / 0.5));
  c.fillStyle = rgba(hiCol, a); c.fillRect(x, y0 - size - 22, 56 * ru, 6);
}
export function noteCaption(c, cue, t, theme = 'dark') {
  const a = clamp(Math.min((t - cue.t0) / 0.25, (cue.t1 - t) / 0.2));
  if (a <= 0) return;
  const size = cue.size ?? CAP.noteSize, x = cue.x ?? CAP.x, maxW = cue.w ?? CAP.noteW;
  c.font = font(400, size, F.sans);
  const lines = wrap(c, cue.text, maxW);
  const yb = cue.y ?? CAP.noteY, lh = size * 1.42;
  const y0 = yb - (lines.length - 1) * lh;     // notes grow upward from the bottom of the safe area
  const col = theme === 'light' ? C.graphite : C.ash;
  c.fillStyle = rgba(theme === 'light' ? C.blood : C.signal, a); c.fillRect(x, y0 - size * 0.62, 8, 8);
  c.fillStyle = rgba(col, a);
  lines.forEach((ln, i) => c.fillText(ln, x + 20, y0 + i * lh));
}
/** typed text: chars visible n (fractional = the next char fades in), caret blinks when idle; returns caret x */
export function typed(c, text, x, y, n, o = {}) {
  const size = o.size ?? 44, col = o.col ?? C.inkline, wgt = o.weight ?? 700;
  c.font = font(wgt, size, o.fam ?? F.sans);
  const chars = [...text], full = Math.floor(n), frac = n - full;
  let cx = x;
  for (let i = 0; i < chars.length && i <= full; i++) {
    const a = i < full ? 1 : frac; if (a <= 0) break;
    c.fillStyle = rgba(col, a * (o.alpha ?? 1)); c.fillText(chars[i], cx, y);
    cx += c.measureText(chars[i]).width * (i < full ? 1 : 1);
    if (i === full) cx -= c.measureText(chars[i]).width * (1 - frac);
  }
  if (o.caret !== false) {
    const blink = o.t != null ? (Math.floor(o.t * 2.2) % 2 === 0 ? 1 : 0.15) : 1;
    c.fillStyle = rgba(o.caretCol ?? col, blink * (o.alpha ?? 1)); c.fillRect(cx + 3, y - size * 0.85, Math.max(3, size * 0.08), size * 1.0);
  }
  return cx;
}
/** big display word, scale-popped from its hit time (k = t − hit) */
export function slamText(c, s, x, y, k, o = {}) {
  if (k < 0) return 0;
  const size = o.size ?? 200, fam = o.fam ?? F.cond, wgt = o.weight ?? 800;
  const u = clamp(k / (o.dur ?? 0.18)), sc = (o.from ?? 1.35) - ((o.from ?? 1.35) - 1) * E.outBack(u);
  c.save(); c.translate(x, y); c.scale(sc, sc);
  c.font = font(wgt, size, fam); c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
  if (o.ls) c.letterSpacing = o.ls + 'px';
  c.fillStyle = rgba(o.col ?? C.bone, (o.alpha ?? 1) * clamp(k / 0.04));
  c.fillText(s, 0, 0);
  const w = c.measureText(s).width;
  c.restore(); c.letterSpacing = '0px'; c.textAlign = 'left';
  return w * sc;
}
