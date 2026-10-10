# 给神经元装一个光开关 · V3（Remotion）

[English](README.md) · **简体中文**

64秒竖屏光遗传学短片，面向抖音，用 [Remotion](https://www.remotion.dev/) 重做。没有旁白，由逐字弹出的画面字和合成配乐讲故事。首帧就是现象：小鼠头顶的光一亮它就跑，一灭就慢下来。接着问它的脑子里藏着什么开关，到第51秒揭晓。V1、V2在相邻目录。

| 文件 | 用途 |
|---|---|
| [out/optogenetics-v3.mp4](out/optogenetics-v3.mp4) | 1080×1920、30fps、64秒，H.264/BT.709，AAC 48kHz立体声，−10 LUFS |
| [out/cover.jpg](out/cover.jpg) | 抖音封面；标题在主页九宫格3:4裁切范围内 |
| [out/optogenetics-v3.sheet.jpg](out/optogenetics-v3.sheet.jpg) | 编码后成片每秒一帧 |
| [out/verification.json](out/verification.json) | `npm run verify` 的结果 |
| [out/score-spectrum.png](out/score-spectrum.png) | 配乐频谱：各段落、38秒的掉落、48秒的刹车 |
| [storyboard.md](storyboard.md) · [brief.md](brief.md) | 分镜与简报 |
| [publish-copy.md](publish-copy.md) | 标题、封面、标签、简介和评论区 |
| [scientific-sources.md](scientific-sources.md) | 每句画面字的出处 |
| [production-log.md](production-log.md) | 决定、检查，以及看过和没看过的部分 |

## 构建

需要 Node 18+ 和 ffmpeg。Remotion 第一次渲染时会自己下载 Chrome Headless Shell。在本目录运行：

```sh
npm ci
npm run studio                             # Remotion Studio：拖动、带声音播放，时间线上按幕显示
npm run score                              # 合成配乐 → public/score.wav，母带 −10 LUFS
npm run render                             # → out/optogenetics-v3.mp4（4核无GPU约4.5分钟）
npm run cover                              # → out/cover.jpg
npm run verify                             # 15项技术检查 → out/verification.json
node scripts/sheet.mjs --range=0:6:0.5     # 任意时间段的拼图 → out/sheet.jpg
```

以上命令于2026年10月9日运行过（Linux、Node 24.21.0、ffmpeg 6.1.1）。`public/score.wav` 随项目保存，不重新合成配乐也能直接 `npm run render`。

## 修改

| 要改 | 改这里 |
|---|---|
| 任何时间：场景、文字、光脉冲、转场、重音 | `src/timeline.ts`，画面和配乐都从这里读 |
| 画面字 | `src/timeline.ts` 的 `TEXTS` 和 `CTA`，标签在各场景文件；改完运行 `npm run fonts` 把新字加进字体子集 |
| 某一幕 | `src/scenes/*.tsx`：画面是 canvas 的 `draw` 函数，标签和面板是 JSX |
| 神经元、小鼠、衣藻、细胞膜、病毒、眼球 | `src/art/*.ts` |
| 光效、泛光、颗粒、故障 | `src/lib/gfx.ts` |
| 文字动画、章节条、闪光、转场 | `src/ui/Text.tsx`、`src/ui/Hud.tsx` |
| 配乐与音效 | `src/audio/score.ts`，然后 `npm run score` |
| 响度目标 | `scripts/score.mjs` |

每一帧都只由时间决定：不用 `Math.random()`（用 `rng(seed)`），不读时钟，不在帧之间保留状态。小鼠的速度和衣藻的游动在加载时一次算好。`npm run verify` 会按不同顺序把同一帧渲染两次来检查这一点。配乐可以重现但不逐位相同：同一份代码渲染两次，差异最大 −125 dBFS（Chrome 离线 Web Audio 的浮点舍入），远低于16位精度。

## 为抖音做的设计

- **第一秒**：现象、新闻（金色小标“2026 诺贝尔生理学或医学奖”）和问题在第0帧同时出现，片名等到第6秒。
- **悬念**：4.5秒问“它的脑子里藏着什么开关”，51秒“回到开头”，用透视版的同一只小鼠回答。
- **互动**：18–22秒“猜一猜”三选一（萤火虫、水母还是绿藻），片尾讨论卡给出具体选项。不要求点赞、关注或转发。
- **标题与封面**：和首帧说同一件事：“灯一亮它就跑，灯一灭它就慢？”见 [publish-copy.md](publish-copy.md)。
- **循环**：最后一拍接回片头的重拍。

## 状态

技术检查通过。还没做的：手机上带声音审听、按实际速度审片、在抖音界面里确认遮挡、发布。这些留给用户复审，见 [production-log.md](production-log.md)。

Remotion 不是 MIT 许可：个人和三人及以下的公司可免费使用，更大的公司需要公司授权。见 [CREDITS.md](CREDITS.md)。
