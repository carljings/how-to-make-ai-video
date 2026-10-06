# 6 · 六个 AI 视频平台对比

[English](../06-platforms-compared.md) · **简体中文**

即梦 · 小云雀 · LibTV · LiblibAI · TapNow · Flova，资料来自官网、新闻报道和 GitHub，调研日期 **2026 年 10 月 5 日**。这些平台的价格几乎每周都在变，而且多为促销价，请把这里的每个数字当作快照，付费前再确认一次。

> **名称说明。** *LibTV*（哩布TV）是 LiblibAI 推出的视频工作台，与 LiblibAI 本身是不同的产品。*Flova*（flova.ai）是 AI 视频 Agent，不要和 *Flowva* 混淆，后者是一个与视频生成无关的头脑风暴画布。

## 一览

| | **即梦** (Dreamina) | **小云雀** | **LibTV** | **LiblibAI 哩布哩布** | **TapNow** | **Flova** |
|---|---|---|---|---|---|---|
| **出品方** | 字节跳动（剪映 / CapCut 团队） | 字节跳动（剪映团队） | LiblibAI | LiblibAI | Tamar AI | Flova AI |
| **是什么** | 生成平台：图片、视频、数字人、无限画布 + Agent | 内容创作 Agent：一句话 → 成片 | 视频制作工作台：无限画布 + 节点工作流 | 模型社区 + 在线生成 + LoRA 训练 | 面向商业视觉的"创作操作系统" | 一站式 AI 视频 Agent |
| **自研模型** | 有：**Seedance**（视频）、**Seedream**（图片） | 字节的模型（Seedance） | 无，聚合平台 | **Star-3** 图像模型，数千个社区 LoRA | 无，聚合平台 | 无，聚合平台 |
| **视频模型** | Seedance 2.0、2.5 | Seedance 2.0、2.5 | 20+：可灵 3.0/O3、Seedance 2.0/2.5、Wan 3.0、MiniMax H3、Vidu、PixVerse…… | 聚合模型（如可灵） | Seedance 2.0/2.5、可灵 O3、Wan 3.0、Veo…… | Seedance 2.5/2.0、MiniMax H3、Veo 3.1、可灵；音乐用 Suno |
| **工作方式** | 画布 + Agent 对话，或单次生成 | 和 Agent 对话；画布、3D 导演台、智能预演 | 画布 + 节点（剧本 → 九宫格 / 25 宫格分镜 → 镜头 → 剪辑）、LibTV Agent、3D-BOX | 网页界面、ComfyUI 式工作流 | Tapflow 节点画布、从参考片反推分镜、TapTV 模板 | 对话式 Agent 当"执行导演"：剧本 → 分镜 → 镜头 → 音频 → 剪辑 |
| **Agent / API 接入** | **官方 CLI** `dreamina`（消耗你账号的积分） | 未找到 | **官方 Agent Skills** + OpenAPI 密钥、CLI | 开放 API（liblib.art/apis），以图像为主 | 无公开接口 | 无公开接口 |
| **价格参考** | 标准会员 ¥199/月含 4,000 积分（首月 ¥119）；每天免费 66 积分 | 首月 ¥39；每天送免费积分 | Seedance 2.0 720p 低至 **¥0.46/秒**（年费）；注册送 100 积分 | 7 款工具实测中最便宜（见下文） | 每月 $15 / $60 / $115 / $360（1,500–36,000 "Tapies"）；$1 ≈ 100 Tapies | Starter–Pro 套餐；年费促销 Seedance 2.5 720p 低至 **$0.045/秒** |
| **最适合** | 第一时间用上最新 Seedance；单镜头质量最好 | 最快出抖音成片；用 Seedance 最便宜的入口 | 角色固定的短剧和漫剧；多模型集中在一处；由 Agent 驱动生产 | 定制风格和角色（LoRA）；为视频准备图片素材 | 广告、TVC、电商；复刻参考广告 | 让 Agent 主导整部片子；英文界面 |

## 逐个简介

**即梦**是字节跳动的旗舰创作平台，也是其自研模型的大本营。Seedance 2.0 于 2026 年初推出，**Seedance 2.5** 于 2026 年 7 月 31 日上线：单段最长 30 秒，最多 50 个参考素材（30 张图片、10 段视频、10 段音频），支持局部编辑和原生 4K。无限画布的输入框本身就是 Agent。自 2026 年 3 月底起有了**官方命令行工具**（`curl -fsSL https://jimeng.jianying.com/cli | bash`），提供 `text2video`、`image2video`、`frames2video`、`multimodal2video` 等子命令，消耗的是你自己账号的积分，所以 Claude Code 这样的 Agent 可以直接调用生成。短板是价格和排队：2026 年初有报道称低档会员要排队数小时，而且价格涨得很快。

**小云雀**是剪映团队的 *Agent* 产品。你输入一句话，它负责策划剧本、生成镜头、配音并剪出成片（智能成片），还有数字人、短剧和营销模式、无限画布、3D 导演台和智能预演。它能用上字节最新的模型（先是 Seedance 2.0，然后是 2.5），价格比即梦低，用抖音账号登录。没有找到公开的 API 或 CLI，所以只能手动使用。

**LibTV**（2026 年 3 月 18 日上线）是 LiblibAI 针对"画布工作台"这一形态推出的产品，也是这六个里最接近 Toonflow 的。它在一张画布上把剧本变成分镜（九宫格或 25 宫格）、批量出图和出视频，还有角色三视图、多角度和重打光工具。它接入了 20 多个视频模型，可以每个镜头单独选。它同时面向人和 Agent：官方的 [`libtv-labs/libtv-skills`](https://github.com/libtv-labs/libtv-skills)（1.1k★）让 Agent 用一个访问密钥就能创建会话、发送生成指令、上传文件和下载结果。

**LiblibAI 哩布哩布**是国内最大的模型分享社区（Stable Diffusion / F.1 大模型和 LoRA、LoRA 训练、在线生成），有自研的 **Star-3** 图像模型和星流设计 Agent。对视频来说，它的价值在于**素材工坊**：为你的角色或画风训练一个 LoRA，生成一致的静帧，再交给视频模型动起来。它的开放 API（liblib.art/apis）和社区 ComfyUI 节点都以图像为主。在 2026 年 4 月的一次成本实测中，它是运行可灵 3.0 Omni 最便宜的渠道。

**TapNow**（Tamar AI，2025 年）主攻商业内容：广告、TVC、电商。最大的亮点是**反推分镜**：上传一支参考广告，它会拆解成可编辑的镜头和提示词。TapTV 有可以一键复刻的模板。它以美元定价，面向团队（最多 100 名成员、开发票、并发上限）。按标价，Seedance 2.0 720p 每秒消耗 24 Tapies，按基础充值比例约合 $0.24/秒。

**Flova** 是六个里最"Agent 优先"的：你和一个导演 Agent 对话，它负责剧本 → 分镜 → 镜头 → 音乐 / 配音 → 剪辑，并按场景选择模型（Seedance 2.5、MiniMax H3、Veo 3.1、可灵、Suno；它之前还列出过 Sora 2，而 OpenAI 已于 2026 年关闭 Sora）。套餐包含无水印导出和商用授权，目前的 Seedance 2.5 促销价是每秒最便宜的之一。没有公开 API；有社区开发的 Claude Code 插件通过浏览器操作网站。

## 每秒成本

腾讯新闻 2026 年 4 月的一次实测（同样思路，尽量统一为 15 秒、720p）结果：

| 工具 | 模型 | 每秒 ¥ |
|---|---|---|
| LiblibAI | 可灵 3.0 Omni | **0.18** |
| OiiOii | Seedance 2.0 | 0.37 |
| Vidu | Vidu | 0.42 |
| 可灵 | 可灵 3.0 Omni | 0.43 |
| 拍我AI PixVerse | PixVerse V6 | 0.48 |
| 海螺 | 海螺 2.3（6 秒，1080p） | 0.93 |
| 即梦 | Seedance 2.0（会员） | **1.38** |

2026 年 10 月 5 日看到的标价：LibTV Seedance 2.0 720p 低至 ¥0.46/秒（年费）；TapNow Seedance 2.0 720p 每秒 24 Tapies；Flova Seedance 2.5 720p 低至 $0.045/秒（年费促销）。这些数字不能直接比较（套餐、模型和折扣都不同）。唯一公平的测试是：在每个候选平台上跑**你自己的 15 秒、720p 提示词**，用花费除以你真正会保留的秒数。

## 该用哪个？

| 你想要…… | 用 |
|---|---|
| 从 Claude Code 或其他 Agent 驱动生成 | **即梦 CLI**（只有 Seedance），或 **LibTV Skills**（多模型） |
| 做一部 15 个以上片段、角色不变的短剧 / 漫剧 | **LibTV**，或开源的 **Toonflow**（见下文） |
| 做广告或复刻一支参考广告 | **TapNow** |
| 一句话、低成本拿到抖音成片 | **小云雀** |
| 最新、最好的 Seedance 效果 | **即梦** |
| 锁定自定义角色或画风 | **LiblibAI**（LoRA），再交给其他任意平台生成视频 |
| 让 Agent 用英文完成整部片子 | **Flova** |

不管选哪个，生成的镜头都和其他生成片段一样，用 [`tools/review.sh`](../../tools/review.sh) 检查、用 [`tools/stitch.sh`](../../tools/stitch.sh) 拼接，见[第 2 章](02-path-a-generate.md)和[第 5 章](05-edit-and-export.md)。

## GitHub 上看到的趋势

**1. 平台正在向 Agent 开放。** 即梦的官方 CLI（2026 年 3 月底）和 LibTV 的官方 Skills（2026 年 3 月）意味着 Agent 现在可以自己发起生成。社区在此基础上做了很多 Skill：[`yuyou-dev/dreamina-cli-skill`](https://github.com/yuyou-dev/dreamina-cli-skill)（130★）、[`PomeloR611/libtv-video-agent`](https://github.com/PomeloR611/libtv-video-agent)（九宫格分镜 → 清理画面 → 图生视频 → ffmpeg 剪辑）。

**2. 开源工具在复制画布这一形态，并且可以接入你自己的模型在本地运行：**

| 仓库 | ★ | 是什么 |
|---|---|---|
| [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) | 16.5k | 开源短剧画布（MIT）：桌面端 / Docker，可接入任何模型 API 或本地 ComfyUI，支持 MCP、插件、角色三视图、3D 预演。[`examples/`](../../examples/README.zh-CN.md) 里的《半仙下山》就是用它做的 |
| [ArcReel/ArcReel](https://github.com/ArcReel/ArcReel) | 5.3k | 自托管的 Agent 工作台：小说 / 剧本 → 角色、场景、道具 → 分镜 → 视频 → 剪映草稿，带费用追踪 |
| [ZeroLu/open-canvas](https://github.com/ZeroLu/open-canvas) | 270 | 本地优先、自带 API 密钥的画布，自称"LibTV 和 TapNow 的开源替代品"（alpha） |
| [MaLunan/AIGCCanvasFlow](https://github.com/MaLunan/AIGCCanvasFlow) | 119 | Vue 3 + VueFlow 节点画布编辑器，适合自己搭建 |

**3. 提示词经验正在被打包成 Agent Skill：** [LearnPrompt/awesome-seedance](https://github.com/LearnPrompt/awesome-seedance)（1.7k★，600 多个有出处的 Seedance 案例）、[liyue-aigc/seedance-2-5-video-director](https://github.com/liyue-aigc/seedance-2-5-video-director)（532★）、[jnMetaCode/ai-shortfilm-prompts](https://github.com/jnMetaCode/ai-shortfilm-prompts)（457★）、[cclank/lanshu-awesome-ai-video-kit](https://github.com/cclank/lanshu-awesome-ai-video-kit)（412★，411 条提示词、15 个模型）、[A-cat-with-carrots/OnlyShot](https://github.com/A-cat-with-carrots/OnlyShot)（304★，一句话 → 剧本 → 分镜 → 视频 → 剪辑，基于即梦 / Seedance）。大多数**没有许可证**，可以阅读学习，复制前先征得同意。

**4. 不要用"免费 API"反代。** `jimeng-free-api-all`、`iptag/jimeng-api` 这类仓库（几百到 1k★）逆向网站，在官方渠道之外使用你的登录会话。网站一改它们就失效，还可能导致封号。请用官方 CLI 或 API。去水印工具同理：平台水印和 AI 标识是服务条款的一部分，在中国，标识 AI 内容是法律要求。

更多类似 Toonflow 的开源与闭源工作台，见[第 7 章](07-tools-like-toonflow.md)。

## 资料来源

- 即梦 / Seedance：[Seedance 2.5 发布（新浪）](https://finance.sina.com.cn/tech/2026-06-23/doc-iniekknw2058892.shtml) · [Seedance 2.5 功能（思否）](https://segmentfault.com/a/1190000047897908) · [即梦会员价格（财联社）](https://www.cls.cn/detail/2296174) · [即梦 CLI（53AI）](https://www.53ai.com/news/MultimodalLargeModel/2026040187324.html) · [CLI 命令参考](https://github.com/simonjiang99/dreamina-cli) · [无限画布 + Agent（人人都是产品经理）](https://www.woshipm.com/ai/6292231.html)
- 小云雀：[上线（腾讯新闻）](https://news.qq.com/rain/a/20250530A03UYZ00) · [百度百科](https://baike.baidu.com/item/%E5%B0%8F%E4%BA%91%E9%9B%80/67428202) · [Seedance 2.0 入口与积分（知乎）](https://zhuanlan.zhihu.com/p/2005953613512586391) · [xyq.jianying.com](https://xyq.jianying.com/)
- LibTV：[上线（中华网）](https://tech.china.com/articles/20260320/202603201829146.html) · [功能（AIHub）](https://www.aihub.cn/tools/libtv/) · [liblib.tv](https://www.liblib.tv/) · [libtv-skills](https://github.com/libtv-labs/libtv-skills)
- LiblibAI：[介绍（aigc.cn）](https://www.aigc.cn/liblibai) · [Star-3 与 API](https://ai-bot.cn/star-3-alpha/)
- TapNow：[功能（AITOP100）](https://www.aitop100.cn/tools/tapnow-ai) · [价格](https://www.tapnow.ai/pricing) · [公司（U深搜）](https://unifuncs.com/s/o7TSu4Tv)
- Flova：[flova.ai](https://www.flova.ai/en/) · [价格](https://www.flova.ai/en/pricing/) · [介绍（网易）](https://www.163.com/dy/article/KPH3R0MM0556D7QR.html)
- 成本：[7 款工具每秒成本实测（腾讯新闻，2026 年 4 月）](https://news.qq.com/rain/a/20260425A04E8B00)
