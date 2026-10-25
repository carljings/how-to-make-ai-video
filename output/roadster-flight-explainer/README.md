# No wings. What makes this car leave the ground?

A 75-second Chinese science explainer for Douyin, 1080×1920 at 30 fps. Opus 5.5 authored the Blender model, scene, motion, explanatory timeline, Remotion typography and cover, and procedural score. Codex supplies reference analysis, tool integration, targeted fixes, rendering and independent technical review. See [CREDITS.md](CREDITS.md).

Current export: the complete 75-second film has passed encoded-output technical checks: 2250 frames, native 1080×1920 at 30 fps, full decoding, all 40 caption layout checks, and −14.1 LUFS / −2.1 dBTP encoded audio. Sampled encoded chronologies cover the source sequence and every explanatory act; both actual cover formats were checked at thumbnail sizes. See the local [technical report](out/delivery-v1/verification.json) and [independent visual review](out/delivery-v1/qa-independent-late/REVIEW.md). Subjective listening and physical-phone aesthetic acceptance remain separate, unperformed gates.

The reference is [Elon Musk's post of 16 October 2026](https://x.com/elonmusk/status/2110913107094606330). The opening reconstructs the first 14 seconds of that kickflip edit at its original timing, with portrait reframing. It does not use the separate ramp video. The car and parked lineup are inferred from images, not manufacturer CAD; close-shot cameras and the hidden motion remain visual approximations.

From 14 seconds onward, the film explains surface attachment, gas reaction thrust, torque, finite gas reserves, and the difference between a flip and stable hovering. The persistent label reads “原理示意 · 非现场画面”; inferred internals also carry “非厂商结构图”. These diagrams are not Tesla engineering drawings or measured performance.

## Build from rendered plates

Requirements: the locked Node dependencies, Python 3, FFmpeg/ffprobe and installed Chrome. Blender rendering is a separate stage, owned by the render operator; the finalizer never starts a GPU job. Its input is an existing directory containing all 2250 actual `f00000.png` through `f02249.png` plates at native 1080×1920. `blender/render_film.py` documents its rendering flags.

From this project directory:

```bash
npm run typecheck
npm run verify:captions -- --out=/absolute/path/to/caption-check
npm run finalize -- --frames=/absolute/path/to/film-frames/frames --out=/absolute/path/to/delivery
npm run verify -- --out=/absolute/path/to/delivery
```

Use a new output directory when inputs change. An existing staged plate with a different hash is refused. `--chrome=/absolute/path/to/Chrome` overrides the macOS Chrome default; no browser is downloaded. `--concurrency=3` controls compositing workers.

The finalizer refreshes `src/data/overlay.json` and `events.json` using `blender/tools/export_overlay.py`, checks font coverage, and regenerates Opus's sound locally with `scripts/score.mjs`. It stages real plates and fonts in an isolated runtime directory, disables the Webpack cache, renders the actual `Film` composition, and muxes the master soundtrack. It preserves the project public assets. No stock footage, paid media API or automatic publishing is involved.

The Python exporter is a required build input. If it is absent, packaging stops with an explicit error; pre-existing JSON data alone does not establish parity with modified animation source.

Outputs:

- `roadster-flight-explainer.mp4`: H.264 CRF 16, yuv420p, BT.709, 30 fps; stereo 48 kHz AAC at 256 kb/s.
- `cover-9x16.png`, `cover-3x4.png`, and `narration.zh-CN.srt`.
- `metadata.json`, `plate-manifest.json`, `caption-layout.json` and `verification.json` with hashes and measured results.

For a bounded integration proof, add `--range=0-29` and supply those actual numbered plates. This creates `partial-proof.mp4`, marks metadata as partial, and deliberately cannot pass final-film verification. It retains the full-film SRT timing and is not a release.

## Verification and interpretation

`verify-film.mjs` fully decodes the output and checks exactly 2250 frames, native dimensions, 30 fps, 75 seconds, audio presence, hashes, cover dimensions, canonical subtitle text/timing, and actual caption DOM text bounds with the bundled font. It measures the encoded AAC soundtrack, requiring −14 LUFS ±0.3 LU and true peak no higher than −1.5 dBTP. Explicit real-frame input props are required; the layout test card is forbidden for delivery.

These are technical checks. The current export also received sampled visual review, but this does not certify subjective sound quality, phone readability in every app overlay, exact reproduction of every source pose, or audience retention. Human picture-and-sound review and phone viewing remain separate. Caption phrase timing uses ASR-index estimates, not forced alignment. Use the current output's report rather than assuming a previous proof certifies a later render.

The scientific limits remain explicit: suction acts toward the nearby surface; gas exhaust gives an opposite reaction; off-centre thrust produces torque; a brief flip is not stable hover; equal vertical forces alone do not imply zero velocity; gas fills a vessel rather than draining like liquid. Actual Tesla mass, pressure, tank volume, nozzle layout, endurance, cable loading, clean liftoff and hidden landing contact are not established by this reconstruction.

Publication title suggestion: **没有翅膀，靠什么飞？** Content-matched tags: **#飞行汽车 #特斯拉 #马斯克 #冷气推进 #物理科普**. These are editorial suggestions, not a promise of distribution or a million views.
