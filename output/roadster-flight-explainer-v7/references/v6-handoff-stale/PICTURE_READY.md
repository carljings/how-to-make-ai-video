# PICTURE_READY — v6 「空气现形」 picture freeze

Date: 2026-10-18 · Director: Opus 5.5 · For: Codex (native Metal spot proof, then full capture)

**`web/` is frozen.** From this point on, Opus edits nothing under `web/`. The remaining work touches only `tools/`, the
root docs and the new inventory files: the voice-free score and master, `text_inventory.mjs` with
`TEXT_INVENTORY.zh-CN.json`, and the corrected docs ending in `FULL_READY.md`. None of it changes a pixel.

## Film

| | |
|---|---|
| Frames | **1623** at 30 fps = **54.1 s** (`cues.js` `FRAMES` / `END`, unchanged) |
| Format | 1080×1920, 9:16 |
| Schedule | `web/engine/cues.js` is the only source of time. No shot, event, card time, string or colour changed since native-proof01. |
| Source lock | `PICTURE_LOCK.json`: sha256 of all 27 files under `web/` |

## Changes since `references/native-proof01/source-lock.json`

Only two files differ. The other 25 files under `web/` are byte-identical to the native-proof01 lock.

1. **`web/engine/timeline.js`: A1 opener camera (`s01`, f0–107) only.**
   - **Cause.** The old camera tracked the car in x only and pushed in. At f0 the car spanned x 161–1171 px, past the
     right edge. By f96 it spanned x 91–1335 px, so the rear and right side were cut.
   - **New camera.** It is defined in the car's own frame (`camLocal`), so the car cannot drift out.
     - It uses the same low rear three-quarter look up at the inverted car, with the same lights, dust and grade.
     - It sits 15 % further out and is aimed 0.6 m further toward the tail.
     - It makes a slow −4°→+3° orbit with a slight rise toward the ceiling.
     - fov 62→61.5, lens shift y 0.11, the same −3°→−1° roll.
   - **Result.** This was checked with the engine's own projection on all car body and wheel vertices, for every A1
     frame. The car spans x 59–1000, y 276–784 px; its width grows 902→941 px (84–87 % of the frame).
     - It stays clear of the tag (baseline y 214) and of the question card (glyphs at y ≈ 1160–1310).
     - Nose, wheels, canopy and the red tail-light bar are all in frame.
2. **`web/engine/cues.js`: `inventory()` helper only.** The new `cardGone(card)` returns when a card has fully left
   the screen, as text.js actually draws it.
   - This makes C10's falling exit run to 32.895 s instead of the old 32.55 s figure.
   - It has no effect on timing, strings or the picture.

## Checks run here (Linux server, no GPU, so no look judgement)

- **Timeline.** All 1623 timeline states evaluate in Node.
- **Card windows.** No two cards collide. The only time overlap is C16 → TITLE: 0.1 s, 870 px apart, a handoff into a
  separate zone.
  - C06→C07, C08→C09, CH→C13 and C15→C16 abut exactly: the outgoing card is at alpha 0 on the frame the next one
    starts.
  - The C10 fall exit is gone by 32.895 s. C11 starts at 33.0 s.
- **Compile check.** SwiftShader stills of f0 and f96 (half scale, low settings): the page loads, fonts are
  `[true,true,true,true]` and the whole car is in frame. This is only a compile and framing check; the look is judged
  on Metal.
- **f507 (gold beam tail behind 压力差): left unchanged on purpose.**
  - The beam's outer end projects to y ≈ 1303 and the word sits at y ≈ 1152–1270. Moving the card cannot clear it
    inside the safe area, and shortening the beam would be a restyle.
  - The native contact shows the word legible at 360 px, and it reads as the label at the root of the push.

## Requested: one native spot proof, then the full capture

```bash
# spot proof: opener (0, 45, 96, 107), fans (315, 351), pressure (420, 507), ~8 frames
node tools/render.mjs --out /ABS/out/spot02 --frames 0,45,96,107,315,351,420,507 --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48
bash tools/contact.sh /ABS/out/spot02 /ABS/out/spot02/contact.jpg 4

# full capture (all 1623 frames, 0–1622; resumable with --skip-existing)
node tools/render.mjs --out /ABS/out/frames --frames 0-1622 --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --skip-existing
```

What to look for in the spot proof:

- **Opener.** The whole car (nose to tail light) is inside the frame at f0, f45, f96 and f107. The car is still large,
  and the question sits in the void below.
- **Fans and pressure.** These shots are unchanged from native-proof01.

## Audio and docs (in progress, not blocking the picture)

- `tools/score.mjs` and `tools/mix.mjs` are being replaced with a voice-free procedural score and master keyed to
  `cues.js`.
  - No voice, TTS, old master or ducking.
  - The master is −14 LUFS / −2.0 dBTP, with exactly 1623 / 30 s of audio.
- `tools/text_inventory.mjs` and `TEXT_INVENTORY.zh-CN.json`, then the corrected TREATMENT and storyboard, then
  `FULL_READY.md`.
