# 给神经元装一个光开关

用户已确认的75秒竖屏光遗传学科普片。原创Canvas画面、Web Audio配乐与提示音、中文烧录字幕；交付为字幕叙事版本。

## 交付

| 文件 | 内容 |
|---|---|
| [out/optogenetics.mp4](out/optogenetics.mp4) | 1080×1920、30fps、75秒，H.264/AAC，适配手机播放 |
| [out/optogenetics.srt](out/optogenetics.srt) | 13条独立字幕，覆盖0–75秒 |
| [out/poster.jpg](out/poster.jpg) | 从成片提取的封面帧 |
| [out/contact-sheet.jpg](out/contact-sheet.jpg) | 带时间码的代码渲染检查拼图 |
| [out/encoded-contact-sheet.jpg](out/encoded-contact-sheet.jpg) | 从实际MP4重新抽帧的检查拼图 |
| [out/media-verification.json](out/media-verification.json) | 实际媒体规格、音量测量、完整解码结果 |
| [scientific-sources.md](scientific-sources.md) | 科学事实与限定范围 |

## 修改与复现

本机已验证：Node v24.20.0、Google Chrome、ffmpeg/ffprobe。puppeteer-core固定为24.43.1；中文与英文字体随项目保存，运行时不访问字体CDN。安装依赖需要网络，重新制作字体子集也需要访问字体服务。参考录屏不是渲染依赖。

已实际执行的构建与检查入口：

```sh
npm run build
node verify.mjs
```

构建会生成帧、合成声音、做响度归一与编码。渲染支持断点续跑；修改画面或字幕后，需移除本项目out/frames中受影响的旧帧缓存，再重新构建。源码包不含帧缓存、node_modules和大音频中间文件，首次解压构建不会复用这些缓存。

| 修改目标 | 文件 |
|---|---|
| 章节时间、字幕、光脉冲时间点 | src/timeline.js |
| 神经元、细胞膜、信号、动物与眼睛图解 | src/scenes.js、src/gfx.js |
| 构图、字幕断句、合成层 | src/film.js |
| 原创配乐、提示音 | src/score.js |
| 拖动/播放预览和浏览器导出接口 | index.html |
| 渲染、编码与色彩标记 | render.mjs |
| 中文字幕改字后的字体更新 | subset-font.py、fonts/ |

没有使用参考视频的画面、界面或音轨。所有图解与轨迹均是原理示意，不是实测或细胞精确结构。完整视觉/听感与科学表述仍建议由用户发布前复审。抖音发布、GitHub归档与观看效果分别记录。
