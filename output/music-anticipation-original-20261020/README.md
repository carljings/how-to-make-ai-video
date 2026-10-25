# 《等它落下来》— 复现说明

1080×1920 · 30 fps · 42.44 s（1273 帧）· H.264 + AAC。Canvas 2D（headless Chrome 逐帧）+ ffmpeg；**无 npm 依赖**。
需要：Node ≥ 22、Google Chrome、ffmpeg ≥ 6、Python 3 + numpy（音乐分析/剪辑）、Pillow（联络表，可选）。

```sh
REF=<path>/reference-audio.m4a                     # 用户提供的音轨（sha256 6987131e…4b61）
python3 tools/analyze_source.py "$REF"             # 源音乐实测 → assets/source-analysis.json（已随项目提供）
python3 tools/edit.py "$REF"                       # 剪辑/增益 → out/audio/master.wav + assets/edit-plan.json
python3 tools/analyze_master.py                    # 最终音轨逐帧特征/起音 → src/music.js（已随项目提供）
node tools/cues.mjs && node tools/textcheck.mjs    # cue 清单（docs/CUE_SHEET.md）与字卡/字形检查
node tools/render.mjs --stills 0,92,603,1049,1177 --out out/stills
node tools/render.mjs --video --out out/picture.mp4
node tools/verify.mjs --mux --ref "$REF"           # → out/deng-ta-luo-xia-lai.mp4 + out/verification.json
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 0:1273:6 --out out/contact/whole
```
`src/timeline.js`（时间/字卡/角标/脚注）· `src/film.js`（逐帧合成）· `src/viz.js`（期待核、频谱环、迸发、曲线）· `src/brain.js`（冠状切面示意）· `src/music.js`（生成）。文档：`brief.md`、`docs/script.md`、`docs/CUE_SHEET.md`、`SOURCES.md`、`production-log.md`、`ASSISTANT_ORDERS.md`。
