// film.js — composes frame f of 《等它落下来》. Canvas 2D only; every frame is a pure function of f.
import { W, H, FPS, END, FRAMES, T, SCENES, CARDS, TAGS, NOTES, C, WAITS, DROPS, FADE_V0, FADE_V1, frameOf } from './timeline.js';
import { MUSIC } from './music.js';
import { clamp, mix, ramp, lin, smooth, easeOut, easeIn, easeInOut, backOut, hash } from './lib.js';
import { background, vignette, spectrumRing, inflow, core, burst, flash, songMap, chillLine, dot } from './viz.js';
import { drawBrain } from './brain.js';

const FONT = (w, px) => `${w} ${px}px "NSC", sans-serif`;
const ROLE = { hero: { w: 900, px: 96, track: 4 }, support: { w: 500, px: 54, track: 3 }, note: { w: 500, px: 30, track: 1 } };
const COL = (c) => C[c] || c;
const TEXT_X = 495, TEXT_W = 840;           // text block centre and width: clear of the platform's right-hand buttons
const SX = 500, SY = 700;                    // the stage centre
const unpack = (b64) => { const s = atob(b64), a = new Float32Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) / 255; return a; };
const SPEC = unpack(MUSIC.spec), SUB = unpack(MUSIC.sub), RMS = unpack(MUSIC.rms), KICK = unpack(MUSIC.kick);
const NB = MUSIC.bands;
const SCENE_F = SCENES.map((s) => ({ ...s, f0: frameOf(s.t0), f1: frameOf(s.t1) }));
const sceneOf = (f) => SCENE_F.find((s) => f >= s.f0 && f < s.f1) || SCENE_F[SCENE_F.length - 1];

export class Film {
  async init() {
    const out = this.out = document.getElementById('out');
    out.width = W; out.height = H;
    this.ctx = out.getContext('2d');
    this.frameCount = FRAMES;
  }
  bands(f) { const i = Math.max(0, Math.min(MUSIC.frames - 1, f)); return SPEC.subarray(i * NB, i * NB + NB); }
  kick(f) { return KICK[Math.max(0, Math.min(MUSIC.frames - 1, f))]; }

  // charge of the anticipation core during a wait window [w0, d): slow, then faster near the drop
  charge(t, w0, d, pre = 0) { return clamp(pre + (1 - pre) * easeIn(lin(t, w0, d), 1.7)); }

  // ------------------------------------------------------------------------------- scenes (draw the stage)
  feel1(ctx, t, f) {
    const c = clamp(0.1 * lin(t, 0, WAITS[0][0]) + this.charge(t, WAITS[0][0], T.d1, 0.1) * 0.9 * (t >= WAITS[0][0] ? 1 : 0) + (t < WAITS[0][0] ? 0 : 0.1));
    this.tension = c;
    spectrumRing(ctx, SX, SY, 250, this.bands(f), { alpha: 0.35 + 0.25 * c, color: C.wait, len: 150 });
    inflow(ctx, SX, SY, t, c);
    core(ctx, SX, SY, { charge: c, t });
  }
  release1(ctx, t, f) {
    const age = Math.max(0, t - T.d1), rel = Math.exp(-age * 2.2), k = this.kick(f);   // the cut frame is age 0
    const away = easeInOut(lin(t, T.q2 + 0.9, T.study), 2);   // the core lifts and shrinks toward where the brain will be
    const cy = mix(SY, 560, away), sc = mix(1, 0.55, away);
    spectrumRing(ctx, SX, cy, 250 * sc, this.bands(f), { alpha: (0.9 - 0.4 * away), color: C.wait, color2: C.hit, len: 200 * sc, rot: t * 0.12 });
    burst(ctx, SX, SY, age, 0.6, 11);
    core(ctx, SX, cy, { charge: 0, release: rel, kick: k, t, scale: sc, arc: 1 - away });
    flash(ctx, W, H, SX, SY, age, 0.6);
    this.shake = 16 * Math.exp(-age * 7) + 3 * k * (1 - away);
  }
  study(ctx, t, f) {
    const k = lin(t, T.study, T.study + 0.6);
    drawBrain(ctx, { cx: SX, cy: 560, s: 270, alpha: k, ring: easeOut(lin(t, T.study + 0.1, T.study + 0.9), 2), t, labels: 0 });
    const r = easeInOut(lin(t, T.peak, T.peak + 0.9), 2);
    chillLine(ctx, 110, 1060, 780, 150, { alpha: lin(t, T.peak - 0.1, T.peak + 0.2), reveal: r, peak: ramp(t, T.peak + 0.75, T.peak + 1.0), window: ramp(t, T.peak + 1.05, T.peak + 1.5) });
    dot(ctx, SX, 560, 60 * this.kick(f), C.wait, 0.0);
  }
  places(ctx, t, f) {
    const toPeak = lin(t, T.places, T.nacc), arrived = t >= T.nacc;
    const cau = arrived ? mix(1, 0.25, lin(t, T.nacc, T.nacc + 0.4)) : ramp(t, T.places, T.places + 0.35);
    const na = arrived ? clamp(0.75 + 0.25 * this.kick(f)) * ramp(t, T.nacc - 0.02, T.nacc + 0.1) : 0;
    drawBrain(ctx, { cx: SX, cy: 560, s: 270, alpha: 1, ring: 1 - lin(t, T.places, T.places + 0.5), t, labels: ramp(t, T.places, T.places + 0.35), caudate: cau, nacc: na });
    const P = 0.72, u = arrived ? P + 0.04 * lin(t, T.nacc, T.meaning) : mix(P - 0.22, P, easeInOut(toPeak, 1.3));
    chillLine(ctx, 110, 1060, 780, 150, { alpha: 1, reveal: 1, peak: 1, window: 1, playhead: u });
    if (arrived) { const g = t - T.nacc; dot(ctx, 110 + 780 * P, 1060 - 150 * 0.95, 30 + 90 * easeOut(clamp(g / 0.5), 2), C.hit, 0.9 * Math.exp(-g * 3)); }
  }
  meaning(ctx, t, f) {
    const k = this.kick(f), p = 0.5 + 0.5 * Math.sin((t - T.meaning) * 3.0);
    drawBrain(ctx, { cx: SX, cy: 560, s: 270, alpha: 1, labels: 1, caudate: 0.55 + 0.25 * p, nacc: 0.55 + 0.25 * (1 - p) + 0.2 * k });
    chillLine(ctx, 110, 1060, 780, 150, { alpha: 1 - lin(t, T.feel2 - 0.35, T.feel2), reveal: 1, peak: 1, window: 1 });
  }
  feel2(ctx, t, f) {
    const c = this.charge(t, T.feel2 - 0.0, T.d2, 0.15);
    this.tension = c;
    drawBrain(ctx, { cx: SX, cy: 300, s: 125, alpha: ramp(t, T.feel2, T.feel2 + 0.3), caudate: c, nacc: 0, labels: 0 });
    spectrumRing(ctx, SX, 820, 230, this.bands(f), { alpha: 0.35 + 0.25 * c, color: C.wait, len: 140 });
    inflow(ctx, SX, 820, t, c);
    core(ctx, SX, 820, { charge: c, t, scale: 0.95 });
  }
  release2(ctx, t, f) {
    const age = Math.max(0, t - T.d2), rel = Math.exp(-age * 2.0), k = this.kick(f);
    drawBrain(ctx, { cx: SX, cy: 300, s: 125, alpha: 1, caudate: 0.25 * Math.exp(-age * 2), nacc: clamp(Math.exp(-age * 1.2) + 0.5 * k), labels: 0 });
    spectrumRing(ctx, SX, 820, 230, this.bands(f), { alpha: 0.95, color: C.wait, color2: C.hit, len: 210, rot: t * 0.15 });
    burst(ctx, SX, 820, age, 0.85, 21);
    core(ctx, SX, 820, { release: rel, kick: k, t, scale: 0.95, arc: 1 - lin(t, T.craft - 0.5, T.craft) });
    flash(ctx, W, H, SX, 820, age, 0.85);
    this.shake = 20 * Math.exp(-age * 7) + 3 * k;
  }
  craft(ctx, t, f) {
    const pulse = 0.5 + 0.5 * Math.cos(((t - T.craft) / 2.128) * Math.PI * 2);
    songMap(ctx, 80, 930, 840, 330, SUB, FPS, END, { alpha: lin(t, T.craft, T.craft + 0.35), playhead: t, labels: ramp(t, T.craft + 0.6, T.craft + 1.0), waitGlow: 0.4 + 0.6 * pulse, until: END });
    ctx.save(); ctx.font = FONT(500, 34); ctx.fillStyle = C.dim; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.globalAlpha = lin(t, T.craft + 0.2, T.craft + 0.6);
    ctx.fillText('低音能量', 80, 950); ctx.textAlign = 'right'; ctx.fillText('时间 →', 920, 950); ctx.restore();
  }
  last(ctx, t, f) {
    const k = easeInOut(lin(t, T.last, T.last + 0.8), 2);
    songMap(ctx, 80, mix(930, 1060, k), 840, mix(330, 110, k), SUB, FPS, END, { alpha: 1, playhead: t, labels: 1 - k, waitGlow: 0.5, until: END });
    const c = 0.06 * ramp(t, T.last + 0.4, T.feel3);
    spectrumRing(ctx, SX, 640, 230, this.bands(f), { alpha: 0.5 * k, color: C.wait, len: 150 });
    core(ctx, SX, 640, { charge: c, kick: this.kick(f) * 0.6, t, scale: mix(0.4, 0.95, k), arc: k });
  }
  feel3(ctx, t, f) {
    // the last wait: three bars. The edit repeats the build bar: the charge nears full at the original drop point, then
    // hangs there, trembling, through the extra bar
    const c = t < T.extra ? 0.9 * easeIn(lin(t, T.feel3, T.extra), 1.5) : 0.9 + 0.1 * easeIn(lin(t, T.extra, T.d3), 2.5);
    this.tension = c;
    songMap(ctx, 80, 1060, 840, 110, SUB, FPS, END, { alpha: 1, playhead: t, labels: 0, waitGlow: 0.5 + 0.5 * c, until: END });
    spectrumRing(ctx, SX, 640, 230, this.bands(f), { alpha: 0.35 + 0.3 * c, color: C.wait, len: 150 });
    inflow(ctx, SX, 640, t, c);
    core(ctx, SX, 640, { charge: c, t, scale: 0.95 });
  }
  finale(ctx, t, f) {
    const age = Math.max(0, t - T.d3), rel = Math.exp(-age * 1.4), k = this.kick(f), hitAge = t >= T.hit - 0.02 ? Math.max(0, t - T.hit) : -1, settle = easeInOut(lin(t, T.hit, T.hit + 1.4), 2);
    songMap(ctx, 80, 1060, 840, 110, SUB, FPS, END, { alpha: 1 - 0.6 * settle, playhead: t < T.hit ? t : null, labels: ramp(t, T.d3 + 0.6, T.d3 + 1.2), waitGlow: 1, until: END });
    drawBrain(ctx, { cx: SX, cy: 300, s: 115, alpha: ramp(t, T.d3 + 0.25, T.d3 + 0.8) * (1 - 0.5 * settle), caudate: 0.6, nacc: clamp(0.6 + 0.4 * rel + 0.3 * k), labels: 0 });
    spectrumRing(ctx, SX, 640, 230, this.bands(f), { alpha: 0.95 * (1 - 0.6 * settle), color: C.wait, color2: C.hit, len: 240, rot: t * 0.18 });
    burst(ctx, SX, 640, age, 1.35, 31);
    if (hitAge >= 0) burst(ctx, SX, 640, hitAge, 0.35, 41);
    core(ctx, SX, 640, { release: clamp(rel + (hitAge >= 0 ? 0.6 * Math.exp(-hitAge * 1.5) : 0)), kick: k * (1 - settle), t, scale: 0.95 * (1 - 0.15 * settle), arc: 1 - lin(t, T.d3, T.d3 + 0.4) });
    flash(ctx, W, H, SX, 640, age, 1.3);
    if (hitAge >= 0) flash(ctx, W, H, SX, 640, hitAge, 0.4);
    this.shake = 26 * Math.exp(-age * 6) + (hitAge >= 0 ? 10 * Math.exp(-hitAge * 7) : 0) + 3 * k * (1 - settle);
  }

  // ------------------------------------------------------------------------------- type
  layoutLine(ctx, line) {
    const R = ROLE[line.role]; ctx.font = FONT(R.w, R.px);
    const chars = [...line.text]; let x = 0; const xs = [];
    for (const ch of chars) { xs.push(x); x += ctx.measureText(ch).width + R.track; }
    const width = x - R.track, fit = Math.min(1, TEXT_W / width);
    return { chars, xs, width, fit, R };
  }
  colorOf(line, i) {
    for (const s of line.spans || []) { let k = line.text.indexOf(s.k); while (k >= 0) { if (i >= k && i < k + [...s.k].length) return COL(s.c); k = line.text.indexOf(s.k, k + 1); } }
    return C.white;
  }
  drawCards(ctx, t) {
    for (const card of CARDS) {
      const out = card.exit === 'cut' ? frameOf(card.out) / FPS - 1e-6 : card.out;
      if (t < card.lines[0].at - 0.01 || t > out + 0.6) continue;
      if (card.exit === 'cut' && t >= out) continue;
      const lays = card.lines.map((l) => this.layoutLine(ctx, l)), heights = lays.map((L) => L.R.px * L.fit * 1.34), total = heights.reduce((a, b) => a + b, 0);
      const vis = Math.min(1, lin(t, card.lines[0].at - 0.1, card.lines[0].at + 0.25)) * (card.exit === 'fade' ? 1 - lin(t, out, out + 0.35) : 1);
      if (vis > 0) {
        const y0 = card.y - total / 2 - 110, y1 = card.y + total / 2 + 110, g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.32, `rgba(0,0,0,${0.5 * vis})`); g.addColorStop(0.68, `rgba(0,0,0,${0.5 * vis})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
      }
      let y = card.y - total / 2;
      card.lines.forEach((line, li) => {
        const L = lays[li], h = heights[li]; y += h;
        const base = y - h * 0.24, px = L.R.px * L.fit;
        ctx.font = FONT(L.R.w, px); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const x0 = TEXT_X - L.width * L.fit / 2;
        L.chars.forEach((ch, i) => {
          const ta = line.at + 0.022 * i, k = lin(t, ta, ta + 0.3); if (k <= 0) return;
          const dy = (1 - backOut(k, 1.25)) * px * 0.45; let a = Math.min(1, k * 1.6);
          if (card.exit === 'fade') a *= 1 - lin(t, out + 0.01 * i, out + 0.3 + 0.01 * i);
          if (a <= 0.003) return;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(x0 + L.xs[i] * L.fit, base + dy);
          ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, px * 0.075); ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.strokeText(ch, 0, 0); ctx.fillStyle = this.colorOf(line, i); ctx.fillText(ch, 0, 0); ctx.restore();
        });
      });
    }
  }
  drawTag(ctx, t) {
    const g = TAGS.find((x) => t >= x.from && t < x.to); if (!g) return;
    const a = Math.min(lin(t, g.from, g.from + 0.25), 1 - lin(t, g.to - 0.2, g.to));
    ctx.save(); ctx.globalAlpha = 0.9 * a; ctx.fillStyle = C.wait; ctx.fillRect(64, 148, 24, 4);
    ctx.font = FONT(500, 32); ctx.textBaseline = 'middle'; ctx.fillStyle = '#e8eef8'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(g.text, 100, 150); ctx.fillText(g.text, 100, 150); ctx.restore();
  }
  drawNotes(ctx, t) {
    for (const n of NOTES) {
      if (t < n.from || t >= n.to) continue;
      const a = Math.min(lin(t, n.from + 0.1, n.from + 0.45), 1 - lin(t, n.to - 0.2, n.to));
      ctx.save(); ctx.globalAlpha = 0.92 * a; ctx.font = FONT(500, 31); ctx.textBaseline = 'top'; ctx.textAlign = 'left'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      n.lines.forEach((s, i) => { const fit = Math.min(1, 850 / ctx.measureText(s).width); ctx.save(); ctx.translate(72, 1420 + i * 44); ctx.scale(fit, 1); ctx.strokeText(s, 0, 0); ctx.fillStyle = '#c9d3e2'; ctx.fillText(s, 0, 0); ctx.restore(); });
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------------------- frame
  async render(f) {
    const t = Math.min(f / FPS, END - 1e-6), ctx = this.ctx, sc = sceneOf(f);
    this.tension = 0; this.shake = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    background(ctx, W, H, t);
    const since = (f - sc.f0) / FPS, punch = sc.f0 > 0 ? Math.exp(-since * 9) : 0;
    // stage with camera (punch on cuts, shake on releases); the shake amplitude is set by the scene, applied next frame-free
    ctx.save();
    const pre = this[sc.fn === 'release1' || sc.fn === 'release2' || sc.fn === 'finale' ? 'shakeOf' : 'noShake'](sc, t, f);
    const s = 1 + 0.035 * punch;
    ctx.translate(SX + pre[0], SY + pre[1]); ctx.scale(s, s); ctx.translate(-SX, -SY);
    this[sc.fn](ctx, t, f);
    ctx.restore();
    vignette(ctx, W, H, this.tension);
    this.drawTag(ctx, t);
    this.drawNotes(ctx, t);
    this.drawCards(ctx, t);
    const fade = lin(t, FADE_V0, FADE_V1);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
    return true;
  }
  noShake() { return [0, 0]; }
  shakeOf(sc, t, f) {   // deterministic shake from the scene's own release age (computed before drawing)
    const d = sc.fn === 'release1' ? T.d1 : sc.fn === 'release2' ? T.d2 : (t >= T.hit ? T.hit : T.d3);
    const amp = (sc.fn === 'finale' && t < T.hit ? 26 : sc.fn === 'finale' ? 10 : sc.fn === 'release2' ? 20 : 16) * Math.exp(-Math.max(0, t - d) * 7) + 3 * this.kick(f) * (t < T.hit ? 1 : 0);
    return [amp * (Math.sin(t * 91.7) * 0.6 + Math.sin(t * 53.3 + 1) * 0.4), amp * (Math.sin(t * 77.1 + 2) * 0.6 + Math.sin(t * 41.9) * 0.4)];
  }
}
