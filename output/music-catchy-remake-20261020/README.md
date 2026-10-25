# 《这首开智小曲，为啥这么上头？》v2 — 复现说明
1080×1920 · 30 fps · 43.18 s（1295 帧）· H.264 + AAC。three.js 0.186.1 + Canvas 2D，headless Chrome 逐帧渲染（每帧都是帧号的纯函数），用 PNG 管道送进 ffmpeg。

| 文件 | 内容 |
|---|---|
| `src/timeline.js` | 唯一的时间来源：cue（吸附到实测起音）、石头路径、重复组、镜头分段、字卡 / 角标文字 |
| `src/narration.js` | **生成文件**（`tools/place_narration.mjs`）：每句旁白的片中时间、真实时长、词边界、sha256 |
| `src/world.js` | 3D 世界：天空、频谱光柱、网格地面、浮尘、石头 / 虚线框、角色（程序建模）、冲击环、③ 的弧线、泛光 |
| `src/film.js` | 每帧状态（角色跳跃、石头落下 / 下沉、镜头）和 2D 层（标题、分段牌、逐词字幕、量尺、低音表、对比标签、重复图例、答案） |
| `src/music.js` | v1 母带的实测特征（起音、小节、逐帧频谱 / 低音），只读复制 |
| `tools/mix.py` | 混音：voice / music stems + master，规则写在文件头，结果写到 `out/audio/mix.json` |
| `tools/verify.mjs` | 成片核验（适配有旁白的片子） |
| `tools/textcheck.mjs` | 字形、旁白排时、窗口一致性、重复组核对 |
| `tools/render.mjs` `tools/fonts.mjs` `tools/place_narration.mjs` | 渲染、字体子集、旁白排时 |

命令和交付流程见 `ASSISTANT_ORDERS.md`；每句话的依据见 `SOURCES.md`。
