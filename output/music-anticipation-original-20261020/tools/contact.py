#!/usr/bin/env python3
"""contact.py — labelled contact sheets from the ENCODED film (ffmpeg decode + Pillow; no drawtext needed).

    python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 0:1273:6 --cols 10 --out out/contact/whole
    python3 tools/contact.py out/deng-ta-luo-xia-lai.mp4 --frames 85,92,95,600,603,1049,1177 --out out/contact/key --full
--frames: a:b:step or a comma list. Sheets of up to 40 tiles (270×480 each), frame number + time on every tile.
--full also writes full-size JPEGs of the listed frames.
"""
import os, subprocess, sys
from PIL import Image, ImageDraw
args = sys.argv[1:]; mp4 = args[0]
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
spec = opt('--frames', '0:1273:6'); cols = int(opt('--cols', 10)); out = opt('--out', 'out/contact/sheet'); full = '--full' in args
if ':' in spec: a, b, st = map(int, spec.split(':')); frames = list(range(a, b, st))
else: frames = [int(x) for x in spec.split(',')]
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
W, H = 1080, 1920
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
n = len(raw) // (W * H * 3); want = set(frames)
tiles = []
for f in frames:
    if f >= n: continue
    im = Image.frombytes('RGB', (W, H), raw[f * W * H * 3:(f + 1) * W * H * 3])
    if full: im.save(f'{out}-f{f:05d}.jpg', quality=92)
    t = im.resize((270, 480)); d = ImageDraw.Draw(t); d.rectangle([0, 0, 120, 22], fill=(0, 0, 0)); d.text((4, 4), f'f{f} {f / 30:.2f}s', fill=(255, 230, 0)); tiles.append(t)
for k in range(0, len(tiles), 40):
    chunk = tiles[k:k + 40]; rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (270 * cols, 480 * rows), (16, 16, 20))
    for i, t in enumerate(chunk): sheet.paste(t, ((i % cols) * 270, (i // cols) * 480))
    sheet.save(f'{out}-{k // 40 + 1:02d}.jpg', quality=88)
print(f'{len(tiles)} frames of {n} → {out}-NN.jpg')
