# 目前做视频的几种方式（小川科普 · 事实盘点与路线建议）

Opus 5.5，2026-10-21。只写在本机/本项目文件里能核实的事实；没找到工程文件的作品标“未核实”。没有看过已发布作品的抖音页面。

## 1. 这次三支片实际用的方式

| 片 | 方式 | 做法 |
|---|---|---|
| A · 鼓槌砸下来之前，谁会先跳？（P2） | **程序化 3D（three.js）** | 鼓皮、5600 粒米、鼓槌、Clawd 都是代码建模与运动；鼓槌每一下的力度取自原曲实测低音；自写景深/泛光后期。Chrome 无头逐帧渲染：服务器用软件 GL（SwiftShader，约 10–15 秒/帧，只用于预览），正式片在 M4 Metal（约 0.25 秒/帧） |
| B · 把这首歌卷成一盘，里面藏着3个机关（P3） | **程序化 3D + 实测数据建模** | 纸螺旋一圈 = 实测 4 小节，纸墙高度 = 实测低音，红钉 = 拍子网格；同一渲染流程 |
| C · 一听就想点头？秘密在低音里（含加长版） | **Canvas 2D 逐帧（与用户 AI 历史片同一路线）** | 每帧是时间 t 的纯函数，画在一块 canvas 上：粒子聚合、发光、滚动数字、乱码标签、时间轴、闪光、CRT 收缩；低音地面、小节方块地图都由实测数据驱动。加长版在服务器上直接渲染（Canvas 不需要 3D 加速） |

三支共同：
- 渲染器 `tools/render.mjs`：DevTools 协议驱动 Chrome，`render(t)` 后整页截图直接管道进 ffmpeg（不落盘帧），按 90 帧分块可续跑。
- 声音：只用原录屏 BGM，`tools/bgm.py` 用 numpy + ffmpeg 截取整段、一次恒定增益、末小节余弦淡出；不合成、不变速、不改调、不压低；**无旁白**。
- 字体子集打包（`tools/fonts.py`），服务器与 M4 出字一致；`tools/mux.py` 做技术校验，`tools/review.py` 从**编码成片**抽帧审片。
- **这次没有用**：Remotion、Blender、AI 视频生成、AI 配音、任何付费生成服务。

## 2. 旧作用过的方式（据项目文件）

| 作品 | 方式（证据） |
|---|---|
| AI 简史（第一版 2 分钟、5 分钟双语版） | HTML Canvas 逐帧 + Playwright 抓帧 + FFmpeg；配乐 Python 合成（`carljings/ai-history-video` README / render.py） |
| 中微子 | 代码绘制，puppeteer-core 驱动 Chrome（`/root/films/neutrino/source/package.json`：“an original code-drawn film”） |
| 光开关（光遗传学 V1/V2） | 代码动画：Puppeteer 驱动 Chrome + FFmpeg（`optogenetics-film-v2/package.json`）；V2 加生成的普通话旁白（`voice/narration.wav`） |
| Claude MV《明天会更好》V1/V2 | **Remotion**（同上 README：“built in Remotion”） |
| 特斯拉 Roadster 飞行 | 早期版本：**Blender** 重建 + **Remotion** 排字 + 程序化配乐（`roadster-flight-explainer/package.json` 描述）；v9 与重建版：自写 three.js + Canvas 2D + CDP 渲染器（当时磁盘仅约 2 GB，不装 Remotion，见 `roadster-opus-rebuild` 生产记录） |
| 本月音乐解说前几版 | three.js 3D（过山车等）+ Canvas；“上头”重制版用过 edge-tts 合成旁白（zh-CN-YunjianNeural） |
| 发明猫头像 | AI 图像生成（`how-to-make-ai-video/output/imagegen`） |
| 熵（重制版《Borrowed Light》，170 秒） | Canvas 逐帧绘制（含 canvas 里画的 3D 点云）+ Web Audio 合成声音 + Puppeteer/Chrome 抓帧 + FFmpeg（`entropy-video/remake/README.md`）。作为参考的原 `entropy.mp4` 怎么做的未核；已发布的“杯子碎了”用的是哪一版未核 |
| 诺奖经济学《一句话，让整个小镇破产了》V3（52 秒黏土小镇） | **AI 视频生成 + Remotion**：Seedance 2.5 生成镜头（含其原生中文旁白、音乐、音效），在 Remotion 里拼接并加钩子字、字幕、结尾投票（`how-to-make-ai-video/output/nobel-econ-2026-v3/package.json`；成片 39.1 MB 存在；科学内容与是否发布未核） |

用户的 `how-to-make-ai-video` 仓库把做法分成两条路：A 生成（Seedance、可灵、海螺、Vidu、Veo、Runway、Wan 等视频模型）与 B 代码（程序画每一帧、浏览器渲染、ffmpeg 编码）。两条路都实际用过：A 路见诺奖经济学 V3（Seedance 2.5 + Remotion）；特斯拉、光开关、AI 简史、中微子、熵重制版走 B 路。Remotion 和“逐帧”不是对立的两类——Remotion 本身也是浏览器逐帧渲染，它管的是时间轴与组件组织；用什么工具也不自动决定画风。

## 3. 只是备选（这次没用）

| 方式 | 擅长 | 代价 / 风险 |
|---|---|---|
| Remotion（React 时间轴） | 系列化模板、批量字幕与图表、可视化预览（Studio）、多人协作；也能拼接生成镜头（诺奖经济学 V3 就是这样做的） | 依赖与 Chromium 体积几百 MB；渲染本身仍是浏览器逐帧；对单支高定制片没有明显优势 |
| Blender | 真实光照、材质与物理（流体、布料、刚体），写实微距 | CPU 也能渲，耗时取决于场景与效果（光线追踪、体积、粒子会很慢）；建模与脚本化门槛高；改一处常要重渲很久 |
| AI 视频生成（这次没用；旧作诺奖经济学 V3 用过） | 真人、实景、动物、黏土等风格镜头，几句话出画面，还能带原生配音配乐 | 镜头间一致性、画面文字、科学准确性难控；按条付费；版权与平台标注；不适合讲精确机制 |
| AI 配音（TTS） | 省时，可做口播版 | 旁白是否提升本账号留存要靠数据测试；本项目按要求不用 |

## 4. 我对后续路线的看法

1. **主线继续走“代码绘制”**：Canvas 2D 为主，three.js 只用在需要空间感的主镜头。科普最要紧的是准确、字幕不出错、改一句只重渲一次；这次用户最后选了 C（纯 Canvas 动态图形 + 实测数据 + 小角色），说明这条路线的审美和讲解方式被接受（这是用户的主观选择，不是平台数据）。
2. **渲染看实测选机器**：3D 片放 M4（Metal，本项目约 0.25 秒/帧，一支约 4 分钟）；服务器软件 GL 约 10–15 秒/帧，只做预览与审片。Canvas 片不需要 3D 建模，但也不一定“轻”：本项目 C 在 M4 约 0.30 秒/帧、在服务器约 1.1 秒/帧（两路并行），按实测安排。
3. **把这次的东西做成可复用工具箱**：Clawd 角色、字幕系统（含字体子集）、实测音乐对拍（`measure_bgm.py`/`measure_loop.py`）、时间轴/滚动数字/方块地图组件、`mux.py`/`review.py` 质检。之后每支新片主要写场景与文案。
4. **长度与开头按数据试**：先用自己的后台留存数据确定开场改进目标。下一阶段同一题材做 25–45 秒的单问题片，第 1 帧就要有问题+动作；固定记录 2 秒跳出、5 秒留存、平均时长、完播、分享与每千次涨粉，同长度、同题材类型之间比较。
5. **需要写实时再加别的方式**：讲真实动物、人体、实验现场或做寓言风格时，可以像诺奖经济学 V3 那样用 AI 生成镜头，或用 Blender 做写实主镜头；原理部分仍用代码图层叠加，并标注“生成/示意”，先核对科学性再用。
6. **Remotion 的时机**：如果要做固定栏目、每周批量出片，可以把成熟的组件迁成 Remotion 模板；单支高定制仍用纯 Canvas。
7. 音乐授权在前面工程里已记录为未核，这里不再展开。
