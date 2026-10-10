# 素材与许可 · Credits

| 内容 | 来源 | 说明 |
|---|---|---|
| 音乐 | 《明天会更好》（1985）片段，取自用户提供的抖音录屏 `ScreenRecording_10-10-2026 21-52-17_1.MP4`（录屏 0.698–19.898 秒） | 版权归权利人所有。录屏里用的是哪个录音版本没有核实。`public/music.wav` 不入库（见 `.gitignore`），用 `npm run music` 从录屏重新生成 |
| 风格参考 | 用户提供的抖音录屏 `ScreenRecording_10-10-2026 21-47-16_1.MP4`：@知洲z「Claude MV｜日不落：我的ai未眠」 | 只借手法（纸张与航空信封、像素小 AI、光标、印章、跟意思走的逐字动画），不复用它的歌词、句子和场景 |
| 吉祥物 | 照 Claude Code 标志里的像素小生物（Anthropic）重画 | 与参考片同属“Claude MV”同人创作 |
| 字体 | Noto Serif SC、Noto Sans SC（SIL OFL 1.1）；JetBrains Mono（SIL OFL 1.1） | 许可证全文在 `public/fonts/` |
| 世界地图 | Natural Earth 1:110m 陆地（公有领域），`scripts/map.mjs` 栅格化成 `src/art/land.ts` | |
| 渲染 | Remotion 4.0.534 | Remotion 不是 MIT 许可：个人和 3 人以内的公司免费，更大的公司需要公司许可 |
| 节拍与咬字分析（只在制作时本地使用，不随项目分发） | Demucs htdemucs 分离人声；torchaudio 的 MMS_FA 模型对拼音做强制对齐 | 结果写进 `src/timeline.ts` 和 `storyboard.md` 附录 |
