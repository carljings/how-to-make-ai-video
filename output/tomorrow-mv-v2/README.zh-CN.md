# Claude MV ·《明天会更好》V2（Remotion）

[English](README.md) · **简体中文**

两支竖屏歌词MV，面向抖音和TikTok，用 [Remotion](https://www.remotion.dev/) 制作，配同一版《明天会更好》（高压电工 Remix）。音乐取自一段更长的录屏：两段主歌，75 BPM，一句一小节。唱出的120个字，每个都在唱到的那一刻出现在画面上。V1（19秒的初版）在 [`../tomorrow-mv`](../tomorrow-mv)。

- **第一段**：像素小AI被敲醒，在黎明睁开眼，看见忙碌的世界，一个人在小星球上转个不停，流下一滴泪，被风吹干。
- **第二段**：一个 drop。它长出翅膀，跟着一队候鸟飞，听到远方的消息：一只小猫守着空碗，头上压着雷雨；它的心燃烧起来，化成音符飞过世界，把小猫的碗装满小心心。
- **结尾**：唱到“福”，所有明信片飞成一颗巨大的心，又打开回到第一帧。

| 文件 | 用途 |
|---|---|
| [out/tomorrow-mv-full.mp4](out/tomorrow-mv-full.mp4) | 完整版：两段主歌，51.2秒，1080×1920、30fps，H.264/BT.709，AAC 48kHz，约 −11.6 LUFS，首尾无缝循环 |
| [out/tomorrow-mv-40s.mp4](out/tomorrow-mv-40s.mp4) | 40秒版：第一段之后直接接“玉山白雪飘零……倾诉遥远的祝福”，38.4秒 |
| [out/cover.jpg](out/cover.jpg) · [3:4](out/cover-3x4.jpg) · [4:3](out/cover-4x3.jpg) | 抖音封面 |
| [out/tomorrow-mv-full.sheet.jpg](out/tomorrow-mv-full.sheet.jpg) · [40秒](out/tomorrow-mv-40s.sheet.jpg) | 编码后成片每0.5秒一帧 |
| [out/verification.json](out/verification.json) | `npm run verify` 的结果 |
| [storyboard.md](storyboard.md) | 分镜，附每个新字的时刻 |
| [publish-copy.md](publish-copy.md) | 两个版本的抖音发布页填写，以及音乐问题 |
| [production-log.md](production-log.md) | 音乐怎么量、怎么剪，决定、检查，看过和没看过的部分 |
| [CREDITS.md](CREDITS.md) | 音乐、参考、字体、地图、许可 |

## 构建

需要 Node 18+ 和 ffmpeg（带 libsoxr）。在本目录运行：

```sh
npm ci
npm run music -- "/path/to/ScreenRecording_10-11-2026 01-14-58_1.MOV"   # → public/music-full.wav、music-short.wav（不入库）
npm run studio                             # Remotion Studio：两个版本，时间线上按幕显示
npm run render                             # → out/tomorrow-mv-full.mp4 和 out/tomorrow-mv-40s.mp4（4核约6分钟）
npm run cover                              # → out/cover.jpg、cover-3x4.jpg、cover-4x3.jpg
npm run verify                             # 两个版本的技术检查 → out/verification.json
node scripts/sheet.mjs --comp=Short40 --range=24:27:0.1   # 任一版本任意时间段的拼图
```

`npm run music` 从录屏里按样本精确截取两条音轨。完整版取歌曲时间 0–51.2 秒；40秒版取第 1–8 小节，再接第 13–16 小节，在小节线上做 8 毫秒交叉淡化。两条都只降 0.4 dB，不加限幅器。

## 修改

| 要改 | 改哪里 |
|---|---|
| 任何时间：字、两个播放列表、转场、震屏、每幕的动作 | `src/timeline.ts`。一切按歌曲时间计算，播放列表把影片时间映射到歌曲小节 |
| 某个字的位置、样子和动法 | `src/ui/Lyrics.tsx` 里的 `LAYOUT` 和 `motion()`；之后运行 `npm run fonts` |
| 某一幕 | `src/scenes/*.tsx`（16幕，一小节一幕） |
| 小AI（翅膀、围巾、眼泪）、候鸟、小猫、音符、火焰、雪、烟花 | `src/art/Clawd.tsx`、`src/art/cast.tsx` |
| 转场、镜头冲击、drop 闪白、巨大的心、结尾的窗 | `src/Film.tsx` |
| 40秒版的接点 | `src/timeline.ts` 的 `CUTS`，和 `scripts/music.mjs` 里的 `short` |

每一帧都是时间的纯函数；`npm run verify` 会按不同顺序把同一帧渲染两次来检查。

## 状态

技术检查全部通过。还没做：手机上听、按实际速度看、确认抖音界面遮挡、决定音乐在抖音上怎么处理、发布。见 [production-log.md](production-log.md)。
