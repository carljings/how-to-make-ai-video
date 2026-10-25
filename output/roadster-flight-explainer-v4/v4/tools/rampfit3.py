"""rampfit3.py: grid over the ramp's upper profile (curl radius, deck length, deck angle) with a CAMERA-ONLY solve
per view for each candidate (well-conditioned: 7 camera parameters against ~50 edge points), using the measured edge
points of rampfit2.py. The lower floor-transition arcs stay v3's. Prints the per-candidate costs and writes overlays
of the best candidate for visual checking. Lengths are in units of the W = 3.05 m slab-width estimate.

    python3 -I v4/tools/rampfit3.py FRAMES_DIR OUT_DIR
"""
import importlib.util
import itertools
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

VIEWS = {
    'W8': (r2.W8_FAR, r2.W8_NEAR, r2.W8_END, 'src_8.0.jpg', (760, 20, 1240, 920)),
    'EL': (r2.EL_FAR, r2.EL_NEAR, r2.EL_END, 'src_44.0.jpg', (1250, 0, 1660, 440)),
}


def make_profile(r3, L, phid, lower=((85.0, 5.5), (95.0, 12.0))):
    return rf.Profile(list(lower) + [(phid, r3)], L)


def cam_res(c, prof, FAR, NEAR, END):
    cam = [np.array(c[:3]), c[3], c[4], c[5], c[6]]
    far, near = r2.edge_poly(prof, W / 2), r2.edge_poly(prof, -W / 2)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    out = []
    uf, vf = rf.project(cam, far)
    un, vn = rf.project(cam, near)
    out.append(r2.pt_res(uf, vf, FAR))
    out.append(r2.pt_res(un, vn, NEAR))
    for side, y in (('far', W / 2), ('near', -W / 2)):
        if side in END:
            u, v = rf.project(cam, np.array([[xe[0], y, ze[0]]]))
            out.append(np.array([u[0] - END[side][0], v[0] - END[side][1]]) * 1.5)
    r = np.concatenate(out)
    k = 5.0
    return k * np.sqrt(np.log1p((r / k) ** 2)), np.concatenate(out)


def fit_cam(prof, view, inits):
    FAR, NEAR, END = VIEWS[view][:3]
    best = None
    for c0 in inits:
        def fun(c):
            r, _ = cam_res(c, prof, FAR, NEAR, END)
            return np.concatenate([r, [c[5] / math.radians(3.0)]])   # weak roll prior
        c, cost = rf.lm(fun, np.array(c0, float), iters=60, verbose=False)
        if best is None or cost < best[1]:
            best = (c, cost)
    c, cost = best
    _, raw = cam_res(c, prof, FAR, NEAR, END)
    return c, cost, float(np.sqrt(np.mean(raw ** 2))), float(np.median(np.abs(raw)))


def inits_for(view):
    if view == 'W8':
        c = rf.cam_from_look((-38.1, -52.0, 1.6), (2.76, 0.0, 6.31), 3474.0)
        out = [list(c[0]) + [c[1], c[2], c[3], c[4]]]
        for eye in ((-60.0, -30.0, 1.6), (-50.0, -45.0, 3.0)):
            c = rf.cam_from_look(eye, (1.5, 0.0, 8.0), 3200.0)
            out.append(list(c[0]) + [c[1], c[2], c[3], c[4]])
        return out
    out = []
    for az, h, d in ((-130.0, 16.0, 70.0), (-145.0, 17.0, 80.0), (-115.0, 15.0, 60.0), (-160.0, 18.0, 90.0)):
        eye = np.array([d * math.cos(math.radians(az)), d * math.sin(math.radians(az)), h])
        c = rf.cam_from_look(eye, (3.0, 0.0, 5.0), 2300.0)
        # the ramp sits top-right in the elevated frame: aim a little left/below it
        out.append(list(c[0]) + [c[1] + math.radians(9.0), c[2] - math.radians(8.0), 0.0, c[4]])
    return out


def main():
    frames_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    grid = list(itertools.product((4.0, 6.0, 8.0, 10.0), (6.0, 9.0, 12.0, 15.0), (175.0, 180.0, 185.0)))
    cache_inits = {v: inits_for(v) for v in VIEWS}
    for r3, L, phid in grid:
        prof = make_profile(r3, L, phid)
        tot = 0.0
        rec = {'r3': r3, 'L': L, 'phid': phid}
        for v in VIEWS:
            c, cost, rms, med = fit_cam(prof, v, cache_inits[v])
            rec[v] = {'cost': round(cost, 1), 'rms': round(rms, 2), 'med': round(med, 2), 'cam': [float(x) for x in c]}
            tot += cost
        rec['tot'] = round(tot, 1)
        rows.append(rec)
        print('R3 %5.1f L %5.1f phid %5.1f  W8 rms %6.2f med %5.2f  EL rms %6.2f med %5.2f  tot %8.1f' % (
            r3, L, phid, rec['W8']['rms'], rec['W8']['med'], rec['EL']['rms'], rec['EL']['med'], tot), flush=True)
    rows.sort(key=lambda r: r['tot'])
    json.dump(rows, open(os.path.join(out_dir, 'grid.json'), 'w'), indent=1)
    for k, rec in enumerate(rows[:3]):
        prof = make_profile(rec['r3'], rec['L'], rec['phid'])
        for v, (_, _, _, f, roi) in VIEWS.items():
            c = rec[v]['cam']
            rf.draw_overlay(os.path.join(frames_dir, f), os.path.join(out_dir, 'best%d_%s.png' % (k, v)), prof,
                            [np.array(c[:3]), c[3], c[4], c[5], c[6]], roi)
        print('best %d: %s' % (k, json.dumps({kk: rec[kk] for kk in ('r3', 'L', 'phid', 'tot')})))


if __name__ == '__main__':
    main()
