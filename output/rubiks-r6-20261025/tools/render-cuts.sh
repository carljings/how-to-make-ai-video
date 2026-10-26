#!/bin/bash
# render-cuts.sh [full mid light] — render each r5 cut: picture (resumable 90-frame chunks), score, master + mux.
# Runs the cuts in parallel (one Chrome each); logs to out/<cut>.log. Delete a chunk in out/rubiks-r5-<cut>-picture.parts
# to re-render just those 3 seconds.
cd "$(dirname "$0")/.."
cuts=("$@"); [ ${#cuts[@]} -eq 0 ] && cuts=(full mid light)
declare -A DUR=([full]=126.5 [mid]=151.5 [light]=159.5)
mkdir -p out/audio
for v in "${cuts[@]}"; do
  d=${DUR[$v]}; n=$(python3 -c "print(round($d*30))")
  (
    set -e
    echo "== $v: $n frames, $d s ($(date -u +%FT%TZ))"
    node tools/render.mjs "src/index.html?v=$v" video "out/rubiks-r5-$v-picture.mp4" --frames "$n" --chunk 90
    node tools/render.mjs "src/index.html?v=$v" audio "out/audio/score-$v-raw.wav"
    FINISH_LIMIT=0.68 python3 -I tools/finish.py "out/rubiks-r5-$v-picture.mp4" "out/audio/score-$v-raw.wav" "out/rubiks-r5-$v.mp4" "$d"
    echo "== $v finished ($(date -u +%FT%TZ))"
  ) >> "out/$v.log" 2>&1 &
done
wait
