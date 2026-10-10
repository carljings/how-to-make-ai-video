// gfx.ts: an additive "light" renderer for one canvas: glow sprites, glowing lines, streaks, bloom, vignette, grain.
// Ported from the V2/V3 canvas kit (itself adapted from the user's neutrino film). No full-resolution blur anywhere:
// bloom blurs quarter-size copies, so it stays fast on SwiftShader (no GPU).
import {clamp, rng} from './math';
import {W, H} from '../timeline';

export type RGB = readonly [number, number, number];
const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as CanvasRenderingContext2D;

// Shared by every canvas on the page: sprites are pure functions of (colour, kind), buffers are only used inside one call
const SPRITES = new Map<string, HTMLCanvasElement>();
const SPR = 64;
let BUF: {b1: HTMLCanvasElement; b2: HTMLCanvasElement; b3: HTMLCanvasElement; tmp: HTMLCanvasElement; vig: HTMLCanvasElement; grain: HTMLCanvasElement[]} | null = null;
const buffers = () => {
  if (BUF) return BUF;
  const vig = mk(W, H), g = ctx2d(vig);
  // Many stops along a smoothstep, so the falloff has no edge that could show as a ring on dark frames
  const gr = g.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, H * 0.9);
  for (let i = 0; i <= 24; i++) {
    const r = i / 24, k = clamp((r - 0.25) / 0.75);
    gr.addColorStop(r, `rgba(0,0,0,${(0.92 * k * k * (3 - 2 * k)).toFixed(4)})`);
  }
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // Four grain tiles of seeded noise; the frame picks one and an offset, so grain moves but stays deterministic
  const grain = [0, 1, 2, 3].map((k) => {
    const c = mk(256, 256), q = ctx2d(c), img = q.createImageData(256, 256), R = rng(900 + k);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(128 + (R() + R() + R() - 1.5) * 120);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    q.putImageData(img, 0, 0);
    return c;
  });
  BUF = {b1: mk(270, 480), b2: mk(135, 240), b3: mk(68, 120), tmp: mk(W, H), vig, grain};
  return BUF;
};

export type SpriteKind = 'glow' | 'core' | 'halo' | 'bokeh';
function sprite(rgb: RGB, kind: SpriteKind) {
  const q = (c: number) => Math.round(c / 6) * 6;
  const key = kind + q(rgb[0]) + ',' + q(rgb[1]) + ',' + q(rgb[2]);
  let s = SPRITES.get(key);
  if (s) return s;
  s = mk(SPR, SPR);
  const g = ctx2d(s), img = g.createImageData(SPR, SPR), d = img.data, R = SPR / 2;
  const [r0, g0, b0] = [q(rgb[0]), q(rgb[1]), q(rgb[2])];
  for (let y = 0; y < SPR; y++) for (let x = 0; x < SPR; x++) {
    const dx = (x + 0.5 - R) / R, dy = (y + 0.5 - R) / R, rr = dx * dx + dy * dy, r = Math.sqrt(rr);
    let a = 0, hot = 0;
    if (kind === 'glow') { a = Math.exp(-rr * 5.5) * 0.85 + Math.exp(-rr * 40) * 0.6; hot = Math.exp(-rr * 60); }
    else if (kind === 'core') { a = Math.exp(-rr * 14); hot = Math.exp(-rr * 50) * 0.8; }
    else if (kind === 'halo') { const e = clamp(1 - r); a = Math.exp(-rr * 2.6) * e * e * (3 - 2 * e) * 0.9; }
    else { const e = clamp((1 - r) / 0.12); a = e * (0.42 + 0.22 * clamp((r - 0.7) / 0.25)); }
    a = clamp(a) * (r < 1 ? 1 : 0);
    const i = (y * SPR + x) * 4;
    d[i] = Math.min(255, r0 + (255 - r0) * hot); d[i + 1] = Math.min(255, g0 + (255 - g0) * hot); d[i + 2] = Math.min(255, b0 + (255 - b0) * hot);
    d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  SPRITES.set(key, s);
  return s;
}
// A soft line whose brightness ramps up from the tail (left) to a hot head (right)
function streakSprite(rgb: RGB) {
  const q = (c: number) => Math.round(c / 8) * 8;
  const key = 'streak' + q(rgb[0]) + ',' + q(rgb[1]) + ',' + q(rgb[2]);
  let s = SPRITES.get(key);
  if (s) return s;
  const SW = 256, SH = 32;
  s = mk(SW, SH);
  const g = ctx2d(s), img = g.createImageData(SW, SH), d = img.data;
  const [r0, g0, b0] = [q(rgb[0]), q(rgb[1]), q(rgb[2])];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const u = (x + 0.5) / SW, v = (y + 0.5 - SH / 2) / (SH / 2);
    const along = Math.pow(u, 1.5) * clamp((1 - u) / 0.02 + 0.35);
    const core = Math.exp(-v * v * 9), soft = Math.exp(-v * v * 2.2) * 0.3;
    const a = clamp(along * (core + soft)), hot = core * Math.pow(u, 6) * 0.75;
    const i = (y * SW + x) * 4;
    d[i] = r0 + (255 - r0) * hot; d[i + 1] = g0 + (255 - g0) * hot; d[i + 2] = b0 + (255 - b0) * hot; d[i + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  SPRITES.set(key, s);
  return s;
}

export class Gfx {
  ctx: CanvasRenderingContext2D;
  // Camera: world point (cx, cy) appears at the screen centre, scaled by zoom and rotated by rot (radians)
  cx = W / 2; cy = H / 2; zoom = 1; rot = 0;
  constructor(public c: HTMLCanvasElement) {
    this.ctx = c.getContext('2d', {alpha: false}) as CanvasRenderingContext2D;
    buffers();
  }

  begin(bg: RGB = [3, 5, 10]) {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.fillStyle = css(bg); g.fillRect(0, 0, W, H);
    this.camera(W / 2, H / 2, 1, 0);
    g.globalCompositeOperation = 'lighter';
  }
  camera(cx: number, cy: number, zoom = 1, rot = 0) {
    this.cx = cx; this.cy = cy; this.zoom = zoom; this.rot = rot;
    this.apply();
  }
  apply() {
    const c = Math.cos(this.rot) * this.zoom, s = Math.sin(this.rot) * this.zoom;
    this.ctx.setTransform(c, s, -s, c, W / 2 - c * this.cx + s * this.cy, H / 2 - s * this.cx - c * this.cy);
  }
  screen() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); }
  // Is a world-space circle possibly on screen?
  visible(x: number, y: number, r: number) {
    const dx = x - this.cx, dy = y - this.cy, c = Math.cos(this.rot), s = Math.sin(this.rot);
    const sx = W / 2 + (c * dx - s * dy) * this.zoom, sy = H / 2 + (s * dx + c * dy) * this.zoom, m = r * this.zoom;
    return sx > -m && sy > -m && sx < W + m && sy < H + m;
  }

  // Additive glow at (x, y) with radius r
  glow(x: number, y: number, r: number, rgb: RGB, a = 1, kind: SpriteKind = 'glow') {
    if (a <= 0.004 || r <= 0.05 || !this.visible(x, y, r)) return;
    const g = this.ctx;
    if (r * this.zoom < 0.9) { g.globalAlpha = clamp(a * r * this.zoom * 1.1); g.fillStyle = css(rgb); g.fillRect(x - 0.6 / this.zoom, y - 0.6 / this.zoom, 1.2 / this.zoom, 1.2 / this.zoom); return; }
    g.globalAlpha = clamp(a);
    g.drawImage(sprite(rgb, kind), x - r, y - r, r * 2, r * 2);
  }
  // A motion-blurred streak: head at (x, y), tail len behind it along angle ang; w is the full soft width
  streak(x: number, y: number, ang: number, len: number, w: number, rgb: RGB, a = 1) {
    if (a <= 0.004 || len < 0.5 || !this.visible(x, y, len + w)) return;
    const c = Math.cos(ang), s = Math.sin(ang), tx = x - c * len, ty = y - s * len, g = this.ctx;
    g.save();
    g.globalAlpha = clamp(a);
    g.transform((c * len) / 256, (s * len) / 256, (-s * w) / 32, (c * w) / 32, tx + (s * w) / 2, ty - (c * w) / 2);
    g.drawImage(streakSprite(rgb), 0, 0);
    g.restore();
  }
  line(x1: number, y1: number, x2: number, y2: number, rgb: RGB, a = 1, w = 1.5) {
    if (a <= 0.004) return;
    const g = this.ctx;
    g.globalAlpha = clamp(a); g.strokeStyle = css(rgb); g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  // A glowing polyline: wide faint pass, medium pass, thin bright pass
  glowLine(pts: readonly (readonly [number, number])[], rgb: RGB, a = 1, w = 1.6, closed = false) {
    if (a <= 0.004 || pts.length < 2) return;
    const g = this.ctx;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = css(rgb);
    for (const [ww, aa] of [[w * 6, 0.08], [w * 2.5, 0.22], [w, 0.9]] as const) {
      g.globalAlpha = clamp(a * aa); g.lineWidth = ww;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      if (closed) g.closePath();
      g.stroke();
    }
  }
  glowArc(x: number, y: number, r: number, rgb: RGB, a = 1, w = 1.6, a0 = 0, a1 = Math.PI * 2) {
    if (a <= 0.004 || r <= 0) return;
    const g = this.ctx;
    g.lineCap = 'round'; g.strokeStyle = css(rgb);
    for (const [ww, aa] of [[w * 6, 0.08], [w * 2.5, 0.22], [w, 0.9]] as const) {
      g.globalAlpha = clamp(a * aa); g.lineWidth = ww;
      g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
    }
  }
  // Filled shape in normal (occluding) mode, then back to additive
  fill(path: (g: CanvasRenderingContext2D) => void, style: string | CanvasGradient, a = 1) {
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(a); g.fillStyle = style;
    g.beginPath(); path(g); g.fill();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
  }
  // A cone of light from (x1, y1) to (x2, y2), half-widths w1 at the source and w2 at the end
  beam(x1: number, y1: number, x2: number, y2: number, rgb: RGB, a: number, w1: number, w2: number) {
    if (a <= 0.01) return;
    const g = this.ctx, gr = g.createLinearGradient(x1, y1, x2, y2), ang = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(ang), ny = Math.cos(ang);
    gr.addColorStop(0, `rgba(${rgb.join(',')},${0.55 * a})`); gr.addColorStop(0.6, `rgba(${rgb.join(',')},${0.2 * a})`); gr.addColorStop(1, `rgba(${rgb.join(',')},${0.06 * a})`);
    g.globalAlpha = 1; g.fillStyle = gr;
    g.beginPath(); g.moveTo(x1 + nx * w1, y1 + ny * w1); g.lineTo(x2 + nx * w2, y2 + ny * w2); g.lineTo(x2 - nx * w2, y2 - ny * w2); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.closePath(); g.fill();
    // a brighter core line down the middle
    const gc = g.createLinearGradient(x1, y1, x2, y2);
    gc.addColorStop(0, `rgba(255,255,255,${0.5 * a})`); gc.addColorStop(1, `rgba(${rgb.join(',')},0)`);
    g.fillStyle = gc;
    g.beginPath(); g.moveTo(x1 + nx * w1 * 0.25, y1 + ny * w1 * 0.25); g.lineTo(x2 + nx * w2 * 0.12, y2 + ny * w2 * 0.12); g.lineTo(x2 - nx * w2 * 0.12, y2 - ny * w2 * 0.12); g.lineTo(x1 - nx * w1 * 0.25, y1 - ny * w1 * 0.25); g.closePath(); g.fill();
  }

  // ---- post-processing, in screen space ----
  // Bloom: downsample with a soft threshold, blur at three small scales, add back
  bloom(k = 0.7, threshold = 1.7) {
    if (k <= 0) return;
    const B = buffers(), g = this.ctx, b1 = ctx2d(B.b1), b2 = ctx2d(B.b2), b3 = ctx2d(B.b3);
    this.screen();
    b1.globalCompositeOperation = 'copy'; b1.filter = `contrast(${threshold}) brightness(${0.75 + threshold * 0.1}) blur(2px)`; b1.drawImage(this.c, 0, 0, B.b1.width, B.b1.height);
    b2.globalCompositeOperation = 'copy'; b2.filter = 'blur(3px)'; b2.drawImage(B.b1, 0, 0, B.b2.width, B.b2.height);
    b3.globalCompositeOperation = 'copy'; b3.filter = 'blur(5px)'; b3.drawImage(B.b2, 0, 0, B.b3.width, B.b3.height);
    b1.filter = b2.filter = b3.filter = 'none';
    g.globalCompositeOperation = 'lighter'; g.filter = 'none';
    g.globalAlpha = clamp(0.5 * k); g.drawImage(B.b1, 0, 0, W, H);
    g.globalAlpha = clamp(0.45 * k); g.drawImage(B.b2, 0, 0, W, H);
    g.globalAlpha = clamp(0.4 * k); g.drawImage(B.b3, 0, 0, W, H);
    g.globalAlpha = 1;
  }
  vignette(k = 0.7) {
    this.screen();
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(k); g.drawImage(buffers().vig, 0, 0); g.globalAlpha = 1;
  }
  // Fine moving grain: breaks up banding in dark gradients once the video is compressed
  grain(frame: number, k = 0.06) {
    this.screen();
    const g = this.ctx, B = buffers(), tile = B.grain[frame % 4], ox = (frame * 97) % 256, oy = (frame * 61) % 256;
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = k;
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) g.drawImage(tile, x, y);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  // Glitch: shift horizontal slices of the finished frame sideways, with a red/cyan split. k = 0..1 strength.
  glitch(k: number, seed: number) {
    if (k <= 0.01) return;
    this.screen();
    const g = this.ctx, B = buffers(), t = ctx2d(B.tmp), R = rng(seed);
    t.globalCompositeOperation = 'copy'; t.drawImage(this.c, 0, 0);
    g.globalCompositeOperation = 'source-over';
    let y = 0;
    while (y < H) {
      const h = 20 + R() * 140, dx = (R() - 0.5) * 2 * 90 * k * (R() < 0.6 ? 1 : 0);
      if (dx) g.drawImage(B.tmp, 0, y, W, h, dx, y, W, h);
      y += h;
    }
    // colour split: add the frame offset left in red and right in cyan, at low weight
    g.globalCompositeOperation = 'lighter';
    t.globalCompositeOperation = 'multiply'; t.fillStyle = 'rgb(255,40,40)'; t.fillRect(0, 0, W, H);
    g.globalAlpha = 0.35 * k; g.drawImage(B.tmp, -14 * k, 0);
    t.globalCompositeOperation = 'copy'; t.drawImage(this.c, 0, 0);
    t.globalCompositeOperation = 'multiply'; t.fillStyle = 'rgb(40,220,255)'; t.fillRect(0, 0, W, H);
    g.drawImage(B.tmp, 14 * k, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // Fade the whole frame toward a colour (k = 1 shows everything)
  fade(k: number, rgb: RGB = [0, 0, 0]) {
    if (k >= 1) return;
    this.screen();
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(1 - k); g.fillStyle = css(rgb); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  }
  // Normal (non-additive) mode for occluding fills; add() returns to additive
  normal() { const g = this.ctx; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; return g; }
  add() { const g = this.ctx; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; return g; }
}
