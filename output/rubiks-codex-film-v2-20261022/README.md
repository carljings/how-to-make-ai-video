# 魔方第二版：2.51秒，却没拿冠军

用户提出“动效不够惊艳、讲解不够精彩、BGM没有”后，Codex 独立重写旁白、镜头与原创配乐。完整成片 177.6 秒，1080×1920，30fps，中文旁白与字幕。

- 成片：`out/rubiks-codex-v2.mp4`
- 新旁白：`src/segments.json`；实际声音时间轴：`src/timeline.json`
- 分镜：`STORYBOARD.md`；本轮目标：`REVISION-BRIEF.md`
- 主画面：`src/film.js`；立体投影：`src/drawing.js`
- 原创音乐与混音：`tools/score.py`；独立音乐轨：`audio/music-stem.wav`
- 最终检查：`out/media-verification.json`、`out/music-verification.json`、`out/verification.json`、`out/visual-review.json`

故事从“2.51秒破纪录，为何决赛第六”开始，经过起源、角棱与合法组合、20步证明、三种人的解法，最终用五把平均回答开头。镜头加入贴纸近景拉远、角棱轨道拆解、状态空间拉远、分组卡堆压缩、真实超级翻转20步计数、阶段目标停留，以及复赛单次成绩卡翻成决赛平均成绩卡的转折。

三种方法都来自同一个打乱、三套不同的真实解法。影片明确采用阶段节选，每段展示到达目标前最多六个实际动作，完整序列仍在源码内。F2L 对准最后的白红蓝角和蓝红棱，转到左后槽机位，突出这两个对象而非已经归位的另一组。

音乐包含 FM 电钢琴、拨奏、铜琴、带泛音的贝斯和鼓组。探索、证明、方法、观察、比赛有不同安排；揭示名次时短暂抽薄，结尾主题转为大调，旁白结束后再落终止和弦。对白期间按段落平衡音乐，短空隙回升。没有使用商业歌曲、付费生成或新外部账户。

混音检查会从最终 AAC 音轨反解音乐贡献，检查七个内容段落；同时比较旧版与新版各段抽样窗口中的配乐相对人声电平。200–4000 Hz 的分析只代表一段频带，不是实体手机听审，也不能证明音乐在主观上已经好听。没有完成真人听审与实体手机观看。画面检查范围见 `out/visual-review.json`，不把抽帧称作完整连续看片。

成绩保持已经核对的 2026-10-21 数据截点，不声称之后日期的实时纪录。数学和赛果来源见 `FACTS.md`。复用原项目已验算的几何、求解核心与 Opus 示例，出处和许可保存在 `assets/reference/`；本轮创意改编、镜头、代码合成、音乐与检查由 Codex 完成。

## 重现

Node 24；Python 3.12；FFmpeg 8.1。依赖已锁定。已有18段配音及元数据；只有改动文本才需要重新请求 Edge TTS。

```sh
npm ci --ignore-scripts --no-audit --no-fund
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python tools/narrate.py
node tools/render.mjs --sheet
node tools/verify.mjs
node tools/render.mjs
.venv/bin/python tools/score.py
.venv/bin/python tools/finish.py
.venv/bin/python tools/check_music.py
```

请在 Node 24 环境执行。字体与旁白文件均已保留；无需为重现现有画面重新下载字体。`tools/fonts.py` 只在新增字形时使用。音乐比较工具会读取旁边保留的第一版；该比较不是重现成片的依赖。

第一版完整保存在相邻的 `rubiks-codex-film-20261022/`，本轮没有覆盖。未发布、未推 Git、未修改网站和账户设置。
