# 4 · 声音

[English](../04-sound.md) · **简体中文**

观众对画面模糊的容忍度，远高于对糟糕声音的容忍度。每部片子都需要三层声音，以及一个目标响度。

| 层 | 路线 A（生成） | 路线 B（代码） |
|---|---|---|
| **人声** | 模型的原生音频，或单独的文字转语音 / 录音 | 文字转语音或录音，按时间线放置 |
| **音乐** | 生成的音乐、授权音乐，或不要音乐（很多短剧就是没有配乐的） | 根据时间线合成（`score.js`），因此能精确跟随画面 |
| **音效** | 原生音频，或剪辑时添加 | 在与画面相同的时间点合成 |

无论用哪种，都要确认它的授权允许你这样发布。

## 响度：只需要记住一个数

成片母带统一到 **−14 LUFS 综合响度，真峰值 ≤ −1.5 dBTP**。这是流媒体常用的目标：在手机上足够响，而做响度归一化的平台也不需要把它压低多少。这里的两个脚本都会自动处理（`starter/render.mjs --encode`、`tools/stitch.sh`）。

测量任意文件：

```sh
ffmpeg -hide_banner -i film.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A8 Summary
```

## 人声与音乐

音乐要比人声低大约 **15–20 dB**。最简单的办法是固定音量：`stitch.sh --music bed.mp3 --music-db -18`。想让音乐在有人说话时自动让位（闪避）：

```sh
ffmpeg -i voice.wav -i music.wav -filter_complex \
  "[1:a][0:a]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[m];[0:a][m]amix=inputs=2:normalize=0" \
  mixed.wav
```

## 不用听也能找到爆音

在频谱图上，爆音是一条贯穿所有频率的细竖线：

```sh
ffmpeg -i mix.wav -lavfi showspectrumpic=s=1600x360:legend=0:scale=log spectrum.png
```

要检查 **WAV**，而不是最终的 MP4。AAC 编码器在安静段落里会画出它自己的淡淡竖线，那并不是能听到的爆音。钟声和鼓点的起音本来就应该是竖线；除此之外的竖线都是 bug。在 Web Audio 里，最常见的原因是增益节点在包络开始前还停留在默认值 1（见[第 3 章](03-path-b-code.md#用代码做声音)）。

## 字幕

压制进画面的硬字幕在每一份拷贝里都有。软字幕（和视频一起上传的 `.srt`）可以关闭，平台也能自动翻译。竖屏短视频建议压制硬字幕；YouTube 和 B 站可以再上传一份 `.srt`。注意留位置：9:16 画面底部约 15% 的区域会被平台按钮和文案挡住，字幕不要放在那里。
