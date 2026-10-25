// gfx2d.js — the graphic explainer scenes, drawn with Canvas 2D at 1080×1920. Every function is pure in t.
// Diagrams are 原理示意 (principle sketches): the fan, seal and gap are generic and exaggerated, not the car's layout.
import { T, C } from './timeline.js';
import { clamp, mix, ramp, lin, win, smooth, easeOut, easeIn, easeInOut, backOut, hash, fract } from './lib.js';

const FONT = (w, px) => `${w} ${px}px "NSC", sans-serif`;

export function background(ctx, t, tint = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, 1920);
  g.addColorStop(0, mixHex('#060a12', '#0a1220', tint)); g.addColorStop(0.55, mixHex('#0a1322', '#0d1a2e', tint)); g.addColorStop(1, '#05080e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
  // faint dust drifting (texture, not data)
  ctx.fillStyle = 'rgba(170,200,255,0.10)';
  for (let i = 0; i < 140; i++) {
    const x = fract(hash(i, 1) + t * 0.004 * (0.5 + hash(i, 2))) * 1080, y = fract(hash(i, 3) - t * 0.01 * (0.3 + hash(i, 4))) * 1920;
    const r = 0.8 + 1.6 * hash(i, 5); ctx.fillRect(x, y, r, r);
  }
}
function mixHex(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(mix(v, B[i], k))).join(',')})`;
}

function arrow(ctx, x0, y0, x1, y1, w, color, alpha = 1, head = 2.6) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); if (L < 1 || alpha <= 0) return;
  const ux = dx / L, uy = dy / L, hl = Math.min(L * 0.5, w * head), hw = w * 1.35;
  const bx = x1 - ux * hl, by = y1 - uy * hl;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x0 - uy * w / 2, y0 + ux * w / 2); ctx.lineTo(bx - uy * w / 2, by + ux * w / 2); ctx.lineTo(bx - uy * hw, by + ux * hw);
  ctx.lineTo(x1, y1); ctx.lineTo(bx + uy * hw, by - ux * hw); ctx.lineTo(bx + uy * w / 2, by - ux * w / 2); ctx.lineTo(x0 + uy * w / 2, y0 - ux * w / 2);
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function glowArrow(ctx, x0, y0, x1, y1, w, color, alpha = 1) {
  arrow(ctx, x0, y0, x1, y1, w * 2.2, color, alpha * 0.16);
  arrow(ctx, x0, y0, x1, y1, w * 1.5, color, alpha * 0.22);
  arrow(ctx, x0, y0, x1, y1, w, color, alpha);
}
function label(ctx, text, x, y, px, color, alpha = 1, align = 'center', w = 500) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.font = FONT(w, px); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}

// ============================================================================================ S3 · 约 10 吨
// A 1 m² square on the ground; the air column above it rises through the atmosphere (the view climbs with it, the air
// thins with height), drops back, and the count lands: ≈ 10 t (101 325 Pa ÷ 9.80665 m/s² ≈ 10 332 kg per m²).
export function tenTonnes(ctx, t) {
  background(ctx, t);
  const u = t - T.ten;
  const up = easeInOut(lin(t, T.colUp, T.colDown - 0.25), 2.2), down = easeIn(lin(t, T.colDown, T.tenHit), 2.4);
  const scroll = 4300 * up * (1 - down);
  { // altitude grade: daylight-blue haze near the ground → black space with stars at the top of the climb
    const k = scroll / 4300;
    const g = ctx.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, `rgba(0,0,0,${0.55 * k})`); g.addColorStop(1, `rgba(40,80,140,${0.28 * (1 - k)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * k})`;
    for (let i = 0; i < 120; i++) { const x = hash(i, 21) * 1080, y = hash(i, 22) * 1920 * 0.7; const r = 1 + 1.5 * hash(i, 23); ctx.fillRect(x, y, r, r); }
  }
  const hit = t - T.tenHit, shake = hit > 0 && hit < 0.5 ? Math.sin(hit * 70) * 14 * Math.exp(-hit * 9) : 0;
  ctx.save(); ctx.translate(0, scroll + shake);
  const GY = 1430;
  // ground
  const gg = ctx.createLinearGradient(0, GY, 0, GY + 520); gg.addColorStop(0, '#1a2233'); gg.addColorStop(1, '#070a10');
  ctx.fillStyle = gg; ctx.fillRect(0, GY, 1080, 520);
  ctx.strokeStyle = 'rgba(160,190,240,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GY); ctx.lineTo(1080, GY); ctx.stroke();
  // the 1 m² square (perspective) and the column above it
  const sq = easeOut(lin(t, T.ten + 0.05, T.ten + 0.55), 3);
  const L = 330, R = 750, TL = 400, TR = 680, TOP = GY - 70;
  const colH = 5600 * easeOut(lin(t, T.colUp - 0.2, T.colDown - 0.4), 2.0);
  if (colH > 1) {
    const cg = ctx.createLinearGradient(0, TOP, 0, TOP - colH);
    cg.addColorStop(0, 'rgba(120,190,255,0.45)'); cg.addColorStop(0.25, 'rgba(120,190,255,0.26)'); cg.addColorStop(0.6, 'rgba(120,190,255,0.13)'); cg.addColorStop(1, 'rgba(120,190,255,0.04)');
    ctx.fillStyle = cg; ctx.fillRect(TL, TOP - colH, TR - TL, colH);
    ctx.strokeStyle = 'rgba(150,205,255,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(TL, TOP); ctx.lineTo(TL, TOP - colH); ctx.moveTo(TR, TOP); ctx.lineTo(TR, TOP - colH); ctx.stroke();
    // molecules: dense near the ground, sparse with height (scale-height look; illustrative)
    for (let i = 0; i < 1400; i++) {
      const h = -Math.log(1 - hash(i, 7) * 0.995) * 900;           // exponential with height
      if (h > colH) continue;
      const x = TL + 10 + fract(hash(i, 8) + 0.03 * Math.sin(t * 1.3 + i)) * (TR - TL - 20), y = TOP - h + 6 * Math.sin(t * 2.0 + i * 1.7);
      const a = 0.3 + 0.6 * Math.exp(-h / 2600);
      ctx.fillStyle = `rgba(190,225,255,${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    // altitude ticks
    [[1100, '1 km'], [2600, '10 km'], [4900, '100 km']].forEach(([h, s], k) => {
      const a = ramp(colH, h - 200, h + 100) * (1 - down);
      ctx.strokeStyle = `rgba(200,220,255,${0.5 * a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(TR + 18, TOP - h); ctx.lineTo(TR + 70, TOP - h); ctx.stroke();
      label(ctx, s, TR + 86, TOP - h, 58, '#e3eeff', a, 'left', 900);
    });
    // clouds band near 2 km, a thin space-black above 100 km
    for (let k = 0; k < 5; k++) {
      const cx = 200 + k * 190 + 30 * Math.sin(t * 0.4 + k), cy = TOP - 1500 - 60 * hash(k, 3);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160); rg.addColorStop(0, 'rgba(220,230,245,0.16)'); rg.addColorStop(1, 'rgba(220,230,245,0)');
      ctx.fillStyle = rg; ctx.fillRect(cx - 160, cy - 160, 320, 320);
    }
  }
  // square on top
  ctx.save(); ctx.globalAlpha = sq;
  ctx.fillStyle = 'rgba(255,138,61,0.20)'; ctx.strokeStyle = C.orange; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(L, GY); ctx.lineTo(R, GY); ctx.lineTo(TR, TOP); ctx.lineTo(TL, TOP); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  label(ctx, '1 ㎡', 540, GY + 58, 46, C.orange, sq, 'center', 900);
  // the weight lands: downward arrows on the square after the hit
  const press = ramp(t, T.tenHit, T.tenHit + 0.35);
  for (let k = 0; k < 5; k++) {
    const x = TL + 30 + k * (TR - TL - 60) / 4, bob = 8 * Math.sin(t * 5 + k);
    glowArrow(ctx, x, TOP - 260 + bob, x, TOP - 18, 16, C.orange, press);
  }
  ctx.restore();
  // the count (screen space): 0 → 10 while the view drops, landing on the hit
  const cnt = lin(t, T.colDown + 0.1, T.tenHit);
  if (cnt > 0) {
    const n = Math.min(10, Math.floor(cnt * 10 + 1e-6));
    const pop = hit > 0 ? 1 + 0.18 * Math.exp(-hit * 7) * Math.cos(hit * 18) : 1;
    ctx.save(); ctx.translate(540, 900); ctx.scale(pop, pop);
    ctx.font = FONT(900, 300); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const numW = ctx.measureText(String(n)).width;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(String(n), 6, 110);
    ctx.fillStyle = '#FFFFFF'; ctx.fillText(String(n), 0, 104);
    ctx.font = FONT(900, 96); ctx.fillStyle = C.orange; ctx.textAlign = 'left'; ctx.fillText('吨', numW / 2 + 18, 100);
    ctx.textAlign = 'right'; ctx.fillStyle = '#d8e2f0'; ctx.font = FONT(500, 72); ctx.fillText('约', -numW / 2 - 18, 96);
    ctx.restore();
  }
}

// ============================================================================================ S4 · 四面八方
// Molecules strike a body from every direction (equal arrows all round); the body becomes a thin plate struck equally
// from both sides: equal pushes cancel. Particle paths are straight inbound streaks ending in a spark: illustrative.
export function allDirections(ctx, t) {
  background(ctx, t, 0.3);
  const u = t - T.dirs, m = easeInOut(lin(t, T.plate - 0.3, T.plate + 0.3), 2.5);
  const cx = 540, cy = 860;
  const bw = mix(320, 30, m), bh = mix(320, 600, m), br = mix(160, 10, m);
  // inbound molecules + sparks
  const N = 220;
  for (let i = 0; i < N; i++) {
    const per = 0.9 + 0.6 * hash(i, 1), ph = fract((t + hash(i, 2) * 5) / per);
    let ang = hash(i, 3) * Math.PI * 2;
    if (m > 0.5) ang = (hash(i, 3) < 0.5 ? Math.PI : 0) + (hash(i, 4) - 0.5) * 1.3;   // plate: from left and right
    const dx = Math.cos(ang), dy = Math.sin(ang);
    // surface point toward which it flies
    const sx = cx - dx * (bw / 2 + 4) * (m > 0.5 ? 1 : 1), sy = cy - dy * (m > 0.5 ? (hash(i, 5) - 0.5) * bh * 0.9 / Math.max(0.2, Math.abs(dy) + 0.2) * 0 : bh / 2 + 4);
    const tx = m > 0.5 ? cx - Math.sign(dx) * (bw / 2 + 2) : cx - dx * (bw / 2 + 4), ty = m > 0.5 ? cy + (hash(i, 6) - 0.5) * bh * 0.92 : cy - dy * (bh / 2 + 4);
    const d0 = 420 + 260 * hash(i, 7);
    if (ph < 0.8) {
      const k = ph / 0.8, x = tx + dx * d0 * (1 - k), y = ty + dy * d0 * (1 - k);
      ctx.fillStyle = `rgba(185,220,255,${(0.25 + 0.6 * k).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(185,220,255,${(0.12 * k).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 40, y + dy * 40); ctx.stroke();
    } else {
      const k = (ph - 0.8) / 0.2;
      ctx.fillStyle = `rgba(255,170,100,${(0.9 * (1 - k)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(tx, ty, 4 + 10 * k, 0, Math.PI * 2); ctx.fill();
    }
    void sx; void sy;
  }
  // the body
  ctx.save();
  ctx.fillStyle = '#E9EEF6'; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
  roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, br); ctx.fill();
  ctx.restore();
  // arrows: all round (16), then left/right equal (4+4)
  const aIn = ramp(t, T.dirs + 0.45, T.dirs + 0.85) * (1 - m);
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, L0 = 210, r0 = 165 + 20 + L0, r1 = 175, pul = 8 * Math.sin(t * 5 + k);
    glowArrow(ctx, cx + Math.cos(a) * (r0 + pul), cy + Math.sin(a) * (r0 + pul), cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 16, C.orange, aIn * ramp(t, T.dirs + 0.45 + k * 0.02, T.dirs + 0.7 + k * 0.02));
  }
  const aLR = ramp(t, T.plate + 0.2, T.plate + 0.55);
  for (let k = 0; k < 4; k++) {
    const y = cy - bh * 0.36 + k * bh * 0.24, pul = 6 * Math.sin(t * 6 + k);
    glowArrow(ctx, cx - 300 - pul, y, cx - bw / 2 - 8, y, 18, C.orange, aLR);
    glowArrow(ctx, cx + 300 + pul, y, cx + bw / 2 + 8, y, 18, C.orange, aLR);
  }
  // "=" balance mark under the plate
  const eq = ramp(t, T.plate + 0.5, T.plate + 0.8);
  if (eq > 0) { ctx.save(); ctx.globalAlpha = eq; ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 46, cy + bh / 2 + 70, 92, 12); ctx.fillRect(cx - 46, cy + bh / 2 + 98, 92, 12); ctx.restore(); }
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ============================================================================================ S5 · 车底剖面
// The inverted car (silhouette projected from the same 3D mesh) under the ramp surface. The gap between floor and
// surface is exaggerated. Fan + seal (generic, 原理示意) lower the gap pressure: gap molecules thin out; the outside
// keeps striking the roof side. Many outside pushes (orange) > gap pushes (blue) → one net push toward the surface;
// gravity stays white and world-down, shorter than the push (a margin is needed for the tyres to stay pressed).
export function crossSection(ctx, t, prof) {
  background(ctx, t, 0.5);
  // three framings in one scene: wide → push in on the car for 外面压得更重 → pull back and up for the 5 % bars
  const zIn = easeInOut(lin(t, T.push - 0.2, T.push + 0.35), 2.5), zOut = easeInOut(lin(t, T.five - 0.75, T.five - 0.25), 2.5);
  const zoom = 1 + 0.16 * zIn * (1 - zOut) - 0.14 * zOut, cy0 = 760;
  ctx.save(); ctx.translate(540, cy0 - 90 * zOut); ctx.scale(zoom, zoom); ctx.translate(-540, -cy0);
  // geometry on screen
  const SX = 205, X0 = 540;                  // px per metre along the car; car centre x
  const CEIL = 600, GAP = 34, FLOOR = CEIL + GAP;  // ramp surface y, exaggerated gap, car floor y
  const px = (x) => X0 - x * SX;             // car-local x (nose +) → screen (nose to the left: driving left)
  const py = (z) => FLOOR + (z - 0.2) * 205;   // car-local z (up) → screen down (inverted); the icon's floor (z 0.2) on FLOOR
  // the ramp slab
  const sg = ctx.createLinearGradient(0, CEIL - 170, 0, CEIL); sg.addColorStop(0, '#2a2e36'); sg.addColorStop(1, '#8f939a');
  ctx.fillStyle = sg; ctx.fillRect(-60, CEIL - 170, 1200, 170);
  ctx.fillStyle = '#ff3340'; ctx.fillRect(-60, CEIL - 6, 1200, 6);
  label(ctx, '坡面', 110, CEIL - 120, 40, '#e8ecf2', ramp(t, T.under, T.under + 0.4), 'center', 900);
  // gap air (lower pressure): sparse blue molecules, thinning as the fan works
  const thin = ramp(t, T.fan + 0.2, T.fan + 1.9);
  const gx0 = px(prof.floorX1) + 10, gx1 = px(prof.floorX0) - 10;
  for (let i = 0; i < 90; i++) {
    if (hash(i, 9) < thin * 0.8) continue;
    const x = gx0 + fract(hash(i, 1) + t * 0.05 * (hash(i, 2) - 0.5)) * (gx1 - gx0), y = CEIL + 5 + fract(hash(i, 3) + t * 0.3 * hash(i, 4)) * (GAP - 10);
    ctx.fillStyle = 'rgba(89,184,255,0.9)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // car icon (inverted): a clean side silhouette in car-local metres (x nose +, z up), proportions from the same model
  const body = [[2.24, 0.38], [2.2, 0.52], [2.0, 0.6], [1.3, 0.73], [0.95, 0.82], [0.55, 1.02], [-0.1, 1.09], [-0.75, 1.03],
    [-1.5, 0.86], [-2.0, 0.77], [-2.24, 0.62], [-2.24, 0.42], [-2.0, 0.24], [2.0, 0.24]];
  const P = (pts) => { ctx.beginPath(); pts.forEach(([x, z], i) => { const X = px(x), Y = py(z); if (!i) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }); ctx.closePath(); };
  // smooth the outline with quadratic midpoints
  const smoothPath = (pts) => {
    ctx.beginPath(); const Q = pts.map(([x, z]) => [px(x), py(z)]), n = Q.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m0 = mid(Q[n - 1], Q[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const p1 = Q[i], m = mid(Q[i], Q[(i + 1) % n]); ctx.quadraticCurveTo(p1[0], p1[1], m[0], m[1]); }
    ctx.closePath();
  };
  smoothPath(body);
  const bg = ctx.createLinearGradient(0, FLOOR, 0, py(1.15)); bg.addColorStop(0, '#c9d0da'); bg.addColorStop(1, '#ffffff');
  ctx.fillStyle = bg; ctx.fill();
  // canopy (dark glass) and a waist line
  smoothPath([[0.85, 0.86], [0.5, 1.0], [-0.1, 1.05], [-0.7, 0.99], [-1.1, 0.9], [0.4, 0.86]]);
  ctx.fillStyle = '#141a26'; ctx.fill();
  ctx.strokeStyle = 'rgba(40,50,70,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px(1.9), py(0.52)); ctx.lineTo(px(-2.05), py(0.6)); ctx.stroke();
  void P;
  // wheels touching the surface
  for (const wx of [prof.axleF, prof.axleR]) {
    const X = px(wx), Y = CEIL + prof.wheelR * 205;
    ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(X, Y, prof.wheelR * 205, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9aa0aa'; ctx.beginPath(); ctx.arc(X, Y, prof.wheelR * 205 * 0.58, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(X, Y); ctx.rotate(t * 3.0);
    ctx.fillStyle = '#2b2e34'; for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.fillRect(-5, 8, 10, prof.wheelR * 205 * 0.48); }
    ctx.restore();
  }
  // seal skirts (blue) at both ends of the floor
  const sealK = ramp(t, T.fan, T.fan + 0.35);
  for (const x of [gx0 - 8, gx1 + 8]) { ctx.fillStyle = C.blue; ctx.globalAlpha = sealK; ctx.fillRect(x - 7, CEIL, 14, GAP + 4); ctx.globalAlpha = 1; }
  if (sealK > 0) { ctx.save(); ctx.globalAlpha = sealK; ctx.strokeStyle = C.blue; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx1 + 8, CEIL - 2); ctx.lineTo(760, CEIL - 96); ctx.moveTo(gx0 - 8, CEIL - 2); ctx.lineTo(650, CEIL - 96); ctx.stroke(); ctx.restore(); }
  label(ctx, '密封', 705, CEIL - 124, 38, '#9fd4ff', sealK, 'center', 900);
  // fan (generic): a rotor in the body, pulling air out of the gap and blowing it out behind
  const fanK = ramp(t, T.fan, T.fan + 0.35), FX = px(0.68), FY = FLOOR + 62;
  if (fanK > 0) {
    ctx.save(); ctx.globalAlpha = fanK;
    ctx.fillStyle = '#0f1a2a'; ctx.beginPath(); ctx.arc(FX, FY, 50, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.stroke();
    ctx.translate(FX, FY); ctx.rotate(t * 14);
    ctx.fillStyle = C.blue; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(0, 22, 9, 22, 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    label(ctx, '风扇', FX, FY + 84, 34, '#2f7fd0', fanK, 'center', 900);
    // pulled-out air: a stream from the gap through the fan to the rear
    for (let i = 0; i < 26; i++) {
      const k = fract(t * 0.9 + i / 26), x = mix(FX, px(-2.55), k), y = FY + 6 + 8 * Math.sin(k * 6 + i);
      ctx.fillStyle = `rgba(89,184,255,${(0.8 * (1 - k) * fanK).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    glowArrow(ctx, FX, CEIL + 10, FX, FY - 44, 10, C.blue, fanK * 0.9);
    label(ctx, '抽气', px(-1.95), FY + 46, 34, '#2f7fd0', fanK, 'center', 900);
  }
  // outside air: dense molecules below the car striking the roof side
  const ROOF = [[2.24, 0.38], [2.2, 0.52], [2.0, 0.6], [1.3, 0.73], [0.95, 0.82], [0.55, 1.02], [-0.1, 1.09], [-0.75, 1.03], [-1.5, 0.86], [-2.0, 0.77], [-2.24, 0.62]];
  const roofY = (X) => {   // screen y of the car's outer (roof-side) boundary at screen x
    const x = (X0 - X) / SX;
    for (let i = 0; i < ROOF.length - 1; i++) { const a = ROOF[i], b = ROOF[i + 1]; if ((x - a[0]) * (x - b[0]) <= 0) { const k = (x - a[0]) / ((b[0] - a[0]) || 1); return py(mix(a[1], b[1], k)) + 4; } }
    return null;
  };
  for (let i = 0; i < 260; i++) {
    const X = px(-2.1 + hash(i, 1) * 4.2), top = roofY(X); if (top == null) continue;
    const per = 0.7 + 0.5 * hash(i, 2), ph = fract((t + hash(i, 3) * 4) / per), d0 = 520 * (0.4 + hash(i, 4));
    if (ph < 0.82) { const k = ph / 0.82, y = top + 6 + d0 * (1 - k);
      ctx.fillStyle = `rgba(185,220,255,${(0.3 + 0.6 * k).toFixed(3)})`; ctx.beginPath(); ctx.arc(X, y, 3.4, 0, Math.PI * 2); ctx.fill(); }
    else if (hash(i, 11) < 0.45) { const k = (ph - 0.82) / 0.18; ctx.fillStyle = `rgba(255,150,80,${(0.75 * (1 - k)).toFixed(3)})`; ctx.beginPath(); ctx.arc(X, top + 4, 2 + 7 * k, 0, Math.PI * 2); ctx.fill(); }
  }
  label(ctx, '外面', 540, 1150, 40, '#d8e2f0', ramp(t, T.push - 0.2, T.push + 0.2) * (1 - zIn) * (1 - ramp(t, T.five - 0.6, T.five - 0.3)), 'center', 900);
  // pushes: outside (orange, up) many and long; gap (blue, down) few and short
  const pk = ramp(t, T.push, T.push + 0.45), nk = ramp(t, T.net, T.net + 0.5);
  for (let k = 0; k < 7; k++) {
    const X = px(-1.75 + k * 3.5 / 6), top = roofY(X); if (top == null) continue;
    glowArrow(ctx, X, top + 190 - 40 * nk, X, top + 14, 15 - 4 * nk, C.orange, pk * (1 - 0.4 * nk));
  }
  for (let k = 0; k < 4; k++) {
    const X = mix(gx0 + 50, gx1 - 50, k / 3);
    arrow(ctx, X, CEIL + 4, X, FLOOR - 2, 6, C.blue, pk * (1 - 0.65 * nk), 2.2);
  }
  // net push toward the surface and gravity (white, world-down, shorter)
  if (nk > 0) {
    const X = px(0.1), base = py(1.15) + 290;
    glowArrow(ctx, X, base, X, CEIL + 8, 34, C.orange, nk);
    const gX = px(-0.62), gY = py(0.55);
    glowArrow(ctx, gX, gY, gX, gY + 190 * ramp(t, T.net + 0.35, T.net + 0.8), 14, '#ffffff', nk);
    label(ctx, '重力', gX + 70, gY + 120, 32, '#ffffff', ramp(t, T.net + 0.5, T.net + 0.9), 'left', 900);
  }
  ctx.restore();
  // pressure bars (screen space): outside 100 vs gap ≈ 95 (the 5 % example)
  const bk = ramp(t, T.five - 0.4, T.five + 0.2);
  if (bk > 0) {
    const x0 = 210, w = 720, y0 = 1060;
    [['外面', 1.0, C.orange], ['车底', 0.952, C.blue]].forEach(([s, v, col], k) => {
      const y = y0 + k * 92, ww = w * v * easeOut(bk, 3);
      label(ctx, s, x0 - 24, y + 28, 46, col, bk, 'right', 900);
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0, y, w, 56);
      ctx.fillStyle = col; ctx.globalAlpha = bk; ctx.fillRect(x0, y, ww, 56); ctx.globalAlpha = 1;
    });
    // the 5 % notch
    ctx.save(); ctx.globalAlpha = bk * ramp(t, T.five, T.five + 0.4); ctx.strokeStyle = '#ffffff'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x0 + w * 0.952, y0 - 18); ctx.lineTo(x0 + w * 0.952, y0 + 166); ctx.stroke(); ctx.restore();
  }
}

// the inverted-car side profile from the 3D mesh (car-local x along, z up), for the cross-section
export function carProfile(meta, buf) {
  const e = meta.parts.body, pos = new Float32Array(buf, e.pos, e.vertices * 3), mat = new Uint8Array(buf, e.mat, e.vertices);
  const glassI = meta.materials.indexOf('glass');
  const x0 = meta.x_tail, x1 = meta.x_nose, n = 90, lo = new Array(n).fill(Infinity), hi = new Array(n).fill(-Infinity), gl = new Array(n).fill(-Infinity), gb = new Array(n).fill(Infinity);
  for (let i = 0; i < e.vertices; i++) {
    const x = pos[i * 3], z = pos[i * 3 + 2], k = Math.floor((x - x0) / (x1 - x0) * (n - 1) + 0.5);
    if (k < 0 || k >= n) continue;
    lo[k] = Math.min(lo[k], z); hi[k] = Math.max(hi[k], z);
    if (mat[i] === glassI) { gl[k] = Math.max(gl[k], z); gb[k] = Math.min(gb[k], z); }
  }
  const xs = (k) => x0 + (x1 - x0) * k / (n - 1);
  const top = [], bottom = [], glass = [], gup = [], gdn = [];
  for (let k = 0; k < n; k++) {
    if (!isFinite(lo[k])) continue;
    top.push([xs(k), lo[k]]); bottom.push([xs(k), hi[k]]);
    if (isFinite(gl[k])) { gup.push([xs(k), gl[k]]); gdn.push([xs(k), gb[k]]); }
  }
  glass.push(...gup, ...gdn.reverse());
  const zFloor = Math.min(...top.filter(([x]) => Math.abs(x) < 1.2).map(([, z]) => z));
  const fp = meta.floor_span || [-1.55, 1.5];
  return { top, bottom, glass, zFloor, zTop: Math.max(...bottom.map(([, z]) => z)), x0, x1, axleF: meta.axle_f, axleR: meta.axle_r,
    wheelR: meta.wheel_r, floorX0: fp[0], floorX1: fp[1] };
}
