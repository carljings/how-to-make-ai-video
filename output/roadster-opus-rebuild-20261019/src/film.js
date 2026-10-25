// film.js — composes frame f: the 3D world (three.js) or a 2D graphic scene, then type, tag and fades. Pure in t.
import { W, H, FPS, END, T, SHOTS, shotAt, CARDS, TAGS, C, BEAT } from './timeline.js';
import { clamp, mix, ramp, lin, win, smooth, easeOut, easeIn, easeInOut, backOut, pchip, pchip3, lerp3, add3, sub3, scale3, norm3, len3, hash } from './lib.js';
import { World, loadModel } from './world3d.js';
import { tenTonnes, allDirections, crossSection, carProfile } from './gfx2d.js';

const FONT = (w, px) => `${w} ${px}px "NSC", sans-serif`;
const ROLE = { hero: { w: 900, px: 124, track: 6 }, big: { w: 900, px: 230, track: 14 }, support: { w: 500, px: 58, track: 4 }, note: { w: 500, px: 38, track: 2 } };
const COL = (c) => C[c] || c;

export class Film {
  async init(base) {
    this.model = await loadModel(base);
    this.world = new World(W, H, this.model);
    this.prof = carProfile(this.model.carMeta, this.model.carBuf);
    const out = this.out = document.getElementById('out');
    out.width = W; out.height = H;
    this.ctx = out.getContext('2d');
    this._clocks();
    this.frameCount = Math.round(END * FPS);
  }

  _clocks() {
    // source clocks (ev = seconds of Tesla's continuous wide take, the v9 fit's clock)
    this.evHook = pchip([[0, 8.30], [T.air, 8.46], [T.ten, 8.58]]);
    this.evChase = pchip([[T.chase, 8.85], [T.drop, 9.50]]);
    // the drop: a speed ramp, slowest through the roll (ev 9.8–10.8), back toward real time for the plunge
    const D = T.drop;
    this.evDrop = pchip([[D, 9.50], [T.tipOff, 9.80], [D + 1.3, 9.97], [T.flankOn, 10.15], [T.underOn, 10.42], [T.level, 10.72],
      [T.catch, 10.85], [D + 5.2, 11.2], [D + 6.2, 11.8], [D + 7.3, 12.45], [T.answer, 12.95]]);
    this.evAns = pchip([[T.answer, 8.50], [END, 8.62]]);
    // drop camera: the reference main camera's eye (v9 audit), aims keyed by source time (car framed upper-middle)
    this.dropAim = pchip3([[9.50, [-8.6, -0.9, 10.7]], [9.62, [-8.83, -0.83, 10.95]], [9.80, [-9.13, -0.73, 11.29]], [9.97, [-9.42, -0.65, 11.64]],
      [10.15, [-9.67, -0.49, 11.85]], [10.42, [-9.82, -0.04, 11.73]], [10.72, [-9.69, 0.84, 10.89]], [10.85, [-9.6, 1.2, 10.4]],
      [11.05, [-9.39, 2.20, 9.08]], [11.7, [-9.61, 4.66, 5.46]], [12.55, [-10.77, 6.58, 2.87]], [12.95, [-11.0, 6.8, 2.5]]]);
    this.dropFov = pchip([[9.5, 34], [10.42, 34.5], [10.85, 35], [11.05, 37], [11.7, 44], [12.55, 52], [12.95, 54]]);
  }

  // ------------------------------------------------------------------------------------------- 3D shots
  base3d(t, ev) {
    return { ev, cam: { pos: [0, -20, 5], target: [0, 0, 10], fov: 40 }, exposure: 1.0, bloom: 0.55, air: { alpha: 0, time: t }, lights: {}, arrows: [], cloud: 0 };
  }
  hook(t) {
    const ev = this.evHook(t), st = this.base3d(t, ev), w = this.world;
    const u = easeInOut(lin(t, 0.3, T.air - 0.1), 3.0);
    const near = w.local(ev, [3.4, -4.3, 2.2]), nearT = w.local(ev, [0.3, 0.0, 0.8]);
    const far = [-21.0, -19.5, 1.2], farT = add3(w.com(ev), [0.5, 0, -6.5]);
    st.cam.pos = lerp3(near, far, u); st.cam.target = lerp3(nearT, farT, easeInOut(lin(t, 0.3, T.air - 0.1), 2.4));
    st.cam.fov = mix(48, 52, u); st.cam.roll = mix(-0.06, 0, u);
    st.exposure = mix(0.74, 0.92, u); st.bloom = 0.6; st.lights = { key: mix(0.6, 1, u), rim: 1.3, curl: 1 };
    return st;
  }
  airReveal(t) {
    const ev = this.evHook(t), st = this.base3d(t, ev), w = this.world;
    const u = lin(t, T.air, T.ten);
    st.cam.pos = add3(w.com(ev), [mix(-3.5, -1.0, u), mix(-10.5, -9.0, u), mix(-6.0, -5.0, u)]);
    st.cam.target = add3(w.com(ev), [mix(-0.6, 0.2, u), 0, mix(-0.6, -0.4, u)]);
    st.cam.fov = mix(42, 38, easeInOut(u, 2));
    const k = ramp(t, T.air, T.air + 0.6);
    st.air = { alpha: 1.6 * k, time: t * 0.8 };
    st.exposure = mix(0.95, 0.72, k); st.lights = { key: mix(0.65, 0.45, k), rim: 1.2, curl: 0.7 };
    st.bloom = 0.6 + 0.25 * k; st.fog = mix(0.012, 0.02, k);
    return st;
  }
  chase(t) {
    const ev = this.evChase(t), st = this.base3d(t, ev), w = this.world, com = w.com(ev);
    const u = lin(t, T.chase, T.drop);
    st.cam.pos = add3(com, [mix(10.5, 6.5, easeIn(u, 1.6)), mix(-7.0, -5.6, u), mix(-3.6, -4.4, u)]);
    st.cam.target = add3(com, [mix(-3.0, -4.6, u), 0.3, mix(-0.4, -0.8, u)]);
    st.cam.fov = mix(46, 50, u); st.cam.roll = 0.04 * Math.sin(t * 2.2);
    st.lip = ramp(t, T.chase + 0.4, T.chase + 0.9); st.exposure = 1.0; st.bloom = 0.65;
    return st;
  }
  drop(t) {
    const ev = this.evDrop(t), st = this.base3d(t, ev), w = this.world, com = w.com(ev);
    st.cam.pos = [-24.13, -8.08, 0.3]; st.cam.target = this.dropAim(ev); st.cam.fov = this.dropFov(ev);
    // the underside wash (floor flood under the flight path, aimed at the car) rises as the underside turns to camera;
    // the curl flood moves over the landing area for the plunge
    const wash = 800 + 700 * ramp(ev, 10.05, 10.35) - 700 * ramp(ev, 11.4, 11.9);
    st.lights = { key: 0.85, rim: 1.2, curl: 0, extra: { pos: [-15.5, -7.5, 0.6], aim: com, cd: wash * 0.6, angle: 10 },
      land: 0.6 * ramp(ev, 10.8, 11.6) };
    st.jets = { time: ev, gain: 1.0, nose: 0.55, len: 3.0 + 1.2 * clamp((com[2] - 3) / 8, 0, 1) };
    st.cloud = 1;
    st.exposure = 1.0; st.bloom = 0.62;
    return st;
  }
  answer(t) {
    const ev = this.evAns(t), st = this.base3d(t, ev), w = this.world;
    const u = easeInOut(lin(t, T.answer, END), 1.6);
    const ang = mix(-0.55, 0.3, u), r = mix(13.5, 11.0, u), com = w.com(ev);
    st.cam.pos = add3(com, [Math.sin(ang) * r - 2.0, -Math.cos(ang) * r, -5.0 + 0.5 * u]);
    st.cam.target = add3(com, [-0.4, 0, -2.6]);
    st.cam.fov = 44;
    st.air = { alpha: 1.2 * ramp(t, T.answer, T.answer + 0.8), time: t * 0.6 };
    st.exposure = 0.88; st.bloom = 0.7; st.lights = { key: 0.55, rim: 1.25, curl: 0.8 };
    // net push: from outside (below the roof) up into the deck; gravity: world-down from the centre of mass
    const kA = ramp(t, T.ansA - 0.3, T.ansA + 0.3), kG = ramp(t, T.ansB + 0.2, T.ansB + 0.7);
    const a = w.local(ev, [-0.3, 0, 4.2]), b = w.local(ev, [-0.3, 0, -0.12]);   // from outside the roof side, through the car, into the deck
    const db = ((t - T.answer) / (2 * BEAT)) % 1, beat = Math.exp(-db * 7);          // the push pulses on each downbeat, with the music
    if (kA > 0) st.arrows.push({ a, b, width: 0.42 * (1 + 0.14 * beat * kA), color: C.orange, k: kA, glow: 1.25 + 0.35 * beat });
    const g0 = w.local(ev, [0.9, 0.0, 0.5]);
    if (kG > 0) st.arrows.push({ a: g0, b: add3(g0, [0, 0, -1.6]), width: 0.2, color: '#ffffff', k: kG, glow: 1.0 });
    return st;
  }

  // ------------------------------------------------------------------------------------------- type
  layoutLine(ctx, line) {
    const R = ROLE[line.role]; ctx.font = FONT(R.w, R.px);
    const chars = [...line.text]; let x = 0; const xs = [];
    for (const ch of chars) { xs.push(x); x += ctx.measureText(ch).width + R.track; }
    const width = x - R.track, fit = Math.min(1, 960 / width);
    return { chars, xs, width, fit, R };
  }
  colorOf(line, i) {
    for (const s of line.spans || []) { const k = line.text.indexOf(s.k); if (k >= 0 && i >= k && i < k + [...s.k].length) return COL(s.c); }
    return line.role === 'note' ? C.dim : C.white;
  }
  drawCards(ctx, t) {
    for (const card of CARDS) {
      if (t < card.lines[0].at - 0.01 || t > card.out + 1.2) continue;
      const lays = card.lines.map((l) => this.layoutLine(ctx, l));
      const heights = lays.map((L) => L.R.px * L.fit * 1.32);
      const total = heights.reduce((a, b) => a + b, 0);
      // scrim behind the block (cheap gradient, no blur)
      const vis = Math.min(1, lin(t, card.lines[0].at - 0.1, card.lines[0].at + 0.3)) * (1 - lin(t, card.out, card.out + 0.35));
      if (vis > 0) {
        const y0 = card.y - total / 2 - 120, y1 = card.y + total / 2 + 120;
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, `rgba(0,0,0,${0.42 * vis})`); g.addColorStop(0.7, `rgba(0,0,0,${0.42 * vis})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
      }
      let y = card.y - total / 2;
      card.lines.forEach((line, li) => {
        const L = lays[li], h = heights[li]; y += h;
        const base = y - h * 0.24, px = L.R.px * L.fit;
        ctx.font = FONT(L.R.w, px); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const x0 = W / 2 - L.width * L.fit / 2;
        L.chars.forEach((ch, i) => {
          const ta = line.at + 0.022 * i, k = lin(t, ta, ta + 0.3);
          if (k <= 0) return;
          let dy = (1 - backOut(k, 1.2)) * px * 0.42, a = Math.min(1, k * 1.6), rot = 0, dx = 0;
          if (card.exit === 'fall') {
            const tf = t - (card.out + 0.03 * i);
            if (tf > 0) { dy += 1300 * tf * tf + 80 * tf; rot = (hash(i, 3) - 0.5) * 2.4 * tf; dx = (hash(i, 4) - 0.5) * 140 * tf; a *= 1 - lin(tf, 0.35, 0.75); }
          } else a *= 1 - lin(t, card.out + 0.012 * i, card.out + 0.2 + 0.012 * i);
          if (a <= 0.003) return;
          const X = x0 + L.xs[i] * L.fit + dx, Y = base + dy;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(X, Y); if (rot) ctx.rotate(rot);
          ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, px * 0.07); ctx.strokeStyle = 'rgba(0,0,0,0.55)';
          ctx.strokeText(ch, 0, 0); ctx.fillStyle = this.colorOf(line, i); ctx.fillText(ch, 0, 0);
          ctx.restore();
        });
      });
    }
  }
  drawTag(ctx, t) {
    const g = TAGS.find((x) => t >= x.from && t < x.to); if (!g) return;
    const a = Math.min(lin(t, g.from, g.from + 0.25), 1 - lin(t, g.to - 0.2, g.to)) * (g.from === 0 ? 1 : 1);
    ctx.save(); ctx.globalAlpha = 0.82 * Math.max(a, g.from === 0 && t < 0.25 ? 1 : 0);
    ctx.fillStyle = 'rgba(230,236,245,0.9)'; ctx.fillRect(64, 196, 30, 3);
    ctx.font = FONT(500, 30); ctx.textBaseline = 'middle'; ctx.fillStyle = '#e6ecf5';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText(g.text, 108, 198); ctx.fillText(g.text, 108, 198);
    ctx.restore();
  }

  // ------------------------------------------------------------------------------------------- frame
  async render(f) {
    const t = Math.min(f / FPS, END - 1e-6), ctx = this.ctx, shot = shotAt(t);
    const since = t - shot.t0, punch = shot.t0 > 0 ? Math.exp(-since * 9) : 0;          // a short kick on every cut
    if (shot.kind === '3d') {
      const st = this[shot.fn](t);
      st.cam.fov *= 1 - 0.07 * punch;
      this.world.set(st);
      ctx.drawImage(this.world.render(), 0, 0);
    } else {
      // 2D: a scale kick on the cut and a light breath on each downbeat (two beats), centred on the diagram
      const db = (t / (2 * BEAT)) % 1, k = 1 + 0.06 * punch + 0.008 * Math.exp(-db * 10);
      ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(k, k); ctx.translate(-W / 2, -H * 0.45);
      if (shot.fn === 'tenTonnes') tenTonnes(ctx, t);
      else if (shot.fn === 'allDirections') allDirections(ctx, t);
      else if (shot.fn === 'crossSection') crossSection(ctx, t, this.prof);
      ctx.restore();
    }
    // a quick light sweep on every cut (no white frame): a thin bright band crossing in 0.25 s
    for (const s of SHOTS) {
      const u = (t - s.t0) / 0.15;
      if (s.t0 > 0 && u >= 0 && u < 1) {
        const y = mix(-200, H + 200, easeOut(u, 2)), g = ctx.createLinearGradient(0, y - 160, 0, y + 160);
        g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, `rgba(160,210,255,${0.18 * (1 - u)})`); g.addColorStop(1, 'rgba(160,210,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, y - 160, W, 320);
      }
    }
    this.drawTag(ctx, t);
    this.drawCards(ctx, t);
    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // the end: fade to black, then black
    const fade = lin(t, T.fadeStart, T.fadeEnd);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
    // first frames: fade in from black over 0.15 s (no hard pop at frame 0 is NOT wanted: frame 0 must show the car)
    return true;
  }
}
