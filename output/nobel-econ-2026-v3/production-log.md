# 制作日志 · V3（寓言版：一句话，让整个小镇破产了）

规格：Seedance 2.5（doubao-seedance-2-5-260628）· 9:16 · 480p 样片 → 由样片任务 ID 直出 1080p · 原生中文旁白+配乐+音效 · Remotion 合成 · −10 LUFS
批准：10月13日用户批准寓言方案（[storyboard.md](storyboard.md)），先做开头样片测钩子；看过 `clips/clipA-preview.mp4` 后批准做完整版（当时估算再花约 ¥190）。
密钥：方舟 `/root/.config/ark.env`，GPT Image `/root/.config/laozhang.env`（均 600 权限，不进仓库）。

## 素材

| 名称 | 用途 | 文件 | 状态 |
|---|---|---|---|
| style-ref | V2 的开头关键帧，只借它的黏土风格 | refs/style-ref.png | ✓ |
| key-a → first-a | A 段首帧：面馆老板惊恐的脸，身后小镇变暗（GPT Image 2.5 编辑自 style-ref），裁成 864×1536；PNG 上传超时，改用 JPEG（PNG 没有上传，也不入库） | refs/key-a.png、refs/first-a.jpg | ✓ |
| key-b | B 段第一个镜头的构图：空面馆、骨牌排出门外 | refs/key-b.jpg | ✓ |
| key-c | C 段第一个镜头的构图和行长外貌；第1张里行长长得和老板一样（refs/key-c-take1.jpg），第2张改成花白头发、圆眼镜、灰胡子，并加上广场上的奖章 | refs/key-c.jpg | ✓ |
| narrator | A 段样片的旁白（Demucs 分离人声，去掉礼帽小人那句，10.7秒），B、C 段的音色参考 | refs/narrator.mp3 | ✓ |

key-b、key-c 原计划用 GPT Image 2.5，但服务连续返回 429（“当前分组上游负载已饱和”，两个模型各试 4–5 次），改用 Seedream 5.0 Pro（`ark.py image --image refs/key-a.jpg`，1440×2560）。

## 镜头

| # | 片段 | 时长 | 参考 | 提示词 | 样片 | 1080p | 状态 |
|---|---|---|---|---|---|---|---|
| A | 谣言：熄灯、三天前、耳语、人人省钱 | 15 s | 首帧 first-a | prompts/clipA.txt | 第1条 clipA-draft-take1.mp4 ⟳（旁白2.3秒才开口、耳语链没出来、招牌乱码）；第2条 clips/clipA-draft.mp4 ✓ | clips/clipA-1080p.mp4 | ✓ 通过 |
| B | 多米诺：面馆、面粉店、伙计、全镇熄灯、奖章砸下 | 15 s | first-a、key-b、key-c、narrator | prompts/clipB.txt | clips/clipB-draft.mp4 | clips/clipB-1080p.mp4 | ✓ 通过 |
| C | 发现、行长讲话、全镇亮灯、面馆重开、提问 | 22 s | first-a、key-c、narrator | prompts/clipC.txt | clips/clipC-draft.mp4 | clips/clipC-1080p.mp4 | ✓ 画面通过；最后一句旁白换掉（见下） |
| vo-end | 只为 C 段最后一句重录旁白 | 5 s | first-a、narrator | prompts/vo-end.txt | clips/vo-end-draft.mp4 | 不需要 | ✓ 只用声音 |

核对方法：每段看拼图（`tools/review.sh`，1秒一格）；faster-whisper medium 转写旁白逐字对照（tasks/*.asr-medium.json），得主名字转写为“霍尔和伍德福德”；Demucs 分离人声后比较音高：旁白各段中位数 117–132 Hz（参考音 123 Hz），行长那句 165 Hz，是另一个声音。

### C 段最后一句

C 段旁白把“要不好过了”说坏了：两种 Whisper 模型（small、medium），加不加提示词，都听成“下次再听到**药包**不好过了”，置信度 0.95–1.00。画面很好，不重做整段（¥15 样片 + ¥82 成片，而且新的一条画面会变）。做法：

1. 用同一个音色参考单独生成一条5秒样片（prompts/vo-end.txt），台词加上“日子”两个字：“下次再听到‘日子要不好过了’，你会先省钱吗？”。转写正确，音高中位数 123 Hz，和参考音一致；响度 −14.6 LUFS，和 C 段原旁白（−14.1 到 −14.6）一样。
2. Demucs 把 C 段 1080p 的声音分成人声和伴奏；`scripts/patch_vo.py` 在 17.1 秒（上一句结束后，人声轨此处近乎无声）交叉淡化到“伴奏 + 新旁白”，新旁白从 17.6 秒开始，21.7 秒结束。
3. 合成后的声音再转写一遍（tasks/clipC-patched.asr-medium.json）：“下次再听到，日子要不好过了，你会先省钱吗？”✓

### 画面里的假字

- A 段 9.875–13.125 秒（家具店、面馆两个镜头）招牌上有假拉丁字母；B 段 2.333–4.75 秒面粉店招牌顶上有像中文的假字（“夕夕粉粉”）。`scripts/prep.mjs` 在这两段把画面顶部做移轴式模糊（只在这两个硬切之间，往下羽化，不碰人脸）。
- C 段面馆后墙上的菜单纸有模糊的红色笔画，在背景虚化里、很小，之后被结尾提问的字盖住，没有处理。

## 合成

- `npm run prep`：三段 1080p 转 H.264 8bit 24fps，顶部假字模糊；时长写进 src/clips.json。
- `python3 scripts/captions.py`：字幕文字用脚本原文，时间用转写的逐字时间（A 57/57、B 57/57、C 83/86 个字对上）。
- `npm run mix`：三段 Seedance 自带的声音首尾相接（C 段用 audio/clipC.wav），接缝 10 毫秒淡入淡出，母带 −10 LUFS。
- Remotion 叠加：第0帧大字钩子；“三天前”印章；谣言那句做成发抖的引号大字；B 段三组因果像骨牌一样倒下来；“谣言，自己变成了真的”；奖章落地时出“诺贝尔经济学奖”；两位得主名片和获奖理由；行长讲话时字放到画面下方，不挡脸；他那句话做成对话气泡；结尾 A/B 投票；“寓言示意 · 非真实事件”一直在进度条下面。

## 成片

`out/nobel-econ-2026-v3.mp4`：52.1秒（1251帧），1080×1920，24 fps，39 MB，−10.4 LUFS，真峰值 −2.1 dBTP。渲染约6分钟（4核、无GPU）。`npm run verify` 19项全部通过（out/verification.json）。成片整段再转写一遍，旁白逐句都对；17.1秒换声处、两个段落接缝处都没有跳变或爆音（接缝前后5毫秒内 −59 到 −78 dB）。

## 费用（方舟用量，按官方单价估算：480p 70元/百万 tokens，1080p 77元/百万 tokens）

| 项目 | tokens | 约 |
|---|---|---|
| A 段样片 2 条 | 2 × 144,512 | ¥20.2 |
| A 段 1080p | 731,025 | ¥56.3 |
| B 段样片 + 1080p | 144,512 + 731,025 | ¥66.4 |
| C 段样片 + 1080p（22秒） | 211,765 + 1,071,225 | ¥97.3 |
| 最后一句重录（5秒样片） | 48,437 | ¥3.4 |
| Seedream 5.0 Pro 3 张、GPT Image 1 张（$0.03） | | 约 ¥1.2 |
| **合计** | | **约 ¥245** |

用户批准完整版时的估算是再花约 ¥190；实际在测钩子的两条样片之后又花了约 ¥225。多出来的主要是 C 段做成了22秒（成片 ¥82，按20秒估算约 ¥75），以及最后一句的重录。
