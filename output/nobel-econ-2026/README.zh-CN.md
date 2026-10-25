# 多给你1000块，你会花吗？ · 2026诺贝尔经济学奖

[English](README.md) · **简体中文**

一部给抖音的竖屏科普短片，讲2026年诺贝尔经济学奖：罗伯特·E·霍尔和迈克尔·伍德福德，“为宏观经济稳定政策奠定微观经济学基础”。完全用 [Remotion](https://www.remotion.dev/) 制作：动态画面字、扁平贴纸风格动画、带口哨旋律的合成配乐。没有旁白（用户的选择），没有用任何外部语音或生成服务。

这部片子围绕用户提出的问题设计：观众前两秒就划走，看完的人少。所以第0帧就是完整的问题：手机上 **+¥1000.00** 到账，大字“多给你1000块 / 你会花，还是存？”，旁边是小小的“你”。到账“叮”和口哨旋律从第0帧响起，0.8秒前两个选项弹出。4秒画面定格，问题反转：只发一次，还是每月都有？8.5秒揭晓诺奖。“你”在每一幕都出现，最后成为经济曲线里千千万万个点中的一个。结尾回到开头的画面，可以循环。

| 文件 | 用途 |
|---|---|
| `out/nobel-econ-2026.mp4` | 成片：58秒，1080×1920，30 fps，H.264/BT.709，AAC 48 kHz 立体声，−10 LUFS |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | 抖音封面，和第0帧同一画面 |
| `out/nobel-econ-2026.sheet.jpg` | 编码后成片每秒一帧 |
| `out/verification.json` | `npm run verify` 的结果 |
| [brief.md](brief.md) · [storyboard.md](storyboard.md) | 批准的方案 |
| [sources.md](sources.md) | 每一句的出处，以及参考文章里哪些没用、为什么 |
| [publish-copy.md](publish-copy.md) | 抖音发布页每一栏填什么 |
| [production-log.md](production-log.md) | 决定、检查，看过什么、没能做什么 |

## 构建

需要 Node 18+ 和 ffmpeg。Remotion 第一次渲染时会自己下载 Chrome Headless Shell。在本目录：

```sh
npm ci
npm run fonts                    # 按用到的字裁剪字体（改字之后）
npm run score                    # 配乐和音效，母带到 −10 LUFS → public/score.wav
npm run render                   # → out/nobel-econ-2026.mp4
npm run cover                    # → out/cover.jpg、cover-3x4.jpg、cover-4x3.jpg
npm run verify                   # 技术检查 → out/verification.json
node scripts/sheet.mjs --range=0:3:0.25   # 任意时间段的拼图 → out/sheet.jpg
npm run studio                   # Remotion Studio：拖动、播放
```

## 修改

| 要改 | 改哪里 |
|---|---|
| 画面字 | `src/timeline.ts` 里的 `BEATS`，然后 `npm run fonts` |
| 任何时间：场景、画面字、画面和声音的提示点 | `src/timeline.ts`；场景和配乐都读它 |
| 某一幕 | `src/scenes/Yellow.tsx`（开头、反转、结尾）、`Prize.tsx`、`Hall.tsx`、`Woodford.tsx`、`Big.tsx`（地球、人群） |
| 角色和物件 | `src/art/Bean.tsx`、`src/art/Props.tsx` |
| 配乐和音效 | `src/audio/score.ts`，然后 `npm run score`；响度目标在 `scripts/score.mjs` |
| 地球上的陆地点 | `scripts/land.py`（Natural Earth 1:110m 陆地，公有领域） |

每一帧都是时间的纯函数：不用 `Math.random()`（用 `rng(seed)`），不读时钟，帧与帧之间不保留状态。`npm run verify` 会按不同顺序把同几帧渲染两次来检查。
