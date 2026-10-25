#!/bin/bash
# contact.sh DIR OUT [COLS] — tile all frames in DIR (sorted) into one image with frame labels
DIR=$1; OUT=$2; COLS=${3:-3}
FILES=($(ls $DIR/f*.png $DIR/f*.jpg 2>/dev/null | sort))
N=${#FILES[@]}
ROWS=$(( (N + COLS - 1) / COLS ))
ARGS=(); FILTER=""
for i in "${!FILES[@]}"; do
  ARGS+=(-i "${FILES[$i]}")
  name=$(basename "${FILES[$i]}"); name=${name%.*}
  FILTER+="[$i:v]scale=360:-1,drawtext=text='$name':x=8:y=8:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6[v$i];"
done
LAY=""; IN=""
for i in "${!FILES[@]}"; do IN+="[v$i]"; c=$((i % COLS)); r=$((i / COLS)); LAY+="$((c*360))_$((r*640))|"; done
ffmpeg -y -loglevel error "${ARGS[@]}" -filter_complex "${FILTER}${IN}xstack=inputs=$N:layout=${LAY%|}:fill=black" -frames:v 1 "$OUT"
