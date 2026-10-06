# 7 · 类似 Toonflow 的工具：开源与闭源

[English](../07-tools-like-toonflow.md) · **简体中文**

这里说的"类似 Toonflow"，指的是 **AI 剧集制作工作台**：你输入一个故事，它建立**资产**（角色、场景、道具），把剧本拆成**分镜**，生成跨集保持一致的**镜头**（关键帧 → 视频），再**拼接**成片，通常是在无限画布上，旁边有一个 Agent。资料来自 GitHub、官网和新闻报道，调研日期 **2026 年 10 月 5 日**。这些工具是根据其 README、许可证和相关文章评估的，没有实际安装或付费使用，所有数字都是快照。

## 先选：开源还是闭源？

| | **开源**（自己运行） | **闭源**（订阅使用） |
|---|---|---|
| 上手 | 安装桌面应用或 Docker，填入你自己的模型 API 密钥 | 注册即用，无需安装 |
| 费用 | 软件免费，按次付费给各个模型服务商 | 月费 + 积分；模型有批量优惠，但促销价变化频繁 |
| 你的数据 | 留在你自己的电脑或服务器上 | 在对方的服务器上 |
| 模型 | 应用支持的任何服务商，常常也支持本地 ComfyUI | 平台接入了什么就用什么 |
| 改动 | 可以读代码、改代码、写插件 | 等对方的产品规划 |
| 投入 | 自己更新、排错、管理密钥和队列 | 对方负责 |

**"在 GitHub 上公开"不等于"开源"。** 打算用一个工具做生意之前，先看许可证：

| 许可证 | 允许什么 |
|---|---|
| **MIT**、**Apache-2.0** | 什么都可以，包括商用；保留版权声明 |
| **AGPL-3.0** | 什么都可以，但如果把修改后的版本作为服务提供给别人，必须公开你的修改 |
| **Elastic 2.0** | 可以使用、修改，也可以出售你做出来的作品；但不能把软件本身作为托管服务提供 |
| **CC BY-NC-SA** | 软件**不得商用** |
| 自定义"社区"/"可持续使用"许可证 | 要细读；通常个人免费，商用或托管有限制 |
| 没有许可证文件 | 保留所有权利；可以阅读代码，但无权复用 |

## 开源：自己运行

| 项目 | ★ | 许可证 | 运行方式 | 亮点 |
|---|---|---|---|---|
| **[Toonflow](https://github.com/HBAI-Ltd/Toonflow-app)**（你正在用的） | 16.5k | **MIT** | 桌面端（Win/Mac）、Docker、服务器 | 无限画布 + Agent、角色三视图、3D 导演台、MCP、插件市场、任意 API 或本地 ComfyUI、21 种界面语言 |
| **[火宝短剧 Huobao Drama](https://github.com/chatfire-AI/huobao-drama)** | 15.8k | CC BY-NC-SA 4.0（**不可商用**） | 网页 + Electron 桌面端 | "一句话生成完整短剧"：内置 4 个 Agent，`SKILL.md` 可在界面里编辑；批量生成角色和镜头；ffmpeg 合成与字幕 |
| **[DramaClaw](https://github.com/dramaclaw/dramaclaw)** | 6.7k | Elastic 2.0 | 本地 | 两种模式共用一个资产库：有 18 种节点和 45 种短剧风格的无限画布，以及"原稿 → 分集 → 分镜 → 视频"流水线；内置导演 Agent 驱动两者 |
| **[ArcReel](https://github.com/ArcReel/ArcReel)** | 5.3k | AGPL-3.0 | 自托管 | 小说、剧本或商品素材 → 资产 → 分镜 → 视频；关键环节人工确认，单个素材可重做、可回滚，**费用追踪**，**导出剪映草稿**继续精剪 |
| **[PRINTFILM](https://github.com/yi1108/printfilm)** | 4.1k | MIT | Docker | 漫剧分集，加上模板驱动的营销短视频（20+ 模板）；Seedance 出画面时一起生成口播；自带 `/api/v1`。2026 年 9 月新项目 |
| **[BigBanana AI Director 大香蕉](https://github.com/shuyu-labs/BigBanana-AI-Director)** | 2.3k | 自定义社区许可证 | Docker 镜像 | "剧本 → 资产 → 关键帧"，围绕角色一致性设计。新版本只通过 Docker 镜像发布，完整源码仅对付费用户提供 |
| **[本地短剧助手 LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama)** | 1.9k | MIT | 桌面端下载 | 纯 JavaScript，数据不出本机，有画布模式，支持多家服务商，包括火山引擎（Seedance） |
| **[融光 AI Fusion Video](https://github.com/Stonewuu/ai-fusion-video)** | 1.6k | MIT | Docker（Java + Next.js） | 基于 AgentScope 的 Agent 工作区，支持 Skill、MCP 和子 Agent；大模型可接 OpenAI 兼容接口、Anthropic、Gemini、DashScope 或 Ollama |
| **[CineGen AI Director](https://github.com/Will-Water/CineGen-AI)** | 0.5k | 自定义社区许可证 | 浏览器（Node） | 基于 Gemini + Veo 的"剧本 → 资产 → 关键帧 → 视频"；每个镜头一张首帧关键帧（可选尾帧） |
| **[PAI-Pro](https://github.com/Utopai-Research/pai-code)** | 0.4k | 可持续使用许可证 | 本地 / Docker | **由 Claude Code 或 Codex 驱动**：影视制作 Skill，加上画布和时间线 |
| **[AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2)** | 0.2k | AGPL-3.0 | 浏览器 | 英文；花积分之前先做 3D 镜头预演；本地 ComfyUI 或 Fal/Replicate 云端 |
| [open-canvas](https://github.com/ZeroLu/open-canvas) · [AIGCCanvasFlow](https://github.com/MaLunan/AIGCCanvasFlow) | 0.3k · 0.1k | MIT | 本地 / 组件库 | 基础组件：自带密钥的画布，以及 Vue Flow 画布编辑器 |

**用 Skill 代替应用。** 如果你更想让 Claude Code 本身充当工作台（[第 2 章](02-path-a-generate.md)的路线 A，配合 [`tools/`](../../tools/) 拼接），这些 Skill 包提供编剧和分镜的经验：[shuohao-skills](https://github.com/eternityspring/shuohao-skills)（4.2k★，Apache-2.0：角色设定、大纲、场景与道具设定、剧本、分镜拆解）、[drama-skills](https://github.com/zenstory-ai/drama-skills)（2.5k★，MIT：剧本、资产、分镜、提示词、审查）、[Emily2040/seedance-2.0](https://github.com/Emily2040/seedance-2.0)（7.5k★，MIT：Seedance 2.0 制作流水线）、[Seedance2-Storyboard-Generator](https://github.com/liangdabiao/Seedance2-Storyboard-Generator)（2.5k★，无许可证）。

## 闭源：订阅使用

### 模型厂商（自研模型 + 画布 / Agent）

| 平台 | 公司 | 最新动态 | 备注 |
|---|---|---|---|
| **即梦** | 字节跳动 | 带 Agent 的无限画布；Seedance 2.5（单段 30 秒、50 个参考素材） | 有面向 Agent 的官方 CLI。见[第 6 章](06-platforms-compared.md) |
| **小云雀** | 字节跳动 | 一句话成片的 Agent，带画布和 3D 导演台 | 用 Seedance 最便宜的入口。见[第 6 章](06-platforms-compared.md) |
| **可灵** | 快手 | **画布 Agent**（节点 + 身边的 Agent，带时间线）。可灵 4.0 于 2026 年 9 月 29 日宣布 10 月上线：单次生成 30 秒、最多 10 个关键帧、4K 10-bit HDR、21:9 | 可灵 Agent 平台：7 个以上角色 Agent，macOS 和 Windows 桌面端，四档套餐 |
| **海螺** | MiniMax | 海螺视频 Agent，现已升级为 **Media Agent**：一键成片，全球上线 | 模型：海螺 2.3 和 MiniMax H3（你的《半仙下山》片段用的就是它） |
| **Vidu** | 生数科技 | **Vidu Q3 参考生视频**（2026 年 4 月 13 日）：最多 7 个参考主体、镜头控制、中英日三语台词 | 漫剧角色一致性很强的模型，很多工作台都接入了 |
| **Seko** | 商汤 | 面向**多集**剧集的 Agent（最多 100 集）；无限画布（2026 年 6 月），带跨集资产记忆 | 高并发运行 Seedance 2.0；有对口型工具 |
| **天工短剧工作台 SkyProduction** | 昆仑万维 | 2026 年 3 月推出"导演 Agent"；2026 年 7 月 16 日起支持 Agent 智能分镜 + 无限画布 | 支持英文短剧、企业多账号 |

### 独立工作台

| 平台 | 是什么 | 备注 |
|---|---|---|
| **LibTV** | 画布工作台，20+ 模型，Agent Skills | 见[第 6 章](06-platforms-compared.md) |
| **TapNow** | 面向广告和商业内容的画布 | 见[第 6 章](06-platforms-compared.md) |
| **Flova** | 包办整部片子的 Agent | 见[第 6 章](06-platforms-compared.md) |
| **[OiiOii](https://www.oiioii.ai/)** | **动画** Agent：7 个 AI 角色（艺术总监、编剧、角色 / 场景 / 道具设计、分镜师、音效师）；全自动托管或逐步对话；160+ 风格；能把漫画分格变成动画 | 约 ¥133/月起；2026 年 7 月在美国上线 |
| **巨日禄** | 面向长剧集（100 集以上）的漫剧工厂：剧本解析、分镜、角色锁定（定妆照 + LoRA + 三视图）、配音、配乐、导出 | 通过与火山引擎合作接入 Seedance 2.0（2026 年 4 月） |

各类盘点里还会出现漫聚星球和幻舟（都属于北京先知先行科技）。关于它们只找到了推广性质的报道，所以这里不做评估。

### 海外画布工作台（英文）

| 平台 | 是什么 | 价格（第三方评测） |
|---|---|---|
| **LTX Studio**（Lightricks） | 剧本 → 多场景分镜 → 逐镜调整演员、光线和 3D 机位 → 渲染 | 免费；每月 $15 / $35 / $125 |
| **FLORA** | 面向设计师和代理公司的节点画布；50+ 模型；Character Lock 等可复用技法 | $19/月起 |
| **Figma Weave**（原 Weavy） | Figma 里的节点画布 | 每月免费 150 积分；$24/月起 |
| **Krea** | 60+ 图像和视频模型；实时画布；节点 | 免费；Pro $24/月起 |
| **Higgsfield** | 多模型，运镜控制很强；覆盖面广的全家桶套餐 | 多档 |

**Sora 已经停止服务。** OpenAI 于 2026 年 4 月 26 日关闭 Sora App，9 月 24 日关闭 API。把"Sora 2"列为平台模型的文章已经过时。

## 你已经在用 Toonflow，接下来选哪个？

| 如果你想要…… | 试试 |
|---|---|
| 继续开源、本地运行、任意模型 | **继续用 Toonflow**，它是最大、且采用 MIT 许可证的。把 MiniMax H3、Seedance 或 Vidu 加为服务商 |
| 在剪映里精剪，并按项目追踪花费 | **ArcReel**（AGPL） |
| 更丰富的画布工具，外加"原稿到分集"流水线 | **DramaClaw**（Elastic 2.0） |
| 不用管 API 密钥、做长剧集的托管工作台 | **LibTV**、**Seko** 或 **天工短剧工作台** |
| 动漫和风格化动画 | **OiiOii**，或在你的工作台里用 Vidu Q3 |
| 一个模型家族、自带画布 | **可灵**画布 Agent（可灵 4.0）或**即梦**画布（Seedance 2.5） |
| 全部从 Claude Code 驱动 | **PAI-Pro**，或上面的 Skill 包 + 本指南的 `tools/` |

决定之前，用排名前两位的选择跑**同一场 15 秒的戏**（两个角色、一句台词），比较一致性、每保留一秒的成本，以及整个流程花了多长时间。

## 资料来源

- 开源项目：各项目在 GitHub 上的 README 和 LICENSE（上文已链接），2026 年 10 月 5 日查看
- 可灵：[可灵 4.0 发布（新浪）](https://finance.sina.com.cn/roll/2026-09-30/doc-initqvci2498775.shtml) · [可灵 Agent 与画布（凤凰网）](https://tech.ifeng.com/c/8wzmAMchTDu) · [画布 Agent（搜狐）](https://www.sohu.com/a/1082222448_122014422)
- 海螺：[海螺 2.3 与 Media Agent（MiniMax）](https://www.minimaxi.com/news/minimax-hailuo-23) · [海螺视频 Agent（腾讯新闻）](https://news.qq.com/rain/a/20250620A0412G00)
- Vidu：[Vidu Q3 参考生视频（新浪）](https://finance.sina.com.cn/stock/t/2026-04-15/doc-inhuqfuz8425498.shtml)
- Seko：[无限画布（搜狐）](https://www.sohu.com/a/1033872566_122642385) · [Seko 2.0（腾讯新闻）](https://news.qq.com/rain/a/20251215A06WNA00)
- 天工：[2026 年 7 月更新（新浪）](https://finance.sina.com.cn/wm/2026-07-16/doc-inihyywc8083579.shtml) · [介绍（搜狐）](https://www.sohu.com/a/1051430053_211762)
- OiiOii：[专访（网易）](https://www.163.com/dy/article/L803BUK605566TJY.html) · [评测与价格（AniJam）](https://www.anijam.ai/blog/oiioii-ai-review/) · [美国上线](https://ohsem.me/2026/07/oiioii-ai-the-worlds-first-ai-animation-agent-platform-launches-in-the-u-s/)
- 巨日禄：[与火山引擎合作（中华网）](https://mtz.china.com/touzi/2026/0430/231351.html) · [介绍（网易）](https://www.163.com/dy/article/L15V8BPS05527PMU.html)
- 海外：[LTX Studio（The Rundown）](https://www.therundown.ai/tools/ltx-studio) · [Figma Weave 评测](https://uxmagic.ai/blog/figma-weave-review) · [FLORA 替代品](https://imaginode.ai/en/alternatives/flora) · [Krea 谈 Higgsfield](https://www.krea.ai/blog/what-is-higgsfield-ai-pricing-free-plan-and-alternatives-in-2026) · [画布工具综述（Fuser）](https://fuser.studio/articles/higgsfield-alternatives)
- Sora：[OpenAI 帮助中心](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation)
