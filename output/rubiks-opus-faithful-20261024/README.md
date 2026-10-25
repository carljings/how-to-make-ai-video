# Rubik’s cube — faithful Opus revision r3

158 seconds · 1080×1920 · 30 fps · original captions, camera movement, timing and soundtrack.
This is a Codex mechanical correction of the Opus original, following the user’s explicit instruction.
The original r1 and the separate Codex r2 remain preserved in adjacent folders.

## Scope

Only the moved-piece lock anchors, F2L numbering and completed-label spacing change. The original timeline,
move sequences, visual core, fonts, score and standalone Chrome renderer are identical. There are no new
black timer cards, red circles, callout panels, camera changes or added pauses from r2.

- Movie: `out/rubiks-opus-faithful-r3.mp4`.
- Design: `REVISION.md`, `REVISION.zh-CN.md`.
- Original source/chunk fingerprints and reuse plan: `baseline.json`.
- Checked rendering delta: `out/source-delta.json`.
- Technical/packet checks: `out/fidelity-verification.json`; encoded-frame checks: `out/visual-review.json`.
- Preserved AAC soundtrack: `out/audio/original-score.m4a` (stream copy of the original Web Audio score).

## Build used here

Node 24, the original headless Chrome renderer on Apple M4/Metal, FFmpeg 8 and Python 3.9.
No npm dependencies, native Canvas substitute or alternate audio engine are used.

```sh
node tools/verify-cube.mjs
node tools/render.mjs src/index.html video out/picture.mp4 --frames 4740 --chunk 90
python3 -I tools/assemble-faithful.py
```

The Chrome renderer reuses existing completed chunks. In this build 43 original chunks are reused and ten
are re-rendered. The verification script expects the adjacent original movie named in `baseline.json` so
it can compare the AAC payload/timestamps and every retained picture packet. The source archive includes
all rendering source/fonts and the original AAC file, but does not duplicate original picture chunks.

Technical and sampled-frame checks do not establish subjective music or physical-phone acceptance.
Facts retain the original 2026-10-23 cutoff. This revision has not been produced or approved by Opus.
