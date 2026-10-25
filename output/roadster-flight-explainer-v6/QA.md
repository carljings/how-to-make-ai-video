# v6 QA / 实际检查记录

- ActualMP4: `out/delivery-v6/roadster-v6-text-only.mp4`；113220521 bytes；SHA256 `06a9b0330ba5ab5c55f1ba884bfcb77ecbc598f508e0e8a81c8018c5c3209088`。
- 1080×1920，30fps，1623帧，视频与音频均54.1秒。
- 完整解码退出0；最终编码−14.1LUFS/−2.1dBTP。原生Metal渲染683.3秒，8subframes/48volume steps。
- 声音输入：`score.mjs`只用代码合成配乐与音效；`mix.mjs`只读该程序配乐，未读取配音、TTS或旧版混音，无语音压低音乐逻辑。母带48kHz/24bit/stereo，2596800samples，SHA256 `13ed6da6831eb25735bc121f9ce5cb2d6fa19175f6f8429c936d07bb08d8d9ae`。
- 字体：35条屏幕文字、121个去空格字符，四个字重均覆盖且实际加载成功。
- 阅读与布局：15组解释卡通过本片R(n)=max(1.2s,0.4s+0.2s×汉字数)检查；布局与卡片碰撞检查通过。该规则是本片设计启发式，不是观众理解率实测。
- 画面：已查看40张首轮原生画面、8张取景修正画面，以及46张实际编码后画面，覆盖各段解释。开场车身完整；有限顶部直段保留；重力/压力方向、失压/喷气/翻转分段可见；翻转细线及作用未知说明保留。
- 冻结：渲染前后web与driver哈希不变，见`out/full-render-01/source-lock.json`；与导演`PICTURE_LOCK.json`逐项对应。
- 保留：v1–v5未改，v5原成片SHA实测不变；没有执行Git推送或发布。

## Review limits / 边界

没有人工试听或真实手机连续观看。手机尺寸检查是360px宽的编码后画面；技术检查和作者画面判断不等于用户审美认可，也不保证播放量。C05轻压文字为有意缓慢漂入；压力差位于金色力束根部，属于保留的视觉设计。片尾来源小字时间较短，开头与分隔处也呈现来源。

No spoken narration is present in the authored signal path. Complete decoding, native rendering, actual encoded-frame review, font/layout/reading checks and objective loudness metering passed. Subjective music/SFX audition, physical-phone continuous playback and human aesthetic acceptance remain unverified.
