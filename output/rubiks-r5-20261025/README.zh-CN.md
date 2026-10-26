# 魔方 r5：为留住前几秒重剪的三个版本

[English](README.md) · **简体中文**

r5 在 r4（180 秒，原样保留在 `../rubiks-recut-20261025/`）的基础上为完播率重剪：开头先给出与标题一致的承诺，中间去掉静止的停留，在“20”的高潮之后再挂一个问题。同一套代码渲染三个版本，用页面参数 `src/index.html?v=…` 选择：

| 版本 | 时长 | 结构 | 成片 |
|---|---|---|---|
| `full` | 126.5 秒 | 一条问题链：2.51 → 20 的承诺 → 状态数 → 证明 → 新钩子 → 方法 → 五把平均 → 比赛 → 结尾 | [rubiks-r5-full.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-full.mp4) |
| `mid` | 151.5 秒 | 同样顺序，保留 3 秒历史，方法段保持 r4 长度 | [rubiks-r5-mid.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-mid.mp4) |
| `light` | 159.5 秒 | 保留 r4 的顺序（2.51 / 平均 → 方法 → 比赛），换上新开头和新钩子 | [rubiks-r5-light.mp4](https://github.com/carljings/how-to-make-ai-video/releases/download/rubiks-r5-20261025/rubiks-r5-light.mp4) |

均为 1080×1920、30 fps，字幕加原创音乐，无旁白，−14 LUFS。

三个版本共有的改动（细节与时间见 [docs/STORYBOARD-r5.zh-CN.md](docs/STORYBOARD-r5.zh-CN.md)）：

- **0–8 秒**：纪录还原和 2.51 的重音不变。大字卡停 1.5 秒（r4 为 2.5 秒），随后翻牌把 2.51 翻成 **20 步 · 上帝之数**：“人类纪录 2.51 秒；数学说：20 步就够”。魔方升入计数段，在“超 4325 亿亿种打乱，每一种都能 20 步内还原？”下打乱，这正是主标题的承诺。r4 开头缓慢的重新打乱和 12 秒历史课删去（mid 保留 3 秒历史）。
- **20 之后**：20 翻回 2.51，红色印章落下：“破了世界纪录，决赛却只拿了第 6？”。比赛段在结尾揭晓。
- **节奏**：计数和证明各步去掉多余停留，动画速度不变。方法段每次还原后停 0.8 秒（r4 为 0.4 秒）。搜索段每个音符落在对应的那一步上。
- **可读性**：脚注统一至少 32 px（r4 为 25–28 px）；翻牌缝翻完即消失。

不变：Opus 的 Canvas 2D 魔方渲染、Chrome 逐帧导出、字体、配色、镜头语言、Web Audio 音色、120 BPM。新增字形取自同一 Noto Sans SC 2.004 母版（SHA-256 `a3041811…`），13 个原字体文件逐字节不变。所有事实和数字沿用已审定的 r4 措辞，新句子只是重组这些事实。

## 渲染

```sh
tools/render-cuts.sh            # 三个版本并行：画面（每 90 帧一段）→ 配乐 → 母带与合成 → 校验
tools/render-cuts.sh full       # 只渲染一个版本
node tools/render.mjs "src/index.html?v=mid" strip out/check.jpg --from 5 --to 7 --step 0.1   # 查看连续帧
```

本机没有 GPU，Chrome 使用 SwiftShader，三版并行时约每帧 1.2 秒；与 r4 用 Apple Metal 渲染的同一帧相比，SSIM 为 0.985。`tools/finish.py` 母带到 −14 LUFS、真峰值 ≤ −1.5 dBTP，并写出 `out/rubiks-r5-<版本>.verify.json`。

成片 MP4 放在 GitHub Release `rubiks-r5-20261025`（校验和：[SHA256SUMS-r5](SHA256SUMS-r5)），校验记录在 `out/`。抖音发布文案（含各版章节目录）：[publish/发布文案-r5.md](publish/发布文案-r5.md)。

检查记录见 [PRODUCTION_LOG.md](PRODUCTION_LOG.md)（做了哪些检查、哪些没做）。配乐没有人试听过：只检查了响度、峰值和与画面提示点的对齐。
