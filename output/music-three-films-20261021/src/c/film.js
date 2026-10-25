// C · 一听就想点头？秘密在低音里 — frame-by-frame Canvas 2D motion graphics (Opus 5.5).
// Lineage: the user's first AI-history film — every frame is a pure function of time t, drawn on one canvas:
// particles that assemble into shapes, glow sprites, rolling digits, scrambled chapter labels, a timeline with
// "eras", flashes on musical hits, a CRT-style collapse. Here the protagonist is the bass of the original BGM:
// the glowing floor IS the measured sub-bass (src/music-map.json), and every cut lands on a measured bar line.
// Film time = source time (0–28.582 s, the last bar decays).
const film = window.film = { ready: false, duration: 28.6 };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
const MAP = await (await fetch('../music-map.json')).json();
const DOC = await (await fetch('./cues.json')).json();
const CUES = DOC.cues, CHAPTERS = DOC.chapters;

const W = 1080, H = 1920, TAU = Math.PI * 2;
const T = { BASS: 3.056, CAM: 5.184, HOVE1: 7.311, HOVE2: 9.438, LOOP: 11.565, CLOSE: 13.692, DRAG: 15.819, DRAGB: 17.946, DROP: 20.073, RECAP: 24.328, LAST: 26.455, END: 28.6 };
const BEAT = MAP.tempo.beat_s, BEATS = MAP.beats;

// ------------------------------------------------------------------ math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (u) => u * u * (3 - 2 * u);
const sm = (a, b, x) => smooth(prog(a, b, x));
const E = {
  in2: (u) => u * u, out2: (u) => 1 - (1 - u) * (1 - u), in3: (u) => u * u * u, out3: (u) => 1 - Math.pow(1 - u, 3),
  io3: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2), out5: (u) => 1 - Math.pow(1 - u, 5),
  outBack: (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
};
function hash(i, seed = 0) { let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i; return lerp(hash(i, seed), hash(i + 1, seed), smooth(f)) * 2 - 1; }
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
const mixc = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
const WHITE = [255, 255, 255], ORANGE = [217, 119, 87], GOLD = [255, 190, 110], CYAN = [120, 220, 255];

// ------------------------------------------------------------------ measured music
const SUB = MAP.sub_db_50ms, HOP = 0.05;
const SUBS = SUB.map((_, i) => { let s = 0, n = 0; for (let j = i - 2; j <= i + 2; j++) if (j >= 0 && j < SUB.length) { s += SUB[j]; n++; } return s / n; });
const subDb = (t) => { const f = clamp(t / HOP, 0, SUBS.length - 1), i = Math.floor(f), k = f - i; return lerp(SUBS[i], SUBS[Math.min(SUBS.length - 1, i + 1)], k); };
const level = (t) => clamp((subDb(t) + 19) / 14);                       // 0 = very thin, ~0.9 = full groove
const SPEC = MAP.spectrogram.frames;
const HI = SPEC.map((f) => f.slice(36, 48).reduce((a, b) => a + b, 0) / 12);
const hiAt = (t) => { const f = clamp(t / HOP, 0, HI.length - 1), i = Math.floor(f); return lerp(HI[i], HI[Math.min(HI.length - 1, i + 1)], f - i); };
function lastBeat(t) { let b = -10; for (const x of BEATS) { if (x <= t + 1e-6) b = x; else break; } return b; }
const pulse = (t, tau = 0.11) => { const b = lastBeat(t); return b < 0 ? 0 : Math.exp(-(t - b) / tau); };
const beatIndex = (t) => { let n = -1; for (const x of BEATS) { if (x <= t + 1e-6) n++; else break; } return n; };
const inDrag = (t) => t >= T.DRAG && t < T.DROP;
const fade = (t) => (t < T.LAST ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * clamp((t - T.LAST) / (28.582 - T.LAST))));   // matches the audio fade

// ------------------------------------------------------------------ canvas + layers
const canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const FRAME = mk(W, H), fctx = FRAME.getContext('2d');
const BA = mk(W / 4, H / 4), bA = BA.getContext('2d'), BB = mk(W / 4, H / 4), bB = BB.getContext('2d'), BC = mk(W / 8, H / 8), bC = BC.getContext('2d');
const SANS = '"Noto Sans CJK SC", sans-serif', MONO = '"Noto Sans Mono CJK SC", "Noto Sans CJK SC", monospace';
const font = (w, s, f = SANS) => `${w} ${s}px ${f}`;
function reset(c) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; c.letterSpacing = '0px'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.setLineDash([]); c.lineWidth = 1; }

const _spr = new Map();
function glowSprite(col, hot = true) {
  const q = col.map((v) => (v >> 3) << 3), key = q.join(',') + (hot ? 'h' : 's');
  let s = _spr.get(key);
  if (!s) {
    s = mk(64, 64); const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (hot) { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, rgba(mixc(q, WHITE, 0.5), 0.95)); gr.addColorStop(0.32, rgba(q, 0.42)); gr.addColorStop(0.62, rgba(q, 0.1)); }
    else { gr.addColorStop(0, rgba(q, 1)); gr.addColorStop(0.45, rgba(q, 0.5)); gr.addColorStop(0.75, rgba(q, 0.14)); }
    gr.addColorStop(1, rgba(q, 0)); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _spr.set(key, s);
  }
  return s;
}
function glow(c, x, y, r, col, a = 1, hot = true) { if (a <= 0.003 || r <= 0) return; const ga = c.globalAlpha; c.globalAlpha = ga * Math.min(1, a); c.drawImage(glowSprite(col, hot), x - r, y - r, r * 2, r * 2); c.globalAlpha = ga; }

// ------------------------------------------------------------------ palette per chapter
const PAL = [
  { t: 0, bg: [5, 5, 14], ga: [50, 60, 150], gb: [110, 50, 130], acc: [255, 178, 120] },
  { t: T.BASS, bg: [12, 6, 4], ga: [255, 110, 50], gb: [150, 50, 40], acc: [255, 186, 120] },
  { t: T.CAM, bg: [9, 4, 16], ga: [255, 60, 140], gb: [70, 50, 190], acc: [255, 150, 190] },
  { t: T.HOVE1, bg: [3, 8, 15], ga: [40, 150, 230], gb: [255, 120, 60], acc: [140, 220, 255] },
  { t: T.LOOP, bg: [3, 10, 10], ga: [50, 210, 170], gb: [40, 90, 170], acc: [130, 240, 205] },
  { t: T.DRAG, bg: [5, 8, 15], ga: [110, 150, 220], gb: [170, 190, 235], acc: [185, 212, 255] },
  { t: T.DROP, bg: [14, 6, 3], ga: [255, 140, 50], gb: [255, 70, 50], acc: [255, 205, 120] },
  { t: T.RECAP, bg: [7, 5, 11], ga: [255, 140, 80], gb: [120, 90, 210], acc: [255, 200, 140] },
];
function paletteAt(t) {
  let { bg, ga, gb, acc } = PAL[0];
  for (let i = 1; i < PAL.length; i++) {
    const w = sm(PAL[i].t - 0.18, PAL[i].t + 0.3, t); if (w <= 0) break;
    bg = mixc(bg, PAL[i].bg, w); ga = mixc(ga, PAL[i].ga, w); gb = mixc(gb, PAL[i].gb, w); acc = mixc(acc, PAL[i].acc, w);
  }
  return { bg, ga, gb, acc };
}
function drawBackground(c, t, P) {
  c.fillStyle = rgba(P.bg); c.fillRect(0, 0, W, H);
  const k = 0.9 + 0.35 * pulse(t, 0.2) * level(t);
  let x = 540 + 260 * Math.sin(t * 0.17), y = 760 + 220 * Math.cos(t * 0.13);
  let g = c.createRadialGradient(x, y, 0, x, y, 1100); g.addColorStop(0, rgba(P.ga, 0.2 * k)); g.addColorStop(0.5, rgba(P.ga, 0.06 * k)); g.addColorStop(1, rgba(P.ga, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  x = 300 + 200 * Math.cos(t * 0.11); y = 1500 + 160 * Math.sin(t * 0.19);
  g = c.createRadialGradient(x, y, 0, x, y, 1000); g.addColorStop(0, rgba(P.gb, 0.15 * k)); g.addColorStop(1, rgba(P.gb, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ "sound dust": drifting constellation, kicks on beats
const DUST = Array.from({ length: 230 }, (_, i) => ({ x: hash(i, 1) * (W + 200) - 100, y: hash(i, 2) * (H + 200) - 100, z: 0.3 + 0.7 * hash(i, 3), vx: (hash(i, 4) - 0.5) * 18, vy: (hash(i, 5) - 0.5) * 12, ph: hash(i, 6) * TAU }));
function drawDust(c, t, P, amt) {
  if (amt <= 0) return;
  const kick = 1 + 1.4 * pulse(t, 0.14) * level(t), snow = sm(T.DRAG, T.DRAG + 0.5, t) * (1 - sm(T.DROP - 0.1, T.DROP + 0.2, t));
  const col = mixc(P.acc, WHITE, 0.35 + 0.5 * snow), pts = [];
  const fall = t > T.DRAG ? (Math.min(t, T.DROP) - T.DRAG) * 160 : 0;
  for (const [i, d] of DUST.entries()) {
    let x = d.x + d.vx * t * d.z + 30 * vnoise(t * 0.08 + i * 3.1, 11) + Math.sin(t * 1.2 + d.ph) * 14 * snow;
    let y = d.y + d.vy * t * d.z + 24 * vnoise(t * 0.07 + i * 1.7, 23) + fall * (0.4 + d.z);
    x = ((((x + 100) % (W + 200)) + (W + 200)) % (W + 200)) - 100; y = ((((y + 100) % (H + 200)) + (H + 200)) % (H + 200)) - 100;
    pts.push([x, y, d.z, 0.65 + 0.35 * Math.sin(t * (1 + d.z * 2) + d.ph)]);
  }
  c.lineWidth = 1; c.strokeStyle = rgba(col, 0.07 * amt * kick); c.beginPath();
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
    if (dx * dx + dy * dy < 140 * 140) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); }
  }
  c.stroke();
  c.globalCompositeOperation = 'lighter';
  for (const p of pts) glow(c, p[0], p[1], (4 + p[2] * 7) * (1 + snow * 0.6), col, p[3] * (0.25 + 0.45 * p[2]) * amt * Math.min(1.8, kick));
  c.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------ Clawd (official 12×8 pixel silhouette, brand orange base)
const BITMAP = ['..########..', '..#E####E#..', '############', '############', '..########..', '..########..', '..#.#..#.#..', '..#.#..#.#..'];
const CELLS = [];
BITMAP.forEach((row, r) => [...row].forEach((ch, col) => { if (ch === '#') CELLS.push([col, r, r >= 6 ? 'leg' : (r === 2 || r === 3) && (col < 2 || col > 9) ? 'arm' : 'body']); }));
function drawClawd(c, cx, feetY, u, o = {}) {
  const sq = o.sq || 0, hop = o.hop || 0, eyes = o.eyes || 'open', arms = o.arms || 0, legs = o.legs || 0, a = o.alpha ?? 1;
  if (a <= 0.003) return;
  c.save(); c.globalAlpha *= a;
  c.translate(cx, feetY - hop); if (o.tilt) c.rotate(o.tilt);
  c.scale(1 + sq * 0.55, 1 - sq);
  const x0 = -6 * u, y0 = -8 * u;
  if (o.glow !== 0) { c.globalCompositeOperation = 'lighter'; glow(c, 0, -4 * u, 9 * u, [255, 120, 70], 0.2 * (o.glow ?? 1), false); c.globalCompositeOperation = 'source-over'; }
  const body = c.createLinearGradient(0, y0, 0, y0 + 8 * u);
  body.addColorStop(0, '#ec8d6b'); body.addColorStop(0.35, '#d97757'); body.addColorStop(1, '#bd5f42');
  c.fillStyle = body;
  for (const [col, r, part] of CELLS) {
    let yy = y0 + r * u, hh = u;
    if (part === 'arm') yy -= arms * u;
    if (part === 'leg') { const i = [2, 4, 7, 9].indexOf(col); const lift = legs && ((i % 2 === 0) === legs > 0) ? Math.abs(legs) * u * 0.9 : 0; if (r === 7) hh = u - lift; }
    c.fillRect(x0 + col * u - 0.4, yy - 0.4, u + 0.8, hh + 0.8);
  }
  c.fillStyle = 'rgba(255,230,210,.22)'; c.fillRect(x0 + 2 * u, y0, 8 * u, u * 0.18);           // top edge highlight
  c.fillStyle = '#141414';
  for (const col of [3, 8]) {
    const ex = x0 + col * u, ey = y0 + u;
    if (eyes === 'open') c.fillRect(ex, ey, u, u);
    else if (eyes === 'wide') c.fillRect(ex - u * 0.15, ey - u * 0.15, u * 1.3, u * 1.3);
    else if (eyes === 'closed') c.fillRect(ex - u * 0.1, ey + u * 0.4, u * 1.2, u * 0.28);
    else if (eyes === 'happy') { c.fillRect(ex - u * 0.1, ey + u * 0.3, u * 0.4, u * 0.28); c.fillRect(ex + u * 0.3, ey, u * 0.4, u * 0.28); c.fillRect(ex + u * 0.7, ey + u * 0.3, u * 0.4, u * 0.28); }
  }
  c.restore();
}
// Clawd's motion: nods on the measured beat once the bass is in; waits crouched in the drag; leaps at the drop
const cuAt = (t) => lerp(38, 28, sm(4.6, 5.2, t));
function clawdX(t) { return lerp(540, 830, sm(7.0, 7.4, t)) + (540 - 830) * sm(11.2, 11.62, t) * (t > 11 ? 1 : 0); }
function clawdPose(t) {
  const o = { sq: 0, hop: 0, eyes: 'open', arms: 0, legs: 0, tilt: 0 };
  const b = lastBeat(t), u = t - b, lv = level(t);
  if (t < T.BASS) { o.sq = 0.03 + 0.03 * Math.sin(t * 3); o.tilt = -0.04 * Math.sin(t * 1.3); if (t > 2.5) o.sq = 0.03 + 0.12 * sm(2.5, 3.0, t); }
  else if (inDrag(t)) {
    o.eyes = 'wide'; o.sq = 0.12 + 0.1 * sm(T.DRAGB - 0.2, T.DRAGB + 0.8, t) + 0.08 * sm(19.6, 19.95, t);
    if (t >= T.DRAGB) o.hop = 1.5 * Math.abs(Math.sin(Math.PI * (t - T.DRAGB) / (BEAT / 4)));
    if (t > 19.95) { const k = (t - 19.95) / 0.12; o.sq = lerp(0.3, -0.12, clamp(k)); }
  } else if (t >= T.DROP - 0.12 && t < T.DROP + 1.0) {
    const k = clamp((t - (T.DROP - 0.12)) / 1.0);
    o.hop = 290 * 4 * k * (1 - k); o.arms = 2 * Math.sin(Math.PI * Math.min(1, k * 1.5)); o.eyes = k > 0.15 && k < 0.85 ? 'happy' : 'wide'; o.sq = -0.08;
    o.tilt = 0.25 * Math.sin(k * TAU);
  } else {
    const amp = clamp(lv * 1.15) * fade(t);
    const nod = Math.exp(-u / 0.09) * amp;                          // a nod on every beat, strength = measured bass
    o.sq = 0.11 * nod; o.hop = 10 * Math.sin(Math.PI * clamp(u / BEAT)) * amp;
    o.legs = (beatIndex(t) % 2 ? 1 : -1) * 0.6 * Math.exp(-u / 0.15) * amp;
    if (t >= T.CLOSE && t < T.DRAG) o.eyes = Math.sin(t * 9) > 0.96 ? 'closed' : 'open';
    if (t >= T.RECAP) { o.eyes = t > 26.9 ? 'happy' : 'open'; o.arms = t > 26.9 ? 1 + 0.6 * Math.sin(t * 6) : 0; }
  }
  return o;
}

// ------------------------------------------------------------------ the bass floor (measured sub-bass made visible)
const FLOOR_Y = 1170;
function floorY(x, t, amp) {
  return FLOOR_Y + 30 - amp * (0.62 + 0.26 * Math.sin(x * 0.0062 + t * 1.7) + 0.12 * Math.sin(x * 0.017 - t * 2.3)) * Math.exp(-Math.pow((x - 540) / 720, 2));
}
function floorAmp(t) { const lv = level(t); return (10 + 120 * lv * lv + 90 * pulse(t, 0.12) * lv * lv) * (t >= T.DROP && t < T.DROP + 0.6 ? 1 + 0.9 * Math.exp(-(t - T.DROP) / 0.25) : 1); }
function drawFloor(c, t, P, vis = 1) {
  if (vis <= 0) return;
  const amp = floorAmp(t), lv = level(t), warm = mixc([255, 120, 50], [255, 200, 120], 0.3 * pulse(t));
  c.save(); c.globalAlpha *= vis; c.globalCompositeOperation = 'lighter';
  for (let layer = 2; layer >= 0; layer--) {
    const a = amp * (1 - layer * 0.22), dy = layer * 26;
    const g = c.createLinearGradient(0, FLOOR_Y - amp - 40, 0, FLOOR_Y + 190);
    g.addColorStop(0, rgba(warm, 0.0)); g.addColorStop(0.35, rgba(warm, (0.1 + 0.32 * lv) * (1 - layer * 0.25)));
    g.addColorStop(1, rgba([120, 30, 20], 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(-20, FLOOR_Y + 200);
    for (let x = -20; x <= W + 20; x += 18) c.lineTo(x, floorY(x + layer * 90, t + layer * 0.31, a) + dy);
    c.lineTo(W + 20, FLOOR_Y + 200); c.closePath(); c.fill();
  }
  c.lineWidth = 3; c.strokeStyle = rgba(mixc(warm, WHITE, 0.4), 0.35 + 0.55 * lv);
  c.shadowColor = rgba(warm, 0.9); c.shadowBlur = 24;
  c.beginPath(); for (let x = -20; x <= W + 20; x += 12) { const y = floorY(x, t, amp); x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  c.shadowBlur = 0;
  // sparks thrown up by each beat (strength = measured bass of that beat)
  for (let k = 0; k < BEATS.length; k++) {
    const age = t - BEATS[k]; if (age < 0) break; if (age > 0.9) continue;
    const lb = level(BEATS[k] + 0.06); if (lb < 0.35) continue;
    for (let j = 0; j < 22; j++) {
      const x0 = 540 + (hash(k * 97 + j, 7) - 0.5) * 980, vy = (360 + 520 * hash(k * 31 + j, 8)) * lb, vx = (hash(j + k * 13, 9) - 0.5) * 160;
      const x = x0 + vx * age, y = floorY(x0, BEATS[k], floorAmp(BEATS[k] + 0.03)) - vy * age + 0.5 * 1500 * age * age;
      glow(c, x, y, 6 + 6 * hash(j, k), mixc(GOLD, WHITE, hash(j, 3) * 0.5), (1 - age / 0.9) * 0.85 * lb);
    }
  }
  c.restore();
}

// ------------------------------------------------------------------ particles that assemble into Clawd (the opening)
const ASM = [];
CELLS.forEach(([col, r], i) => { for (let s = 0; s < 4; s++) { const k = i * 4 + s, a = hash(k, 31) * TAU, rad = 260 + 480 * hash(k, 32);
  ASM.push({ col: col + (s % 2) * 0.5 + 0.25, row: r + Math.floor(s / 2) * 0.5 + 0.25, sx: 540 + Math.cos(a) * rad, sy: 900 + Math.sin(a) * rad * 0.9, del: 0.0 + 0.3 * hash(k, 33), dur: 0.5 + 0.25 * hash(k, 34), sw: hash(k, 35) - 0.5 }); } });
function drawAssembly(c, t, cx, feetY) {
  if (t > 1.6) return 1;
  let done = 1; c.save(); c.globalCompositeOperation = 'lighter';
  for (const p of ASM) {
    const m = E.io3(prog(p.del, p.del + p.dur, t)); done = Math.min(done, m);
    const tx = cx + (p.col - 6) * cuAt(t), ty = feetY - 8 * cuAt(t) + p.row * cuAt(t);
    let x = lerp(p.sx, tx, m), y = lerp(p.sy, ty, m); const sw = Math.sin(m * Math.PI) * 160 * p.sw; x += sw; y -= sw * 0.5;
    glow(c, x, y, 9 + 10 * (1 - m), m > 0.6 ? [255, 160, 110] : [255, 120, 90], (0.55 + 0.45 * m) * (1 - sm(1.0, 1.4, t)));
  }
  c.restore();
  return sm(0.72, 1.05, t);
}

// ------------------------------------------------------------------ chapter scenes
function sceneStage(c, t, P, vis, opts = {}) {
  if (vis <= 0) return;
  c.save(); c.globalAlpha = vis;
  drawFloor(c, t, P, 1);
  const cx = opts.x ?? clawdX(t), amp = floorAmp(t), feet = floorY(cx, t, amp) - 2;
  const show = t < 1.6 ? drawAssembly(c, t, cx, feet) : 1;
  drawClawd(c, cx, feet, cuAt(t), { ...clawdPose(t), alpha: show });
  c.restore();
}
// level meter beside the floor in the opening: the measured bass, live
function drawMeter(c, t, P, vis) {
  if (vis <= 0) return;
  const lv = level(t), x = 96, y = 1040, h = 210;
  c.save(); c.globalAlpha = vis;
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.roundRect(x - 16, y - 54, 150, h + 92, 14); c.fill();
  c.font = font(700, 26); c.fillStyle = rgba(P.acc); c.fillText('低音', x, y - 18);
  c.font = font(400, 19); c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('实测', x + 64, y - 18);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, y, 38, h);
  const g = c.createLinearGradient(0, y + h, 0, y); g.addColorStop(0, '#b8452a'); g.addColorStop(1, '#ffc27a');
  c.fillStyle = g; c.fillRect(x, y + h * (1 - lv), 38, h * lv);
  c.font = font(700, 22, MONO); c.fillStyle = '#fff'; c.fillText(`${subDb(t).toFixed(0)}`, x + 48, y + h * (1 - lv) + 8);
  c.font = font(400, 18); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText('dB', x + 48, y + h * (1 - lv) + 30);
  c.restore();
}

// ② Cameron 2022: a live crowd; an inaudible very-low-frequency switch; +12 % movement
const CROWD = [];
for (let r = 0; r < 13; r++) { const n = 18 + r * 3, y = 600 + r * r * 3.4 + r * 18, s = 0.45 + r * 0.075;
  for (let i = 0; i < n; i++) CROWD.push({ x: 540 + (i - (n - 1) / 2) * (W * 1.1 / n) + (hash(r * 61 + i, 4) - 0.5) * 24, y, s, ph: hash(r * 77 + i, 5) * TAU, hue: hash(r * 13 + i, 6), r }); }
function sceneCrowd(c, t, P, vis) {
  if (vis <= 0) return;
  const lt = t - T.CAM, on = sm(0.55, 0.75, lt), amp = 1 + 0.12 * on;
  c.save(); c.globalAlpha = vis;
  // stage light beams
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const bx = 540 + (i - 2) * 230, sw = 0.35 * Math.sin(t * 1.1 + i * 1.7), g = c.createLinearGradient(bx, 420, bx + Math.sin(sw) * 600, 1300);
    const col = i % 2 ? [255, 80, 170] : [90, 120, 255];
    g.addColorStop(0, rgba(col, 0.28)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(bx - 10, 420); c.lineTo(bx + Math.sin(sw) * 600 - 130, 1300); c.lineTo(bx + Math.sin(sw) * 600 + 130, 1300); c.lineTo(bx + 10, 420); c.fill();
  }
  // the inaudible low end, glowing up from below once it is switched on
  const g2 = c.createLinearGradient(0, 1300, 0, 760); g2.addColorStop(0, rgba([255, 60, 40], 0.55 * on)); g2.addColorStop(1, rgba([255, 60, 40], 0));
  c.fillStyle = g2; c.fillRect(0, 760, W, 560);
  c.globalCompositeOperation = 'source-over';
  const b = lastBeat(t), u = t - b;
  for (const p of CROWD) {
    const bob = (8 + 6 * hash(p.ph * 100, 2)) * p.s * amp * (0.35 + 0.65 * Math.exp(-u / 0.16)) * (0.8 + 0.2 * Math.sin(t * 7 + p.ph));
    const y = p.y - bob, rim = p.hue > 0.5 ? [255, 90, 170] : [110, 140, 255];
    c.fillStyle = rgba(mixc(rim, WHITE, 0.2), 0.85);
    c.beginPath(); c.arc(p.x, y - 30 * p.s - 2, 11 * p.s + 1.5, 0, TAU); c.fill();
    c.beginPath(); c.roundRect(p.x - 16 * p.s, y - 20 * p.s, 32 * p.s, 42 * p.s, 9 * p.s); c.fill();
    c.fillStyle = rgba(mixc([16, 8, 24], rim, 0.08 + p.r * 0.012), 1);
    c.beginPath(); c.arc(p.x, y - 30 * p.s + 1.5, 11 * p.s, 0, TAU); c.fill();
    c.beginPath(); c.roundRect(p.x - 15 * p.s, y - 17 * p.s, 30 * p.s, 40 * p.s, 9 * p.s); c.fill();
  }
  drawClawd(c, 540, 1312 - 10 * amp * Math.exp(-u / 0.16), 7, { sq: 0.12 * Math.exp(-u / 0.1), glow: 0.8 });
  // the switch and the +11.8 % (Cameron 2022: head movement, VLF on vs off)
  const sx = 230, sy = 480;
  c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.roundRect(sx - 34, sy - 52, 660, 104, 52); c.fill();
  c.font = font(700, 40); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText('听不见的超低频', sx, sy);
  const kx = sx + 320, kon = E.outBack(on);
  c.fillStyle = on > 0.5 ? '#ff5a3c' : 'rgba(255,255,255,.25)'; c.beginPath(); c.roundRect(kx, sy - 26, 110, 52, 26); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(kx + 26 + 58 * kon, sy, 21, 0, TAU); c.fill();
  c.font = font(700, 30, MONO); c.fillStyle = on > 0.5 ? '#ffb39c' : 'rgba(255,255,255,.6)'; c.fillText(on > 0.5 ? 'ON' : 'OFF', kx + 128, sy);
  c.textBaseline = 'alphabetic';
  const n = E.out3(prog(0.9, 1.6, lt)) * 11.8, na = sm(0.8, 0.95, lt);
  if (na > 0) {
    c.globalAlpha = vis * na;
    c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.roundRect(250, 820, 580, 250, 30); c.fill();
    c.font = font(700, 170, MONO); c.textAlign = 'center'; c.fillStyle = '#ffd2a8';
    c.shadowColor = 'rgba(255,90,60,.9)'; c.shadowBlur = 40; c.fillText(`+${n.toFixed(1)}%`, 540, 995); c.shadowBlur = 0;
    c.font = font(700, 34); c.fillStyle = '#fff'; c.fillText('观众头部运动量平均多了 11.8%', 540, 1050);
    c.textAlign = 'left';
  }
  c.restore();
}

// ③ Hove 2014: two streams (high / low); an early note in each; the low one gets the bigger reaction; taps follow the low one
const LANE = { now: 280, hiY: 640, loY: 860, tapY: 1040, speed: 390 };
function sceneLanes(c, t, P, vis) {
  if (vis <= 0) return;
  c.save(); c.globalAlpha = vis;
  const tapMode = t >= T.HOVE2;
  // lane rails
  c.lineWidth = 2;
  for (const [y, lab, col] of [[LANE.hiY, '高音', CYAN], [LANE.loY, '低音', [255, 150, 90]], ...(tapMode ? [[LANE.tapY, 'Clawd 打拍子', [255, 255, 255]]] : [])]) {
    c.strokeStyle = rgba(col, 0.25); c.beginPath(); c.moveTo(150, y); c.lineTo(1000, y); c.stroke();
    c.font = font(700, 32); c.fillStyle = rgba(col, 0.9); c.fillText(lab, 150, y - 54);
  }
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 3; c.beginPath(); c.moveTo(LANE.now, 572); c.lineTo(LANE.now, tapMode ? 1090 : 920); c.stroke();
  c.font = font(700, 28); c.fillStyle = 'rgba(255,255,255,.85)'; c.textAlign = 'center'; c.fillText('此刻', LANE.now, 560); c.textAlign = 'left';
  // notes: one per beat; two are early (schematic: the offset is drawn bigger than 50 ms)
  const EARLY = { hi: [7.842], lo: [8.906, 9.97] }, OFF = 0.13;
  const early = (b, arr) => arr.some((x) => Math.abs(x - b) < 0.01);
  c.globalCompositeOperation = 'lighter';
  for (const b of BEATS) {
    if (b < 6.6 || b > 12.2) continue;
    for (const lane of ['hi', 'lo']) {
      const e = early(b, EARLY[lane]) ? OFF : 0, x = LANE.now + (b - e - t) * LANE.speed;
      if (x < 120 || x > 1060) continue;
      const y = lane === 'hi' ? LANE.hiY : LANE.loY, r = lane === 'hi' ? 16 : 38, col = lane === 'hi' ? CYAN : [255, 140, 80];
      const passed = x < LANE.now;
      glow(c, x, y, r * 2.6, col, passed ? 0.35 : 0.95);
      if (e) { c.globalCompositeOperation = 'source-over'; c.strokeStyle = rgba(col, 0.6); c.setLineDash([6, 8]); c.lineWidth = 2; c.beginPath(); c.arc(x + OFF * LANE.speed, y, r * 1.1, 0, TAU); c.stroke(); c.setLineDash([]); c.globalCompositeOperation = 'lighter'; }
    }
  }
  c.globalCompositeOperation = 'source-over';
  // reactions when an early note reaches "now"
  for (const [lane, list] of Object.entries(EARLY)) for (const b of list) {
    const a = t - (b - OFF); if (a < 0 || a > 1.0) continue;
    const big = lane === 'lo', y = big ? LANE.loY : LANE.hiY, R = (big ? 60 : 30) + a * (big ? 200 : 90), al = (1 - a) * (big ? 1 : 0.7);
    c.strokeStyle = rgba(big ? [255, 110, 70] : CYAN, al); c.lineWidth = big ? 8 : 3; c.beginPath(); c.arc(LANE.now, y, R, 0, TAU); c.stroke();
    c.font = font(700, big ? 96 : 54); c.fillStyle = rgba(big ? [255, 190, 140] : CYAN, Math.min(1, al * 1.6)); c.textAlign = 'center';
    c.fillText(big ? '！' : '？', LANE.now + (big ? 120 : 80), y - (big ? 40 : 20));
    if (big && !tapMode) { c.font = font(700, 32); c.fillStyle = rgba([255, 220, 190], Math.min(1, al * 2)); c.fillText('大脑反应更大', LANE.now + 190, y + 100); }
    if (!big) { c.font = font(400, 28); c.fillStyle = rgba(CYAN, Math.min(1, al * 2)); c.fillText('反应较小', LANE.now + 230, y + 60); }
    c.textAlign = 'left';
  }
  // taps (9.4 s on): Clawd taps on the beat; after an early LOW note its next tap comes early too (follows the bass)
  if (tapMode) {
    for (const b of BEATS) {
      if (b < 8.9 || b > 12.2) continue;
      const follow = Math.abs(b - 9.97) < 0.01 ? OFF * 0.75 : 0, x = LANE.now + (b - follow - t) * LANE.speed;
      if (x < 120 || x > 1060) continue;
      c.fillStyle = rgba(WHITE, x < LANE.now ? 0.45 : 0.95); c.fillRect(x - 5, LANE.tapY - 26, 10, 52);
      if (follow) { c.strokeStyle = 'rgba(255,200,150,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 4, LANE.loY + 38); c.lineTo(x + 4, LANE.tapY - 34); c.stroke();
        c.font = font(700, 26); c.fillStyle = '#ffd0a8'; c.fillText('跟着低音提前', x + 16, LANE.tapY + 66); }   // below the tap line: the lane label sits above it
    }
  }
  c.restore();
}

// ④ the loop: the measured spectrogram of 3.1 s on, frozen, over the live one of 11.6 s on — they line up
function specStrip(c, x, y, w, h, s0, s1, upto, col) {
  const f0 = Math.round(s0 / HOP), f1 = Math.round(s1 / HOP), fu = Math.round(upto / HOP), n = f1 - f0;
  const bw = w / n, bh = h / 30;
  for (let i = 0; i < n; i++) {
    if (f0 + i > fu) break;
    const fr = SPEC[f0 + i];
    for (let b = 0; b < 30; b++) {
      const v = fr[Math.min(47, Math.round(b * 47 / 29))]; if (v < 0.18) continue;
      c.fillStyle = rgba(mixc(col, WHITE, v * 0.45), (v - 0.1) * 0.95);
      c.fillRect(x + i * bw, y + h - (b + 1) * bh, bw + 0.6, bh + 0.6);
    }
  }
}
function sceneDecks(c, t, P, vis) {
  if (vis <= 0) return;
  const lt = t - T.LOOP, x = 120, w = 840, h = 130, y1 = 600, y2 = 772;
  c.save(); c.globalAlpha = vis;
  for (const [y, lab] of [[y1, '第 3.1 秒起 · 8.5 秒前'], [y2, '第 11.6 秒起 · 现在']]) {
    c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.roundRect(x - 20, y - 52, w + 40, h + 66, 16); c.fill();
    c.font = font(700, 28); c.fillStyle = rgba(P.acc); c.fillText(lab, x, y - 16);
  }
  c.globalCompositeOperation = 'lighter';
  specStrip(c, x, y1, w, h, 3.056, 3.056 + 4.254, 99, [255, 150, 80]);
  specStrip(c, x, y2, w, h, T.LOOP, T.LOOP + 4.254, t, [90, 230, 200]);
  c.globalCompositeOperation = 'source-over';
  const px = x + clamp(lt / 4.254) * w;
  c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, y2 - 4); c.lineTo(px, y2 + h + 4); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(px, y1); c.lineTo(px, y1 + h); c.stroke(); c.setLineDash([]);
  // bar lines on both strips (they coincide)
  c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
  for (let k = 1; k < 2; k++) { const bx = x + w * k / 2; c.beginPath(); c.moveTo(bx, y1); c.lineTo(bx, y2 + h); c.stroke(); }
  const ma = sm(1.9, 2.15, lt);
  if (ma > 0) {
    c.globalAlpha = vis * ma; c.save(); c.translate(790, y1 - 30); c.rotate(-0.05);
    c.strokeStyle = '#7ff0cf'; c.lineWidth = 4; c.beginPath(); c.roundRect(-150, -40, 300, 80, 12); c.stroke();
    c.font = font(700, 40); c.fillStyle = '#9ff7dc'; c.textAlign = 'center'; c.fillText('相似度 0.99', 0, 14); c.restore();
  }
  c.restore();
}

// ⑤ the drag: a fuse burns across in even 16th-note sparks (measured 0.134 s), toward the moment the bass returns
function sceneFuse(c, t, P, vis) {
  if (vis <= 0 || t < T.DRAGB) return;
  const k = prog(T.DRAGB, T.DROP, t), y = 760, x0 = 120, x1 = 960, x = lerp(x0, x1, k);
  c.save(); c.globalAlpha = vis;
  c.strokeStyle = 'rgba(200,215,255,.45)'; c.lineWidth = 6; c.setLineDash([3, 12]); c.beginPath(); c.moveTo(x, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]);
  c.strokeStyle = 'rgba(255,170,90,.6)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x0, y); c.lineTo(x, y); c.stroke();
  c.globalCompositeOperation = 'lighter';
  const n16 = Math.floor((t - T.DRAGB) / (BEAT / 4));
  for (let j = 0; j <= n16; j++) {
    const tj = T.DRAGB + j * BEAT / 4, a = t - tj, xj = lerp(x0, x1, prog(T.DRAGB, T.DROP, tj));
    if (a > 0.5) continue;
    for (let s = 0; s < 10; s++) { const ang = -Math.PI / 2 + (hash(j * 7 + s, 41) - 0.5) * 2.4, sp = 200 + 300 * hash(j * 5 + s, 42);
      glow(c, xj + Math.cos(ang) * sp * a, y + Math.sin(ang) * sp * a + 420 * a * a, 10, GOLD, (1 - a / 0.5) * 0.95); }
  }
  glow(c, x, y, 70 + 14 * Math.sin(t * 40), [255, 200, 120], 1);
  c.font = font(700, 36, MONO); c.fillStyle = 'rgba(255,225,190,.95)'; c.textAlign = 'center';
  c.fillText(`还有 ${(T.DROP - t).toFixed(1)} 秒`, 540, y - 70);
  c.globalCompositeOperation = 'source-over'; c.textAlign = 'left';
  c.restore();
}
// ⑥ the drop: bursts
function sceneBurst(c, t, P) {
  const a = t - T.DROP; if (a < 0 || a > 2.0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [cx, cy, n, sd] of [[540, 900, 150, 1], [250, 700, 90, 2], [830, 640, 90, 3]]) {
    const d = sd === 1 ? 0 : 0.12 * sd, aa = a - d; if (aa < 0) continue;
    for (let i = 0; i < n; i++) {
      const ang = hash(i, sd * 10) * TAU, sp = (380 + 620 * hash(i, sd * 10 + 1)) * (sd === 1 ? 1.25 : 0.9), dr = Math.exp(-aa * 1.6);
      const dist = sp * (1 - dr) / 1.6, x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist + 160 * aa * aa;
      const col = [[255, 190, 110], [255, 130, 80], [255, 240, 210]][i % 3];
      glow(c, x, y, 7 + 5 * hash(i, 9), col, (1 - aa / 1.9) * 0.95);
    }
  }
  const R = 60 + a * 1400;
  c.strokeStyle = rgba([255, 220, 170], Math.max(0, 0.7 - a * 0.9)); c.lineWidth = 10; c.beginPath(); c.ellipse(540, FLOOR_Y, R, R * 0.3, 0, 0, TAU); c.stroke();
  c.restore();
}
// ⑦ the recipe: the whole song's measured bass as a landscape, three places marked
function sceneRecipe(c, t, P, vis) {
  if (vis <= 0) return;
  const x0 = 110, x1 = 970, y = 790, h = 200, dur = 28.6;
  const X = (s) => x0 + (s / dur) * (x1 - x0);
  c.save(); c.globalAlpha = vis;
  c.fillStyle = 'rgba(0,0,0,.42)'; c.beginPath(); c.roundRect(x0 - 30, y - h - 90, x1 - x0 + 60, h + 150, 22); c.fill();
  c.font = font(700, 28); c.fillStyle = rgba(P.acc); c.fillText('这首歌的低音（实测 · 0—28.6 秒）', x0, y - h - 44);
  const g = c.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, 'rgba(255,190,120,.95)'); g.addColorStop(1, 'rgba(200,70,40,.25)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x0, y);
  for (let s = 0; s <= dur; s += 0.05) c.lineTo(X(s), y - h * Math.pow(level(s), 1.4) * 0.92);
  c.lineTo(x1, y); c.closePath(); c.fill();
  const marks = [[3.056, '低音进来 → 定拍', 0.25], [11.565, '同一段再来 → 好猜', 0.85], [15.819, '抽薄再还 → 等，然后爽', 1.45]];
  marks.forEach(([s, lab, d], i) => {
    const a = sm(d, d + 0.25, t - T.RECAP); if (a <= 0) return;
    const mx = X(s), ly = y + 50 + i * 0;
    c.globalAlpha = vis * a;
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx, y - h - 10); c.lineTo(mx, y + 10); c.stroke();
    glow(c, mx, y - h * Math.pow(level(s + 0.1), 1.4) * 0.92, 26, [255, 230, 190], 1);
    c.font = font(700, 28, MONO); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(`${s.toFixed(1)}s`, mx, y + 40);
    c.textAlign = 'left';
    const cardY = 860, cardX = [96, 388, 680][i];
    c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.roundRect(cardX, cardY - 4, 284, 64, 12); c.fill();
    c.font = font(700, 25); c.fillStyle = '#ffe2c2'; c.fillText(`${'①②③'[i]} ${lab}`, cardX + 14, cardY + 38);
  });
  c.restore();
}

// ------------------------------------------------------------------ HUD: chapter label (scramble), big rolling seconds, captions, notes, timeline
const SCR = '低音拍子循环期待回来实测节奏现场听觉跟拍上头配方秒薄厚等猜';
function drawLabel(c, t, P) {
  let ch = CHAPTERS[0]; for (const x of CHAPTERS) if (t >= x.t0) ch = x;
  const lt = t - ch.t0, n = [...ch.label].length, front = clamp(lt / 0.45) * (n + 4);
  let s = '';
  [...ch.label].forEach((g, i) => { s += i < front - 4 ? g : i < front ? SCR[(hash(i * 31 + Math.floor(front * 5), 3) * SCR.length) | 0] : ''; });
  c.font = font(700, 27, MONO); c.letterSpacing = '4px'; c.fillStyle = rgba(P.acc, 0.95);
  c.strokeStyle = rgba(P.acc, 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(78, 158); c.lineTo(78 + 34 * E.out3(clamp(lt / 0.4)), 158); c.stroke();
  c.fillText(s, 128, 168); c.letterSpacing = '0px';
}
const STAMPS = [[T.BASS, '03.06', '00.00'], [T.LOOP, '11.57', '03.06'], [T.DRAG, '15.82', '11.57'], [T.DROP, '20.07', '15.82']];
function drawStamps(c, t, P) {
  for (const [t0, str, from] of STAMPS) {
    const lt = t - t0; if (lt < -0.5 || lt > 1.5) continue;
    const a = sm(-0.5, -0.38, lt) * (1 - sm(1.15, 1.5, lt)), land = clamp((lt + 0.48) / 0.48);
    c.save(); c.globalAlpha = a;
    c.font = font(700, 120, MONO); c.textAlign = 'center';
    const digits = [...str], prev = [...from], cw = 74, x0 = 540 - (digits.length * cw) / 2 - 30, y = t0 === T.DROP ? 468 : 530;
    const pop = lt >= 0 ? 1 + 0.12 * Math.exp(-lt / 0.12) : 1;
    c.translate(540, y - 40); c.scale(pop, pop); c.translate(-540, -(y - 40));
    digits.forEach((d, i) => {
      const x = x0 + i * cw + cw / 2;
      if (d === '.') { c.fillStyle = '#fff'; c.fillText('.', x, y); return; }
      const v0 = +prev[i], v1 = +d, steps = (v1 - v0 + 10) % 10 + (i < 2 ? 10 : 20);   // later digits spin more (odometer)
      const r = E.io3(clamp((land - i * 0.04) / 0.96)), cur = v0 + steps * r, base = Math.floor(cur + 1e-6), f = cur - base;
      const speed = Math.abs(E.io3(clamp((land + 0.02 - i * 0.04) / 0.96)) - r) * steps * 60;
      c.save(); c.beginPath(); c.rect(x - cw / 2, y - 108, cw, 130); c.clip();
      c.fillStyle = '#fff'; c.shadowColor = rgba(P.acc, 0.8); c.shadowBlur = lt >= 0 ? 34 : 14;
      const draw = (off, al) => { c.globalAlpha = a * al; c.fillText(String(((base % 10) + 10) % 10), x, y - f * 124 + off); if (f > 0.01) c.fillText(String((base + 1) % 10), x, y - f * 124 + 124 + off); };
      const blur = Math.min(40, speed * 3);
      if (blur > 2) { draw(-blur / 2, 0.35); draw(blur / 2, 0.35); draw(0, 0.5); } else draw(0, 1);
      c.restore();
    });
    c.globalAlpha = a; c.font = font(700, 46); c.fillStyle = rgba(P.acc); c.textAlign = 'left'; c.fillText('秒', x0 + digits.length * cw + 6, y - 6);
    c.restore();
  }
}
const CAP = { x: 78, y: 212, size: 72, lh: 90 };
function parseRich(text) {   // → lines of [{ch, hi}]
  return text.split('\n').map((line) => { const out = []; let hi = false; for (let i = 0; i < line.length; i++) { if (line.startsWith('[[', i)) { hi = true; i++; continue; } if (line.startsWith(']]', i)) { hi = false; i++; continue; } out.push({ ch: line[i], hi }); } return out; });
}
const RICH = CUES.map((q) => parseRich(q.text));
function drawCaptions(c, t, P) {
  CUES.forEach((q, qi) => {
    if (t < q.t0 || t >= q.t1 + 0.0) return;
    const out = 1 - sm(q.t1 - 0.16, q.t1, t);
    if (q.kind === 'note') { drawNote(c, q.text, t - q.t0, out); return; }
    if (q.kind === 'big') {
      const u = clamp((t - q.t0) / 0.22), s = 1.3 - 0.3 * E.outBack(u);
      c.save(); c.globalAlpha = out * clamp(u * 3); c.translate(540, 290); c.scale(s, s);
      c.font = font(700, 140); c.textAlign = 'center'; c.fillStyle = '#fff'; c.shadowColor = rgba(P.acc, 0.95); c.shadowBlur = 40; c.fillText(q.text, 0, 48); c.restore();
      return;
    }
    c.save(); c.font = font(700, CAP.size); c.textBaseline = 'alphabetic';
    c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = 18;
    let k = 0;
    RICH[qi].forEach((line, li) => {
      let x = CAP.x;
      for (const g of line) {
        const p = E.out3(clamp((t - q.t0 - k * 0.022) / 0.3));
        if (p > 0) { c.globalAlpha = p * out; c.fillStyle = g.hi ? rgba(mixc(P.acc, [255, 182, 72], 0.6)) : '#f7f3ec'; c.fillText(g.ch, x, CAP.y + CAP.size + li * CAP.lh + (1 - p) * 18); }
        x += c.measureText(g.ch).width; k++;
      }
    });
    c.restore();
  });
}
function drawNote(c, text, lt, out) {
  c.save(); c.font = font(400, 25); const maxW = 830, lines = []; let cur = '';
  for (const ch of text) { if (c.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
  if (cur) lines.push(cur);
  const a = clamp(lt / 0.25) * out, y = 1388;
  c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.roundRect(78, y, 862, 22 + lines.length * 37, 10); c.fill();
  c.fillStyle = 'rgba(255,190,110,.9)'; c.fillRect(78, y, 4, 22 + lines.length * 37);
  c.fillStyle = '#ece6dc'; lines.forEach((l, i) => c.fillText(l, 98, y + 39 + i * 37));
  c.restore();
}
const TL = { x0: 90, x1: 930, y: 1338 };
function drawTimeline(c, t, P, vis) {
  if (vis <= 0) return;
  const X = (s) => TL.x0 + (s / 28.6) * (TL.x1 - TL.x0), y = TL.y;
  c.save(); c.globalAlpha = vis;
  for (const [a, b] of [[0, 3.056], [T.DRAG, T.DROP]]) {
    c.fillStyle = 'rgba(170,200,255,.12)'; c.fillRect(X(a), y - 30, X(b) - X(a), 36);
    c.font = font(400, 17); c.fillStyle = 'rgba(190,215,255,.6)'; c.textAlign = 'center'; c.fillText('低音薄', (X(a) + X(b)) / 2, y + 26); c.textAlign = 'left';
  }
  c.beginPath(); c.moveTo(X(0), y);
  for (let s = 0; s <= 28.6; s += 0.1) c.lineTo(X(s), y - 26 * Math.pow(level(s), 1.4));
  c.lineTo(X(28.6), y); c.closePath(); c.fillStyle = 'rgba(255,170,110,.18)'; c.fill();
  c.save(); c.beginPath(); c.rect(X(0), y - 40, X(t) - X(0), 50); c.clip();
  c.beginPath(); c.moveTo(X(0), y); for (let s = 0; s <= 28.6; s += 0.1) c.lineTo(X(s), y - 26 * Math.pow(level(s), 1.4)); c.lineTo(X(28.6), y); c.closePath();
  c.fillStyle = 'rgba(255,170,110,.75)'; c.fill(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(X(0), y); c.lineTo(X(28.6), y); c.stroke();
  for (const [s] of STAMPS) { c.fillStyle = t >= s ? '#fff' : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(X(s), y, 4, 0, TAU); c.fill(); }
  const mx = X(t); c.globalCompositeOperation = 'lighter'; glow(c, mx, y, 26, P.acc, 0.9); c.globalCompositeOperation = 'source-over';
  c.fillStyle = '#fff'; c.beginPath(); c.arc(mx, y, 5, 0, TAU); c.fill();
  c.font = font(700, 20, MONO); c.fillStyle = 'rgba(255,255,255,.85)'; c.textAlign = mx > 860 ? 'right' : 'left'; c.fillText(`${t.toFixed(1)}s`, mx + (mx > 860 ? -10 : 10), y - 12);
  c.restore();
}

// ------------------------------------------------------------------ post: bloom, flashes, vignette, grain, brownout
function bloom(amount) {
  if (amount <= 0) return;
  bA.globalCompositeOperation = 'copy'; bA.filter = 'brightness(0.9) contrast(2.1)'; bA.drawImage(canvas, 0, 0, W / 4, H / 4);
  bB.globalCompositeOperation = 'copy'; bB.filter = 'blur(4px)'; bB.drawImage(BA, 0, 0);
  bC.globalCompositeOperation = 'copy'; bC.filter = 'blur(8px)'; bC.drawImage(BA, 0, 0, W / 8, H / 8);
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.32 * amount; ctx.drawImage(BB, 0, 0, W, H); ctx.globalAlpha = 0.4 * amount; ctx.drawImage(BC, 0, 0, W, H); ctx.restore();
}
const VIGNETTE = (() => { const v = mk(W, H), g = v.getContext('2d'), gr = g.createRadialGradient(W / 2, H * 0.48, H * 0.28, W / 2, H * 0.48, H * 0.72);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); return v; })();
const GRAIN = Array.from({ length: 4 }, (_, k) => { const s = mk(256, 256), g = s.getContext('2d'), id = g.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (hash(i, 900 + k) + hash(i, 950 + k) + hash(i, 990 + k) - 1.5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return s; });
function grain(t) { const f = Math.floor(t * 30), tile = GRAIN[f % 4]; ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  ctx.translate(-((hash(f, 5) * 256) | 0), -((hash(f, 6) * 256) | 0)); ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore(); }
const FLASHES = [[T.BASS, 0.55, [255, 200, 150]], [T.DROP, 0.75, [255, 230, 200]], [T.LOOP, 0.14, [150, 255, 220]]];
function flashes(t) {
  for (const [ft, a, col] of FLASHES) { const d = t - ft; if (d < -0.04 || d > 1.0) continue; const k = d < 0 ? (d + 0.04) / 0.04 : Math.exp(-d * 5.5);
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, 1200); g.addColorStop(0, rgba(col, a * k)); g.addColorStop(1, rgba(col, a * k * 0.25));
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
}
// brownout: during the thinned bass the picture shrinks like a weak CRT and loses colour; it snaps back at the drop
function squeezeAt(t) {
  if (t < T.DRAG || t > T.DROP + 0.5) return 0;
  if (t < T.DROP) return sm(T.DRAG, T.DRAG + 0.22, t) * (1 - 0.55 * sm(T.DRAGB, T.DROP - 0.05, t));
  return -0.05 * Math.sin(Math.PI * clamp((t - T.DROP) / 0.5)) * Math.exp(-(t - T.DROP) * 2);
}

// ------------------------------------------------------------------ frame
function weight(t, a, b, fi = 0.2, fo = 0.2) { return sm(a - fi / 2, a + fi / 2, t) * (1 - sm(b - fo / 2, b + fo / 2, t)); }
film.render = async (t) => {
  const P = paletteAt(t);
  reset(fctx);
  drawBackground(fctx, t, P);
  drawDust(fctx, t, P, 1);
  // scenes (cross-faded on bar lines)
  const wStage = weight(t, -1, T.CAM) + weight(t, T.HOVE1, T.LOOP, 0.3, 0.01) * 0 + weight(t, T.LOOP, 99);
  const zoomOut = sm(T.CAM - 0.1, T.CAM + 0.25, t) * (1 - sm(T.HOVE1 - 0.15, T.HOVE1 + 0.15, t));
  if (wStage > 0) sceneStage(fctx, t, P, wStage);
  const wLanes = sm(T.HOVE1 - 0.12, T.HOVE1 + 0.12, t) * (1 - sm(11.08, 11.42, t));
  if (wLanes > 0) { fctx.save(); fctx.globalAlpha = wLanes; drawFloor(fctx, t, P, 0.55); drawClawd(fctx, clawdX(t), floorY(clawdX(t), t, floorAmp(t)) - 2, cuAt(t), { ...clawdPose(t), eyes: t > 8.85 && t < 9.25 ? 'wide' : clawdPose(t).eyes, hop: clawdPose(t).hop + (t > 8.85 && t < 9.2 ? 60 * Math.sin(Math.PI * (t - 8.85) / 0.35) : 0) }); fctx.restore(); }
  sceneCrowd(fctx, t, P, zoomOut);
  sceneLanes(fctx, t, P, wLanes);
  sceneDecks(fctx, t, P, weight(t, T.LOOP, T.DRAG, 0.25, 0.3));
  sceneFuse(fctx, t, P, weight(t, T.DRAGB, T.DROP + 0.05, 0.2, 0.08));
  sceneBurst(fctx, t, P);
  sceneRecipe(fctx, t, P, weight(t, T.RECAP + 0.1, 99, 0.4));
  drawMeter(fctx, t, P, weight(t, 0.6, T.CAM, 0.4, 0.3));
  drawStamps(fctx, t, P);
  // compose: brownout squeeze + desaturation, then bloom on the picture only
  reset(ctx);
  const sq = squeezeAt(t);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (sq > 0) { ctx.filter = `saturate(${(1 - 0.6 * sq).toFixed(3)}) brightness(${(1 - 0.38 * sq).toFixed(3)})`; }
  ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.scale(1 - 0.04 * sq, 1 - 0.36 * sq); ctx.translate(-W / 2, -H * 0.55); ctx.drawImage(FRAME, 0, 0); ctx.restore();
  ctx.filter = 'none';
  if (sq > 0.02) { ctx.save(); ctx.globalAlpha = 0.18 * sq; ctx.fillStyle = '#000'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2); ctx.restore(); }
  bloom(1);
  flashes(t);
  ctx.drawImage(VIGNETTE, 0, 0);
  // HUD on top (never squeezed)
  reset(ctx);
  drawTimeline(ctx, t, P, 1 - sm(T.RECAP - 0.2, T.RECAP + 0.3, t));
  drawLabel(ctx, t, P);
  drawCaptions(ctx, t, P);
  grain(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
await document.fonts.load(font(700, 72)); await document.fonts.load(font(400, 25)); await document.fonts.load(font(700, 30, MONO));
film.ready = true;
