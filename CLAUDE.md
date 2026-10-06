# Working in this repo

A guide to making AI video, with templates, ffmpeg tools and a code-rendered starter film. See README.md for the map.

## Making a video here

- Start from `templates/brief.md`. Write `storyboard.md` and get it approved before generating shots or writing scene code.
- Review every shot or act with a contact sheet before moving on: `tools/review.sh <clips>` for generated clips, `node render.mjs --range=a:b:step` inside a copy of `starter/`. Read the sheet image yourself, and tell the user what you checked and what you could not.
- Keep a production log (`templates/production-log.md`) for generated work. Before re-running a generation that timed out, check whether its output already exists.
- Master to −14 LUFS, true peak ≤ −1.5 dBTP (`render.mjs --encode` and `tools/stitch.sh` do this).

## Code-rendered films (starter/)

- Every frame is a pure function of `t`: no `Math.random()` (use `rng(seed)` from `src/lib.js`), no clock reads, no state carried between frames. Precompute simulations at load time.
- `src/timeline.js` is the single source of truth for timing; scenes and `score.js` read cues from it.
- Web Audio: start every `GainNode` at 0 before its envelope (default 1 clicks); don't use `DynamicsCompressorNode` for mastering (automatic make-up gain).
- No GPU is assumed: Chrome uses SwiftShader. Avoid full-resolution `shadowBlur`/`filter: blur()`; blur a quarter-size copy instead.
- Ship fonts in the project; subset CJK fonts with Google Fonts' `&text=` parameter.

## Docs

- Every command shown in `docs/` must have been run. If you add a recipe, test it on a generated clip first (`ffmpeg -f lavfi -i testsrc2=…`).
- Model names change often: describe capabilities to compare, not rankings or version numbers.
