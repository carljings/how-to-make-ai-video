# Claude MV · Tomorrow Will Be Better (Remotion)

**English** · [简体中文](README.zh-CN.md)

A 19.2-second portrait lyric MV for Douyin and TikTok, built in [Remotion](https://www.remotion.dev/). The music is one clean pass of 《明天会更好》 (*Tomorrow Will Be Better*), cut from a screen recording: six bars at 75 BPM, one sung line per bar. A pixel AI (after the creature in Claude Code's logo) is tapped awake by a mouse cursor, slowly opens its eyes, sees a busy world, walks alone on a spinning planet, loses its nightcap and its letter to the spring wind, and ends with a beating heart. Every one of the 47 sung syllables appears on screen as it is sung, each moving the way the word means: 轻 floats, 敲 slams, 沉睡 sinks, 张开 opens like an eyelid. The style follows a "Claude MV" reference: grid paper, airmail postcards, stamps, a pixel cursor.

| Artifact | Purpose |
|---|---|
| [out/tomorrow-mv.mp4](out/tomorrow-mv.mp4) | 1080×1920, 30 fps, 19.2 s, H.264/BT.709, AAC 48 kHz stereo, −11.9 LUFS, −1.7 dBTP; the last frame leads back into the first |
| [out/cover.jpg](out/cover.jpg) · [3:4](out/cover-3x4.jpg) · [4:3](out/cover-4x3.jpg) | Douyin covers: 9:16 like the video, plus 3:4 and 4:3 for the cover slots the upload page may ask for |
| [out/tomorrow-mv.sheet.jpg](out/tomorrow-mv.sheet.jpg) | Two frames per second of the encoded film |
| [out/verification.json](out/verification.json) | Results of `npm run verify` |
| [storyboard.md](storyboard.md) · [brief.md](brief.md) | The plan, with every syllable's time (Chinese) |
| [publish-copy.md](publish-copy.md) | What to put in each field of Douyin's publish page, and the music question to settle first (Chinese) |
| [production-log.md](production-log.md) | How the music was measured, decisions, checks, and what was and wasn't reviewed (Chinese) |
| [CREDITS.md](CREDITS.md) | Music, reference, fonts, map, licences |

## Build

Needs Node 18+ and ffmpeg (with libsoxr). Remotion downloads its own Chrome Headless Shell the first time it renders. In this directory:

```sh
npm ci
npm run music -- "/path/to/ScreenRecording_10-10-2026 21-52-17_1.MP4"   # → public/music.wav (not in git)
npm run studio                             # Remotion Studio: scrub, play with sound, each scene on the timeline
npm run render                             # → out/tomorrow-mv.mp4 (about 70 s on 4 cores, no GPU)
npm run cover                              # → out/cover.jpg, cover-3x4.jpg, cover-4x3.jpg
npm run verify                             # 17 technical checks → out/verification.json
node scripts/sheet.mjs --range=0:6:0.5     # contact sheet of any time range → out/sheet.jpg
```

The song is a commercial recording, so `public/music.wav` is not committed: `npm run music` cuts it from the screen recording (0.698–19.898 s), resamples it to 48 kHz and lowers it 2.1 dB, with no limiter. Without the recording, the film still renders, silent, with `npx remotion render Film out/silent.mp4 --props='{"audio":false}'`.

## Edit

| To change | Edit |
|---|---|
| Any timing: syllables, scene cuts, transitions, hits, the mascot's actions | `src/timeline.ts`; scenes and lyrics read their cues from the syllable times |
| Where a lyric character sits, its look and how it moves | `LAYOUT` and `motion()` in `src/ui/Lyrics.tsx`; then `npm run fonts` if you add characters |
| One scene | `src/scenes/*.tsx` (Night, Dawn, World, Planet, Spring, Heart) |
| The mascot, cursor, hearts, stamps, petals, clocks | `src/art/Clawd.tsx`, `src/art/props.tsx`, `src/art/pixel.tsx` |
| Paper, postcard frame, layout and Douyin safe areas | `src/art/paper.tsx`, `src/layout.ts` |
| Transitions and the closing heart window | `src/Film.tsx` |
| The world map's dot grid | `node scripts/map.mjs --step=4.5` (rewrites `src/art/land.ts`) |
| Loudness | `npm run music -- <recording> --tp=-1.7` (true peak before AAC; the encoder adds about 0.1 dB) |

Every frame is a pure function of time: no `Math.random()` (use `rng(seed)`), no clock reads, no state carried between frames. `npm run verify` renders frames twice in different orders to check this, and checks that the film's audio is the music cut with no offset, since every visual cue is timed to it.

## What makes it a Douyin film

- **The first frame:** a sleeping pixel AI and a cursor about to tap it; the first word lands on frame 2, on the song's first syllable.
- **Rhythm:** all 47 syllables, plus taps, stamps, jumps and heartbeats, land on the song's 0.2-second grid. Cuts sit on the downbeat of each line.
- **Loop:** on the last beat, 心 opens into a heart-shaped window onto the film's own opening, and the music is cut so that bar 6 flows back into bar 1. The loop has no visible seam.
- **Safe areas:** lyrics in y 290–660 and the postcard in y 700–1440. Nothing important sits in the bottom ~480 px or the right ~170 px, where Douyin's overlays go.
- **Title, cover and first frame say the same thing:** an AI, gently knocked awake. See [publish-copy.md](publish-copy.md).

## Status

Technical checks pass. Not yet done: listening on a phone, watching at full speed, checking Douyin's own overlays, deciding how to handle the music on Douyin, and publishing. These are the user's review. See [production-log.md](production-log.md).

Remotion is not MIT-licensed: individuals and companies of up to three people use it free; larger companies need a company licence. See [CREDITS.md](CREDITS.md).
