# Roadster v5 verification / 实际交付检查

2026-10-18。交付文件：`out/delivery-v5/roadster-v5-air-revealed.mp4`。

| Check / 检查 | Evidence / 实际结果 |
|---|---|
| Picture | 1080×1920,30fps,1692帧,56.400秒,H.264 High/BT.709 |
| Sound | AAC256k,48kHz立体声,56.400秒；最终编码−14.1LUFS/−1.8dBTP |
| Complete decoding | ffmpeg完整解码退出0；日志`out/delivery-v5/decode-loudness.log` |
| Voice completeness | 17句全部进入混音,无截断；按真实片段与WordBoundary布置 |
| Encoded picture | 实际查看44张编码后画面,包括首屏、转场、每段解释、细线说明、最紧取景和片尾；contact-1至5 |
| Fonts | 四个随包字重覆盖所需字形；见`font-qa.json`和字体资源覆盖报告 |
| Reproducibility | 全片源文件冻结,渲染前后与文档同步后哈希不变；1692帧渲染786.1秒 |
| Preservation | v1–v4路径保留；v4原成片SHA实测未变 |

Video SHA256: `85bc9a36c152a657bf275d75542d181aa399ed33fad14705876ac033bc3df913`；118549445 bytes。

Master SHA256: `8f4d2dbb7a0e2e8e84a94a1488e095b13227f5fa8a7f8f117baf00a126cd83d0`。

## Visual judgement / 画面判断

开场先给倒悬车和落尘,再提出问题。金色外界压力与冰蓝车载气共享同一套镜头与声音节奏,使特效承担解释。有限顶部直段保留；离坡失压与喷气反作用分段可辨；翻转为另一场演示,保留原片细线并说明作用未公开。修正了离坡车头出框、扭矩标注裁切、细线说明扫出屏幕和压力标注压字幕。抽检广角未见地面闪三角。

这是本次实际画面抽检结论,不是用户审美认可或百万播放保证。最紧镜头f1536为有意近景,边缘较紧；Ping的强闪光为短暂转场。

## Sound review scope / 声音检查边界

完整混音的时间保持16k单声道派生输入已交给离线Whisper small,没有给模型预置期望旁白。17句均被识别,有6组字词差异,包含同音字和近音误识别；因此不宣称逐字自动识别100%一致。原始ASR输出与母带哈希绑定在`.omx/artifacts/roadster-v5-20261018/audio-qa/`。ASR只能辅助检查缺句、漏音和可辨识程度,不能替代人工听感判断。

未进行人工试听或真实手机连续观看；本次手机尺寸检查为360px宽的编码后画面。实际音画节奏和用户审美仍应以成片播放为准。

## English

Full local native Metal capture and H.264/AAC encode completed. All1692frames decode; final audio measures−14.1LUFS/−1.8dBTP. Codex viewed44actual encoded frames, including every act and the previously failing crop/label cases. Source locks match; the original v4 MP4 is unchanged. Cached offline ASR covers17lines with homophone/near-phonetic differences. This does not establish subjective listening, physical-phone playback or human aesthetic acceptance. No publication or Git push was performed for this v5 revision.
