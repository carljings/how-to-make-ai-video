# PROTOTYPE_READY — v5 「空气现形」 prototype (V01–V05)

- **Length:** 512 frames, 17.067 s.
- **Status:** ready for one continuous native Metal render plus a sound review.
- **Authors:** Opus 5.5 (director). Codex renders, encodes and does QA.
- **Date:** 2026-10-18.

## 1. Art verdict on the actual Metal frames (`references/metal-proof02`)

The direction works on real pixels. Keep it. The new look is there: a full-height arena, gravity made visible by falling dust, a night-to-glass air vision on the Ping, and a gold impact storm feeding one push beam. The kinetic type works (往下掉 falls, 不掉 pins, 吸 cracks, 压 slams), and the frames are dense and modern instead of v4's diagrams in a void. No restyle.

Four visible problems were essential and are fixed in this snapshot. Everything else is retained.

1. **The hero was cropped in the hook.**
   - Frame 0 nose sat at x≈30 px, and it left the frame from ~1.0 s to the end of S01 (the crane framed a fixed x while the car moved).
   - **Fix:** S01's keys are now relative to the car's centre, so the camera tracks it. Root's frame-0 graphic is kept: car top-left, the neon C on the right, the drop below.
   - The nose stays ≥ 97 px inside the frame for the whole move. The car grows from ~55 % to ~85 % of the frame width and ends centred.
2. **Flare hierarchy.**
   - The brightest object in frame 0 was a far floodlight lens (the "back" fixture). It is not even a light in S01, but its emissive at 40× bloomed into a mid-frame orb with a full-width streak.
   - **Fix:** fixture lens emissive 40 → 12. It still reads as a lamp 15 m down and still streaks a little, but the car leads the eye.
3. **Rainbow fringes on the lattice.** Radial chromatic aberration 0.0035 → 0.0018. The lens character stays, and the red/green/blue edges on the truss are gone.
4. **"风扇（示意）" pointed at nothing.**
   - The fans were invisible in x-ray: they sit in the floor behind the glass roof's depth.
   - **Fix:**
     - The rotors are now drawn as a schematic overlay through the glass, with spinning blades, hub and rim. They light on the word 「风扇」 and spin up with the fan clock.
     - The label anchors on the front rotor, clear of the caption.
     - The slit-air sheet now thins out at the skirt edges instead of ending in a hard noise rectangle.
   - In S05 the rotors are dimmed (0.55 → 0.3) so the pressure stays the subject.

One staging fix for meaning, in S05 「外面压得重，缝里压得轻」:

- **Before:** the plan view lasted until after 「缝里」. In plan view the roof's impacts and the slit overlap on screen, so the contrast could not read.
- **After:** the same move to the side view starts on 「外面」 (+0.35 s, over 1.6 s).
  - The whole outside lights with gold impacts (glints ×1.5).
  - During 「缝里压得轻」 the slit is seen edge-on, as the dark band against the ceiling.
  - Convergence, the beam and gravity are unchanged.

**Verification.**

- **What was run:** two half-res SwiftShader renders on the server, frames 0, 75, 300, 390, 405, 435 and 495.
- **What they showed:** everything compiles, and framing and readability are as intended.
- **What they were not:** these are only compile and framing checks, not look approval.
- **Unchanged:** all word-keyed events are identical: Ping 7.083 s, 压 7.808 s, end 17.035 s, 512 frames.

## 2. Audio integration fixes (`tools/mix.mjs`, `tools/score.mjs`, `tools/dsp.mjs`)

**Clip selection (`--prototype`).**

- `--prototype` mixes only `lines.prototype_lines` (V01–V05). V06 is left out entirely.
- Full mode (no flag) mixes all 17 lines.
- The cut length is computed from the same `events.js` as the picture: `ceil(E.end·30)/30` = 17.0667 s = exactly 512 frames.
- **No truncation:** a selected line that cannot finish before the cut ends is an error. Today, full mode correctly refuses with "V06 … does not finish before 17.067 s" until the picture covers V06–V17.

**Real voice only.**

- `mix` and `score` refuse the estimate.
- They check `timing.json`'s `spec_sha256` against `lines.zh-CN.json`, and each clip's sha256 and duration.
- The picture no longer silently falls back to the estimate. Use `?estimate=1` / `render.mjs --estimate` only if it is wanted.

**Balance.**

- **The problem:** the real clips measure about −24 LUFS against a −17.4 LUFS score. The old mix (voice at unity, ducking −7 dB) would have buried the narration.
- **Voice chain:** HP 80 Hz → soft-knee compressor (3:1) → leveled to the score bed +3 LU → a voice-only peak limiter (TTS plosives run ~18 dB over loudness).
- **Score:** ducked by 7 dB under speech, so speech sits about 10 dB over the bed.
- **Knobs:** `--voice-over 3` and `--duck 7`. Tune them by ear if needed.

**Master.**

- BS.1770 gain to −14 LUFS, then an oversampled look-ahead limiter at −2.0 dBTP.
- 3 ms fade-in and 300 ms fade-out.
- ffmpeg `ebur128` re-measures the written file. Anything over −1.9 dBTP fails.

**Measured on the server:**

| | Loudness | True peak | Notes |
|---|---|---|---|
| WAV master | −14.0 LUFS | −2.1 dBTP | Master limiter ≤ 2.4 dB |
| AAC 192k / 256k / 320k | | −2.0 / −2.1 / −2.1 dBTP | |
| Muxed MP4 (recipe below) | −14.0 LUFS | −2.1 dBTP | Video 17.0667 s, audio 17.066 s |

`readWavMono` is untouched. `mix` writes a JSON report next to the WAV with:

- clips, placements and hashes;
- stem levels;
- limiter activity;
- ffmpeg loudness and true peak.

**Compatibility:** the audio stays in sync with the frames you are already capturing, because no event moved. Those frames lack the picture fixes above, so render again for the review.

## 3. Exact recipe (Mac, after pulling this snapshot)

```sh
cd codex-roadster-v5-20261018
# 1. frames: all 512 (S01 0–92, S04/S05 280–511 and the global lamp/CA change all differ from the earlier capture)
node tools/render.mjs --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --frames 0-511 --format png --out "$PWD/out/proto/frames"
#    first line must read: film: 512 frames (17.035 s), timing ../narration/timing.json, renderer …Metal…Apple M4…
# 2. score (from the real voice's word times)
node tools/score.mjs --out out/audio/score.wav
# 3. master: V01–V05 only, −14 LUFS / −2.0 dBTP (+ out/audio/master-prototype.json)
node tools/mix.mjs --prototype --score out/audio/score.wav --out out/audio/master-prototype.wav
# 4. mux (BT.709 tagged, AAC 256k)
ffmpeg -y -framerate 30 -start_number 0 -i out/proto/frames/f%05d.png -i out/audio/master-prototype.wav \
  -map 0:v:0 -map 1:a:0 -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -tag:v avc1 \
  -c:a aac -b:a 256k -ar 48000 -shortest -movflags +faststart out/v5-prototype-v01-v05.mp4
# 5. QA: 512 frames / 17.067 s; ffmpeg -i out/v5-prototype-v01-v05.mp4 -vn -af ebur128=peak=true -f null -  →  ≈ −14 LUFS, ≤ −1.5 dBTP
```

## 4. What to judge in the continuous MP4 (motion and sound, not stills)

1. **0–3.1 s:**
   - Does the crane feel like a dive under a ceiling-hung car?
   - Does 「连灰都往下掉」 fall with the dust while 「它凭什么不掉？」 pins?
   - Does the frame-0 sub hit land?
2. **3.1–6.2 s:** does the head-on 吸 read before it cracks on the line end?
3. **6.2–9.4 s:**
   - The silence before 「空气」, then the Ping wavefront sweeping the camera.
   - The 压 slam (the heaviest hit) with the beam into the ceiling.
4. **9.4–12.5 s:** the rotors light on 「风扇」. On 「抽走」 the slit air spirals into them and the slit goes dark.
5. **12.5–17.07 s:**
   - 「外面」: gold all over the outside.
   - Side view on 「缝里」: a dark slit.
   - Many impacts converge into one gold push. The shorter white gravity arrow appears, then the bed resolves.
6. **Mix:** is the narration on top everywhere, especially 「压」 over the impact? Are the score hits big enough?

**Known and deliberately not changed yet:**

- In the S05 side view the lower ~55 % of the frame is air only. The caption lives there.
- The 压 caption is crossed by the beam for ~0.8 s. It is readable on the dark stroke.

Report anything that the moving picture or sound shows to be wrong. V06–V17 come after this feedback, in the same visual grammar. `FULL_READY.md` will follow, with a pause for the body proof.
