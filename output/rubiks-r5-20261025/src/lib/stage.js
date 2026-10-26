// stage.js — background, act light, vignette, grain, flashes. Pure functions of t.
import { W, H, rng, hash, rgba, hex, clamp } from './core.js';

let grain = null;
export function initStage() {
  grain = document.createElement('canvas'); grain.width = grain.height = 256;
  const g = grain.getContext('2d'), img = g.createImageData(256, 256), R = rng(7);
  for (let i = 0; i < img.data.length; i += 4) { const v = (R() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}

// base: near-black with a coloured act light centred at (lx, ly)
export function backdrop(ctx, { color = '#ffd21a', k = 0.18, lx = 540, ly = 980, r = 1150, base = '#06070a' } = {}) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  if (k > 0) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, rgba(color, k)); g.addColorStop(0.45, rgba(color, k * 0.35)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

export function vignette(ctx, k = 0.65) {
  const g = ctx.createRadialGradient(540, 940, 380, 540, 960, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

export function film(ctx, t, k = 0.045) {
  if (!grain) return;
  const f = Math.round(t * 30);
  ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'overlay';
  const ox = (hash(f) * 256) | 0, oy = (hash(f + 999) * 256) | 0;
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

export function flash(ctx, k, color = '#ffffff') {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// blueprint grid
export function grid(ctx, { step = 60, color = '#5aa9ff', a = 0.12, ox = 0, oy = 0 } = {}) {
  ctx.save(); ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ((ox % step) + step) % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = ((oy % step) + step) % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke(); ctx.restore();
}
