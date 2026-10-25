// voice.js — aligned narration → film time. Shared by the picture (timeline.js) and the sound tools (Node), so
// both use the same clip placement. Pure, no DOM.
export const GAP = 0.20;

// lines: narration/lines.zh-CN.json "lines"; timing: narration/timing.json (or the estimate)
export function placeClips(lines, timing) {
  const byId = Object.fromEntries(timing.clips.map((c) => [c.id, c]));
  const out = [];
  let prevEnd = -Infinity;
  for (const l of lines) {
    const c = byId[l.id];
    if (!c) continue;
    const start = (c.start !== undefined && c.start !== null) ? c.start : Math.max(l.nominal_start_s, prevEnd + GAP);
    out.push({ id: l.id, text: l.text, start, duration: c.duration, end: start + c.duration, words: c.words, file: c.file || null });
    prevEnd = start + c.duration;
  }
  return out;
}

export class Voice {
  constructor(lines, timing) {
    this.placed = placeClips(lines, timing);
    this.clips = {};
    for (const c of this.placed) {
      const chars = [];
      for (const w of c.words) {
        const s = [...w.w];
        s.forEach((ch, k) => chars.push({ ch, s: c.start + w.s + (w.e - w.s) * k / s.length, e: c.start + w.s + (w.e - w.s) * (k + 1) / s.length }));
      }
      this.clips[c.id] = { id: c.id, start: c.start, end: c.end, text: c.text, chars };
    }
  }
  has(id) { return !!this.clips[id]; }
  clip(id) { return this.clips[id]; }
  start(id) { return this.clips[id].start; }
  end(id) { return this.clips[id].end; }
  at(id, text, which = 'start') {
    const c = this.clips[id];
    const flat = c.chars.map((x) => x.ch).join('');
    const i = flat.indexOf(text);
    if (i < 0) throw new Error(`voice: '${text}' not in ${id}`);
    return which === 'start' ? c.chars[i].s : c.chars[i + [...text].length - 1].e;
  }
  charsOf(id) { return this.clips[id].chars; }
}
