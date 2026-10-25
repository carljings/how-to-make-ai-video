# FULL_READY — v5 「空气现形」 AIR, REVEALED: complete film, V01–V17

- **Length:** 1692 frames at 30 fps. The mux is 56.400 s (E.end 56.378 s); the master WAV is exactly 56.400 s.
- **Director:** Opus 5.5 (human-delegated art direction). Codex renders, encodes and does QA.
- **Date:** 2026-10-18.
- **Status: native bodyproof02 PASSED. The full capture is running.**
  - Codex rendered and viewed all 24 native Metal frames:
    - the whole car is in frame at 27.8, 28.7 and 29.6 s;
    - the torque labels are visible at 41.2 and 41.7 s;
    - the cable note is visible at 42.8, 43.5 and 44.3 s.
  - **Capture:** 1692 frames, native 1080×1920, 30 fps, `--sub 8 --steps 48` (§3).
  - **Source:** the snapshot archive was pulled before bodyproof02; archive sha256 `25c975ebb05e0a2da8245ea854dda1b467c605e07a46329bae7132de46be404f`.
  - **Frozen:** picture, audio and code. A change is allowed only for a critical fact or defect, and only after telling Codex first.
  - **Next:** Codex independently verifies the actual encoded film. All older versions are preserved.

**Unchanged this session:**

- the treatment, storyboard and narration;
- all 17 real clips and `timing.json`;
- `events.js` (every word-keyed event is identical; see `render.mjs --info`);
- geometry, assets, poses, shaders, fonts and the audio tools.

**Changed this session:** only two files:

- `web/engine/timeline.js` (`79b0e906ae907d40d4267a9593ab6087ed1c998863e0ef302dd0c2a8b8a15d3b`);
- `web/engine/text.js` (`220c319f905cfdd913c810f3f53adfcd8a6baf704effeb16ac416cae3b150f4c`).

The other 30 entries of `references/native-bodyproof01/source-lock.json` still match byte for byte.

## 0. Verdict on native bodyproof01 (29 actual Metal frames, contacts 1–4)

The film works and the direction is final.

- Gold and cyan read as one system.
- The finite straight ceiling ends where it should.
- The ramp, jet and kickflip sections join up as one continuous film.
- Typography and captions are clean.
- There is no floor z-fighting. Checked in the mesh: no face of the ramp, venue or lot lies within 3 mm of the floor plane at z = −6 mm.

No re-art. Only clipping and label problems were fixed:

| # | Problem (where it was seen) | Cause | Fix | Result (all-frame probe, real car mesh) |
|---|---|---|---|---|
| 1 | **S09**: car nose and wheel clipped on the left (27.8 s, 28.7 s); tail off the right at the start (Codex; native f00834, f00861) | The car travels 3.9 m (x −3.61 → −7.48) while the camera panned only 1 m | The camera tracks the car's centre with 0.3 m lead room, pulled back 10.4 → 12.4 m, same 54° lens. The deck's free end now passes under the car from nose to tail, so 敞开/压不住 still happen at the edge, in frame | Car fully in frame on every frame, ≥ 131 px margin (was −328 px: the tail off the right at the start, the nose off the left from f828) |
| 2 | **S09b**: nose clipped on the left (29.6 s; Codex, native f00888) | Aim point 0.9 m behind the car | Aim at the car (com + [−0.3, 0.2, 0.3]); lens 52 → 56°. The deck's end stays at the right | ≥ 127 px margin (was 26 px; the bloom made it read as cut) |
| 3 | **S13 freeze**: 「喷气（示意）」 clipped at the left edge, only 「意）」 visible (41.2 s; Codex, native f01236) | Label pointed left from a jet base at x ≈ 150–400 px | Points right (dx +110) on a dark backing plate. `label()` now also mirrors any label that would leave the frame, as a safety net (no other label triggers it) | In frame, f1227–1262 |
| 4 | **S13**: the required disclosure 「画面中可见细线，作用未公开」 ran off the left edge, then off the right, and sat over the car (my probe; faint in native f01305) | A fixed world anchor on the wire, while the camera pans so fast that wire points sweep ~2000 px across the frame | The dot rides the top wire where it crosses screen column x = 900; the text holds still top right on a plate, clear of the car, plumes and caption. On from 42.27 s (after the freeze labels) to the cut at 44.95 s; fully visible 42.52–44.65 s | In frame on every frame; never on the car or the caption |
| 5 | **S05**: 「空气压力（示意）」 sat on the V06 caption line (my probe; this was also in the prototype, f473–524) | Anchor at the beam tail with dy +70 put the text at y ≈ 1321–1366 | Anchor moved up the beam (car-local z 2.7 → 1.9), dy +110. Text box now y ≈ 1172–1217, clear of 「重力」 (≤ 1113) and the caption (≥ 1347). Label position only; the rest of the prototype is untouched | No caption collision anywhere in the film |
| 6 | **S14**: the landed car's nose cut at the left edge during the close-up on 喷完 (native f01560; my probe: −54 px) | Close keys aimed right of the car at 42–44° | The two close keys aim 0.5 m toward the nose; lens 42 → 46° and 44 → 47°. Camera positions and timing are unchanged | Close-up ≥ 41 px from f1555 (56 px at f1560); the move in is tightest at 18 px (f1536) |

**Factual re-check (essential, passes).** The S13 freeze draws an off-centre push at car-local y = −0.62. Its r×F about the centre of mass has the same sense as the pose's actual roll (v4's `roll_check` method, +1 at all 7 samples, 40.22–43.09 s). The torque arc also turns that way: the roll is to the left, about −X.

## 1. Full timing (generated from the code: `narration/timing.json` → `events.js` → `timeline.js`)

| Shot | Seconds | Frames | World | What happens |
|---|---|---|---|---|
| S01 | 0.00–3.10 | 0–92 | night | Crane down under the ceiling-hung car. 「连灰都往下掉」 falls with the dust; 「它凭什么不掉？」 pins |
| S02 | 3.10–6.18 | 93–185 | night | Head-on beyond the deck's end. 吸 is drawn into the slit and cracks at the line end |
| S03 | 6.18–9.35 | 186–280 | night → air | Pull-out. The Ping on 空气 (7.08). On 压 (7.81) the gold storm hits and a beam slams into the ceiling |
| S04 | 9.35–12.50 | 281–374 | air | Below the car, through the glass: rotors light on 风扇 (9.60). On 抽走 (11.46) the slit air spirals into them |
| S05 | 12.50–17.47 | 375–524 | air | Plan to side view. 外面: gold impacts. 缝里: the dark slit. Many pushes become one beam; gravity, shorter; on 按 (16.78) four beams into the tyres |
| S06 | 17.47–19.15 | 525–574 | night | Tyre macro on the ceiling, gold contact patch. On 抓 (18.39) the car pulls away |
| S07 | 19.15–23.80 | 575–713 | air | Whole-ramp replay, moving camera, ghost poses. The push always points into the surface and gravity always down. A wave on 始终 (21.64), a slam on 压向坡面 (22.19) |
| S08 | 23.80–26.20 | 714–785 | night | Chase toward the free end. 尽头 (25.48) lights the edge |
| S09 | 26.20–28.74 | 786–862 | night → air | Tracking side-on at the free end. 敞开 (26.85): the slit opens, outside air rushes in, impacts return and the beam shrinks. 压不住 (27.78): the beam breaks and gravity is left alone |
| S09b | 28.74–29.90 | 863–897 | night | From below: the car leaves the deck's end and drops (hang-time dust) |
| S10 | 29.90–33.30 | 898–998 | night → x-ray | The scan runs nose to tail on 换 (31.11). The vessels fill on 自带 (31.61), and 高压气 (32.14) sets the gas jittering. Label 储气（示意） |
| S11 | 33.30–36.30 | 999–1089 | air | The reserve feeds the nozzles. 喷 (34.11): jets down. 推 (35.89): cyan reaction up, gravity down |
| S11b | 36.30–37.25 | 1090–1117 | night | Into its own cloud under the floods |
| S12 | 37.25–37.85 | 1118–1135 | black | 另一场演示 · CG重建 · 据马斯克 2026.10.16 发布的视频 |
| S13 | 37.85–44.95 | 1136–1348 | lot | The car rises on jets over the lineup. 偏离 (40.74): freeze in air vision, off-centre push and a twist about 重心. Resume (41.75), full flip (翻 42.74, 过来 43.09). Cable callout 42.27–44.95 |
| S14 | 44.95–56.38 | 1349–1691 | night / air | Ramp wide. 借 (46.21): gold on the ramp. 花 (48.95): the cyan airborne path. 自己的气 (50.82): close air vision while the reserve drains to 喷完 (52.32). Title at 53.83; fade to black at 56.38 |

Slates follow the world:

- night: CG重建 · 据特斯拉 2026.10.16 发布的视频;
- air / x-ray: 原理示意 · 非实拍;
- lot: CG重建 · 据马斯克 2026.10.16 发布的视频.

The title card repeats all three. The film never says 今天.

| Line | Text | Seconds | Frames |
|---|---|---|---|
| V01 | 连灰都往下掉，它凭什么不掉？ | 0.25–2.92 | 8–87 |
| V02 | 你可能以为，它是被吸住的。 | 3.40–5.72 | 102–171 |
| V03 | 其实，是空气把它压上去的。 | 6.30–8.69 | 189–260 |
| V04 | 风扇把车底缝里的空气抽走， | 9.60–12.09 | 288–362 |
| V05 | 外面压得重，缝里压得轻， | 12.70–15.14 | 381–454 |
| V06 | 车就被死死按在坡上，轮胎才抓得住。 | 15.50–18.99 | 465–569 |
| V07 | 墙上、顶上，这股力始终压向坡面。 | 19.60–23.09 | 588–692 |
| V08 | 可坡，总有尽头。 | 24.30–26.08 | 729–782 |
| V09 | 缝一敞开，就压不住了。 | 26.50–28.59 | 795–857 |
| V10 | 这时，它换上自带的高压气： | 30.30–32.84 | 909–985 |
| V11 | 气往下喷，车就被往上推。 | 33.50–36.25 | 1005–1087 |
| V12 | 另一场演示里， | 37.90–39.14 | 1137–1174 |
| V13 | 喷气偏离重心， | 40.20–41.63 | 1206–1248 |
| V14 | 它就整个翻了过来。 | 42.00–43.48 | 1260–1304 |
| V15 | 在坡上，借的是空气的力； | 45.30–47.64 | 1359–1429 |
| V16 | 在空中，花的是自己的气。 | 48.00–50.43 | 1440–1512 |
| V17 | 自己的气，总有喷完的时候。 | 50.80–53.38 | 1524–1601 |

**Captions.**

- V02–V17 are drawn in the safe band at y = 1395.
- Each fades in 0.08 s before its line.
- Each holds until min(line end + 0.4 s, next line − 0.1 s).
- V01 is the kinetic title.

## 2. Native body proof 02 — PASSED (Codex rendered and viewed 24 native frames; the record below is unchanged)

```sh
cd /ABS/PATH/TO/codex-roadster-v5-20261018-02        # this snapshot
node tools/render.mjs --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 \
  --frames 490,537,645,735,790,807,834,861,888,969,1050,1107,1236,1250,1275,1305,1340,1392,1536,1560,1674 \
  --format png --out "$PWD/out/body02/frames"
# first line must read: film: 1692 frames (56.378 s), timing ../narration/timing.json, renderer …Metal…
```

| Frame | Time | Shot | Check |
|---|---|---|---|
| **490** | 16.33 | S05 | 「空气压力（示意）」 sits left of the beam, above the V06 caption, clear of 「重力」 |
| **790** | 26.33 | S09 | Tracking camera: the whole car under the deck, V08 caption fading |
| **807** | 26.90 | S09 | 敞开: Ping and gold beam; the free end in frame |
| **834** | 27.80 | S09 | 压不住: nose and wheel inside the frame (was clipped) |
| **861** | 28.70 | S09 | Gravity alone plus 「重力」; nose inside (was clipped) |
| **888** | 29.60 | S09b | The drop: nose inside (was clipped); the deck's end at right |
| **1236** | 41.20 | S13 | 「喷气（示意）」 right of the jet base on its plate (was clipped) |
| **1250** | 41.67 | S13 | Arc complete, 重心 and 喷气 labels |
| **1275** | 42.50 | S13 | Cable callout fading in: the dot on the wire, the text top right |
| **1305** | 43.50 | S13 | Callout during the flip: legible, not on the car |
| **1340** | 44.67 | S13 | Callout as the wires rise (short leader) |
| **1536** | 51.20 | S14 | Move in: the car's nose stays inside (the tightest frame, 18 px) |
| **1560** | 52.00 | S14 | Close-up on 喷完: nose inside (was cut); 储气（示意） |
| 537, 645, 735, 969, 1050, 1107, 1392, 1674 | | S06, S07, S08, S10, S11, S11b, S14 借, title | Regression only: should match bodyproof01. 969 and 1050 also exercise the rewritten label code |

Codex's run also includes:

- **40.8 s (f1224):** the freeze begins and the air-vision Ping sweeps; no labels yet.
- **44.3 s (f1329):** the cable callout late in its window, with a short leader.

Both are covered by the same pass rule.

**Pass rule (no round-trip needed).** GO for the full render with this source frozen, provided:

- the bold frames show the fixes;
- the regression frames match bodyproof01.

If a bold frame is wrong, send me that frame. Every frame is independent, so only the affected range has to be re-rendered later. No further art changes before the full film.

## 3. The full film — capture RUNNING (fresh directory; all 1692 frames from this snapshot)

The predecessor changed shaders after the prototype, and f472–524 changed here. Do not reuse prototype or proof frames.

```sh
node tools/render.mjs --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --frames 0-1691 --format png \
  --out "$PWD/out/full/frames" --skip-existing        # resumable; ranges may be split, e.g. 0-845 and 846-1691
node tools/score.mjs --out out/audio/score.wav
node tools/mix.mjs --score out/audio/score.wav --out out/audio/master.wav      # full mode: all 17 lines (+ master.json)
ffmpeg -y -framerate 30 -start_number 0 -i out/full/frames/f%05d.png -i out/audio/master.wav \
  -map 0:v:0 -map 1:a:0 -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -tag:v avc1 \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/roadster-v5-air-revealed.mp4
```

**QA:**

- 1692 video frames, 56.400 s, audio 56.400 s.
- `ffmpeg -i out/roadster-v5-air-revealed.mp4 -vn -af ebur128=peak=true -f null -` should give ≈ −14 LUFS and ≤ −1.5 dBTP.
- `mix.mjs` refuses on its own if any clip hash or duration mismatches `timing.json`, or if any line would be truncated.

## 4. Audio and credits

**Voice.**

- edge-tts 7.3.1 (free), zh-CN-YunjianNeural, rate +0%.
- 17 separate clips at 48 kHz mono: only the outer silence is trimmed; no time-stretch and no pitch change.
- Word times come from Edge WordBoundary. Characters inside a word are interpolated.
- Placement follows `voice.js placeClips`: V01 at 0.25 s; each later line at max(nominal, previous end + 0.20 s). The same function places picture and sound.

**Score and sound.**

- Original procedural code (`tools/score.mjs`): no samples, no commercial music, no paid media models.
- It is keyed to the same `events.js` instants as the picture: the Ping, 压, 抽走, 按, 敞开, 喷, 推, the separator, 借, 花 and 喷完.

**Mix (`tools/mix.mjs`, unchanged).**

- Voice: HP 80 Hz → 3:1 compressor → +3 LU over the bed → voice peak limiter.
- Score: ducked 7 dB under speech.
- Master: −14 LUFS, oversampled limiter at −2.0 dBTP, 3 ms / 300 ms end fades.

**Measured on the server today (full mode, all 17 lines).** Every line finishes before the cut; nothing is truncated.

| | Length | Loudness | True peak | Notes |
|---|---|---|---|---|
| Master WAV | 56.400 s = 1692 frames | −14.1 LUFS | −2.1 dBTP | Bed −17.8 LUFS; limiter ≤ 3.5 dB |
| AAC 256k | 56.400 s | −14.1 LUFS | −2.0 dBTP | |

**Codex's local full build (Mac).**

- 56.4 s, 1692 frames, −14.1 LUFS / −2.1 dBTP, all 17 clips complete.
- Master sha256 `8f4d2dbb7a0e2e8e84a94a1488e095b13227f5fa8a7f8f117baf00a126cd83d0`. This is byte-identical to the server build (`master.json` `wav_sha256`), so score and mix are deterministic across machines.
- The audio does not depend on the picture source; the picture fixes did not touch it.

**Speech check (Codex, automated).** Offline cached Whisper small, run on the actual mixed master:

- It recognizes all 17 lines, with some homophone or near-phonetic differences.
- No line is missing, and there is no hallucination at the tail.

This is not a human listening claim.

**Credits.** See `CREDITS.md` (中文 + English): roles, voice, font, procedural score, sources and boundaries. Publish title, description and tags are suggested in `PUBLISH.zh-CN.md`.

## 5. Checks run here (server, CPU and SwiftShader; framing and compile only, never a look approval)

- `render.mjs --info`: 1692 frames, 56.378 s, real `timing.json`; events identical to bodyproof01.
- **All-frame probe** (`/tmp/v5y/probe_all.mjs`, real car mesh hull, all 1692 frames):
  - no label off-frame;
  - no label on a caption or on the slate;
  - no unintended car clipping outside the approved prototype close-ups (see §6).
- **Torque sense:** r×F +1 at all 7 samples.
- **Facts on screen:**
  - gravity is world-down everywhere;
  - the push is always into the surface;
  - the seal is lost at the free end;
  - stored gas gives the opposite reaction;
  - the off-centre torque appears only in the separate demonstration, with the cables visible and labelled.
- **Not on screen:** antigravity, maglev, fire, or any number except the 2026.10.16 dates.
- **SwiftShader spot frames:** 490, 790, 807, 834, 861, 870, 888, 1236, 1250, 1275, 1290, 1305, 1320, 1340, 1536, 1560 and 1590 compiled and framed as intended.
- **Audio:** full `score.mjs` and `mix.mjs` ran end to end (§4). The master's sha256 equals Codex's local build.

## 6. Known issues (honest)

1. **Prototype close-ups overhang the frame.** These were approved in the native prototype and deliberately not touched. The car's mesh box overhangs in:
   - S03 (f190–280, the three-quarter pull-out);
   - S04 (f345–374);
   - the S05 side view (f375–524).
2. **S05 beam and caption.** The gold beam's tail reaches the V06 caption line (y ≈ 1388 against baseline 1395) for 15.5–17.47 s. The caption reads on its stroke (prototype).
3. **A deliberately dark beat, 28.74–31.0 s** (S09b and the start of S10). The falling car is a black silhouette with light edges until the X-ray scan; the V10 caption carries the beat. It was not re-lit.
4. **S13 lot.** The floor is bright grey under the fogged floods. Captions read on their stroke (bodyproof01).
5. **Long early leader on the cable callout.** At 42.3–43.3 s the wires sit low in the frame, so the leader runs about 600–850 px. It shrinks to about 150 px by 44.7 s. The text itself never moves.
6. **S13 jet beam is schematic.** The source plume schedule has all four ports open through the flip. The single off-centre cyan push is a labelled schematic net push, not a measured split. The cables' load role is unknown, and the callout says exactly that.
7. **S14 move in.** At 51.0–51.8 s the small, moving car passes within 18 px of the left edge.
8. **Event timing within a word.** Word-keyed events are exact to the Edge word boundary. Inside a multi-character word, timing is interpolated: up to about 0.1 s off the syllable.
9. **Needs Metal pixels.**
   - The new S09 distance and tracking: the car is now about 713 px wide, against about 850 px before.
   - The S09b re-aim and the label plates.
   - No human listening or phone viewing is claimed for the full film. The automated speech check passed (all 17 lines; §4).
10. **Illustrative physics.** Glints, beams, particles, vessels and nozzles are illustrative, not telemetry. Internal fit coordinates are inferred, not Tesla CAD, and no performance numbers appear.

Paused. Codex verifies the actual encoded full film. No picture, audio or code edits unless there is a critical fact or defect, and Codex is told first.

## Codex actual delivery — 2026-10-18

Full capture/encode completed. Actual MP4: `out/delivery-v5/roadster-v5-air-revealed.mp4`. 1692frames/56.4s,1080×1920,30fps;−14.1LUFS/−1.8dBTP. Full decode and44encoded-frame visual review passed. SeeQA.md for review scope and limits. All source-lock entries still match.
