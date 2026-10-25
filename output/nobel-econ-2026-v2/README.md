# 多给你1000块，你会花吗？ · V2: Seedance 2.5 + Remotion

**English** · [简体中文](README.zh-CN.md)

The remake of the 2026 economics Nobel explainer (Robert E. Hall, Michael Woodford). The user found V1 (`../nobel-econ-2026/`, flat code-drawn animation with no voice) "not very good" and asked for Seedance 2.5 footage, assembled in Remotion, with Chinese dubbing and no on-screen host.

**Outcome:** the user found V2 "not exciting, nor very attractive … many people will scroll away", a lecture with no stakes. [V3](../nobel-econ-2026-v3/README.md) retells the idea as a fable.

- **Picture:** four 15-second Seedance 2.5 clips in a clay-miniature style, generated as 480p drafts, checked, then upscaled from the draft task IDs to 1080p. The opening frame is a GPT Image 2.5 key frame (coins bursting out of a phone while a clay office worker topples back), used as Seedance's first frame so the hook is on frame 0. Later clips use GPT Image key frames as composition references.
- **Voice:** Seedance's own Mandarin narration, generated with the picture. Clips 2–4 were given clip 1's narration (separated with Demucs) as a voice reference; pitch matches across the clips. Every line was transcribed with faster-whisper and checked against the script. Clip 3 was regenerated once because the narrator dropped a syllable of 伍德福德. One blurred syllable at the end of clip 1 was replaced with the same narrator's clear syllable from clip 3 (`scripts/patch_name.py`).
- **Remotion:** the big question on frame 0, headlines, the laureates' name cards (silhouettes), 80% / 20% with the source, the ¥10 → ¥12 price tags, the closing A/B poll, subtitles aligned to the narration, a progress bar, a synthesized music bed ducked under the voice, mastered to −10 LUFS.

| Artifact | |
|---|---|
| `out/nobel-econ-2026-v2.mp4` | The film: 60.2 s, 1080×1920, 24 fps, H.264, AAC 48 kHz, −10.2 LUFS, true peak −2.3 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | Douyin covers, the same picture as frame 0 |
| `out/nobel-econ-2026-v2.sheet.jpg` | One frame per second of the encoded film |
| `out/verification.json` | `npm run verify`: 17 checks |
| [storyboard.md](storyboard.md) · [production-log.md](production-log.md) · [publish-copy.md](publish-copy.md) | Plan, shot log with costs, and the Douyin publishing sheet (Chinese) |

## Rebuild

The Seedance clips (`clips/`, `public/clips/`), separated stems (`audio/`) and the mixed soundtrack (`public/mix.wav`) are not in the repository; the commands below regenerate them.

Generation needs the user's Ark key in `/root/.config/ark.env` and the GPT Image key in `/root/.config/laozhang.env` (never in the repo). Assembly needs Node 18+, ffmpeg and Python 3; the name patch and transcription used a scratch venv with numpy, Demucs and faster-whisper.

```sh
python3 scripts/ark.py video seg1 --prompt-file prompts/seg1.txt --first-frame refs/first-hook.png --duration 15 --draft   # 480p draft
python3 scripts/ark.py final seg1                     # 1080p from the draft's task ID
node scripts/prep.mjs                                  # clips → public/clips (H.264 24 fps), lengths → src/clips.json
python3 scripts/captions.py                            # subtitle timings from the transcriptions → src/captions.json
npm run fonts && npm run score                         # font subset; music bed + Seedance audio → public/mix.wav (−10 LUFS)
npm run render && npm run cover && npm run verify
```
