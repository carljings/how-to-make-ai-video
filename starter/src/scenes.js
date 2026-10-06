// scenes.js: one object per scene. draw() adds light (it is blurred into a glow afterwards);
// overlay() draws crisp things such as type on top. Both get the time t and the scene window s = { a, b, lt }.
import { W, H, CUE, SEEDS, seedCount } from './timeline.js';
import { TAU, clamp, lerp, seg, win, kf, easeOut, easeInOut } from './lib.js';

const CX = W / 2, CY = H / 2;
const GOLDEN = TAU * (1 - 2 / (1 + Math.sqrt(5))); // 137.5° in radians
const LINE_Y = CY + 46, LINE_W = 880;

// When does seed i appear? Inverting seedCount once here keeps every frame cheap.
const BIRTH = new Float32Array(SEEDS);
for (let t = 0, i = 0; i < SEEDS && t < 60; t += 1 / 600) while (i < seedCount(t)) BIRTH[i++] = t;

function dot(ctx, x, y, r, rgb, a) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${rgb},${a})`);
  gr.addColorStop(0.35, `rgba(${rgb},${a * 0.45})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gr;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export const spark = {
  draw(ctx, t, s) {
    const on = easeOut(seg(t, CUE.spark, CUE.spark + 0.8)) * (1 - seg(t, CUE.grow[0], CUE.grow[0] + 1));
    if (on <= 0) return;
    const breathe = 1 + 0.08 * Math.sin((t - CUE.spark) * 2.4);
    dot(ctx, CX, CY, 150 * on * breathe, '255,214,150', 0.55 * on);
    dot(ctx, CX, CY, 26 * on, '255,246,230', on);
  },
};

export const swarm = {
  draw(ctx, t) {
    const n = seedCount(t);
    const zoom = kf(t, [[CUE.grow[0], 1.25], [CUE.grow[1], 0.92]]);
    const spin = t * 0.07;
    const [g0, g1] = CUE.gather;
    for (let i = 0; i < n; i++) {
      const u = i / (SEEDS - 1);
      // spiral position: every seed is turned 137.5° from the one before
      const r = 17 * Math.sqrt(i) * zoom, th = i * GOLDEN + spin;
      let x = CX + r * Math.cos(th), y = CY + r * Math.sin(th);
      // gather into a line, the centre seeds first
      const d = g0 + u * 0.6, k = easeInOut(seg(t, d, d + (g1 - g0) - 0.6));
      x = lerp(x, CX + u * (LINE_W / 2) * (i % 2 ? 1 : -1), k);
      y = lerp(y, LINE_Y, k);
      const pop = 1 + 1.6 * (1 - seg(t, BIRTH[i], BIRTH[i] + 0.35)); // flash when born
      const size = lerp(5.5 - 2.5 * u, 2.2, k) * pop;
      const rgb = u < 0.5 ? `255,${Math.round(lerp(206, 170, u * 2))},${Math.round(lerp(120, 140, u * 2))}`
        : `${Math.round(lerp(255, 110, u * 2 - 1))},${Math.round(lerp(170, 210, u * 2 - 1))},${Math.round(lerp(140, 255, u * 2 - 1))}`;
      dot(ctx, x, y, size * 3, rgb, clamp(0.9 * pop, 0, 1));
    }
  },
};

export const title = {
  overlay(ctx, t) {
    const a = seg(t, CUE.title, CUE.title + 1.2), b = seg(t, CUE.title + 1.0, CUE.title + 2.2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = `rgba(244,238,226,${easeOut(a)})`;
    ctx.font = '700 88px Inter';
    ctx.letterSpacing = `${lerp(40, 14, easeOut(a))}px`;
    ctx.fillText('HOW TO MAKE AI VIDEO', CX, LINE_Y - 44 + 18 * (1 - easeOut(a)));
    ctx.fillStyle = `rgba(150,200,230,${0.9 * easeOut(b)})`;
    ctx.font = '400 30px "JetBrains Mono"';
    ctx.letterSpacing = '2px';
    ctx.fillText('idea → script → shots → sound → edit → export', CX, LINE_Y + 76);
    ctx.letterSpacing = '0px';
  },
};

export function caption(ctx, t, [t0, t1, text]) {
  const a = win(t, t0, t1, 0.4, 0.5);
  if (a <= 0) return;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '400 38px Inter';
  ctx.fillStyle = `rgba(0,0,0,${0.5 * a})`;
  ctx.fillText(text, CX + 2, H - 72 + 2);
  ctx.fillStyle = `rgba(236,232,222,${a})`;
  ctx.fillText(text, CX, H - 72);
}
