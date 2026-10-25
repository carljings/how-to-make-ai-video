# 《比墙还陡》：轨道吸附＋空中翻转

[English](README.md)

[58.3秒完整版](https://github.com/carljings/how-to-make-ai-video/releases/download/production-archive-20261025/roadster-blender-v3.mp4) · [抖音3:4封面](out/delivery-v3/cover-3x4.png) · [9:16封面](out/delivery-v3/cover-9x16.png) · [中文字幕](out/delivery-v3/narration-v3.zh-CN.srt)

Opus5.5/max主导导演、审美、剧本、3D场景、镜头、图形、排版与原创代码配乐。Codex负责工具、配音、字体、渲染、打包与验收，并按既定完整底片要求修正了结尾取景、字幕避让和云团遮挡。[实际英文协作记录](CLAUDE_COLLABORATION.md) · [分工与素材来源](CREDITS.md)。

## 本次实际交付

- 1080×1920，30fps，58.300秒，1749帧，约30MB，H.264/BT709与48kHz立体声AAC。
- 155字中文旁白，16段实测共37.679874秒，未变速；编码后−14.1LUFS、真峰值−1.9dBTP。
- 完整解码与技术检查通过；实际最终视频19处抽样及两种封面缩略图检查通过。[验收记录](out/delivery-v3/qa-reviewed/REVIEW.md) · [机器检查](out/delivery-v3/verification.json)。
- 主观试听、实际手机完整观看及用户审美认可尚未完成；本地制作与抖音发布分别记录。

## 内容与边界

车底风扇降低缝隙压力，外侧空气把车压向坡面，轮胎获得抓地；坡面转向时吸附方向跟着转，重力仍朝下。离开表面后，高压气喷出产生反作用；另一场演示里的偏心推力则形成转动力矩。结尾用完整多次曝光图把两套机制连在一起。

两场官方演示明确分开。车辆、坡面、气流、受力与内部罐体均为CG重建或原理示意；内部位置不是厂商CAD。没有使用未经核实的压力、推力、气量、飞行高度或续航数字。[科学与原片依据](scientific-sources.md)。

旧版独立保留。开场156帧与4张静态图在逐帧物理状态等价核对后复用，原始版本、目标锁定源码与素材哈希均有记录；不是默默混用版本。最终所需的549张逐帧画面、176张RGBA动画图层与20张静态图已齐备（包含上述核对后复用的素材）。

## 工程

[分镜](storyboard-v3.zh-CN.md) · [导演说明](CREATIVE_DIRECTION-v3.en.md) · [旁白逐字](narration-lines-v3.json) · [制作日志](production-log.md) · [发布文案](publish-copy.md)

时间与字幕：`v3/cues.json`和`v3/timing.json`；几何/动作/镜头：`blender/v3_ramp.py`、`v3_film.py`和`render_v3.py`；视觉合成：`src/v3`；音乐：`scripts/v3/score.mjs`；技术打包：`scripts/v3/finalize.mjs`。NotoSC五种真实静态字重与OFL随工程保留。最终素材源锁在`out/final-frames-01/source-lock.json`。

本次完整打包实际执行：

```sh
node /Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/scripts/v3/finalize.mjs --plates=/Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/out/final-frames-01 --out=/Users/guchuan/Desktop/how-to-make-ai-video/output/roadster-flight-explainer-v3/out/delivery-v3
```
