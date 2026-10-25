# Roadster v2 「一口气」 — 没有翅膀，它凭什么在空中翻身？

[简体中文](README.zh-CN.md) · [Credits](CREDITS.md)

## Actual export (17 October 2026)

[Full 30-second film](https://github.com/carljings/how-to-make-ai-video/releases/download/production-archive-20261025/roadster-blender-v2.mp4) · [3:4 cover](out/delivery-v2/cover-3x4.png) · [9:16 cover](out/delivery-v2/cover-9x16.png) · [Chinese SRT](out/delivery-v2/narration-v2.zh-CN.srt) · [Technical checks](out/delivery-v2/verification.json)

All 900 native frames rendered on Apple M4 / Metal with EEVEE 64 samples, raytracing, a 1024 MB shadow pool and verified light linking on five hero lights. Blender exited normally with zero render warnings. The encoded film is 1080×1920 at 30 fps, exactly 30.000 seconds; full decoding passed. Encoded audio measures −14.2 LUFS / −1.9 dBTP. Opus's chosen Yunjian voice supplies 81 Chinese characters across eight clips, about 20.8 seconds of speech; offline master ASR matches the locked script.

Sampled picture and cover review is recorded separately. Technical checks do not establish subjective listening, physical-phone viewing or human aesthetic acceptance. The v2 production authorization is the user's explicit delegation to Opus; approval.json retains the original v1 authorization and distinguishes it from unrecorded human aesthetic acceptance of v2.

A 30-second Chinese short for Douyin: 1080×1920, 30 fps. It asks one question: **没有翅膀，它凭什么在空中翻身？** (No wings, so how does it turn over in mid-air?)

The film:

1. Plays the reconstructed source moment.
2. Freezes time at the apex, with the car hanging upside down.
3. Flies into the frozen frame and shows gas going one way and the car being pushed the other.
4. Shows that the push misses the centre of mass, so the car turns. The gas is stored, not burned.
5. Lets time resume while the car drops into its own cloud. The answer: 一口气 (one breath).

Opus 5.5 directed this film and authored its script, picture code, graphics, typography and score. Codex supplied tools, rendering, measured narration (free edge-tts), font subsets and technical checks. v1 (75 s) is preserved separately and unchanged.

v2 replaces v1's direction, which the user rejected as not striking enough and too wordy. v1's car, lot, source-motion and DSP code are reused as libraries (`blender/build_scene.py`, `roadster.py`, `staging.py`, `motion.py`, `shots.py`, `render_film.py` helpers). v1's own 75 s pipeline (`scripts/finalize.mjs`, `scripts/score.mjs`, `src/Root.tsx`, `blender/render_film.py` as an entry point) is not used to build v2.

Direction and storyboard: [CREATIVE_DIRECTION.en.md](CREATIVE_DIRECTION.en.md), [storyboard-v2.zh-CN.md](storyboard-v2.zh-CN.md).

## Single source of truth

| File | Role |
|---|---|
| `v2/cues.json` | The edit: sections and event clocks, beats, voice starts, titles, slates, labels, palette. |
| `support/narration-v2/` | Measured narration clips (zh-CN-YunjianNeural, −6%, unmodified speed) with WordBoundary metadata. |
| `v2/timing.json` | Derived by `blender/tools/retime_v2.py`: clip placement, word and caption-phrase windows, overlap checks. |
| `blender/v2_film.py` | Pure Python. `state(t)` gives camera, car pose (v1's validated source reconstruction), plumes, cloud, lights, x-ray, frozen jet frost and the tail-lamp level. `overlay(fr)` gives projected vector graphics. `roll_check()` verifies the torque sense against the actual roll. |
| `blender/render_v2.py` | Blender plates (picture only, no diagram geometry and no text). |
| `blender/tools/export_v2_overlay.py` | Writes `src/v2/data/overlay.json`. |
| `src/v2/` | Remotion entry `src/v2/index.ts`, compositions `V2`, `V2Still`, `V2Cover` and `V2Cover34`. |
| `scripts/v2/score.mjs` | Procedural music, gas and effects with the voice, mastered to −14 LUFS, true peak ≤ −2.0 dBTP internally. |
| `scripts/v2/finalize.mjs`, `stills.mjs`, `verify.mjs` | Packaging, proof compositing and encoded-output checks. |

Change timing only in `v2/cues.json`, then run `npm run v2:retime` and `npm run v2:overlay`. The plates, graphics, captions and sound all follow.

## Commands (from the project root)

```bash
# 0. timing and overlay (pure Python, any machine)
python3 blender/tools/retime_v2.py
python3 blender/tools/export_v2_overlay.py
python3 blender/tools/preview_v2.py --times 0,9.4,14.9,18.6 --out /tmp/v2-framing.png   # geometry/framing check only

# 1. Blender plates (local Mac, Blender 5.2.2, M4 Metal)
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python blender/render_v2.py -- --device METAL --engine EEVEE --samples 64 --out-dir <out>/v2-proof-01 --proof
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python blender/render_v2.py -- --device METAL --engine EEVEE --samples 64 --out-dir <out>/v2-frames \
  --frames 0-899 --skip-existing

# 2. proof stills with overlay + type
node scripts/v2/stills.mjs --dir=<out>/v2-proof-01/frames --out=<out>/v2-proof-01/composited

# 3. sound only (writes out/v2/audio/*.wav and sound.json)
node scripts/v2/score.mjs

# 4. preview (partial range) or the full film; never launches Blender
node scripts/v2/finalize.mjs --frames=<out>/v2-frames/frames --out=<out>/v2-preview-01 --range=0-404
node scripts/v2/finalize.mjs --frames=<out>/v2-frames/frames --out=<out>/v2-delivery-01
```

**`render_v2.py` flags:**
- `--proof` | `--times a,b` | `--frames a-b[:step]`, plus `--skip-existing`
- `--engine EEVEE|CYCLES`, `--samples N`
- `--look "AgX - Medium High Contrast"`, `--exposure`
- `--frost off`, `--shadow-pool 1024|1536|2048` (default 1024; the close shots overflowed the 512 MB default)
- `--close-volume-tile 1|2|4`, `--volume-tile`, `--volume-samples`
- `--bloom off`, `--raytrace off`
- `--dry-run`, `--save-blend`

`finalize.mjs` behaviour:
- It checks that `v2/timing.json` matches `v2/cues.json`.
- It exports the overlay, regenerates the score and verifies the master loudness.
- It stages fonts, grain and plates in an isolated runtime and bundles `src/v2/index.ts` with the webpack cache disabled. Chrome is explicit (`--chrome=`) and never downloaded.
- It renders the `V2` composition muted, renders both covers (`--cover-frame`, default 48) and muxes the master. It then writes an SRT from the measured phrase windows, plus metadata.
- For a full run it also runs `verify.mjs`: 900 decoded frames, 1080×1920 at 30 fps, H.264 yuv420p, stereo 48 kHz AAC, −14 ±0.3 LUFS and ≤ −1.5 dBTP.

These are technical checks only. Picture, sound and phone viewing remain the human's call.

## Truth boundaries

- **Source sections.** They reconstruct only what Musk's 2026-10-16 post shows (media 2110913027490934784): the visible car design, the roll order and the parked lineup. There is no ramp, no takeoff and no touchdown; the car leaves into its cloud.
- **Labels.** The slow-motion opening is labelled CG 慢放重建. The resume continues the same event time, so the flight is never shown twice and never reversed.
- **Frozen sections are principle illustrations** (slate 原理示意 · 非实拍):
  - The CoM is a body-volume estimate.
  - Asymmetric firing is a hypothetical way to produce the observed roll.
  - Each force line is exactly opposite its drawn exhaust.
  - The torque sense is computed and checked.
  - The vessel count and position are schematic.
- **Tesla's own description.** Cold-gas thrusters and carbon-fibre-overwrapped pressure vessels are attributed to Tesla's posts 2110907035571401174 and 2110904290743402880.
- **No invented numbers.** There is no mass, pressure, nozzle count, volume or endurance. No flames. The film makes no hover or untethered claim. The visible cables are kept and not interpreted.
- **The kicker** 要一直飞，就得一直喷 is a conditional: sustained support needs sustained thrust.

Publication title suggestion: **没有翅膀，它凭什么在空中翻身？**
Tags: **#特斯拉 #马斯克 #飞行汽车 #冷气推进 #物理**

Final encoded picture and cover samples passed review: [review and evidence](out/delivery-v2/qa-reviewed/REVIEW.md). Subjective listening and physical-phone review remain unperformed.
