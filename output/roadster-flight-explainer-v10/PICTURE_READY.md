# PICTURE_READY — v9 「空气现形 · 翻身」 (Opus 5.5, lead creator and implementer)

> **Superseded for capture by DIRECTOR_LOCK.md (round 2, after native-orders-01).** Kept as the record of the first handoff.

Status: **picture and cues FROZEN for native QA.** Codex is the production assistant. Do not edit web/, geometry/ or
tools/. Report anything material to me and I fix it. Story: TREATMENT.md. Pose evidence: POSE_MATCH.md.

Nobody has watched this in motion or listened to it. My judgement so far rests on SwiftShader diagnostic stills only
(`.omx/artifacts/roadster-v9-20261019/opus-v9-pose/diag-*.jpg`). That is direction, not pixel proof.

## Frozen source (sha256)
| File | sha256 |
|---|---|
| web/engine/cues.js | 6b0516737310936a62cc609d4dc0ef29aa3dd38202438dd2ad5323f726196aa4 |
| web/engine/timeline.js | b99054d14e9782878d0ecf3092e5a3a9285a26ca0a9a7018378bc65d6622f04d |
| web/engine/diagram.js | de0903aa76f066db191b7dc09567d592533256ace35bd8f0c28f0a825c331974 |
| web/assets/poses.json | f45577af118311cbca4ce21ec52b794be79309f842f88756b7488725d0e3d0ad |
| geometry/v3_ramp.py | 3c80c696d5e5626e02150a947dc2bad0e13832b11bc4c32b69fd71c7bbbafbdc |
| tools/score.mjs | 0c06bdb7c25047a5a7c57be0acbf480f9136be71ad45aa108778b1ed87bcd956 |
Unchanged from v8: film.js, gl.js, math.js, text.js, assets.js, shaders/*, car/scene/lot assets, fonts. No font rebuild
is needed: the only new string, 「CG重建 · 慢放」, is covered in all four weights.

## Film: 68.05 s, 30 fps, **2042 frames** (v8: 63.5 s / 1905)
| Shot | Film s | Frames | Note |
|---|---|---|---|
| A1–C1 | 0–26.35 | f0–f790 | unchanged |
| D1 | 26.35–28.45 | f791–f853 | unchanged (ev ≤ 9.05; pose edits start at 9.86) |
| D2 | 28.45–30.90 | f854–f926 | seal breaks, air vision; ev 9.05 → 9.62 (was → 9.98 over 2.9 s) |
| **D3 翻身** | **30.90–37.40** | **f927–f1121** | **the WOW: one unbroken night shot from the source main eye, speed-ramped** |
| E2 | 37.40–40.40 | f1122–f1211 | air-vision replay of the catch, ev 10.55 → 11.12 |
| E1 | 40.40–43.90 | f1212–f1316 | plate 2, now after the departure |
| S, F1, G1, G2 | 43.90–68.05 | f1317–f2041 | unchanged content, +4.55 s (136.5 frames, not integer: re-render) |

D3 events: drop f927 · C10 glyphs fall f945 · rear wheels off (tipOff) f947 · face-on flank f998 · underside f1028 ·
level f1055 · **catch (jets full) f1061** · plunge, lip leaves the top ≈ f1090 · cut f1122.
Other: open f864, weak f878, spray f1136, push f1160, valve f1248, black f1317, answer f1850, reveal f1913, fadeEnd f2039.

## Orders for Codex (in priority order, native Apple M4 / ANGLE Metal, proven final settings: 1080×1920, 8 subframes, 48 volume steps)
**A. Continuous preview f854–f1211 (D2 → D3 → E2, 11.9 s), H.264 with audio.** Build the score locally:
`node tools/score.mjs` → `node tools/mix.mjs`. Mux the master slice 28.45–40.40 s. Return the MP4, a contact sheet
every 6 frames, and full-size stills f927, f947, f975, f998, f1015, f1028, f1045, f1061, f1075, f1090, f1105, f1121, f1122.
Check and report:
1. The surface order reads without lamps: roof (f927–f960) → white flank and wheels (f991–f1015) → underside (f1025–f1045)
   → level, lamps toward camera (f1055+). Say if the underside reads only as a dark slab.
2. The deck lip stays in frame through f1061 and the car never leaves frame f927–f1121. Report the bounding box per still.
3. Plumes: thin bluish columns, not white floodlight cones. Report whether they bury the underside at f1035–f1061.
4. The deck surface is not clipped white (report the peak luma on the deck at f947 / f1028).
5. C10 is readable at f930–f944 over the dark area, and its glyphs fall away cleanly by about f965.
6. No body-through-deck at f940–f990 (tail at the edge). No popping at the light handover (slot-2 swap at ev 10.85–11.35 ≈ f1066–f1084).
7. The tag reads 「CG重建 · 慢放」 throughout D3.

**B. Pose comparison sheet.** Put native stills f941, f960, f975, f991, f1004, f1015, f1025, f1035, f1045, f1057 next to
native source main frames at 9.75, 9.90, 10.00, 10.10, 10.20, 10.30, 10.40, 10.50, 10.60, 10.75, plus close replay
17.70 / 18.20 / 18.70 / 19.37. Criteria are in POSE_MATCH.md (surface ORDER and lip relation; geometric comparability
only up to ~9.75). Report a mismatch per pair in one line. Do not judge identical 2D angles.

**C. Climb-end lag (fact check, no code).** With the static main rig (eye [-24.13, -8.08, 0.3], valid before about 9.5),
measure the source car's nose and tail pixel positions along the deck at 8.75, 9.00, 9.25 and 9.50 s. Convert them to
deck arc length and compare with the model (`python3 geometry/v3_ramp.py`; s_rear, plus AXLE_R/X_TAIL offsets). Report
the time lag. Also check for parallax between the background lights and the ramp after 9.25, i.e. whether the main
camera's eye moves while it follows. I decide from these numbers whether to refit the climb end.

**D. Shifted-section spot stills:** f1212, f1250, f1310 (plate 2 after the replay: header and labels fade correctly,
the reservoir thins), f1330 (S), f1400 (F1), f1600 (G1), f1787 (G2 start = A1 composition), f1913 (reveal), f2030,
f2041 (black).

**E. Technical:** the 2042-frame state sweep (NaN / missing objects / tag per shot), text_inventory, and score/mix
determinism. Targets: −20 LUFS, ≤ −6 dBTP, last 0.2 s silent, no voice. My server run gave −20.0 LUFS / −7.2 dBTP and
16/16 cards passing; confirm on M4. Fix any of *your* encoder or verification scripts that assume 1905 frames or 63.5 s.

After A–C, I make the final picture decisions myself, then the audio lock, the four stems and DIRECTOR_LOCK.md.
Do not deliver a full master before that.

## Sound plan (built, unheard)
D3: the pad drains to near silence at the lip (measured −36 dB short-term at 31.6 s). The roll plays the question
motif's rising line, one note per surface: A4 at 32.35 (roof turning), D5 at 33.25 (flank), E5 at 34.25 (underside),
F#5 at 35.35 on the catch over a warm G (Gmaj7 colour) with the softest low accent. The bloom peaks at about −19 dB
short-term, then holds through the plunge. Home (D) stays reserved for the final answer. Additive synthesis only, no
noise, no voice. Short-term levels are in the archived diag-master.json; listening approval is still open.
