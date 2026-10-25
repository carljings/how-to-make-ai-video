// estimate_timing.mjs — placeholder word timing until Codex supplies aligned TTS boundaries (narration/timing.json).
// Same format Codex should deliver: clip start (film s), duration, and per-word start/end relative to the clip start.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'narration/lines.zh-CN.json'), 'utf8'));
const CPS = 4.55;                       // characters per second (Yunjian +0%, estimate)
const PAUSE = { '，': 0.24, '、': 0.16, '：': 0.2, '；': 0.26, '。': 0.0, '？': 0.0 };
const clips = spec.lines.map((l) => {
  let t = 0;
  const words = [];
  for (const ch of l.text) {
    if (ch in PAUSE) { t += PAUSE[ch]; continue; }
    words.push({ w: ch, s: +t.toFixed(3), e: +(t + 1 / CPS).toFixed(3) });
    t += 1 / CPS;
  }
  return { id: l.id, text: l.text, duration: +t.toFixed(3), words };
});
const out = { about: 'ESTIMATE (not real audio). Replace with narration/timing.json from aligned TTS.', fps: 30, clips };
fs.writeFileSync(path.join(root, 'narration/timing.estimate.json'), JSON.stringify(out, null, 1));
const { placeClips } = await import('../web/engine/voice.js');
console.log(placeClips(spec.lines, out).map((c) => `${c.id} ${c.start.toFixed(2)}–${c.end.toFixed(2)} ${c.text}`).join('\n'));
