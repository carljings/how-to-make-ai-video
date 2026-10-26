// fx.js — r6 impact layer: shake and zoom punch, shockwave rings, sticker-shard bursts, light rays, speed lines,
// ambient dust and a quarter-resolution bloom. Every effect is a pure function of film time (seeded rng, no state).
import { W, H, TAU, clamp, lerp, seg, expoOut, easeOut, rng, rgba, hash } from './core.js';

export const STICKERS = ['#ffd21a', '#f2f1ec', '#00a65a', '#1d63f2', '#ff7400', '#e3202d'];

// camera shake: sum of decaying, deterministic wobbles; also a zoom punch
export function shakeAt(t, hits) {
  let dx = 0, dy = 0, rot = 0, zoom = 0;
  for (const h of hits) {
    const k = t - h.t;
    if (k < 0 || k > 1.2) continue;
    const e = Math.exp(-k * (h.decay || 9));
    const f = h.freq || 38;
    dx += h.amp * e * Math.sin(k * f + h.t * 3.1);
    dy += h.amp * 0.8 * e * Math.sin(k * f * 1.31 + h.t * 7.7 + 1);
    rot += (h.amp / 900) * e * Math.sin(k * f * 0.77 + 2);
    zoom += (h.zoom ?? h.amp / 700) * Math.exp(-k * 7);
  }
  return { dx, dy, rot, zoom };
}

export function shockwave(ctx, x, y, t, t0, { color = '#ffffff', r0 = 30, r1 = 900, dur = 0.75, width = 34, alpha = 0.85 } = {}) {
  const k = (t - t0) / dur;
  if (k < 0 || k > 1) return;
  const r = lerp(r0, r1, expoOut(k)), a = alpha * (1 - k) ** 1.6;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, a); ctx.lineWidth = width * (1 - k) + 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(color, a * 0.5); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke();
  ctx.restore();
}

// shards fly out with drag and gravity, spin, and fade; rounded squares read as cube stickers
export function burst(ctx, x, y, t, t0, { n = 46, seed = 1, speed = 1100, dur = 1.3, colors = STICKERS, size = [12, 30], gravity = 900, drag = 2.6, spread = TAU, dir = 0, glow = 0.6 } = {}) {
  const k = t - t0;
  if (k < 0 || k > dur) return;
  const R = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ang = dir + (R() - 0.5) * spread, v = speed * (0.3 + 0.7 * R()), s = lerp(size[0], size[1], R());
    const col = colors[(R() * colors.length) | 0], rot0 = R() * TAU, spin = (R() - 0.5) * 16, life = dur * (0.55 + 0.45 * R());
    if (k > life) continue;
    const d = (v * (1 - Math.exp(-drag * k))) / drag;
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d + 0.5 * gravity * k * k;
    const a = (1 - (k / life) ** 2);
    ctx.save(); ctx.translate(px, py); ctx.rotate(rot0 + spin * k); ctx.globalAlpha = a;
    const sc = s * (1 - 0.35 * (k / life));
    if (glow > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(col, 0.25 * glow); ctx.fillRect(-sc, -sc, sc * 2, sc * 2); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = col; roundRect(ctx, -sc / 2, -sc / 2, sc, sc, sc * 0.22); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// small bright sparks (additive dots with short trails)
export function sparks(ctx, x, y, t, t0, { n = 60, seed = 2, speed = 1400, dur = 0.9, color = '#ffffff', size = 4 } = {}) {
  const k = t - t0;
  if (k < 0 || k > dur) return;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, v = speed * (0.25 + 0.75 * R()), life = dur * (0.5 + 0.5 * R());
    if (k > life) continue;
    const d = (v * (1 - Math.exp(-3 * k))) / 3, d0 = (v * (1 - Math.exp(-3 * Math.max(0, k - 0.05)))) / 3;
    const a = 1 - k / life;
    ctx.strokeStyle = rgba(color, a); ctx.lineWidth = size * (1 - 0.5 * k / life);
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0); ctx.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d); ctx.stroke();
  }
  ctx.restore();
}

// rotating light rays (god rays) radiating from a point
export function rays(ctx, x, y, t, { n = 16, color = '#ffffff', alpha = 0.22, r1 = 1500, width = 0.07, speed = 0.18, seed = 5 } = {}) {
  if (alpha <= 0) return;
  const R = rng(seed);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r1);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(0.35, rgba(color, alpha * 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = t * speed + (i / n) * TAU + (R() - 0.5) * 0.25, w = width * (0.5 + R());
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - w) * r1, y + Math.sin(a - w) * r1); ctx.lineTo(x + Math.cos(a + w) * r1, y + Math.sin(a + w) * r1); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}

// radial speed lines streaming outward (zoom feel)
export function speedLines(ctx, cx, cy, t, k, { n = 70, seed = 9, color = '#ffffff', r0 = 260 } = {}) {
  if (k <= 0) return;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const ang = R() * TAU, ph = R(), sp = 1.4 + R() * 1.6, len = (90 + 260 * R()) * k;
    const f = (ph + t * sp) % 1, r = r0 + f * 1300;
    ctx.strokeStyle = rgba(color, 0.28 * k * Math.sin(Math.PI * f)); ctx.lineWidth = 2 + 2 * R();
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.lineTo(cx + Math.cos(ang) * (r + len), cy + Math.sin(ang) * (r + len)); ctx.stroke();
  }
  ctx.restore();
}

// ambient dust: soft bokeh specks drifting upward with parallax
export function dust(ctx, t, { n = 55, seed = 77, color = '#ffffff', alpha = 1 } = {}) {
  if (alpha <= 0) return;
  const R = rng(seed);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const depth = 0.3 + 0.7 * R(), x0 = R() * W, y0 = R() * H, r = (2 + 7 * R()) * depth, sp = 18 + 50 * depth, tw = R() * TAU;
    const x = (x0 + Math.sin(t * 0.3 + tw) * 30 * depth + W) % W, y = ((y0 - t * sp) % H + H) % H;
    const a = alpha * (0.05 + 0.13 * depth) * (0.6 + 0.4 * Math.sin(t * 1.7 + tw));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
  }
  ctx.restore();
}

// a bright diagonal band sweeping across a box (solved cube "shine")
export function shine(ctx, x, y, w, h, k, { color = '#ffffff', alpha = 0.4, r = 230 } = {}) {
  if (k <= 0 || k >= 1) return;
  // a soft glint travelling corner to corner (radial falloff, so it has no edges)
  const cx = lerp(x, x + w, k), cy = lerp(y, y + h, k), a = alpha * Math.sin(Math.PI * k);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.4, rgba(color, a * 0.35)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.restore();
}

// quarter-resolution bloom: blurred, contrast-lifted copy screened back over the frame
let BL = null;
export function bloom(ctx, amount) {
  if (amount <= 0) return;
  if (!BL) { const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; BL = { c, x: c.getContext('2d') }; }
  const { c, x } = BL;
  x.globalCompositeOperation = 'copy'; x.filter = 'brightness(1.1) contrast(1.9) blur(6px)';
  x.drawImage(ctx.canvas, 0, 0, c.width, c.height); x.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = clamp(amount);
  ctx.drawImage(c, 0, 0, W, H); ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
