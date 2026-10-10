// scenes.js: one function per act; each draws the picture and returns small annotation labels.
import { TAU, clamp, lerp, seg, smooth, easeInOut, easeOut } from './lib.js';
import { FLASHES, PULSES, ZAP, GATE_LIGHT, GATE_OPEN, DELIVER, AMBER_ON, MOUSE_LIGHT, GOGGLES_ON, flash, lightOn } from './timeline.js';
import { C, HERO, SIDE, drawNeuron, drawSpike, fiber, drawField, alga, membrane, dna, capsid, chart, mouse, eye, perceived } from './art.js';

const label = (value, x, y, size = 26, color = '#8ea2b4', a = 1) => ({ value, x, y, size, color, a });

function hero(g, t, { x = 430, y = 1080, s = 1.05, a = 1 } = {}) {
  const f = flash(t, FLASHES, 0.35);
  fiber(g, x, 650, y - 74, C.blue, f, [x, y - 8], 52, a);
  drawNeuron(g, HERO, x, y, s, { a, soma: 0.12 + f * 0.88 });
  if (f > 0.02) { g.glow(x, y, 60 + 120 * f, C.white, a * f * 0.85, 'glow'); g.glow(x, y, 600, C.blue, a * f * 0.18, 'halo'); }
  for (const p of FLASHES) {
    const k = (t - p) / 0.8; if (k > 0 && k < 1) g.glowArc(x, y, 36 + k * 300 * s, C.blue, a * (1 - k) * 0.8, 2.4);
    drawSpike(g, HERO, x, y, s, (t - p - 0.05) / 0.6, C.blue, a);
  }
}

function cone(g, x1, y1, x2, y2, col, k, w1, w2) {
  if (k <= 0.01) return;
  const add = g.add(), gr = add.createLinearGradient(x1, y1, x2, y2);
  gr.addColorStop(0, `rgba(${col.join(',')},${0.42 * k})`); gr.addColorStop(1, `rgba(${col.join(',')},${0.07 * k})`);
  add.fillStyle = gr; add.beginPath(); add.moveTo(x1 - w1, y1); add.lineTo(x1 + w1, y1); add.lineTo(x2 + w2, y2); add.lineTo(x2 - w2, y2); add.closePath(); add.fill();
}

// Mouse running speed: 1 with the light on, slowing to a walk when it goes off. Precomputed so frames stay pure.
const MS = 240, M0 = 48, M1 = 55, speedTab = [], phaseTab = [];
{
  let v = 0.18, ph = 0;
  for (let i = 0; i <= (M1 - M0) * MS; i++) {
    const t = M0 + i / MS, target = lightOn(t, MOUSE_LIGHT) ? 1 : 0.18;
    v += (target - v) * (1 - Math.exp(-1 / MS / (target > v ? 0.25 : 0.8)));
    ph += (v * 13) / MS; speedTab.push(v); phaseTab.push(ph);
  }
}
const mouseState = t => { const i = Math.round(clamp((t - M0) * MS, 0, speedTab.length - 1)); return [speedTab[i], phaseTab[i]]; };

const NEAR = [{ x: 800, y: 820, sp: [43.4, 44.5, 45.6, 46.4, 47.3] }, { x: 150, y: 780, sp: [43.8, 45.1, 46.0, 47.0] }, { x: 760, y: 1170, sp: [44.0, 44.9, 46.2, 47.5] }];

export function drawScene(g, t, s) {
  const u = seg(t, s.a, s.b);
  switch (s.id) {
    case 'hook': hero(g, t); return [label('光纤', 452, 690), label('神经元', 110, 1400)];
    case 'network': {
      const k = smooth(seg(t, 3, 3.9));
      if (k < 1) hero(g, t, { x: lerp(430, 540, k), y: 1080, s: lerp(1.05, 0.2, k), a: 1 - k });
      drawField(g, t, { zoom: lerp(3, 1, easeInOut(seg(t, 3.05, 4.4))), a: smooth(seg(t, 3.05, 3.8)) });
      return [];
    }
    case 'electrode': {
      const tipX = 650, tipY = 1080, ins = easeOut(seg(t, 9.0, 9.8)), out = smooth(seg(t, 12.0, 12.6));
      const reach = ins * (1 - out), x0 = 1080, y0 = 640, tx = lerp(x0, tipX, reach), ty = lerp(y0, tipY, reach);
      const z = flash(t, [ZAP], 0.55), sel = smooth(seg(t, 12.2, 12.9));
      drawField(g, t, { zap: { x: tipX, y: tipY, r: 340, k: z }, select: sel });
      if (reach > 0.01) {
        g.line(x0 + 40, y0 - 20, tx, ty, [150, 162, 178], 0.9, 7); g.line(x0 + 40, y0 - 20, tx, ty, C.white, 0.35, 2);
        g.glow(tx, ty, 14, C.white, 0.6 + z * 0.4, 'glow');
        if (z > 0.02) { g.glow(tipX, tipY, 160, C.white, z * 0.8, 'glow'); g.glow(tipX, tipY, 520, C.white, z * 0.25, 'halo'); }
      }
      return reach > 0.3 ? [label('电极', 860, 760, 28)] : sel > 0.5 ? [label('同一类细胞（示意）', 80, 1445, 26, '#7fc8ff', sel)] : [];
    }
    case 'algae': {
      g.glow(540, 1060, 760, C.green, 0.07, 'halo');
      const sx = 860, sy = 800; g.glow(sx, sy, 70, C.sun, 0.9, 'glow'); g.glow(sx, sy, 300, C.sun, 0.18, 'halo');
      for (let i = 0; i < 12; i++) { const k = (i / 12) * TAU + t * 0.15; g.line(sx + Math.cos(k) * 70, sy + Math.sin(k) * 70, sx + Math.cos(k) * 120, sy + Math.sin(k) * 120, C.sun, 0.25, 2); }
      const m = easeInOut(seg(t, 15, 19.4)), x = lerp(300, 620, m) + Math.sin(t * 5) * 8, y = lerp(1380, 1060, m) + Math.cos(t * 5) * 8;
      const { eye: [ex, ey] } = alga(g, x, y, 1.4, t, Math.atan2(sy - y, sx - x));
      const zin = smooth(seg(t, 19.6, 20.3));
      if (zin > 0.01) {
        const cx = 480, cy = 1310, r = 150, ctx = g.normal();
        ctx.globalAlpha = zin; ctx.fillStyle = 'rgba(4,14,10,.96)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); g.add();
        g.glowArc(cx, cy, r, C.ice, zin * 0.8, 1.6); g.line(ex, ey, cx - r * 0.7, cy - r * 0.7, C.ice, zin * 0.4, 1.2); g.line(ex, ey, cx + r * 0.7, cy - r * 0.7, C.ice, zin * 0.4, 1.2);
        g.line(cx - r + 20, cy + 10, cx + r - 20, cy + 10, C.green, zin * 0.6, 3);
        const open = smooth(seg(t, 20.6, 21.3));
        for (let i = -2; i <= 2; i++) {
          const px = cx + i * 50, q = g.normal(); q.globalAlpha = zin;
          for (const side of [-1, 1]) { q.fillStyle = 'rgba(118,124,255,.95)'; q.beginPath(); q.roundRect(px + side * (4 + open * 6) - 6, cy - 14, 12, 48, 5); q.fill(); }
          g.add(); if (open > 0.05) g.glow(px, cy + 10, 26, C.sun, zin * open * 0.6, 'glow');
        }
        return [label('眼点 · 放大', 80, 1180, 26, '#a8e0ae', zin)];
      }
      return [label('眼点', ex + 26, ey - 26, 24, '#ff9a88')];
    }
    case 'membrane': {
      const light = smooth(seg(t, GATE_LIGHT, GATE_LIGHT + 0.3)), open = smooth(seg(t, GATE_OPEN, GATE_OPEN + 0.35));
      cone(g, 540, 690, 540, 985, C.blue, light, 26, 90);
      membrane(g, t, { y: 1060, open, light, flowStart: GATE_OPEN + 0.1 });
      const v = lerp(0.12, 0.85, smooth(seg(t, GATE_OPEN + 0.3, GATE_OPEN + 2.4))), ctx = g.normal();
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(40,56,74,.9)'; ctx.beginPath(); ctx.roundRect(200, 1432, 640, 14, 7); ctx.fill();
      ctx.fillStyle = 'rgb(74,182,255)'; ctx.beginPath(); ctx.roundRect(200, 1432, 640 * v, 14, 7); ctx.fill(); g.add();
      g.glow(200 + 640 * v, 1439, 22, C.blue, 0.7, 'glow');
      return [label('细胞外', 80, 930), label('细胞内', 80, 1200), label('膜电位（示意）', 420, 1404, 24), label('静息', 200, 1404, 22), label('兴奋', 800, 1404, 22)];
    }
    case 'install': {
      const shrink = smooth(seg(t, 30.4, 31.0)), fly = easeInOut(seg(t, 31.0, 32.0)), arrive = flash(t, [DELIVER], 0.4);
      const nx = 640, ny = 1150;
      drawNeuron(g, SIDE, nx, ny, 0.72, { soma: 0.1 + arrive * 0.9, glow: C.white, channels: seg(t, 32.4, 34.6) });
      const px = lerp(300, nx, fly), py = lerp(1050, ny, fly) - Math.sin(fly * Math.PI) * 120;
      if (t < 32.05) {
        dna(g, px, py, 260, t, 1 - fly * 0.6, lerp(1, 0.32, shrink));
        if (shrink > 0.01) capsid(g, px, py, 44, shrink, t * 1.5);
      }
      if (arrive > 0.02) g.glow(nx, ny, 90, C.white, arrive * 0.6, 'glow');
      return t < 30.6 ? [label('基因', 200, 960)] : t < 32.05 ? [label('病毒载体（示意）', 200, 960)] : [label('膜上的光控闸门', 760, 1060, 26, '#7fc8ff', seg(t, 32.6, 33.2))];
    }
    case 'rhythm':
    case 'brake': {
      const amber = t >= AMBER_ON, x = 330, y = 960, sc = 0.74;
      const f = amber ? 0 : flash(t, PULSES, 0.12), on = amber ? smooth(seg(t, AMBER_ON, AMBER_ON + 0.25)) : f;
      fiber(g, x, 700, y - 64, amber ? C.amber : C.blue, on, [x, y - 6], 40);
      drawNeuron(g, HERO, x, y, sc, { a: amber ? 0.62 : 1, soma: amber ? 0 : 0.12 + f * 0.88, channels: amber ? 0 : 1, chColor: C.blue });
      if (!amber) for (const p of PULSES) drawSpike(g, HERO, x, y, sc, (t - p - 0.02) / 0.5, C.blue, 0.9);
      if (t > 42.6) for (const n of NEAR) {
        const act = Math.max(0, ...n.sp.map(q => (t >= q && t - q < 1 ? Math.exp(-(t - q) / 0.2) : 0)));
        g.glow(n.x, n.y, 7, C.ink, 0.7, 'core'); g.glowArc(n.x, n.y, 12, C.ink, 0.5, 1.2); if (act > 0.01) g.glow(n.x, n.y, 30, C.blue, act, 'glow');
      }
      const { labels } = chart(g, t, { pulses: PULSES.filter(p => p < AMBER_ON), amberFrom: AMBER_ON, yLight: 1262, yFire: 1440 });
      const out = labels.map(([v, lx, ly, col]) => label(v, lx, ly, 26, col));
      out.push(label(amber ? '黄光' : '蓝光', x + 24, 740, 24, amber ? '#ffba4c' : '#7fc8ff'));
      if (amber && t > 44.0) out.push(label('其他细胞照常活动', 560, 880, 22, '#8ea2b4', seg(t, 44.0, 44.4)));
      return out;
    }
    case 'mouse': {
      const [sp, ph] = mouseState(t), on = lightOn(t, MOUSE_LIGHT);
      for (let i = 0; i < 16; i++) { const x = ((i * 90 - ph * 46) % 1440 + 1440) % 1440 - 180; g.line(x, 1292, x + 50, 1292, C.dim, 0.7, 2); }
      const { brain: [bx, by] } = mouse(g, 470, 1160, ph, sp);
      if (sp > 0.45) for (const [dy, k] of [[-30, 1], [10, 0.8], [50, 0.6]]) g.streak(250, 1160 + dy, Math.PI, 90 * sp, 4, C.ink, (sp - 0.45) * k);
      fiber(g, bx, 770, by - 6, C.blue, on ? 1 : 0, null);
      if (on) g.glow(bx, by, 34, C.blue, 0.9, 'glow');
      return [label(on ? '开灯' : '关灯', bx + 24, 840, 26, on ? '#7fc8ff' : '#8ea2b4'), label('光纤', bx + 24, 800, 22)];
    }
    case 'clinic': {
      const on = smooth(seg(t, GOGGLES_ON, GOGGLES_ON + 0.3)), ret = smooth(seg(t, 57.0, 57.6));
      eye(g, t, { on, retina: ret });
      perceived(g, t, smooth(seg(t, 57.6, 58.6)), smooth(seg(t, 58.3, 59.3)));
      return [label('光刺激眼镜', 70, 972), label('视网膜', 560, 890), label('视神经', 760, 1160), label('感知到的物体（示意）', 150, 1298, 24)];
    }
    case 'ending': hero(g, t); return [];
  }
  return [];
}
