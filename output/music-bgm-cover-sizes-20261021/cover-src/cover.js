// cover.js — 《一听就想点头？秘密在低音里》4:3 and 3:4 adaptations.
// Original Canvas design: Opus 5.5. Aspect-ratio layouts: Codex, 2026-10-21.
// Same Canvas language as the film (music-three-films-20261021/src/c-long/film.js): the official 12×8 pixel Clawd
// (#d97757), glow sprites, the drifting "sound dust", the warm palette of the film's bass drop. The ground Clawd jumps
// on is the song's own MEASURED sub-bass over 0–39.2 s (data/bass.json = the film's music-map.json): the thin intro, the two
// thinned stretches (15.8 s, 28.6 s) and the two returns are real; Clawd stands at 20.07 s, where the bass comes back.
// Text: the film's own question + answer; the strap is the film's recipe. Key words and Clawd sit in the centre band
// y 240–1680 (a 3:4 centre crop or a small grid thumbnail keeps them).
const film = window.film = { ready: false, error: null, duration: 1 };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });

// Ratio adaptation by Codex. Original design, character, fonts and measured bass data are preserved.
const W = document.getElementById('c').width, H = document.getElementById('c').height, TAU = Math.PI * 2;
const wide = W > H;
const L = wide ? {
  topicY: 132, topicSize: 40, lineY: 326, lineSize: 142,
  pointY: 574, pointSize: 246, questionSize: 178, subY: 703, subSize: 84,
  ground: { x0: 704, x1: W + 10, base: 915, h: 200 }, unit: 38, hop: 50,
  chipFont: 34, chipY: 810, chipH: 68, chipPad: 40, chipGap: 14, chipX: 72,
  captionX: 718, captionY: 975, captionSize: 24, markSize: 26,
} : {
  topicY: 98, topicSize: 38, lineY: 272, lineSize: 144,
  pointY: 521, pointSize: 250, questionSize: 178, subY: 637, subSize: 86,
  ground: { x0: -10, x1: W + 10, base: 1212, h: 202 }, unit: 35, hop: 48,
  chipFont: 44, chipY: 1285, chipH: 76, chipPad: 48, chipGap: 18, chipX: null,
  captionX: 40, captionY: 1246, captionSize: 22, markSize: 26,
};
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (u) => u * u * (3 - 2 * u);
function hash(i, seed = 0) { let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, seed = 0) { const i = Math.floor(x), f = x - i; return lerp(hash(i, seed), hash(i + 1, seed), smooth(f)) * 2 - 1; }
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a).toFixed(3)})`;
const mixc = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
const WHITE = [255, 255, 255], GOLD = [255, 190, 110], CREAM = [255, 241, 226], PEACH = [255, 176, 112];
const SANS = '"K-Sans"', MONO = '"K-Mono", "K-Sans"';
const font = (w, s, f = SANS) => `${w} ${s}px ${f}`;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function reset(c) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)'; c.letterSpacing = '0px'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.setLineDash([]); }

// ------------------------------------------------------------------ glow sprites (film.js)
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

// ------------------------------------------------------------------ the film's "drop" palette + background + sound dust
const P = { bg: [14, 6, 3], ga: [255, 140, 50], gb: [255, 70, 50], acc: [255, 205, 120] };
function drawBackground(c) {
  c.fillStyle = rgba(P.bg); c.fillRect(0, 0, W, H);
  const gx = W * (wide ? 0.73 : 0.52), gy = H * 0.65;
  let g = c.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.7); g.addColorStop(0, rgba(P.ga, 0.26)); g.addColorStop(0.5, rgba(P.ga, 0.08)); g.addColorStop(1, rgba(P.ga, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createRadialGradient(W * 0.22, H * 0.86, 0, W * 0.22, H * 0.86, Math.max(W, H) * 0.65); g.addColorStop(0, rgba(P.gb, 0.16)); g.addColorStop(1, rgba(P.gb, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
const DUST = Array.from({ length: 230 }, (_, i) => ({ x: hash(i, 1) * (W + 200) - 100, y: hash(i, 2) * (H + 200) - 100, z: 0.3 + 0.7 * hash(i, 3), ph: hash(i, 6) * TAU }));
function drawDust(c, amt) {
  const col = mixc(P.acc, WHITE, 0.35), pts = DUST.map((d, i) => [d.x + 30 * vnoise(i * 3.1, 11), d.y + 24 * vnoise(i * 1.7, 23), d.z, 0.65 + 0.35 * Math.sin(d.ph)]);
  c.lineWidth = 1; c.strokeStyle = rgba(col, 0.08 * amt); c.beginPath();
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
    if (dx * dx + dy * dy < 140 * 140) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); }
  }
  c.stroke();
  c.globalCompositeOperation = 'lighter';
  for (const p of pts) glow(c, p[0], p[1], 4 + p[2] * 7, col, p[3] * (0.25 + 0.45 * p[2]) * amt);
  c.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------ Clawd (film.js: official 12×8 silhouette, brand orange #d97757)
const BITMAP = ['..########..', '..#E####E#..', '############', '############', '..########..', '..########..', '..#.#..#.#..', '..#.#..#.#..'];
const CELLS = [];
BITMAP.forEach((row, r) => [...row].forEach((ch, col) => { if (ch === '#') CELLS.push([col, r, r >= 6 ? 'leg' : (r === 2 || r === 3) && (col < 2 || col > 9) ? 'arm' : 'body']); }));
function drawClawd(c, cx, feetY, u, o = {}) {
  const sq = o.sq || 0, hop = o.hop || 0, eyes = o.eyes || 'open', arms = o.arms || 0, legs = o.legs || 0;
  c.save();
  c.translate(cx, feetY - hop); if (o.tilt) c.rotate(o.tilt);
  c.scale(1 + sq * 0.55, 1 - sq);
  const x0 = -6 * u, y0 = -8 * u;
  c.globalCompositeOperation = 'lighter'; glow(c, 0, -4 * u, 9 * u, [255, 120, 70], 0.2 * (o.glow ?? 1), false); c.globalCompositeOperation = 'source-over';
  const body = c.createLinearGradient(0, y0, 0, y0 + 8 * u);
  body.addColorStop(0, '#ec8d6b'); body.addColorStop(0.35, '#d97757'); body.addColorStop(1, '#bd5f42');
  c.fillStyle = body;
  for (const [col, r, part] of CELLS) {
    let yy = y0 + r * u, hh = u;
    if (part === 'arm') yy -= arms * u;
    if (part === 'leg') { const i = [2, 4, 7, 9].indexOf(col); const lift = legs && ((i % 2 === 0) === legs > 0) ? Math.abs(legs) * u * 0.9 : 0; if (r === 7) hh = u - lift; }
    c.fillRect(x0 + col * u - 0.4, yy - 0.4, u + 0.8, hh + 0.8);
  }
  c.fillStyle = 'rgba(255,230,210,.22)'; c.fillRect(x0 + 2 * u, y0, 8 * u, u * 0.18);
  c.fillStyle = '#141414';
  for (const col of [3, 8]) {
    const ex = x0 + col * u, ey = y0 + u;
    if (eyes === 'open') c.fillRect(ex, ey, u, u);
    else if (eyes === 'happy') { c.fillRect(ex - u * 0.1, ey + u * 0.3, u * 0.4, u * 0.28); c.fillRect(ex + u * 0.3, ey, u * 0.4, u * 0.28); c.fillRect(ex + u * 0.7, ey + u * 0.3, u * 0.4, u * 0.28); }
  }
  c.restore();
}

// ------------------------------------------------------------------ the measured bass of the whole song, as the ground
// per-beat sub-bass (music-map.json beat_sub_db, 74 beats), level as in film.js: clamp((dB + 19) / 14), joined by a
// Catmull-Rom curve so the landscape reads at a glance (the thin intro, the two thinned stretches, the two returns)
let B = null;
const lvOf = (db) => clamp((db + 19) / 14);
let D3 = null;   // 3-beat centred average of the per-beat dB (the grooves read as plateaus, the thinned bars as valleys)
function level(s) {
  const T = B.beats, n = T.length;
  if (!D3) D3 = B.beat_sub_db.map((_, i, a) => { let t = 0, k = 0; for (let j = i - 1; j <= i + 1; j++) if (j >= 0 && j < a.length) { t += a[j]; k++; } return t / k; });
  const D = D3;
  if (s <= T[0]) return lvOf(D[0]);
  if (s >= T[n - 1]) return lvOf(D[n - 1]) * clamp(1 - (s - T[n - 1]) / 1.2) + 0.12 * clamp((s - T[n - 1]) / 1.2);
  let i = 0; while (i < n - 2 && T[i + 1] <= s) i++;
  const u = (s - T[i]) / (T[i + 1] - T[i]), P = (k) => lvOf(D[Math.max(0, Math.min(n - 1, k))]);
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), u2 = u * u, u3 = u2 * u;
  return clamp(0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3));
}
const G = L.ground;
const X = (s) => G.x0 + (s / B.song_end_s) * (G.x1 - G.x0);
const ridgeY = (s) => G.base - G.h * Math.pow(level(s), 1.6);
function drawGround(c) {
  const S = B.song_end_s;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let layer = 2; layer >= 0; layer--) {
    const off = layer * 24, sh = 1 - layer * 0.18;
    const g = c.createLinearGradient(0, G.base - G.h - 30, 0, G.base + 160);
    g.addColorStop(0, rgba([255, 200, 120], 0.0)); g.addColorStop(0.3, rgba([255, 150, 70], (0.30 - layer * 0.07)));
    g.addColorStop(0.75, rgba([210, 70, 35], 0.16)); g.addColorStop(1, rgba([120, 30, 20], 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(G.x0, G.base + 200);
    for (let s = 0; s <= S; s += 0.05) c.lineTo(X(s), G.base - (G.base - ridgeY(s)) * sh + off);
    c.lineTo(G.x1, G.base + 200); c.closePath(); c.fill();
  }
  c.restore();
  c.save();
  c.lineWidth = 4; c.strokeStyle = 'rgba(255,226,196,0.9)'; c.shadowColor = 'rgba(255,150,70,0.95)'; c.shadowBlur = 26;
  c.beginPath(); for (let s = 0; s <= S; s += 0.05) { const x = X(s), y = ridgeY(s); s === 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ the cover
function drawCover(c) {
  reset(c);
  film.textBounds = [];
  const text = (value, x, y) => {
    const m = c.measureText(value);
    film.textBounds.push({ text: value, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
      top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
    c.fillText(value, x, y);
  };
  drawBackground(c);
  drawDust(c, 1);
  drawGround(c);
  // labels on the measured ground (small): what the dips and the climbs are
  const M = B.marks_s;
  c.font = font(700, L.markSize, SANS); c.textAlign = 'center';
  const tag = (s, txt, dy, col) => { const x = X(s), y = ridgeY(s) + dy; c.fillStyle = col; text(txt, x, y); };
  tag(17.7, '抽薄', 46, 'rgba(204,224,255,1)');
  tag(30.7, '又抽薄', 46, 'rgba(204,224,255,1)');
  c.textAlign = 'left';
  c.font = font(700, L.captionSize, SANS); c.fillStyle = 'rgba(255,226,196,0.8)'; text('这首歌的低音 · 实测', L.captionX, L.captionY);
  // Clawd jumps where the bass comes back (20.07 s) — happy, arms up, a landing ring and sparks from the ground
  const cx = X(M.drop1) + 6, groundAt = ridgeY(M.drop1 + 0.45), u = L.unit;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 46; j++) {
    const a = -Math.PI / 2 + (hash(j, 41) - 0.5) * 2.7, r = 120 + 330 * Math.pow(hash(j, 42), 0.8);
    glow(c, cx + Math.cos(a) * r * 1.15, groundAt - 30 + Math.sin(a) * r * 0.95, 6 + 9 * hash(j, 43), mixc(GOLD, WHITE, hash(j, 44) * 0.6), 0.85 * (1 - 0.5 * hash(j, 45)));
  }
  glow(c, cx, groundAt - 150, 380, [255, 150, 70], 0.32, false);
  c.restore();
  drawClawd(c, cx, groundAt, u, { hop: L.hop, eyes: 'open', arms: 0, sq: -0.04, tilt: -0.03 });
  // bounce marks (the nod / the jump), two each side of the head
  c.save(); c.strokeStyle = 'rgba(255,236,214,0.92)'; c.lineWidth = 9; c.lineCap = 'round';
  const top = groundAt - L.hop - 8 * u;
  for (const sd of [-1, 1]) for (let k = 0; k < 2; k++) {
    const r = 46 + k * 34; c.beginPath(); c.arc(cx + sd * (6.6 * u), top + 40, r, sd < 0 ? Math.PI * 1.08 : -Math.PI * 0.42, sd < 0 ? Math.PI * 1.42 : -Math.PI * 0.08); c.stroke();
  }
  c.restore();
  // ---- headline (the film's own question and answer)
  const XL = 72;
  c.fillStyle = 'rgba(255,176,112,1)'; c.fillRect(XL, L.topicY - 20, 54, 7);
  c.font = font(700, L.topicSize, SANS); c.fillStyle = rgba(CREAM, 0.95); c.letterSpacing = '2px';
  text('这首“开智小曲”', XL + 76, L.topicY); c.letterSpacing = '0px';
  c.font = font(900, L.lineSize, SANS); c.fillStyle = rgba(CREAM);
  text('一听就想', XL - 6, L.lineY);
  c.save();
  c.globalCompositeOperation = 'lighter'; glow(c, 330, L.pointY - 90, 420, [255, 140, 60], 0.3, false); c.globalCompositeOperation = 'source-over';
  const g = c.createLinearGradient(0, L.pointY - L.pointSize * 0.8, 0, L.pointY); g.addColorStop(0, '#ffc98f'); g.addColorStop(1, '#ff8f52');
  c.font = font(900, L.pointSize, SANS); c.fillStyle = g; text('点头', XL - 12, L.pointY);
  const wd = c.measureText('点头').width;
  c.font = font(900, L.questionSize, SANS); text('？', XL - 12 + wd + 2, L.pointY);
  c.restore();
  c.font = font(900, L.subSize, SANS);
  c.fillStyle = rgba(CREAM); text('秘密在', XL - 4, L.subY);
  let x = XL - 4 + c.measureText('秘密在').width;
  c.fillStyle = '#ffab6b'; text('低音', x, L.subY); x += c.measureText('低音').width;
  c.fillStyle = rgba(CREAM); text('里', x, L.subY);
  // ---- the recipe (strap): the film's ending
  c.font = font(900, L.chipFont, SANS); c.textAlign = 'center';
  const chips = ['低音定拍', '一段反复', '抽走再回来'];
  const ws = chips.map((s) => c.measureText(s).width + L.chipPad), gap = L.chipGap, tot = ws.reduce((a, b) => a + b, 0) + gap * 2;
  let cx2 = L.chipX ?? (W - tot) / 2;
  chips.forEach((s, i) => {
    c.fillStyle = 'rgba(20,8,4,0.72)'; c.strokeStyle = 'rgba(255,176,112,0.85)'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(cx2, L.chipY, ws[i], L.chipH, L.chipH / 2); c.fill(); c.stroke();
    c.fillStyle = rgba(CREAM); text(s, cx2 + ws[i] / 2, L.chipY + L.chipH * 0.7);
    cx2 += ws[i] + gap;
  });
  c.textAlign = 'left';
  // vignette (as the film)
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.47, W / 2, H / 2, Math.max(W, H) * 0.9); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  film.layout = { width: W, height: H, ratio: wide ? '4:3' : '3:4', characterX: cx, characterFeetY: groundAt - L.hop };
}

try {
  B = await (await fetch('./data/bass.json')).json();
  await Promise.all([...document.fonts].map((ff) => ff.load()));
  const bad = [...document.fonts].filter((ff) => ff.status !== 'loaded');
  if (bad.length) throw new Error('font files not loaded: ' + bad.map((ff) => ff.family + ' ' + ff.weight).join(', '));
  film.fontFiles = [...document.fonts].length;
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d', { alpha: false });
  film.scenes = [{ id: 'cover', t0: 0, t1: 1 }];
  film.render = async () => { drawCover(ctx); };
  film.ready = true;
} catch (e) { film.error = String(e.stack || e); }
