#!/usr/bin/env python3
"""review.py — look at the ENCODED film (not the renderer): frames pulled out of the MP4 by ffmpeg, tiled into sheets.

    python3 -I tools/review.py sheet MOVIE.mp4 OUT.jpg --times 1.2,3.4,... [--cols 6] [--scale 0.3]
    python3 -I tools/review.py strip MOVIE.mp4 OUT.jpg --from 96.6 --to 99.0 [--every 3] [--cols 6] [--scale 0.25]
    python3 -I tools/review.py color MOVIE.mp4 FRAME_INDEX RENDER.png      (encoded frame vs the renderer's PNG)

Frames are decoded with the file's own BT.709 limited-range matrix (stated explicitly, so the check is not at the
mercy of a default), exact frame index = round(t * fps). Labels are film time in seconds.
"""
import argparse
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FPS = 30
TO_RGB = 'scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int,format=rgb24'


def grab(movie, idxs, outdir):
    """decode exactly the frames with these indices (one pass, select filter) → PNGs named by index"""
    sel = '+'.join(f'eq(n\\,{i})' for i in idxs)
    tmp = os.path.join(outdir, 'g_%05d.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', movie, '-vf', f"select='{sel}',{TO_RGB}", '-vsync', '0', tmp], check=True)
    got = sorted(f for f in os.listdir(outdir) if f.startswith('g_'))
    if len(got) != len(idxs):
        sys.exit(f'expected {len(idxs)} frames, decoded {len(got)}')
    return [os.path.join(outdir, f) for f in got]


def tile(files, labels, out, cols, scale):
    im0 = Image.open(files[0]); w, h = int(im0.width * scale), int(im0.height * scale)
    rows = (len(files) + cols - 1) // cols; pad = 22
    sheet = Image.new('RGB', (cols * w, rows * (h + pad)), (24, 24, 24)); dr = ImageDraw.Draw(sheet)
    font = None
    for cand in ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/System/Library/Fonts/Menlo.ttc']:
        if os.path.exists(cand):
            font = ImageFont.truetype(cand, 15); break
    for i, (f, lab) in enumerate(zip(files, labels)):
        x, y = (i % cols) * w, (i // cols) * (h + pad)
        sheet.paste(Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS), (x, y + pad))
        dr.text((x + 4, y + 3), lab, fill=(255, 220, 120), font=font)
    sheet.save(out, quality=88)
    print(out, sheet.size, len(files), 'frames')


ap = argparse.ArgumentParser()
ap.add_argument('mode'); ap.add_argument('movie'); ap.add_argument('out')
ap.add_argument('extra', nargs='?')
ap.add_argument('--times'); ap.add_argument('--from', dest='t0', type=float); ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--every', type=int, default=1); ap.add_argument('--cols', type=int, default=6); ap.add_argument('--scale', type=float, default=0.3)
a = ap.parse_args()
tmp = tempfile.mkdtemp(prefix='review-', dir='/dev/shm' if os.path.isdir('/dev/shm') else None)
try:
    if a.mode in ('sheet', 'strip'):
        if a.mode == 'sheet':
            idxs = [round(float(x) * FPS) for x in a.times.split(',')]
        else:
            idxs = list(range(round(a.t0 * FPS), round(a.t1 * FPS) + 1, a.every))
        order = sorted(set(idxs))
        files = grab(a.movie, order, tmp)
        byidx = dict(zip(order, files))
        tile([byidx[i] for i in idxs], [f'{i / FPS:.3f}s #{i}' for i in idxs], a.out, a.cols, a.scale)
    elif a.mode == 'color':
        idx = int(a.out); ref = a.extra
        f = grab(a.movie, [idx], tmp)[0]
        enc = np.asarray(Image.open(f).convert('RGB')).astype(float); src = np.asarray(Image.open(ref).convert('RGB')).astype(float)
        d = enc - src
        print(f'frame #{idx}: mean |Δ| per channel R {np.abs(d[..., 0]).mean():.2f} G {np.abs(d[..., 1]).mean():.2f} B {np.abs(d[..., 2]).mean():.2f}'
              f' · mean Δ (bias) R {d[..., 0].mean():+.2f} G {d[..., 1].mean():+.2f} B {d[..., 2].mean():+.2f}'
              f' · 99th pct |Δ| {np.percentile(np.abs(d), 99):.1f}')
        for name, (x, y) in {'centre': (540, 960), 'caption': (300, 262)}.items():
            print(f'  {name:8s} source {src[y, x].astype(int).tolist()} → encoded {enc[y, x].astype(int).tolist()}')
    else:
        sys.exit('unknown mode')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
