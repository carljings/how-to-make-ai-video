# 8 · GitHub 上的技能、插件与工具

[English](../08-skills-plugins-tools.md) · **简体中文**

用 Claude Code 这类 AI 助手做 AI 视频，GitHub 上有什么可用：装什么、读什么，以及这些项目能教会我们什么。调研时间 **2026 年 10 月 6 日**，星数和许可证均为当天在 GitHub 上核对；这里列出的东西都没有在编写本指南的机器上安装过。

## 四种扩展

| 类型 | 是什么 | 在 Claude Code 里怎么装 |
|---|---|---|
| **技能（Skill）** | 一个带 `SKILL.md` 的文件夹：任务匹配时，AI 助手会加载其中的说明和脚本 | `npx skills add <owner/repo>` |
| **插件（Plugin）** | 打包好的技能、命令，有时还带 MCP 服务器，可自动更新 | `claude plugin marketplace add <owner/repo>`，再 `claude plugin install <名称>@<市场>` |
| **MCP 服务器** | 连接器，让 AI 助手能操作某个应用或 API（视频模型、ComfyUI、剪辑软件） | `claude mcp add <名称> -e KEY=value -- <命令>` |
| **命令行工具（CLI）** | 一个命令行程序，AI 助手像运行其他命令一样运行它 | `npm install -g …`，或厂商提供的安装脚本 |

**安装前先读一遍。** 技能和插件以 AI 助手的权限运行，能访问你的文件和密钥。优先选官方仓库（做这个工具的公司自己发布的），看许可证，先浏览一下 `SKILL.md` 和里面的脚本。

## 用代码画视频（路线 B）

这些是本指南 [`starter/`](../../starter/README.zh-CN.md) 的"工业版"：片子是时间的函数，用网页代码写，渲染成 MP4。

| 项目 | ★ | 许可证 | 提供什么 |
|---|---|---|---|
| **[HyperFrames](https://github.com/heygen-com/hyperframes)**（HeyGen） | 57.4k | Apache-2.0 | HTML + CSS + 可拖动的动画 → 确定性的 MP4。**官方 Claude Code 插件**，含 21 个技能：`/hyperframes` 总入口，加上产品发布视频、无真人讲解视频、PR 转视频等工作流。规划 → 写 HTML → 检查 → 预览 → 渲染 |
| **[Remotion](https://github.com/remotion-dev/remotion)** + **[remotion-dev/skills](https://github.com/remotion-dev/skills)** | 62.1k · 4.9k | Remotion 许可证：个人、非营利组织和 3 人以内的公司免费；更大的公司需付费 | 把视频写成 React 组件；官方技能覆盖新建、编写、Studio 预览和渲染 |
| **[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)** | 10.4k | Apache-2.0 | 用 Remotion 做电影感产品视频的 Claude Code / Codex 技能：157 张镜头配方卡、214 种风格、卡点剪辑、音效，交付后还能在浏览器工作台里继续改。姊妹项目 **video-talkcraft** 做口播/旁白视频 |
| **[brag](https://github.com/latent-spaces/brag)** | 13.7k | MIT | `/brag` 把你刚做好的项目变成一支带音乐和分享文案的短发布视频（基于 HyperFrames） |
| **[html-video](https://github.com/nexu-io/html-video)** | 4.6k | Apache-2.0 | 在本机把 HTML、CSS 和数据变成 MP4，为编程助手设计 |
| **[video-spec-builder](https://github.com/feicaiclub/video-spec-builder)** | 1.0k | MIT | 像导演一样追问：直到"我想做个视频"变成一份精确到秒的 `video-spec.md`，再交给 HyperFrames 渲染 |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) · [Manim](https://github.com/ManimCommunity/manim)（[3b1b 版](https://github.com/3b1b/manim)） | 19.2k · 41.3k（94.6k） | MIT | 代码动画引擎；Manim 是数学讲解视频的标准工具 |

## 生成式视频（路线 A）

**通过官方渠道，让 AI 助手直接生成：**

| 项目 | ★ | 许可证 | 提供什么 |
|---|---|---|---|
| **[MiniMax CLI `mmx`](https://github.com/MiniMax-AI/cli)**（官方） | 2.2k | 未注明 | 在终端或 AI 助手里生成文本、图片、**视频**、语音和音乐。支持 **MiniMax-H3**，可传首帧、`--reference-image` 和 `--reference-video`。作为技能安装（`npx skills add MiniMax-AI/cli -y -g`）或 `npm install -g mmx-cli`。需要 MiniMax Token Plan；国内账号用 `api.minimaxi.com` |
| **[MiniMax-MCP](https://github.com/MiniMax-AI/MiniMax-MCP)**（官方） | 1.6k | MIT | 以 MCP 工具形式提供同样的 MiniMax 能力。MiniMax 现在更推荐上面的 CLI |
| **即梦 CLI** `dreamina`（官方） | — | — | 在命令行里用 Seedance；见[第 6 章](06-platforms-compared.md) |
| **[libtv-skills](https://github.com/libtv-labs/libtv-skills)**（官方） | 1.1k | MIT（README 标注） | 让 AI 助手调用 LibTV 的 20 多个模型；见[第 6 章](06-platforms-compared.md) |
| **[comfyui-mcp](https://github.com/artokun/comfyui-mcp)** | 0.8k | MIT | 用任意大模型驱动本地 ComfyUI：38 个 MCP 工具、42 个技能（WAN、LTX、MiniMax H3……）。目前仅有限维护 |
| [Pixelle-MCP](https://github.com/ATH-MaaS/Pixelle-MCP) | 1.1k | MIT | 把 ComfyUI 工作流封装成 MCP 工具；最后更新于 2025 年 12 月 |

**懂得如何"指导"模型的技能：**

| 项目 | ★ | 许可证 | 提供什么 |
|---|---|---|---|
| **[h3-storyboard-skill](https://github.com/phileiny/h3-storyboard-skill)** | 175 | MIT | 剧本 → **MiniMax H3** 分镜，表演真的能演出来；每条规则都注明了怎么验证的（[见下方经验](#这些项目教会了什么)） |
| [short-drama-production](https://github.com/suihe1/short-drama-production) | 177 | Apache-2.0 | 一个跑完整条 H3 短剧管线的 Codex 技能：大纲、角色、美术、剧本、技术分镜、H3 任务、声音、粗剪、质检。README 里带有推广链接 |
| [seedance-prompt-skill](https://github.com/songguoxs/seedance-prompt-skill) | 2.9k | 无 | 把创意变成结构化的 Seedance 2.0 中文提示词（十种模式：一致性、运镜复刻、视频延长、声音……） |
| [awesome-seedance](https://github.com/LearnPrompt/awesome-seedance) | 1.7k | MIT | 600 多个 Seedance 2.5 / 2.0 提示词案例，都能追溯到原帖 |
| 短剧技能包 | | | [shuohao-skills](https://github.com/eternityspring/shuohao-skills)、[drama-skills](https://github.com/zenstory-ai/drama-skills) 等，见[第 7 章](07-tools-like-toonflow.md) |

## 剪辑与成片

| 项目 | ★ | 许可证 | 提供什么 |
|---|---|---|---|
| **[ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill)** | 1.9k | MIT | `npx ffmpeg-skill`：给 Claude Code / Cursor / Codex 的 42 个 FFmpeg 工具（也可作为 MCP），先探测 → 再编辑 → 最后核验，离线可用，有 53 个前后对比示例 |
| [Pireel](https://github.com/pireel/pireel) | 1.3k | AGPL-3.0 | 开源的剪映式编辑器（画布 + 时间线），AI 助手可通过 MCP 操作 |
| [hyperframes-student-kit](https://github.com/nateherkai/hyperframes-student-kit) | 1.2k | 自定义 | 14 个技能，用 Claude Code 或 Codex 在 HyperFrames 上剪口播、Reels 和 Shorts |
| [VideoLingo](https://github.com/Huanshere/VideoLingo) | 18.7k | Apache-2.0 | 字幕切分、翻译、对齐和配音 |
| [NarratoAI](https://github.com/linyqh/NarratoAI) | 11.3k | MIT | 用 AI 给已有素材做解说和剪辑 |
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 128.7k | MIT | 主题 → 文案 → 素材、配音、字幕、音乐 → 短视频 |

## 可以自己运行的开放模型

以下都需要一块性能强的 NVIDIA 显卡。商用前先看许可证：有几个是自定义许可证。

| 项目 | ★ | 许可证 | 说明 |
|---|---|---|---|
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | 136.2k | GPL-3.0 | 大多数开放视频模型都在这个节点式应用里运行 |
| [Wan 2.2](https://github.com/Wan-Video/Wan2.2)（阿里，通义万相） | 17.7k | Apache-2.0 | 文 / 图生视频；ComfyUI 里用 [ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper)（6.7k） |
| [LTX-2](https://github.com/Lightricks/LTX-2)（Lightricks） | 9.6k | 自定义 | 音频和视频一起生成；附带 LoRA 训练器 |
| [HunyuanVideo](https://github.com/Tencent-Hunyuan/HunyuanVideo) · [1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5)（腾讯混元） | 12.6k · 4.6k | 自定义 | 1.5 是轻量版 |
| [Open-Sora](https://github.com/hpcaitech/Open-Sora) | 29.9k | Apache-2.0 | 开放的训练和推理代码 |

## 阅读清单

| 项目 | ★ | 适合 |
|---|---|---|
| [awesome-video-generation](https://github.com/AlonzoLeeeooo/awesome-video-generation) | 786 | 按主题整理的研究论文 |
| [awesome-text-to-video](https://github.com/jianzhnie/awesome-text-to-video) · [video-generation-survey](https://github.com/yzhang2016/video-generation-survey) | 747 · 731 | 综述和阅读清单 |
| [awesome-ai-video-models](https://github.com/Anil-matcha/awesome-ai-video-models) | 199 | 哪个模型、通过哪个 API、什么价格 |
| [lanshu-awesome-ai-video-kit](https://github.com/cclank/lanshu-awesome-ai-video-kit) | 412 | 来自真实客户项目：411 条提示词、15 个模型、7 个 Claude 技能、14 篇方法论 |

## 这些项目教会了什么

值得带进自己工作里的经验，以及出处：

1. **一个镜头只放一个表情节拍（MiniMax H3）。** 一个 7 秒特写里塞 9 个表情节拍时，H3 会把它们"平均"掉，脸几乎不动，而且不报任何错。拆成 2–3 秒的短镜头、每个一个主节拍，表情就都演出来了。加一句台词效果更好，因为 H3 会给有台词的镜头分配更多帧。大幅度的肢体动作（打斗、被击退）一个镜头可以容纳多得多的节拍。*出处：h3-storyboard-skill，固定 seed 和参考图的对照实验，2026 年 8 月 26 日和 10 月 3 日。*
2. **先构图，后内容。** 先决定观众要感受到什么，再决定机位，最后才决定画面里发生什么。居中、平视的中性构图，提示词写得再好看起来也像采访。*出处：h3-storyboard-skill。*
3. **分镜之前先把想法问清楚。** 不接受"高级感""冲击力"这种词，直到它们变成具体的、带时长的镜头。这就是本指南的[简报 → 分镜](01-pipeline.md)环节，只是以对话的方式完成。*出处：video-spec-builder。*
4. **追踪哪些已经过期。** 角色图或场景一改，所有用它做出来的镜头都过期了。[制作日志](../../templates/zh-CN/production-log.md)里已经记录了每个镜头用的参考图；某张参考图改了，就把用过它的镜头全部标为待重新审核。*出处：short-drama-production（它会自动追踪）。*
5. **HTML 已经成为 AI 助手画视频的标准方式。** HyperFrames、Remotion 的技能和 html-video，都把[第 3 章](03-path-b-code.md)的循环固化了下来：可拖动的动画、检查、预览、渲染。
6. **AI 助手靠官方命令行工具来生成。** MiniMax 的 `mmx` 和即梦的 `dreamina` 都把视频生成变成一条 AI 助手能运行、能轮询的命令，用的是你自己账号的额度。用它们，不要用逆向出来的"免费 API"代理。

## 适合本指南工作流的入门套装

如果你用 Claude Code 两种视频都做，这四个就覆盖了大部分工作：

| 需求 | 安装 | 命令 |
|---|---|---|
| 用代码画视频 | HyperFrames 插件 | `claude plugin marketplace add heygen-com/hyperframes`，再 `claude plugin install hyperframes@hyperframes` |
| 让 AI 助手生成 MiniMax H3 镜头 | MiniMax CLI 技能 | `npx skills add MiniMax-AI/cli -y -g`（需要 Token Plan 和 API 密钥） |
| 指导 H3 的表演 | h3-storyboard 技能 | `npx skills add https://github.com/phileiny/h3-storyboard-skill --skill h3-storyboard` |
| 在本地剪辑和成片 | ffmpeg-skill | `npx ffmpeg-skill` |

之后继续用本指南的 [`tools/review.sh`](../../tools/review.sh) 做抽帧拼图，用 [`tools/stitch.sh`](../../tools/stitch.sh) 拼接并统一响度。
