# Steeper Than a Wall — Roadster v3

[简体中文](README.zh-CN.md)

[Complete58.3secondfilm](https://github.com/carljings/how-to-make-ai-video/releases/download/production-archive-20261025/roadster-blender-v3.mp4) · [3:4cover](out/delivery-v3/cover-3x4.png) · [9:16cover](out/delivery-v3/cover-9x16.png) · [ChineseSRT](out/delivery-v3/narration-v3.zh-CN.srt)

Opus5.5/max led creative direction,155-character script,3D scene/camera/graphics/type and procedural score. Codex supplied tools, exact measured voice, fonts, local rendering, technical packaging and QA, including narrow poster completeness/occlusion corrections implementing the existing design. [Actual English collaboration record](CLAUDE_COLLABORATION.md) · [Credits](CREDITS.md).

## Actual delivery

1080×1920,30fps,58.300seconds,1749decodedframes,about30MB,H.264/yuv420p/BT709 and stereo48kHzAAC.16voiceclips total37.679874seconds,without time stretch. Encoded audio measures−14.1LUFS/−1.9dBTP. Full decode/technical checks passed;19actual encoded visual samples and both cover ratios at243/324px were inspected. [Review and evidence](out/delivery-v3/qa-reviewed/REVIEW.md) · [Technical report](out/delivery-v3/verification.json).

Subjective listening, physical-phone viewing and user aesthetic acceptance are unperformed. Local delivery and Douyin publication remain separate steps.

## Film and source boundaries

The film connects fan-assisted pressure attachment/grip on the curved ramp with stored cold-gas reaction and off-centre thrust torque in a separate kickflip demonstration. A complete multi-exposure poster provides the payoff. Different demonstrations are explicitly separated. All scene/internal/force graphics are CG fits or schematics; no factoryCAD, calibratedCFD or unverified performance numbers are claimed. [Sources](scientific-sources.md).

Old cuts remain independent. The156opening frames and4non-poster stills were reused only after exact physical-input equivalence and renderer/material/geometry dependency checks; provenance and hashes are retained. The full required bank contains549dynamic plates,176RGBA layers and20stills.

## Source project

[Storyboard](storyboard-v3.zh-CN.md) · [Direction](CREATIVE_DIRECTION-v3.en.md) · [Exact narration](narration-lines-v3.json) · [Production log](production-log.md) · [Douyin copy](publish-copy.md)

The edit and measured voice timing live in `v3`; geometry/state/render in `blender/v3_*` and `render_v3.py`; composition in `src/v3`; score and technical packing in `scripts/v3`. Five real static NotoSC weights andOFL are bundled. `out/final-frames-01/source-lock.json` freezes physical render inputs.

Actual full packing command executed:

```sh
node /Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/scripts/v3/finalize.mjs --plates=/Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/out/final-frames-01 --out=/Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/out/delivery-v3
```
