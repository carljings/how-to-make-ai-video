// eye.ts: a cross-section of the eye with stimulation goggles, and a panel where perceived objects condense out of noise.
import {TAU, clamp, lerp, rng, easeInOut} from '../lib/math';
import type {Gfx} from '../lib/gfx';
import {C} from './neuron';

type Pt = [number, number];
export const EYE = {x: 560, y: 960, r: 200};

export function drawEye(g: Gfx, t: number, {on = 0, retina = 0, a = 1} = {}) {
  const {x: ex, y: ey, r: R} = EYE;
  // sclera
  const ring: Pt[] = [];
  for (let i = 0; i <= 96; i++) { const k = (i / 96) * TAU; ring.push([ex + Math.cos(k) * R, ey + Math.sin(k) * R]); }
  g.fill((c) => c.arc(ex, ey, R, 0, TAU), 'rgba(10,16,28,0.95)', a);
  g.glowLine(ring, C.ink, a * 0.8, 2.2);
  // cornea bulge, iris, lens
  const cornea: Pt[] = [];
  for (let i = 0; i <= 24; i++) { const k = Math.PI - 0.95 + (i / 24) * 1.9; cornea.push([ex - R + 52 + Math.cos(k) * 74, ey + Math.sin(k) * 74]); }
  g.glowLine(cornea, C.ink, a * 0.75, 2);
  g.line(ex - R + 20, ey - 74, ex - R + 20, ey - 22, C.ink, a * 0.7, 4); g.line(ex - R + 20, ey + 22, ex - R + 20, ey + 74, C.ink, a * 0.7, 4);
  const lens: Pt[] = [];
  for (let i = 0; i <= 48; i++) { const k = (i / 48) * TAU; lens.push([ex - R + 52 + Math.cos(k) * 20, ey + Math.sin(k) * 50]); }
  g.glowLine(lens, C.ice, a * 0.6, 1.8);
  // retina: the back wall, with a row of ganglion cells that light up when the treated retina is stimulated
  const back: Pt[] = [];
  for (let i = 0; i <= 40; i++) { const k = -1.1 + (i / 40) * 2.2; back.push([ex + Math.cos(k) * (R - 12), ey + Math.sin(k) * (R - 12)]); }
  g.glowLine(back, retina > 0.01 ? C.orange : C.dim, a * (0.5 + retina * 0.5), 4 + retina * 2);
  for (let i = 0; i < 14; i++) {
    const k = -0.95 + (i / 13) * 1.9, px = ex + Math.cos(k) * (R - 30), py = ey + Math.sin(k) * (R - 30);
    const fl = retina * (0.55 + 0.45 * Math.sin(t * 17 + i * 1.7) ** 2);
    g.glow(px, py, 6, retina > 0.01 ? C.orange : C.ink, a * (0.4 + 0.6 * retina), 'core');
    if (fl > 0.01) g.glow(px, py, 22, C.orange, a * fl * 0.8, 'glow');
  }
  // optic nerve leaving the back of the eye, with signals travelling along it
  const nerve: Pt[] = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; nerve.push([ex + R - 8 + u * 210, ey + 20 + Math.sin(u * 2.2) * 50 + u * 60]); }
  g.glowLine(nerve, C.ink, a * 0.55, 6);
  if (retina > 0.2) for (const k of [0, 0.25, 0.5, 0.75]) {
    const u = (t * 1.3 + k) % 1, p = nerve[Math.round(u * 30)];
    g.glow(p[0], p[1], 16, C.orange, a * retina, 'glow');
  }
  // goggles: a camera and projector in front of the eye
  const gx = 110, gw = 170, gh = 120;
  g.fill((c) => c.roundRect(gx, ey - gh / 2, gw, gh, 22), 'rgba(18,26,40,0.97)', a);
  g.glowLine([[gx + 22, ey - gh / 2], [gx + gw - 22, ey - gh / 2], [gx + gw, ey - gh / 2 + 22], [gx + gw, ey + gh / 2 - 22], [gx + gw - 22, ey + gh / 2], [gx + 22, ey + gh / 2], [gx, ey + gh / 2 - 22], [gx, ey - gh / 2 + 22], [gx + 22, ey - gh / 2]], C.ink, a * 0.8, 2);
  g.glowArc(gx + gw - 14, ey, 22, on > 0.01 ? C.orange : C.ink, a * (0.6 + on * 0.4), 2);
  g.glowArc(gx + 40, ey - 26, 12, C.ink, a * 0.5, 1.5);
  // the projected light: through the pupil and lens onto the back of the eye
  if (on > 0.01) {
    g.beam(gx + gw - 6, ey, ex - R + 30, ey, C.orange, on * 0.9, 14, 26);
    g.beam(ex - R + 40, ey, ex + R - 16, ey, C.orange, on * 0.65, 22, 120);
    g.glow(ex + R - 18, ey, 120, C.orange, a * on * retina * 0.6, 'glow');
  }
}

// Perceived objects (illustrative): points drift in from noise and settle on the outlines of a cup and a notebook
const PR = rng(1221);
const CUP: Pt[] = [], BOOK: Pt[] = [];
{
  const poly = (pts: Pt[], out: Pt[], n: number) => {
    const segs = pts.slice(1).map((p, i) => [pts[i], p, Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])] as const), total = segs.reduce((s, x) => s + x[2], 0);
    for (let i = 0; i < n; i++) {
      let d = (i / n) * total;
      for (const [p, q, L] of segs) { if (d <= L) { out.push([lerp(p[0], q[0], d / L), lerp(p[1], q[1], d / L)]); break; } d -= L; }
    }
  };
  poly([[300, 1300], [314, 1400], [386, 1400], [400, 1300], [300, 1300]], CUP, 70);
  for (let i = 0; i <= 14; i++) { const k = -1.4 + (i / 14) * 2.8; CUP.push([408 + Math.cos(k) * 24, 1340 + Math.sin(k) * 24]); }
  poly([[560, 1360], [760, 1340], [770, 1400], [566, 1418], [560, 1360]], BOOK, 80);
  poly([[662, 1352], [668, 1410]], BOOK, 10);
}
const START = [...CUP, ...BOOK].map(() => [120 + PR() * 780, 1250 + PR() * 200] as Pt);
export function drawPerceived(g: Gfx, t: number, k1: number, k2: number, a = 1) {
  const ctx = g.normal();
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,12,20,0.85)'; ctx.beginPath(); ctx.roundRect(110, 1236, 800, 214, 20); ctx.fill();
  ctx.strokeStyle = 'rgba(160,176,196,0.4)'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  g.add();
  // the table edge
  g.line(180, 1420, 840, 1420, C.orange, a * 0.35 * Math.max(k1, k2), 2);
  [...CUP, ...BOOK].forEach((p, i) => {
    const k = easeInOut(clamp(i < CUP.length ? k1 : k2)), s = START[i], jitter = (1 - k) * 6;
    const x = lerp(s[0], p[0], k) + Math.sin(t * 9 + i) * jitter, y = lerp(s[1], p[1], k) + Math.cos(t * 7 + i * 1.3) * jitter;
    g.glow(x, y, 6 + (1 - k) * 2, C.orange, a * (0.35 + 0.65 * k) * (0.8 + 0.2 * Math.sin(t * 20 + i)), 'core');
    if (k > 0.5) g.glow(x, y, 14, C.orange, a * (k - 0.5) * 0.5, 'glow');
  });
}
