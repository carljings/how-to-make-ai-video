# 如何制作 AI 视频 · How to Make AI Video

[English](README.md) · **简体中文**

一份用 AI 做视频的实战指南，来自真正做完的项目。它覆盖今天做 AI 视频的两种方法，附带模板、实测过的 ffmpeg 脚本，以及一部约一分钟就能构建出来的入门短片。

[![入门短片：610 颗按黄金角排列的种子汇聚成标题](docs/media/starter-preview.gif)](https://github.com/carljings/how-to-make-ai-video/releases/download/v0.1/starter-film.mp4)

*入门短片（15 秒），每一帧都由代码绘制：[▶ 带声音的 MP4](https://github.com/carljings/how-to-make-ai-video/releases/download/v0.1/starter-film.mp4) · [源码](starter/README.zh-CN.md)*

## 做 AI 视频的两条路线

| | **路线 A：生成** | **路线 B：代码** |
|---|---|---|
| 怎么做 | 描述每个镜头，由视频模型（Seedance、可灵、海螺、Vidu、Veo、Runway、Wan……）画出来 | AI 助手写一个程序把每一帧画出来，浏览器渲染，ffmpeg 编码 |
| 适合 | 人物、场景、故事、短剧、广告、真人或动漫风格 | 科普讲解、数据、数学与科学、时间线、片头字幕、动态图形 |
| 优势 | 一句话就能得到写实或风格化的画面；可自带原生音频 | 精确、可复现、文字永远不会错，改一处只需重新渲染一次，渲染不花钱 |
| 短板 | 片段之间的一致性、画面里的文字、手部、每次生成的成本 | 做不了真人和实景，做不了照片级写实 |
| 片段长度 | 每次生成 5–15 秒，剪辑时拼接 | 任意长度，一条连续的时间线 |
| 指南 | [第 2 章](docs/zh-CN/02-path-a-generate.md) | [第 3 章](docs/zh-CN/03-path-b-code.md) · [`starter/`](starter/README.zh-CN.md) |

很多好作品会把两条路线混着用：生成的画面，加上用代码绘制的标题、图表和地图。

## 制作流程（两条路线通用）

```mermaid
flowchart LR
  A[创意] --> B[简报] --> C[剧本] --> D[分镜] --> E[素材]
  E --> F[镜头] --> G[检查] --> H[声音] --> I[剪辑与母带] --> J[发布]
  G -- "不合格" --> F
```

细节、经验法则和用时估算见[第 1 章](docs/zh-CN/01-pipeline.md)。

## 快速上手

**路线 B：构建入门短片**（需要 Node.js 18+、Chrome 或 Chromium、ffmpeg）：

```sh
cd starter
npm install
npm run build              # → out/film.mp4，1080p30，4 核 CPU、无 GPU 约一分钟
node render.mjs --serve    # 工作室页面 http://localhost:8123：编辑时可拖动、播放
```

**路线 A：拼接生成的片段**（需要 ffmpeg）：

```sh
tools/review.sh clips/*.mp4                     # 每个片段生成一张带时间码的抽帧拼图：剪辑前先检查
tools/stitch.sh shots.txt episode.mp4 --size 1080x1920 --srt episode.srt
```

`stitch.sh` 会裁剪每个片段，把尺寸和帧率不一致的片段统一成同一格式，给没有声音的片段补上静音，压制字幕，可选铺一条背景音乐（`--music`），最后把响度统一到 −14 LUFS。

## 目录

| | |
|---|---|
| [1 · 制作流程](docs/zh-CN/01-pipeline.md) | 从创意到上传的十个步骤，以及最省时间的习惯 |
| [2 · 路线 A：生成](docs/zh-CN/02-path-a-generate.md) | 选模型、参考图、镜头提示词、连贯性、常见问题、版权与标识 |
| [3 · 路线 B：代码](docs/zh-CN/03-path-b-code.md) | `render(t)`、纯函数帧的规则、与 AI 助手协作、性能、声音与字体 |
| [4 · 声音](docs/zh-CN/04-sound.md) | 人声、音乐、音效、−14 LUFS、闪避、查找爆音、字幕 |
| [5 · 剪辑与导出](docs/zh-CN/05-edit-and-export.md) | 脚本、实测过的 ffmpeg 命令、导出设置、上传前检查清单 |
| [6 · 平台对比](docs/zh-CN/06-platforms-compared.md) | 即梦、小云雀、LibTV、LiblibAI、TapNow、Flova 横向对比：模型、工作方式、Agent 接入、每秒成本、GitHub 上的发现 |
| [7 · AI 视频工具比较](docs/zh-CN/07-tools-like-toonflow.md) | 开源故事工作台、自动剪辑、本地生成与代码动画；特殊许可和闭源平台另列，附价格快照与发明家猫样片测试方法 |
| [8 · 抖音科普增长测试](docs/zh-CN/08-douyin-science-growth.md) | 面向百万播放的新片选题、开场结构、科学来源与首轮数据测试；建议和官方规则分别说明 |
| [制作成果](output/README.zh-CN.md) | 发明家猫头像、光遗传学V1–V3成片（V3用Remotion制作）、可编辑源码、旁白、字幕和制作记录 |
| [`templates/zh-CN/`](templates/zh-CN/) | [简报](templates/zh-CN/brief.md) · [分镜](templates/zh-CN/storyboard.md) · [镜头提示词](templates/zh-CN/shot-prompt.md) · [制作日志](templates/zh-CN/production-log.md) · [`shots.txt`](templates/shots.txt) |
| [`tools/`](tools/) | [`stitch.sh`](tools/stitch.sh)（拼接与母带） · [`review.sh`](tools/review.sh)（抽帧拼图） |
| [`starter/`](starter/README.zh-CN.md) | 一部可直接复制的代码绘制短片：时间线、场景、合成配乐、渲染器 |
| [`examples/`](examples/README.zh-CN.md) | 已完成的作品，以及每部作品的经验 |

## 与 AI 助手协作

两条路线都可以让 Claude 这样的 AI 助手来写剧本、写提示词、写代码、做拼接，速度会快很多。最重要的三个习惯：

1. **先简报，再分镜，最后才是镜头。** 分镜确认之前，不做任何生成，也不写代码。
2. **用抽帧拼图检查。** AI 助手能看图片但看不了视频；每秒一帧的拼图既能让它检查自己的成果，也方便你按时间码给修改意见。
3. **记录制作日志。** 已有什么、哪些已通过、下一步做什么，放在一张表里，任何一次新会话都能接着做。

[`CLAUDE.md`](CLAUDE.md) 会在 Claude Code 进入这个仓库时自动告诉它这些约定。
