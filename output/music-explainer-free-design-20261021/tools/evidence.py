#!/usr/bin/env python3
"""evidence.py (Opus 5.5) — labelled contact sheets of an ENCODED MP4 for review (numpy + Pillow + ffmpeg, no drawtext).

    python3 tools/evidence.py MP4 OUTDIR

Writes OUTDIR/{overview-1,overview-2,m-drop1,m-drop2,m-loop,m-fog,m-lap2,m-end}.jpg and OUTDIR/full-*.jpg (540×960).
Frames are decoded exactly (select by frame number), tiles labelled with the frame number and film time.
"""
import os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

MP4, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FPS = 30

def grab(frames, w, h):
    sel = '+'.join(f'eq(n\\,{f})' for f in frames)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-vf', f"select='{sel}',scale={w}:{h}:flags=area", '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    arr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    assert len(arr) == len(frames), (len(arr), len(frames))
    return [Image.fromarray(a) for a in arr]

def sheet(name, frames, w, h, cols, q=70):
    ims = grab(frames, w, h); rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * h), (0, 0, 0)); d = ImageDraw.Draw(S)
    for i, (f, im) in enumerate(zip(frames, ims)):
        x, y = (i % cols) * w, (i // cols) * h; S.paste(im, (x, y))
        d.rectangle([x, y, x + 74, y + 14], fill=(0, 0, 0)); d.text((x + 3, y + 2), f'f{f} {f / FPS:.2f}s', fill=(255, 230, 0))
    S.save(os.path.join(OUT, name + '.jpg'), quality=q); print(name, len(frames), os.path.getsize(os.path.join(OUT, name + '.jpg')))

sheet('overview-1', list(range(0, 601, 10)), 120, 213, 10)
sheet('overview-2', list(range(610, 1211, 10)) + [1213], 120, 213, 10)
sheet('m-drop1', list(range(122, 141)), 160, 284, 10)
sheet('m-drop2', list(range(505, 524)), 160, 284, 10)
sheet('m-loop', list(range(620, 681, 3)), 160, 284, 10)
sheet('m-fog', list(range(700, 771, 4)), 160, 284, 10)
sheet('m-lap2', list(range(1016, 1035)), 160, 284, 10)
sheet('m-end', list(range(1090, 1214, 6)) + [1213], 160, 284, 11)
for f in [30, 135, 450, 515, 600, 660, 700, 760, 860, 1022, 1100, 1160, 1213]:
    grab([f], 540, 960)[0].save(os.path.join(OUT, f'full-{f:04d}.jpg'), quality=80)
print('done', sum(os.path.getsize(os.path.join(OUT, x)) for x in os.listdir(OUT)), 'bytes')
