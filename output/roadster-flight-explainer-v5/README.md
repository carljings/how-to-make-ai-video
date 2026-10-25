# Roadster v5 《空气现形》 AIR, REVEALED

A 56.4-second Chinese explainer in 9:16 (1080×1920, 30 fps, 1692 frames) about the Tesla Roadster ramp demonstration of 2026-10-16. Everyone sees a car stuck to a ceiling. The film shows what nobody can see: the air holding it there. Then the ceiling ends, and the car has to spend air of its own.

- **Director:** Opus 5.5 (human-delegated art direction).
- **Rendering and QA:** Codex.
- **Look:** two realities through one camera.
  - **Night** is what the eye sees. Falling dust is gravity made visible.
  - **Air vision** is what the air does: **gold** for borrowed air pressure and **ice cyan** for the car's own carried gas.

## The argument, beat by beat

| Time | Beat |
|---|---|
| 0–9 s | Hook: 「连灰都往下掉，它凭什么不掉？」. The wrong answer, 吸, cracks. The Ping on 空气 turns the world into air vision; the slam lands on 压. |
| 9–19 s | The fans empty the slit under the car. The outside presses hard and the slit barely at all; many small pushes become one gold push into the surface; the loaded tyres grip. |
| 19–24 s | The whole ramp: the push always points into the surface, while gravity always points down. |
| 24–30 s | The finite ceiling ends. The slit opens at the free end, the push dies, and the car drops. |
| 30–37 s | X-ray: the stored gas. Jets go down and the reaction pushes the car up; it falls into its own cloud. |
| 37–45 s | Black separator, then **a separate demonstration**: the kickflip. Off-centre thrust twists the car about its centre of mass. The visible overhead lines are labelled 「画面中可见细线，作用未公开」. |
| 45–56 s | 借 (gold, on the ramp) and 花 (cyan, in the air), then 「自己的气，总有喷完的时候。」. Title: 空气现形. |

## Status (2026-10-18)

- The picture source is frozen.
- Native Metal bodyproof02 passed; the full capture and encoded-film checks are complete.
- Final encoded audio measures −14.1 LUFS / −1.8 dBTP.
- Details are in `FULL_READY.md`; publish copy suggestions are in `PUBLISH.zh-CN.md`.

The actual deliverable is `out/delivery-v5/roadster-v5-air-revealed.mp4`: H.264 High, BT.709, AAC256k, 56.4s,1692frames. Complete decoding passed and Codex viewed44encoded frames; subjective listening and physical-phone playback are not established. See `QA.md` and `out/delivery-v5/verification.json`.

## How it is made

**Picture.**

- One deterministic WebGL2 engine (`web/`) with no runtime dependencies. Every frame is a pure function of its frame number:
  - cameras, poses and analytic particles;
  - pressure glints, force beams and type;
  - sub-frame motion blur, HDR bloom and grade.
- `tools/render.mjs` drives headless Chrome over the DevTools protocol and writes PNGs:
  - on the Mac it uses ANGLE/Metal (the delivery renderer);
  - on the server it uses SwiftShader, for compile and framing checks only.

**Timing.**

- Every explanatory event is keyed to the real aligned narration (`narration/timing.json` → `web/engine/events.js`), not to fixed seconds. Examples: the Ping on 空气, the slam on 压, the gap opening on 敞开, the jets on 喷.
- `voice.js placeClips` places the clips the same way for picture and sound.

**Sound.**

- `tools/score.mjs`: an original procedural score and sound design, timed from the same events.
- `tools/mix.mjs`: the real voice plus the score → a −14 LUFS / −2.0 dBTP master. It refuses an estimated voice, hash mismatches and truncated lines.
- The master is byte-identical across machines (sha256 `8f4d2dbb…`).

**Geometry.** The car, ramp and poses come from the existing v4 inferred fit, exported to `web/assets/` by `geometry/` and not refitted. Fit coordinates are internal and are not Tesla CAD.

## Render (Mac, from this folder)

```sh
node tools/render.mjs --gl metal --http --scale 1 --sub 8 --vol 1 --steps 48 --frames 0-1691 --format png \
  --out "$PWD/out/full/frames" --skip-existing
node tools/score.mjs --out "$PWD/out/audio/score.wav"
node tools/mix.mjs --score "$PWD/out/audio/score.wav" --out "$PWD/out/audio/master.wav"
# mux (exact ffmpeg line and QA): FULL_READY.md §3
```

`node tools/render.mjs --info` prints the frame count and every word-keyed event time without rendering.

## Layout

| Path | Contents |
|---|---|
| `web/` | The engine. `index.html`, `engine/` (`film.js` renderer, `timeline.js` shots and cameras, `events.js` word-keyed instants, `text.js` type, `voice.js` placement, `shaders/`), `assets/` (car, ramp, poses, kickflip lot, V5Sans fonts and licence) |
| `narration/` | `lines.zh-CN.json` (the 17 exact lines), `timing.json` (real aligned clips), `tts/` (clips, word boundaries, synthesis record) |
| `tools/` | `render.mjs`, `score.mjs`, `mix.mjs`, `dsp.mjs`, `contact.sh` |
| `geometry/` | The v4 fit sources and the v5 exporters (reference; not refitted) |
| `references/` | Source facts (`scientific-sources.md`), source stills, v4 code and rejected frames, the native Metal proofs |

**Documents.**

- `TREATMENT.en.md` and `storyboard.zh-CN.md`: the direction.
- `PROTOTYPE_READY.md`: V01–V05, approved on native pixels.
- `FULL_READY.md`: the full timing, proof frames, recipe and known issues.
- `CREDITS.md`: roles, materials, sources and boundaries.

## Boundaries

- This is a CG reconstruction. The sources are analysis references; no source footage is used.
- Pressure glints, beams, particles, vessels and nozzles are illustrative, not telemetry. No performance numbers or dimensions appear.
- Gravity is always world-down.
- Off the surface, only the carried gas gives a reaction. There is no antigravity, maglev, fire or sustained-flight claim.
- The two demonstrations stay separate, and the kickflip's visible lines are shown without a claim about their role.
- The sources were published 2026-10-16. The film never says 今天.

## 中文简介

《空气现形》是一支 56.4 秒的 9:16 中文科普短片（1080×1920，30 帧/秒）。片中有两个世界：

- **夜**是肉眼所见，落下的灰尘就是重力。
- **气**是空气视角：金色是借来的外界气压，冰青色是车自带的气。

全片的论证顺序是：

1. 风扇抽走车底缝里的空气；
2. 外面的空气把车压在坡上，轮胎因此抓得住；
3. 顶板到了尽头，缝口敞开，压差消失；
4. 车改用自带的高压气，向下喷，车被往上推。

翻转段是另一场演示，以黑场分隔，可见细线保留并注明「作用未公开」。

画面由确定性 WebGL 引擎逐帧生成，事件按实测配音的词时间触发，配乐为原创程序合成。所有气流和受力图形都是原理示意，不是实测数据，也不是厂商 CAD。分工与来源见 `CREDITS.md`。
