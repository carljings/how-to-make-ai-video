# PRODUCTION LOG — 魔方 remake (Opus 5.5), started 2026-10-23

## What came before (from the Codex sessions in ~/.codex/sessions)
- 2026-10-22 02:06 the user asked for a 2–3 min cube explainer: origin, number of states, how 20 moves was found, human limits, LBL/CFOP/Roux, 耿暄一 and 王艺衡's recent competitions. Script v2 by Opus: `output/rubiks-science-20261021/script-v2/`.
- 2026-10-22 10:48 the user had Codex make the film itself: `output/rubiks-codex-film-20261022` (v1).
- 2026-10-22 14:17 feedback on v1: “动效不够惊艳，讲解的也不够精彩，bgm也没有”. Codex made v2 (`output/rubiks-codex-film-v2-20261022`, 177.6 s, Edge TTS narration, navy slide layout).
- Earlier standing feedback on films: ends too abruptly (“视频突然结束了”, “结局仓促”), pace should be faster, cuts on the music's beats, Canvas is the default (21 Oct), completion rate is a worry.

## Log
- 2026-10-23 re-checked WCA (API) and cube20.org; new facts A–I in `docs/FACTS.md`; raw responses in `docs/sources/`.
- Brief and storyboard written (`docs/BRIEF.md`, `docs/STORYBOARD.md`). Awaiting the user's approval before scene code.
- Engine: `src/lib/cube.js` (physical cube model), `tools/verify-cube.mjs` → ALL PASS (every LBL/CFOP/Roux stage of the demo example; superflip: 20 moves, all edges flipped in place, self-inverse).
- Look test: `src/lib/draw3d.js` renderer, cold open and explode stills → `out/look-sheet.jpg`. Renders at ~0.1 s/frame on the M4 (Metal).

## 2026-10-23 — build (storyboard approved by the user: captions + original score, no voice-over)
- Scenes: open, origin, count, twenty, human, methods, race, ending (`src/scenes/`). Timeline in `src/timeline.js` (120 BPM grid).
- Reviews (all read by Opus): per-act strips `out/review/act0…act6-7.jpg`; whole film 1 frame/s `out/review/full-a.jpg`, `full-b.jpg`.
  Fixes from review: cold-open slam composition; "为什么" clears before the tiles; origin explode shows the core and axles; year ticker no longer flashes fake years; wall of cubes kept below the headline; count-act cloud lifted above the formula; act-3 framing (rule cubes, superflip size, counter positions, magnifier moved off the tall bars); methods labels off the cube; Roux pier labels to the sides; lower motion-blur shutter on Roux; text moved out of Douyin's bottom overlay and right rail.
- Copy change against the storyboard: the final headline reads "决赛，重新再来五把：排名看的还是五把平均" instead of "一把的爆发，比不过五把的稳定" — in that final Wang also had the faster single (3.28 vs 4.16), so "burst vs consistency" would have misdescribed it.
- Added on screen (checked): "15 步以内的全部加起来，不到 1%" — sum of exact counts 0–15 = 98,929,809,184,629,081 ≈ 0.23% of the total.
- Score: `src/score.js`, rendered offline in Chrome (`out/audio/score-raw.wav`). Short-term loudness profile measured every 2 s; quiet sections (origin, act-3 opening, race tension) were filled out once. Onset check: the hits at 2.5, 8.0, 26.0, 44.0, 80.0, 127.5, 135.0, 152.0 s all start within 5 ms of the cue.
- Render: M4, Chrome headless (Metal), two workers, 4740 frames at ~0.2 s/frame (`out/picture.mp4`, chunks in `out/picture.parts/`).
- Delivered: `out/rubiks-opus-r1.mp4` — `out/rubiks-opus-r1.verify.json` PASS: 4740 frames, 158.0 s video and audio, H.264 1080×1920 30 fps, AAC −14.3 LUFS, true peak −2.0 dBTP, LRA 4.6 LU, no decode errors. First frame luma 75 (hook visible at frame 0); last frame luma 16 (faded to black).
- Reviewed from the encoded MP4: 1 frame / 2 s sheet and consecutive-frame strips at 0–0.4, 2.4–2.75, 79.8–80.25, 134.9–135.35, 156.4–158 s (`out/review/final/`).
- Not done / limits: nobody has listened to the score (I can only measure it); not checked on a phone; the music is synthesized in code, so its timbre is simpler than a produced track. Source and output hashes: `SHA256SUMS`.
