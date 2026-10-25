# Rubik’s cube — pacing and annotation revision r2

A Codex revision of the preserved Opus film, requested by the user after the source/encoded-frame audit.
158 s · 1080×1920 · 30 fps · Chinese captions and the original procedural music theme; no voice-over.
The base project is retained separately in `../rubiks-opus-20261023`.

## Files

- Revised movie: `out/rubiks-polish-r2.mp4`.
- Approved changes: `REVISION.md` and `REVISION.zh-CN.md`.
- Timing: `src/timeline.js`; real move sequences and holds: `src/seqs.js`.
- Markers and counting: `src/scenes/count.js`; F2L numbering and stage labels: `src/scenes/methods.js`.
- Score: `src/score.js`; its raw/master WAV files are in `out/audio/`.
- Checks: `out/revision-checks.json`, `out/rubiks-polish-r2.verify.json`, `out/visual-review.json`.
- Original source/fact documents in `docs/` describe the upstream film; this revision’s authoritative delta is `REVISION.md`.
- Upstream production log: `docs/base-production-log.md`; this revision’s log: `PRODUCTION_LOG.md`.

## Reproduce

Node 24 and FFmpeg 8 were used; finishing runs under Python 3.9+. Native fonts are bundled.
These commands were executed for this build:

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run verify
node tools/render-native.mjs audio
node tools/render-native.mjs video
python3 -I tools/finish.py out/picture.mp4 out/audio/score-raw.wav out/rubiks-polish-r2.mp4
```

The baseline-integrity part of `verify` expects the adjacent original project. Rendering itself is independent
of it. Chunk reuse requires matching source, font and runtime fingerprints. Full-resolution deterministic
Canvas rendering uses the same scene modules as the HTML, via @napi-rs/canvas; Web Audio runs offline via
node-web-audio-api. No user browser, account, external generation service or paid asset is required.
Native and browser rasterisation are different implementations; this build is reviewed from its own output.

Only when changing font subsets: use `requirements-fonts.txt` and `tools/merge-fonts.py` to rebuild the native
TTFs. They recombine the original WOFF2 subsets without adding replacement glyph designs. Local font
coverage includes punctuation; scientific exponents are drawn explicitly rather than relying on fallback.

This build changes the rhythm and labels; it is a first revision for user review. Technical and frame checks
are separate from subjective listening and physical-phone acceptance. Facts keep the original 2026-10-23 cutoff.
