import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import T from './timeline.json' with { type: 'json' };
import { OPEN, SOLVED, SUPER, Sequence, METHODS, methodFrame, moveEvents, FOCUS, clamp, smooth, lerp, rot } from './cubes.js';
import { makeDrawing } from './drawing.js';

for (const weight of [400, 700]) GlobalFonts.registerFromPath(fileURLToPath(new URL(`../assets/fonts/NotoSC-${weight}.ttf`, import.meta.url)), 'MovieSans');
GlobalFonts.registerFromPath(fileURLToPath(new URL('../assets/fonts/NotoSansMono-700.ttf', import.meta.url)), 'MovieMono');
export const WIDTH = 1080, HEIGHT = 1920, FPS = 30, TIMELINE = T;
const canvas = createCanvas(WIDTH, HEIGHT), ctx = canvas.getContext('2d');
const C = { ink: '#f3f1e9', muted: '#8da3b5', gold: '#efca7c', cyan: '#6fdfed', green: '#92dfb5', red: '#ff8b77', lilac: '#c7aff2' };
const { text, line, disc, rr, cube, camera } = makeDrawing(ctx, C);
const SCENES = T.scenes, END = SCENES.at(-1), RACE = METHODS.cfop.sequence;
const q = (s, t) => clamp((t - s.start) / (s.end - s.start));
const elapsed = (s, t) => t - s.start;
const ease = (x) => 1 - (1 - clamp(x)) ** 3;
const arrive = (x) => { x = clamp(x); return 1 + Math.exp(-6 * x) * Math.sin((x - .13) * 9) * .15; };
function cue(id, fragment, fallback) {
  const s = SCENES.find(s => s.id === id), c = T.captions.find(c => c.scene === id && c.text.replace(/\s/g, '').includes(fragment.replace(/\s/g, '')));
  return c ? c.start - s.start : fallback;
}
for (const id of ['lbl', 'cfop', 'roux']) {
  const s = SCENES.find(s => s.id === id), span = s.end - s.start;
  let b;
  if (id === 'lbl') {
    const base = cue(id, '底层', span * .55) / span, middle = cue(id, '中层', span * .68) / span, top = cue(id, '顶层', span * .8) / span;
    b = [0, base, middle, top, lerp(top, 1, .25), lerp(top, 1, .5), lerp(top, 1, .75), 1];
  }
  if (id === 'cfop') b = [0, cue(id, 'F2L', span * .33) / span, cue(id, '再翻', span * .76) / span, cue(id, '排好', span * .9) / span, 1];
  if (id === 'roux') {
    const corners = cue(id, '调好', span * .3) / span, edges = cue(id, '最后', span * .48) / span;
    b = [0, corners * .48, corners, edges, 1];
  }
  for (let i = 1; i < b.length - 1; i++) b[i] = clamp(b[i], b[i - 1] + .025, 1 - .025 * (b.length - 1 - i));
  METHODS[id].stages.forEach((stage, i) => { stage.a = b[i]; stage.b = b[i + 1]; });
}
export const EVENTS = SCENES.flatMap(moveEvents);
for (const [scene, start, duration] of [['hook', 0, 2.51], ['ending', END.start, 5.1]]) {
  RACE.moves.forEach((move, i) => EVENTS.push({ time: start + (i + .96) / RACE.moves.length * duration, kind: 'turn', method: scene, move }));
}
const LANDING = END.start + END.audio.duration + .65;
const PROOF = SCENES.find(s => s.id === 'bound');
SUPER.moves.forEach((move, i) => EVENTS.push({ time: PROOF.start + (PROOF.end - PROOF.start) * (.08 + (i + .96) / 20 * .53), kind: 'turn', method: 'bound', move }));
for (const s of SCENES) EVENTS.push({ time: s.start, kind: 'cut', scene: s.id });
EVENTS.push({ time: 2.51, kind: 'impact', scene: 'hook' });
EVENTS.push({ time: SCENES.find(s => s.id === 'hook').start + cue('hook', '第六', 5.8), kind: 'reveal', scene: 'hook' });
EVENTS.push({ time: SCENES.find(s => s.id === 'guangzhou').start + cue('guangzhou', '可决赛', 5.5), kind: 'reveal', scene: 'guangzhou' });
EVENTS.push({ time: LANDING, kind: 'landing' });
EVENTS.sort((a, b) => a.time - b.time);

// Sixteen actual states become a reusable, deterministic atlas for the state-space shot.
const ATLAS = [];
for (let i = 0; i < 16; i++) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  cube(RACE.sample(i / 16), { x: 160, y: 160, size: 66, yaw: -.55 + (i % 4) * .08, pitch: .5 });
  const tile = createCanvas(320, 320); tile.getContext('2d').drawImage(canvas, 0, 0, 320, 320, 0, 0, 320, 320); ATLAS.push(tile);
}
const FIELD = Array.from({ length: 220 }, (_, i) => {
  const z = 1 - 2 * (i + .5) / 220, r = Math.sqrt(1 - z * z), a = i * 2.39996323;
  return [Math.cos(a) * r, Math.sin(a) * r, z];
});
function withAlpha(a, fn) { ctx.save(); ctx.globalAlpha *= clamp(a); fn(); ctx.restore(); }
function backdrop(t, id) {
  const warm = ['history'].includes(id), race = ['hook', 'average', 'hefei', 'beijing', 'guangzhou', 'guilin'].includes(id);
  const g = ctx.createLinearGradient(0, 0, 1080, 1920);
  g.addColorStop(0, warm ? '#29241f' : race ? '#141222' : '#081421');
  g.addColorStop(.6, warm ? '#171b21' : race ? '#090c18' : '#06101b'); g.addColorStop(1, '#04070d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
  const halo = ctx.createRadialGradient(490, 880, 10, 490, 880, 800);
  halo.addColorStop(0, warm ? '#b49a5b24' : race ? '#4a407f2b' : '#19789a24'); halo.addColorStop(1, '#00000000');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, 1080, 1800);
  // A perspective floor provides a reference for camera scale and forward motion.
  const horizon = 1130;
  withAlpha(.20, () => {
    for (let i = -8; i <= 8; i++) line(540 + i * 28, horizon, 540 + i * 240, 1580, '#6383a2', 1);
    for (let i = 0; i < 8; i++) { const p = ((i + t * .12) % 8) / 8; line(0, horizon + p * p * 450, 1080, horizon + p * p * 450, '#6383a2', 1); }
  });
  text('小川科普', 66, 82, 27, '#ced9df', 'left', 200);
  text('THE CUBE / 2026', 946, 82, 20, '#6d8397', 'right', 400, 'MovieMono');
}
function kicker(str, color = C.gold) { text(str, 72, 177, 30, color); }
function title(a, b = '', color = C.ink) { text(a, 70, 278, 77, color, 'left', 950); if (b) text(b, 73, 342, 37, C.muted, 'left', 910, 'MovieSans', 400); }
function foot(str) { text(str, 510, 1784, 25, '#8094a6', 'center', 940, 'MovieSans', 400); }
function number(str, x, y, size, color = C.gold, max = 940) { text(str, x, y, size, color, 'center', max, 'MovieMono'); }
function arc(x, y, radius, from, to, color, width = 3) {
  ctx.beginPath(); ctx.arc(x, y, radius, from, to); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function ring(x, y, rx, ry, color, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
function shadow(y, width = 370, opacity = .35) {
  ctx.save(); ctx.translate(540, y); ctx.scale(1, .16);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, width); g.addColorStop(0, `rgba(0,0,0,${opacity})`); g.addColorStop(1, '#00000000');
  ctx.fillStyle = g; ctx.fillRect(-width, -width, width * 2, width * 2); ctx.restore();
}
function ticker(texts, active, y = 1440, color = C.gold) {
  const w = 880 / texts.length;
  texts.forEach((s, i) => { const x = 70 + (i + .5) * w; line(x - w * .4, y - 33, x + w * .4, y - 33, i <= active ? color : '#304151', i === active ? 5 : 2); text(s, x, y + 21, 34, i === active ? color : i < active ? C.ink : '#596c7c', 'center', w - 10); });
}
function worldLine(a, b, opts, color, width = 2) {
  const project = v => { const p = camera(v, opts.yaw, opts.pitch), f = 11 / (11 - p[2]); return [opts.x + p[0] * opts.size * f, opts.y - p[1] * opts.size * f]; };
  const aa = project(a), bb = project(b); line(...aa, ...bb, color, width);
}
function box(min, max, options, color) {
  const points = Array.from({ length: 8 }, (_, i) => [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]]);
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) worldLine(points[i], points[i | bit], options, color, 2.3);
}

function hook(s, t) {
  const local = elapsed(s, t), reveal = cue('hook', '第六', 5.8), pull = ease(t / 2.51);
  if (local < reveal - .5) {
    kicker('广州 · 单次世界纪录', C.cyan);
    number(Math.min(2.51, t).toFixed(2), 515, 438, 208, C.cyan);
    text('秒', 873, 422, 61, C.ink, 'center', 100);
    if (t >= 2.51) withAlpha(ease((t - 2.51) / .4), () => { text('世界纪录', 515, 542, 58, C.ink, 'center'); line(270, 568, 760, 568, C.cyan, 4); });
    shadow(1350, 450);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 602, 1080, 890); ctx.clip();
    cube(RACE.sample(t / 2.51), { x: lerp(660, 540, pull), y: lerp(1350, 955, pull), size: lerp(430, 185, pull), yaw: lerp(-1.1, -.59, pull), pitch: lerp(.12, .55, pull) });
    ctx.restore();
    if (t > 2.51) text('耿暄一', 510, 1430, 53, C.ink, 'center');
  } else {
    const a = ease((local - reveal + .5) / .48);
    kicker('同一场比赛 · 决赛');
    number('6', 540, 965, 660 * arrive(a), '#d08f7845', 700);
    text('却只排', 80, 378, 95, C.ink); text('第六', 80, 512, 126, C.red);
    cube(RACE.sample(1), { x: 680, y: 1120, size: 127, yaw: -.59 + .16 * a, pitch: .55 });
    withAlpha(smooth((local - reveal - .8) / .5), () => text('为什么？', 79, 1428, 100, C.gold));
  }
  foot('官方成绩截至 2026-10-21｜动画为示意还原，并非纪录原解');
}
function history(s, t) {
  const local = elapsed(s, t), back = ease(local / 1.4), year80 = cue('history', '1980', 6.5), modern = smooth((local - year80) / 1.3);
  kicker('把时间拨回去');
  const year = local < 1.4 ? String(Math.round(lerp(2026, 1974, back))) : local < year80 ? '1974' : '1980';
  number(year, 520, 546, 236, '#efca7c3a');
  title(local < year80 ? '起点，是一个教具' : '一道难题，走向全球');
  const options = { x: 535, y: 970, size: 172 + modern * 10, yaw: -.75 + .20 * q(s, t), pitch: .45, sepia: 1 - modern };
  cube(SOLVED.sample(0), options);
  withAlpha(1 - modern, () => box([-1.65, -1.65, -1.65], [1.65, 1.65, 1.65], options, '#e2ca8b70'));
  if (modern > 0) withAlpha(modern * .75, () => { ring(535, 970, 425, 162, '#dfc58b70', -.12); ring(535, 970, 350, 310, '#dfc58b35', .6); });
  text('Ernő Rubik / 鲁比克', 510, 1394, 48, C.gold, 'center');
  foot('1974 发明 · 1975 内部结构专利 · 1980 全球推广');
}
function exploded(s, t, amount) {
  const spin = -.67 + .50 * amount + .20 * q(s, t), clock = elapsed(s, t) * .12;
  ring(535, 902, 398, 162, '#6dd6e849', -.2);
  ring(535, 902, 300, 335, '#eac16e40', .23);
  cube(SOLVED.sample(0), {
    x: 535, y: 924, size: lerp(177, 103, amount), yaw: spin, pitch: .45,
    layout: (c, original) => {
      if (c.piece.type === 'center') return original.map(v => v * lerp(1, .58, amount));
      const i = Number(c.piece.key.slice(1)), corner = c.piece.type === 'corner', n = corner ? 8 : 12;
      const a = i / n * Math.PI * 2 + clock * (corner ? 1 : -.8), radius = corner ? 2.65 : 4;
      const target = [Math.cos(a) * radius, Math.sin(a) * radius * (corner ? 1.05 : .62), Math.sin(a * 2) * .7];
      return original.map((v, k) => lerp(v, target[k], amount));
    }
  });
}
function pieces(s, t) {
  const local = elapsed(s, t), amount = smooth((local - 1.3) / 2.5);
  kicker('拆开，才能看清'); title('真正乱跑的，是这 20 块');
  exploded(s, t, amount);
  withAlpha(amount, () => {
    number('8', 252, 502, 122, C.gold); text('角块 · 3 种朝向', 252, 565, 34, C.ink, 'center', 450);
    number('12', 788, 502, 122, C.cyan); text('棱块 · 2 种朝向', 788, 565, 34, C.ink, 'center', 450);
    text('位置 × 朝向', 510, 1435, 72, C.ink, 'center');
  });
  foot('普通三阶：8 角、12 棱、6 中心｜整只魔方的朝向不另计');
}
function constraints(s, t) {
  const local = elapsed(s, t);
  kicker('看似自由，其实相互牵制'); title('最后一块，不能随心所欲');
  cube(SOLVED.sample(0), { x: 800, y: 550, size: 72, yaw: -.7, pitch: .52, focus: new Set(['C7', 'E11']) });
  const rows = [{ n: 8, mod: 3, y: 790, label: '角块朝向', color: C.gold }, { n: 12, mod: 2, y: 1080, label: '棱块朝向', color: C.cyan }];
  rows.forEach(({ n, mod, y, label, color }) => {
    text(label, 78, y - 105, 43, color);
    const step = 840 / (n - 1), ticks = Math.floor(local * 1.15), angles = Array.from({ length: n - 1 }, (_, i) => Math.floor((ticks + i * 2) / 3) % mod);
    angles.push((mod - angles.reduce((a, b) => a + b, 0) % mod) % mod);
    line(90, y, 930, y, '#586c7e', 3);
    for (let i = 0; i < n; i++) {
      const x = 90 + i * step; disc(x, y, n === 8 ? 30 : 23, '#152538');
      arc(x, y, n === 8 ? 29 : 22, -.5 * Math.PI, Math.PI * 1.5, i === n - 1 ? C.red : color, i === n - 1 ? 5 : 2);
      const a = angles[i] / mod * Math.PI * 2 - Math.PI / 2; line(x, y, x + Math.cos(a) * 17, y + Math.sin(a) * 17, i === n - 1 ? C.red : color, 4);
    }
    text(`前 ${n - 1} 个决定`, 90, y + 90, 35, C.muted); text('最后一个', 930, y + 90, 35, C.red, 'right', 220);
  });
  const lock = smooth(local / 1.5); line(905, 824, 905, lerp(824, 1040, lock), C.red, 3);
  text('角、棱排列奇偶必须一致', 510, 1395, 49, C.ink, 'center');
  text('8! × 3⁷ × 12! × 2¹¹ ÷ 2', 510, 1475, 49, C.gold, 'center', 930);
  foot('箭头示意朝向约束，不表示任意拆装都可通过合法转动达到');
}
function count(s, t) {
  const local = elapsed(s, t), zoom = ease(local / 3.1), angle = local * .04;
  const items = FIELD.map((v, i) => ({ p: rot(v, 1, angle), i })).sort((a, b) => a.p[2] - b.p[2]);
  withAlpha(zoom, () => {
    for (const { p, i } of items) {
      const f = 1.5 / (1.7 - p[2] * .65), side = (24 + 24 * (p[2] + 1)) * f;
      const x = 540 + p[0] * 670 * f, y = 1090 + p[1] * 440 * f;
      withAlpha(.32 + (p[2] + 1) * .24, () => ctx.drawImage(ATLAS[i % 16], x - side / 2, y - side / 2, side, side));
    }
  });
  cube(SOLVED.sample(0), { x: 535, y: 1030, size: lerp(182, 34, zoom), yaw: -.67 + local * .04, pitch: .45, alpha: 1 - zoom * .6 });
  kicker('从一个状态，拉远');
  text('43,252,003,274,', 510, 382, 92, C.gold, 'center', 950, 'MovieMono');
  text('489,856,000', 510, 491, 92, C.gold, 'center', 950, 'MovieMono');
  text('超 4325 亿亿种', 510, 595, 61, C.ink, 'center');
  withAlpha(smooth((local - cue('count', '每秒', 2.5)) / .5), () => {
    rr(75, 1286, 875, 204, 14, '#07101aec');
    text('每秒 1 种', 510, 1360, 43, C.muted, 'center'); text('也要约 1.37 万亿年', 510, 1450, 66, C.ink, 'center');
  });
  foot('状态空间示意｜合法组合数按固定中心计算');
}
const QUARTER = new Sequence([], ['R', 'R', 'R', 'R']), HALF = new Sequence([], ['R2', 'R2']);
function metric(s, t) {
  const local = elapsed(s, t), at = cue('metric', '任何', 4.8), a = smooth((local - at) / .6);
  kicker('再乱，都能回来'); number('20', 520, 622, 380, C.gold);
  if (local < at) {
    cube(QUARTER.sample((local % 6) / 6), { x: 270, y: 1030, size: 100, pitch: .4 });
    cube(HALF.sample((local % 6) / 6), { x: 790, y: 1030, size: 100, pitch: .4 });
    text('90° = 1 步', 270, 1350, 46, C.ink, 'center', 460); text('180° = 1 步', 790, 1350, 46, C.ink, 'center', 460);
  } else {
    cube(SOLVED.sample(0), { x: 535, y: 990, size: 141, yaw: -.64 + .08 * a, pitch: .42 });
    text('任何合法打乱，最多 20 步', 510, 1435, 63, C.ink, 'center');
  }
  foot('HTM 度量：90° 和 180° 都算一步｜20 是最坏情况所需的最短步数');
}
function compute(s, t) {
  const u = q(s, t), local = elapsed(s, t), merge = smooth((u - .18) / .46), scan = smooth((u - .65) / .3);
  kicker('2010 / 计算机辅助证明'); title(u < .58 ? '不是试几次，是一个都不能漏' : '把巨大问题，变成可检查的任务');
  const field = FIELD.slice(0, 144);
  withAlpha(smooth((merge - .55) / .35), () => {
    for (let g = 0; g < 6; g++) for (let j = 4; j >= 1; j--) {
      const x = 225 + g % 3 * 300, y = 860 + Math.floor(g / 3) * 295;
      rr(x - 61 + j * 7, y - 66 - j * 6, 122, 132, 7, '#0d1e2a', '#304656');
    }
  });
  for (let i = 0; i < field.length; i++) {
    const p = rot(field[i], 1, local * .09), group = i % 6, stack = Math.floor(i / 6);
    const gx = 225 + group % 3 * 300 + stack % 4 * 4, gy = 860 + Math.floor(group / 3) * 295 + Math.floor(stack / 4) * 4;
    const x = lerp(540 + p[0] * 440, gx, merge), y = lerp(1020 + p[1] * 360, gy, merge);
    const side = lerp(25 + p[2] * 10, 138, merge), alpha = merge > .5 ? i < 6 ? 1 : .13 * (1 - smooth((merge - .5) / .3)) : .4 + (p[2] + 1) * .25;
    withAlpha(alpha, () => ctx.drawImage(ATLAS[i % 16], x - side / 2, y - side / 2, side, side));
  }
  withAlpha(merge, () => {
    for (let i = 0; i < 6; i++) {
      const x = 225 + i % 3 * 300, y = 860 + Math.floor(i / 3) * 295;
      rr(x - 106, y - 98, 212, 214, 12, null, i / 6 <= scan ? '#8ce6be' : '#486b89');
      if (i / 6 <= scan) text('≤20  ✓', x, y + 150, 31, C.green, 'center', 245);
    }
  });
  const val = u < .53 ? '2,217,093,120' : '55,882,296';
  number(val, 510, 543, u < .53 ? 68 : 86, u < .53 ? C.ink : C.gold);
  text(u < .53 ? '分组后的总组数' : '经对称与覆盖约化后需检查的组', 510, 612, 34, C.muted, 'center');
  ticker(['分组', '对称', '集合覆盖', '逐组证明'], Math.min(3, Math.floor(u * 4)), 1450);
  foot('分组、约化与检查为示意｜总计算量约 35 CPU 年');
}
function bound(s, t) {
  const u = q(s, t), crush = smooth((u - .65) / .28), solve = clamp((u - .08) / .53);
  kicker('上限与下限，必须相遇'); title('20，少一步也不行');
  const top = lerp(440, 574, crush), bottom = lerp(1450, 684, crush);
  line(80, top, 945, top, C.cyan, 7); text('所有状态 ≤20', 80, top - 35, 47, C.cyan);
  line(80, bottom, 945, bottom, C.gold, 7); text('超级翻转 ≥20', 80, bottom - 32, 47, C.gold);
  cube(SUPER.sample(solve), { x: lerp(535, 800, crush), y: lerp(953, 1305, crush), size: lerp(167, 55, crush), yaw: -.68 + u * .4, pitch: .48, focus: new Set(Array.from({ length: 12 }, (_, i) => 'E' + i)) });
  withAlpha(1 - crush, () => { number(`${SUPER.sample(solve).index}/20`, 810, 655, 57, C.ink, 350); text('当前演示步数', 810, 713, 27, C.muted, 'center', 330); });
  withAlpha(crush, () => { number('20', 515, 1040, 310, C.gold); text('上帝之数', 515, 1158, 62, C.ink, 'center'); });
  foot('下界：Reid 1995｜上界：Rokicki 等 2010｜超级翻转使用已验证 20 步解');
}
function methodOptions(s, t, model) {
  const u = q(s, t), st = model.stage.id;
  const pitchFor = id => id === 'cross' || id === 'corners' ? -.46 : id === 'oll' || id === 'llface' ? .85 : .38;
  const previous = model.stageIndex ? pitchFor(model.stages[model.stageIndex - 1].id) : .42;
  const part = clamp((u - model.stage.a) / (model.stage.b - model.stage.a));
  const settle = smooth((part - .54) / .21);
  const lastPair = new Set(['C6', 'E11']);
  const pairShot = s.id === 'cfop' && st === 'f2l';
  return { x: 535, y: lerp(935, 877, settle), size: lerp(174, 150, settle), yaw: pairShot ? 2.45 : -.65 + Math.sin(u * Math.PI) * .09, pitch: lerp(previous, pitchFor(st), smooth(part * 5)), focus: pairShot && !model.held ? lastPair : FOCUS[st] || null };
}
function methods(s, t) {
  const u = q(s, t), model = methodFrame(s.id, u), o = methodOptions(s, t, model), st = model.stage.id;
  const conf = s.id === 'lbl' ? ['01 / 层先法', '像盖楼，一层一层来', C.gold]
    : s.id === 'cfop' ? ['02 / CFOP', '让角和棱，结伴回家', C.cyan] : ['03 / 桥式 Roux', '先搭好，两座桥墩', C.lilac];
  kicker(conf[0], conf[2]); title(conf[1]);
  shadow(1360, 410);
  if (s.id === 'lbl') {
    // Ghost floors show the successive targets behind the one real, turning cube.
    withAlpha(.27, () => {
      for (let layer = -1; layer <= 1; layer++) box([-1.6, layer - .51, -1.6], [1.6, layer + .51, 1.6], { ...o, size: 201 }, conf[2]);
    });
    text('底层 → 中层 → 顶层', 510, 480, 48, C.gold, 'center');
  }
  if (s.id === 'cfop') {
    text(st === 'cross' ? '先搭十字' : st === 'f2l' ? '1 个角 + 1 条棱 → 一组' : st === 'oll' ? 'OLL / 翻齐顶面' : 'PLL / 排好顶层', 510, 480, 48, C.cyan, 'center');
    if (st === 'f2l') {
      text('看最后一组：白红蓝角 + 蓝红棱', 510, 380, 33, C.muted, 'center');
    }
  }
  if (s.id === 'roux') {
    text(st === 'fb' || st === 'sb' ? '左块 1×2×3  +  右块 1×2×3' : st === 'cmll' ? 'CMLL / 顶层四角' : 'M、U / 六棱与中心归位', 510, 480, 43, C.lilac, 'center');
  }
  cube(model, o);
  if (s.id === 'roux') {
    const c = { ...o, size: o.size * 1.02 };
    if (model.stageIndex >= 1) box([-1.55, -1.55, -1.55], [-.45, .45, 1.55], c, '#c7aff297');
    if (model.stageIndex >= 2) box([.45, -1.55, -1.55], [1.55, .45, 1.55], c, '#c7aff297');
  }
  const name = s.id === 'lbl' ? model.stageIndex < 2 ? '底层' : model.stageIndex === 2 ? '中层' : '顶层' : model.stage.title;
  if (model.held) text(name + '  ✓', 510, 1338, 60, conf[2], 'center');
  const labels = s.id === 'lbl' ? ['底层', '中层', '顶层'] : s.id === 'cfop' ? ['Cross', 'F2L', 'OLL', 'PLL'] : ['左块', '右块', 'CMLL', 'LSE'];
  const active = s.id === 'lbl' ? model.stageIndex < 2 ? 0 : model.stageIndex === 2 ? 1 : 2 : model.stageIndex;
  ticker(labels, active, 1440, conf[2]);
  foot('同一个打乱，三套已验算解法｜阶段节选，非纪录原解或 HTM 最优解');
}
function inspection(s, t) {
  const local = elapsed(s, t), u = q(s, t), a = -.5 * Math.PI + clamp(local / 4.4) * Math.PI * 2;
  kicker('手动之前，眼睛已经出发'); title('15 秒观察，先在脑中走一遍');
  arc(535, 945, 393, -.5 * Math.PI, a, '#6fd9e550', 5);
  cube(RACE.sample(0), { x: 535, y: 945, size: 165, yaw: -.66 + .16 * u, pitch: .52 });
  for (let i = 0; i < 4; i++) {
    const progress = clamp((local - i * .6) / 1.5), x = 264 + i * 176, y = 1395;
    line(x, y, x, y - 50 * progress, i / 4 < u ? C.cyan : '#31414e', 3); disc(x, y - 50 * progress, 8, i / 4 < u ? C.cyan : '#31414e');
  }
  text('赛前观察，不计入还原时间', 510, 502, 50, C.cyan, 'center');
  foot('WCA 标准观察时间｜正式还原计时另行开始');
}
const SCORES = [3.68, 4.61, 3.39, 3.41, 3.45];
function scoreCards(local, startDrop, merge, y = 925) {
  for (let i = 0; i < 5; i++) {
    const dropped = i === 1 || i === 2, drop = smooth((local - startDrop) / .9), keep = !dropped, targetX = 510 + (i === 0 ? -1 : i === 3 ? 0 : 1) * 252;
    const x = lerp(128 + i * 194, keep ? targetX : i === 1 ? -260 : 1280, drop);
    const yy = y + (dropped ? 230 * drop : -110 * merge);
    ctx.save(); ctx.translate(x, yy); ctx.rotate(dropped ? (i === 1 ? -.25 : .25) * drop : 0); ctx.globalAlpha *= dropped ? 1 - drop : 1;
    rr(-85, -100, 170, 202, 12, '#122235', dropped && drop > .1 ? C.red : C.gold);
    number(SCORES[i].toFixed(2), 0, 15, 49, C.ink, 165); text(String(i + 1), 0, -45, 26, C.muted, 'center');
    if (dropped && drop > .1) line(-65, -2, 65, -2, C.red, 5); ctx.restore();
  }
}
function average(s, t) {
  const local = elapsed(s, t), at = cue('average', '去掉', 5), drop = smooth((local - at) / 1), merge = smooth((local - at - 1) / 1.5);
  kicker('现在，回答开头的那个问题'); title('一把的爆发，和五把的稳定');
  number('2.51', 310, 570, 124, C.cyan, 470); text('单次纪录', 310, 645, 42, C.ink, 'center', 460);
  number('5', 810, 570, 124, C.gold, 250); text('把取平均', 810, 645, 42, C.ink, 'center', 340);
  scoreCards(local, at, merge, 970);
  withAlpha(drop, () => { text('最快、最慢，去掉', 510, 1220, 49, C.red, 'center'); text('留下三把，再算平均', 510, 1365, 63, C.ink, 'center'); });
  foot('五把示例取自王艺衡 3.51 平均纪录｜同一轮的单次与平均分别记录');
}
function hefei(s, t) {
  const local = elapsed(s, t), merge = ease(local / 1.8);
  kicker('合肥 / 2026-06-17'); title('王艺衡，把稳定也拧成了纪录');
  withAlpha(1 - merge, () => scoreCards(10, 1, 1, 900));
  const y = lerp(1120, 1040, merge);
  number('3.51', 515, y, 225 * arrive(merge), C.gold);
  text('平均世界纪录 / 秒', 510, y + 105, 53, C.ink, 'center');
  text('(3.68 + 3.41 + 3.45) ÷ 3', 510, 550, 43, C.muted, 'center', 940, 'MovieMono');
  for (let i = 0; i < 3; i++) { const x = 260 + i * 250; line(x, 1290, x, lerp(1290, 1190, merge), C.gold, 3); disc(x, 1290, 7, C.gold); }
  text('一次爆发，还不够', 510, 1450, 72, C.ink, 'center');
  foot('WCA 官方五把：3.68 / 4.61 / 3.39 / 3.41 / 3.45｜截至 2026-10-21');
}
function finishLane(name, value, rank, x, y, color, amount, width = 810) {
  const length = (6 - value) / 3 * width;
  text(name, x, y - 60, 53, C.ink); rr(x, y - 15, Math.max(2, length * amount), 20, 7, color);
  text(value.toFixed(2), x + width, y - 52, 75, color, 'right', 330, 'MovieMono');
  text(rank, x + width, y + 60, 39, color, 'right', 250);
}
function beijing(s, t) {
  const local = elapsed(s, t), motion = ease(local / 1.3), reveal = smooth((local - cue('beijing', '只差', 5.4)) / .5);
  kicker('北京 / 2026-10-01—03'); title('冠军，只领先 0.07 秒');
  text('决赛平均 / 秒', 78, 445, 36, C.muted);
  finishLane('王艺衡', 4.26, '第 1', 85, 790, C.gold, motion, 830);
  finishLane('耿暄一', 4.33, '第 2', 85, 1080, C.cyan, motion, 830);
  withAlpha(reveal, () => { number('0.07', 515, 1400, 150, C.ink); text('秒', 864, 1385, 56, C.muted, 'center', 100); });
  foot('北京赛三阶决赛官方平均成绩｜截至 2026-10-21');
}
function resultCard(name, value, rank, label, x, y, scale, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  const g = ctx.createLinearGradient(-370, -260, 370, 280); g.addColorStop(0, '#233448'); g.addColorStop(.6, '#101929'); g.addColorStop(1, '#080f19');
  rr(-370, -260, 740, 520, 22, g, color);
  line(-340, -169, 340, -169, color, 3);
  text(name, -326, -194, 47, C.ink); text(label, 324, -193, 30, color, 'right', 410);
  number(value, 0, 40, 190, color, 650);
  text(rank, 0, 176, 56, C.ink, 'center', 650);
  ctx.restore();
}
function guangzhou(s, t) {
  const local = elapsed(s, t), cut = cue('guangzhou', '可决赛', 5.5);
  kicker('广州 / 2026-10-05—06');
  if (local < cut) {
    title('复赛，2.51 秒！');
    resultCard('耿暄一', '2.51', '单次世界纪录', '复赛单次 / 秒', 515, 969, 1, C.cyan);
    ring(515, 965, 440 + Math.sin(local * 3) * 4, 335, '#6fd6e64d', -.1);
    text('但，比赛还没有结束', 510, 1430, 61, C.gold, 'center');
  } else {
    title('决赛，冠军却是王艺衡');
    const flip = clamp((local - cut) / .70), shift = smooth((local - cut - .60) / .9);
    ctx.save(); ctx.translate(lerp(515, 680, shift), lerp(969, 1155, shift)); ctx.scale(Math.max(.018, Math.abs(Math.cos(Math.PI * flip))), 1);
    if (flip < .5) resultCard('耿暄一', '2.51', '单次世界纪录', '复赛单次 / 秒', 0, 0, 1, C.cyan);
    else resultCard('耿暄一', '4.81', '第 6', '决赛平均 / 秒', 0, 0, lerp(1, .68, shift), C.cyan);
    ctx.restore();
    withAlpha(shift, () => resultCard('王艺衡', '4.20', '冠军 / 第 1', '决赛平均 / 秒', lerp(-350, 366, shift), 757, .74, C.gold));
    text('单次纪录 ≠ 决赛冠军', 510, 1420, 68, C.ink, 'center');
  }
  foot('2.51 产生于复赛｜决赛排名依据该轮平均成绩｜截至 2026-10-21');
}
function guilin(s, t) {
  const local = elapsed(s, t);
  kicker('桂林 / 2026-10-18'); title('新的一场，一切重来');
  const enter = ease(local / .7);
  number('5.32', 515, 965, 230 * arrive(enter), C.cyan);
  text('耿暄一 / 决赛平均 · 第 2', 510, 1090, 52, C.ink, 'center');
  text('冠军：沈懿 4.66 秒', 510, 1260, 44, C.muted, 'center');
  const x = 130 + (local * 180 % 760); line(130, 1440, 890, 1440, '#334355', 2); disc(x, 1440, 7, C.cyan);
  foot('桂林赛三阶决赛官方成绩｜截至 2026-10-21');
}
function ending(s, t) {
  const local = elapsed(s, t), landing = smooth((t - LANDING + 1.1) / 1.1), open = smooth((t - LANDING) / .6);
  kicker('一个魔方，两种边界');
  number('20', 285, 475, 150, C.gold, 440); number('2.51', 800, 475, 123, C.cyan, 450);
  text('步数边界已证明', 285, 547, 36, C.muted, 'center', 470); text('时间仍在改写', 800, 547, 36, C.muted, 'center', 450);
  shadow(1352, 400, .7);
  cube(RACE.sample(local / 5.1), { x: 535, y: lerp(1000, 1033, landing), size: lerp(184, 118, landing), yaw: lerp(-.59, -.49, landing), pitch: .55 });
  withAlpha(open, () => text('下一个纪录，会是谁？', 510, 735, 66, C.ink, 'center'));
  withAlpha(smooth((t - LANDING - .2) / .8), () => {
    text('carljings.top/cube/', 510, 1425, 42, C.gold, 'center', 930, 'MovieMono');
    text('转一转，分步看懂', 510, 1487, 34, C.muted, 'center');
  });
  foot('纪录是已发生的成绩，不是已证明的人类极限｜数据截至 2026-10-21');
}
const DRAW = { hook, history, pieces, constraints, count, metric, compute, bound, lbl: methods, cfop: methods, roux: methods, inspection, average, hefei, beijing, guangzhou, guilin, ending };
function caption(t) {
  const c = T.captions.find(c => t >= c.start && t <= c.end); if (!c) return;
  const rows = []; let row = ''; ctx.font = '700 49px MovieSans';
  for (const ch of c.text) { if (ctx.measureText(row + ch).width > 840 && row) { rows.push(row); row = ''; } row += ch; } if (row) rows.push(row);
  const g = ctx.createLinearGradient(0, 1500, 0, 1748); g.addColorStop(0, '#03060a00'); g.addColorStop(.25, '#03060ae6'); g.addColorStop(.8, '#03060ae6'); g.addColorStop(1, '#03060a00');
  ctx.fillStyle = g; ctx.fillRect(20, 1500, 980, 248);
  rows.forEach((r, i) => text(r, 510, 1605 + i * 66, 49, '#f3f5f6', 'center', 840));
}
export function renderFrame(t) {
  ctx.resetTransform(); ctx.globalAlpha = 1;
  let index = SCENES.findIndex(s => t < s.end); if (index < 0) index = SCENES.length - 1;
  const s = SCENES[index], local = t - s.start; backdrop(t, s.id);
  // Most changes are purposeful cuts. A short lateral occlusion links eras and methods.
  DRAW[s.id](s, t);
  if (index > 0 && local < .24 && ['history', 'count', 'lbl', 'cfop', 'roux', 'average'].includes(s.id)) {
    const p = ease(local / .24), width = (1 - p) * 1100;
    ctx.fillStyle = s.id === 'history' ? '#c7a869' : '#1b3447'; ctx.fillRect(1080 - width, 120, width, 1390);
  }
  const v = ctx.createLinearGradient(0, 1680, 0, 1920); v.addColorStop(0, '#03060a00'); v.addColorStop(1, '#03060acc'); ctx.fillStyle = v; ctx.fillRect(0, 1680, 1080, 240);
  caption(t); return canvas;
}
