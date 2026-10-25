# 一句话，让整个小镇破产了 · V3: a clay-town fable for the 2026 economics Nobel

**English** · [简体中文](README.zh-CN.md)

The third version of the 2026 economics Nobel film (Robert E. Hall, Michael Woodford). The user felt V2 (a clay-miniature explainer, [`../nobel-econ-2026-v2/`](../nobel-econ-2026-v2/README.md)) was "not exciting, nor very attractive … many people will scroll away". It was a lecture with no stakes. V3 tells a fable instead. It opens on the result: a rumor bankrupts a whole town. Then it goes back three days and shows the rumor spreading and the dominoes falling until "谣言，自己变成了真的" (the rumor came true by itself). At that moment the Nobel medal crashes into the square, the laureates' idea explains what happened, and the central bank's believable sentence brings the lights back. The film ends on the same noodle chef it opened on, now smiling under his lamp.

- **Picture and sound:** three Seedance 2.5 clips (15 s, 15 s, 22 s) with Seedance's own Mandarin narration, music and sound effects, generated together with the picture. Each clip was a 480p draft first, checked with a contact sheet and a faster-whisper transcription, then upscaled to 1080p from the draft's task ID. Clip A starts from a GPT Image 2.5 key frame: the chef's frightened face as the town goes dark, so the hook is on frame 0. Clips B and C use Seedream 5.0 Pro key frames as composition references and clip A's narration (separated with Demucs) as the voice reference. The narrator's pitch matches across clips, and the bank chief speaks in a different voice.
- **One line replaced:** in clip C the narrator garbled "要不好过了" (two Whisper models heard "药包不好过了"). The picture was kept. The line was generated again as a 5-second clip with the same voice reference, and `scripts/patch_vo.py` swaps it in over clip C's music and effects.
- **Made-up lettering:** two shop signs carry pseudo-text (Latin in clip A, pseudo-Chinese in clip B). `scripts/prep.mjs` blurs the top of the picture in just those shots, like a tilt-shift lens.
- **Remotion:**
  - text: the hook in big type on frame 0, a "三天前" (three days earlier) stamp, the rumor in shivering quotes, three cause-and-effect lines that fall in like dominoes, and the medal reveal;
  - people: the laureates' name cards (silhouettes) and the prize citation, with the text moved below the bank chief's face while he speaks and his line in a speech bubble;
  - framing: a closing A/B poll, subtitles aligned to the narration, a "寓言示意 · 非真实事件" (illustrative fable, not a real event) label and a progress bar;
  - sound: mastered to −10 LUFS.

| Artifact | |
|---|---|
| `out/nobel-econ-2026-v3.mp4` | The film: 52.1 s, 1080×1920, 24 fps, H.264, AAC 48 kHz, −10.4 LUFS, true peak −2.1 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | Douyin covers, the same picture as frame 0 |
| `out/nobel-econ-2026-v3.sheet.jpg` | One frame per second of the encoded film |
| `out/verification.json` | `npm run verify`: 19 checks, all passing |
| [storyboard.md](storyboard.md) · [production-log.md](production-log.md) · [publish-copy.md](publish-copy.md) · [sources.md](sources.md) · [CREDITS.md](CREDITS.md) | Plan, shot log with costs, the Douyin publishing sheet, fact sources and credits (Chinese) |

## Rebuild

Generation needs the user's Ark key in `/root/.config/ark.env` and the GPT Image key in `/root/.config/laozhang.env` (never in the repo). Assembly needs Node 18+, ffmpeg and Python 3. The transcriptions and the voice separation used a scratch venv with numpy, Demucs and faster-whisper.

```sh
python3 scripts/ark.py video clipA --prompt-file prompts/clipA.txt --first-frame refs/first-a.jpg --duration 15 --draft   # 480p draft
python3 scripts/ark.py video clipB --prompt-file prompts/clipB.txt --image refs/first-a.jpg --image refs/key-b.jpg --image refs/key-c.jpg --audio refs/narrator.mp3 --duration 15 --draft
python3 scripts/ark.py final clipB                     # 1080p from the draft's task ID
python -m demucs --two-stems=vocals -n htdemucs -o audio/sep audio/sep/clipC.wav audio/sep/vo-end.wav
python3 scripts/patch_vo.py                            # clip C's soundtrack with the re-recorded last line → audio/clipC.wav
node scripts/prep.mjs                                  # clips → public/clips (H.264 24 fps, sign lettering blurred), lengths → src/clips.json
python3 scripts/captions.py                            # subtitle timings from the transcriptions → src/captions.json
npm run fonts && npm run mix                           # font subset; the three soundtracks → public/mix.wav (−10 LUFS)
npm run render && npm run cover && npm run verify
```
