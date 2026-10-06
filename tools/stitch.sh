#!/usr/bin/env bash
# stitch.sh: join generated clips into one finished video.
#
#   tools/stitch.sh shots.txt out.mp4 [--size 1080x1920] [--fps 30] [--srt subs.srt] [--music bed.mp3] [--music-db -18]
#
# shots.txt has one clip per line: <path> [start-seconds] [end-seconds]. Blank lines and # comments are ignored.
# Paths are relative to shots.txt. Every clip is trimmed, letterboxed to one size and frame rate, and given a
# stereo 48 kHz track (silence if the clip has none). The joined film is loudness-normalized to −14 LUFS.
# --srt burns subtitles in; --music lays a bed under the clips' own sound, at --music-db (default −18 dB).
set -euo pipefail

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }
[ $# -ge 2 ] || usage
LIST=$1 OUT=$2; shift 2
SIZE="" FPS=30 SRT="" MUSIC="" MUSIC_DB=-18
while [ $# -gt 0 ]; do
  case $1 in
    --size) SIZE=$2; shift 2 ;;
    --fps) FPS=$2; shift 2 ;;
    --srt) SRT=$2; shift 2 ;;
    --music) MUSIC=$2; shift 2 ;;
    --music-db) MUSIC_DB=$2; shift 2 ;;
    *) usage ;;
  esac
done
command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
[ -f "$LIST" ] || { echo "no such list: $LIST" >&2; exit 1; }
BASE=$(cd "$(dirname "$LIST")" && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

has_audio() { [ -n "$(ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1")" ]; }

n=0
while read -r path start end _; do
  case "$path" in ''|'#'*) continue ;; esac
  [[ $path = /* ]] || path="$BASE/$path"
  [ -f "$path" ] || { echo "missing clip: $path" >&2; exit 1; }
  # The first clip sets the size unless --size was given
  if [ -z "$SIZE" ]; then SIZE=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$path"); fi
  W=${SIZE%x*} H=${SIZE#*x}
  trim=()
  [ -n "${start:-}" ] && trim+=(-ss "$start")
  [ -n "${end:-}" ] && trim+=(-to "$end")
  n=$((n + 1)); part=$(printf '%s/part%03d.mov' "$TMP" "$n")
  vf="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${FPS},format=yuv420p"
  if has_audio "$path"; then
    ffmpeg -nostdin -hide_banner -loglevel error -y "${trim[@]}" -i "$path" -map 0:v:0 -map 0:a:0 -vf "$vf" \
      -af "aresample=48000,aformat=channel_layouts=stereo" -c:v libx264 -crf 16 -preset fast -c:a pcm_s16le -shortest "$part"
  else
    ffmpeg -nostdin -hide_banner -loglevel error -y "${trim[@]}" -i "$path" -f lavfi -i anullsrc=r=48000:cl=stereo -map 0:v:0 -map 1:a \
      -vf "$vf" -c:v libx264 -crf 16 -preset fast -c:a pcm_s16le -shortest "$part"
  fi
  printf "file '%s'\n" "$part" >> "$TMP/list.txt"
  printf '%3d  %s  %s s\n' "$n" "$(basename "$path")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$part" | cut -c1-5)"
done < "$LIST"
[ "$n" -gt 0 ] || { echo "no clips in $LIST" >&2; exit 1; }

# Join (all parts now share one format, so this is a straight copy)
ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mov"

# Sound: the clips' own audio, plus an optional music bed underneath
if [ -n "$MUSIC" ]; then
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TMP/joined.mov" -stream_loop -1 -i "$MUSIC" \
    -filter_complex "[1:a]aresample=48000,aformat=channel_layouts=stereo,volume=${MUSIC_DB}dB[m];[0:a][m]amix=inputs=2:duration=first:normalize=0" \
    -c:a pcm_s16le "$TMP/mix.wav"
else
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TMP/joined.mov" -vn -c:a pcm_s16le "$TMP/mix.wav"
fi

# Loudness, two passes: measure, then apply one fixed gain to reach −14 LUFS with true peak ≤ −1.5 dBTP
LN="I=-14:TP=-1.5:LRA=11"
json=$(ffmpeg -nostdin -hide_banner -i "$TMP/mix.wav" -af "loudnorm=$LN:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
m() { echo "$json" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }
LN="$LN:measured_I=$(m input_i):measured_TP=$(m input_tp):measured_LRA=$(m input_lra):measured_thresh=$(m input_thresh):offset=$(m target_offset):linear=true"

# Finish: optional burned-in subtitles, then H.264/AAC
vf="null"
if [ -n "$SRT" ]; then cp "$SRT" "$TMP/subs.srt"; vf="subtitles=$TMP/subs.srt:force_style='FontSize=18,Outline=1,Shadow=0,MarginV=40'"; fi
ffmpeg -nostdin -hide_banner -loglevel error -y -i "$TMP/joined.mov" -i "$TMP/mix.wav" -map 0:v -map 1:a -vf "$vf" \
  -af "loudnorm=$LN,aresample=48000" -c:v libx264 -crf 19 -preset slow -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "wrote $OUT  ($n clips, $SIZE @ ${FPS} fps, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | cut -c1-6) s)"
