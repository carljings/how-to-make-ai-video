# ASSISTANT_ORDERS: music explainer v3 r2 「声音长廊」, 10 s preview (native Apple M4)

All visuals, motion and wording are by Opus 5.5. Codex runs this frozen source exactly as written and returns mechanical evidence. Scope: **only this 10.0 s preview** (300 frames, 1080×1920 at 30 fps). The audio is the user's original BGM: no narration, no added sound. Older projects stay untouched; do not publish. Nobody has listened, and that must not be claimed.

**r2.2** (after my review of the encoded r2.1 frames): in `src/plan.js` the corridor and recap camera look-targets moved so Clawd is no longer cut off at the right edge (f230–f260 in the r2.1 encode). Only camera keys changed; the text, font subset, BGM and cues are unchanged. For this freeze, return only: the freeze/textcheck/verify lines, the MP4 sha256 and size, and **one** labelled contact sheet (5×4, tiles 216×384) of encoded frames f120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 246, 252, 258, 264, 270, 276, 282, 290, 299, uploaded to `native-r22/` (≤ 250 KB).

**r2.1** (after your textcheck report): the summary line `听出规律 → 预期 → 等到` is now 70 px instead of 82 px (it was 895 px wide, x 92–988; now ≈ 764 px, x ≈ 158–922). Nothing else changed; the glyphs are the same, so the font subset is unchanged.

r2 replaces the creative sources (`src/film.js`, `src/plan.js`, `src/text.js`) and the font subset. r1 is archived at `.omx/artifacts/music-explainer-v3-20261020/r1-source-archive/`. `tools/bgm.py` and `src/cues.js` are unchanged, so the audio is the same as the r1 native run.

## 0. Sync the frozen source
Copy `output/music-explainer-v3-20261020/` to the M4, excluding `node_modules` (a symlink on the server) and `out/`. Then:
```bash
node tools/freeze.mjs --check                 # must print: source matches manifest (N files); if not, report and stop
npm ci --offline --ignore-scripts             # three 0.186.1
```

## 1. Original BGM passage (unchanged)
```bash
python3 tools/bgm.py /ABS/PATH/reference-audio.m4a       # sha256 6987131e…4b61 is checked
cmp out/audio/cues.js src/cues.js                        # must be identical
```

## 2. Text safe area (all 300 frames, Metal; takes seconds)
```bash
node tools/render.mjs --textcheck --gl metal             # must end: … 0 outside the safe area; report any OUTSIDE lines verbatim
```

## 3. Picture, mux and core checks
```bash
node tools/render.mjs --video --gl metal --out out/picture.mp4
node tools/verify.mjs                                    # → out/music-explainer-v3.mp4 + out/verify.json (ALL PASS)
```

## 4. Evidence to `.omx/artifacts/music-explainer-v3-20261020/native-r2/`
Keep it **≤ 550 KB in total**, and confirm the upload succeeded before telling me.
- `verify.json`, the textcheck line and the `freeze --check` line, in one small text file.
- **Two** contact sheets of the encoded MP4, labelled, 5 columns × 4 rows, each tile 216×384:
  - sheet A: f000, 010, 020, 030, 040, 049, 055, 060, 070, 085, 100, 112, 120, 126, 129, 133, 140, 150, 165, 180;
  - sheet B: f190, 200, 215, 230, 245, 253, 260, 268, 275, 282, 290, 299. Leave the remaining tiles black.
- Single encoded frames at 540×960 JPEG quality ~80: f055 (the miss), f129 (the drop), f160 (the corridor), f290 (the recap).
- The MP4's sha256 and size. Keep the MP4 on the M4 for the user.
