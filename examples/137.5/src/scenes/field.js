// field.js: the finale. One sunflower, backlit at dusk; the camera rises over a field of silhouettes. The title.
import { TAU, clamp, lerp, seg, smooth, easeInOut, easeOut, rng, gauss, win, css, kf, camera } from '../lib.js';
import { CUE, GOLDEN } from '../timeline.js';
import { F, C, label } from '../text.js';
import { drawSeeds, drawPetals, toWorld } from '../flower.js';

const [S0, S1] = CUE.field;
const FLOWERS = [], MOTES = [];
const SUNPOS = [-40, 1.2, -220];

export function init() {
  const r = rng(137);
  FLOWERS.push({ c: [0, 1.8, 0], tilt: 0.16, spin: 0.4, yaw: 0.1, scale: 0.8, n: 1000, hero: true });
  for (let i = 0; i < 110; i++) {
    const z = -2.5 - Math.pow(r(), 0.75) * 46, x = (r() * 2 - 1) * (6 + Math.abs(z) * 0.75);
    if (Math.abs(x) < 1.6 && z > -5) continue;
    FLOWERS.push({ c: [x, 1.5 + r() * 0.7, z], tilt: 0.15 + r() * 0.25, spin: r() * TAU, yaw: gauss(r) * 0.3, scale: 0.6 + r() * 0.3, droop: gauss(r) * 0.08 });
  }
  for (let i = 0; i < 200; i++) MOTES.push({ p: [(r() * 2 - 1) * 12, 0.4 + r() * 4.5, 3 - r() * 20], ph: r() * TAU, s: 1 + r() * 2 });
}

function cam(t) {
  const pos = kf(t, [[S0, [0.35, 1.72, 5.6]], [134.2, [0.45, 1.8, 6.1]], [140.8, [0.7, 4.4, 15.5]], [S1, [1.3, 4.6, 14.2]]], easeInOut);
  const tgt = kf(t, [[S0, [0, 1.78, 0]], [134.2, [0, 1.8, 0]], [140.8, [0, 4.9, -12]], [S1, [-0.5, 4.9, -14]]], easeInOut);
  return camera(pos, tgt, { fov: 36 });
}

export function draw(g, t) {
  const a = win(t, S0, S1 + 1, 1.0, 1.0);
  if (a <= 0) return;
  const cm = cam(t), ctx = g.ctx;
  // dusk sky and a dark field
  const hz = cm.project([cm.pos[0], 0, cm.pos[2] - 600]), horizon = hz ? hz.y : 620;
  g.normal(); ctx.globalAlpha = a;
  const sky = ctx.createLinearGradient(0, horizon - 820, 0, horizon);
  sky.addColorStop(0, '#060a1a'); sky.addColorStop(0.45, '#151634'); sky.addColorStop(0.75, '#43243a'); sky.addColorStop(0.93, '#8e4430'); sky.addColorStop(1, '#d8823e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, 1920, Math.max(0, horizon));
  const gr = ctx.createLinearGradient(0, horizon, 0, 1080);
  gr.addColorStop(0, '#1a0f0a'); gr.addColorStop(0.2, '#0b0705'); gr.addColorStop(1, '#030202');
  ctx.fillStyle = gr; ctx.fillRect(0, horizon, 1920, 1080 - horizon);
  g.add();
  // the sun, half set
  const sp = cm.project(SUNPOS);
  if (sp) {
    g.glow(sp.x, horizon, 760, [255, 140, 70], 0.13 * a, 'halo');
    g.glow(sp.x, horizon, 220, [255, 190, 120], 0.3 * a, 'halo');
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, horizon); ctx.clip();
    g.glow(sp.x, horizon + 6, 46, [255, 236, 200], 0.9 * a, 'glow');
    ctx.restore();
  }
  // far flowers as backlit silhouettes, near ones in full detail
  const focus = kf(t, [[S0, 5.6], [134.2, 6.1], [140.8, 15], [S1, 16]], easeInOut);
  const order = FLOWERS.map(f => ({ f, d: Math.hypot(f.c[0] - cm.pos[0], f.c[1] - cm.pos[1], f.c[2] - cm.pos[2]) })).sort((p, q) => q.d - p.d);
  for (const { f, d } of order) {
    const head = cm.project(f.c), base = cm.project([f.c[0], 0, f.c[2]]);
    if (!head || !base) continue;
    if (f.hero) {
      g.normal(); ctx.globalAlpha = a; ctx.strokeStyle = '#0c0805'; ctx.lineWidth = Math.max(2, 0.07 * head.s);
      ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(base.x, base.y); ctx.stroke(); g.add();
      const pose = { c: f.c, tilt: f.tilt, spin: f.spin + t * 0.02, yaw: f.yaw, scale: f.scale };
      drawPetals(g, cm, pose, { n: f.n, alpha: GOLDEN, open: 1, count: 34, a: a * 0.8, focus, aperture: 6 });
      // an opaque head body, so the flower hides what is behind it
      const body = [];
      for (let i = 0; i < 48; i++) { const an = (i / 48) * TAU; const q = cm.project(toWorld([Math.cos(an) * 1.0, Math.sin(an) * 1.0, 0], pose)); if (q) body.push(q); }
      g.normal(); ctx.globalAlpha = a; ctx.fillStyle = '#120a05';
      ctx.beginPath(); body.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill(); g.add();
      drawSeeds(g, cm, pose, { n: f.n, alpha: GOLDEN, focus, aperture: 6, a: a * 0.72, size: 0.66 });
      // rim light from the low sun behind
      const rr = 0.8 * f.scale * head.s * 1.55, rim = [];
      for (let i = 0; i <= 40; i++) { const an = Math.PI * 1.02 + (i / 40) * 1.25; rim.push([head.x + Math.cos(an) * rr, head.y + Math.sin(an) * rr * 0.96]); }
      g.glowLine(rim, [255, 200, 130], 0.35 * a, 2);
      continue;
    }
    const rpx = 0.8 * f.scale * head.s, blur = Math.min(1, Math.abs(d - focus) / d * 1.5);
    g.normal(); ctx.globalAlpha = a;
    ctx.strokeStyle = '#090604'; ctx.lineWidth = Math.max(1, 0.05 * head.s);
    ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.quadraticCurveTo(head.x + f.droop * head.s, (head.y + base.y) / 2, base.x, base.y); ctx.stroke();
    ctx.fillStyle = '#0d0805';
    for (let j = 0; j < 21; j++) { const an = j * (GOLDEN / 360) * TAU + f.spin; ctx.beginPath(); ctx.ellipse(head.x + Math.cos(an) * rpx * 1.15, head.y + Math.sin(an) * rpx * 1.15 * 0.9, rpx * 0.5, rpx * 0.2, an, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(head.x, head.y, rpx * 0.95, rpx * 0.9, 0, 0, TAU); ctx.fill();
    g.add();
    // golden rim on the side facing the sun
    const rim = [];
    for (let i = 0; i <= 16; i++) { const an = Math.PI * 1.08 + (i / 16) * 1.0; rim.push([head.x + Math.cos(an) * rpx * 1.22, head.y + Math.sin(an) * rpx * 1.12]); }
    g.glowLine(rim, [255, 196, 120], (0.2 - 0.1 * blur) * a, Math.max(1, rpx * 0.1));
  }
  // pollen drifting in the last light
  for (const m of MOTES) {
    const p = cm.project([m.p[0] + Math.sin(t * 0.3 + m.ph) * 0.4, m.p[1] + ((t - S0) * 0.06) % 2, m.p[2]]);
    if (p) g.dof(p, 0.01 * m.s, [255, 210, 150], 0.3 * a, focus, 10);
  }
}

export function overlay(ctx, t) {
  const a = win(t, CUE.title[0], CUE.title[1], 1.2, 1.2);
  if (a <= 0.003) return;
  const k = easeOut(seg(t, CUE.title[0], CUE.title[0] + 2.2));
  ctx.textAlign = 'center'; ctx.globalAlpha = a;
  ctx.font = `400 168px ${F.math}`; ctx.letterSpacing = '2px';
  ctx.shadowColor = 'rgba(255,190,110,0.7)'; ctx.shadowBlur = 36 + 24 * (1 - k);
  ctx.fillStyle = css([255, 228, 178]); ctx.fillText('137.5°', 960, 236 - 14 * (1 - k));
  ctx.shadowBlur = 0; ctx.letterSpacing = '0px';
  const k2 = easeOut(seg(t, CUE.title[0] + 0.7, CUE.title[0] + 2.0)), k3 = easeOut(seg(t, CUE.title[0] + 1.2, CUE.title[0] + 2.4));
  label(ctx, '一个角度', 960, 306, { size: 34, font: F.zh, weight: 600, color: C.warm, alpha: a * k2, align: 'center', spacing: 14 });
  label(ctx, 'ONE ANGLE', 960, 344, { size: 18, alpha: a * k2 * 0.85, align: 'center', spacing: 10, color: C.en });
  label(ctx, '360° ÷ φ² ≈ 137.5°', 960, 392, { size: 26, font: F.math, color: C.gold, alpha: a * k3 * 0.9, align: 'center' });
  void clamp; void smooth; void lerp;
}
