// mouse.ts: a side-view line-art mouse with an optical fibre on its head, the arena it runs in, and an X-ray
// variant that shows the midbrain cells the light reaches. Running speed is simulated once at load from the
// light windows in timeline.ts, so every frame can be drawn on its own.
import {TAU, clamp, lerp, rng} from '../lib/math';
import type {Gfx, RGB} from '../lib/gfx';
import {W, H, HOOK_LIGHT, PAY_LIGHT, lightOn} from '../timeline';
import {C} from './neuron';

type Pt = [number, number];

// ---------- speed simulation ----------
// Speed 1 = full run, 0.15 = slow walk. Accelerates fast when the light comes on, slows more gently when it goes off.
const RATE = 240;
function simulate(t0: number, t1: number, windows: [number, number][], v0: number) {
  const v: number[] = [], ph: number[] = [], dist: number[] = [], touch: {t: number; v: number}[] = [];
  let s = v0, p = 0, d = 0, prevC = 1;
  for (let i = 0; i <= Math.ceil((t1 - t0) * RATE); i++) {
    const t = t0 + i / RATE, target = lightOn(t, windows) ? 1 : 0.15, tau = target > s ? 0.16 : 0.5;
    s += (target - s) * (1 - Math.exp(-1 / RATE / tau));
    p += (TAU * (1.0 + 3.6 * s)) / RATE;          // stride rate: about 1.5 Hz walking, 4.6 Hz running
    d += (s * 900) / RATE;                        // ground moves 900 px/s at full speed
    const c = Math.cos(p + Math.PI);              // hind foot: touches down when its swing ends
    if (prevC > 0 && c <= 0 && s > 0.35) touch.push({t, v: s});
    prevC = c;
    v.push(s); ph.push(p); dist.push(d);
  }
  return {t0, v, ph, dist, touch};
}
const HOOK_RUN = simulate(0, 6.6, HOOK_LIGHT, 0.4); // already trotting on frame 0, so even the first still shows motion
const PAY_RUN = simulate(50.4, 56.8, PAY_LIGHT, 0.15);
// hind-foot touchdowns (time, speed): the score puts a footstep on each
export const FOOTSTEPS = [...HOOK_RUN.touch.filter((x) => x.t < 5.6), ...PAY_RUN.touch.filter((x) => x.t >= 51)];
export function runState(t: number) {
  const R = t < 30 ? HOOK_RUN : PAY_RUN, i = Math.round(clamp((t - R.t0) * RATE, 0, R.v.length - 1));
  return {v: R.v[i], phase: R.ph[i], dist: R.dist[i], touch: R.touch.filter((x) => x.t <= t && t - x.t < 0.7)};
}

// ---------- shape ----------
// Outline from the snout clockwise over the back and under the belly, in local units (body centre at 0, 0)
const OUTLINE: Pt[] = [[285, -10], [252, -42], [205, -80], [145, -101], [80, -106], [0, -111], [-90, -101], [-160, -72], [-196, -12], [-182, 44], [-122, 76], [0, 86], [100, 72], [170, 42], [232, 14]];
function catmull(pts: Pt[], n = 10): Pt[] {
  const out: Pt[] = [], L = pts.length;
  for (let i = 0; i < L; i++) {
    const p0 = pts[(i - 1 + L) % L], p1 = pts[i], p2 = pts[(i + 1) % L], p3 = pts[(i + 2) % L];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)) as Pt);
    }
  }
  out.push(out[0]);
  return out;
}

export interface MouseOpts { x: number; y: number; s: number; t: number; light: number; xray?: number; color?: RGB; a?: number }
// Draws the mouse and returns the screen positions the scene needs (fibre ferrule, head, MLR target)
export function drawMouse(g: Gfx, {x, y, s, t, light, xray = 0, a = 1}: MouseOpts) {
  const {v, phase} = runState(t);
  const bob = Math.sin(phase * 2) * 7 * v, stretch = 1 + 0.06 * v * Math.sin(phase * 2 + 0.6), arch = Math.sin(phase * 2) * 8 * v;
  const P = ([px, py]: Pt): Pt => [x + px * s * stretch, y + (py + bob + (px < 120 && px > -170 && py < 0 ? arch * (1 - Math.abs(px + 25) / 160) : 0)) * s];
  const ink: RGB = light > 0.01 ? [lerp(C.ink[0], 150, light), lerp(C.ink[1], 215, light), 255] : C.ink;
  const ground = y + 125 * s;
  // legs: far side first (dim, behind the body), near side after the body
  const leg = (hip: Pt, ph: number, hind: boolean, alpha: number) => {
    const amp = 0.35 + 0.65 * Math.min(1, v * 1.2), stride = (hind ? 78 : 66) * amp, lift = 40 * amp;
    const [hx, hy] = P(hip), fx = hx + Math.sin(ph) * stride * s, fy = ground - Math.max(0, Math.cos(ph)) * lift * s;
    const dx = fx - hx, dy = fy - hy;
    const pts: Pt[] = hind
      ? [[hx, hy], [hx + dx * 0.35 + 30 * s, hy + dy * 0.45], [hx + dx * 0.75 - 16 * s, hy + dy * 0.8], [fx, fy]]
      : [[hx, hy], [hx + dx * 0.5 - 12 * s, hy + dy * 0.55], [fx, fy]];
    g.glowLine(pts, ink, a * alpha, 3.4 * s);
    g.fill((c) => c.ellipse(fx + 6 * s, fy - 3 * s, 15 * s, 6 * s, 0, 0, TAU), 'rgba(12,20,34,0.95)', a);
    g.glowLine([[fx - 9 * s, fy], [fx + 20 * s, fy]], ink, a * alpha, 3 * s);
  };
  leg([150, 38], phase + Math.PI * 1.1, false, 0.45); leg([-116, 30], phase + Math.PI * 2.0, true, 0.45);
  // afterimages of the outline when running fast: reads as speed even in a still frame
  if (v > 0.5) for (const [off, al] of [[70, 0.22], [140, 0.1]] as const) {
    const ghost = catmull(OUTLINE, 6).map(P).map(([px, py]) => [px - off * s * (v - 0.5) * 2, py] as Pt);
    g.glowLine(ghost, C.blue, a * al * (v - 0.5) * 2 * Math.max(light, 0.35), 2 * s);
  }
  // tail, in three pieces so it tapers
  const tail: Pt[] = [];
  for (let i = 0; i <= 30; i++) { const u = i / 30; tail.push([x + (-188 - 330 * u) * s, y + (16 + 30 * u + Math.sin(u * 3.4 + phase * 0.5) * 34 * u + bob * (1 - u)) * s]); }
  g.glowLine(tail.slice(0, 11), ink, a * 0.75, 3 * s); g.glowLine(tail.slice(10, 21), ink, a * 0.6, 2 * s); g.glowLine(tail.slice(20), ink, a * 0.45, 1.3 * s);
  // ear behind the head
  const [ex, ey] = P([112, -104]);
  g.fill((c) => c.arc(ex, ey, 44 * s, 0, TAU), 'rgba(10,18,32,0.96)', a);
  g.glowArc(ex, ey, 44 * s, ink, a * 0.85, 2.2 * s); g.glowArc(ex, ey, 26 * s, [255, 150, 170], a * 0.3, 1.6 * s);
  // body: an occluding fill, then the glowing outline
  const body = catmull(OUTLINE).map(P);
  const fillA = xray > 0 ? lerp(0.96, 0.55, xray) : 0.96;
  g.fill((c) => { c.moveTo(body[0][0], body[0][1]); for (const p of body) c.lineTo(p[0], p[1]); c.closePath(); }, (() => {
    const gr = g.ctx.createLinearGradient(x, y - 110 * s, x, y + 90 * s);
    gr.addColorStop(0, `rgba(22,36,58,${fillA})`); gr.addColorStop(1, `rgba(6,10,20,${fillA})`);
    return gr;
  })(), a);
  if (light > 0.01) { const [hx, hy] = P([150, -70]); g.glow(hx, hy, 260 * s, C.blue, a * light * 0.35, 'halo'); }
  g.glowLine(body, ink, a * 0.9, 2.4 * s);
  g.glowLine([P([-150, 40]), P([-60, 66]), P([60, 70]), P([140, 50])], ink, a * 0.18, 1.6 * s);
  g.glowLine([P([-120, -60]), P([-150, -10]), P([-130, 34])], ink, a * 0.22, 1.6 * s);
  g.glowLine([P([150, -30]), P([140, 10]), P([150, 36])], ink, a * 0.16, 1.4 * s);
  // face
  const [eyx, eyy] = P([214, -52]);
  g.fill((c) => c.arc(eyx, eyy, 9 * s, 0, TAU), '#02050a', a); g.glowArc(eyx, eyy, 9 * s, ink, a * 0.8, 1.6 * s);
  g.glow(eyx + 2.5 * s, eyy - 3 * s, 7 * s, C.white, a, 'core');
  const [nx, ny] = P([287, -12]); g.glow(nx, ny, 9 * s, [255, 150, 170], a * 0.9, 'core');
  for (const k of [-0.28, 0, 0.26]) { const [wx, wy] = P([262, -4]); g.line(wx, wy, wx + Math.cos(k) * 78 * s, wy + Math.sin(k) * 78 * s, ink, a * 0.4, 1.2 * s); }
  // near legs
  leg([150, 38], phase, false, 0.95); leg([-116, 30], phase + Math.PI * 0.9, true, 0.95);
  // implant: a dental-cement cap with a ferrule on top
  const [cx, cy] = P([168, -94]);
  g.fill((c) => c.roundRect(cx - 30 * s, cy - 18 * s, 60 * s, 20 * s, 8 * s), '#3a4656', a);
  g.fill((c) => c.rect(cx - 7 * s, cy - 48 * s, 14 * s, 32 * s), '#9aa8b8', a);
  const ferrule: Pt = [cx, cy - 48 * s];
  // X-ray: brain, the midbrain locomotor region, the spinal cord and nerves to the legs
  let target: Pt = P([118, -54]);
  if (xray > 0.01) {
    const brain: Pt[] = [];
    for (let i = 0; i <= 48; i++) { const k = (i / 48) * TAU; brain.push(P([150 + Math.cos(k) * 78, -58 + Math.sin(k) * 40])); }
    g.glowLine(brain, C.ice, a * xray * 0.55, 1.6 * s);
    const cord = [[96, -44], [40, -66], [-40, -72], [-120, -58], [-170, -30]].map((p) => P(p as Pt));
    g.glowLine(cord, C.ice, a * xray * 0.5, 2.2 * s);
    g.glowLine([P([60, -62]), P([120, -10]), P([150, 34])], C.ice, a * xray * 0.3, 1.2 * s);
    g.glowLine([P([-110, -62]), P([-120, -10]), P([-116, 28])], C.ice, a * xray * 0.3, 1.2 * s);
    // the implanted part of the fibre reaches down to the target cells
    g.line(ferrule[0], ferrule[1], target[0], target[1], [154, 168, 184], a * xray * 0.7, 3 * s);
    const R = rng(77);
    for (let i = 0; i < 14; i++) {
      const px = target[0] + (R() - 0.5) * 50 * s, py = target[1] + 14 * s + (R() - 0.3) * 30 * s;
      g.glow(px, py, 4 * s, light > 0.2 ? C.blue : C.ink, a * xray * (0.5 + light * 0.5), 'core');
      if (light > 0.01) g.glow(px, py, 16 * s, C.blue, a * xray * light * (0.5 + 0.5 * Math.sin(t * 30 + i * 2.1) ** 2), 'glow');
    }
    // signals running from the midbrain down the cord and out to the legs while the light is on
    if (light > 0.2) for (let k = 0; k < 4; k++) {
      const u = (t * 1.6 + k / 4) % 1, i = Math.floor(u * (cord.length - 1)), f = u * (cord.length - 1) - i;
      const sx = lerp(cord[i][0], cord[i + 1][0], f), sy = lerp(cord[i][1], cord[i + 1][1], f);
      g.glow(sx, sy, 14 * s, C.blue, a * xray * light, 'glow');
    }
    target = [target[0], target[1] + 14 * s];
  }
  return {ferrule, target, head: P([180, -60]) as Pt, ground, v, phase};
}

// The fibre from the commutator above down to the ferrule; light runs down it when switched on
export function drawCable(g: Gfx, top: Pt, end: Pt, t: number, light: number, onAt: number, a = 1) {
  const pts: Pt[] = [];
  const sway = Math.sin(t * 2.3) * 14;
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([lerp(top[0], end[0], u) + Math.sin(u * Math.PI) * (26 + sway), lerp(top[1], end[1], u)]); }
  g.glowLine(pts, [120, 134, 150], a * 0.9, 3.2);
  if (light > 0.01) {
    g.glowLine(pts, C.blue, a * light * 0.9, 2.2);
    // a bright packet of light travelling down the cable just after it switches on
    const u = clamp((t - onAt) / 0.18);
    if (u < 1) { const p = pts[Math.round(u * 24)]; g.glow(p[0], p[1], 46, C.white, a * light, 'glow'); }
    g.glow(end[0], end[1], 40, C.blue, a * light, 'glow'); g.glow(end[0], end[1], 160, C.blue, a * light * 0.35, 'halo');
  }
}

// The arena: a horizon glow, a perspective floor grid scrolling with the distance run, dust and speed lines
const SR = rng(4040), SPEED_LINES = Array.from({length: 24}, () => ({y: 0.05 + SR() * 0.95, x: SR(), len: 0.5 + SR(), w: 2 + SR() * 5}));
export function drawArena(g: Gfx, t: number, ground: number, footX: number, k = 1) {
  const {v, dist, touch} = runState(t);
  // horizon
  g.glow(W / 2, ground - 10, 900, [40, 90, 150], 0.18 * k, 'halo');
  g.line(-50, ground, W + 50, ground, C.ink, 0.5 * k, 2);
  // floor grid in perspective: lines converge to a vanishing point above the ground
  const vx = W / 2, vy = ground - 520, span = 140;
  for (let i = -12; i <= 12; i++) {
    const x = ((i * span - dist) % (span * 25) + span * 25 * 1.5) % (span * 25) - span * 12.5 + W / 2;
    const x2 = vx + (x - vx) * ((H - vy) / (ground - vy));
    g.line(x, ground, x2, H, C.ink, 0.12 * k, 1.4);
  }
  for (let j = 1; j <= 6; j++) { const yy = ground + (H - ground) * (j / 6) ** 1.8; g.line(0, yy, W, yy, C.ink, 0.08 * k, 1.2); }
  // speed lines behind and around the runner
  if (v > 0.4) for (const L of SPEED_LINES) {
    const x = ((L.x * (W + 800) - dist * 1.7) % (W + 800) + (W + 800)) % (W + 800) - 300;
    g.streak(x + 300 * L.len, ground - 30 - L.y * 560, Math.PI, 420 * L.len * v, L.w, C.ice, (v - 0.4) * 0.9 * k);
  }
  // dust kicked up at each hind-foot touchdown
  for (const d of touch) {
    const age = t - d.t, R = rng(Math.round(d.t * 1000));
    for (let i = 0; i < 7; i++) {
      const px = footX - age * (380 + R() * 420) * d.v - i * 6, py = ground - 4 - age * (60 + R() * 120) * (1 - age) - R() * 8;
      g.glow(px, py, 3 + R() * 4 + age * 10, [170, 200, 230], k * 0.55 * (1 - age / 0.7) * d.v, 'glow');
    }
  }
}
