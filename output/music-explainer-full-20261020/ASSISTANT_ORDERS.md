# ASSISTANT_ORDERS r2: full film 《这首开智小曲，为什么上头？》 (native Apple M4)

All visuals, motion, wording and colour are by Opus 5.5. Codex runs this source exactly as written and returns mechanical evidence; it does not change any creative file. The output is 40.467 s, **1214 frames**, 1080×1920 at 30 fps, H.264 yuv420p BT.709 with AAC stereo 48 kHz. The audio is the user's original BGM (`FILM_PLAN.md`); there is no narration and nothing is published. Nobody has listened, and that must not be claimed.

## What changed since r1 (manifest 153685a1…17fe; keep that archive)
1. **Text safe area** (`src/film.js`, `bracket()`). The bracket word is clamped by its *measured* width to x 66–934. r1 centred it at x ≥ 100 without measuring, which put "规律" at x0 = 58 on f271.
2. **Clawd's placement** (`src/film.js`, my own art fix from server stills).
   - Reward act: Clawd moves from x 930 to 870; ending: from 820 to 740; again act: from 860 to 840. This keeps Clawd clear of the right-edge app UI and out of the reward act's labels.
   - The reward act's "示意" label moves to the top-left of the brain (150, 640). In r1 Clawd was drawn over it, at (900, 1060).
3. **Provenance check** (`tools/bgm_full.py`, `tools/verify.mjs`). Diagnosis:
   - r1's "B lag −1" was the **check's** own rounding. It located B's source with S(film) − S(source) = 616 315 samples.
   - The construction actually places B at an integer offset of **616 316** samples, which is S(A1−PRE) − S(A0) − S(XF) − S(B0−PRE−XF).
   - The nominal map, (CUT − B0)·44 100 = 616 315.14, therefore puts B **0.86 sample = 19.5 µs** later than nominal. That sub-sample placement is real, inaudible and irrelevant to the 30 fps cues.
   - The check now correlates each segment at the construction's exact sample offset, still requires lag **=== 0** and r ≥ 0.9999, and reports `placement_vs_nominal_map_us`. `verify.mjs` additionally requires |placement| < 1 sample.
   - The audio processing is unchanged, so `bgm.wav` should come out byte-identical to r1 (0bc354b4…2a20).

Bash is unavailable to me at this moment, so the server copy has **no refreshed manifest**. Steps 0–1 below make the r2 freeze mechanically on the M4 from this exact source.

## 0. Sync and freeze r2
Pull the project from the server with `pull-source.py` (excluding node_modules, out, .git and temp), then:
```bash
node tools/freeze.mjs --check || true          # EXPECTED to differ from r1 in exactly: src/film.js, tools/bgm_full.py, tools/verify.mjs, ASSISTANT_ORDERS.md (and SOURCE_MANIFEST itself). Report the diff lines verbatim; STOP if any other file differs.
node tools/freeze.mjs                          # writes the r2 manifest; report its sha256
npm ci --offline --ignore-scripts
```
Upload the new `SOURCE_MANIFEST.sha256` to `.omx/artifacts/music-explainer-full-20261020/SOURCE_MANIFEST-r2.sha256`, then go on.

## 1. Soundtrack
```bash
python3 tools/bgm_full.py /ABS/PATH/reference-audio.m4a
cmp out/audio/cues.js src/cues.js              # must be identical
shasum -a 256 out/audio/bgm.wav                # expected 0bc354b4adf3f1e615133e622113c96ba2bd09b9f02382f42a9bdc22ae732a20; report if different
```
Report `processing.gain_db`, the loudness, and both `provenance_check` entries (now with `offset_samples_44k1` and `placement_vs_nominal_map_us`; expected lag 0 for both, B placement ≈ +19.5 µs).

## 2. Text safe area (all 1214 frames)
```bash
node tools/render.mjs --textcheck --gl metal   # must end: … 0 outside the safe area; report any OUTSIDE line verbatim and stop
```

## 3. Picture, mux, checks
```bash
node tools/render.mjs --video --gl metal --workers 2 --out out/picture.mp4
node tools/verify.mjs                          # → out/music-explainer-full.mp4 + out/verify.json (ALL PASS)
```

## 4. Evidence to `.omx/artifacts/music-explainer-full-20261020/native-r2/` (≤ 480 KB; confirm the upload exit 0 and the remote sha before telling me)
- `checks.txt`: the freeze diff and new manifest sha, the textcheck line, the `bgm-report` summary, the full `verify.json`, and the MP4's sha256 and size.
- Contact sheets of the **encoded** MP4, labelled, 6 columns × 4 rows with 180×320 tiles, JPEG q≈75:
  - A: f0, 30, 50, 57, 75, 100, 128, 132, 150, 190, 250, 271, 290, 300, 330, 380, 420, 470, 505, 513, 520, 560, 575, 610;
  - B: f640, 660, 700, 720, 760, 790, 830, 850, 880, 900, 930, 960, 1000, 1022, 1028, 1045, 1062, 1070, 1090, 1110, 1130, 1160, 1190, 1213.
  - C: f0, 271, 513, 1213 at 360×640 (3×2 tiles on 1080×1280, the rest black).
Keep the MP4 on the M4 for delivery; do not upload it.
