"""check_profile.py: camera-only check of ONE fixed candidate profile (arcs and straight segments) against the measured
edge points of rampfit2.py, with physical camera bounds (main wide on a tripod, roll ~0; elevated drone, roll ~0).
Writes overlays for visual review. Not a fit of the profile itself.

    python3 -I v4/tools/check_profile.py FRAMES_DIR OUT_DIR SEGMENTS_JSON
SEGMENTS_JSON: '[["arc",55,5.2],["arc",90,8.5],["line",5.5],["arc",130,4.0],["arc",180,3.0],["line",9.0]]'
"""
import importlib.util
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rf = _load('rampfit')
r2 = _load('rampfit2')
W = rf.W_SLAB


class SegProfile:
    def __init__(self, segs):
        self.pts = [(0.0, 0.0, 0.0)]          # (s, x, z) samples, phi carried separately
        x, z, phi, s = 0.0, 0.0, 0.0, 0.0
        out = [(s, x, z, phi)]
        for seg in segs:
            if seg[0] == 'arc':
                a1, r = math.radians(seg[1]), seg[2]
                n = max(4, int(abs(a1 - phi) * r / 0.05))
                cx, cz = x - r * math.sin(phi), z + r * math.cos(phi)
                for k in range(1, n + 1):
                    a = phi + (a1 - phi) * k / n
                    out.append((s + r * (a - phi), cx + r * math.sin(a), cz - r * math.cos(a), a))
                s += r * (a1 - phi)
                x, z, phi = out[-1][1], out[-1][2], a1
            else:
                L = seg[1]
                n = max(2, int(L / 0.05))
                for k in range(1, n + 1):
                    d = L * k / n
                    out.append((s + d, x + d * math.cos(phi), z + d * math.sin(phi), phi))
                s += L
                x, z = out[-1][1], out[-1][2]
        self.tab = np.array(out)
        self.s_end = s

    def at(self, s):
        s = np.asarray(s, float)
        t = self.tab
        return np.interp(s, t[:, 0], t[:, 1]), np.interp(s, t[:, 0], t[:, 2]), np.interp(s, t[:, 0], t[:, 3])


def edge(prof, y, n=260):
    s = np.linspace(0.0, prof.s_end, n)
    x, z, _ = prof.at(s)
    return np.stack([x, np.full_like(x, y), z], 1)


def view_res(prof, cam, FAR, NEAR, END):
    far, near = edge(prof, W / 2), edge(prof, -W / 2)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    uf, vf = rf.project(cam, far)
    un, vn = rf.project(cam, near)
    out = [r2.pt_res(uf, vf, FAR), r2.pt_res(un, vn, NEAR)]
    for side, y in (('far', W / 2), ('near', -W / 2)):
        if side in END:
            u, v = rf.project(cam, np.array([[xe[0], y, ze[0]]]))
            out.append(np.array([u[0] - END[side][0], v[0] - END[side][1]]))
    return np.concatenate(out)


def fit_view(prof, name):
    zdeck = float(prof.at(np.array([prof.s_end]))[1][0])
    FAR, NEAR, END = {'W8': (r2.W8_FAR, r2.W8_NEAR, r2.W8_END), 'EL': (r2.EL_FAR, r2.EL_NEAR, r2.EL_END)}[name]
    best = None
    if name == 'W8':
        starts = [((-60.0, -25.0, 1.6), 3000.0), ((-45.0, -45.0, 1.6), 3400.0), ((-75.0, -12.0, 1.6), 3600.0),
                  ((-38.1, -52.0, 1.6), 3474.0)]
    else:
        starts = [((-10.0, -70.0, 16.0), 2200.0), ((-35.0, -60.0, 18.0), 2000.0), ((15.0, -70.0, 16.0), 2200.0),
                  ((-5.0, -90.0, 22.0), 2800.0)]
    for eye, f in starts:
        c = rf.cam_from_look(eye, (2.0, 0.0, 8.0), f)
        if name == 'EL':     # ramp sits top-right of the elevated frame: aim left/below it
            c[1] += math.radians(10.0)
            c[2] -= math.radians(9.0)
        x0 = np.array(list(c[0]) + [c[1], c[2], 0.0, c[4]], float)

        def fun(x):
            cam = [np.array(x[:3]), x[3], x[4], x[5], x[6]]
            r = view_res(prof, cam, FAR, NEAR, END)
            k = 4.0
            r = k * np.sqrt(np.log1p((r / k) ** 2))
            pri = [x[5] / math.radians(1.0)]
            if name == 'W8':      # tripod on the floor, long lens (the source wide shows weak perspective)
                pri += [(x[2] - 1.6) / 0.3, max(0.0, 2400.0 - x[6]) / 60.0]
            else:                 # drone near deck height: the deck is seen edge-on as one thin line
                pri += [(x[2] - zdeck) / 1.5]
            return np.concatenate([r, pri])
        xs, cost = rf.lm(fun, x0, iters=120, verbose=False)
        if best is None or cost < best[1]:
            best = (xs, cost)
    xs, cost = best
    cam = [np.array(xs[:3]), xs[3], xs[4], xs[5], xs[6]]
    raw = view_res(prof, cam, FAR, NEAR, END)
    return cam, cost, raw


def draw(prof, cam, frame, out, roi):
    im = Image.open(frame).convert('RGB')
    d = ImageDraw.Draw(im)
    for y, col in ((-W / 2, (60, 255, 90)), (W / 2, (40, 220, 255))):
        P = edge(prof, y, 400)
        u, v = rf.project(cam, P)
        d.line(list(zip(u.tolist(), v.tolist())), fill=col, width=2)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    u, v = rf.project(cam, np.array([[xe[0], -W / 2, ze[0]], [xe[0], W / 2, ze[0]]]))
    d.line(list(zip(u.tolist(), v.tolist())), fill=(255, 230, 40), width=3)
    x0, y0, x1, y1 = roi
    im = im.crop((max(0, x0 - 40), max(0, y0 - 40), min(1920, x1 + 40), min(1080, y1 + 40)))
    sc = 900.0 / max(im.size)
    if sc > 1:
        im = im.resize((int(im.size[0] * sc), int(im.size[1] * sc)), Image.LANCZOS)
    im.save(out)


def main():
    frames_dir, out_dir, segs = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
    tag = sys.argv[4] if len(sys.argv) > 4 else 'cand'
    os.makedirs(out_dir, exist_ok=True)
    prof = SegProfile(segs)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    print('profile s_end %.2f, deck end (%.2f, %.2f), x max %.2f' % (prof.s_end, xe[0], ze[0], prof.tab[:, 1].max()))
    res = {}
    for name, f, roi in (('W8', 'src_8.0.jpg', (760, 20, 1240, 920)), ('EL', 'src_44.0.jpg', (1250, 0, 1660, 440))):
        cam, cost, raw = fit_view(prof, name)
        res[name] = {'rms': round(float(np.sqrt(np.mean(raw ** 2))), 2), 'med': round(float(np.median(np.abs(raw))), 2),
                     'p90': round(float(np.percentile(np.abs(raw), 90)), 2),
                     'eye': [round(float(v), 2) for v in cam[0]], 'yaw': round(math.degrees(cam[1]), 2),
                     'pitch': round(math.degrees(cam[2]), 2), 'roll': round(math.degrees(cam[3]), 2),
                     'f_px': round(float(cam[4]), 1)}
        print(name, res[name])
        draw(prof, cam, os.path.join(frames_dir, f), os.path.join(out_dir, '%s_%s.png' % (tag, name)), roi)
    json.dump({'segments': segs, 'views': res}, open(os.path.join(out_dir, '%s.json' % tag), 'w'), indent=1)


if __name__ == '__main__':
    main()
