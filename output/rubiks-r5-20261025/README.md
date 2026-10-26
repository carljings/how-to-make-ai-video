# Rubik's Cube r5: three cuts built to hold the first seconds

**English** · [简体中文](README.zh-CN.md)

r5 re-edits r4 (180 s, unchanged in `../rubiks-recut-20261025/`) for retention: the opening now makes the promise the title makes, the middle loses its static holds, and a second question keeps viewers past the "20" climax. One codebase renders three cuts, picked with the page query `src/index.html?v=…`:

| Cut | Length | Shape | Movie |
|---|---|---|---|
| `full` | 126.5 s | One question chain: 2.51 → 20 promise → count → proof → new hook → methods → average of five → race → ending | [rubiks-r5-full.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-full.mp4) |
| `mid` | 151.5 s | Same order, a 3-second history beat, the methods at their r4 length | [rubiks-r5-mid.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-mid.mp4) |
| `light` | 159.5 s | r4's order (2.51 / average → methods → race) with the new opening and hook | [rubiks-r5-light.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-light.mp4) |

All 1080×1920, 30 fps, captions and original music, no narration, −14 LUFS.

What changed, in every cut (details and timings: [docs/STORYBOARD-r5.zh-CN.md](docs/STORYBOARD-r5.zh-CN.md)):

- **0–8 s.** The record solve and its 2.51 slam are unchanged. The card now holds 1.5 s (r4: 2.5 s), then a split-flap turns 2.51 into **20 步 · 上帝之数**: “人类纪录 2.51 秒；数学说：20 步就够”. The cube rises into the count act and scrambles under “超 4325 亿亿种打乱，每一种都能 20 步内还原？”, which is the main title's promise. r4's slow re-scramble and its 12-second history lesson are gone (mid keeps a 3-second history beat).
- **After the 20.** 20 flips back to 2.51 and a red stamp lands: “破了世界纪录，决赛却只拿了第 6？”. The race answers it at the end.
- **Pacing.** Counting and proof beats lose their extra holds; animation speeds are unchanged. Solved cubes in the methods hold 0.8 s (r4: 0.4 s). Search notes now sound on their own moves.
- **Legibility.** Every footnote is at least 32 px (r4: 25–28 px). The split-flap seam clears once the leaves have turned.

Unchanged: the Opus Canvas 2D cube renderer, the Chrome frame exporter, fonts, colours, camera language, Web Audio instruments, 120 BPM. New glyphs come from the same Noto Sans SC 2.004 master (SHA-256 `a3041811…`), and the 13 original font files are byte-identical. Every fact and number is the approved r4 wording; new lines only recombine those facts.

## Render

```sh
tools/render-cuts.sh            # all three in parallel: picture (90-frame chunks) → score → master + mux → verify
tools/render-cuts.sh full       # one cut
node tools/render.mjs "src/index.html?v=mid" strip out/check.jpg --from 5 --to 7 --step 0.1   # inspect motion
```

This machine renders with Chrome's SwiftShader (no GPU), about 1.2 s per frame with three cuts in parallel. Compared with r4's Apple Metal render of the same frames, SSIM was 0.985. `tools/finish.py` masters to −14 LUFS, true peak ≤ −1.5 dBTP, and writes `out/rubiks-r5-<cut>.verify.json`.

The MP4s are assets of the GitHub Release `rubiks-r5-20261025` (checksums: [SHA256SUMS-r5](SHA256SUMS-r5)); verification records are in `out/`. Douyin publishing copy, with a chapter index per cut: [publish/发布文案-r5.md](publish/发布文案-r5.md).

Reports: [PRODUCTION_LOG.md](PRODUCTION_LOG.md) (what was checked, and what wasn't). Nobody has listened to the score: the checks are loudness, peaks and timing against picture cues.
