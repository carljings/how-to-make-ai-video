# ASSISTANT_ORDERS — 《等它落下来》v1（Opus 5.5 主创/实现；Codex 执行渲染与核验）

## 源已冻结
`out/v1-source.sha256`（23 个文件：index.html、package.json、src/*、tools/*、assets/fonts/*、assets/source-analysis.json、assets/edit-plan.json、LICENSES；清单本身 sha256 `dc099bc24d577d59daf9a1bf5059df048d061bef6a668d351aca2fe3463689a7`）。
音乐源（项目外，不在清单内）：`.omx/artifacts/music-anticipation-original-20261020/assets/reference-audio.m4a`，sha256 `6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61`。
不改任何源码/参数。**不要重跑** `tools/analyze_source.py` 或 `tools/analyze_master.py`（`assets/source-analysis.json`、`assets/edit-plan.json`、`src/music.js` 已冻结；本机 ffmpeg 版本不同会让它们产生微小差异）。

## M4 执行（照抄；REF 换成本机路径）
```sh
REF=<path>/reference-audio.m4a
shasum -a 256 -c out/v1-source.sha256                 # 23 项全部 OK
shasum -a 256 "$REF"                                  # 应为 6987131e…4b61
node tools/textcheck.mjs                              # 14 cards … glyphs all in subset，退出码 0
node tools/cues.mjs                                   # 18 cues; max |frame − onset| 16 ms
python3 tools/edit.py "$REF"                          # → out/audio/master.wav + out/audio/edit-plan.json（不改冻结的 assets/edit-plan.json）
node tools/render.mjs --video --workers 1 --out out/picture.mp4
node tools/verify.mjs --mux --ref "$REF"              # → out/deng-ta-luo-xia-lai.mp4 + out/verification.json；退出码 0 = 9 项全过
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 0:1273:6 --cols 10 --out out/contact/whole
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 86:112:1 --cols 9 --out out/contact/release1
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 597:622:1 --cols 9 --out out/contact/release2
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 975:1080:3 --cols 9 --out out/contact/wait3-release3
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 1170:1273:3 --cols 9 --out out/contact/ending
python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 0,60,92,156,220,284,320,347,411,475,539,603,667,760,794,858,985,1049,1113,1177,1205,1235,1272 --out out/contact/key --full
```
服务器参考：`out/audio/master.wav` sha256 `cdb63c5060e77f5090550f269a87f882020f980327a296a9558c9f17361bad43`（−11.4 LUFS / −1.3 dBTP）；M4 不同只需报告（ffmpeg 解码/重采样差异）。服务器用黑底替身 + 真实 master 跑 verify：9 项全过，编码音频与 master、与源音三段映射时延 0 ms、r ≥ 0.9997。

## 回传证据（全部从编码后的 MP4 取）
1. `out/verification.json`、`out/cues.json`、`out/audio/edit-plan.json`（M4 生成，请与冻结的 assets/edit-plan.json 对比并报告差异）全文与各命令退出码、耗时；成片字节数与 sha256。
2. 上面所有 contact 表与 key 全尺寸帧。
3. 音频：每 0.1 s 的 RMS / 短时响度（尤其 2.6–3.6 s、19.6–20.6 s、32.3–35.5 s、39.0–42.44 s）；两处拼接点（片 32.8234–32.8484 s、39.2089–39.2339 s）前后 50 ms 的波形或最大样本差。
4. 任何页面报错、缺字方框、文字被右侧/底部平台 UI 区域遮挡的风险（右侧 x>940、底部 y>1560 区域内是否有关键字）。

## 需要真人
**音乐从未被任何人试听。** 请用户实际播放：两处拼接（第 3 次等待加长一小节、结尾最后一击）听起来是否自然；三次“落下”是否落在听感上的 drop；整体是否“震撼、想一直看下去”。原话转我。

## 授权提醒
音乐来自参考录屏，曲名/作者/授权未核，本项目无授权；仅作可试听草片，公开发布前需确认授权或换授权音乐。
