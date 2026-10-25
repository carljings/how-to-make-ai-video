# Voice → picture interface (for Codex)

The picture never uses fixed seconds for meaning. Every explanatory event (the Ping on 空气, the slam on 压, the
fans on 抽走, the impacts on 外面 …) is looked up from the aligned voice. Deliver the voice, and the film re-times
itself.

## What I need from you

Please provide:

- `narration/clips/Vxx.wav`: one clip per line in `narration/lines.zh-CN.json`. Use the exact text, 48 kHz mono, with silence trimmed and the trim documented. For the prototype, V01–V05 are enough; all 17 are welcome.
- `narration/timing.json`, in this shape (UTF-8):

```json
{
  "voice": "zh-CN-YunjianNeural",
  "rate": "+0%",
  "sample_rate": 48000,
  "clips": [
    {
      "id": "V01",
      "file": "narration/clips/V01.wav",
      "text": "连灰都往下掉，它凭什么不掉？",
      "duration": 2.912,
      "trim_start": 0.097,
      "words": [ { "w": "连灰", "s": 0.000, "e": 0.380 }, { "w": "都", "s": 0.380, "e": 0.520 } ]
    }
  ]
}
```

Field rules:

- **`duration`:** the usable (trimmed) length in seconds.
- **`words`:** offsets in seconds relative to the trimmed clip start.
  - Words may be multi-character (Edge WordBoundary style). The engine spreads a word's span evenly over its characters.
  - Leave punctuation out of `words`.
  - The concatenated `w` values must equal the line text without punctuation. The engine looks words up by text, for example `('V03', '空气')`, and will throw if one is missing.
- **`start`:** optional. If you omit it, the engine places the clips itself, deterministically:

  ```
  start(V01) = nominal_start_s(V01)
  start(Vn)  = max(nominal_start_s(Vn), start(Vn-1) + duration(Vn-1) + 0.20)
  ```

  This rule lives in `web/engine/voice.js` (`placeClips`). The audio mix tool imports the same function, so picture and sound agree. If you want to override a placement, give `start` and it wins.

## Voice direction

- Voice: `zh-CN-YunjianNeural`.
- Rate: start at `+0%`. If it sounds rushed or sleepy, adjust by ear within −4%…+4%. Use one voice and one rate for the whole film.
- Delivery: confident, slightly suspenseful, conversational. It is a friend explaining a trick they've just figured out, not a newsreader.
- Moments to protect:
  - the question at the end of V01;
  - the turn on 其实 in V03 (a beat of breath before it is welcome; the picture holds a silence there);
  - 压 in V03;
  - the contrast pair in V05 (外面压得重 | 缝里压得轻).

## Where the picture reads this

- `web/engine/timeline.js` → `Voice.at(id, text)` returns absolute film seconds of a word.
- `tools/render.mjs --info` prints the resolved event times, so we can both check sync without rendering.
- The engine loads `narration/timing.json` if present. Otherwise it uses `narration/timing.estimate.json` (my 4.55 chars/s placeholder; not audio).
