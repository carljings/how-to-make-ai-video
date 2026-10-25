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

## 下一步
1. 字体子集（Noto Sans SC 400/700/900、Noto Serif SC 900、IBM Plex Mono 400/600、Barlow Condensed 800）。
2. 写 `src/`：引擎（时钟、缓动、绘制、字幕、后期）+ 13 个场景。
3. 服务器逐段出静帧/连续帧条复核 → 修 → 冻结 r1 清单。
4. 渲染（服务器多路分块，/dev/shm）→ 原曲音轨（一次恒定增益到 −1.0 dBTP，尾部余弦）→ mux + 技术校验 → 从编码成片抽帧复核关键运动/转场/结尾。
5. 交 Codex：成片路径 + sha256 → 取回 M4、核验、放桌面（不覆盖原录屏与同名文件）。

## 继续入口
（渲染开始后补充确切命令）
