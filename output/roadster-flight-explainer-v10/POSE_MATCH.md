# POSE_MATCH — v9 first-ramp departure (Opus 5.5), round 3 after native-orders-02 (F1)

Evidence: `.omx/artifacts/roadster-v9-20261019/opus-v9-pose/` (round 1) and `…/round2/`; Codex native evidence in
`out/native-orders-01/` and `.omx/artifacts/roadster-v9-20261019/{native-measurements,climb-lag-analysis}/`.
My own frames are SwiftShader diagnostics, not native proof.

## Reference anchors (native 1080, source `7p5LxFdc-Qg`, SHA 67b2ca7f…)
| Source (main take) | Visible state | Close replay (same order) |
|---|---|---|
| 9.45–9.75 | roof/canopy toward camera. **At 9.75 the tail is at the free end and the car hangs out past the deck** (native pair f941) | 17.70 |
| 9.87 | roof starting to turn (~20°) | 17.87 |
| 9.95 | roof narrow (~50°) | 18.03 |
| 10.03–10.20 | thin white side/edge with wheels | 18.20–18.37 face-on flank |
| 10.37 | underside opening | 18.70 |
| 10.45–10.53 | dark patterned underside wide; first plumes, down-left | 18.87–19.03 |
| 10.62–10.70 | level; underside and lamps; columns down | 19.37–19.53 |

## Changes (geometry/v3_ramp.py → `python3 geometry/export_v5.py`; only poses.json changes)
**Round 1 (picture-ready-01):** roll re-key, fast into side-on then a long ease-out (v8 was slow, then a snap,
upright by 10.5). The under-body columns come on during the underside reveal.

**Round 2 (this lock):**
1. **Climb-end refit.** Basis: the native pair at 9.75 (source tail at the free end, model tail 1.1 m short) and
   Codex's lip-registered inversions (tail +0.26/+0.31 s, nose ≈0 at 9.25/9.50; their mean puts the car centre
   +0.55/+0.72 m behind). Keys up to 9.0 are kept. `(9.25, 26.2) → 26.45`, `(9.5, 27.4) → 27.75`, and the rear
   wheels leave at `EV_OFF 9.80 → 9.69`, which is about half the indicated lag, so the nose evidence is not overshot.
   pchip side effect: ev 8.5–9.0 shifts by ≤ 3.8 cm (A1 poster ≤ 1.6 cm). Invisible, but the earlier frames are no
   longer guaranteed byte-identical.
2. **Airborne.** The vertical schedule is unchanged: the drop starts as the floor clears the deck (~9.87), consistent
   with the film's progressive seal loss (A10). The horizontal keys carry the earlier departure (about +0.5 m) and
   blend back to the same touchdown area (x −16.83 → −16.90).
3. **Roll start follows the tail.** The tail now clears at ~9.865 (was 9.975). New keys:
   `0@9.79, 7@9.85, 27@9.92, 52@9.98, 82@10.06, 98@10.16, 116@10.28, 136@10.40, 155@10.52, 168@10.63, 178@10.76,
   180@10.90`. Measured at the anchors: 39° at 9.95 (round 1: 20°, source ~50°), 60° at 10.00 (43°), 89° at 10.10 (83°).
   Peak rate is about 420°/s, so no snap.
4. **Whole BODY mesh vs deck slab** (Codex's method, reproduced at 16.2 mm vs their 15.4 mm for round 1): minimum
   **0.0337 m at ev 9.854**. Wheels are excluded. These are fitted-model numbers, not vehicle data.

**Round 3 (after native F1 pairs): the roll SENSE is reversed (`ROLL_SIGN +1 → −1`), keys unchanged.**
- **Symptom.** Every native pair from f960 to f1004 had the same pattern: the CG kept a broad roof/canopy, while the
  original narrowed to a thin sliver (10.0) and then showed its dark underside behind a white flank rim (10.2–10.3).
- **Cause.** Both source cameras sit on the −Y side (main eye audited; replay eye heuristic). With +1 the roof turns
  toward them and stays visible to ~120–130° of roll, so no retiming can produce the source's order. With −1 the roof
  goes edge-on and the flank faces the camera at ~58° (main) / ~48° (replay), and the underside opens after that.
  The numbers are in `round3/visibility-analysis.txt`.
- **Test.** −1 renders from the D3 eye beside the source at 9.917 / 10.0 / 10.1 / 10.2 / 10.3 / 10.4 / 10.5
  (`round3/diag-src-vs-cg-rollsign-minus1-9.917-10.5.jpg`, SwiftShader) show the same surface order at the same
  instants, including the thin sliver with wheels at 10.0.
- **Not an engine bug.** The matrix conventions were audited coherent; this is the fitted sense of a fitted rotation.
  No yaw or other degree of freedom is added. Clearance is unchanged at 0.0337 m (the body is laterally symmetric).
  The landed pose (180°) is identical under either sense, so G1/G2 do not change.
- **Consequence.** The round-2 "first-quarter lag of 0.05–0.08 s" was mostly the wrong sense. With −1, the keys put
  the roof edge-on at 10.0, as in the source.

## What remains inferred, and the known discrepancies
- All angles are image-informed. No Euler angle is measured.
- **The first quarter is now within the visual tolerance of these comparisons.** The source starts turning slightly
  before the model can (deck clearance), but with −1 the edge-on and underside instants match. The remaining
  difference is not measured as a number.
- **The climb lag is only partly corrected.** Nose and tail evidence disagree (the source's nose-to-tail span is 3.0–3.5
  vs the model's 4.4). Half of the tail-indicated lag is applied; no single source timewarp is established.
- **Material differences remain.** The source's black canopy and dark underside merge with the night. The CG
  underside is lit by the staging wash so its panel grid reads, and the illustrative car keeps a white roof frame.
  The car shape is not changed.
- **The airborne path after 9.75 is not measured.** A fixed-eye registration implies a drop faster than free fall and is
  rejected; the source camera follows the car.

## Same-camera comparison (for the final check)
- The D3 eye is the source main eye `[-24.13, -8.08, 0.3]`. Geometric comparison holds up to about 9.75; after that,
  compare surface ORDER and lip relation only.
- Pairs (film frame → model ev ↔ native main): f941 ↔ 9.75, f960 ↔ 9.90, f975 ↔ 10.00, f991 ↔ 10.10, f1004 ↔ 10.20,
  f1015 ↔ 10.30, f1025 ↔ 10.40, f1035 ↔ 10.50, f1045 ↔ 10.60, f1057 ↔ 10.75. These are unchanged: the D3 clock is the same.
