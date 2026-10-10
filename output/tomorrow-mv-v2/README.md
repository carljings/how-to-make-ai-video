# Claude MV · Tomorrow Will Be Better · V2 (Remotion)

**English** · [简体中文](README.zh-CN.md)

Two portrait lyric MVs for Douyin and TikTok, built in [Remotion](https://www.remotion.dev/), cut to the same remix of 《明天会更好》 (高压电工 Remix). The music comes from a longer screen recording, two verses at 75 BPM with one sung line per bar. Every one of the 124 sung syllables appears on screen as it is sung. V1, the 19-second first draft, is in [`../tomorrow-mv`](../tomorrow-mv).

- **Verse 1:** a pixel AI is tapped awake, opens its eyes at dawn, sees a busy world, spins alone on a small planet, and sheds a tear that the wind dries.
- **Verse 2:** a beat drop. It sprouts wings, flies with a V of migrating birds, and hears news of a far-away kitten with an empty bowl under a storm. Its heart catches fire, melts into music notes, and the notes fly across the world to fill the kitten's bowl with hearts.
- **Finale:** on 福 every postcard flies into one giant heart, which opens back onto the first frame.

| Artifact | Purpose |
|---|---|
| [out/tomorrow-mv-full.mp4](out/tomorrow-mv-full.mp4) | Full cut: both verses, 51.2 s, 1080×1920, 30 fps, H.264/BT.709, AAC 48 kHz, about −11.6 LUFS, seamless loop |
| [out/tomorrow-mv-40s.mp4](out/tomorrow-mv-40s.mp4) | 40-second cut: verse 1, then straight into 玉山白雪飘零 … 倾诉遥远的祝福, 38.4 s |
| [out/cover.jpg](out/cover.jpg) · [3:4](out/cover-3x4.jpg) · [4:3](out/cover-4x3.jpg) | Douyin covers |
| [out/tomorrow-mv-full.sheet.jpg](out/tomorrow-mv-full.sheet.jpg) · [40 s](out/tomorrow-mv-40s.sheet.jpg) | Two frames per second of each encoded film |
| [out/verification.json](out/verification.json) | Results of `npm run verify` |
| [storyboard.md](storyboard.md) | The plan, with every new syllable's time (Chinese) |
| [publish-copy.md](publish-copy.md) | Douyin publish fields for both cuts, and the music question (Chinese) |
| [production-log.md](production-log.md) | How the music was measured and cut, decisions, checks, what was and wasn't reviewed (Chinese) |
| [CREDITS.md](CREDITS.md) | Music, reference, fonts, map, licences |

## Build

Needs Node 18+ and ffmpeg (with libsoxr). In this directory:

```sh
npm ci
npm run music -- "/path/to/ScreenRecording_10-11-2026 01-14-58_1.MOV"   # → public/music-full.wav, music-short.wav (not in git)
npm run studio                             # Remotion Studio: both cuts, scenes named on the timeline
npm run render                             # → out/tomorrow-mv-full.mp4 and out/tomorrow-mv-40s.mp4 (about 6 minutes on 4 cores)
npm run cover                              # → out/cover.jpg, cover-3x4.jpg, cover-4x3.jpg
npm run verify                             # technical checks on both cuts → out/verification.json
node scripts/sheet.mjs --comp=Short40 --range=24:27:0.1   # contact sheet of any range of either cut
```

`npm run music` cuts both soundtracks sample-accurately from the recording. The full cut is song time 0–51.2 s. The 40-second cut is bars 1–8, then bars 13–16, joined on the bar line with an 8 ms crossfade. Both get the same gain, −0.4 dB, and no limiter.

## Edit

| To change | Edit |
|---|---|
| Any timing: syllables, the two playlists, transitions, hits, every scene's actions | `src/timeline.ts`. Everything runs in song time, and a playlist maps film time onto song bars. |
| A lyric character's position, look and motion | `LAYOUT` and `motion()` in `src/ui/Lyrics.tsx`; then `npm run fonts` |
| One scene | `src/scenes/*.tsx` (16 scenes, one per bar) |
| The mascot (wings, scarf, tear), birds, kitten, notes, flames, snow, fireworks | `src/art/Clawd.tsx`, `src/art/cast.tsx` |
| Transitions, camera punches, drop flashes, the giant-heart finale, the closing window | `src/Film.tsx` |
| Where the 40-second cut splices | `CUTS` in `src/timeline.ts` and the `short` graph in `scripts/music.mjs` |

Every frame is a pure function of time; `npm run verify` checks this by rendering frames twice in different orders.

## Status

Technical checks pass. Not yet done: listening on a phone, watching at full speed, checking Douyin's overlays, deciding how to handle the music on Douyin, and publishing. See [production-log.md](production-log.md).
