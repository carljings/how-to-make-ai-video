// film.js — 《这首开智小曲，为什么上头？》 full film, flat 2D (Canvas). Every frame is a pure function of its number.
// window.film = { ready, error, frameCount, render(f), grab(type, q), textBoxes(f) } for tools/render.mjs.
// Palette = Anthropic's published brand colours (plan.js C). Clawd is a flat pixel sprite drawn in exactly CLAWD_FILL /
// CLAWD_EYE, never lit, tinted, blurred or blended.
import { CUES } from './cues.js';
import { E, FRAMES, END, C, CLAWD_FILL, CLAWD_EYE, ACT, actOf, GRID_A, GRID_B, MISS, DROP_RING, DROP_RING_B, LEARN, SHIFT_B, HEAD, ANSWER, ANSWER_NOTE, ANSWER_T0, CALL, FOOT,
  rms, sub, lastOnset, clawdPose, clamp, lerp, smooth, easeOut, easeInOut, hash } from './plan.js';

const W = 1080, H = 1920, FPS = CUES.fps;
const film = (window.film = { ready: false, error: null, frameCount: FRAMES });
window.addEventListener('error', (e) => { film.error = String((e.error && e.error.stack) || e.message); });
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; document.body.appendChild(cv);
const g = cv.getContext('2d');
const FONT = (w, px) => `${w} ${px}px "NSC${w}"`;
let boxes = [];
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// ───────── text ─────────
function textLine(l, cx, y, a) {
  g.font = FONT(l.w, l.px);
  const parts = l.accent && l.s.includes(l.accent) ? [l.s.slice(0, l.s.indexOf(l.accent)), l.accent, l.s.slice(l.s.indexOf(l.accent) + l.accent.length)] : [l.s];
  const ws = parts.map((p) => g.measureText(p).width), tw = ws.reduce((x, z) => x + z, 0); let x = cx - tw / 2;
  boxes.push({ s: l.s, x0: x, x1: x + tw, y0: y - l.px * 0.9, y1: y + l.px * 0.15, a });
  parts.forEach((p, i) => { g.fillStyle = l.accent && i === 1 ? l.ac : C.light; g.fillText(p, x, y); x += ws[i]; });
}
function headline(h, t) {
  const tin = t - h.from, a = Math.min(h.from <= 0 ? 1 : smooth(tin / 0.16), smooth((h.to - t) / 0.14)); if (a <= 0) return;
  const punch = h.punch ? 1 + 0.2 * Math.exp(-tin * 9) : 1;
  g.save(); g.globalAlpha = a; g.textBaseline = 'alphabetic';
  if (h.from > 0) g.filter = `blur(${(6 * (1 - smooth(tin / 0.16))).toFixed(2)}px)`;
  let y = 225;
  for (const l of h.lines) { const L = { ...l, px: l.px * punch }; y += L.px * 1.04; textLine(L, W / 2, y, a); y += 12; }
  g.restore();
}
function callout(c, t, ax, ay, side, dy) {
  const a = Math.min(smooth((t - c.from) / 0.14), smooth((c.to - t) / 0.12)); if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.font = FONT(900, 44);
  const tw = g.measureText(c.s).width, bw = tw + 40, bh = 70;
  const bx = clamp(side < 0 ? ax - 60 - bw : ax + 60, 64, 936 - bw), by = clamp(ay + dy - bh / 2, 560, 1480);
  g.strokeStyle = c.c; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(side < 0 ? bx + bw : bx, by + bh / 2); g.stroke();
  g.fillStyle = c.c; g.beginPath(); g.arc(ax, ay, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = rgba(C.dark, 0.9); g.lineWidth = 2.5; rr(bx, by, bw, bh, 14); g.fill(); g.stroke();
  g.fillStyle = c.c; g.textBaseline = 'middle'; g.fillText(c.s, bx + 20, by + bh / 2 + 3);
  boxes.push({ s: c.s, x0: bx, x1: bx + bw, y0: by, y1: by + bh, a }); g.restore();
}
function label(s, x, y, px, color, a = 1, align = 'center', w = 900) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = FONT(w, px); g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  const tw = g.measureText(s).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
  g.fillText(s, x, y); boxes.push({ s, x0, x1: x0 + tw, y0: y - px * 0.9, y1: y + px * 0.15, a }); g.restore();
}
function footnote(t) {
  for (const f of FOOT) { const a = Math.min(smooth((t - f.from) / 0.3), smooth((f.to - t) / 0.2)); if (a <= 0) continue;
    f.lines.forEach((s, i) => label(s, W / 2, 1494 + i * 44, 30, C.grey, a, 'center', 500)); }
}
function bracket(s, x0, x1, y, a, color, below = false) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = 3; const d = below ? -14 : 14;
  g.beginPath(); g.moveTo(x0, y + d); g.lineTo(x0, y); g.lineTo(x1, y); g.lineTo(x1, y + d); g.stroke(); g.restore();
  g.save(); g.font = FONT(900, 42); const tw = g.measureText(s).width; g.restore();   // keep the whole word inside x 60–940
  label(s, clamp((x0 + x1) / 2, 66 + tw / 2, 934 - tw / 2), below ? y + 50 : y - 14, 42, color, a);
}

// ───────── Clawd: flat pixel sprite (grid measured from the official app animation) ─────────
// 12×8 grid: body cols 2–9 rows 0–5, eyes (3,1) (8,1), arms cols 0–1 / 10–11 rows 2–3, legs cols 2,4,7,9 rows 6–7
function clawd(cx, footY, u, p) {
  g.save();
  g.translate(cx, footY - p.y); g.rotate(p.roll); g.scale(p.flip, 1);
  const sy = p.sy, sx = 1 / Math.sqrt(Math.max(0.5, sy)), legH = 2 * u * (1 - 0.45 * p.tuck);
  const bodyB = -legH, bodyH = 6 * u * sy, bodyW = 8 * u * sx, bx = -bodyW / 2, by = bodyB - bodyH;
  g.fillStyle = CLAWD_FILL;
  for (const c of [2, 4, 7, 9]) g.fillRect(((c - 6) * u) * sx, -legH, u * sx + 0.5, legH + 0.5);
  g.fillRect(bx, by, bodyW, bodyH + 0.5);
  const armY = (r) => by + 2 * u * sy - r * u;
  g.fillRect(bx - 2 * u * sx, armY(p.arm[0]), 2 * u * sx + 0.5, 2 * u * sy);
  g.save(); g.translate(bx + bodyW, armY(p.arm[1]) + 2 * u * sy); g.rotate(-0.35 * p.wave); g.fillRect(0, -2 * u * sy, 2 * u * sx, 2 * u * sy); g.restore();
  g.fillStyle = CLAWD_EYE;
  const eh = u * sy * p.blink, ey = by + u * sy + (u * sy - eh) / 2 + p.eye[1] * u;
  for (const c of [3, 8]) g.fillRect(((c - 6) * u + p.eye[0] * u) * sx, ey, u * sx, eh);
  g.restore();
}

// ───────── the sound strip: measured bars (grey = loudness, orange base = bass), expectation rings (示意), "现在" ─────────
function strip(t, o) {
  // o: { cx, base, ringY, k, hMax, a, grid, missRing, dropRing, rings, tOff (ghost shift), color, showNow }
  const tt = t - (o.tOff || 0), left = o.cx / o.k + 0.2, w = Math.max(3, (o.k / 15) * 0.66);
  g.save(); g.globalAlpha = o.a;
  for (let i = Math.max(0, Math.floor((tt - left) * 15)); i * (1 / 15) <= tt; i++) {
    const te = i / 15, x = o.cx + (te - tt) * o.k; if (x < -10) continue;
    const h = 14 + o.hMax * rms(te + (o.tOff || 0) * 0 + 0), hb = Math.min(h, 8 + o.hMax * 0.8 * sub(te) ** 1.3);
    const fresh = tt - te < 0.22;
    g.fillStyle = o.color || (fresh ? C.light : C.grey); rr(x - w / 2, o.base - h, w, h, Math.min(3, w / 2)); g.fill();
    if (!o.color) { g.fillStyle = C.orange; rr(x - w / 2, o.base - hb, w, hb, Math.min(3, w / 2)); g.fill(); }
  }
  g.restore();
  if (o.rings) {
    const learnA = 0.3 + 0.7 * smooth((tt - LEARN) / 0.35), ks = Math.max(0.45, o.k / 300);
    for (const R of o.grid) {
      const x = o.cx + (R.t - tt) * o.k; if (x < -80 || x > W + 80) continue;
      let r = (R === o.dropRing ? 46 : R.bar ? 30 : 20) * ks;
      if (R === o.dropRing && o.swell) r *= 1 + o.swell(tt);
      const hitT = R.onset ?? R.t, met = R.hit && tt >= hitT, missed = !R.hit && tt >= R.t;
      if (met) r *= 1 + 0.35 * Math.exp(-(tt - hitT) * 9);
      if (missed) r *= 1 + 0.15 * Math.sin((tt - R.t) * 20) * Math.exp(-(tt - R.t) * 2.5);
      const a = o.a * (R.t > tt ? learnA * clamp((W + 60 - x) / 160) : 1);
      g.save(); g.globalAlpha = a;
      if (met) { g.fillStyle = R === o.dropRing ? C.orange : C.light; g.beginPath(); g.arc(x, o.ringY, r, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = missed ? C.blue : met ? (R === o.dropRing ? C.orange : C.light) : C.pale; g.lineWidth = (R === o.dropRing ? 7 : 5) * Math.max(0.6, ks);
      g.beginPath(); g.arc(x, o.ringY, r, 0, Math.PI * 2); g.stroke();
      if (met && tt - hitT < 0.22) {                                                  // the attack reaches up to its ring
        const top = o.base - 14 - o.hMax * rms(hitT + (o.tOff || 0) * 0); g.globalAlpha = a * (1 - (tt - hitT) / 0.22);
        g.strokeStyle = R === o.dropRing ? C.orange : C.light; g.lineWidth = R === o.dropRing ? 10 : 4; g.beginPath(); g.moveTo(x, top); g.lineTo(x, o.ringY + r); g.stroke();
      }
      g.restore();
    }
  }
  if (o.showNow) {
    g.save(); g.globalAlpha = o.a * o.showNow; g.strokeStyle = C.light; g.lineWidth = 3;
    g.beginPath(); g.moveTo(o.cx, o.ringY - 80); g.lineTo(o.cx, o.base + 10); g.stroke();
    g.fillStyle = C.light; g.beginPath(); g.moveTo(o.cx - 13, o.ringY - 96); g.lineTo(o.cx + 13, o.ringY - 96); g.lineTo(o.cx, o.ringY - 78); g.fill(); g.restore();
    const na = o.a * smooth((o.showNow - 0.1) / 0.3);    // the label leaves before the playhead reaches the edge
    if (o.cx > 780) label('现在', Math.min(o.cx - 14, 936), o.base + 46, 38, C.light, na, 'right'); else label('现在', o.cx + 14, o.base + 46, 38, C.light, na, 'left');
  }
}
const ringX = (o, R, t) => o.cx + (R.t - (t - (o.tOff || 0))) * o.k;

// ───────── the brain schematic (sagittal, flat; 示意) ─────────
function brain(cx, cy, s, caud, nacc, a, draw) {
  g.save(); g.globalAlpha = a; g.translate(cx, cy); g.scale(s, s);
  const outline = new Path2D('M-300 40 C-320 -80 -250 -200 -120 -235 C0 -265 150 -250 240 -170 C310 -110 330 -10 300 60 C285 100 250 120 200 125 L120 128 C90 128 70 140 62 165 L50 230 C47 245 25 250 20 236 L5 170 C-10 140 -40 128 -80 125 C-160 120 -280 110 -300 40 Z');
  const cereb = new Path2D('M150 128 C180 130 250 128 280 100 C300 140 270 185 215 190 C170 192 140 165 150 128 Z');
  g.fillStyle = C.dark2; g.fill(outline); g.fill(cereb);
  g.lineWidth = 5; g.strokeStyle = C.pale;
  g.setLineDash([2400, 2400]); g.lineDashOffset = 2400 * (1 - draw); g.stroke(outline); g.stroke(cereb); g.setLineDash([]);
  g.globalAlpha = a * 0.35 * draw; g.lineWidth = 3;
  for (const d of ['M-220 -120 C-170 -150 -120 -140 -90 -170', 'M-40 -200 C0 -170 40 -175 80 -205', 'M140 -150 C170 -110 220 -110 250 -60', 'M-250 0 C-200 -30 -150 -10 -120 -40'])
    g.stroke(new Path2D(d));
  g.globalAlpha = a;
  // caudate: head (front, left) → body arching over → tail curling down at the back
  const caudP = new Path2D('M-150 30 C-170 -60 -110 -130 -10 -135 C90 -138 150 -90 160 -20 C165 20 140 55 105 62');
  g.lineCap = 'round'; g.lineWidth = 34; g.strokeStyle = rgba(C.pale, 0.16); g.stroke(caudP);
  if (caud > 0) { g.save(); g.shadowColor = C.blue; g.shadowBlur = 40 * caud; g.strokeStyle = rgba(C.blue, 0.35 + 0.65 * caud); g.lineWidth = 34; g.stroke(caudP); g.restore(); }
  // nucleus accumbens: small, below the caudate head
  g.beginPath(); g.ellipse(-140, 72, 34, 24, -0.3, 0, Math.PI * 2); g.fillStyle = rgba(C.pale, 0.18); g.fill();
  if (nacc > 0) { g.save(); g.shadowColor = C.orange; g.shadowBlur = 50 * nacc; g.fillStyle = rgba(C.orange, 0.35 + 0.65 * nacc); g.beginPath(); g.ellipse(-140, 72, 34 * (1 + 0.15 * nacc), 24 * (1 + 0.15 * nacc), -0.3, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.restore();
}

// ───────── the uncertainty × surprise map (Cheung 2019, schematic) ─────────
function mapView(cx, cy, size, a, hiTL, hiBR) {
  const x0 = cx - size / 2, y0 = cy - size / 2;
  g.save(); g.globalAlpha = a;
  g.fillStyle = C.dark2; rr(x0, y0, size, size, 28); g.fill();
  g.save(); rr(x0, y0, size, size, 28); g.clip();
  for (const [zx, zy, hi] of [[x0 + size * 0.22, y0 + size * 0.22, hiTL], [x0 + size * 0.78, y0 + size * 0.78, hiBR]]) {
    const gr = g.createRadialGradient(zx, zy, 0, zx, zy, size * 0.42); gr.addColorStop(0, rgba(C.orange, 0.45 + 0.4 * hi)); gr.addColorStop(1, rgba(C.orange, 0));
    g.fillStyle = gr; g.fillRect(x0, y0, size, size);
  }
  g.strokeStyle = rgba(C.pale, 0.12); g.lineWidth = 2;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x0 + (size * i) / 4, y0); g.lineTo(x0 + (size * i) / 4, y0 + size); g.stroke(); g.beginPath(); g.moveTo(x0, y0 + (size * i) / 4); g.lineTo(x0 + size, y0 + (size * i) / 4); g.stroke(); }
  g.restore();
  g.strokeStyle = C.pale; g.lineWidth = 4; rr(x0, y0, size, size, 28); g.stroke();
  g.restore();
  label('更好听', x0 + size * 0.22, y0 + size * 0.22 + 14, 44, C.light, a * (0.5 + 0.5 * hiTL));
  label('更好听', x0 + size * 0.78, y0 + size * 0.78 + 14, 44, C.light, a * (0.5 + 0.5 * hiBR));
  label('不确定性：难猜 →', cx, y0 + size + 62, 40, C.pale, a);
  label('意外 ↑', x0 + 4, y0 - 22, 40, C.pale, a, 'left');
  label('示意', x0 + size - 6, y0 - 22, 32, C.grey, a, 'right', 500);
}

// ───────── per frame ─────────
const sceneShake = (t) => {
  let k = 0; for (const d of [E.drop, E.drop3, E.dropB]) if (t >= d) k += 14 * Math.exp(-(t - d) * 7);
  return [k * (hash(t * 30 * 1.7) - 0.5), k * (hash(t * 30 * 2.3 + 5) - 0.5)];
};
const flashAt = (t) => [E.drop, E.drop3, E.dropB].reduce((s, d) => s + (t >= d ? Math.exp(-(t - d) * 3.5) : 0), 0);
const actMix = (t, a, b, d = 0.6) => smooth((t - a) / d) * (1 - smooth((t - b + d * 0.5) / (d * 0.5)));

function frame(f) {
  const t = f / FPS; boxes = [];
  // background: brand dark, a soft centre lift, and a warm bloom on each drop
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none';
  g.fillStyle = C.dark; g.fillRect(0, 0, W, H);
  const bg = g.createRadialGradient(W / 2, 980, 0, W / 2, 980, 1000); bg.addColorStop(0, C.dark2); bg.addColorStop(1, C.dark); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const fl = flashAt(t); if (fl > 0.01) { const fg = g.createRadialGradient(W / 2, 900, 0, W / 2, 900, 1100); fg.addColorStop(0, rgba(C.orange, 0.22 * Math.min(1, fl))); fg.addColorStop(1, rgba(C.orange, 0)); g.fillStyle = fg; g.fillRect(0, 0, W, H); }
  const [shx, shy] = sceneShake(t); g.setTransform(1, 0, 0, 1, shx, shy);
  const pose = clawdPose(t);

  // ── act ①: the rule (0 – 9.9) and its recap
  const aRule = 1 - smooth((t - 9.9) / 0.5);
  if (aRule > 0) {
    const rec = easeInOut((t - 8.45) / 0.8), k = lerp(300, 910 / 9.9, rec), cx = lerp(540, 1000, rec);
    const o = { cx, base: 1180, ringY: 760, k, hMax: 400, a: aRule, grid: GRID_A, dropRing: DROP_RING, rings: true, showNow: 1 - rec,
      swell: (tt) => (tt < E.drop ? 0.5 * smooth((tt - E.build_downbeat) / (E.drop - E.build_downbeat)) : 0) };
    strip(t, o);
    // the drop's shock ring
    if (t >= E.drop && t < E.drop + 1) { g.save(); g.globalAlpha = aRule * Math.exp(-(t - E.drop) * 3); g.strokeStyle = C.orange; g.lineWidth = 6; g.beginPath(); g.arc(cx, 760, 50 + (t - E.drop) * 900, 0, Math.PI * 2); g.stroke(); g.restore(); }
    // callouts
    const newest = Math.max(0, Math.floor(t * 15) / 15 - 0.25);
    callout(CALL.heard, t, cx + (newest - t) * k, 1180 - 14 - 400 * rms(newest), -1, 150);
    const next = GRID_A.find((R) => R.t > t + 0.2); if (next) callout(CALL.expect, t, ringX(o, next, t), 760 - 22, 1, -150);
    callout(CALL.miss, t, ringX(o, MISS, t), 760 - 24, -1, -150);
    callout(CALL.big, t, ringX(o, DROP_RING, t), 760 - 46 * (1 + o.swell(t)), -1, -150);
    callout(CALL.bass, t, cx - 0.15 * k, 1150, 1, -170);
    if (t >= 8.9) { const ra = smooth((t - 9.0) / 0.3) * aRule, gx = (R) => ringX(o, R, t);
      bracket('规律', gx(GRID_A[0]) - 14, gx(GRID_A[5]) + 14, 700, ra, C.light);
      bracket('少一下', gx(MISS) - 16, gx(MISS) + 16, 820, ra, C.blue, true);
      bracket('等到', gx(DROP_RING) - 22, gx(DROP_RING) + 22, 700, ra, C.orange); }
  }

  // ── act ②: waiting vs the peak (Salimpoor 2011), on the song's next real build and drop
  const aRew = actMix(t, 9.9, ACT.reward[1]);
  if (aRew > 0) {
    const draw = easeOut((t - 10.0) / 1.0);
    const caud = t >= E.thin2 && t < E.drop3 + 0.6 ? smooth((t - E.thin2) / 1.2) * (t < E.drop3 ? 1 : 1 - smooth((t - E.drop3) / 0.6)) * (0.8 + 0.2 * Math.sin(t * 9)) : 0;
    const nacc = t >= E.drop3 ? Math.exp(-(t - E.drop3) * 0.8) * (0.85 + 0.15 * sub(t)) : 0;
    const s = 1.2, BX = 500, BY = 830;
    brain(BX, BY, s, caud, nacc, aRew, draw);
    const lab = smooth((t - 11.0) / 0.4) * aRew;
    // leader labels
    g.save(); g.globalAlpha = lab; g.strokeStyle = C.pale; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(BX + 40 * s, BY - 135 * s); g.lineTo(752, 580); g.stroke();
    g.beginPath(); g.moveTo(BX - 140 * s, BY + 72 * s); g.lineTo(230, 1050); g.stroke(); g.restore();
    label('尾状核', 760, 595, 52, caud > 0.2 ? C.blue : C.light, lab, 'left');
    label('伏隔核', 236, 1100, 52, nacc > 0.2 ? C.orange : C.light, lab, 'right');
    label('示意', 150, 640, 32, C.grey, lab, 'left', 500);   // top-left of the brain: never hidden under Clawd
    // the mini timeline: the real build and drop, with the two phases marked
    const o = { cx: 540, base: 1380, ringY: 1200, k: 210, hMax: 150, a: aRew, grid: [], rings: false, showNow: 0 };
    const band = (t0, t1, col, txt) => { const x0 = 540 + (t0 - t) * 210, x1 = 540 + (t1 - t) * 210; if (x1 < 0 || x0 > W) return;
      g.save(); g.globalAlpha = aRew * 0.9; g.fillStyle = rgba(col, 0.2); rr(x0, 1190, x1 - x0, 196, 12); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke(); g.restore();
      label(txt, clamp((x0 + x1) / 2, 110, 890), 1235, 40, col, aRew); };
    band(E.thin2, E.drop3, C.blue, '期待'); band(E.drop3, E.drop3 + 1.6, C.orange, '高潮');
    strip(t, o);
    g.save(); g.globalAlpha = aRew; g.strokeStyle = C.light; g.lineWidth = 3; g.beginPath(); g.moveTo(540, 1180); g.lineTo(540, 1392); g.stroke(); g.restore();
  }

  // ── act ③: uncertainty × surprise (Cheung 2019, chords), Clawd as the probe
  const aMap = actMix(t, ACT.balance[0] + 0.05, ACT.balance[1]);
  let probe = null;
  if (aMap > 0) {
    const show = easeOut((t - E.bar17) / 0.5), size = 760 * (0.85 + 0.15 * show), cx = 540, cy = 960;
    const hiTL = t >= E.join ? smooth((t - E.join - 0.3) / 0.3) * (t < E.bar5b ? 1 : 0.35) : 0, hiBR = t >= E.bar5b ? smooth((t - E.bar5b - 0.3) / 0.3) : 0;
    mapView(cx, cy, size, aMap * show, hiTL, hiBR);
    const x0 = cx - size / 2, y0 = cy - size / 2, P = (u, v) => [x0 + size * u, y0 + size * v];
    const path = [[E.bar17, P(0.5, 0.62)], [E.join, P(0.24, 0.36)], [E.bar5b, P(0.76, 0.86)]];
    let pos = path[0][1]; for (let i = 1; i < path.length; i++) if (t >= path[i][0]) { const u = easeInOut((t - path[i][0]) / 0.5); pos = [lerp(path[i - 1][1][0], path[i][1][0], u), lerp(path[i - 1][1][1], path[i][1][1], u) - 140 * Math.sin(Math.PI * clamp(u))]; }
    if (show > 0.05) probe = { x: pos[0], y: pos[1] + 70, u: 15, a: aMap * show };
  }

  // ── act ④: the same build again (measured: identical source audio) — the first pass as a ghost row
  const aAg = actMix(t, ACT.again[0] + 0.05, ACT.again[1] + 0.2, 0.6);
  if (aAg > 0) {
    label('第一遍', 70, 690, 40, C.green, aAg * smooth((t - E.thinB + 0.2) / 0.3), 'left');
    label('这一遍', 70, 1010, 40, C.light, aAg, 'left');
    if (t >= E.thinB - 0.05) strip(t, { cx: 540, base: 900, ringY: 0, k: 300, hMax: 190, a: aAg * 0.9, grid: [], rings: false, showNow: 0, tOff: SHIFT_B, color: C.green });
    strip(t, { cx: 540, base: 1290, ringY: 1060, k: 300, hMax: 200, a: aAg, grid: GRID_B, dropRing: DROP_RING_B, rings: true, showNow: 1 });
    if (t >= E.dropB && t < E.dropB + 1) { g.save(); g.globalAlpha = aAg * Math.exp(-(t - E.dropB) * 3); g.strokeStyle = C.orange; g.lineWidth = 6; g.beginPath(); g.arc(540, 1060, 50 + (t - E.dropB) * 900, 0, Math.PI * 2); g.stroke(); g.restore(); }
    callout(CALL.same, t, 540 - 0.6 * 300, 900 - 120, -1, -170);
  }

  // ── the answer: the record shrinks to a band; four reasons arrive on the beat; the music fades; hold
  const aAns = smooth((t - (ACT.answer[0] - 0.4)) / 0.7);
  if (aAns > 0) {
    strip(t, { cx: lerp(540, 980, aAns), base: 1420, ringY: 0, k: lerp(300, 120, aAns), hMax: 120, a: 0.75 * aAns, grid: [], rings: false, showNow: 0 });
    ANSWER.forEach((r, i) => { const t0 = ANSWER_T0 + 0.532 * i, a = smooth((t - t0) / 0.2), y = 560 + i * 128;
      if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = r.c; g.beginPath(); g.arc(102, y - 20, 22, 0, Math.PI * 2); g.fill(); g.restore();
      label(r.n, 102, y - 4, 32, C.dark, a); label(r.s, 144, y, 54, C.light, a, 'left'); });
    label(ANSWER_NOTE, W / 2, 1110, 36, C.grey, smooth((t - (ANSWER_T0 + 3.0)) / 0.3), 'center', 500);
  }

  // ── Clawd (flat, exact brand colour), placed per act
  const place = (k) => ({ rule: [540, 1470, 24], reward: [870, 1186, 20], again: [840, 1430, 22], answer: [740, 1560, 24] }[k]);   // clear of the right-edge app UI
  let cp;
  const ak = actOf(t);
  if (ak === 'balance' && probe) cp = [probe.x, probe.y, probe.u];
  else {
    const order = ['rule', 'reward', 'balance', 'again', 'answer'], i = order.indexOf(ak), k0 = ACT[ak][0];
    const cur = ak === 'balance' ? [540, 1560, 18] : place(ak), prev = i > 0 ? (order[i - 1] === 'balance' ? [540, 1560, 18] : place(order[i - 1])) : cur;
    const u = easeInOut((t - k0) / 0.7); cp = [lerp(prev[0], cur[0], u), lerp(prev[1], cur[1], u), lerp(prev[2], cur[2], u)];
    if (ak === 'rule' && t >= 8.45) cp = [lerp(540, 830, easeInOut((t - 8.45) / 0.8)), 1470, 24];
  }
  if (ak === 'reward') pose.eye = [0.25, -0.2];
  clawd(cp[0], cp[1], cp[2], pose);

  // ── text on top (no shake)
  g.setTransform(1, 0, 0, 1, 0, 0);
  for (const h of HEAD) if (t >= h.from - 1e-6 && t < h.to) headline(h, t);
  footnote(t);
}

film.render = async (f) => { frame(f); };
film.grab = (type = 'image/png', q = 0.95) => cv.toDataURL(type, q);
film.textBoxes = (f) => { frame(f); return boxes.map((b) => ({ f, ...b })); };
(async () => {
  try {
    for (const w of [500, 900]) { const ff = new FontFace(`NSC${w}`, `url(assets/fonts/NotoSansSC-${w}.woff2)`, { weight: String(w) }); await ff.load(); document.fonts.add(ff); }
    frame(0); film.ready = true;
  } catch (e) { film.error = String((e && e.stack) || e); }
})();
