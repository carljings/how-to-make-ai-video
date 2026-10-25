# FULL_READY — v6 「空气现形」 (text-led, voice-free)

Date: 2026-10-18 · Director: Opus 5.5 · Next: Codex

Opus has finished and is **paused** here. Codex keeps the freeze, captures the full film, builds the audio locally from
these sources and verifies the encoded film. Opus changes nothing more unless that QA finds an essential issue.

**Approvals.** None are claimed here.

- The picture checks below come from Codex's native Metal frames.
- The audio checks are measurements only. The soundtrack has not been auditioned by ear or on a phone by anyone.

## 1. Picture: frozen

- **`web/` is unchanged since `PICTURE_READY.md`.** It matches `PICTURE_LOCK.json` across all 27 files (re-verified
  after all the audio and docs work). `tools/render.mjs` is unchanged too.
- **Frames.** 1623 at 30 fps = 54.1 s, 1080×1920. `cues.js` is the only schedule.
- **Changes since native-proof01.**
  - The A1 opener camera is car-relative, so the whole car stays in frame: x 59–1000, y 276–784 px on every frame
    f0–107.
  - `cues.js` gains a `cardGone()` helper used by the inventory. It changes no timing, string or pixel.
- **Native spot02 (Codex, 8 Metal frames: 0, 45, 96, 107, 315, 351, 420, 507).**
  - The opener fits at f0, f45, f96 and f107 and is still large.
  - The main text is clear and the text at the root of the pressure push is readable.
  - The fans and pressure shots are unchanged.
  - Codex gave GO for the frozen picture. The full 1623-frame capture runs on Codex's machine:

```bash
node tools/render.mjs --out /ABS/out/frames --frames 0-1622 --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --skip-existing
```

## 2. Sound: original procedural music + SFX, no voice

The audio was rebuilt from scratch; nothing comes from v5:

- `tools/score.mjs` and `tools/mix.mjs` are new. The V5 versions are archived, hash-identical, as
  `references/v5-legacy/tools/score.v5.mjs` and `mix.v5.mjs`.
- No voice, TTS, v5 clips, v5 master or ducking. No file in `web/` or `tools/` imports voice or narration code.

| File | sha256 | What |
|---|---|---|
| `out/audio/master.wav` | `13ed6da6…d8d9ae` | **The film's soundtrack**: 48 kHz, 24-bit stereo |
| `out/audio/master.json` | — | Measurement report (below) |
| `out/audio/score.wav` | `22b1566f…5c54` | Unmastered score; runs 0.6 s past the film for tails |
| `out/audio/score.cues.json` | — | 42 named hits, each with its cues.js time and frame |
| `out/audio/master.proof.wav` | `3ce9d74a…6339` | The proof range, frames 0–386 = 12.9 s (`mix.mjs --proof`) |

**Master, measured by ffmpeg ebur128 on the written file:**

| | |
|---|---|
| Integrated loudness | −14.0 LUFS (target −14) |
| True peak | −2.1 dBTP (ceiling −2.0; the script fails above −1.9) |
| Loudness range | 5.6 LU |
| Length | 2,596,800 samples = 1623 frames × 1600 = 54.1 s exactly, so it is sample-locked to the picture |
| Limiter | Works only on causal hits: max 4.8 dB, above 1 dB on 6.6 % of samples |

Proof master: −14.1 LUFS, −2.0 dBTP, 619,200 samples.

**Determinism.** Re-running `score.mjs` → `mix.mjs` reproduces both WAVs bit for bit. Every hit sits on its `cues.js`
instant, for example:

| Hit | Time | Frame |
|---|---|---|
| frame-0 slam | 0.0 s | f0 |
| Ping | 5.9 s | f177 |
| 压 | 7.2 s | f216 |
| 压力差 | 16.55 s | f497 |
| 按 | 19.4 s | f582 |
| 始终压向坡面 | 25.9 s | f777 |
| 没了 | 30.17 s | f905 |
| 推 | 36.55 s | f1097 |
| separator tone | 39.1 s | f1173 |
| 翻 | 43.85 s | f1316 |
| 借 | 46.05 s | f1382 |
| 花完 | 50.17 s | f1505 |
| title | 52.0 s | f1560 |

The separator is true silence apart from its one tone.

**To build the audio locally:** `node tools/score.mjs && node tools/mix.mjs` (add `node tools/mix.mjs --proof` for
the proof range). The scripts read only `web/engine/cues.js` and `tools/dsp.mjs`.

- **Hashes.** On this server (Node v24.21.0) the rebuild is bit-identical, giving the hashes above. Another Node/V8
  build may differ in the last bits.
- **What to check.** The pass criteria are what `mix.mjs` checks and writes to `master.json`:
  - exactly 2,596,800 samples;
  - −14 ± 0.5 LUFS;
  - true peak ≤ −1.9 dBTP (the ceiling is calibrated to ≤ −2.0).

  `mix.mjs` exits non-zero if the loudness or the true peak fails.

**For the mux:**

- Inputs: `out/audio/master.wav` with frames f00000–f01622 at 30 fps. Both are exactly 54.1 s, so nothing needs trimming.
- Encode with your usual settings.
- The 0.1 dB of extra true-peak headroom is there so the AAC stays ≤ −1.5 dBTP; please re-measure after the encode.

## 3. Text: inventory and reading check

**`node tools/text_inventory.mjs` → `TEXT_INVENTORY.zh-CN.json`.** The tool exits 0.

- **Coverage.** 35 on-screen strings use 121 unique characters, spaces excluded. All of them are present in each of
  the four shipped faces. The check reads the cmap straight from the WOFF2 files under `web/assets/fonts`; the space
  glyph is present too.
- **Reading.** All 15 explanatory cards pass the `cues.js` rule. Margins in frames are listed per card.
- **Layout.** Every card, including the arrows and the 尽头 edge rule, stays inside x 110–970, y 200–1460. This uses
  text.js layout with the faces' own advance widths and auto-fit.
- **Collisions.** None.
  - No card shares screen space with another card, the top-left tag or the cable note while both are visible.
  - The only time overlap is the C16 → title handoff, 0.1 s, in separate zones.
  - C06→C07, C08→C09, CH→C13 and C15→C16 abut exactly.

## 4. Docs

- **`TREATMENT.en.md` and `storyboard.zh-CN.md`** now match the implemented cut:
  - 54.1 s / 1623 frames and the real shot times;
  - the real cards, including 花完，就没了;
  - R(n) = max(1.2 s, 0.4 s + 0.2 s × n);
  - the actual type sizes;
  - the floor lattice, the car-relative opener, and the voice-free score and master;
  - the proof range 0–386 with `render.mjs --proof` / `mix.mjs --proof`.
- **Picture and handoff:** `PICTURE_READY.md`, `PICTURE_LOCK.json`, `FULL_READY.md` (this file).

## 5. Accepted and deliberately unchanged (not blocking)

- **f507: the gold beam's tail sits behind 压力差.** No restyle. The word is legible at 360 px on the native contact
  and reads as the label at the root of the push.
- **C05 「缝里 压得轻」 floats in slowly.** It passes the `cues.js` rule using `landed()`, when it is already about
  84 % in. Its motion fully settles 1.25 s before the exit; the inventory reports this as `settled` and
  `holdAfterSettle`.
- **The title card's credits type on until 53.46 s,** then fade with the picture over 53.65–54.08 s. The same sources
  also appear at the start (Tesla, 0–3.3 s) and on the separator (Musk).

## 6. Preserved

- v1–v5 are untouched.
- The prior isolated CLI jobs are untouched: `.omx/jobs/opus-v5-carljings-01` and the root-owned `/tmp/v6probe`.
- Opus's own scratch files (probe scripts, two SwiftShader stills) are in `/tmp/opus55-v6-swXJkN`. Nothing depends on
  them.
- No purchases, paid media, account or config changes, global installs, git push or subagents.

## Codex actual delivery — 2026-10-18

Full1623nativeframes andH.264/AACencodecompleted. ActualMP4:out/delivery-v6/roadster-v6-text-only.mp4;54.1s,1080×1920,30fps;full decodeexit0;encoded−14.1LUFS/−2.1dBTP;46encodedframesviewed. Sourcesremainfrozen. SeeQA.md forscope/limits. No spokenvoice; no humanhearing/physicalphone/useraestheticapprovalclaim.
