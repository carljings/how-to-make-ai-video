import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import T from './timeline.json' with { type: 'json' };
import { OPEN, CLOSE, SOLVED, SUPER, Sequence, METHODS, methodFrame, moveEvents, FOCUS, FACE_NORMAL, FACE_COLOR, mulMV, rot, clamp, smooth, lerp } from './cubes.js';
import { fileURLToPath } from 'node:url';

for (const weight of [400, 700]) GlobalFonts.registerFromPath(fileURLToPath(new URL(`../assets/fonts/NotoSC-${weight}.ttf`, import.meta.url)), 'MovieSans');
GlobalFonts.registerFromPath(fileURLToPath(new URL('../assets/fonts/NotoSansMono-700.ttf', import.meta.url)), 'MovieMono');
export const WIDTH = 1080, HEIGHT = 1920, FPS = 30, TIMELINE = T;
const canvas = createCanvas(WIDTH, HEIGHT), ctx = canvas.getContext('2d');
const C = { ink: '#ecf1f2', muted: '#8da3ae', gold: '#f0c76b', cyan: '#6ed1e4', green: '#7ed8ac', red: '#f18a7c' };
const GROUPS = { hook: '01 / 问题', history: '02 / 起源', pieces: '03 / 组合', constraints: '03 / 组合', count: '03 / 组合', metric: '04 / 20步', compute: '04 / 20步', bound: '04 / 20步', average: '05 / 竞速', inspection: '05 / 竞速', lbl: '06 / 方法', cfop: '06 / 方法', roux: '06 / 方法', hefei: '07 / 选手', beijing: '07 / 选手', guangzhou: '07 / 选手', guilin: '07 / 选手', ending: '08 / 下一把' };
const QUARTER = new Sequence([], ['R', 'R', 'R', 'R']), HALF = new Sequence([], ['R2', 'R2']);
const HISTORY = new Sequence([], ['U', 'R', "R'", "U'", 'F', "F'", 'L', "L'"]);
const SCENES = T.scenes;
const cue = (id, fragment, fallback) => {
  const scene = SCENES.find((s) => s.id === id);
  const caption = T.captions.find((c) => c.scene === id && c.text.replace(/\s/g, '').includes(fragment.replace(/\s/g, '')));
  return caption ? caption.start - scene.start : fallback;
};
for (const method of ['lbl', 'cfop', 'roux']) {
  const s = SCENES.find((s) => s.id === method), span = s.end - s.start;
  let bounds;
  if (method === 'cfop') bounds = [0, cue(method, 'F2L', span * .35) / span, cue(method, 'OLL', span * .73) / span, cue(method, 'PLL', span * .88) / span, 1];
  if (method === 'roux') {
    const cmll = cue(method, 'CMLL', span * .60) / span, lse = cue(method, '最后', span * .76) / span;
    bounds = [0, cmll * .50, cmll, lse, 1];
  }
  if (method === 'lbl') {
    const middle = cue(method, '再中层', span * .67) / span, top = cue(method, '最后', span * .78) / span;
    bounds = [0, middle * .38, middle, top, ...[.20, .43, .70].map((x) => lerp(top, 1, x)), 1];
  }
  for (let i = 1; i < bounds.length - 1; i++) bounds[i] = clamp(bounds[i], bounds[i - 1] + .025, 1 - .025 * (bounds.length - 1 - i));
  METHODS[method].stages.forEach((st, i) => { st.a = bounds[i]; st.b = bounds[i + 1]; });
}

export const EVENTS = SCENES.flatMap(moveEvents);
for (let i = 0; i < OPEN.moves.length; i++) EVENTS.push({ time: .10 + (i + .96) / OPEN.moves.length * 1.65, kind: 'turn', method: 'hook' });
const END = SCENES.at(-1);
for (let i = 0; i < CLOSE.moves.length; i++) EVENTS.push({ time: END.start + (i + .96) / CLOSE.moves.length * Math.min(5.2, END.audio.duration * .65), kind: 'turn', method: 'ending' });
EVENTS.push({ time: END.start + END.audio.duration + 1.3, kind: 'landing' });
EVENTS.sort((a, b) => a.time - b.time);

function text(str, x, y, size = 48, color = C.ink, align = 'left', max = 920, font = 'MovieSans', weight = 700) {
  ctx.save(); ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(str).width;
  if (width > max) { size *= max / width; ctx.font = `${weight} ${size}px ${font}`; }
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function line(x1, y1, x2, y2, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function disc(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function rr(x, y, w, h, r, fill, stroke) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } }
function roundedPoly(points, factor = .07) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const prev = points[(i + points.length - 1) % points.length], next = points[(i + 1) % points.length];
    const a = [lerp(p[0], prev[0], factor), lerp(p[1], prev[1], factor)], b = [lerp(p[0], next[0], factor), lerp(p[1], next[1], factor)];
    if (!i) ctx.moveTo(...a); else ctx.lineTo(...a);
    ctx.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }); ctx.closePath();
}
const colorRGB = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function shade(color, light, muted = 0, sepia = 0) {
  const rgb = colorRGB(color), gray = rgb[0] * .21 + rgb[1] * .72 + rgb[2] * .07;
  const target = [205, 197, 174];
  return `rgb(${rgb.map((v, i) => Math.round(lerp(lerp(v, gray * .53 + 24, muted), target[i], sepia) * light)).join(',')})`;
}
function camera(v, yaw, pitch) { return rot(rot(v, 1, yaw), 0, pitch); }

function cube(sample, options = {}) {
  const { x = 540, y = 890, size = 152, yaw = -.62, pitch = .47, explode = 0, focus = null, centersGray = false, sepia = 0, alpha = 1 } = options;
  ctx.save(); ctx.globalAlpha *= alpha;
  const project = (v) => { const p = camera(v, yaw, pitch), f = 11 / (11 - p[2]); return [x + p[0] * size * f, y - p[1] * size * f, p[2]]; };
  const faces = [];
  for (const c of sample.state) {
    const moving = sample.spec && sample.spec.layers.includes(c.pos[sample.spec.axis]);
    const world = (v) => moving ? rot(v, sample.spec.axis, sample.angle) : v;
    const ex = 1 + explode * (c.piece.type === 'center' ? 0 : c.piece.type === 'corner' ? .8 : .48);
    const center = world(c.pos.map((v) => v * 1.035 * ex));
    for (const [face, normal] of Object.entries(FACE_NORMAL)) {
      const n = world(mulMV(c.rot, normal)), cn = camera(n, yaw, pitch);
      if (cn[2] < .015) continue;
      const u = normal[0] ? [0, 1, 0] : [1, 0, 0], v = normal[2] ? [0, 1, 0] : [0, 0, 1];
      const wu = world(mulMV(c.rot, u)), wv = world(mulMV(c.rot, v));
      const points = (half, offset) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => project(center.map((z, i) => z + n[i] * offset + wu[i] * a * half + wv[i] * b * half)));
      const body = points(.485, .488), sticker = c.piece.faces.includes(face) ? points(.414, .495) : null;
      const light = .63 + .24 * cn[2] + .13 * Math.max(0, cn[1]);
      const unimportant = focus && !focus.has(c.piece.key) && c.piece.type !== 'center';
      const color = centersGray && c.piece.type === 'center' ? '#7c8c93' : FACE_COLOR[face];
      faces.push({ body, sticker, z: body.reduce((a, p) => a + p[2], 0) / 4, color: shade(color, light, unimportant ? .93 : 0, sepia), focus: focus?.has(c.piece.key), type: c.piece.type });
    }
  }
  faces.sort((a, b) => a.z - b.z);
  for (const f of faces) {
    roundedPoly(f.body, .11); ctx.fillStyle = '#0b141b'; ctx.fill(); ctx.strokeStyle = '#303a40'; ctx.lineWidth = 1.3; ctx.stroke();
    if (!f.sticker) continue;
    roundedPoly(f.sticker, .12); ctx.fillStyle = f.color; ctx.fill();
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(f.sticker[0][0], f.sticker[0][1], f.sticker[2][0], f.sticker[2][1]);
    g.addColorStop(0, '#ffffff1d'); g.addColorStop(.5, '#ffffff02'); g.addColorStop(1, '#0000001c');
    ctx.fillStyle = g; ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8); ctx.restore();
    if (f.focus) { roundedPoly(f.sticker, .12); ctx.strokeStyle = '#f9dea38a'; ctx.lineWidth = 2.3; ctx.stroke(); }
  }
  ctx.restore();
}

function background(t) {
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT); g.addColorStop(0, '#08131d'); g.addColorStop(.55, '#091923'); g.addColorStop(1, '#040a10');
  ctx.fillStyle = g; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const glow = ctx.createRadialGradient(540, 900, 20, 540, 900, 900); glow.addColorStop(0, '#16394a70'); glow.addColorStop(1, '#06131c00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Quiet physical floor, shared by every act. No frame-to-frame simulation.
  ctx.save(); ctx.translate(540, 1280); ctx.scale(1, .20);
  const floor = ctx.createRadialGradient(0, 0, 20, 0, 0, 610); floor.addColorStop(0, '#001019dd'); floor.addColorStop(1, '#00101900'); ctx.fillStyle = floor; ctx.fillRect(-620, -620, 1240, 1240); ctx.restore();
  for (let i = 0; i < 34; i++) {
    const x = (i * 277.13) % 1080, y = (i * 419.73 + Math.sin(t * .07 + i) * 9) % 1480;
    disc(x, y + 100, i % 3 ? .8 : 1.3, '#acc7d813');
  }
  text('小川科普', 80, 100, 32, '#b4c2c9'); text('THE CUBE', 1000, 99, 24, '#6d8593', 'right', 220, 'MovieMono');
  line(80, 130, 1000, 130, '#b8d8e31b', 1);
}
function heading(scene, title, sub = '') {
  text(GROUPS[scene.id], 80, 202, 27, C.gold, 'left', 850);
  text(title, 78, 300, 74, C.ink, 'left', 930);
  if (sub) text(sub, 82, 362, 34, C.muted, 'left', 910, 'MovieSans', 400);
}
function foot(str) {
  const parts = str.split('\n'); parts.forEach((p, i) => text(p, 540, 1774 + i * 44, 30, '#8ca5b2', 'center', 920, 'MovieSans', 400));
}
function formula(y, active = -1) {
  const pieces = ['8!', '×', '3⁷', '×', '12!', '×', '2¹¹', '÷', '2'];
  const widths = [88, 42, 104, 42, 126, 42, 124, 42, 66];
  let x = (1080 - widths.reduce((a, b) => a + b, 0)) / 2;
  pieces.forEach((p, i) => { text(p, x + widths[i] / 2, y, 58, active < 0 || Math.floor(i / 2) === active ? C.gold : '#607a88', 'center', widths[i]); x += widths[i]; });
}
function yearRail(current, progress = 1) {
  const years = ['1974', '1975', '1980'], words = ['发明', '内部结构专利', '走向全球'];
  line(175, 1350, 905, 1350, '#3c5965', 3); line(175, 1350, lerp(175, 905, progress), 1350, C.gold, 4);
  years.forEach((year, i) => { const x = 175 + 365 * i; disc(x, 1350, i === current ? 11 : 6, i <= current ? C.gold : '#47616f'); text(year, x, 1312, 47, i === current ? C.gold : C.muted, 'center', 250, 'MovieMono'); text(words[i], x, 1412, 31, i === current ? C.ink : C.muted, 'center', 280); });
}
function labelPair(a, b, y, color = C.gold) { text(a, 80, y, 48, color); text(b, 1000, y, 35, C.muted, 'right', 650, 'MovieSans', 400); }

function hook(scene, t) {
  const local = t - scene.start, at20 = cue('hook', '20', 6), atRecord = cue('hook', '2.51', 9.4);
  heading(scene, '一个魔方，两种“快”');
  const sample = OPEN.sample((t - .10) / 1.65);
  cube(sample, { y: 925 + Math.sin(t * .45) * 6, size: lerp(203, 173, smooth(t / 2)), yaw: -.57 - .08 * smooth(t / 5), pitch: .44 });
  if (local < at20) {
    text('超 4325 亿亿', 540, 506, 126, C.gold, 'center', 910, 'MovieSans');
    ctx.save(); ctx.globalAlpha *= smooth((t - .9) / .6);
    text('43,252,003,274,489,856,000', 540, 1465, 43, C.muted, 'center', 940, 'MovieMono'); ctx.restore();
  } else if (local < atRecord) {
    text('最多', 272, 508, 64, C.ink, 'center', 200); text('20', 560, 532, 190, C.gold, 'center', 360, 'MovieMono'); text('步', 784, 508, 64, C.ink, 'center', 120);
    text('数学给出的步数边界', 540, 1384, 46, C.muted, 'center');
  } else {
    text('2.51', 513, 525, 175, C.cyan, 'center', 650, 'MovieMono'); text('秒', 870, 511, 63, C.ink, 'center', 100);
    text('人类的官方单次纪录', 540, 1384, 46, C.muted, 'center');
  }
  foot('普通三阶 · 固定中心｜成绩数据截至 2026-10-21');
}
function history(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  const local = t - scene.start, at75 = cue('history', '1975', 8), at80 = cue('history', '1980', 12);
  const stage = local < at75 ? 0 : local < at80 ? 1 : 2;
  heading(scene, '先是一个空间教具', '匈牙利 · 厄尔诺·鲁比克');
  text(['1974', '1975', '1980'][stage], 540, 548, 171, '#e8d7ad', 'center', 800, 'MovieMono');
  const step = HISTORY.sample(u);
  cube(step, { y: 930, size: 162, yaw: -.6 + u * .22, pitch: .38, sepia: stage < 2 ? .78 : 0 });
  yearRail(stage, stage === 0 ? .5 * smooth(local / at75) : stage === 1 ? .5 + .5 * smooth((local - at75) / (at80 - at75)) : 1); foot('层转动示意｜1974 发明 · 1975 专利 · 1980 更名并全球推出');
}
function pieces(scene, t) {
  const local = t - scene.start, u = clamp(local / (scene.end - scene.start));
  heading(scene, '乱跑的是角块和棱块', '中心固定，先数清能移动的部分');
  const edgeAt = cue('pieces', '棱块有', 8), orientationAt = cue('pieces', '每个3', 6);
  const focus = new Set(SOLVED.states[0].filter((c) => local < edgeAt ? c.piece.type === 'corner' : c.piece.type === 'edge').map((c) => c.piece.key));
  cube(SOLVED.sample(0), { y: 895, size: 124, explode: smooth(u * 3.5), focus, centersGray: true, yaw: -.62 + .13 * u });
  text('8', 290, 1320, 112, C.gold, 'center', 200, 'MovieMono'); text('角块', 290, 1390, 43, C.ink, 'center');
  text('12', 790, 1320, 112, C.cyan, 'center', 250, 'MovieMono'); text('棱块', 790, 1390, 43, C.ink, 'center');
  formula(1480, local < orientationAt ? 0 : local < edgeAt ? 1 : local < cue('pieces', '每条2', 10) ? 2 : 3);
  foot('拆解与排列示意｜6 个中心固定，整体朝向不另外计数');
}
function chain(y, n, color, progress) {
  const width = 840, step = width / (n - 1);
  line(120, y, 960, y, '#53707d', 2);
  for (let i = 0; i < n; i++) {
    const x = 120 + i * step;
    disc(x, y, n === 8 ? 18 : 13, i / n < progress ? color : '#263f4c');
    if (i === n - 1) {
      rr(x - 21, y - 12, 42, 33, 6, '#17313f', color);
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y - 12, 12, Math.PI, 0); ctx.stroke();
    }
  }
}
function constraints(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  heading(scene, '最后一个，不再自由', '朝向有关联，排列也有约束');
  cube(SOLVED.sample(0), { y: 610, size: 78, explode: 1, centersGray: true, yaw: -.49 });
  labelPair('角：3⁷', '第 8 个角的朝向由前面决定', 1010); chain(1086, 8, C.gold, smooth(u * 2.1));
  labelPair('棱：2¹¹', '第 12 条棱的朝向由前面决定', 1194, C.cyan); chain(1265, 12, C.cyan, smooth(u * 2.1));
  text('角、棱排列的奇偶必须一致', 540, 1395, 48, C.ink, 'center'); formula(1490, 4);
  foot('不包含拆开乱装产生的非法状态');
}
function count(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  heading(scene, '四千三百多亿亿种');
  text('43,252,003,274,489,856,000', 540, 487, 48, C.gold, 'center', 950, 'MovieMono');
  formula(595);
  cube(SOLVED.sample(0), { y: 1030, size: 109, explode: 1 - smooth(u * 2.4), yaw: -.48 - u * .16 });
  text('每秒看 1 种', 540, 1375, 42, C.muted, 'center');
  text('也要约 1.37 万亿年', 540, 1460, 64, C.ink, 'center');
  foot('8! × 3⁷ × 12! × 2¹¹ ÷ 2｜精确整数计算');
}
function metric(scene, t) {
  const local = t - scene.start, p = local % 11.6 / 11.6, pHalf = local % 5.8 / 5.8;
  heading(scene, '先说清楚，怎样算一步', 'HTM：一个面的转动，无论四分之一圈还是半圈');
  cube(QUARTER.sample(p), { x: 285, y: 880, size: 98, yaw: -.56, pitch: .43 });
  cube(HALF.sample(pHalf), { x: 800, y: 880, size: 98, yaw: -.56, pitch: .43 });
  text('90°', 285, 1195, 83, C.gold, 'center', 370, 'MovieMono'); text('180°', 800, 1195, 83, C.cyan, 'center', 370, 'MovieMono');
  line(285, 1250, 285, 1310, '#7c99a6', 3); line(800, 1250, 800, 1310, '#7c99a6', 3); line(285, 1310, 800, 1310, '#7c99a6', 3);
  text('都算 1 步', 540, 1440, 87, C.ink, 'center');
  foot('20 步：按 HTM 计，不是“20 次 90°”');
}
const CLOUD = Array.from({ length: 420 }, (_, i) => {
  const z = 1 - 2 * (i + .5) / 420, radius = Math.sqrt(1 - z * z), phi = i * 2.39996323;
  return [Math.cos(phi) * radius, Math.sin(phi) * radius, z];
});
function compute(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  heading(scene, '电脑，也需要先缩小问题', '2010 · 分组、对称性与集合覆盖');
  text('2,217,093,120 组', 540, 504, 62, C.ink, 'center', 950, 'MovieMono');
  const stages = ['分组', '对称', '集合覆盖'], stage = Math.min(2, Math.floor(u * 3));
  stages.forEach((s, i) => { const x = 220 + i * 320; text(s, x, 615, 44, i === stage ? C.gold : C.muted, 'center', 280); if (i === stage) line(x - 75, 638, x + 75, 638, C.gold, 4); });
  const merge = smooth((u - .12) / .63);
  ctx.save(); const cloudAlpha = ctx.globalAlpha;
  for (let i = 0; i < CLOUD.length; i++) {
    const p = rot(CLOUD[i], 1, t * .08);
    const pair = Math.floor(i / 2), gx = (pair % 20 - 9.5) * 40, gy = (Math.floor(pair / 20) - 5) * 42;
    const sphere = [p[0] * 390, p[1] * 315];
    const x = 540 + lerp(sphere[0], gx, merge), y = 1000 + lerp(sphere[1], gy, merge);
    ctx.globalAlpha = cloudAlpha * (pair % 3 ? 1 - .91 * smooth((u - .68) / .24) : 1);
    disc(x, y, 2.1 + (p[2] + 1) * 1.9, i % 5 ? '#6aa6bd8c' : '#eac976de');
  }
  ctx.restore();
  text('55,882,296 组', 540, 1410, 68, C.gold, 'center', 950, 'MovieMono');
  text('约 35 CPU 年的总计算量', 540, 1488, 39, C.muted, 'center');
  foot('证明每个状态存在 ≤20 步解｜图为分组与约化示意');
}
function bound(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  heading(scene, '上界和下界，在 20 相遇');
  text('任何合法状态：最多 20', 540, 475, 55, C.cyan, 'center');
  cube(SUPER.sample(clamp((u - .26) / .69)), { y: 930, size: 155, yaw: -.65 + .20 * u, pitch: .46, focus: new Set(Array.from({ length: 12 }, (_, i) => 'E' + i)) });
  text('超级翻转：不能少于 20', 540, 1355, 55, C.gold, 'center');
  text('上帝之数 = 20', 540, 1475, 77, C.ink, 'center');
  foot('下界：Reid，1995｜上界：Rokicki 等，2010\n12 条棱原地翻面，角和中心归位；演示使用已验证的 20 步解');
}
function average(scene, t) {
  const local = t - scene.start, u = clamp(local / (scene.end - scene.start));
  heading(scene, '比赛拼秒数，也拼稳定', '步数上限，与竞速成绩不是一回事');
  text('2.51', 300, 515, 116, C.cyan, 'center', 430, 'MovieMono'); text('单次纪录', 300, 577, 34, C.muted, 'center');
  text('3.51', 800, 515, 116, C.gold, 'center', 430, 'MovieMono'); text('平均纪录', 800, 577, 34, C.muted, 'center');
  const scores = ['3.68', '4.61', '3.39', '3.41', '3.45'];
  const strike = smooth((local - cue('average', '平均是', 4.6)) / 2.3);
  scores.forEach((value, i) => {
    const y = 737 + i * 109, dropped = i === 1 || i === 2;
    text(`第 ${i + 1} 把`, 160, y, 37, dropped && strike > .5 ? '#60717b' : C.muted);
    text(value, 855, y + 4, 67, dropped && strike > .5 ? '#60717b' : C.ink, 'right', 350, 'MovieMono');
    line(140, y + 29, 925, y + 29, '#b9d2df16', 1);
    if (dropped && strike > 0) { line(655, y - 23, 655 + 227 * strike, y - 23, C.red, 5); text(i === 1 ? '最慢，去掉' : '最快，去掉', 460, y - 4, 32, C.red, 'center', 300); }
  });
  const reveal = smooth((u - .63) / .18); ctx.save(); ctx.globalAlpha *= reveal;
  text('取中间三把的均值', 540, 1370, 43, C.muted, 'center'); text('3.51 秒', 540, 1480, 93, C.gold, 'center'); ctx.restore();
  foot('王艺衡平均纪录的五把成绩｜成绩数据截至 2026-10-21');
}
function inspection(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start));
  heading(scene, '观察时间，不计入成绩');
  cube(OPEN.sample(1), { y: 835, size: 145, yaw: -.7 + .15 * u, pitch: .5 });
  text('≤15 秒', 540, 1290, 133, C.cyan, 'center'); text('赛前观察', 540, 1360, 43, C.muted, 'center');
  text('最好成绩 ≠ 已证明的人类极限', 540, 1488, 50, C.gold, 'center');
  foot('WCA 规则 · 纪录是截至核验日的成绩，不是生理极限的证明');
}
function methods(scene, t) {
  const u = clamp((t - scene.start) / (scene.end - scene.start)), model = methodFrame(scene.id, u);
  const titles = { lbl: '层先法：一层一层来', cfop: 'CFOP：先配对，再处理顶层', roux: '桥式：先搭两座“桥墩”' };
  heading(scene, titles[scene.id], '同一个打乱 · 三种不同的目标次序');
  const st = model.stage.id;
  const pitchFor = (id) => id === 'cross' || id === 'corners' ? -.45 : id === 'oll' || id === 'llface' ? .90 : .38;
  const desiredPitch = pitchFor(st), previousPitch = model.stageIndex ? pitchFor(model.stages[model.stageIndex - 1].id) : .42;
  const relative = clamp((u - model.stage.a) / (model.stage.b - model.stage.a));
  const pitch = lerp(previousPitch, desiredPitch, smooth(relative * 4));
  cube(model, { y: 900, size: 176, pitch, yaw: -.64, focus: FOCUS[st] || null });
  const label = scene.id === 'lbl' ? model.stageIndex < 2 ? '先完成底层' : model.stageIndex === 2 ? '再补齐中层' : '最后处理顶层' : model.stage.title;
  text(label, 540, 1333, 58, scene.id === 'roux' ? '#c7b2f5' : C.gold, 'center');
  const labels = scene.id === 'lbl' ? ['底层', '中层', '顶层'] : scene.id === 'cfop' ? ['Cross', 'F2L', 'OLL', 'PLL'] : ['左块', '右块', 'CMLL', 'LSE'];
  const active = scene.id === 'lbl' ? model.stageIndex < 2 ? 0 : model.stageIndex === 2 ? 1 : 2 : model.stageIndex;
  const step = 890 / labels.length;
  labels.forEach((s, i) => {
    const x = 95 + (i + .5) * step, color = i === active ? C.gold : i < active ? C.green : '#557080';
    line(x - step * .38, 1400, x + step * .38, 1400, color, i === active ? 5 : 2); text((i < active ? '✓ ' : '') + s, x, 1462, 36, color, 'center', step - 10);
  });
  foot('程序分阶段求解 · 加速演示 · 非选手纪录复盘\n白底、绿前；中层与双层转动的记步不直接同 HTM 20 比较');
}
function cityRail(city) {
  const cities = ['合肥', '北京', '广州', '桂林']; line(150, 1420, 930, 1420, '#425965', 3);
  cities.forEach((s, i) => { const x = 150 + i * 260, active = i === city; disc(x, 1420, active ? 10 : 5, i <= city ? C.gold : '#425965'); text(s, x, 1487, 37, active ? C.gold : C.muted, 'center', 230); });
}
function recordPair(scene, t) {
  heading(scene, '两位顶尖选手，两种纪录', '2026 · 三阶魔方');
  text('耿暄一', 285, 682, 70, C.ink, 'center', 430); text('王艺衡', 795, 682, 70, C.ink, 'center', 430);
  text('2.51', 285, 946, 136, C.cyan, 'center', 465, 'MovieMono'); text('3.51', 795, 946, 136, C.gold, 'center', 465, 'MovieMono');
  text('单次 WR / 秒', 285, 1030, 37, C.muted, 'center', 450); text('平均 WR / 秒', 795, 1030, 37, C.muted, 'center', 450);
  const q = smooth((t - scene.start - 1.5) / 3.2);
  ['3.68', '3.41', '3.45'].forEach((s, i) => {
    ctx.save(); ctx.globalAlpha *= 1 - smooth((q - .68) / .32);
    text(s, lerp(225 + i * 315, 795, q), lerp(1245, 946, q), lerp(47, 34, q), C.gold, 'center', 300, 'MovieMono'); ctx.restore();
  });
  cityRail(0); foot('王艺衡 3.51 平均：2026-06-17 合肥｜成绩截至 2026-10-21');
}
function results(scene, t) {
  const local = t - scene.start;
  if (scene.id === 'guangzhou' && local < cue('guangzhou', '可决赛', 4.8)) {
    heading(scene, '广州 · 先破纪录', '耿暄一 · 复赛');
    text('2.51', 540, 925, 246, C.cyan, 'center', 960, 'MovieMono'); text('单次世界纪录', 540, 1040, 62, C.ink, 'center');
    text('但，这还不是决赛冠军', 540, 1248, 49, C.gold, 'center'); cityRail(2);
    foot('广州赛单次 WR 产生于复赛｜成绩截至 2026-10-21'); return;
  }
  const config = scene.id === 'beijing' ? { city: 1, title: '北京 · 决赛', sub: '2026-10-01—03', a: ['耿暄一', '4.33', '第 2'], b: ['王艺衡', '4.26', '第 1'] }
    : scene.id === 'guangzhou' ? { city: 2, title: '广州 · 决赛冠军另有其人', sub: '2026-10-05—06', a: ['耿暄一', '4.81', '第 6'], b: ['王艺衡', '4.20', '第 1'] }
      : { city: 3, title: '桂林 · 新的一场比赛', sub: '2026-10-18', a: ['耿暄一', '5.32', '第 2'], b: ['沈懿', '4.66', '第 1'] };
  heading(scene, config.title, config.sub); text('本轮决赛平均 / 秒', 540, 556, 38, C.muted, 'center');
  [config.a, config.b].forEach((row, i) => {
    const x = i ? 795 : 285, winner = i === 1;
    text(row[0], x, 735, 66, C.ink, 'center', 440); text(row[1], x, 980, 135, winner ? C.gold : C.cyan, 'center', 460, 'MovieMono');
    line(x - 153, 1040, x + 153, 1040, winner ? C.gold : '#4b6e80', 3); text(row[2], x, 1135, 66, winner ? C.gold : C.muted, 'center', 420);
  });
  const appear = smooth(local / 1.6), pos = (value) => 170 + (Number(value) - 3.2) / 2.7 * 740;
  line(170, 1232, 910, 1232, '#53707d', 3);
  [3.5, 4, 4.5, 5, 5.5].forEach((n) => { const x = pos(n); line(x, 1223, x, 1241, '#68818f', 2); text(n.toFixed(1), x, 1281, 27, C.muted, 'center', 110, 'MovieMono'); });
  disc(lerp(540, pos(config.a[1]), appear), 1220, 9, C.cyan); disc(lerp(540, pos(config.b[1]), appear), 1244, 9, C.gold);
  text('越少越快', 80, 1196, 29, C.muted);
  if (scene.id === 'guangzhou') text('破纪录 ≠ 夺冠', 540, 1360, 56, C.ink, 'center');
  cityRail(config.city); foot('WCA 官方赛果 · 成绩截至 2026-10-21');
}
function ending(scene, t) {
  const local = t - scene.start, span = Math.min(5.2, scene.audio.duration * .65);
  const landing = smooth((local - scene.audio.duration + .2) / 1.5);
  heading(scene, '20 已证明，人类仍在继续');
  text('20', 280, 588, 155, C.gold, 'center', 430, 'MovieMono'); text('2.51', 800, 578, 123, C.cyan, 'center', 450, 'MovieMono');
  text('数学的边界', 280, 665, 40, C.muted, 'center', 450); text('人类的下一把？', 800, 665, 40, C.muted, 'center', 450);
  cube(CLOSE.sample(local / span), { y: lerp(1025, 1080, landing), size: lerp(141, 117, landing), yaw: lerp(-.60, -.50, landing), pitch: .45 });
  const a = smooth((local - scene.audio.duration + .4) / 1.2);
  ctx.save(); ctx.globalAlpha *= a; text('carljings.top/cube/', 540, 1410, 48, C.gold, 'center', 920, 'MovieMono'); text('转一转，分步看懂三种方法', 540, 1480, 39, C.muted, 'center'); ctx.restore();
  foot('单次纪录数据截至 2026-10-21｜完整来源随影片附上');
}
const DRAW = { hook, history, pieces, constraints, count, metric, compute, bound, average, inspection, lbl: methods, cfop: methods, roux: methods, hefei: recordPair, beijing: results, guangzhou: results, guilin: results, ending };

function caption(t) {
  const c = T.captions.find((c) => t >= c.start && t <= c.end);
  if (!c) return;
  const lines = []; let row = '';
  ctx.font = '700 49px MovieSans';
  for (const char of c.text) {
    if (ctx.measureText(row + char).width > 840 && row) { lines.push(row); row = ''; }
    row += char;
  }
  if (row) lines.push(row);
  const h = lines.length * 66 + 38;
  rr(55, 1538, 910, h, 12, '#040b12df');
  lines.forEach((s, i) => text(s, 510, 1605 + i * 66, 49, '#eff4f6', 'center', 840));
}

export function renderFrame(t) {
  ctx.resetTransform(); ctx.globalAlpha = 1; background(t);
  let index = SCENES.findIndex((s) => t < s.end);
  if (index < 0) index = SCENES.length - 1;
  const scene = SCENES[index], local = t - scene.start;
  // Cross-dissolve the object and its labels, never a black gap between acts.
  if (index > 0 && local < .32) {
    const amount = smooth(local / .32);
    ctx.save(); ctx.globalAlpha = 1 - amount; const previous = SCENES[index - 1]; DRAW[previous.id](previous, previous.end - .001); ctx.restore();
    ctx.save(); ctx.globalAlpha = amount; DRAW[scene.id](scene, t); ctx.restore();
  } else DRAW[scene.id](scene, t);
  caption(t);
  return canvas;
}
