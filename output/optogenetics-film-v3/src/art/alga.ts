// alga.ts: Chlamydomonas reinhardtii in a microscope field. A single cell about 10 μm across, two flagella that
// beat like a breaststroke, a cup-shaped chloroplast and a red eyespot on its side.
import {TAU, clamp, lerp, rng, easeOut} from '../lib/math';
import type {Gfx} from '../lib/gfx';
import {W, H} from '../timeline';
import {C} from './neuron';
import {plusIon} from './membrane';

type Pt = [number, number];
export const LIGHT: Pt = [880, 700];

// Precomputed swim: surging a little with every stroke, from lower left toward the light, then holding near it
const RATE = 120, T0 = 21.8, T1 = 30.4, STROKE = 2.6; // strokes per second
const TRACK: {x: number; y: number; ang: number}[] = [];
{
  let d = 0;
  for (let i = 0; i <= (T1 - T0) * RATE; i++) {
    const t = T0 + i / RATE, phase = (t * STROKE) % 1;
    const speed = (t < 24.6 ? 1 : Math.max(0, 1 - (t - 24.6) / 0.6) * 1) * (0.35 + 1.3 * Math.max(0, Math.sin(phase * TAU)));
    d += speed / RATE;
    const k = easeOut(clamp(d / 2.4));
    const x = lerp(260, 600, k) + Math.sin(t * 1.3) * 10, y = lerp(1500, 1040, k) + Math.cos(t * 1.1) * 8;
    TRACK.push({x, y, ang: Math.atan2(LIGHT[1] - y, LIGHT[0] - x)});
  }
}
export const algaAt = (t: number) => TRACK[Math.round(clamp((t - T0) * RATE, 0, TRACK.length - 1))];

export function drawMicroscope(g: Gfx, t: number, a = 1) {
  g.screen();
  // caustic light drifting through the water
  const R = rng(11);
  for (let i = 0; i < 7; i++) {
    const cx = R() * W, cy = 500 + R() * (H - 500), p = R() * TAU;
    g.glow(cx + Math.sin(t * 0.4 + p) * 80, cy + Math.cos(t * 0.33 + p) * 60, 380 + R() * 260, [40, 120, 90], a * 0.1, 'halo');
  }
  // out-of-focus specks, some near (big, soft), some far (small, sharp)
  for (let i = 0; i < 40; i++) {
    const near = i < 10, x = (R() * W + t * (near ? 26 : 8) * (R() - 0.3)) % W, y = 520 + R() * (H - 520) + Math.sin(t * 0.7 + i) * 10;
    g.glow(x, y, near ? 18 + R() * 26 : 2 + R() * 3, [150, 220, 190], a * (near ? 0.08 : 0.35), near ? 'bokeh' : 'core');
  }
  // the light source
  g.glow(LIGHT[0], LIGHT[1], 90, C.sun, a * 0.95, 'glow'); g.glow(LIGHT[0], LIGHT[1], 420, C.sun, a * 0.22, 'halo');
  for (let i = 0; i < 16; i++) {
    const k = (i / 16) * TAU + t * 0.12, r1 = 100, r2 = 150 + 30 * Math.sin(t * 2 + i);
    g.line(LIGHT[0] + Math.cos(k) * r1, LIGHT[1] + Math.sin(k) * r1, LIGHT[0] + Math.cos(k) * r2, LIGHT[1] + Math.sin(k) * r2, C.sun, a * 0.3, 2.5);
  }
  g.apply();
}

// Draw the cell at (x, y), anterior (flagella end) pointing along ang; returns the eyespot's position
export function drawAlga(g: Gfx, x: number, y: number, s: number, t: number, ang: number, a = 1) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // local frame: u along the swimming axis (anterior +), v sideways
  const P = (u: number, v: number): Pt => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s];
  const RX = 150, RY = 118;
  // flagella: power stroke sweeps them back straight, recovery brings them forward bent
  const phase = (t * STROKE) % 1;
  for (const side of [-1, 1]) {
    const pts: Pt[] = [];
    const power = phase < 0.45, k = power ? phase / 0.45 : (phase - 0.45) / 0.55;
    const base = power ? lerp(0.35, 2.5, k) : lerp(2.5, 0.35, k), bend = power ? 0.15 : lerp(1.6, 0.4, k);
    let px = RX - 8, py = side * 10, dir = side * base;
    pts.push(P(px, py));
    for (let i = 1; i <= 22; i++) {
      dir += side * bend * 0.06;
      px += Math.cos(dir) * 9.5; py += Math.sin(dir) * 9.5;
      pts.push(P(px, py));
    }
    g.glowLine(pts, C.green, a * 0.8, 2.4 * s);
  }
  // body
  const rim: Pt[] = [], rim2: Pt[] = [];
  for (let i = 0; i <= 72; i++) {
    const k = (i / 72) * TAU, bulge = 1 + 0.06 * Math.cos(k * 2);
    rim.push(P(Math.cos(k) * RX * bulge, Math.sin(k) * RY)); rim2.push(P(Math.cos(k) * (RX - 10) * bulge, Math.sin(k) * (RY - 10)));
  }
  g.fill((c) => { c.moveTo(rim[0][0], rim[0][1]); for (const p of rim) c.lineTo(p[0], p[1]); c.closePath(); }, (() => {
    const gr = g.ctx.createRadialGradient(x, y, 10, x, y, RX * s);
    gr.addColorStop(0, 'rgba(60,140,80,0.55)'); gr.addColorStop(0.75, 'rgba(24,80,44,0.6)'); gr.addColorStop(1, 'rgba(10,36,22,0.7)');
    return gr;
  })(), a);
  g.glowLine(rim, C.green, a * 0.9, 2.6 * s); g.glowLine(rim2, C.green, a * 0.35, 1.2 * s);
  // chloroplast: a thick cup open toward the anterior, with stacked membranes
  const cup: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const k = Math.PI * 0.42 + (i / 40) * Math.PI * 1.16; cup.push(P(Math.cos(k) * 112 - 8, Math.sin(k) * 86)); }
  g.glowLine(cup, C.green, a * 0.7, 18 * s);
  for (let j = 0; j < 3; j++) {
    const inner: Pt[] = [];
    for (let i = 0; i <= 30; i++) { const k = Math.PI * 0.5 + (i / 30) * Math.PI; inner.push(P(Math.cos(k) * (98 - j * 7) - 8, Math.sin(k) * (74 - j * 6))); }
    g.glowLine(inner, [170, 255, 170], a * 0.25, 1 * s);
  }
  // pyrenoid, nucleus, two contractile vacuoles near the flagella
  const [pyx, pyy] = P(-70, 0); g.glowArc(pyx, pyy, 22 * s, [200, 255, 200], a * 0.55, 1.8 * s);
  const [nux, nuy] = P(30, 0); g.glowArc(nux, nuy, 30 * s, C.ice, a * 0.5, 1.8 * s); g.glow(nux, nuy, 10 * s, C.ice, a * 0.4, 'core');
  for (const side of [-1, 1]) { const [vx, vy] = P(112, side * 26); g.glowArc(vx, vy, 9 * s, C.ice, a * 0.4, 1.2 * s); }
  // eyespot on the side facing the light
  const facing = Math.sin(Math.atan2(LIGHT[1] - y, LIGHT[0] - x) - ang) >= 0 ? 1 : -1;
  const eye = P(40, facing * (RY - 18));
  g.fill((c) => c.ellipse(eye[0], eye[1], 16 * s, 9 * s, ang, 0, TAU), 'rgba(255,90,60,0.95)', a);
  g.glow(eye[0], eye[1], 40 * s, C.red, a * 0.9, 'glow');
  return {eye, facing};
}

// The magnifier: a slice of the eyespot's membrane with channelrhodopsins that open in light and let ions through
export function drawInset(g: Gfx, t: number, cx: number, cy: number, r: number, k: number, open: number, flowAt: number) {
  if (k <= 0.01) return;
  const rr = r * easeOut(k);
  g.fill((c) => c.arc(cx, cy, rr, 0, TAU), 'rgba(3,14,12,0.94)');
  const ctx = g.ctx;
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.clip();
  // light rays slanting in from the upper right
  if (open > 0.01) for (let i = 0; i < 5; i++) g.beam(cx + 260 - i * 40, cy - 300, cx + 60 - i * 80, cy + 10, C.blue, open * 0.35, 6, 26);
  // lipid bilayer
  for (let x = cx - r; x <= cx + r; x += 22) for (const side of [-1, 1]) {
    if ([-110, 0, 110].some((d) => Math.abs(x - (cx + d)) < 26)) continue;
    g.glowArc(x, cy + side * 34, 7, C.green, 0.6, 1.2);
    g.line(x - 3, cy + side * 26, x - 3, cy + side * 8, C.green, 0.3, 1.2); g.line(x + 3, cy + side * 26, x + 3, cy + side * 8, C.green, 0.3, 1.2);
  }
  // three channels: two halves that part when light arrives
  for (const d of [-110, 0, 110]) {
    const gap = open * 12;
    for (const side of [-1, 1]) g.fill((c) => c.roundRect(cx + d + side * (11 + gap) - 11, cy - 46, 22, 92, 10), side < 0 ? 'rgba(96,100,230,0.95)' : 'rgba(128,132,255,0.95)');
    if (open > 0.05) g.glow(cx + d, cy, 30, C.blue, open * 0.8, 'glow');
  }
  // ions streaming through the open channels, top (outside) to bottom (inside)
  if (t > flowAt) for (let i = 0; i < 18; i++) {
    const lane = [-110, 0, 110][i % 3], u = ((t - flowAt) * 0.9 + i * 0.17) % 1;
    const px = cx + lane + Math.sin(i * 7.3) * (1 - Math.abs(u - 0.5) * 2) * 30, py = cy - r * 0.8 + u * r * 1.6;
    const near = Math.abs(py - cy) < 50 ? 0 : 1;
    plusIon(g, px + near * Math.sin(i) * 20, py, 10, C.ice, 0.9);
  }
  ctx.restore();
  g.glowArc(cx, cy, rr, C.ice, 0.85, 2);
}
