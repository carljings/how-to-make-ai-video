# 创作与来源 · V3

- 选题、参考文章、各项决定（先测开头样片、做寓言版、用 Seedance 加中文配音、−10 LUFS）：用户。
- 故事与分镜、提示词、关键帧编辑、审片与核对、Remotion 合成、混音与文档：Claude Code（Opus 5.5），2026年10月13日。
- 画面、旁白、配乐与音效：Seedance 2.5（火山方舟 `doubao-seedance-2-5-260628`），用户的账号生成。旁白是模型生成的声音，不是真人配音。
- 关键帧：GPT Image 2.5（经 api.laozhang.ai，用户的账号）生成开场关键帧；Seedream 5.0 Pro（火山方舟）生成 B、C 段的构图参考。风格样图 `refs/style-ref.png` 来自本片 V2 的开场关键帧。
- 人声分离与转写：[Demucs](https://github.com/facebookresearch/demucs)（htdemucs，MIT）、[faster-whisper](https://github.com/SYSTRAN/faster-whisper)（MIT，Whisper medium 模型），只用于核对旁白、做字幕时间和替换最后一句。
- 字体：Noto Sans SC、Noto Serif SC（SIL Open Font License，[public/fonts/OFL-NotoSansSC.txt](public/fonts/OFL-NotoSansSC.txt)、[OFL-NotoSerifSC.txt](public/fonts/OFL-NotoSerifSC.txt)）；JetBrains Mono（SIL OFL，[OFL-JetBrainsMono.txt](public/fonts/OFL-JetBrainsMono.txt)）。只保存用到的字的子集。
- 软件：[Remotion](https://www.remotion.dev/)（[Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)：个人、三人及以下的公司和非营利组织可免费使用，更大的公司需要公司授权；不是 MIT）、React、esbuild、puppeteer-core、ffmpeg。版本固定在 package-lock.json。
- 事实依据：[sources.md](sources.md)。

小镇、人物和奖章都是虚构的示意：奖章只用了通用的月桂花环，不是诺贝尔奖章的真实图案；两位得主只以剪影名片出现，没有画他们的肖像。
