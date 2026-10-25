// text.js — Canvas2D type layer: slates, captions, labels and the kinetic word moments. Deterministic per frame.
import { m4, clamp, mix, smooth, lin, easeOut, easeIn, hash1, deg } from './math.js';

const FONT = '"V5Sans", "Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", sans-serif';
const GOLDC = '#ffc06a', AIRC = '#9fdcff', OWNC = '#5fe3ff';
const CAP_COLORS = {
  V03: [['空气', AIRC], ['压', GOLDC]],
  V04: [['抽走', AIRC]],
  V05: [['外面压得重', GOLDC], ['缝里压得轻', AIRC]],
  V06: [['死死按', GOLDC], ['抓得住', '#ffffff']],
  V07: [['压向坡面', GOLDC]],
  V08: [['尽头', '#ffffff']],
  V09: [['敞开', AIRC], ['压不住', GOLDC]],
  V10: [['自带的高压气', OWNC]],
  V11: [['往下喷', OWNC], ['往上推', OWNC]],
  V13: [['偏离重心', OWNC]],
  V14: [['翻', '#ffffff']],
  V15: [['借', GOLDC], ['空气的力', GOLDC]],
  V16: [['花', OWNC], ['自己的气', OWNC]],
  V17: [['自己的气', OWNC], ['喷完', OWNC]],
};

export class TextLayer {
  constructor(W, H, scale) {
    this.W = W; this.H = H; this.s = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
  }

  async loadFonts(base) {
    const weights = [300, 500, 700, 900];
    const loads = weights.map(async (w) => {
      try {
        const f = new FontFace('V5Sans', `url(${base}V5Sans-${w}.woff2)`, { weight: String(w) });
        await f.load();
        document.fonts.add(f);
        return true;
      } catch (e) { return false; }
    });
    this.fontOk = await Promise.all(loads);
    await document.fonts.ready;
  }

  font(weight, px) { return `${weight} ${Math.round(px * this.s)}px ${FONT}`; }

  draw(st, frame) {
    const ctx = this.ctx, s = this.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = 1;
    const fade = st.textFade ?? 1;
    if (fade <= 0) return this.canvas;
    if (st.slate) this.slate(st.slate);
    if (st.labels) for (const L of st.labels) this.label(st, L);
    if (st.kinetic) {
      if (st.kinetic.kind === 'v01') this.v01(st);
      if (st.kinetic.kind === 'xi') this.xi(st);
      if (st.kinetic.kind === 'ya') this.ya(st);
      if (st.kinetic.kind === 'sep') this.sep(st);
      if (st.kinetic.kind === 'ending') this.ending(st);
    }
    for (const c of st.captions || []) this.caption(c);
    if (fade < 1) {     // fade the whole type layer with the picture
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
    return this.canvas;
  }

  slate(text) {
    const ctx = this.ctx, s = this.s;
    ctx.save();
    ctx.font = this.font(400, 26);
    ctx.letterSpacing = `${2 * s}px`;
    ctx.fillStyle = 'rgba(226, 233, 242, 0.62)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6 * s;
    ctx.fillRect(64 * s, 205 * s, 30 * s, 2 * s);
    ctx.fillText(text, 110 * s, 214 * s);
    ctx.restore();
  }

  // caption line in the Douyin-safe band, with keyword colours
  caption(c) {
    const ctx = this.ctx, s = this.s;
    const text = c.text.replace(/[，。：；、]$/u, '');
    const y = 1395 * s - 10 * s * (1 - c.alpha);
    ctx.save();
    ctx.font = this.font(700, 54);
    ctx.letterSpacing = `${1.5 * s}px`;
    const colors = new Array([...text].length).fill('#ffffff');
    for (const [k, col] of CAP_COLORS[c.id] || []) {
      const i = text.indexOf(k);
      if (i >= 0) for (let j = 0; j < [...k].length; j++) colors[i + j] = col;
    }
    const chars = [...text];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = this.W / 2 - total / 2;
    ctx.globalAlpha = c.alpha;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 6 * s;
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 16 * s;
    chars.forEach((ch, i) => { ctx.strokeText(ch, x, y); x += widths[i]; });
    ctx.shadowBlur = 0;
    x = this.W / 2 - total / 2;
    chars.forEach((ch, i) => { ctx.fillStyle = colors[i]; ctx.fillText(ch, x, y); x += widths[i]; });
    ctx.restore();
  }

  project(st, p) {
    const c = st.cam;
    const view = m4.lookAt(c.pos, c.target, c.up || [0, 0, 1]);
    const proj = m4.perspective(c.fov * deg, this.W / this.H, 0.05, 600);
    const q = m4.project(m4.mul(proj, view), p);
    return [(q[0] * 0.5 + 0.5) * this.W, (1 - (q[1] * 0.5 + 0.5)) * this.H, q[2]];
  }

  // where a world polyline crosses the screen column x (first crossing in front of the camera), or null
  onPath(st, pts, x) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = this.project(st, pts[k]), b = this.project(st, pts[k + 1]);
      if (a[2] <= 0 || b[2] <= 0 || a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
      return [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]), 1];
    }
    return null;
  }

  label(st, L) {
    if (!(L.alpha > 0)) return;
    const ctx = this.ctx, s = this.s;
    // the dot sits on a world point, or rides a polyline (L.path) where it crosses the screen column L.col
    const p = L.path ? this.onPath(st, L.path, L.col * s) : this.project(st, L.at);
    if (!p || p[2] <= 0) return;
    const [x, y] = p;
    const px = L.small ? 32 : 40;
    ctx.save();
    ctx.globalAlpha = L.alpha;
    const col = L.color || '#bfe6ff';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2 * s;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8 * s;
    ctx.font = this.font(500, px);
    ctx.letterSpacing = `${1 * s}px`;
    const lines = L.text.split('\n');
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const plate = (x0, y0, w, h) => {      // dark backing so the type reads over plumes, fog and floor
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(3, 6, 10, 0.58)';
      ctx.fillRect(x0, y0, w, h);
      ctx.restore();
    };
    ctx.beginPath();
    ctx.arc(x, y, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    if (L.textAt) {
      // the text block stays put (centre L.textAt); a straight leader runs from the dot to the block's near edge
      const lh = px * 1.3 * s, pad = 12 * s;
      const bw = tw + 2 * pad, bh = lines.length * lh + pad;
      const bx = L.textAt[0] * s - bw / 2, by = L.textAt[1] * s - bh / 2;
      const ex = clamp(x, bx + pad, bx + bw - pad), ey = y > by + bh / 2 ? by + bh : by;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (L.plate) plate(bx, by, bw, bh);
      ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + pad / 2 + (i + 0.8) * lh));
      ctx.restore();
      return;
    }
    // keep the text inside the frame: mirror the label to the other side of its dot if it would leave it
    const leaves = (dx) => {
      const t0 = x + dx * s, t1 = t0 + Math.sign(dx || 1) * (34 * s + tw);
      return Math.min(t0, t1) < 24 * s || Math.max(t0, t1) > this.W - 24 * s;
    };
    const dx = leaves(L.dx) && !leaves(-L.dx) ? -L.dx : L.dx;
    const sg = Math.sign(dx || 1);
    const tx = x + dx * s, ty = y + L.dy * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx + sg * 26 * s, ty);
    ctx.stroke();
    const bx = tx + sg * 34 * s, by = ty + (L.small ? 9 : 11) * s;
    if (L.plate) plate(sg > 0 ? bx - 10 * s : bx - tw - 10 * s, by - px * 0.95 * s, tw + 20 * s, px * 1.3 * s);
    ctx.textAlign = sg < 0 ? 'right' : 'left';
    ctx.fillText(L.text, bx, by);
    ctx.restore();
  }

  // 「连灰都往下掉」 appear as spoken, then fall away like the dust; 「它凭什么不掉？」 stays pinned
  v01(st) {
    const ctx = this.ctx, s = this.s, t = st.t, E = st.E;
    const chars = st.voice.charsOf('V01');
    const flat = chars.map((c) => c.ch);
    const split = flat.indexOf('它');
    ctx.save();
    ctx.textAlign = 'center';
    const out = clamp((E.cut12 - t) / 0.2);
    // line 1
    const l1 = chars.slice(0, split);
    const size1 = 86;
    ctx.font = this.font(900, size1);
    const w1 = l1.map((c) => ctx.measureText(c.ch).width);
    const tot1 = w1.reduce((a, b) => a + b, 0) + 14 * s * (l1.length - 1);
    let x = this.W / 2 - tot1 / 2;
    const y1 = 1060 * s;
    l1.forEach((c, i) => {
      const cx = x + w1[i] / 2;
      x += w1[i] + 14 * s;
      const a = lin(t, c.s - 0.04, c.s + 0.08);
      if (a <= 0) return;
      const tf = t - (E.fallAt + i * 0.055);
      let dy = 0, rot = 0, alpha = a;
      if (tf > 0) {
        dy = 0.5 * 5200 * tf * tf * s;
        rot = (hash1(i, 3) - 0.5) * 1.6 * tf * 3;
        alpha *= 1 - lin(tf, 0.18, 0.36);
      }
      const pop = 1 + 0.18 * Math.exp(-(t - c.s) * 14) * (t > c.s ? 1 : 0);
      for (let g = 0; g < (tf > 0 ? 4 : 1); g++) {
        const gy = dy - g * 0.012 * 3600 * Math.max(tf, 0) * s;
        ctx.save();
        ctx.globalAlpha = alpha * (g === 0 ? 1 : 0.18 / g);
        ctx.translate(cx, y1 + gy);
        ctx.rotate(rot);
        ctx.scale(pop, pop);
        ctx.fillStyle = '#f4f7fb';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 18 * s;
        ctx.fillText(c.ch, 0, 0);
        ctx.restore();
      }
    });
    // line 2: pinned
    const l2 = chars.slice(split);
    const size2 = 104;
    ctx.font = this.font(900, size2);
    const w2 = l2.map((c) => ctx.measureText(c.ch).width);
    const tot2 = w2.reduce((a, b) => a + b, 0) + 6 * s * (l2.length - 1);
    x = this.W / 2 - tot2 / 2;
    const y2 = 1290 * s;
    l2.forEach((c, i) => {
      const cx = x + w2[i] / 2;
      x += w2[i] + 6 * s;
      const a = lin(t, c.s - 0.03, c.s + 0.06) * out;
      if (a <= 0) return;
      const key = c.ch === '不' || c.ch === '掉';
      const pop = 1 + (key ? 0.32 : 0.12) * Math.exp(-(t - c.s) * 12) * (t > c.s ? 1 : 0);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cx, y2);
      ctx.scale(pop, pop);
      ctx.fillStyle = key ? '#ffffff' : '#eef2f7';
      ctx.shadowColor = key ? 'rgba(255, 60, 70, 0.75)' : 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = (key ? 30 : 18) * s;
      ctx.fillText(c.ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  // 「吸」 is drawn into the slit, then cracks
  xi(st) {
    const ctx = this.ctx, s = this.s, t = st.t, E = st.E;
    const t0 = E.xi;
    if (t < t0 - 0.05) return;
    const a = lin(t, t0 - 0.05, t0 + 0.12);
    const u = clamp((t - t0) / 1.0);
    const tc = t - E.crack;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = this.font(900, 230);
    let cx = this.W / 2, cy = 1040 * s;
    if (st.xiAt) { const q = this.project(st, st.xiAt); if (q[2] > 0) { cx = q[0]; cy = q[1]; } }
    const sy = mix(1.0, 0.3, easeIn(u, 2));
    const sx = mix(1.0, 1.35, easeIn(u, 2));
    cy += mix(120, 0, easeIn(u, 1.5)) * s;
    const draw = (dx, dy, alpha, clipTop) => {
      ctx.save();
      ctx.beginPath();
      // jagged crack through the middle
      const pts = [];
      for (let k = 0; k <= 8; k++) pts.push([cx - 200 * s + k * 50 * s, cy - 70 * s * sy + (hash1(k, 9) - 0.5) * 50 * s * sy]);
      if (clipTop) { ctx.moveTo(cx - 220 * s, cy - 400 * s); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(cx + 220 * s, cy - 400 * s); }
      else { ctx.moveTo(cx - 220 * s, cy + 300 * s); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(cx + 220 * s, cy + 300 * s); }
      ctx.closePath();
      ctx.clip();
      ctx.translate(cx + dx, cy + dy);
      ctx.scale(sx, sy);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#dff1ff';
      ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
      ctx.shadowBlur = 26 * s;
      ctx.fillText('吸', 0, 80 * s);
      ctx.restore();
    };
    if (tc < 0) {
      draw(0, 0, a, true);
      draw(0, 0, a, false);
    } else {
      const k = easeOut(clamp(tc / 0.35), 2);
      const fade = 1 - lin(tc, 0.12, 0.32);
      draw(-30 * s * k, -90 * s * k, a * fade, true);
      draw(26 * s * k, 70 * s * k, a * fade, false);
    }
    ctx.restore();
  }

  // 「压」 slams in gold with a shockwave
  ya(st) {
    const ctx = this.ctx, s = this.s, t = st.t, E = st.E;
    const tq = t - E.press;
    if (tq < 0) return;
    const out = 1 - lin(t, E.cut34 - 0.35, E.cut34 - 0.05);
    const k = easeOut(clamp(tq / 0.13), 3);
    const sc = mix(1.9, 1.0, k) * (1 + 0.04 * Math.sin(tq * 30) * Math.exp(-tq * 8));
    let cx = this.W / 2, cy = 1185 * s;
    if (st.yaAt) { const q = this.project(st, st.yaAt); if (q[2] > 0) { cx = q[0]; cy = q[1] + 230 * s; } }
    ctx.save();
    ctx.textAlign = 'center';
    // shockwave
    const r = easeOut(clamp(tq / 0.5), 2) * 520 * s;
    ctx.globalAlpha = (1 - clamp(tq / 0.5)) * 0.8;
    ctx.strokeStyle = '#ffb04a';
    ctx.lineWidth = 6 * s * (1 - clamp(tq / 0.5)) + 1;
    ctx.beginPath();
    ctx.arc(cx, cy - 90 * s, r, 0, Math.PI * 2);
    ctx.stroke();
    // glyph
    ctx.globalAlpha = clamp(tq / 0.05) * out;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    ctx.font = this.font(900, 250);
    const g = ctx.createLinearGradient(0, -200 * s, 0, 20 * s);
    g.addColorStop(0, '#fff3d6');
    g.addColorStop(0.55, '#ffc062');
    g.addColorStop(1, '#ff8a1e');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(255, 150, 40, 0.9)';
    ctx.shadowBlur = 40 * s;
    ctx.fillText('压', 0, 0);
    ctx.restore();
  }

  // the hard separator before the other demonstration
  sep(st) {
    const ctx = this.ctx, s = this.s, t = st.t, E = st.E;
    const a = lin(t, E.black + 0.05, E.black + 0.2);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f2f5f9';
    ctx.font = this.font(700, 64);
    ctx.letterSpacing = `${10 * s}px`;
    ctx.fillText('另一场演示', this.W / 2 + 5 * s, 930 * s);
    ctx.fillStyle = 'rgba(226, 233, 242, 0.7)';
    ctx.font = this.font(400, 28);
    ctx.letterSpacing = `${2 * s}px`;
    ctx.fillText('CG重建 · 据马斯克 2026.10.16 发布的视频', this.W / 2, 1000 * s);
    ctx.fillRect(this.W / 2 - 22 * s, 852 * s, 44 * s, 2 * s);
    ctx.restore();
  }

  glyph(ch, x, y, size, grad, glow, alpha, sc = 1) {
    const ctx = this.ctx, s = this.s;
    if (alpha <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.font = this.font(900, size);
    const g = ctx.createLinearGradient(0, -size * 0.8 * s, 0, size * 0.1 * s);
    grad.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 40 * s;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  // 借 (gold, the ramp) and 花 (ice cyan, the airborne path); then the title card
  ending(st) {
    const ctx = this.ctx, s = this.s, t = st.t, E = st.E;
    const out = 1 - lin(t, E.own2 - 0.25, E.own2 + 0.25);
    const pop = (t0) => 1 + 0.35 * Math.exp(-(t - t0) * 10) * (t > t0 ? 1 : 0);
    const aJ = lin(t, E.borrow - 0.04, E.borrow + 0.1) * out;
    const aH = lin(t, E.spend - 0.04, E.spend + 0.1) * out;
    this.glyph('借', 820 * s, 330 * s, 210, [[0, '#fff3d6'], [0.55, '#ffc062'], [1, '#ff8a1e']], 'rgba(255, 150, 40, 0.85)', aJ, pop(E.borrow));
    this.glyph('花', 230 * s, 640 * s, 210, [[0, '#e9fdff'], [0.55, '#7fe9ff'], [1, '#22b8ff']], 'rgba(60, 200, 255, 0.85)', aH, pop(E.spend));
    // title
    const a = lin(t, E.title, E.title + 0.6);
    if (a <= 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = a;
    ctx.font = this.font(900, 150);
    ctx.letterSpacing = `${16 * s}px`;
    const g = ctx.createLinearGradient(this.W * 0.2, 0, this.W * 0.8, 0);
    g.addColorStop(0, '#ffd98f');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(1, '#8fe9ff');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 30 * s;
    ctx.fillText('空气现形', this.W / 2 + 8 * s, 330 * s);
    ctx.shadowBlur = 8 * s;
    ctx.font = this.font(400, 28);
    ctx.letterSpacing = `${2 * s}px`;
    ctx.fillStyle = 'rgba(232, 238, 245, 0.8)';
    ctx.fillText('CG重建 · 据特斯拉 2026.10.16 发布的视频', this.W / 2, 415 * s);
    ctx.fillText('CG重建 · 据马斯克 2026.10.16 发布的视频', this.W / 2, 460 * s);
    ctx.fillText('原理示意 · 非实拍', this.W / 2, 505 * s);
    ctx.restore();
  }
}
