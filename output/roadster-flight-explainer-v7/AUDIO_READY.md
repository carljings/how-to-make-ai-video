# AUDIO_READY — v7 「空气现形」: quiet score, text inventory, docs · Opus paused

Date: 2026-10-18 · Director: Opus 5.5 · Next: Codex

> **Superseded for status by `FULL_READY.md`.** Native spot02 passed and the full capture is running. This file stays
> the detailed audio and inventory report.

Opus has finished the audio, the text inventory and the docs, and is **paused** here. The picture is frozen
(`PICTURE_READY.md`, `PICTURE_LOCK.json`).

The remaining sequence belongs to Codex:

1. A native check of E2 and P3.
2. The full capture, f0–1769.
3. The mux with `out/audio/master.wav`.
4. The encode.
5. Science and technical QA.
6. `FULL_READY.md`.

Opus changes nothing unless that QA finds an essential issue.

**Approvals.** None are claimed.

- The audio checks below are measurements only. Nobody has listened to this soundtrack, by ear or on a phone.
- The picture checks on this server are compile and framing only.

## 1. Sound: rebuilt from zero

The v6 score was judged noisy and unpleasant, and it targeted −14 LUFS with 42 hits. It was **not turned down; it
was replaced.**

- `tools/score.mjs` and `tools/mix.mjs` are new. The v6 versions are archived, hash-identical, as
  `references/v6-legacy-audio/score.v6.mjs` and `mix.v6.mjs`.
- The new score uses only the existing `tools/dsp.mjs`, which is unchanged. There are no new dependencies, engines or
  music APIs.

### What it is

A sparse, warm, consonant score in **D major**, made only by additive synthesis. Every onset is a `cues.js` instant
(`E`). The full list with frames is in `out/audio/score/score.cues.json`.

| Stem | What | Where |
|---|---|---|
| **pad** | Warm pad on 18 chord changes (Bm G D G Em A D G A Bm G Em A · rest · Gsus Bm G A D). Thirds sit at or above F#3, there are no seconds in any voicing, and the bass is moderate (≤ 6 harmonics, high-passed at 50 Hz). A chord change is a breath: tones leaving release before tones arriving swell in, and common tones hold. | Whole film. Near silence at D1 (free end), D3 (drop) and S (separator). |
| **motif** | A five-note motif on a soft glass mallet: rises a fourth, then by steps; the question ends on E, the answer lands on D. It appears 4 times, plus 3 single tones. | Question A2 3.77 s (f113) · an octave lower for plate 1 (low pressure), 10.65 s (f320) · cool variation for plate 2, 34.15 s (f1025) · answer 54.0–56.4 s, last note on the title (f1692) · single tones: the Ping 5.95 s (A5), separator 41.05 s (A4), the title's lower octave (D4) |
| **accents** | Six soft low accents. Each is a soft octave (sub + main) with a 30 ms attack; no click, noise or pitch sweep. | 压 7.15 s (f215) · 压力差 17.55 s (f527) · 密封被破坏 30.45 s (f914), descending B→G over 1.25 s as the adhesion weakens · 推力向上 38.55 s (f1157) · the flip 47.9 s (f1437) · the title landing 56.7 s (f1701), the softest |
| **air** | A faint tonal shimmer of chord tones in octaves 4–5, as slowly beating pairs that never cancel. | Only while the air is visible: A3–B2, C1, D2, E1–E2, the P3 freeze, faintly in G1 |

**Not in it:**

- No noise source of any kind: no rain, crackle, hats, dust ticks, whines, glitches, booms, risers or hiss.
- No voice or TTS, no v6 score or master, no ducking, no samples.

### Files

All files are 48 kHz, 24-bit stereo, exactly 2,832,000 samples = 1770 frames × 1600 = 59.0 s.

| File | sha256 | What |
|---|---|---|
| `out/audio/master.wav` | `e4f807b6…bc86` | **The film's soundtrack** |
| `out/audio/master.json` | — | Measurements, per-shot loudness, short-term loudness track, hashes |
| `out/audio/stems/{pad,motif,accents,air}.wav` | `d4e990a5…` `139c07da…` `4ce7d5fd…` `4954e560…` | Mastered stems (× the same gain); **they sum to the master within 2 LSB** |
| `out/audio/master.proof.wav` | `e4c3e4e0…4e98` | Proof range f0–413 (13.8 s) at the film's own gain, 0.3 s fade-out |
| `out/audio/score/{pad,motif,accents,air}.wav` | `f7b20c7a…` `2911e954…` `d933d82e…` `da5ff398…` | Raw, unmastered stems from `score.mjs` |
| `out/audio/score/score.cues.json` | — | Every chord, note and accent with its cues.js instant and frame |

### Measurements

The master was measured by ffmpeg ebur128 on the written file:

| | |
|---|---|
| Integrated loudness | **−20.0 LUFS** (target −20 ± 1; `mix.mjs` fails outside) |
| True peak | **−7.3 dBTP** (ceiling −6.0; `mix.mjs` fails above). The js 4× estimate agrees: −7.33. |
| Loudness range | 6.3 LU |
| Processing | One static gain, +1.78 dB. **No limiter, no compressor**, no other normalisation. |
| Proof cut | −19.3 LUFS, −7.7 dBTP |
| Spectrum | Energy above 5 kHz is −63.7 dB relative to the total; nothing tonal above about 3.7 kHz. A spectrogram shows only harmonic lines. |
| Clicks | None found. The largest sample step is −30 dBFS, which is the slope of a 740 Hz note. The first and last samples are exactly 0. |
| Pad steadiness | The 100 ms level varies 2–5 dB over steady chords, including the deliberate swells and the slow breath. No full-depth beating: the detuned pairs are unequal. |

Loudness by shot (gated LUFS / max momentary):

| A1 | A2 | A3 | B1 | B2 | B3 | C1 | D1 | D2 | D3 | E1 | E2 | E3 | S | F1 | G1 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| −25.9/−23.4 | −17.6/−15.7 | −18.7/−16.8 | −18.5/−15.7 | −19.1/−16.3 | −23.2/−20.7 | −21.4/−17.9 | **−29.8**/−26.8 | −21.0/−17.5 | **−30.7**/−30.3 | −18.9/−16.0 | −17.9/−15.0 | −21.3/−19.3 | **−26.2**/−25.4 | −21.7/−16.8 | −19.2/−15.5 |

**How the balance and headroom were set.** Both were set by measurement, not by ear:

- When the motif plays it sits about 4–6 LU above the pad. The accents sit 0–4 LU above it, and the shimmer 6–11 LU
  below.
- Every early overshoot of the −6 dBTP ceiling came from coincident peaks: an accent, or the title's notes, landing
  on the pad's low end. Each was fixed **in the score**, not by limiting:
  - accents became soft octaves;
  - a slimmer pad bass;
  - the title's octave double is rolled 15 ms;
  - the title accent blooms as the title lands (+0.3 s).

**Determinism.** Re-running `score.mjs` → `mix.mjs` reproduces every WAV bit for bit on this server (Node v24.21.0).
Another Node/V8 build may differ in the last bits.

### Build and mux

```bash
node tools/score.mjs && node tools/mix.mjs        # exits non-zero unless −20 ± 1 LUFS and ≤ −6.0 dBTP
node tools/mix.mjs --trim-motif -1.5              # example rebalance: the master gain is recomputed to −20 LUFS
```

- **For the mux.** Use `out/audio/master.wav` with frames f00000–f01769 at 30 fps. Both are exactly 59.0 s, so nothing
  needs trimming.
- **After the AAC encode,** please re-measure the true peak. The master leaves 1.3 dB under the −6 dBTP ceiling.

## 2. Text: inventory and checks

`node tools/text_inventory.mjs` writes `TEXT_INVENTORY.zh-CN.json` (sha256 `04894c2c…5e03`) and exits 0. It is
regenerated after the P1 label correction 「低压区·有空气」.

- **Coverage.** 57 on-screen strings use 158 unique characters, spaces excluded. All of them are present in each of
  the four bundled faces; the check reads the cmap straight from the WOFF2 files the page loads.
- **Reading.** All 16 explanatory cards pass R(n) = max(1.2 s, 0.4 s + 0.2 s × n).
  - Seven pass with less than one frame to spare: C02, C03, C07, C08, C09, C12, C15. That is exactly at the rule, by
    design.
  - The separator (CH) and the title card are reported as notes, not graded.
- **Plates.** Every plate holds long enough for its labels:
  - P1: 3.25 s total against 3.20 s needed; the last label holds 1.90 s against 1.60 s.
  - P2: 2.65 / 2.60 s; last label 1.35 / 1.20 s.
  - P3: 3.00 / 2.80 s; last label 1.55 / 1.20 s.
- **Layout.** Every card, plate, plate header and label stays inside x 110–970, y 200–1460. Labels stay inside their
  plate.
  - **New check:** no two labels of a plate, and no label and the plate header, overlap. None do.
- **Collisions.** None. The only time overlap is the C16 → title handoff, 0.15 s, in separate zones.

## 3. Docs and housekeeping

- **Picture.** `PICTURE_READY.md` and `PICTURE_LOCK.json` are fresh for v7 and written after native proof01.
- **Stale v6 copies.** The old `PICTURE_READY.md`, `PICTURE_LOCK.json` and `FULL_READY.md` copied from v6 are now in
  `references/v6-handoff-stale/`.
- **`TREATMENT.en.md` and `storyboard.zh-CN.md`** now carry a note at the top: `cues.js` (59.0 s / 1770 frames) is the
  authority, and the sound section is implemented as written.
  - The plan tables are corrected to the implemented cut at `FULL_READY`, as the treatment says.
- **Preserved.**
  - v1–v6 and the human's original Termius work are untouched.
  - The other account's v7 copy (`/home/carljings/codex-roadster-v7-20261018`) is untouched.
  - No purchases, paid media, global installs, account or config changes, git push or subagents.
- **Scratch.** Opus's scratch files are in `/tmp/opus55-v7-audio` (analysis scripts, spectrogram) and
  `/tmp/opus55-v7-fix` (Node timeline harness, SwiftShader stills). Nothing depends on them.
