# 制作日志：给神经元装一个光开关

已确认规格：75秒、9:16、1080×1920、30fps；代码动画；中文烧录字幕与原创配乐。首版本地完成日期：2026年10月9日。

| 项目 | 状态 | 证据/文件 |
|---|---|---|
| 用户选题授权 | 已有 | 2026年10月9日：“下一个做这个视频”；光遗传学录屏 |
| 参考媒体探测 | 已完成 | 本地参考分析记录；媒体结论见reference-analysis.md |
| 参考帧检查 | 已完成 | reference-sheet.jpg、frame-000.png、每秒主体frames |
| 可见文字定位 | 已完成，OCR需校对 | caption-ocr.json |
| 音轨提取 | 已完成；未听音核对 | reference-audio.wav |
| 关键科学来源 | 已核查 | scientific-sources.md |
| 简报 | 已写草案 | brief.md |
| 分镜确认 | **已确认** | 2026年10月9日用户回复“按这版分镜继续制作” |
| 新片场景代码 | 已实现、浏览器验证通过 | src/timeline.js、gfx.js、scenes.js、film.js、score.js |
| 镜头/幕检查 | 已检查10幕多个时刻及编码后拼图 | out/contact-sheet.jpg、encoded-contact-sheet.jpg |
| 确定帧/排版 | 已验证 | out/verification.json；帧不依赖渲染顺序，文字未超出画布 |
| 中文字体 | 已随项目保存，225/225字形覆盖 | fonts/与字体检查 |
| 完整帧渲染 | 已完成2250帧 | 已编码到75秒MP4；中间缓存不作为交付依赖 |
| 原创声音 | 已合成与测量 | 最终AAC为−14.01 LUFS，真峰值−2.62 dBTP；主观听感待用户复审 |
| 成片/字幕/封面 | 本地首版已完成 | out/optogenetics.mp4、optogenetics.srt、poster.jpg |
| 兼容性/解码 | 已通过 | H.264/yuv420p/BT.709、AAC48kHz立体声；完整解码无错误，见media-verification.json |
| 完整视听认可 | 待用户复审 | 机器验证和抽帧不替代完整带声音观看的审美判断 |
| 抖音发布/GitHub归档 | 本版随2026年10月9日成果提交归档到GitHub；抖音尚未发布 | 制作、归档与观众发布分别验收 |

检查工具限制：本机ffmpeg没有drawtext；参考拼图无烧录时间码，格子按0、4、8…秒读取。新片文字拟由Canvas绘制，检查输出可由浏览器标记时间码。
