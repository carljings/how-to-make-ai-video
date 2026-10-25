"""export_kickflip.py: freeze the v4 kickflip staging and flight fit for the v5 WebGL engine (pure Python, no bpy).

Reads the v4 reference modules in references/v4-code/blender:

- staging.py: the source night lot, fitted by eye to the clean wide frame. It has the parked lineup (generic
  stand-ins), the poles and overhead lines, the trailer-jack post and the lights.
- motion.py: the source-matched flight poses, the roll to the left, the plume windows and the cloud puffs.

Their geom.py / roadster.py / v3_ramp.py are byte-identical to this folder's snapshot, so the car-local frame is the
one already in web/assets/car.json. Nothing is refitted: these are the v4 numbers, approximate and inferred from
one video, not measurements and not factory CAD.

Writes:

- web/assets/lot.{json,bin}: meshes, same layout as car/scene.
- web/assets/kickflip.json: poses at 240 Hz of source time, plume levels, cloud puffs, the overhead-line polylines
  (drawn as constant-width lines by the engine; they stay visible, and their role is not stated), the lights and the
  source wide camera.

World frame (v4 staging): +Z up, ground z = 0, the source wide camera at (0, 0, 1.25) looks along +Y, +X is image
right.

    python3 geometry/export_kickflip.py
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
V4 = os.path.join(os.path.dirname(HERE), 'references', 'v4-code', 'blender')
sys.path.insert(0, V4)
sys.path.insert(0, HERE)          # geom / roadster / v3_ramp resolve to this snapshot (identical bytes)

import roadster  # noqa: E402
import staging  # noqa: E402
import motion  # noqa: E402
from geom import Mesh, add, mul, sub  # noqa: E402
from export_v5 import triangulate, write_bin  # noqa: E402

OUT = os.path.join(os.path.dirname(HERE), 'web', 'assets')
LOT_MATS = ['lineup_white', 'lineup_red', 'truck_white', 'steel', 'bronze', 'lineup_glass', 'lineup_under',
            'lineup_rim', 'tyre', 'trim_dark', 'lamp_white_dim', 'zinc', 'jack_steel', 'wood_pole', 'pale_structure',
            'tent_grey', 'equipment_orange', 'cable']
T0, T1, HZ = 5.0, 12.0, 240


def without(mesh, mat):
    keep = Mesh()
    keep.verts = list(mesh.verts)
    for f, m, uv in zip(mesh.faces, mesh.mats, mesh.uvs):
        if m != mat:
            keep.faces.append(f)
            keep.mats.append(m)
            keep.uvs.append(uv)
    return keep.remove_unused()


def overhead_lines():
    """The polylines of staging.poles_and_lines()'s cables (same anchors and catenary formula, 48 segments)."""
    def catenary(a, b, sag, n=48):
        span = math.dist(a, b)
        pts = []
        for k in range(n + 1):
            t = k / n
            p = add(a, mul(sub(b, a), t))
            pts.append([round(p[0], 4), round(p[1], 4), round(p[2] - 4 * sag * span * t * (1 - t), 4)])
        return pts
    W = staging.WIDE
    top = W.at_depth(*staging.POLE_TOP_PX, staging.POLE_DEPTH)
    tower = W.at_depth(*staging.TOWER_TOP_PX, staging.TOWER_DEPTH)
    lines = []
    for k, (px, py) in enumerate(staging.LINE_LEFT_PX):
        far = W.at_depth(px - 260, py - 90, staging.LINE_LEFT_DEPTH)
        end = add(top, (0.0, -1.1 + 0.55 * k, -0.40 - 0.2 * (k == 3)))
        lines.append({'radius': 0.02, 'points': catenary(far, end, 0.012)})
        if k < 3:
            lines.append({'radius': 0.05, 'points': catenary(end, add(tower, (0.0, -0.3 + 0.3 * k, -0.2)), 0.010)})
    return lines


def export_lot():
    props = staging.build_props()
    mi = {n: i for i, n in enumerate(LOT_MATS)}
    parts = {}
    lineup = Mesh()
    for k, v in props.items():
        if k.startswith('lineup_'):
            lineup.extend(v)
    lineup.weld()
    parts['lineup'] = triangulate(lineup, mi, crease_deg=38.0)
    props_mesh = Mesh()
    props_mesh.extend(without(props['poles_lines'], 'cable'))
    props_mesh.extend(props['jack_post'])
    props_mesh.extend(props['background'])
    props_mesh.weld()
    parts['props'] = triangulate(props_mesh, mi, crease_deg=40.0)
    meta = {
        'materials': LOT_MATS,
        'lineup': [{'kind': kind, 'origin': list(staging.lineup_origin(bbox, heading, staging.VEHICLE_LWH[kind])),
                    'heading_deg': heading, 'lwh': list(staging.VEHICLE_LWH[kind])}
                   for kind, bbox, heading, _ in staging.LINEUP],
        'note': 'v4 staging (fitted by eye to the source wide frame; lens/height assumed; lineup = generic stand-ins).',
    }
    return write_bin(os.path.join(OUT, 'lot.json'), os.path.join(OUT, 'lot.bin'), parts, meta)


def export_flight():
    n = int(round((T1 - T0) * HZ)) + 1
    mats, plumes, roll, pitch, centre = [], [], [], [], []
    names = ['NOSE', 'FL', 'FR', 'RL', 'RR', 'SL']
    for i in range(n):
        t = T0 + i / HZ
        p = motion.wide_pose(t)
        M = p['matrix']
        mats.append([round(M[r][c], 6) for c in range(4) for r in range(3)])   # column-major 3x4 (x, y, z, o)
        plumes.append([round(p['plumes'].get(k, 0.0), 4) for k in names])
        roll.append(round(p['roll_left_deg'], 3))
        pitch.append(round(p['pitch_down_deg'], 3))
        centre.append([round(x, 4) for x in p['centre']])
    W = staging.WIDE
    puffs = []
    for k, (px, py, depth, zc, born, r0, grow, rmax, dens, flat) in enumerate(motion.CLOUD_PUFFS):
        base = W.ground_below(px, py, depth)
        puffs.append({'x': round(base[0], 3), 'y': round(base[1], 3), 'zc': zc, 'born': born, 'r0': r0,
                      'grow': grow, 'rmax': rmax, 'density': dens, 'flatten': flat})
    lights = [{k: (list(v) if isinstance(v, tuple) else v) for k, v in L.items()} for L in staging.LIGHTS if not L.get('studio')]
    data = {
        'about': 'v4 motion.wide_pose sampled at 240 Hz of the kickflip source clock (wide shot D, 5.155-15.415 s). '
                 'Screen-space reconstruction through an assumed lens: not a measured trajectory, height, speed or '
                 'angle. Roll is one turn to the left about the long axis; plumes follow the observed windows.',
        't0': T0, 'hz': HZ, 'count': n, 'plume_names': names,
        'matrix_layout': 'column-major 3x4: X axis, Y axis, Z axis, origin (car-local to world)',
        'matrices': mats, 'plumes': plumes, 'roll_left_deg': roll, 'pitch_down_deg': pitch, 'centre': centre,
        'roll_keys': motion.ROLL_KEYS, 'plume_windows': motion.PLUME_WINDOWS,
        'cloud_puffs': puffs,
        'cloud_rule': 'r = min(rmax, r0 + grow * (t - born)); centre = (x, y, max(zc, 0.45 r)); '
                      'density = density * min(1, 0.4 + (t - born)); vertical flattening = flatten',
        'overhead_lines': overhead_lines(),
        'lights': lights,
        'wide_camera': {'location': list(W.loc), 'forward': list(W.fwd), 'up': list(W.up), 'right': list(W.right),
                        'f_px_1920': W.f_px, 'spec': staging.WIDE_CAMERA},
    }
    with open(os.path.join(OUT, 'kickflip.json'), 'w', encoding='utf-8') as fh:
        json.dump(data, fh, separators=(',', ':'))
    return n


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    lot = export_lot()
    print('lot:', {k: (v['vertices'], v['indices'] // 3) for k, v in lot['parts'].items()}, lot['bytes'], 'bytes')
    print('kickflip poses:', export_flight(), 'samples')
