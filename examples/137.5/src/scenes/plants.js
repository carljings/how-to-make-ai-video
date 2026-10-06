// plants.js: the same rule in other plants. A pinecone, a pineapple (with a crown of leaves), a succulent rosette.
// Every scale, fruitlet and leaf k sits at angle k · 137.5°; only the surface it grows on changes.
import { TAU, clamp, lerp, seg, smooth, easeOut, easeInOut, backOut, win, css, camera, norm, dot, cross, sub, add, mul, rotY } from '../lib.js';
import { CUE, GOLDEN } from '../timeline.js';
import { F, C, label } from '../text.js';

const GA = (GOLDEN * Math.PI) / 180;
const LIGHT = norm([-0.5, 0.75, 0.45]);
export const PLANT_EVENTS = []; // { t, deg, kind } element births for the score

// ── surfaces of revolution: radius profile r(h), height H ───────────────────
const CONE = { K: 140, H: 2.1, r: h => 0.55 * Math.pow(Math.sin(Math.PI * (0.06 + 0.9 * h)), 0.8) * (1 - 0.32 * h), build: [CUE.pinecone[0] + 0.4, CUE.pinecone[0] + 2.6] };
const APPLE = { K: 118, H: 1.85, r: h => 0.62 * Math.pow(Math.max(0, 1 - (2 * h - 1) ** 2), 0.42), build: [CUE.pineapple[0] + 0.5, CUE.pineapple[0] + 2.5] };
const ROSE_N = 60, ROSE_BUILD = [CUE.rosette[0] + 0.6, CUE.rosette[0] + 4.6];

export function init() {
  for (const [P, kind] of [[CONE, 'cone'], [APPLE, 'apple']]) for (let k = 0; k < P.K; k++) PLANT_EVENTS.push({ t: lerp(P.build[0], P.build[1], k / P.K), deg: (k * GOLDEN) % 360, kind });
  for (let k = 0; k < ROSE_N; k++) PLANT_EVENTS.push({ t: lerp(ROSE_BUILD[0], ROSE_BUILD[1], k / ROSE_N), deg: (k * GOLDEN) % 360, kind: 'rosette' });
}

// Point on a surface of revolution and its frame (u: around, v: up the surface, n: outward)
function frame(P, k, h) {
  const th = k * GA, r = P.r(h), dr = (P.r(Math.min(1, h + 0.01)) - P.r(Math.max(0, h - 0.01))) / 0.02;
  const p = [Math.cos(th) * r, h * P.H - P.H / 2, Math.sin(th) * r];
  const u = [-Math.sin(th), 0, Math.cos(th)];
  const v = norm([Math.cos(th) * dr, P.H, Math.sin(th) * dr]);
  const n = norm(cross(v, u)); // points outward
  return { p, u, v, n, r };
}

function drawPolys(g, items, a) {
  items.sort((p, q) => q.z - p.z);
  const ctx = g.normal();
  for (const it of items) {
    ctx.globalAlpha = a; ctx.fillStyle = it.fill;
    ctx.beginPath(); ctx.moveTo(it.pts[0].x, it.pts[0].y);
    for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y);
    ctx.closePath(); ctx.fill();
    if (it.edge) { ctx.strokeStyle = it.edge; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  g.add();
  for (const it of items) if (it.glow) g.glow(it.glow[0], it.glow[1], it.glow[2], it.glow[3], it.glow[4] * a);
}

function shade(n, base, hi = [255, 236, 200]) {
  const l = Math.max(0, dot(n, LIGHT)), k = 0.28 + 0.72 * l;
  return css([Math.min(255, base[0] * k + hi[0] * 0.18 * l * l), Math.min(255, base[1] * k + hi[1] * 0.18 * l * l), Math.min(255, base[2] * k + hi[2] * 0.18 * l * l)]);
}

// ── pinecone: shield-shaped scales that open downward ─────────────────────────
function core(g, P, cam, spin, t0, t, a) {
  const k = clamp((t - t0) / 1.2);
  if (k <= 0) return;
  const pts = [];
  for (let i = 0; i <= 24; i++) { const h = i / 24, r = P.r(h) * 0.92; pts.push(cam.project(rotY([r, h * P.H - P.H / 2, 0], spin + Math.PI / 2))); }
  for (let i = 24; i >= 0; i--) { const h = i / 24, r = P.r(h) * 0.92; pts.push(cam.project(rotY([-r, h * P.H - P.H / 2, 0], spin + Math.PI / 2))); }
  if (pts.some(q => !q)) return;
  const ctx = g.normal(); ctx.globalAlpha = a * k; ctx.fillStyle = '#0d0805';
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (const q of pts) ctx.lineTo(q.x, q.y); ctx.closePath(); ctx.fill();
  g.add();
}

function pinecone(g, t, cam, spin, a) {
  const P = CONE, items = [];
  core(g, P, cam, spin, P.build[0], t, a);
  for (let k = 0; k < P.K; k++) {
    const born = backOut(clamp((t - lerp(P.build[0], P.build[1], k / P.K)) / 0.35), 1.2);
    if (born <= 0.01) continue;
    const h = 0.04 + 0.92 * (k / P.K), f = frame(P, k, h);
    const w = 0.23 * Math.max(0.5, f.r / 0.5) * born, ht = 0.21 * born, lift = 0.07 * born;
    const local = [[0, 0.55], [0.5, 0.05], [0, -0.45], [-0.5, 0.05]].map(([su, sv]) => add(add(f.p, add(mul(f.u, su * w), mul(f.v, sv * ht))), mul(f.n, sv < 0 ? lift : lift * 0.3)));
    const world = local.map(q => rotY(q, spin));
    const nW = rotY(f.n, spin);
    if (dot(nW, norm(sub(cam.pos, rotY(f.p, spin)))) < -0.15) continue;
    const pts = world.map(q => cam.project(q));
    if (pts.some(q => !q)) continue;
    const z = pts.reduce((s, q) => s + q.z, 0) / 4;
    const base = [150, 92, 42].map((c, i) => lerp(c, [212, 150, 80][i], h));
    const tip = pts[2];
    items.push({ pts, z, fill: shade(nW, base), edge: 'rgba(40,22,10,0.55)', glow: [tip.x, tip.y, 9, [255, 200, 120], 0.22 * Math.max(0, dot(nW, LIGHT))] });
  }
  drawPolys(g, items, a);
}

// ── pineapple: hexagonal fruitlets and a crown of leaves ──────────────────────
function pineapple(g, t, cam, spin, a) {
  const P = APPLE, items = [];
  core(g, P, cam, spin, P.build[0], t, a);
  for (let k = 0; k < P.K; k++) {
    const born = backOut(clamp((t - lerp(P.build[0], P.build[1], k / P.K)) / 0.35), 1.2);
    if (born <= 0.01) continue;
    const h = 0.05 + 0.9 * (k / P.K), f = frame(P, k, h);
    const s = 0.15 * Math.max(0.45, f.r / 0.6) * born;
    const hex = Array.from({ length: 6 }, (_, i) => { const an = (i / 6) * TAU + Math.PI / 6; return add(add(f.p, mul(f.n, 0.03 * born)), add(mul(f.u, Math.cos(an) * s), mul(f.v, Math.sin(an) * s * 0.92))); });
    const nW = rotY(f.n, spin);
    if (dot(nW, norm(sub(cam.pos, rotY(f.p, spin)))) < -0.1) continue;
    const pts = hex.map(q => cam.project(rotY(q, spin)));
    if (pts.some(q => !q)) continue;
    const c = cam.project(rotY(add(f.p, mul(f.n, 0.05 * born)), spin));
    const z = pts.reduce((sum, q) => sum + q.z, 0) / 6;
    items.push({ pts, z, fill: shade(nW, [172, 128, 40]), edge: 'rgba(60,40,8,0.8)', glow: c && [c.x, c.y, 6, [255, 210, 120], 0.22 * Math.max(0, dot(nW, LIGHT))] });
  }
  // the crown: leaves at the golden angle, longest outside, rising from the top
  const cb = seg(t, P.build[1] - 0.3, P.build[1] + 1.2);
  for (let k = 0; k < 34 && cb > 0; k++) {
    const age = 1 - k / 34, grow = easeOut(clamp(cb * 1.5 - k / 34 * 0.5));
    if (grow <= 0) continue;
    const th = k * GA, len = (0.35 + 0.55 * age) * grow, up = lerp(1.25, 0.55, age);
    const base = [0, P.H / 2 - 0.05, 0], dir = [Math.cos(th) * Math.cos(up), Math.sin(up), Math.sin(th) * Math.cos(up)];
    const side = [-Math.sin(th), 0, Math.cos(th)], wid = 0.05 * grow;
    const tip = add(base, mul(dir, len));
    const pts = [add(base, mul(side, wid)), tip, add(base, mul(side, -wid))].map(q => cam.project(rotY(q, spin)));
    if (pts.some(q => !q)) continue;
    const nrm = rotY(norm(cross(dir, side)), spin);
    items.push({ pts, z: pts[1].z - 0.01, fill: shade(nrm, [64, 130, 72]), edge: 'rgba(20,50,24,0.6)' });
  }
  drawPolys(g, items, a);
}

// ── rosette: spoon-shaped leaves, new ones at the centre ──────────────────────
function rosette(g, t, cam, spin, a) {
  const items = [], grown = seg(t, ROSE_BUILD[0], ROSE_BUILD[1]) * ROSE_N;
  for (let k = 0; k < ROSE_N; k++) {
    const age = grown - k; // leaves born in order; older leaves are larger and flatter
    if (age <= 0) continue;
    const m = clamp(age / ROSE_N * 1.6 + 0.12), open = easeOut(clamp(age / 6));
    const th = k * GA, len = (0.16 + 0.62 * m) * open, wid = (0.05 + 0.13 * m) * open;
    const elev = lerp(1.25, 0.18, Math.pow(m, 0.7));
    const dir = [Math.cos(th) * Math.cos(elev), Math.sin(elev), Math.sin(th) * Math.cos(elev)], side = [-Math.sin(th), 0, Math.cos(th)];
    const base = mul([Math.cos(th), 0, Math.sin(th)], 0.04);
    const outline = [];
    for (let i = 0; i <= 8; i++) { const s = i / 8, w = wid * Math.sin(Math.PI * Math.min(1, s * 1.05)) * (1 - 0.25 * s) + 0.004; outline.push(add(add(base, mul(dir, len * s)), mul(side, w))); }
    for (let i = 8; i >= 0; i--) { const s = i / 8, w = wid * Math.sin(Math.PI * Math.min(1, s * 1.05)) * (1 - 0.25 * s) + 0.004; outline.push(add(add(base, mul(dir, len * s)), mul(side, -w))); }
    const pts = outline.map(q => cam.project(rotY(q, spin)));
    if (pts.some(q => !q)) continue;
    const nrm = rotY(norm(cross(side, dir)), spin);
    const z = pts.reduce((s, q) => s + q.z, 0) / pts.length;
    const tipCol = [lerp(120, 200, m), lerp(150, 96, m), lerp(130, 120, m)];
    const tp = pts[8];
    items.push({ pts, z, fill: shade(nrm, [lerp(56, 46, m), lerp(108, 92, m), lerp(88, 78, m)]), edge: 'rgba(170,110,120,0.55)', glow: [tp.x, tp.y, 6, tipCol, 0.16] });
  }
  drawPolys(g, items, a);
}

const W1 = CUE.pinecone, W2 = CUE.pineapple, W3 = CUE.rosette;
export function draw(g, t) {
  const a1 = win(t, W1[0], W1[1], 0.6, 0.5), a2 = win(t, W2[0], W2[1], 0.5, 0.5), a3 = win(t, W3[0], W3[1], 0.5, 0.7);
  // a soft pool of light behind whichever plant is on stage
  const ctx = g.ctx, aa = Math.max(a1, a2, a3);
  if (aa > 0.003) {
    ctx.globalAlpha = 0.16 * aa;
    const gr = ctx.createRadialGradient(960, 470, 20, 960, 470, 620);
    gr.addColorStop(0, 'rgba(255,190,120,1)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1920, 1080);
  }
  if (a1 > 0.003) {
    const lt = t - W1[0], cam = camera([0, 0.55, 4.7 - 0.25 * smooth(seg(t, W1[0], W1[1]))], [0, 0.0, 0], { fov: 34 });
    pinecone(g, t, cam, 0.5 + lt * 0.45, a1);
  }
  if (a2 > 0.003) {
    const lt = t - W2[0], cam = camera([0, 0.75, 4.6], [0, 0.12, 0], { fov: 34 });
    pineapple(g, t, cam, -0.4 + lt * 0.4, a2);
  }
  if (a3 > 0.003) {
    const lt = t - W3[0], tilt = lerp(1.35, 0.72, easeInOut(seg(t, W3[0], W3[1])));
    const d = 3.6, cam = camera([0, Math.sin(tilt) * d, Math.cos(tilt) * d], [0, 0.05, 0], { fov: 34 });
    rosette(g, t, cam, lt * 0.18, a3);
  }
}

export function overlay(ctx, t) {
  const items = [[W1, '松果', 'PINECONE', '8 / 13'], [W2, '菠萝', 'PINEAPPLE', '8 / 13'], [W3, '多肉莲座', 'ROSETTE', '137.5°']];
  for (const [[t0, t1], zh, en, num] of items) {
    const a = win(t, t0 + 0.8, t1, 0.6, 0.5);
    if (a <= 0.003) continue;
    label(ctx, zh, 230, 760, { size: 34, font: F.zh, weight: 600, color: C.warm, alpha: a, spacing: 6 });
    label(ctx, en, 230, 796, { size: 16, alpha: a * 0.8, spacing: 6 });
    label(ctx, num, 230, 704, { size: 44, font: F.math, color: C.gold, alpha: a });
  }
}
