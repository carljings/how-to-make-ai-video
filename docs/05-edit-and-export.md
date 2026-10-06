# 5 · Edit and export

For most AI films the edit is simple: hard cuts in storyboard order, subtitles, a title, sound mastered. That fits in a script, which means an assistant can do it and you can re-run it after every change. Open a timeline editor (CapCut/剪映, DaVinci Resolve, Premiere) when you need hand-timed cuts to music, or effects across many shots.

## The scripts

| Script | Does |
|---|---|
| [`tools/stitch.sh`](../tools/stitch.sh) | Joins clips listed in a text file: trims, fits each to one size and frame rate (letterboxing if needed), adds silence to clips without sound, burns in subtitles, lays an optional music bed, masters to −14 LUFS |
| [`tools/review.sh`](../tools/review.sh) | A time-stamped contact sheet per clip, for checking shots at a glance |

```sh
# shots.txt: one clip per line: <path> [start] [end]
tools/review.sh clips/*.mp4                                       # look at every clip first
tools/stitch.sh shots.txt episode01.mp4 --size 1080x1920 --fps 30 --srt episode01.srt
```

## ffmpeg recipes

Each of these was run while writing this page.

```sh
# Trim (re-encode for frame-exact cuts)
ffmpeg -ss 1.5 -to 9.2 -i in.mp4 -c:v libx264 -crf 18 -c:a aac out.mp4

# Last frame of a clip, to start the next generation from it
ffmpeg -sseof -0.1 -i clip.mp4 -frames:v 1 -update 1 last.png

# Crossfade two clips (0.5 s, starting 4.5 s into the first clip; same size and fps)
ffmpeg -i a.mp4 -i b.mp4 -filter_complex \
  "[0:v][1:v]xfade=transition=fade:duration=0.5:offset=4.5[v];[0:a][1:a]acrossfade=d=0.5[a]" \
  -map "[v]" -map "[a]" out.mp4

# 16:9 → 9:16 by centre crop (loses the sides)
ffmpeg -i wide.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a copy vertical.mp4

# 16:9 → 9:16 on a blurred copy of itself (keeps everything)
ffmpeg -i wide.mp4 -filter_complex \
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" \
  -c:a copy vertical.mp4

# Replace the sound
ffmpeg -i picture.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out.mp4

# Soft subtitles (switchable) instead of burned-in
ffmpeg -i film.mp4 -i film.srt -map 0 -map 1 -c copy -c:s mov_text -metadata:s:s:0 language=chi out.mp4

# A poster frame and a preview GIF
ffmpeg -ss 12.5 -i film.mp4 -frames:v 1 -q:v 2 poster.jpg
ffmpeg -ss 2 -t 6 -i film.mp4 -vf "fps=12,scale=560:-2,split[a][b];[a]palettegen[p];[b][p]paletteuse" preview.gif

# Speed a shot up 1.25× (picture and sound)
ffmpeg -i in.mp4 -filter_complex "[0:v]setpts=PTS/1.25[v];[0:a]atempo=1.25[a]" -map "[v]" -map "[a]" out.mp4
```

## Export settings

One master file works almost everywhere:

| Setting | Value |
|---|---|
| Container | MP4 with `-movflags +faststart` (starts playing before it finishes downloading) |
| Video | H.264 High profile, `yuv420p`, CRF 18–20 |
| Audio | AAC 192 kb/s, 48 kHz stereo, −14 LUFS, true peak ≤ −1.5 dBTP |
| Vertical (Douyin, TikTok, Reels, Shorts, 视频号) | 1080 × 1920, 9:16 |
| Horizontal (YouTube, Bilibili) | 1920 × 1080 (or 3840 × 2160), 16:9 |
| Frame rate | Keep the source's: 24/25/30 for generated clips, 30 or 60 for motion graphics |

Dark gradients band after compression. Add a touch of grain before encoding (`-vf noise=c0s=4:c0f=t+u`), which `starter/render.mjs` does by default.

## Before you upload

- [ ] Watched once, start to finish, **with sound**
- [ ] Contact sheet checked for garbled text, faces drifting, black frames
- [ ] Loudness −14 LUFS (`ebur128` above)
- [ ] Subtitles timed and spelled right; nothing important in the bottom 15 % of a vertical frame
- [ ] Title, description and poster frame ready
- [ ] The platform's **AI-generated content** label switched on
- [ ] Music and model licences allow this use
