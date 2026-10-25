#!/bin/bash
# keys.sh NAME SIZE [MODEL]: one GPT Image edit from the kitten sheet, retried on upstream errors (a failed call is not billed).
cd "$(dirname "$0")/.."
name=$1; size=${2:-1152x2048}; model=${3:-flare}; src=${4:-full-${name#key-}}
for i in 1 2 3 4 5; do
  timeout 600 python3 scripts/gptimage.py edit "$name" --prompt-file "prompts/$src.txt" --image refs/kitten-sheet.png --size "$size" --model "$model" 2>&1 | tail -1
  [ -f "refs/$name.png" ] && [ "refs/$name.png" -nt "prompts/$src.txt" ] && exit 0
  sleep $((i * 15))
done
exit 1
