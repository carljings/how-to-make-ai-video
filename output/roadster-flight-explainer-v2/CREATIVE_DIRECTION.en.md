# Roadster v2 — 「一口气」 (One Breath)

Creative direction by Opus 5.5. The user rejected v1 as not striking enough and too wordy, then delegated aesthetic and editorial leadership. This document replaces v1's brief. v1 stays untouched in its own project.

## What failed in v1 (from the actual encoded frames)

- **The frame was mostly fog.** Explanatory cameras looked down at the floodlit lot, so the lower half of every 9:16 frame was flat grey haze. The car sat small and centred in a catalogue side profile.
- **Light was flat.** There was no rim light, no specular drawing on the body and no darkness around the subject. The source clip has all of these.
- **The text read like compliance paperwork.** Up to five boxed chips sat stacked top-left (原理示意 · 非现场画面, 非厂商结构图, 只示意转动（暂未画下落）, 气量余量示意, chapter numbers). A grey caption pill appeared on every phrase. Arrow labels also had boxes, plus a crash-test-dummy CoM disc.
- **It was a lecture.** There were five acts, 269 narrated characters and 66 s of continuous speech in 75 s: suction, reaction, torque, reserve, hover, commuting, safety.
- **The ending was anticlimactic:** a stand prop with "飞多久 / 还得看气量 / 能量和安全".

## What the source already gives us

Black sky, hard white floods, a white car upside down in the air, blue-white jets that rotate with it, and a cloud of its own gas swallowing the parked lineup. It is already a high-contrast, near-monochrome image with one red accent, the tail strip. v2 builds on that instead of replacing it with a classroom.

## Approaches considered

1. **Swiss motion graphics.** The car becomes a line drawing on a grid, with kinetic type and flat diagrams. This is clean and designed, but it throws away the real event's thrill. It would read as yet another explainer template.
2. **Documentary realism.** Mostly source reconstruction with grain and handheld feel, and minimal graphics. Faithful, but the mechanism stays invisible, so it explains nothing.
3. **Frozen apex / bullet time (chosen).** Let the real event play, then **stop time at the moment the car hangs upside down**. Fly the camera into the frozen moment and dissect it with a few crisp lines. Then let time resume and the car drop into its own cloud.

Option 3 has the strongest frame zero, a single built-in reveal (the freeze and fly-in) and a natural payoff (time resumes). It also lets every explanation happen *inside the real event* rather than in a separate diagram world.

## The one question and the smallest causal chain

**没有翅膀，它凭什么在空中翻身？** (No wings — how does it turn over in mid-air?)

1. Gas goes one way, so the car is pushed the other way (reaction).
2. The push does not pass through the centre of mass, so the car turns (torque). That is the flip.
3. The gas is stored compressed gas, per Tesla. Nothing burns.
4. **Payoff:** no wings, just *一口气* (one breath). The phrase is literal (one burst of stored gas) and idiomatic ("in one go"). The kicker: *要一直飞，就得一直喷* (to keep flying, you must keep blowing). This is a conditional physical fact, and the viewer infers the limit without a lecture.

**Cut entirely:** suction, active aero, hover balance, "demo ≠ commute", safety, reserve meters and chapter numbers. Suction acts toward a nearby surface and has nothing to do with a free-air flip, so it was secondary lecture material. Because v2 never claims suction lifts the car, no caveat card is needed.

## Structure (30.0 s, locked to the measured narration; v2/timing.json)

| Film s | Section | Picture | Voice |
|---|---|---|---|
| 0.0–3.95 | **Teaser** | Frame zero: the car **upside down, filling the frame**, jets streaming up into black. Extreme slow motion of the source apex (source 8.30→8.62 s), low 3/4 rear angle, slight dutch tilt, black sky as in the source (no stars, no motes). Giant title **没有翅膀**. | 没有翅膀，它凭什么在空中翻身？ |
| 3.95–6.85 | **Evidence** | Hard cut to the reconstructed source wide shot D at real speed (source 5.70→8.60). The camera stays at the source position, panning and pushing in. The car rises out of its cloud and rolls over the lineup. | — (sound only) |
| 6.85 | **FREEZE** | Time stops at the apex. Lot floods dim, hero rims come up, and frost glitter hangs frozen inside the four jets (the condensate that makes cold-gas plumes white). It stays world-static as the car keeps turning, leaving a trail. | 停！ |
| 6.85–9.35 | **Fly-in** | A continuous 20 m push through the frozen scene, from the source camera to a side view of the inverted car. | 看这几道白气。 |
| 9.35–12.75 | **Reaction** | Ice-blue gas particles flow out of the near-side jets. Red force lines grow from the same nozzles in exactly the opposite direction. | 气往一边喷，车就被推向另一边。 |
| 12.75–16.55 | **Torque** | The camera orbits to look down the car's long axis. The two forces add tip-to-tail into one resultant; far-side jets dim (schematic). The red lines' dashed lines of action miss the white CoM dot, and a red arc shows the turn while the car visibly rolls that way. | 推力偏离重心，车就转了起来。 |
| 16.55–21.85 | **Stored gas** | The camera rises. The body turns to dark glass with white fresnel edges, revealing schematic pressure vessels with ice-blue gas. Flow lines run to the nozzles. One label: 碳纤维缠绕压力容器 · 据特斯拉 · 位置示意. | 气，存在高压罐里。不点火，也不燃烧。 |
| 21.85–24.6 | **Resume** | Hard cut back to the source wide at real speed (continuing from the frozen event time). The car finishes its roll and drops left into the cloud. | 没有翅膀，靠的就是这一口气。 |
| 24.6–30.0 | **End** | Time eases to slow motion. The cloud swallows the lineup: the "breath" made visible. End card **一口气**, then fade. | 可要一直飞，就得一直喷。 |

80 narrated characters (v1: 269), 20.8 s of measured speech in 30 s. The evidence shot and the ending breathe on picture and sound alone. Every reveal is locked to its spoken word: forces on 车, the CoM dot on 重心, the arc on 转, the vessel label on 高压罐, the giant 一口气 on 一口气.

## Look bible

- **Palette:** true black void; pearl-white car; **ice blue = gas** (#9ADCFF); **signal red-orange = force/motion** (#FF4A1F, kin to the car's red tail strip). White is reserved for the CoM, lines of action and type. The colour code means something: blue is what leaves, red is what pushes back. Captions reuse it.
- **Light:** in source sections, the source floods and backlights stay as the evidence look. At the freeze, the "theatre" changes: lot light falls to about 25% and car-relative hero lights take over. These are cool backlights that make the jets glow, a soft top key, an under-fill standing in for the ground floods, and glossy-only strip cards that draw long specular lines on the body.
- **Camera:** source sections stay at the source camera position (portrait pan/push only). Close shots use long-ish lenses (32–42 mm on a 36 mm vertical sensor) with shallow DOF. There is one big move (the fly-in) and slow orbits otherwise. No permanent drift and no shake.
- **Graphics:** photoreal plates carry no diagram geometry. Forces, particles, lines of action, the CoM dot and the arc are crisp **vector overlays** with soft glow. They are computed in Python from the same 3D state and projected through the same camera, so every line sits exactly on the rendered nozzles. There are no arrow labels; colour and voice do that work. The only labels are the 重心 dot and the vessel callout.
- **Type:** one family, Noto Sans SC (OFL), at extreme weights only. **900 for giant titles, 600 for captions, 300 for thin slates.** The hook and the ending mirror each other: giant **没有翅膀** (question) ↔ giant **一口气** (answer). Captions sit free (no boxes, soft shadow) at y≈1330, one phrase at a time. Gas phrases are ice blue and force phrases red, matching the picture.
- **Attribution:** one thin top-left slate whose text changes by section, never stacked:
  - 重建自马斯克 2026.10.16 发布的视频 · CG (source sections)
  - CG 慢放重建 (teaser)
  - 原理示意 · 非实拍 (explain sections)
- **Post:** subtle animated grain, vignette, bloom on emissive gas/force, and a 3-frame exposure punch with a 1.03 scale kick on the freeze.

## Sound

Procedural, generated from the same cue table, mastered to −14 LUFS with true peak ≤ −1.5 dBTP.

- **Teaser:** slowed, low-passed hiss with a sub swell, an "underwater slow motion" feel.
- **Evidence:** full-band gas roar, a whoosh as the car passes, and a rising pulse.
- **Freeze:** everything cuts to a sub-drop, then a frozen sustained pad.
- **Explain:** each reveal gets one tonal ping (beam on, arc on, x-ray glass shimmer), with a quiet heartbeat pulse.
- **Resume:** an impact plus the roar returning, swelling into one resolving chord.
- **Final sound:** a valve's exhale as the cloud thins, the "breath".

## Truth boundaries, handled as meaning rather than caveat cards

- **Source sections.** These reconstruct only the clip's visible design, poses, order and surroundings. There is no ramp, no takeoff and no touchdown. The car disappears into the cloud as it does in the source. The teaser is a slowed close view of the same apex, labelled CG 慢放重建. The resume continues the same event time, so the flight is never shown twice.
- **Explain sections are schematic** (slate 原理示意 · 非实拍):
  - The CoM is a body-volume estimate.
  - Asymmetric jet firing is a hypothetical way to produce the observed roll sense.
  - Each force line is exactly opposite its drawn exhaust.
  - The torque sense is computed (r × F) and checked against the rendered roll.
- **Tesla attribution.** Cold-gas thrusters and carbon-fibre-overwrapped pressure vessels are attributed to Tesla (posts 2110907035571401174, 2110904290743402880). Vessel count and position are labelled as schematic.
- **No invented numbers.** There is no mass, pressure, nozzle count, tank volume or endurance. No flames. The film makes no hover claim and no untethered claim. The cables stay visible and are not discussed.
- **Kicker.** 要一直飞，就得一直喷 is a conditional: sustained support needs continuous thrust. It does not claim the car can or cannot fly.

## Pipeline (single source of truth)

`v2/cues.json` defines sections, beats, voice lines, captions and slates. The following all read it:

- `blender/v2_film.py`: pure-Python state(t) and projected overlays, testable without Blender.
- `blender/render_v2.py`: Blender plates, reusing v1's proven car, lot, plume, cloud and bloom code.
- `blender/tools/export_v2_overlay.py`: per-frame vector graphics JSON.
- `src/v2/` (Remotion composition `V2`).
- `scripts/v2/score.mjs`.
- `scripts/v2/finalize.mjs` and `verify.mjs`.

Duration lives in one place.
