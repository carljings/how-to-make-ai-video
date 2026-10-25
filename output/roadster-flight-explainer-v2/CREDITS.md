# Credits and source boundaries / 分工与素材来源 (v2 「一口气」)

**Director and primary author: Claude Code / Opus 5.5** (`claude-opus-5-5`, CLI effort `max`). The user rejected v1's look and verbosity and delegated aesthetic and editorial leadership to Opus. Opus authored:

- the v2 direction and storyboard, the 80-character script and the voice choice;
- the edit and cue table;
- the pure-Python film state, cameras, freeze and fly-in, hero lighting, frost and overlay physics;
- the Blender v2 renderer;
- the Remotion vector graphics, typography, post effects and covers;
- the procedural score and mix (`scripts/v2/score.mjs`);
- the finalize, stills and verify scripts.

v2 reuses v1's Opus-authored inferred car, lot, source-motion fit and DSP kit as libraries.

**Codex: tools, rendering and independent technical review.** Codex:

- ran the free edge-tts synthesis of Opus's locked lines and supplied exterior-trim, duration, WordBoundary, phrase and offline ASR checks;
- built the Noto Sans SC subsets (300/600/900) and their coverage audits;
- synced the project and ran the local Blender 5.2.2 / Apple M4 Metal renders;
- researched the shadow-pool resources;
- checked the compiler, math and encoded output;
- carried over the late v1 compatibility, material and source-match fixes that v2 inherits.

Codex did not set v2's aesthetics.

**导演与主要作者：Claude Code / Opus 5.5。** 用户否定了 v1 的风格和冗长，并把审美和剪辑决定权交给 Opus。v2 的方向、分镜、剧本、配音选择、剪辑时间、机位、灯光、矢量图形、字体排版、配乐和打包脚本均由 Opus 编写。

**Codex 的工作：** 工具支持、免费配音合成与检查、字体子集、本地渲染、资源排查和技术验收。Codex 没有决定 v2 的审美。

## References

- [Elon Musk, 16 October 2026, kickflip post](https://x.com/elonmusk/status/2110913107094606330), embedded video `2110913027490934784`. Source frames were analysed for exterior, cuts, visible poses and staging. The separate ramp clip is not the motion reference. These scripts do not distribute source footage.
- [Tesla: active aero, multi-mode suction and cold-gas thrusters](https://x.com/Tesla/status/2110907035571401174) and [Tesla: pressure vessels](https://x.com/Tesla/status/2110904290743402880). These are manufacturer statements, attributed on screen; they are not independent verification.
- [NASA, In-Space Propulsion](https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/) for general cold-gas principles only.

The car, the parked vehicles, the lot, the cloud, the jets and the frost are procedural code assets. No official Tesla 3D model exists in this project. The source poses are visual fits, not a measured trajectory. The frozen-section forces, CoM, jet asymmetry and vessel layout are schematic. No tank pressure, volume, mass, thrust, endurance or nozzle count is established.

## Voice, fonts and sound

- **Narration:** Microsoft `zh-CN-YunjianNeural`, rate −6%, through the free edge-tts 7.3.1 route. There is no speed change after synthesis; only exterior silence is trimmed, with 100 ms pads. Hashes, durations and WordBoundary data are in `support/narration-v2/`.
- **Roadster Film Sans 300/600/900:** a subset of Noto Sans SC under the SIL Open Font License. Licence, provenance and coverage are in `support/fonts/`.
- **Music and effects:** deterministic code synthesis by Opus. No stock music, no generation API and no paid media.
- **Audio targets:** −14 LUFS integrated, true peak ≤ −1.5 dBTP. These are measured values, not a listening verdict. Human picture, sound and phone review is a separate gate.
