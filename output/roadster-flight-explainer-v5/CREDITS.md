# Credits / 分工与来源 — Roadster v5 《空气现形》 AIR, REVEALED

**制作状态（2026-10-18）**

- 画面源已冻结：`web/engine/timeline.js` `79b0e906…`，`web/engine/text.js` `220c319f…`。
- 原生 Metal 体检 bodyproof02 已通过：Codex 实际渲染并查看了 24 帧。
- 完整渲染与编码已完成：1692 帧，原生 1080×1920，30 帧/秒；实际MP4检查见QA.md。
- 源快照归档 sha256 `25c975ebb05e0a2da8245ea854dda1b467c605e07a46329bae7132de46be404f`。
- 完整音频已定稿。
- 尚未记录人工试听、实际手机观看或用户审美认可。

## 分工

- **Opus 5.5**（导演；人类明确授权的创作主导）负责：
  - 《空气现形》创意方案与分镜；
  - 17 句中文旁白文本；
  - WebGL 引擎中的场景、镜头、粒子、受力图形、排版，以及按词定时的事件；
  - 原创程序配乐、音效与混音链路代码。
- **Codex** 负责：
  - 原片与科学核查；
  - 配音合成与对齐；
  - 字体子集制作与覆盖校验；
  - 本地原生 Metal 渲染、编码与质检，包括离线 Whisper 语音识别检查。

## 素材

- **中文旁白**
  - 免费 edge-tts 7.3.1，音色 zh-CN-YunjianNeural，语速 +0%。
  - 17 段逐句合成，48 kHz 单声道，语音合计 39.92 秒。
  - 仅裁去外部静音，未变速、未移调。词时间来自 Edge WordBoundary。
- **字体**
  - V5Sans 是 Noto Sans SC 官方字体源的静态子集：300/500/700/900 四个字重，710 个码位。
  - 授权为 SIL OFL 1.1，见 `web/assets/fonts/OFL-NotoSansSC.txt`。
  - 画面全部 141 个字符四个字重均覆盖，无系统字体回退。
- **音乐和音效**
  - 由 Opus 编写的代码程序合成（`tools/score.mjs`、`tools/dsp.mjs`），与画面共用同一套按词定时事件。
  - 没有使用商业音乐、采样或付费生成式媒体。
- **车辆、坡道与姿态**
  - 沿用 v4 已有的推断拟合（`geometry/`），本版只导出、没有重新拟合。
  - 内部坐标不是特斯拉官方 CAD。
- **混音结果**
  - 56.4 秒（1692 帧），−14.1 LUFS，−2.1 dBTP。
  - 母带 sha256 `8f4d2dbb7a0e2e8e84a94a1488e095b13227f5fa8a7f8f117baf00a126cd83d0`：服务器构建与本地构建逐字节一致。
- **语音识别检查**
  - 离线 Whisper small 能识别全部 17 句，个别字有同音或近音差异；无缺句，无尾部幻听。
  - 这是自动检查，不代表人工试听。

## Source references / 原片依据

- Tesla, *The Ramp | Roadster*（2026-10-16）：https://www.youtube.com/watch?v=7p5LxFdc-Qg
- Musk 翻转原帖（2026-10-16）：https://x.com/elonmusk/status/2110913107094606330
- Tesla 机构描述：https://x.com/Tesla/status/2110907035571401174
- Tesla 压力容器描述：https://x.com/Tesla/status/2110904290743402880
- Tesla 发布会：https://www.youtube.com/watch?v=qt5p-_tE8d0 。自动字幕中的性能数字未经确认，不进入成片。
- NASA, Air Pressure：https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/air-pressure/
- NASA, Newton's Third Law：https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-third-law-action-reaction/
- NASA, Small Spacecraft Propulsion（冷气推进）：https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/

## 边界

**原片的用途**

- 原片只作分析与动作参照。成片画面全部由代码重建，没有插入原片画面。

**示意与数据**

- 以下内容均为原理示意：气流粒子、压力闪点、金色力束、冰青色储气、喷口位置与偏心推力。
- 它们不是特斯拉工程 CAD、实测 CFD 或性能数据。
- 画面上没有性能数字，也没有尺寸。

**物理表述**

- 重力始终竖直向下。
- 车底缝隙压力降低后，外侧空气把车压向坡面，并增加轮胎抓地。
- 缝口在顶板尽头敞开后，压差随之消失。
- 储气向下喷出，车受到反向推力。
- 片中没有反重力、磁悬浮或喷火的说法与画面。

**两场演示**

- 坡道与翻转是两场不同的演示，中间以黑场明确分开，不制造连续动作。
- 翻转段的可见细线保留在画面中，并注明「画面中可见细线，作用未公开」，不判断其承重作用。

**日期**

- 来源发布于 2026-10-16，片中不称「今天」。
- 详细来源边界见 `references/scientific-sources.md`。

## English

**Status (2026-10-18).**

- The picture source is frozen (`timeline.js` `79b0e906…`, `text.js` `220c319f…`).
- Native Metal bodyproof02 passed: Codex rendered and viewed 24 frames.
- The full capture and encode are complete:1692frames,native1080×1920. Actual encoded-film checks are in QA.md.
- Source archive sha256 `25c975ebb05e0a2da8245ea854dda1b467c605e07a46329bae7132de46be404f`.
- The audio is final.
- No human listening, physical-phone viewing or user aesthetic acceptance is claimed yet.

**Roles.**

- **Opus 5.5** (director, with art direction explicitly delegated by the human):
  - treatment and storyboard;
  - the 17-line Chinese narration script;
  - the WebGL engine's scenes, cameras, particles, force graphics, type and word-keyed events;
  - the original procedural score, sound design and mix-chain code.
- **Codex:**
  - source and physics review;
  - voice synthesis and alignment;
  - font subsetting and coverage validation;
  - native Metal rendering, encoding and QA, including an offline Whisper speech check.

**Materials.**

- **Narration:** free edge-tts 7.3.1, zh-CN-YunjianNeural, rate +0%. 17 clips, 39.92 s of speech, outer silence trimmed only (no stretch or pitch change).
- **Font:** a static subset of Noto Sans SC (SIL OFL 1.1). All 141 on-screen characters are covered in every weight.
- **Music and sound:** procedural code; no commercial music, samples or paid generative media.
- **Geometry:** the existing v4 inferred fit, exported but not refitted. It is not Tesla CAD.
- **Master:** 56.4 s (1692 frames), −14.1 LUFS / −2.1 dBTP, sha256 `8f4d2dbb7a0e2e8e84a94a1488e095b13227f5fa8a7f8f117baf00a126cd83d0`. The server and local builds are byte-identical.
- **Speech check:** Whisper small recognizes all 17 lines, with some homophone or near-phonetic differences, no missing line and no tail hallucination.

**Boundaries.**

- Sources are analysis references, not inserted picture plates.
- Physics graphics are illustrative, not telemetry. No performance numbers or dimensions appear.
- The two demonstrations are kept separate, with a black card between them.
- The visible lines in the kickflip stay in the picture, and their role is stated as not public.

## Final encoded delivery / 最终编码交付

56.400s；−14.1LUFS/−1.8dBTP；complete decode passed；44encoded frames viewed. MP4 SHA256 `85bc9a36c152a657bf275d75542d181aa399ed33fad14705876ac033bc3df913`. Subjective listening and physical-phone viewing remain unverified.
