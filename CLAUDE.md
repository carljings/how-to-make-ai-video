# Working in this repo

A guide to making AI video, with templates, ffmpeg tools and a code-rendered starter film. See README.md for the map.

## Default workflow for Xiaochuan Science (user preference, 21 October 2026)

- Use Canvas-based, deterministic frame-by-frame animation as the default for future science videos. The user preferred the extended music film C to the preceding versions and explicitly requested this default.
- By default, real Claude Opus 5.5 at max effort owns creative direction, copy, storyboards, visuals, animation code, rendering decisions and visual review. Codex provides research, fact-checking and technical assistance, and executes production commands when explicitly assigned by Opus or directly authorized by the user. An explicit user assignment takes precedence over this default.

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

## Seedance 2.5 prompts (15 October 2026)

From ByteDance's official Seedance 2.5 prompt guide (Volcengine document 82379/2607689, 7 August 2026) and the craft in Emily2040/seedance-2.0, checked against what went wrong in the Nobel V3 clips.

- Prompt order: first bind every asset in words ("图片1是面馆老板，旁白使用音频1的音色", and say which part to borrow), then one line on subject, place, event and style, then the timed shots, then one closing line on what holds throughout (camera, setting, sound, mood). Don't rely on names written inside pictures.
- Timestamps in whole, continuous seconds ("0-3秒…3-7秒…"): no half seconds and no gaps. Seedance 2.0 ignores timestamps; 2.5 follows them.
- Keep each clip light: aim for 2–3 seconds or more per beat, where a spoken line adds one beat per 12 Chinese characters and a change of place adds two. Denser clips cut too fast and garble speech (Nobel V3's 22-second clip C garbled its last line); split them instead.
- One action per shot, and people in the background keep doing something; "不动" freezes them like mannequins. End every shot with the same lock line: the light, each character's look, and where each one stands. The model forgets these at every cut, which is how two characters end up with one face.
- Describe a feeling in plain words plus one physical sign, not an idiom: "脸沉下来" renders as a face turning grey.
- Exclusions work only for subtitles and sound ("不要字幕", "无bgm，只生成环境音和动作音"). They don't stop made-up lettering on signs: keep signs and screens out of shot, or remove the text with an edit.
- To fix one line, one action or stray text, edit the clip instead of generating it again: "仅编辑视频1中旁白的台词，修改为「…」，其余不变" (duration -1, ratio adaptive, clips under 20 seconds work best). Quote the edit's cost before running it.
- Guides and skills written for Seedance 2.0 (for example dexhunter/seedance2-skill and Emily2040/seedance-2.0) carry useful craft, but their limits (15 seconds, 12 files) and timing rules don't apply to 2.5.

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
