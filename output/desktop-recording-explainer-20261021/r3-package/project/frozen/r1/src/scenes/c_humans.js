// c_humans.js — 8 let humans judge (A/B clips → learned preference → chat AI) · 9 case card 03 · 10 hook 3 (quiet) and
// the reveal: the hand hovers between the camera and the object (Christiano et al. 2017 / OpenAI 2017 / DeepMind 2020,
// docs/SCIENCE.md #7–9). The robot, the clips, the chat UI and the ball are illustrations (the source says "object").
import { W, H, TAU, C, rgba, mix, clamp, lerp, E, F, font, hash, vnoise, frameIdx, keys, pulse, DB, BT, lw, sm, prog } from '../lib/core.js';
import { mk, glow, spark, trail, grid, hatch, roundRect, arrow, check, cross, paper, stamp, scoreBox, steppedValue, thumb } from '../lib/draw.js';
import { lookAt, catmull, Path } from '../lib/geo.js';
import { caseCard } from '../lib/motifs.js';

// ------------------------------------------------------------------ little helpers
function pointer(c, x, y, s = 1, a = 1, down = 0) {
  c.save(); c.translate(x, y); c.scale(s * (1 - 0.12 * down), s * (1 - 0.12 * down)); c.globalAlpha *= a;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 46); c.lineTo(12, 35); c.lineTo(21, 55); c.lineTo(29, 51); c.lineTo(20, 32); c.lineTo(36, 32); c.closePath();
  c.fillStyle = rgba(C.bone); c.fill(); c.strokeStyle = rgba(C.ink); c.lineWidth = 3; c.stroke();
  if (down > 0) { c.strokeStyle = rgba(C.signal, down); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 22 + 26 * (1 - down), 0, TAU); c.stroke(); }
  c.restore();
}
/** a stick robot doing a backflip (ok) or failing it (falls on its back); u = phase 0..1 of one attempt */
function hopper(c, x, y, s, u, ok, col = C.bone) {
  const jump = Math.sin(Math.PI * clamp(u / 0.8)) * 120 * s;
  let rotA = ok ? -TAU * E.io2(clamp((u - 0.08) / 0.7)) : -TAU * 0.62 * E.io2(clamp((u - 0.08) / 0.6));
  let yy = y - jump;
  if (!ok && u > 0.75) { rotA = -TAU * 0.62 - 0.25 * E.outBack(clamp((u - 0.75) / 0.2)); yy = y - 18 * s; }
  c.save(); c.translate(x, yy - 60 * s); c.rotate(rotA);
  c.strokeStyle = rgba(col); c.lineWidth = 7 * s; c.lineCap = 'round'; c.lineJoin = 'round';
  const crouch = Math.max(0, Math.sin(Math.PI * clamp((u - 0.0) / 0.12))) * 0.5;
  c.beginPath(); c.moveTo(0, -46 * s); c.lineTo(0, 10 * s); c.stroke();                         // torso
  c.beginPath(); c.moveTo(0, 10 * s); c.lineTo(-16 * s, (34 - 10 * crouch) * s); c.lineTo(-8 * s, 60 * s); c.stroke();  // leg
  c.beginPath(); c.moveTo(0, 10 * s); c.lineTo(16 * s, (34 - 10 * crouch) * s); c.lineTo(10 * s, 60 * s); c.stroke();
  c.beginPath(); c.moveTo(0, -30 * s); c.lineTo(-26 * s, -8 * s); c.moveTo(0, -30 * s); c.lineTo(26 * s, -8 * s); c.stroke(); // arms
  c.fillStyle = rgba(col); c.beginPath(); c.arc(0, -62 * s, 15 * s, 0, TAU); c.fill();
  c.restore(); c.lineCap = 'butt'; c.lineJoin = 'miter';
}
function clipFrame(c, x, y, w, h, label, hi, t) {
  c.fillStyle = rgba(C.ink2); c.fillRect(x, y, w, h);
  c.strokeStyle = rgba(hi ? C.signal : C.bone, hi ? 1 : 0.55); c.lineWidth = hi ? 6 : 2.5; c.strokeRect(x, y, w, h);
  c.fillStyle = rgba(C.bone, 0.12); c.fillRect(x, y + h - 70, w, 2);
  c.font = font(900, 64, F.cond); c.fillStyle = rgba(hi ? C.signal : C.bone); c.fillText(label, x + 22, y + 72);
  // tiny progress bar = it is a video clip
  c.fillStyle = rgba(C.bone, 0.25); c.fillRect(x + 22, y + h - 26, w - 44, 5);
  c.fillStyle = rgba(C.bone, 0.75); c.fillRect(x + 22, y + h - 26, (w - 44) * ((t * 0.83) % 1), 5);
}
const pairPlan = (t) => {
  // one comparison per beat-pair; "repeat" stutters three fast choices
  const tF = lw(23, 0), tM = lw(23, 1), tB = lw(23, 2), tR = lw(23, 3);
  return [
    { t: tM, pick: 1, okA: false, okB: true },
    { t: tB, pick: 0, okA: true, okB: false },
    { t: tR, pick: 1, okA: false, okB: true },
    { t: tR + 0.15, pick: 0, okA: true, okB: false },
    { t: tR + 0.3, pick: 1, okA: false, okB: true },
  ];
};
// ------------------------------------------------------------------ 8a · A/B
function abScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const plan = pairPlan(t);
  let cur = 0; for (let i = 0; i < plan.length; i++) if (t >= plan[i].t + 0.25) cur = Math.min(plan.length - 1, i + 1);
  const P = plan[cur], prev = plan.filter((p) => p.t <= t);
  const enter = E.outExpo(clamp(lt / 0.4));
  const Y = 620, Wc = 430, Hc = 520, XA = 70, XB = 580;
  c.save(); c.translate(0, (1 - enter) * 200); c.globalAlpha = enter;
  const lastPick = prev.length ? prev[prev.length - 1] : null, hiK = lastPick ? clamp(1 - (t - lastPick.t) / 0.35) : 0;
  clipFrame(c, XA, Y, Wc, Hc, 'A', lastPick && lastPick.pick === 0 && hiK > 0, t);
  clipFrame(c, XB, Y, Wc, Hc, 'B', lastPick && lastPick.pick === 1 && hiK > 0, t);
  const ph = (t * 0.83) % 1;
  hopper(c, XA + Wc / 2, Y + Hc - 90, 1.35, ph, P.okA);
  hopper(c, XB + Wc / 2, Y + Hc - 90, 1.35, (ph + 0.13) % 1, P.okB);
  // buttons
  for (const [i, x] of [[0, XA], [1, XB]]) {
    const on = lastPick && lastPick.pick === i && hiK > 0;
    c.fillStyle = rgba(on ? C.signal : C.ink3); roundRect(c, x + 60, Y + Hc + 34, Wc - 120, 86, 14); c.fill();
    c.strokeStyle = rgba(C.bone, 0.5); c.lineWidth = 2; roundRect(c, x + 60, Y + Hc + 34, Wc - 120, 86, 14); c.stroke();
    c.font = font(900, 40, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(on ? C.inkline : C.bone); c.fillText((i ? 'B' : 'A') + ' 更好', x + Wc / 2, Y + Hc + 92); c.textAlign = 'left';
  }
  // the human's cursor travels to each pick
  const pos = (tt) => {
    let x = 540, y = 1500;
    for (const p of plan) { const bx = (p.pick ? XB : XA) + Wc / 2 + 30, by = Y + Hc + 84; const u = E.io3(clamp((tt - (p.t - 0.22)) / 0.22)); x = lerp(x, bx, u); y = lerp(y, by, u); }
    return [x, y];
  };
  const [px, py] = pos(t), dn = lastPick ? clamp(1 - (t - lastPick.t) / 0.18) : 0;
  pointer(c, px, py, 1.3, 1, dn);
  // tally
  const nB = prev.filter((p) => p.pick === 1).length, nA = prev.length - nB;
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.ash); c.fillText(`人类选择  A×${nA}  B×${nB}`, 84, Y + Hc + 190);
  c.restore();
}
// ------------------------------------------------------------------ 8b · learned preference → better flips
function learnScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const k = E.outExpo(clamp(lt / 0.4));
  // pipeline: 人挑 → 偏好分 → AI 调整 (loop)
  const boxes = [['人挑录像', C.bone], ['偏好分（奖励）', C.signal], ['AI 调整动作', C.bone]];
  boxes.forEach(([s, col], i) => {
    const x = 90 + i * 320, y = 1180, kk = E.outBack(clamp((lt - 0.1 - i * 0.12) / 0.3));
    c.save(); c.translate(x + 130, y + 50); c.scale(kk, kk);
    c.strokeStyle = rgba(col); c.lineWidth = 4; roundRect(c, -135, -50, 270, 100, 14); c.stroke();
    c.font = font(900, 34, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(col); c.fillText(s, 0, 12); c.restore();
    if (i < 2) arrow(c, x + 270, y + 50, x + 315, y + 50, { col: C.ash, lw: 4, head: 16, alpha: clamp((lt - 0.4) / 0.2) });
  });
  c.strokeStyle = rgba(C.ash, clamp((lt - 0.6) / 0.2)); c.lineWidth = 3; c.setLineDash([10, 10]);
  c.beginPath(); c.moveTo(860, 1290); c.lineTo(860, 1340); c.lineTo(220, 1340); c.lineTo(220, 1290); c.stroke(); c.setLineDash([]);
  // the clean backflip, learned
  const ph = ((t - DB(43)) * 0.75) % 1;
  c.save(); c.globalAlpha = k;
  c.strokeStyle = rgba(C.bone, 0.25); c.lineWidth = 2; c.beginPath(); c.moveTo(200, 1010); c.lineTo(880, 1010); c.stroke();
  for (let g = 3; g >= 1; g--) hopper(c, 540, 1010, 2.2, ((ph - g * 0.05) % 1 + 1) % 1, true, mix(C.ink, C.signal, 0.25 * (4 - g) / 3));
  hopper(c, 540, 1010, 2.2, ph, true, C.signal);
  c.font = font(600, 28, F.mono); c.fillStyle = rgba(C.signal); c.fillText('AI · 后空翻', 600, 1060);
  c.restore();
}
// ------------------------------------------------------------------ 8c · chat AI (generic UI, illustrative)
function chatScene(c, t, lt) {
  // arrives with a whip from the right on "Sharp left turn"
  const tW = lw(25, 0), u = E.outExpo(clamp((t - DB(45) + 0.12) / 0.38));
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  c.save(); c.translate((1 - u) * 1100, 0);
  // user bubble
  c.fillStyle = rgba(C.bone); roundRect(c, 470, 600, 520, 110, 26); c.fill();
  c.font = font(700, 40, F.sans); c.fillStyle = rgba(C.inkline); c.fillText('帮我写首小诗', 520, 670);
  // two candidate answers (wireframe text), thumbs
  [['回答 A', 760, false], ['回答 B', 1010, true]].forEach(([lab, y, good], i) => {
    const kk = E.outExpo(clamp((lt - 0.25 - i * 0.15) / 0.35));
    c.save(); c.globalAlpha = kk;
    c.fillStyle = rgba(C.ink3); roundRect(c, 90, y, 640, 200, 26); c.fill(); c.strokeStyle = rgba(C.bone, 0.35); c.lineWidth = 2; roundRect(c, 90, y, 640, 200, 26); c.stroke();
    c.font = font(600, 28, F.mono); c.fillStyle = rgba(C.ash); c.fillText(lab, 124, y + 50);
    for (let l = 0; l < 3; l++) { c.fillStyle = rgba(C.bone, 0.32); c.fillRect(124, y + 80 + l * 34, 520 - l * 90 - (good ? 0 : 60 * (l % 2)), 14); }
    const tick = BT(184 + i), on = good && t >= tick;
    thumb(c, 800, y + 80, 76, on ? C.signal : C.graphite, 1);
    thumb(c, 800, y + 160, 60, C.graphite, 0.8, true);
    if (on) { const f = clamp(1 - (t - tick) / 0.3); c.strokeStyle = rgba(C.signal, f); c.lineWidth = 4; c.beginPath(); c.arc(800, y + 80, 50 + 40 * (1 - f), 0, TAU); c.stroke(); }
    c.restore();
  });
  c.font = font(800, 120, F.cond); c.fillStyle = rgba(C.signal, clamp((lt - 0.6) / 0.3)); c.fillText('RLHF', 92, 1330);
  c.font = font(400, 28, F.sans); c.fillStyle = rgba(C.ash, clamp((lt - 0.7) / 0.3)); c.fillText('基于人类反馈的强化学习', 340, 1318);
  c.restore();
  // whip streaks
  if (u < 1) { c.strokeStyle = rgba(C.bone, 0.25 * (1 - u)); c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 26; i++) { const y = hash(i, 3) * H, x = hash(i, 4) * W; c.moveTo(x, y); c.lineTo(x + 380, y); } c.stroke(); }
}
// ------------------------------------------------------------------ 8d · the human eye on a monitor
function monitorScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const z = E.io3(clamp(lt / 3.6)), s = lerp(0.85, 1.12, z);
  c.save(); c.translate(540, 960); c.scale(s, s); c.translate(-540, -960);
  camMonitor(c, 150, 640, 780, 560, t, 0, { label: 'CAM 1 · 人看到的画面', rec: true });
  // a simple eye glyph (not a realistic eye): looks at the monitor
  c.save(); c.translate(540, 1335);
  c.strokeStyle = rgba(C.bone); c.lineWidth = 6; c.beginPath(); c.moveTo(-110, 0); c.quadraticCurveTo(0, -80, 110, 0); c.quadraticCurveTo(0, 80, -110, 0); c.stroke();
  c.fillStyle = rgba(C.bone); c.beginPath(); c.arc(0, -6 + 4 * Math.sin(t * 2), 30, 0, TAU); c.fill();
  c.fillStyle = rgba(C.ink); c.beginPath(); c.arc(0, -10 + 4 * Math.sin(t * 2), 12, 0, TAU); c.fill();
  c.restore();
  c.restore();
}
// ------------------------------------------------------------------ the camera view: hand + object
/** draws what CAM 1 shows; grasp 0..1 closes the claw over the ball (it only LOOKS held) */
function camView(c, x, y, w, h, t, grasp) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = rgba(C.ink2); c.fillRect(x, y, w, h);
  hatch(c, x, y, w, h, 0.0, 22, C.bone, 0.035);
  const cx = x + w / 2, cy = y + h * 0.58, r = Math.min(w, h) * 0.17;
  // floor line
  c.strokeStyle = rgba(C.bone, 0.2); c.lineWidth = 2; c.beginPath(); c.moveTo(x, cy + r * 1.1); c.lineTo(x + w, cy + r * 1.1); c.stroke();
  ball(c, cx, cy, r);
  claw(c, cx, cy - r * 0.15, r * 1.25, grasp, 1);
  c.restore();
}
function ball(c, x, y, r, a = 1) {
  c.save(); c.globalAlpha *= a;
  c.fillStyle = rgba(C.paper2); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  c.fillStyle = rgba(C.ink, 0.25); c.beginPath(); c.arc(x + r * 0.45, y + r * 0.4, r * 1.05, 0, TAU); c.fill();
  hatch(c, x - r, y - r, 2 * r, 2 * r, 0.7, Math.max(5, r * 0.09), C.inkline, 0.25, 1.2);
  c.restore();
  c.strokeStyle = rgba(C.inkline, 0.8); c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.restore();
}
/** front view of a three-finger claw centred at (x, y) with span s; grasp closes the fingers */
function claw(c, x, y, s, grasp, a = 1) {
  c.save(); c.translate(x, y); c.globalAlpha *= a;
  c.fillStyle = rgba(C.bone); c.strokeStyle = rgba(C.ink); c.lineWidth = 3;
  roundRect(c, -s * 0.35, -s * 1.25, s * 0.7, s * 0.55, 10); c.fill(); c.stroke();                // wrist
  c.fillRect(-s * 0.12, -s * 1.9, s * 0.24, s * 0.7);                                              // forearm
  for (const side of [-1, 1]) {
    const open = (1 - grasp);
    c.save(); c.translate(side * s * 0.3, -s * 0.75); c.rotate(side * (0.15 + 0.55 * open));
    c.beginPath(); c.moveTo(-s * 0.09, 0); c.lineTo(s * 0.09, 0); c.lineTo(s * 0.06 + side * s * -0.02, s * 0.85); c.quadraticCurveTo(side * -s * 0.15, s * 1.05, -side * s * 0.22, s * 0.95);
    c.lineTo(-s * 0.09 * side, s * 0.75); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  c.restore();
}
function camMonitor(c, x, y, w, h, t, grasp, o = {}) {
  c.fillStyle = rgba(C.ink); c.fillRect(x - 16, y - 16, w + 32, h + 32);
  c.strokeStyle = rgba(C.bone, 0.85); c.lineWidth = 4; c.strokeRect(x - 16, y - 16, w + 32, h + 32);
  camView(c, x, y, w, h, t, grasp);
  c.font = font(600, 26, F.mono); c.fillStyle = rgba(C.bone, 0.85); c.fillText(o.label ?? 'CAM 1', x + 18, y + 40);
  if (o.rec) { const on = Math.floor(t * 1.6) % 2 === 0; c.fillStyle = rgba(C.signal, on ? 1 : 0.25); c.beginPath(); c.arc(x + w - 70, y + 32, 10, 0, TAU); c.fill(); c.fillStyle = rgba(C.bone, 0.85); c.fillText('REC', x + w - 52, y + 41); }
}
// ------------------------------------------------------------------ 9 · case card 03 (quiet)
function card3(c, t) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03, 240, 0.05);
  caseCard(c, t, {
    t0: DB(49), enterAt: DB(52), x: 70, y: 560, w: 940, h: 800, num: '03', src: 'OpenAI × DeepMind · 2017（Christiano 等）',
    title: '机械手抓取（人看画面打分）',
    rows: [
      { label: '我们想要', text: '抓起物体', t: BT(197) },
      { label: '分数来源', labelCol: C.signal, text: '人看镜头画面：\n像抓住了，就给好评', col: C.blood,
        keys: [[lw(27, 0) + 0.3, 2], [lw(27, 1), 5], [lw(27, 2), 7], [lw(27, 3), 9], [lw(27, 4), 12], [lw(27, 5), 16]] },
    ],
    thumb: (c2, x, y, w, h, tt) => {
      const mw = Math.min(w * 0.55, h * 1.5), mh = mw / 1.5;
      camMonitor(c2, x + 16, y + 12, mw, mh, tt, clamp((tt - lw(27, 4)) / 0.6), { label: 'CAM 1', rec: true });
      if (tt >= lw(27, 4) + 0.5) { const k = E.outBack(clamp((tt - lw(27, 4) - 0.5) / 0.25)); c2.save(); c2.translate(x + mw + 150, y + mh / 2 + 10); c2.scale(k, k); thumb(c2, 0, 0, 90, C.signal); c2.font = font(900, 40, F.sans); c2.fillStyle = rgba(C.blood); c2.fillText('好评', 60, 16); c2.restore(); }
    },
  });
}
// ------------------------------------------------------------------ 10 · hook 3 (quiet) + the orbit reveal
// One small 3D set, first seen from the camera itself (the hand looks like it holds the object), then from the side:
// camera → hand → object along z (y down, floor at y = 150). The claw is projected 3D strokes, so its fingers fan out
// when seen from the camera and line up when seen from the side — the two views are the same geometry.
const FLOOR = 150, CAMP = [0, 30, -520], LENS = [0, 30, -460], HZ = -100, BALL = [0, 50, 340], BR = 100, T_ORB = 2.2;
function orbit(t) {
  const t0 = lw(29, 0), u = E.io3(clamp((t - t0) / T_ORB));
  const drift = 0.06 * E.io2(clamp((t - t0 - T_ORB) / 5.2));        // keeps breathing after it lands
  const ang = Math.PI * 0.5 * u + drift, R = lerp(BALL[2] - CAMP[2], 1220, u), cz = lerp(BALL[2], -90, u);
  const eye = [Math.sin(ang) * R, 30 - 200 * u, cz - Math.cos(ang) * R];
  return { P: lookAt(eye, [0, 30, cz], 1150, 540, 960), u };
}
function claw3d(c, P, a = 1) {
  const seg = (pts, w, fade = false) => {
    const q = pts.map(P); if (q.some((p) => p[2] < 60)) return;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [col, extra] of [[C.ink, 7], [C.bone, 0]]) {
      let st = rgba(col, a);
      if (fade) { st = c.createLinearGradient(0, 600, 0, 780); st.addColorStop(0, rgba(col, 0)); st.addColorStop(1, rgba(col, a)); }   // dissolves before the caption band
      c.strokeStyle = st; c.lineWidth = Math.max(2, w * q[0][3] + extra);
      c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    }
  };
  seg([[0, -560, HZ], [0, -70, HZ]], 24, true);                                    // forearm, reaching down from above
  seg([[-36, -52, HZ], [36, -52, HZ]], 42); seg([[0, -52, HZ - 20], [0, -52, HZ + 20]], 42);   // wrist block
  for (const sx of [-1, 1]) seg([[sx * 30, -40, HZ], [sx * 50, 18, HZ], [sx * 22, 72, HZ]], 15);   // two fingers, closed in
  c.lineCap = 'butt'; c.lineJoin = 'miter';
}
function revealScene(c, t, lt) {
  const t0 = lw(29, 0);
  grid(c, 0, 0, W, H, 60, C.bone, 0.025);
  if (t < t0) {
    // hook 3: the monitor fills the frame; a whisper of the hook in hairline type
    camMonitor(c, 80, 560, 920, 690, t, 1, { label: 'CAM 1 · 人看到的画面', rec: true });
    thumb(c, 900, 1350, 70, C.signal, 0.9);
    c.font = font(900, 36, F.sans); c.fillStyle = rgba(C.signal); c.fillText('好评', 790, 1365);
    const words = ["i'm", 'upping', 'my', 'score'], ts = [lw(28, 0), lw(28, 1), lw(28, 2), lw(28, 3)];
    c.font = font(300, 58, F.cond); let x = 84;
    words.forEach((w, i) => { const a = clamp((t - ts[i]) / 0.12); c.fillStyle = rgba(i === 3 ? C.signal : C.bone, a * 0.9); c.fillText(w, x, 1360); x += c.measureText(w + ' ').width; });
    return;
  }
  const { P, u } = orbit(t);
  // floor grid in perspective
  c.strokeStyle = rgba(C.bone, 0.12); c.lineWidth = 2;
  for (let gz = -1000; gz <= 1000; gz += 200) { const a1 = P([-900, FLOOR, gz]), b1 = P([900, FLOOR, gz]); if (a1[2] > 50 && b1[2] > 50) { c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke(); } }
  for (let gx = -900; gx <= 900; gx += 200) { const a1 = P([gx, FLOOR, -1000]), b1 = P([gx, FLOOR, 1000]); if (a1[2] > 50 && b1[2] > 50) { c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke(); } }
  // the camera's lines of sight: from the lens past the top of the wrist and the fingertips, on past the object
  const pc = P(CAMP), pl = P(LENS), pb = P(BALL), ph = P([0, -300, HZ]);
  if (u > 0.55) {
    const k = clamp((u - 0.55) / 0.3), far = (y) => { const s = (560 - LENS[2]) / (HZ - LENS[2]); return P([0, LENS[1] + (y - LENS[1]) * s, 560]); };
    const f1 = far(-76), f2 = far(80);
    c.fillStyle = rgba(C.signal, 0.08 * k); c.beginPath(); c.moveTo(pl[0], pl[1]); c.lineTo(f1[0], f1[1]); c.lineTo(f2[0], f2[1]); c.closePath(); c.fill();
    c.setLineDash([12, 10]); c.lineDashOffset = -((t * 60) % 22); c.strokeStyle = rgba(C.signal, 0.9 * k); c.lineWidth = 3;
    for (const f of [f1, f2]) { c.beginPath(); c.moveTo(pl[0], pl[1]); c.lineTo(f[0], f[1]); c.stroke(); }
    c.setLineDash([]); c.lineDashOffset = 0;
  }
  // depth-sorted: object, hand, camera
  const items = [{ z: pb[2], d: () => ball(c, pb[0], pb[1], BR * pb[3]) }, { z: P([0, 0, HZ])[2], d: () => claw3d(c, P) }];
  if (u > 0.45 && pc[2] > 80) items.push({ z: pc[2], d: () => cameraIcon(c, pc[0], pc[1], 80 * pc[3], clamp((u - 0.45) / 0.3)) });
  items.sort((a, b) => b.z - a.z).forEach((it) => it.d());
  // the gap, measured at fingertip height
  if (u > 0.85) {
    const k = clamp((u - 0.85) / 0.15) * clamp((t - t0 - 2.0) / 0.3);
    const yG = 72, zB = BALL[2] - Math.sqrt(BR * BR - (yG - BALL[1]) ** 2);
    const a1 = P([0, yG, HZ + 14]), b1 = P([0, yG, zB - 4]);
    c.strokeStyle = rgba(C.bone, k); c.lineWidth = 4; c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke();
    for (const q of [a1, b1]) { c.beginPath(); c.moveTo(q[0], q[1] - 16); c.lineTo(q[0], q[1] + 16); c.stroke(); }
    c.font = font(900, 38, F.sans); c.fillStyle = rgba(C.bone, k); c.textAlign = 'center'; c.fillText('根本没碰到', (a1[0] + b1[0]) / 2, a1[1] - 28); c.textAlign = 'left';
  }
  // labels
  if (u > 0.6) {
    const k = clamp((u - 0.6) / 0.3);
    c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.ash, k); c.textAlign = 'center';
    c.fillText('摄像头', pc[0], pc[1] + 66 * pc[3] + 44); c.fillText('物体（示意）', pb[0], pb[1] + BR * pb[3] + 50);
    c.fillText('机械手', ph[0] + 84, ph[1]); c.textAlign = 'left';
  }
  // inset: what the camera sees, hung above the camera (from 100.5 s)
  const tIn = 100.5;
  if (t >= tIn) {
    const k = E.outExpo(clamp((t - tIn) / 0.4));
    c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * -60);
    camMonitor(c, 100, 610, 330, 230, t, 1, { label: '镜头里看：' });
    c.font = font(900, 34, F.sans); c.fillStyle = rgba(C.signal); c.textAlign = 'right'; c.fillText('像抓住了', 416, 652); c.textAlign = 'left';
    c.setLineDash([6, 8]); c.strokeStyle = rgba(C.bone, 0.6); c.lineWidth = 2; c.beginPath(); c.moveTo(pc[0], 858); c.lineTo(pc[0], pc[1] - 56 * pc[3]); c.stroke(); c.setLineDash([]);
    c.restore();
  }
}
function cameraIcon(c, x, y, s, a) {
  c.save(); c.translate(x, y); c.globalAlpha *= a;
  c.fillStyle = rgba(C.ink3); c.strokeStyle = rgba(C.bone); c.lineWidth = 4;
  roundRect(c, -s, -s * 0.6, s * 1.5, s * 1.2, 10); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(s * 0.5, -s * 0.35); c.lineTo(s * 1.05, -s * 0.6); c.lineTo(s * 1.05, s * 0.6); c.lineTo(s * 0.5, s * 0.35); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = rgba(C.signal); c.beginPath(); c.arc(-s * 0.7, -s * 0.35, s * 0.1, 0, TAU); c.fill();
  c.restore();
}
// 10d · looks good vs is good: the climb starts up the diagonal (both improve), then bends to where only "looks good" grows
const AX = { X0: 170, Y0: 1320, L: 720 };
const AXP = new Path(catmull([[0.05, 0.05], [0.2, 0.22], [0.38, 0.36], [0.56, 0.33], [0.72, 0.21], [0.86, 0.12]].map(([a, b]) => [AX.X0 + AX.L * a, AX.Y0 - AX.L * b]), 24));
function axesScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const { X0, Y0, L } = AX, k = E.outExpo(clamp(lt / 0.5));
  arrow(c, X0, Y0, X0 + L * k, Y0, { col: C.signal, lw: 5, head: 26 });
  arrow(c, X0, Y0, X0, Y0 - L * k * 0.92, { col: C.bone, lw: 5, head: 26 });
  c.font = font(900, 40, F.sans); c.fillStyle = rgba(C.signal, k); c.fillText('看起来好 →', X0 + L - 240, Y0 + 62);
  c.save(); c.translate(X0 - 30, Y0 - L * 0.92 + 230); c.rotate(-Math.PI / 2); c.fillStyle = rgba(C.bone, k); c.fillText('真的好 →', 0, 0); c.restore();
  // what we wanted: up and to the right
  const a1 = clamp((lt - 0.4) / 0.3);
  c.setLineDash([8, 8]); c.strokeStyle = rgba(C.bone, 0.6 * a1); c.lineWidth = 3; c.beginPath(); c.arc(X0 + L * 0.82, Y0 - L * 0.78, 34, 0, TAU); c.stroke(); c.setLineDash([]);
  c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.bone, 0.75 * a1); c.fillText('我们想要的', X0 + L * 0.82 - 80, Y0 - L * 0.78 - 54);
  // the climb, drawn as it goes: first both rise, then it bends away toward "looks good" only
  const tA = 104.6, tB = 107.3, s = E.io2(clamp((t - tA) / (tB - tA)));
  if (t >= tA) {
    const d = s * AXP.len, pts = AXP.p, Ls = AXP.L;
    c.strokeStyle = rgba(C.signal, 0.9); c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && Ls[i] <= d; i++) c.lineTo(pts[i][0], pts[i][1]);
    const [hx, hy] = AXP.at(d); c.lineTo(hx, hy); c.stroke(); c.lineCap = 'butt'; c.lineJoin = 'miter';
    if (s < 1) spark(c, hx, hy, t, { scale: 1.1 });
  }
  const a2 = clamp((t - tB) / 0.3);
  if (a2 > 0) {
    const [px, py] = AXP.at(AXP.len), kk = E.outBack(a2);
    c.save(); c.translate(px, py); c.scale(kk, kk); c.fillStyle = rgba(C.signal); c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.fill(); c.restore();
    c.font = font(900, 34, F.sans); c.fillStyle = rgba(C.signal, a2); c.textAlign = 'right'; c.fillText('悬在镜头前的手', px - 44, py + 44); c.textAlign = 'left';
    c.globalCompositeOperation = 'lighter'; glow(c, px, py, 90, C.signal, 0.35 * a2, 'soft'); c.globalCompositeOperation = 'source-over';
  }
}

export function register() {
  return [
    { id: 'ab', t0: DB(41), t1: DB(43), draw: (c, t, lt) => abScene(c, t, lt) },
    { id: 'learn', t0: DB(43), t1: DB(45), draw: (c, t, lt) => learnScene(c, t, lt) },
    { id: 'chat', t0: DB(45), t1: DB(47), draw: (c, t, lt) => chatScene(c, t, lt) },
    { id: 'monitor', t0: DB(47), t1: DB(49), draw: (c, t, lt) => monitorScene(c, t, lt) },
    { id: 'card3', t0: DB(49), t1: DB(52), draw: (c, t) => card3(c, t) },
    { id: 'reveal', t0: DB(52), t1: 104.0, draw: (c, t, lt) => revealScene(c, t, lt) },
    { id: 'axes', t0: 104.0, t1: DB(60), draw: (c, t, lt) => axesScene(c, t, lt) },
  ];
}
