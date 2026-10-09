# 作品示例

[English](README.md) · **简体中文**

用本指南的方法做出来的真实作品。标注为*私有*的仓库需要相应GitHub访问权限。

用户已用Opus 5.5完成AI History、熵增、中微子三部练手科普作品，下一阶段制作新的作品。2026年10月8日已通过GitHub API核对其源码与成片资产；中微子CREDITS亦记录了模型署名。以下规格来自仓库文档/代码，本轮未重新播放或探测视频，也未完整审查科学结论。

**面向观众发布在抖音，GitHub用于项目与版本归档。** 用户提供的抖音主页截图可见这三部作品；2026年10月8日收到的截图显示播放计数分别为中微子208、熵增653、AI History224。截图拍摄时刻与各片发布时间未知，仅作快照记录；抖音上传版本与GitHub母版是否相同尚未核对。

| 作品 | 路线 | 规格 | 制作方式 | 位置 |
|---|---|---|---|---|
| **The History of AI in 120 seconds** | B · 代码 | 16:9 · 1080p60 · 2:00 | 画布动画由无头 Chrome 截取（Python + Playwright）；配乐和音效用 Python 合成；母带 −14 LUFS | [carljings/ai-history-video](https://github.com/carljings/ai-history-video)（[MP4](https://github.com/carljings/ai-history-video/releases/download/v1.0/ai_history.mp4)） |
| **熵 · Borrowed Light** | B · 代码 | 16:9 · 1080p30 · 2:50 | 对一支讲熵的参考视频做电影化重制：`render(t)` 画布帧 + Web Audio 配乐；成片与remake源码已在main | [carljings/entropy-video](https://github.com/carljings/entropy-video) · [重制MP4](https://github.com/carljings/entropy-video/blob/main/entropy-remake.mp4)（*私有*） |
| **ν · 中微子 · The Ghost Particle** | B · 代码 | 16:9 · 1080p30 · 3:12（v1.2） | Opus 5.5辅助分镜/代码；Canvas画面、Web Audio声音、Chrome/ffmpeg；中英字幕、独立SRT、模块化场景与版本返工 | [carljings/neutrino-film](https://github.com/carljings/neutrino-film) · [v1.2成片/字幕/封面](https://github.com/carljings/neutrino-film/releases/tag/v1.2)（*私有*） |
| **《半仙下山》第一集** | A · 生成 | 9:16 · 768p · 3:16 | 剧本 → 2 张角色定妆图 + 5 张场景图 → 16 段 10–14 秒，每段按固定顺序挂参考图生成一次（MiniMax，原生音频）→ 硬切合成清单 | [carljings/Toonflow](https://github.com/carljings/Toonflow)（*私有*） |
| **137.5°** | B · 代码 | 16:9 · 1080p30 · 2:30 | 没有任何参考素材的原创作品：向日葵的种子、斐波那契数、会留下空隙的错误角度、松果、菠萝和多肉，以及一个自己找到 137.5° 的生长模拟。旋律由种子的角度演奏；中英双语字幕 | [`137.5/`](137.5/README.md) · [▶ MP4](https://github.com/carljings/how-to-make-ai-video/releases/download/film-137.5/137.5.mp4) |
| **入门短片：*How to make AI video*** | B · 代码 | 16:9 · 1080p30 · 0:15 | 610 颗按黄金角排列的种子汇聚成标题；种子数每到一个斐波那契数就响一声钟 | [`starter/`](../starter/README.zh-CN.md) |

## 每部作品的经验

AI History另有[5分钟中英双语版](https://github.com/carljings/ai-history-video/releases/tag/5min-v1.0)，源码在[5min分支](https://github.com/carljings/ai-history-video/tree/5min)；不要将2分钟版规格直接套用到另一版本。

**The History of AI**：时间线式的片子。每章一个画面，配乐每章一段；音效按渲染器导出的时间点清单放置，所以画面和声音不会错位。

**熵 · Borrowed Light**：重制一支参考视频。研究参考片的结构（几幕、节拍、时长）并保留下来，然后用你自己的视觉语言重画每一帧。引擎的抽帧拼图让每一幕都能在不完整渲染的情况下检查。

**中微子**：同一时间线组织画面、字幕、章节与声音，保留科学来源、场景代码、局部带声音预览、抽帧检查和续渲。v1.2发布说明记录了结尾停顿、标题形成、首尾呼应与音乐收束的修改；这些是可复用的返工方法。本轮确认的是文件与发布资产存在，未据此判定画质或科学准确性；涉及近期奖项等时效结论仍需逐条核对权威来源。

**137.5°**：一个原创想法，做得严谨。一条规则同时驱动画面、音乐和事实：种子的角度决定音符，所以错误的角度*听起来*是一段短循环，黄金角则是一段永不重复的旋律。[`STORYBOARD.md`](137.5/STORYBOARD.md) 写明了五幕结构和屏幕上的每一个事实，[`CREDITS.md`](137.5/CREDITS.md) 列出了科学来源。源码用四条命令就能重新生成整部片子。

**《半仙下山》**：整个故事里保持一致。生成任何镜头之前先锁定参考图，每一段都按相同顺序挂参考图，每个片段只放一个动作，并记录制作日志，这样超时的生成永远不会付两次钱。
