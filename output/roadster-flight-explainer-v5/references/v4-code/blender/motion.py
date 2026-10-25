"""motion.py: source-matched flight poses (pure Python, no bpy).

Wide shot D (source 5.155–15.415 s) is the reference. Screen positions come from the approximate source anchors
in data/source_wide_reference.json, back-projected through staging.WIDE_CAMERA. Depth along each ray is a smooth
straight-line fit to depth estimates from the anchors' body widths, so the rendered car centre lands on the source
anchors by construction. These are screen-space reconstructions, NOT measured 3D trajectory, height, speed or
angles.

Attitude is a roll about the car's long axis to its LEFT (the top turns toward the camera first), which reproduces
the observed surface order: side → canopy toward camera → inverted edge → underside → side, near level. The roll
and pitch keys are visual fits to the named surfaces, to be corrected against actual renders. Plumes are attached to
car-local nozzles, so their image direction rotates with the car as in the source.
"""
import json
import math
import os

import roadster
import staging
from geom import add, catmull, mul, sub

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'data', 'source_wide_reference.json'), encoding='utf-8') as fh:
    REFERENCE = json.load(fh)
ANCHORS = REFERENCE['wide_shot_D_anchors']
SHOT_D = (REFERENCE['cuts_s'][2], REFERENCE['source']['actual_video_end_s'])

# source time (s) → roll to the left (deg). Visual fit to the named surfaces at the anchors. proof-01 had 352° at
# 10.25 s: with the camera ~7° below the car that tilted the side glass away and exposed the floor, while the
# source already shows side glass above the white body there, so the roll is complete by ~10.25 s.
ROLL_KEYS = [(5.70, 0.0), (6.25, 4.0), (6.75, 28.0), (7.25, 62.0), (7.75, 102.0), (8.25, 168.0), (8.75, 212.0),
             (9.25, 268.0), (9.75, 318.0), (10.25, 358.5), (10.75, 360.0), (11.50, 360.0)]
# source time → nose-down pitch (deg), from the long axis' image tilt in full-resolution crops: nose lower by
# ≈3° (9.25), ≈8–9° (9.75), ≈3.5° (10.25), level by 10.75 s.
PITCH_KEYS = [(5.70, -2.0), (6.75, -1.0), (7.75, 0.0), (8.75, 1.5), (9.25, 3.0), (9.75, 9.0), (10.25, 3.5),
              (10.75, 0.5), (11.50, 0.0)]
# Heading (deg, world XY; 180 = nose toward image left, parallel to the image plane). Fitted to the visible red
# rear face, 19–22 % of the projected length at 10.25–10.5 s (proof-01's path-derived -168° showed ~10 %).
HEADING_DEG = 178.0
# source time windows (start, full, fade, end) for the schematic nozzles; the four under-body plumes are visible
# throughout the pass, the forward nose plume around 6.0–6.5 s and 10.0–10.6 s.
# The under-body plumes are faint inside the departure cloud at 6.25 s and clear from 6.75 s.
PLUME_WINDOWS = {
    'FL': [(6.0, 6.7, 10.9, 11.3)], 'FR': [(6.0, 6.7, 10.9, 11.3)],
    'RL': [(6.0, 6.7, 10.9, 11.3)], 'RR': [(6.0, 6.7, 10.9, 11.3)],
    'NOSE': [(5.70, 5.85, 6.35, 6.6), (9.95, 10.1, 10.5, 10.75)],    # first: the jet glow inside the cloud
    'SL': [(7.3, 7.5, 8.05, 8.35)],          # thin downward-left cue around 7.75 s
}
CAR_LENGTH, CAR_WIDTH, CAR_HEIGHT = 4.40, 2.02, 1.105


def pchip(keys):
    """Monotone cubic interpolation (Fritsch–Carlson) through (x, y) keys, clamped at the ends."""
    xs, ys = [k[0] for k in keys], [k[1] for k in keys]
    n = len(xs)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]]
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0:
            m.append(0.0)
        else:
            h0, h1 = xs[i] - xs[i - 1], xs[i + 1] - xs[i]
            w1, w2 = 2 * h1 + h0, h1 + 2 * h0
            m.append((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]))
    m.append(d[-1])

    def f(x):
        if x <= xs[0]:
            return ys[0]
        if x >= xs[-1]:
            return ys[-1]
        i = 0
        while x > xs[i + 1]:
            i += 1
        h = xs[i + 1] - xs[i]
        t = (x - xs[i]) / h
        t2, t3 = t * t, t * t * t
        return ((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1]
                + (t3 - t2) * h * m[i + 1])
    return f


roll_at = pchip(ROLL_KEYS)
pitch_at = pchip(PITCH_KEYS)


def _anchor_depths():
    """Depth along the camera axis for each anchor from its projected body width; a car crossing near-parallel to
    the image plane also shows its end face off-axis (≈ W·|tan θx|), and its depth extent is width or height
    depending on roll."""
    cam = staging.WIDE
    out = []
    for a in ANCHORS:
        x = a['center_xy_normalized'][0] * staging.SOURCE_W
        w_px = a['body_width_normalized'] * staging.SOURCE_W
        k = math.radians(roll_at(a['source_time_s']))
        depth_extent = CAR_WIDTH * abs(math.cos(k)) + CAR_HEIGHT * abs(math.sin(k))
        tan_x = abs(x - staging.SOURCE_W / 2) / cam.f_px
        out.append(cam.f_px * (CAR_LENGTH + depth_extent * tan_x) / w_px)
    return out


def _fit_line(ts, ds):
    n = len(ts)
    mt, md = sum(ts) / n, sum(ds) / n
    b = sum((t - mt) * (d - md) for t, d in zip(ts, ds)) / sum((t - mt) ** 2 for t in ts)
    return md - b * mt, b


ANCHOR_TIMES = [a['source_time_s'] for a in ANCHORS]
ANCHOR_DEPTH_RAW = _anchor_depths()
DEPTH_A, DEPTH_B = _fit_line(ANCHOR_TIMES, ANCHOR_DEPTH_RAW)
ANCHOR_POINTS = [staging.WIDE.at_depth(a['center_xy_normalized'][0] * staging.SOURCE_W,
                                       a['center_xy_normalized'][1] * staging.SOURCE_H, DEPTH_A + DEPTH_B * t)
                 for a, t in zip(ANCHORS, ANCHOR_TIMES)]
_path = [catmull([(t, p[k]) for t, p in zip(ANCHOR_TIMES, ANCHOR_POINTS)]) for k in range(3)]


def body_centre(t):
    """World position of the car's body centre (roadster.COM) at source time t; linear beyond the anchors."""
    t0, t1 = ANCHOR_TIMES[0], ANCHOR_TIMES[-1]
    if t < t0:
        v = mul(sub(ANCHOR_POINTS[1], ANCHOR_POINTS[0]), 1.0 / (ANCHOR_TIMES[1] - t0))
        return add(ANCHOR_POINTS[0], mul(v, t - t0))
    if t > t1:
        v = mul(sub(ANCHOR_POINTS[-1], ANCHOR_POINTS[-2]), 1.0 / (t1 - ANCHOR_TIMES[-2]))
        return add(ANCHOR_POINTS[-1], mul(v, t - t1))
    return tuple(f(t) for f in _path)


def rotation(heading_deg, pitch_down_deg, roll_left_deg):
    """3x3 R = Rz(heading) · Ry(pitch, nose down positive) · Rx(-roll): roll about the car's own long axis."""
    h, p, r = math.radians(heading_deg), math.radians(pitch_down_deg), math.radians(-roll_left_deg)
    ch, sh, cp, sp, cr, sr = math.cos(h), math.sin(h), math.cos(p), math.sin(p), math.cos(r), math.sin(r)
    rz = ((ch, -sh, 0.0), (sh, ch, 0.0), (0.0, 0.0, 1.0))
    ry = ((cp, 0.0, sp), (0.0, 1.0, 0.0), (-sp, 0.0, cp))
    rx = ((1.0, 0.0, 0.0), (0.0, cr, -sr), (0.0, sr, cr))
    return matmul3(matmul3(rz, ry), rx)


def matmul3(a, b):
    return tuple(tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)) for i in range(3))


def matrix4(R, origin):
    return [[R[0][0], R[0][1], R[0][2], origin[0]], [R[1][0], R[1][1], R[1][2], origin[1]],
            [R[2][0], R[2][1], R[2][2], origin[2]], [0.0, 0.0, 0.0, 1.0]]


def pose_matrix(centre, heading_deg, pitch_deg, roll_deg):
    """Car-object matrix placing roadster.COM at `centre` (rotations pivot about the body centre)."""
    R = rotation(heading_deg, pitch_deg, roll_deg)
    com = roadster.COM
    rc = tuple(sum(R[i][k] * com[k] for k in range(3)) for i in range(3))
    return matrix4(R, sub(centre, rc))


def plume_level(name, t):
    level = 0.0
    for a, b, c, d in PLUME_WINDOWS.get(name, ()):
        if a < t < d:
            up = 1.0 if t >= b else (t - a) / (b - a)
            down = 1.0 if t <= c else (d - t) / (d - c)
            level = max(level, min(up, down))
    return level


def wide_pose(t):
    """Car pose and plume levels for the wide camera at source time t (seconds in the 15.4 s source clip)."""
    roll, pitch = roll_at(t), pitch_at(t)
    centre = body_centre(t)
    return {
        'source_time_s': t,
        'shot': 'D' if SHOT_D[0] <= t <= SHOT_D[1] else 'outside D',
        'centre': centre,
        'heading_deg': HEADING_DEG,
        'pitch_down_deg': pitch,
        'roll_left_deg': roll,
        'matrix': pose_matrix(centre, HEADING_DEG, pitch, roll),
        'plumes': {n: plume_level(n, t) for n in roadster.NOZZLES},
        'projected_centre_px': staging.WIDE.project(centre)[:2],
    }


def source_anchor(t, tol=0.13):
    """Nearest wide-shot anchor (dict) within tol seconds, else None."""
    best = min(ANCHORS, key=lambda a: abs(a['source_time_s'] - t))
    return best if abs(best['source_time_s'] - t) <= tol else None


def source_keyframe_image(t, tol=0.13):
    best = min(REFERENCE['keyframe_images'], key=lambda k: abs(k['source_time_s'] - t))
    return best['image'] if abs(best['source_time_s'] - t) <= tol else None


# ----------------------------------------------------------------------------------------------- cloud
# Expanding gas/dust cloud, wide shot. The source's shot D opens on the clean lot (5.2 s): the cloud first shows at
# the far right around 5.6–5.8 s where the car emerges, spreads low toward the centre and climbs high behind the
# right foreground post, covers the pickup/coupe and the right side of the tall truck by ~10.25 s, gathers a low
# cloud at the left where the car descends, and by 11–14 s fills most of the background above the lineup.
# Puffs are flattened ellipsoids placed from source pixels at assumed depths; densities stay low so they read as
# diffuse, backlit gas rather than solids. Visual fit to the source frames, not a measurement.
CLOUD_PUFFS = [
    # (source px x, y, depth m, centre height m, born s, radius at birth m, growth m/s, max radius m, density,
    #  vertical flattening)
    # dense core where the car rises out of the cloud (5.7–6.1 s): the liftoff itself is never visible
    (1605, 652, 32.0, 1.7, 5.40, 2.2, 0.9, 4.0, 0.95, 0.85),
    (1520, 650, 34.0, 1.6, 5.45, 1.4, 1.4, 6.5, 0.45, 0.70),
    (1660, 625, 37.0, 2.4, 5.50, 1.6, 1.3, 7.0, 0.40, 0.70),
    (1400, 668, 32.0, 1.2, 5.60, 1.2, 1.2, 6.0, 0.40, 0.70),
    (1800, 600, 40.0, 3.0, 5.65, 1.8, 1.1, 7.5, 0.35, 0.75),
    (1270, 680, 31.0, 1.0, 6.60, 1.0, 0.9, 6.0, 0.38, 0.70),
    (1110, 686, 30.0, 0.9, 7.40, 0.8, 0.9, 6.0, 0.34, 0.70),
    (1600, 560, 36.0, 5.0, 7.00, 1.5, 0.9, 7.0, 0.28, 0.80),
    (1780, 470, 33.0, 8.0, 7.60, 1.5, 0.9, 6.5, 0.24, 0.85),
    (1350, 600, 35.0, 4.5, 8.00, 1.5, 0.9, 6.5, 0.26, 0.80),
    (1000, 640, 33.0, 3.0, 8.60, 1.2, 1.0, 6.0, 0.26, 0.75),
    (210, 690, 26.0, 0.6, 10.10, 0.5, 1.4, 4.5, 0.45, 0.70),
    (90, 700, 24.0, 0.5, 10.40, 0.5, 1.4, 4.5, 0.45, 0.70),
    (420, 660, 28.0, 1.5, 10.60, 0.8, 1.2, 5.5, 0.35, 0.70),
    (700, 600, 36.0, 4.0, 11.00, 1.5, 1.1, 8.0, 0.24, 0.80),
    (300, 580, 34.0, 4.5, 11.50, 1.5, 1.1, 8.0, 0.22, 0.80),
    (1150, 520, 40.0, 7.0, 10.50, 2.0, 1.0, 9.0, 0.20, 0.85),
    (1550, 480, 42.0, 9.0, 10.00, 2.0, 1.0, 9.5, 0.18, 0.85),
]


def cloud_state(t):
    out = []
    for k, (px, py, depth, zc, born, r0, grow, rmax, dens, flat) in enumerate(CLOUD_PUFFS):
        if t < born:
            continue
        base = staging.WIDE.ground_below(px, py, depth)
        r = min(rmax, r0 + grow * (t - born))
        out.append({'name': 'cloud_%d' % k, 'centre': (base[0], base[1], max(zc, 0.45 * r)), 'radius': r,
                    'flatten': flat, 'density': dens * min(1.0, 0.4 + (t - born))})
    return out


# ----------------------------------------------------------------------------------------------- model views
# Close views of the same model in the same lot for shape review (not source shots). Car parked on the lot.
# cam_local / look_local are in car space; heading points the nose; lens in mm.
STUDIO_VIEWS = {
    'beauty_front': {'origin': (-3.0, 13.0, 0.0), 'heading_deg': -142.0, 'roll_left_deg': 0.0,
                     'cam_local': (5.7, 3.9, 1.30), 'look_local': (0.15, 0.0, 0.55), 'lens_mm': 40.0, 'fstop': 4.0},
    'beauty_rear': {'origin': (-3.0, 13.0, 0.0), 'heading_deg': -142.0, 'roll_left_deg': 0.0,
                    'cam_local': (-5.9, 3.6, 1.45), 'look_local': (-0.2, 0.0, 0.55), 'lens_mm': 40.0, 'fstop': 4.0},
    'plan_top': {'origin': (-3.0, 13.0, 0.0), 'heading_deg': -142.0, 'roll_left_deg': 0.0,
                 'cam_local': (0.0, 0.0, 14.0), 'look_local': (0.0, 0.0, 0.5), 'lens_mm': 85.0, 'fstop': None,
                 'up_local': (0.0, 1.0, 0.0)},
    'plan_under': {'origin': (-3.0, 13.0, 1.25), 'heading_deg': -142.0, 'roll_left_deg': 180.0,
                   'cam_local': (0.0, 0.0, 14.0), 'look_local': (0.0, 0.0, 0.5), 'lens_mm': 85.0, 'fstop': None,
                   'up_local': (0.0, 1.0, 0.0)},
}


def studio_pose(view):
    v = STUDIO_VIEWS[view]
    R = rotation(v['heading_deg'], 0.0, v['roll_left_deg'])
    if v['roll_left_deg']:      # inverted display: pivot about the body centre, lifted to origin height
        mat = pose_matrix(add(v['origin'], roadster.COM), v['heading_deg'], 0.0, v['roll_left_deg'])
    else:
        mat = matrix4(R, v['origin'])
    Rh = rotation(v['heading_deg'], 0.0, 0.0)

    def world(p):
        return add(add(v['origin'], (0.0, 0.0, 0.0)), tuple(sum(Rh[i][k] * p[k] for k in range(3)) for i in range(3)))
    up = v.get('up_local')
    return {'matrix': mat, 'camera': world(v['cam_local']), 'target': world(v['look_local']),
            'up': tuple(sum(Rh[i][k] * up[k] for k in range(3)) for i in range(3)) if up else (0.0, 0.0, 1.0),
            'lens_mm': v['lens_mm'], 'fstop': v['fstop'], 'roll_left_deg': v['roll_left_deg'],
            'heading_deg': v['heading_deg'], 'plumes': {n: 0.0 for n in roadster.NOZZLES}}


if __name__ == '__main__':
    print('heading %.1f°, depth(t) = %.2f %+.2f·t m' % (HEADING_DEG, DEPTH_A, DEPTH_B))
    for a, d in zip(ANCHORS, ANCHOR_DEPTH_RAW):
        t = a['source_time_s']
        p = wide_pose(t)
        cx, cy = p['projected_centre_px']
        ax, ay = a['center_xy_normalized'][0] * 1920, a['center_xy_normalized'][1] * 1080
        c = p['centre']
        print(f"t {t:6.3f}  raw depth {d:5.1f}  centre ({c[0]:6.2f}, {c[1]:6.2f}, {c[2]:5.2f})  "
              f"roll {p['roll_left_deg']:5.1f}  pitch {p['pitch_down_deg']:4.1f}  proj ({cx:6.1f}, {cy:6.1f}) vs anchor ({ax:6.1f}, {ay:6.1f})")
