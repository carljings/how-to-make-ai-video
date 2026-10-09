# 给神经元装一个光开关 · V2

[English](README.md) · **简体中文**

沿用用户已批准的75秒竖屏分镜。V2增加中文旁白、透视镜头、景深、细胞体积与多尺度泛光；V1保留在相邻的 `optogenetics-film` 目录。

绘制方法参考用户已有的Opus 5.5中微子作品；本版由Codex辅助实现，没有成功调用新的Opus 5.5。具体来源见[CREDITS.md](CREDITS.md)与[返工要求](quality-rebuild.md)。

| 交付文件 | 内容 |
|---|---|
| [out/optogenetics-v2.mp4](out/optogenetics-v2.mp4) | 1080×1920、30fps、75秒，H.264/BT.709与立体声AAC；中文旁白＋烧录字幕 |
| [out/optogenetics-v2.srt](out/optogenetics-v2.srt) | 同一时间线上的独立字幕 |
| [out/poster.jpg](out/poster.jpg) | 实际MP4抽出的封面帧 |
| [out/encoded-contact-sheet.jpg](out/encoded-contact-sheet.jpg) | 编码后的画面检查拼图 |
| [out/media-verification.json](out/media-verification.json) | 全片解码、实际规格和最终AAC响度测量 |
| [out/speech-verification.json](out/speech-verification.json) | 旁白时序与信号检查；不代表自然度评分 |
| [voice/narration.wav](voice/narration.wav) | 可复用的中文旁白资产 |
| [publish-copy.md](publish-copy.md) | 标题、标签与简介工作稿 |

## 修改与复现

本机通过Node、Chrome、FFmpeg制作；puppeteer版本固定在lockfile中，字体、许可证和已生成的旁白都在项目内。渲染不依赖参考录屏或云端语音调用；依赖安装需要联网。

以下入口已在本目录实际运行：

```sh
npm ci --ignore-scripts
npm run build
node verify.mjs
```

帧渲染支持续跑；修改画面或字幕后，需要移除本项目 `out/frames/` 内受影响的旧JPEG，再重建。源码压缩包不含帧缓存，首次解压不复用旧帧。

| 修改内容 | 文件 |
|---|---|
| 章节/字幕/旁白时间与光脉冲 | src/timeline.js |
| 三维投影、树突与细胞体积 | src/world.js |
| 每幕动画 | src/scenes.js |
| 粒子、景深、泛光与暗角 | src/cinema.js |
| 字体、字幕断句与合成 | src/film.js |
| 中文旁白与原创配乐/音效混合 | src/score.js |
| 改词后重新生成旁白 | tools/narrate.py；版本见tools/voice-requirements.txt |
| 更新本地中文字体子集 | subset-font.py |

本机已运行隔离Python环境中的 `.venv/bin/python tools/narrate.py`；环境本身不打包。改词后重新生成旁白、核对时序，并补齐新增汉字字体。现有旁白可以离线复用。

[科学来源](scientific-sources.md)记录光敏蛋白表达前提、不同激活/抑制工具、实验条件和一个早期视网膜治疗案例的部分物体辨识结果。形体与信号均为原理示意。抽帧和技术检查不能证明已经达到用户的主观品质参照，仍需用户完整审听、审片。本目录随2026年10月9日成果提交归档到GitHub；抖音发布尚未执行。
