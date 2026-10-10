// membrane.ts: a cross-section of the cell membrane in shallow perspective with one light-gated channel.
// Blue light opens the gate; positive ions stream from outside (top) to inside (bottom).
import {TAU, clamp, lerp, rng, easeIn} from '../lib/math';
import type {Gfx, RGB} from '../lib/gfx';
import {W} from '../timeline';
import {C} from './neuron';

export function plusIon(g: Gfx, x: number, y: number, r: number, col: RGB, a: number) {
  g.glow(x, y, r * 2.6, col, a * 0.35, 'glow');
  g.glowArc(x, y, r, col, a * 0.8, 1.6);
  g.line(x - r * 0.5, y, x + r * 0.5, y, col, a, 2.4); g.line(x, y - r * 0.5, x, y + r * 0.5, col, a, 2.4);
}

const MR = rng(777);
export const IONS = Array.from({length: 34}, (_, i) => ({x: 80 + MR() * 920, y: 640 + MR() * 230, p: MR() * TAU, order: i, end: [120 + MR() * 840, 1110 + MR() * 120] as [number, number]}));

// y: membrane centre line; open: 0..1; light: 0..1; flowStart: when ions start to move
export function drawMembrane(g: Gfx, t: number, {y = 1010, open = 0, light = 0, flowStart = Infinity, a = 1} = {}) {
  // three rows of lipid heads per leaflet, the back rows smaller and dimmer: reads as a sheet seen at an angle
  for (const [row, depth] of [[2, 0.45], [1, 0.7], [0, 1]] as const) {
    const sc = lerp(0.62, 1, depth), dy = -row * 16, spacing = 26 * sc, off = row * 9;
    for (let x = -20 + off; x <= W + 20; x += spacing) {
      if (Math.abs(x - 540) < 74 * sc + (row === 0 ? 0 : 10)) continue;
      for (const side of [-1, 1]) {
        const hy = y + dy + side * 54 * sc;
        g.glowArc(x, hy, 8.5 * sc, C.ink, a * 0.55 * depth, 1.3);
        if (row === 0) {
          g.line(x - 3, hy - side * 9, x - 4, y + dy + side * 8, C.ink, a * 0.28, 1.2);
          g.line(x + 3, hy - side * 9, x + 4, y + dy + side * 8, C.ink, a * 0.28, 1.2);
        }
      }
    }
  }
  // the channel: two bundles of helices that swing apart
  const gap = open * 30;
  for (const side of [-1, 1]) {
    const cx = 540 + side * (24 + gap), rot = side * open * 0.12, ctx = g.ctx;
    ctx.save(); ctx.translate(cx, y); ctx.rotate(rot);
    g.fill((c) => c.roundRect(-24, -74, 48, 148, 22), (() => {
      const gr = ctx.createLinearGradient(-24, 0, 24, 0);
      gr.addColorStop(0, 'rgba(70,74,190,0.96)'); gr.addColorStop(1, 'rgba(132,136,255,0.96)');
      return gr;
    })(), a);
    // helix stripes
    for (let j = -3; j <= 3; j++) g.line(-20, j * 20 - 6, 20, j * 20 + 6, [190, 194, 255], a * 0.45, 2);
    ctx.restore();
    g.add();
    g.glowArc(cx, y - 52, 4, C.gate, a * (0.4 + light * 0.6), 1.4);
  }
  if (light > 0.01) g.glow(540, y, 160, C.blue, a * light * 0.3, 'halo');
  // ions
  for (const ion of IONS) {
    const wob: [number, number] = [Math.sin(t * 0.9 + ion.p) * 16, Math.cos(t * 0.7 + ion.p * 1.3) * 12];
    const k = clamp((t - (flowStart + ion.order * 0.07)) / 0.85);
    let px: number, py: number, trail = 0, ang = Math.PI / 2;
    if (k <= 0) { px = ion.x + wob[0]; py = ion.y + wob[1]; }
    else if (k < 0.45) { const u = easeIn(k / 0.45); px = lerp(ion.x + wob[0], 540, u); py = lerp(ion.y + wob[1], y - 80, u); trail = u; ang = Math.atan2(y - 80 - ion.y, 540 - ion.x); }
    else if (k < 0.65) { const u = (k - 0.45) / 0.2; px = 540; py = lerp(y - 80, y + 80, u); trail = 1; }
    else { const u = (k - 0.65) / 0.35; px = lerp(540, ion.end[0] + wob[0] * 0.5, u); py = lerp(y + 80, ion.end[1] + wob[1] * 0.5, u); trail = 1 - u; ang = Math.atan2(ion.end[1] - y - 80, ion.end[0] - 540); }
    if (trail > 0.05) g.streak(px, py, ang, 70 * trail, 10, C.ice, a * 0.6 * trail);
    plusIon(g, px, py, 13, C.ice, a * 0.95);
  }
}
