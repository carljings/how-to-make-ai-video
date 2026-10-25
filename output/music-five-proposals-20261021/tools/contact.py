#!/usr/bin/env python3
"""contact.py — side-by-side keyframe sheet for one proposal.

    python3 -I tools/contact.py <out.jpg> <title> <frame.jpg>::<label> [<frame.jpg>::<label> ...] [--w 432]

Frames are scaled to the same width and laid out in one row under a title bar; each gets its label underneath.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
w = 432
if '--w' in args:
    i = args.index('--w'); w = int(args[i + 1]); del args[i:i + 2]
out, title, items = args[0], args[1], args[2:]
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FONT_R = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
h = int(w * 1920 / 1080)
pad, top, cap = 18, 86, 86
sheet = Image.new('RGB', (pad + len(items) * (w + pad), top + h + cap + pad), '#111318')
d = ImageDraw.Draw(sheet)
d.text((pad, 20), title, font=ImageFont.truetype(FONT, 40), fill='#f5f1ea')
fl = ImageFont.truetype(FONT_R, 22)
for k, it in enumerate(items):
    path, _, label = it.partition('::')
    im = Image.open(path).convert('RGB').resize((w, h), Image.LANCZOS)
    x = pad + k * (w + pad)
    sheet.paste(im, (x, top))
    y = top + h + 10
    for line in label.split('|'):
        d.text((x, y), line, font=fl, fill='#d9d4cc')
        y += 30
sheet.save(out, quality=90)
print(out, sheet.size)
