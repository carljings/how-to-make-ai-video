# ASSISTANT_ORDERS: Clawd 10 s preview v2 (native Apple M4)

Scope: **only this 10.0 s preview** (300 frames, 1080×1920 at 30 fps). No full film; do not touch older projects; do not publish. Nobody has listened, and that must not be claimed.

## 0. Sync the frozen source
Copy `output/clawd-10s-v2-20261020/` to the M4, **excluding `node_modules`** (a symlink on the server) and `out/`. The reference audio stays at `.omx/artifacts/music-anticipation-original-20261020/assets/reference-audio.m4a`; pass its path explicitly if your layout differs.
```bash
cd clawd-10s-v2-20261020
node tools/freeze.mjs --check                # must print: source matches manifest (N files)
npm ci --offline --ignore-scripts            # three 0.186.1
```

## 1. Original BGM passage (no change since your passing run; regenerate for this tree)
```bash
python3 tools/bgm.py /ABS/PATH/reference-audio.m4a      # → out/audio/bgm.wav, bgm-report.json, out/audio/cues.js
cmp out/audio/cues.js src/cues.js                       # must be identical
```

## 2. Text safe area (all 300 frames, Metal; takes seconds)
```bash
node tools/render.mjs --textcheck --gl metal            # must end: … 0 outside the safe area
node tools/framing.mjs                                  # info: Clawd's on-screen box per time (a generous bbox)
```

## 3. Picture, mux and core checks
```bash
node tools/render.mjs --video --gl metal --out out/picture.mp4
node tools/verify.mjs                                   # → out/clawd-10s-v2.mp4 + out/verify.json (must print ALL PASS)
```
`verify.mjs` checks only:
- 1080×1920 H.264, 30 fps, exactly 300 frames, 10.0 s;
- AAC stereo 48 kHz and a strict decode without errors;
- the reference sha256, and that `bgm.wav` is source [15.810, 25.810) s (lag 0, correlation ≥ 0.9999);
- the muxed AAC aligned with `bgm.wav` (|lag| ≤ 1 ms);
- no overload (true peak ≤ −0.5 dBTP);
- `src/cues.js` matches the regenerated cues.

## 4. Evidence back to `.omx/artifacts/clawd-10s-v2-20261020/native-v2-proof/`
- `verify.json`, `bgm-report.json`, the textcheck line, the renderer string and the `freeze --check` output.
- Labelled contact sheets of the **encoded** MP4, one tile every 0.333 s (30 tiles over 3–4 sheets).
- Single encoded frames: f000, f045 (1.5 s), f057 (1.9 s), f100 (3.33 s), f128 (4.27 s), f135 (4.5 s), f165 (5.5 s), f192 (6.4 s), f230 (7.67 s), f270 (9.0 s), f299.
- The MP4's sha256 and size. Keep the MP4 on the M4 for the user; the server disk is nearly full.

## Freeze 2: what changed since the encoded preview 48fa3710… (director review: the payoff was too late and too muddy)
1. **The flood arrives within about a second.** The falling front now reaches Clawd's clearing on the drop's third measured beat (5.343 s, `T_FLOOD` in `src/world.js`) instead of the next bar line (6.406 s). The 4.3–6.3 s climax is no longer a dark wall of standing dominos. Clawd's spin jump moved with it.
2. **A sea of light, not tan tiles.** Fallen dominos glow mainly through their pips (brighter, deeper orange-gold), and the faces glow much less. Every measured beat of the drop sends a ring of light out from the impact through the fallen field, so the rhythm is visible.
3. **The opening is a reverse angle.** The title sits on clean sky over rows of waiting dominos, Clawd is on the ivory chain, and the dark escalation cluster is out of frame. The monolith becomes visible as the camera turns during the gap and build.
Re-run steps 0–4 on this freeze; the BGM and cues are unchanged.

## What changed in freeze 1 since your first draft stills (and why)
1. **No flare.** The camera no longer looks into the sun: the sun moved just off frame right as a rim light, and the slam light, bloom and sun disc were reduced. The spectacle is now the chain reaction itself.
2. **Night falls on the drop.** The fallen plain's pips and faces become the light, breathing with the measured bass, and the drop camera rises so the falling field reads as a sweeping sheet behind Clawd.
3. **The escalation snakes.** It shades from ivory to black, so it no longer reads as a stacked tower in the lens, and every fall is visible.
4. **The plain fills the middle ground.** It has a tight path corridor and keeps sight lines clear only for low camera keys. The camera keys live in `src/keys.js`, shared with the layout.
