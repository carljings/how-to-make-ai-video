# 来源、许可与科学依据 —《两次起飞》v3

## 画面素材（全部本地程序生成；无原片画面、无付费素材）
| 项 | 来源 | 性质 |
|---|---|---|
| 车、坡道网格与坡道位姿（`assets/model/car.*`、`scene.*`、`poses.json`） | V9 第三轮导出（`output/roadster-flight-explainer-v9/web/assets/`），依据特斯拉 2026-10-16 “The Ramp \| Roadster” 视频 | **图像推断 CG 重建**；非厂方 CAD、非实测动力学 |
| 停车场车列/道具、细线、kickflip 位姿与气云（`assets/model/lot.*`、`kickflip.json`） | V9 `geometry/export_kickflip.py`（v4 `staging.py`/`motion.py` 的 wide_pose，按马斯克发布的停车场视频拟合） | 屏幕空间重建，**相机镜头、高度、速度、角度均为假设**；车列为通用替身；细线位置据原片 |
| 原视频（仅作参考，未放入成片） | `.omx/artifacts/roadster-two-flights-20261019/ramp-original-1080.mp4`（sha256 67b2ca7f…d64b）、`kickflip-original-1080.mp4`（sha256 a62298a9…7940） | 第三方画面；用于核对动作与细线，不复用 |
| 3D 渲染 | three.js 0.186.1 | MIT（`LICENSES/three-MIT.txt`） |
| 中文字体 | Noto Sans SC 500/900，Google Fonts `text=` 子集（`assets/fonts/fonts.json`） | SIL OFL 1.1（`LICENSES/Noto-Sans-SC-OFL.txt`） |
| 剖面气压场、分子、喷流、力矩几何、字幕 | 本项目代码（`src/world3d.js`、`src/film.js`） | 原理示意 |

## 声音
- **用户指定的参考视频 BGM**：`.omx/artifacts/roadster-reference-bgm-20261019/reference-original.m4a`（sha256 24c65e8b…12ab，来自用户下载的抖音视频音轨）。
- 处理（v5，`tools/bgm.mjs`）：从 0 s 起原样使用到 35.555 s；35.540 s 起 15 ms 等功率衔接接回**同一首曲子的开头**（源 0.026–3.71 s，即开头两小节与它自己 3.46 s 的停顿），片时间 = 源时间 + 35.5144 s；停顿后的轻微余音 0.25 s 淡到数字零，静音到 39.8 s。**不变速、不变调、不压低、不压缩、不限幅、增益 0 dB、无 duck**；全片只有这一处剪接。原曲 36.01 s 的硬切与 37.07–37.48 s 的平台片尾声都不进入（`tools/sync_check.py` 实测核对）。v4.1 及以前是 0–35.96 s 原样 + 34.72 s 起淡出。
- 响度（ffmpeg ebur128，原生立体声）：原曲同一段（0–34.72 s）−10.4 LUFS / −2.1 dBTP；master 同段 −10.4 LUFS / −2.1 dBTP。
- **版权：曲名、作者与授权未知，本项目未获授权。** 仅适合用户个人审看；公开发布前需确认授权，或改用平台曲库中的已授权同曲。
- 无旁白；歌曲自身的人声切片保留（ASR 只识别出零散 “Baby…” 类片段，未人工听辨）。

## 剪辑与音乐（可核对）
- `tools/music_analyze.py` 从实际音轨测出：141.94 BPM（拍 0.4227 s），首小节线 0.061 s（取歌曲第一击；按此小节线折叠，1–4 kHz 拍手声峰在第 3 拍，即半速反拍），原曲停顿 3.46–4.82 s，低音抽空 30.50–31.76 s，硬切 36.01 s。
- 剪切点：`docs/CUE_SHEET.md` / `out/cues.json`（生成）。每个 cue 都写明要求的“小节.拍”、网格时间、**实际检测到的起音**、落在哪一帧、帧与起音之差；成片另由 `tools/sync_check.py` 从 MP4 本身重新检测画面切点与音频起音。

## 屏幕上每条科学表述的依据
| 屏幕表述 | 依据 | 限定 |
|---|---|---|
| 「车底气压变低」「风扇抽气 + 密封」 | 特斯拉官方描述风扇 + 地面密封系统（A01/A03）；低压区需持续抽气与密封维持 | 抽气流、密封位置是**示意**，不代表实车数量/位置（A02）；“低压”不是“真空”的对立二分（V9 真空术语条） |
| 「外面气压更高」「压差把车按向坡面」+ 压差合力箭头长于重力箭头 | 压差合力 ≈ (p外−p缝)·A_eff，指向坡面（A04/A05/A09，OpenStax 14.1）；倒挂静止需 F_p > mg 才有正的轮胎载荷（A06） | 箭头只示方向与“更大”，不给数值 |
| 「坡到头 → 压差没了」「开始往下掉」 | 车底完全离开坡面后原先的密封腔不复存在（A10） | 画面中压差在车底前端越过坡边后约 0.6 m 行程内消失，不是瞬间归零 |
| 「向下喷气 → 反推向上」「仍在下落」 | 反作用推力与排气方向相反（NASA Glenn 推力方程，A14）；向上的推力不保证向上运动（A15，OpenStax 6.1） | 喷口布局与喷流长度为示意 |
| 「储气有限，用完要补」+ 储气表 | 储存气体提供有限总冲量（NASA SmallSat 推进综述，A19） | 储气表无刻度、无数值，不给续航 |
| 「穿过重心 / 只推不转」「偏开重心 / 就会翻转」「力矩 = 力 × 力臂」 | 单个力的力矩 τ = r × F，大小 = F × 力臂（作用线到转轴的垂直距离）；作用线过重心则力臂为零（OpenStax《University Physics Vol. 1》10.6 Torque，https://openstax.org/books/university-physics-volume-1/pages/10-6-torque ，助理 2026-10-19 重新打开核对；A16） | 实验室只画推力（不画重力）、慢放；两车用同一推力，B 只开左侧两喷口——**原理示意，不是实车控制方式** |
| 「多喷口的合力矩」 | 实际姿态取决于所有力矩之和、转动惯量与控制（A17） | 角标写明“实际用哪些喷口、如何控制：未公开”；不从可见喷流反推控制 |
| 「原片可见细线」「作用未知」 | 停车场原片可见细线（A18）；本片保留其位置并强调 | 不判断是否承重/牵引；不称“无绳自由飞行” |
| 两段动作 | 坡道：V9 POSE_MATCH 第三轮（车顶→侧面→底盘→回正）；停车场：v4 wide_pose 一整圈左滚 | 都是拟合；A4 0.63× 慢放、A1–A3/A5 约 1.15–1.35× 变速、实验室慢放，均有角标 |

其余链接沿用 V9 SCIENCE_AUDIT（2026-10-18 核查）：特斯拉 Roadster 页 https://www.tesla.com/en_GB/roadster （直接打开仅得 JS 脚注，属厂家表述，未能独立核实性能）；OpenStax 14.1 https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure ；NASA Glenn https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/ ；NASA SmallSat https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/ 。

## v4：喷口位置的依据（示意）
- 停车场原片（`kickflip-original-1080.mp4`）放大逐帧：翻滚中车身两侧边缘、前后两端都能看到喷流（约 7.9、9.1–9.4 s 两缘同时；8.2–8.5 s 倒置时从车底喷出；10.0 s 车头向前）。坡道原片（`ramp-original-1080.mp4`）：半滚时车侧/车底有喷流（约 9.93、10.43 s），10.6 s 起车头向前，10.93 s 起底部四股向下。
- 特斯拉官方页面提到 perimeter thrusters（周边推进器，厂家表述，见 V9 A01/A17）。
- 片中七个喷口（底部四角、左右侧、车头）的位置、方向、何时喷与推力**均为示意**，不是原厂图纸或实测；角标写明。实验室里“只喷左边 → 翻转 / 右边反喷 → 停住”是力矩原理示意（OpenStax 10.6），不是实车控制方式。
