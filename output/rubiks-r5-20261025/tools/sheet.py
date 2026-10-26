#!/usr/bin/env python3
"""sheet.py — tile a directory of frames (NNNN_<t>.jpg) into one labelled contact sheet with ffmpeg (no PIL).

    python3 -I tools/sheet.py FRAMES_DIR OUT.jpg COLS SCALE
"""
import os
import subprocess
import sys

src, out, cols, scale = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
files = sorted(f for f in os.listdir(src) if f.endswith('.jpg'))
w, h = int(1080 * scale) // 2 * 2, int(1920 * scale) // 2 * 2
lab = os.path.join(src, 'lab')
os.makedirs(lab, exist_ok=True)
for i, f in enumerate(files):
    t = f.split('_', 1)[1][:-4]
    # time labels are drawn by the page itself (index.html?label=1); this build of ffmpeg has no drawtext
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(src, f), '-vf', f"scale={w}:{h}",
                    os.path.join(lab, f'{i:04d}.jpg')], check=True)
rows = (len(files) + cols - 1) // cols
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '1', '-i', os.path.join(lab, '%04d.jpg'), '-vf',
                f'tile={cols}x{rows}:padding=4:color=0x222222', '-frames:v', '1', '-q:v', '3', out], check=True)
print(out, f'{len(files)} frames, {cols}x{rows}')
