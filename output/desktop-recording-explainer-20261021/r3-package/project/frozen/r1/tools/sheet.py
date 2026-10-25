#!/usr/bin/env python3
"""sheet.py — tile a folder of frames into one labelled contact sheet (review aid, no effect on the film).

    python3 -I tools/sheet.py FRAMES_DIR OUT.jpg COLS SCALE [--t0 T0 --dt DT] [--glob f*.jpg]

Labels: by default the file name's last "_<seconds>" token; with --t0/--dt the i-th frame is labelled t0 + i*dt.
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('cols', type=int); ap.add_argument('scale', type=float)
ap.add_argument('--t0', type=float); ap.add_argument('--dt', type=float); ap.add_argument('--glob', default='*.jpg')
ap.add_argument('--first', type=int, default=0); ap.add_argument('--count', type=int, default=0)
a = ap.parse_args()

files = sorted(glob.glob(os.path.join(a.src, a.glob)))
if a.count:
    files = files[a.first:a.first + a.count]
else:
    files = files[a.first:]
if not files:
    raise SystemExit('no frames')
im0 = Image.open(files[0])
w, h = int(im0.width * a.scale), int(im0.height * a.scale)
rows = (len(files) + a.cols - 1) // a.cols
pad = 22
sheet = Image.new('RGB', (a.cols * w, rows * (h + pad)), (24, 24, 24))
font = None
for cand in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc']:
    if os.path.exists(cand):
        font = ImageFont.truetype(cand, 15)
        break
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (i % a.cols) * w, (i // a.cols) * (h + pad)
    sheet.paste(im, (x, y + pad))
    if a.t0 is not None and a.dt is not None:
        idx = a.first + i
        lab = f'{a.t0 + idx * a.dt:.2f}s'
    else:
        m = re.findall(r'_(-?\d+(?:\.\d+)?)', os.path.basename(f))
        lab = (m[-1] + 's') if m else os.path.basename(f)
    dr.text((x + 4, y + 3), lab, fill=(255, 220, 120), font=font)
sheet.save(a.out, quality=88)
print(a.out, sheet.size, len(files), 'frames')
