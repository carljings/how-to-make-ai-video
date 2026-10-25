// subs.js — on-screen explanation captions (no narration). Cues come from each proposal's cues.json, which is also
// the source for proposal.md / proposals.json, so the keyframes and the documents show the same words.
//
// cue: { t0, t1, kind: 'main'|'sub'|'big'|'note'|'label', text, x?, y?, align? }
//   text markup: [[word]] = highlighted, \n = line break.
// Safe area kept for the phone UI: x 60–940, y 150–1500.

export async function loadCues(url) {
  const r = await fetch(url);
  return r.json();
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function markup(text) {
  return esc(text).replace(/\[\[(.+?)\]\]/g, '<em>$1</em>').replace(/\n/g, '<br>');
}

// Builds the overlay once; returns update(t).
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
  return function update(t) {
    cues.forEach((c, i) => {
      const on = t >= c.t0 && t < c.t1;
      const a = on ? Math.min(1, (t - c.t0) / fade, (c.t1 - t) / fade) : 0;
      nodes[i].style.opacity = a.toFixed(3);
      nodes[i].style.display = a > 0 ? '' : 'none';
    });
  };
}
