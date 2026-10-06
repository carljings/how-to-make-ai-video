# 4 · Sound

**English** · [简体中文](zh-CN/04-sound.md)

Viewers forgive a soft picture long before they forgive bad sound. Every film needs three layers, and a target loudness.

| Layer | Path A (generated) | Path B (code) |
|---|---|---|
| **Voice** | The model's native audio, or a separate text-to-speech / recorded voice | Text-to-speech or a recorded voice, placed by the timeline |
| **Music** | A generated track, a licensed track, or none (many short dramas use none) | Synthesized from the timeline (`score.js`), so it follows the picture exactly |
| **Effects** | Native audio, or added in the edit | Synthesized at the same cues as the picture |

Whatever you use, check its licence for the way you'll publish.

## Loudness: one number to hit

Master the finished film to **−14 LUFS integrated, true peak ≤ −1.5 dBTP**. It's a common streaming target: loud enough on phones, and platforms that normalize won't need to turn it down much. Both scripts here do it for you (`starter/render.mjs --encode`, `tools/stitch.sh`).

Measure any file:

```sh
ffmpeg -hide_banner -i film.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A8 Summary
```

## Voice over music

Keep music about **15–20 dB under the voice**. The simplest way is a fixed level: `stitch.sh --music bed.mp3 --music-db -18`. To duck the music automatically whenever someone speaks:

```sh
ffmpeg -i voice.wav -i music.wav -filter_complex \
  "[1:a][0:a]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[m];[0:a][m]amix=inputs=2:normalize=0" \
  mixed.wav
```

## Check for clicks without listening

A spectrogram shows a click as a thin vertical line through every frequency:

```sh
ffmpeg -i mix.wav -lavfi showspectrumpic=s=1600x360:legend=0:scale=log spectrum.png
```

Check the **WAV**, not the final MP4. The AAC encoder can draw faint vertical lines of its own in quiet passages that aren't audible clicks. Bell and drum onsets are supposed to look like lines; anything else is a bug. In Web Audio the usual cause is a gain node left at its default of 1 before its envelope (see [Chapter 3](03-path-b-code.md#sound-in-code)).

## Subtitles

Burned-in subtitles are on every copy. Soft subtitles (a `.srt` uploaded next to the video) can be switched off and translated by the platform. For short-form vertical video, burn them in; for YouTube and Bilibili, upload the `.srt` as well. Leave room: keep subtitles out of the bottom ~15 % of a 9:16 frame, where platform buttons and captions sit.
