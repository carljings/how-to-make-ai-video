"""rampfit4.py: physically constrained version of the upper-profile fit.

Main wide (8.0 s): eye FIXED at Codex's earlier fit (-38.1, -52.0, 1.6) on the ground (the source floor line and
truss verticals show no roll), only aim (yaw, pitch) and zoom are free, roll 0. Elevated wide (44 s): free camera
with weak priors (no roll, eye near deck height: the deck is seen edge-on). Profile: v3's first arc (85 deg) with a
free radius, then arcs to phi3 and to the deck angle, then the straight deck. Same measured edge points as
rampfit2.py. Lengths in units of the W = 3.05 m slab-width estimate; fits, not dimensions.

    python3 -I v4/tools/rampfit4.py FRAMES_DIR OUT_DIR [deck_deg]
"""
import importlib.util
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, os.path.join(HERE, name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rf = _load('rampfit')
r2 = _load('rampfit2')
W = rf.W_SLAB
W8_EYE = np.array([-38.1, -52.0, 1.6])
PHID = 180.0


def profile_of(p):
    r1, phi2, r2_, phi3, r3, r4, L = p
    phi2 = min(max(phi2, 86.0), 120.0)
    phi3 = min(max(phi3, phi2 + 2.0), PHID - 2.0)
    arcs = [(85.0, abs(r1) + 1.0), (phi2, abs(r2_) + 1.0), (phi3, abs(r3) + 0.8), (PHID, abs(r4) + 0.8)]
    return rf.Profile(arcs, abs(L))


def unpack(x):
    prof = profile_of(x[:7])
    w8 = [W8_EYE, x[7], x[8], 0.0, x[9]]
    el = [np.array(x[10:13]), x[13], x[14], x[15], x[16]]
    return prof, {'W8': w8, 'EL': el}


def view_res(prof, cam, FAR, NEAR, END):
    far, near = r2.edge_poly(prof, W / 2, 220), r2.edge_poly(prof, -W / 2, 220)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    uf, vf = rf.project(cam, far)
    un, vn = rf.project(cam, near)
    out = [r2.pt_res(uf, vf, FAR), r2.pt_res(un, vn, NEAR)]
    for side, y in (('far', W / 2), ('near', -W / 2)):
        if side in END:
            u, v = rf.project(cam, np.array([[xe[0], y, ze[0]]]))
            out.append(np.array([u[0] - END[side][0], v[0] - END[side][1]]) * 1.5)
    return np.concatenate(out)


def residuals(x, raw=False):
    prof, cams = unpack(x)
    a = view_res(prof, cams['W8'], r2.W8_FAR, r2.W8_NEAR, r2.W8_END)
    b = view_res(prof, cams['EL'], r2.EL_FAR, r2.EL_NEAR, r2.EL_END)
    if raw:
        return a, b
    r = np.concatenate([a, b])
    k = 4.0
    r = k * np.sqrt(np.log1p((r / k) ** 2))
    zd = prof.at(np.array([prof.s_end]))[1][0]
    pri = [(x[12] - zd) / 4.0, x[15] / math.radians(3.0)]
    return np.concatenate([r, np.array(pri)])


def main():
    global PHID
    frames_dir, out_dir = sys.argv[1], sys.argv[2]
    if len(sys.argv) > 3:
        PHID = float(sys.argv[3])
    os.makedirs(out_dir, exist_ok=True)
    w8 = rf.cam_from_look(W8_EYE, (2.76, 0.0, 6.31), 3474.0)
    best = None
    for r3, L in ((8.0, 6.0), (6.0, 9.0), (4.0, 12.0), (10.0, 4.0)):
        for az, d in ((-130.0, 70.0), (-145.0, 80.0), (-115.0, 60.0)):
            eye = np.array([d * math.cos(math.radians(az)), d * math.sin(math.radians(az)), 16.0])
            el = rf.cam_from_look(eye, (3.0, 0.0, 6.0), 2300.0)
            x0 = np.array([5.5, 95.0, 12.0, 140.0, r3, r3 * 0.8, L, w8[1], w8[2], w8[4],
                           eye[0], eye[1], eye[2], el[1] + math.radians(9.0), el[2] - math.radians(8.0), 0.0, el[4]])
            xs, cost = rf.lm(lambda x: residuals(x), x0, iters=120, verbose=False)
            prof, cams = unpack(xs)
            a, b = residuals(xs, raw=True)
            print('start R3 %4.1f L %4.1f az %5.0f -> cost %7.1f W8 rms %6.2f EL rms %6.2f arcs %s deck %.2f' % (
                r3, L, az, cost, np.sqrt(np.mean(a ** 2)), np.sqrt(np.mean(b ** 2)),
                [(round(p, 1), round(q, 2)) for p, q in prof.arcs], prof.deck), flush=True)
            if best is None or cost < best[0]:
                best = (cost, xs)
    cost, xs = best
    prof, cams = unpack(xs)
    a, b = residuals(xs, raw=True)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    s = np.linspace(0, prof.s_end, 600)
    X, Z, _ = prof.at(s)
    out = {'deck_deg': PHID, 'cost': round(cost, 1), 'W8_rms': round(float(np.sqrt(np.mean(a ** 2))), 2),
           'W8_med': round(float(np.median(np.abs(a))), 2), 'EL_rms': round(float(np.sqrt(np.mean(b ** 2))), 2),
           'EL_med': round(float(np.median(np.abs(b))), 2),
           'arcs': [[round(p, 3), round(q, 4)] for p, q in prof.arcs], 'deck_len': round(prof.deck, 4),
           's_arc_end': round(prof.s_arc_end, 3), 's_end': round(prof.s_end, 3),
           'deck_start_xz': [round(float(v), 3) for v in prof.p_arc_end],
           'deck_end_xz': [round(float(xe[0]), 3), round(float(ze[0]), 3)], 'x_max': round(float(X.max()), 3),
           'cams': {n: {'eye': [round(float(v), 3) for v in c[0]], 'yaw_deg': round(math.degrees(c[1]), 3),
                        'pitch_deg': round(math.degrees(c[2]), 3), 'roll_deg': round(math.degrees(c[3]), 3),
                        'f_px': round(float(c[4]), 1)} for n, c in cams.items()}}
    json.dump(out, open(os.path.join(out_dir, 'fit4_%d.json' % int(PHID)), 'w'), indent=1)
    print(json.dumps(out, indent=1))
    for name, f, roi in (('W8', 'src_8.0.jpg', (760, 20, 1240, 920)), ('EL', 'src_44.0.jpg', (1250, 0, 1660, 440))):
        rf.draw_overlay(os.path.join(frames_dir, f), os.path.join(out_dir, 'fit4_%d_%s.png' % (int(PHID), name)),
                        prof, cams[name], roi)


if __name__ == '__main__':
    main()
