"""previz.py: wireframe previsualisation of film frames through the EXACT film cameras (v3_film.state(t)), for checking
compositions before any Blender time is spent. Pure Python + PIL.

    python3 v4/tools/previz.py OUT_DIR t0 [t1 ...]          # film seconds -> OUT_DIR/pv_tNN.NNN.png + contact.png

Draws: floor grid and run-in, both neon edges (red), surface cross-lines every metre (grey), the deck span (cyan),
the free end (yellow), the truss/gantry outline (dim), the car as a body box + canopy box + wheels (white; nose
edge orange), the light-sheet contour on the ramp when the look's sheet level is on (blue-white), the caption/title
safe zones (thin outlines), and the section/ev/camera in the corner.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'blender'))

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import roadster  # noqa: E402
import v3_film as F  # noqa: E402
import v3_ramp as R  # noqa: E402


def font(sz):
    try:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', sz)
    except OSError:
        return ImageFont.load_default()


def draw_frame(t, out, cam=None, size=(F.W_PX, F.H_PX), label=None):
    fr = F.state(t)
    W, H = size
    im = Image.new('RGB', (W, H), (8, 9, 12))
    d = ImageDraw.Draw(im)
    cam = cam or fr.camera
    if cam is None:
        d.text((40, 40), '%s (no 3D)' % fr.section, fill=(200, 200, 200), font=font(36))
        im.save(out)
        return

    def P(p):
        q = F.project(cam, p, W, H)
        return None if q is None else (q[0], q[1])

    def line(a, b, col, w=1):
        qa, qb = P(a), P(b)
        if qa and qb and max(abs(qa[0]), abs(qb[0]), abs(qa[1]), abs(qb[1])) < 1e5:
            d.line([qa, qb], fill=col, width=w)

    def poly(pts, col, w=1):
        for a, b in zip(pts, pts[1:]):
            line(a, b, col, w)

    # floor grid
    for k in range(-30, 21, 2):
        line((k, -20.0, 0.0), (k, 20.0, 0.0), (28, 30, 36))
    for k in range(-20, 21, 2):
        line((-30.0, k, 0.0), (20.0, k, 0.0), (28, 30, 36))
    # ramp surface: cross-lines and edges
    W2 = R.RAMP_W / 2
    n = 240
    ss = [-R.RUNIN + (R.S_LIP + R.RUNIN) * k / n for k in range(n + 1)]
    for y, col in ((-W2, (255, 40, 60)), (W2, (200, 30, 50))):
        poly([(R.point(s)[0], y, R.point(s)[2]) for s in ss], col, 3)
    s = 0.0
    while s <= R.S_LIP:
        p = R.point(s)
        line((p[0], -W2, p[2]), (p[0], W2, p[2]), (70, 72, 78) if s < R.S_DECK else (60, 160, 200))
        s += 1.0
    lp = R.LIP
    line((lp[0], -W2, lp[2]), (lp[0], W2, lp[2]), (255, 220, 40), 3)
    # light-sheet contour (y = SHEET_Y) when on
    lk = fr.look
    if lk.get('sheet', 0.0) > 0.01:
        ys = lk.get('sheet_y', F.CUT_Y)
        s_to = lk.get('sheet_trace', R.S_LIP)
        poly([(R.point(s)[0], ys, R.point(s)[2]) for s in ss if s <= s_to], (190, 230, 255), 2)
    # truss (approximate, mirrors render_v3.lattice_mesh)
    for seg in F.truss_lines():
        line(seg[0], seg[1], (60, 62, 70))
    # car
    if fr.car is not None and fr.car_visible:
        M = fr.car
        xs = (roadster.X_TAIL, roadster.X_NOSE)
        box = [(x, y, z) for x in xs for y in (-1.0, 1.0) for z in (0.14, 0.80)]
        edges = [(0, 1), (0, 2), (1, 3), (2, 3), (4, 5), (4, 6), (5, 7), (6, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
        for a, b in edges:
            col = (255, 150, 40) if (a >= 4 and b >= 4) else (235, 235, 235)
            line(R.xf(M, box[a]), R.xf(M, box[b]), col, 2)
        can = [(x, y, z) for x in (-1.6, 1.12) for y in (-0.72, 0.72) for z in (0.80, 1.10)]
        for a, b in edges:
            line(R.xf(M, can[a]), R.xf(M, can[b]), (150, 150, 160), 1)
        for ax in (R.AXLE_F, R.AXLE_R):
            for wy in (-roadster.TRACK_Y, roadster.TRACK_Y):
                pts = [(ax + R.WHEEL_R * math.cos(a), wy, R.WHEEL_R + R.WHEEL_R * math.sin(a))
                       for a in [2 * math.pi * k / 16 for k in range(17)]]
                poly([R.xf(M, p) for p in pts], (120, 120, 130), 1)
    # safe zones: hook title band, caption baseline, right-hand button column
    d.rectangle([0, 1080, W - 1, 1440], outline=(40, 40, 60))
    d.line([(0, 1330), (W, 1330)], fill=(60, 40, 40))
    d.rectangle([W - 150, 900, W - 1, 1700], outline=(40, 30, 30))
    txt = label or ('t %.2f %s ev %s lens %.1f' % (t, fr.section, 'n/a' if fr.ev is None else '%.3f' % fr.ev,
                                                    cam['lens_mm']))
    d.text((24, 24), txt, fill=(220, 220, 220), font=font(30))
    im.save(out)


def contact(paths, out, cols=4, scale=0.3):
    ims = [Image.open(p) for p in paths]
    w, h = int(ims[0].size[0] * scale), int(ims[0].size[1] * scale)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * h), (20, 20, 20))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * w, (i // cols) * h))
    sheet.save(out)


def main():
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for a in sys.argv[2:]:
        t = float(a)
        p = os.path.join(out_dir, 'pv_t%06.3f.png' % t)
        draw_frame(t, p)
        paths.append(p)
    if len(paths) > 1:
        contact(paths, os.path.join(out_dir, 'contact.png'))
    print('\n'.join(paths))


if __name__ == '__main__':
    main()
