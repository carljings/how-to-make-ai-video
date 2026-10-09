# 7 · AI 视频制作工具：开源、特殊许可与闭源比较

[English](../07-tools-like-toonflow.md) · **简体中文**

核查日期：**2026 年 10 月 8 日**。本章记录工具调研、价格快照和“发明家猫”抖音账号的选型建议，替代本章原来的 10 月 5 日清单。证据来自官方仓库、许可证、操作文档、发布页和部分源码；**没有安装这些新增工具、付费生成或进行同剧本画质测试**。官方资料说明有某项功能，不代表本机已运行通过。

## 科普制作的现有起点

用户已用**Opus 5.5**完成并上传三部练手科普作品：AI History、熵增、中微子。用户明确接下来制作新视频；这三部保留为技术经验，百万播放测试方案见[第8章](08-douyin-science-growth.md)。模型归属来自用户说明；[中微子的署名文件](https://github.com/carljings/neutrino-film/blob/main/CREDITS.md)也记录了Claude Opus 5.5 / Claude Code。本轮通过已认证GitHub API核对仓库、README、源码入口和发布资产；没有重新观看或渲染成片，以下规格来自仓库文档与代码，而非本轮视频探测。

| 作品 | GitHub记录 | 已有制作路线与本轮证据 |
|---|---|---|
| **AI History** | [ai-history-video](https://github.com/carljings/ai-history-video)，公开；[2分钟版](https://github.com/carljings/ai-history-video/releases/tag/v1.0)和[5分钟双语版](https://github.com/carljings/ai-history-video/releases/tag/5min-v1.0)均有MP4资产 | Canvas画面、Python/Playwright驱动Chrome、Python合成配乐/音效、ffmpeg；2分钟版标注1080p60 |
| **熵增 / 熵 · Borrowed Light** | [entropy-video](https://github.com/carljings/entropy-video)，私有；[重制成片](https://github.com/carljings/entropy-video/blob/main/entropy-remake.mp4)与remake源码已在main，PR #1已合并 | Canvas＋Web Audio＋Chrome/ffmpeg；标注2:50、1080p30。entropy.mp4是原参考，entropy-remake.mp4才是重制作业成片 |
| **中微子 / The Ghost Particle** | [neutrino-film](https://github.com/carljings/neutrino-film)，私有；[v1.2](https://github.com/carljings/neutrino-film/releases/tag/v1.2)有MP4、SRT与封面 | Canvas＋Web Audio＋puppeteer-core/Chrome＋ffmpeg；时间线与README标注3:12、1080p30；已有分镜、事实来源、场景模块、局部预览、续渲与版本返工 |

科普主线以这些真实项目为基线：**继续迭代Opus 5.5辅助的代码动画、声音与渲染流程**。starter与137.5°保留作可复用示例；Manim、Motion Canvas等在具体需求出现时再比较。工具调研主要为后续萌猫、短剧及制作中的明确缺口服务。

## 发布平台：抖音；项目归档：GitHub

用户明确：**视频面向观众的发布平台是抖音**。GitHub保存源码、素材、母版、字幕和版本记录。制作成功、GitHub归档、抖音作品发布和观众反馈分别记录。

用户提供的抖音主页截图可见中微子、熵增、AI History三个作品条目。下表仅为**2026年10月8日收到的截图快照**，截图拍摄时间、各片发布时间与当前后台数据未提供：

| 作品 | 截图显示的播放计数 |
|---|---|
| 中微子 | 208 |
| 熵增 | 653 |
| AI History | 224 |

这些计数不能单独用来判断作品质量或推荐效果。后续比较需记录发布时间与同一观察窗口，结合后台可提供的曝光、观看时长、完播和互动数据。

科普继续沿用现有Opus 5.5制作链，交付时增加抖音观看检查：手机上图解/字幕是否清楚，封面与标题是否准确表达主题，开场是否提出清晰问题，旁白与节奏是否便于理解。三部GitHub母版文档标为16:9；主页截图显示的是封面，不能据此判断播放页画幅。若需要9:16版本，应重新编排图解、字幕和主体位置，检查裁切后的科学含义与可读性。

## 先给出选择

**当前制作优先级：高质量科普 → 萌猫 → AI 短剧。** 科普先看事实、解释和图解质量，再看模型画质与制作速度。AI辅助研究、写脚本、编程动画、配音与剪辑，也属于AI制作；精确控制画面仍需要科学核查。

| 目标 | 优先比较 | 理由与未验证边界 |
|---|---|---|
| **第一：高质量科普** | **沿用Opus 5.5与现有三部作品的制作链**；数学/几何需求再比较Manim，矢量/旁白同步再比较Motion Canvas | 优先改进选题、事实核查、视觉解释、声音与抖音适配；新工具需证明具体收益 |
| **第二：萌猫** | **Toonflow**或**OiiOii**；进阶控制再看ComfyUI | 固定参考、短动作、逐镜返工；脸、毛色、护目镜和爪子/道具接触需实测 |
| **第三：AI短剧** | **ArcReel、PRINTFILM**；Toonflow作基线 | 角色/场景/道具、剧本分镜、对白和逐镜返工；故事、表演与连续性需验收 |
| Mac 上生成镜头并剪辑 | **LTX Desktop**；进阶再看 ComfyUI | 有明确 Apple Silicon 路径，本地推理有空闲内存门槛；模型许可另计 |
| 已有猫片段，让 Agent 帮忙剪 | **FireRed-OpenStoryline**；解说另看 NarratoAI | 主要价值在后期，不替代角色和镜头生成 |
| 托管完成制作流程 | **Flova**；动画试 OiiOii，系列试 Seko | 闭源订阅，模型、积分和导出权益受套餐约束 |

**“效果最好”尚无同题实测结论。** OiiOii 是动画场景的优先试用建议，Flova 是流程便利性的优先试用建议；都不是已测出的冠军。软件免费不等于整条视频免费：云 API、重做、算力、配音、素材和学习时间都可能产生成本。

## 比较口径

工具按四类比较：**故事/角色/分镜工作台、主题解说与 AI 剪辑、本地镜头生成与模型框架、代码动画与合成**。第一类最接近 Toonflow；其余可以补足制作链路，但不能混排成同类竞品。

许可证分为：有标准开源许可证正文、特殊/限制许可，以及只有 README 声明但未找到软件许可证正文。**软件、模型权重、API、音乐与素材授权分别核对**，不能由一个 MIT 徽章推导全部内容都可商用。

本地保存项目不等于完全离线。云模型调用需要向服务商传递相应提示词和参考素材。默认分支的新功能也不一定已进入发行包；源码、发行版和实际运行分别判断。

## A · 故事、角色与分镜工作台

| 项目 / 软件许可 | 已确认的能力 | 部署与采用边界 |
|---|---|---|
| **[Toonflow](https://github.com/HBAI-Ltd/Toonflow-app)** · [MIT](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/LICENSE) | 无限画布、剧本与资产、图视频、Agent、MCP、插件；第三方 API 或本地 ComfyUI/LLM | 桌面、Docker、服务器。历史版本仍按对应协议核对。作为比较基线 |
| **[ArcReel](https://github.com/ArcReel/ArcReel)** · [AGPL-3.0](https://github.com/ArcReel/ArcReel/blob/main/LICENSE) + [NOTICE](https://github.com/ArcReel/ArcReel/blob/main/NOTICE) | 资产复用、分集/分镜、逐镜生成、回滚、费用跟踪；旁白/字幕/BGM/转场、成片与剪映草稿 | Docker，自配 Agent 和媒体服务。阅读署名与源码义务；**猫故事主候选** |
| **[LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama)** · [MIT](https://github.com/xuanyustudio/LocalMiniDrama/blob/main/LICENSE) | 角色/场景/道具、列表与画布、参考图/首尾帧、9:16、合成、项目 ZIP | Node、SQLite、Electron；桌面成品主要面向 Windows，Mac 源码/Docker待验证。云 API、图床不能称离线 |
| **[融光 AI](https://github.com/Stonewuu/ai-fusion-video)** · [MIT](https://github.com/Stonewuu/ai-fusion-video/blob/main/LICENSE) | 项目/团队、剧本分镜、Agent、Skill/MCP、图视频与 FFmpeg；发布说明有 ComfyUI | Java、Next.js、MySQL、Redis，部署较重。适合二开；完整配音/成片闭环未确认 |
| **[PRINTFILM](https://github.com/yi1108/printfilm)** · [MIT](https://github.com/yi1108/printfilm/blob/main/LICENSE) | 模板短视频和漫剧；资产、分镜、单镜重做、后台任务、FFmpeg；[分集规则](https://github.com/yi1108/printfilm/blob/main/docs/EPISODE_RULES.md)有9:16 | FastAPI、React、PostgreSQL、Redis。默认文字/媒体经TokenFree New API，需Key与额度；无Key的mock仅看界面。镜像ARM64未核验；**新增重点候选** |
| **[AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2)** · [AGPL-3.0](https://github.com/Heroesjouney/AIMovieStudiov2/blob/main/LICENSE) | 3D机位、多参考、LoRA、Retake、时间线/音频；常规时间线XML、预演MP4 | Python/Node、Docker；ComfyUI或Fal/Replicate。明确WIP，OTIO/FCPXML仍是roadmap。适合镜头学习 |
| **[Open Canvas / ZeroLu](https://github.com/ZeroLu/open-canvas)** · [MIT](https://github.com/ZeroLu/open-canvas/blob/main/LICENSE) | 文字/图/视频/声音节点、上下游连接、BYOK、磁盘JSON与导入导出 | alpha、Node/pnpm；没有模板库、执行队列、模型目录，需手填模型。**JSON不是MP4或剪辑工程** |
| **[AI Video Generation System / hh591](https://github.com/hh591/ai-video-generation-system)** · [MIT](https://github.com/hh591/ai-video-generation-system/blob/main/LICENSE) | Gradio竖屏、定妆图/空场景/首帧、视频与MoviePy；缓存和失败镜头补做 | [后端](https://github.com/hh591/ai-video-generation-system/blob/main/VIDEO_BACKENDS.md)有本地ComfyUI和云API。Mac模型未确认；同角色×场景复用首帧限制变化。研究原型 |
| **[AI 漫剧无限画布 / BB20260410](https://github.com/BB20260410/ai-drama-canvas)** · [Apache-2.0](https://github.com/BB20260410/ai-drama-canvas/blob/main/LICENSE) | 故事/资产/首尾帧、审片、队列、时间线、版本、FFmpeg MP4、Codex MCP | Electron、Node、FFmpeg；有Mac打包脚本，未找到公开安装包。作者现场约定较多，适合研究 |

## B · 主题短视频、解说与 AI 后期

| 项目 / 软件许可 | 输入、输出与优势 | 对猫账号的边界 |
|---|---|---|
| **[MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)** · [MIT](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/LICENSE) | 主题/脚本→素材、TTS、字幕、BGM、竖横屏成片；WebUI/API/CLI。当前main也接云图视频，**不只拼库存素材** | Mac/Linux或Docker，GPU非必需，云Key另配。适合猫讲知识；未确认跨镜头角色资产控制，main功能未必在发行包 |
| **[MoneyPrinterV2](https://github.com/FujiwaraChoki/MoneyPrinterV2)** · [AGPL-3.0](https://github.com/FujiwaraChoki/MoneyPrinterV2/blob/main/LICENSE) | 主题→脚本→AI图片序列视频、TTS、BGM、MP4与发布自动化。[源码](https://github.com/FujiwaraChoki/MoneyPrinterV2/blob/main/src/classes/YouTube.py)有字幕，旧文档TODO滞后 | 不是连续动作生成；猫参考/中文TTS未测。Python、Ollama、云生图、TTS/Whisper等。研究不授权登录或自动发布 |
| **[NarratoAI](https://github.com/linyqh/NarratoAI)** · [MIT](https://github.com/linyqh/NarratoAI/blob/main/LICENSE) | 理解既有影视/纪录片、匹配解说与混剪；TTS、字幕、BGM、[剪映草稿](https://github.com/linyqh/NarratoAI/blob/main/app/services/jianying_draft_builder.py) | 适合已有素材解说，不创造同一猫的新剧情镜头。文档有Mac路径、GPU非必需；视觉/文案API与素材授权另计 |
| **[ShortGPT](https://github.com/RayVentura/ShortGPT)** · [MIT](https://github.com/RayVentura/ShortGPT/blob/stable/LICENSE) | Facts/故事、Pexels/背景素材、TTS、字幕、BGM、MoviePy；翻译配音 | Colab/Docker/Gradio，部分云Key。未见猫角色流程；stable最近提交与发行停留2025-02，优先级较低 |
| **[FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline)** · [Apache-2.0](https://github.com/FireRedTeam/FireRed-OpenStoryline/blob/main/LICENSE) | 检索/拆镜/理解/筛选、对话剪辑、TTS/BGM/字幕、渲染、风格Skill、MCP/CLI/Web；可选AI转场 | Mac/Linux路径；**先有猫素材，再由Agent剪辑**。全面图视频生成仍TODO，云转场另计费 |
| **[OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut)** · [MIT](https://github.com/OpenCut-app/OpenCut/blob/main/LICENSE) | 既有媒体剪辑器，新版从头重写 | Editor API、MCP、无头模式、插件列为coming；[classic](https://github.com/opencut-app/opencut-classic)已归档。不是成熟AI全流程 |
| **[OpenCut for Premiere](https://github.com/SysAdminDoc/OpenCut)** · [MIT](https://github.com/SysAdminDoc/OpenCut/blob/main/LICENSE) | **与上一项不同项目**；去静音/口头禅、字幕、音频修复、搜索和部分AI B-roll；CLI/MCP | 需Premiere宿主，宿主另收费；Mac部分AI extras受限。不作新手零成本方案 |

## C · 本地镜头生成与模型开发

| 项目 / 软件许可 | 能做什么 | Mac 与采用边界 |
|---|---|---|
| **[ComfyUI](https://github.com/Comfy-Org/ComfyUI)** · [GPL-3.0](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE) | 可复用、局部执行图/视频/声音工作流，参考条件、LoRA、插帧；强在模型控制 | 有Mac/Apple Silicon路径，**不保证所有模型和节点兼容Mac**。需自己搭角色与镜头流程，不默认提供短剧资产库/剪辑闭环 |
| **[LTX Desktop](https://github.com/Lightricks/LTX-Desktop)** · [Apache-2.0](https://github.com/Lightricks/LTX-Desktop/blob/main/LICENSE.txt) | 桌面生成/视频编辑，图/音频条件、LoRA、项目；Retake/Extend依模型 | Beta；Apple Silicon、macOS13+，启动时**至少15GB空闲RAM，非总容量**；不满足条件可用付费API。完整角色库/拆剧本未确认；[模型许可另计](https://github.com/Lightricks/LTX-Desktop/blob/main/NOTICES.md) |
| **[DiffSynth-Studio](https://github.com/modelscope/DiffSynth-Studio)** · [Apache-2.0](https://github.com/modelscope/DiffSynth-Studio/blob/main/LICENSE) | Python推理/训练框架、量化、显存调度、LoRA/Adapter | [官方文档](https://github.com/modelscope/DiffSynth-Studio/blob/main/docs/en/Pipeline_Usage/Setup.md)有Apple Silicon及mps/cpu，模型仍需验证。不是成品故事GUI，适合以后训练猫LoRA |

## D · 代码动画：猫讲科普的另一条路线

| 项目 / 软件许可 | 适用内容 | 边界 |
|---|---|---|
| **[Motion Canvas](https://github.com/motion-canvas/motion-canvas)** · [MIT](https://github.com/motion-canvas/motion-canvas/blob/main/LICENSE) | TypeScript、预览、矢量动画与旁白同步；固定猫立绘＋图解 | 不内置生成模型；角色素材与声音另准备，适合发明原理、流程、科普 |
| **[Manim Community](https://github.com/ManimCommunity/manim)** · [MIT](https://github.com/ManimCommunity/manim/blob/main/LICENSE.community) | Python数学/几何/物理图解，精确画面 | 有Mac安装文档，公式另需LaTeX。不是猫剧情模型；软件许可不授权复制别人的角色 |
| **[Revideo](https://github.com/midrender/revideo)** · [MIT](https://github.com/midrender/revideo/blob/main/LICENSE) | TypeScript媒体/文字/动画，React预览，无头并行渲染；模板视频 | 旧redotvideo地址已重定向；需要写场景，不替代角色生成，本机渲染未测 |

## E · 公开源码，但不能统一称为标准开源

这些工具可能值得使用，特殊许可不代表都不能商用；以具体版本条款为准。

| 项目 | 核查结果与使用边界 |
|---|---|
| **[DramaClaw](https://github.com/dramaclaw/dramaclaw)** | [Elastic License 2.0](https://github.com/dramaclaw/dramaclaw/blob/main/LICENSES/Elastic-2.0.txt)。画布＋剧集流水线，共享资产、配音合成；独立使用与对外托管不同，保留署名，网关增加学习成本 |
| **[waoowaoo](https://github.com/waooAI/waoowaoo)** | 新preview为[Elastic License 2.0](https://github.com/waooAI/waoowaoo/blob/main/LICENSE)；Assistant＋参考＋图视频画布，**当前没有音乐/配音控件**。Docker依赖较多，旧完整成片评测不适用 |
| **[CineGen ShortDrama](https://github.com/UllrAI/CineGen-ShortDrama)** | 原Will-Water地址重定向；[AniKuku Community License](https://github.com/UllrAI/CineGen-ShortDrama/blob/main/license.md)为自定义。角色/分镜/单镜生成；[StageExport源码](https://github.com/UllrAI/CineGen-ShortDrama/blob/main/components/StageExport.tsx)的MP4与EDL/XML按钮未接执行逻辑，不算成片导出 |
| **[PAI-Code / PAI-Pro](https://github.com/Utopai-Research/pai-code)** | [Sustainable Use License](https://github.com/Utopai-Research/pai-code/blob/main/LICENSE.md)有商业/企业限制。Agent/Skills＋画布/时间线，默认PAI API；BYOK指替换调用，不是现成多供应商菜单 |
| **[Wan2GP / WanGP](https://github.com/DeepBeepMeep/Wan2GP)** | 当前[Community License 2.0](https://github.com/DeepBeepMeep/Wan2GP/blob/main/LICENSE.txt)，勿沿用旧Apache标签。条件内自用/输出、售卖白标软件、收费服务与直接售卖输出条款不同。README主路径Nvidia/AMD，源码有MPS适配；Mac模型范围与稳定性未测 |
| **[Remotion](https://github.com/remotion-dev/remotion)** | [特殊Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。React/Agent制作合成；个人、≤3员工营利组织和非营利组织可在条款内免费，更大营利组织需公司许可；非一般MIT |
| **[火宝短剧](https://github.com/chatfire-AI/huobao-drama)** | [CC BY-NC-SA 4.0](https://github.com/chatfire-AI/huobao-drama/blob/master/LICENSE)。链路较完整、有Mac桌面包；官方要求商业使用先取得书面许可 |
| **[BigBanana](https://github.com/shuyu-labs/BigBanana-AI-Director)** | 新版主要发官方Docker，商业版给源码；README与[实际Community License](https://github.com/shuyu-labs/BigBanana-AI-Director/blob/main/LICENSE)不一致。实际条款非OSI开源，限制未授权收入业务、商业生产和托管 |

## F · 有兴趣，但授权证据不足的观察项目

| 项目 | 已看到的功能 | 暂不作主推荐的原因 |
|---|---|---|
| **[CineGen / christopherjohnogden](https://github.com/christopherjohnogden/CineGen)** | Mac AVFoundation/Electron、Elements、分镜/NLE、FFmpeg MP4、9:16 | 与上面的ShortDrama不同；README声明MIT，但本轮树中未找到独立软件许可证正文、未找到发布安装包 |
| **[AID / unclewongwong](https://github.com/unclewongwong/aid)** | 角色卡/系列/分镜、生成/FFmpeg、9:16；有Mac/Windows Companion发布包 | README有MIT声明，独立许可证正文未找到；可选H3 Director 30/60秒连续长视频仍为实验，许可和实际效果待验 |
| **[Hailuo AI Short Drama Studio](https://github.com/Marshmallowc/Hailuo-AI-Short-Drama-Studio)** | 角色库、OpenAI兼容LLM、MiniMax并行单镜 | README声明MIT，独立正文未找到；仅见一次提交、无release。export_service用于DOCX剧本，不能据名字认定MP4合成 |

## 闭源平台与已核实的自动化入口

| 平台 | 值得比较的能力 | 尚需确认 |
|---|---|---|
| **[Flova](https://www.flova.ai/en/docs/introduction/quick-start/)** | 剧本/分镜/媒体/时间线、9:16、[评论重生成](https://www.flova.ai/en/docs/features/comment-generation/)、[成片/素材/工程导出](https://www.flova.ai/en/docs/features/download-export/)、[完整项目CLI](https://www.flova.ai/en/docs/features/flova-cli/) | 同猫实际效果、结算金额和逐模型消耗；便利性建议不是实测 |
| **[OiiOii](https://www.oiioii.ai/en/story-anime)** | 动画故事、资产复用、单镜修改、MP4；[FAQ](https://www.oiioii.ai/faq)与[套餐](https://www.oiioii.ai/en/price)有CLI、无水印/1080p | CLI覆盖范围、复杂爪子/道具动作、最终可用秒数 |
| **[Seko](https://sensetime.com/cn/products/seko/)** | 剧本到成片、[跨集/项目资产复用](https://www.sensetime.com/cn/news/51170693)、[Agent/画布/Skill](https://www.sensetime.com/cn/news/seko-3-0-ai-1) | 完整项目公开API、工程格式、9:16和具体商用条款未确认 |
| **[TapNow](https://docs.tapnow.ai/en/docs/canvas/create-and-use-elements)** | Elements参考、[局部编辑](https://docs.tapnow.ai/en/docs/canvas/generate-and-edit-video)、[Playlist合并MP4](https://docs.tapnow.ai/en/docs/canvas/use-playlists)、[官方MCP](https://docs.tapnow.ai/en/docs/mcp/use-tapnow-in-other-agents) | 当前Multi-shot不支持Elements引用；图片/声音节点不能直接作为Playlist视频片段 |
| **[LibTV](https://www.liblib.tv/wappro)** | 中文画布/角色造型/导演Skills/社区；[Skills仓库](https://github.com/libtv-labs/libtv-skills)有会话/上传/查询/下载 | 工程格式和局部重做保存机制未充分核实；会话API不等于完整剪辑工程API |
| **[LTX Studio](https://ltx.io/studio/platform/ai-storyboard-generator)** | 分镜/Elements、[Retake](https://ltx.io/studio/platform/shot-video-editor)、时间线、[多画幅](https://ltx.io/glossary/video-aspect-ratio) | **托管Studio与开源Desktop是不同产品**；[模型API](https://ltx.io/model/api)不等于项目API，API与订阅分别计费 |

### 价格快照：不能据此评出成片成本冠军

| 产品 | 官方可读价格与条件 | 比较边界 |
|---|---|---|
| [OiiOii BASE](https://www.oiioii.ai/en/price) | 月付促销**$17/月**；立即1000积分，完整签到再加310；无水印/1080p | 签到非立即到账；最多生成秒数依模型，不是可发布秒数 |
| [Seko入门年付](https://seko.sensetime.com/pricing) | 首单促销**¥576/年，一次年付**，全年6000积分，折合¥48/月 | 月付未核；重复购买常规价，促销看结算；不能称月付48元 |
| [LTX Studio Standard](https://website.ltx.studio/studio/pricing) | **$35/月**；年付$336，折合$28/月；含商用 | Free/Lite为个人用途，不能用$15 Lite直接推导商业成本 |
| [Flova](https://www.flova.ai/en/pricing/) | 已确认订阅/积分、无水印/商用；动态套餐金额未可靠读取 | 订阅积分有效30天，模型/时长/分辨率分别扣费，金额待结算 |
| [LibTV](https://www.liblib.tv/wappro) | 特定模型会员促销最低秒价，页面/活动条件不同 | 最低套餐完整付款金额未核；勿用最低秒价×成片时长作总预算 |
| [TapNow](https://www.tapnow.ai/pricing) | 动态结算未确认，旧索引只有年付快照 | [8月26日—9月7日活动](https://docs.tapnow.ai/en/docs/account/creative-os-creation-festival)已结束，$9活动月付不能作当前价 |

最低订阅费、最低生成秒价和最低成片成本不同。本轮**未评出总成片成本最低的平台**。

## 维护与成熟度快照

| 项目 | 已核查状态 | 影响 |
|---|---|---|
| [ArcReel releases](https://github.com/ArcReel/ArcReel/releases) | 10月2日发布说明有本地剪辑、成片、剪映草稿 | 优先验完整交付，不等于无Bug |
| [MoneyPrinterTurbo releases](https://github.com/harry0703/MoneyPrinterTurbo/releases) | main最近提交10月7日，v1.3.8为10月3日 | main功能与发行包分开比较 |
| [PRINTFILM releases](https://github.com/yi1108/printfilm/releases) | main最近提交9月24日，v0.2.0为9月17日 | 发行记录不保证Mac镜像架构 |
| [AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2) / [Open Canvas](https://github.com/ZeroLu/open-canvas) | 官方分别标WIP / alpha | 先验导出与单镜修改 |
| [ShortGPT releases](https://github.com/RayVentura/ShortGPT/releases) | stable提交与v0.3.0均为2025-02-10 | 先验证依赖/API兼容性 |
| [OpenCut](https://github.com/OpenCut-app/OpenCut) / [classic](https://github.com/opencut-app/opencut-classic) | 新版重写，旧版归档 | 依赖构建release不等于编辑器成熟发行 |

不按Star排名，不把仓库pushed时间当默认分支最后提交；维护信号不证明画质或可靠性。

## 三类内容：怎么选、怎么验证

### 第一阶段：高质量科普

现有三部作品已有制作、GitHub归档和抖音作品页记录。先复盘AI History的章节组织、熵增的视觉隐喻、中微子的图解与版本返工，再提炼可复用的时间线、场景、字体、声音提示点、科学来源和渲染检查方法，保持各原作可复现。后续流程为：**资料与计算核查 → 一个核心问题 → 解说脚本/分镜 → Opus 5.5辅助代码图解与必要生成素材 → 配音字幕 → 精剪导出 → 抖音发布与反馈记录**。下一部的主题和时长由简报确定。

数学/几何可评估Manim，旁白同步的矢量讲解可评估Motion Canvas。现有引擎出现明确需求缺口时再换工具。[starter](../../starter/README.zh-CN.md)与[137.5°](../../examples/137.5/README.md)作为复用和学习资料。MoneyPrinterTurbo可辅助素材、配音与字幕流程，自动成片本身不证明科普质量。发明家猫可以作主持或标识，也可仅用于头像；科普是否加入猫主持尚待决定。

科普的五项验收标准：

1. **事实可追溯**：关键数字、公式、结论对应可靠来源；计算复核，模拟与简化模型明确标注。
2. **解释有闭环**：开头提出一个问题，结尾回答；每幕对应解释中的一步，画面不改变科学含义。
3. **图解准确可读**：单位、坐标、方向、比例、标注正确；手机大小预览仍看清文字、图例和主要运动。
4. **声音与节奏合格**：带声音完整观看，旁白/字幕/画面同步，无漏字错读，音乐不盖住解说。
5. **成片与返工可用**：实际打开并完整播放MP4；保存来源、脚本、分镜、源码与素材，确认能单独修改一段并重新导出。

### 第二、三阶段：萌猫与AI短剧

萌猫重点是角色辨识与自然可爱的动作；短剧再加入对白、表演、跨镜头连续性和故事闭环。自托管用Toonflow作基线，与ArcReel或PRINTFILM比较；托管选Flova或OiiOii之一。Mac本地先核对LTX Desktop内存和模型许可。

头像只是视觉参考。先固定猫的正面/侧面/全身、毛色、护目镜、服装与工作室；写好[简报](../../templates/zh-CN/brief.md)和[分镜](../../templates/zh-CN/storyboard.md)，确认后再生成。

萌猫/短剧工具对照可用同一条20–30秒、9:16、4–6镜头的样片，统一分辨率、参考、脚本和声音要求，检查：

- 猫脸、毛色、护目镜、服装是否跨镜头一致。
- 爪子接触工具、拿放道具和动作衔接是否可用。
- 失败镜头能否独立重做，原版本是否保留。
- 保存重开后，资产和参考绑定是否还在。
- 素材、成片和承诺的工程文件能否真正导出并再次编辑。
- 带声音完整观看：字幕、口型、配乐、黑帧与节奏是否通过。

| 候选 | 配置时间 | 生成/重做费用 | 保留秒数 | 重做次数 | 角色/动作 | 保存重开/导出 | 总用时 |
|---|---|---|---|---|---|---|---|
| 基线 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 |
| 对照 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 |

**每保留一秒成本 = 本片生成与重做费用 ÷ 最终保留秒数。** 另外记录订阅分摊、人工时间，不把月费重复加进已按月积分折算的费用。见[制作日志](../../templates/zh-CN/production-log.md)。素材齐、项目保存、成片导出与实际发布分别验收，不能把任务状态当全部完成。

## 本轮未确认项

- 无同剧本画质/易用性实测，也无效果或总成本冠军。
- PRINTFILM镜像ARM64、实验工作台Mac安装、部分本地模型范围未验证。
- README与许可冲突、仅徽章/声明的项目，需补核实际授权。
- 模型输出、素材、声音和音乐商用条款另核。
- 链接是可变官方页面，购买/安装/商用前复核所选版本与结算。第6章10月5日内容保留为旧快照，以本章新核查说明为准。
