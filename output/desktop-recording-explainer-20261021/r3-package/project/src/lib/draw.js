// draw.js — shared drawing primitives (Canvas 2D). Pre-rendered sprites/textures are cached; everything else is
// drawn from t. Motifs that recur across the film live here so they look identical everywhere:
// the agent spark, the SCORE readout, paper cards, ink stamps, ✓ ✗ ⏎ glyphs (drawn, not font glyphs).
import { W, H, TAU, C, rgba, mix, clamp, lerp, hash, hash2, E, F, font, vnoise, frameIdx } from './core.js';

export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export function reset(c) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; c.letterSpacing = '0px'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.setLineDash([]); c.lineWidth = 1; c.lineCap = 'butt'; c.lineJoin = 'miter';
}

// ------------------------------------------------------------------ glow sprites
const _spr = new Map();
function glowSprite(col, kind) {
  const q = col.map((v) => (v >> 3) << 3), key = q.join(',') + kind;
  let s = _spr.get(key);
  if (!s) {
    s = mk(128, 128); const g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    if (kind === 'hot') { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.1, rgba(mix(q, [255, 255, 255], 0.55), 0.95)); gr.addColorStop(0.28, rgba(q, 0.45)); gr.addColorStop(0.6, rgba(q, 0.1)); }
    else if (kind === 'soft') { gr.addColorStop(0, rgba(q, 1)); gr.addColorStop(0.4, rgba(q, 0.45)); gr.addColorStop(0.75, rgba(q, 0.12)); }
    else { gr.addColorStop(0, rgba(q, 0.55)); gr.addColorStop(0.5, rgba(q, 0.16)); }
    gr.addColorStop(1, rgba(q, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _spr.set(key, s);
  }
  return s;
}
export function glow(c, x, y, r, col, a = 1, kind = 'hot') {
  if (a <= 0.003 || r <= 0.5) return;
  const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, a); c.drawImage(glowSprite(col, kind), x - r, y - r, r * 2, r * 2); c.globalAlpha = ga;
}

// ------------------------------------------------------------------ the agent spark: an orange point that chases the score
export function spark(c, x, y, t, o = {}) {
  const s = o.scale ?? 1, a = o.alpha ?? 1, seed = o.seed ?? 3;
  if (a <= 0.003) return;
  const prev = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  const flick = 0.85 + 0.15 * Math.sin(t * 37 + seed) * Math.sin(t * 23.3 + 1.7 * seed);
  glow(c, x, y, 70 * s, C.signal, 0.32 * a * flick, 'soft');
  glow(c, x, y, 26 * s, C.ember, 0.9 * a, 'hot');
  glow(c, x, y, 9 * s, C.hot, a, 'hot');
  // sputter: short-lived sparks, re-emitted every 1/30 s (keyed to frame index, deterministic)
  const n = o.sputter ?? 7, fi = frameIdx(t);
  for (let k = 0; k < n; k++) {
    for (let age = 0; age < 9; age++) {
      const born = fi - age, id = born * 31 + k;
      if (hash(id, seed) > 0.42) continue;
      const ang = hash(id, seed + 1) * TAU, sp = (60 + 220 * hash(id, seed + 2)) * s, life = 0.12 + 0.2 * hash(id, seed + 3);
      const tt = age / 30; if (tt > life) continue;
      const px = x + Math.cos(ang) * sp * tt + (o.vx || 0) * -tt, py = y + Math.sin(ang) * sp * tt + 160 * tt * tt * s + (o.vy || 0) * -tt;
      const k2 = 1 - tt / life;
      glow(c, px, py, (3 + 4 * k2) * s, C.ember, 0.9 * k2 * a, 'hot');
    }
  }
  c.globalCompositeOperation = prev;
}
/** a fading trail sampled from a path function p(time) → [x, y], from t − len to t */
export function trail(c, p, t, len, o = {}) {
  const n = o.n ?? 26, col = o.col ?? C.signal, w0 = o.w ?? 5, a0 = o.alpha ?? 0.9, t0 = o.tmin ?? -1e9;
  const pts = [];
  for (let i = 0; i <= n; i++) { const tt = t - len * (i / n); if (tt < t0) break; pts.push(p(tt)); }
  if (pts.length < 2) return;
  const prev = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const k = 1 - i / (pts.length - 1);
    c.strokeStyle = rgba(mix(col, C.hot, 0.35 * k), a0 * k * k); c.lineWidth = Math.max(0.6, w0 * k);
    c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
  }
  c.globalCompositeOperation = prev; c.lineCap = 'butt';
}

// ------------------------------------------------------------------ lines, grids, hatching
export function grid(c, x0, y0, x1, y1, step, col, a, major = 0, amaj = 0) {
  c.lineWidth = 1;
  c.strokeStyle = rgba(col, a); c.beginPath();
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { c.moveTo(x + 0.5, y0); c.lineTo(x + 0.5, y1); }
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { c.moveTo(x0, y + 0.5); c.lineTo(x1, y + 0.5); }
  c.stroke();
  if (major) {
    c.strokeStyle = rgba(col, amaj); c.beginPath();
    for (let x = Math.ceil(x0 / major) * major; x <= x1; x += major) { c.moveTo(x + 0.5, y0); c.lineTo(x + 0.5, y1); }
    for (let y = Math.ceil(y0 / major) * major; y <= y1; y += major) { c.moveTo(x0, y + 0.5); c.lineTo(x1, y + 0.5); }
    c.stroke();
  }
}
/** parallel hatch lines inside the current clip region over a bounding box */
export function hatch(c, bx, by, bw, bh, ang, gap, col, a, lw = 1) {
  const cx = bx + bw / 2, cy = by + bh / 2, R = Math.hypot(bw, bh) / 2 + gap;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  c.strokeStyle = rgba(col, a); c.lineWidth = lw; c.beginPath();
  for (let d = -R; d <= R; d += gap) {
    const px = cx - sa * d, py = cy + ca * d;
    c.moveTo(px - ca * R, py - sa * R); c.lineTo(px + ca * R, py + sa * R);
  }
  c.stroke();
}
export function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export function arrow(c, x0, y0, x1, y1, o = {}) {
  const col = o.col ?? C.bone, lw = o.lw ?? 3, hd = o.head ?? 18, a = o.alpha ?? 1;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  c.strokeStyle = rgba(col, a); c.fillStyle = rgba(col, a); c.lineWidth = lw; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - Math.cos(ang) * hd * 0.6, y1 - Math.sin(ang) * hd * 0.6); c.stroke();
  c.setLineDash([]);
  c.beginPath(); c.moveTo(x1, y1);
  c.lineTo(x1 - Math.cos(ang - 0.42) * hd, y1 - Math.sin(ang - 0.42) * hd);
  c.lineTo(x1 - Math.cos(ang + 0.42) * hd, y1 - Math.sin(ang + 0.42) * hd);
  c.closePath(); c.fill(); c.lineCap = 'butt';
}

// ------------------------------------------------------------------ glyphs drawn as paths (fonts lack them)
export function check(c, x, y, s, col, lw = 0, a = 1, k = 1) {
  // k = draw progress 0..1 (the stroke writes itself)
  c.strokeStyle = rgba(col, a); c.lineWidth = lw || s * 0.16; c.lineCap = 'round'; c.lineJoin = 'round';
  const p = [[x - s * 0.42, y + s * 0.02], [x - s * 0.12, y + s * 0.32], [x + s * 0.46, y - s * 0.36]];
  const L1 = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), L2 = Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]);
  const d = k * (L1 + L2);
  c.beginPath(); c.moveTo(p[0][0], p[0][1]);
  if (d <= L1) c.lineTo(lerp(p[0][0], p[1][0], d / L1), lerp(p[0][1], p[1][1], d / L1));
  else { c.lineTo(p[1][0], p[1][1]); const u = (d - L1) / L2; c.lineTo(lerp(p[1][0], p[2][0], u), lerp(p[1][1], p[2][1], u)); }
  c.stroke(); c.lineCap = 'butt'; c.lineJoin = 'miter';
}
export function cross(c, x, y, s, col, lw = 0, a = 1, k = 1) {
  c.strokeStyle = rgba(col, a); c.lineWidth = lw || s * 0.16; c.lineCap = 'round';
  const r = s * 0.38, k1 = clamp(k * 2), k2 = clamp(k * 2 - 1);
  c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x - r + 2 * r * k1, y - r + 2 * r * k1);
  if (k2 > 0) { c.moveTo(x + r, y - r); c.lineTo(x + r - 2 * r * k2, y - r + 2 * r * k2); }
  c.stroke(); c.lineCap = 'butt';
}
/** the ⏎ key; press 0..1 sinks it */
export function enterKey(c, x, y, s, press, o = {}) {
  const dark = o.dark ?? false, d = 6 * s * press;
  const face = dark ? C.ink2 : C.bone, edge = dark ? C.ash : C.inkline;
  c.fillStyle = rgba(mix(edge, C.ink, 0.3), 0.9); roundRect(c, x - 60 * s, y - 40 * s + 8 * s, 120 * s, 80 * s, 12 * s); c.fill();
  c.fillStyle = rgba(press > 0.5 ? mix(face, C.signal, 0.55) : face, 1); roundRect(c, x - 60 * s, y - 40 * s + d, 120 * s, 80 * s - 2 * s, 12 * s); c.fill();
  c.strokeStyle = rgba(edge, 0.9); c.lineWidth = 2.5 * s; roundRect(c, x - 60 * s, y - 40 * s + d, 120 * s, 80 * s - 2 * s, 12 * s); c.stroke();
  c.strokeStyle = rgba(edge, 1); c.lineWidth = 6 * s; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x + 28 * s, y - 18 * s + d); c.lineTo(x + 28 * s, y + 6 * s + d); c.lineTo(x - 26 * s, y + 6 * s + d); c.stroke();
  c.beginPath(); c.moveTo(x - 12 * s, y - 8 * s + d); c.lineTo(x - 28 * s, y + 6 * s + d); c.lineTo(x - 12 * s, y + 20 * s + d); c.stroke();
  c.lineJoin = 'miter'; c.lineCap = 'butt';
}
/** thumbs-up mark (simple outline glyph, not an emoji) */
export function thumb(c, x, y, s, col, a = 1, down = false) {
  c.save(); c.translate(x, y); if (down) c.scale(1, -1);
  c.fillStyle = rgba(col, a);
  roundRect(c, -s * 0.5, -s * 0.05, s * 0.22, s * 0.55, s * 0.05); c.fill();
  c.beginPath(); c.moveTo(-s * 0.22, -s * 0.02); c.lineTo(-s * 0.02, -s * 0.42); c.quadraticCurveTo(s * 0.06, -s * 0.56, s * 0.12, -s * 0.44);
  c.lineTo(s * 0.06, -s * 0.16); c.lineTo(s * 0.38, -s * 0.16); c.quadraticCurveTo(s * 0.52, -s * 0.14, s * 0.48, s * 0.02);
  c.lineTo(s * 0.4, s * 0.42); c.quadraticCurveTo(s * 0.36, s * 0.5, s * 0.26, s * 0.5); c.lineTo(-s * 0.22, s * 0.5); c.closePath(); c.fill();
  c.restore();
}

// ------------------------------------------------------------------ paper
let _paper = null;
function paperTex() {
  if (_paper) return _paper;
  const s = mk(512, 512), g = s.getContext('2d'), id = g.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) {
    const x = i % 512, y = (i / 512) | 0;
    const n = (hash(i, 9) - 0.5) * 14 + vnoise(x * 0.05 + y * 0.013, 4) * 5 + vnoise(y * 0.09, 11) * 3;
    id.data[i * 4] = 128 + n; id.data[i * 4 + 1] = 128 + n; id.data[i * 4 + 2] = 128 + n; id.data[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0); _paper = s; return s;
}
/** paper sheet: fill, fibre texture (multiply-ish via low alpha), soft shadow, faint rule lines optional */
export function paper(c, x, y, w, h, o = {}) {
  const col = o.col ?? C.paper;
  if (o.shadow !== false) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x + 10, y + 16, w, h); }
  c.fillStyle = rgba(col, 1); c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.globalAlpha = o.tex ?? 0.09; c.globalCompositeOperation = 'multiply';
  const tx = paperTex(); for (let yy = y; yy < y + h; yy += 512) for (let xx = x; xx < x + w; xx += 512) c.drawImage(tx, xx, yy);
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  if (o.rules) { c.strokeStyle = rgba(C.inkline, 0.07); c.lineWidth = 1; c.beginPath(); for (let yy = y + o.rules; yy < y + h; yy += o.rules) { c.moveTo(x, yy + 0.5); c.lineTo(x + w, yy + 0.5); } c.stroke(); }
  c.restore();
}

// ------------------------------------------------------------------ ink stamps (rough edges, cached)
const _stamps = new Map();
export function stampSprite(text, col, o = {}) {
  const key = text + col.join(',') + (o.mark || '') + (o.size || 64);
  let s = _stamps.get(key); if (s) return s;
  const size = o.size || 64, pad = 22;
  const g0 = mk(10, 10).getContext('2d'); g0.font = font(900, size, F.sans);
  const tw = g0.measureText(text).width + (o.mark ? size * 1.1 : 0);
  const w = Math.ceil(tw + pad * 2 + 24), h = Math.ceil(size * 1.5 + pad);
  s = mk(w, h); const g = s.getContext('2d');
  g.strokeStyle = rgba(col, 1); g.lineWidth = size * 0.09; roundRect(g, size * 0.08, size * 0.08, w - size * 0.16, h - size * 0.16, size * 0.12); g.stroke();
  g.fillStyle = rgba(col, 1); g.font = font(900, size, F.sans); g.textBaseline = 'middle';
  g.fillText(text, pad + 12, h / 2 + size * 0.04);
  if (o.mark === 'check') check(g, w - pad - size * 0.5, h / 2, size * 0.9, col, size * 0.16);
  if (o.mark === 'cross') cross(g, w - pad - size * 0.5, h / 2, size * 0.9, col, size * 0.16);
  // ink: knock out speckles and a dry-brush streak pattern
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h / 55; i++) {
    const x = hash(i, 21) * w, y = hash(i, 22) * h, r = 0.6 + 2.2 * Math.pow(hash(i, 23), 3);
    g.globalAlpha = 0.35 + 0.65 * hash(i, 24); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 9; i++) { g.globalAlpha = 0.18; g.fillRect(0, hash(i, 31) * h, w, 1 + 3 * hash(i, 32)); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  _stamps.set(key, s); return s;
}
/** slam a stamp: k = time since impact (s); before impact (k<0) nothing */
export function stamp(c, text, x, y, k, o = {}) {
  if (k < 0) return;
  const col = o.col ?? C.signal, rotA = o.rot ?? -0.12, sz = o.size ?? 64;
  const s = stampSprite(text, col, { mark: o.mark, size: sz });
  const u = clamp(k / 0.16), sc = (o.scale ?? 1) * (1 + 0.9 * Math.pow(1 - E.out3(u), 2)), a = (o.alpha ?? 1) * clamp(k / 0.05) * (0.55 + 0.45 * u);
  c.save(); c.translate(x, y); c.rotate(rotA); c.scale(sc, sc); c.globalAlpha *= a;
  c.drawImage(s, -s.width / 2, -s.height / 2); c.restore();
}

// ------------------------------------------------------------------ SCORE readout (rolling digits)
const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
/** draw a number string with an odometer roll between `from` and `to` strings (same length right-aligned); k 0..1 */
export function odometer(c, x, y, size, from, to, k, col, o = {}) {
  c.font = font(o.weight ?? 600, size, F.mono); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  const cw = c.measureText('0').width;
  const n = Math.max(from.length, to.length), A = from.padStart(n, ' '), B = to.padStart(n, ' ');
  const x0 = o.align === 'left' ? x : x - n * cw;
  for (let i = 0; i < n; i++) {
    const a = A[i], b = B[i], cx = x0 + i * cw;
    if (a === b || k >= 1) { if (b !== ' ') { c.fillStyle = rgba(col, 1); c.fillText(b, cx, y); } continue; }
    const kk = E.out3(clamp(k * 1.25 - (n - 1 - i) * 0.05));
    c.save(); c.beginPath(); c.rect(cx - 2, y - size * 0.92, cw + 4, size * 1.12); c.clip();
    if (a !== ' ') { c.fillStyle = rgba(col, 1 - kk); c.fillText(a, cx, y - kk * size * 0.95); }
    if (b !== ' ') { c.fillStyle = rgba(col, kk); c.fillText(b, cx, y + (1 - kk) * size * 0.95); }
    c.restore();
  }
  return { w: n * cw, x0 };
}
/** a value that jumps at given times; returns {from, to, k} for odometer rendering at t */
export function steppedValue(t, steps, roll = 0.14) {
  // steps: [[time, value], ...] ascending
  let i = -1; for (let j = 0; j < steps.length; j++) { if (steps[j][0] <= t) i = j; else break; }
  if (i < 0) return { from: steps[0][1], to: steps[0][1], k: 1, idx: -1 };
  const prev = i > 0 ? steps[i - 1][1] : steps[i][1];
  return { from: prev, to: steps[i][1], k: clamp((t - steps[i][0]) / roll), idx: i, since: t - steps[i][0] };
}
export function scoreBox(c, x, y, t, sv, o = {}) {
  const size = o.size ?? 64, a = o.alpha ?? 1, label = o.label ?? '分数 SCORE';
  if (a <= 0.003) return;
  c.save(); c.globalAlpha *= a;
  c.font = font(500, Math.round(size * 0.34), F.mono); c.fillStyle = rgba(C.ash, 0.95); c.textAlign = o.align === 'left' ? 'left' : 'right';
  c.letterSpacing = '2px'; c.fillText(label, x, y - size * 1.02); c.letterSpacing = '0px'; c.textAlign = 'left';
  const fmt = o.fmt ?? fmtInt;
  const hot = Math.exp(-(sv.since ?? 9) / 0.25);
  c.globalCompositeOperation = 'source-over';
  const r = odometer(c, x, y, size, fmt(sv.from), fmt(sv.to), sv.k, mix(C.signal, C.hot, 0.5 * hot), { align: o.align });
  c.globalCompositeOperation = 'lighter';
  glow(c, (o.align === 'left' ? x + r.w / 2 : x - r.w / 2), y - size * 0.35, r.w * 0.75, C.signal, 0.16 + 0.3 * hot, 'soft');
  c.globalCompositeOperation = 'source-over';
  c.strokeStyle = rgba(C.signal, 0.6); c.lineWidth = 2; c.beginPath();
  const lx0 = o.align === 'left' ? x : x - r.w; c.moveTo(lx0, y + size * 0.22); c.lineTo(lx0 + r.w, y + size * 0.22); c.stroke();
  c.restore();
  return r;
}
export { fmtInt };

// ------------------------------------------------------------------ post: vignette + grain (pre-rendered)
let _vig = null, _grain = null;
export function vignette(c, a = 1) {
  if (!_vig) {
    _vig = mk(W / 4, H / 4); const g = _vig.getContext('2d'), gr = g.createRadialGradient(W / 8, H / 8 * 0.95, H / 8 * 0.35, W / 8, H / 8, H / 8 * 1.15);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.62)'); g.fillStyle = gr; g.fillRect(0, 0, W / 4, H / 4);
  }
  c.globalAlpha = a; c.drawImage(_vig, 0, 0, W, H); c.globalAlpha = 1;
}
export function grain(c, t, a = 0.035) {
  if (!_grain) {
    _grain = mk(256, 256); const g = _grain.getContext('2d'), id = g.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) { const v = hash(i, 77) * 255; id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
    g.putImageData(id, 0, 0);
  }
  const fi = frameIdx(t), ox = -Math.floor(hash(fi, 5) * 256), oy = -Math.floor(hash(fi, 6) * 256);
  c.globalAlpha = a; c.globalCompositeOperation = 'overlay';
  for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) c.drawImage(_grain, x, y);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
