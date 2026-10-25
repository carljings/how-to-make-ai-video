"""crop.py: enlarge a region of a source frame for visual fitting, with a labelled pixel grid in SOURCE coordinates.

    python3 -I v4/tools/crop.py IN.jpg OUT.png x0 y0 x1 y1 [scale] [grid_px] [gamma]

The grid lines and labels are source-pixel coordinates (so points read off the enlarged image map straight back to
the native 1920x1080 frame). gamma < 1 lifts the dark venue for reading edges.
"""
import sys

from PIL import Image, ImageDraw, ImageFont


def main():
    src, out = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    scale = float(sys.argv[7]) if len(sys.argv) > 7 else 3.0
    grid = int(sys.argv[8]) if len(sys.argv) > 8 else 50
    gamma = float(sys.argv[9]) if len(sys.argv) > 9 else 1.0
    im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
    if gamma != 1.0:
        lut = [int(255 * (i / 255.0) ** gamma) for i in range(256)] * 3
        im = im.point(lut)
    W, H = int((x1 - x0) * scale), int((y1 - y0) * scale)
    im = im.resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError:
        font = ImageFont.load_default()
    gx = (x0 // grid + 1) * grid
    while gx < x1:
        X = (gx - x0) * scale
        d.line([(X, 0), (X, H)], fill=(0, 160, 255), width=1)
        d.text((X + 2, 2), str(gx), fill=(0, 200, 255), font=font)
        gx += grid
    gy = (y0 // grid + 1) * grid
    while gy < y1:
        Y = (gy - y0) * scale
        d.line([(0, Y), (W, Y)], fill=(0, 160, 255), width=1)
        d.text((2, Y + 2), str(gy), fill=(0, 200, 255), font=font)
        gy += grid
    im.save(out)
    print(out, im.size)


if __name__ == '__main__':
    main()
