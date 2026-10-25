# ASSISTANT_ORDERS — v2（Opus 5.5 主创/实现；Codex 执行与回报）

v2 源码已冻结：`out/v2-source.sha256`（23 个文件：package.json、package-lock.json、index.html、src/*.js、tools/*.mjs、assets/model/*、assets/fonts/*）。请先逐个比对哈希，**不改** `src/`、`tools/`、`assets/`。有事实/技术问题报给我，由我修。

## 规格
1080×1920 · 30 fps · **42.3 s · 1269 帧** · 120 BPM 剪辑网格。服务器上 `node tools/score.mjs` 得 master.wav sha256 `7af6db2d914d1d8a4a16f99b0420608e80565acd84fd5c6fa980d75c7043844e`（−20.00 LUFS / −6.85 dBTP）；M4 若不同请报告（v1.2 时两边逐字一致）。

## A. 在 M4 渲染与合成（照抄）
```sh
npm ci
node tools/textcheck.mjs                 # 应输出 13 cards … END 42.3，退出码 0
node tools/score.mjs                     # 记录 master.wav sha256
node tools/render.mjs --video --workers 1 --gl metal --out out/picture.mp4
node tools/verify.mjs --mux              # 生成 out/kanbujian-de-shidun.mp4 与 out/verification.json；退出码 0 = 全部检查通过
```
v2 已修 verify 的黑场解析（`metadata=print:file=-`）与联络表在无 drawtext 时的回退/退出码。

## B. 需要回报的实际编码证据（从**编码后的 MP4** 抽帧，不用渲染中间帧）
1. `out/verification.json` 全文与 verify 退出码；成片字节数与 sha256。
2. 联络表：全片每 15 帧一张（约 85 帧，可分多张）；**25–37 s 每 3 帧**（尽头 → 掉落 → 翻身 → 接住）。
3. 全尺寸单帧：f0、f45、f150、f270、f330、f480、f560、f650、f750、f810、f870、f930、f1000、f1090、f1150。
4. 亮度（回应“车子太亮了”）：对 f0、f150、f930、f1150 报告整帧 Y′ 均值，以及 Y′>235、Y′>250 像素占比；与 v1.2 的同一内容帧（v1.2 的 f0、f150、f1310、f1580）对比列出。
5. 音频：ebur128 整合响度/真峰（编码后）；每 0.5 s 的短时电平列表（可用 `ebur128=metadata=1` 或 astats），重点 25–33 s。
6. 任何解码警告、报错、或 M4 与服务器的音频哈希差异。

## C. 我做不到、需要真人的
连续播放观看、听感（律动是否“动感”又不刺耳）、实体手机上的可读性——请把成片给用户看，把用户原话转给我。不要替用户下结论，也不要把“已转交”写成“已验收”。

---
# 追加任务 — 参考视频 BGM 版（2026-10-19）
不改 v2 画面与 `src/`；只新增 `tools/reference_bgm.mjs`（sha256 `5ee34838aadacacef67c68ea2c868ddbe546d43729cb2912c655f211c061de1a`）。
输入：`out/kanbujian-de-shidun.mp4`（v2，sha256 `00c4c988…8bb10`）与 `reference-original.m4a`（sha256 `24c65e8bc2db08c3697491bf89c48210c91a2ca6bdffcf1724f01f618ccf12ab`）。

## 在 M4 执行（照抄；路径按你本机放置）
```sh
node tools/reference_bgm.mjs --ref <path>/reference-original.m4a --film out/kanbujian-de-shidun.mp4 --out out/kanbujian-de-shidun-v2-reference-bgm.mp4
```
退出码 0 = 7 项检查全过（视频流逐字节一致、1269 帧、42.3 s、−20±1 LUFS、≤ −6 dBTP、全片解码、结尾静音）。原合成配乐版 `out/kanbujian-de-shidun.mp4` 不动、保留。

## 回报证据
1. `out/reference-bgm-verification.json` 全文与退出码；新文件字节数与 sha256。
2. 独立核验：`ffmpeg -xerror` 全片解码；ebur128（编码后 AAC）；两个文件的视频基本流 sha（`-map 0:v -c copy -f h264`）是否相同。
3. 编码后音频每 0.25 s 的 RMS：0–6 s（原曲停顿应在约 3.2–4.4 s，4.5 s 回归）、26–32 s（掉落段压低、31.0 s 恢复）、40–42.3 s（淡出与静音）。
4. 服务器替身测试的 master.wav 为 `out/audio-reference-bgm/master-reference-bgm.wav`；M4 若哈希不同，报告即可（ffmpeg 版本差异可能导致）。
5. 把新文件交给用户试听，转回原话。不要替用户判断“好不好听”，不要把技术通过写成验收。

## 版权提醒（请转告用户）
这首音乐来自另一位创作者的抖音视频，曲名、作者与授权未知，本项目没有授权。个人审看没问题；公开发布前请确认授权，或在平台内用已授权的同曲，或使用自带原创配乐版。
