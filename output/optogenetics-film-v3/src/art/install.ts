// install.ts: a gene as a 3-D double helix, and a virus shell as a spinning wireframe icosahedron.
import {TAU, lerp} from '../lib/math';
import type {Gfx} from '../lib/gfx';
import {C} from './neuron';

// Double helix along x, centred at (x, y); twist rotates it; scale shrinks it as it is packed
export function drawHelix(g: Gfx, x: number, y: number, len: number, twist: number, a = 1, scale = 1) {
  const n = 64, s1: [number, number, number][] = [], s2: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, ph = u * TAU * 2.4 + twist, px = x + (u - 0.5) * len * scale;
    s1.push([px, y + Math.sin(ph) * 30 * scale, Math.cos(ph)]); s2.push([px, y + Math.sin(ph + Math.PI) * 30 * scale, Math.cos(ph + Math.PI)]);
  }
  // rungs (base pairs), fainter when they face away
  for (let i = 0; i <= n; i += 3) g.line(s1[i][0], s1[i][1], s2[i][0], s2[i][1], C.ice, a * (0.25 + 0.2 * Math.abs(s1[i][2])), 1.6 * scale + 0.4);
  // the strand in front is brighter: draw each strand in short pieces with depth-dependent alpha
  for (const [s, col] of [[s1, C.blue], [s2, C.ice]] as const) for (let i = 0; i < n; i++) {
    const z = (s[i][2] + 1) / 2;
    g.glowLine([[s[i][0], s[i][1]], [s[i + 1][0], s[i + 1][1]]], col, a * (0.35 + 0.65 * z), (1.6 + 1.6 * z) * scale + 0.4);
  }
}

// Icosahedron: 12 vertices, 30 edges, rotated in 3-D and projected with mild perspective
const PHI = (1 + Math.sqrt(5)) / 2;
const V: [number, number, number][] = [[-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0], [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI], [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]];
const E: [number, number][] = [];
for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
  const d = Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]);
  if (Math.abs(d - 2) < 0.01) E.push([i, j]);
}
export function drawCapsid(g: Gfx, x: number, y: number, r: number, rotY: number, rotX: number, a = 1, burst = 0) {
  const P = V.map(([vx, vy, vz]) => {
    let X = vx * Math.cos(rotY) + vz * Math.sin(rotY), Z = -vx * Math.sin(rotY) + vz * Math.cos(rotY), Y = vy;
    const Y2 = Y * Math.cos(rotX) - Z * Math.sin(rotX); Z = Y * Math.sin(rotX) + Z * Math.cos(rotX); Y = Y2;
    const k = (r / PHI) * (1 + burst * 2.5), p = 1 / (1 - Z * 0.08);
    return [x + X * k * p, y + Y * k * p, Z] as [number, number, number];
  });
  for (const [i, j] of E) {
    const z = (P[i][2] + P[j][2]) / 2, al = a * (0.45 + 0.35 * (z + PHI) / (2 * PHI)) * (1 - burst);
    if (burst > 0) {
      // edges fly apart: shorten each toward its midpoint as it scatters
      const mx = (P[i][0] + P[j][0]) / 2, my = (P[i][1] + P[j][1]) / 2, sh = 1 - burst * 0.7;
      g.line(lerp(mx, P[i][0], sh), lerp(my, P[i][1], sh), lerp(mx, P[j][0], sh), lerp(my, P[j][1], sh), C.ice, al, 2);
    } else g.glowLine([[P[i][0], P[i][1]], [P[j][0], P[j][1]]], C.ice, al, 1.8);
  }
  for (const p of P) g.glow(p[0], p[1], 5, C.white, a * (1 - burst) * 0.8, 'core');
}
