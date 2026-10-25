"""export_v5.py: freeze the v4 source-fitted geometry and poses for the v5 WebGL engine (pure Python, no bpy).

Reads the frozen snapshot modules in this folder (geom.py, roadster.py, v3_ramp.py; hashes in SNAPSHOT.sha256) and
writes web/assets/{car,scene}.{json,bin} and poses.json. Nothing here refits anything: the ramp profile, climb keys,
airborne keys, nozzles and car shape are exactly the v4 fit (approximate, inferred from video; not factory CAD).

World frame (unchanged from v4): +X from the approach toward the ramp, +Y across, +Z up; metres. Car-local: +X
forward, +Y left, +Z up, origin on the ground plane at the wheelbase centre.

    python3 geometry/export_v5.py            # writes ../web/assets/
"""
import json
import math
import os
import struct
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import geom  # noqa: E402
import roadster  # noqa: E402
import v3_ramp as R  # noqa: E402
from geom import Mesh  # noqa: E402

OUT = os.path.join(os.path.dirname(HERE), 'web', 'assets')

CAR_MATS = ['paint', 'glass', 'satin_black', 'underbody', 'panel_gap', 'liner', 'lamp_white', 'lamp_red',
            'lamp_amber', 'under_frame', 'nozzle', 'tyre', 'rim', 'rim_dark', 'brake', 'caliper', 'fan']
SCENE_MATS = ['concrete', 'slab_back', 'slab_side', 'neon_red', 'neon_white', 'lattice', 'floor_red', 'paint_line',
              'lamp_disc', 'centre_line']


# ----------------------------------------------------------------------------------------------- mesh → buffers
def triangulate(mesh, mat_index, crease_deg=40.0, extra=None):
    """Indexed triangles with crease-split smooth normals. extra(vertex_pos, face_i, corner) -> tuple of floats
    (per-corner extra attributes, e.g. ramp (u, s)). Returns dict of flat lists."""
    verts = mesh.verts
    fnorm = []
    for f in mesh.faces:
        n = geom.face_normal(verts, f)
        fnorm.append(geom.norm(n))
    inc = [[] for _ in verts]
    for fi, f in enumerate(mesh.faces):
        for c, vi in enumerate(f):
            inc[vi].append((fi, c))
    cos_t = math.cos(math.radians(crease_deg))
    pos, nor, mat, ext, idx = [], [], [], [], []
    corner_out = {}
    for vi, lst in enumerate(inc):
        # greedy clustering of incident faces by normal similarity
        clusters = []
        for fi, c in lst:
            n = fnorm[fi]
            placed = False
            for cl in clusters:
                if geom.dot(cl['n0'], n) >= cos_t and mesh.mats[fi] == cl['mat']:
                    cl['faces'].append((fi, c))
                    placed = True
                    break
            if not placed:
                clusters.append({'n0': n, 'mat': mesh.mats[fi], 'faces': [(fi, c)]})
        for cl in clusters:
            acc = (0.0, 0.0, 0.0)
            for fi, c in cl['faces']:
                # angle-weighted contribution
                f = mesh.faces[fi]
                p0, p1, p2 = verts[f[c - 1]], verts[f[c]], verts[f[(c + 1) % len(f)]]
                a = geom.norm(geom.sub(p0, p1))
                b = geom.norm(geom.sub(p2, p1))
                ang = math.acos(max(-1.0, min(1.0, geom.dot(a, b))))
                acc = geom.add(acc, geom.mul(fnorm[fi], ang))
            n = geom.norm(acc)
            # extra attributes are per corner; clusters may hold corners with different UVs, so split per extra key
            groups = {}
            for fi, c in cl['faces']:
                key = tuple(round(v, 5) for v in extra(verts[vi], fi, c)) if extra else ()
                groups.setdefault(key, []).append((fi, c))
            for key, fcs in groups.items():
                out_i = len(pos) // 3
                pos.extend(verts[vi])
                nor.extend(n)
                mat.append(mat_index[cl['mat']])
                ext.extend(key)
                for fi, c in fcs:
                    corner_out[(fi, c)] = out_i
    for fi, f in enumerate(mesh.faces):
        o = [corner_out[(fi, c)] for c in range(len(f))]
        for k in range(1, len(o) - 1):
            idx.extend((o[0], o[k], o[k + 1]))
    return {'pos': pos, 'nor': nor, 'mat': mat, 'ext': ext, 'idx': idx}


def write_bin(path_json, path_bin, parts, extra_meta):
    """parts: {name: buffers}. Layout per part: pos f32×3, nor f32×3, mat u8, ext f32×k, idx u32."""
    meta = {'parts': {}, **extra_meta}
    blob = bytearray()

    def align():
        while len(blob) % 4:
            blob.append(0)

    for name, b in parts.items():
        nv = len(b['pos']) // 3
        k = len(b['ext']) // nv if nv and b['ext'] else 0
        entry = {'vertices': nv, 'indices': len(b['idx']), 'ext_components': k}
        align()
        entry['pos'] = len(blob)
        blob += struct.pack('<%df' % len(b['pos']), *b['pos'])
        entry['nor'] = len(blob)
        blob += struct.pack('<%df' % len(b['nor']), *b['nor'])
        entry['mat'] = len(blob)
        blob += struct.pack('<%dB' % len(b['mat']), *b['mat'])
        align()
        if k:
            entry['ext'] = len(blob)
            blob += struct.pack('<%df' % len(b['ext']), *b['ext'])
        entry['idx'] = len(blob)
        blob += struct.pack('<%dI' % len(b['idx']), *b['idx'])
        meta['parts'][name] = entry
    with open(path_bin, 'wb') as fh:
        fh.write(blob)
    meta['bytes'] = len(blob)
    with open(path_json, 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, indent=1)
    return meta


# ----------------------------------------------------------------------------------------------- car
def fan_grilles():
    """Schematic fan intakes in the floor at v4's FAN_POINTS (car-local), facing down (−Z, into the gap when the car
    is on a surface). Not hardware: count, size and placement are illustrative."""
    m = Mesh()
    for (fx, fy, fz) in ((0.62, 0.0, 0.12), (-0.68, 0.0, 0.12)):
        R0, n = 0.28, 40
        z = 0.126 - 0.004
        # ring
        ring_o = [m.add_vert((fx + R0 * math.cos(2 * math.pi * k / n), fy + R0 * math.sin(2 * math.pi * k / n), z))
                  for k in range(n)]
        ring_i = [m.add_vert((fx + 0.86 * R0 * math.cos(2 * math.pi * k / n),
                              fy + 0.86 * R0 * math.sin(2 * math.pi * k / n), z)) for k in range(n)]
        for k in range(n):
            k1 = (k + 1) % n
            m.add_face((ring_o[k], ring_i[k], ring_i[k1], ring_o[k1]), 'fan')
        # recessed dark disc with blades (blades are drawn by the shader from the 'fan' material's local coords)
        c = m.add_vert((fx, fy, z + 0.03))
        for k in range(n):
            k1 = (k + 1) % n
            m.add_face((c, ring_i[k1], ring_i[k]), 'fan')
    return m


def export_car():
    parts = roadster.build()
    body = Mesh()
    for k in ('body', 'arch_liners', 'lights', 'underbody'):
        body.extend(parts[k])
    body.extend(fan_grilles())
    body.weld()
    mi = {n: i for i, n in enumerate(CAR_MATS)}
    out = {'body': triangulate(body, mi, crease_deg=38.0)}
    for rear in (False, True):
        rot, st = roadster.wheel(rear)
        rot.weld()
        st.weld()
        tag = 'R' if rear else 'F'
        out['wheel' + tag] = triangulate(rot, mi, crease_deg=42.0)
        out['wheelStatic' + tag] = triangulate(st, mi, crease_deg=42.0)
    meta = {
        'materials': CAR_MATS,
        'wheel_placements': [{'name': n, 'centre': c, 'side': s} for n, c, s in roadster.wheel_placements()],
        'dims': roadster.DIMENSIONS,
        'nozzles': {k: {'pos': v[0], 'dir': v[1]} for k, v in roadster.NOZZLES.items()},
        'fan_points': [[0.62, 0.0, 0.12], [-0.68, 0.0, 0.12]],
        'floor_span': list(R.FLOOR_SPAN),
        'com': list(roadster.COM),
        'x_nose': roadster.X_NOSE, 'x_tail': roadster.X_TAIL,
        'wheel_r': roadster.WHEEL_R, 'axle_f': roadster.AXLE_F, 'axle_r': roadster.AXLE_R,
        'track_y': roadster.TRACK_Y,
        'note': 'Inferred from video frames (v4 roadster.py snapshot); fans/nozzles schematic; not factory CAD.',
    }
    # sampled underside z_floor / w_floor / outline for the engine's analytic gap and glint sampling
    meta['floor_profile'] = [[x, roadster.z_floor(x), roadster.w_floor(x), roadster.half_w(x), roadster.z_crown(x),
                              roadster.z_rocker(x)] for x in [roadster.X_TAIL + 0.05 * k for k in range(89)]]
    return write_bin(os.path.join(OUT, 'car.json'), os.path.join(OUT, 'car.bin'), out, meta)


# ----------------------------------------------------------------------------------------------- ramp scene
def ramp_mesh():
    """v4 slab swept along the fitted profile (render_v3.ramp_mesh, full width): driving face (ext: u across from the
    near edge in m, s along), back, sides, lip end."""
    m = Mesh()
    W, T = R.RAMP_W, R.SLAB_T
    y0 = -W / 2
    n_s, n_w = 360, 8
    s0, s1 = -R.RUNIN, R.S_LIP
    rows_top, rows_bot = [], []
    ys = [y0 + (W / 2 - y0) * j / n_w for j in range(n_w + 1)]
    for i in range(n_s + 1):
        s = s0 + (s1 - s0) * i / n_s
        p, _, nrm, _ = R.surface_frame(s)
        t = T if s > 0.0 else 0.02
        top = [m.add_vert((p[0], y, p[2])) for y in ys]
        back = R.sub(p, R.mul(nrm, t)) if s > 0.0 else (p[0], 0.0, p[2] - 0.02)
        bot = [m.add_vert((back[0], y, back[2])) for y in ys]
        rows_top.append((top, s))
        rows_bot.append(bot)
    for i in range(n_s):
        (a, sa), (b, sb) = rows_top[i], rows_top[i + 1]
        for j in range(n_w):
            m.add_face((a[j], a[j + 1], b[j + 1], b[j]), 'concrete')
        c, d = rows_bot[i], rows_bot[i + 1]
        for j in range(n_w):
            m.add_face((c[j], d[j], d[j + 1], c[j + 1]), 'slab_back')
        m.add_face((a[0], b[0], d[0], c[0]), 'slab_side')
        m.add_face((a[-1], c[-1], d[-1], b[-1]), 'slab_side')
    a, c = rows_top[-1][0], rows_bot[-1]
    for j in range(n_w):
        m.add_face((a[j], c[j], c[j + 1], a[j + 1]), 'slab_side')
    return m


NEON_WHITE_S = 7.5    # v4 LOOK_BASE['neon_white']: the source's edge neon is white below this arc length, red above


def neon_mesh(side, mat, s_from, s_to):
    m = Mesh()
    n = max(8, int((s_to - s_from) / 0.1))
    ss = [s_from + (s_to - s_from) * k / n for k in range(n + 1)]
    y = side * (R.RAMP_W / 2 - 0.04)
    pts = []
    for s_ in ss:
        p, _, nrm, _ = R.surface_frame(s_)
        pts.append(R.add((p[0], y, p[2]), R.mul(nrm, 0.035)))
    m.extend(geom.tube(pts, 0.032, 10, mat))
    return m


def centre_line():
    """Painted white centre line on the driving face (source: one continuous line), 0.1 m wide, 4 mm proud."""
    m = Mesh()
    n = 360
    rows = []
    for i in range(n + 1):
        s = -R.RUNIN + (R.S_LIP + R.RUNIN) * i / n
        p, _, nrm, _ = R.surface_frame(s)
        q = R.add(p, R.mul(nrm, 0.004))
        rows.append((m.add_vert((q[0], -0.05, q[2])), m.add_vert((q[0], 0.05, q[2]))))
    for (a0, a1), (b0, b1) in zip(rows, rows[1:]):
        m.add_face((a0, a1, b1, b0), 'centre_line')
    return m


def truss_lines():
    """Verbatim v4 v3_film.truss_lines (lattice tower behind the wall, gantry over the deck, hangers)."""
    out = []
    W2 = R.RAMP_W / 2 + 0.15
    xs = max(R.profile(R.S_LIP * k / 300)[0] for k in range(301)) + R.SLAB_T + 0.45
    xb = xs + 2.1
    z_bot = R.DECK_H + R.SLAB_T + 0.95
    z_top = z_bot + 1.55
    x_end = R.LIP[0] - 0.6
    for x in (xs, xb):
        for y in (-W2, W2):
            out.append(((x, y, 0.0), (x, y, z_top), 0.075))
    z = 0.0
    while z <= z_top + 1e-6:
        for y in (-W2, W2):
            out.append(((xs, y, z), (xb, y, z), 0.045))
        for x in (xs, xb):
            out.append(((x, -W2, z), (x, W2, z), 0.045))
        z += 2.0
    z = 0.0
    while z + 2.0 <= z_top + 1e-6:
        for y in (-W2, W2):
            out.append(((xs, y, z), (xb, y, z + 2.0), 0.035))
            out.append(((xb, y, z), (xs, y, z + 2.0), 0.035))
        out.append(((xb, -W2, z), (xb, W2, z + 2.0), 0.035))
        z += 2.0
    s = 3.0
    while s < R.S_DECK - 0.4:
        p, _, nrm, _ = R.surface_frame(s)
        back = R.sub(p, R.mul(nrm, R.SLAB_T))
        if back[2] < z_bot - 0.3:
            for y in (-W2, W2):
                out.append(((back[0], y, back[2]), (xs, y, back[2]), 0.05))
        s += 1.6
    for y in (-W2, W2):
        out.append(((xb, y, z_bot), (x_end, y, z_bot), 0.07))
        out.append(((xb, y, z_top), (x_end, y, z_top), 0.07))
    x, k = xb, 0
    step = 1.6
    while x - step >= x_end - 1e-6:
        for y in (-W2, W2):
            out.append(((x, y, z_bot), (x, y, z_top), 0.04))
            a, b = ((x, y, z_bot), (x - step, y, z_top)) if k % 2 == 0 else ((x, y, z_top), (x - step, y, z_bot))
            out.append((a, b, 0.035))
        out.append(((x, -W2, z_top), (x, W2, z_top), 0.04))
        out.append(((x, -W2, z_bot), (x, W2, z_bot), 0.04))
        x -= step
        k += 1
    x = R.DECK_START[0] + 1.6
    while x >= R.LIP[0] + 0.2:
        for y in (-W2 + 0.25, W2 - 0.25):
            out.append(((x, y, R.DECK_H + R.SLAB_T), (x, y, z_bot), 0.05))
        x -= 1.6
    meta = {'xs': xs, 'xb': xb, 'z_bot': z_bot, 'z_top': z_top, 'x_end': x_end, 'W2': W2}
    return out, meta


def export_scene():
    mi = {n: i for i, n in enumerate(SCENE_MATS)}
    ramp = ramp_mesh()
    ramp.weld()

    def ramp_extra(p, fi, c):
        # (u across in metres from the near edge, s along the surface): computed from the vertex for driving face;
        # zeros elsewhere (the shader uses world position for those)
        return (p[1] + R.RAMP_W / 2, R.closest_s(p, lo=-R.RUNIN, hi=R.S_LIP, steps=120)) \
            if ramp.mats[fi] == 'concrete' else (0.0, 0.0)

    parts = {'ramp': triangulate(ramp, mi, crease_deg=30.0, extra=ramp_extra)}
    neon = Mesh()
    for side in (-1, 1):
        neon.extend(neon_mesh(side, 'neon_white', 0.0, NEON_WHITE_S))
        neon.extend(neon_mesh(side, 'neon_red', NEON_WHITE_S, R.S_LIP))
    lines, tmeta = truss_lines()
    W2 = tmeta['W2']
    for y in (-W2, W2):           # red edge light along the gantry's top chords (v4 lattice_mesh)
        neon.extend(geom.tube([(tmeta['xb'], y, tmeta['z_top'] + 0.09), (tmeta['x_end'], y, tmeta['z_top'] + 0.09)],
                              0.035, 8, 'neon_red'))
    neon.extend(centre_line())
    parts['neon'] = triangulate(neon, mi, crease_deg=70.0)
    lat = Mesh()
    for a, b, r in lines:
        lat.extend(geom.cylinder_between(a, b, r, 8 if r >= 0.06 else 6, 'lattice'))
    parts['lattice'] = triangulate(lat, mi, crease_deg=75.0)
    venue = Mesh()
    xs = tmeta['xs']
    x0, x1, y0 = 0.0, xs + 2.1 + 1.4, R.RAMP_W / 2 + 1.1     # v4 floor_neon_mesh: red outline around the base
    pts = [(x0, -y0, 0.04), (x1, -y0, 0.04), (x1, y0, 0.04), (x0, y0, 0.04)]
    for a, b in zip(pts[:-1], pts[1:]):
        venue.extend(geom.tube([a, b], 0.03, 6, 'floor_red', caps=False))
    for ang in (31.0, -31.0):     # v4 venue_mesh: two long white lines crossing in front of the ramp
        venue.extend(geom.box((-14.0, 0.0, 0.004), (160.0, 0.16, 0.008), 'paint_line', rot_z=math.radians(ang)))
    # (v5: the far red strip and barrier rows are omitted: in portrait framings they float at the horizon as dashes)
    parts['venue'] = triangulate(venue, mi, crease_deg=50.0)
    prof = []
    n = 600
    for i in range(n + 1):
        s = -R.RUNIN + (R.S_LIP + R.RUNIN) * i / n
        x, z, phi = R.profile(s)
        prof.append([round(s, 5), round(x, 5), round(z, 5), round(phi, 6)])
    meta = {
        'materials': SCENE_MATS,
        'ramp': {'W': R.RAMP_W, 'T': R.SLAB_T, 'RUNIN': R.RUNIN, 'S_LIP': R.S_LIP, 'LIP': list(R.LIP),
                 'DECK_H': R.DECK_H, 'S_DECK': R.S_DECK, 'DECK_START': list(R.DECK_START),
                 'segments': R.SEGMENTS, 'neon_white_s': NEON_WHITE_S, 'profile': prof},
        'truss': tmeta,
        'floor_z': -0.006,
        'note': 'v4 fit (two native views; approximate). Floor sits 6 mm under the run-in (no coplanar faces).',
    }
    return write_bin(os.path.join(OUT, 'scene.json'), os.path.join(OUT, 'scene.bin'), parts, meta)


# ----------------------------------------------------------------------------------------------- poses
def export_poses():
    dt = 1.0 / 240.0
    ev0, ev1 = 0.0, 13.6
    n = int(round((ev1 - ev0) / dt)) + 1
    mats, wheel, jets, onr, sr = [], [], [], [], []
    names = ['NOSE', 'FL', 'FR', 'RL', 'RR']
    for i in range(n):
        ev = ev0 + i * dt
        st = R.RampState(ev)
        M = st.car
        mats.append([round(M[r][c], 6) for c in range(4) for r in range(3)])   # column-major 3x4 (x, y, z, o)
        wheel.append(round(st.wheel_angle, 5))
        jets.append([round(st.jets.get(k, 0.0), 4) for k in names])
        onr.append(1 if st.on_ramp else 0)
        sr.append(round(st.s_r, 5))
    data = {
        'about': 'v4 RampState sampled at 240 Hz of source time ev (Tesla "The Ramp", continuous wide take clock). '
                 'Climb and airborne keys are image fits, not physics; touchdown hidden by the cloud.',
        'ev0': ev0, 'dt': dt, 'count': n,
        'EV_START': R.EV_START, 'EV_OFF': R.EV_OFF, 'EV_LAND': R.EV_LAND,
        'jet_names': names, 'flight_dirs': {k: list(v) for k, v in R.FLIGHT_DIRS.items()},
        'matrix_layout': 'column-major 3x4: X axis, Y axis, Z axis, origin (car-local to world)',
        'matrices': mats, 'wheel_angle': wheel, 'jets': jets, 'on_ramp': onr, 's_rear': sr,
        'cloud_puffs': R.CLOUD_PUFFS,
    }
    with open(os.path.join(OUT, 'poses.json'), 'w', encoding='utf-8') as fh:
        json.dump(data, fh, separators=(',', ':'))
    return n


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    c = export_car()
    print('car:', {k: (v['vertices'], v['indices'] // 3) for k, v in c['parts'].items()}, c['bytes'], 'bytes')
    s = export_scene()
    print('scene:', {k: (v['vertices'], v['indices'] // 3) for k, v in s['parts'].items()}, s['bytes'], 'bytes')
    print('poses:', export_poses(), 'samples')
