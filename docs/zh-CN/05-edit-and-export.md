# 5 · 剪辑与导出

[English](../05-edit-and-export.md) · **简体中文**

大多数 AI 短片的剪辑都很简单：按分镜顺序硬切、加字幕、加标题、做好声音。这些用一个脚本就能完成，也就意味着 AI 助手可以替你做，而且每次修改后都能重新跑一遍。需要手动卡音乐节奏剪辑、或者要在很多镜头上做特效时，再打开时间线剪辑软件（剪映 / CapCut、DaVinci Resolve、Premiere）。

## 脚本

| 脚本 | 作用 |
|---|---|
| [`tools/stitch.sh`](../../tools/stitch.sh) | 按文本文件里的清单拼接片段：裁剪；统一尺寸和帧率（必要时加黑边）；给没有声音的片段补静音；压制字幕；可选铺背景音乐；母带到 −14 LUFS |
| [`tools/review.sh`](../../tools/review.sh) | 给每个片段生成一张带时间码的抽帧拼图，一眼检查镜头 |

```sh
# shots.txt：每行一个片段：<路径> [开始秒] [结束秒]
tools/review.sh clips/*.mp4                                       # 先把每个片段都看一遍
tools/stitch.sh shots.txt episode01.mp4 --size 1080x1920 --fps 30 --srt episode01.srt
```

## ffmpeg 常用命令

以下每条命令在写这一页时都实际运行过。

```sh
# 裁剪（重新编码，精确到帧）
ffmpeg -ss 1.5 -to 9.2 -i in.mp4 -c:v libx264 -crf 18 -c:a aac out.mp4

# 取片段的最后一帧，作为下一次生成的首帧
ffmpeg -sseof -0.1 -i clip.mp4 -frames:v 1 -update 1 last.png

# 两个片段交叉淡化（0.5 秒，从第一个片段的 4.5 秒开始；尺寸和帧率需一致）
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v];[0:a][1:a]acrossfade=d=0.5[a]" \
  -map "[v]" -map "[a]" out.mp4

# 16:9 → 9:16，居中裁切（会丢掉两侧）
ffmpeg -i wide.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a copy vertical.mp4

# 16:9 → 9:16，背景用自身的模糊放大版（画面完整保留）
ffmpeg -i wide.mp4 -filter_complex \
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" \
  -c:a copy vertical.mp4

# 替换声音
ffmpeg -i picture.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out.mp4

# 软字幕（可开关），而不是压制进画面
ffmpeg -i film.mp4 -i film.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=chi out.mp4

# 封面帧和预览 GIF
ffmpeg -ss 12.5 -i film.mp4 -frames:v 1 -q:v 2 poster.jpg
ffmpeg -ss 2 -t 6 -i film.mp4 -vf "fps=12,scale=560:-2,split[a][b];[a]palettegen[p];[b][p]paletteuse" preview.gif

# 某个镜头加速到 1.25 倍（画面和声音一起）
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/1.25[v];[0:a]atempo=1.25[a]" -map "[v]" -map "[a]" out.mp4
```

## 导出设置

一个母版文件几乎哪里都能用：

| 设置 | 值 |
|---|---|
| 容器 | MP4，加 `-movflags +faststart`（下载完之前就能开始播放） |
| 视频 | H.264 High profile，`yuv420p`，CRF 18–20 |
| 音频 | AAC 192 kb/s，48 kHz 立体声，−14 LUFS，真峰值 ≤ −1.5 dBTP |
| 竖屏（抖音、TikTok、Reels、Shorts、视频号） | 1080 × 1920，9:16 |
| 横屏（YouTube、B 站） | 1920 × 1080（或 3840 × 2160），16:9 |
| 帧率 | 保持素材原帧率：生成片段一般 24/25/30，动态图形 30 或 60 |

暗部渐变在压缩后会出现色带。编码前加一点颗粒（`-vf noise=c0s=4:c0f=t+u`），`starter/render.mjs` 默认就会加。

## 上传前检查

- [ ] **带声音**从头到尾完整看一遍
- [ ] 用抽帧拼图检查乱码文字、脸部漂移、黑帧
- [ ] 响度 −14 LUFS（用上面的 `ebur128` 命令）
- [ ] 字幕时间和错别字都没问题；竖屏画面底部 15% 没有重要内容
- [ ] 标题、简介和封面帧准备好
- [ ] 打开平台的 **AI 生成内容**标识
- [ ] 音乐和模型的授权允许这种用途
