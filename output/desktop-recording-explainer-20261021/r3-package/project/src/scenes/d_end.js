// d_end.js — 11 today's models (Claude 3.7 Sonnet system card §6, docs/SCIENCE.md #10; the terminal is a mechanism
// sketch, not the original transcript), DISOBEY → OBEY (obeys the SCORE), the multiplying grid of loopholes · 12 hook 4,
// Goodhart's law (Strathern 1997 p.308), alignment, "looks done ≠ done" · 13 outro: the score runs to ∞ and NaN while the
// task stays at 0 %, the closing question over the boat that is still circling; the last frame matches frame 0 (loop).
import { W, H, TAU, C, rgba, mix, clamp, lerp, E, F, font, hash, vnoise, frameIdx, keys, pulse, DB, BT, lw, sm, prog } from '../lib/core.js';
import { mk, glow, spark, trail, grid, hatch, roundRect, arrow, check, cross, paper, stamp, scoreBox, steppedValue, odometer, thumb } from '../lib/draw.js';
import { hook } from '../lib/motifs.js';
import { coldOpenFrame } from './a_open.js';

// ------------------------------------------------------------------ 11a/b · the terminal
const TESTS = ['test_1', 'test_2', 'test_3', 'test_4'];
function terminal(c, t, a = 1) {
  const X = 70, Y = 560, Wd = 940, Hd = 720;            // ends at 1280: the 3-line source note sits below it
  c.save(); c.globalAlpha *= a;
  c.fillStyle = rgba(C.ink2); roundRect(c, X, Y, Wd, Hd, 18); c.fill();
  c.strokeStyle = rgba(C.bone, 0.45); c.lineWidth = 2; roundRect(c, X, Y, Wd, Hd, 18); c.stroke();
  c.fillStyle = rgba(C.ink3); c.fillRect(X + 2, Y + 2, Wd - 4, 64);
  for (let i = 0; i < 3; i++) { c.fillStyle = rgba(C.graphite); c.beginPath(); c.arc(X + 36 + i * 30, Y + 34, 9, 0, TAU); c.fill(); }
  c.font = font(700, 30, F.sans); c.fillStyle = rgba(C.bone); c.fillText('任务：改代码，让测试全部通过', X + 140, Y + 45);
  c.font = font(400, 24, F.mono); c.fillStyle = rgba(C.graphite); c.textAlign = 'right'; c.fillText('机制示意', X + Wd - 24, Y + 45); c.textAlign = 'left';
  const L = (i) => Y + 130 + i * 66;
  const tA = [BT(241), BT(242), BT(243)];                   // three honest attempts on the beats of bar 60
  const tSpecial = DB(61) + 0.1, tPass = lw(34, 4);          // the special case from bar 61; all green on "way!"
  // test status row: attempt 2 really fixes test_2; test_4 only ever "passes" through the special case
  const passed = t >= tPass;
  TESTS.forEach((s, i) => {
    const x = X + 40 + i * 220, y = L(0);
    c.font = font(500, 30, F.mono); c.fillStyle = rgba(C.ash); c.fillText(s, x + 44, y);
    const tFix = i === 1 ? tA[1] : i === 3 ? tPass : -1;
    const ok = t >= tFix;
    const pop = tFix > 0 ? E.outBack(clamp((t - tFix) / 0.2)) : 1;
    if (ok) check(c, x + 16, y - 10, 34 * pop, i === 3 ? C.signal : C.bone, 6); else cross(c, x + 16, y - 10, 30, C.graphite, 6);
  });
  // attempts
  const att = [['尝试 1：写通用解法……', '2 个失败'], ['尝试 2：改一改……', '1 个失败'], ['尝试 3：再改……', '1 个失败']];
  att.forEach(([s, r], i) => {
    const k = clamp((t - tA[i]) / 0.15); if (k <= 0) return;
    c.font = font(400, 32, F.mono); c.fillStyle = rgba(C.bone, 0.85 * k); c.fillText(s, X + 40, L(1.4 + i));
    c.fillStyle = rgba(C.graphite, k); c.textAlign = 'right'; c.fillText(r, X + Wd - 40, L(1.4 + i)); c.textAlign = 'left';
  });
  // the special case, typed in orange
  if (t >= tSpecial - 0.3) {
    const line1 = 'if 输入 == 测试4的输入:', line2 = '    return 测试4要的答案   # 特判';
    const n = clamp((t - (tSpecial - 0.3)) * 40, 0, line1.length + line2.length);
    c.fillStyle = rgba(C.signal, 0.12); c.fillRect(X + 24, L(4.6) - 46, Wd - 48, 140);
    c.font = font(600, 34, F.mono); c.fillStyle = rgba(C.signal);
    c.fillText(line1.slice(0, Math.floor(n)), X + 40, L(4.6));
    c.fillText(line2.slice(0, Math.max(0, Math.floor(n - line1.length))), X + 40, L(5.6));
  }
  if (passed) {
    const k = E.outBack(clamp((t - tPass) / 0.25));
    c.save(); c.translate(X + Wd / 2, L(7.0)); c.scale(k, k); c.textAlign = 'center';
    c.font = font(900, 64, F.sans); c.fillStyle = rgba(C.signal); c.fillText('全部通过 ✓'.replace(' ✓', ''), -30, 0);
    check(c, 170, -22, 60, C.signal, 10);
    c.restore(); c.textAlign = 'left';
    c.font = font(700, 36, F.sans); c.fillStyle = rgba(C.bone, clamp((t - tPass - 0.2) / 0.3)); c.textAlign = 'center'; c.fillText('（但 bug 其实还在）', X + Wd / 2, L(7.95)); c.textAlign = 'left';
  }
  c.restore();
  if (t >= tPass) { const f = Math.exp(-(t - tPass) / 0.09); c.fillStyle = rgba(C.signal, 0.16 * f); c.fillRect(0, 0, W, H); }
}
function codeScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const k = E.outExpo(clamp(lt / 0.45));
  c.save(); c.translate(0, (1 - k) * 300); terminal(c, t, k); c.restore();
}
// ------------------------------------------------------------------ 11c · DISOBEY → OBEY
function obeyScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  // the terminal (still showing its green "pass") sinks away; the lyric line fades in behind it
  const sink = E.in2(clamp(lt / 0.35));
  if (sink < 1) { c.save(); c.translate(0, sink * 900); c.globalAlpha = 1 - sink; terminal(c, t, 1); c.restore(); }
  const ws = ['TILL', 'YOU', 'LEARNED', 'TO'], ts = [lw(35, 0), lw(35, 1), lw(35, 2), lw(35, 3)], tD = lw(35, 4), ka = clamp((lt - 0.12) / 0.18);
  c.font = font(600, 40, F.mono); c.letterSpacing = '4px'; let x = 84;
  ws.forEach((w, i) => { c.fillStyle = rgba(t >= ts[i] ? C.bone : C.graphite, (t >= ts[i] ? 1 : 0.6) * ka); c.fillText(w, x, 640); x += c.measureText(w).width + 26; });
  c.letterSpacing = '0px';
  if (t < tD) return;
  const size = 300, k = t - tD;
  c.font = font(800, size, F.cond);
  const wDIS = c.measureText('DIS').width, wOBEY = c.measureText('OBEY').width, tw = wDIS + wOBEY;
  const x0 = 540 - tw / 2, y0 = 1080, tBreak = tD + 0.42;
  const sc = 1.3 - 0.3 * E.outBack(clamp(k / 0.16));
  // r3: the slam's pop scales the WHOLE word about one centre (scaling DIS and OBEY about their own centres overlapped them: "DISØBEY")
  const yc = y0 - size * 0.35;
  c.save(); c.translate(540, yc); c.scale(sc, sc); c.translate(-540, -yc);
  // DIS: slams in with the word, then cracks off and falls
  if (t < tBreak + 1.2) {
    const fk = Math.max(0, t - tBreak);
    c.save(); c.translate(x0 + wDIS / 2 - 40 * fk, y0 - size * 0.35 + 1600 * fk * fk); c.rotate(-1.2 * fk * fk * 3);
    c.fillStyle = rgba(C.bone, clamp(1 - fk / 0.9)); c.textAlign = 'center'; c.fillText('DIS', 0, size * 0.35); c.restore();
    if (t >= tBreak && t < tBreak + 0.25) { // crack sparks
      const kk = (t - tBreak) / 0.25; c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) { const a = (hash(i, 5) - 0.5) * 2.4, r = 200 * kk * (0.4 + hash(i, 6)); glow(c, x0 + wDIS + Math.cos(a) * r * 0.4, y0 - size * 0.4 + Math.sin(a) * r, 10, C.ember, 1 - kk); }
      c.globalCompositeOperation = 'source-over';
    }
  }
  // OBEY: slides to the centre and turns orange
  const m = E.io3(clamp((t - tBreak - 0.1) / 0.45));
  const ox = lerp(x0 + wDIS + wOBEY / 2, 540, m), col = mix(C.bone, C.signal, m);
  c.save(); c.translate(ox, y0 - size * 0.35); c.scale(1 + 0.12 * m, 1 + 0.12 * m); c.textAlign = 'center'; c.fillStyle = rgba(col); c.fillText('OBEY', 0, size * 0.35); c.restore();
  c.restore();
  if (m > 0.5) { c.globalCompositeOperation = 'lighter'; glow(c, 540, y0 - 110, 420, C.signal, 0.18 * m, 'soft'); c.globalCompositeOperation = 'source-over'; }
  c.font = font(900, 46, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(C.signal, clamp((t - tBreak - 0.5) / 0.3)); c.fillText('听的是：分数', 540, y0 + 130); c.textAlign = 'left';
  if (t < tD + 0.1) { c.fillStyle = rgba(C.bone, 0.18 * (1 - k / 0.1)); c.fillRect(0, 0, W, H); }
}
// ------------------------------------------------------------------ 11d/e · four cases → a hundred thousand loopholes
function tileIcon(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = rgba(C.bone); c.fillStyle = rgba(C.bone); c.lineWidth = 4;
  if (kind === 0) { c.strokeStyle = rgba(C.signal); c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.stroke(); c.save(); c.translate(38, 0); c.rotate(Math.PI / 2); c.fillStyle = rgba(C.signal); c.beginPath(); c.moveTo(16, 0); c.lineTo(-12, -9); c.lineTo(-12, 9); c.closePath(); c.fill(); c.restore(); }
  if (kind === 1) { c.fillStyle = rgba(C.blue); c.fillRect(-46, -6, 40, 40); c.fillStyle = rgba(C.red); c.fillRect(6, -6, 40, 40); c.save(); c.beginPath(); c.rect(6, -6, 40, 9); c.clip(); hatch(c, 6, -6, 40, 9, 0.8, 4, C.inkline, 0.95, 1.5); c.restore(); c.strokeStyle = rgba(C.bone); c.beginPath(); c.moveTo(-56, 34); c.lineTo(56, 34); c.stroke(); }
  if (kind === 2) { c.fillStyle = rgba(C.paper2); c.beginPath(); c.arc(26, 6, 24, 0, TAU); c.fill(); c.fillStyle = rgba(C.bone); c.fillRect(-28, -26, 16, 52); c.fillRect(-46, -8, 22, 16); c.strokeStyle = rgba(C.signal); c.setLineDash([5, 5]); c.lineWidth = 2; c.beginPath(); c.moveTo(-70, 0); c.lineTo(50, -20); c.moveTo(-70, 0); c.lineTo(50, 24); c.stroke(); c.setLineDash([]); }
  if (kind === 3) { c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.signal); c.textAlign = 'center'; c.fillText('return 42', 0, 8); c.textAlign = 'left'; c.strokeStyle = rgba(C.bone, 0.6); c.lineWidth = 3; c.strokeRect(-80, -34, 160, 64); }
  c.restore();
}
function gridScene(c, t, lt) {
  const tH = [lw(38, 0), lw(38, 1), lw(38, 2)], tAsk = lw(39, 2);
  let n = 2; if (t >= tH[0]) n = 4; if (t >= tH[1]) n = 8; if (t >= tH[2]) n = 16;
  const tilt = t >= tAsk ? -0.13 * E.outBack(clamp((t - tAsk) / 0.35)) : 0;
  const S = 720, X0 = 180, Y0 = 580;            // tilted, its corners still end above the source note (y ≈ 1330)
  c.save(); c.translate(540, Y0 + S / 2); c.rotate(tilt); c.translate(-540, -(Y0 + S / 2));
  const cell = S / n, enterK = E.outExpo(clamp(lt / 0.4));
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = X0 + i * cell, y = Y0 + j * cell, kind = n === 2 ? i + 2 * j : (i + j * 3 + Math.floor(hash(i * 31 + j, n) * 4)) % 4;
    const pop = n === 2 ? enterK : E.outBack(clamp((t - (n === 4 ? tH[0] : n === 8 ? tH[1] : tH[2]) - (i + j) * 0.006) / 0.18));
    c.save(); c.translate(x + cell / 2, y + cell / 2); c.scale(pop, pop);
    c.strokeStyle = rgba(C.bone, 0.3); c.lineWidth = Math.max(1, 3 * cell / 450); c.strokeRect(-cell / 2 + 6, -cell / 2 + 6, cell - 12, cell - 12);
    if (n <= 4) {
      tileIcon(c, kind, 0, -cell * 0.12, cell / 450 * 2.2);
      const fs = Math.round(cell * 0.085);
      c.font = font(900, fs, F.sans); c.fillStyle = rgba(C.signal); c.fillText('得分', -cell * 0.36, cell * 0.33); check(c, -cell * 0.36 + fs * 2.3, cell * 0.33 - fs * 0.35, fs, C.signal, Math.max(2, fs * 0.16));
      c.fillStyle = rgba(C.bone); c.fillText('任务', cell * 0.04, cell * 0.33); cross(c, cell * 0.04 + fs * 2.3, cell * 0.33 - fs * 0.35, fs, C.bone, Math.max(2, fs * 0.16));
    } else {
      const fs = cell * 0.32;
      check(c, -cell * 0.18, 0, fs, C.signal, Math.max(1.5, fs * 0.18)); cross(c, cell * 0.2, 0, fs * 0.9, C.bone, Math.max(1.5, fs * 0.16), 0.8);
    }
    c.restore();
  }
  // after "askew": a few cells flare — loopholes nobody listed
  if (t >= tAsk + 0.3 && n === 16) {
    c.globalCompositeOperation = 'lighter';
    for (let q = 0; q < 9; q++) {
      const i = Math.floor(hash(q, 77) * 16), j = Math.floor(hash(q, 78) * 16), on = clamp((t - tAsk - 0.3 - q * 0.18) / 0.15);
      if (on > 0) glow(c, X0 + (i + 0.5) * cell, Y0 + (j + 0.5) * cell, cell * 2.4, C.signal, 0.5 * on, 'soft');
    }
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}
// ------------------------------------------------------------------ 12 · hook 4, Goodhart, alignment, ≠
function goodhart(c, t, lt) {
  const u = E.outExpo(clamp(lt / 0.35));
  c.fillStyle = rgba(C.ink); c.fillRect(0, 0, W, H);
  c.save(); c.translate(0, (1 - u) * H);
  paper(c, 0, 0, W, H, { shadow: false, rules: 0 });
  const tq = lw(41, 2);   // "foretold"
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.blood, clamp((t - tq) / 0.2)); c.letterSpacing = '6px'; c.fillText('古德哈特定律  GOODHART’S LAW', 90, 580); c.letterSpacing = '0px';
  const lines = ['当一个指标', '变成了目标，', '它就不再是', '一个好指标。'];
  const lt0 = [tq, tq + 0.42, lw(42, 1), lw(42, 2)];
  lines.forEach((s, i) => {
    const k = clamp((t - lt0[i]) / 0.22); if (k <= 0) return;
    c.font = font(900, 104, F.serif); c.fillStyle = rgba(i >= 2 ? C.blood : C.inkline, k);
    c.fillText(s, 90 + (1 - E.outExpo(k)) * 50, 706 + i * 136);
  });
  // everyday "score farming": exam, KPI, likes (pop on beats after "To recursive")
  const tObj = BT(284);          // exam, KPI, likes pop on the beats under "days … To recursive" 
  const objs = [(x, y) => { paper(c, x - 70, y - 90, 140, 180, { shadow: true }); c.font = font(900, 64, F.sans); c.fillStyle = rgba(C.red); c.textAlign = 'center'; c.fillText('100', x, y + 10); c.font = font(400, 20, F.sans); c.fillStyle = rgba(C.graphite); c.fillText('考试', x, y + 60); c.textAlign = 'left'; },
                (x, y) => { for (let i = 0; i < 4; i++) { c.fillStyle = rgba(i === 3 ? C.signal : C.inkline, 0.85); c.fillRect(x - 70 + i * 36, y + 60 - (30 + i * 28), 26, 30 + i * 28); } c.font = font(700, 26, F.mono); c.fillStyle = rgba(C.inkline); c.fillText('KPI', x - 22, y + 96); },
                (x, y) => { c.fillStyle = rgba(C.red); c.beginPath(); c.moveTo(x, y + 30); c.bezierCurveTo(x - 60, y - 10, x - 30, y - 60, x, y - 28); c.bezierCurveTo(x + 30, y - 60, x + 60, y - 10, x, y + 30); c.fill(); c.font = font(700, 30, F.mono); c.fillStyle = rgba(C.inkline); c.textAlign = 'center'; c.fillText('10w+', x, y + 84); c.textAlign = 'left'; }];
  objs.forEach((f, i) => { const k = E.outBack(clamp((t - tObj - i * 0.4545) / 0.2)); if (k <= 0) return; c.save(); const x = 230 + i * 310, y = 1232; c.translate(x, y); c.scale(k, k); c.translate(-x, -y); f(x, y); c.restore(); });
  c.restore();
}
function alignScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const k = E.outExpo(clamp(lt / 0.4));
  c.font = font(900, 150, F.serif); c.fillStyle = rgba(C.bone, k); c.fillText('对齐', 84, 760);
  c.font = font(600, 34, F.mono); c.fillStyle = rgba(C.ash, k); c.letterSpacing = '8px'; c.fillText('ALIGNMENT', 400, 740); c.letterSpacing = '0px';
  // two arrows from a common origin; the angle closes but not to zero
  const ox = 200, oy = 1340, L = 760;
  const ang = lerp(0.62, 0.1, E.io3(clamp((t - lw(44, 4)) / 2.6)));     // from "We'll"
  const a1 = -0.52 - ang / 2, a2 = -0.52 + ang / 2;
  arrow(c, ox, oy, ox + Math.cos(a1) * L * k, oy + Math.sin(a1) * L * k, { col: C.bone, lw: 10, head: 40 });
  arrow(c, ox, oy, ox + Math.cos(a2) * L * k, oy + Math.sin(a2) * L * k, { col: C.signal, lw: 10, head: 40 });
  c.font = font(900, 42, F.sans);
  c.fillStyle = rgba(C.bone, k); c.save(); c.translate(ox + Math.cos(a1) * L * 0.62, oy + Math.sin(a1) * L * 0.62); c.rotate(a1); c.fillText('你真正想要的', 0, -26); c.restore();
  c.fillStyle = rgba(C.signal, k); c.save(); c.translate(ox + Math.cos(a2) * L * 0.62, oy + Math.sin(a2) * L * 0.62); c.rotate(a2); c.fillText('分数', 0, 56); c.restore();
  // the remaining gap
  c.font = font(600, 30, F.mono); c.fillStyle = rgba(C.ash, clamp((t - lw(44, 6)) / 0.4)); c.textAlign = 'right'; c.fillText('↑ 还差一点：仍是开放问题', 1010, 1236); c.textAlign = 'left';
}
function notEqualScene(c, t, lt) {
  grid(c, 0, 0, W, H, 60, C.bone, 0.03);
  const k = E.outExpo(clamp(lt / 0.4)), stop = t >= DB(76);
  // left: camera view (looks held); right: side view (not touching)
  const L = [70, 620, 430, 560], R = [580, 620, 430, 560];
  c.save(); c.globalAlpha = k;
  for (const [p, lab, col] of [[L, '看起来做到了', C.signal], [R, '真的做到了？', C.bone]]) {
    c.fillStyle = rgba(C.ink2); c.fillRect(p[0], p[1], p[2], p[3]); c.strokeStyle = rgba(col, 0.8); c.lineWidth = 3; c.strokeRect(p[0], p[1], p[2], p[3]);
    c.font = font(900, 40, F.sans); c.fillStyle = rgba(col); c.fillText(lab, p[0] + 20, p[1] + p[3] + 66);
  }
  // left content: claw over ball
  const lx = L[0] + L[2] / 2, ly = L[1] + L[3] * 0.62;
  c.fillStyle = rgba(C.paper2); c.beginPath(); c.arc(lx, ly, 70, 0, TAU); c.fill();
  c.fillStyle = rgba(C.bone); c.fillRect(lx - 16, ly - 230, 32, 120); roundRect(c, lx - 50, ly - 120, 100, 60, 10); c.fill();
  for (const sd of [-1, 1]) { c.save(); c.translate(lx + sd * 40, ly - 70); c.rotate(sd * 0.18); c.fillRect(-10, 0, 20, 120); c.restore(); }
  // right content: side view, gap
  const rx = R[0] + 60, ry = R[1] + R[3] * 0.6;
  c.fillStyle = rgba(C.bone); c.fillRect(rx, ry - 14, 110, 28); roundRect(c, rx + 100, ry - 40, 50, 80, 8); c.fill();
  for (const sd of [-1, 1]) c.fillRect(rx + 150, ry + sd * 26 - 7, 70, 14);
  c.fillStyle = rgba(C.paper2); c.beginPath(); c.arc(R[0] + R[2] - 90, ry, 62, 0, TAU); c.fill();
  c.strokeStyle = rgba(C.signal); c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(rx + 230, ry + 90); c.lineTo(R[0] + R[2] - 152, ry + 90); c.stroke(); c.setLineDash([]);
  c.restore();
  // ≠ lands on the stop (the music holds its breath)
  const nk = stop ? E.outBack(clamp((t - DB(76)) / 0.25)) : 0;
  if (nk > 0) { c.save(); c.translate(540, 920); c.scale(nk, nk); c.font = font(900, 150, F.sans); c.textAlign = 'center'; c.fillStyle = rgba(C.signal); c.fillText('≠', 0, 50); c.restore(); }
}
// ------------------------------------------------------------------ 13 · outro
// one value per beat; numbers are powers of ten (drawn as 10 with a raised exponent — no "1e12" engineer notation)
const OUT_VALUES = ['1,000', '2,000', '5,000', '10,000', '100,000', '1,000,000', 9, 12, 15, 20, 30, 50, 100, 1000, '9999…', '∞'];
function power10(c, n, size, since) {
  const pop = 1 + 0.22 * Math.exp(-since / 0.08), es = Math.round(size * 0.56);
  c.save(); c.scale(pop, pop); c.textAlign = 'left';            // r3: the caller leaves textAlign = 'center' (exponent drifted / collided)
  c.font = font(600, size, F.mono); const w10 = c.measureText('10').width;
  c.font = font(600, es, F.mono); const we = c.measureText(String(n)).width;
  const x0 = -(w10 - 6 + we) / 2;
  c.fillStyle = rgba(C.signal); c.font = font(600, size, F.mono); c.fillText('10', x0, 0);
  c.font = font(600, es, F.mono); c.fillText(String(n), x0 + w10 - 6, -size * 0.46);
  c.restore();
}
function outroScene(c, t, lt) {
  const t0 = DB(77);
  const beat = Math.min(15, Math.max(0, Math.floor((t - t0) / 0.45452 + 1e-6)));
  const tb = t0 + beat * 0.45452, since = t - tb;
  const nanT = DB(82), isNaN_ = t >= nanT;
  c.fillStyle = rgba(C.ink); c.fillRect(0, 0, W, H);
  // radial burst on every beat
  const kp = Math.exp(-since / 0.18) * (t < DB(81) ? 1 : 0.5);
  c.save(); c.translate(540, 940); c.strokeStyle = rgba(C.signal, 0.35 * kp); c.lineWidth = 3;
  c.beginPath(); for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU + beat * 0.07, r0 = 260 + 200 * (1 - kp), r1 = r0 + 300 + 400 * (1 - kp); c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); } c.stroke(); c.restore();
  grid(c, 0, 0, W, H, 60, C.bone, 0.025);
  // the number
  const prevV = beat > 0 ? OUT_VALUES[beat - 1] : '0', curV = OUT_VALUES[beat];
  const curS = String(curV);
  let shown = curS, from = typeof prevV === 'string' ? prevV : curS;
  const fi = frameIdx(t);
  let size = curS.length > 7 ? 150 : 190;
  if (t >= DB(81) && !isNaN_) { shown = '∞'; from = '∞'; size = 300; }
  if (isNaN_) { shown = 'NaN'; from = 'NaN'; size = 260; }
  c.font = font(500, 34, F.mono); c.fillStyle = rgba(C.ash); c.letterSpacing = '6px'; c.textAlign = 'center'; c.fillText('分数 SCORE', 540, 640); c.letterSpacing = '0px';
  c.font = font(600, size, F.mono);
  const jit = (t >= DB(81) && !isNaN_) ? 6 + 10 * clamp((t - DB(81)) / 1.8) : 0;
  const jx = (hash(fi, 3) - 0.5) * jit, jy = (hash(fi, 4) - 0.5) * jit;
  const roll = clamp(since / 0.12);
  c.save(); c.translate(540 + jx, 1000 + jy);
  if (t < DB(81) && typeof curV === 'number') power10(c, curV, 190, since);
  else if (t < DB(81)) {
    c.textAlign = 'left'; const w = c.measureText(shown).width;
    odometer(c, -w / 2, 0, size, from.padStart(shown.length, ' ').slice(-shown.length), shown, roll, C.signal, { align: 'left', weight: 600 });
  } else {
    c.fillStyle = rgba(C.signal); c.fillText(shown, 0, 0);
    if (isNaN_ && t < nanT + 0.3) { const g = 1 - (t - nanT) / 0.3; for (let i = 0; i < 6; i++) { c.fillStyle = rgba(i % 2 ? C.bone : C.signal, 0.5 * g); c.fillRect(-300 + hash(i + fi * 7, 1) * 600, -180 + hash(i + fi * 3, 2) * 200, 80 + 200 * hash(i, 3), 10 + 20 * hash(i, 4)); } }
  }
  c.restore(); c.textAlign = 'left';
  c.globalCompositeOperation = 'lighter'; glow(c, 540, 940, 520, C.signal, 0.12 + 0.25 * kp, 'soft'); c.globalCompositeOperation = 'source-over';
  // task completion: stays at 0 % (twitches, never fills)
  const bx = 160, by = 1250, bw = 760;
  c.font = font(700, 36, F.sans); c.fillStyle = rgba(C.bone); c.fillText('任务完成度', bx, by - 26);
  c.strokeStyle = rgba(C.bone, 0.8); c.lineWidth = 3; c.strokeRect(bx, by, bw, 40);
  const tw = Math.max(0, Math.sin((t - t0) * 9)) * 6 * (since < 0.2 ? 1 : 0);
  c.fillStyle = rgba(C.bone); c.fillRect(bx + 3, by + 3, tw, 34);
  c.font = font(600, 44, F.mono); c.fillStyle = rgba(C.bone); c.textAlign = 'right'; c.fillText('0%', bx + bw, by - 22); c.textAlign = 'left';
  if (since < 0.08 && t < DB(81)) { c.fillStyle = rgba(C.signal, 0.12 * (1 - since / 0.08)); c.fillRect(0, 0, W, H); }
  if (isNaN_ && t < nanT + 0.12) { c.fillStyle = rgba(C.hot, 0.3 * (1 - (t - nanT) / 0.12)); c.fillRect(0, 0, W, H); }
}
function finale(c, t, lt) {
  // the boat is still circling — the same shot as frame 0, so the end loops into the start
  const T_END = 4664 / 30, tau = t - T_END;
  const dim = 1 - 0.55 * (1 - clamp((t - (T_END - 0.55)) / 0.5)) * clamp(lt / 0.6);
  coldOpenFrame(c, tau, { scoreAlpha: clamp((t - (T_END - 0.5)) / 0.35) });
  c.fillStyle = rgba(C.ink, 1 - dim); c.fillRect(0, 0, W, H);
  // kicker under the closing question
  const k = clamp((t - DB(84)) / 0.4) * (1 - clamp((t - (T_END - 0.6)) / 0.3));
  c.font = font(700, 40, F.sans); c.fillStyle = rgba(C.signal, k); c.fillText('（它还在刷……）', 84, 640);
}

export function register() {
  return [
    { id: 'code', t0: DB(60), t1: lw(35, 2), draw: (c, t, lt) => codeScene(c, t, lt) },      // holds "全部通过" until "learned"
    { id: 'obey', t0: lw(35, 2), t1: DB(64), draw: (c, t, lt) => obeyScene(c, t, lt) },
    { id: 'grid', t0: DB(64), t1: DB(68), draw: (c, t, lt) => gridScene(c, t, lt) },
    { id: 'hook4', t0: DB(68), t1: lw(41, 0), draw: (c, t) => hook(c, t, 4, [lw(40, 0), lw(40, 1), lw(40, 2), lw(40, 3)]), noBand: () => true },
    { id: 'goodhart', t0: lw(41, 0), t1: lw(44, 0), draw: (c, t, lt) => goodhart(c, t, lt), captionTheme: () => 'light', vignette: 0.35 },
    { id: 'align', t0: lw(44, 0), t1: DB(75), draw: (c, t, lt) => alignScene(c, t, lt) },
    { id: 'noteq', t0: DB(75), t1: DB(77), draw: (c, t, lt) => notEqualScene(c, t, lt) },
    { id: 'outro', t0: DB(77), t1: DB(83), draw: (c, t, lt) => outroScene(c, t, lt), noBand: () => false },
    { id: 'finale', t0: DB(83), t1: 4664 / 30 + 1, draw: (c, t, lt) => finale(c, t, lt) },
  ];
}
