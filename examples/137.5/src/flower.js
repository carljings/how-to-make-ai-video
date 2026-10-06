// flower.js: one sunflower head, drawn from the phyllotaxis rule (Vogel, 1979).
// Seed k sits at angle k·α and radius ∝ √(number of seeds born after it). Nothing else decides the pattern.
import { TAU, clamp, lerp, seg, backOut, norm, dot, rotX, rotY, rotZ, css, mix } from './lib.js';

const YOUNG = [255, 250, 222], GOLD = [255, 204, 96], AMBER = [244, 140, 56];
const PETAL_BASE = [176, 84, 18], PETAL_TIP = [236, 170, 58];
export const LIGHT = norm([-0.45, 0.7, 0.6]);

// Local position of seed k in a head with nf seeds (fractional while growing), angle alpha (radians)
export function seedLocal(k, nf, alpha, dome = 0.12) {
  const age = Math.max(0, nf - 1 - k), r = Math.sqrt(age) / Math.sqrt(Math.max(nf - 1, 8));
  const th = k * alpha;
  return [Math.cos(th) * r, Math.sin(th) * r, dome * (1 - r * r), r, age];
}

// pose: { c: centre [x,y,z], tilt (rad, face turned up), spin (rad), yaw (rad), scale }
export function toWorld(p, pose) {
  let q = rotZ([p[0] * pose.scale, p[1] * pose.scale, p[2] * pose.scale], pose.spin);
  q = rotX(q, -pose.tilt);
  if (pose.yaw) q = rotY(q, pose.yaw);
  return [q[0] + pose.c[0], q[1] + pose.c[1], q[2] + pose.c[2]];
}

// Draw the seeds. opts: n (seeds), alpha (deg), focus, aperture, a (opacity), color(k, age, base) → [rgb, gain]
export function drawSeeds(g, cam, pose, { n, alpha, focus, aperture = 10, a = 1, color = null, size = 0.66, twinkle = 0 }) {
  const al = (alpha * Math.PI) / 180, nInt = Math.ceil(n);
  const spacing = 1 / Math.sqrt(Math.max(n - 1, 8));
  const view = norm([cam.pos[0] - pose.c[0], cam.pos[1] - pose.c[1], cam.pos[2] - pose.c[2]]);
  const faceN = toWorld([0, 0, 1], { ...pose, c: [0, 0, 0], scale: 1 });
  for (let k = 0; k < nInt; k++) {
    const born = clamp(n - k); // 0→1 as the seed emerges
    if (born <= 0) continue;
    const [x, y, z, r, age] = seedLocal(k, n, al);
    const p = cam.project(toWorld([x, y, z], pose));
    if (!p) continue;
    // dome normal for shading
    const nl = norm(toWorld([0.24 * x, 0.24 * y, 1], { ...pose, c: [0, 0, 0], scale: 1 }));
    const lam = 0.62 + 0.38 * Math.max(0, dot(nl, LIGHT)), facing = Math.max(0.3, dot(faceN, view));
    const youth = Math.exp(-age / 26);
    let col = mix(mix(AMBER, GOLD, clamp(1 - r * 1.1 + 0.25)), YOUNG, youth), gain = 1;
    if (color) [col, gain] = color(k, age, col, r);
    const tw = twinkle ? 0.85 + 0.15 * Math.sin(twinkle + k * 1.7) : 1;
    const rad = size * spacing * pose.scale * born;
    g.dof(p, rad * 0.82, col, (0.62 + 0.38 * youth) * lam * facing * a * gain * tw * (0.3 + 0.7 * born), focus, aperture);
  }
}

// Petals: the outermost seeds turn into ray florets that unfold outward. open: 0 (closed) → 1 (open)
export function drawPetals(g, cam, pose, { n, alpha, open, count = 55, a = 1, focus, aperture = 10 }) {
  if (open <= 0.001 || a <= 0.003) return;
  const al = (alpha * Math.PI) / 180, ctx = g.ctx;
  const faceN = toWorld([0, 0, 1], { ...pose, c: [0, 0, 0], scale: 1 });
  const items = [];
  for (let j = 0; j < count; j++) {
    const u = backOut(clamp(open * 1.6 - (j / count) * 0.6), 1.1);
    if (u <= 0.001) continue;
    const th = j * al, ur = [Math.cos(th), Math.sin(th), 0], un = [0, 0, 1], ut = [-Math.sin(th), Math.cos(th), 0];
    const beta = lerp(1.35, -0.12 - 0.08 * Math.sin(j * 2.3), clamp(u)); // angle above the head plane
    const L = 0.6 * (0.85 + 0.15 * Math.sin(j * 1.9)) * Math.min(1.1, u), Wd = 0.095;
    const dir = [Math.cos(beta) * ur[0] + Math.sin(beta) * un[0], Math.cos(beta) * ur[1] + Math.sin(beta) * un[1], Math.sin(beta)];
    const base = [ur[0] * 0.97, ur[1] * 0.97, 0.01];
    const pts = [];
    for (let i = 0; i <= 10; i++) { const s = i / 10, w = Wd * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.75) * (1 - 0.35 * s); pts.push([base[0] + dir[0] * L * s + ut[0] * w, base[1] + dir[1] * L * s + ut[1] * w, base[2] + dir[2] * L * s]); }
    for (let i = 10; i >= 0; i--) { const s = i / 10, w = Wd * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.08)), 0.75) * (1 - 0.35 * s); pts.push([base[0] + dir[0] * L * s - ut[0] * w, base[1] + dir[1] * L * s - ut[1] * w, base[2] + dir[2] * L * s]); }
    const proj = pts.map(q => cam.project(toWorld(q, pose)));
    if (proj.some(q => !q)) continue;
    const pn = norm(toWorld([-Math.sin(beta) * ur[0], -Math.sin(beta) * ur[1], Math.cos(beta)], { ...pose, c: [0, 0, 0], scale: 1 }));
    const shade = 0.5 + 0.5 * Math.abs(dot(pn, LIGHT));
    const zc = proj.reduce((s, q) => s + q.z, 0) / proj.length;
    items.push({ proj, shade, zc, tip: proj[10], base: proj[0] });
  }
  items.sort((p, q) => q.zc - p.zc); // far petals first
  g.normal();
  for (const it of items) {
    const gr = ctx.createLinearGradient(it.base.x, it.base.y, it.tip.x, it.tip.y);
    gr.addColorStop(0, css(PETAL_BASE.map(v => v * it.shade))); gr.addColorStop(1, css(PETAL_TIP.map(v => Math.min(255, v * (0.55 + 0.6 * it.shade)))));
    ctx.globalAlpha = 0.84 * a; ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(it.proj[0].x, it.proj[0].y);
    for (let i = 1; i < it.proj.length; i++) ctx.lineTo(it.proj[i].x, it.proj[i].y);
    ctx.closePath(); ctx.fill();
  }
  g.add();
  for (const it of items) g.glowLine([[it.base.x, it.base.y], [it.tip.x, it.tip.y]], [255, 210, 130], 0.045 * a * it.shade, 1.1);
  void faceN; void TAU; void seg;
}
