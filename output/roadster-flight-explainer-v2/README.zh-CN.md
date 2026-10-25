# 特斯拉 Roadster v2「一口气」：没有翅膀，它凭什么在空中翻身？

[English](README.md) · [分工](CREDITS.md)

## 实际成片（2026-10-17）

[30 秒完整版](https://github.com/carljings/how-to-make-ai-video/releases/download/production-archive-20261025/roadster-blender-v2.mp4) · [3:4 封面](out/delivery-v2/cover-3x4.png) · [9:16 封面](out/delivery-v2/cover-9x16.png) · [中文字幕](out/delivery-v2/narration-v2.zh-CN.srt) · [技术检查](out/delivery-v2/verification.json) · [画面与封面复核](out/delivery-v2/qa-reviewed/REVIEW.md)

完整 900 帧已在 Apple M4 / Metal 上以 EEVEE 64 采样渲染，使用射线追踪、1024 MB 阴影池和已验证有效的 5 盏主灯灯光链接。Blender 正常退出，零渲染警告。成片 1080×1920、30 fps、30.000 秒，完整解码通过；编码后音频 −14.2 LUFS、真峰值 −1.9 dBTP。81 字旁白来自 Opus 选定的 Yunjian 声线，8 段合计约 20.8 秒；母带逐字识别与锁定脚本一致。

画面抽样复核与封面检查单独记录；主观试听、实际手机观看和人的审美认可没有被技术检查替代。v2 的制作授权来自用户明确交由 Opus 主导的修订指令，`approval.json` 保留原 v1 授权，并区分制作授权与尚未记录的 v2 人工审美认可。

面向抖音的 30 秒中文短片，1080×1920，30 fps。全片只回答一个问题：没有翅膀，它凭什么在空中翻身？

1. 先播放重建的原片动作。
2. 车身倒悬到最高点时，时间停住。
3. 镜头穿进静止的画面，讲清两件事：
   - 气往一边喷，车就被推向另一边；
   - 推力偏离重心，车就转起来。
4. 再说明气存在高压罐里，不燃烧。
5. 时间恢复，车落进自己喷出的气团。答案是：一口气。

Opus 5.5 担任导演，负责剧本、画面代码、矢量图形、字体排版和配乐代码。Codex 负责工具、本地渲染、实测配音（免费 edge-tts）、字体子集和技术检查。75 秒的 v1 单独保留，没有改动。

用户认为 v1 不够酷炫、太啰嗦，v2 推翻了 v1 的整体方向。v1 的车模、场地、原片动作和音频处理代码作为函数库继续使用；v1 自己的 75 秒构建流程不参与 v2。

导演说明和分镜：[CREATIVE_DIRECTION.en.md](CREATIVE_DIRECTION.en.md)，[storyboard-v2.zh-CN.md](storyboard-v2.zh-CN.md)。

## 唯一的时间来源

- `v2/cues.json`：剪辑本身，包括段落与事件时钟、节拍、配音起点、标题、角标、标注和配色。
- `support/narration-v2/`：实测配音（zh-CN-YunjianNeural，−6%，未变速）及其逐词时间。
- `v2/timing.json`：由 `blender/tools/retime_v2.py` 生成，包含配音位置、逐词和字幕短语时间，并做重叠检查。
- `blender/v2_film.py`：纯 Python。
  - `state(t)` 给出机位、车姿（沿用 v1 校正过的原片重建）、喷气、气团、灯光、透视和冰晶。
  - `overlay(fr)` 给出投影后的矢量图形。
  - `roll_check()` 核对力矩方向与实际转动方向一致。
- `blender/render_v2.py`：Blender 画面，只有画面，没有示意几何体和文字。
- `src/v2/`：Remotion 入口 `src/v2/index.ts`，合成 `V2`、`V2Still`、`V2Cover`、`V2Cover34`。
- `scripts/v2/score.mjs`：代码生成的音乐、气流和音效，与配音一起母带处理到 −14 LUFS。
- `scripts/v2/finalize.mjs`、`stills.mjs`、`verify.mjs`：打包、样张合成和成片检查。

只在 `v2/cues.json` 里改时间，然后运行 `npm run v2:retime` 和 `npm run v2:overlay`，画面、图形、字幕和声音会一起更新。

## 命令

```bash
python3 blender/tools/retime_v2.py
python3 blender/tools/export_v2_overlay.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 \
  --python blender/render_v2.py -- --device METAL --engine EEVEE --samples 64 --out-dir <out>/v2-frames \
  --frames 0-899 --skip-existing
node scripts/v2/stills.mjs --dir=<out>/v2-proof/frames --out=<out>/v2-proof/composited
node scripts/v2/finalize.mjs --frames=<out>/v2-frames/frames --out=<out>/v2-delivery
```

`finalize.mjs` 先核对时间文件、导出图形，再重新生成配乐并检查响度。它在独立目录渲染 `V2`（关闭 Webpack 缓存，使用指定的 Chrome，不下载浏览器），生成两种比例封面，封装母带，写出 SRT。完整版还会运行 `verify.mjs`，检查：

- 900 帧完整解码；
- 1080×1920、30 fps，H.264 yuv420p；
- 48 kHz 立体声 AAC；
- 响度 −14±0.3 LUFS，真峰值 ≤ −1.5 dBTP。

这些只是技术检查，画面、声音和手机观看效果需要人来判断。

## 事实边界

- **原片段**只重建马斯克 2026-10-16 帖子（媒体 2110913027490934784）里能看到的内容：外观、翻转顺序和停车阵列。没有坡道、起飞或落地，车最后进入气团。
  - 慢放开场标注「CG 慢放重建」。
  - 恢复段接着同一事件时间继续，不出现第二次飞行，也不倒放。
- **定格讲解段是原理示意**，角标为「原理示意 · 非实拍」：
  - 重心是车体估计；
  - 左右喷口不对称是产生所见滚转方向的一种假设；
  - 每条力线严格与所画气流反向，力矩方向经过计算核对；
  - 压力容器的数量和位置是示意。
- **冷气推进器和碳纤维缠绕压力容器**均注明来自特斯拉的帖子（2110907035571401174、2110904290743402880）。
- **不编造性能参数**：没有质量、压力、喷口数量、容量和续航的未经核实数值；没有火焰；不声称能悬停或没有吊索，画面中的线缆保留但不做解读。
- **结尾「要一直飞，就得一直喷」**是条件句：持续支撑需要持续推力。

发布标题建议：**没有翅膀，它凭什么在空中翻身？**
标签：**#特斯拉 #马斯克 #飞行汽车 #冷气推进 #物理**
