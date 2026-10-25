# ASSISTANT_ORDERS — 《AI 也会刷分》 r3 交付（Opus 5.5 → Codex，只做机械执行）

状态：**已定稿**（Opus 5.5 · claude-opus-5-5 / max，2026-10-21 修订；放行依据见 `RELEASE_r3.md`）。
旧草稿（r2）作废：r2 候选片已被 r3 取代，**不要**交付 `/dev/shm/pdx/r2/final/ai-ye-hui-shua-fen-r2.mp4`。

规则：只按下列命令逐条执行。不改任何文件内容、不重渲、不重编码、不改名（除第 4 步指定的桌面文件名）、不删除任何已有文件、不覆盖同名文件。任何一步结果与预期不符：停下，原样回报输出，不自行补救。不发布、不 git 推送、不付费生成、不写永久记忆。

## 0. 服务器上的交付物（只读）
目录：`/dev/shm/pdx/deliver-r3/`（内存盘；取回完成前不要重启服务器）

| 文件 | 字节 | sha256 |
|---|---|---|
| `ai-ye-hui-shua-fen-r3.mp4`（成片） | 55,235,611 | `ab35eaf33aab5055dcdfd920402a236e0c4d85acefdc965683710e49f0db8d93` |
| `ai-ye-hui-shua-fen-r3.json`（技术检查报告） | 1,576 | `3fa0ce05ccf84e8c4b801311c8fda15697c9118e5f33e8b56d5c9dbfcd4ef89d` |
| `project-r3.tar`（工程归档：src、tools、docs、frozen r1/r2/r3、全部渲染分块含被替换的旧块、日志、处理后音轨、被取代的 r2 候选片及报告、RELEASE） | 见 `SHA256SUMS` | 见 `SHA256SUMS` |
| `review-images-r3.tar`（各轮审片图、测试渲染） | 见 `SHA256SUMS` | 见 `SHA256SUMS` |

同目录 `SHA256SUMS` 列出以上四项；本文件的服务器副本（工程目录与 `deliver-r3/` 里各一份）在打包后补上了两个 tar 的字节数与 sha256。tar 里收的那份本文件写的是“见 SHA256SUMS”（tar 不可能包含自己的哈希）。

## 1. 服务器端核对（取回前）
```
cd /dev/shm/pdx/deliver-r3 && sha256sum -c SHA256SUMS
```
预期：四行都是 `OK`。

## 2. 取回到 M4
用你此前取回服务器文件的同一通道（可分段并行），把 `deliver-r3/` 里的全部文件原样取回到 M4 上新建的空目录：
`<M4仓库根>/output/desktop-recording-explainer-20261021/deliver-r3/`
（`<M4仓库根>` = 你在 M4 上与服务器 `/root/codex-roadster-v9-20261019` 对应的工作区；回报里写出实际绝对路径。目录已存在则停下回报。）
先取成片 `ai-ye-hui-shua-fen-r3.mp4`、`SHA256SUMS`、`ai-ye-hui-shua-fen-r3.json`、`ASSISTANT_ORDERS.md`，可以先做第 3、4 步；两个 tar 随后取回再做第 5 步。

## 3. M4 端核对成片（用 M4 上的 FFmpeg 8.1）
```
cd "<M4仓库根>/output/desktop-recording-explainer-20261021/deliver-r3"
shasum -a 256 ai-ye-hui-shua-fen-r3.mp4 ai-ye-hui-shua-fen-r3.json
ffprobe -v error -show_entries stream=index,codec_type,codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames,duration,start_time,sample_rate,channels,color_range,color_space,color_transfer,color_primaries -of compact ai-ye-hui-shua-fen-r3.mp4
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 ai-ye-hui-shua-fen-r3.mp4
ffmpeg -v error -xerror -i ai-ye-hui-shua-fen-r3.mp4 -map 0 -f null - ; echo "decode_exit=$?"
```
预期：两个 sha256 与第 0 步表格完全相同；视频 h264 High 1080×1920 yuv420p 30/1、nb_frames 4664、duration 155.466667、bt709 / tv；音频 aac 44100 Hz 2 声道；两路 start_time 0；`nb_read_frames` = **4664**；解码无任何输出且 `decode_exit=0`。

## 4. 放到桌面（不覆盖原录屏和任何同名文件）
```
cd "<M4仓库根>/output/desktop-recording-explainer-20261021/deliver-r3"
D="/Users/guchuan/Desktop/AI也会刷分.mp4"
[ -e "$D" ] && D="/Users/guchuan/Desktop/AI也会刷分（r3）.mp4"
[ -e "$D" ] && { echo "STOP: both names exist"; exit 1; }
cp -n ai-ye-hui-shua-fen-r3.mp4 "$D" && shasum -a 256 "$D"
```
预期：桌面文件 sha256 = `ab35eaf33aab5055dcdfd920402a236e0c4d85acefdc965683710e49f0db8d93`（与第 0 步成片逐字节相同）。不要动 `ScreenRecording_10-21-2026 12-07-19_1.MP4` 和桌面上任何已有文件。

## 5. 工程归档（不覆盖）
```
cd "<M4仓库根>/output/desktop-recording-explainer-20261021/deliver-r3"
shasum -a 256 -c SHA256SUMS
mkdir "<M4仓库根>/output/desktop-recording-explainer-20261021/r3-package"
tar -xf project-r3.tar -C "<M4仓库根>/output/desktop-recording-explainer-20261021/r3-package"
mkdir "<M4仓库根>/output/desktop-recording-explainer-20261021/r3-package/review-images"
tar -xf review-images-r3.tar -C "<M4仓库根>/output/desktop-recording-explainer-20261021/r3-package/review-images"
```
预期：`SHA256SUMS` 四行 `OK`；`r3-package` 必须是新建的空目录（`mkdir` 失败说明已存在：停下回报）。解开后不要改动任何文件。

## 6. 回报（原样贴输出）
第 1–5 步每条命令的输出；`<M4仓库根>` 实际路径；桌面最终文件名；以及当前会话里可点的播放链接：
- `AI也会刷分.mp4` → `file:///Users/guchuan/Desktop/AI%E4%B9%9F%E4%BC%9A%E5%88%B7%E5%88%86.mp4`
- 若用了备用名 `AI也会刷分（r3）.mp4` → `file:///Users/guchuan/Desktop/AI%E4%B9%9F%E4%BC%9A%E5%88%B7%E5%88%86%EF%BC%88r3%EF%BC%89.mp4`

然后停止，等用户反馈；不自动做下一支，不发布。
