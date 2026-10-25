"""rampfit5.py: joint fit with PHYSICAL camera priors (time-boxed, visually checked; not a general photogrammetry
tool). Main wide 8.0 s: eye on a tripod (z ~ 1.6 m), roll ~ 0. Elevated wide 44 s: drone (z 8-35 m), roll ~ 0.
Profile: floor-transition arc (phi1, R1), wall arc (phi2, R2), curl arc to the deck angle (R3), straight deck L.
Edge points as in rampfit2.py. Lengths in units of the W = 3.05 m slab-width estimate.

    python3 -I v4/tools/rampfit5.py FRAMES_DIR OUT_DIR [deck_deg]
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
r4 = _load('rampfit4')
W = rf.W_SLAB
PHID = 180.0


def profile_of(p):
    phi1, r1, phi2, r2_, r3, L = p
    phi1 = min(max(phi1, 60.0), 100.0)
    phi2 = min(max(phi2, phi1 + 1.0), PHID - 5.0)
    return rf.Profile([(phi1, abs(r1) + 1.0), (phi2, abs(r2_) + 1.0), (PHID, abs(r3) + 0.8)], abs(L))


def unpack(x):
    prof = profile_of(x[:6])
    w8 = [np.array(x[6:9]), x[9], x[10], x[11], x[12]]
    el = [np.array(x[13:16]), x[16], x[17], x[18], x[19]]
    return prof, {'W8': w8, 'EL': el}


def residuals(x, raw=False):
    prof, cams = unpack(x)
    a = r4.view_res(prof, cams['W8'], r2.W8_FAR, r2.W8_NEAR, r2.W8_END)
    b = r4.view_res(prof, cams['EL'], r2.EL_FAR, r2.EL_NEAR, r2.EL_END)
    if raw:
        return a, b
    r = np.concatenate([a, b])
    k = 4.0
    r = k * np.sqrt(np.log1p((r / k) ** 2))
    zel = x[15]
    pri = [(x[8] - 1.6) / 0.4, x[11] / math.radians(1.0),          # tripod height, no roll
           x[18] / math.radians(1.5),                                 # drone: no roll
           max(0.0, 8.0 - zel) / 0.5, max(0.0, zel - 35.0) / 0.5]
    return np.concatenate([r, np.array(pri)])


def main():
    global PHID
    frames_dir, out_dir = sys.argv[1], sys.argv[2]
    if len(sys.argv) > 3:
        PHID = float(sys.argv[3])
    os.makedirs(out_dir, exist_ok=True)
    best = None
    starts = []
    for w8az, w8d in ((-125.0, 66.0), (-150.0, 70.0), (-105.0, 75.0)):
        for elaz, eld, elz in ((-130.0, 70.0, 16.0), (-150.0, 80.0, 20.0), (-110.0, 60.0, 14.0)):
            starts.append((w8az, w8d, elaz, eld, elz))
    for w8az, w8d, elaz, eld, elz in starts:
        e8 = np.array([w8d * math.cos(math.radians(w8az)), w8d * math.sin(math.radians(w8az)), 1.6])
        c8 = rf.cam_from_look(e8, (1.0, 0.0, 7.5), 3300.0)
        ee = np.array([eld * math.cos(math.radians(elaz)), eld * math.sin(math.radians(elaz)), elz])
        ce = rf.cam_from_look(ee, (3.0, 0.0, 6.0), 2300.0)
        x0 = np.array([85.0, 5.5, 100.0, 12.0, 8.0, 7.0] + list(e8) + [c8[1], c8[2], 0.0, c8[4]] + list(ee)
                      + [ce[1] + math.radians(9.0), ce[2] - math.radians(8.0), 0.0, ce[4]], float)
        xs, cost = rf.lm(lambda x: residuals(x), x0, iters=150, verbose=False)
        prof, cams = unpack(xs)
        a, b = residuals(xs, raw=True)
        print('start w8 %s el %s -> cost %7.1f W8 rms %6.2f med %5.2f EL rms %6.2f med %5.2f | arcs %s deck %.2f | '
              'w8 eye %s f %.0f | el eye %s f %.0f' % (
                  (w8az, w8d), (elaz, eld, elz), cost, np.sqrt(np.mean(a ** 2)), np.median(np.abs(a)),
                  np.sqrt(np.mean(b ** 2)), np.median(np.abs(b)), [(round(p, 1), round(q, 2)) for p, q in prof.arcs],
                  prof.deck, cams['W8'][0].round(1).tolist(), cams['W8'][4], cams['EL'][0].round(1).tolist(),
                  cams['EL'][4]), flush=True)
        if best is None or cost < best[0]:
            best = (cost, xs)
    cost, xs = best
    prof, cams = unpack(xs)
    a, b = residuals(xs, raw=True)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    X, Z, _ = prof.at(np.linspace(0, prof.s_end, 600))
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
    json.dump(out, open(os.path.join(out_dir, 'fit5_%d.json' % int(PHID)), 'w'), indent=1)
    print(json.dumps(out, indent=1))
    for name, f, roi in (('W8', 'src_8.0.jpg', (760, 20, 1240, 920)), ('EL', 'src_44.0.jpg', (1250, 0, 1660, 440))):
        rf.draw_overlay(os.path.join(frames_dir, f), os.path.join(out_dir, 'fit5_%d_%s.png' % (int(PHID), name)),
                        prof, cams[name], roi)


if __name__ == '__main__':
    main()
