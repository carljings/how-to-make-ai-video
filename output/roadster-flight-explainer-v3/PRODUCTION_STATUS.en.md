# v3 「比墙还陡」: production status

Author: Opus 5.5 (art direction, scene/camera/graphics/type/score code). Codex: local renders, packaging
(`scripts/v3/finalize.mjs`, `stills.mjs`, `verify.mjs`), source/physics QA. Date: 2026-10-17.

## 1. Where we are

| Step | State |
|---|---|
| Proof-01 review (5 items) | Fixed in code. **Not yet seen as a native Blender render.** |
| Proof-02 (Blender) | **Next: Codex renders it** (command in §3). |
| `src/v3` composition | Written. Typechecks clean. Locally composited over clay stand-in plates through the same cameras: every plate kind, overlay, label, caption, the kinetic beat, the end card and both covers render. |
| `scripts/v3/score.mjs` | Written and run locally: −14.1 LUFS integrated, −2.0 dBTP, 48 kHz stereo 24-bit `master.wav`. |
| Opening motion (frames 0–155) | After proof-02 is visually accepted. |
| Full plates, then finalize | After the opening motion is accepted (§3). |

Human listening and physical-phone viewing have not happened and are not claimed.

## 2. What changed for proof-01's five findings

1. **Hook did not read as an overhang.**
   - New HANG camera below and beside the curl, orbiting slowly from near-profile to three-quarter (`v3_film.cam_hang`).
   - The car now hangs in three-quarter profile under the overhang. The near-vertical wall sits below it, the tower verticals stand behind, and the lip end is in frame.
   - Pose moved later and more overhung: ev 8.72→9.20 (`cues.json` hook clock).
   - Slow-motion tracking lag fixed: `track()` spans are in source seconds.
2. **Hot white car and ramp, glare, neon, toy look.**
   - Paint: v3-only silver tuning, 0.66 base with 0.32 metallic. The shared library paint is unchanged.
   - Concrete is darker and mottled, with varying roughness.
   - Strip lights are narrow (0.12 m and 0.09 m) at the same radiance, so they draw crisp long lines.
   - Hero lights reduced. Bloom threshold 1.05, strength 0.22. Neon 4.5 base times a per-section factor.
   - Late jets: new `flood_land` venue flood on the descent and landing zone, hero 0.55, and +0.1 EV. Exposure is set per section, not globally.
   - Tyre shot reframed (see 3).
3. **P2 gap occluded.**
   - Cross-section mode for P1, P2, tyre, lip and x-ray: the ramp is cut at y = −1.06 m, just outside the near wheels. The cut face is a dark matte section and the near neon is removed.
   - Cameras are long-lens, far, exactly side-on (`profile_cam`), so the section line and the car silhouette stay registered.
   - A low "gap" fill light at road level lights the sill/floor edge and the section face, leaving the gap dark between them.
   - Underbody albedo raised slightly.
   - The overlay's low-pressure lens now closes on the real concave surface, not the wheel chord.
   - Slates say 剖面 (cross-section). No car internals are shown.
4. **Source-camera mismatch.**
   - Wide: eye held at Codex's fit. Target and focal length are fitted per source time to the native frames (`WIDE_KEYS`: 8.0 / 9.25 / 10 / 11 / 12 s; rms 1–9 px, 12 s about 40 px). The portrait shot is a pan/tilt/zoom strip of the same view.
   - Replay B: low and far (`RB_EYE` −30, −6.5, 1.5) with a 55→90 mm zoom, the car front three-quarter from below, and the ramp face-on at frame right.
   - New `--source-match-b` compare. The replay time→ev map is an approximate aid.
   - These are fitting aids, not camera metadata.
5. **Red bars read as lasers.**
   - Venue rows reduced to three low, thin barrier rows.
   - Set emission (near neon, far neon, rows, flood heads) is a per-section factor (`v3_film.SECTION_LOOK`). Explanations dim it to 0.08–0.15, and source-matched shots keep a subdued, source-like venue.

## 3. Commands (one GPU job at a time)

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
R="$B --background --factory-startup --python-exit-code 1 --python blender/render_v3.py --"

# proof-02: 14 times + 7 stills + 16:9 source compares (wide ev 8/11/12, replay B 20.5/21.5/22.5)
$R --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-proof-02 --proof \
   --source-match 8,11,12 --source-match-b 20.5,21.5,22.5 --source-video references/ramp/ramp-reference-1080.mp4

# opening motion after proof GO: hook 0-95 + evidence 96-155 (156 frames)
$R --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-frames --frames 0-155 --skip-existing

# full plates after opening GO (resumable): 549 per-frame plates, 20 stills, 176 RGBA poster layers
$R --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-frames --all-render-frames --skip-existing
$R --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-frames --stills all --skip-existing
$R --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-frames --layers --skip-existing
```

Pure-Python steps, safe to rerun:

```bash
python3 blender/tools/retime_v3.py            # v3/timing.json from cues + measured clips; all sync rules pass
python3 blender/tools/export_v3_overlay.py    # src/v3/data/{overlay,plates}.json (1749 frames)
python3 blender/v3_film.py                    # schedule, cameras, K2 r×F sense check (+1 at all three times)
V3_AUDIO_OUT=/abs/dir node scripts/v3/score.mjs   # master.wav + stems + sound.json
```

## 4. Composition contract (`src/v3`, entry `src/v3/index.ts`)

- **Compositions:**
  - `V3` (1749 frames, 30 fps, 1080×1920), props `{plateRoot}` with default `'plates'`.
  - `V3Cover` (1080×1920) and `V3Cover34` (1080×1440), props `{frame: 48, plateRoot, height}`.
- **Plates:** `plates.json` is unchanged.
  - `r` → `<plateRoot>/new/frames/fNNNNN.png`.
  - `s`/`w` → `<plateRoot>/new/stills/ID.png`. The wipe is clipped by the overlay's scan line.
  - `p` → `POSTER_BG`, ghosts (screen blend), the live layer `<plateRoot>/new/layers/fNNNNN.png` or a still, and `POSTER_CLOUD`.
  - `v2` → `<plateRoot>/v2/fNNNNN.png`.
  - `0`/`b` → black.
- **Needed in `public/`:**
  - `fonts/roadster/RoadsterFilmSans-{300,500,600,700,900}.woff2`.
  - **`v2/grain/g0..g5.png`**: the six seeded grain tiles reused from v2. *The finalizer currently stages only `public/fonts`. Please also copy `public/v2/grain` to `<runtime>/public/v2/grain`, or the first frame fails to load `v2/grain/g0.png`.*
- **Score contract:** `scripts/v3/score.mjs` writes `master.wav` (48 kHz, stereo, 24-bit) plus stems and `sound.json` to `$V3_AUDIO_OUT` (absolute or root-relative; default `out/v3-audio`). It refuses to run if `timing.json` or `plates.json` is stale against `cues.json`.

## 5. Verified locally (Linux authoring box, no installs)

- `v3_ramp.py` self-test: wheels on the surface within 4 mm and body clearance ≥ 15 mm.
- `retime_v3.py`: no overlaps, all sync rules pass (压不住 on the take-off frame).
- `export_v3_overlay.py`: OK.
- `tsc --noEmit` on `src/v3`: 0 errors. This used an existing local TypeScript 5.9.3 / Remotion 4.0.534 install from another project, read-only, through a throwaway harness in `/tmp`.
- Remotion stills rendered over clay stand-in plates for frames 0, 48, 126, 195, 255, 270, 360, 405, 435, 492, 660, 798, 906, 1032, 1500 and 1680, plus both covers. Overlays register on the projected geometry.
- Score: −14.1 LUFS integrated, −2.0 dBTP, converged in 3 passes.
  - Master limiter: max 4.6 dB, more than 2 dB of reduction 1.2% of the time.
  - Voice bus has its own limiter.
  - Voice-to-bed gap while speaking: about 7 dB.
  - Hard silence at both black cuts.

## 6. Please look for in proof-02

1. **Hook (t0 / t1.6 / t3.1).**
   - Does the car read as hanging beyond vertical in under a second?
   - Is the paint showing form (no flat white)?
   - Is the title area (y 1110–1420) dark enough?
2. **P1/P2 cross-section.** Is the gap a readable black slit between a lit sill and the section line? Is the far neon at most a faint line?
3. **Tyre (16.4).** Contact at the section line, the tread visible, and the spokes not dominant.
4. **Lip (24.2–28.5).** The car stays fully framed while the gap opens from the front.
5. **Jets (33–36.8).**
   - Is the car body bright enough in the landing zone?
   - Is the ramp at frame right?
   - In the compares, does replay B match the source's view of the car?
6. **Source compares.** Wide at ev 8 and 11 should now overlay closely. Ev 12 is a known approximate fit.

## 7. Boundaries (unchanged)

- **Fits, not measurements:** the ramp profile, car pose, airborne path and cameras.
- **Schematic:**
  - gap, intakes, air streaks, ticks and every arrow;
  - vessel and nozzle layout;
  - the cross-section cut.
- **Not stated anywhere:** force, pressure, mass, thrust or endurance numbers.
- **Not drawn:** the landing contact (hidden in the source cloud).
- **Two demos stay separate:** black separation, the 另一场演示 slate and voice. The kickflip reuses the clean v2 plates 1:1 with v3-styled overlays recomputed from v2 state; the cables stay visible and are not discussed.
