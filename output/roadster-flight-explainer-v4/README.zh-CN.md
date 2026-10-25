# Roadster 原理讲解 v4「光切」

2026-10-18：58.3秒完整版已输出，编码检查与关键帧视觉复审通过。Opus 5.5 / max 主导导演和审美，Codex协助工具、渲染与验收。

- [完整视频](https://github.com/carljings/how-to-make-ai-video/releases/download/production-archive-20261025/roadster-blender-v4.mp4)
- [9:16封面](out/delivery-v4/cover-9x16.png) · [3:4封面](out/delivery-v4/cover-3x4.png)
- [中文字幕](out/delivery-v4/narration-v4.zh-CN.srt)
- [实际英文协作记录](CLAUDE_COLLABORATION.md)
- [中文分镜](storyboard-v4.zh-CN.md) · [导演方案](CREATIVE_DIRECTION-v4.en.md)
- [输出校验](out/delivery-v4/verification.json) · [实际编码画面](out/delivery-v4/qa-reviewed/encoded-contact.jpg)

修正了坡顶缺少真实直板的问题，并重新拟合倒悬、离坡和空中姿态。开场改为倒悬近景、拉远显示整座坡，再用光切扫描进入压力、抓地和冷气推进的讲解。两场演示保持区分。

原片形状与姿态是视觉拟合，尺寸不是特斯拉官方测量；内部结构、光切、气流和受力是原理示意。原片残差与边界见 [FULL_READY.md](FULL_READY.md) 和 [科学来源](scientific-sources.md)。

交付规格：1080×1920、30fps、H.264、立体声AAC；1749帧完整解码通过，编码音频−14.2 LUFS /−1.9 dBTP。最终混音SHA与离线识别、响度核对使用的文件一致。已查看最终24个抽帧画面和两种封面；主观试听、实际手机观看及用户审美认可尚未记录。

v3与本轮样片独立保留。最终封面检查发现的地面共面闪斑由Codex作6毫米渲染几何分离修正，并重新输出不透明画面；未受影响的透明图层按依赖与像素对照证据复用。详见 [制作记录](production-log.md) 与 [分工来源](CREDITS.md)。未执行发布或Git推送。
