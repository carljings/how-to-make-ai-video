// P4 · 猜：下一只地鼠从哪个洞冒？ — pixel arcade whack-a-mole on a CRT.
// A mole appears on every beat of the measured grid; its hole = the measured bass pitch class of that beat
// (chroma estimate per beat: F → left, G/G# → middle, A# → right). The 4-bar loop therefore repeats as a 16-step “谱”.
import { drawClawd2D, CLAWD_ORANGE } from '../common/clawd.js';
import { loadCues, makeSubs } from '../common/subs.js';

const film = window.film = { ready: false };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
await document.fonts.load('700 40px "Noto Sans CJK SC"');
await document.fonts.load('700 40px "DejaVu Sans Mono"');

const BEAT = 0.53178, PH = 0.3976;
const T_BASS = 3.056, T_LOOP2 = 11.565, T_DRAG1 = 15.819, T_DRAG1B = 17.946, T_DROP1 = 20.073, T_RESULT = 22.2;
const PATTERN = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2, 0];   // per beat of the 4-bar loop (measured bass, coarse)
const K0 = Math.round((T_BASS - PH) / BEAT);                           // beat index of 3.056 s
const beatT = (k) => PH + k * BEAT;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---- game events (pure function of t) ------------------------------------------------------------------------------
const EVENTS = [];   // { t, hole, boss, contact, judge }
for (let k = K0; k < 200; k++) {
  const tb = beatT(k);
  if (tb > 24.9) break;
  if (tb >= T_DRAG1 - 0.01 && tb < T_DROP1 - 0.01) continue;               // drag: nobody comes out
  const i = (k - K0) % 16, hole = PATTERN[i], boss = Math.abs(tb - T_DROP1) < 0.01;
  let contact = tb, judge = 'PERFECT', guess = boss ? 1 : hole;
  if (k === K0) { contact = tb + 0.19; judge = 'LATE'; }
  else if (k === K0 + 1) { contact = tb + 0.08; judge = 'GOOD'; }
  else if (tb < T_LOOP2 && i === 10) { guess = 0; judge = 'MISS'; }         // first time it jumps to the middle
  else if (tb < T_LOOP2 && i === 14) { guess = 0; judge = 'MISS'; }         // first time it jumps to the right
  EVENTS.push({ t: tb, hole: boss ? 1 : hole, boss, contact, judge, guess, i });
}
const cur = (t) => { let e = null; for (const x of EVENTS) if (x.t - 0.3 <= t) e = x; return e; };

// ---- canvases ---------------------------------------------------------------------------------------------------------
const C = document.getElementById('c'), ctx = C.getContext('2d');
const GW = 200, GH = 180, SC = 5, SX = 40, SY = 448;                    // game 200×180 px → 1000×900 on screen
const G = document.createElement('canvas'); G.width = GW; G.height = GH; const g = G.getContext('2d');
const BIGC = document.createElement('canvas'); BIGC.width = GW * SC; BIGC.height = GH * SC; const bg = BIGC.getContext('2d'); bg.imageSmoothingEnabled = false;

// pixel text: render big, downsample, threshold → crisp glyphs; cached
const tcache = new Map();
function ptext(str, x, y, size, color, align = 'left', outline = '#160826', family = '"Noto Sans CJK SC"') {
  const key = [str, size, color, outline, family].join('|');
  let img = tcache.get(key);
  if (!img) {
    const S = 6, m = document.createElement('canvas').getContext('2d');
    m.font = `700 ${size * S}px ${family}`; const w = Math.ceil(m.measureText(str).width / S) + 4, h = size + 6;
    const big = document.createElement('canvas'); big.width = w * S; big.height = h * S; const bgx = big.getContext('2d');
    bgx.font = `700 ${size * S}px ${family}`; bgx.fillStyle = '#fff'; bgx.textBaseline = 'top'; bgx.fillText(str, 2 * S, 2 * S);
    const small = document.createElement('canvas'); small.width = w; small.height = h; const sx = small.getContext('2d');
    sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high'; sx.drawImage(big, 0, 0, w, h);
    const d = sx.getImageData(0, 0, w, h), mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = d.data[i * 4 + 3] > 96 ? 1 : 0;
    const out = document.createElement('canvas'); out.width = w + 2; out.height = h + 2; const ox = out.getContext('2d');
    const col = (c) => { ox.fillStyle = c; };
    if (outline) { col(outline); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (mask[yy * w + xx]) ox.fillRect(xx, yy, 3, 3); }
    col(color); for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (mask[yy * w + xx]) ox.fillRect(xx + 1, yy + 1, 1, 1);
    img = out; tcache.set(key, img);
  }
  const xx = align === 'center' ? x - img.width / 2 : align === 'right' ? x - img.width : x;
  g.drawImage(img, Math.round(xx), Math.round(y));
}
function ell(cx, cy, rx, ry, color) {                                     // crisp pixel ellipse
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); g.fillRect(Math.round(cx - w), Math.round(cy + y), 2 * w + 1, 1); }
}

// ---- static background (sky, hills, grass) ----------------------------------------------------------------------------
const BACK = document.createElement('canvas'); BACK.width = GW; BACK.height = GH;
{
  const b = BACK.getContext('2d'), r = mulberry32(5);
  const sky = ['#1b0b3a', '#2a1150', '#3d1766', '#5a1f78', '#7c2a83', '#a63a86', '#cf5a86', '#ef8a7e'];
  sky.forEach((c, i) => { b.fillStyle = c; b.fillRect(0, i * 8, GW, 8); });
  for (let i = 0; i < 40; i++) { b.fillStyle = r() < 0.3 ? '#ffe9a8' : '#ffffff'; b.fillRect(r() * GW | 0, r() * 34 | 0, 1, 1); }
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const inA = x * x + y * y <= 36, inB = (x - 3) * (x - 3) + (y + 2) * (y + 2) <= 30; if (inA && !inB) { b.fillStyle = '#ffe8b0'; b.fillRect(34 + x, 26 + y, 1, 1); } }   // pixel crescent moon
  const hill = (base, amp, col, seed) => { const rr = mulberry32(seed); b.fillStyle = col; for (let x = 0; x < GW; x++) { const h = base - Math.round(amp * (0.5 + 0.5 * Math.sin(x * 0.045 + seed))) - (rr() < 0.08 ? 1 : 0); b.fillRect(x, h, 1, GH - h); } };
  hill(66, 10, '#2b5b3f', 1); hill(74, 6, '#356f45', 4);
  b.fillStyle = '#4fae4a'; b.fillRect(0, 76, GW, GH - 76);
  for (let y = 76; y < GH; y += 2) for (let x = (y % 4); x < GW; x += 4) if (r() < 0.35) { b.fillStyle = r() < 0.5 ? '#5cc252' : '#43973f'; b.fillRect(x, y, 1, 1); }
  b.fillStyle = '#3b8a39'; for (let i = 0; i < 70; i++) { const x = r() * GW | 0, y = 80 + r() * 90 | 0; b.fillRect(x, y, 1, 2); b.fillRect(x + 1, y + 1, 1, 1); }
}
const HOLES = [{ x: 50, y: 108 }, { x: 110, y: 108 }, { x: 170, y: 108 }];
const HOLE_LBL = ['低', '中', '高'], HOLE_COL = ['#4fc3ff', '#7dff7a', '#ff6fb1'];

function drawMole(x, y, rise, boss, hit, rr) {
  // rise 0..1, clipped by the hole rim
  const s = boss ? 2.1 : 1.35, H0 = 20 * s, top = y - Math.round(H0 * rise) + 2;
  g.save(); g.beginPath(); g.rect(x - 30 * s, top - 30, 60 * s, y - top + 31); g.clip();
  const body = boss ? '#6b3d8c' : '#8a5a44', belly = boss ? '#9a6bc0' : '#c9926f';
  const sq = hit ? 0.6 : 1;
  ell(x, top + 10 * s, 10 * s, Math.round(11 * s * sq), body);
  ell(x, top + 14 * s, 6 * s, Math.round(7 * s * sq), belly);
  if (!hit) {
    g.fillStyle = '#111'; g.fillRect(x - 5 * s, top + 6 * s, 2 * s, 2 * s); g.fillRect(x + 3 * s, top + 6 * s, 2 * s, 2 * s);
    g.fillStyle = '#fff'; g.fillRect(x - 5 * s, top + 6 * s, 1, 1); g.fillRect(x + 3 * s, top + 6 * s, 1, 1);
    ell(x, top + 10 * s, 2 * s, 1 * s, '#ff8fb0');
    g.fillStyle = '#fff'; g.fillRect(x - 1, top + 12 * s, 1, 2); g.fillRect(x + 1, top + 12 * s, 1, 2);
    if (boss) { g.fillStyle = '#ffd84a'; g.fillRect(x - 8, top - 4, 16, 3); g.fillRect(x - 8, top - 8, 3, 4); g.fillRect(x - 1, top - 9, 3, 5); g.fillRect(x + 6, top - 8, 3, 4); }
  } else {
    g.fillStyle = '#111'; g.fillRect(x - 6 * s, top + 8 * s, 4 * s, 1); g.fillRect(x + 2 * s, top + 8 * s, 4 * s, 1);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#ffe04a'; const a = rr() * 6.28; g.fillRect(x + Math.round(Math.cos(a) * 12 * s), top + Math.round(Math.sin(a) * 6 * s) - 2, 2, 2); }
  }
  ell(x - 8 * s, y - 1, 3 * s, 2 * s, body); ell(x + 8 * s, y - 1, 3 * s, 2 * s, body);   // paws on the rim
  g.restore();
}
function drawHole(h, i, shake) {
  ell(h.x, h.y + 2, 23, 8, '#3d2a1c');
  ell(h.x + shake, h.y, 21, 7, '#2a1a10');
  ell(h.x + shake, h.y - 1, 17, 5, '#140b06');
}
function drawHammer(px, py, ang, big) {
  g.save(); g.translate(px, py); g.rotate(ang);
  g.fillStyle = '#a8703d'; g.fillRect(-1, -2, 3, big ? 34 : 26);
  g.fillStyle = '#e8373a'; g.fillRect(-8, (big ? 34 : 26) - 2, 17, 10);
  g.fillStyle = '#ffffff'; g.fillRect(-8, (big ? 34 : 26) + 1, 17, 2);
  g.fillStyle = '#ffb3b3'; g.fillRect(-7, (big ? 34 : 26) - 1, 4, 2);
  g.restore();
}

function game(t) {
  const rr = mulberry32(Math.floor(t * 30) + 7);
  g.drawImage(BACK, 0, 0);
  const e = cur(t);
  let shake = 0;
  const bossOn = t >= T_DROP1 - 0.05 && t < T_DROP1 + 0.9;
  // HUD
  const done = EVENTS.filter((x) => x.contact <= t);
  let score = 0, combo = 0; for (const x of done) { if (x.judge === 'MISS') combo = 0; else { combo++; score += x.judge === 'PERFECT' ? 100 : x.judge === 'GOOD' ? 60 : 30; } if (x.boss) score += 1000; }
  ptext(`SCORE ${String(score).padStart(5, '0')}`, 4, 2, 9, '#ffffff', 'left', '#160826', '"DejaVu Sans Mono"');
  ptext(`COMBO x${combo}`, GW - 4, 2, 9, combo >= 8 ? '#ffe04a' : '#ffffff', 'right', '#160826', '"DejaVu Sans Mono"');
  // holes
  const trem = t >= T_DRAG1B && t < T_DROP1 ? (Math.floor(t / 0.13295) % 2 ? 1 : -1) : 0;
  HOLES.forEach((h, i) => drawHole(h, i, i === 1 ? trem : 0));
  HOLES.forEach((h, i) => ptext(HOLE_LBL[i], h.x, h.y + 9, 11, HOLE_COL[i], 'center'));
  // intro: question marks; drag: dust on the middle hole, BOSS warning
  if (t < T_BASS) HOLES.forEach((h, i) => { if (Math.floor(t * 4 + i) % 3 !== 0) ptext('?', h.x, h.y - 26 - (Math.floor(t * 6 + i) % 2), 16, '#ffe04a', 'center'); });
  if (t >= T_DRAG1 && t < T_DROP1) {
    if (t >= T_DRAG1B) { for (let k = 0; k < 6; k++) { const a = rr() * 3.14, d = 14 + rr() * 8; g.fillStyle = '#b89a7a'; g.fillRect(HOLES[1].x + Math.cos(a) * d | 0, HOLES[1].y - Math.sin(a) * 6 - 2 | 0, 2, 2); } }
    if (Math.floor(t * 4) % 2 === 0) ptext('BOSS ?', 100, 40, 14, '#ff4d6d', 'center', '#160826', '"DejaVu Sans Mono"');
    const charge = clamp((t - T_DRAG1) / (T_DROP1 - T_DRAG1), 0, 1);
    g.fillStyle = '#160826'; g.fillRect(56, 152, 88, 7); g.fillStyle = '#ffe04a'; g.fillRect(57, 153, Math.round(86 * charge), 5);
    ptext('蓄力', 100, 158, 9, '#ffffff', 'center');
  }
  // moles
  for (const x of EVENTS) {
    const u = t - x.t;
    if (u < -0.07 || u > 0.9) continue;
    if (u > (x.boss ? 0.9 : 0.42)) continue;
    const rise = u < 0 ? ease((u + 0.07) / 0.07) : x.contact <= t ? Math.max(0, 1 - (t - x.contact) / (x.boss ? 0.75 : 0.22)) : 1;
    drawMole(HOLES[x.hole].x, HOLES[x.hole].y, rise, x.boss, x.contact <= t && x.judge !== 'MISS', rr);
    if (x.judge === 'MISS' && u > 0.05) ptext(x.i === 10 ? '咦？' : '！？', HOLES[x.hole].x, HOLES[x.hole].y - 40, 13, '#ffffff', 'center');
  }
  // judgement text
  const lastC = EVENTS.filter((x) => x.contact <= t && t - x.contact < 0.38).slice(-1)[0];
  if (lastC && !lastC.boss) {
    const col = { PERFECT: '#ffe04a', GOOD: '#ffffff', LATE: '#ff9f43', MISS: '#ff4d6d' }[lastC.judge];
    ptext(lastC.judge === 'MISS' ? 'MISS' : lastC.judge, HOLES[lastC.guess].x, HOLES[lastC.guess].y - 46 - Math.round((t - lastC.contact) * 20), 10, col, 'center', '#160826', '"DejaVu Sans Mono"');
  }
  if (bossOn && t >= T_DROP1) {
    shake = t - T_DROP1 < 0.35 ? Math.round(Math.sin(t * 90) * 3) : 0;
    const k = t - T_DROP1;
    for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28 + 0.3, d = 10 + k * (70 + (i % 5) * 18); const x = HOLES[1].x + Math.cos(a) * d, y = HOLES[1].y - 24 + Math.sin(a) * d * 0.7 + k * k * 60;
      g.fillStyle = '#ffd84a'; g.fillRect(x | 0, y | 0, 4, 4); g.fillStyle = '#fff6b0'; g.fillRect(x | 0, y | 0, 2, 2); g.fillStyle = '#c99a1c'; g.fillRect((x | 0) + 3, (y | 0) + 1, 1, 3); }
    ptext('SUPER!!', 100, 44, 20, '#ffe04a', 'center', '#7a1b6a', '"DejaVu Sans Mono"');
  }
  // Clawd + hammer: Clawd stands left of the hole it expects next and swings from its right arm
  const charging = t >= T_DRAG1 && t < T_DROP1 - 0.06;
  const evs = EVENTS.filter((x) => x.contact > t - 0.25);
  const nxt = evs[0];
  let hx = HOLES[1].x, swing = -1.9;                                      // swing: −1.9 raised … +0.35 struck
  if (t >= T_RESULT) { hx = HOLES[1].x; swing = -1.2; }
  else if (charging) { hx = HOLES[1].x; swing = -2.2 + Math.sin(t * 40) * 0.05; }
  else if (nxt) {
    const prev = EVENTS.filter((x) => x.contact <= t - 0.25).slice(-1)[0];
    const from = prev ? HOLES[prev.guess].x : HOLES[1].x, to = HOLES[nxt.guess].x;
    const hopT = nxt.t - 0.3;                                            // Clawd moves there before the mole appears
    hx = from + (to - from) * ease((t - (hopT - 0.14)) / 0.14);
    const u = t - nxt.contact;
    if (u < -0.22) swing = -1.9;
    else if (u < -0.07) swing = -1.9 - 0.4 * ease((u + 0.22) / 0.15);   // wind-up
    else if (u < 0) swing = -2.3 + 2.65 * ease((u + 0.07) / 0.07);      // strike
    else swing = 0.35 - 2.25 * ease(u / 0.25);
  }
  const cxp = Math.round(hx - 41), cyp = 104;                            // Clawd sprite top-left (scale 3 → 36×24)
  const hop = nxt && Math.abs(t - (nxt.t - 0.3)) < 0.12 ? Math.round(6 * Math.sin(Math.PI * (t - (nxt.t - 0.42)) / 0.24)) : 0;
  const pivX = cxp + 33, pivY = cyp - Math.max(0, hop) + 9;
  const big = (nxt && nxt.boss) || charging;
  const L = big ? 34 : 27;
  g.save(); g.translate(pivX, pivY); g.rotate(swing);
  g.fillStyle = '#a8703d'; g.fillRect(0, -1, L, 3);
  g.fillStyle = '#e8373a'; g.fillRect(L - 3, -8 - (big ? 3 : 0), 10 + (big ? 3 : 0), 17 + (big ? 6 : 0));
  g.fillStyle = '#ffffff'; g.fillRect(L + 1, -8 - (big ? 3 : 0), 2, 17 + (big ? 6 : 0));
  g.fillStyle = '#ffb3b3'; g.fillRect(L - 2, -7 - (big ? 3 : 0), 2, 5);
  g.restore();
  const eyes = t >= T_RESULT ? 'happy' : t >= T_LOOP2 && t < T_DRAG1 ? 'closed' : charging ? 'wide' : 'open';
  drawClawd2D(g, cxp, cyp - Math.max(0, hop), 3, { eyes, armsUp: charging ? 1 : 0 });
  // pattern bar (地鼠谱): 16 cells per loop; loop 2 shows loop 1 above it
  const loopIdx = Math.floor((t - T_BASS) / (16 * BEAT));
  if (t >= T_BASS && t < T_RESULT) {
    const rowY = 164, cw = 11, x0 = 12;
    const drawRow = (y, upto, label, dim) => {
      ptext(label, x0 - 10, y - 2, 7, '#ffffff', 'left', '#160826');
      for (let i = 0; i < 16; i++) {
        const tb = T_BASS + (loopIdx * 16 + i) * BEAT, inDrag = tb >= T_DRAG1 - 0.01 && tb < T_DROP1 - 0.01 && !dim;
        g.fillStyle = '#160826'; g.fillRect(x0 + 14 + i * cw, y, cw - 1, 7);
        if (i < upto && !inDrag) { g.fillStyle = HOLE_COL[PATTERN[i]]; g.fillRect(x0 + 15 + i * cw, y + 1, cw - 3, 5); }
        if (inDrag && i < upto) { g.fillStyle = '#5a4a6a'; g.fillRect(x0 + 15 + i * cw, y + 1, cw - 3, 5); }
        if (i % 4 === 0) { g.fillStyle = '#ffffff'; g.fillRect(x0 + 14 + i * cw, y - 1, 1, 9); }
      }
    };
    const step = clamp(Math.floor((t - T_BASS) / BEAT) - loopIdx * 16 + 1, 0, 16);
    if (loopIdx >= 1 && t < T_DRAG1) { drawRow(rowY - 10, 16, '1', true); drawRow(rowY, step, '2', false); }
    else drawRow(rowY, step, String(loopIdx + 1), false);
  }
  // result window
  if (t >= T_RESULT) {
    const k = ease((t - T_RESULT) / 0.3);
    g.fillStyle = 'rgba(14,4,30,0.86)'; g.fillRect(18, 26, 164, Math.round(120 * k));
    g.fillStyle = '#ffe04a'; g.fillRect(18, 26, 164, 2); g.fillRect(18, 26 + Math.round(120 * k) - 2, 164, 2);
    if (k > 0.9) {
      ptext('CLEAR!', 100, 32, 16, '#ffe04a', 'center', '#7a1b6a', '"DejaVu Sans Mono"');
      ptext('拍子稳 → 猜得到时间', 100, 58, 13, '#ffffff', 'center');
      ptext('谱反复 → 猜得到位置', 100, 80, 13, '#ffffff', 'center');
      ptext('拖一下 → 等得更带劲', 100, 102, 13, '#ffe04a', 'center');
    }
  }
  return shake;
}

// ---- cabinet + CRT --------------------------------------------------------------------------------------------------
function cabinet(t) {
  const grd = ctx.createLinearGradient(0, 0, 0, 1920); grd.addColorStop(0, '#1a0733'); grd.addColorStop(0.5, '#260b45'); grd.addColorStop(1, '#14052a');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 1080, 1920);
  for (const [x, c] of [[14, '#ff3fb4'], [1058, '#38e1ff']]) { ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 24; ctx.fillRect(x, 0, 8, 1920); }
  ctx.shadowBlur = 0;
  // marquee
  ctx.fillStyle = '#0d0420'; ctx.fillRect(40, 18, 1000, 118); ctx.strokeStyle = '#ff3fb4'; ctx.lineWidth = 4; ctx.shadowColor = '#ff3fb4'; ctx.shadowBlur = 18; ctx.strokeRect(40, 18, 1000, 118); ctx.shadowBlur = 0;
  // subtitle panel
  ctx.fillStyle = '#0d0420'; roundRect(40, 150, 1000, 280, 22); ctx.fill();
  ctx.strokeStyle = '#7d3bd1'; ctx.lineWidth = 4; roundRect(40, 150, 1000, 280, 22); ctx.stroke();
  // control panel
  const cp = ctx.createLinearGradient(0, 1430, 0, 1920); cp.addColorStop(0, '#3b1366'); cp.addColorStop(1, '#1b0733');
  ctx.fillStyle = cp; ctx.fillRect(30, 1440, 1020, 480);
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(220, 1640, 70, 30, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(220, 1560, 44, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.arc(206, 1546, 14, 0, 7); ctx.fill();
  ctx.fillStyle = '#222'; ctx.fillRect(212, 1580, 16, 60);
  ['#4fc3ff', '#7dff7a', '#ff6fb1'].forEach((c, i) => {
    const x = 520 + i * 170, y = 1600, pressed = (() => { const e = cur(t); return e && e.guess === i && Math.abs(t - e.contact) < 0.1; })();
    ctx.fillStyle = '#0a0414'; ctx.beginPath(); ctx.ellipse(x, y + 14, 66, 34, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = pressed ? 40 : 14; ctx.beginPath(); ctx.ellipse(x, y + (pressed ? 8 : 0), 58, 30, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#cbb6ff'; ctx.font = '700 40px "Noto Sans CJK SC"'; ctx.textAlign = 'center'; ctx.fillText(HOLE_LBL[i], x, y + 76 + 40);
  });
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function crt(t, shake) {
  bg.clearRect(0, 0, BIGC.width, BIGC.height);
  bg.drawImage(G, 0, 0, GW * SC, GH * SC);
  const X = SX + shake * SC, Y = SY;
  ctx.save(); roundRect(SX, SY, GW * SC, GH * SC, 34); ctx.clip();
  ctx.drawImage(BIGC, X, Y);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28; ctx.filter = 'blur(9px)'; ctx.drawImage(BIGC, X, Y); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = SY; y < SY + GH * SC; y += SC) ctx.fillRect(SX, y + SC - 2, GW * SC, 2);
  const vg = ctx.createRadialGradient(540, SY + 450, 300, 540, SY + 450, 720); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = vg; ctx.fillRect(SX, SY, GW * SC, GH * SC);
  const gl = ctx.createLinearGradient(SX, SY, SX + 600, SY + 500); gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(0.5, 'rgba(255,255,255,0.0)'); ctx.fillStyle = gl; ctx.fillRect(SX, SY, GW * SC, GH * SC);
  ctx.restore();
  ctx.strokeStyle = '#05020b'; ctx.lineWidth = 16; roundRect(SX - 8, SY - 8, GW * SC + 16, GH * SC + 16, 40); ctx.stroke();
  ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 3; ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 14; roundRect(SX - 17, SY - 17, GW * SC + 34, GH * SC + 34, 46); ctx.stroke(); ctx.shadowBlur = 0;
}
const cues = (await loadCues('./cues.json')).cues;
const subs = makeSubs(document.getElementById('stage'), cues);

film.render = async (t) => {
  cabinet(t);
  const shake = game(t);
  crt(t, shake);
  drawTitle();
  subs(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
// marquee title (drawn once into an offscreen canvas through the same pixel-text pipeline)
let TITLE = null;
function drawTitle() {
  if (!TITLE) {
    const keep = g.getImageData(0, 0, GW, GH);
    g.clearRect(0, 0, GW, GH);
    ptext('开智打地鼠', 100, 2, 22, '#ffe04a', 'center', '#7a1b6a');
    const T = document.createElement('canvas'); T.width = GW; T.height = 30; T.getContext('2d').drawImage(G, 0, 0, GW, 30, 0, 0, GW, 30);
    g.putImageData(keep, 0, 0);
    TITLE = T;
  }
  ctx.imageSmoothingEnabled = false; ctx.shadowColor = '#ff3fb4'; ctx.shadowBlur = 20;
  ctx.drawImage(TITLE, 540 - GW * 1.9, 20, GW * 3.8, 30 * 3.8); ctx.shadowBlur = 0; ctx.imageSmoothingEnabled = true;
}
film.ready = true;
