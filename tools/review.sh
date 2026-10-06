#!/usr/bin/env bash
# review.sh: turn each clip into a contact sheet (one frame every N seconds, time-stamped) so you, or an AI
# assistant that can read images but not video, can check a generated clip at a glance.
#
#   tools/review.sh [--every 1] [--cols 4] clip.mp4 [more.mp4 ...]     → clip.sheet.jpg next to each clip
set -euo pipefail

EVERY=1 COLS=4
while [ $# -gt 0 ]; do
  case $1 in
    --every) EVERY=$2; shift 2 ;;
    --cols) COLS=$2; shift 2 ;;
    *) break ;;
  esac
done
[ $# -ge 1 ] || { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

for clip in "$@"; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$clip")
  IFS=x read -r w h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$clip")
  frames=$(awk -v d="$dur" -v e="$EVERY" 'BEGIN { n = int(d / e + 0.999); print (n < 1 ? 1 : n) }')
  rows=$(( (frames + COLS - 1) / COLS ))
  tw=$(( w > h ? 480 : 270 ))   # landscape tiles 480 wide, portrait 270 wide
  out="${clip%.*}.sheet.jpg"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$clip" -frames:v 1 -vf "fps=1/${EVERY}:start_time=0,scale=${tw}:-2,\
drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.6:boxborderw=4,\
tile=${COLS}x${rows}:padding=4:margin=4:color=0x222222" -q:v 3 "$out"
  printf '%s  (%s s, %sx%s)  →  %s\n' "$clip" "$(echo "$dur" | cut -c1-5)" "$w" "$h" "$out"
done
