#!/bin/bash
# render-r6.sh — the r6 full cut: three Chrome renders on disjoint chunk ranges, then concat, score, master, verify.
# Finished chunks are skipped, so the script resumes. The lane split below balances the ten chunks left on 25 Oct
# (lane a also takes the last two). Three lanes need ≈5.4 GB: on 25 Oct they ran the box out of memory until the
# leftover processes were cleared, so check `free -m` first. Renders run at nice 10 so SSH stays responsive; start
# the script with setsid nohup so a dropped SSH session doesn't stop it. Free memory is logged to out/r6-mem.log.
cd "$(dirname "$0")/.."
echo $$ > out/r6-run.pid
P="src/index.html?v=full"; OUT=out/rubiks-r6-full-picture.mp4; N=3795
R() { nice -n 10 node tools/render.mjs "$P" video $OUT --frames $N --chunk 90 "$@"; }
{ R --first 0 --last 1349 >> out/r6-a.log 2>&1; R --first 3690 --last 3794 >> out/r6-a.log 2>&1; } & A=$!
R --first 1350 --last 3419 >> out/r6-b.log 2>&1 & B=$!
R --first 3420 --last 3689 >> out/r6-c.log 2>&1 & C=$!
( while kill -0 $$ 2>/dev/null; do echo "$(date +%T) avail $(free -m | awk '/Mem:/ {print $7}') MB swapfree $(free -m | awk '/Swap:/ {print $4}') MB load $(cut -d' ' -f1 /proc/loadavg)"; sleep 60; done ) >> out/r6-mem.log 2>&1 &
wait $A $B $C
node tools/render.mjs "$P" video $OUT --frames $N --chunk 90 > out/r6-concat.log 2>&1   # all chunks exist: concatenates
mkdir -p out/audio
node tools/render.mjs "$P" audio out/audio/score-r6-full-raw.wav > out/r6-audio.log 2>&1
FINISH_LIMIT=0.68 python3 -I tools/finish.py $OUT out/audio/score-r6-full-raw.wav out/rubiks-r6-full.mp4 126.5 > out/r6-finish.log 2>&1
tail -n 3 out/r6-finish.log
