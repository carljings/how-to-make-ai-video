# 来源、许可与科学依据 —《等它落下来》

## 画面
全部为本项目 Canvas 2D 代码程序生成（`src/`），无外部图像/视频素材；参考作品（抖音“为什么会有龙”《你的大脑，比耳朵先爽》）只用于学习体验机制，画面、版式、文案均为原创，未复用其界面或数字。
- 字体：Noto Sans SC 500/900，经 Google Fonts css2 `text=` 子集化（`assets/fonts/fonts.json` 记录字符与 sha256），SIL OFL 1.1（`LICENSES/Noto-Sans-SC-OFL.txt`）。

## 声音
- 源：用户提供的参考录屏音轨 `.omx/artifacts/music-anticipation-original-20261020/assets/reference-audio.m4a`（sha256 `6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61`，39.466 s，44.1 kHz 立体声 AAC）。界面曲名“Rush（旋律很哇塞）—云桃”仅为 UI 显示，**未做歌曲识别与授权核验，本项目无授权**；仅供可试听草片，公开发布前需确认授权或换授权音乐。
- 处理（`tools/edit.py`，映射写入 `assets/edit-plan.json` 与 `docs/CUE_SHEET.md`）：只用本曲自身素材；两处拼接（第 3 次 drop 的铺垫小节重复一次；结尾用第 1 次 drop 的落拍 + 低通扫频 12 kHz→150 Hz + 指数衰减）；25 ms 等功率交叉淡化，均在下一下拍起音前结束；整体静态 −3 dB（源音解码真峰 +1.7 dBTP，避免过载），无压缩/限幅/duck。master：−11.4 LUFS / −1.3 dBTP（源 −8.3 LUFS / +1.7 dBTP）。
- 分析（`tools/analyze_source.py`、`tools/analyze_master.py`）：谱通量起音、拟合拍长 0.532 s（≈112.8 BPM，仅作标注）、以低音回归最陡处定小节线；三次 drop（3.065 / 20.091 / 32.850 s）由“低音变薄小节后低音回归”自动检出。**无人工试听**，只是编排辅助。

## 科学（Codex 已核原文；片中只用其中可靠的部分）
Salimpoor VN, Benovoy M, Larcher K, Dagher A, Zatorre RJ. *Anatomically distinct dopamine release during anticipation and experience of peak emotion to music.* Nature Neuroscience 14, 257–262 (2011). DOI 10.1038/nn.2726 · https://www.nature.com/articles/nn.2726 · https://pubmed.ncbi.nlm.nih.gov/21217764/
| 片中表述 | 依据 | 限定 |
|---|---|---|
| 听最爱的歌 / 测大脑里的多巴胺；脚注“自选、能稳定起鸡皮疙瘩的音乐 · 8 份 PET 数据” | 参与者自带强烈愉悦、能稳定引起寒颤的音乐；PET 测纹状体多巴胺释放。217 人报名、多轮筛选 10 人入组，2 份 PET 数据因不适剔除，最终 8 份分析 | 小样本、自选音乐；不代表每个人、任意歌 |
| 快到的时候尾状核更活跃 / 真的到了伏隔核更活跃；脚注“PET：两处都有多巴胺释放；‘先、后’来自 fMRI 活动” | 原文：期待阶段尾状核、峰值体验阶段伏隔核分别参与；时间分离来自 fMRI | BOLD ≠ 实时多巴胺浓度；论文用的“峰值前 15 秒”是分析窗口，片中不用这个数字 |
| 期待也在奖赏里 / 不只是“到了”；你爱的不只是那一下，还有等它的那几秒 | 文章结论：期待阶段也有奖赏相关多巴胺释放 | 不说等待比高潮更爽（2.51 vs 2.11 是主观评分，不用） |
| 这首歌也这样写 / 每次落下前，低音先变薄 | **本片音轨实测**（`assets/source-analysis.json`，25–70 Hz 小节均值，中位 41.5 dB）：第 1 次 drop 前的前奏小节 28.5 dB；第 2、3 次 drop 前两小节分别为 36.1、37.0 dB（低 4.5–5.4 dB），紧接着的铺垫小节回升到 39.3、39.8 dB，drop 时回到 ≈41.6–41.9 dB | 只描述这首歌，不概括“作曲人都故意拖” |
| 冠状切面示意图 | 尾状核头位于侧脑室前角外侧，内囊分隔其与外侧的壳核，伏隔核在两者腹侧相连处 | 示意图，非比例；不是任何观众的大脑 |
| 体验段 | 本片的等与落是演示 | 不是实验、不是测量观众 |
