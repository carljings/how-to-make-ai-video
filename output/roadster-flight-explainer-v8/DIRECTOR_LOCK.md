# DIRECTOR_LOCK — v8 「空气现形」 (Opus 5.5, final director)

Status: **FINAL LOCKED** (native proof reviewed; s15 slit-state fix pending rerender, see end). Judged from the real Metal stills in `out/native-proof-01/contact-1…5.jpg` and
`out/opus-refinement-proof/contact-1…2.jpg`. Nobody has listened to it or watched it in full motion yet; there is no phone approval.

## Verdict
- **0–55.0 s (A1–G1): locked as rendered.** The intro asks one question across 2 shots, the air reveal is at 4.3 s, the three diagram holds
  (B1, E1, F1 freeze) stay, the summary stays, and the 55.0 s dissolve into the callback stays. No changes.
- **55.0–57.1 s: locked.** The question is not repeated. The gold load shows from 55.8 s, the answer comes at 57.1 s, and gravity at 58.0 s, as before.
- **59.0–62.7 s (old cut): changed.** In the stills, 59.0 and 61.4 are the same frozen frame, so the film just stops before it fades. The
  callback repeats the opening without changing anything, and that is why it ends abruptly. A bookend needs to change. The change this film
  has earned is its own title: the opening mystery frame, *now with the air visible*.

## Final ending (G2, s15), 30 fps
| Film s | Frames | Picture | Sound |
|---|---|---|---|
| 55.0–57.1 | 1650–1712 | Opening composition. The camera keeps A1's slow orbit (no freeze). Gold load arrow draws from 55.8 | Answer motif from 54.7, resolves to D at 57.1 |
| 57.1–59.2 | 1713–1775 | 「压差，把车按向坡面」, white gravity line + 「重力，始终向下」 from 58.0 | Home chord |
| **59.2–60.8** | **1776–1823** | **Reveal:** a gentle Ping from the car's centre of mass. The same frame becomes air vision; the grade blends over 0.6 s; gold glints settle on every face beneath the single net arrow; the tag becomes 原理示意 · 非实拍 | A5 Ping tone returns (vel 0.38, the 4.3 s tone, softer); air shimmer rises 59.2→60.4 |
| 60.8–62.2 | 1824–1865 | Air vision holds with both lines on screen. The camera decelerates | Home + shimmer release over 2.4 s from 60.8 |
| 62.2–63.4 | 1866–1901 | Graded image/text fade (unchanged method) | Safety tail fade 62.2→63.3 |
| 63.4–63.5 | 1902–1904 | Black | Silent from 63.3 |

- The camera comes to rest at 63.4 on **exactly A1's last frame** (s01 local 2.4 s). The film ends where it began, with the invisible part now visible.
- New total: **63.5 s, FRAMES = 1905** (was 62.7 / 1881). No new strings. The C18 card stays up until END. The arrow note window runs to fadeEnd.

## Source changes (all in this v8 only)
- `web/engine/cues.js`: `E.reveal = 59.2`, `fadeStart 61.4→62.2`, `fadeEnd 62.6→63.4`, `END 62.7→63.5`; G2 shot description.
- `web/engine/timeline.js` `s15`: local clock `mix(0.8, E.cut12, ramp(t, echo, fadeEnd))` (was 0.8→1.3, frozen after 59). Adds the reveal
  block: A3's Ping parameters, softer (ring 0.8, shell 0.6, bloom +0.05), `postMix` blend instead of a hard grade switch, glints 0.26.
- `tools/score.mjs`: AIR curve returns at the reveal; `HOME_RELEASE = reveal+1.6`, `HOME_REL = 2.4`; `TAIL_FADE = [fadeStart, END−0.2]`;
  adds the Ping tone at the reveal; `ending.reveal_s` in the report.

## Science check (unchanged claims)
Air vision is tagged 原理示意 · 非实拍. The glints show pressure acting on every surface. The single gold arrow is the net load toward the
ceiling, and gravity stays white and world-down. The car stays on the deck (ev ≤ 8.644, inside the ramp pose range 0–13.6). No internal
hardware is drawn. The fans/plumbing remain plate-only.

## Codex: rerender and verify
1. **Rerender frames 1650–1904 only** (G2). Frames 0–1649 are unchanged as long as `cues.js` only changed the E values above and G1 does not
   read `fadeStart/fadeEnd/END`. Confirm this by hashing a few G1 frames (e.g. 1500, 1640, 1649) against the existing render.
2. Stills to check: 1776, 1790, 1800, 1824, 1850, 1866, 1890, 1902. Check that the text over air vision reads as well as C03 does at 6.0 s;
   that neither arrow gets lost in the glints; that the car stays fully in frame during the orbit; and that the ring/shell does not read as a white flash.
3. Frame 1901 vs the A1 frame at 2.37–2.40 s: the composition should match (bookend).
4. Rerun `score.mjs` → `mix.mjs` → `text_inventory.mjs`. Targets: −20 LUFS, ≤ −6 dBTP, all 16 cards and 3 plates pass, no voice.
   Check that the reverb reaches zero by 63.3 and that the last 0.2 s is silent.
5. Fix any tool or encoder that hardcodes 1881 / 62.7.

If any check in step 2 fails, the fallback order is: lower glints to 0.18 → ring to 0.5 → move `reveal` to 59.4. Do not remove the reveal or the moving camera.

## Native-proof verdict (out/director-final-proof/contact-1…2.jpg, 55.00–63.47)
Codex reports these already pass: prefix f1500/1640/1649 byte-identical; 1905-frame state sweep; −20 LUFS / −6.2 dBTP; Ping at 59.2; 0.2 s of silence.
- **Reveal: it works.** 59.20→59.40→59.67 is a grade blend into the x-ray car. The ring/shell does not read as a white flash anywhere. The tag
  switches to 原理示意 · 非实拍 by 59.67.
- **Text:** 「压差，把车按向坡面」 / 「重力，始终向下」 read over navy at least as well as C03. **Arrows:** gold and white both stay clear of
  the glints. The gold head sits closest to the tag at 62.20 (about 24 px at native size). It does not overlap, so no fix is needed.
- **Framing:** nose and tail stay inside the frame on every still. Only the ceiling lattice is cropped. **Fade/black:** 63.00 is dim with no
  bright residue; 63.37/63.40/63.47 are black.
- **No fallback (glints/ring/reveal time) is applied.** None of the step-2 failures occurred.

## Science-state fix (the only source change after the proof)
The fault is confirmed. s15 inherited `base().gap.evac = 0`. That made `gapDensityAt()` = 1, so the floor-facing glints fired as if they faced
outside pressure, and `AIR_VS gapEmpty()` filled the slit with full-density air, while the caption and gold arrow claim Δp.
`web/engine/timeline.js` `s15` now:
1. sets `st.gap.evac = 1` for the whole shot (residual 0.12 inherited, as in B2). Before 59.2 nothing reads `uGap` (glints 0, no air motes, no
   gap motes), so frames 1650–1775 should not change.
2. inside the reveal, adds `st.gapMotes = { count: 16000, gain: 1.2, evac: [-50, 1.0, 0.12, 0.55] }`. This is B2's residual-only slit air
   (no departures, fans parked at NO_FAN), quieter than B2's 2.2 and gated by the Ping. The slit reads as lower but not empty. It adds no
   hardware and no new animation or layout.
This is a qualitative schematic state. It claims no measured pressure, density ratio or force.

## Codex: rerender after the fix
- **Rerender frames 1776–1904** (frame 1776 has subframes after 59.2).
- Hash 1700 and 1775 against the current render. They should be identical. If they are not, rerender 1650–1775 as well.
- Recheck stills 1790, 1824, 1866: the slit should be dimmer than the outside with sparse residual motes, not a glowing slab. If it reads as a
  slab, lower `gapMotes.gain` to 0.6 (that is the only allowed tweak).
- Rerun the state sweep on 1650–1904. `uGap.x = 1` is expected throughout G2. No score/mix rerun is needed (picture-only change).

**FINAL LOCKED** — native proof approved for the look. Only the science-state rerender above is outstanding. Nobody has listened to it or watched it in full motion.


## Codex delivery verification after the director lock

Final native gap states1790/1824/1866 were actually rendered and viewed after the correction; no glowing slab or fallback change. The final1905-frame MP4 is encoded and decoded successfully; Codex viewed all67encodedreviewframes in8contacts. AAC−20.0LUFS/−6.2dBTP. SeeQA.md andout/delivery-v8/verification.json for exact hashes, segmentedcapture records and remaining human-review limits. This records technical delivery; it does not add a human listening/phone/audience approval claim.
