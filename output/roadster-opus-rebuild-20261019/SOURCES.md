# 来源、许可与科学依据 —《看不见的十吨》

## 画面素材（全部本地程序生成，无付费素材）
| 项 | 来源 | 许可 |
|---|---|---|
| 车与坡道网格、车辆位姿（`assets/model/`） | 本系列 V9 第三轮导出（`output/roadster-flight-explainer-v9/web/assets/`，由 `geometry/export_v5.py` 生成）；依据特斯拉 2026-10-16 发布的 “The Ramp \| Roadster” 视频做的**图像推断 CG 重建**，非厂方 CAD、非实测动力学 | 本项目自制 |
| 3D 渲染 | three.js 0.186.1（`node_modules/three`，含 RoomEnvironment、EffectComposer、UnrealBloomPass、OutputPass） | MIT（全文 `LICENSES/three-MIT.txt`） |
| 中文字体 | Noto Sans SC 500/900，经 Google Fonts css2 `text=` 子集化（`assets/fonts/fonts.json` 记录 URL、字符与 sha256） | SIL Open Font License 1.1（全文 `LICENSES/Noto-Sans-SC-OFL.txt`） |
| 2D 图解、字幕、粒子 | 本项目代码（`src/gfx2d.js`、`src/film.js`） | 本项目自制 |

## 声音
- v2：120 BPM 律动——正弦踢鼓（音高下滑 + 轻 tanh 饱和）、加法贝斯、正弦分音的琶音/短奏/钟声、Pad、空气泛音，全部为 `tools/score.mjs` 的加法合成 + `tools/dsp.mjs`（Freeverb、双二阶滤波、BS.1770 响度、过采样真峰）。**无采样、无噪声发生器、无人声/TTS、无第三方音乐。**
- 母带：静态增益到 −20 LUFS，真峰 ≤ −6 dBTP，不用限幅器；最后 0.4 s 为数字静音。

## 屏幕上每条科学表述的依据
| 屏幕表述 | 依据 / 计算 | 限定 |
|---|---|---|
| 「你头上每 1 平方米的空气 · 约 10 吨」「海平面附近 · 1 个标准大气压」 | 标准大气压 101 325 Pa；p = (m/A)·g ⇒ m/A = 101 325 ÷ 9.806 65 ≈ 10 332 kg/㎡（OpenStax《University Physics Vol. 1》14.1–14.2 流体压强） | 海平面附近；“约 10 吨”指每平方米上方空气柱的质量 |
| 「而且不只往下压 / 四面八方都在压」「两边一样大，就互相抵消」 | 静止流体中压强各向同性；作用在物体上的压力处处垂直于表面（OpenStax 14.1） | 定性 |
| 「风扇抽气 + 密封」「车底气压变低（不是真空）」 | 特斯拉官方描述风扇 + 地面密封系统；需持续抽气与密封维持较低压力（SCIENCE_AUDIT A01/A03）；工程低压≠完全真空 | 风扇、密封画法为**原理示意**，不代表实车数量与位置（A02） |
| 「外面压得更重 / 把车按在坡上」 | 压差合力 ≈ (p外−p缝)·A_eff，方向指向坡面；重力始终世界向下（A04、A05、A09） | 箭头只示方向；不是“不是吸是压”的二分 |
| 「举例：2 吨车，车底 4 ㎡ / 至少低约 5% / 只够托住重量，开起来要更多」 | Δp_min = m·g/A = 2000×9.81/4 ≈ 4.9 kPa ≈ 101.3 kPa 的 4.8% | **举例估算，非实车数据**；这是准静态、只平衡重力的粗略**下限**；要让轮胎压紧、抓地、过弯和行驶还需额外余量（A06–A08） |
| 「离开坡面，压差就没了」 | 车底离开坡面后，原先的密封腔不复存在，不能再提供同样的支撑（A10） | 画面中压差随驶出逐步减小，不说碰到边缘瞬间归零 |
| 「它自带一罐压缩气 / 向下喷气，推力向上」 | 特斯拉描述冷气推进系统；反作用推力与排气方向相反（NASA Glenn 火箭推力方程；A11、A14） | 不燃烧；喷口布局为示意；推力向上 ≠ 一定上升，画面中车仍在下降（A15） |
| 「储气有限，用完要补」 | 储存气体提供有限总冲量（NASA SmallSat 推进综述；A19） | 未给续航或补气时间 |
| 掉落翻身的姿态 | V9 POSE_MATCH 第三轮：可见面顺序 车顶 → 窄边/车轮 → 底盘 → 回正（翻滚方向 −1） | 图像推断拟合；非标定相机、非实测欧拉角；**慢放**已标注 |

链接：特斯拉 Roadster 页 https://www.tesla.com/en_GB/roadster ；OpenStax 14.1 https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure ；OpenStax 6.1/6.2 （牛顿定律、摩擦）；NASA Glenn 推力方程 https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/ ；NASA SmallSat 推进 https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/ 。以上链接沿用 V9 SCIENCE_AUDIT（2026-10-18 核查）；本次未重新联网核实。

## 删去的内容
另一场 kickflip 演示（含未知作用的缆线）在本片中**整段删除**，不与坡道动作混剪。

## 2026-10-19 助理复核
制作助理的 `science-source-recheck.md`（特斯拉官方域名索引正文、OpenStax 14.1、10 332 kg/㎡ 与 4.8 % 下限的复算）与本表一致；未发现需要改动的屏幕表述。特斯拉页面的直接读取受限，依据为其官方域名索引正文，属厂家表述。

## 参考视频 BGM 版（2026-10-19，用户要求“用他那个视频bgm”）
- 新文件 `out/kanbujian-de-shidun-v2-reference-bgm.mp4`：v2 画面（H.264 流逐字节复制）+ 用户下载的参考视频原音轨中的音乐（`.omx/artifacts/roadster-reference-bgm-20261019/reference-original.m4a`，sha256 见 `out/reference-bgm-verification.json`；来源视频 sha256 2171b3c1…6aba，抖音号 72768804831 的视频）。
- **版权：该音乐为第三方作品，曲名、作者与授权均未知，本项目未获得任何授权。** 仅适合用户个人审看；公开发布前需确认授权，或改用平台音乐库中的同曲/已授权版本，或换回自带原创合成配乐版（`out/kanbujian-de-shidun.mp4`，仍保留）。
- 自动语音识别对该音轨给出重复的“Baby…”类片段（低置信、可能是歌曲人声切片或误识别），**不是**中文解说旁白；未做人工听辨。
- 处理只做：一处两小节重复、掉落段 −8 dB 压低、淡入淡出与静态增益；不变速、不变调。细节见 `tools/reference_bgm.mjs` 头注。
