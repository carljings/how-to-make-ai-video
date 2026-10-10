# 创作与来源 · V3

- 选题、参考录屏、品质参照与各项决定（无旁白、−10 LUFS、用 Remotion、抖音原则）：用户。
- 分镜修订、场景代码、动效、配乐、检查与文档：Claude Code（Opus 5.5），2026年10月9日。
- 绘制方法：canvas 光效（光点精灵、发光线、四分之一尺寸泛光、暗角）移植自本仓库 V2/V3 的绘制工具，后者改编自用户自有 `carljings/neutrino-film` 的 `src/gfx.js`。没有复用中微子成片的画面或音轨。
- 参考：用户提供的@浙大优学·方法导引光遗传学录屏（本地参考，未提交）。只借鉴选题和讲法（故事弧、一幕一图、字的层级、持续的节奏），没有使用其画面、界面、水印、句子或音轨。
- 配乐与音效：`src/audio/score.ts` 用 Web Audio 原创合成，不含采样或第三方音乐；无人声、无语音合成。
- 字体：Noto Sans SC、Noto Serif SC（SIL Open Font License，[public/fonts/OFL-NotoSansSC.txt](public/fonts/OFL-NotoSansSC.txt)、[OFL-NotoSerifSC.txt](public/fonts/OFL-NotoSerifSC.txt)）；JetBrains Mono（SIL OFL，[OFL-JetBrainsMono.txt](public/fonts/OFL-JetBrainsMono.txt)）。本片只保存用到的字的子集。
- 软件：[Remotion](https://www.remotion.dev/)（[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)：个人、三人及以下的公司和非营利组织可免费使用，更大的公司需要公司授权；不是 MIT）、React、esbuild、puppeteer-core、ffmpeg。版本固定在 package-lock.json。
- 科学事实：[scientific-sources.md](scientific-sources.md)。

所有细胞、膜、眼球与小鼠形体都是简化示意，不是分子结构测量、实验录像或患者视野录像。
