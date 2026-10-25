// origin.js — the opening cube continues into its wire structure; dates are supporting labels.
import { W, H, seg, clamp, lerp, easeOut, expoOut, easeInOut, easeIn, smooth, rgba, rng, hex } from '../lib/core.js';
import { solved, posOf } from '../lib/cube.js';
import { camera, drawCube, shadow, cubeSprite, vec } from '../lib/draw3d.js';
import { backdrop, vignette, grid, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { odometer, rr } from '../lib/ui.js';
import { S } from '../seqs.js';
import { CUE, ACT } from '../timeline.js';

const BLUE = '#5aa9ff', LINE = [150, 205, 255], FILL = [6, 18, 36];
const EXF = { center: 1.3, edge: 2.05, corner: 2.6 };
const HERO = new Set(['UFR', 'UF', 'U']);
let SPRITES = null;
export function init() {
  const R = rng(1980), st = solved();
  SPRITES = [cubeSprite(st, { size: 220 })];
}

function explodePlace(c, k) {
  const p = c.home; // the wire cube is solved apart from the top-layer turn; explode from current positions
  const q = c.pos;
  const f = EXF[c.type];
  return { p: q.map((v) => v * lerp(1, f, k)) };
}

export function draw(ctx, t) {
  const O = CUE.origin, Y5 = CUE.y1975, Y8 = CUE.y1980, WALL = CUE.wall;
  backdrop(ctx, { color: ACT.origin, k: 0.16, base: '#030c18', ly: 900 });
  grid(ctx, { step: 54, color: BLUE, a: 0.07, ox: -t * 6, oy: -t * 4 });
  grid(ctx, { step: 270, color: BLUE, a: 0.1, ox: -t * 6, oy: -t * 4 });

  const ex = easeInOut(seg(t, Y5 + 0.1, Y5 + 1.1)) * (1 - easeInOut(seg(t, Y8 - 0.4, Y8 + 0.1)));
  const pull = easeInOut(seg(t, WALL, CUE.count));
  const cam = camera({ yaw: 0.62 + (t - O) * 0.045, pitch: 0.42 + 0.06 * Math.sin((t - O) * 0.5) + 0.25 * pull, dist: lerp(25, 36, ex) + 95 * pull * pull, cy: lerp(980, 900, pull) });
  const st = S.originTurn.at(t);

  // wall of cubes (1980 → worldwide)
  if (t >= WALL - 0.2) wall(ctx, cam, t);

  if (t < Y8 + 0.2 || true) {
    // axles of the mechanism while exploded
    const flood = seg(t, Y8 + 0.35, Y8 + 1.1); // colour sweep bottom → top
    const solidOnly = flood >= 1;
    if (!solidOnly) drawCube(ctx, cam, { ...st, style: 'wire', wire: { line: LINE, fill: FILL, width: 2.4 }, place: ex > 0 ? (c) => explodePlace(c, ex) : null, look: ex > 0 ? (c) => ({ alpha: HERO.has(c.name) ? 1 : 1 - 0.55 * ex }) : null });
    if (ex > 0.02) axles(ctx, cam, st.state, ex);
    if (flood > 0) {
      const top = cam.project([0, 1.6, 0])[1], bot = cam.project([0, -1.9, 0])[1];
      const yy = lerp(bot + 40, top - 60, easeInOut(flood));
      ctx.save(); ctx.beginPath(); ctx.rect(0, solidOnly ? 0 : yy, W, H); ctx.clip();
      if (solidOnly) shadow(ctx, cam, [0, 0, 0], 1, 0.6 * (1 - pull));
      drawCube(ctx, cam, { ...st, rim: 0.4 });
      ctx.restore();
      if (!solidOnly) { const g = ctx.createLinearGradient(0, yy - 30, 0, yy + 30); g.addColorStop(0, 'rgba(160,215,255,0)'); g.addColorStop(0.5, 'rgba(200,235,255,0.85)'); g.addColorStop(1, 'rgba(160,215,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, yy - 30, W, 60); }
    }
  }

  // annotations
  const a1 = easeOut(seg(t, O + 1.3, O + 1.7)) * (1 - seg(t, Y5 - 0.2, Y5));
  if (a1 > 0) {
    const p = cam.project([1.5, 1.5, 1.5]);
    leader(ctx, p[0] + 10, p[1] - 10, 760, 640, a1);
    label(ctx, 'Ernő Rubik', 760, 616, { size: 34, weight: 600, family: MONO, alpha: a1, color: '#cfe6ff' });
    label(ctx, '鲁比克 · 空间教具', 760, 666, { size: 28, weight: 700, alpha: a1 * 0.85 });
  }
  if (ex > 0.3 && t < Y8) {
    const a = clamp((ex - 0.3) / 0.5) * (1 - seg(t, Y8 - 0.5, Y8 - 0.2));
    const pc = cam.project(explodeVec('U', ex)), pe = cam.project(explodeVec('UF', ex)), pk = cam.project(explodeVec('UFR', ex)), po = cam.project([0, 0, 0]);
    callout(ctx, pc, [300, 640], '中心块 · 装在中心轴上', a);
    callout(ctx, pk, [820, 760], '角块 ×8', a);
    callout(ctx, pe, [250, 1430], '棱块 ×12', a);
    callout(ctx, po, [800, 1400], '中心轴', a * 0.9);
  }
  // year ticker
  const yr = t < Y5 ? '1974' : t < Y8 ? '1975' : '1980';
  const yk = t < Y5 ? seg(t, O, O + 0.6) : t < Y8 ? seg(t, Y5, Y5 + 0.6) : seg(t, Y8, Y8 + 0.6);
  const ya = 1 - seg(t, CUE.count - 0.4, CUE.count);
  ctx.save(); ctx.globalAlpha = ya;
  const yrA = easeOut(seg(t, O, O + 0.5));
  odometer(ctx, yr, t < Y5 ? 1 : yk, 72, 1580, { size: 90, color: 'rgba(170,215,255,0.9)', align: 'left', weight: 300, spins: 1, spread: 0.3, seed: yr.charCodeAt(3), fixed: t < Y8 ? 3 : 2, alpha: yrA });
  label(ctx, t < Y5 ? '空间教具' : t < Y8 ? '结构专利' : '走向全球', 250, 1576, { size: 30, weight: 700, alpha: yrA * 0.8, color: '#cfe6ff' });
  ctx.restore();
  // name flip
  if (t >= Y8 + 0.6) {
    const k = seg(t, Y8 + 0.6, Y8 + 1.0), out = seg(t, CUE.count - 0.4, CUE.count);
    const a = (1 - out);
    ctx.save(); ctx.translate(1008, 1576);
    ctx.globalAlpha = a * (1 - k); ctx.scale(1, 1 - k); label(ctx, 'Magic Cube', 0, 0, { size: 38, weight: 600, family: MONO, align: 'right', color: '#cfe6ff' }); ctx.restore();
    ctx.save(); ctx.translate(1008, 1576); ctx.globalAlpha = a * k; ctx.scale(1, k); label(ctx, "Rubik's Cube", 0, 0, { size: 38, weight: 600, family: MONO, align: 'right', color: '#ffffff' }); ctx.restore();
  }

  headline(ctx, t, { t0: O, t1: Y5, kicker: '01 · 结构', lines: ['它最初被做出来，', '是为了**帮助理解空间**'], accent: BLUE, size: 76 });
  headline(ctx, t, { t0: Y5, t1: Y8, kicker: '01 · 结构', lines: ['每一层都能**转动**，', '内部结构把小块连在一起'], accent: BLUE, size: 76 });
  headline(ctx, t, { t0: Y8, t1: CUE.count, kicker: '01 · 结构', lines: ['每拧一下，', '角块和棱块就**重新组合**'], accent: BLUE, size: 76 });
  footnote(ctx, t, { t0: Y5 + 0.5, t1: Y8 - 0.2, text: '结构示意，非原始专利图纸', y: 1360 });
  vignette(ctx, 0.62);
  flash(ctx, seg(t, CUE.count - 0.1, CUE.count) * 0.6);
}

function explodeVec(name, k) {
  const p = posOf(name);
  const n = Math.abs(p[0]) + Math.abs(p[1]) + Math.abs(p[2]);
  const f = n === 1 ? EXF.center : n === 2 ? EXF.edge : EXF.corner;
  return p.map((v) => v * lerp(1, f, k));
}

function axles(ctx, cam, state, ex) {
  const o = cam.project([0, 0, 0]);
  ctx.save(); ctx.globalAlpha = clamp(ex * 1.5);
  ctx.strokeStyle = 'rgba(150,205,255,0.85)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const p = cam.project(d.map((v) => v * lerp(1, EXF.center, ex) * 0.97));
    ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
  }
  const r = (cam.f * 0.42) / o[2];
  const g = ctx.createRadialGradient(o[0] - r * 0.3, o[1] - r * 0.3, 0, o[0], o[1], r);
  g.addColorStop(0, 'rgba(200,235,255,0.9)'); g.addColorStop(1, 'rgba(40,90,150,0.9)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o[0], o[1], r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function leader(ctx, x0, y0, x1, y1, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(170,215,255,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - 20, y1 + 18); ctx.lineTo(x1 + 260, y1 + 18); ctx.stroke();
  ctx.fillStyle = '#cfe6ff'; ctx.beginPath(); ctx.arc(x0, y0, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function callout(ctx, p, [x, y], s, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(170,215,255,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#cfe6ff'; ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.font = `700 32px ${SANS}`; const w = ctx.measureText(s).width + 32; ctx.restore();
  const bx = Math.min(Math.max(x - w / 2, 40), W - 40 - w);
  ctx.save(); ctx.globalAlpha = a; rr(ctx, bx, y - 26, w, 52, 10); ctx.fillStyle = 'rgba(6,22,44,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(120,190,255,0.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  label(ctx, s, bx + 16, y + 11, { size: 32, weight: 700, alpha: a, color: '#e6f3ff' });
}

// rows of cubes to the horizon, appearing outward from the hero cube
function wall(ctx, cam, t) {
  const k = seg(t, CUE.wall - 0.2, CUE.count);
  const items = [];
  for (let gx = -10; gx <= 10; gx++) for (let gz = -16; gz <= -1; gz++) {
    const ring = Math.max(Math.abs(gx), Math.abs(gz));
    const app = easeOut(seg(k, ring * 0.04, ring * 0.04 + 0.3));
    if (app <= 0) continue;
    const p = [gx * 4.4, -4.5, gz * 4.4];
    const pr = cam.project(p);
    if (pr[2] < 2) continue;
    items.push([pr, app]);
  }
  items.sort((a, b) => b[0][2] - a[0][2]);
  const sp = SPRITES[0];
  for (const [pr, app] of items) {
    const s = ((cam.f * 4.6) / pr[2]) * (0.6 + 0.4 * app);
    const fog = clamp(1 - (pr[2] - 40) / 120) * clamp((pr[1] - 520) / 260);
    ctx.globalAlpha = app * fog;
    ctx.drawImage(sp, pr[0] - s / 2, pr[1] - s / 2 - (1 - app) * 60, s, s);
  }
  ctx.globalAlpha = 1;
}
