# FULL_READY: v4 「光切」 complete 58.3 s film, ready for the body/ending proof

Director: Opus 5.5 (human-delegated art direction). Date: 2026-10-17.

These are unchanged:
- the narration (16 lines, 37.68 s), all sync rules and the two-demo separation;
- the kickflip plates and their signs (K2 torque sense +1 ×3);
- the geometry and fit (self-test identical).

Stop after the body proof and send me the actual images.

## 0. Proof02 verdict (actual frames f00000, f00081, f00153, compare_el34)

**The opening works, and its direction is final.** It has a black void and a silver car hanging inverted, with black glass and tyres. The crimson edges are crisp. The flat top reads as a finite slab both at frame 0 and at the landing, and the title is clean. The following fixes are in this snapshot (no camera or timing change). They take effect in the final full render, which re-renders 0–155 into a fresh directory.

1. **Essential.** In f00153 the sheet's veil read as fog. It was graze-boosted and seen nearly edge-on, which washed the far half of the car and made a grey wall beside the ramp.
   - Veil level: 0.16 → 0.05 while sweeping, 0.02 after the lock.
   - Graze boost: 0.18 + 2.4f³ → 0.25 + 0.9f³.
   - The razor line itself is unchanged.
2. **Minor.** The floor's blotchy roughness (0.18–0.42) made the lit ramp's reflection read as smoke from high angles (f00081 bottom right; el34 under the foot). The sheen is now even: roughness 0.34–0.44, specular 0.42.
3. **Minor.** The stray lamp-head dot beside the title: hook `lamps` 0.3 → 0.12.

## 1. What the rest of the film now does (written plan → implementation)

| Section | Light-sheet and look |
|---|---|
| **Press P1/P2 (5.5–15.0)** | *We are inside the sheet.* The side cameras look straight through the sheet plane: the car's centre plane y = 0, which already holds the gold air, the ticks and the low-pressure lens. Surface emission there is edge-on, so the sheet's intersections are **projected razor lines** in palette ice white (`xray` #EAF6FF, the same as the scan bar): the ramp profile, ceiling included, and the car's centre section. They appear on the cut at 5.5 and dim to 60% when the press arrow lands (11.32), so the red arrow leads. In P2 the two lines frame the gap where the lens sits. |
| **Tyre (15.0–17.8)** | The plane slides from the centre plane to the near wheel (0.5 s, with a falling glide in the sound). Then the tyre rings and the surface line show "the tyre's contour on the concrete line", together with the existing contact flare and traction arrows. |
| **Chrono (17.8–23.2)** | A clean strobe; no sheet. On the deck ghost the press arrow points straight up into the ceiling while gravity points down, so 哪怕是往上 is literal. The dashed vertical-component mark is removed wherever the press is already vertical. |
| **Lip (23.2–28.6)** | The same razor lines (ramp profile + car section) as the gap opens from the nose and the press shrinks. |
| **X-ray (28.6–32.0)** | The lines drop to 40%; the scan bar is the sheet. Slate: 光切扫描. |
| **Jets (32.0–36.9)** | Unchanged design: cold gas. The neon is pulled back to crisp crimson. |
| **Kickflip (36.9–46.7)** | Untouched. |
| **Ending (46.7–58.3)** | The sheet stands **edge-on at the deck's free end**, drawn floor-to-sky as the live car leaves (50.867 s, '腾了空' at 50.858). It is the boundary between borrowed air (the ramp ghosts with warm presses, right) and carried gas (the air ghosts with cold jets, left). |

**Other changes**
- **Slab-shadow fix for every inverted car.** `rig_up()` blends the hero rig's "up" toward the roof normal as the car turns over. Camera-up placement put the key and rims above the deck, which shadowed them. This was checked numerically: P1, P2, XR, GHOST_R6, GHOST_C0, tyre and lip keys now sit at z ≈ 10.4–10.6, against the deck at 15.27. Jets keep their v3 rig.
- **Poster refit to the corrected departure.** The v3 frame ended at x −17.5 m and cut off the landed car (nose at −19.3) and its cloud (−18.8). The new full plate spans x −20.6…11.6 with the floor at 73% height. Measured in output px:
  - landed car: x 41–195;
  - cloud: x 59–336;
  - truss and outline: x 477–1064;
  - gantry top: y 792, under the header.

  The ramp crop now holds the deck's free end to the back of the truss. All chrono ghosts and arrows fall inside it (x 75–931, y 490–1588).
- **Neon.** Crimson is kept crisp everywhere: jets 0.5 → 0.22; chrono and ending 0.3 → 0.2.
- **Slates** name the device and stay honest: 原理示意 · 光切剖面 · 非实拍 (5.5–17.8), CG 慢放重建 · 光切剖面 · 图形为示意 (lip), 原理示意 · 光切扫描 · 非实拍 (x-ray). Retime re-run: only `cues_sha256` changed; every sync rule passes. All glyphs are in the font.
- **Sound** (`score.mjs`, timed from `plates.sheet`):
  - a tick when the sheet ignites;
  - a thin laser tone that pans with the sweep and brightens into the lock;
  - a glass click on the lock, 0.14 s before the freeze shutter;
  - the wheel-plane glide;
  - a soft shimmer under '腾了空' for the boundary.

  Run here: master −14.1 LUFS, −2.0 dBTP, converged. The sweep sits about 3 dB over the bed and about 16 dB under the freeze hit.
- **Transparent layers stay clean.** Ghost, live-car and cloud layers get sheet 0, no veil, haze 0, and no follow, headlight or uplight in their looks. The world volume is linked only when haze is greater than 0.

## 2. Render now: body/ending proof (one Blender job, native, METAL, EEVEE 64)

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
P=/ABS/PATH/TO/codex-roadster-v4-20261017      # this v4 copy on the Mac (absolute)
OUT=/ABS/PATH/TO/renders
"$B" --background --factory-startup --python-exit-code 1 --python "$P/blender/render_v3.py" -- \
  --device METAL --engine EEVEE --samples 64 --out-dir "$OUT/v4-body01" \
  --stills all \
  --times 2.7,5.1,15.3,16.4,24.2,26.6,27.3,28.5,33.0,34.4,35.9 \
  --layers --layer-range 1545,1614,1623
```

- `--layer-range` now also accepts a comma list; `a-b` still works.
- **Outputs**
  - `stills/` (20): P1, P2, XR_OPAQUE, XR_GLASS, POSTER_BG, POSTER_CLOUD, GHOST_R0–6, GHOST_C0–6. Poster stills are 1620×2880.
  - `frames/tSS.SSS.png` (11, all exact frames): 81, 153, 459, 492, 726, 798, 819, 855, 990, 1032, 1077.
  - `layers/f01545.png`, `f01614.png`, `f01623.png`.
- **Rough cost:** about 34 items at about 5–8 s each.

**Composites to review** (`stills.mjs`, same V3 composition), with their plate dependencies:
- 195 P1 (air, fans, gravity, sheet lines)
- 255 P2 (gap, lens, the two lines)
- 354 P1 (press arrow, slope flash)
- 438 P1 (压)
- 459 / 492 tyre (plane sliding / rings and contact)
- 675 chrono (ramp crop; live = GHOST_R6)
- 726 / 798 / 819 / 855 lip
- 915 x-ray (wipe XR_OPAQUE→XR_GLASS)
- 990 / 1032 / 1077 jets
- 1545 ending (live f01545; boundary line drawn)
- 1614 ending (f01614 + cloud)
- 1689 ending end card (live f01623 + cloud)
- 81 and 153: the opening floor and veil fixes

**What I will judge**
- Silver and black form in the inverted press, lip and x-ray shots: no slab-shadowed car.
- The razor lines register on the ramp and the car without bleaching or clutter.
- Gold is distinct from ice and the red arrows lead.
- The ramp crop composes and the full poster contains the landing.
- The boundary line reads as meaning, not decoration.

## 3. After the body proof passes: full film (fresh directory; re-renders 0–155 with the opening fixes)

```bash
for J in "--all-render-frames" "--stills all" "--layers"; do
  "$B" --background --factory-startup --python-exit-code 1 --python "$P/blender/render_v3.py" -- \
    --device METAL --engine EEVEE --samples 64 --out-dir "$OUT/v4-full01" $J --skip-existing
done
```

- That is 549 render frames, 20 stills and 176 layers.
- Then run Codex's finalizer: `--plates="$OUT/v4-full01" --out=… --lock=…`, packaged as `roadster-v4-light-sheet.mp4`. It regenerates timing and overlay, runs `score.mjs` and verifies the result.
- Do not reuse proof directories; the source lock must be fresh.

## 4. Files changed this session, and checks (server, CPU only)

| File | Change | sha256 |
|---|---|---|
| `blender/v3_film.py` | `rig_up()` and its use; poster refit and ramp crop; sheet lines (`sheet_*`, `ENDING_OFF_T`, `TYRE_SLIDE`); veil level; neon and lamp looks; vcomp gate | `88ea06d0…3b5685dd` |
| `blender/render_v3.py` | Veil graze; floor sheen; `--layer-range` comma list | `977b3719…3e1200f0` |
| `blender/tools/export_v3_overlay.py` | `plates.sheet` timing for the score | `7a961fe0…b2945f23` |
| `src/v3/Graphics.tsx`, `src/v3/data.ts` | Sheet polyline layer; `OFrame.sheet` | `9c4ca265…47351340`, `e5c88bb9…068131f7` |
| `scripts/v3/score.mjs` | Light-sheet sound cues | `3345d8b1…38501e0a` |
| `v3/cues.json`, `v3/timing.json` | Three slates; retimed (hash only) | `4934dfc9…3ed8b667`, `26fa5126…ac981eb4` |
| `src/v3/data/overlay.json`, `plates.json` | Regenerated, deterministic | `49518b35…bd737a50`, `e54d82df…f06ada89` |
| `CREATIVE_DIRECTION-v4.en.md` | §7, the decisions made after the actual proofs | — |

From the opening pass, still in this snapshot: `blender/v3_ramp.py` (RUNIN 6 m, `7cf64723…d9056678`) and `src/v3/Type.tsx` (title scan line, `be274970…4e15e337`).

**Checks**
- `py_compile` passes.
- `v3_ramp` self-test: 0 contact errors, 34 mm climb clearance, 108 mm after the lip, deck window ev 8.50–9.22.
- `v3_film` report: 1749 frames, 549 render frames, 176 layer frames, K2 +1 ×3.
- Hash chain: the cues hash equals `timing.cues_sha256` and `plates.cues_sha256`.
- Retime: all sync rules pass.
- Export is byte-identical on re-run.
- `tsc --noEmit` passes (scratch copy, identical versions).
- `score.mjs` ran end-to-end into `/tmp`.

**Not touched:** `scripts/v3/{finalize,stills,verify}.mjs`, fonts, packaging, the original project.

## 5. Uncertainty (only pixels settle these)

- **The body stills have never been rendered in v4.** Light balance under the deck is a numeric estimate, now with the rig in the open void. If a press still is flat or dark, the next lever is the hero key and rim levels, not exposure.
- **Overlay line registration.** The lines are drawn at y = 0. The visible cut edge is at y = −1.06, so on the deck the ramp line sits about 20–25 px inside that edge, on the underside. This is geometrically right; if it reads as misregistered I will snap it to the cut edge.
- **Poster scale.** The ramp is about 25% smaller in the chrono crop than in v3, because the v4 ramp (deck plus 6 m run-in) is wider.
- **Accepted residuals.** Replay-B framing is not refitted (by instruction). The elevated compare's free end is about 1 m off.
- **Claims.** Dimensions are inferred. The light-sheet is labelled 原理示意 and is an explanatory CG device, not a claim about Tesla's instruments.

## 6. Body01 acceptance (actual images: contact, f00255 P2, f01689 ending)

**Verdict.** The film works. The explanation reads in the real pixels: the inverted car is pressed up into the ceiling (press up, gravity down), the sheet lines frame the gap with gold air in it, chrono and the ending show warm presses on the C and ceiling with cold jets in the air, and the free-end boundary line reads as meaning. The full trajectory is inside the poster. No issue with geometry, cameras, overlays, timing or type.

**One essential look correction (applied).** P2's top third is a radial flashlight pool on the slab's cut face, and the car side has a near-white hotspot. The same pool sits above the car in every P1, tyre and lip frame. The cause is v3's cross-section fill (`hero_gap`, not light-linked), which on the v4 inverted car sits about 2.3 m from the slab section and 3.4 m from the body. Fix: `gap` 1.0 / 0.8 / 0.5 → 0.4 / 0.35 / 0.25 (press / tyre and lip / x-ray). The sheet lines already define the gap.

**Minor (applied).** Stray venue lamp heads printed as white squares in the void: in P1, lip and x-ray, in the ending at (100, 1175) and (430, 1168), and beside the hook title. Fix: `lamps` → 0 in every non-source shot. The source wide and the jets keep theirs.

**What did not change.** Only look values in `blender/v3_film.py` changed (now `eb1d1116…47e553a6`). The overlay and plates are byte-identical, the timing is unchanged, and K2 is still +1 ×3.

**Re-proof (6 items, about 1 min):**

```bash
"$B" --background --factory-startup --python-exit-code 1 --python "$P/blender/render_v3.py" -- \
  --device METAL --engine EEVEE --samples 64 --out-dir "$OUT/v4-body02" \
  --stills P1,P2,POSTER_BG --times 0,15.3,24.2
```

Composites to check: 0, 195, 255, 459, 726, 1689.

**Pass rule (no round-trip needed).**
- If the slab pool and the body hotspot are gone, the silver and black form still reads, and no white squares remain: **GO for the full render**, with this source frozen.
- If instead the car turns dull or dark in P1/P2, revert `gap` only to the body01 values (keep `lamps` 0) and GO.

Either way I make no further art changes before the full film.
