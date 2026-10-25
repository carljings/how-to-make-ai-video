# PICTURE_READY — v7 「空气现形」 picture freeze

Date: 2026-10-18 · Director: Opus 5.5 · For: Codex (native check of E2 + P3, then the full capture)

> **Status update (same day).** Codex's native spot02 (12 frames) passed: the P1 label, the E2 exhaust and P3 without
> the leader. The full 1770-frame native capture is running, and the lock matches. The final handoff is `FULL_READY.md`.

**`web/` and `tools/render.mjs` are frozen.** `PICTURE_LOCK.json` holds the sha256 of all 28 files under `web/` plus
`tools/render.mjs`. From here on, Opus edits nothing under `web/` and does not touch the renderer. The rest of the
work (audio, inventory, docs) changes no pixel. The v6 readiness files that had been copied into this tree are stale.
They now sit in `references/v6-handoff-stale/` so they can't be mistaken for this freeze.

**Approvals.** None are claimed. The look is judged on Codex's native Metal frames. This server only checks compile and
framing (SwiftShader).

## Film

| | |
|---|---|
| Frames | **1770** at 30 fps = **59.0 s** (`cues.js` `FRAMES` / `END`), f00000–f01769 |
| Format | 1080×1920, 9:16 |
| Schedule | `web/engine/cues.js` is the only source of time and text. **One string changed since native proof01:** the P1 label 「低压，非真空」 → 「低压区·有空气」 (§3 below). No time, shot, event, card, other string or colour changed. |
| Lock | `PICTURE_LOCK.json` (29 files) |

## Changes since native proof01 (`references/native-proof01/source-lock.json`)

Five files differ. The other 23 files under `web/` are byte-identical to the proof01 lock.

- The two essential clarity fixes Codex asked for (§1 and §2).
- One science-wording correction, a single string (§3).
- Comment-only edits that change no pixel (§4).

### 1. E2 jets: `web/engine/timeline.js`, shot `s11` only (f1119–f1208)

- **What proof01 showed (f1140, f1185).** Large cyan cones pointed up and out at the nose and tail. The downward
  exhaust was faint.
- **Cause (checked, not assumed).** These were the jets, not light cones; volumetric light is off in `s11`.
  - The jet shader placed each particle at `M_now·(nozzle + R·u·age) − V·age`. That is the right emission point, but
    the particle doesn't carry the car's own velocity V: exhaust leaving a moving nozzle has world velocity
    V + R·u, so for a steady V the V terms cancel.
  - In E2 the car falls at 8–9.5 m/s, about the modelled exit speed (≈ 8.4 m/s). So relative to the car the four
    downward jets trailed almost horizontally back (the tail cone).
  - The source fit's forward-facing `NOSE` jet (level 0.27–0.60 here) trailed almost straight up (the nose cone).
- **Fix (this shot only).** `uCarVel = 0`. Each particle then sits at nozzle + R·u·age relative to the car: the comoving
  plume, which is the exact drag-free result for a steady descent. No flow is simulated. The other changes:
  - `NOSE` is set to 0 in this schematic view. It stays in the night reconstruction (E3).
  - Plume length scale 1.0 → 0.55: visible ≈ 1–1.5 m, at most ≈ 2.4 m, so short and never reaching for the floor
    (A14).
  - Spread 0.3 → 0.22, air gain 0.035 → 0.07, size 1 → 1.25, count 9000 → 12000, so the short plumes read.
- **Unchanged.** The fitted descending pose (`ev11`), the camera, the white gravity arrow (world down), the cyan thrust
  arrow (up, direction only), the timings, the tag and the arrow note.
  - E3 (night) and F1 keep their source-fitted trails. The `particles.js` comment now says plainly that a non-zero
    `uCarVel` is a look-fit to the footage, not a velocity model.
  - No nozzle count, flow or performance is implied.

### 2. P3 cable leader: `web/engine/text.js`, `cableNote()` only

- **What proof01 showed (f1305–1400).** The note's thin leader ran diagonally through the torque plate and crossed the
  right-hand case, where it could be read as a thrust line.
- **Fix.** The leader's alpha is multiplied by `1 − clamp(veil / 0.15)`.
  - It is fully gone by `kfOff` + 0.10 s, before plate 3 starts fading in at +0.15 s.
  - It returns only as the veil lifts, from `kfResume` − 0.04 s. By then the plate has faded to about 15 % alpha,
    and it is gone 0.04 s later.
- **Unchanged.** The static top note 「画面中可见细线，作用未公开」 stays for its whole window (42.5–49.75 s). The
  source cables stay in the reconstruction.

### 3. P1 label: `web/engine/cues.js`, one string

- **Problem.** The label 「低压，非真空」 ("low pressure, not vacuum") set up a false contrast. In engineering usage
  "vacuum" includes partial vacuum, so lower pressure and vacuum are not mutually exclusive. CERN's vacuum
  introduction supports this definition: https://cds.cern.ch/record/582156/files/p1.pdf?version=1. The only intent
  was to deny perfectly empty space.
- **Fix.** The label is now 「低压区·有空气」: a lower-pressure region that still holds air.
- **Unchanged.** Its anchor, size, colour, entry time (11.35 s) and the plate geometry.
- **Checks.**
  - All glyphs are already in all four bundled faces, so there was no font rebuild.
  - The label box is x 292–502 (it was 292–472). That is still inside plate 1, 20 px clear of the inlet at x 522,
    and overlaps no other label or the header.
  - Plate 1 still meets its reading rule: 3.25 s total against 3.20 s needed; the last label holds 1.90 s against
    1.60 s.
- **Same wording fixed elsewhere.** The treatment (B1 row, §7), the storyboard (B1 row and the facts section), the
  score's cue sheet and code comments no longer say "not a vacuum". The gap is described as lower pressure with air
  still in it: a partial vacuum, never empty space.

### 4. Comment-only edits (no pixel change)

- `web/engine/shaders/particles.js`: the JS comment above `JET_VS` documents the velocity accounting in §1. The GLSL
  string is unchanged.
- `web/engine/diagram.js` (two comments) and `web/engine/timeline.js` (one comment): the "not a vacuum" wording is
  replaced, as in §3.

**Not done: the optional plate-3 header 「单股推力比较」.** 单 and 较 are not in the bundled font subset, so adding it
would need a font rebuild at freeze time. Codex judged plate 3 viable, and C14 「实际翻转看合转矩」 follows it.

## Checks run here (Linux server, no GPU: compile and framing only, no look judgement)

- **Timeline.** All 1770 timeline states evaluate in Node with no exception and no NaN in beams or jets.
  - At f1140, `NOSE` = 0, the four under-body jets are at 0.97–0.98, and the jet velocity is (0, 0, 0).
  - At f1350 the veil is 0.86 and P3 is active.
- **SwiftShader stills** (half scale; compile: fonts `[true,true,true,true]`, no page exception), all viewed:
  - E2, f1125–f1205: four short cyan plumes go straight down from the under-body, with no cones out of the nose or
    tail.
    - 「喷气向下 ↓」 sits under them and doesn't touch them.
    - The thrust arrow points up and the white gravity arrow down. The gravity arrow sits between or over the front
      plumes and stays a distinct white arrow.
  - E3, f1215: the night reconstruction is unchanged.
  - P3, f1295–f1415: no leader inside the plate. The note stays, and the leader is back at f1415 after the veil.
  - P1, f360 (full resolution): 「低压区·有空气」 renders in the bundled face, in the gap left of the inlet.
- **Text.** `node tools/text_inventory.mjs` exits 0 (details in `AUDIO_READY.md`).

## Requested next: one native check of E2 + P3, then the full capture

```bash
# P1 label (360, 400), E2 (1125–1205), E3 unchanged (1215), P3 (1295–1415)
node tools/render.mjs --out /ABS/out/spot03 --frames 360,400,1125,1140,1160,1185,1205,1215,1295,1305,1350,1400,1415 --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48
bash tools/contact.sh /ABS/out/spot03 /ABS/out/spot03/contact.jpg 4

# full capture: all 1770 frames, f0–1769 (resumable with --skip-existing)
node tools/render.mjs --out /ABS/out/frames --frames 0-1769 --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --skip-existing
```

What to look for:

- **E2.** The exhaust reads as short and downward on the actual pixels, with no up or out cones. The white gravity
  arrow is still readable over the front plumes.
- **P3.** No line crosses the plate.
- **P1.** 「低压区·有空气」 reads clearly in the gap.

If either is still unclear on Metal, tell Opus which frame.

## Audio (ready, independent of the picture)

The old v6 score and master are replaced:

- `tools/score.mjs` and `tools/mix.mjs` were rebuilt from zero. The v6 versions are archived, hash-identical, in
  `references/v6-legacy-audio/`.
- `out/audio/master.wav`: 1770 × 1600 = 2,832,000 samples = 59.0 s; −20.0 LUFS, −7.3 dBTP, no limiter.
- Full report: `AUDIO_READY.md`.
