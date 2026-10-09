# 创作与来源

- 选题、参考、分镜确认和品质参照：用户。
- V2场景、镜头、排版、音频整合与制作验证：Codex辅助实现；未成功调用新的Opus 5.5。
- 绘制方法：改编用户自有 `carljings/neutrino-film` 的 `src/gfx.js` 光效精灵、景深、多尺度泛光和暗角，调整为1080×1920；新增树突形体、透视投影、镜头与本片场景。公开交付保留本片实际使用的改编代码；其他项目的基准源码副本留在本地。没有复用中微子成片画面或音轨。
- 选题参考：用户提供的@浙大优学·方法导引光遗传学录屏。仅作主题与表达参考，未使用其画面、界面、水印或音轨。
- 科学事实：[scientific-sources.md](scientific-sources.md)。原始研究、工具说明、早期单例临床报告和奖项记录均保留出处与限制。
- 中文字体：Noto Sans SC与Noto Serif SC本片子集，SIL Open Font License；见fonts/OFL-NotoSansSC.txt和OFL-NotoSerif.txt。英文Inter与JetBrains Mono许可也保存在fonts/。
- 中文旁白：Microsoft在线合成声音 `zh-CN-YunxiNeural`，由[edge-tts](https://github.com/rany2/edge-tts)生成；无真人声音克隆。实际片段和测量时序在voice/；声音不是Opus模型生成。
- 配乐与提示音：Web Audio离线合成，不使用参考片配乐。旁白与配乐在同一75秒时间线上混合后统一母带处理。
- 浏览器控制：puppeteer-core，固定版本见package-lock.json。

所有细胞、膜、眼球与动物形体均为简化示意，不是分子结构测量、真实实验录像或患者视野录像。
