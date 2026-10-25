# ASSISTANT_ORDERS: Clawd style preview (native Apple M4)

Scope: **only this 8.0 s preview** (240 frames, 1080×1920 at 30 fps). Do not make a full film. Do not modify old films or sources. Do not publish. Nobody has listened, and that must not be claimed.

## 0. Sync the frozen source
Copy `output/claude-music-style-preview-20261020/` to the M4, **excluding `node_modules`**. On the server, `node_modules` is a symlink used only for stills; do not copy it, because of iCloud duplicates. Then:
```bash
cd claude-music-style-preview-20261020
node tools/freeze.mjs --check              # must print: source matches manifest (N files)
npm ci --offline --ignore-scripts          # three 0.186.1 from the lock (use the local npm cache)
```
If `--check` fails, stop and report the differing lines. Do not edit the source.

## 1. Music (numpy + ffmpeg; no SciPy)
```bash
python3 tools/score.py                     # → out/audio/music.wav, music-report.json, out/audio/cues.js
cmp out/audio/cues.js src/cues.js          # must be identical (score.py also reports cues_js_matches_src)
```
Expect about −14.1 LUFS and ≤ −1.2 dBTP; `music-report.json` gives the section RMS levels. The WAV sha256 may differ from the server's in the last bits (float/FFT). Report it as is.

## 2. Text safe area (all frames, native; this takes seconds on Metal)
```bash
node tools/render.mjs --textcheck --gl metal     # must end: … 0 outside the safe area (exit 0)
```

## 3. Picture and mux
```bash
node tools/render.mjs --video --gl metal --out out/picture.mp4
node tools/verify.mjs                      # → out/clawd-style-preview.mp4 + out/verify.json (must print ALL PASS)
```
`verify.mjs` checks:
- 1080×1920, h264, yuv420p, 30 fps, exactly 240 frames;
- 48 kHz stereo audio with the same length as the picture;
- −14 ± 0.5 LUFS and ≤ −1.2 dBTP on the muxed AAC;
- the gap is at least 25 dB below the drop;
- a silent tail and a black last frame;
- kick-cue sync: rule kicks ±5 ms on the WAV; drop kicks ±25 ms on the AAC, informative because the mix is dense there;
- `out/audio/cues.js` is identical to `src/cues.js`.

## 4. Evidence to return (upload to `.omx/artifacts/claude-music-style-preview-20261020/native-v2-proof/`)
- `verify.json`, `music-report.json`, the textcheck output line, the renderer string, and `freeze.mjs --check` output.
- Contact sheets of the **encoded** MP4, one tile every 0.2 s, labelled with frame and time.
- Single frames extracted from the encoded MP4 at 3.6 s (f108), 3.8 s (f114), 4.0 s (f120), 4.2 s (f126), 6.0 s (f180) and 7.0 s (f210).
- The sha256 and byte size of `clawd-style-preview.mp4`. Keep the MP4 local on the M4; do not upload it to the server (disk is full).

## Changes since the native draft (b241908f…) and why
1. **Eyes are unlit black.** In the draft the eyes washed out to near-white at 3.6–3.8 s. They now stay black pixels in every light.
2. **Calmer charge glow.** The charge and impact glow were lowered: seam glow in the gap went from 2.6 to 1.5, and at the drop from 4.5 to 2.6. The hero light went from 45 to 25, and the extra bloom in the gap was removed. At 4.0 s Clawd stays terracotta with glowing seams instead of blowing out pink-white.
3. **"下一拍？" moved.** It now sits at a fixed y of 1220, in the dark between the hanging Clawd and the ghost outline, off the busy stone trail.
4. **Darker floor.** The post-drop floor is darker (base glow from 0.06 to 0.01) and the rim light glare is lower, so the orange wave crests read as energy against obsidian.
5. **Music: causal master high-pass.** The master high-pass is now a causal biquad. The zero-phase FFT high-pass made a small pre-ring before the final hit. Loudness is unchanged at about −14.1 LUFS and −1.5 dBTP.
