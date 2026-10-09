// Drawing methods adapted from the user's neutrino film for this portrait film.
import { clamp } from './lib.js';
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;

export const W = 1080, H = 1920;

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const SPR = 64; // sprite resolution

export class Gfx {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
    this.sprites = new Map();
    this.b1 = mk(270, 480); this.b2 = mk(135, 240); this.b3 = mk(68, 120);
    this.vig = this.makeVignette();
    this.layers = [mk(W, H), mk(W, H)];
  }

  begin(bg = [3, 4, 9]) {
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
    g.shadowBlur = 0; g.shadowColor = 'transparent';
    g.fillStyle = css(bg); g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
  }

  // Sprite kinds: glow (soft gaussian with hot core), core (tight point), bokeh (soft-edged disc), halo (wide, faint)
  sprite(rgb, kind = 'glow') {
    const q = c => Math.round(c / 6) * 6;
    const key = kind + q(rgb[0]) + ',' + q(rgb[1]) + ',' + q(rgb[2]);
    let s = this.sprites.get(key);
    if (s) return s;
    s = mk(SPR, SPR);
    const g = s.getContext('2d'), img = g.createImageData(SPR, SPR), d = img.data, R = SPR / 2;
    const [r0, g0, b0] = [q(rgb[0]), q(rgb[1]), q(rgb[2])];
    for (let y = 0; y < SPR; y++) for (let x = 0; x < SPR; x++) {
      const dx = (x + 0.5 - R) / R, dy = (y + 0.5 - R) / R, rr = dx * dx + dy * dy, r = Math.sqrt(rr);
      let a = 0, hot = 0;
      if (kind === 'glow') { a = Math.exp(-rr * 5.5) * 0.85 + Math.exp(-rr * 40) * 0.6; hot = Math.exp(-rr * 60); }
      else if (kind === 'core') { a = Math.exp(-rr * 14); hot = Math.exp(-rr * 50) * 0.8; }
      else if (kind === 'halo') { const e = clamp(1 - r); a = Math.exp(-rr * 2.6) * e * e * (3 - 2 * e) * 0.9; }
      else if (kind === 'bokeh') { const e = clamp((1 - r) / 0.12); a = e * (0.42 + 0.22 * clamp((r - 0.7) / 0.25)); }
      a = clamp(a) * (r < 1 ? 1 : 0);
      const i = (y * SPR + x) * 4;
      d[i] = Math.min(255, r0 + (255 - r0) * hot); d[i + 1] = Math.min(255, g0 + (255 - g0) * hot); d[i + 2] = Math.min(255, b0 + (255 - b0) * hot);
      d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    this.sprites.set(key, s);
    return s;
  }

  // Additive glow at (x, y) with radius r (pixels)
  glow(x, y, r, rgb, a = 1, kind = 'glow') {
    if (a <= 0.004 || r <= 0.05 || x < -r || y < -r || x > W + r || y > H + r) return;
    const g = this.ctx;
    if (r < 0.9) { // sub-pixel: a tiny bright square is cheaper and reads the same
      g.globalAlpha = clamp(a * r * 1.1); g.fillStyle = css(rgb); g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); return;
    }
    g.globalAlpha = clamp(a);
    g.drawImage(this.sprite(rgb, kind), x - r, y - r, r * 2, r * 2);
  }

  // Streak sprite: a soft line whose brightness ramps up from the tail (left) to a hot head (right)
  streakSprite(rgb) {
    const q = c => Math.round(c / 8) * 8;
    const key = 'streak' + q(rgb[0]) + ',' + q(rgb[1]) + ',' + q(rgb[2]);
    let s = this.sprites.get(key);
    if (s) return s;
    const SW = 256, SH = 32;
    s = mk(SW, SH);
    const g = s.getContext('2d'), img = g.createImageData(SW, SH), d = img.data;
    const [r0, g0, b0] = [q(rgb[0]), q(rgb[1]), q(rgb[2])];
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      const u = (x + 0.5) / SW, v = (y + 0.5 - SH / 2) / (SH / 2);
      const along = Math.pow(u, 1.5) * clamp((1 - u) / 0.02 + 0.35);
      const core = Math.exp(-v * v * 9), soft = Math.exp(-v * v * 2.2) * 0.3;
      const a = clamp(along * (core + soft));
      const hot = core * Math.pow(u, 6) * 0.75;
      const i = (y * SW + x) * 4;
      d[i] = r0 + (255 - r0) * hot; d[i + 1] = g0 + (255 - g0) * hot; d[i + 2] = b0 + (255 - b0) * hot; d[i + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
    this.sprites.set(key, s);
    return s;
  }

  // A motion-blurred streak: head at (x, y), tail len pixels behind it along angle ang; w is the full soft width
  streak(x, y, ang, len, w, rgb, a = 1) {
    if (a <= 0.004 || len < 0.5) return;
    const c = Math.cos(ang), s = Math.sin(ang), tx = x - c * len, ty = y - s * len, m = w + 4;
    if (Math.max(x, tx) < -m || Math.min(x, tx) > W + m || Math.max(y, ty) < -m || Math.min(y, ty) > H + m) return;
    const g = this.ctx;
    g.globalAlpha = clamp(a);
    g.setTransform((c * len) / 256, (s * len) / 256, (-s * w) / 32, (c * w) / 32, tx + (s * w) / 2, ty - (c * w) / 2);
    g.drawImage(this.streakSprite(rgb), 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // A glowing circle or arc (radians), drawn like glowLine
  glowArc(x, y, r, rgb, a = 1, w = 1.6, a0 = 0, a1 = Math.PI * 2) {
    if (a <= 0.004 || r <= 0) return;
    const g = this.ctx;
    g.lineCap = 'round'; g.strokeStyle = css(rgb);
    for (const [ww, aa] of [[w * 6, 0.08], [w * 2.5, 0.22], [w, 0.9]]) {
      g.globalAlpha = clamp(a * aa); g.lineWidth = ww;
      g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
    }
  }

  // A projected 3D point with depth of field. p = camera.project() result.
  // size: world radius; focus: focal depth; aperture: blur strength in pixels per unit of defocus
  dof(p, size, rgb, a, focus, aperture = 30, minR = 0.6) {
    if (!p) return;
    const r0 = Math.max(minR, size * p.s);
    const coc = aperture * Math.abs(p.z - focus) / Math.max(p.z, 0.1);
    const r = r0 + coc;
    const k = Math.max(0.025, (r0 * r0) / (r * r));
    if (coc > 2.2) this.glow(p.x, p.y, r, rgb, a * k * 1.4, 'bokeh');
    else this.glow(p.x, p.y, r * 2.2, rgb, a, 'glow');
  }

  line(x1, y1, x2, y2, rgb, a = 1, w = 1.5) {
    if (a <= 0.004) return;
    const g = this.ctx;
    g.globalAlpha = clamp(a); g.strokeStyle = css(rgb); g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  // A glowing polyline: wide faint pass plus a thin bright pass
  glowLine(pts, rgb, a = 1, w = 1.6) {
    if (a <= 0.004 || pts.length < 2) return;
    const g = this.ctx;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = css(rgb);
    for (const [ww, aa] of [[w * 6, 0.08], [w * 2.5, 0.22], [w, 0.9]]) {
      g.globalAlpha = clamp(a * aa); g.lineWidth = ww;
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.stroke();
    }
  }

  // Bloom: downsample with a soft threshold, blur at three scales, add back
  bloom(k = 0.8, threshold = 1.7) {
    if (k <= 0) return;
    const g = this.ctx, b1 = this.b1.getContext('2d'), b2 = this.b2.getContext('2d'), b3 = this.b3.getContext('2d');
    b1.globalCompositeOperation = 'copy'; b1.filter = `contrast(${threshold}) brightness(${0.75 + threshold * 0.1}) blur(2px)`; b1.drawImage(this.c, 0, 0, this.b1.width, this.b1.height);
    b2.globalCompositeOperation = 'copy'; b2.filter = 'blur(3px)'; b2.drawImage(this.b1, 0, 0, this.b2.width, this.b2.height);
    b3.globalCompositeOperation = 'copy'; b3.filter = 'blur(5px)'; b3.drawImage(this.b2, 0, 0, this.b3.width, this.b3.height);
    b1.filter = b2.filter = b3.filter = 'none';
    g.globalCompositeOperation = 'lighter'; g.filter = 'none';
    g.globalAlpha = clamp(0.5 * k); g.drawImage(this.b1, 0, 0, W, H);
    g.globalAlpha = clamp(0.45 * k); g.drawImage(this.b2, 0, 0, W, H);
    g.globalAlpha = clamp(0.4 * k); g.drawImage(this.b3, 0, 0, W, H);
    g.globalAlpha = 1;
  }

  makeVignette() {
    const c = mk(W, H), g = c.getContext('2d');
    // Many stops along a smoothstep, so the falloff has no edge that could show as a ring on dark frames
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, H * 1.05);
    for (let i = 0; i <= 24; i++) {
      const r = i / 24, k = clamp((r - 0.18) / 0.82);
      gr.addColorStop(r, `rgba(0,0,0,${(0.9 * k * k * (3 - 2 * k)).toFixed(4)})`);
    }
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    return c;
  }
  vignette(k = 0.75) {
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(k); g.drawImage(this.vig, 0, 0); g.globalAlpha = 1;
  }

  // Fade the whole frame toward black (k = 1 shows everything)
  fade(k) {
    if (k >= 1) return;
    const g = this.ctx;
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = clamp(1 - k); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  }

  // Normal (non-additive) drawing mode for UI and type; call add() to return to additive mode
  normal() { const g = this.ctx; g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; return g; }
  add() { const g = this.ctx; g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; return g; }
}
