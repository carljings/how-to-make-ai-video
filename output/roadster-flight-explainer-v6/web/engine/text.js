// text.js — v6 type layer (Canvas2D): the text cards of cues.js, the provenance tag, the cable footnote and the
// centre-of-mass mark. Deterministic per frame. No Chinese literals live here: every string comes from cues.js.
import { CARDS, TAGS, STR, COLORS, ENTRY, STAGGER, EXIT, END } from './cues.js';
import { m4, clamp, mix, lin, easeOut, easeInOut, hash1, deg } from './math.js';

const FAMILY = 'V6Sans';                         // the bundled Roadster Film Sans (Noto Sans SC OFL subset) faces only
const FONT = `"${FAMILY}", sans-serif`;
const WEIGHTS = [300, 500, 700, 900];
const ROLE = {
  hero: { w: 900, size: 122, track: 4, color: 'white', maxW: 800, lead: 1.3 },
  support: { w: 500, size: 60, track: 6, color: 'dim', maxW: 860, lead: 1.55 },
  heavy: { w: 900, size: 112, track: 10, color: 'white', maxW: 800, lead: 1.32 },
  light: { w: 300, size: 112, track: 10, color: 'white', maxW: 800, lead: 1.32 },
  chapter: { w: 700, size: 76, track: 16, color: 'white', maxW: 860, lead: 1.5 },
  source: { w: 500, size: 28, track: 2, color: 'rgba(226,233,242,0.74)', maxW: 900, lead: 1.6 },
  title: { w: 900, size: 156, track: 18, color: 'white', maxW: 900, lead: 1.25 },
  credit: { w: 500, size: 27, track: 2, color: 'rgba(232,238,245,0.8)', maxW: 900, lead: 1.75 },
};
const GLOW = { red: 'rgba(255, 64, 72, 0.7)', gold: 'rgba(255, 168, 60, 0.75)', ice: 'rgba(130, 205, 255, 0.7)', cyan: 'rgba(60, 215, 255, 0.75)' };
const col = (c) => COLORS[c] || c;

export class TextLayer {
  constructor(W, H, scale) {
    this.W = W; this.H = H; this.s = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = H;
    this.ctx = this.canvas.getContext('2d');
  }

  async loadFonts(base) {
    const loads = WEIGHTS.map(async (w) => {
      try {
        const f = new FontFace(FAMILY, `url(${base}V5Sans-${w}.woff2)`, { weight: String(w) });
        await f.load();
        document.fonts.add(f);
        return true;
      } catch (e) { return false; }
    });
    this.fontOk = await Promise.all(loads);
    await document.fonts.ready;
    if (this.fontOk.some((ok) => !ok)) throw new Error('bundled fonts failed to load: ' + JSON.stringify(this.fontOk));
  }

  font(weight, px) { return `${weight} ${Math.round(px * this.s * 100) / 100}px ${FONT}`; }

  draw(st, frame) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    const fade = st.textFade ?? 1;
    if (fade <= 0) return this.canvas;
    const t = st.t;
    this.tag(st, t);
    if (st.cablePath) this.cableNote(st, t);
    if (st.comMark && st.comMark.alpha > 0) this.comMark(st);
    for (const c of CARDS) {
      if (t < c.lines[0].at - 0.001 || t > c.out + EXIT + (c.exit === 'fall' ? 0.6 : 0)) continue;
      this.card(c, t);
    }
    if (fade < 1) {     // fade the whole type layer with the picture
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0,0,0,${fade})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
    return this.canvas;
  }

  // ---------------------------------------------------------------------------------------------- provenance
  tag(st, t) {
    if (t >= TAGS.hideFrom) return;
    const ctx = this.ctx, s = this.s;
    const compact = st.tag === 'air' ? STR.tagAir : st.tag ? STR.tagNight : null;
    const intro = TAGS.sourceIntro;
    const kIntro = t < intro.to ? 1 - lin(t, intro.to - 0.3, intro.to) : 0;
    const line = (text, a) => {
      if (!text || a <= 0) return;
      ctx.save();
      ctx.globalAlpha = 0.62 * a;
      ctx.font = this.font(500, 26);
      ctx.letterSpacing = `${3 * s}px`;
      ctx.fillStyle = '#e6ecf3';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 8 * s;
      ctx.fillRect(64 * s, 205 * s, 28 * s, 2 * s);
      ctx.fillText(text, 106 * s, 214 * s);
      ctx.restore();
    };
    line(intro.text, kIntro);
    line(compact, 1 - kIntro);
  }

  // ---------------------------------------------------------------------------------------------- projection
  project(st, p) {
    const c = st.cam, sh = c.shift || [0, 0];
    const view = m4.lookAt(c.pos, c.target, c.up || [0, 0, 1]);
    const proj = m4.perspective(c.fov * deg, this.W / this.H, c.near || 0.05, c.far || 600, -sh[0], -sh[1]);
    const q = m4.project(m4.mul(proj, view), p);
    return [(q[0] * 0.5 + 0.5) * this.W, (1 - (q[1] * 0.5 + 0.5)) * this.H, q[2]];
  }

  // where a world polyline crosses the screen column x (first crossing in front of the camera), or null
  onPath(st, pts, x) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = this.project(st, pts[k]), b = this.project(st, pts[k + 1]);
      if (a[2] <= 0 || b[2] <= 0 || a[0] === b[0] || (a[0] - x) * (b[0] - x) > 0) continue;
      return [x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])];
    }
    return null;
  }

  // the required disclosure, a still footnote under the tag; a thin leader marks the top wire where it crosses x = 860
  cableNote(st, t) {
    const N = TAGS.cableNote;
    const a = Math.min(lin(t, N.from, N.from + 0.3), 1 - lin(t, N.to - 0.3, N.to));
    if (a <= 0) return;
    const ctx = this.ctx, s = this.s;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = this.font(500, 32);
    ctx.letterSpacing = `${2 * s}px`;
    const tw = ctx.measureText(N.text).width;
    const x0 = 64 * s, y0 = 262 * s, padX = 16 * s, h = 52 * s;
    ctx.fillStyle = 'rgba(4, 7, 11, 0.6)';
    ctx.fillRect(x0, y0, tw + 2 * padX, h);
    ctx.fillStyle = '#dfe7ef';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6 * s;
    ctx.fillText(N.text, x0 + padX, y0 + 36 * s);
    const p = this.onPath(st, st.cablePath, 860 * s);
    if (p && p[1] > y0 + h + 30 * s && p[1] < 1100 * s) {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(223, 231, 239, 0.8)';
      ctx.lineWidth = 1.5 * s;
      const ex = Math.min(x0 + tw + 2 * padX - 12 * s, p[0]);
      ctx.beginPath();
      ctx.moveTo(ex, y0 + h);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      ctx.fillStyle = '#dfe7ef';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // the centre of mass during the F1 freeze: a small ring + dot and a short label (the card names 重心)
  comMark(st) {
    const q = this.project(st, st.comMark.at);
    if (q[2] <= 0) return;
    const ctx = this.ctx, s = this.s;
    ctx.save();
    ctx.globalAlpha = st.comMark.alpha;
    ctx.strokeStyle = '#eef3f8';
    ctx.fillStyle = '#eef3f8';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6 * s;
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.arc(q[0], q[1], 10 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(q[0], q[1], 3.5 * s, 0, Math.PI * 2); ctx.fill();
    const lx = q[0] - 96 * s, ly = q[1] - 78 * s;
    ctx.beginPath(); ctx.moveTo(q[0] - 8 * s, q[1] - 7 * s); ctx.lineTo(lx + 8 * s, ly + 8 * s); ctx.stroke();
    ctx.font = this.font(500, 34);
    ctx.letterSpacing = `${2 * s}px`;
    ctx.textAlign = 'right';
    ctx.fillText(STR.com, lx, ly);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------------- cards
  layoutLine(line) {
    const R = ROLE[line.role];
    const ctx = this.ctx, s = this.s;
    const chars = [...line.text];
    const attr = chars.map(() => ({ color: R.color, scale: 1, glow: null, anim: null }));
    for (const sp of line.spans || []) {
      const i = line.text.indexOf(sp.k);
      if (i < 0) throw new Error(`span '${sp.k}' not in '${line.text}'`);
      const i0 = [...line.text.slice(0, i)].length;
      for (let j = 0; j < [...sp.k].length; j++) Object.assign(attr[i0 + j], { color: sp.color ?? attr[i0 + j].color, scale: sp.scale ?? 1, glow: sp.glow ?? sp.color ?? null, anim: sp.anim ?? null });
    }
    let size = R.size;
    const measure = (sz) => {
      ctx.font = this.font(R.w, sz);
      ctx.letterSpacing = '0px';
      return chars.map((ch, i) => (ch === ' ' ? 0.45 * sz * s : ctx.measureText(ch).width * attr[i].scale) + (i < chars.length - 1 ? R.track * s : 0));
    };
    let widths = measure(size);
    let total = widths.reduce((a, b) => a + b, 0);
    if (total > R.maxW * s) { size *= (R.maxW * s) / total; widths = measure(size); total = widths.reduce((a, b) => a + b, 0); }
    return { R, chars, attr, size, widths, total };
  }

  card(c, t) {
    const ctx = this.ctx, s = this.s;
    const L = c.lines.map((l) => ({ line: l, ...this.layoutLine(l) }));
    const heights = L.map((l) => l.size * l.R.lead * s);
    const blockH = heights.reduce((a, b) => a + b, 0);
    const exitK = c.exit === 'fall' ? 0 : lin(t, c.out, c.out + EXIT);
    const cardIn = lin(t, c.lines[0].at, c.lines[0].at + ENTRY);
    // soft scrim behind the block (legibility over bright plates); not under the title card
    if (c.id !== 'TITLE' && c.id !== 'CH') {
      const a = 0.34 * cardIn * (1 - (c.exit === 'fall' ? lin(t, c.out, c.out + 0.5) : exitK));
      if (a > 0) {
        ctx.save();
        ctx.translate(this.W / 2, c.y * s);
        ctx.scale(1, (blockH * 0.75 + 110 * s) / (560 * s));
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 560 * s);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-560 * s, -560 * s, 1120 * s, 1120 * s);
        ctx.restore();
      }
    }
    let y = c.y * s - blockH / 2;
    L.forEach((l, li) => {
      const base = y + heights[li] * 0.5 + l.size * 0.36 * s;
      y += heights[li];
      if (t < l.line.at - 0.001) return;
      this.drawLine(c, l, base, t, exitK);
      if (c.edge && li === L.length - 1) this.edgeRule(c, l, base, t, exitK);
      if (l.line.arrow) this.arrow(l, base, t, exitK);
    });
  }

  drawLine(c, l, base, t, exitK) {
    const ctx = this.ctx, s = this.s;
    const line = l.line, anim = line.anim || 'rise';
    let x = this.W / 2 - l.total / 2;
    // whole-line motion
    const la = clamp((t - line.at) / ENTRY);
    let lineDy = 0, lineSy = 1, lineAlpha = 1;
    if (anim === 'down') { const e = easeOut(clamp((t - line.at) / 0.45), 3); lineDy = -40 * s * (1 - e); lineAlpha = Math.min(1, la * 1.5); }
    if (anim === 'up') { const e = easeOut(clamp((t - line.at) / 0.45), 3); lineDy = 40 * s * (1 - e); lineAlpha = Math.min(1, la * 1.5); }
    if (anim === 'flip') { const e = easeInOut(clamp((t - line.at) / 0.5), 2.2); lineSy = Math.cos(Math.PI * (1 - e)); lineAlpha = Math.min(1, clamp((t - line.at) / 0.12)); }
    lineAlpha *= 1 - exitK;
    lineDy -= 10 * s * exitK;
    l.chars.forEach((ch, i) => {
      const w = l.widths[i];
      const cx = x + (w - (i < l.chars.length - 1 ? l.R.track * s : 0)) / 2;
      x += w;
      if (ch === ' ') return;
      const A = l.attr[i];
      const ti = line.at + STAGGER * i;
      let alpha = lineAlpha, dy = lineDy, sc = A.scale, sy = lineSy, rot = 0, blur = 0, ghosts = 0;
      if (anim === 'rise') {
        const a = clamp((t - ti) / ENTRY), e = easeOut(a, 3);
        alpha *= e; dy += 20 * s * (1 - e); blur = 7 * (1 - e);
      } else if (anim === 'drop') {
        const a = clamp((t - ti) / 0.26), e = easeOut(a, 2.4);
        alpha *= Math.min(1, a * 2); dy += -58 * s * (1 - e);
        const land = t - ti - 0.26;
        if (land > 0) sy *= 1 - 0.07 * Math.exp(-land * 22);
      } else if (anim === 'float') {
        const a = clamp((t - ti) / 0.75), e = easeOut(a, 2);
        alpha *= e; dy += 28 * s * (1 - e); blur = 5 * (1 - e);
      } else if (anim === 'none') {
        alpha *= t >= line.at ? 1 : 0;
      }
      if (A.anim === 'slam') {
        const u = t - line.at;
        const e = easeOut(clamp(u / 0.16), 3);
        sc *= mix(2.7, 1.0, e) * (1 + 0.035 * Math.sin(u * 34) * Math.exp(-u * 9) * (u > 0.16 ? 1 : 0));
        alpha *= clamp(u / 0.05);
        ghosts = u < 0.2 ? 3 : 0;
      }
      // exits
      if (c.exit === 'fall') {
        const tf = t - (c.out + 0.035 * i);
        if (tf > 0) { dy += 0.5 * 2600 * s * tf * tf; rot = (hash1(i, 7) - 0.5) * 2.4 * tf; alpha *= 1 - lin(tf, 0.18, 0.42); }
      }
      if (c.exit === 'crack' && c.crack && ch === c.crack.k && t >= c.crack.at) {
        this.crackGlyph(l, ch, cx, base + dy, sc, A, t - c.crack.at, alpha);
        return;
      }
      if (alpha <= 0.002) return;
      this.glyph(ch, cx, base + dy, l, A, { alpha, sc, sy, rot, blur, ghosts });
    });
  }

  glyph(ch, cx, by, l, A, { alpha, sc = 1, sy = 1, rot = 0, blur = 0, ghosts = 0 }) {
    const ctx = this.ctx, s = this.s;
    ctx.save();
    ctx.font = this.font(l.R.w, l.size);
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    ctx.translate(cx, by - l.size * 0.36 * s);
    ctx.rotate(rot);
    ctx.scale(sc, sc * sy);
    ctx.translate(0, l.size * 0.36 * s);
    if (blur > 0.4) ctx.filter = `blur(${(blur * s).toFixed(2)}px)`;
    const color = A.colorFn ? A.colorFn(ctx, cx, sc) : col(A.color);
    for (let g = ghosts; g >= 1; g--) {            // motion trail of a slam
      ctx.globalAlpha = alpha * 0.16 / g;
      ctx.fillStyle = color;
      ctx.fillText(ch, 0, -g * 16 * s);
    }
    if (A.glow && GLOW[A.glow]) {                   // soft coloured glow first …
      ctx.globalAlpha = alpha * 0.85;
      ctx.shadowColor = GLOW[A.glow];
      ctx.shadowBlur = 30 * s;
      ctx.fillStyle = color;
      ctx.fillText(ch, 0, 0);
    }
    ctx.globalAlpha = alpha;                        // … then the glyph with a dark legibility shadow
    ctx.shadowColor = 'rgba(0,0,0,0.62)';
    ctx.shadowBlur = 22 * s;
    ctx.shadowOffsetY = 3 * s;
    ctx.fillStyle = color;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  // the misconception breaks: 吸 splits along a jagged line, the halves drift apart and fade
  crackGlyph(l, ch, cx, by, sc, A, u, alpha) {
    const ctx = this.ctx, s = this.s;
    const k = easeOut(clamp(u / 0.3), 2), fadeK = 1 - lin(u, 0.08, 0.3);
    if (fadeK <= 0) return;
    const half = (top) => {
      ctx.save();
      const S = l.size * s * sc;
      ctx.beginPath();
      const pts = [];
      for (let j = 0; j <= 6; j++) pts.push([cx - 0.7 * S + j * 0.233 * S, by - 0.38 * S + (hash1(j, 9) - 0.5) * 0.3 * S]);
      if (top) { ctx.moveTo(cx - 0.8 * S, by - 1.4 * S); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(cx + 0.8 * S, by - 1.4 * S); }
      else { ctx.moveTo(cx - 0.8 * S, by + 0.6 * S); pts.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(cx + 0.8 * S, by + 0.6 * S); }
      ctx.closePath();
      ctx.clip();
      const dx = (top ? -22 : 20) * s * k, dy = (top ? -46 : 40) * s * k;
      this.glyph(ch, cx + dx, by + dy, l, A, { alpha: alpha * fadeK, sc, rot: (top ? -0.12 : 0.1) * k });
      ctx.restore();
    };
    half(true);
    half(false);
  }

  // 尽头: a thin white bar lights at the end of the line (the deck's free end)
  edgeRule(c, l, base, t, exitK) {
    const a = lin(t, c.edge.at - 0.05, c.edge.at + 0.2) * (1 - exitK);
    if (a <= 0) return;
    const ctx = this.ctx, s = this.s;
    const x = this.W / 2 + l.total / 2 + 30 * s;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(200, 225, 255, 0.95)';
    ctx.shadowBlur = 26 * s;
    ctx.fillRect(x, base - l.size * 0.86 * s, 7 * s, l.size * 1.0 * s);
    ctx.restore();
  }

  // 往下喷 / 往上推: a vector arrow after the line (no arrow glyphs needed from the font)
  arrow(l, base, t, exitK) {
    const line = l.line;
    const a = clamp((t - line.at) / 0.4) * (1 - exitK);
    if (a <= 0) return;
    const ctx = this.ctx, s = this.s;
    const dir = line.arrow === 'down' ? 1 : -1;
    const e = easeOut(clamp((t - line.at) / 0.5), 3);
    const x = this.W / 2 + l.total / 2 + 52 * s;
    const H = l.size * 0.92 * s, cy = base - l.size * 0.36 * s + dir * (1 - e) * -26 * s;
    const y0 = cy - dir * H / 2, y1 = cy + dir * H / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = col('cyan');
    ctx.fillStyle = col('cyan');
    ctx.shadowColor = GLOW.cyan;
    ctx.shadowBlur = 22 * s;
    ctx.lineWidth = 10 * s;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1 - dir * 22 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 24 * s, y1 - dir * 30 * s); ctx.lineTo(x + 24 * s, y1 - dir * 30 * s); ctx.lineTo(x, y1 + dir * 4 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

}

// the title role: a gold → white → cyan gradient across the whole line, built in each glyph's local coordinates
const baseGlyph = TextLayer.prototype.glyph;
TextLayer.prototype.glyph = function (ch, cx, by, l, A, o) {
  if (l.line && l.line.role === 'title') {
    const W = this.W, total = l.total;
    const colorFn = (ctx, gx, sc) => {
      const g = ctx.createLinearGradient((W / 2 - total / 2 - gx) / sc, 0, (W / 2 + total / 2 - gx) / sc, 0);
      g.addColorStop(0, '#ffd98f'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#8fe9ff');
      return g;
    };
    return baseGlyph.call(this, ch, cx, by, l, Object.assign({}, A, { colorFn }), o);
  }
  return baseGlyph.call(this, ch, cx, by, l, A, o);
};
