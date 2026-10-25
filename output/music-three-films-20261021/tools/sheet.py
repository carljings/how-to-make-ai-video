#!/usr/bin/env python3
"""sheet.py — tile JPEG frames (file names NNNN_T.jpg, T = film seconds) into one labelled review sheet.

    python3 -I tools/sheet.py FRAMES_DIR OUT.jpg [COLS] [SCALE]
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

def _font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/System/Library/Fonts/Menlo.ttc', '/Library/Fonts/Arial Unicode.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3
files = sorted(f for f in os.listdir(src) if f.endswith('.jpg'))
if not files:
    sys.exit('no frames')
im0 = Image.open(os.path.join(src, files[0]))
w, h = int(im0.width * scale), int(im0.height * scale)
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (0, 0, 0))
fnt = _font(max(14, int(40 * scale)))
for i, f in enumerate(files):
    t = f.split('_', 1)[1].rsplit('.', 1)[0]
    im = Image.open(os.path.join(src, f)).convert('RGB').resize((w, h), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    label = f'{float(t):.3f}s'
    tw = d.textlength(label, font=fnt)
    d.rectangle([0, 0, tw + 10, int(52 * scale) + 6], fill=(0, 0, 0))
    d.text((5, 2), label, fill=(255, 230, 0), font=fnt)
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=86)
print(f'{out}  ({len(files)} frames, {cols} cols, {w}x{h})')
