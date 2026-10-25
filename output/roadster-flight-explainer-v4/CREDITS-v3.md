# Credits and source boundaries / 分工与素材来源 (v3 「比墙还陡」)

**Director and primary author: Claude Code / Opus 5.5** (`claude-opus-5-5`, effort `max`). The user delegated aesthetic and editorial leadership to Opus and confirmed one combined film. Opus authored:

- the v3 direction, storyboard, the 155-character script and the voice choice;
- the edit and cue table;
- the ramp geometry, contact and source-fitted motion (`blender/v3_ramp.py`);
- the film state, cameras, per-section light and set-emission looks, the cross-section mode and the projected overlay physics (`blender/v3_film.py`);
- the Blender v3 renderer (`blender/render_v3.py`);
- the Remotion picture, vector graphics, typography, post effects and covers (`src/v3/`);
- the procedural score and mix (`scripts/v3/score.mjs`).

v3 reuses Opus's earlier car model, plume, cloud, x-ray and DSP code as libraries.

**Codex: tools, rendering, packaging and independent technical review.** Codex:

- ran the free edge-tts synthesis of the locked lines and measured trims, durations and word boundaries;
- built the Noto Sans SC subsets (300/500/600/700/900) and their coverage audit;
- prepared the native 1080 source reference and the v2 plate availability and hash manifest;
- ran the local Blender 5.2 / Apple M4 Metal renders;
- wrote the finalize, stills and verify packaging;
- reviewed the facts, physics wording and encoded output, including the L08/L09 wording corrections.

Codex did not set v3's aesthetics.

**导演与主要作者：Claude Code / Opus 5.5。** 用户把审美和剪辑决定权交给 Opus，并确认做成一部合片。方向、分镜、文案、配音选择、剪辑、坡道几何与拟合运动、机位、灯光、剖面、矢量图形、字体排版和配乐均由 Opus 编写。**Codex 的工作：** 配音合成与测量、字体子集、原片参考与 v2 素材清单、本地渲染、打包脚本、事实与成片技术验收。Codex 没有决定 v3 的审美。

## References

- [Tesla, "The Ramp | Roadster", 2026-10-16](https://www.youtube.com/watch?v=7p5LxFdc-Qg). Frames were analysed for the ramp shape, set, motion, jets and camera views. No source footage is distributed or shown.
- [Elon Musk, 2026-10-16, kickflip post](https://x.com/elonmusk/status/2110913107094606330), media `2110913027490934784`. This is a separate demonstration. Its picture comes from v2's clean CG plates, reused 1:1.
- [Tesla: active aero, multi-mode suction and cold-gas thrusters](https://x.com/Tesla/status/2110907035571401174) and [Tesla: pressure vessels](https://x.com/Tesla/status/2110904290743402880). These are manufacturer statements, attributed on screen and not independently verified.
- [NASA Glenn, air pressure](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/air-pressure/). Used only for the general principle that pressure acts normal to every surface.

The car, ramp, venue, jets and cloud are procedural code assets. No official Tesla 3D model is used. Poses, the ramp profile and cameras are visual fits.

## Voice, fonts and sound

- **Narration:** Microsoft `zh-CN-YunjianNeural`, rate −6%, via free edge-tts. There is no speed change after synthesis; only exterior silence is trimmed. Clips, hashes and word boundaries are in `support/narration-v3/`.
- **Type:** Roadster Film Sans, a subset of Noto Sans SC (SIL Open Font License, `public/fonts/roadster/OFL-NotoSansSC.txt`). Weights are real 300/500/600/700/900 faces.
- **Score:** synthesised in code (`scripts/v3/score.mjs`). It uses no samples and no licensed music. The master is −14 LUFS integrated with true peak ≤ −1.5 dBTP.

No paid media, assets or APIs were used. Nothing was published. Human listening and phone viewing are separate acceptance steps.
