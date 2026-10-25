# PROOF_READY: v4 「光切」 opening, look correction from actual proof01 → render proof02

Director: Opus 5.5 (human-delegated art direction). Date: 2026-10-17. Inputs reviewed:
- the actual proof01 frames: `references/v4/proof01/` hook0, hook12, hook27, sheet49, wide8, elevated34;
- Codex's exposure brackets: `references/v4/exposure-diagnostic/` minus-2.5, minus-4.

Fitting, timing, voice and packaging are untouched. This is a focused look pass plus two small framing and topology corrections. Stop after proof02 and send me the actual images.

## 1. Render now: the same 6-item still batch Codex ran for proof01

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
P=/ABS/PATH/TO/codex-roadster-v4-20261017      # this v4 copy on the Mac (absolute)
OUT=/ABS/PATH/TO/renders                        # absolute output root
"$B" --background --factory-startup --python-exit-code 1 --python "$P/blender/render_v3.py" -- \
  --device METAL --engine EEVEE --samples 64 --out-dir "$OUT/v4-proof02" \
  --times 0,1.2,2.7,4.9 --source-match 8 --source-match-el 34 \
  --source-video "$P/references/ramp/ramp-reference-1080.mp4"
```

**Outputs**
- `frames/t00.000.png`, `t01.200.png`, `t02.700.png`, `t04.900.png`. These are exact film frames 0, 36, 81 and 147, so `stills.mjs` accepts them.
- `srcmatch/ev08.000.png` + `compare_ev08.000.png`.
- `srcmatch/el34.000.png` + `compare_el34.000.png`.
- `manifest_<UTC>.json`.

**Recommended (+1 frame, about 5 s).** Append `--frames 155-155` to get `frames/f00155.png`. This is the light-sheet *locked*, the exact frame the 5.2–5.5 s freeze holds. At 4.9 s the sheet is mid-sweep by design, so f155 is the only still that shows the end state.

**No dynamic or full render yet.** After the stills pass, render the opening motion into the same directory, then run Codex's finalizer with `--range=0-155`:

```bash
"$B" --background --factory-startup --python-exit-code 1 --python "$P/blender/render_v3.py" -- \
  --device METAL --engine EEVEE --samples 64 --out-dir "$OUT/v4-proof02" --frames 0-155 --skip-existing
```

Frames 0–85 are the hook; 86–155 are the source wide and the sheet. Frames 156–164 hold f00155 and are not rendered.

Codex must create a fresh source lock: `v3_film.py`, `render_v3.py`, `v3_ramp.py` and `Type.tsx` changed (hashes in §6).

## 2. Implemented render CLI (`blender/render_v3.py`, after `--`)

**Required**
- `--out-dir`
- `--device METAL|CPU`

**Engine**
- `--engine EEVEE|CYCLES` (default EEVEE; CPU needs CYCLES)
- `--samples` (64)

**Item selection**
- `--times a,b,..` (film seconds; render or hold sections only)
- `--frames a-b[:step]`
- `--proof-v4`
- `--proof`
- `--all-render-frames`
- `--stills NAME,..|all`
- `--layers`, `--layer-range a-b`

**Source-match compares**
- `--source-match ev,..` (main wide)
- `--source-match-b r,..` (replay B)
- `--source-match-el t,..` (elevated wide; source time t → ev t − 28)
- `--source-video`

**Look and quality**
- `--exposure` (global EV, added to each section's own)
- `--look`
- `--bloom on|off`
- `--raytrace on|off`
- `--volume-tile 1..16`, `--close-volume-tile`, `--volume-samples`
- `--shadow-pool`
- `--no-denoise`

**Output and debugging**
- `--format PNG|JPEG`
- `--skip-existing`
- `--save-blend`
- `--dry-run`

## 3. What the actual proof01 pixels showed, the verified cause, and the change

| proof01 observation | Verified cause | Change |
|---|---|---|
| Inverted car blown to white, canopy grey (hook0/12/27) | The hook uplights were 160 kW and 110 kW narrow spots aimed at (−1.5,0,15) and (−3,0,15), i.e. **at the car**. That is about 90 W/m² on its camera side against about 20 W/m² from the floods: a ~5× overload, which is why −2.5 EV recovers it. | Uplights become a soft, wide fill from below: 13 kW and 9 kW, 36–38°, about 6 W/m² at the car. |
| The car had no real key in the hook | `hero_rig` places the key and rims with the **camera's** up. With the camera below the inverted car, they sat above the deck slab (z ≈ 17.7 and 18.4), where the deck shadows them. | `hero_rig(..., up=)`. The hook passes the car's roof normal, so the key and rims sit in the open void (all now z < 15.27, checked numerically). Other sections are unchanged until milestone 2. |
| Milky veil over every frame; checker/froxel texture in beams and floor (all) | All 16 lights scattered into a world volume, including floods aimed toward the camera: the lamp blob in wide8 and the fog wedges in el34. | **The air is invisible until the sheet cuts it**: haze is 0 in the hook and the evidence shot, and the world volume is linked only while a look asks for haze. Where haze returns later, only lights with a `volume` factor scatter. This tightens the 光切 concept: the light-sheet's veil is the only lit air in the opening. |
| Neon clipped to pink-white (exposure 0) | Overdriven: about 3.8 scene-linear displayed. The −2.5 bracket's crisp crimson was about 0.68. | Hook neon 0.85 → 0.24 and evidence 0.6 → 0.32, plus the exposures below. Displayed crimson is now about 0.8–0.9. |
| Hot pool on the ceiling ahead of the car, lamp blobs | Headlight spots at 1.0; `lamp_disc` at 40. | Headlights 0.3 (hook) and 0.25 (evidence). Lamp heads 0.3. |
| The source wide reads hotter and greyer than the source | v3's `compare_ev08` was already about 1 EV hot on the concrete; proof01 then added haze and a 600 kW follow-spot (about 3× the floods). | Evidence exposure −0.8. Follow-spot 220 kW (about 1.6× the floods: the car is the brightest object, as in the source). Hook exposure −0.3. |
| Sheet "not clearly there" at 4.9 (sheet49) | It *was* there: a fixed plane at y = −1.06 writing along the profile. From this near-frontal source camera it read as one more lane stripe, and the 55-strength glow bleached the slab. | As written in the direction: the sheet **sweeps across the width** from beyond the far edge (4.58 s), passes the car's centre at 4.90, and **locks** at y = −0.42 m by 5.06 with a 1.5× accent. The lock plane runs through the near half of the car, clear of the painted centre line at y = 0. The line also cuts the car **paint**, so the section runs across the body as it passes. The line is a razor, not a glow: strength 18, width 2.8 cm. The veil is 0.16 while moving and 0.07 after the lock, limited to the ramp's neighbourhood. |
| Free end of the deck off-screen at frame 0 (hook0) | Its near corner projected at x = −25 px. | Frame 0 pans toward the free end on 17 mm. The near corner is now at (114, 380), the curl corner still in at x ≈ 936, and the car at (659, 877). |
| Landing frame small; deck thin (hook27) | The 25 mm end lens left the ramp at about 60% × 47% of the frame. | End lens 30 mm, target slightly up. The ramp spans x 105–976 and y 274–1680, and the deck is about 400 px long. |
| Elevated compare: run-in/foot differ (el34) | The source's lit flat plate, with its centre line continuing, is about twice v3's 3 m. The red floor outline there frames only the curve and tower base. | `RUNIN` 3 → 6 m. It is flat at z = 0, so this is a mesh extent only, and the self-test is identical. The floor outline is open toward the run-in. |
| Title exit | The `Type.tsx` comment promised a scan-wipe, but there was no scan line. | A thin sheet-white scan line rides the wipe edge (frames ≈80–85). The rest of the type is unchanged. |

## 4. What proof02 should show (please judge against this)

- **t00.000**
  - A near-black void.
  - A silver car hanging inverted from a darker concrete ceiling: black glass, dark tyres, highlight-to-shadow gradients, cool rim edges against the deck.
  - Crisp crimson edges converging to the curl corner on the right.
  - The deck's free end inside the frame at top left.
  - No veil and no beams.
  - The lower 40% stays clear for 比墙还陡.
- **t01.200**: the same look, pulled back. The free end and the gantry are in frame.
- **t02.700**: the whole structure at size on black. The flat top is clearly a finite slab, with the small inverted car under its free end. The 6 m run-in is at the foot and the red outline frames the base. No floor smoke.
- **t04.900**
  - Source-wide framing, darker and source-like.
  - The car is the brightest object under the follow-spot.
  - A thin ice-white line runs the whole profile, run-in to free end, and crosses the car body.
  - A faint plane of lit air is visible around it.
- **f00155**: the sheet locked through the near half of the car, the line steady, the veil faint. This frame is held for the freeze.
- **compare_ev08 / compare_el34**: CG brightness close to the source, no fog wedges, no lamp blob. In el34, the longer run-in matches the source's plate.

## 5. Remaining uncertainty (only pixels can settle these)

- **The first values are physical estimates, not yet seen.** These are the hook fill/key balance, the evidence −0.8 EV and the veil level. If anything is still hot, the next lever is the specific light (uplight fill, venue, follow), not more global exposure. If the hook feels empty or flat, a shaft returns only as a designated `volume` light.
- **The ceiling may now read dark grey.** This is intentional, so the car separates from it; it should look like the −4 bracket's ceiling under a −2.5-bracket car.
- **Known accepted residual.** The elevated compare's deck free end sits about 1 m off. Fixing it would mean a deck-length change, which moves EV_OFF, lip sync and the airborne keys, so it is not refitted. No dimensions are shown on screen.
- **Sheet coverage.** The line is on the ramp face and the car paint only, not on glass or tyres. If a gap on the canopy reads wrong, I'll extend it.
- **`light.volume_factor`.** If the manifest warns that it is absent, this is harmless while haze is 0 (it exists in Blender 4.x and 5.x).
- **Milestone-2 sections are not touched.** Press, lip, x-ray, poster and jets still use the camera-up rig and their v3 looks. They will be re-proofed after the opening look passes.

## 6. Files changed this session, and checks run (server, CPU only; no bpy)

| File | Change | sha256 |
|---|---|---|
| `blender/render_v3.py` | Light, sheet and haze constants; per-light `volume_factor`; on-demand haze link; sheet line on the paint; floor outline; veil extent; docstring frame ranges | `0716c9da…52db` |
| `blender/v3_film.py` | Hook and evidence looks; sheet sweep (`SHEET_IN`, `SHEET_FROM_Y`, `SHEET_LOCK_Y`); `sheet_w` 0.028; `hero_rig(up=)`; hook camera keys | `9b374d2e…8347` |
| `blender/v3_ramp.py` | `RUNIN` 6.0 | `7cf64723…6678` |
| `src/v3/Type.tsx` | Hook scan line on the wipe edge (fragment wrapper) | `be274970…e337` |
| `src/v3/data/overlay.json`, `plates.json` | Regenerated, **byte-identical** to before (no graphics in frames 0–155) | `58ea06a8…11a7`, `1b981b92…7651` |

`v3/cues.json` and `timing.json` are unchanged (`463bb147…`, `47ab0380…`).

**Checks**
- `py_compile`: all v4 modules pass.
- `v3_ramp` self-test:
  - 0 contact errors (wheels ≤ 4 mm);
  - climb clearance 34 mm;
  - 108 mm after the lip;
  - both axles on the deck for ev 8.50–9.22, which contains the hook's 8.55–8.95.
- `v3_film` report: 1749 frames, 549 render frames, measured timing, K2 torque sense +1 ×3.
- `tsc --noEmit` passes: strict, whole project, typescript 5.9.3 / remotion 4.0.534 / react 19.1.1. It was run from a scratch copy because this server's `node_modules` symlink is dangling; nothing was installed.
- Glyph coverage: all 182 on-screen characters are present in all five weights.

**Not touched**
- `scripts/v3/{finalize,stills,verify}.mjs`
- Packaging, fonts, `cues.json` and `timing.json`
- The proof01 and exposure-diagnostic references
- The original project
