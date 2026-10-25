"""Tile extracted source frames into a labelled grid for visual review.
usage: python3 -I montage.py OUT.jpg COLS SCALE t0 t1 step  (times in seconds; frames at 4 fps)"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
out, cols, scale, t0, t1, step = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
src = os.environ.get("FRAMES", "/root/codex-roadster-v3-20261017/v3/evidence/ramp-frames")
fps = float(os.environ.get("FPS", "4"))
times = []
t = t0
while t <= t1 + 1e-6:
    times.append(round(t, 3)); t += step
ims = []
for t in times:
    k = int(round(t * fps)) + 1
    p = os.path.join(src, f"f_{k:04d}.jpg")
    if os.path.exists(p):
        ims.append((t, Image.open(p).convert("RGB")))
w, h = ims[0][1].size
W, H = int(w * scale), int(h * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * (H + 22)), (24, 24, 24))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(ims):
    x, y = (i % cols) * W, (i // cols) * (H + 22)
    sheet.paste(im.resize((W, H), Image.LANCZOS), (x, y))
    d.text((x + 6, y + H + 2), f"{t:05.2f}s", fill=(255, 255, 255), font=font)
sheet.save(out, quality=92)
print(out, sheet.size, len(ims))
