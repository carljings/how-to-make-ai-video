# 《两次起飞》— 复现说明（v5；v3.1、v4.1 存档于 versions/）

竖屏 1080×1920 · 30 fps · **39.8 s（1194 帧）** · H.264 + AAC。v5 只改尾段：音乐在 35.54 s 接回同曲开头两小节与它自己的停顿（`src/timeline.js` MUSIC_MAP），车落地、双画面片名、在曲子的停顿上淡黑。两场 Roadster 演示（特斯拉 The Ramp 倒挂爬坡 / 马斯克停车场起飞翻转）+ 三个原理（压差 / 反推 / 力矩），按用户指定 BGM 的实测鼓点剪辑。代码渲染：three.js（3D）+ Canvas 2D（字幕、标注），headless Chrome 逐帧采集，PNG 管道直送 ffmpeg。

## 需要
Node.js ≥ 22、Google Chrome（或 `--chrome <path>`）、ffmpeg ≥ 6、Python 3 + numpy（音乐分析与同步核验）。

## 命令
```sh
npm ci                                                   # 只装 three@0.186.1
python3 tools/music_analyze.py <reference-original.m4a>   # 可选：重测音乐 → assets/music/analysis.json + src/music.js（已随项目提供）
node tools/cues.mjs                                      # cue 清单 → out/cues.json + docs/CUE_SHEET.md
node tools/textcheck.mjs                                 # 字卡阅读停留/交叠检查
node tools/bgm.mjs --ref <reference-original.m4a>        # 音轨 → out/audio/master.wav（原曲 0 dB；一处 15 ms 衔接接回曲子开头两小节与它自己的停顿）
node tools/render.mjs --stills 0,300,700 --out out/stills    # 关键帧 + 联络表
node tools/render.mjs --video --gl metal --out out/picture.mp4   # 整片画面（M4 约 90 s；本服务器 SwiftShader 约 1 小时）
node tools/verify.mjs --mux --ref <reference-original.m4a>   # 合成 out/liangci-qifei.mp4 并核验 → out/verification.json
python3 tools/sync_check.py out/liangci-qifei.mp4 --ref <reference-original.m4a>   # 从成片本身重测切点/起音、音频映射、片尾淡黑与静音 → out/sync-check.json；退出码 0 = 全部门槛通过
```

## 文件
| 文件 | 内容 |
|---|---|
| `src/music.js` | **生成**：实测拍/起音/结构（由 `tools/music_analyze.py` 写入） |
| `src/timeline.js` | 唯一时间来源：cue（按小节.拍吸附检测起音）、镜头、字卡、角标、片尾 |
| `src/world3d.js` | 3D：坡道/停车场/力矩实验室三个场地、两台车、剖切（裁切平面 + 气压场切面着色器）、空气与撞击粒子、喷流、气云、箭头/虚线/弧 |
| `src/film.js` | 每帧合成：21 个镜头、3D 锚定标签、储气表、倒带、字幕、角标、淡出 |
| `tools/bgm.mjs` `tools/verify.mjs` `tools/sync_check.py` `tools/cues.mjs` `tools/textcheck.mjs` `tools/render.mjs` `tools/fonts.mjs` | 音轨、核验、同步核验、cue 清单、字卡检查、渲染、字体子集 |
| `brief.md` `storyboard.md` `production-log.md` `SOURCES.md` `docs/CUE_SHEET.md` `ASSISTANT_ORDERS.md` | 简报、分镜、制作记录、来源/科学依据、cue 清单、给助理的执行单 |

每帧都是帧号的纯函数（无随机、无时钟），可分段并行渲染后拼接。
