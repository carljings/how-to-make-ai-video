# Roadster v3 — 「比墙还陡」 (Steeper Than a Wall)

Creative direction by Opus 5.5 (runtime: `claude-opus-5-5`, effort `max`, as recorded in the job launch metadata). This is one combined film covering the ramp's surface attachment and the airborne flip. v1 and v2 stay untouched. Companion files are `storyboard-v3.zh-CN.md` (the timed storyboard) and `narration-lines-v3.json` (exact voice lines with word anchors). Status: **director draft, awaiting Codex fact/feasibility GO. No scene code is written yet.**

## 1. What the real v2 frames taught (from `references/v2-actual-encoded-contact.jpg`)

- **The car reads as a matte model.** The silver body shows no long specular lines and no environment reflections, and the wheels are dark discs. v3 needs real "studio in the dark" light: glossy-only strip cards that draw lines along the shoulders and canopy, rim light on the spokes, and contact shadows.
- **Subjects float in dead space.** A small car sits in the middle of a black void, with a flat grey floor and a hard horizon below it (7.5 s, 23 s, 27.5 s). The ramp solves this: it is a tall graphic structure that fills a 9:16 frame and gives scale. No v3 frame should have more than about 40% of its area unused.
- **The frost reads as glitter, not physics.** Round white dots are scattered around the jets. In v3, every particle is a short streak with a physical job: it moves with the flow, lands as a pressure tick, or rushes into the gap.
- **Force needles are thin.** The hero arrows become bold, with a hot white core, a red-orange body, a crisp head and a slight growth overshoot.
- **What worked and stays:** frame zero is the climax with a giant title, captions are crisp, one thin slate sits top-left, and the hook and ending mirror each other.

## 2. Source facts the film is built on

These come from the ramp clip (Tesla, 2026-10-16). "ev" means source seconds in the continuous wide take.

- The ramp is a reversed-C quarter-pipe. A flat run-in becomes a concave transition, then a near-vertical face, then an upper section that curls back past vertical toward the approach side.
- The surface is mottled concrete with a white centre line and crimson neon strips along both edges. A dark steel lattice tower stands behind the face, in a black venue with an X-lined floor, red barrier light rows and white floods.
- **Climb:** the car starts at the base (rear view, 0–2 s) and climbs steadily, not as a run-up. It is high on the face by 6 s, on the overhang by 8.5 s, and its nose reaches the lip at about 9.25 s.
- **At the lip:** the first cyan jet appears near the nose at 9.5 s. The car is off the surface with its nose up at 9.75 s.
- **Turning to level:** at 10.0 s the car is nose-up and seen side-on. Compared with the roof view at 9.0 s, this means it has rolled about its near-vertical long axis. By 10.5–10.75 s it is near level, facing away from the ramp, with plumes down-left and down plus one horizontal forward plume.
- **Descent:** at 11.0 s three plumes point straight down. From 11.25 s the jets hit the floor and the cloud starts, and one forward plume is still visible.
- **Landing:** the car sinks into the cloud between 11.5 and 12.5 s, and the contact is hidden. It drives out, away from the ramp, between 14.5 and 17 s.
- **Camera angles for fitting:** the replay angle B (19–24 s) shows the same flight with the car's front facing the camera and the ramp on the right. The elevated wide (31–44 s) confirms the curl and the layout.
- **Kickflip:** all kickflip material is the validated v2 source match, reused as-is.

## 3. Editorial approaches considered

1. **Two chapters in sequence.** Ramp explainer, then kickflip explainer, then a recap. Clear, but it feels like two videos glued together, and the ending is a summary.
2. **Split-screen comparison throughout.** Ramp on top, kickflip below. On a phone each half is tiny and the hook is diluted.
3. **One hinge (chosen).** Open on the impossible pose, explain the press, then make **the lip the dramatic hinge**: the exact frame where one mechanism dies and the other must take over. The kickflip arrives as a second, separate proof of the jet principle at its most spectacular. The ending completes a single schematic image that was half-built mid-film.

Option 3 gives a paradox at frame zero and a second hook at about 24 s ("可坡总有尽头"). The surprise at about 38 s ("另一场演示") gives a third. The payoff is an image the viewer has watched being assembled. It also unites "ramp + air" honestly, because the ramp demo itself contains both mechanisms, separated at the lip. The two demos are never joined into one take.

## 4. Spine

- **Question (0.25 s):** 比墙还陡，它怎么掉不下来？
- **Answer 1:** the fans empty the gap, so the outside air presses the car onto the slope. 说是吸，其实是压. The press makes grip possible, and the tyres do the driving.
- **The geometric "aha":** the press always points into the surface, even upward on the overhang. Gravity always points down.
- **Hinge:** 可坡总有尽头 / 车底下没了坡，就压不住了. As the floor passes the edge, the press weakens progressively. It is gone only when no surface is left under the car. The first observed jet overlaps that weakening, which makes it a relay rather than a switch.
- **Answer 2:** 腾空以后，换自带的高压气接力. Inertia and gravity still act; thrust is the new active mechanism. Gas goes down, so the car is pushed up. In another demo, thrust off the centre of mass flips the car completely over.
- **Payoff couplet:** 贴着坡，借的是空气的力；腾了空，花的是自己的气。 *Borrowed* vs *spent* is the real physical difference. Suction uses the atmosphere, which is still there afterwards. Thrust consumes a finite store.
- **Kicker:** 自己的气，总有喷完的时候. This states the limit on sustained flight without a lecture. It also reads as a proverb, which makes it shareable.
- **Narration:** 155 characters in 16 short clips, about 40 s of speech in a film of about 58 s. Speech density is about 2.65 characters per film-second, the same as v2. The longer silences sit where the picture is the evidence: S2, the strobe, the jets, K1, and the poster fly-out.

## 5. Structure (nominal; measured TTS re-times it, order and anchors are fixed)

| Film s | Section | Core picture | Voice |
|---|---|---|---|
| 0.00–3.45 | S1 Hook | CG low 3/4 view looking up. The car crosses past vertical onto the overhang and fills 70% of the frame width. Slow motion goes from 0.35× to 0.15×. Giant **比墙还陡** on frame 0. | L01 |
| 3.45–5.45 | S2 Evidence | Source-matched wide at real speed (ev 7.0→9.0). The whole reversed-C ramp is visible. | — |
| 5.45–5.75 | Freeze | Exposure punch and a 1.03 scale kick. | — |
| 5.75–18.60 | S4 Press | Pure side-on cross-section. Gravity arrow, then the gap emptied (P2), then impact ticks merging into the press arrow (P1). Kinetic 吸→压. Tyre close-up with time creeping (P3). | L02–L05 |
| 18.60–23.90 | S5 Chronophotograph (ramp half) | Strobe replay of the climb leaves 7 ghosts. Press arrows fan around the curve while white gravity arrows stay parallel. Beyond the lip stays black. | L06 |
| 23.90–29.60 | S6 Lip (mid climax) | Slow-motion profile over the edge. The gap opens from the front, the low-pressure lens shrinks and the arrow shortens progressively. The first observed jet fires during this. The arrow's remainder breaks up only when the floor has fully left the slope. | L07–L08 |
| 29.60–33.10 | S7 Relay | Freeze just past the lip. A scan-line x-ray reveals the vessels (schematic); a flow pulse runs to the firing nozzle on 接力. | L09 |
| 33.10–38.20 | S8 Jets | Replay-B angle. The car turns to level; downward plumes carry gas streaks and opposite red arrows; it sinks into the cloud. | L10 |
| 38.20–47.80 | S9 Kickflip | Black separation, then v2 plates: K1 source wide → K2 torque with new overlays → K3 resume. | L11a–c |
| 47.80–59.50 | S10 Ending poster | The chronophotograph returns and opens to full frame. A live car flies off the lip leaving cold ghosts with jets. The couplet types on. On the kicker the jets go out one by one while the warm arrows stay lit. | L12–L14 |

## 6. Signature devices (each one explains something)

1. **Molecule field → pressure ticks → one arrow.** Warm air streaks drift densely near surfaces. Where they strike the car, short ticks are drawn normal to the skin: long outside, short and sparse in the emptied gap. On "压" the ticks slide together and integrate into one press arrow along the local slope normal. This is kinetic theory made visible: pressure acts normal to every surface (NASA Glenn), and the net push points toward the slope.
2. **Chronophotograph (Marey plate).** A strobe replay leaves ghosts, each carrying its press arrow along the local normal, beside parallel gravity arrows. Lengths are constant and schematic, and directions are exact. This single frame shows the brief's core rule: the press rotates with the surface while gravity does not.
3. **The hand-off.** As the floor passes the edge, the gap opens from the front. Warm streaks fill it progressively, the low-pressure lens shrinks, and the press arrow shortens in proportion. This is schematic: no sudden failure, because a fan system tolerates some leakage. The first observed jet fires while the arrow is still shrinking. Only when the last of the floor leaves the slope does the arrow's remainder break into specks. The fan's note glides upward as its load falls.
4. **Scan-line x-ray.** A luminous line sweeps nose to tail, turning paint to dark glass and revealing ice-blue gas in schematic vessels. This is a two-plate wipe, so it costs two renders.
5. **Borrowed vs spent, in colour.** Warm gold is the air the car borrows; ice blue is the gas it carries; red-orange is any push on the car; white is gravity and neutral statements. The final poster is literally warm on the ramp and cold in the air, and the boundary is the lip.

## 7. Look bible

- **Palette:** void `#000000`; air `#F3C98B`; gas `#9ADCFF`; force `#FF4A1F`; white `#F4F6F8`; x-ray edges `#EAF6FF`. The crimson ramp neon is physical light in the plates, never an overlay colour.
- **Plates:** near-monochrome photoreal night, hard white floods, the crimson ramp neon, and a darker floor with a faint wet sheen reflecting the red rows. Light haze appears only in wide shots, for depth. In explanation sections the venue drops to about 25% and car-relative hero light takes over: a cool rim, a soft top key, and glossy-only strip cards for long body highlights. This is the main fix for v2's toy look.
- **Camera:** the horizon is always level, because gravity must read. There is no shake. Moves are slow pushes and cranes. The only fast motion is the strobe replay. Profiles are exactly side-on to the ramp's travel plane. On the overhang the car's long axis is close to vertical, which is why the cross-section fills 9:16 so well.
- **Graphics:** all overlays are computed in Python from the same 3D state and projected through the same camera, as in v2. Specifically:
  - Press arrows follow the analytic ramp-profile normal.
  - Gravity is world −Z.
  - Each reaction arrow is exactly opposite its drawn plume.
  - Torque is r×F, checked against the rendered roll (the v2 code path).
  - Hero arrows are 12–14 px with a white core; ticks are 1.5 px; streaks are 2–6 px and oriented by velocity.
  - There are no round dots, no lens flares, and no shake.
- **Type:** Noto Sans SC subset.
  - Giant titles: 900 weight, about 210 px.
  - Kinetic 吸/压: 900 weight, about 260 px.
  - End-card couplet: 700 weight, about 76 px, at y≈520/620.
  - Captions: 600 weight, 60 px, baseline y≈1330, maximum width about 860 px, no box, soft shadow, one phrase at a time, coloured word by word with the tone code.
  - Labels: 500 weight, 34 px, with a hairline leader.
  - Slates: 300 weight, 26 px, top-left, one at a time.
  - On screen at once: at most one slate, one caption or kinetic/end-card element, and one label.

## 8. Sound (procedural, from the cue table; −14 LUFS ±0.3, true peak ≤ −1.5 dBTP)

- **Ramp half:**
  - The fan has a choked, heavy whir under a low drone.
  - The molecule field is a granular "rain" of micro-clicks. As the ticks integrate, the noise resolves into a pitched tone: many small pushes become one force.
  - 吸→压 is a hiss followed by a deep thump.
  - The strobe is plate-shutter clicks rising in pitch, and the arrows form an ascending arpeggio that resolves on 往上.
- **Lip:** a rising pad and the fan gliding upward as the gap opens. The dry first jet hiss is ducked under the voice. A granular scatter plays when the arrow's remainder breaks, then a beat of near-silence.
- **Air:** a glass shimmer and a metallic ping for the vessels. Cold-gas hiss layers with a hard attack, and a soft heavy "whumph" into the cloud.
- **Kickflip:** reuse the v2 instruments, with silence at the black cut.
- **Ending:** a warm chord for 借, a glassy chord for 花, the hiss decaying out one jet at a time, a final valve exhale, and a low tone fading out.
- **Voice:** the voice always sits on top of the mix, with sidechain ducking at about −8 dB on the beds.

## 9. Truth boundaries (shown as slates and labels, never as caveat cards)

- **Observed and reconstructed:**
  - Ramp shape, climb, lip, airborne turn to level, plume directions, cloud, and descent into the cloud. The landing contact is not drawn.
  - New angles and speed changes are named in the slate.
  - Airborne poses are fitted from frames 9.0–12.5 s (wide) and 19–24 s (replay B). Section 2 gives the director's reading; the fit decides.
- **Schematic** (slate 原理示意): gap, fan intake markers, air streaks, impact ticks, all arrows, vessel layout and nozzle positions.
- **Arrow length policy (Codex correction):** arrow lengths are purely schematic. The press and weight arrows use representative unequal lengths with no values. Neither length implies a force ratio or friction coefficient; the uncalibrated source cannot support either.
- **Hand-off policy (Codex correction):** suction is not a binary leak failure. The press is drawn weakening progressively as the gap opens, and disappearing only when no slope is left under the floor. The slow-motion mapping puts 压不住 on that fitted frame. The film does not claim the demo measured any failure moment. After take-off, inertia and gravity still act, and thrust is the new active mechanism (接力, not "only").
- **"风扇"** follows the brief's suction framing and the event captions. Fan count, position and exhaust path are not shown or claimed; the intakes are labelled 示意.
- **No numbers at all.** No flames, no cloud chemistry, no hover, no untethered claim, no practicality claim. The kickflip cables stay visible and are not discussed.
- **The two demos are separate:** black separation, the slate 另一场演示 and the spoken 另一场演示里. The ending poster uses only ramp-demo data.

## 10. Production plan

**Segment manifest (single timing source `v3/cues.json`).** Each v3 film frame maps to exactly one of the following:

- a new v3 render frame;
- a held or 2D-moved still plate;
- a v2 plate frame. This mapping is 1:1 at speed 1; there is no retiming of v2 frames.

v3 overlays are drawn over all three kinds. For v2 segments, overlays are recomputed with `v2_film.state(t_v2)` and the v2 camera, then styled in v3.

| Shot | Kind | Frames (est.) |
|---|---|---|
| S1 hook (HANG) | per-frame, new ramp scene | ~104 |
| S2 evidence (WIDE_SRC) | per-frame, dark wide, no volumes | ~60 |
| S4 P1, P2 | 2 stills + 2D push | 2 |
| S4 P3 tyre creep | per-frame (fallback: still) | ~75 |
| S5/S10 poster background + cloud | 2 stills at 1620×2880 | 2 |
| S5 strobe live-car layer (climb) | per-frame car-only RGBA at 1620×2880; ghosts are copies of chosen frames | ~60 |
| S6 lip (LIP) | per-frame | ~170 |
| S7 x-ray | 2 stills (opaque and glass at the same pose) | 2 |
| S8 jets (REPLAY_B) | per-frame with plume and cloud volumes | ~155 |
| S10 fly-out live-car layer | per-frame RGBA with plumes at 1620×2880 | ~85 |
| S9 kickflip | v2 plates reused: about 87 + 114 + 82 frames | 0 new |

- **Render cost:** about 710 new per-frame renders plus 6 stills. My rough estimate is 60–90 min in one Metal EEVEE job, with the volume shots dominating; this is not measured.
- **Lean fallback (about 35–45 min):**
  - P3 becomes a still.
  - S6 drops to about 120 frames.
  - S8 drops to about 120 frames.
  - The live-car layers render at 1080×1920 and S5 accepts a slightly soft 1.35× crop.
- The storyboard works under either plan. Codex's benchmark decides.

**Reuse:**

- Car (`roadster.py`) and plume, cloud, bloom and x-ray/vessel code (`render_v2.py`, `shots.py`, `build_scene.py`).
- Projection and the overlay pipeline (`v2_film.py`, `export_v2_overlay.py`).
- Remotion components (`src/v2/{Type,Graphics,Post,Cover}`), score instruments (`scripts/v2/score.mjs`), and the finalize/verify scripts.

**New code (after GO):**

- `blender/ramp_geom.py`: analytic profile, normals and the lattice.
- `blender/v3_film.py`: ramp event state(t), cameras, pressure field, strobe and overlays.
- `blender/render_v3.py`.
- `blender/tools/export_v3_overlay.py`.
- `v3/cues.json` and `v3/timing.json`.
- `src/v3/`.
- `scripts/v3/{score,finalize,verify}.mjs`.

## 11. Asks for Codex

1. **TTS:** synthesize the 16 lines in `narration-lines-v3.json` exactly as written (YunjianNeural, −6%). Return usable WAVs, word boundaries and durations, and check the listed readings (缝隙, 重心, 没了, 腾空, 接力).
2. **Fonts:** rebuild the 300/500/600/700/900 subsets from the full Noto Sans SC once the text is locked. All on-screen strings are in the storyboard and JSON.
3. **v2 plates:** confirm that `final-frames-02/frames` are clean Blender plates with no type or overlays. Give the exact indices and hashes for v2 film 3.95–6.85, 12.75–16.55 and 21.85–24.60 s. If those frames are composited, point me to the plate frames instead.
4. **Ramp fit support:**
   - If a higher-resolution analysis copy of the ramp clip exists locally, use it for pose and geometry fitting only, never in the film.
   - After I propose the profile and cameras, render compare overlays against ev 6.0/8.0/9.25/10.0/11.0 (wide) and 20/22 s (replay B), as was done for v2.
5. **Benchmark:** report per-frame times for a ramp wide without volumes, the replay-B angle with plumes and cloud, and one 1620×2880 RGBA car layer.
6. **Fact QA:** check the arrow-length policy, the "风扇" wording, my airborne-pose reading and the observed jet directions. Then return GO, GO-with-changes, or specific blocking issues.

## 12. Acceptance (unchanged gates)

1. Storyboard GO.
2. Proof stills and contact sheets, reviewed by actually looking at them (S1 f0/1.6/3.3, S2, P1/P2/P3, poster, S6 ×3, S7, S8 ×3).
3. Measured voice sync plus a physics and overlay check.
4. Full 1080×1920 30 fps MP4, SRT, two covers, and credits/source/readme.
5. Full decode, −14 LUFS ±0.3, true peak ≤ −1.5 dBTP.
6. A visual check of the first seconds, the lip climax and the ending poster.

Human listening and phone approval remain separate and are not claimed.
