# Source-match proof: model, staging, wide-shot poses

Bounded proof for the exact source clip (Musk post 2110913107094606330, media 2110913027490934784). It is not the film. Standard `bpy`/`mathutils` only; no add-ons, downloads or paid assets.

## Run (one Blender process for every frame)

```bash
blender --background --factory-startup --python-exit-code 1 --python blender/build_scene.py -- \
  --device METAL --out-dir <out> \
  --times 6.25,7.75,8.75,10.25 --views beauty_front \
  --width 960 --height 540 --samples 24
```

- `--device METAL|CPU` is required. METAL enables only Metal devices for this process and stops with an error rather than falling back to CPU. Preferences are never saved.
- `--times`: source-clip seconds, rendered from the reconstructed wide camera (source shots A/D). The full surface order is `6.25,7.25,7.75,8.25,8.75,9.25,9.75,10.25,10.75`.
- `--views`: `beauty_front`, `beauty_rear`, `plan_top`, `plan_under`, or `none`. These are model-review views in the same lot, not source shots.
- `--reference-dir <motion-match dir>`: source keyframe JPGs for the comparison sheets. By default it is looked up relative to the script at `../.omx/…` or `../../../.omx/…`. If it is not found, comparisons are skipped and a warning is written.
- Other options: `--exposure`, `--cloud off`, `--plumes off`, `--no-denoise`, `--save-blend <file>`, `--dry-run`.

## Outputs in `<out>`

- `wide_tXX.XX.png`: renders.
- `compare_tXX.XX.png`: the source frame on top and the render below, with the source anchor box drawn in cyan on both.
- `beauty_front.png` and any other requested views.
- `manifest.json`: Blender version and build, enabled devices, render settings, per-frame pose, plume levels and render seconds, and warnings (e.g. a missing node socket or setting).

## What to compare

| Time | Source surface (motion-reference) | Pose used |
|---|---|---|
| 6.25 | side profile emerging from right cloud, plumes down | roll 4° |
| 7.75 | black canopy broadly camera-facing | roll 103° |
| 8.75 | inverted, underside emerging, plumes up | roll 211° |
| 10.25 | near-level side, long downward plumes, forward nose plume | roll 352° |

- **Roll:** the roll is to the car's left, so the top turns toward the camera first. That gives the source order: side → canopy → inverted edge → underside → side.
- **Position:** screen positions are back-projected from the source anchors, so the car centre should sit in the cyan box. Depth is a straight-line fit to the anchors' body widths.
- **Corrections:** if a pose reads early or late against its source frame, adjust `motion.ROLL_KEYS` / `PITCH_KEYS`. These are visual fits, not measurements.

## Where to tune after seeing renders

| What | Where |
|---|---|
| Paint, glass, lamp and set materials | `CAR_MATERIALS`, `SET_MATERIALS` (build_scene.py) |
| Plume look | `PLUME` (build_scene.py) |
| Cloud look | `CLOUD` (build_scene.py) |
| Lights | `staging.LIGHTS` |
| Camera fit | `staging.WIDE_CAMERA`: lens and height are assumptions |
| Cloud puffs | `motion.CLOUD_PUFFS` |
| Car shape | `roadster.py` splines (pure Python, mirrored left/right) |

## Status and boundaries

- **Car:** the geometry is inferred from blurred, perspective-distorted source frames. It is not an official Tesla drawing; dimensions are not measured.
- **Nozzles:** count and placement are schematic. Plumes are attached car-locally, so they rotate with the car. They read as cold gas, not flame.
- **Lineup and set:** the lineup vehicles are generic stand-ins for composition and scale. The set is measured in source pixels on the 0.0 s frame and back-projected through the assumed camera (25 mm lens, 1.25 m height, 5.8° up-tilt).
- **Not depicted:** liftoff, touchdown and cable function are not shown or claimed, and no performance values are derived.
- **Acceptance:** visual acceptance comes only from the actual renders, reviewed against the source.
