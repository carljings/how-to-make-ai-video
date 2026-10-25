# 《2.51 秒的世界纪录，为什么没拿冠军？》— Rubik's cube explainer (Opus 5.5 remake)

1080×1920 · 30 fps · 158 s · Canvas 2D, every frame a pure function of `t`, rendered in headless Chrome. Original
Web Audio score (120 BPM, D minor → D major), no voice-over. Plan: `docs/BRIEF.md`, `docs/STORYBOARD.md`; every
fact: `docs/FACTS.md` (sources saved in `docs/sources/`).

## Layout
- `src/timeline.js` — every cue (single source of truth); `src/data.js` — every number shown
- `src/lib/cube.js` — physical cube model; `src/lib/draw3d.js` — renderer; `src/lib/{text,ui,stage,core}.js`
- `src/seqs.js` — every timed move sequence (picture and turn sounds share it)
- `src/scenes/*.js` — open, origin, count, twenty, human, methods, race, ending
- `src/score.js` — soundtrack; `tools/render.mjs` — stills / strips / video / audio; `tools/finish.py` — master, mux, verify

## Commands (run from this folder)
```sh
node tools/verify-cube.mjs                                   # every demo solve + superflip checked
python3 -I tools/fonts.py                                    # re-subset fonts after changing any text
node tools/render.mjs "src/index.html?label=1" strip out/review/x.jpg --times 1,2,3 --cols 3
node tools/render.mjs src/index.html audio out/audio/score-raw.wav
node tools/render.mjs src/index.html video out/picture.mp4 --frames 4740 --chunk 90
python3 -I tools/finish.py out/picture.mp4 out/audio/score-raw.wav out/rubiks-opus-r1.mp4
```
