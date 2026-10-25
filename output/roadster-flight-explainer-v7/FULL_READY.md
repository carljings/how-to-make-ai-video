# FULL_READY — v7 「空气现形」 (text-led, voice-free, science-corrected)

Date: 2026-10-18 · Director: Opus 5.5 · Next: Codex

Opus has finished and is **paused** here. The picture, the renderer, the audio and the tool code are frozen. Opus
changes nothing more unless Codex's QA finds a critical issue.

The remaining sequence belongs to Codex:

1. Finish the full native capture, f0–1769 (running).
2. Rebuild the quiet audio and the text inventory locally and check them against the criteria in §3 and §4.
3. Mux, encode, then fully decode the encoded file.
4. Run science pixel QA, using the matrix in §5.
5. Measure the actual AAC loudness and true peak.

**Approvals.** None are claimed.

- Nobody has listened to the soundtrack, by ear or on a phone, and no user has approved the look or the sound.
- The audio checks are measurements.
- The picture judgements are Codex's native Metal frames. This server only checks compile and framing (SwiftShader).
- The car, ramp and motion are a visual fit to the source videos. They are not solved dynamics, factory CAD or
  structural validation.

## 1. Picture: frozen and natively spot-checked

- **Freeze.** `web/` and `tools/render.mjs` match `PICTURE_LOCK.json` (29 files). Opus re-verified this, and Codex
  confirmed that every file matches.
- **Film.** 1770 frames at 30 fps = 59.0 s, 1080×1920. `web/engine/cues.js` (sha256 `aa2abb27…0b59`) is the only
  schedule and the only source of strings.
- **Native proof01** (Codex: 53 frames, 6 contacts in `references/native-proof01`).
  - The core corrections read clearly. The fonts load and no essential main text is cropped. No fixed twin rotors or
    in-car vessels are visible. Plates P1, P2 and P3 are viable.
  - Two essential clarity issues came back, and a wording correction followed. All are fixed and documented in
    `PICTURE_READY.md`:
    - **E2 exhaust.** It now reads short and downward. The jet trails had dropped the car's inherited velocity; E2 now
      draws the plume relative to the car.
    - **P3 cable leader.** It no longer crosses the torque plate.
    - **P1 label.** It is now 「低压区·有空气」.
- **Native spot02** (Codex: 12 frames rendered and viewed): **passed.**
  - 「低压区·有空气」 reads clearly.
  - The E2 exhaust is short and visibly downward, with thrust up and gravity down.
  - P3 has no leader through the plate, and the static cable footnote is retained.
- **Full capture.** All 1770 frames are rendering natively on Codex's machine: 59 s, 1080×1920, 30 fps, `--sub 8
  --steps 48`.

## 2. Changes since native proof01

Five `web/` files differ from `references/native-proof01/source-lock.json`. Details are in `PICTURE_READY.md`.

| File | Change | Pixels |
|---|---|---|
| `web/engine/timeline.js` | E2 (`s11`) only: comoving exhaust (`uCarVel = 0`), forward nose jet off in this schematic view, shorter and brighter plumes. One comment. | E2 only |
| `web/engine/text.js` | `cableNote()`: the leader fades out under the F1 veil and returns as it lifts | F1 freeze only |
| `web/engine/cues.js` | One string: the P1 label 「低压，非真空」 → 「低压区·有空气」 | P1 label only |
| `web/engine/shaders/particles.js` | Comment documenting the jet velocity accounting (GLSL unchanged) | none |
| `web/engine/diagram.js` | Two comments: the "not a vacuum" wording removed | none |

## 3. Audio: quiet score, built from zero

`tools/score.mjs` and `tools/mix.mjs` replace the v6 versions, which were noisy and mastered at −14 LUFS. The v6
versions are archived, hash-identical, in `references/v6-legacy-audio/`.

**What it is:**

- A sparse, warm pad in D major.
- A five-note glass-mallet motif in four statements, ending on the title.
- Six soft low accents on the causal turns.
- A faint tonal shimmer while the air is visible.
- Long quiet spaces.

**What it isn't:** there is no noise source of any kind, no voice or TTS, no v6 material, no ducking, and no limiter or
compressor. Full detail is in `AUDIO_READY.md` and `out/audio/score/score.cues.json`.

**Local build:**

```bash
node tools/score.mjs && node tools/mix.mjs     # exits non-zero unless −20 ± 1 LUFS and true peak ≤ −6.0 dBTP
```

| Pass criterion (checked by `mix.mjs` with ffmpeg ebur128) | On this server (Node v24.21.0) |
|---|---|
| Exactly 1770 × 1600 = 2,832,000 samples, 48 kHz, 24-bit stereo | yes |
| Integrated loudness −20 ± 1 LUFS | −20.0 LUFS |
| True peak ≤ −6.0 dBTP | −7.3 dBTP (no limiter; one static gain, +1.78 dB) |
| Loudness range | 6.3 LU |
| Stems sum to the master | within 2 LSB |
| Proof cut, f0–413 | −19.3 LUFS, −7.7 dBTP |

- **Hashes here:** `master.wav` `e4f807b6…bc86`, `master.proof.wav` `e4c3e4e0…4e98`.
- **Determinism:** reruns here are bit-identical. Another Node/V8 build may differ in the last bits, which still meets
  the criteria.
- **AAC:** the master leaves 1.3 dB under the −6 dBTP ceiling. Please measure the encoded file.

## 4. Text inventory

`node tools/text_inventory.mjs` writes `TEXT_INVENTORY.zh-CN.json` (here: `04894c2c…5e03`) and exits 0.

- **Coverage.** 57 strings and 158 unique characters, all present in each of the four bundled faces.
- **Reading.** All 16 explanatory cards pass R(n) = max(1.2 s, 0.4 s + 0.2 s × n). Seven pass with less than one frame
  to spare, by design.
- **Plates.** P1 (3.25 / 3.20 s), P2 and P3 hold long enough for their labels.
- **Layout.** Everything is inside the safe area, and no plate labels overlap each other or the header.
- **Collisions.** None.

## 5. Claim correction matrix (`science-claims.json` A01–A22, plus two later corrections)

Column key:

- **Checked so far:** `inv` = the text inventory (strings, windows, glyphs, layout); `code` = Opus's reading of the
  frozen code; `p01` / `s02` = Codex native proof01 / spot02.
- **Codex QA:** the pixel check still open on the full capture.

| ID | Required change (audit) | v7 on screen and in picture | Where | Checked so far | Codex QA |
|---|---|---|---|---|---|
| A01 | Keep the manufacturer architecture with attribution; no layout transplanted between configurations | The mechanism is named generally: 「风扇 + 密封 / 维持车底低压」, 「车载高压气体」. The source lines 「CG重建 · 据特斯拉 2026.10.16 发布的视频」 (0–3.3 s, title) and 「…据马斯克…」 (separator, title) are on screen. No internal layout is drawn anywhere. | `cues.js` STR, TAGS, C04, C11, TITLE | inv, p01 | sources legible on the full frames |
| A02 | Remove the twin floor rotors; use a separate generic airflow diagram | No rotor is ever drawn: the shader discards their faces (`kind == 6`), and the x-ray fan overlay is gone. A generic 风扇 symbol appears only on plate 1, headed 「功能示意 · 非实车布局」. | `surface.js`, `film.js`, `diagram.js` P1 | code, p01 (no rotors), s02 (P1) | no rotor in any frame |
| A03 | Include sealing, not fan-only | 「风扇 + 密封」. Plate 1 shows 密封 at both ends, a trickle leaking in, and continuous flow through inlet → duct → fan → out. | C04, P1 | inv, p01 | — |
| A04 | Suction is pressure-difference adhesion; no "not suction but pressure" | 「吸附从何而来？」 is asked with no crack. Then 「外面 气压高 / 车底 气压低」 → 「压力差 / 把车压向坡面」, and 「吸附减弱」 uses the same word for the same mechanism. | C02, C05, C06, C10 | inv, p01 | — |
| A05 | Symbolic, qualitative force; no magnitudes | All force arrows are direction-only. The tag note 「箭头只示方向，长度不按比例」 accompanies them in B2, C1, D2 and E2. Plate 3's header says 长度不按比例, and the credits say 箭头不按比例. **One lag:** at the start of D2 the note trails the gold push (see §7). | TAGS.arrows, TITLE | inv; code (all 1770 states) | decide on the D2 lag (§7) |
| A06 | Ceiling: N = Fp − mg; no measured margin | B2 shows three distinct forces: the gold pressure load stays on the body, lilac tyre reactions point away from the ceiling, and white gravity points down. No numbers or margin anywhere. | `s05`, C07 | p01 | lilac ≠ gold distinction |
| A07 | Fans add normal load; tyre drive is tangential | 「轮胎被压紧，/ 才抓得住」. The gold load is always drawn into the surface (C1 needles), never as propulsion. | C07, C08, `s07` | inv, p01 | — |
| A08 | Source-fitted poses as CG reconstruction, not solved motion | The tag reads 「CG重建」 throughout the night shots. The credit says 「车与坡道按视频外形拟合，未做力学验证」. Camera and trajectory are a visual fit. | TAGS, TITLE | inv | — |
| A09 | Gravity is world-down; the pressure load follows the surface | 「这股力，始终压向坡面 / 重力，始终向下」. White gravity arrows point world-down in B2, C1, D2 and E2; gold needles stand normal to the ramp in C1. | C08, `s05`/`s07`/`s09`/`s11` | inv, p01 | vectors on wall/ceiling/air |
| A10 | Seal lost → adhesion weakens; no universal instant zero | 「密封被破坏，/ 吸附减弱」. The gold push shrinks with the sealed share of the floor (no shatter) and is gone only when the floor fully clears; gravity remains. | C10, `timeline.js` `s09` (`sealed`) | code, p01 | progressive shrink on frames |
| A11 | High-pressure gas; no flames, gas species or temperature | 「车载高压气体」 (no 冷气). Plate 2 has no flame. The jets are mist (night) or cyan (air). | C11, P2 | inv, p01 | — |
| A12 | No claimed internal capsules; a separate reservoir → control → nozzle schematic | Plate 2, headed 「功能示意 · 非实车布局」: 储气 → 控制阀 → 喷口. No vessel or plumbing is drawn in the car. | P2, `film.js` | code, p01 (no in-car vessels) | none in any frame |
| A13 | No COPV/BOM inference | No vessel material, liner, count or dimension is shown or named. Plate 2's vessel is a generic outline. | P2 | p01 | — |
| A14 | Jets don't need to hit the floor or make suction | E2 shows short plumes straight down from the under-body, drawn relative to the car, never reaching the floor. 「喷气向下」 is paired with an up thrust arrow. Plate 2's thrust arrow opposes the exhaust. | C12, `s11`, P2 | code, s02 (visibly down) | E2 frames f1119–1208 |
| A15 | Upward thrust ≠ rising | The car keeps descending while the cyan thrust arrow points up and gravity points down. No wording says "rises". | `s11`, C12 | s02 | — |
| A16 | The thrust line missing the COM gives torque; net torque governs | 「推力线不过重心，/ 就产生转矩」. Plate 3: line through 重心 → 无转矩; line misses → 力臂 → 有转矩. Then 「实际翻转看合转矩」. | C13, C14, P3 | inv, p01, s02 | — |
| A17 | A general torque mechanism; no controller reverse-engineering | Plate 3 is headed 「原理示意 · 长度不按比例」 and uses two abstract bodies. Nothing is drawn on the real kickflip car (no COM mark, beam or arc). | P3, `s13` | code, p01 | — |
| A18 | Keep the separate-demonstration card and the visible-lines note | 「另一场演示」 with the Musk source line. 「画面中可见细线，作用未公开」 stays from 42.5 to 49.75 s. The cables stay in the reconstruction, and the leader no longer crosses the plate. | CH, TAGS.cableNote, `text.js` | inv, s02 | — |
| A19 | The reserve is finite and needs replenishing; no flight seconds | 「储气有限，需补气」. The plate-2 vessel thins slightly as gas leaves. No endurance figure. | C16, P2 | inv | — |
| A20 | No passive/perpetual adhesion; no fan power figures | 「维持车底低压」. Plate 1 keeps the fan running against a leak-in. No power number anywhere. | C04, P1 | inv, p01 | — |
| A21 | Claim only CG reconstruction | The tags 「CG重建」, 「CG重建 · 叠加示意」 and 「原理示意 · 非实拍」, plus both credits. No internal hardware is drawn on the car, and no nozzle count is implied. | TAGS, TITLE, `s11` comment | inv, code | tag matches the world on every shot |
| A22 | Don't call the flying demo a universal stock feature | No such claim. The kickflip is introduced as 「另一场演示」 with its own source. | CH | inv | — |
| X1 | Later correction: no false contrast between low pressure and vacuum (vacuum includes partial vacuum; CERN vacuum introduction, cds.cern.ch/record/582156) | Plate 1 now reads 「低压区·有空气」, not 「低压，非真空」. The treatment, storyboard, cue sheet and comments are corrected to match. | P1 (`cues.js`) | inv, s02 | — |
| X2 | Later correction: jet velocity accounting | E2 draws exhaust relative to the car, which is exact without drag for a steady velocity, because gas inherits the car's velocity. **Known limit:** the night shots E3 and F1 keep their earlier trails, shifted by −V·age without the inherited velocity. The code now documents them as a look-fit to the footage, not a velocity model. Codex judged them viable. | `s11`, `particles.js` | code, s02 | decide whether E3/F1 trails need a note |

## 6. Document status

| File | Status |
|---|---|
| `FULL_READY.md` | **Current.** This handoff and pause. |
| `PICTURE_READY.md` | **Current.** The freeze record: three corrections after proof01, the checks, and the spot command. Spot02 has since passed. |
| `PICTURE_LOCK.json` | **Current.** 28 `web/` files + `tools/render.mjs`; Codex confirmed the match. |
| `AUDIO_READY.md` | **Current.** Score, master, stems, measurements and inventory detail. |
| `TEXT_INVENTORY.zh-CN.json` | **Current.** Generated from the frozen `cues.js`. |
| `TREATMENT.en.md` | **Current.** The chosen v7 direction. §3 is corrected to the implemented cut, and §7's vacuum wording is corrected. |
| `storyboard.zh-CN.md` | **Current.** The same in Chinese. The table is corrected to the cut, and 「吸附」 in A2 is listed as gold, as rendered. |
| `SCIENCE_AUDIT.en.md`, `science-claims.json` | Codex's audit, unchanged. §5 maps every claim. |
| `CREATIVE_OWNERSHIP.md` | Inherited from v6 and unchanged. Its wording still says "v6". |
| `out/audio/` | **Current.** The build from this server; Codex rebuilds it locally. |
| `references/native-proof01/` | Codex's proof01 contacts and source lock. |
| `references/v6-handoff-stale/` | **Stale v6 copies** of PICTURE_READY, PICTURE_LOCK and FULL_READY. They are not v7. |
| `references/v6-legacy-audio/` | The replaced v6 `score.mjs` and `mix.mjs`, hash-identical. |

All 57 on-screen strings in `cues.js` appear verbatim in both the corrected treatment and the storyboard. This was
checked mechanically.

## 7. Accepted, not blocking

- **Tight reading margins.** Seven cards meet the reading rule with less than one frame to spare (C02, C03, C07, C08,
  C09, C12, C15). This is by design, and the inventory reports them.
- **The optional plate-3 header 「单股推力比较」 was not added.** 单 and 较 are not in the bundled subset, and a
  rebuild at freeze time wasn't worth it. C14 follows the plate.
- **The night jet trails in E3 and F1** are the documented look-fit (X2).
- **The D2 arrow note trails the gold push by about 0.5 s.** Opus checked every timeline state for force arrows drawn
  without the note.
  - **The only gap.** At the start of D2 the gold push is visible from 30.40 s (f912). The note's D2 window opens at
    `E.open` + 0.2 = 30.65 s and fades in over 0.25 s. So f912–919 have no note, and it is fully on from 30.90 s,
    through the end of D2 at 33.0 s.
  - **Elsewhere.** The note comes in before or together with the arrows (B2, C1, E2). The D1 beam is the lit edge rule,
    which has no arrowhead and is not a force.
  - **Not changed.** It isn't a false claim and the capture is running, so `web/` was left frozen.
  - **If QA wants it fixed,** it is one value: in `cues.js` `TAGS.arrows`, change the D2 window start
    `E.open + 0.2` → `E.open - 0.3`. Then re-render only the D2 frames, f903–989 (each frame is a pure function of its
    number), re-run `tools/text_inventory.mjs` and re-lock. The audio uses only `E` and would not change.
- **The soundtrack is unauditioned.** Its balance and headroom were set by measurement only.

## 8. Preserved

- v1–v6 and the human's original Termius work are untouched.
- The other account's copy (`/home/carljings/codex-roadster-v7-20261018`) is untouched.
- No purchases, paid media, global installs, account or config changes, git push or subagents.
- Opus's scratch files are in `/tmp/opus55-v7-audio` and `/tmp/opus55-v7-fix`. Nothing depends on them.

## Codex final actual delivery — 2026-10-18

Full1770nativeframes captured754.0s;encodedMP4 out/delivery-v7/roadster-v7-science-quiet.mp4 exists.59.0s,1080×1920,30fps,115275911bytes,SHA256068adb8a605a64b2d821b4c6a3ffc61bd54382da51ed2862b3b55d9ea51347ac. Complete decodeexit0;AAC−20.0LUFS/−7.3dBTP.59actualencodedframes viewedall7contacts;16cards/3plateschecks passed. Sourcefreezeunchanged;v6MP4hashunchanged. ThebriefD2note-delay isaccepted asnonblockingbecauseitdoesnotassertmeasuredforcesandtheworld remainsmarked原理示意;nightplumesremainvisualfits,notgasdynamicsvalidation. SeeQA.md/SCIENCE_AUDITforlimits. No humanhearing/phone/useraestheticapprovalclaim.
