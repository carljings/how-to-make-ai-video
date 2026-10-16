# Working in this repo

A guide to making AI video, with templates, ffmpeg tools and a code-rendered starter film. See README.md for the map.

## Making a video here

- Start from `templates/brief.md`. Write `storyboard.md` and get it approved before generating shots or writing scene code.
- Review every shot or act with a contact sheet before moving on: `tools/review.sh <clips>` for generated clips, `node render.mjs --range=a:b:step` inside a copy of `starter/`. Read the sheet image yourself, and tell the user what you checked and what you could not.
- Keep a production log (`templates/production-log.md`) for generated work. Before re-running a generation that timed out, check whether its output already exists.
- Master to −14 LUFS, true peak ≤ −1.5 dBTP (`render.mjs --encode` and `tools/stitch.sh` do this).

## Budget for generated video (the user's rules, 15 October 2026)

- Generate at 720p at most, never 1080p. Remotion or ffmpeg upscales the picture, and on-screen text is drawn at full resolution anyway.
- No 480p test drafts. Once the user approves the storyboard, generate each shot straight at 720p, review it (contact sheet, transcription of any speech) and redo only the shot that fails.
- Before spending anything, show a line-by-line budget (each shot's length and cost, the pictures, an allowance for one redo) and get it approved. Ask again before going past it.
- Targets: a 30-second film costs about ¥50–55 (about ¥45 of video at 720p, ¥3–8 of pictures). Redoing one 10–11 second shot costs about ¥15–17.
- Reuse character pictures between episodes instead of generating new ones.
- How Seedance is billed on Volcengine Ark: tokens = width × height × (24 × seconds + 1) / 1024. About ¥70 per million tokens at 480p and 720p (≈ ¥1.5 a second at 720p) and ¥77 at 1080p, at October 2026 list prices. The real charge is in the Volcengine console. `scripts/ark.py cost 15 15` in `output/nobel-econ-2026-v3/` prints the estimate.

## Code-rendered films (starter/)

- Every frame is a pure function of `t`: no `Math.random()` (use `rng(seed)` from `src/lib.js`), no clock reads, no state carried between frames. Precompute simulations at load time.
- `src/timeline.js` is the single source of truth for timing; scenes and `score.js` read cues from it.
- Web Audio: start every `GainNode` at 0 before its envelope (default 1 clicks); don't use `DynamicsCompressorNode` for mastering (automatic make-up gain).
- No GPU is assumed: Chrome uses SwiftShader. Avoid full-resolution `shadowBlur`/`filter: blur()`; blur a quarter-size copy instead.
- Ship fonts in the project; subset CJK fonts with Google Fonts' `&text=` parameter.

## Docs

- Every command shown in `docs/` must have been run. If you add a recipe, test it on a generated clip first (`ffmpeg -f lavfi -i testsrc2=…`).
- Model names change often: describe capabilities to compare, not rankings or version numbers.
- Every page in `docs/`, `README.md`, `examples/README.md`, `starter/README.md` and `templates/` has a Simplified Chinese counterpart (`docs/zh-CN/`, `*.zh-CN.md`, `templates/zh-CN/`). When you change one language, update the other in the same commit.
