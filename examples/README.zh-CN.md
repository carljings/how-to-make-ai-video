# 作品示例

[English](README.md) · **简体中文**

用本指南的方法做出来的真实作品。标注为*私有*的仓库只有所有者能看到。

| 作品 | 路线 | 规格 | 制作方式 | 位置 |
|---|---|---|---|---|
| **The History of AI in 120 seconds** | B · 代码 | 16:9 · 1080p60 · 2:00 | 画布动画由无头 Chrome 截取（Python + Playwright）；配乐和音效用 Python 合成；母带 −14 LUFS | [carljings/ai-history-video](https://github.com/carljings/ai-history-video)（[MP4](https://github.com/carljings/ai-history-video/releases/download/v1.0/ai_history.mp4)） |
| **熵 · Borrowed Light** | B · 代码 | 16:9 · 1080p30 · 2:50 | 对一支讲熵的参考视频做电影化重制：`render(t)` 画布帧 + Web Audio 配乐，与 [`starter/`](../starter/README.zh-CN.md) 同一个引擎 | [carljings/entropy-video PR #1](https://github.com/carljings/entropy-video/pull/1)（*私有*） |
| **《半仙下山》第一集** | A · 生成 | 9:16 · 768p · 3:16 | 剧本 → 2 张角色定妆图 + 5 张场景图 → 16 段 10–14 秒，每段按固定顺序挂参考图生成一次（MiniMax，原生音频）→ 硬切合成清单 | [carljings/Toonflow](https://github.com/carljings/Toonflow)（*私有*） |
| **137.5°** | B · 代码 | 16:9 · 1080p30 · 2:30 | 没有任何参考素材的原创作品：向日葵的种子、斐波那契数、会留下空隙的错误角度、松果、菠萝和多肉，以及一个自己找到 137.5° 的生长模拟。旋律由种子的角度演奏；中英双语字幕 | [`137.5/`](137.5/README.md) · [▶ MP4](https://github.com/carljings/how-to-make-ai-video/releases/download/film-137.5/137.5.mp4) |
| **入门短片：*How to make AI video*** | B · 代码 | 16:9 · 1080p30 · 0:15 | 610 颗按黄金角排列的种子汇聚成标题；种子数每到一个斐波那契数就响一声钟 | [`starter/`](../starter/README.zh-CN.md) |

## 每部作品的经验

**The History of AI**：时间线式的片子。每章一个画面，配乐每章一段；音效按渲染器导出的时间点清单放置，所以画面和声音不会错位。

**熵 · Borrowed Light**：重制一支参考视频。研究参考片的结构（几幕、节拍、时长）并保留下来，然后用你自己的视觉语言重画每一帧。引擎的抽帧拼图让每一幕都能在不完整渲染的情况下检查。

**137.5°**：一个原创想法，做得严谨。一条规则同时驱动画面、音乐和事实：种子的角度决定音符，所以错误的角度*听起来*是一段短循环，黄金角则是一段永不重复的旋律。[`STORYBOARD.md`](137.5/STORYBOARD.md) 写明了五幕结构和屏幕上的每一个事实，[`CREDITS.md`](137.5/CREDITS.md) 列出了科学来源。源码用四条命令就能重新生成整部片子。

**《半仙下山》**：整个故事里保持一致。生成任何镜头之前先锁定参考图，每一段都按相同顺序挂参考图，每个片段只放一个动作，并记录制作日志，这样超时的生成永远不会付两次钱。
