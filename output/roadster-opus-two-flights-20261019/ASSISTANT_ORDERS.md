# v5.1 增补（2026-10-19）— 只改核验器：片尾亮度读取路径（画面/音频输入不变，**复用已编码 picture，不重渲**）
- M4 实测（冻结 `7b61afc6…` 首次运行，exit 2）：`fade_follows_design`、`fade_halfway_within_1_frame` 失败；黑帧读成 Y = 0。原因：`scale=…:in_range=tv:out_range=tv,format=gray` 在 M4 的 ffmpeg 上仍把 tv 范围扩成全范围（服务器 Linux 上不扩）——是**检查器的量程错误**，片尾本身黑场 YAVG = 16（助理 signalstats + verify 均证实）。
- 修正：片尾亮度改为直接取 `-pix_fmt yuv420p -f rawvideo` 每帧前 w×h 字节（原生 Y 平面），完全不经 gray 转换。门槛不变（0.1 / ±1 帧 / Y ≤ 16.5）；切点检测仍用原解码与原阈值。服务器测试片：与 signalstats 同一曲线（黑 16.01 对 16.00），半程 f1176.97 / 设计 1177.03，最大差 0.022。
- 新冻结 `out/v5-source.sha256` 清单 sha256 **`3574d8105c3b3ea467ddfbd58c3db1c23d81d8a41395ac00b5084b83d860627e`**；相对 `7b61afc6…` **只有 `tools/sync_check.py`** `7b7f24ee…` → `fdd3f0c9d1ec7c1672f56235a0880ce5ad2e83ffa06302e4357972a5c0141107`。
- 执行（同一个 `out/liangci-qifei-v5.mp4`，不重渲、不重 mux）：
  ```sh
  shasum -a 256 -c out/v5-source.sha256
  python3 tools/sync_check.py out/liangci-qifei-v5.mp4 --ref "$REF"     # 退出码 0 = 11 项全过；任何 FAIL 原样回报
  ```
  回传：sync-check.json 全文 + 终端输出 + 退出码；`ending.fade` 每帧 Y 与你独立 signalstats YAVG 的逐帧对照（应在 ±0.5 内）；成片 sha/字节数；B 节其余证据照旧。

---
# ASSISTANT_ORDERS — v5《两次起飞》尾段收束（Opus 5.5 主创/实现；Codex 只执行与回报）

用户看完 v4.1 的原话：“不错 就是结局仓促了些”。v5 只动尾段（f912 以后），主体不变。**v4.1 成片 `dd82493d…f94c` 与源码保留**（`versions/v4.1/`；M4 上的 `liangci-qifei-v4.1.mp4` 不要覆盖）。前一轮内部预览 `liangci-qifei-v5-internal-preview.mp4`（`3d38987b…c918`）**不能交付**：我复审后改了画面输入，必须用下面的冻结重渲。

## 我对内部预览的复审结论（证据：`.omx/artifacts/roadster-ending-20261019/native-inprogress/`）
- 结构认可：三行总结保持 → 35.56 s 在曲子开头第一击上触地 → 37.27 s 双画面 + 片名 → 38.97 s 曲子自己的停顿上淡黑；音乐方案（bar 21 强拍处 15 ms 接回同曲开头两小节与它的停顿）认可，音频输入**不变**。
- 改了两处画面（都在 f1042 之后）：
  1. **落地镜头车顶的白色泛光球**（f1042–f1113）：是停车场背光（LOT_RIG 第 3 盏，从车后正对镜头）在车顶玻璃上的镜面高光被泛光放大，看起来就是车身过曝。`outro` 里关掉这一盏。
  2. **双画面**：「演示① 坡道倒挂」原来压在车身上、橙色箭头穿进片名 → 箭头缩短到片名上方（只在 `finale`），标签移到箭头与片名之间（y = 760）。
- 落地是 CG 收尾示意（kickflip 拟合在 s 11.72 后穿入地面；触地时刻与滑停是安排的）→ S4 角标改为“CG重建 · 落下停住为示意”（全部是已有字形，**字体不需要重做**）。
- 核验：`tools/sync_check.py` 升级（音频映射逐窗对原曲、排除素材、片尾淡黑与静音、退出码）；`tools/cues.mjs` 把映射写入 cues.json；`verify.mjs` 元数据标题 v5。

## 冻结
`out/v5-source.sha256`（28 个文件；清单本身 sha256 `7b61afc6284bc46932a4c235ffff69376f66f5f1ab1b12c1ec8e8f4dc7e87037`）。相对内部预览源码（preview-source.json）**只有这 5 个文件**变化：`src/film.js` `2d3cba77…`→`3dbc387f…`、`src/timeline.js` `92b21ebd…`→`74d890c8…`、`tools/cues.mjs` `779d18df…`→`2d5bc01d…`、`tools/sync_check.py` `b7f256ec…`→`7b7f24ee…`、`tools/verify.mjs` `217fe631…`→`cd891bee…`。`src/world3d.js`、`src/music.js`、`assets/*`（含字体）、`tools/bgm.mjs`、`tools/render.mjs` 与预览相同。
请先 `shasum -a 256 -c out/v5-source.sha256` 全部 OK；**不改**任何源码/参数。发现问题报告给我。

## A. M4 执行（照抄；REF 换成本机路径）
```sh
REF=<path>/reference-original.m4a                 # sha256 24c65e8b…12ab
shasum -a 256 -c out/v5-source.sha256
node tools/textcheck.mjs                          # 18 cards … END 39.8，退出码 0
node tools/cues.mjs                               # 36 cues; max |frame − onset| 17 ms, mean 7.2 ms
node tools/bgm.mjs --ref "$REF"                   # 退出码 0；音轨输入与内部预览相同，master sha 应等于预览时的 c3f72b67…de69（不同就报告，不要调）
node tools/render.mjs --video --workers 1 --gl metal --out out/picture-v5.mp4
node tools/verify.mjs --mux --ref "$REF" --pic out/picture-v5.mp4 --film out/liangci-qifei-v5.mp4   # 退出码 0 = 9 项全过
python3 tools/sync_check.py out/liangci-qifei-v5.mp4 --ref "$REF"    # 普通 python3；退出码 0 = 11 项门槛全过
```
- `verify.mjs`/`sync_check.py` 会覆盖 `out/verification.json`、`out/sync-check.json`：先另存预览的那两份。
- `sync_check.py` 的门槛写在文件头，事先定死；**任何一项 FAIL 都原样回报，不要改阈值或重跑挑结果**。

## B. 回传（全部取自编码后的 `out/liangci-qifei-v5.mp4`）
1. 成片字节数、sha256、渲染耗时；`verification.json`、`sync-check.json`（全文 + 终端输出）、`bgm.json`、`cues.json` 与各退出码。
2. **前缀一致性**：f0–f911 与 v4.1 本机编码逐帧解码比较（同预览时的方法），以及 f912–f1036 与内部预览逐帧比较（这段我没改，应相同；f1037 起角标切换、f1042 起画面改动，预期不同）。
3. **尾段每帧联络表**：f960–f1193 每 3 帧（同 ending-01…04 的格式，标帧号与时间）。
4. **全尺寸单帧（q≤2）**：f1042, f1048, f1056, f1062, f1067, f1073, f1090, f1110, f1117, f1118, f1124, f1130, f1150, f1169, f1175, f1181, f1186。
5. **亮度**：第 4 项每帧整帧 Y′ 均值、Y′>235 与 Y′>250 占比；另对 f1042–f1117 报告车身附近（画面 x 0–1080、y 850–1150 的矩形）Y′>250 占比——这是“白球”的位置，预期接近 0。
6. 渲染日志里的任何 `[page]`/`[console]` 报错、解码警告。

## C. 我做不到、需要真人的
连续观看、听感（尤其 35.54 s 那一处衔接听起来是否自然）、手机可读性、“结尾还仓不仓促”——请交用户本人看，原话转给我。不要把“已转交”写成“已验收”。

## 请转告用户
- 结尾音乐是**同一首曲子开头的两小节和它自己的停顿**接在 bar 21 强拍上（只有这一处剪接，0 dB，无 duck、无变速），原素材末尾的硬切和平台片尾音没有用。
- 落地是 CG 收尾示意：触地时刻与滑行停住是我安排的，不是从原片测得的动作；角标已写明。
- 音乐授权仍未知；公开发布前请确认。

## 服务器上已做的预检（SwiftShader，仅供对照，不是交付证据）
- `textcheck` 18 卡全过；`cues` 36 个、max 17 ms / mean 7.2 ms。
- 用新源码在服务器渲染 f1030–f1193（164 帧），与黑场前缀 + 本机 master 拼成测试片跑新 `sync_check.py`：S4 f1042、E1 f1118 画面切点 Δ0；触地 f1067 与 MP4 起音差 0 ms；曲子停顿 −8 ms；音频映射 151 窗 min r 0.99854、max |lag| 0.062 ms、max |gain| 0.021 dB；衔接后与原曲同一时刻（硬切/平台音）最大 r 0.21；淡黑逐帧与设计最大差 0.022、半程 f1176.97（设计 1177.03）；淡完 Y = 16.01；音频淡出后数字零。唯一 FAIL 是“全部切点”——测试片前 1030 帧是黑场，属预期。M4 成片必须 11 项全过。
- 本机 master.wav sha 与 M4 不同（ffmpeg 版本不同，同 v3 起的情况），以 M4 为准。

---
# （以下为 v4.1 执行单，已执行，存档）
# ASSISTANT_ORDERS — v4.1《两次起飞》（只修一个画面 bug；需要重渲）

## 复审 v4 实际编码片（a99a3bb5…b456）的结论
左右喷口地图、左右力矩实验室、从车后看的回放、子弹时间与冲击环都按设计出现。**但有一个实质画面 bug（我的代码错误）**：径向拖影那段代码里，上一轮修改把 `// 注释` 插到了一行中间，`ctx.scale(sc, sc); ctx.translate(-W/2, -H*0.45)` 被注释掉，于是每个“镜头冲击”帧都把整帧未缩放地平移到画面中心 (540, 864) 再叠一层——就是 f156、f525 右下角那块矩形“切片/重影”。影响所有带冲击的帧：离坡瞬间（≈f104–f115）、接住（≈f154–f170）、喷口地图三次点火（≈f522–f560）、升空（≈f560–f575）、子弹时间甩回（≈f648–f660）、实验室三次点火（≈f725–f735、f763–f773、f813–f823）。

## v4.1 冻结
`out/v4.1-source.sha256`（28 个文件；清单 sha256 `1b944725055461722e8b8f6fe428d2d7b75b1242c2cd12f05c309fa8f34dfa2d`）。相对 v4 **只有 `src/film.js` 一行**（`12d69ad6…` → `0b32f8c3…`）。音频、时间线、剪辑点、字卡全部不变。服务器已用修正后源码渲染 f104/f156/f525/f565/f650/f763 确认矩形消失。

## M4 执行（照抄；REF 换成本机路径；先另存 v4 成片与证据，不要覆盖）
```sh
REF=<path>/reference-original.m4a
shasum -a 256 -c out/v4.1-source.sha256
node tools/textcheck.mjs && node tools/cues.mjs && node tools/bgm.mjs --ref "$REF"
node tools/render.mjs --video --workers 1 --gl metal --out out/picture-v4.1.mp4
node tools/verify.mjs --mux --ref "$REF" --pic out/picture-v4.1.mp4 --film out/liangci-qifei-v4.1.mp4
python3 tools/sync_check.py out/liangci-qifei-v4.1.mp4
```

## 回传（全部取自 `out/liangci-qifei-v4.1.mp4`）
1. verification.json、sync-check.json（+终端输出）、bgm.json 全文与退出码；成片字节数与 sha256。
2. 全片每 6 帧联络表（5 张）。
3. **冲击帧专项（每帧，不跳）**：f102–f118、f152–f172、f520–f562、f558–f576、f646–f662、f723–f737、f761–f775、f811–f825。
4. 全尺寸：f104, f110, f156, f160, f525, f530, f537, f550, f565, f650, f655, f727, f765, f815, f825, f836。
5. 若与 v4 其余帧有任何非预期差异，报告即可。

---
# （以下为 v4 执行单，已执行，存档）
# ASSISTANT_ORDERS — v4《两次起飞》（Opus 5.5 主创/实现；Codex 只执行与回报）

v4 回应用户原话“左右喷气的位置没有，然后特效镜头 节奏再惊艳 震撼些”。**v3.1 成片（sha256 ca7a9ad8…c69b）与源码已保留**（`versions/v3.1/`，M4 上的 `liangci-qifei-v3.1.mp4` 不要覆盖）。

## 冻结
`out/v4-source.sha256`（28 个文件；清单 sha256 `a07b726c85f250d0b00513b2d03704692ecb73017b9c80cd35bacc39770f8414`）。相对 v3.1 变化：`src/film.js`、`src/timeline.js`、`src/world3d.js`、`assets/model/car.json`（新增示意喷口 SR）、`assets/fonts/*`（重新子集化）、`tools/verify.mjs`（新增 `--pic`）。音乐、`tools/bgm.mjs`、`src/music.js`、分析与剪辑点均未变；服务器 master.wav 仍为 `6521b66d…922d`。
请 `shasum -a 256 -c out/v4-source.sha256` 全部 OK；不改任何源码/参数。

## A. M4 执行（照抄；REF 换成本机路径）
```sh
REF=<path>/reference-original.m4a
shasum -a 256 -c out/v4-source.sha256
npm ci
node tools/textcheck.mjs                 # 17 cards … END 36.3，退出码 0
node tools/cues.mjs                      # 33 cues; max |frame − onset| 17 ms
node tools/bgm.mjs --ref "$REF"          # 退出码 0（音轨与 v3.1 相同）
node tools/render.mjs --video --workers 1 --gl metal --out out/picture-v4.mp4
node tools/verify.mjs --mux --ref "$REF" --pic out/picture-v4.mp4 --film out/liangci-qifei-v4.mp4   # 退出码 0 = 9 项全过
python3 tools/sync_check.py out/liangci-qifei-v4.mp4      # 普通 python3
```
注意：`verify.mjs` 与 `sync_check.py` 会覆盖 `out/verification.json` / `out/sync-check.json`，请先把 v3.1 的那两份另存。

## B. 回传证据（全部从编码后的 `out/liangci-qifei-v4.mp4` 取）
1. verification.json、sync-check.json（及终端输出）、bgm.json、cues.json 全文 + 各退出码；成片字节数与 sha256；渲染耗时。
2. 全片每 6 帧联络表（5 张，每张 10 列，标帧号）。
3. **左右喷口专项（每 2 帧）**：
   - 喷口地图 **f505–f562**（M1：f522 左侧组喷、f534 右侧组喷、f547 车头 + 底部齐喷）；
   - 力矩实验室 **f708–f866**（f725 A 左右齐喷；f763 B 只喷左边；f813 B 右边反喷；约 f836 B 回到水平）；
   - 停车场回放（从车后看，左右喷口着色） **f863–f916**。
4. **特效/节奏专项（每 2 帧）**：离坡子弹时间 **f100–f160**；停车场升空 + 翻滚子弹时间 + 甩回 **f556–f668**。
5. 全尺寸单帧（q2）：f0, f104, f125, f150, f156, f230, f300, f380, f440, f515, f525, f540, f552, f570, f625, f640, f650, f665, f700, f735, f780, f800, f825, f845, f880, f900, f925, f975, f1000, f1025, f1060。
6. 亮度：第 5 项每帧整帧 Y′ 均值、Y′>235/250 占比（同 v3.1 的方法）；如能做，另给车身区域的目视描述，不要把整帧数字当车漆指标。
7. 音频：同 v3.1（编码后 I/TP，与原曲逐窗增益差，相关）。

## C. 我做不到、需要真人的
连续观看、听感、手机可读性、“够不够惊艳”——请交用户本人看，原话转我。

---
# （以下为 v3.1 的执行单，已完成，仅存档）
# ASSISTANT_ORDERS — v3.1《两次起飞》（Opus 5.5 主创/实现；Codex 只执行与回报）

## v3.1 增量（2026-10-19 22:xx，台北）——只改了核验工具，画面与音频输入不变
- 新冻结清单：`out/v3.1-source.sha256`（28 个文件；清单 sha256 `ebcf69a7402a223dae34e1b40c145fd8a7b11dd68fdc00494a5adcdabf36a075`）。和 v3（`3b1b690a…963b`）相比**只有 `tools/sync_check.py` 变了**（`e221410a…8342` → `b7f256ec…b74e`）；`src/`、`assets/`、`index.html`、`tools/render.mjs`、`tools/bgm.mjs` 全部未变。
- 因此：**如果最终 MP4 是用 v3 清单 28 个文件全部吻合的源码渲染的，不要重渲**。同步新的 `tools/sync_check.py`，核对 `shasum -a 256 -c out/v3.1-source.sha256` 全部 OK，然后对那个成片执行：
  ```sh
  node tools/cues.mjs                               # 输出不变：28 cues; max |frame − onset| 17 ms
  python3 tools/sync_check.py out/liangci-qifei.mp4 # 普通 python3（Mac 上 -I 会屏蔽 user-site 的 numpy）
  ```
  回传新的 `out/sync-check.json` 全文与终端输出。
- 为什么改（A5 那条 +57 ms）：我用真实音频核对了 5.0–5.2 s，那里有**两个相距 55 ms 的真实起音**：5.0765 s 是低频踢鼓（low 1.41，其余频带约 0.3），5.1316 s 是全频的小节重拍（高频 0.88、军鼓带 0.50，离拟合网格 1.5 ms，紧接着整段音乐 5.13–5.17 s 起来）。两者合成强度几乎相等（2.43 对 2.47），旧检查器 ±90 ms 的非极大抑制只留一个，经 AAC 再编码后平局倒向了较早的踢鼓。所以是**检查器的问题，不是落点错**；A5 仍切在 5.1333 s（f154）的重拍上，时间轴不改。
- 新检查器的做法（不是放宽阈值）：自适应阈值不变；峰与峰最小间隔从 90 ms 改为 25 ms，这样相隔一个 32 分音符（53 ms）的真实鼓点都能保留；每个切点列出 ±70 ms 内的所有峰及其四频带强度和局部主导度；旧 ±90 ms 结果并列报告（`legacy_nms90_*`）。**加了“随机基线”防止细分造成的假精确**：同一套起音下，3000 个随机时刻与最近起音的误差中位数、P95、≤17 ms 的比例，以及全部切点整体平移半拍后的平均误差。服务器替身（我自己的 AAC 编码）结果：19 个起音切点 |帧−起音| 最大 17 ms、平均 7.1 ms；A5 +2 ms（两个峰都列出）；随机时刻中位 50 ms、只有 20% 落在 17 ms 内；平移半拍平均 68 ms。M4 数字请以实测为准，原样回报，即使不同。

---
# （以下为 v3 原执行单，仍然有效）

源码已冻结：`out/v3-source.sha256`（28 个文件；清单本身 sha256 `3b1b690a2980040d616056bb4f77f97c9323c60c29e3dabe7f1422e0b7a2799b`）。
请先 `shasum -a 256 -c out/v3-source.sha256` 全部 OK；**不改** `src/`、`tools/`、`assets/`、`index.html`。在此之前用旧源码跑出的任何画面都只是预览，不能当最终。发现技术/事实问题请报告给我，由我来改。

## 规格
1080×1920 · 30 fps · **36.3 s · 1089 帧** · H.264 + AAC 256k/48 kHz。片时间 = 音乐时间（原曲从 0 s 原样使用到 35.96 s，34.72–35.96 s 淡出，然后数字静音到 36.3 s；画面在 35.20–35.93 s 淡到黑）。
服务器参考值：`node tools/bgm.mjs` → `out/audio/master.wav` sha256 `6521b66db1c85eb15804ac216192af7b507ceb185da553f245ce89a7b594922d`，未淡出段 −10.4 LUFS / −2.1 dBTP（与原曲同段相同），增益 0 dB。M4 上 ffmpeg 版本不同，哈希可能不一样：请报告，不要自己调。

## A. 在 M4 执行（照抄；`REF` 换成你本机 reference-original.m4a 的路径）
```sh
REF=<path>/reference-original.m4a        # sha256 应为 24c65e8b…12ab
shasum -a 256 -c out/v3-source.sha256
npm ci
node tools/textcheck.mjs                 # 应为 16 cards … END 36.3，退出码 0
node tools/cues.mjs                      # 应输出 28 cues; max |frame − onset| 17 ms
node tools/bgm.mjs --ref "$REF"          # 退出码 0；记录 master.wav sha256
node tools/render.mjs --video --workers 1 --gl metal --out out/picture.mp4
node tools/verify.mjs --mux --ref "$REF" # 生成 out/liangci-qifei.mp4 + out/verification.json；退出码 0 = 9 项全过
python3 tools/sync_check.py out/liangci-qifei.mp4    # 从成片本身重测切点与起音 → out/sync-check.json
```
（可选）想核对我的音乐分析：`python3 tools/music_analyze.py "$REF"` 会重写 `assets/music/analysis.json` 与 `src/music.js`；跑完请用 `shasum` 对比，**不同就报告，不要用新生成的文件去渲染**。

## B. 需要回传的实际编码证据（一律从**编码后的 MP4** 取）
1. `out/verification.json`、`out/sync-check.json`、`out/audio/bgm.json`、`out/cues.json` 全文 + 各命令退出码；成片字节数与 sha256；`render.mjs` 的总耗时。
2. **整片联络表**：每 6 帧一张（f0, f6, …, f1086；约 182 张，可分 5 张表，每张 10 列，标帧号）。
3. **动作连续抽帧**（每 2 帧）：
   - 坡道离坡 + 翻身 + 接住：f96–f200；
   - 剖面与驶出坡尽头：f215–f300、f350–f425；
   - 停车场起飞 + 整圈翻转：f555–f715；
   - 力矩实验室：f710–f870。
4. **全尺寸单帧**（PNG 或 q≤2 的 JPG）：f0, f53, f104, f130, f154, f230, f268, f300, f340, f380, f440, f520, f580, f630, f690, f740, f790, f840, f890, f940, f975, f1000, f1025, f1060。
5. **亮度**（针对“白团”）：对第 4 项每一帧报告整帧 Y′ 均值、Y′>235 与 Y′>250 的像素占比。服务器 SwiftShader 参考：所有剪切帧 Y′>250 ≤ 0.36%（f0 最高），多数 ≤ 0.1%。
6. **音频**：编码后整合响度/真峰（verify 已有）；每 0.5 s 的短时响度（`ebur128=metadata=1` 或 astats），全片；特别列出 3.2–5.4 s（原曲自己的停顿）、30.3–32.3 s（原曲自己的低音抽空）、34.5–36.3 s（淡出与静音）。
7. 任何解码警告、页面报错（render 日志里的 `[page]`/`[console]`）、与服务器的哈希差异。

## C. 我做不到、需要真人的
连续观看、听感、手机上的实际可读性、“是否更酷、是否够快”——请把成片交给用户本人看，把用户原话转给我。不要替用户下结论，也不要把“已转交”写成“已验收”。

## 请转告用户的两点
1. **3.46–4.82 s 的安静是原曲自己的停顿**（用户给的参考视频里同一位置也有），不是 duck；我把“车冲出坡尽头、在空中翻身”放进这段静音，鼓点在 5.13 s 回来时喷气正好“接住”。整片增益 0 dB，和原曲一样响。如果用户仍然不想要这一秒多的安静，告诉我，我改成跳过停顿的版本（会少一处踩点设计）。
2. 版权：这首音乐的曲名、作者与授权都未知，本项目没有授权。个人审看没问题；公开发布前请确认授权，或在平台内使用已授权的同曲。
