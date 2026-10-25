# 魔方视频 r4：记录、结构与 20 步

180 秒，1080×1920，30 fps。字幕加原创音乐，无旁白。成片：`out/rubiks-recut-r4.mp4`。

本稿由 Codex 根据用户确认的文案及参考制作，沿用 Opus 原片的 Canvas 2D 魔方绘制、Chrome 逐帧导出、Web Audio 音色及 FFmpeg 后期。开场连接到同一只魔方的结构；证明段参考 Polylog 的细同心圆和节点路径，之后单独交代实际分组、覆盖和补查证明。结尾网址留屏并平滑收束。

- 0–50 秒：官方纪录、结构、状态数量。
- 50–104 秒：计步、双向搜索示意、计算证明、上帝之数。
- 104–164 秒：单次与平均、三种方法、广州比赛。
- 164–180 秒：数字回扣、计时归零、carljings.top/cube/。

主要入口：`src/film.js`、`src/timeline.js`、`src/seqs.js`、`src/scenes/search-rings.js`、`src/score.js`。原字体保持，新增字符使用同版本 Noto Sans SC 补字子集。参考源码与 MIT 许可在 `docs/references/`。

当前文案在 `docs/APPROVED_COPY.zh-CN.md`，当前分镜在 `docs/STORYBOARD-r4.zh-CN.md`；原版 BRIEF/STORYBOARD 保留作参考。技术报告在 `out/rubiks-recut-r4.verify.json`，路径状态核验在 `out/reference-ring-verification.json`，编码后抽帧在 `out/review/final/`。

已检查实际编码文件的长度、帧数、完整解码、响度、真峰和关键画面。没有声称整片连续听审或实体手机测试，审美效果由用户试看。原 r1/r2/r3 均保留。iCloud 交付为副本，校验哈希相同；本机写入不等于确认云端同步。
