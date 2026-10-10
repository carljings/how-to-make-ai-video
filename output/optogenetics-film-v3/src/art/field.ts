// field.ts: a wide field of small neurons in world space (seen from far away when the camera pulls back),
// plus screen-space parallax layers (far dust and near bokeh) that make the pull-back feel deep.
import {rng, TAU, clamp, lerp} from '../lib/math';
import type {Gfx} from '../lib/gfx';
import {W, H, LOCK} from '../timeline';
import {C} from './neuron';

type Pt = [number, number];
export const FIELD_CX = 540, FIELD_CY = 1230, SPACING = 600;
const R = rng(31337);
export interface Cell { x: number; y: number; dends: Pt[][]; spikes: number[]; target: boolean; hero: boolean }
export const CELLS: Cell[] = [];
for (let r = -9; r <= 9; r++) for (let c = -5; c <= 5; c++) {
  const hero = r === 0 && c === 0;
  const x = FIELD_CX + c * SPACING + (r % 2 ? SPACING / 2 : 0) + (hero ? 0 : (R() - 0.5) * 300), y = FIELD_CY + r * SPACING * 0.62 + (hero ? 0 : (R() - 0.5) * 200);
  const dends = Array.from({length: 7}, () => {
    const a = R() * TAU, L = 90 + R() * 130, b = a + (R() - 0.5) * 1.1, m: Pt = [Math.cos(a) * L, Math.sin(a) * L];
    return [[0, 0], m, [m[0] + Math.cos(b) * L * 0.55, m[1] + Math.sin(b) * L * 0.55]] as Pt[];
  });
  const spikes: number[] = [];
  for (let t = 9 + R() * 2; t < 19; t += 0.6 + R() * 2.2) spikes.push(t);
  CELLS.push({x, y, dends, spikes, target: false, hero});
}
// "This type": about one cell in eight, chosen among those that land inside the picture area when zoomed out
export const FIELD_ZOOM = 0.2, FIELD_CAM: Pt = [540, 1180];
export const toScreen = (x: number, y: number, cam: Pt = FIELD_CAM, zoom = FIELD_ZOOM): Pt => [W / 2 + (x - cam[0]) * zoom, H / 2 + (y - cam[1]) * zoom];
{
  const RT = rng(99);
  for (const c of CELLS) {
    const [sx, sy] = toScreen(c.x, c.y);
    if (!c.hero && sx > 90 && sx < 880 && sy > 700 && sy < 1440 && RT() < 0.2) c.target = true;
  }
}
export const TARGETS = CELLS.filter((c) => c.target);
// when each target locks on: one after another over about a second (the score plays a blip on each)
export const LOCK_TIMES = TARGETS.map((_, i) => LOCK + 0.15 + i * (1.1 / TARGETS.length));

const activity = (c: Cell, t: number) => {
  let v = 0;
  for (const s of c.spikes) if (t >= s && t - s < 1.2) v = Math.max(v, Math.exp(-(t - s) / 0.18));
  return v;
};

export interface FieldState { a?: number; zap?: {x: number; y: number; r: number; k: number} | null; dim?: number; lock?: (c: Cell) => number; scanY?: number | null }
// Draw the field with the current camera; zap and scan are in screen space
export function drawField(g: Gfx, t: number, {a = 1, zap = null, dim = 0, lock, scanY = null}: FieldState) {
  const z = g.zoom, lw = 1.1 / z;
  for (const c of CELLS) {
    if (c.hero || !g.visible(c.x, c.y, 260)) continue;
    const [sx, sy] = toScreen(c.x, c.y, [g.cx, g.cy], z);
    let act = activity(c, t), glow = C.blue as readonly number[], alpha = a;
    if (scanY !== null) act = Math.max(act, Math.exp(-Math.abs(sy - scanY) / 26) * 0.9);
    if (zap) { const d = Math.hypot(sx - zap.x, sy - zap.y); if (d < zap.r) { act = Math.max(act, zap.k * (1 - (d / zap.r) * 0.6)); glow = C.white; } }
    const L = lock ? lock(c) : 0;
    if (dim > 0) { alpha *= c.target ? 1 : 1 - dim * 0.75; if (c.target) { act = Math.max(act * (1 - dim), L); glow = C.blue; } }
    for (const d of c.dends) g.glowLine(d.map(([px, py]) => [c.x + px, c.y + py] as Pt), C.ink, alpha * 0.45, lw);
    g.glow(c.x, c.y, 6 / z + 22, C.ink, alpha * 0.8, 'core');
    if (act > 0.01) { g.glow(c.x, c.y, 30 / z, glow as typeof C.blue, alpha * act, 'glow'); g.glow(c.x, c.y, 90 / z, glow as typeof C.blue, alpha * act * 0.22, 'halo'); }
  }
}

// Screen-space depth layers. pull: 0 at the close-up, 1 when fully zoomed out.
const DR = rng(2718);
const DUST = Array.from({length: 260}, () => ({x: DR() * W, y: DR() * H, r: 0.6 + DR() * 1.6, p: DR() * TAU, d: 0.2 + DR() * 0.8}));
const BOKEH = Array.from({length: 7}, () => ({x: DR() * W, y: 500 + DR() * (H - 500), r: 60 + DR() * 90, d: DR()}));
export function drawDepth(g: Gfx, t: number, pull: number, a = 1) {
  g.screen();
  // far dust converges toward the centre as the camera pulls back, twinkling
  for (const s of DUST) {
    const k = lerp(1, 0.55, pull * s.d), x = W / 2 + (s.x - W / 2) * k, y = H / 2 + (s.y - H / 2) * k;
    g.glow(x, y, s.r * 2.4, [150, 190, 235], a * (0.16 + 0.12 * Math.sin(t * 1.3 + s.p)), 'core');
  }
  // near out-of-focus cells rush outward past the lens
  for (const b of BOKEH) {
    const k = lerp(1, 3.2, clamp(pull * 1.3) ** 1.5 * (0.6 + b.d)), x = W / 2 + (b.x - W / 2) * k, y = H / 2 + (b.y - H / 2) * k;
    g.glow(x, y, b.r * k, [90, 150, 220], a * 0.16 * (1 - clamp(pull * 1.2)), 'bokeh');
  }
  g.apply();
}
