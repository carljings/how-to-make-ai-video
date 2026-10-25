# 一跃 · One Leap

[English](README.md) · **简体中文**

一部36秒的抖音竖屏短片。一只橘色小奶猫扑向一只发光的蓝蝴蝶，这一扑把它带进六个不可能的世界，每个世界都来自它房间里的一样东西：晚霞云海（它的毯子）、红灯笼夜空里的锦鲤（鱼缸和串灯）、骑着曲奇冲牛奶浪（牛奶碟）、水晶球、毛线球星系，最后跃过月亮（纸灯笼），在月亮前抓住了蝴蝶。它在篮子里醒来，真正的蝴蝶落在它鼻子上，它打了个喷嚏，片子回到开头循环。没有旁白，也没有屏幕文字。

用户10月16日的要求：做一部可爱猫咪的片子，画面要惊艳到让人想问怎么做的，配乐要有动感，不抄袭、不做垃圾内容，预算不超过100元。见 [brief.md](brief.md) 和 [storyboard.md](storyboard.md)。

- **画面**：先用 GPT Image 2.5 生成小猫的角色设定图（`refs/kitten-sheet.png`），再从这张图编辑出每个镜头的关键帧，所以每个镜头里小猫的脸和花纹都一样。10段 Seedance 2.5 图生视频（720p，共44秒）都从这些关键帧开始。每一段都是第一次生成就用上了。
- **剪辑**：Remotion。`scripts/prep.py` 从视频里切出12段，按整拍调速，放大到1080×1920。`src/Film.tsx` 每个强拍切一次，每个世界有自己的转场：冲进第一个 drop 的推镜、甩镜进锦鲤、白色水花进牛奶、溶进水晶球、旋转进太空、圆形遮罩打开月亮，小猫醒来时月亮缩成纸灯笼。
- **配乐**：用 Python 从零合成的原创配乐（`scripts/score.py`），不用采样、循环或 AI 音乐。F 大调，120 BPM，IV–V–iii–vi 王道进行。八音盒开场，蓄力到起跳，drop 的音色随每个世界变化，太空里的间奏用了小猫自己的叫声，月亮上有合唱，坠落时磁带减速，结尾在喷嚏处停一下，再接回第一小节。
- **音效**：Seedance 自己生成的脚步、猫叫、水花和喷嚏。提示词写了“无bgm”，还是有几段带了小段钢琴旋律，所以其中五段（A1、B、F、G、H2，即 `src/timeline.json` 里 `audio: "clean"` 的）只用 Demucs 分离出的人声和鼓两轨（`scripts/sfx.py`）。小猫出声时配乐自动让开（`scripts/mix.py`）。

| 文件 | |
|---|---|
| `out/one-leap-10.mp4` | 成片，抖音大音量版：36.0秒，1080×1920，24 fps，H.264，AAC 48 kHz，−10.3 LUFS，真峰值 −2.1 dBTP |
| `out/one-leap-14.mp4` | 同一画面，−14.1 LUFS，真峰值 −3.0 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | 封面：第0帧，小猫眼睛里倒映的蝴蝶 |
| `out/one-leap.sheet.jpg` | 编码后成片每秒一帧 |
| `out/verification.json` | 测了什么、看了什么、哪些没能检查 |
| [production-log.md](production-log.md) | 镜头、生成次数、费用和各项决定 |

## 重建

生成需要用户的方舟密钥 `/root/.config/ark.env` 和 GPT Image 密钥 `/root/.config/laozhang.env`（都不在仓库里）。Seedance 视频片段、Demucs 分离的音轨、合成的分轨、切好的片段和混音都不入库，用下面的命令重新生成。合成需要 Node 18+、ffmpeg、Python 3 加 numpy、scipy、soundfile、pedalboard（装在临时 venv 里），清理音效还需要 Demucs。`node_modules` 和 `../optogenetics-film-v3/` 共用，版本在 `package.json` 里写死。

```sh
bash scripts/keys.sh key-a1                     # 从角色设定图编辑出一张关键帧（上游出错会重试）
python3 scripts/ark.py video A1 --prompt-file prompts/clip-a1.txt --first-frame refs/key-a1.jpg --duration 4   # 一段720p视频
python3 scripts/prep.py                         # 视频 → public/seg/*.mp4，1080×1920，按 src/timeline.json 的节拍网格切
python3 scripts/score.py                        # → audio/score.wav 和 audio/stems/
python3 scripts/sfx.py                          # → audio/sfx-track.wav
python3 scripts/mix.py                          # → public/mix-10.wav（−10 LUFS）和 public/mix-14.wav（−14 LUFS）
npm run render                                  # → out/film-silent.mp4
ffmpeg -i out/film-silent.mp4 -i public/mix-10.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest out/one-leap-10.mp4
```

`src/timeline.json` 是唯一的时间来源：每段的入点、速度、音量，以及配乐要读的提示点（起跳、drop、抓住、坠落、醒来、喷嚏）。

## 创作与来源

- 创意、预算和简报：用户。故事、分镜、提示词、剪辑、配乐、混音和文档：Claude Code（Opus 5.5），2026年10月16日；10月25日整理入库。
- 视频和音效：Seedance 2.5（火山方舟），用户的账号生成。关键帧：GPT Image 2.5（经 api.laozhang.ai，用户的账号）。
- 人声分离：[Demucs](https://github.com/facebookresearch/demucs)（htdemucs，MIT）。
- 软件：[Remotion](https://www.remotion.dev/)（[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)：个人、三人及以下的公司和非营利组织可免费使用，更大的公司需要公司授权）、React、ffmpeg。
- 小猫、房间和各个世界都是生成的。片中没有真人、商标或第三方音乐。
