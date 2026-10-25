"""rampfit2.py: small, visually checked fit of the ramp's UPPER profile (the curl into the straight upper deck) to
measured edge points in two native views of Tesla's ramp clip: the main wide take at 8.0 s and the elevated wide at
44.0 s. Edge points were read from the frames (red-neon centroids / bright-band extents) and assigned to the near
(y = -W/2) or far (y = +W/2) edge by inspection; see the lists below.

Kept from v3 (fit earlier against the wide take): the floor transition arcs (85 deg, R 5.5) and (95 deg, R 12).
Free: two upper arcs (end angle, radius), the deck angle and the deck length, plus each view's camera (eye, yaw,
pitch, roll, focal). Scale is fixed by the slab width W = 3.05 m (v3's estimate against the car): every length is a
fit in units of that estimate, not a measured dimension.

    python3 -I v4/tools/rampfit2.py FRAMES_DIR OUT_DIR
"""
import importlib.util
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('rampfit', os.path.join(HERE, 'rampfit.py'))
rf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rf)

W = rf.W_SLAB
# ------------------------------------------------------------------------------------------------ measured points
# W8: main wide, source 8.0 s (car on the curl/deck junction; car rows skipped). Right edge = near (y=-W/2).
W8_FAR = [(834.5, 80), (848, 100), (861, 120), (874, 140), (889, 160), (902, 180), (915, 200), (928, 220),
          (940.7, 240), (953, 260), (967, 280), (1017, 450), (1020, 470), (1022, 490), (1024, 510), (1026, 530),
          (1028, 550), (1029, 590), (1029, 630), (1028, 670), (1025, 700), (1020, 740), (1012, 780), (1006, 800),
          (1000, 820), (991, 840), (980, 860)]
W8_NEAR = [(975, 80), (985.5, 100), (997.2, 120), (1009, 140), (1029, 180), (1040, 200), (1051, 220), (1061, 240),
           (1072, 260), (1081, 280), (1124, 460), (1126, 480), (1128, 500), (1130, 520), (1131, 540), (1133, 560),
           (1134, 620), (1132, 680), (1128, 740), (1125, 770), (1120, 800), (1113, 840), (1106, 860)]
W8_END = {'far': (825, 57), 'near': (951, 44)}
# EL: elevated wide, source 44.0 s (no car on the ramp). Outer/right boundary = near edge; the deck is seen edge-on.
EL_FAR = [(1290, 38), (1350, 38.5), (1400, 39.5), (1450, 40.5), (1495, 41.5), (1512, 48), (1521, 56), (1529, 64),
          (1535, 72), (1540, 80), (1544, 88), (1548, 96), (1551, 104), (1553, 112), (1555, 120), (1556, 128),
          (1557, 136), (1557, 152), (1557, 168), (1555, 184), (1551, 200), (1547, 216), (1541, 232), (1534, 248),
          (1526, 264), (1518, 280), (1506, 296), (1494, 312), (1479, 328), (1462, 344), (1441, 360), (1414, 376)]
EL_NEAR = [(1350, 34), (1450, 35.5), (1551, 48), (1563, 56), (1570, 64), (1586, 80), (1592, 88), (1599, 96),
           (1602, 112), (1605, 120), (1612, 144), (1612, 160), (1613, 176), (1611, 192), (1608, 208), (1604, 224),
           (1597, 240), (1586, 272), (1577, 288), (1568, 304), (1557, 336), (1539, 352), (1528, 360), (1513, 376)]
EL_END = {'far': (1281, 36)}

LOWER = [(85.0, 5.5), (95.0, 12.0)]


def profile_from(p):
    phi3, r3, r4, phid, L = p
    phi3 = min(max(phi3, 100.0), phid - 2.0)
    arcs = LOWER + [(phi3, abs(r3) + 0.5), (phid, abs(r4) + 0.5)]
    return rf.Profile(arcs, abs(L))


def edge_poly(prof, y, n=160, s_min=0.0):
    s = np.linspace(s_min, prof.s_end, n)
    x, z, _ = prof.at(s)
    return np.stack([x, np.full_like(x, y), z], 1)


def pt_res(u, v, pts):
    px = np.array([p[0] for p in pts], float)
    py = np.array([p[1] for p in pts], float)
    return rf.seg_dist(px, py, u[:-1], v[:-1], u[1:], v[1:])


def unpack(x):
    prof = profile_from(x[:5])
    cams = {}
    i = 5
    for name in ('W8', 'EL'):
        cams[name] = [np.array(x[i:i + 3]), x[i + 3], x[i + 4], x[i + 5], x[i + 6]]
        i += 7
    return prof, cams


def residuals(x, w_prior=1.0):
    prof, cams = unpack(x)
    r = []
    far, near = edge_poly(prof, W / 2), edge_poly(prof, -W / 2)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    for name, FAR, NEAR, END in (('W8', W8_FAR, W8_NEAR, W8_END), ('EL', EL_FAR, EL_NEAR, EL_END)):
        cam = cams[name]
        uf, vf = rf.project(cam, far)
        un, vn = rf.project(cam, near)
        r.append(pt_res(uf, vf, FAR))
        r.append(pt_res(un, vn, NEAR))
        for side, y in (('far', W / 2), ('near', -W / 2)):
            if side in END:
                u, v = rf.project(cam, np.array([[xe[0], y, ze[0]]]))
                r.append(np.array([u[0] - END[side][0], v[0] - END[side][1]]) * 1.5)
    r = np.concatenate(r)
    c = 4.0
    r = c * np.sqrt(np.log1p((r / c) ** 2))
    pri = [(x[5 + 2] - 1.6) / 2.0 * w_prior,              # wide eye height near a tripod height
           x[5 + 5] / math.radians(4.0) * w_prior,        # small rolls
           x[12 + 5] / math.radians(4.0) * w_prior]
    return np.concatenate([r, np.array(pri)])


def main():
    frames_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    best = None
    for phid in (165.0, 180.0, 195.0):
        for L in (5.0, 9.0):
            for el_az, el_h in ((-125.0, 17.0), (-140.0, 22.0), (-110.0, 14.0)):
                p0 = [135.0, 8.0, 6.0, phid, L]
                w8 = rf.cam_from_look((-38.1, -52.0, 1.6), (2.76, 0.0, 6.31), 115.8 / 36 * 1080)
                c = np.array([0.0, 0.0, 8.0])
                eye = c + 70.0 * np.array([math.cos(math.radians(el_az)), math.sin(math.radians(el_az)), 0.0])
                eye[2] = el_h
                el = rf.cam_from_look(eye, (c[0] + 4.0, 0.0, 4.0), 2600.0)
                el[1] += math.radians(10.0)
                x0 = np.array(p0 + list(w8[0]) + [w8[1], w8[2], w8[3], w8[4]] + list(el[0]) + [el[1], el[2], el[3],
                                                                                                el[4]], float)
                xs, cost = rf.lm(lambda x: residuals(x), x0, iters=80, verbose=False)
                prof, cams = unpack(xs)
                print('start phid %5.1f L %4.1f el %s -> cost %8.1f  arcs %s deck %.2f' % (
                    phid, L, (el_az, el_h), cost, [(round(a, 1), round(r_, 2)) for a, r_ in prof.arcs], prof.deck),
                    flush=True)
                if best is None or cost < best[0]:
                    best = (cost, xs)
    cost, xs = best
    prof, cams = unpack(xs)
    r = residuals(xs, 0.0)[:-3]
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    xj, zj = prof.p_arc_end
    out = {'cost': round(cost, 2), 'rms_px': round(float(np.sqrt(np.mean(r ** 2))), 2),
           'arcs': [[round(a, 3), round(r_, 4)] for a, r_ in prof.arcs], 'deck_len': round(prof.deck, 4),
           'deck_deg': round(math.degrees(prof.phi_deck), 3), 's_arc_end': round(prof.s_arc_end, 4),
           's_end': round(prof.s_end, 4), 'deck_start_xz': [round(float(xj), 4), round(float(zj), 4)],
           'deck_end_xz': [round(float(xe[0]), 4), round(float(ze[0]), 4)],
           'xmax': round(float(prof.at(np.linspace(0, prof.s_end, 400))[0].max()), 4),
           'cams': {n: {'eye': [round(float(v), 3) for v in c[0]], 'yaw_deg': round(math.degrees(c[1]), 3),
                        'pitch_deg': round(math.degrees(c[2]), 3), 'roll_deg': round(math.degrees(c[3]), 3),
                        'f_px': round(c[4], 1)} for n, c in cams.items()}}
    json.dump(out, open(os.path.join(out_dir, 'fit2.json'), 'w'), indent=1)
    print(json.dumps(out, indent=1))
    for name, f, roi in (('W8', 'src_8.0.jpg', (760, 20, 1240, 900)), ('EL', 'src_44.0.jpg', (1250, 0, 1660, 440))):
        rf.draw_overlay(os.path.join(frames_dir, f), os.path.join(out_dir, 'fit2_%s.png' % name), prof, cams[name], roi)


if __name__ == '__main__':
    main()
