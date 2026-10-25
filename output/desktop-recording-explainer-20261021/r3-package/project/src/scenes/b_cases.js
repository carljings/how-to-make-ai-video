// b_cases.js — 5 why (the island map: the score is a stand-in for the goal) · 6 case card 02 · 7 hook 2, the block flip
// (Popov et al. 2017 via DeepMind 2020, docs/SCIENCE.md #5), equal scores for flip and stack, the endless patch list.
// The island/contour map is a metaphor, not a real reward landscape; the block scene is an illustrative redraw.
import { W, H, TAU, C, rgba, mix, clamp, lerp, E, F, font, hash, vnoise, frameIdx, keys, pulse, DB, BT, lw, sm, prog } from '../lib/core.js';
import { mk, glow, spark, trail, grid, hatch, roundRect, arrow, check, cross, paper, stamp, scoreBox, steppedValue } from '../lib/draw.js';
import { catmull, Path } from '../lib/geo.js';
import { caseCard, hook } from '../lib/motifs.js';

// ------------------------------------------------------------------ 5 · the island
const PEAK = [905, 700], SIG = 420;
const score = (x, y) => 100 * Math.exp(-((x - PEAK[0]) ** 2 + (y - PEAK[1]) ** 2) / (2 * SIG * SIG));
const ISLAND = (() => {
  const pts = [], cx = 420, cy = 1250;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * TAU, r = 300 * (1 + 0.16 * vnoise(a * 2.2, 3) + 0.08 * vnoise(a * 5.1, 7)) * (1 + 0.18 * Math.max(0, Math.cos(a + 0.85)));
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.92]);
  }
  return pts;
})();
const islandPath = (c) => { c.beginPath(); ISLAND.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
const ROUTE = new Path(catmull([[330, 1360], [420, 1250], [520, 1150], [610, 1040], [700, 930], [800, 810], [PEAK[0], PEAK[1]]], 30));
// where the route leaves the island (coast crossing), found once
let COAST_D = null, ISLE_CTX = null;
const onIsland = (x, y) => { if (!ISLE_CTX) { ISLE_CTX = mk(4, 4).getContext('2d'); islandPath(ISLE_CTX); } return ISLE_CTX.isPointInPath(x, y); };
function coastD() {
  if (COAST_D != null) return COAST_D;
  for (let d = 0; d < ROUTE.len; d += 2) { const [x, y] = ROUTE.at(d); if (!onIsland(x, y)) { COAST_D = d; break; } }
  return COAST_D ?? ROUTE.len * 0.5;
}
// progress along the route: dawdles on the island, then "optimizing" (45.94) and "accelerating" (47.04) kick it up
function routeD(t) {
  const tO = lw(14, 2), tA = lw(14, 3), tR = lw(15, 4);
  const d1 = coastD() * 0.42, d2 = coastD() * 0.78;
  if (t < tO) return d1 * E.out2(clamp((t - DB(21)) / (tO - DB(21))));
  if (t < tA) return lerp(d1, d2, E.io2(clamp((t - tO) / (tA - tO))));
  return lerp(d2, ROUTE.len, E.in2(clamp((t - tA) / (tR - tA))) * 0.6 + 0.4 * E.io3(clamp((t - tA) / (tR - tA))));
}
let SEA = null;
function seaTex() {
  if (SEA) return SEA;
  SEA = mk(W, H); const c = SEA.getContext('2d');
  c.fillStyle = 'rgb(8,8,10)'; c.fillRect(0, 0, W, H);
  c.strokeStyle = rgba(C.bone, 0.075); c.lineWidth = 1.2;
  for (let y = 0; y < H; y += 9) { c.beginPath(); for (let x = 0; x <= W; x += 40) { const yy = y + 2 * Math.sin(x * 0.02 + y * 0.31); x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
  return SEA;
}
function islandScene(c, t, lt) {
  const tO = lw(14, 2), tR = lw(15, 4);
  const d = routeD(t), [px, py] = ROUTE.at(d);
  const left = d > coastD();
  // camera: island close → follow the climb → pull back to show the peak at sea
  const camX = keys(t, [[DB(21), 440], [DB(23), 500], [DB(25), 560], [tO + 1.5, 640, E.io3], [DB(27), 690, E.io3], [tR, 650, E.io3]]);
  const camY = keys(t, [[DB(21), 1180], [DB(23), 1100], [DB(25), 1040], [tO + 1.5, 960, E.io3], [DB(27), 900, E.io3], [tR, 980, E.io3]]);
  const camS = keys(t, [[DB(21), 1.32], [DB(23), 1.12], [DB(25), 1.05], [tO + 1.5, 1.08, E.io3], [DB(27), 0.98, E.io3], [tR, 0.86, E.io3]]);
  c.save(); c.translate(540, 1010); c.scale(camS, camS); c.translate(-camX, -camY);
  c.drawImage(seaTex(), -400, -400, W + 800, H + 800);
  // island: bone land, engraved; dims once the spark has left it
  const dim = left ? 1 - 0.55 * clamp((d - coastD()) / 220) : 1;
  c.save(); islandPath(c); c.clip();
  c.fillStyle = rgba(mix(C.ink3, C.paper2, 0.85 * dim)); c.fillRect(0, 0, W, H);
  // brighter toward the coast that faces the peak: "higher score ≈ better" holds on land
  const g = c.createLinearGradient(260, 1450, 700, 950); g.addColorStop(0, rgba(C.ink, 0.35 * dim)); g.addColorStop(1, rgba(C.bone, 0.25 * dim));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  hatch(c, 80, 900, 700, 700, -0.62, 11, C.inkline, 0.22 * dim, 1.3);
  c.restore();
  c.strokeStyle = rgba(C.bone, 0.9 * dim); c.lineWidth = 4; islandPath(c); c.stroke();
  // the label sits in the island's upper-left, clear of the climb (the route runs lower-left → upper-right)
  c.font = font(900, 46, F.sans); c.fillStyle = rgba(C.inkline, 0.9 * dim); c.fillText('你想要的', 215, 1135);
  check(c, 485, 1121, 46, C.inkline, 8, 0.9 * dim);
  // score contours (orange); numbers only off the island (on it they would sit on the route and the label)
  for (let L = 10; L <= 90; L += 10) {
    const r = SIG * Math.sqrt(-2 * Math.log(L / 100));
    const k = clamp((t - DB(21) - 0.2 - (90 - L) * 0.012) / 0.4);
    c.strokeStyle = rgba(C.signal, (0.25 + 0.55 * (L / 100)) * k); c.lineWidth = L % 30 === 0 ? 3 : 1.8;
    c.beginPath(); c.arc(PEAK[0], PEAK[1], r, Math.PI * 0.5, Math.PI * 0.5 + TAU * E.out3(k)); c.stroke();
    if (L % 20 === 0 || L === 90) {
      const a = 1.3, lx = PEAK[0] + Math.cos(a) * r, ly = PEAK[1] + Math.sin(a) * r;
      if (!onIsland(lx, ly)) { c.font = font(600, 26, F.mono); c.fillStyle = rgba(C.signal, 0.9 * k); c.fillText(String(L), lx + 8, ly - 8); }
    }
  }
  // the peak at sea
  const pk = clamp((t - DB(21) - 0.6) / 0.3);
  c.save(); c.translate(PEAK[0], PEAK[1]); c.rotate(t * 0.4); c.fillStyle = rgba(C.signal, pk);
  c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 34, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore();
  const labL = 540 + (PEAK[0] - 50 - 200 - camX) * camS, labR = 540 + (PEAK[0] - 50 - camX) * camS;     // its screen extent
  const inFrame = clamp((1050 - labR) / 50) * clamp((labL - 20) / 50);
  c.font = font(900, 40, F.sans); c.fillStyle = rgba(C.signal, pk * inFrame); c.textAlign = 'right'; c.fillText('分数最高处', PEAK[0] - 50, PEAK[1] + 14); c.textAlign = 'left';
  // the climb
  trail(c, (tt) => ROUTE.at(routeD(tt)), t, 2.2, { col: C.signal, w: 9, alpha: 0.85, n: 50, tmin: DB(21) });
  // splash when it crosses the coast
  const tCross = (() => { for (let tt = DB(21); tt < tR; tt += 0.01) if (routeD(tt) > coastD()) return tt; return 99; })();
  if (t >= tCross && t < tCross + 0.7) { const k = (t - tCross) / 0.7, [cx, cy] = ROUTE.at(coastD()); c.strokeStyle = rgba(C.bone, 1 - k); c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 20 + 140 * E.out3(k), 0, TAU); c.stroke(); }
  const vel = Math.abs(routeD(t + 0.02) - routeD(t - 0.02)) / 0.04;
  spark(c, px, py, t, { scale: 1.3 + Math.min(1, vel / 900) * 0.5 });
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.signal); c.fillText('AI', px + 40, py + 50);
  // when it arrives: the verdict
  if (t >= tR) {
    // the verdict, in the film's stamp language: score ✓ / what you wanted ✗
    const k = E.outBack(clamp((t - tR) / 0.25)), k2 = E.outBack(clamp((t - tR - 0.3) / 0.25));
    c.save(); c.translate(PEAK[0] - 250, PEAK[1] + 150); c.scale(k, k);
    c.font = font(900, 46, F.sans); c.fillStyle = rgba(C.signal); c.fillText('分数：最高', 0, 0); check(c, 262, -16, 46, C.signal, 8, 1, clamp((t - tR) / 0.25));
    c.restore();
    if (k2 > 0) {
      c.save(); c.translate(PEAK[0] - 250, PEAK[1] + 222); c.scale(k2, k2);
      c.font = font(900, 46, F.sans); c.fillStyle = rgba(C.bone); c.fillText('你想要的：', 0, 0); cross(c, 262, -16, 44, C.bone, 8, 1, clamp((t - tR - 0.3) / 0.25));
      c.restore();
    }
    const f = Math.exp(-(t - tR) / 0.1); c.restore(); c.fillStyle = rgba(C.signal, 0.18 * f); c.fillRect(0, 0, W, H); return;
  }
  c.restore();
}

// ------------------------------------------------------------------ 6 · case card 02
function blocksSide(c, x, y, w, h, o = {}) {
  // a small side view: table, blue block, red block with hatched bottom face, ghost of the wanted state
  const s = o.s ?? 1, tY = y + h - 16;
  c.strokeStyle = rgba(C.inkline, 0.9); c.lineWidth = 3; c.beginPath(); c.moveTo(x, tY); c.lineTo(x + w, tY); c.stroke();
  const b = 70 * s, bx = x + w * 0.22, rx = x + w * 0.58;
  c.fillStyle = rgba(C.blue); c.fillRect(bx, tY - b, b, b);
  c.setLineDash([7, 6]); c.strokeStyle = rgba(C.red, 0.8); c.lineWidth = 2.5; c.strokeRect(bx, tY - 2 * b, b, b); c.setLineDash([]);
  c.fillStyle = rgba(C.red); c.fillRect(rx, tY - b, b, b);
  c.save(); c.beginPath(); c.rect(rx, tY - b * 0.18, b, b * 0.18); c.clip(); hatch(c, rx, tY - b * 0.18, b, b * 0.18, 0.8, 5, C.inkline, 0.9, 1.5); c.restore();
  c.font = font(700, 22, F.sans); c.fillStyle = rgba(C.graphite);
  c.fillText('想要的样子', bx - 6, tY - 2 * b - 12); c.fillText('← 底面', rx + b + 10, tY - 4);
}
function card2(c, t) {
  // r3: at ⏎ the field behind the launching card turns into hook 2's orange (same fill and grid as hook(…, 2, …))
  if (t >= DB(32)) { c.fillStyle = rgba(C.signal); c.fillRect(0, 0, W, H); grid(c, 0, 0, W, H, 60, C.inkline, 0.06, 240, 0.1); }
  else grid(c, 0, 0, W, H, 60, C.bone, 0.035, 240, 0.06);
  caseCard(c, t, {
    t0: DB(29), enterAt: DB(32), x: 70, y: 560, w: 940, h: 780, num: '02', src: 'DeepMind · 2017（Popov 等）',
    title: '机械臂叠积木',
    rows: [
      { label: '我们想要', text: '把红块叠到蓝块上', t: BT(118) },
      { label: '分数规则', labelCol: C.signal, text: '红块“底面”越高，分越高', col: C.blood, note: '（只在机械手没碰红块时计分）',
        keys: [[DB(30), 4], [lw(16, 1), 7], [lw(16, 2), 9], [lw(16, 3), 11], [lw(16, 4), 12]] },
    ],
    thumb: (c2, x, y, w, h) => blocksSide(c2, x + 40, y, w - 80, h, { s: Math.min(1.2, h / 175) }),
  });
}

// ------------------------------------------------------------------ 7 · hook 2, the flip, equal scores, patches
const TBL = 1240, BS = 200, BLUE_X = 190, RED_X = 600;
function arm(c, gx, gy, open, a = 1) {
  // a two-link arm hanging from the top right, gripper at (gx, gy)
  const base = [1010, 470], L1 = 430, L2 = 420;
  const dx = gx - base[0], dy = gy - base[1], dist = Math.min(L1 + L2 - 1, Math.hypot(dx, dy));
  const a0 = Math.atan2(dy, dx), cosB = (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), b = Math.acos(clamp(cosB, -1, 1));
  const ex = base[0] + Math.cos(a0 + b) * L1, ey = base[1] + Math.sin(a0 + b) * L1;
  c.globalAlpha = a;
  c.strokeStyle = rgba(C.bone, 0.95); c.lineCap = 'round';
  c.lineWidth = 30; c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(ex, ey); c.stroke();
  c.lineWidth = 22; c.beginPath(); c.moveTo(ex, ey); c.lineTo(gx, gy - 30); c.stroke();
  c.strokeStyle = rgba(C.ink, 1); c.lineWidth = 3; c.beginPath(); c.moveTo(base[0], base[1]); c.lineTo(ex, ey); c.lineTo(gx, gy - 30); c.stroke();
  for (const p of [[base[0], base[1]], [ex, ey]]) { c.fillStyle = rgba(C.ink3); c.beginPath(); c.arc(p[0], p[1], 22, 0, TAU); c.fill(); c.strokeStyle = rgba(C.bone); c.lineWidth = 4; c.stroke(); }
  // gripper
  c.fillStyle = rgba(C.bone); c.fillRect(gx - 60, gy - 40, 120, 18);
  const o = 30 + 40 * open;
  c.fillRect(gx - o - 12, gy - 24, 12, 64); c.fillRect(gx + o, gy - 24, 12, 64);
  c.lineCap = 'butt'; c.globalAlpha = 1;
}
function redBlock(c, cx, cy, ang, a = 1) {
  c.save(); c.translate(cx, cy); c.rotate(ang); c.globalAlpha *= a;
  c.fillStyle = rgba(C.red); c.fillRect(-BS / 2, -BS / 2, BS, BS);
  c.strokeStyle = rgba(mix(C.red, C.ink, 0.45)); c.lineWidth = 4; c.strokeRect(-BS / 2, -BS / 2, BS, BS);
  // the bottom face (local +y side), hatched
  c.save(); c.beginPath(); c.rect(-BS / 2, BS / 2 - 34, BS, 34); c.clip(); hatch(c, -BS / 2, BS / 2 - 34, BS, 34, 0.8, 9, C.inkline, 0.95, 3); c.restore();
  c.restore();
}
function flipState(t) {
  // red block: centre & angle through the flip (lands on "boom")
  const tG = 61.0, tB = lw(18, 4);
  const restY = TBL - BS / 2;
  if (t < tG) return { x: RED_X + BS / 2, y: restY, a: 0, held: false };
  const u = clamp((t - tG) / (tB - tG));
  const lift = Math.sin(Math.PI * u) * 170;
  return { x: RED_X + BS / 2 - 20 * Math.sin(Math.PI * u), y: restY - lift, a: Math.PI * E.io2(u), held: t < tB };
}
function blocksScene(c, t, lt) {
  const tB = lw(18, 4), tMoon = lw(19, 3), tCmp = DB(35);
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  // table
  c.fillStyle = rgba(C.ink3); c.fillRect(0, TBL, W, 240); c.strokeStyle = rgba(C.bone, 0.9); c.lineWidth = 5; c.beginPath(); c.moveTo(0, TBL); c.lineTo(W, TBL); c.stroke();
  hatch(c, 0, TBL + 4, W, 236, -0.7, 16, C.bone, 0.07);
  // blue block + ghost of the wanted state
  c.fillStyle = rgba(C.blue); c.fillRect(BLUE_X, TBL - BS, BS, BS); c.strokeStyle = rgba(mix(C.blue, C.ink, 0.4)); c.lineWidth = 4; c.strokeRect(BLUE_X, TBL - BS, BS, BS);
  c.setLineDash([14, 10]); c.strokeStyle = rgba(C.red, 0.85); c.lineWidth = 4; c.strokeRect(BLUE_X, TBL - 2 * BS, BS, BS); c.setLineDash([]);
  c.font = font(700, 34, F.sans); c.fillStyle = rgba(C.ash); c.fillText('想要的样子', BLUE_X - 4, TBL - 2 * BS - 22);
  // red block through the flip; the arm holds it until "boom"
  const st = flipState(t);
  const shake = t >= tB ? Math.exp(-(t - tB) / 0.09) * 16 : 0, fi = frameIdx(t);
  c.save(); c.translate((hash(fi, 1) - 0.5) * shake, (hash(fi, 2) - 0.5) * shake);
  redBlock(c, st.x, st.y, st.a);
  // the arm: approaches, grips (61.0), flips, lets go at boom, rises away
  const gx = keys(t, [[DB(33), 820], [60.6, 700], [61.0, st.x], [tB, st.x], [tB + 0.6, 760]]);
  const gy = keys(t, [[DB(33), 640], [60.6, 900], [61.0, TBL - BS - 10], [tB, st.y - BS / 2 - 10 - 0], [tB + 0.6, 760]]);
  if (t < tB) { const [hx, hy] = [st.x, st.y]; arm(c, hx + Math.sin(st.a) * 0, t < 61.0 ? gy : hy - BS / 2 - 10, t < 61.0 ? 1 : 0); }
  else arm(c, gx, gy, clamp((t - tB) / 0.15));
  // dust on landing
  if (t >= tB && t < tB + 0.6) { const k = (t - tB) / 0.6; for (let i = 0; i < 18; i++) { const sx = st.x + (hash(i, 9) - 0.5) * BS * 1.4, dir = Math.sign(sx - st.x); c.fillStyle = rgba(C.bone, (1 - k) * 0.6); c.beginPath(); c.arc(sx + dir * 120 * k, TBL - 10 - 60 * k * hash(i, 10), 4 + 10 * k, 0, TAU); c.fill(); } }
  c.restore();
  // ruler: height of the bottom face
  const rx = 900, h0 = TBL, faceY = t >= tB ? TBL - BS : t >= 61.0 ? TBL - BS * clamp((t - 61.0) / (tB - 61.0)) * 0 : TBL;
  c.strokeStyle = rgba(C.bone, 0.85); c.lineWidth = 3; c.beginPath(); c.moveTo(rx, TBL); c.lineTo(rx, TBL - 2.3 * BS); c.stroke();
  for (let i = 0; i <= 23; i++) { const yy = TBL - i * BS / 10; c.beginPath(); c.moveTo(rx, yy); c.lineTo(rx + (i % 5 === 0 ? 30 : 14), yy); c.stroke(); }
  const fy = t >= tB ? lerp(TBL, TBL - BS, E.outBack(clamp((t - tB) / 0.25))) : TBL;
  c.fillStyle = rgba(C.signal); c.beginPath(); c.moveTo(rx - 8, fy); c.lineTo(rx - 34, fy - 16); c.lineTo(rx - 34, fy + 16); c.closePath(); c.fill();
  c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.signal); c.textAlign = 'right'; c.fillText('底面高度', rx - 44, fy + 10); c.textAlign = 'left';
  // score (top left: the arm owns the right side): 0 → 100 on boom, a 满分 stamp, a flare on "moon"
  const steps = [[-1, 0], [tB + 0.05, 100]];
  scoreBox(c, 84, 712, t, steppedValue(t, steps), { size: 90, align: 'left', fmt: (v) => String(Math.round(v)) });
  stamp(c, '满分', 360, 672, t - (tB + 0.2), { col: C.signal, size: 50, rot: -0.12 });
  if (t >= tMoon && t < tMoon + 0.5) { const k = (t - tMoon) / 0.5; c.globalCompositeOperation = 'lighter'; glow(c, 170, 680, 300 * (1 - k) + 60, C.signal, 0.5 * (1 - k), 'soft'); c.globalCompositeOperation = 'source-over'; }
  if (t >= tB) { const f = Math.exp(-(t - tB) / 0.08); c.fillStyle = rgba(C.hot, 0.2 * f); c.fillRect(0, 0, W, H); }
}
function equalScores(c, t, lt) {
  // side by side: stacked (wanted) vs flipped (what it did) — the rule measures the same number for both
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const u = E.outExpo(clamp(lt / 0.4));
  const panels = [{ x: 70, lab: '想要的：叠上去', flip: false }, { x: 560, lab: '它做的：翻个面', flip: true }];
  panels.forEach((p, i) => {
    const k = E.outExpo(clamp((lt - i * 0.12) / 0.4)), X = p.x, Y = 600, Wd = 450, Hd = 640;
    c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 60);
    c.strokeStyle = rgba(C.bone, 0.5); c.lineWidth = 2; c.strokeRect(X, Y, Wd, Hd);
    c.font = font(900, 38, F.sans); c.fillStyle = rgba(p.flip ? C.signal : C.bone); c.fillText(p.lab, X + 24, Y + 58);
    const tb = Y + Hd - 150, s = 110, bx = X + 60;
    c.strokeStyle = rgba(C.bone, 0.8); c.lineWidth = 3; c.beginPath(); c.moveTo(X + 20, tb); c.lineTo(X + Wd - 20, tb); c.stroke();
    c.fillStyle = rgba(C.blue); c.fillRect(bx, tb - s, s, s);
    const drawRed = (x, y, flipped) => { c.fillStyle = rgba(C.red); c.fillRect(x, y, s, s); c.save(); const fy = flipped ? y : y + s - 20; c.beginPath(); c.rect(x, fy, s, 20); c.clip(); hatch(c, x, fy, s, 20, 0.8, 7, C.inkline, 0.95, 2.5); c.restore(); };
    if (p.flip) drawRed(bx + s + 70, tb - s, true); else drawRed(bx, tb - 2 * s, false);
    // measuring line to the bottom face
    const faceY = tb - s, mx = X + Wd - 70;
    c.strokeStyle = rgba(C.signal); c.lineWidth = 4; c.beginPath(); c.moveTo(mx, tb); c.lineTo(mx, faceY); c.stroke();
    c.beginPath(); c.moveTo(mx - 14, faceY); c.lineTo(mx + 14, faceY); c.moveTo(mx - 14, tb); c.lineTo(mx + 14, tb); c.stroke();
    c.setLineDash([6, 6]); c.beginPath(); c.moveTo(p.flip ? bx + s + 70 + s : bx + s, faceY); c.lineTo(mx, faceY); c.stroke(); c.setLineDash([]);
    c.font = font(600, 28, F.mono); c.fillStyle = rgba(C.signal); c.textAlign = 'right'; c.fillText('底面高 = 1 块', mx - 18, faceY - 14); c.textAlign = 'left';
    c.font = font(900, 46, F.sans); c.fillStyle = rgba(C.signal); c.fillText('分数 100', X + 24, Y + Hd - 70);
    c.restore();
  });
  const ek = E.outBack(clamp((lt - 0.55) / 0.25));
  c.save(); c.translate(540, 1000); c.scale(ek, ek); c.font = font(900, 110, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(C.signal); c.fillText('=', 0, 36); c.restore();
  // verdict marks under the panels on the next beats
  const v1 = lt - (BT(140) - DB(35)), v2 = lt - (BT(141) - DB(35));
  if (v1 > 0) { c.font = font(900, 40, F.sans); c.fillStyle = rgba(C.bone, clamp(v1 / 0.12)); c.fillText('任务', 120, 1325); check(c, 240, 1312, 54, C.bone, 9, 1, clamp(v1 / 0.2)); }
  if (v2 > 0) { c.font = font(900, 40, F.sans); c.fillStyle = rgba(C.signal, clamp(v2 / 0.12)); c.fillText('任务', 610, 1325); cross(c, 730, 1312, 54, C.signal, 9, 1, clamp(v2 / 0.2)); }
}
const PATCHES = ['+ 红块必须在蓝块上面', '+ 红块必须正面朝上', '+ 不许把蓝块推倒', '+ 不许把蓝块搬到红块下面'];
const patchText = (i) => PATCHES[i] ?? '+ 不许……';
function patches(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const tR = lw(22, 5);    // "reckoned"
  const u = E.outExpo(clamp(lt / 0.45));
  const X = 90, Y = 580, Wd = 900, Hd = 820;
  c.save(); c.translate(0, (1 - u) * 1200); c.rotate(-0.012);
  paper(c, X, Y, Wd, Hd, { rules: 58 });
  c.font = font(700, 26, F.sans); c.fillStyle = rgba(C.graphite); c.letterSpacing = '3px'; c.fillText('分数规则 · 补丁版', X + 36, Y + 52); c.letterSpacing = '0px';
  c.font = font(700, 40, F.sans); c.fillStyle = rgba(C.blood); c.fillText('红块“底面”越高，分越高', X + 36, Y + 116);
  c.save(); c.beginPath(); c.rect(X, Y + 140, Wd, Hd - 160); c.clip();
  // one patch per beat; after "reckoned" the list keeps scrolling, faster
  const beats = []; for (let b = 148; b < 164; b++) beats.push(BT(b));
  let n = 0; for (const tb of beats) if (t >= tb) n++;
  const scroll = Math.max(0, (t - tR - 0.3)) * 160 + Math.max(0, n - 6) * 0;
  for (let i = 0; i < Math.min(n, 40); i++) {
    const txt = patchText(i), k = E.outExpo(clamp((t - beats[i]) / 0.18));
    const yy = Y + 200 + i * 66 - scroll;
    const top = clamp((yy - (Y + 168)) / 30);          // lines scrolling up fade out before the clip edge can slice them (no glyph slivers)
    if (top <= 0) continue;
    c.font = font(700, 40, F.sans); c.fillStyle = rgba(i >= 4 ? C.graphite : C.inkline, k * top); c.fillText(txt, X + 36 + (1 - k) * 40, yy);
  }
  c.restore();
  c.restore();
  stamp(c, '这下总够了吧？', 590, 1150, t - tR, { col: C.signal, size: 66, rot: -0.1 });
  // the gap: a crack opens between two lines and the spark slips through (→ next scene)
  const tGap = DB(40);
  if (t >= tGap) {
    const k = clamp((t - tGap) / (DB(41) - tGap));
    const gy = 1010, gw = 900 * E.io3(clamp(k * 1.6));
    c.fillStyle = rgba(C.ink); c.fillRect(540 - gw / 2, gy - 7, gw, 14);
    const sx = lerp(-60, 1140, E.in2(clamp((k - 0.25) / 0.7)));
    if (k > 0.25) { trail(c, (tt) => [lerp(-60, 1140, E.in2(clamp(((tt - tGap) / (DB(41) - tGap) - 0.25) / 0.7))), gy], t, 0.4, { col: C.signal, w: 8, alpha: 0.9 }); spark(c, sx, gy, t, { scale: 1.2 }); }
  }
}

export function register() {
  return [
    { id: 'island', t0: DB(21), t1: DB(29), draw: (c, t, lt) => islandScene(c, t, lt) },
    { id: 'card2', t0: DB(29), t1: DB(32) + 0.36, draw: (c, t) => card2(c, t) },          // r3: ⏎ launch is seen
    { id: 'hook2', t0: DB(32) + 0.36, t1: lw(18, 0), draw: (c, t) => hook(c, t, 2, [lw(17, 0), lw(17, 1), lw(17, 2), lw(17, 3)]), noBand: () => true },
    { id: 'flip', t0: lw(18, 0), t1: DB(35), draw: (c, t, lt) => blocksScene(c, t, lt) },
    { id: 'equal', t0: DB(35), t1: DB(37), draw: (c, t, lt) => equalScores(c, t, lt) },
    { id: 'patches', t0: DB(37), t1: DB(41), draw: (c, t, lt) => patches(c, t, lt) },
  ];
}
