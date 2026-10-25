# 多给你1000块，你会花吗？ · the 2026 economics Nobel

**English** · [简体中文](README.zh-CN.md)

A portrait explainer for Douyin about the 2026 Prize in Economic Sciences: Robert E. Hall and Michael Woodford, "for microeconomic foundations of macroeconomic stabilisation". It was built entirely in [Remotion](https://www.remotion.dev/): kinetic on-screen text, flat sticker-style motion graphics and a synthesized score with a whistled tune. There is no narration (the user's choice), and no external voice or generation services were used.

The film was designed around one problem the user reported: viewers left in the first two seconds and few watched to the end. So frame 0 already shows the whole question: a phone showing **+¥1000.00**, the headline 多给你1000块 / 你会花，还是存？ and a little character, "你" (you). The payment chime and the tune start on frame 0, and two answer buttons pop in by 0.8 s. At 4 s the picture freezes and twists the question: paid once, or every month? The prize arrives at 8.5 s. "你" turns up in every act and becomes one dot among thousands in the economy's curve. The ending returns to the opening picture, so the film loops.

| Artifact | Purpose |
|---|---|
| `out/nobel-econ-2026.mp4` | The film: 58 s, 1080×1920, 30 fps, H.264/BT.709, AAC 48 kHz stereo, −10 LUFS |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | Douyin covers, the same picture as frame 0 |
| `out/nobel-econ-2026.sheet.jpg` | One frame per second of the encoded film |
| `out/verification.json` | Results of `npm run verify` |
| [brief.md](brief.md) · [storyboard.md](storyboard.md) | The approved plan (Chinese) |
| [sources.md](sources.md) | A source for every claim, and what was left out of the reference article and why (Chinese) |
| [publish-copy.md](publish-copy.md) | What to put in each field of Douyin's publish page (Chinese) |
| [production-log.md](production-log.md) | Decisions, checks, and what was and wasn't reviewed (Chinese) |

## Build

Needs Node 18+ and ffmpeg. Remotion downloads its own Chrome Headless Shell the first time it renders. In this directory:

```sh
npm ci
npm run fonts                    # subset the fonts to the characters used (after any text change)
npm run score                    # music and effects, mastered to −10 LUFS → public/score.wav
npm run render                   # → out/nobel-econ-2026.mp4
npm run cover                    # → out/cover.jpg, cover-3x4.jpg, cover-4x3.jpg
npm run verify                   # technical checks → out/verification.json
node scripts/sheet.mjs --range=0:3:0.25   # contact sheet of any time range → out/sheet.jpg
npm run studio                   # Remotion Studio: scrub and play
```

## Edit

| To change | Edit |
|---|---|
| The words | `BEATS` in `src/timeline.ts`, then `npm run fonts` |
| Any timing: scenes, text beats, picture and sound cues | `src/timeline.ts`; the scenes and the score both read it |
| One scene | `src/scenes/Yellow.tsx` (hook, twist, end), `Prize.tsx`, `Hall.tsx`, `Woodford.tsx`, `Big.tsx` (globe, crowd) |
| Characters and objects | `src/art/Bean.tsx`, `src/art/Props.tsx` |
| Music and sound effects | `src/audio/score.ts`, then `npm run score`; loudness target in `scripts/score.mjs` |
| Globe land dots | `scripts/land.py` (Natural Earth 1:110m land, public domain) |

Every frame is a pure function of time: no `Math.random()` (use `rng(seed)`), no clock reads and no state carried between frames. `npm run verify` renders frames twice in different orders to check this.
