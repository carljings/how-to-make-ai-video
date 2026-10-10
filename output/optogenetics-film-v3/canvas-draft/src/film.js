import { W, H, DUR, FPS, ACTS, CONTINUOUS, TEXTS, at } from './timeline.js';
import { Gfx } from './cinema.js';
import { drawScene } from './scenes.js';
import { clamp, seg, easeOut, rng } from './lib.js';
let gfx, boxes = [];
const SANS = '"Noto Film",sans-serif', SERIF = '"Noto Cinema","Noto Film",serif';
const KEY = { blue: [74, 182, 255], ice: [140, 214, 255], white: [255, 244, 214], sun: [255, 222, 120], amber: [255, 186, 76], orange: [255, 128, 72] };
const X0 = 80, KICKER_Y = 300, LINE0 = 392, LINE_H = 102, HEAD = 80;
export function init(canvas) { gfx = new Gfx(canvas); }

const SR = rng(4242), STARS = Array.from({ length: 150 }, () => [SR() * W, SR() * H, 0.6 + SR() * 1.4, SR() * 6.28]);
function dust(t) { for (const [x, y, r, p] of STARS) gfx.glow(x, y, r * 2.2, [150, 190, 230], 0.12 + 0.08 * Math.sin(t * 0.8 + p), 'core'); }

function put(c, text, x, y, size) { const w = c.measureText(text).width; boxes.push({ text, x, y: y - size * 0.65, w, h: size * 1.3, size }); c.fillText(text, x, y); return w; }
function small(text, x, y, size, color, a = 1, weight = 400, spacing = '0px') {
  if (a < 0.01) return;
  const c = gfx.normal(); c.globalAlpha = a; c.font = `${weight} ${size}px ${SANS}`; c.letterSpacing = spacing; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = color;
  put(c, text, x, y, size); c.letterSpacing = '0px'; c.globalAlpha = 1;
}
// Headline with **keywords**: keywords turn from white to the cue's colour at cue.at. glowOnly draws just the keywords (before bloom).
function headline(cue, t, a, dy, glowOnly = false) {
  const col = KEY[cue.key], k = seg(t, cue.at, cue.at + 0.25), c = gfx.normal();
  c.font = `800 ${HEAD}px ${SERIF}`; c.textAlign = 'left'; c.textBaseline = 'middle';
  cue.lines.forEach((line, i) => {
    let x = X0; const y = LINE0 + i * LINE_H + dy;
    line.split('**').forEach((part, j) => {
      if (!part) return;
      const key = j % 2 === 1, w = c.measureText(part).width;
      if (glowOnly) { if (key && k > 0) { c.globalAlpha = a * k * (0.75 - 0.35 * seg(t, cue.at + 0.4, cue.at + 1.4)); c.fillStyle = `rgb(${col.join(',')})`; c.fillText(part, x, y); } }
      else {
        const mix = key ? k : 0, rgbv = [0, 1, 2].map(n => Math.round(244 + (col[n] - 244) * mix));
        c.globalAlpha = a; c.fillStyle = `rgb(${rgbv.join(',')})`; put(c, part, x, y, HEAD);
      }
      x += w;
    });
  });
  c.globalAlpha = 1;
}
function cueAlpha(cue, t) { return Math.min(seg(t, cue.a, cue.a + 0.3), cue.b >= DUR ? 1 : 1 - seg(t, cue.b - 0.25, cue.b)); }

export function renderAt(t) {
  t = clamp(t, 0, DUR - 1 / FPS); boxes = []; gfx.begin([3, 5, 10]); const s = at(t);
  dust(t);
  const labels = drawScene(gfx, t, s);
  const cue = TEXTS.find(x => t >= x.a && t < x.b) || TEXTS.at(-1), ca = cueAlpha(cue, t), dy = (1 - easeOut(seg(t, cue.a, cue.a + 0.4))) * 18;
  headline(cue, t, ca, dy, true);
  gfx.bloom(0.5); gfx.vignette(0.55);
  const i = ACTS.indexOf(s), next = ACTS[i + 1];
  if (s.a > 0 && !CONTINUOUS.has(s.id)) gfx.fade(0.25 + 0.75 * seg(t, s.a, s.a + 0.22));
  if (next && !CONTINUOUS.has(next.id)) gfx.fade(0.25 + 0.75 * (1 - seg(t, s.b - 0.18, s.b)));
  // A soft dark band behind the title block keeps the type readable over line art
  const c = gfx.normal(), band = c.createLinearGradient(0, 200, 0, 720);
  band.addColorStop(0, 'rgba(3,5,10,0)'); band.addColorStop(0.2, 'rgba(3,5,10,.62)'); band.addColorStop(0.72, 'rgba(3,5,10,.5)'); band.addColorStop(1, 'rgba(3,5,10,0)');
  c.fillStyle = band; c.fillRect(0, 200, W, 520);
  for (const v of labels) small(v.value, v.x, v.y, v.size, v.color, v.a);
  if (cue.kicker) small(cue.kicker, X0, KICKER_Y + dy, 26, `rgb(${KEY[cue.key].join(',')})`, ca, 600, '3px');
  headline(cue, t, ca, dy);
  if (cue.sub) small(cue.sub, X0, LINE0 + (cue.lines.length - 1) * LINE_H + 86 + dy, 31, '#a9bccb', ca * seg(t, cue.subAt ?? cue.a, (cue.subAt ?? cue.a) + 0.3));
  small('动画为原理示意', X0, 1490, 22, '#5f7183');
  if (t > 63.4) gfx.fade(1 - seg(t, 63.4, 64) * 0.45);
  return boxes;
}
