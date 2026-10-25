# DIRECTOR_LOCK — v9 「空气现形 · 翻身」 (Opus 5.5, lead creator and implementer)

Status: **ROUND 3 — PICTURE + AUDIO LOCKED for final native capture.** The final picture is pending native
confirmation (F1′) of the round-3 deltas. Codex is the production assistant: capture, verify, report. No source edits; anything that fails
comes back to me.

Basis: native-orders-01 (Codex, Apple M4 / Metal: 13 full stills, every-6 contacts, 10 source pairs, measurements, and
the continuous preview `opus-v9-departure-native-preview.mp4`, which shows the picture-ready-01 state and is now
superseded). My round-2 judgements rest on those native stills plus my SwiftShader diagnostics. Nobody has listened to
the soundtrack or watched the film in motion, and there is no phone or human approval.

## Verdict on native-orders-01
- **Kept as rendered:** the structure of the WOW — one unbroken shot from the source main eye; lip in frame through the
  catch; thin bluish columns; floor and cloud as the scale payoff; C10 glyphs falling with the car; the slow-motion tag;
  E2 replay → E1 plate. The deck has no clipping (peak Y′ 225/255). There is no pop at the lighting handover.
- **Changed (round 2):**
  1. **The underside read as a dark slab (f1025–f1061).** The reveal is the payoff of the roll, so this was a real
     fault. Slot 3 is now an underside wash: a floor flood under the flight path at [−15.5, −7.5, 0.6], aimed at the
     car, with no shaft. It is 650 (= native-01 flank exposure) until ev 10.2, rises to 1400 by 10.45, and fades
     11.15–11.5 once the landing flood is up. The panel grid reads while staying dark like the source; a 1900 peak
     looked flat grey and was rejected.
  2. **Visible first-quarter lag at f960/f975 and the tail position at f941.** Partial climb-end refit plus a roll
     start that follows the tail. Details and limits are in POSE_MATCH.md. Whole-body clearance is 33.7 mm (was 15.4).
  3. D3 camera aims re-solved for the refitted path, with the same framing plan (lip in frame through the catch).
- **Deliberately not changed:** cue instants, text, score, the car shape, the ramp profile, and the airborne vertical
  schedule. The remaining 10.1–10.3 silhouette difference is due to canopy/roof material, not pose.

## Round 3 (after native-orders-02 / F1)
**Kept from round 2 (native-confirmed):** the underside wash concept (f1045 matched panel luma 1.3 → 48.8/255, grid
readable and dark); the climb-end refit; 0 deck intersections (32.2 mm by the triangle method); all 195 bounds; D2's
shrinking gold push (not zero at the cut, which is correct: adhesion *weakens*, A10); text/state/audio.

**My native verdict on the first-quarter pairs (F1 f960/f975):** not acceptable, and the cause was not lag. The CG
kept a broad canopy at every pair from 9.90 to 10.20, while the original narrows to a thin sliver with wheels at 10.0
and then shows its dark underside behind a white flank rim. Geometry from the audited eye explains it: with the old
roll sense the roof turns *toward* both source cameras and stays visible to ~120°, so no retiming can match.
**Fix: `ROLL_SIGN = −1`, keys unchanged.** SwiftShader −1 renders next to the source at 9.917–10.5 match the
surface order at the same instants. Evidence and limits are in POSE_MATCH.md (round 3) and `opus-v9-pose/round3/`.

**Handover (5.48/255 at f1079→1080):** fixed at the cause. The slot-2 dip-swap is widened to ev 10.8–11.6, and the
wash holds through the swap (it eases 11.6–12.0). The wash also rises earlier (10.05–10.35), because the underside
now turns toward camera from ~10.05. My SwiftShader box metric: the f1079–1083 burst (round 2: 1.46–2.09) is gone
(0.2–0.56). From f1083 a steady ~2/255-per-frame rise remains, which is the floor/cloud entering as the camera tilts
and the landing flood rising. That is a fade, not a spike; round 2 has the same tail.

**What the D3 cue instants show now (cues.js byte-identical, so the score is unchanged):** tipOff 31.55 the floor clears
the edge · A4 32.35 roof narrowing to the sliver · D5 33.25 (`flank`) white flank rim, underside opening · E5 34.25
(`under`) underside wide · F#5 35.35 catch.

## Frozen source (sha256)
| File | sha256 |
|---|---|
| web/engine/cues.js | 1650cdfd8075aec93df518be885e19f2482a45de44ea6e2f3fe3718a0bf3acc1 (unchanged since round 2) |
| web/engine/timeline.js | 41b8fc64bb4b8128bd8318d566850998dac94fa15b2ad14cc55092125c0a177e |
| web/engine/diagram.js | de0903aa76f066db191b7dc09567d592533256ace35bd8f0c28f0a825c331974 |
| web/assets/poses.json | 95107c073497b9102d28714607159874ffe8aa81eb720cee8c8cd21b5dde8365 |
| geometry/v3_ramp.py | 99cb750083cfaba0d051566c56de643d390fa4554958146fcbefc89eea04aea6 |
| tools/score.mjs | 0c06bdb7c25047a5a7c57be0acbf480f9136be71ad45aa108778b1ed87bcd956 (unchanged) |
car/scene/lot bins are byte-identical. Everything else is unchanged. 68.05 s design / 2042 frames.

## Audio lock
The score is unchanged and every cue instant is unchanged, so **the M4 master must reproduce Codex's
5f15c9…c61a byte for byte.** If it does not, report it: that would mean a cue value moved. On this server the same
build gives −20.0 LUFS / −7.2 dBTP / 0.22 s silent tail, but a different sha (7b428e…), which I attribute to
cross-machine floating point. **The M4 build is the delivery master.** Stems: out/audio/stems/{pad,motif,accents,air}.wav
from `mix.mjs`; they sum to the master within 2 LSB. Inventory: out/TEXT_INVENTORY.zh-CN.json (16/16, 0 collisions).

## Orders for Codex — final capture
**F1′. Round-3 delta confirmation (native, final settings).** Frames: f941, f960, f975, f991, f1004, f1015, f1028,
f1045, f1061, plus the continuous run f1060–f1100. Also E2 f1122/f1160 (the replay starts with the corrected sense,
≈158°). Criteria:
- Pairs vs original 9.75 / 9.917 / 10.0 / 10.1 / 10.2 / 10.3 / 10.4 / 10.6 (same format as before, one line each).
  Expect: narrowing roof at f960; **thin sliver with wheels at f975**; dark underside behind a white flank rim from
  ~f1004; underside wide by f1028–f1045. Say plainly if a pair still disagrees in surface order.
- Clearance on f940–990 × 8 subframes: 0 intersections, expect ≈ 32 mm (unchanged).
- Underside f1004–f1061: the grid is readable and dark. Report the f1045 matched-panel luma; expected near round 2's
  48.8/255, possibly higher because the underside faces the wash more squarely. Flag it if above about 70/255.
- Handover f1060–f1100: report the full adjacent-step series of your projected-car-box metric. Pass = **no isolated
  spike**, i.e. no step above 2× the median of its ±5-frame neighbours. A steady monotone ramp from the camera tilt
  and the landing flood is acceptable. Send me the series either way.
- The lip is visible through f1061 (the partial far-corner clip at f1060–f1061 is accepted, as you found), and all
  195 car bounds are in frame.
- The audio master is still 5f15c9…c61a (cues.js unchanged). Report any other result.
If all pass, continue to F2 without waiting. If a pair still disagrees in surface order, or there is a spike, stop and
send me the frames.

**F2. Full native capture f0–f2041** at the proven settings (1080×1920, 30 fps, 8 subframes, 48 volume steps).
A1–C1 must be re-rendered too (pchip shift ≤ 3.8 cm), not reused; no frame from native-orders-01/02 is reused. Encode H.264 + AAC from the M4 master, then fully
decode. Run the state sweep, text inventory and audio meters. Make every-6-frame contacts for D2–E2 and every-30
contacts for the whole film.

**F3. Deliverables** go in out/delivery-v9/: the MP4, master.wav, the 4 stems, TEXT_INVENTORY, contacts, and
verification.json (hashes, frames, loudness, decode). Record in QA.md what remains unproven: human listening,
continuous-motion and phone review, and every source-pose limit in POSE_MATCH.md. No claim of audience effect.

After F2, send me the D2–E2 every-6 contact and the stills f927/f1061/f1121. I will add the final native-proof verdict
to this file.

## Final native-proof verdict (Opus 5.5, 2026-10-19) — LOCKED FOR REVIEW DELIVERY
Basis: Codex's F1′ return and the final encoded proof, `out/delivery-v9/qa/` (D2–E2 every-6 contacts 01–07, final-proof
f927/f1045/f1061/f1121, whole-film every-30 contacts 01–08), extracted from `roadster-v9-final-bt709.mp4`
(sha256 0c960c90…1ebcd, 2042 frames, −20.0 LUFS / −7.2 dBTP, master 5f15c9…c61a). I have viewed the stills. I have
not watched the MP4 in motion and have not heard it.

**Verdict: round 3 is kept unchanged. No delta render.**
- **Departure pose.** Native pairs pass on surface ORDER: f941 roof with the tail at the free end; f960 roof
  narrowing; f975 thin sliver with wheels (the broad-canopy fault is gone); f991–f1015 dark underside behind the white
  flank rim; f1028–f1045 wide grid; level by f1061. The cause of the remaining gap was the roll sense, and that is
  fixed. What remains is listed in POSE_MATCH.md. None of it is presented as a calibrated or physical match.
- **Underside exposure (the borderline flag: jet-free panel 69.86/255).** Kept, by aesthetic judgement from
  final-proof-f01045. I set the ~70/255 figure myself as a rough proxy for "not a grey slab". The frame itself
  answers the question the number stood in for. The panels read as dark charcoal with darker grid lines, clearly below
  the white body rim, the lit deck and the plumes, and close to the source's "dark patterned underside" relationship.
  The median 80.5 and peak 97 are the ribs catching the wash, which is what makes the grid legible at phone size.
  Lowering the wash would trade that legibility for a number. The plume-contaminated +Y patch (131/255) is not a
  panel reading.
- **Handover.** All 40 steps pass the isolated-spike test (max ratio 1.53). The f1083+ rise is the planned floor/cloud
  reveal.
- **The WOW holds in the encoded stills.** It is one continuous shot from the lip to the cloud, the lip is kept as
  the reference through the catch, and f1121 ends it on the car inside its own exhaust. Then the air-vision replay,
  the gas plate, the separator and the unchanged second half follow, and the answer bookend fades to black.

**Not established by anyone:** human listening; continuous-motion review; review on a physical phone; audience
response; real vehicle dynamics or dimensions. The pose is an image-informed fit, the slow motion is labelled, and
the cables in the kickflip remain of unknown role.

**Orders for Codex (final):**
1. Keep `roadster-v9-final-bt709.mp4` (0c960c90…) as the v9 review deliverable. Keep the original pre-repair encode
   and the metadata-repair evidence. No re-encode, remix or re-render.
2. Add this verdict to `out/delivery-v9/QA.md`, with the exposure disposition worded exactly as above, and record
   that the 69.86/255 figure was kept by director judgement rather than passed by a margin.
3. Put the four stems, master.wav, TEXT_INVENTORY and verification.json beside the MP4 in out/delivery-v9/ on the
   M4 workspace and list their sha256 values. Upload the audio assets to this host only if the user asks.
4. Leave v8 and every earlier version untouched.
