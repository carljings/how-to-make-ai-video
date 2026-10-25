// subs.js — on-screen explanation captions (no narration). Cues come from each film's cues.json.
//
// cue: { t0, t1, kind: 'main'|'sub'|'big'|'note'|'count', text, x?, y?, w?, align? }
//   text markup: [[word]] = highlighted, \n = line break.
// Motion (a pure function of t): every cue fades in/out over `fade` s; 'main' and 'sub' rise 22 px into place;
// 'big' and 'count' pop from 1.28x to 1x with a small overshoot, so a hit word lands on its beat.
// Safe area kept for the phone UI: key text inside x 60–940, y 150–1500.

export async function loadCues(url) {
  const r = await fetch(url);
  return r.json();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function markup(text) {
  return esc(text).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>').replace(/\n/g, '<br>');
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const outBack = (u) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

export function makeSubs(root, cues, { fade = 0.14 } = {}) {
  const layer = document.createElement('div');
  layer.className = 'subs';
  root.appendChild(layer);
  const nodes = cues.map((c) => {
    const el = document.createElement('div');
    el.className = 'cue ' + (c.kind || 'main') + (c.cls ? ' ' + c.cls : '');
    el.innerHTML = markup(c.text);
    if (c.x != null) el.style.left = c.x + 'px';
    if (c.y != null) el.style.top = c.y + 'px';
    if (c.w != null) el.style.width = c.w + 'px';
    if (c.align) el.style.textAlign = c.align;
    layer.appendChild(el);
    return el;
  });
  const update = function (t) {
    cues.forEach((c, i) => {
      const on = t >= c.t0 && t < c.t1;
      const a = on ? Math.min(1, (t - c.t0) / fade, (c.t1 - t) / fade) : 0;
      const el = nodes[i];
      el.style.opacity = a.toFixed(3);
      el.style.display = a > 0 ? '' : 'none';
      if (!on) return;
      const u = clamp((t - c.t0) / 0.26, 0, 1);
      if (c.kind === 'big' || c.kind === 'count') {
        const s = 1.28 - 0.28 * outBack(clamp((t - c.t0) / 0.2, 0, 1));
        el.style.transform = `scale(${s.toFixed(4)})`;
      } else if (c.kind === 'main' || c.kind === 'sub') {
        el.style.transform = `translateY(${(22 * Math.pow(1 - u, 3)).toFixed(2)}px)`;
      }
    });
  };
  update.nodes = nodes;
  return update;
}
