# 魔方：20步与2.51秒 · Codex制作版

本轮用户授权Codex接手视频制作。成片为 **2分58.27秒，1080×1920，30fps**，有中文旁白、中文字幕、原创程序配乐和动作音效。

- 成片：`out/rubiks-codex.mp4`
- 字幕：`out/字幕.srt`
- 分镜与实际时间：`STORYBOARD.md`
- 事实和原始来源：`FACTS.md`
- 制作与复核记录：`PRODUCTION_LOG.md`
- 状态与字幕核验：`out/verification.json`
- 编码、响度、音画比对：`out/media-verification.json`

## 本次学习落实在哪里

以“步数与秒数是两种不同的快”为主线。角棱拆解带出排列、朝向与约束；状态点云用合并与筛除解释约化；五把成绩实际去掉最快和最慢。三种方法使用同一打乱、各自真实的解法，按旁白推进阶段。

结尾回到开场同一只魔方，完成逆向还原、放下和镜头拉远。落点音效与最后和弦对齐，随后保留停留与衰减，没有在最后一句上直接切断。

## 制作来源

脚本依据原有Opus定稿v2；三维整数状态模型与教学解序列复用冻结0550网站的材料，保留原始参考与哈希。新Canvas画面、编排、声音、渲染与本轮检查由Codex完成，不冒称原脚本和模型也是本轮新写的。

使用Skia Canvas逐帧绘制，不需要浏览器截屏或GPU。中文语音为Edge TTS `zh-CN-YunxiNeural`，原生语速+6%，保留原始文件与字级时间；没有后期变速。配乐和转动声由本项目代码合成，未调用付费图片或视频生成服务。

字体为Noto Sans SC及Noto Sans Mono，附OFL许可。状态运算依赖cubing.js 0.66.1；其许可材料在`assets/reference/`。代码渲染依赖@napi-rs/canvas 1.0.13。

## 重现

Node 24及FFmpeg；Python 3.12环境依赖见`requirements.txt`。

```sh
npm ci --ignore-scripts --no-audit --no-fund
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python tools/narrate.py
node tools/verify.mjs
node tools/render.mjs
.venv/bin/python tools/score.py
.venv/bin/python tools/finish.py
```

已保留配音缓存，正常重现会复用字节和哈希一致的文件。`src/timeline.json`是画面、字幕、音效共用的时间源，每帧由时间决定。

## 验证边界

已检查关键帧，并从编码成片提取连续帧条检查转动、拆解、去极值、转场与片尾；完整解码和音轨测量另有JSON记录。手机尺寸图片位于`out/review/encoded-*-mobile.png`。

模型工具不支持音频输入，**未进行主观听审和实体手机复审**。技术检查没有被当作用户的审美验收。成绩明确使用2026-10-21截点，程序动画不是世界纪录的实拧复盘。

本片未发布到任何平台，未改动原片、线上网站或独立魔方训练试作。
