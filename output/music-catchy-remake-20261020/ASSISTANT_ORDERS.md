# ASSISTANT_ORDERS — v2.1（只改画面；音轨不变，复用同一 master）

v2 成片（`3e277901…1b0d`）和 v2 冻结清单（`aace1a2c…9820`）保留，不覆盖。

## 改了什么（审看 M4 实际编码帧之后）
1. **去掉片尾内部角标**“音乐：用户提供的录屏音轨”，换成小号“小川科普”。素材来源与授权未核的事实只写在 `SOURCES.md` 和交付说明里，不进画面。
2. **drop 2 的脸被冲淡（f603–612）**：
   - 原因：青色冲击环从角色脚下的小半径开始；巨石顶面的清漆高光被泛光放大。
   - 修正：冲击环从巨石外沿开始（不透明度 0.9 → 0.75）；巨石和领奖台改成哑光（粗糙度 0.6，清漆 0.1）。
   - 镜头震动和巨石大小不变。
3. **drop 时看起来“提前落地”（f597–602、f1044–1049）**：
   - 原因：巨石从上方落下，在角色还在空中时就从它脚下穿过，看起来像站在下落的石头上。实际接触时刻本来就在起音上。
   - 修正：三次 drop 的巨石和最后的领奖台改成**从深处升起**，和下落的角色在起音那一刻相遇，前几帧不再出现“站在移动的石头上”。
- 变动文件：`src/film.js`、`src/world.js`、`src/timeline.js`、字体子集（新增“川”字）。**音频相关文件全部未变**（`src/narration.js`、`tools/mix.py`、旁白 WAV），所以 master 不变。

## 冻结
`out/v2.1-source.sha256`：26 个文件，清单 sha256 `f2c412129fe47a9209dcaebd443eb76da01f1337add264988e7d30d5e243900c`。

## M4 执行（只重渲画面，复用 v2 的音轨）
```sh
REF=<path>/reference-audio.m4a
shasum -a 256 -c out/v2.1-source.sha256
node tools/textcheck.mjs                                  # 退出码 0
shasum -a 256 out/audio/master.wav                        # 应仍为 v2 的 f4b0a973…6aab（fc68 母带混出）；不是就先按 v2 命令重跑 mix.py 并报告
node tools/render.mjs --video --workers 1 --gl metal --out out/picture-v2.1.mp4
node tools/verify.mjs --mux --ref "$REF" --pic out/picture-v2.1.mp4 --film out/shangtou-v2.1.mp4   # 退出码 0 = 13 项全过
```

## 回传（取自 `out/shangtou-v2.1.mp4`）
- 成片字节数、sha256、`verification.json`，以及确认 master sha 未变。
- 和 v2 一样的总表：全片每秒一张、每 6 帧一张。
- 逐帧：f590–f625、f1040–f1070、f1172–f1192。
- 全尺寸：f0、f600、f604、f610、f1049、f1052、f1180、f1240。
- f604–f612 角色脸部框内 Y′>250 占比。
- 片尾确认：画面里已没有“音乐：用户提供的录屏音轨”。

---
# （以下为 v2 执行单，已执行，存档）
# ASSISTANT_ORDERS — v2《这首开智小曲，为啥这么上头？》（Opus 5.5 主创；Codex 渲染与核验）

## 冻结
- `out/v2-source.sha256`：26 个文件，清单 sha256 `aace1a2c0f6c8b88ae18a0f8751637cd8b91c39f672a91d402858d9cbb369820`。包括全部源码、工具、字体子集、音乐**特征 / 计划 / 分析**（`assets/music/*.json`、`v1-music.js`）、`narration-request.json`、许可证。
- **不在清单里，单独按哈希核对的输入**：
  1. **音乐母带**：接受两份已记录的 v1 母带之一——服务器 `cdb63c5060e77f5090550f269a87f882020f980327a296a9558c9f17361bad43`，M4 `fc68d53f2519c5bb32abc9f57f127505beb086817dc1a1305faefdfd5e9d4c6b`。两者来源同一 AAC，编辑计划相同，ffmpeg 版本不同，PCM 字节不同；`tools/mix.py` 只接受这两份，并在 `mix.json` 写明用的是哪份。画面时间来自冻结的 `src/music.js`，不依赖 WAV 字节。用 M4 的 `fc68…` 即可，**不需要从服务器下载大 WAV**。
  2. **旁白 WAV**：11 个 `Lxx-usable.wav`，在任务目录 `narration/`。每个的 sha256 写在冻结的 `src/narration.js` 里，`mix.py` 逐个核对，不符就退出。
- 请先 `shasum -a 256 -c out/v2-source.sha256` 全部 OK。**不要运行** `tools/place_narration.mjs` 或 `tools/fonts.mjs`（它们会重写冻结文件）；不改任何源码或参数。发现问题报告给我。

## M4 执行（照抄）
```sh
REF=<path>/reference-audio.m4a                     # sha256 6987131e…5f7c918
MUS=<path>/music-anticipation-original-20261020/out/audio/master.wav   # fc68d53f…4c6b（或服务器 cdb63c50…ad43）
NARR=<path>/.omx/artifacts/music-catchy-remake-20261020/narration
shasum -a 256 -c out/v2-source.sha256
node tools/textcheck.mjs                           # 退出码 0（7 行 ok）
python3 tools/mix.py --narr "$NARR" --music "$MUS" # 退出码 0 = 4 项检查全过 → out/audio/{voice_stem,music_stem,master}.wav + mix.json
node tools/render.mjs --video --workers 1 --gl metal --out out/picture.mp4
node tools/verify.mjs --mux --ref "$REF" --pic out/picture.mp4 --film out/shangtou-v2.mp4   # 退出码 0 = 13 项全过
```
- 服务器参考值（用 `cdb63c50…` 母带）：master −14.3 LUFS / −1.5 dBTP，静态修整 −1.1 dB；每句人声比其下的音乐高 4.1–6.2 LU；三段 music-only 窗口约 −12.5 LUFS，与 master 的音乐逐样本一致。M4 的母带不同，数值会有小差异：照实报告，不要调参数。
- 已知会出现在帧里的东西：前奏阶段画面偏暗（曝光 0.62 → 0.95），这是设计的；drop 帧有冲击环和镜头震，这也是设计的。

## 回传（全部取自编码后的 `out/shangtou-v2.mp4`）
1. 成片字节数、sha256、渲染耗时；`out/verification.json`、`out/audio/mix.json` 全文与各退出码；三个 wav 的 sha256，以及实际使用的音乐母带 sha256。
2. 全片联络表：每 6 帧一张（f0…f1290，可分 4–5 张，每张标帧号）。
3. 全尺寸单帧（q≤2）：f0, f60, f92, f160, f240, f300, f390, f480, f560, f604, f660, f720, f790, f900, f960, f1000, f1052, f1100, f1160, f1180, f1240, f1290。
4. 逐帧（不跳）：f85–f110（drop 1）、f595–f625（drop 2）、f1043–f1070（drop 3）、f1172–f1192（最后一击）。
5. 亮度：第 3 项每帧整帧 Y′ 均值与 Y′>250 占比；对 f92、f604、f1052、f1180 另报角色脸部附近（目测框即可，写明框坐标）的 Y′>250 占比。
6. 音频：成片每 0.5 s 的短时响度（ebur128 metadata）；以及 voice_stem 与 music_stem 各自在每句时间内的响度（mix.json 已有服务器值，请给 M4 实测）。
7. 渲染日志里的 `[page]` / `[console]` 报错和解码警告。

## 不能代替真人的部分
听感（人声和音乐的平衡、衔接、自然度）、连续观看的节奏、手机上的可读性、“够不够好看、上不上头”——请交给用户本人判断，原话转给我。
