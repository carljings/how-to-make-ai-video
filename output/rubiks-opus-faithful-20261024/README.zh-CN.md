# 魔方视频：按 Opus 原版方式修订 r3

158 秒，1080×1920，30 fps。原版的字幕、构图、运镜、节奏和整条配乐沿用。
本稿由 Codex 按用户明确要求作机械修正；相邻目录中的 Opus 原版 r1 和 Codex 修改稿 r2 均保留。

## 本稿范围

只修正锁标跟随、F2L 配对编号和完成标签的间距。原时间轴、真实动作序列、核心绘制、字体、配乐源码和独立 Chrome 导出程序均相同。
本稿不包含 r2 新增的黑底计时卡、红圈、说明框、机位改变和额外停顿。

- 视频：`out/rubiks-opus-faithful-r3.mp4`。
- 设计说明：`REVISION.zh-CN.md`、`REVISION.md`。
- 原版源码、分块校验和与复用计划：`baseline.json`。
- 渲染输入差异：`out/source-delta.json`。
- 编码与一致性检查：`out/fidelity-verification.json`；成片抽帧检查：`out/visual-review.json`。
- 原配乐：`out/audio/original-score.m4a`，从原版 Web Audio 配乐的 AAC 音轨直接复制。

## 本次使用的命令

环境：Node 24、原 headless Chrome 渲染器（Apple M4 / Metal）、FFmpeg 8、Python 3.9。
没有使用额外 npm 依赖、原生 Canvas 替代实现或其他音频引擎。

```sh
node tools/verify-cube.mjs
node tools/render.mjs src/index.html video out/picture.mp4 --frames 4740 --chunk 90
python3 -I tools/assemble-faithful.py
```

Chrome 渲染器复用已完成分块。本次直接保留原 43 个分块，仅重渲 10 个涉及修正的分块。
一致性检查脚本需要 `baseline.json` 指向的相邻原版视频，用于核对原音轨和每一帧保留画面的编码数据及时间戳。
源码包包含全部渲染源码、字体和原 AAC 音轨，不重复打包原画面分块。

技术和抽帧检查与主观听感、实体手机验收分别判断。事实截点保持 2026-10-23。
本稿不冒称 Opus 新制作或验收，没有付费生成、账号操作或发布环节。
