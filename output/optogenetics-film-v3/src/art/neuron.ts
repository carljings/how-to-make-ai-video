// neuron.ts: line-art neurons built once at load from seeded random numbers, drawn as glowing lines.
import {rng, TAU, clamp, lerp} from '../lib/math';
import type {Gfx, RGB} from '../lib/gfx';

export const C = {
  ink: [196, 224, 255], blue: [74, 182, 255], ice: [184, 231, 255], amber: [255, 176, 56], orange: [255, 122, 64],
  green: [120, 222, 130], red: [255, 96, 80], dim: [84, 110, 138], white: [245, 248, 255], sun: [255, 228, 150], gate: [128, 132, 255],
} as const satisfies Record<string, RGB>;

type Pt = [number, number];
export interface Neuron { branches: {pts: Pt[]; w: number; depth: number}[]; nodes: Pt[]; axon: Pt[]; acc: number[]; terminals: Pt[][] }

function grow(out: Neuron['branches'], x: number, y: number, a: number, len: number, depth: number, R: () => number, w: number) {
  const pts: Pt[] = [[x, y]];
  for (let k = 1; k <= 7; k++) { a += (R() - 0.5) * 0.3; x += (Math.cos(a) * len) / 7; y += (Math.sin(a) * len) / 7; pts.push([x, y]); }
  out.push({pts, w, depth});
  if (depth > 0) for (const s of [-1, 1]) grow(out, x, y, a + s * (0.32 + R() * 0.3), len * (0.58 + R() * 0.14), depth - 1, R, w * 0.72);
}
export function makeNeuron(seed: number, {dendrites = 7, axon = 560, reach = 170, depth = 3, axonAngle = 0.45} = {}): Neuron {
  const R = rng(seed), branches: Neuron['branches'] = [], nodes: Pt[] = [];
  for (let i = 0; i < dendrites; i++) {
    const a = Math.PI + axonAngle + (i / (dendrites - 1) - 0.5) * 4.0 + (R() - 0.5) * 0.25;
    grow(branches, Math.cos(a) * 30, Math.sin(a) * 30, a, reach * (0.75 + R() * 0.5), depth, R, 2.6);
  }
  for (const b of branches) if (b.depth > 0) nodes.push(b.pts[b.pts.length - 1]);
  const ax: Pt[] = [], ca = Math.cos(axonAngle), sa = Math.sin(axonAngle);
  for (let j = 0; j <= 48; j++) {
    const u = j / 48, along = 30 + u * axon, side = Math.sin(u * Math.PI * 1.6) * 26 * (1 - u * 0.5);
    ax.push([along * ca - side * sa, along * sa + side * ca]);
  }
  const end = ax[ax.length - 1], terminals: Pt[][] = [];
  for (let k = 0; k < 5; k++) {
    const a = axonAngle + (k / 4 - 0.5) * 1.5 + (R() - 0.5) * 0.2, L = 40 + R() * 30;
    terminals.push([[...end], [end[0] + Math.cos(a) * L * 0.5, end[1] + Math.sin(a) * L * 0.5], [end[0] + Math.cos(a) * L, end[1] + Math.sin(a) * L]]);
  }
  const acc = [0];
  for (let j = 1; j < ax.length; j++) acc.push(acc[j - 1] + Math.hypot(ax[j][0] - ax[j - 1][0], ax[j][1] - ax[j - 1][1]));
  return {branches, nodes, axon: ax, acc, terminals};
}
export const HERO = makeNeuron(2026);
export const SIDE = makeNeuron(470, {dendrites: 6, axon: 520, reach: 150});

export interface NeuronStyle { color?: RGB; a?: number; soma?: number; glow?: RGB; channels?: number; chColor?: RGB; lw?: number }
export function drawNeuron(g: Gfx, N: Neuron, x: number, y: number, s: number, {color = C.ink, a = 1, soma = 0, glow = C.blue, channels = 0, chColor = C.blue, lw = 1}: NeuronStyle = {}) {
  const T = ([px, py]: Pt): Pt => [x + px * s, y + py * s];
  for (const b of N.branches) g.glowLine(b.pts.map(T), color, a * (0.5 + 0.12 * b.depth), Math.max(0.8, b.w * s) * lw);
  for (const n of N.nodes) { const [nx, ny] = T(n); g.glow(nx, ny, 3 * s + 1.2, color, a * 0.55, 'core'); }
  g.glowLine(N.axon.map(T), color, a * 0.75, Math.max(1, 2.4 * s) * lw);
  for (const tm of N.terminals) {
    g.glowLine(tm.map(T), color, a * 0.6, Math.max(0.8, 1.6 * s) * lw);
    const [ex, ey] = T(tm[tm.length - 1]); g.glow(ex, ey, 4 * s + 1.5, color, a * 0.7, 'core');
  }
  const r = 30 * s;
  // the cell body occludes what is behind it, with a faint inner gradient so it reads as a volume
  g.fill((c) => c.arc(x, y, r, 0, TAU), (() => {
    const gr = g.ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgba(40,70,110,0.95)'); gr.addColorStop(1, 'rgba(5,10,20,0.96)');
    return gr;
  })(), a);
  g.glowArc(x, y, r, color, a * (0.75 + soma * 0.25), Math.max(1.1, 1.9 * s) * lw);
  if (soma > 0.01) { g.glow(x, y, r * 2.4, glow, a * soma * 0.95, 'glow'); g.glow(x, y, r * 7, glow, a * soma * 0.22, 'halo'); }
  g.glow(x, y, r * 0.5, soma > 0.01 ? glow : color, a * (0.3 + soma * 0.6), 'core');
  if (channels > 0) for (let i = 0; i < 16; i++) {
    const k = (i / 16) * TAU - Math.PI / 2, on = clamp(channels * 16 - i);
    if (on > 0) {
      const px = x + Math.cos(k) * r, py = y + Math.sin(k) * r;
      g.glow(px, py, 7 * s + 2.5, chColor, a * on, 'core'); g.glow(px, py, 18 * s + 4, chColor, a * on * 0.35, 'glow');
    }
  }
}
export function axonPoint(N: Neuron, u: number): [number, number, number] {
  const L = N.acc[N.acc.length - 1] * clamp(u);
  let j = 1;
  while (j < N.acc.length - 1 && N.acc[j] < L) j++;
  const f = (L - N.acc[j - 1]) / (N.acc[j] - N.acc[j - 1] || 1), p = N.axon[j - 1], q = N.axon[j];
  return [lerp(p[0], q[0], f), lerp(p[1], q[1], f), Math.atan2(q[1] - p[1], q[0] - p[0])];
}
// A spike travelling from the soma (u = 0) to the terminals (u = 1), sparkling there briefly
export function drawSpike(g: Gfx, N: Neuron, x: number, y: number, s: number, u: number, color: RGB = C.blue, a = 1) {
  if (u < 0 || u > 1.25) return;
  if (u <= 1) {
    const [px, py, ang] = axonPoint(N, u);
    g.streak(x + px * s, y + py * s, ang, 90 * s, 10 * s, color, a); g.glow(x + px * s, y + py * s, 20 * s, color, a, 'glow');
  } else {
    const k = 1 - (u - 1) / 0.25;
    for (const tm of N.terminals) { const [ex, ey] = tm[tm.length - 1]; g.glow(x + ex * s, y + ey * s, 18 * s, color, a * k, 'glow'); }
  }
}
// An optical fibre coming down from yTop to yTip at x; when on, it glows and throws a cone of light toward `to`
export function fiber(g: Gfx, x: number, yTop: number, yTip: number, color: RGB, on = 0, to: Pt | null = null, spread = 60, a = 1) {
  const gr = g.ctx.createLinearGradient(x - 7, 0, x + 7, 0);
  gr.addColorStop(0, '#1c2633'); gr.addColorStop(0.5, '#8d9bab'); gr.addColorStop(1, '#1c2633');
  g.fill((c) => c.rect(x - 6, yTop, 12, yTip - yTop), gr, a);
  g.fill((c) => c.roundRect(x - 10, yTip - 26, 20, 26, 4), '#566576', a);
  on *= a;
  if (on <= 0.01) return;
  g.line(x, yTop, x, yTip, color, on * 0.5, 3);
  g.glow(x, yTip, 26, color, on, 'glow');
  if (to) g.beam(x, yTip, to[0], to[1], color, on, 8, spread);
}
