// art.js: clean line-art pieces for V3. Shapes are built once at load from seeded random numbers.
import { rng, TAU, clamp, lerp } from './lib.js';

export const C = {
  ink: [196, 224, 255], blue: [74, 182, 255], ice: [184, 231, 255], amber: [255, 186, 76], orange: [255, 128, 72],
  green: [128, 213, 134], red: [255, 92, 72], dim: [84, 110, 138], white: [245, 248, 255], sun: [255, 236, 160], gate: [118, 124, 255],
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// ---------- neurons ----------
function grow(out, x, y, a, len, depth, R, w) {
  const pts = [[x, y]];
  for (let k = 1; k <= 7; k++) { a += (R() - 0.5) * 0.3; x += (Math.cos(a) * len) / 7; y += (Math.sin(a) * len) / 7; pts.push([x, y]); }
  out.push({ pts, w, depth });
  if (depth > 0) for (const s of [-1, 1]) grow(out, x, y, a + s * (0.32 + R() * 0.3), len * (0.58 + R() * 0.14), depth - 1, R, w * 0.72);
}
export function makeNeuron(seed, { dendrites = 7, axon = 560, reach = 170, depth = 3 } = {}) {
  const R = rng(seed), branches = [], nodes = [];
  for (let i = 0; i < dendrites; i++) {
    const a = Math.PI + (i / (dendrites - 1) - 0.5) * 4.0 + (R() - 0.5) * 0.25;
    grow(branches, Math.cos(a) * 30, Math.sin(a) * 30, a, reach * (0.75 + R() * 0.5), depth, R, 2.6);
  }
  for (const b of branches) if (b.depth > 0) nodes.push(b.pts.at(-1));
  const ax = [];
  for (let j = 0; j <= 48; j++) { const u = j / 48; ax.push([30 + u * axon * 0.86, u * axon * 0.42 + Math.sin(u * Math.PI * 1.6) * 26 * (1 - u * 0.5)]); }
  const end = ax.at(-1), terminals = [];
  for (let k = 0; k < 5; k++) {
    const a = 0.45 + (k / 4 - 0.5) * 1.5 + (R() - 0.5) * 0.2, L = 40 + R() * 30;
    terminals.push([[...end], [end[0] + Math.cos(a) * L * 0.5, end[1] + Math.sin(a) * L * 0.5], [end[0] + Math.cos(a) * L, end[1] + Math.sin(a) * L]]);
  }
  const acc = [0];
  for (let j = 1; j < ax.length; j++) acc.push(acc[j - 1] + Math.hypot(ax[j][0] - ax[j - 1][0], ax[j][1] - ax[j - 1][1]));
  return { branches, nodes, axon: ax, acc, terminals };
}
export const HERO = makeNeuron(2026);
export const SIDE = makeNeuron(470, { dendrites: 6, axon: 520, reach: 150 });

export function drawNeuron(g, N, x, y, s, { color = C.ink, a = 1, soma = 0, glow = C.blue, channels = 0, chColor = C.blue } = {}) {
  const T = ([px, py]) => [x + px * s, y + py * s];
  for (const b of N.branches) g.glowLine(b.pts.map(T), color, a * (0.5 + 0.12 * b.depth), Math.max(0.8, b.w * s));
  for (const n of N.nodes) { const [nx, ny] = T(n); g.glow(nx, ny, 3 * s + 1.2, color, a * 0.55, 'core'); }
  g.glowLine(N.axon.map(T), color, a * 0.75, Math.max(1, 2.4 * s));
  for (const tm of N.terminals) {
    g.glowLine(tm.map(T), color, a * 0.6, Math.max(0.8, 1.6 * s));
    const [ex, ey] = T(tm.at(-1)); g.glow(ex, ey, 4 * s + 1.5, color, a * 0.7, 'core');
  }
  const r = 30 * s, ctx = g.normal();
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(5,10,20,.94)'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); g.add();
  g.glowArc(x, y, r, color, a * (0.75 + soma * 0.25), Math.max(1.1, 1.9 * s));
  if (soma > 0.01) { g.glow(x, y, r * 2.4, glow, a * soma * 0.95, 'glow'); g.glow(x, y, r * 7, glow, a * soma * 0.22, 'halo'); }
  g.glow(x, y, r * 0.5, soma > 0.01 ? glow : color, a * (0.3 + soma * 0.6), 'core');
  if (channels > 0) for (let i = 0; i < 14; i++) {
    const k = (i / 14) * TAU - Math.PI / 2, on = clamp(channels * 14 - i);
    if (on > 0) { g.glow(x + Math.cos(k) * r, y + Math.sin(k) * r, 7 * s + 2.5, chColor, a * on, 'core'); g.glow(x + Math.cos(k) * r, y + Math.sin(k) * r, 18 * s + 4, chColor, a * on * 0.35, 'glow'); }
  }
}
function axonPoint(N, u) {
  const L = N.acc.at(-1) * clamp(u);
  let j = 1; while (j < N.acc.length - 1 && N.acc[j] < L) j++;
  const f = (L - N.acc[j - 1]) / (N.acc[j] - N.acc[j - 1] || 1), p = N.axon[j - 1], q = N.axon[j];
  return [lerp(p[0], q[0], f), lerp(p[1], q[1], f), Math.atan2(q[1] - p[1], q[0] - p[0])];
}
// A spike travelling from the soma (u = 0) to the terminals (u = 1), sparkling there briefly
export function drawSpike(g, N, x, y, s, u, color = C.blue, a = 1) {
  if (u < 0 || u > 1.2) return;
  if (u <= 1) {
    const [px, py, ang] = axonPoint(N, u);
    g.streak(x + px * s, y + py * s, ang, 70 * s, 9 * s, color, a); g.glow(x + px * s, y + py * s, 18 * s, color, a, 'glow');
  } else {
    const k = 1 - (u - 1) / 0.2;
    for (const tm of N.terminals) { const [ex, ey] = tm.at(-1); g.glow(x + ex * s, y + ey * s, 16 * s, color, a * k, 'glow'); }
  }
}

// ---------- optical fibre and light cone ----------
export function fiber(g, x, yTop, yTip, color, on = 0, to = null, spread = 60, a = 1) {
  const ctx = g.normal(), gr = ctx.createLinearGradient(x - 7, 0, x + 7, 0);
  gr.addColorStop(0, '#1c2633'); gr.addColorStop(0.5, '#8d9bab'); gr.addColorStop(1, '#1c2633');
  ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.fillRect(x - 6, yTop, 12, yTip - yTop); g.add();
  on *= a; if (on <= 0.01) return;
  g.glow(x, yTip, 20, color, on, 'glow');
  if (!to) return;
  const add = g.add(), cone = add.createLinearGradient(x, yTip, to[0], to[1]);
  cone.addColorStop(0, rgba(color, 0.5 * on)); cone.addColorStop(1, rgba(color, 0.08 * on));
  add.fillStyle = cone; add.beginPath(); add.moveTo(x - 6, yTip); add.lineTo(x + 6, yTip); add.lineTo(to[0] + spread, to[1]); add.lineTo(to[0] - spread, to[1]); add.closePath(); add.fill();
}

// ---------- a field of small neurons ----------
const FR = rng(31337);
export const FIELD = [];
for (let r = 0; r < 10; r++) for (let c = 0; c < 8; c++) {
  const x = 70 + c * 128 + (r % 2) * 56 + (FR() - 0.5) * 60, y = 700 + r * 84 + (FR() - 0.5) * 46;
  const dends = Array.from({ length: 7 }, () => {
    const a = FR() * TAU, L = 16 + FR() * 26, b = a + (FR() - 0.5) * 1.1, m = [Math.cos(a) * L, Math.sin(a) * L];
    return [[0, 0], m, [m[0] + Math.cos(b) * L * 0.55, m[1] + Math.sin(b) * L * 0.55]];
  });
  const spikes = []; for (let t = FR() * 2; t < 16; t += 0.8 + FR() * 2.4) spikes.push(t);
  FIELD.push({ x, y, dends, spikes, target: FR() < 0.15 });
}
// Faint links to the nearest neighbours make the field read as a network
export const LINKS = [];
FIELD.forEach((f, i) => FIELD.map((g, j) => [j, Math.hypot(f.x - g.x, f.y - g.y)]).filter(([j, d]) => j > i && d < 150).sort((p, q) => p[1] - q[1]).slice(0, 2).forEach(([j]) => LINKS.push([i, j])));
export function drawField(g, t, { cx = 540, cy = 1080, zoom = 1, a = 1, zap = null, select = 0 } = {}) {
  const P = f => [cx + (f.x - 540) * zoom, cy + (f.y - 1080) * zoom];
  for (const [i, j] of LINKS) { const [x1, y1] = P(FIELD[i]), [x2, y2] = P(FIELD[j]); if (Math.min(y1, y2) > 600 && Math.max(y1, y2) < 1520) g.line(x1, y1, x2, y2, C.ink, a * 0.1 * (1 - select * 0.6), 1); }
  for (const f of FIELD) {
    const [x, y] = P(f);
    if (x < -80 || x > 1160 || y < 600 || y > 1520) continue;
    let act = Math.max(0, ...f.spikes.map(s => (t >= s && t - s < 1.2 ? Math.exp(-(t - s) / 0.18) : 0)));
    let col = C.ink, glow = C.blue, alpha = a;
    if (zap) { const d = Math.hypot(f.x - zap.x, f.y - zap.y); if (d < zap.r) { act = Math.max(act, zap.k * (1 - d / zap.r * 0.5)); glow = C.white; } }
    if (select > 0) { alpha *= f.target ? 1 : 1 - select * 0.7; if (f.target) { act = Math.max(act, select * 0.8); glow = C.blue; } }
    const s = Math.min(2.6, 0.8 * zoom);
    for (const d of f.dends) g.glowLine(d.map(([px, py]) => [x + px * s, y + py * s]), col, alpha * 0.42, 0.9);
    g.glow(x, y, 5 * s + 2, col, alpha * 0.75, 'core');
    if (act > 0.01) { g.glow(x, y, 26 * s, glow, alpha * act, 'glow'); g.glow(x, y, 70 * s, glow, alpha * act * 0.2, 'halo'); }
    if (select > 0 && f.target) g.glowArc(x, y, 22 * s + 6, C.blue, select * 0.9, 1.6);
  }
}

// ---------- the green alga ----------
export function alga(g, x, y, s, t, ang, a = 1) {
  const ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s];
  const ctx = g.normal(); ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha = a;
  const body = ctx.createRadialGradient(-10 * s, -14 * s, 4, 0, 0, 92 * s);
  body.addColorStop(0, 'rgba(120,214,128,.55)'); body.addColorStop(0.7, 'rgba(40,110,60,.42)'); body.addColorStop(1, 'rgba(14,40,24,.6)');
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 0, 92 * s, 70 * s, 0, 0, TAU); ctx.fill(); ctx.restore(); g.add();
  const rim = []; for (let i = 0; i <= 64; i++) { const k = (i / 64) * TAU; rim.push(P(Math.cos(k) * 92, Math.sin(k) * 70)); }
  g.glowLine(rim, C.green, a * 0.85, 2.2);
  const cup = []; for (let i = 0; i <= 30; i++) { const k = Math.PI * 0.55 + (i / 30) * Math.PI * 0.9; cup.push(P(Math.cos(k) * 66, Math.sin(k) * 48)); }
  g.glowLine(cup, C.green, a * 0.6, 7);
  const [nx, ny] = P(8, 0); g.glowArc(nx, ny, 17 * s, C.ice, a * 0.55, 1.6);
  const [ex, ey] = P(48, -40); g.glow(ex, ey, 13 * s, C.red, a, 'glow');
  for (const side of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, beat = Math.sin(t * TAU * 2.2 - u * 4) * 0.55 * u; pts.push(P(90 + u * 120, side * (10 + u * 70) + side * beat * 60)); }
    g.glowLine(pts, C.green, a * 0.7, 1.6);
  }
  return { eye: [ex, ey] };
}

// ---------- membrane cross-section with a light-gated channel ----------
const MR = rng(777);
export const IONS = Array.from({ length: 24 }, (_, i) => ({ x: 120 + MR() * 840, y: 700 + MR() * 190, p: MR() * TAU, order: i, end: [140 + MR() * 800, 1110 + MR() * 170] }));
function plus(g, x, y, r, col, a) { g.glowArc(x, y, r, col, a * 0.8, 1.4); g.line(x - r * 0.5, y, x + r * 0.5, y, col, a, 2); g.line(x, y - r * 0.5, x, y + r * 0.5, col, a, 2); }
export function membrane(g, t, { y = 1000, open = 0, light = 0, flowStart = Infinity, a = 1 } = {}) {
  for (let x = 40; x <= 1040; x += 26) {
    if (Math.abs(x - 540) < 70) continue;
    for (const side of [-1, 1]) {
      const hy = y + side * 52;
      g.glowArc(x, hy, 8, C.ink, a * 0.55, 1.2);
      g.line(x - 3, hy - side * 9, x - 4, y + side * 8, C.ink, a * 0.28, 1.2); g.line(x + 3, hy - side * 9, x + 4, y + side * 8, C.ink, a * 0.28, 1.2);
    }
  }
  const gap = open * 26, ctx = g.normal();
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(540 + side * (21 + gap), y); ctx.rotate(side * open * 0.12); ctx.globalAlpha = a;
    const fill = ctx.createLinearGradient(-20, 0, 20, 0); fill.addColorStop(0, 'rgba(70,74,190,.95)'); fill.addColorStop(1, 'rgba(118,124,255,.95)');
    ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(-20, -66, 40, 132, 18); ctx.fill(); ctx.restore();
  }
  g.add();
  for (const side of [-1, 1]) g.glowArc(540 + side * (21 + gap), y - 40, 3, C.gate, a * (0.4 + light * 0.6), 1.2);
  if (light > 0.01) g.glow(540, y, 120, C.blue, a * light * 0.25, 'halo');
  for (const ion of IONS) {
    const wob = [Math.sin(t * 0.9 + ion.p) * 14, Math.cos(t * 0.7 + ion.p * 1.3) * 10];
    const k = clamp((t - (flowStart + ion.order * 0.17)) / 0.9);
    let px, py;
    if (k <= 0) { px = ion.x + wob[0]; py = ion.y + wob[1]; }
    else if (k < 0.45) { const u = k / 0.45; px = lerp(ion.x + wob[0], 540, u * u); py = lerp(ion.y + wob[1], y - 70, u); }
    else if (k < 0.7) { const u = (k - 0.45) / 0.25; px = 540; py = lerp(y - 70, y + 70, u); }
    else { const u = (k - 0.7) / 0.3; px = lerp(540, ion.end[0] + wob[0] * 0.5, u); py = lerp(y + 70, ion.end[1] + wob[1] * 0.5, u); }
    plus(g, px, py, 12, C.ice, a * 0.9);
  }
}

// ---------- DNA, virus capsid ----------
export function dna(g, x, y, len, t, a = 1, scale = 1) {
  const s1 = [], s2 = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, ph = u * TAU * 2.2 + t * 3, px = x + (u - 0.5) * len * scale;
    s1.push([px, y + Math.sin(ph) * 22 * scale]); s2.push([px, y - Math.sin(ph) * 22 * scale]);
    if (i % 4 === 0) g.line(px, y + Math.sin(ph) * 22 * scale, px, y - Math.sin(ph) * 22 * scale, C.ice, a * 0.35, 1.4);
  }
  g.glowLine(s1, C.blue, a * 0.9, 2); g.glowLine(s2, C.ice, a * 0.8, 2);
}
export function capsid(g, x, y, r, a = 1, spin = 0) {
  const pts = []; for (let i = 0; i <= 6; i++) { const k = spin + (i / 6) * TAU; pts.push([x + Math.cos(k) * r, y + Math.sin(k) * r]); }
  g.glowLine(pts, C.ice, a, 2);
  for (let i = 0; i < 6; i += 2) { const k = spin + (i / 6) * TAU; g.line(x, y, x + Math.cos(k) * r, y + Math.sin(k) * r, C.ice, a * 0.4, 1.3); }
}

// ---------- two-row chart: light pulses above, spikes below ----------
export function chart(g, t, { x0 = 100, x1 = 900, yLight = 1190, yFire = 1350, span = 3, pulses = [], amberFrom = Infinity, a = 1, labelColor = '#8ea2b4' } = {}) {
  const X = time => x1 - ((t - time) / span) * (x1 - 170);
  g.line(170, yLight + 16, x1, yLight + 16, C.dim, a * 0.5, 1); g.line(170, yFire, x1, yFire, C.dim, a * 0.5, 1);
  for (const p of pulses) { if (p > t || p < t - span) continue; const x = X(p), ctx = g.normal(); ctx.globalAlpha = a; ctx.fillStyle = 'rgb(74,182,255)'; ctx.beginPath(); ctx.roundRect(x - 7, yLight - 10, 14, 20, 3); ctx.fill(); g.add(); g.glow(x, yLight, 20, C.blue, a * 0.5, 'glow'); }
  if (t > amberFrom) { const xa = Math.max(170, X(amberFrom)), ctx = g.normal(); ctx.globalAlpha = a; ctx.fillStyle = 'rgb(255,186,76)'; ctx.fillRect(xa, yLight - 7, x1 - xa, 14); g.add(); }
  const pts = [];
  for (let i = 0; i <= 320; i++) {
    const x = 170 + (i / 320) * (x1 - 170), time = t - span + (i / 320) * span;
    let v = Math.sin(time * 37) * 0.025 + Math.sin(time * 61 + 1) * 0.02;
    for (const p of pulses) { const d = time - p - 0.004; if (d > -0.02 && d < 0.06) v += d < 0.008 ? clamp(1 - Math.abs(d - 0.004) / 0.012) : -0.22 * Math.sin(((d - 0.008) / 0.052) * Math.PI); }
    pts.push([x, yFire - v * 112]);
  }
  g.glowLine(pts, C.blue, a * 0.9, 2.2);
  return { labels: [['光', 100, yLight, labelColor], ['放电', 100, yFire - 30, labelColor]] };
}

// ---------- mouse (side view) ----------
export function mouse(g, x, y, phase, speed, a = 1) {
  const bob = Math.sin(phase * 2) * 5 * speed, ctx = g.normal();
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,14,26,.95)';
  ctx.beginPath(); ctx.ellipse(x, y + bob, 170, 78, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 180, y - 35 + bob, 82, 58, -0.15, 0, TAU); ctx.fill(); g.add();
  const body = [], head = [];
  for (let i = 0; i <= 64; i++) { const k = (i / 64) * TAU; body.push([x + Math.cos(k) * 170, y + bob + Math.sin(k) * 78]); }
  for (let i = 0; i <= 48; i++) { const k = (i / 48) * TAU, c = Math.cos(-0.15), s = Math.sin(-0.15), u = Math.cos(k) * 82 * (Math.cos(k) > 0 ? 1.12 : 1), v = Math.sin(k) * 58; head.push([x + 180 + u * c - v * s, y - 35 + bob + u * s + v * c]); }
  g.glowLine(body, C.ink, a * 0.85, 2); g.glowLine(head, C.ink, a * 0.85, 2);
  g.glowArc(x + 140, y - 98 + bob, 30, C.ink, a * 0.85, 2); g.glowArc(x + 140, y - 98 + bob, 17, C.ink, a * 0.35, 1.4);
  g.glow(x + 210, y - 50 + bob, 6, C.ink, a, 'core');
  for (const [dy, dx] of [[-6, 40], [4, 46], [14, 38]]) g.line(x + 262, y - 18 + bob + dy * 0.3, x + 262 + dx, y - 18 + bob + dy, C.ink, a * 0.45, 1.2);
  const tail = []; for (let i = 0; i <= 30; i++) { const u = i / 30; tail.push([x - 168 - u * 210, y + 10 + bob + Math.sin(u * 3.2 + phase * 0.5) * 34 * u - u * 40]); }
  g.glowLine(tail, C.ink, a * 0.7, 1.8);
  for (const [lx, ph] of [[-100, 0], [-60, Math.PI], [90, Math.PI * 0.5], [130, Math.PI * 1.5]]) {
    const sw = Math.sin(phase + ph) * 32 * Math.min(1, speed + 0.15);
    g.glowLine([[x + lx, y + 60 + bob], [x + lx + sw * 0.4, y + 98], [x + lx + sw, y + 122]], C.ink, a * 0.8, 2);
  }
  return { brain: [x + 165, y - 62 + bob] };
}

// ---------- eye, stimulation goggles and perceived objects ----------
export function eye(g, t, { on = 0, retina = 0, a = 1 } = {}) {
  const ex = 470, ey = 1050, R = 140;
  const ring = []; for (let i = 0; i <= 80; i++) { const k = (i / 80) * TAU; ring.push([ex + Math.cos(k) * R, ey + Math.sin(k) * R]); }
  g.glowLine(ring, C.ink, a * 0.8, 2);
  const cornea = []; for (let i = 0; i <= 20; i++) { const k = Math.PI - 0.9 + (i / 20) * 1.8; cornea.push([ex - R + 40 + Math.cos(k) * 52, ey + Math.sin(k) * 52]); }
  g.glowLine(cornea, C.ink, a * 0.7, 1.8);
  g.line(ex - R + 18, ey - 52, ex - R + 18, ey - 16, C.ink, a * 0.7, 3); g.line(ex - R + 18, ey + 16, ex - R + 18, ey + 52, C.ink, a * 0.7, 3);
  const lens = []; for (let i = 0; i <= 40; i++) { const k = (i / 40) * TAU; lens.push([ex - R + 42 + Math.cos(k) * 15, ey + Math.sin(k) * 36]); }
  g.glowLine(lens, C.ice, a * 0.6, 1.6);
  const back = []; for (let i = 0; i <= 30; i++) { const k = -1.05 + (i / 30) * 2.1; back.push([ex + Math.cos(k) * (R - 8), ey + Math.sin(k) * (R - 8)]); }
  g.glowLine(back, retina > 0.01 ? C.orange : C.dim, a * (0.5 + retina * 0.5), 3 + retina * 2);
  if (retina > 0.01) g.glow(ex + R - 12, ey, 60, C.orange, a * retina * 0.5, 'glow');
  const nerve = []; for (let i = 0; i <= 30; i++) { const u = i / 30; nerve.push([ex + R + u * 300, ey + Math.sin(u * 2.4) * 40 + u * 30]); }
  g.glowLine(nerve, C.ink, a * 0.55, 3);
  if (retina > 0.2) for (const k of [0, 0.33, 0.66]) { const u = ((t * 0.9 + k) % 1), i = Math.round(u * 30); g.glow(nerve[i][0], nerve[i][1], 12, C.orange, a * retina * 0.8, 'glow'); }
  const ctx = g.normal(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(16,24,36,.96)'; ctx.beginPath(); ctx.roundRect(70, ey - 46, 150, 92, 18); ctx.fill(); g.add();
  const box = [[88, ey - 46], [202, ey - 46], [220, ey - 28], [220, ey + 28], [202, ey + 46], [88, ey + 46], [70, ey + 28], [70, ey - 28], [88, ey - 46]];
  g.glowLine(box, C.ink, a * 0.8, 1.8); g.glowArc(214, ey, 16, on > 0.01 ? C.orange : C.ink, a * (0.6 + on * 0.4), 1.8);
  if (on > 0.01) {
    const add = g.add(), cone = add.createLinearGradient(220, ey, ex + R - 10, ey);
    cone.addColorStop(0, rgba(C.orange, 0.45 * on)); cone.addColorStop(1, rgba(C.orange, 0.12 * on));
    add.fillStyle = cone; add.beginPath(); add.moveTo(220, ey - 10); add.lineTo(ex - R + 22, ey - 22); add.lineTo(ex + R - 12, ey - 4); add.lineTo(ex + R - 12, ey + 4); add.lineTo(ex - R + 22, ey + 22); add.lineTo(220, ey + 10); add.closePath(); add.fill();
  }
  return { goggles: [145, ey] };
}
export function perceived(g, t, k1, k2, a = 1) {
  const ctx = g.normal(); ctx.globalAlpha = a * 0.9; ctx.strokeStyle = 'rgba(142,162,180,.55)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(120, 1262, 780, 200, 16); ctx.stroke(); ctx.setLineDash([]); g.add();
  const shimmer = 0.85 + 0.15 * Math.sin(t * 23);
  g.line(220, 1425, 820, 1425, C.orange, a * 0.35 * Math.max(k1, k2), 2);
  const cup = [[330, 1345], [342, 1420], [398, 1420], [410, 1345], [330, 1345]];
  g.glowLine(cup, C.orange, a * k1 * shimmer, 2.2); g.glowArc(418, 1373, 18, C.orange, a * k1 * shimmer * 0.8, 2, -1.4, 1.4);
  const book = [[560, 1385], [740, 1371], [748, 1417], [566, 1425], [560, 1385]];
  g.glowLine(book, C.orange, a * k2 * shimmer, 2.2); g.line(652, 1379, 656, 1421, C.orange, a * k2 * shimmer * 0.7, 1.6);
}
