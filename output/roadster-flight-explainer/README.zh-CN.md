# 没有翅膀，靠什么飞？

面向抖音的 75 秒中文科普片，1080×1920、30 fps。Opus 5.5 负责 Blender 车模、场景、动作、讲解时间线、Remotion 字幕版式与封面、代码配乐；Codex 负责参考分析、工具接入、局部修正、本地渲染和独立技术验收。具体分工见 [CREDITS.md](CREDITS.md)。

当前成片：完整 75 秒版本已通过编码输出的技术检查，包括 2250 帧、原生 1080×1920／30 fps、完整解码、40 条实际字幕排版检查，以及 −14.1 LUFS／−2.1 dBTP 的封装后声音指标。已按时间抽检原片重建与全部讲解段，并检查两个比例封面的实际缩略图。见本地[技术报告](out/delivery-v1/verification.json)和[独立画面复核](out/delivery-v1/qa-independent-late/REVIEW.md)。主观试听和实体手机审美验收仍未完成，需分开确认。

参考是[马斯克 2026 年 10 月 16 日发布的视频](https://x.com/elonmusk/status/2110913107094606330)。开头按原时间重建其中前 14 秒的翻转剪辑，再做竖屏取景。参考对象是这条翻转视频。车身与停车阵列依据画面推断，并非厂商 CAD；近景机位和被遮挡的运动仍是视觉近似。

14 秒后讲解贴地吸附、喷气反作用、力矩、有限气量，以及翻转和稳定悬停的区别。画面持续标注「原理示意 · 非现场画面」，推断的内部结构另标「非厂商结构图」。示意图不代表特斯拉结构图或实测性能。

## 从实际渲染帧合成

需要项目锁定的 Node 依赖、Python 3、FFmpeg/ffprobe 和已安装的 Chrome。Blender 渲染由渲染负责人单独执行；合成脚本不会启动 GPU 渲染。输入目录必须已有全部 2250 张实际画面：`f00000.png` 至 `f02249.png`，原生尺寸 1080×1920。渲染参数见 `blender/render_film.py`。

在本项目目录执行：

```bash
npm run typecheck
npm run verify:captions -- --out=/absolute/path/to/caption-check
npm run finalize -- --frames=/absolute/path/to/film-frames/frames --out=/absolute/path/to/delivery
npm run verify -- --out=/absolute/path/to/delivery
```

输入变化时使用新的输出目录；已暂存的同名帧哈希不一致会报错。可以用 `--chrome=/absolute/path/to/Chrome` 指定浏览器，脚本不会下载浏览器。`--concurrency=3` 控制字幕合成并发数。

合成脚本先运行 `blender/tools/export_overlay.py` 更新标注和声音事件，检查字库，再用 `scripts/score.mjs` 在本地生成 Opus 的配乐、音效与总混音。随后在独立运行目录暂存真实画面及字体，关闭 Webpack 缓存，渲染实际 `Film` 合成并封装总混音，保留原有项目素材。不涉及付费媒体 API 或自动发布。

Python 导出工具是必要构建输入；缺失时会明确报错停止。已有 JSON 本身不能证明它与修改后的动画代码一致。

交付文件：

- `roadster-flight-explainer.mp4`：H.264 CRF 16、yuv420p、BT.709、30 fps；48 kHz 双声道 AAC，256 kb/s。
- `cover-9x16.png`、`cover-3x4.png`、`narration.zh-CN.srt`。
- `metadata.json`、`plate-manifest.json`、`caption-layout.json`、`verification.json`：记录哈希与实际测量结果。

少量帧的集成检查可增加 `--range=0-29`，并提供相应真实帧。这会生成 `partial-proof.mp4`，明确标记为局部样片，不执行成片验收，也不能通过完整成片校验。随附字幕仍使用完整影片时间线。

## 验证范围

`verify-film.mjs` 会完整解码输出，检查 2250 帧、原生尺寸、30 fps、75 秒、有声轨、哈希、封面尺寸、字幕与原稿的文字和时间，以及实际字幕组件在 Chrome 中的文字边界和字体加载。测量封装后 AAC 的响度，要求 −14 LUFS ±0.3 LU、真峰值不高于 −1.5 dBTP。交付必须显式使用真实帧，禁止使用排版测试卡。

这些检查不能代替完整观看、主观听审和手机复审，也不能证明每个动作已与原视频精确一致或预测播放量。字幕分句时间来自 ASR 索引估计，并非强制对齐。每个输出版本应以自己的验收报告为准。

科学边界：吸附朝向附近路面；气体排出产生反向推力；偏离重心的推力产生力矩；短暂翻转不等于稳定悬停；竖直合力为零本身不代表速度为零；气体充满容器，不能画成液面下降。实际车重、气压、容积、喷口结构、续航、线缆是否承重、清晰起飞瞬间和被遮挡的落地点均未由这次重建证实。

建议标题：**没有翅膀，靠什么飞？** 内容匹配标签：**#飞行汽车 #特斯拉 #马斯克 #冷气推进 #物理科普**。这是发布文案建议，不能保证推荐或百万播放。
