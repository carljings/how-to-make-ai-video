# PRODUCTION STATE — 三支整片（Opus 5.5）

最后更新：2026-10-21 03:40 CDT（服务器时间）。本文件随进度更新；以 `out/` 里的实际文件为准。

## 三支片

| 片 | 名称 | 源码 | 片长 | 画面技术 | 冻结清单 |
|---|---|---|---|---|---|
| A | 鼓槌砸下来之前，谁会先跳？（P2 微距实验） | `src/p2/` | 28.6 s / 858 帧 | three.js 3D，Chrome 无头 SwiftShader 逐帧 | `out/A-source.sha256` |
| B | 把这首歌卷成一盘，里面藏着3个机关（P3 纸雕数据模型） | `src/p3/` | 37.1 s / 1113 帧 | three.js 3D，同上 | `out/B-source.sha256` |
| C | 一听就想点头？秘密在低音里（AI 历史式逐帧动态） | `src/c/` | 28.6 s / 858 帧 | Canvas 2D，每帧是时间 t 的纯函数，Chrome 无头逐帧截取 | `out/C-source.sha256` |

三支都是 1080×1920、30 fps、H.264 High（BT.709 标注）+ AAC 48 kHz；音乐全部是原录屏 BGM 从 0 秒起的一整段（见 `out/audio/*.json`）。

## 实际步骤（已完成）

1. 读五套提案（`output/music-five-proposals-20261021`，未改动，`MANIFEST.sha256` 校验 OK）的 P2/P3 源码、科学表、实测音乐映射；读 AI 历史两版源码（`.omx/artifacts/music-three-films-20261021/materials/ai-history-reference/`）。
2. 新建本项目，复制 P2/P3 源码与 `music-map.json` 后重写（五套原文件不动）。
3. 渲染器 `tools/render.mjs`：DevTools 协议驱动 Chrome，`film.render(t)` 后整页截图（含 HTML 字幕）直接管道进 ffmpeg，不落盘帧；按 90 帧分块，可续跑。
4. A：鼓皮法线修正（原来朝下导致鼓皮发黑）、镜头沿"Clawd→鼓槌"轴纵深构图、一拍高速定格、长曝光光环（第1遍橙/第2遍蓝）、抽薄时 Clawd 蹲下而米粒几乎不动、20.2–21.1 s 慢放+移动机位、实测低音三柱、结尾延长到 28.6 s；性能：一次场景渲染+深度景深（去掉 BokehPass 二次渲染）、米粒 LOD、MSAA×2。
5. B：曝光与泛光重调、追拍机位抬到纸墙之上、量尺随 Clawd 拉开、"猜下一拍"光圈、红线描→提→搬到第2圈（第1圈留淡影）、16 分音符小纸条、两次纸屑、第二道低谷与第一道同框高亮、数 4·3·2·1、"猜对了"、结尾吊臂拉回俯视三面旗，延长到 37.1 s。
6. C：全新 Canvas 2D 片，见 `README.md`。
7. 原曲音轨：`tools/bgm.py`（A/C 用 `out/audio/A-bgm.wav`，B 用 `out/audio/B-bgm.wav`），源 sha256 校验、整段一次恒定增益 −2.75 dB（原文件真峰值 +1.7 dBTP）、最后一小节余弦衰减、回读与原曲相关 r = 1.0、时延 0 样本。

## 渲染进度

- A：两路渲染中（`out/A-render-w1.log`、`w2.log`，分块在 `out/A-picture.parts/`）。
- C、B：`tools/queue.sh` 已在后台排队（A 完成后依次渲 C、B，各两路），日志 `out/queue.log`。
- 之后：`tools/mux.py` 合成并校验 → `tools/review.py` 从成片抽帧复查 → 写 `REVIEW.md`。

## 继续入口（若中断）

```sh
cd output/music-three-films-20261021
# 已完成的分块会被跳过；再跑同一命令即可续渲。全部分块齐了以后同一命令会只做拼接。
node tools/render.mjs src/p2/index.html video out/A-picture.mp4 --frames 858  --chunk 90
node tools/render.mjs src/c/index.html  video out/C-picture.mp4 --frames 858  --chunk 90
node tools/render.mjs src/p3/index.html video out/B-picture.mp4 --frames 1113 --chunk 90
python3 -I tools/mux.py out/A-picture.mp4 out/audio/A-bgm.wav out/A-鼓槌之前谁先跳-r1.mp4
python3 -I tools/mux.py out/C-picture.mp4 out/audio/A-bgm.wav out/C-秘密在低音里-r1.mp4
python3 -I tools/mux.py out/B-picture.mp4 out/audio/B-bgm.wav out/B-卷成一盘3个机关-r1.mp4
```
（C 与 A 用同一段原曲、同样参数，故共用 `A-bgm.wav`。）

## 待协助项

目前无。服务器可完成全部渲染；若需更快重渲或 60 fps，见 `ASSISTANT_ORDERS.md`（可选）。


---

## 接续（同一模型 claude-opus-5-5 / max，2026-10-21 08:45Z 起）

**决定（Opus）**：最终三支改在 M4（Metal）渲染，服务器只做预览与复核。理由：服务器 SwiftShader 实测 13.7–18.7 s/帧，A+C+B 全片约 4.5 h，任何修改再加数小时；我在复核中要改 A、B 的开场（见下），旧 A 渲染已过时。

**已做**
1. 08:58Z 停止服务器上的旧渲染：先停 `tools/queue.sh`（未启动 C/B），再停 A 两路 node、其 Chrome 与 ffmpeg 子进程；删除本项目自己的两个临时 Chrome profile（/tmp/three-films-chrome-*，228 MB）。**未删除任何分块**：`out/A-picture.parts/` 里 00000–00179、00450–00629 四个完整分块和两个 .tmp 是**旧 A 源码（A-source.sha256 r1）**的结果，已过时，保留不用、不与新版混拼。
2. 复核（服务器预览，Chrome profile 放在 /dev/shm）：A 编码分块 0–3 s 与 18–21 s；C 每秒一帧全片；B 每 2.5 s 一帧全片。
3. 结论：A 前 2.7 s 几乎静止（推轨 0.7 单位/3 s、米粒抖 0.014），B 前 2 s 是静止俯拍——开场缺少足够的动作与解释推进，需要修改；B 20.3 s“回来了”构图大半是空墙；C 的 Cameron/Hove 两条措辞按 Codex 核查收紧（头部运动量 +11.8%；低音时序偏差的失匹配脑电反应更大，不说“更容易察觉”）。

**接下来**：字体打包（Noto Sans/Serif SC 子集 woff2，两台机器文字一致）→ 改 A/B 开场、B 20 s 构图、C 措辞 → 冻结 r2 清单 → 写 `ASSISTANT_ORDERS.md`（M4 精确命令与回传证据）→ 用回传的编码成片做连续运动/转场/结尾复核 → `REVIEW.md`。


### r2 冻结（2026-10-21 09:25Z 前后）
- 改动：A 开场 0–3 s（从第 1 帧就动：Clawd 脸部低机位微距 → 拉出鼓槌；鼓槌按拍子左右摆；前奏 8 分音符米粒轻跳；Clawd 随拍点头、眨眼一次；标注更早淡出）。B 开场（纸螺旋按歌曲时间从中心向外“立起来”，红钉与①②③旗随波头弹出，镜头 ease-out 转动+下降）；B 20.07 s 跳跃机位抬高，背景是纸螺旋而不是远处桌面。C：Cameron/Hove 两处措辞与 +11.8% 计数；“跟着低音提前”移到拍线下方（原与“Clawd 打拍子”重叠）。
- 可移植：字体子集 `src/fonts/`（`tools/fonts.py`，454 个码位全覆盖），three.js 0.186.1 所需文件 vendored 到 `vendor/three/`（2.2 MB），页面不再依赖 node_modules 或系统字体；`review.py`/`sheet.py` 字体在 macOS 上可回退。
- 冻结：`out/r2-source.sha256`（41 个文件）、`out/r2-bundle.tar`；哈希见 `ASSISTANT_ORDERS.md`。
- 等待：Codex 按 `ASSISTANT_ORDERS.md` 在 M4 渲染三支并回传到 `out/m4-r2/`。同时我在服务器上（/dev/shm 放 Chrome profile）逐段预览 A 中段/结尾、B、C 的转场，发现问题即出 r3。


### r2 结果（M4，09:40Z 回传技术证据）
- 三支均在 M4 Metal 渲完（日志 renderer = ANGLE Metal Renderer: Apple M4；A 216 s、B 242 s、C 256 s），mux 校验三支 PASS：1080×1920 / 30 fps / H.264 High / BT.709；帧数 858、1113、858 与音频时长一致；成片音频对原曲 WAV 时延 0、相关 0.9998；−11.1 LUFS、−1.0 dBTP；无解码错误。
- 正式文件在 M4：`/Users/guchuan/Desktop/how-to-make-ai-video/output/music-three-films-20261021/out/`（A 40.0 MB sha 4a9ecb4f…，B 30.7 MB sha 3f838184…，C 32.9 MB sha 0ac73967…；全哈希在 `out/m4-r2/final-mp4.sha256`）。服务器只收复核代理与静帧（传输约 35 kB/s）。
- 工作区已含 r3 修正（未冻结）：A 第二遍近景补光（13.7–15.8 s Clawd 不再发灰）、B 解释段机位抬高（5.2–9.4 s Clawd 不被纸墙/钉帽挡住）、C 结尾随音乐淡出而“落幕”（低音地面下沉、画面压暗，字幕不变）。等 r2 代理复核后一起冻结 r3（`tools/freeze_r3.sh` 只传改动文件）。


---

## 接续（claude-opus-5-5 / max，2026-10-21 约 10:30Z 起）

用户选定第三支 C 为主稿，要求加长，并要一份“目前做视频的几种方式”总结。

### 已完成
1. **C 加长版 r2（交付）**：`out/C-秘密在低音里-加长版-r2.mp4`，sha256 `8f8e9c97caef4ff6b5f26837938a7580e9716f9ce0f6cd2d1b4985748aaadfe3`，37,679,812 字节，1213 帧 / 40.433 s。交付决定、检查证据与限制见 `RELEASE_C_LONG.md`。
   - 设计：整首原曲（0–39.217 s，不剪；原来 28.6 s 版只用到 26.5 s）+ 1.2 s 无声余韵。新增三段：第 3 圈“小节地图”（每小节按实测和声编号，`src/c-long/loop-measure.json` 由 `tools/measure_loop.py` 量出）→ 28.6 s “它偏不”（实测第 3 小节落在“该回到 1”的位置，回到 1 晚了两小节）→ 4·3·2·1 第二次回来 → 四条配方 → 歌停后 Clawd 还在点头（“耳虫”）。第一次抽薄加入实测低音表（先掉到“之前”线以下，回来后回到同一条线）。
   - 源码：`src/c-long/`（index.html、film.js、cues.json、loop-measure.json）；字体子集重生成为 490 个码位（`tools/fonts.py` 新增扫描 `src/c-long`，A/B/C 原有字形不变）。冻结 `out/C-long-r2-source.sha256`。
   - 渲染在服务器（Canvas 2D，两路约 2.2 s/帧/路）；r1 只作中间版（第二次回来那 1.3 s 有遮挡，r2 已改），保留 `out/C-秘密在低音里-加长版-r1.mp4` 与分块。
2. **`VIDEO_METHODS.md`**：三支实际用的方式、旧作用过的方式（据工程文件核实，含诺奖经济学 V3 的 Seedance 2.5 + Remotion、熵重制版的 Canvas）、只作备选的方式，以及后续路线建议。

### A / B r3（不阻挡 C 交付）
- 工作区（未冻结）：A meter 移到字幕下（已核，Clawd 不再被挡）、开场第 0 帧就显示钩子字幕（A/B 都改了 cues 的 t0）；B 解释段机位、钉子避让、数数机位、大字移到上方（服务器静帧已核，问题已解决）。
- **A 还要改**：第二遍闭眼近景的脸部补光 3.2 让 Clawd 发粉发白（服务器静帧 14.6 / 15.2 s），需要把补光调暖调弱后再冻结。未冻结前不要拷给 M4。
- M4 上的 A/B r2 成片照旧有效（技术 PASS），不要删。

### 继续入口
- C 加长版若要再改：改 `src/c-long/film.js` → `sh tools/freeze_clong.sh` → 只删受影响的分块后用 `node tools/render.mjs src/c-long/index.html video out/C-long-picture-rN.mp4 --frames 1213 --chunk 90` 续渲（分块可硬链复用）→ `python3 -I tools/mux.py … out/audio/C-long-bgm.wav …` → `tools/review.py` 抽帧复核。
- 注意：带 `--first/--last` 的分路渲染各自只拼自己的范围，最后必须再跑一次不带范围的同一命令拼全部分块，并核对 nb_frames。

### 收尾（本轮停止于此）
- **C 加长版 r2 已放行**，hash 不变：`8f8e9c97caef4ff6b5f26837938a7580e9716f9ce0f6cd2d1b4985748aaadfe3`（37,679,812 字节）。本轮不再改动。
- **A / B r3 已保存、暂停**：A 的闭眼近景偏粉已修（暖色补光 2.3 + 该镜头青色轮廓光降到 0.35，服务器静帧 13.8/14.6/15.2/15.7 s 已核）；B r3 服务器静帧已核。已冻结 `out/r3-source.sha256`（46 个文件，sha256 `22e1a891…bdcf`）与 `out/r3-delta.tar`（450,560 字节，sha256 `2faa7b52…7bdf7`）。`ASSISTANT_ORDERS.md` 第 2 部分（r3 在 M4 渲染）**暂不执行**，等用户反馈再定。
- 没有正在运行或未完成的渲染；所有旧件（五套、A/B/C r2、C 加长 r1、各 parts 与源码）都保留。
