# 制作日志 · V2（Seedance 2.5 + Remotion + 中文配音）

规格：Seedance 2.5（doubao-seedance-2-5-260628）· 9:16 · 480p 样片 → 由样片任务 ID 直出 1080p（10bit HEVC，24fps）· 原生中文旁白+音效 · Remotion 合成 · −10 LUFS
批准：10月12日用户批准 V2 分镜（[storyboard.md](storyboard.md)），不要主持人；关键帧用用户给的 gpt-image-2 技能（GPT Image 2.5）。
密钥：方舟 `/root/.config/ark.env`，GPT Image `/root/.config/laozhang.env`（均 600 权限，不进仓库）。

## 素材

| 名称 | 用途 | 文件 | 状态 |
|---|---|---|---|
| style | 风格样图（Seedream 5.0 Pro） | refs/style.png | 备用 |
| key-hook → first-hook | 第1段首帧（金币从手机喷出、小人吓一跳），裁成 864×1536 | refs/first-hook.png/.jpg | ✓ |
| key-seg2/3/4/4b | 第2–4段镜头构图参考（GPT Image 2.5 编辑自 key-hook） | refs/key-seg*.jpg | ✓ |
| narrator | 第1段样片旁白（Demucs 分离人声，14.9秒），第2–4段音色参考 | refs/narrator.mp3 | ✓ |

## 镜头

| # | 片段 | 时长 | 参考 | 提示词 | 样片 | 1080p | 状态 |
|---|---|---|---|---|---|---|---|
| 1 | 问题、诺奖、两位得主 | 15 s | 首帧 first-hook | prompts/seg1.txt | clips/seg1-draft.mp4 | clips/seg1-1080p.mp4 | ✓ 通过（旁白说“存下来”，字幕照实写） |
| 2 | 霍尔：摊开花/马上花/意外 | 15 s | first-hook、key-seg2、narrator | prompts/seg2.txt | clips/seg2-draft.mp4 | clips/seg2-1080p.mp4 | ✓ 通过 |
| 3 | 八成两成；伍德福德：涨价 | 15 s | first-hook、key-seg3、narrator | prompts/seg3.txt | 第1条 seg3-draft-take1.mp4 ⟳（把“伍德福德”读成“伍德德”；远景小人太小；招牌乱码）；第2条 clips/seg3-draft.mp4 ✓ | clips/seg3-1080p.mp4 | ✓ 通过 |
| 4 | 央行一句话；千千万万个你；结尾 | 15 s | first-hook、key-seg4、key-seg4b、narrator | prompts/seg4.txt | clips/seg4-draft.mp4 | clips/seg4-1080p.mp4 | ✓ 通过 |

核对方法：每段看0.5秒一格的拼图；faster-whisper medium 转写旁白逐字对照（tasks/*.asr-medium.json）；Demucs 分离人声后比较音高，四段中位数 225–242 Hz，同一个声音。

## 费用（方舟用量，按官方单价估算）

样片 5 条 × 144,512 tokens（480p，70元/百万）≈ ¥51；1080p 4 条 × 731,025 tokens（77元/百万）≈ ¥225；Seedream 1 张、GPT Image 6 张（$0.03/张）。合计约 ¥280。

## 合成（10月13日）

| 步骤 | 结果 |
|---|---|
| 片段 | `scripts/prep.mjs`：四段 1080p（10bit HEVC）转成 H.264 1080×1920 24fps，每段 361 帧（15.042 秒），全片 60.17 秒 |
| 名字修补 | 成片第1段结尾两种转写模型（在分离人声上）都听成“伍德福顿”；样片与成片音频相关系数 0.96–0.98，是同一段读音。用第3段里同一旁白清楚的“德”替换这一个音节（14.775–15.042 秒，变速 1.03×），修补后两种模型都转写为“伍德福德” |
| 字幕 | `scripts/captions.py`：脚本原文按字与转写的词时间对齐，233 字中 232 字直接对上；四段共 29 条字幕 |
| 配乐 | 合成垫底（F大调120 BPM，无主旋律），侧链压在 Seedance 音轨下：压后比人声低约 14 LU；母带 −10.2 LUFS，真峰值 −2.3 dBTP（AAC 后） |
| 叠加 | 第0帧大字问题+“+¥1000”贴纸；“只发一次/每月都有”贴纸；得主名片；80%/20% 与出处小字；¥10→¥12；“全世界的央行都在用这类模型”；结尾 A/B 投票（投票出现时隐藏字幕，避免重叠） |
| 审片中改掉的 | “+¥1000”、两枚贴纸、价签贴纸停留到下一个镜头 → 提前收起；字体子集漏了字幕里的40个字（子集脚本没读 JSON）→ 修正后重新生成并重渲染；封面贴纸换行、4:3 封面大字挡住小人的脸 → 修正 |
| 检查 | `npm run verify` 17 项全部通过：1080p 素材、首帧问题完整、字幕时长与字数、得主名字、字体覆盖、帧确定性、1080×1920 24fps 1444帧、H.264/BT.709、AAC 48kHz、时长 60.18 秒、全片解码、−10.2 LUFS、真峰值 −2.3 dBTP、第0帧有声音 |

| 我看过的 | 我没能做的 |
|---|---|
| 每段样片和成片的拼图；编码后成片每秒一帧；首3秒每 1/6 秒；三处贴纸的前后帧；三张封面 | 没有听：配音自然度、配乐与人声的平衡只做了转写、音高、响度和电平测量 |
| 四段旁白逐字转写核对 | 没有在手机抖音界面里确认遮挡；没有发布 |
