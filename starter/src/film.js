// film.js: composes one frame at time t. This is the whole renderer:
//   background → light from the scenes → glow (a blurred copy of the light) → type → vignette → fade.
import { W, H, DUR, SCENES, CAPTIONS } from './timeline.js';
import { seg } from './lib.js';
import * as scenes from './scenes.js';

let ctx, light, lctx, glow, gctx;

export function init(canvas) {
  ctx = canvas.getContext('2d');
  light = Object.assign(document.createElement('canvas'), { width: W, height: H });
  lctx = light.getContext('2d');
  glow = Object.assign(document.createElement('canvas'), { width: W / 4, height: H / 4 });
  gctx = glow.getContext('2d');
}

export function renderAt(t) {
  // 1. background
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  bg.addColorStop(0, '#11141c');
  bg.addColorStop(1, '#05060a');
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. light: every active scene adds its light
  const active = SCENES.filter(([, a, b]) => t >= a && t < b);
  lctx.clearRect(0, 0, W, H);
  lctx.globalCompositeOperation = 'lighter';
  for (const [id, a, b] of active) scenes[id].draw?.(lctx, t, { a, b, lt: t - a });

  // 3. glow: blur a quarter-size copy, then add both to the frame
  gctx.clearRect(0, 0, W / 4, H / 4);
  gctx.filter = 'blur(5px)';
  gctx.drawImage(light, 0, 0, W / 4, H / 4);
  gctx.filter = 'none';
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(light, 0, 0);
  ctx.globalAlpha = 0.85;
  ctx.drawImage(glow, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 4. type
  for (const [id, a, b] of active) scenes[id].overlay?.(ctx, t, { a, b, lt: t - a });
  for (const c of CAPTIONS) if (t >= c[0] && t < c[1]) scenes.caption(ctx, t, c);

  // 5. vignette and fade in/out
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const fade = Math.min(seg(t, 0, 0.5), 1 - seg(t, DUR - 1.2, DUR - 0.1));
  if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
}
