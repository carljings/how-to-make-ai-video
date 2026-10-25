# 《看不见的十吨》— 复现说明

竖屏 1080×1920 · 30 fps · **v2：42.3 s（1269 帧）**，120 BPM 剪辑网格 · H.264 + AAC。代码渲染：three.js（3D）+ Canvas 2D（图解与字幕），headless Chrome 逐帧采集，PNG 管道直送 ffmpeg。

## 需要
Node.js ≥ 22（用内置 WebSocket/fetch）、Google Chrome（或 `--chrome <path>`）、ffmpeg ≥ 6。无需 GPU（默认 SwiftShader；Mac 上可 `--gl metal`）。

## 命令
```sh
npm ci                                            # 只装 three@0.186.1（package-lock.json 锁定）
node tools/fonts.mjs                              # 可选：重新子集化 Noto Sans SC（已随项目提供 assets/fonts/）
node tools/score.mjs                              # 配乐 → out/audio/master.wav（−20 LUFS，≤ −6 dBTP）+ 5 个分轨 + score.json
node tools/render.mjs --stills 0,300,870 --out out/stills   # 关键帧 + 联络表
node tools/render.mjs --video --workers 2 --out out/picture.mp4   # 整片画面（4 核 SwiftShader 约 40 分钟；Mac 加 --gl metal 约 2 分钟）
node tools/textcheck.mjs                          # 字卡停留与交叠检查（v2 规则）
node tools/verify.mjs --mux                       # 合成 out/kanbujian-de-shidun.mp4 并核验 → out/verification.json
```

## 文件
| 文件 | 内容 |
|---|---|
| `src/timeline.js` | 唯一时间来源：镜头、事件、字幕卡、角标 |
| `src/world3d.js` | 3D 舞台：车/坡网格、灯光、空气粒子、喷气、气云、受力箭头、泛光 |
| `src/gfx2d.js` | 2D 图解：十吨空气柱、四面八方、车底剖面 |
| `src/film.js` | 每帧合成：镜头状态、字幕动画、角标、淡出 |
| `tools/score.mjs`, `tools/dsp.mjs` | 原创配乐与母带 |
| `tools/render.mjs` | 渲染驱动（CDP，零依赖） |
| `tools/verify.mjs` | 合成与真实核验 |
| `tools/textcheck.mjs` | 字卡阅读停留与交叠检查 |
| `LICENSES/` | three.js MIT、Noto Sans SC OFL 许可全文 |
| `brief.md` `storyboard.md` `production-log.md` `SOURCES.md` | 创意简报、分镜、制作记录、来源/许可/科学依据 |

每帧都是帧号的纯函数（无随机、无时钟），可任意分段并行渲染后拼接。
