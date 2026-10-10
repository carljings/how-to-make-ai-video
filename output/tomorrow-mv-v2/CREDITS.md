# 素材与许可 · Credits

| 内容 | 来源 | 说明 |
|---|---|---|
| 音乐 | 《明天会更好》（1985）高压电工 Remix，取自用户提供的抖音录屏 `ScreenRecording_10-11-2026 01-14-58_1.MOV`（“祝福祖国 · 明天会更好 · 高压电工Remix”，录屏 0.479 秒起两段主歌） | 版权归权利人所有。与 V1 片段是同一版本（互相关 r = 0.95）。`public/music-*.wav` 不入库（见 `.gitignore`），用 `npm run music` 从录屏重新生成 |
| 风格参考 | @知洲z「Claude MV｜日不落：我的ai未眠」（用户提供的录屏） | 只借手法：纸张与航空信封、像素小 AI、光标、印章、跟意思走的逐字动画 |
| “更震撼更可爱”的参考 | 用户提供的三段抖音录屏（猫咪骑士、LibTV 史诗特效、小猫骑士） | 只借方向：可爱角色 + 大场面的冲击感；本片仍是代码绘制，没有生成画面 |
| 吉祥物 | 照 Claude Code 标志里的像素小生物（Anthropic）重画 | “Claude MV”同人创作 |
| 小猫、候鸟、音符、火焰、雪花、烟花 | 本项目代码绘制（`src/art/cast.tsx`） | |
| 字体 | Noto Serif SC、Noto Sans SC（SIL OFL 1.1）；JetBrains Mono（SIL OFL 1.1） | 许可证全文在 `public/fonts/` |
| 世界地图 | Natural Earth 1:110m 陆地（公有领域），`scripts/map.mjs` 栅格化成 `src/art/land.ts` | |
| 渲染 | Remotion 4.0.534 | 个人和 3 人以内的公司免费，更大的公司需要公司许可 |
| 节拍、和弦与咬字分析（只在制作时本地使用，不随项目分发） | Demucs htdemucs 分离人声与伴奏；torchaudio MMS_FA 按小节强制对齐；伴奏色度比对 | 结果写进 `src/timeline.ts` 和 `storyboard.md` 附录 |
