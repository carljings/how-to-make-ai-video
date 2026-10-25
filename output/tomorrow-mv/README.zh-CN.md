# Claude MV ·《明天会更好》（Remotion）

[English](README.md) · **简体中文**

19.2秒竖屏歌词MV，面向抖音和TikTok，用 [Remotion](https://www.remotion.dev/) 制作。音乐是从录屏里取出的《明天会更好》干净的一遍：6小节、75 BPM，一句歌词一小节。一只像素小AI（照 Claude Code 标志里的小生物画）被鼠标光标敲醒，慢慢睁开眼，看见忙碌的世界，一个人在转个不停的小星球上走，春风吹走了它的睡帽和信，最后一颗心在节拍上跳动。唱出的47个字每个都在唱到的那一刻出现在画面上，动法跟着字的意思：轻（飘）、敲（砸）、沉睡（下沉）、张开（像眼皮一样张开）。风格参照一支“Claude MV”：方格纸、航空信封明信片、印章、像素光标。

| 文件 | 用途 |
|---|---|
| [out/tomorrow-mv.mp4](out/tomorrow-mv.mp4) | 1080×1920、30fps、19.2秒，H.264/BT.709，AAC 48kHz立体声，−11.9 LUFS，−1.7 dBTP；最后一帧接回第一帧 |
| [out/cover.jpg](out/cover.jpg) · [3:4](out/cover-3x4.jpg) · [4:3](out/cover-4x3.jpg) | 抖音封面：9:16与视频一致，另有发布页可能要求的3:4和4:3 |
| [out/tomorrow-mv.sheet.jpg](out/tomorrow-mv.sheet.jpg) | 编码后成片每0.5秒一帧 |
| [out/verification.json](out/verification.json) | `npm run verify` 的结果 |
| [storyboard.md](storyboard.md) · [brief.md](brief.md) | 分镜与简报，附每个字的时刻 |
| [publish-copy.md](publish-copy.md) | 抖音发布页每一栏填什么，以及发布前要先决定的音乐问题 |
| [production-log.md](production-log.md) | 音乐怎么量的、决定、检查，以及看过和没看过的部分 |
| [CREDITS.md](CREDITS.md) | 音乐、参考、字体、地图、许可 |

## 构建

需要 Node 18+ 和 ffmpeg（带 libsoxr）。Remotion 第一次渲染时会自己下载 Chrome Headless Shell。在本目录运行：

```sh
npm ci
npm run music -- "/path/to/ScreenRecording_10-10-2026 21-52-17_1.MP4"   # → public/music.wav（不入库）
npm run studio                             # Remotion Studio：拖动、带声音播放，时间线上按幕显示
npm run render                             # → out/tomorrow-mv.mp4（4核无GPU约70秒）
npm run cover                              # → out/cover.jpg、cover-3x4.jpg、cover-4x3.jpg
npm run verify                             # 17项技术检查 → out/verification.json
node scripts/sheet.mjs --range=0:6:0.5     # 任意时间段的拼图 → out/sheet.jpg
```

这首歌是商业录音，所以 `public/music.wav` 不提交：`npm run music` 从录屏里截取（0.698–19.898秒），重采样到48kHz，降低2.1 dB，不加限幅器。没有录屏也能渲染无声版：`npx remotion render Film out/silent.mp4 --props='{"audio":false}'`。

## 修改

| 要改 | 改哪里 |
|---|---|
| 任何时间：字、切点、转场、震屏、小AI的动作 | `src/timeline.ts`；各幕和歌词都从字的时刻取时间 |
| 歌词的位置、样子和动法 | `src/ui/Lyrics.tsx` 里的 `LAYOUT` 和 `motion()`；加了新字后运行 `npm run fonts` |
| 某一幕 | `src/scenes/*.tsx`（Night、Dawn、World、Planet、Spring、Heart） |
| 小AI、光标、心、印章、花瓣、钟 | `src/art/Clawd.tsx`、`src/art/props.tsx`、`src/art/pixel.tsx` |
| 纸张、明信片边框、版面和抖音安全区 | `src/art/paper.tsx`、`src/layout.ts` |
| 转场和结尾的心形窗 | `src/Film.tsx` |
| 世界地图的点阵 | `node scripts/map.mjs --step=4.5`（重写 `src/art/land.ts`） |
| 响度 | `npm run music -- <录屏> --tp=-1.7`（AAC编码前的真峰值；编码器约多出0.1 dB） |

每一帧都是时间的纯函数：不用 `Math.random()`（用 `rng(seed)`），不读时钟，帧与帧之间不保留状态。`npm run verify` 会按不同顺序把同一帧渲染两次来检查；还会检查成片音轨就是音乐切片、没有偏移，因为所有画面动作都按它定时。

## 为什么适合抖音

- **第一帧**：睡着的像素小AI和一个正要敲它的光标；第2帧，第一个字“轻”和歌的第一个音一起出现。
- **节奏**：47个字，加上敲击、盖章、跳跃、心跳，都落在歌的0.2秒网格上；换卡片都在每句的强拍。
- **循环**：最后一拍，「心」打开一扇心形的窗，窗里是片子自己的开头；音乐在第6小节结尾切断，接回第1小节，循环看不出接缝。
- **安全区**：歌词在 y 290–660，明信片在 y 700–1440；底部约480像素和右侧约170像素不放关键内容，留给抖音界面。
- **标题、封面、首帧说同一件事**：一只AI被轻轻敲醒。见 [publish-copy.md](publish-copy.md)。

## 状态

技术检查全部通过。还没做：手机上听、按实际速度看、确认抖音界面遮挡、决定音乐在抖音上怎么处理、发布。这些需要用户审片，见 [production-log.md](production-log.md)。

Remotion 不是 MIT 许可：个人和3人以内的公司免费，更大的公司需要公司许可。见 [CREDITS.md](CREDITS.md)。
