# 一跃 · One Leap

**English** · [简体中文](README.zh-CN.md)

A 36-second portrait film for Douyin. A ginger kitten pounces at a glowing blue butterfly, and the pounce carries it through six impossible worlds, each built from something in its own room: sunset clouds (its blanket), a koi through a lantern sky (the fishbowl and string lights), a milk wave on a cookie surfboard (the saucer), a snow globe, a galaxy of yarn planets and a leap across the moon (the paper lamp), where it catches the butterfly. It wakes in its basket, the real butterfly lands on its nose, it sneezes, and the film loops. There is no narration and no on-screen text.

The user's request on 16 October 2026 was a cute-cat film whose pictures would make people ask how it was made, with dynamic music, no copying and no junk, and a budget of at most ¥100. See [brief.md](brief.md) and [storyboard.md](storyboard.md).

- **Pictures:** a GPT Image 2.5 character sheet of the kitten (`refs/kitten-sheet.png`), then one key frame per shot edited from that sheet, so every shot has the same face and markings. Ten Seedance 2.5 image-to-video clips at 720p (44 s in all) start from those key frames. Every clip was used on its first take.
- **Edit:** Remotion. `scripts/prep.py` cuts twelve segments out of the clips, retimes them to whole beats and upscales them to 1080×1920. `src/Film.tsx` cuts on every downbeat, and each world has its own transition: a zoom punch into the first drop, a whip pan into the koi, a white splash into the milk, a dissolve into the snow globe, a spin into space, an iris onto the moon, and the moon shrinking into the paper lamp as the kitten wakes.
- **Music:** an original score synthesised in Python (`scripts/score.py`), with no samples, loops or AI music. F major, 120 BPM, IV–V–iii–vi. It has a music-box intro, a build into the leap, a drop that changes colour with each world, a breakdown in space using the kitten's own meow, a choir on the moon, a tape stop for the fall, and an outro that pauses for the sneeze and leads back into bar 1.
- **Sound effects:** Seedance's own paws, meows, splashes and sneeze. Some clips came back with little piano tunes despite "无bgm" in the prompt, so five of them (A1, B, F, G, H2; `audio: "clean"` in `src/timeline.json`) use only Demucs's vocals and drums stems (`scripts/sfx.py`). The score ducks under the kitten's sounds (`scripts/mix.py`).

| File | |
|---|---|
| `out/one-leap-10.mp4` | The film, loud Douyin master: 36.0 s, 1080×1920, 24 fps, H.264, AAC 48 kHz, −10.3 LUFS, true peak −2.1 dBTP |
| `out/one-leap-14.mp4` | The same picture at −14.1 LUFS, true peak −3.0 dBTP |
| `out/cover.jpg` · `cover-3x4.jpg` · `cover-4x3.jpg` | Covers: frame 0, the butterfly reflected in the kitten's eyes |
| `out/one-leap.sheet.jpg` | One frame per second of the encoded film |
| `out/verification.json` | What was measured and checked, and what wasn't |
| [production-log.md](production-log.md) | Shots, takes, costs and decisions (Chinese) |

## Rebuild

Generation needs the user's Ark key in `/root/.config/ark.env` and the GPT Image key in `/root/.config/laozhang.env` (never in the repository). The Seedance clips, Demucs stems, synthesised stems, prepared segments and mixes are not committed; the commands below regenerate them. Assembly needs Node 18+, ffmpeg, and Python 3 with numpy, scipy, soundfile and pedalboard (a scratch venv), plus Demucs for the cleaned clips. `node_modules` was shared with `../optogenetics-film-v3/`, and the versions are pinned exactly in `package.json`.

```sh
bash scripts/keys.sh key-a1                     # one GPT Image key frame from the kitten sheet (retries upstream errors)
python3 scripts/ark.py video A1 --prompt-file prompts/clip-a1.txt --first-frame refs/key-a1.jpg --duration 4   # one 720p clip
python3 scripts/prep.py                         # clips → public/seg/*.mp4, 1080×1920, cut on the beat grid in src/timeline.json
python3 scripts/score.py                        # → audio/score.wav and audio/stems/
python3 scripts/sfx.py                          # → audio/sfx-track.wav
python3 scripts/mix.py                          # → public/mix-10.wav (−10 LUFS) and public/mix-14.wav (−14 LUFS)
npm run render                                  # → out/film-silent.mp4
ffmpeg -i out/film-silent.mp4 -i public/mix-10.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest out/one-leap-10.mp4
```

`src/timeline.json` is the single source of timing: segment in-points, speeds and gains, and the cues (leap, drop, catch, fall, wake, sneeze) that the score reads.

## Credits

- Idea, budget and brief: the user. Story, storyboard, prompts, edit, score, mix and documents: Claude Code (Opus 5.5), 16 October 2026; packaged 25 October 2026.
- Footage and sound effects: Seedance 2.5 (Volcengine Ark), on the user's account. Key frames: GPT Image 2.5 via api.laozhang.ai, on the user's account.
- Stem separation: [Demucs](https://github.com/facebookresearch/demucs) (htdemucs, MIT).
- Software: [Remotion](https://www.remotion.dev/) ([Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md): free for individuals, companies of up to three people and non-profits; larger companies need a company licence), React, ffmpeg.
- The kitten, the room and the worlds are generated. No people, logos or third-party music appear.
