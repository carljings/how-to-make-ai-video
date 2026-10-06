// film.js: composes one frame. Scenes draw light (additive, bloomed); overlays draw type and UI on top.
import { Gfx } from './gfx.js';
import { seg, win } from './lib.js';
import { SCENES, CAPTIONS, CHAPTERS, DUR } from './timeline.js';
import { caption, chapterTag } from './text.js';

const IDS = SCENES.map(s => s[0]);
const REG = {};
let g;

export async function init(canvas) {
  g = new Gfx(canvas);
  for (const id of IDS) REG[id] = await import(`./scenes/${id}.js`);
  for (const id of IDS) if (REG[id].init) await REG[id].init(g);
}

export function renderAt(t) {
  g.begin([2, 3, 7]);
  const active = SCENES.filter(([, a, b]) => t >= a && t < b);
  for (const [id, a, b] of active) REG[id].draw?.(g, t, { a, b, lt: t - a });
  g.add();
  g.bloom(1);
  g.vignette(0.85);
  const ctx = g.normal();
  for (const [id, a, b] of active) { REG[id].overlay?.(ctx, t, { a, b, lt: t - a }); g.normal(); }
  for (const ch of CHAPTERS) chapterTag(ctx, t, ch);
  for (const cap of CAPTIONS) if (t >= cap.t0 && t < cap.t1) caption(ctx, cap, t);
  g.fade(Math.min(seg(t, 0, 0.6), 1 - seg(t, DUR - 1.6, DUR - 0.1)));
}

