# PRODUCTION LOG — 《AI 也会刷分》（desktop-recording-explainer-20261021）

Opus 5.5（claude-opus-5-5 / max）。服务器时间 CDT。以 `out/` 与 `/dev/shm/pdx/` 里的实际文件为准。

## 文件地图
- `docs/BRIEF.md` 切入比较与全部决定 · `docs/STORYBOARD.md` 分镜（时间、画面、字幕）· `docs/SCIENCE.md` 每条说法的依据与边界、待 Codex 核查项
- `src/` 片子本体：`index.html`、`film.js`（入口）、`lib/*.js`、`scenes/*.js`、`copy.js`（全部屏幕文字的唯一来源）、`timing.json`、`fonts/`
- `tools/`：`compare_audio.py`（两版音轨对比/对时）、`timing.py`（原作节拍逐词数据 → 片时）、`check_onsets.py`（独立起音核对）、`sheet.py`（审片拼图）；后续：`fonts.py`、`render.mjs`、`bgm.py`、`mux.py`、`review.py`
- 根盘只剩 ~150 MB：Chrome 临时配置、渲染分块、成片都放 `/dev/shm/pdx/`（内存盘，重启会丢；交付后由 Codex 在 M4 归档）

## 进度
- 09:00 读完参考包（82 个文件 SHA 全部吻合清单；源码收据 71/71）、原作 README/TREATMENT/ENGINE/timeline、逐秒看完代理片（`/dev/shm/pdx/sheet1s_*.jpg`）。
- 09:05 音轨实测（`out/audio-compare.json`）：录屏 = 干净版 − 0.221905 s，25 窗恒定；录屏 −7.8 LUFS/+1.1 dBTP，干净版 −15.5 LUFS/−4.2 dBTP；录屏尾部是歌曲自身衰减，无循环重启。→ 用录屏音轨（理由见 BRIEF）。
- 09:06 `src/timing.json` 生成；`out/onset-check.json`：277/277 kick 在 ±60 ms 内有实测起音，中位 +16 ms。
- 09:10 定切入：规格博弈 / “AI 也会刷分”；BRIEF、STORYBOARD、SCIENCE 写好。原始资料已核：DeepMind 2020（我读原文）、Claude 3.7 Sonnet 系统卡 §6（我解析 PDF 原文 + Codex 读原文）、OpenAI 2016 CoastRunners（Codex 读原文）。

- 09:12–09:37字体子集 13 个文件；写完 `src/` 引擎与 31 个场景；`a_open.js` 前 38 s 逐帧调过；`b_cases.js` / `c_humans.js` / `d_end.js` 写完但未复核。该阶段暂停时，`d_end.js` 已保存。

### 后续制作（Opus 5.5 · claude-opus-5-5 / max，10:37 起，CDT）
- 10:37 读完 BRIEF / STORYBOARD / SCIENCE / 日志与全部源码、工具；读 Codex 三份核查结论。
- 10:41 **整片无法加载**：`d_end.js` 引用 `a_open.js` 不存在的 `coldOpenFrame` → 补导出（片尾复用开场镜头；开场之前的撞击/分数也连续，末帧 → 第 0 帧可无缝循环，实测差异 ≈ 普通相邻帧）。
- 10:45–10:58 逐段出静帧审 b/c/d 三块（`/dev/shm/pdx/sh_b*`, `sh_c*`, `sh_d*`）+ 复看 a 块。必修问题与修法见 STORYBOARD 顶部“r1 定稿说明”。另：≠ 因哨兵时间 99 s 早于场景而提前 1.8 s 出现；四宫格重复赛艇、缺机械手案例；Claude 终端“尝试 1”晚于尝试 2/3、test_2 状态与叙事不符、“全部通过”只停 0.04 s。
- 11:00 读速审计（`/dev/shm/pdx/cues_audit.mjs`）：Claude 字幕 12 字/s → 改为 110.01–113.58；“考试、KPI…” 10 字/s → 提前到 128.38；定义从 16 字/s 的小注释改成名称卡大字幕；P(doom)、RLHF、系统卡注释加长或缩短。
- 11:02 字体：旧子集缺 40 多个已用字（械、蓝、摄、诗、裁…，服务器上其实是系统字体在顶替）→ `tools/fonts.py` 重新取子集（17 个文件，备份在 `/dev/shm/pdx/fonts-backup-r0`）；新增 `render.mjs glyphs` 模式：逐字比对两种系统兜底字体的宽度，确认所有画出来的字都来自打包字体（唯一落空的 ✗ 只出现在注释里）。
- 11:06 测试分块：0.99 s/帧，CRF 17 约 5 Mbps。决定在服务器 `/dev/shm` 渲染（便于我直接审编码成片、局部重渲），成片再交 Codex 取回 M4。
- 11:08 **冻结 r1**：`frozen/r1/`（src + tools，`MANIFEST.sha256` 的 sha256 = 9cbef4cbb7ad5ebba986d3abf4d4a07a354d70bb90974f5cc529500d8e0a4050）。两路并行渲染（CRF 18，分块 90 帧）→ `/dev/shm/pdx/r1/parts/`，日志 `log_a.txt` / `log_b.txt`。
- 新增 `tools/finish.py`：原录屏音轨一次恒定增益（以 AAC 编码后的真峰值 ≤ −1.0 dBTP 为准，不压缩不限幅）、末尾 0.5 s 半正弦淡出、按画面帧数精确补齐/截断，流复制封装；随后全解码、帧数、时长、起始时间、色彩标记、响度与 sha256 检查，写 `OUT.json`。

### 后续修订（Opus 5.5 · claude-opus-5-5 / max，2026-10-21 18:42Z 起 = 13:42 CDT）
- 13:42 核实：r1/r2 两份 MANIFEST 文件逐一校验 OK；r1 两路渲染已正常结束（52/52 块，`r1/picture.mp4` 由 A 路拼好）；r2 只比 r1 多改 1 条字幕（126.10–128.32 s “不只是 AI，早就有人说过：”）和两个后处理工具；工作区 = r2；新字幕的字全部在打包子集里。
- 13:43 拼 r2 画面（r1 的 51 块 + r2 的 03780 块，流复制；52 块参数一致：High@4.0、CRF 18、BT.709 tv）→ `/dev/shm/pdx/r2/picture.mp4`：4664 帧、155.466667 s、完整解码无错。
- 13:45 `tools/finish.py` → 候选 `/dev/shm/pdx/r2/final/ai-ye-hui-shua-fen-r2.mp4`（53,790,364 B，sha256 8500eb81…66ed）：technical_pass；一次恒定增益 −2.35 dB → −1.3 dBTP / −10.2 LUFS（不压缩不限幅）；音轨与录屏原音逐样本对齐（5 个窗口 lag 0、r≈0.99995）；画面上 11 个同步事件（钩子逐词、FOOM、盖章、翻面、DISOBEY、NaN 等）的亮度突变全部落在预期帧（UPPING 字母按设计晚 4 帧升起）。
- 13:47–13:58 从**编码成片**审：每秒 1 帧全片 6 张总览 + 14 段连续帧条 + 2 组转场。整体成立；发现 7 处要改（见 `frozen/r3/FREEZE.txt`）：①结尾 10ⁿ 指数漂移/相撞（textAlign 继承成 center 的 bug）；②三张案例卡的 ⏎ 按下与飞出从未被看到（场景在 ⏎ 那一拍就切走）；③FOOM 闪光被字幕/注释衬底压出横条；④分屏终点格的船过线和 ✓ 被裁在画框上沿外；⑤“Sharp left turn”的甩镜几乎看不出；⑥DISOBEY 砸下前 2–3 帧两半重叠成 “DISØBEY”；⑦钩子④橙色频闪帧里，卡拉 OK 小字已唱的词橙上橙看不见。读速复核：主字幕最快 6.7 字/秒（116.37 s，24 字 3.58 s，画面简单），其余 ≤ 5.9；不改字幕时间。104.0 s 的切换（1 帧近空、坐标轴随即画出）在连续帧里读作干净的翻页，保留。
- 14:10 冻结 **r3**（`frozen/r3/`，MANIFEST.sha256 的 sha256 = 0da33d3e66f78bbcbffaa6dd465392ae76114bbbc184a2547901a51fdcee29fd；相对 r2 只改 5 个文件）。渲染器先从工作区出测试帧条核过 7 处修正；再用 r2 与 r3 源码各渲 14 个改动窗口外的时刻（含每个挪动过的场景边界之后），PNG 逐像素完全相同 → 只需重渲 12 块（00630 00720 00900 00990 01080 01710 02430 02790 03420 03690 04230 04320），其余沿用 r2 块。两路渲染 → `/dev/shm/pdx/r3/parts/`，日志 `log_r3a.txt` / `log_r3b.txt`。

- 14:13 r3 的 12 块渲完（两路，0.88–1.43 s/帧）；`/dev/shm/pdx/r3/assemble_r3.py`：39 块 r1 + 1 块 r2（03780）+ 12 块 r3，参数一致，流复制 → `r3/picture.mp4`（4664 帧，完整解码无错，sha256 e60c4749…d1d3）。
- 14:15 `frozen/r3/tools/finish.py` → **`/dev/shm/pdx/r3/final/ai-ye-hui-shua-fen-r3.mp4`**：55,235,611 B，sha256 `ab35eaf33aab5055dcdfd920402a236e0c4d85acefdc965683710e49f0db8d93`，technical_pass；处理后音轨与 r2 逐字节相同；音轨对录屏原音 lag 0；13 个同步事件（含三次 ⏎ 新闪光）全部落在预期帧；编码帧对渲染 PNG 无偏色。
- 14:20 r3 改动处逐帧条复核（⏎ 起飞 ×3、FOOM、分屏终点格、甩镜、DISOBEY、钩子④小字、10ⁿ）全部成立；r3 成片每 2 秒 1 帧全片终审通过。**放行 r3**（`RELEASE_r3.md`）；`ASSISTANT_ORDERS.md` 改为**已定稿**（r3）。
- 交付包：`/dev/shm/pdx/deliver-r3/`（成片、技术报告、`project-r3.tar`、`review-images-r3.tar`、`SHA256SUMS`、本次订单副本）。r2 候选片（sha256 8500eb81…66ed）已被取代，只作旧版归档（在 project tar 里），不交付。

## 现状（停在这里，等用户反馈）
- r3 成片已放行，等 Codex 按 `ASSISTANT_ORDERS.md` 取回 M4、核验、放桌面并回报播放链接。之后不再改动，不做下一支。
- 若要再改：改 `src/` → 新冻结 `frozen/r4/` → 只重渲受影响的分块（`node tools/render.mjs src/index.html video … --first A --last B --chunk 90 --crf 18 --parts /dev/shm/pdx/r4/parts`，在冻结目录里执行）→ 按 `r3/assemble_r3.py` 的做法拼接 → `tools/finish.py` → `tools/review.py` 从编码成片复核。
- `/dev/shm` 是内存盘（重启即丢）；根盘只剩几十 MB，不要往根盘写大文件。服务器上的分块、成片都保留，未删除任何文件。
