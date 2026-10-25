"""preview_v2.py: geometry/framing check of the v2 film without Blender (numpy z-buffer + PIL vector overlay).

NOT the renderer and never evidence of the look: flat Lambert shading, cones for plumes, spheres skipped for cloud.
It checks that the car, jets, lineup and the projected vector overlay land where the edit needs them.

    python3 blender/tools/preview_v2.py --times 0,3.9,6.85,8.1,9.4,11.6,14.6,15.9,19,22,23,26 --out /tmp/v2-sheet.png
"""
import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

import preview  # noqa: E402
import roadster  # noqa: E402
import staging  # noqa: E402
import v2_film  # noqa: E402
from geom import lathe  # noqa: E402

FORCE = (255, 74, 31)
GAS = (154, 220, 255)


def plume_cones(fr):
    m = None
    for n, lv in fr.plumes.items():
        if lv < 0.05:
            continue
        P, D = v2_film.nozzle_world(fr, n)
        L = 3.0 * lv
        cone = lathe([(0.0, 0.0), (0.06, 0.0), (0.40, -L), (0.0, -L)], 10, 'plume', axis='Z')
        # cone built along -Z: map -Z onto D
        Dn = np.asarray(D)
        ref = np.array([0.0, 0.0, 1.0]) if abs(Dn[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
        A = np.cross(ref, Dn)
        A /= np.linalg.norm(A)
        B = np.cross(Dn, A)
        cone = cone.transformed(lambda p, A=A, B=B, Dn=Dn, P=P: tuple(P[i] + A[i] * p[0] + B[i] * p[1] - Dn[i] * p[2] for i in range(3)))
        if m is None:
            m = cone
        else:
            m.extend(cone)
    return m


def camera_for(fr, W, H):
    r, u, f = v2_film.basis(fr.camera)
    return preview.Camera(fr.camera['eye'], r, u, f, W, H, f_px=fr.camera['lens_mm'] / 36.0 * H)


PROPS = None


def render(t, W=360, H=640):
    global PROPS
    if PROPS is None:
        PROPS = [preview.mesh_arrays(m, None) for m in staging.build_props().values()]
    fr = v2_film.state(t)
    cam = camera_for(fr, W, H)
    items = list(PROPS)
    if fr.car_visible:
        items += preview.car_items(fr.car)
        cones = plume_cones(fr)          # already in world space: do not pass through car_items (car matrix)
        if cones is not None:
            items.append(preview.mesh_arrays(cones, None))
    img = preview.to_image(preview.rasterize(cam, items, light=(-0.3, -0.8, 0.5), bg=(0.004, 0.005, 0.008)))
    d = ImageDraw.Draw(img, 'RGBA')
    k = W / v2_film.W_PX
    o = v2_film.overlay(fr)
    for x0, y0, x1, y1, w, a in o.get('p', []):
        d.line((x0 * k, y0 * k, x1 * k, y1 * k), fill=GAS + (int(255 * a),), width=max(1, int(w * k)))
    for n, x0, y0, x1, y1, lv in o.get('l', []):
        d.line((x0 * k, y0 * k, x1 * k, y1 * k), fill=(255, 255, 255, int(150 * lv)), width=1)
    for n, x0, y0, x1, y1, lv in o.get('b', []):
        d.line((x0 * k, y0 * k, x1 * k, y1 * k), fill=FORCE + (int(255 * lv),), width=3)
        d.ellipse((x1 * k - 3, y1 * k - 3, x1 * k + 3, y1 * k + 3), fill=FORCE + (int(255 * lv),))
    if 'c' in o:
        x, y, lv = o['c']
        d.ellipse((x * k - 4, y * k - 4, x * k + 4, y * k + 4), fill=(255, 255, 255, int(255 * lv)))
        d.text((x * k + 7, y * k - 6), 'CoM', fill=(255, 255, 255, int(255 * lv)))
    if 'a' in o:
        pts = [(p[0] * k, p[1] * k) for p in o['a']['pts']]
        n = max(2, int(len(pts) * o['a']['draw']))
        d.line(pts[:n], fill=FORCE + (int(255 * o['a']['lv']),), width=3)
        if n == len(pts):
            d.ellipse((pts[-1][0] - 4, pts[-1][1] - 4, pts[-1][0] + 4, pts[-1][1] + 4), fill=FORCE + (255,))
    if 'fl' in o:
        for n, pts in o['fl']['paths']:
            d.line([(p[0] * k, p[1] * k) for p in pts], fill=GAS + (int(200 * o['fl']['lv']),), width=1)
    if 'vl' in o:
        x, y, lv = o['vl']
        d.line((x * k, y * k, x * k + 40, y * k - 40), fill=(255, 255, 255, int(200 * lv)))
        d.text((x * k + 44, y * k - 52), 'vessel label', fill=(255, 255, 255, int(255 * lv)))
    # safe zones: title band, caption line, Douyin bottom UI and right rail
    d.rectangle((0, 1700 * k, W, H), fill=(255, 0, 0, 40))
    d.rectangle((W - 130 * k, 900 * k, W, 1700 * k), fill=(255, 0, 0, 30))
    d.line((0, 1330 * k, W, 1330 * k), fill=(255, 255, 0, 90))
    d.text((4, 4), '%.2fs %s ev%.2f' % (t, fr.section, fr.ev), fill=(255, 255, 0))
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--times', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--width', type=int, default=360)
    ap.add_argument('--cols', type=int, default=6)
    a = ap.parse_args()
    times = [float(x) for x in a.times.split(',') if x.strip()]
    W, H = a.width, int(a.width * 16 / 9)
    panels = [render(t, W, H) for t in times]
    cols = min(a.cols, len(panels))
    rows = (len(panels) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W + (cols - 1) * 4, rows * H + (rows - 1) * 4), (60, 60, 60))
    for i, p in enumerate(panels):
        sheet.paste(p, ((i % cols) * (W + 4), (i // cols) * (H + 4)))
    sheet.save(a.out)
    print(a.out, sheet.size)


if __name__ == '__main__':
    main()
