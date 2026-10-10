# A light switch for neurons · V3 (Remotion)

**English** · [简体中文](README.zh-CN.md)

A 64-second portrait optogenetics film for Douyin, rebuilt in [Remotion](https://www.remotion.dev/). There is no voiceover: kinetic on-screen text and a synthesized score tell the story. The first frame shows the phenomenon: the light on a mouse's head switches on and it runs, off and it slows. The film then asks what switch is in its brain and answers at 51 seconds. V1 and V2 are in the neighbouring directories.

| Artifact | Purpose |
|---|---|
| [out/optogenetics-v3.mp4](out/optogenetics-v3.mp4) | 1080×1920, 30 fps, 64 s, H.264/BT.709, AAC 48 kHz stereo, −10 LUFS |
| [out/cover.jpg](out/cover.jpg) | Douyin cover; the title sits inside the 3:4 crop used by profile grids |
| [out/optogenetics-v3.sheet.jpg](out/optogenetics-v3.sheet.jpg) | One frame per second of the encoded film |
| [out/verification.json](out/verification.json) | Results of `npm run verify` |
| [out/score-spectrum.png](out/score-spectrum.png) | Spectrogram of the soundtrack: the sections, the drop at 38 s, the brake at 48 s |
| [storyboard.md](storyboard.md) · [brief.md](brief.md) | The plan (Chinese) |
| [publish-copy.md](publish-copy.md) | Title, cover, tags, description and comment prompts (Chinese) |
| [scientific-sources.md](scientific-sources.md) | A source for every claim on screen (Chinese) |
| [production-log.md](production-log.md) | Decisions, checks, and what was and wasn't reviewed (Chinese) |

## Build

Needs Node 18+ and ffmpeg. Remotion downloads its own Chrome Headless Shell the first time it renders. In this directory:

```sh
npm ci
npm run studio                             # Remotion Studio: scrub, play with sound, each scene on the timeline
npm run score                              # synthesize the soundtrack → public/score.wav, mastered to −10 LUFS
npm run render                             # → out/optogenetics-v3.mp4 (about 4.5 minutes on 4 cores, no GPU)
npm run cover                              # → out/cover.jpg
npm run verify                             # 15 technical checks → out/verification.json
node scripts/sheet.mjs --range=0:6:0.5     # contact sheet of any time range → out/sheet.jpg
```

All of these were run on 9 October 2026 (Linux, Node 24.21.0, ffmpeg 6.1.1). `public/score.wav` is kept in the project, so `npm run render` works without re-running the score.

## Edit

| To change | Edit |
|---|---|
| Any timing: scenes, text, light pulses, cuts, hits | `src/timeline.ts`; the scenes and the score both read it |
| On-screen text | `TEXTS` and `CTA` in `src/timeline.ts`, labels in the scene files; then `npm run fonts` to add new characters to the font subsets |
| One scene | `src/scenes/*.tsx`: the picture is the canvas `draw` function, labels and panels are JSX |
| Neurons, mouse, alga, membrane, virus, eye | `src/art/*.ts` |
| Glow, bloom, grain, glitch | `src/lib/gfx.ts` |
| Text animation, chapter strip, flashes, transitions | `src/ui/Text.tsx`, `src/ui/Hud.tsx` |
| Music and sound effects | `src/audio/score.ts`, then `npm run score` |
| Loudness target | `scripts/score.mjs` |

Every frame is a pure function of time: no `Math.random()` (use `rng(seed)`), no clock reads and no state carried between frames. The mouse's running speed and the alga's swim are simulated once at load. `npm run verify` renders frames twice in different orders to check this. The soundtrack is reproducible but not bit-identical: two renders of the same score differ by at most −125 dBFS (floating-point rounding inside Chrome's offline Web Audio), far below 16-bit resolution.

## What makes it a Douyin film

- **The first second:** the phenomenon, the news (a gold "2026 Nobel Prize" kicker) and the question all arrive together on frame 0. The title card waits until 6 s.
- **An open question:** "what switch is in its brain?" at 4.5 s is answered at 51 s ("back to the start"), when the same mouse is shown in X-ray.
- **Interaction:** a three-way "guess" at 18–22 s (firefly, jellyfish or green alga?) and a closing discussion card with concrete options. No requests for likes, follows or shares.
- **Title and cover:** say the same thing as the first frame: *灯一亮它就跑，灯一灭它就慢？* See [publish-copy.md](publish-copy.md).
- **Loop:** the last beat leads back into the opening hit.

## Status

Technical checks pass. Not yet done: listening on a phone, watching at full speed, checking Douyin's own overlays, and publishing. These are the user's review. See [production-log.md](production-log.md).

Remotion is not MIT-licensed: individuals and companies of up to three people use it free; larger companies need a company licence. See [CREDITS.md](CREDITS.md).
