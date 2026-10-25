# 魔方视频：节奏与动效修改稿 r2

本稿由 Codex 按用户认可的审查清单修改，基于已经保留的 Opus 原片。
158 秒，1080×1920，30 fps；沿用字幕加原创程序配乐形式，无旁白。
原版完整保留在相邻 `../rubiks-opus-20261023`。

## 文件

- 修改稿：`out/rubiks-polish-r2.mp4`。
- 已确认的改动：`REVISION.zh-CN.md`、`REVISION.md`。
- 统一时间轴：`src/timeline.js`；真实动作和停顿：`src/seqs.js`。
- 锁定标记：`src/scenes/count.js`；配对编号和阶段标签：`src/scenes/methods.js`。
- 配乐：`src/score.js`；原始和母带 WAV 在 `out/audio/`。
- 检查：`out/revision-checks.json`、`out/rubiks-polish-r2.verify.json`、`out/visual-review.json`。
- `docs/` 中的原分镜和事实表属于上游原片；本稿以修订设计和当前时间轴为准。
- 上游制作日志保存在 `docs/base-production-log.md`；本稿记录见 `PRODUCTION_LOG.md`。

## 重现

本次使用 Node 24、FFmpeg 8；收尾脚本可用 Python 3.9+。字体已保留在项目内。
下面是本次执行的命令：

```sh
npm install --ignore-scripts --no-audit --no-fund
npm run verify
node tools/render-native.mjs audio
node tools/render-native.mjs video
python3 -I tools/finish.py out/picture.mp4 out/audio/score-raw.wav out/rubiks-polish-r2.mp4
```

原版完整性检查需要相邻的原项目；渲染本身不依赖原目录。分块缓存同时核对源码、字体和运行适配器指纹。
画面通过 @napi-rs/canvas 离线运行同一套场景模块；Web Audio 通过 node-web-audio-api 离线生成。
浏览器与原生 Canvas 的栅格化实现存在区别，因此按本稿实际输出重新审片。

修改字体子集后才需要 `requirements-fonts.txt` 和 `tools/merge-fonts.py`。原生 TTF 来自原 WOFF2 字体分片合并；中文标点单独检查，科学计数法指数用小号数字排版，避免缺字。

本稿是供用户试看的第一轮修改。技术检查、抽帧审看、主观听感和实体手机验收分别判断。
事实截点保持 2026-10-23。本次没有账号操作、付费生成或发布环节。
