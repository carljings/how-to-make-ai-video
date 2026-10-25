// twenty.js — act 3 (50–88 s): God's number. The rule, the shells of states, the bounds closing in over 30 years,
// the superflip, the 2010 proof, the slam, and how rare a 20-move position is.
import { W, H, seg, clamp, lerp, easeOut, expoOut, backOut, easeInOut, easeIn, smooth, hex, rgba, rng, hash, commas } from '../lib/core.js';
import { camera, drawCube, shadow, orient } from '../lib/draw3d.js';
import { solved } from '../lib/cube.js';
import { backdrop, vignette, flash } from '../lib/stage.js';
import { headline, footnote, label, bigNumber, SANS, COND, MONO, INK } from '../lib/text.js';
import { rr, chip, check, odometer } from '../lib/ui.js';
import { S } from '../seqs.js';
import { CUE, ACT } from '../timeline.js';
import { DIST, BOUNDS } from '../data.js';

const VIO = '#9b7bff', ORANGE = '#ff8a3a', CYAN = '#36d6ff', GREEN = '#2ee58a', RED = '#ff3b3b';
const KICK = '03 · 20';
let SHELLS = null, TILES = null;
export function init() {
  const R = rng(20);
  SHELLS = [];
  for (let d = 1; d <= 20; d++) {
    const n = d <= 15 ? Math.min(Number(DIST[d]), 10 + d * d * 9) : 40 + d * 30;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, th = R() * Math.PI * 2, s = Math.sqrt(1 - u * u), j = 1 + (R() - 0.5) * 0.12;
      pts.push([s * Math.cos(th) * j, u * j, s * Math.sin(th) * j, R()]);
    }
    SHELLS.push(pts);
  }
  const R2 = rng(2010);
  TILES = [];
  for (let r = 0; r < 30; r++) for (let c = 0; c < 36; c++) TILES.push({ r, c, cover: R2(), d: Math.hypot(c - 17.5, r - 14.5) });
}

export function draw(ctx, t) {
  const C = CUE;
  backdrop(ctx, { color: t < C.proof ? VIO : t < C.slam ? GREEN : VIO, k: t < C.slam ? 0.12 : 0.2, ly: 900 });
  if (t < C.shells) rule(ctx, t);
  else if (t < C.bounds) shells(ctx, t);
  else if (t < C.proof) bounds(ctx, t);
  else if (t < C.slam) proof(ctx, t);
  else if (t < C.dist) slam(ctx, t);
  else histogram(ctx, t);

  headline(ctx, t, { t0: C.twenty, t1: C.shells, kicker: KICK, lines: ['这么乱，最少几步', '**一定**能拧回去？'], accent: VIO });
  headline(ctx, t, { t0: C.shells, t1: C.outer, kicker: KICK, lines: ['从还原出发：每多拧一步，', '能到的状态**暴增**'], accent: VIO, stagger: 0.016 });
  headline(ctx, t, { t0: C.outer, t1: C.bounds, kicker: KICK, lines: ['那最外面一圈，', '在**第几步**？'], accent: VIO });
  headline(ctx, t, { t0: C.bounds, t1: C.superflip, kicker: KICK, lines: ['人们从两头逼近：', '**上限**一路往下砍'], accent: ORANGE });
  headline(ctx, t, { t0: C.superflip, t1: C.gap, kicker: KICK, lines: ['1995 年，“**超级翻转**”', '把下限顶到 20'], accent: CYAN });
  headline(ctx, t, { t0: C.gap, t1: C.proof, kicker: KICK, lines: ['到 2008 年：上限 22，下限 20', '只差 **2 步**'], accent: ORANGE, stagger: 0.016 });
  headline(ctx, t, { t0: C.proof, t1: C.cover, kicker: KICK, lines: ['2010 年：把全部状态', '分成 **22 亿**组'], accent: GREEN });
  headline(ctx, t, { t0: C.cover, t1: C.sweep, kicker: KICK, lines: ['借对称和覆盖，', '只需算 **5588 万**组'], accent: GREEN });
  headline(ctx, t, { t0: C.sweep, t1: C.slam - 0.05, kicker: KICK, lines: ['电脑逐组验证：', '**全部 ≤ 20 步**'], accent: GREEN });
  headline(ctx, t, { t0: C.slam, t1: C.dist, kicker: KICK, lines: ['上帝之数：**20**'], accent: VIO, size: 92 });
  headline(ctx, t, { t0: C.dist, t1: C.human, kicker: KICK, lines: ['而真正需要整整 20 步的，', '只有约 **4.9 亿**个'], accent: VIO, stagger: 0.016 });
  footnote(ctx, t, { t0: C.slam + 0.4, t1: C.dist, text: '计步：90°、180° 都算 1 步（只算 90° 时是 26）' });
  footnote(ctx, t, { t0: C.proof + 0.4, t1: C.slam - 0.1, text: '证明的是每个状态都有 ≤ 20 步的解，不是给每个状态求最短解', y: 478 });
  vignette(ctx, 0.62);
  flash(ctx, seg(t, C.human - 0.1, C.human) * 0.4);
}

// ── 50–54 · the counting rule ───────────────────────────────────────────────
function rule(ctx, t) {
  const C = CUE;
  const cam = camera({ yaw: 0.5, pitch: 0.42, dist: 36, cy: 960 });
  const k = easeOut(seg(t, C.twenty, C.twenty + 0.5));
  for (const [seq, x, txt, tAt] of [[S.rule90, -2.3, '转 90°', 51.45], [S.rule180, 2.3, '转 180°', 52.3]]) {
    const pos = [x, 0, -x * 0.5];
    shadow(ctx, cam, pos, 0.82, 0.6 * k);
    drawCube(ctx, cam, { ...seq.at(t), pos, scale: 0.82, alpha: k, look: (c) => (c.pos[0] === 1 ? { glow: 0.35, glowColor: hex(VIO) } : null) });
    const p = cam.project([x, -2.3, -x * 0.5]);
    label(ctx, txt, p[0], p[1] + 60, { size: 54, weight: 900, align: 'center', alpha: k });
    const ck = easeOut(seg(t, tAt, tAt + 0.3));
    chip(ctx, '= 1 步', p[0], p[1] + 140, { size: 44, color: '#fff', bg: rgba(VIO, 0.85 * ck), align: 'center', alpha: ck, weight: 900 });
  }
  footnote(ctx, t, { t0: C.twenty + 0.3, t1: C.shells, text: '计步规则：拧一个面，不管 90° 还是 180°，都算 1 步' });
}

// ── 54–62 · shells of states around the solved cube ─────────────────────────
const shellT = (d) => CUE.shells + 0.6 + (d - 1) * 0.33;
function shells(ctx, t) {
  const C = CUE;
  const pull = easeInOut(seg(t, C.shells, C.bounds));
  const cam = camera({ yaw: 0.4 + (t - C.shells) * 0.08, pitch: 0.35, dist: lerp(20, 58, pull), cy: 960 });
  // solved cube at the centre
  const cs = lerp(0.55, 0.32, pull);
  drawCube(ctx, cam, { state: SOLVED(), scale: cs, rim: 0.4 });
  const glow = cam.project([0, 0, 0]);
  const gr = ctx.createRadialGradient(glow[0], glow[1], 0, glow[0], glow[1], 160);
  gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.fillRect(glow[0] - 160, glow[1] - 160, 320, 320);
  // shells
  const pts = [];
  for (let d = 1; d <= 20; d++) {
    const t0 = d <= 15 ? shellT(d) : C.outer + (d - 16) * 0.18;
    const k = seg(t, t0, t0 + 0.45);
    if (k <= 0) continue;
    const r = 1.6 + d * 0.62;
    const col = d <= 15 ? hex(VIO).map((v, i) => lerp(v, 255, d / 18)) : [255, 255, 255];
    for (const [x, y, z, ph] of SHELLS[d - 1]) {
      const rr2 = r * (0.6 + 0.4 * easeOut(k));
      const p = cam.project([x * rr2, y * rr2, z * rr2]);
      pts.push([p, col, d, ph, k]);
    }
  }
  pts.sort((a, b) => b[0][2] - a[0][2]);
  for (const [p, col, d, ph, k] of pts) {
    const s = (cam.f * 0.05) / p[2] * (d > 15 ? 0.9 : 1);
    const tw = d > 15 ? 0.35 + 0.35 * Math.sin(t * 6 + ph * 20) : 0.85;
    ctx.fillStyle = rgba(col, tw * clamp(k * 2) * clamp(1.4 - p[2] / 90));
    ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }
  // counter list
  let cur = 0; for (let d = 1; d <= 15; d++) if (t >= shellT(d)) cur = d;
  if (cur > 0 && t < C.outer) {
    const k = seg(t, shellT(cur), shellT(cur) + 0.2);
    for (let j = Math.max(1, cur - 3); j <= cur; j++) {
      const rowY = 1520 - (cur - j) * 62;
      const a = j === cur ? 1 : 0.55 - (cur - j) * 0.12;
      const sz = j === cur ? 50 : 38;
      label(ctx, `${j} 步`, 120, rowY, { size: sz, weight: 900, alpha: a * (j === cur ? clamp(k * 3) : 1), color: j === cur ? VIO : INK });
      label(ctx, commas(DIST[j].toString()) + ' 种', 960, rowY, { size: sz, weight: 800, family: COND, align: 'right', alpha: a * (j === cur ? clamp(k * 3) : 1) });
    }
  }
  if (t >= C.outer) {
    const k = easeOut(seg(t, C.outer + 0.2, C.outer + 0.6));
    label(ctx, '16 步、17 步…… 最远到第几步？', 540, 1520, { size: 46, weight: 900, align: 'center', alpha: k });
  }
}
let SOLVED_ = null; const SOLVED = () => (SOLVED_ ||= solved());

// ── 62–72 · the bounds race, with the superflip ──────────────────────────────
const CX0 = 140, CX1 = 960, CY0 = 1380, CY1 = 620; // chart box: years 1980–2010, moves 15–55
const yx = (yr) => CX0 + ((yr - 1980) / 30) * (CX1 - CX0);
const my = (m) => CY0 - ((m - 15) / 40) * (CY0 - CY1);
function cursorYear(t) {
  const C = CUE;
  if (t < C.superflip) return lerp(1980, 1995.05, easeInOut(seg(t, C.bounds + 0.3, C.superflip - 0.1)));
  if (t < C.gap) return 1995.05 + 0.1 * seg(t, C.superflip, C.gap);
  return lerp(1995.15, 2008.7, easeInOut(seg(t, C.gap, C.proof - 0.5)));
}
function boundsAt(yr) { let lo = 18, up = 80; for (const [y, l, u] of BOUNDS) if (yr >= y && y < 2010) { lo = l; up = u; } return [lo, up]; }
function bounds(ctx, t) {
  const C = CUE;
  const yr = cursorYear(t);
  const a = easeOut(seg(t, C.bounds, C.bounds + 0.4));
  const sfOn = t >= C.superflip - 0.1 && t < C.gap + 0.3;
  const dimChart = sfOn ? 0.25 + 0.75 * (1 - easeOut(seg(t, C.superflip - 0.1, C.superflip + 0.3)) + easeOut(seg(t, C.gap - 0.4, C.gap + 0.2))) : 1;
  ctx.save(); ctx.globalAlpha = a * clamp(dimChart);
  // axes and grid
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2;
  for (const m of [20, 30, 40, 50]) { ctx.beginPath(); ctx.moveTo(CX0, my(m)); ctx.lineTo(CX1, my(m)); ctx.stroke(); label(ctx, String(m), CX0 - 18, my(m) + 12, { size: 32, weight: 800, family: COND, align: 'right', alpha: 0.55 }); }
  for (const y of [1980, 1990, 2000, 2010]) label(ctx, String(y), yx(y), CY0 + 54, { size: 32, weight: 800, family: COND, align: 'center', alpha: 0.55 });
  label(ctx, '步数', CX0 - 18, CY1 - 40, { size: 28, weight: 700, alpha: 0.5, align: 'right' });
  // 20 line
  ctx.setLineDash([10, 10]); ctx.strokeStyle = rgba(VIO, 0.5); ctx.beginPath(); ctx.moveTo(CX0, my(20)); ctx.lineTo(CX1, my(20)); ctx.stroke(); ctx.setLineDash([]);
  // step lines up to the cursor
  for (const [key, col, idx] of [['up', ORANGE, 2], ['lo', CYAN, 1]]) {
    ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.beginPath();
    let prev = null;
    const pts = [[1980, idx === 1 ? 18 : null], ...BOUNDS.filter(([y]) => y <= yr && y < 2010).map((b) => [b[0], b[idx]])];
    const start = idx === 1 ? [1980, 18] : [1981, 52];
    ctx.moveTo(yx(start[0]), my(start[1])); prev = start[1];
    for (const b of BOUNDS) { if (b[0] > yr || b[0] >= 2010) break; if (b[0] < start[0]) continue; ctx.lineTo(yx(b[0]), my(prev)); ctx.lineTo(yx(b[0]), my(b[idx])); prev = b[idx]; }
    ctx.lineTo(yx(Math.max(yr, start[0])), my(prev)); ctx.stroke();
    // value tag at the cursor
    const [lo, up] = boundsAt(yr);
    const v = idx === 1 ? lo : up;
    if (yr >= start[0]) {
      chip(ctx, String(v), yx(Math.max(yr, start[0])) + 14, my(v) + (idx === 1 ? 40 : -40), { size: 46, color: '#06070a', bg: col, weight: 900 });
    }
  }
  label(ctx, '上限：一定够用的步数', CX1, my(52) - 10, { size: 32, weight: 700, color: ORANGE, align: 'right', alpha: 0.9 });
  label(ctx, '下限：至少需要的步数', CX1, my(15) - 18, { size: 32, weight: 700, color: CYAN, align: 'right', alpha: 0.9 });
  // year cursor
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(yx(yr), CY1 - 10); ctx.lineTo(yx(yr), CY0); ctx.stroke();
  label(ctx, String(Math.floor(yr)), yx(yr), CY1 - 24, { size: 40, weight: 800, family: COND, align: 'center' });
  if (t >= C.gap + 0.3) {
    const k = easeOut(seg(t, C.proof - 0.9, C.proof - 0.5));
    if (k > 0) {
      const x = yx(2008.7) + 20;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, my(22)); ctx.lineTo(x + 20, my(22)); ctx.lineTo(x + 20, my(20)); ctx.lineTo(x, my(20)); ctx.stroke();
    }
  }
  ctx.restore();
  // superflip moment
  if (sfOn) superflip(ctx, t);
}
function superflip(ctx, t) {
  const C = CUE;
  const inK = easeOut(seg(t, C.superflip - 0.1, C.superflip + 0.35)), outK = easeIn(seg(t, C.gap - 0.45, C.gap + 0.05));
  const target = [yx(1995), my(20)];
  const cy = lerp(880, target[1], outK), cx = lerp(540, target[0], outK);
  const cam = camera({ yaw: 0.62 + (t - C.superflip) * 0.25, pitch: 0.5, dist: lerp(lerp(44, 27, inK), 90, outK), cx, cy });
  const st = S.superflip.at(t);
  drawCube(ctx, cam, { ...st, rim: 0.5, alpha: 1 - outK * 0.6, look: (c) => (c.type === 'edge' && t < S.superflip.times[0][0] ? { glow: 0.5, glowColor: hex(CYAN) } : null) });
  const a = inK * (1 - outK);
  label(ctx, '超级翻转：12 条棱全部原地翻面', 540, 1420, { size: 40, weight: 900, align: 'center', alpha: a * (1 - seg(t, S.superflip.times[0][0], S.superflip.times[0][0] + 0.2)) });
  const n = st.done;
  if (t >= S.superflip.times[0][0]) {
    bigNumber(ctx, `${n} / 20`, 540, 1450, { size: 110, color: n === 20 ? CYAN : INK, alpha: a });
    label(ctx, n === 20 ? '最少要 20 步 · 1995 年证明' : '步', 540, 1520, { size: 36, weight: 700, align: 'center', alpha: a * 0.8, color: n === 20 ? CYAN : INK });
  }
}

// ── 72–80 · the 2010 proof ───────────────────────────────────────────────────
const TS = 24, TG = 4, TX0 = 540 - (36 * (TS + TG) - TG) / 2, TY0 = 560;
function proof(ctx, t) {
  const C = CUE;
  const appear = (tl) => easeOut(seg(t, C.proof + tl.d * 0.022, C.proof + tl.d * 0.022 + 0.3));
  const foldX = easeInOut(seg(t, C.proof + 1.4, C.proof + 2.3)), foldY = easeInOut(seg(t, C.proof + 2.4, C.proof + 3.3));
  const cover = seg(t, C.cover + 0.1, C.cover + 1.2);
  const sweep = seg(t, C.sweep + 0.2, C.slam - 0.9);
  const regrow = easeInOut(seg(t, C.sweep, C.sweep + 0.5));
  const approach = seg(t, C.slam - 0.55, C.slam);
  ctx.save(); ctx.globalAlpha = 1 - easeIn(approach);
  for (const tl of TILES) {
    let a = appear(tl);
    if (a <= 0) continue;
    // symmetry folds: the right half flips onto the left, then the bottom onto the top (undone when the sweep regrows)
    const fx = foldX * (1 - regrow), fy = foldY * (1 - regrow);
    let cx = TX0 + tl.c * (TS + TG) + TS / 2, cy = TY0 + tl.r * (TS + TG) + TS / 2, sx = 1, sy = 1;
    const midX = TX0 + 18 * (TS + TG) - TG / 2, midY = TY0 + 15 * (TS + TG) - TG / 2;
    if (tl.c >= 18) { const c = Math.cos(Math.PI * fx); cx = midX + (cx - midX) * c; sx = Math.abs(c); if (fx >= 0.999) a = 0; }
    if (tl.r >= 15) { const c = Math.cos(Math.PI * fy); cy = midY + (cy - midY) * c; sy = Math.abs(c); if (fy >= 0.999) a = 0; }
    const x = cx - TS / 2, y = cy - TS / 2;
    const covered = tl.cover < 0.62 && cover > tl.cover / 0.62 * 0.9;
    let col = [120, 110, 170], al = 0.85;
    if (covered && regrow < 1) al = 0.12;
    const order = (tl.r * 36 + tl.c) / (30 * 36);
    if (sweep > order) col = hex(GREEN), al = 1;
    if (regrow > 0 && sweep > order) al = 1;
    ctx.globalAlpha = a * al * (1 - easeIn(approach));
    ctx.fillStyle = rgba(col, 1);
    ctx.fillRect(x + (TS * (1 - sx)) / 2, y + (TS * (1 - sy)) / 2, TS * Math.max(0.05, sx), TS * Math.max(0.05, sy));
  }
  ctx.restore();
  // counter
  const a = easeOut(seg(t, C.proof, C.proof + 0.4)) * (1 - approach);
  const val = t < C.cover + 0.6 ? '2,217,093,120' : '55,882,296';
  const k = t < C.cover + 0.6 ? 1 : seg(t, C.cover + 0.6, C.cover + 1.3);
  odometer(ctx, val, k, 540, 1505, { size: 110, color: t < C.cover + 0.6 ? INK : GREEN, alpha: a, spins: 1, spread: 0.4, seed: 7 });
  label(ctx, '组 · 每组约 195 亿个状态', 540, 1560, { size: 32, weight: 700, align: 'center', alpha: a * 0.7 });
  // step chips
  const chips = [['对称：转一转、照镜子相同的，只算一次', C.proof + 1.3, C.cover], ['覆盖：已被别组顺带解决的，跳过', C.cover, C.sweep], ['谷歌捐赠的约 35 CPU 年闲置算力', C.sweep + 0.1, C.slam - 0.4]];
  for (const [s, t0, t1] of chips) chip(ctx, s, 540, 528, { size: 32, align: 'center', bg: 'rgba(46,229,138,0.16)', border: rgba(GREEN, 0.6), alpha: easeOut(seg(t, t0, t0 + 0.3)) * (1 - seg(t, t1 - 0.2, t1)) });
  if (sweep >= 1) check(ctx, 540, 990, 120, GREEN, seg(t, C.slam - 0.9, C.slam - 0.6), 18);
  // the bars start closing in
  if (approach > 0) bars(ctx, approach * 0.85);
}

// ── 80–84 · the slam ────────────────────────────────────────────────────────
function bars(ctx, k, impact = 0) {
  const gap = lerp(560, 0, easeIn(k));
  const mid = 960;
  const shake = impact > 0 ? Math.sin(impact * 80) * 18 * Math.exp(-impact * 6) : 0;
  ctx.save(); ctx.translate(shake, 0);
  // upper bound bar (from the top)
  const g1 = ctx.createLinearGradient(0, mid - gap / 2 - 300, 0, mid - gap / 2);
  g1.addColorStop(0, rgba(ORANGE, 0)); g1.addColorStop(1, rgba(ORANGE, 0.95));
  ctx.fillStyle = g1; ctx.fillRect(60, mid - gap / 2 - 300, 960, 300);
  label(ctx, '上限 ≤ 20（2010）', 90, mid - gap / 2 - 26, { size: 40, weight: 900, color: '#1a0d00' });
  const g2 = ctx.createLinearGradient(0, mid + gap / 2, 0, mid + gap / 2 + 300);
  g2.addColorStop(0, rgba(CYAN, 0.95)); g2.addColorStop(1, rgba(CYAN, 0));
  ctx.fillStyle = g2; ctx.fillRect(60, mid + gap / 2, 960, 300);
  label(ctx, '下限 ≥ 20（1995）', 90, mid + gap / 2 + 56, { size: 40, weight: 900, color: '#001a22' });
  ctx.restore();
}
function slam(ctx, t) {
  const C = CUE;
  const i = t - C.slam;
  const open = easeInOut(seg(t, C.slam + 0.25, C.slam + 0.9));
  if (open < 1) { ctx.save(); ctx.globalAlpha = 1 - open; bars(ctx, 1, i); ctx.restore(); }
  const k = seg(t, C.slam, C.slam + 0.35);
  const sc = lerp(1.9, 1, expoOut(k)) + 0.04 * Math.exp(-i * 4) * Math.sin(i * 40);
  ctx.save(); ctx.translate(540, 1060); ctx.scale(sc, sc);
  bigNumber(ctx, '20', 0, 0, { size: 720, color: '#ffffff', glow: 80 * Math.exp(-i * 2) + 20, glowColor: VIO, alpha: clamp(k * 4) * (1 - seg(t, C.dist - 0.3, C.dist)) });
  ctx.restore();
  label(ctx, '任何一种打乱，20 步之内一定能还原', 540, 1260, { size: 42, weight: 900, align: 'center', alpha: easeOut(seg(t, C.slam + 0.8, C.slam + 1.2)) * (1 - seg(t, C.dist - 0.3, C.dist)) });
  label(ctx, 'Rokicki · Kociemba · Davidson · Dethridge（2010）', 540, 1330, { size: 28, weight: 500, family: MONO, align: 'center', alpha: easeOut(seg(t, C.slam + 1.2, C.slam + 1.6)) * 0.6 * (1 - seg(t, C.dist - 0.3, C.dist)) });
  flash(ctx, Math.exp(-Math.max(0, i) * 9) * 0.7, '#e9e1ff');
}

// ── 84–88 · how rare a 20-move position is ───────────────────────────────────
function histogram(ctx, t) {
  const C = CUE;
  const X0 = 110, X1 = 970, Y0 = 1300, HH = 620, n = 21, bw = (X1 - X0) / n;
  const max = 29e18;
  const zoom = easeInOut(seg(t, C.dist + 1.6, C.dist + 2.4));
  ctx.save();
  for (let d = 0; d < n; d++) {
    const k = easeOut(seg(t, C.dist + d * 0.04, C.dist + d * 0.04 + 0.5));
    const v = Number(DIST[d]) / max;
    const h = Math.max(v * HH * k, d === 20 ? 0 : 0);
    const x = X0 + d * bw + 3;
    const hl = d === 17 || d === 18;
    ctx.fillStyle = hl ? rgba(VIO, 0.95) : 'rgba(200,190,255,0.55)';
    ctx.fillRect(x, Y0 - h, bw - 6, h);
    if (d % 5 === 0 || d === 18 || d === 17) label(ctx, String(d), x + (bw - 6) / 2, Y0 + 44, { size: 30, weight: 800, family: COND, align: 'center', alpha: 0.65 });
  }
  label(ctx, '15 步以内的全部加起来，不到 1%', X0, Y0 - 30, { size: 30, weight: 700, alpha: easeOut(seg(t, C.dist + 0.9, C.dist + 1.3)) * 0.7 * (1 - zoom) });
  label(ctx, '离还原的步数', X1, Y0 + 92, { size: 28, weight: 700, align: 'right', alpha: 0.5 });
  const lk = easeOut(seg(t, C.dist + 0.8, C.dist + 1.2));
  label(ctx, '绝大多数：17–18 步', X0 + 17.5 * bw, Y0 - HH - 30, { size: 38, weight: 900, color: VIO, align: 'center', alpha: lk * (1 - zoom * 0.6) });
  // the 20 bar: a glint with a magnifier
  const gx = X0 + 20 * bw + bw / 2, gy = Y0 - 4;
  const glint = 0.6 + 0.4 * Math.sin(t * 9);
  ctx.fillStyle = `rgba(255,255,255,${glint})`; ctx.beginPath(); ctx.arc(gx - 3, gy, 5, 0, Math.PI * 2); ctx.fill();
  if (zoom > 0) {
    const r = lerp(10, 130, zoom), cx = lerp(gx, 420, zoom), cy = lerp(gy, 900, zoom);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(cx + r * 0.7, cy + r * 0.7); ctx.stroke();
    ctx.fillStyle = 'rgba(10,8,20,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.fill();
    label(ctx, '20 步', cx, cy - 16, { size: 44, weight: 900, align: 'center', alpha: zoom });
    label(ctx, '约 4.9 亿个', cx, cy + 40, { size: 40, weight: 900, color: VIO, align: 'center', alpha: zoom });
    label(ctx, '不到总数的十亿分之一', cx, cy + r + 56, { size: 40, weight: 900, align: 'center', alpha: easeOut(seg(t, C.dist + 2.4, C.dist + 2.8)) });
  }
  ctx.restore();
  footnote(ctx, t, { t0: C.dist + 0.4, t1: C.human, text: '16 步以上为 cube20.org 的估计值' });
}
