// film.js — 《AI 也会刷分》 · frame-by-frame Canvas 2D (Opus 5.5).
// An original Chinese explainer on specification gaming / reward hacking, cut to the original song
// "I'm Upping My P(doom)" (the user's recording's own soundtrack, 155.467 s). Film time = recording time.
// window.film = { ready, error, duration, render(t) } is driven by tools/render.mjs; every frame is a pure function of t.
import { W, H, C, rgba, clamp, setTiming, F, font } from './lib/core.js';
import { reset, vignette, grain } from './lib/draw.js';
import { mainCaption, noteCaption, CAP } from './lib/text.js';
import { makeCues } from './copy.js';

const film = window.film = { ready: false, duration: 4664 / 30, error: null };
window.addEventListener('error', (e) => { film.error = String(e.error?.stack || e.message); });
window.addEventListener('unhandledrejection', (e) => { film.error = String(e.reason?.stack || e.reason); });

try {
  setTiming(await (await fetch('./timing.json')).json());
  // fonts: every face must really load (bundled subsets, unique family names)
  const faces = [['F-Sans', 400], ['F-Sans', 700], ['F-Sans', 900], ['F-Serif', 900], ['F-Mono', 400], ['F-Mono', 500], ['F-Mono', 600], ['F-Cond', 300], ['F-Cond', 800]];
  // load EVERY declared face file now (CJK faces are split by unicode-range and would otherwise load lazily,
  // so a glyph's first frame could fall back to another font)
  await Promise.all([...document.fonts].map((ff) => ff.load()));
  const notLoaded = [...document.fonts].filter((ff) => ff.status !== 'loaded');
  if (notLoaded.length) throw new Error('font files not loaded: ' + notLoaded.map((ff) => ff.family + ' ' + ff.weight).join(', '));
  const missing = faces.filter(([f, w]) => ![...document.fonts].some((ff) => ff.family.replace(/"/g, '') === f && String(ff.weight) === String(w) && ff.status === 'loaded'));
  if (missing.length) throw new Error('fonts not loaded: ' + missing.map((x) => x.join(' ')).join(', '));
  film.fontFiles = [...document.fonts].length;

  const mods = await Promise.all(['a_open', 'b_cases', 'c_humans', 'd_end'].map((n) => import(`./scenes/${n}.js`)));
  const SCENES = mods.flatMap((m) => m.register()).sort((a, b) => a.t0 - b.t0);
  const CUES = makeCues();
  const canvas = document.getElementById('c'), ctx = canvas.getContext('2d', { alpha: false });

  film.scenes = SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 }));
  film.render = async (t) => {
    const c = ctx; reset(c);
    c.fillStyle = rgba(C.ink); c.fillRect(0, 0, W, H);
    const sc = SCENES.find((s) => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
    c.save(); sc.draw(c, t, t - sc.t0); c.restore(); reset(c);
    const themeOf = (cue) => cue.theme || (sc.captionTheme ? sc.captionTheme(t) : 'dark');
    const live = CUES.filter((q) => t >= q.t0 && t < q.t1);
    // readability band behind dark-theme main captions (the scene keeps its top, only darkened)
    const mains = live.filter((q) => q.kind === 'main' && themeOf(q) === 'dark');
    // (both bands are soft at every edge: a hard edge shows as a seam on bright backgrounds)
    if (mains.length && !(sc.noBand && sc.noBand(t))) {
      const a = Math.max(...mains.map((q) => clamp(Math.min((t - q.t0) / 0.2, (q.t1 - t) / 0.2))));
      const g = c.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, `rgba(8,8,10,${0.62 * a})`); g.addColorStop(0.19, `rgba(8,8,10,${0.62 * a})`);
      g.addColorStop(0.69, `rgba(8,8,10,${0.36 * a})`); g.addColorStop(1, 'rgba(8,8,10,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, 640);
    }
    const notes = live.filter((q) => q.kind === 'note');
    if (notes.length && !(sc.noBand && sc.noBand(t))) {
      const dark = notes.filter((q) => themeOf(q) === 'dark');
      if (dark.length) {
        const a = Math.max(...dark.map((q) => clamp(Math.min((t - q.t0) / 0.25, (q.t1 - t) / 0.2))));
        const g = c.createLinearGradient(0, 1230, 0, 1560); g.addColorStop(0, 'rgba(8,8,10,0)'); g.addColorStop(0.36, `rgba(8,8,10,${0.58 * a})`);
        g.addColorStop(0.7, `rgba(8,8,10,${0.62 * a})`); g.addColorStop(1, 'rgba(8,8,10,0)'); c.fillStyle = g; c.fillRect(0, 1230, W, 330);
      }
    }
    for (const q of live) {
      reset(c);
      if (q.kind === 'main') mainCaption(c, q.line ? { ...q, y: (q.y ?? CAP.y) + q.line * (q.size ?? CAP.size) * CAP.lh } : q, t, themeOf(q));
      else noteCaption(c, q, t, themeOf(q));
    }
    reset(c);
    if (sc.post) sc.post(c, t, t - sc.t0);
    reset(c);
    vignette(c, sc.vignette ?? 0.85);
    grain(c, t, sc.grain ?? 0.05);
  };
  film.ready = true;
} catch (e) {
  film.error = String(e.stack || e);
}
