// viz.js — the film's visual vocabulary, all Canvas 2D, all pure functions of their arguments.
//   the "期待核" (anticipation core): a glowing core with a charge arc; particles stream INTO it while the music builds;
//   a ring of the music's real spectrum (per-frame, from the master); bursts (rings + spray) on each release;
//   the song map: the soundtrack's measured sub-bass energy over film time, waits shaded, drops marked.
import { C, WAITS, DROPS } from './timeline.js';
import { clamp, mix, easeOut, hash } from './lib.js';

let SPRITE = null;
function sprite() {   // a soft round glow, drawn once
  if (SPRITE) return SPRITE;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); SPRITE = c; return c;
}
let TINTED = new Map();
function tinted(color) {   // the glow sprite tinted to a colour (cached)
  if (TINTED.has(color)) return TINTED.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.drawImage(sprite(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 64, 64);
  TINTED.set(color, c); return c;
}
export function dot(ctx, x, y, r, color, a) { if (a <= 0.004 || r <= 0.2) return; ctx.globalAlpha = a; ctx.drawImage(tinted(color), x - r, y - r, 2 * r, 2 * r); }

export function background(ctx, W, H, t, tension) {
  const g = ctx.createRadialGradient(W * 0.46, H * 0.36, 60, W * 0.5, H * 0.5, H * 0.8);
  g.addColorStop(0, '#111a30'); g.addColorStop(0.55, '#080b16'); g.addColorStop(1, '#030409');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // faint drifting dust (depth), a pure function of t
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const x = ((hash(i, 1) * W + t * (6 + 14 * hash(i, 2))) % (W + 40)) - 20, y = (hash(i, 3) * H + Math.sin(t * 0.3 + i) * 12);
    dot(ctx, x, y, 2 + 5 * hash(i, 4), '#8fb7ff', 0.05 + 0.08 * hash(i, 5));
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
export function vignette(ctx, W, H, k) {   // k 0..1: how hard the edges close in (tension)
  const g = ctx.createRadialGradient(W / 2, H * 0.42, H * mix(0.42, 0.22, k), W / 2, H * 0.45, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${mix(0.35, 0.82, k)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// the spectrum ring: 64 bars (32 bands mirrored), the music's real per-frame spectrum
export function spectrumRing(ctx, cx, cy, r, bands, o = {}) {
  const n = 64, len = o.len ?? 190, a = o.alpha ?? 1, rot = o.rot ?? 0;
  if (a <= 0.01) return;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const b = i < 32 ? i : 63 - i, v = bands[b] ** 1.35, th = -Math.PI / 2 + rot + (i + 0.5) / n * Math.PI * 2;
    const r0 = r, r1 = r + 6 + len * v, cs = Math.cos(th), sn = Math.sin(th);
    ctx.strokeStyle = o.color2 && v > 0.55 ? o.color2 : o.color ?? C.wait; ctx.globalAlpha = a * (0.25 + 0.75 * v); ctx.lineWidth = o.width ?? 7;
    ctx.beginPath(); ctx.moveTo(cx + cs * r0, cy + sn * r0); ctx.lineTo(cx + cs * r1, cy + sn * r1); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

// particles streaming into the core while the music builds; charge 0..1 sets density and speed
export function inflow(ctx, cx, cy, t, charge, color = C.wait) {
  if (charge <= 0.01) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const n = 260, R1 = 640, R0 = 150;
  for (let i = 0; i < n; i++) {
    if (hash(i, 9) > 0.25 + 0.75 * charge) continue;
    const th = hash(i, 1) * Math.PI * 2, sp = 0.35 + 0.9 * charge + 0.4 * hash(i, 2);
    const u = (hash(i, 3) + t * sp) % 1, rr = R1 - (R1 - R0) * u * u;
    const L = 14 + 60 * charge * u, cs = Math.cos(th), sn = Math.sin(th);
    ctx.strokeStyle = color; ctx.globalAlpha = (0.15 + 0.6 * charge) * Math.sin(Math.PI * u); ctx.lineWidth = 1.5 + 2.5 * hash(i, 4);
    ctx.beginPath(); ctx.moveTo(cx + cs * rr, cy + sn * rr); ctx.lineTo(cx + cs * (rr + L), cy + sn * (rr + L)); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

// the core and its charge arc. charge 0..1 (wait), release 0..1 (just after a drop), kick 0..1 (pulse)
export function core(ctx, cx, cy, o) {
  const charge = clamp(o.charge ?? 0), rel = clamp(o.release ?? 0), kick = clamp(o.kick ?? 0), t = o.t ?? 0, s = o.scale ?? 1;
  const tremble = charge > 0.85 ? (charge - 0.85) / 0.15 : 0;
  const jx = tremble * 6 * Math.sin(t * 83.1), jy = tremble * 6 * Math.sin(t * 71.7 + 1);
  const x = cx + jx, y = cy + jy, R = s * (96 + 26 * charge + 34 * kick + 40 * rel);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const halo = rel > 0.02 ? C.hit : C.wait;
  dot(ctx, x, y, R * (2.4 + 0.8 * rel), halo, 0.16 + 0.28 * charge + 0.3 * rel + 0.12 * kick);
  dot(ctx, x, y, R * 1.6, halo, 0.35 + 0.3 * charge + 0.4 * rel);
  ctx.restore();
  const g = ctx.createRadialGradient(x - R * 0.25, y - R * 0.3, R * 0.1, x, y, R);
  const inner = rel > 0.02 ? '#ffe3ea' : '#dffbff', outer = rel > 0.02 ? '#ff4d75' : '#1fb9e6';
  g.addColorStop(0, inner); g.addColorStop(0.55, outer); g.addColorStop(1, rel > 0.02 ? 'rgba(120,10,40,0.9)' : 'rgba(8,60,90,0.9)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  // charge arc
  if ((o.arc ?? 1) > 0.01) {
    const ra = s * 190, a0 = -Math.PI / 2;
    ctx.save(); ctx.globalAlpha = o.arc ?? 1; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(160,220,255,0.16)'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.arc(x, y, ra, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 48; k++) {   // ticks
      const th = a0 + (k / 48) * Math.PI * 2, on = k / 48 < charge;
      ctx.strokeStyle = on ? C.wait : 'rgba(160,220,255,0.18)'; ctx.lineWidth = on ? 4 * s : 2 * s;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(th) * (ra + 16 * s), y + Math.sin(th) * (ra + 16 * s)); ctx.lineTo(x + Math.cos(th) * (ra + (on ? 30 : 24) * s), y + Math.sin(th) * (ra + (on ? 30 : 24) * s)); ctx.stroke();
    }
    if (charge > 0.005) {
      ctx.strokeStyle = C.wait; ctx.lineWidth = 10 * s; ctx.shadowColor = C.wait; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.arc(x, y, ra, a0, a0 + charge * Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; const te = a0 + charge * Math.PI * 2;
      ctx.globalCompositeOperation = 'lighter'; dot(ctx, x + Math.cos(te) * ra, y + Math.sin(te) * ra, 34 * s, '#bff6ff', 0.9);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// the release: three rings and a spray; age in s since the drop; power scales the size (the three drops escalate)
export function burst(ctx, cx, cy, age, power = 1, seed = 1) {
  if (age < 0 || age > 2.2) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const a = age - k * 0.09; if (a < 0) continue;
    const u = clamp(a / (0.9 + 0.25 * power)), r = 120 + (700 + 600 * power) * easeOut(u, 2.6);
    ctx.strokeStyle = k === 1 ? '#ffffff' : C.hit; ctx.globalAlpha = (1 - u) ** 1.6 * (0.9 - 0.2 * k); ctx.lineWidth = (18 - 5 * k) * (1 - u) + 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  const n = Math.round(160 + 220 * power);
  for (let i = 0; i < n; i++) {
    const th = hash(i, seed) * Math.PI * 2, v = 380 + 1300 * power * hash(i, seed + 1) ** 1.5, life = 0.8 + 1.2 * hash(i, seed + 2);
    if (age > life) continue;
    const d = 110 + v * (1 - Math.exp(-age * 3.2)) / 3.2, u = age / life;
    dot(ctx, cx + Math.cos(th) * d, cy + Math.sin(th) * d, 3 + 9 * (1 - u) * hash(i, seed + 3), hash(i, seed + 4) > 0.65 ? '#ffffff' : C.hit, (1 - u) ** 1.2);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
export function flash(ctx, W, H, cx, cy, age, power = 1) {   // a coloured bloom, never a white frame
  if (age < 0 || age > 0.6) return;
  const k = Math.exp(-age * 9) * (0.2 + 0.1 * power), g = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 0.55);
  g.addColorStop(0, `rgba(255,120,150,${k})`); g.addColorStop(1, 'rgba(255,60,100,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// the song map: measured sub-bass of the film's own soundtrack, film time 0..end, waits shaded, drops marked
export function songMap(ctx, x0, y0, w, h, sub, fps, end, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.01) return;
  const X = (tt) => x0 + (tt / end) * w, n = sub.length;
  ctx.save(); ctx.globalAlpha = a;
  for (const [w0, w1] of WAITS) {   // the waits
    const k = o.waitGlow ?? 0.6;
    const g = ctx.createLinearGradient(X(w0), 0, X(w1), 0); g.addColorStop(0, 'rgba(70,227,255,0.04)'); g.addColorStop(1, `rgba(70,227,255,${0.12 + 0.3 * k})`);
    ctx.fillStyle = g; ctx.fillRect(X(w0), y0 - h, X(w1) - X(w0), h + 8);
  }
  // the curve (smoothed over 5 frames), as a filled area
  ctx.beginPath(); ctx.moveTo(X(0), y0);
  const upto = Math.min(n - 1, Math.floor((o.until ?? end) * fps));
  for (let i = 0; i <= upto; i += 2) {
    let v = 0, c = 0; for (let j = -4; j <= 4; j++) { const q = sub[Math.max(0, Math.min(n - 1, i + j))]; v += q; c++; }
    ctx.lineTo(X(i / fps), y0 - h * 0.92 * (v / c));
  }
  ctx.lineTo(X(upto / fps), y0); ctx.closePath();
  const gf = ctx.createLinearGradient(0, y0 - h, 0, y0); gf.addColorStop(0, 'rgba(220,235,255,0.55)'); gf.addColorStop(1, 'rgba(220,235,255,0.06)');
  ctx.fillStyle = gf; ctx.fill();
  ctx.strokeStyle = 'rgba(220,235,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 + 1); ctx.lineTo(x0 + w, y0 + 1); ctx.stroke();
  for (const d of DROPS) if (d <= (o.until ?? end) + 0.01) {
    ctx.strokeStyle = C.hit; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(d), y0 + 10); ctx.lineTo(X(d), y0 - h - 8); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, X(d), y0 - h - 8, 18, C.hit, a); ctx.restore();
  }
  if (o.labels) {
    ctx.font = '900 40px "NSC", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const [w0, w1] of WAITS) { ctx.fillStyle = C.wait; ctx.globalAlpha = a * o.labels; ctx.fillText('等', Math.min((X(w0) + X(w1)) / 2, X(w1) - 22), y0 - h - 18); }
    for (const d of DROPS) if (d <= (o.until ?? end) + 0.01) { ctx.fillStyle = C.hit; ctx.fillText('落', X(d) + 26, y0 - h - 18); }
  }
  if (o.playhead != null) {
    ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(o.playhead), y0 + 14); ctx.lineTo(X(o.playhead), y0 - h - 4); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, X(o.playhead), y0 - h - 4, 16, '#ffffff', a); ctx.restore();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

// the study's idea, drawn generically (not this song): an intensity line rising to a chill peak; the seconds before shaded
export function chillLine(ctx, x0, y0, w, h, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.01) return;
  const P = 0.72, f = (u) => 0.18 + 0.12 * Math.sin(u * 23) * 0.3 + (u < P ? 0.55 * (u / P) ** 2.2 : 0.55 + 0.4 * Math.exp(-(((u - P) * 14) ** 2)) - 0.35 * clamp((u - P) / 0.28));
  const X = (u) => x0 + u * w, Y = (v) => y0 - v * h;
  const reveal = o.reveal ?? 1;
  ctx.save(); ctx.globalAlpha = a;
  // the shaded window before the peak
  const ws = o.window ?? 0;
  if (ws > 0.01) { const g = ctx.createLinearGradient(X(P - 0.22), 0, X(P), 0); g.addColorStop(0, 'rgba(70,227,255,0.02)'); g.addColorStop(1, `rgba(70,227,255,${0.35 * ws})`); ctx.fillStyle = g; ctx.fillRect(X(P - 0.22), Y(1.05), X(P) - X(P - 0.22), h * 1.05); }
  ctx.strokeStyle = 'rgba(230,240,255,0.85)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  for (let i = 0; i <= 200 * reveal; i++) { const u = i / 200; i ? ctx.lineTo(X(u), Y(f(u))) : ctx.moveTo(X(u), Y(f(u))); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,215,240,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), y0 + 2); ctx.lineTo(X(1), y0 + 2); ctx.stroke();
  ctx.font = '500 32px "NSC", sans-serif'; ctx.fillStyle = C.dim; ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('时间', X(1), y0 + 10);
  const pk = o.peak ?? 0;
  if (pk > 0.01 && reveal > P) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, X(P), Y(f(P)), 46, C.hit, pk); dot(ctx, X(P), Y(f(P)), 14, '#ffffff', pk); ctx.restore();
    ctx.globalAlpha = a * pk; ctx.font = '900 40px "NSC", sans-serif'; ctx.fillStyle = C.hit; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('起鸡皮疙瘩', X(P), Y(f(P)) - 34);
  }
  if (ws > 0.01) { ctx.globalAlpha = a * ws; ctx.font = '900 38px "NSC", sans-serif'; ctx.fillStyle = C.wait; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('快到时', X(P - 0.11), y0 + 12); }
  if (o.playhead != null) { const u = o.playhead; ctx.globalAlpha = a; ctx.save(); ctx.globalCompositeOperation = 'lighter'; dot(ctx, X(u), Y(f(u)), 22, '#ffffff', 1); ctx.restore(); }
  ctx.restore(); ctx.globalAlpha = 1;
  return { peakX: X(P), peakY: Y(f(P)), P };
}
