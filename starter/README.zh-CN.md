# 入门短片：一部用代码画出来的片子

[English](README.md) · **简体中文**

一部完整的 15 秒短片（画面、音乐、标题）：片子本身约 350 行 JavaScript，外加一个 150 行的渲染器。复制这个文件夹就能开始做你自己的片子。

![抽帧拼图：每秒一帧](../docs/media/starter-sheet.jpg)

## 构建

需要：Node.js 18+、Google Chrome 或 Chromium、ffmpeg。

```sh
npm install
npm run build          # 帧 → 配乐 → out/film.mp4（4 核 CPU、无 GPU 约一分钟）
```

或者一步一步来：

```sh
node render.mjs --serve                    # 工作室：在 http://localhost:8123 拖动和播放
node render.mjs --range=0:15:1 --cols=4    # 抽帧拼图，每秒一帧 → out/sheet.jpg
node render.mjs --frames --workers=4       # 450 帧 → out/frames/（可断点续渲）
node render.mjs --audio                    # 配乐 → out/mix.wav
node render.mjs --encode                   # −14 LUFS 母带 + H.264 → out/film.mp4
```

如果 Chrome 不在常规位置，设置 `CHROME_PATH`（或传入 `--chrome=<路径>`）。有 GPU 的机器可以加 `--gpu`。

## 文件

| 文件 | 是什么 | 改它可以…… |
|---|---|---|
| [`src/timeline.js`](src/timeline.js) | 尺寸、帧率、时长、时间点、场景时间窗、字幕 | 改节奏、时长、文字 |
| [`src/scenes.js`](src/scenes.js) | 每个场景画什么（`draw` = 发光的光层，`overlay` = 清晰的文字） | 改画面 |
| [`src/film.js`](src/film.js) | 合成一帧：背景 → 光 → 辉光 → 文字 → 暗角 → 淡入淡出 | 改整体风格 |
| [`src/score.js`](src/score.js) | 配乐：铺底和弦、FM 钟声、上升音效、低音轰鸣，时间点都来自时间线 | 改音乐 |
| [`src/lib.js`](src/lib.js) | 缓动、关键帧、带种子的随机数 | |
| [`index.html`](index.html) | 页面：工作室控件，以及 `render.mjs` 调用的接口 | |
| [`render.mjs`](render.mjs) | 驱动无头 Chrome，输出帧和音频，做母带并编码 | |

## 改成你自己的

1. 写好你的[简报](../templates/zh-CN/brief.md)和[分镜](../templates/zh-CN/storyboard.md)。
2. 把分镜里的时间填进 `timeline.js` 的 `CUE`、`SCENES` 和 `CAPTIONS`。
3. 在 `scenes.js` 里每个场景加一个对象，带 `draw(ctx, t, s)` 和 / 或 `overlay(ctx, t, s)`，并在 `SCENES` 里登记。
4. 每做完一个场景，渲染这段时间的抽帧拼图看一看。
5. 改 `score.js` 里的和弦和时间点，然后 `npm run build`。

保持每一帧都是 `t` 的纯函数：不用 `Math.random()`（用 `rng(seed)`）、不读时钟、不从上一帧继承任何东西。原因见[第 3 章](../docs/zh-CN/03-path-b-code.md)。

## 让 Claude 在此基础上做

> 这是我的简报：…… 请用 `starter/` 里的引擎，先写分镜。我确认后，一幕一幕地做；每做完一幕，用 `node render.mjs --range=…` 渲染抽帧拼图，检查后再继续。每一帧都必须保持是 t 的纯函数。

字体：Inter 和 JetBrains Mono（SIL Open Font License，见 `fonts/OFL-*.txt`）。片中文字是英文，所以没有附带中文字体；如果要放中文，见[第 3 章](../docs/zh-CN/03-path-b-code.md#文字与字体)里截取中文字体的方法。
