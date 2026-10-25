# 多给你1000块，你会花吗？ · V2：Seedance 2.5 + Remotion

[English](README.md) · **简体中文**

2026年诺贝尔经济学奖（罗伯特·E·霍尔、迈克尔·伍德福德）科普短片的重制版。用户认为 V1（`../nobel-econ-2026/`，纯代码扁平动画、无旁白）“不够好”，要求用 Seedance 2.5 生成画面、Remotion 合成、加中文配音、不要主持人出镜。

**结果**：用户认为 V2 “不刺激，也不够吸引人……很多人会划走”：它像一堂课，没有悬念。[V3](../nobel-econ-2026-v3/README.zh-CN.md) 把同一个道理改讲成寓言。

- **画面**：4段15秒的 Seedance 2.5 黏土微缩风格视频，先生成480p样片审片，通过后由样片任务ID直出1080p。开场首帧是 GPT Image 2.5 生成的关键帧（金币从手机里喷出、黏土上班族吓得往后倒），作为 Seedance 的首帧，所以第0帧就是钩子；后几段用 GPT Image 关键帧做构图参考。
- **配音**：Seedance 与画面一起生成的普通话旁白。第2–4段用第1段的旁白（Demucs 分离人声）做音色参考，四段音高一致。每句都用 faster-whisper 转写并与脚本逐字核对；第3段因把“伍德福德”读漏一个字重做一次；第1段结尾一个含糊的音节换成同一个旁白在第3段里清楚的读音（`scripts/patch_name.py`）。
- **Remotion**：第0帧的大字问题、大标题、两位得主名片（剪影）、80%/20%及出处、¥10→¥12价签、结尾A/B投票、与旁白对齐的字幕、进度条、压在人声下的合成配乐，母带 −10 LUFS。

| 文件 | |
|---|---|
| `out/nobel-econ-2026-v2.mp4` | 成片：60.2秒，1080×1920，24 fps，H.264，AAC 48 kHz，−10.2 LUFS，真峰值 −2.3 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | 抖音封面，与首帧同一画面 |
| `out/nobel-econ-2026-v2.sheet.jpg` | 编码后成片每秒一帧 |
| `out/verification.json` | `npm run verify`：17项检查 |
| [storyboard.md](storyboard.md) · [production-log.md](production-log.md) · [publish-copy.md](publish-copy.md) | 分镜、带费用的镜头日志、抖音发布稿 |

## 重建

Seedance 视频片段（`clips/`、`public/clips/`）、分离出的音轨（`audio/`）和混好的声音（`public/mix.wav`）不在仓库里，用下面的命令重新生成。

生成需要用户的方舟密钥（`/root/.config/ark.env`）和 GPT Image 密钥（`/root/.config/laozhang.env`），都不进仓库。合成需要 Node 18+、ffmpeg、Python 3；名字修补和转写用了装有 numpy、Demucs、faster-whisper 的临时虚拟环境。命令见英文版。
