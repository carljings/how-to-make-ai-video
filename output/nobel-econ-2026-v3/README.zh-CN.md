# 一句话，让整个小镇破产了 · V3：2026诺贝尔经济学奖的黏土小镇寓言

[English](README.md) · **简体中文**

2026年诺贝尔经济学奖（罗伯特·E·霍尔、迈克尔·伍德福德）短片的第三版。用户认为 V2（黏土微缩讲解片，[`../nobel-econ-2026-v2/`](../nobel-econ-2026-v2/README.zh-CN.md)）“不刺激，也不够吸引人……很多人会划走”：它像一堂课，没有悬念。V3 改讲一个寓言：开头先给结果，一句谣言让整个小镇破产；再倒回三天前，看谣言传开、骨牌一块块倒下，直到“谣言，自己变成了真的”。这时诺贝尔奖章砸进广场，两位得主的道理揭开谜底，央行一句让人相信的话让灯重新亮起。结尾回到开头那位面馆老板，他在灯下笑了。

- **画面和声音**：3段 Seedance 2.5 视频（15秒、15秒、22秒），普通话旁白、配乐、音效都和画面一起由 Seedance 生成。每段先出480p样片，看拼图、用 faster-whisper 转写核对，通过后由样片任务ID直出1080p。A 段从 GPT Image 2.5 关键帧开始（小镇变暗时面馆老板惊恐的脸），所以第0帧就是钩子。B、C 段用 Seedream 5.0 Pro 关键帧做构图参考，用 A 段的旁白（Demucs 分离人声）做音色参考。各段旁白音高一致，行长是另一个声音。
- **换掉一句**：C 段旁白把“要不好过了”说坏了（两种 Whisper 模型都听成“药包不好过了”）。画面保留，这句用同一个音色参考单独重新生成一条5秒片段，再由 `scripts/patch_vo.py` 叠在 C 段的配乐和音效上。
- **假字**：两块招牌上有模型画的假字（A 段是拉丁字母，B 段像中文）。`scripts/prep.mjs` 只在这两个镜头里把画面顶部做移轴式模糊。
- **Remotion**：
  - 文字：第0帧的大字钩子、“三天前”印章、发抖的谣言引号、像骨牌一样倒下来的三组因果、奖章落地时的揭晓；
  - 人物：两位得主名片（剪影）和获奖理由；行长讲话时字放到他脸下方，他那句话做成对话气泡；
  - 框架：结尾 A/B 投票、与旁白对齐的字幕、“寓言示意 · 非真实事件”标注、进度条；
  - 声音：母带 −10 LUFS。

| 文件 | |
|---|---|
| `out/nobel-econ-2026-v3.mp4` | 成片：52.1秒，1080×1920，24 fps，H.264，AAC 48 kHz，−10.4 LUFS，真峰值 −2.1 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | 抖音封面，与首帧同一画面 |
| `out/nobel-econ-2026-v3.sheet.jpg` | 编码后成片每秒一帧 |
| `out/verification.json` | `npm run verify`：19项检查全部通过 |
| [storyboard.md](storyboard.md) · [production-log.md](production-log.md) · [publish-copy.md](publish-copy.md) · [sources.md](sources.md) · [CREDITS.md](CREDITS.md) | 分镜、带费用的镜头日志、抖音发布稿、事实出处、创作与来源 |

## 重建

生成需要用户的方舟密钥 `/root/.config/ark.env` 和 GPT Image 密钥 `/root/.config/laozhang.env`（都不进仓库）。合成需要 Node 18+、ffmpeg 和 Python 3；转写和人声分离用了一个装有 numpy、Demucs、faster-whisper 的临时虚拟环境。

```sh
python3 scripts/ark.py video clipA --prompt-file prompts/clipA.txt --first-frame refs/first-a.jpg --duration 15 --draft   # 480p 样片
python3 scripts/ark.py video clipB --prompt-file prompts/clipB.txt --image refs/first-a.jpg --image refs/key-b.jpg --image refs/key-c.jpg --audio refs/narrator.mp3 --duration 15 --draft
python3 scripts/ark.py final clipB                     # 由样片任务ID直出1080p
python -m demucs --two-stems=vocals -n htdemucs -o audio/sep audio/sep/clipC.wav audio/sep/vo-end.wav
python3 scripts/patch_vo.py                            # C 段声音换上重录的最后一句 → audio/clipC.wav
node scripts/prep.mjs                                  # 视频 → public/clips（H.264 24fps，招牌假字模糊），时长 → src/clips.json
python3 scripts/captions.py                            # 由转写得到字幕时间 → src/captions.json
npm run fonts && npm run mix                           # 字体子集；三段声音 → public/mix.wav（−10 LUFS）
npm run render && npm run cover && npm run verify
```
