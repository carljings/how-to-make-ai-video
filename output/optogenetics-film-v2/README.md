# A light switch for neurons · V2

**English** · [简体中文](README.zh-CN.md)

A 75-second portrait optogenetics explainer made from the user's approved storyboard. V2 adds Mandarin narration, perspective camera movement, depth of field, organic cell volumes and multi-scale bloom. V1 remains in the neighboring `optogenetics-film` directory.

The user's existing Opus 5.5 neutrino film supplied the rendering-method reference. This version was implemented with Codex assistance; no new Opus 5.5 call succeeded. See [CREDITS.md](CREDITS.md) and [quality-rebuild.md](quality-rebuild.md).

| Artifact | Purpose |
|---|---|
| [out/optogenetics-v2.mp4](out/optogenetics-v2.mp4) | 1080×1920, 30fps, 75s, H.264/BT.709 and stereo AAC; Chinese narration and burned captions |
| [out/optogenetics-v2.srt](out/optogenetics-v2.srt) | Separate captions on the shared timeline |
| [out/poster.jpg](out/poster.jpg) | Cover frame extracted from the actual MP4 |
| [out/encoded-contact-sheet.jpg](out/encoded-contact-sheet.jpg) | Actual encoded picture review |
| [out/media-verification.json](out/media-verification.json) | Full decode, media specification and final AAC loudness checks |
| [out/speech-verification.json](out/speech-verification.json) | Speech timings and signal checks; not a naturalness rating |
| [voice/narration.wav](voice/narration.wav) | Reusable Mandarin narration asset |
| [publish-copy.md](publish-copy.md) | Title, tags and description draft |

## Rebuild and edit

Local Node, Chrome and FFmpeg were used. Puppeteer is pinned in the lockfile; fonts, licenses and generated narration are included. Rendering does not require the reference screen recording or a cloud speech call. Dependency installation requires network access.

These entry points were run in this directory:

```sh
npm ci --ignore-scripts
npm run build
node verify.mjs
```

Frames are resumable. After changing picture or captions, remove affected cached JPEGs in this project's `out/frames/` before rebuilding; an unpacked source archive has no frame cache.

| Change | Source |
|---|---|
| Scene/caption/voice timing and light pulses | src/timeline.js |
| Camera projection, neuron arbors and cell volumes | src/world.js |
| Individual scenes | src/scenes.js |
| Bloom, sprites, depth of field and vignette | src/cinema.js |
| Typography, caption line breaks and compositing | src/film.js |
| Narration + original music/effects | src/score.js |
| Regenerate speech after text changes | tools/narrate.py; edge-tts version in tools/voice-requirements.txt |
| Regenerate local Chinese font subset | subset-font.py |

The isolated Python speech entry point `.venv/bin/python tools/narrate.py` was run locally. The `.venv` itself is not archived. A text change requires new speech assets, timing checks and any new Chinese glyphs; existing voice assets can be reused offline.

Scientific boundaries are in [scientific-sources.md](scientific-sources.md): pre-expressed light-sensitive proteins, distinct activation/inhibition tools, experimental conditions, and partial object recognition in one early retinal-treatment report. All geometry and signal traces are illustrative. Visual review and technical checks do not establish that this matches the user's subjective quality reference; full listening/viewing remains for the user. This directory is included in the 9 October 2026 GitHub results archive; Douyin publication has not been performed.
