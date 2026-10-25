# Roadster v3 「比墙还陡」 — 比墙还陡，它怎么掉不下来？

[简体中文](README-v3.zh-CN.md) · [Credits](CREDITS-v3.md) · [Production status](PRODUCTION_STATUS.en.md)

A 58.3-second Chinese science short for Douyin: 1080×1920, 30 fps. One film, two separate official demonstrations.

1. **The ramp (Tesla, 2026-10-16).** A car drives up a reversed-C concrete ramp, past vertical. The film shows why it stays on.
   - Fans empty the gap under the floor, so the outside air presses the car onto the slope (说是吸，其实是压).
   - That press always points into the surface, even upward on the overhang, while gravity points down. The press gives the tyres their grip.
   - At the lip there is no slope left under the car, so the press weakens and is gone.
2. **In the air.** The car's own high-pressure gas takes over: gas goes down, the car is pushed up.
3. **Another demonstration (Musk, 2026-10-16).** Thrust that misses the centre of mass flips the car over. It is shown after a black separation and named as a different demo.
4. **Ending:** 贴着坡，借的是空气的力；腾了空，花的是自己的气。自己的气，总有喷完的时候。

Direction: [CREATIVE_DIRECTION-v3.en.md](CREATIVE_DIRECTION-v3.en.md) · storyboard: [storyboard-v3.zh-CN.md](storyboard-v3.zh-CN.md). v1 and v2 are kept unchanged.

## Single sources of truth

| File | Role |
|---|---|
| `v3/cues.json` | The edit: sections, source clocks (ev = seconds of the Tesla clip's continuous wide take), slates, titles, labels, palette, sync rules. |
| `support/narration-v3/` | 16 measured clips (zh-CN-YunjianNeural, −6%, no speed change) with WordBoundary data. |
| `v3/timing.json` | Derived by `blender/tools/retime_v3.py`: clip windows, words, caption phrases, sync-rule checks. |
| `blender/v3_ramp.py` | Ramp profile, car-on-surface contact, climb and airborne fits, jets, cloud (pure Python). |
| `blender/v3_film.py` | Film clock → camera, pose, per-section look; projected overlays; plate recipe; K2 r×F check. |
| `blender/render_v3.py` | Blender 5.2 plates, picture only (no text, no arrows). |
| `blender/tools/export_v3_overlay.py` | Writes `src/v3/data/overlay.json` and `plates.json`. |
| `src/v3/` | Remotion composition `V3`, covers `V3Cover` / `V3Cover34`. |
| `scripts/v3/score.mjs` | Procedural score and mix; −14 LUFS master. |
| `scripts/v3/finalize.mjs`, `verify.mjs`, `stills.mjs` | Packaging and encoded-output checks (Codex). |

Commands are in [PRODUCTION_STATUS.en.md](PRODUCTION_STATUS.en.md) §3.

## What is reconstructed and what is schematic

- **Reconstructed from the source frames:**
  - the ramp shape and set;
  - the climb, the lip and the airborne turn to level;
  - the downward jets, the cloud and the descent into the cloud. The landing contact is hidden in the source and is not drawn.
- **Fits, not measurements:** car dimensions, the ramp profile, poses and cameras. Every new angle and speed change is named in the on-screen slate.
- **Schematic (slate 原理示意 / 剖面):**
  - the cross-section cut, the under-floor gap, the fan intake markers;
  - the air streaks and impact ticks;
  - every arrow, the vessel layout and nozzle positions.

  Arrow directions are computed: press along the local surface normal, gravity world-down, each reaction exactly opposite its drawn plume, torque by r×F. Arrow lengths are schematic.
- **No numbers** for pressure, force, mass, thrust or endurance. No claims of hover, untethered flight or practicality. The kickflip cables stay visible and are not discussed.
