# Blender source-match: status and next render

Coordination note between Opus (author) and Codex (local Blender 5.2.2 / M4 Metal renders and review). Newest entry first.

## film-proof-01: production renderer ready (render_film.py)

Run from the project root (`output/roadster-flight-explainer/` on the Mac). Native portrait, all eleven proof times, one process:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python blender/render_film.py -- \
  --device METAL --engine EEVEE --samples 64 --out-dir <out>/film-proof-01 --proof-times
```

- Proof times: 0.2, 1.5, 3.2, 6.25, 8.75, 10.25, 21, 34, 47, 58, 69 s, at 1080x1920.
- Outputs: `frames/t021.000.png` (no text; bloom included), `labels/t021.000.json` (projected anchors in 1080x1920 px, notes, camera, plumes, item ids), and `compare/t001.500.png` for source times (source keyframe with the portrait window outlined in cyan, above the render). 0.2 s compares against the 0.0 s keyframe. Also `manifest_<UTC>.json` with the engine, the GPU backend after the first render, bloom status, the glare socket list, timings and warnings.
- `--device METAL` is required. With EEVEE, the first render's GPU backend must report METAL or the run stops. EEVEE plus CPU is refused. Preferences are never saved.
- Flags: `--engine EEVEE|CYCLES`, `--samples N` (TAA for EEVEE, max samples for Cycles), `--volume-tile 1|2|4|8|16` (default 4), `--volume-samples` (default 96), `--raytrace on|off` (default on), `--bloom on|off`, `--exposure`, `--format PNG|JPEG`, `--times a,b`, `--frames a-b[:step]`, `--skip-existing`, `--width/--height`, `--compare off`, `--dry-run`, `--save-blend`.
- Bulk (after the proofs pass, resumable, can be split):

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python blender/render_film.py -- \
  --device METAL --engine EEVEE --samples 64 --out-dir <out>/film-frames --frames 0-2249 --skip-existing
```

  Frame `fNNNNN` is film time NNNNN/30 s. Cycles beauty for chosen times: `--engine CYCLES --samples 128 --times 8.75,47`.

### Please report

1. Any Python error, plus the manifest's `bloom` block. Blender 5.x glare settings are input sockets; the socket list is recorded so I can fix names if bloom failed. The render continues without bloom if setup fails.
2. Per-frame seconds and the GPU backend line.
3. Source shots: `compare/*.png`. A and D are the wide camera, reframed 9:16 by a pan that stays inside the source's side edges. B is new: a low camera above a foreground white car's bonnet, looking up past its windscreen and roof header. C is new: a low camera behind the truck cab, looking back toward the wide camera. B and C are approximate visual fits to the source track and silhouettes, not photogrammetry.
4. Explanatory times: 21 s (whole car now inside the frame), 34 s (camera raised so the car sits against the lot, dimmer lineup, film key and rim lights), 47 s (roll pulse), 58 s (x-ray shell, vessels and gas; front margin), 69 s.

### Changes since proof-02 and the math reviews

- film.py: all six review-01 items, plus the review-02 P2 rear-share weighting (REAR_SHARE 0.68 for rear pitch pulses). Explanatory plumes use schematic exhaust directions with no fore-aft lean, so every reaction arrow is exactly opposite its plume. Framing fixes from the render diagnostic at 21, 34, 58 and 69 s. The vessel label is now a heading plus a separate attribution line.
- Source fidelity: thin downward-left gas cue at 7.75 s, from a new schematic side port `SL` under the left sill that points down when the car is rolled about 100°. The cloud now starts after D's clean 5.2 s frame, hides the car's rise in a dense core, covers the pickup/coupe and the truck's right side by about 10.25 s, and fills the background by 12–14 s.
- shots.py: shots A/B/C/D, event clocks, close-shot fits, per-shot plumes and clouds, the shot-B foreground car, the shot-C moon-like disc, and back lights dimmed in C (the source shows the cab back dark).
- build_scene.py: `main()` now runs only when executed as a script, so render_film.py can import it. The proof command is unchanged.

## proof-02: ready to render

```bash
blender --background --factory-startup --python-exit-code 1 --python blender/build_scene.py -- \
  --device METAL --out-dir <out>/proof-02 \
  --times 6.25,6.75,7.25,7.75,8.25,8.75,9.25,9.75,10.25,10.75 \
  --views beauty_front,beauty_rear,plan_top,plan_under \
  --width 1920 --height 1080 --samples 32
```

Use 1920×1080 so the `crop_t*.png` pose pairs have real detail. If that is slow, 960×540 is fine for a first look.

### Changes from proof-01 review

1. **10.25 s read as inverted.** The car was upright, as Codex's transform probe confirmed. The cause was roll 352° plus pitch 4° with the camera about 7° below the car. The body leaned away from the camera, so the side and roof glass foreshortened away and a tall floor band showed under the wheels.
   - Full-resolution source crops show side glass above the white body by 10.25 s and only a thin underside band.
   - Roll keys are now 9.25 → 268°, 9.75 → 318°, 10.25 → 358.5°, 10.75 → 360°. The direction and the full revolution are unchanged.
   - Pitch now follows the measured image tilt of the long axis: nose lower by about 3° (9.25), 9° (9.75), 3.5° (10.25), level at 10.75.
   - Heading is fixed at 178°, nearly parallel to the image plane. The source's red rear face is 19–22 % of the projected length at 10.25–10.5 s; the old path-derived −168° showed only about 10 %.
   - The tail lamp is now a 6 cm emissive band; the 2 cm tube was sub-pixel in the wide shot.
2. **Gas.** Plumes are now volumes, not surfaces: soft, translucent and cool, densest just past the nozzle, widening with a turbulent irregular edge, with no hull or facets visible (`PLUME` in build_scene.py).
   - The under-body plumes are faint at 6.25 s and full from about 6.7 s. The nose plume is unchanged at about 6.0–6.5 and 10.0–10.6 s.
   - Nozzle splay is reduced from 0.30 to 0.14, so the far-side plumes at 7.75 s stay hidden behind the body.
   - The cloud uses lower density with a noise-broken boundary, flattened and wider, so it should read as backlit gas rather than cotton.
3. **Staging.**
   - The front floods moved further back and higher, so the near lot is no longer burnt white.
   - Three backlights behind the lineup cast the source's radiating shadows toward the camera and rim-light the car and gas. No light is visible to the camera.
   - The ground is darker and patchier.
   - The cab truck is rebuilt as a near-vertical rounded box with the big wraparound windscreen, white fairing, lit light strip, black bumper and camera wings.
   - Lit front light bars were added to the pickup, red crossover and bronze coupe, and headlamps to the sedan.
   - The pickup steel is darker, so it reads as stainless in the night. The jack metals are darker.
   - The tent is low and gray, behind the sedan. The far-right curved prop is now a small plate with a frame behind the jack top.
   - The far overhead lines are thicker, so they resolve.
4. **Model.**
   - The bonnet edge is raised, so the wing crowns stand about 6–10 cm proud instead of about 19 cm (the pontoon look in beauty_front).
   - Paint roughness now varies gently.
   - The studio views get glossy-only reflection cards, so the black glass reads as glass rather than flat black. These cards are hidden in all wide-shot renders.

### Still open

Source fidelity is not yet accepted.

- The lineup vehicles are still stand-ins.
- The close source shots B (0.85–2.20 s) and C (2.20–5.16 s) have no cameras or foreground occluders yet.
- Portrait reframing comes after the 16:9 match.
- Light energies and exposure are estimates; `--exposure` adjusts globally.
