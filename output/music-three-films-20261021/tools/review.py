#!/usr/bin/env python3
"""review.py — look at the ENCODED film: frames decoded from the MP4 (not the renderer), tiled into labelled sheets.

    python3 -I tools/review.py FILM.mp4 OUT.jpg --times 0.5,3.1,20.2 [--cols 8] [--scale 0.25]
    python3 -I tools/review.py FILM.mp4 OUT.jpg --frames 80:115        every frame in [80, 115] (motion between keyframes)
    python3 -I tools/review.py FILM.mp4 OUT.jpg --every 0.5            one frame every 0.5 s over the whole film
"""
import argparse
import os
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFont

def _font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/System/Library/Fonts/Menlo.ttc', '/Library/Fonts/Arial Unicode.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


ap = argparse.ArgumentParser()
ap.add_argument('film'); ap.add_argument('out')
ap.add_argument('--times'); ap.add_argument('--frames'); ap.add_argument('--every', type=float)
ap.add_argument('--cols', type=int, default=8); ap.add_argument('--scale', type=float, default=0.25); ap.add_argument('--fps', type=float, default=30)
a = ap.parse_args()
tmp = tempfile.mkdtemp(prefix='review-')
w, h = int(1080 * a.scale), int(1920 * a.scale)
items = []
if a.frames:
    f0, f1 = map(int, a.frames.split(':'))
    subprocess.run(['ffmpeg', '-v', 'error', '-i', a.film, '-vf', f"select='between(n\\,{f0}\\,{f1})',scale={w}:{h}", '-vsync', '0', os.path.join(tmp, 'f%05d.png')], check=True)
    for i, name in enumerate(sorted(os.listdir(tmp))):
        items.append((os.path.join(tmp, name), f'f{f0 + i} {(f0 + i) / a.fps:.3f}s'))
else:
    if a.every:
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.film], capture_output=True, text=True).stdout)
        times = [round(k * a.every, 3) for k in range(int(dur / a.every) + 1)]
    else:
        times = [float(x) for x in a.times.split(',')]
    for i, t in enumerate(times):
        p = os.path.join(tmp, f'{i:04d}.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', a.film, '-frames:v', '1', '-vf', f'scale={w}:{h}', p], check=True)
        items.append((p, f'{t:.3f}s'))
cols = min(a.cols, len(items)); rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (0, 0, 0))
fnt = _font(max(13, int(44 * a.scale)))
for i, (p, label) in enumerate(items):
    im = Image.open(p).convert('RGB')
    d = ImageDraw.Draw(im); tw = d.textlength(label, font=fnt)
    d.rectangle([0, 0, tw + 10, int(56 * a.scale) + 6], fill=(0, 0, 0)); d.text((5, 2), label, fill=(255, 230, 0), font=fnt)
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(a.out, quality=85)
shutil.rmtree(tmp, ignore_errors=True)
print(f'{a.out}  ({len(items)} frames)')
