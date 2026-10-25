# 配音与字幕辅助素材

[English](README.md)

以 `../../blender/data/film_cues.json` 为只读的时间、文案依据。本目录给 Opus 主制作流程提供素材，不代表最终音画、声音或审美已经验收。

- `clip-01-usable.wav` 至 `clip-07-usable.wav`：已有的 24 kHz 单声道 PCM 配音，复制前后 SHA-256 一致。此前仅裁去首尾静音，保留 100 毫秒安全余量和全部句间停顿。
- `source-hash-manifest.json`：记录声音、服务、工具版本、原始 MP3 哈希、可用 WAV 哈希及裁切依据。声音为 `zh-CN-YunxiNeural`，合成语速 `-3%`，使用未修改的公开 `edge-tts 7.3.1`；第一段直接复用原始试听。本次打包没有发起新的配音请求。
- `narration-stem-75s.wav`：准确 75 秒、48 kHz、双声道 PCM。单声道明确复制到左右声道；重采样不改变播放速度，按统一时间表放置各段。这是纯旁白声轨，尚未加入配乐、音效、增益归一化、响度归一化或最终母带处理。
- `narration.zh-CN.srt`、`caption-cues.json`：40 条统一时间表中的短句字幕，保留短句原文；超过 15 个汉字的短句只增加一次适合阅读的换行。时间来自统一表的 ASR 索引估计，不是独立验收的强制对齐。最终字幕字体、位置和设计由主制作流程处理。
- `verification.json`、`stem-ffprobe.json`、`stem-loudness.log`：记录技术检查和实测结果。当前纯旁白为 **−20.8 LUFS 综合响度、−3.7 dBTP 真峰值**，尚未进行最终混音。七段源文件哈希、完整解码、声轨时长与格式、字幕解析及音频／字幕无重叠检查通过；未声称完成主观试听。

## 重新生成

需要已有的 Python 3、FFmpeg、FFprobe。在仓库根目录执行：

```sh
python3 output/roadster-flight-explainer/support/narration/build_support.py
```

该命令已经实际运行。脚本仅读取统一时间表、本目录七段 WAV 及来源记录，在本地重新生成辅助素材；不会修改统一时间表、调用外部服务或加速配音。若时间表中音频哈希与源文件不一致，检查会失败。
