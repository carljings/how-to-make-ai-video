"""roadster.py: the illustrated hero coupe, generated in pure Python (no bpy).

Modelled from the frames of the exact Musk clip (see README.md "Reference frames"): a very low, wide, white /
light-silver wedge with a short bonnet, a long black glass canopy that starts about a quarter of the way back
from the nose, a sharply raked windscreen, white roof rails that separate the roof glass from tapered black side
windows, dark wheels close to the corners, narrow white lamps at the front corners, a thin full-width red strip
along the top of the tail, small amber side markers, and a dark grid-patterned underbody.

Every dimension is INFERRED from blurred, perspective-distorted video frames: there is no verified official 3D
model or drawing. Nothing here is Tesla engineering geometry. Nozzle positions and directions are schematic,
chosen only so the plumes can follow car-local orientations as they visibly do in the clip.

Car-local axes: +X forward, +Y to the car's left, +Z up. Origin: on the ground plane, centre of the wheelbase.
"""
import math

from geom import (Mesh, box, catmull, fan_cap, face_normal, grid_surface, keyed_polyline, lathe, norm,
                  signed_volume, smoothstep, tube)

# --------------------------------------------------------------------------------------------- dimensions (inferred)
X_NOSE, X_TAIL = 2.20, -2.20          # length 4.40 m
AXLE_F, AXLE_R = 1.33, -1.32          # wheelbase 2.65 m
WHEEL_R = 0.35                        # tyre outer radius
TRACK_Y = 0.855                       # wheel centre plane, each side
TYRE_W = 0.28
ARCH_R = (0.418, 0.428)               # front, rear arch radius
X_COWL = 1.12                         # windscreen base (glass starts here)
X_CANOPY_END = -1.62                  # canopy blends into the rear deck
X_GLASS_REAR = -1.52                  # rear end of the black roof glass
X_DOOR_GAPS = (0.885, -0.70)          # shut lines (thin dark grooves)
COM = (0.0, 0.0, 0.50)                # rough centre of the body volume, used as the rotation pivot

DIMENSIONS = {
    'length_m': X_NOSE - X_TAIL, 'width_m': 2.02, 'height_m': 1.105, 'wheelbase_m': AXLE_F - AXLE_R,
    'track_m': 2 * TRACK_Y, 'tyre_diameter_m': 2 * WHEEL_R, 'status': 'inferred from video frames, not measured',
}

# schematic thruster ports (car-local position, car-local exhaust direction). The clip shows separated blue-white
# plumes from under/around the body that rotate with it, splayed outward, plus a forward-pointing plume late in
# the pass. Count, placement and angles here are illustrative choices, not observed hardware.
NOZZLES = {
    # stations follow where the wide shot's plumes leave the body: about 0.26 L and 0.84 L from the nose (6.75–10.5 s)
    # small outward splay only: at 7.75 s the far-side plumes must stay hidden behind the body as in the source
    'FL': ((1.02, 0.52, 0.09), (0.12, 0.14, -1.0)),
    'FR': ((1.02, -0.52, 0.09), (0.12, -0.14, -1.0)),
    'RL': ((-1.50, 0.52, 0.10), (0.12, 0.14, -1.0)),
    'RR': ((-1.50, -0.52, 0.10), (0.12, -0.14, -1.0)),
    'NOSE': ((2.08, 0.0, 0.27), (1.0, 0.0, -0.12)),   # the forward plume seen at 10.25 s
    # thin side jet under the left sill: with the car rolled ~100° (canopy to camera, left side down) it points
    # down and toward the nose, the single thin downward-left gas cue in the source at 7.75 s (and close shot B)
    'SL': ((1.10, 0.90, 0.20), (0.35, 1.0, -0.25)),
}

# --------------------------------------------------------------------------------------------- profile splines
half_w = catmull([(-2.20, 0.84), (-2.12, 0.925), (-1.95, 0.975), (-1.60, 1.0), (-1.32, 1.01), (-0.95, 0.99),
                  (-0.45, 0.955), (0.10, 0.945), (0.70, 0.965), (1.33, 0.995), (1.75, 0.975), (2.00, 0.915),
                  (2.12, 0.80), (2.20, 0.62)])
# shoulder and wing crown rise into fender bulges over both axles: they must clear the arch tops (axle height +
# arch radius ≈ 0.77–0.78 m), otherwise the openings break through the top of the wings. The source views from
# above (1.5 s, 7.0 s) show the front wings standing clearly proud of the bonnet.
z_shoulder = catmull([(-2.20, 0.775), (-1.90, 0.80), (-1.60, 0.815), (-1.32, 0.818), (-1.05, 0.79), (-0.80, 0.75),
                      (-0.20, 0.69), (0.50, 0.668), (0.95, 0.70), (1.15, 0.765), (1.33, 0.80), (1.52, 0.778),
                      (1.75, 0.70), (2.00, 0.575), (2.20, 0.44)])
z_crown = catmull([(-2.20, 0.795), (-1.90, 0.835), (-1.60, 0.85), (-1.32, 0.852), (-1.05, 0.825), (-0.80, 0.785),
                   (-0.20, 0.72), (0.50, 0.70), (0.95, 0.735), (1.15, 0.795), (1.33, 0.828), (1.52, 0.805),
                   (1.75, 0.73), (2.00, 0.61), (2.20, 0.445)])
y_belt = catmull([(-2.20, 0.60), (-1.90, 0.62), (-1.62, 0.575), (-1.20, 0.615), (-0.60, 0.70), (0.00, 0.745),
                  (0.60, 0.745), (1.12, 0.70), (1.50, 0.60), (1.90, 0.48), (2.20, 0.36)])
# bonnet edge (x > X_COWL) sits ≈6–10 cm below the wing crowns: proof-01's 19 cm valley read as retro pontoon wings
z_belt = catmull([(-2.20, 0.785), (-1.90, 0.805), (-1.62, 0.812), (-1.20, 0.79), (-0.60, 0.745), (0.00, 0.715),
                  (0.60, 0.69), (1.12, 0.70), (1.35, 0.722), (1.55, 0.70), (1.80, 0.635), (2.00, 0.565), (2.20, 0.44)])
z_top = catmull([(-1.62, 0.812), (-1.45, 0.86), (-1.20, 0.93), (-0.90, 1.01), (-0.60, 1.07), (-0.30, 1.10),
                 (0.00, 1.105), (0.30, 1.07), (0.60, 0.97), (0.90, 0.80), (1.12, 0.70)])
z_floor = catmull([(-2.20, 0.34), (-2.05, 0.32), (-1.75, 0.18), (-1.55, 0.13), (1.50, 0.13), (1.85, 0.17),
                   (2.05, 0.25), (2.20, 0.30)])
w_floor = catmull([(-2.20, 0.52), (-1.90, 0.66), (-1.50, 0.74), (1.45, 0.74), (1.90, 0.64), (2.20, 0.46)])
z_rocker = catmull([(-2.20, 0.40), (-1.90, 0.33), (-1.40, 0.275), (1.20, 0.27), (1.80, 0.32), (2.20, 0.40)])
# side-window top and roof-rail inner edge, as fractions of the canopy arc (0 = belt, 1 = roof centre)
p_window = catmull([(-1.62, 0.0), (-1.25, 0.0), (-1.00, 0.13), (-0.60, 0.24), (-0.20, 0.29), (0.20, 0.29),
                    (0.55, 0.24), (0.85, 0.10), (1.00, 0.0), (1.12, 0.0)])
RAIL_MIN = 0.06     # narrowest white rail between side glass and roof glass, as a fraction of the canopy arc
DOME_EXP = 0.77      # superellipse exponent (2/n, n ≈ 2.6): a rounded-box canopy section
TUMBLEHOME = 0.25    # the canopy sides lean inward as they rise
# half-width of the black windscreen/roof/rear glass in plan. The source plan views (1.5 s, 7.25–7.75 s) read as one
# black teardrop: widest at the windscreen base, narrowing to a point over the rear deck, framed by white rails that
# widen into the rear haunches.
g_glass = catmull([(-1.56, 0.0), (-1.45, 0.07), (-1.30, 0.16), (-1.05, 0.27), (-0.75, 0.37), (-0.40, 0.46),
                   (0.00, 0.545), (0.40, 0.61), (0.80, 0.655), (1.12, 0.67)])


def dome_height(x):
    return max(0.0, z_top(x) - z_belt(x)) if X_CANOPY_END <= x <= X_COWL else 0.0


def camber(x):
    """Crown across the bonnet and the rear deck (zero under the canopy)."""
    return 0.042 * smoothstep(1.05, 1.40, x) + 0.03 * smoothstep(-1.55, -1.85, x)


def dome_point(x, p):
    th = p * math.pi / 2
    c, s = max(0.0, math.cos(th)), max(0.0, math.sin(th))
    yb, zb, H = y_belt(x), z_belt(x), dome_height(x)
    y = yb * c ** DOME_EXP * (1 - TUMBLEHOME * s * (1 if H > 0 else 0))
    z = zb + H * s ** DOME_EXP + camber(x) * (1 - (y / yb) ** 2)
    return (y, z)


def p_at_halfwidth(x, y_target):
    """Canopy-arc fraction p where the dome section at station x has half-width y_target (y falls monotonically)."""
    if dome_point(x, 0.0)[0] <= y_target:
        return 0.0
    lo, hi = 0.0, 1.0
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        if dome_point(x, mid)[0] > y_target:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


# --------------------------------------------------------------------------------------------- section
# segment ids, from the keel round the left side to the roof centre
SEG_FLOOR, SEG_SILL, SEG_ROCKER, SEG_SIDE, SEG_SHOULDER, SEG_CROWN, SEG_WINDOW, SEG_RAIL, SEG_ROOF = range(9)
LOWER_COUNTS = [7, 4, 4, 7, 6, 5, 6]     # K0→K1→K2→K3→K4→K5→K5b→K6
DOME_COUNTS = [7, 8, 9]                  # belt→window top→rail inner (roof-glass edge)→roof centre
LOWER_SEGS = [SEG_FLOOR, SEG_SILL, SEG_ROCKER, SEG_SIDE, SEG_SIDE, SEG_SHOULDER, SEG_CROWN]
SEG_OF = [s for s, n in zip(LOWER_SEGS + [SEG_WINDOW, SEG_RAIL, SEG_ROOF], LOWER_COUNTS + DOME_COUNTS) for _ in range(n)]
X_NOSE_COLLAPSE = 2.00   # from here forward every section flattens onto the leading edge
Z_BLADE = 0.44


def half_section(x):
    """Left half of the body section at station x: [(y, z)] from keel (y = 0) to roof centre (y = 0)."""
    zf, wf, hw = z_floor(x), w_floor(x), half_w(x)
    zr = z_rocker(x)
    keys = [
        (0.0, zf),                                   # K0 keel
        (wf, zf),                                    # K1 floor edge
        (min(hw - 0.07, wf + 0.16), zf + 0.035),     # K2 sill bottom corner
        (hw - 0.03, zr),                             # K3 top of the dark rocker band
        (hw, 0.48 + 0.02 * (1 if x < -1.4 else 0)),  # K4 widest line
        (hw - 0.03, z_shoulder(x)),                  # K5 shoulder crease
        (0.5 * (hw - 0.03) + 0.5 * y_belt(x), z_crown(x)),  # K5b wing crown
        (y_belt(x), z_belt(x)),                      # K6 belt / canopy base
    ]
    lower, _ = keyed_polyline(keys, LOWER_COUNTS, creases=(1, 2, 5))
    pw = max(0.0, p_window(x))
    pg = p_at_halfwidth(x, max(0.0, g_glass(x))) if X_GLASS_REAR <= x <= X_COWL else 1.0
    pr = min(1.0, max(pw + RAIL_MIN, pg))
    dome = []
    for (a, b, n) in ((0.0, pw, DOME_COUNTS[0]), (pw, pr, DOME_COUNTS[1]), (pr, 1.0, DOME_COUNTS[2])):
        for k in range(1, n + 1):
            dome.append(dome_point(x, a + (b - a) * k / n))
    pts = lower + dome
    pts[-1] = (0.0, pts[-1][1])
    # nose: every point slides onto the leading edge (a sharp, wide blade with rounded corners in plan)
    if x > X_NOSE_COLLAPSE:
        u = (x - X_NOSE_COLLAPSE) / (X_NOSE - X_NOSE_COLLAPSE)
        s = max(0.0, 1 - u * u)
        pts = [(y, Z_BLADE + (z - Z_BLADE) * s) for y, z in pts]
    # tail: a slight rounding of the last few centimetres before the flat rear fascia
    if x < -2.12:
        k = 1 - 0.035 * smoothstep(-2.12, -2.20, x)
        zc = 0.56
        pts = [(y * k, zc + (z - zc) * k) for y, z in pts]
    return pts


def stations():
    """Station x positions, tail → nose: denser toward both ends, with door shut-line pairs inserted."""
    n = 190
    xs = []
    for i in range(n + 1):
        u = i / n
        g = u - 0.55 * math.sin(2 * math.pi * u) / (2 * math.pi)
        xs.append(X_TAIL + (X_NOSE - X_TAIL) * g)
    for gx in X_DOOR_GAPS:
        xs += [gx - 0.003, gx + 0.003]
    return sorted(set(round(x, 5) for x in xs))


def body_material(x, seg, gap):
    if seg in (SEG_FLOOR, SEG_SILL):
        return 'underbody'
    if seg == SEG_ROCKER:
        return 'satin_black'
    if seg == SEG_WINDOW:
        return 'glass' if p_window(x) > 0.004 else 'paint'
    if seg == SEG_ROOF:
        return 'glass' if X_GLASS_REAR <= x <= X_COWL else 'paint'
    if gap and seg in (SEG_SIDE, SEG_SHOULDER):
        return 'panel_gap'
    return 'paint'


def body_shell():
    xs = stations()
    sections = [half_section(x) for x in xs]
    nh = len(sections[0])                      # points per half, keel and roof centre included
    ring_len = 2 * nh - 2

    def ring_point(i, j):
        if j < nh:
            y, z = sections[i][j]
            return (xs[i], y, z)
        y, z = sections[i][ring_len - j]
        return (xs[i], -y, z)

    def seg_of(j):
        return SEG_OF[j] if j < nh - 1 else SEG_OF[ring_len - j - 1]

    gaps = set()
    for gx in X_DOOR_GAPS:
        for i in range(len(xs) - 1):
            if abs(xs[i] - (gx - 0.003)) < 1e-6:
                gaps.add(i)

    def mat(i, j):
        xm = 0.5 * (xs[i] + xs[i + 1])
        return body_material(xm, seg_of(j), i in gaps)

    def uv(i, j):
        return ((xs[i] - X_TAIL) / (X_NOSE - X_TAIL), (j % ring_len) / ring_len)

    m = grid_surface(len(xs), ring_len, ring_point, mat, wrap_cols=True, uv=uv, flip=True)
    # flat rear fascia
    fan_cap(m, [j for j in range(ring_len)], (X_TAIL, 0.0, 0.56), 'paint', reverse=False)
    m.weld()     # collapsed spans (no side glass, no roof glass, nose blade) leave coincident points
    cut_arches(m)
    return m


def cut_arches(m, y_min=0.70, lip=0.012):
    """Wheel openings: drop outward- or downward-facing faces whose centre lies inside the arch cylinder (outboard
    of y_min), then pull the vertices on the new opening edge radially onto the circle so it is a clean arc with
    a small lip. Upward/inward faces (wing crown, inner wing wall, bonnet) are kept: they lie above the tyre."""
    arches = [(AXLE_F, WHEEL_R, ARCH_R[0]), (AXLE_R, WHEEL_R, ARCH_R[1])]

    def inside(p, margin=0.0):
        for ax, az, r in arches:
            if abs(p[1]) > y_min and (p[0] - ax) ** 2 + (p[2] - az) ** 2 < (r - margin) ** 2:
                return (ax, az, r)
        return None

    keep, cut_verts = [], set()
    for f, mt, uv in zip(m.faces, m.mats, m.uvs):
        c = tuple(sum(m.verts[i][k] for i in f) / len(f) for k in range(3))
        n = norm(face_normal(m.verts, f))
        side_facing = n[1] * (1 if c[1] > 0 else -1) > 0.35 or n[2] < -0.3
        if inside(c) and side_facing:
            cut_verts.update(f)
        else:
            keep.append((f, mt, uv))
    m.faces = [k[0] for k in keep]
    m.mats = [k[1] for k in keep]
    m.uvs = [k[2] for k in keep]
    used = {i for f in m.faces for i in f}
    for i in used & cut_verts:          # every vertex on the new opening edge, inside or just outside the circle
        p = m.verts[i]
        if abs(p[1]) <= y_min or p[2] < z_floor(p[0]) + 0.03:    # leave the flat floor where it is
            continue
        ax, az, r = min(arches, key=lambda a: abs(math.hypot(p[0] - a[0], p[2] - a[1]) - a[2]))
        dx, dz = p[0] - ax, p[2] - az
        d = math.hypot(dx, dz) or 1e-9
        if abs(d - r) > 0.08:
            continue
        y = p[1] + (lip if p[1] > 0 else -lip) * (1 if abs(p[1]) > 0.8 else 0)
        m.verts[i] = (ax + dx / d * r, y, az + dz / d * r)
    m.remove_unused()


LINER_Y_IN = 0.705    # just inboard of the tyres' inner faces (0.71–0.715)


def arch_liners():
    """Dark wheel-well liners, so the hollow shell is never visible through the openings: a conical partial tube
    from the arch edge (flush, just inside the body side) to a tighter radius at the tyre's inner face, where it
    has to stay under the inner wing wall, plus an inner wall."""
    m = Mesh()
    for ax, r in ((AXLE_F, ARCH_R[0] - 0.004), (AXLE_R, ARCH_R[1] - 0.004)):
        r_in = WHEEL_R + 0.008
        zmin = z_floor(ax) + 0.01
        a0 = math.asin(max(-1.0, (zmin - WHEEL_R) / r))
        angles = [a0 + (math.pi - 2 * a0) * k / 40 for k in range(41)]   # over the top, front-low → rear-low
        for side in (1, -1):
            ys = [LINER_Y_IN * side, (half_w(ax) - 0.012) * side]    # outer edge stays just inside the body side
            ring_in = [m.add_vert((ax + r_in * math.cos(math.pi - a), ys[0], WHEEL_R + r_in * math.sin(a))) for a in angles]
            ring_out = [m.add_vert((ax + r * math.cos(math.pi - a), ys[1], WHEEL_R + r * math.sin(a))) for a in angles]
            for k in range(len(angles) - 1):
                q = (ring_in[k], ring_in[k + 1], ring_out[k + 1], ring_out[k])
                m.add_face(q if side > 0 else tuple(reversed(q)), 'liner')
            c = m.add_vert((ax, ys[0], WHEEL_R + 0.02))
            for k in range(len(angles) - 1):
                tri = (c, ring_in[k + 1], ring_in[k])
                m.add_face(tri if side > 0 else tuple(reversed(tri)), 'liner')
    return m


def section_top_z(x, y):
    """Height of the upper body surface at (x, |y|), from the section polyline (for placing lamps on it)."""
    pts = half_section(x)
    upper = pts[next(i for i, p in enumerate(pts) if p[1] >= max(q[1] for q in pts[:5])):]
    best = None
    for (y0, z0), (y1, z1) in zip(upper, upper[1:]):
        lo, hi = min(y0, y1), max(y0, y1)
        if lo - 1e-9 <= abs(y) <= hi + 1e-9 and hi > lo:
            t = (abs(y) - y0) / (y1 - y0)
            z = z0 + (z1 - z0) * t
            best = z if best is None else max(best, z)
    return best if best is not None else max(p[1] for p in pts)


def lights():
    m = Mesh()
    # front corner lamps: narrow bars hugging the top of the leading edge near each corner
    for side in (1, -1):
        pts = []
        for k in range(9):
            t = k / 8
            y = 0.44 + 0.36 * t
            x = 2.185 - 0.17 * t * t
            z = section_top_z(x, y) + 0.004
            pts.append((x, side * y, z))
        m.extend(tube(pts, 0.016, 10, 'lamp_white'))
    # full-width red light band along the top edge of the tail (≈6 cm tall: it reads as a solid band in the
    # source's rear views at 3.0 s and 10.25–10.75 s), plus red corner lamps lower down
    band = Mesh()
    cols = []
    for k in range(25):
        y = -0.80 + 1.60 * k / 24
        zt = section_top_z(X_TAIL + 0.02, y)
        cols.append((band.add_vert((X_TAIL - 0.004, y, zt - 0.085)), band.add_vert((X_TAIL - 0.004, y, zt - 0.025))))
    for (a0, a1), (b0, b1) in zip(cols, cols[1:]):
        band.add_face((a0, a1, b1, b0), 'lamp_red')          # faces backward (-X)
    m.extend(band)
    for side in (1, -1):
        m.extend(tube([(X_TAIL - 0.004, side * 0.80, 0.57), (X_TAIL - 0.004, side * 0.80, 0.69)], 0.02, 10, 'lamp_red'))
    # small amber side markers just behind the front wheel openings
    for side in (1, -1):
        x0, x1 = 0.80, 0.88
        y = half_w(0.84) + 0.002
        m.extend(tube([(x0, side * y, 0.555), (x1, side * y, 0.56)], 0.008, 8, 'lamp_amber'))
    return m


def underbody_detail():
    """Dark structural lattice under the floor (the clip's inverted frames show rectangular patterning), suspension
    links, a splitter, diffuser fins and the schematic thruster ports."""
    m = Mesh()
    z0, z1 = 0.095, 0.128
    xs = [-1.55, -0.95, -0.35, 0.25, 0.85, 1.45]
    for x in xs:
        m.extend(box((x, 0, (z0 + z1) / 2), (0.055, 1.26, z1 - z0), 'under_frame'))
    for y in (-0.62, -0.21, 0.21, 0.62):
        m.extend(box((-0.05, y, (z0 + z1) / 2), (3.05, 0.055, z1 - z0), 'under_frame'))
    for ax in (AXLE_F, AXLE_R):
        for side in (1, -1):
            m.extend(box((ax, side * 0.58, 0.30), (0.08, 0.50, 0.05), 'under_frame'))
            m.extend(box((ax + 0.18, side * 0.58, 0.20), (0.06, 0.48, 0.04), 'under_frame'))
    m.extend(box((1.98, 0, 0.205), (0.36, 1.34, 0.022), 'satin_black'))          # splitter
    for y in (-0.48, -0.24, 0.0, 0.24, 0.48):                                      # diffuser fins
        m.extend(box((-1.98, y, 0.25), (0.40, 0.02, 0.12), 'satin_black'))
    for name, (p, d) in NOZZLES.items():
        n = math.sqrt(sum(c * c for c in d))
        d = tuple(c / n for c in d)
        a = tuple(p[k] - d[k] * 0.06 for k in range(3))
        m.extend(tube([a, p], 0.045, 16, 'nozzle'))
    return m


def wheel(rear=False):
    """One wheel assembly in wheel space: axle along +Y (outer face toward +Y), centre at the origin.
    Returns (rotating part, static part). Rims are dark, as in the clip."""
    w = TYRE_W / 2 + (0.01 if rear else 0.0)
    R = WHEEL_R
    rot = Mesh()
    # tyre: bead → sidewall → shoulder → tread (with grooves) → shoulder → sidewall → bead
    prof = [(0.252, -w + 0.012), (0.300, -w - 0.004), (0.336, -w + 0.012), (R - 0.004, -w + 0.035)]
    tread = [-w + 0.05, -0.06, -0.05, 0.0, 0.01, 0.06, 0.07, w - 0.05]
    for k, a in enumerate(tread):
        prof.append((R - (0.006 if k in (2, 3, 6) else 0.0), a))
    prof += [(R - 0.004, w - 0.035), (0.336, w - 0.012), (0.300, w + 0.004), (0.252, w - 0.012)]
    prof = [(r, a) for r, a in prof]
    rot.extend(lathe(prof, 96, 'tyre', axis='Y', flip=True))
    # rim lip and barrel
    rim_prof = [(0.252, w - 0.012), (0.246, w - 0.004), (0.238, w - 0.02), (0.236, -w + 0.02), (0.252, -w + 0.012)]
    rot.extend(lathe(rim_prof, 96, 'rim', axis='Y'))
    # recessed dark barrel face behind the spokes
    rot.extend(lathe([(0.236, w - 0.06), (0.06, w - 0.075)], 96, 'rim_dark', axis='Y'))
    # five twin spokes, slightly dished, plus the hub
    face_a = w - 0.035
    for k in range(5):
        base = 2 * math.pi * k / 5
        for off in (-0.085, 0.085):
            a0, a1 = base + off * 0.55, base + off
            r0, r1 = 0.07, 0.232
            pts = []
            for (r, a, da) in ((r0, a0, -0.03), (r1, a1, -0.022), (r1, a1, 0.022), (r0, a0, 0.03)):
                pts.append((r * math.cos(a + da / r * 0.6), r * math.sin(a + da / r * 0.6)))
            front, back = [], []
            for (px, pz), r in zip(pts, (r0, r1, r1, r0)):
                dish = 0.018 * (1 - (r - r0) / (r1 - r0))
                front.append(rot.add_vert((px, face_a + dish, pz)))
                back.append(rot.add_vert((px, face_a + dish - 0.03, pz)))
            rot.add_face(tuple(front), 'rim')
            rot.add_face(tuple(reversed(back)), 'rim')
            for q in range(4):
                q1 = (q + 1) % 4
                rot.add_face((front[q1], front[q], back[q], back[q1]), 'rim')
    rot.extend(lathe([(0.072, face_a + 0.012), (0.05, face_a + 0.03), (0.0, face_a + 0.034)], 48, 'rim', axis='Y', flip=True))
    # static parts: brake disc and caliper (do not spin)
    st = Mesh()
    st.extend(lathe([(0.19, 0.02), (0.19, -0.01), (0.10, -0.01), (0.10, 0.02)], 64, 'brake', axis='Y', closed_profile=True, flip=True))
    caliper = box((0.0, 0.035, 0.0), (0.16, 0.05, 0.07), 'caliper')
    ang = math.radians(115 if not rear else 65)
    st.extend(caliper.transformed(lambda v: (v[0] * math.cos(ang) - (v[2] + 0.17) * math.sin(ang), v[1], v[0] * math.sin(ang) + (v[2] + 0.17) * math.cos(ang))))
    return rot, st


def wheel_placements():
    """(name, centre, side) for the four wheels; side = +1 left, −1 right."""
    return [('FL', (AXLE_F, TRACK_Y, WHEEL_R), 1), ('FR', (AXLE_F, -TRACK_Y, WHEEL_R), -1),
            ('RL', (AXLE_R, TRACK_Y + 0.005, WHEEL_R), 1), ('RR', (AXLE_R, -TRACK_Y - 0.005, WHEEL_R), -1)]


def build():
    """All parts of the car in car space, as {name: Mesh}. Wheels are returned in wheel space separately."""
    parts = {
        'body': body_shell(),
        'arch_liners': arch_liners(),
        'lights': lights(),
        'underbody': underbody_detail(),
    }
    return parts


if __name__ == '__main__':
    parts = build()
    for k, v in parts.items():
        (x0, y0, z0), (x1, y1, z1) = v.bounds()
        print(f'{k:12s} {len(v.verts):6d} verts {len(v.faces):6d} faces  x {x0:.3f}…{x1:.3f}  y {y0:.3f}…{y1:.3f}  z {z0:.3f}…{z1:.3f}  mats {v.material_names()}')
    print('body signed volume (shell + cap, arches cut):', round(signed_volume(parts['body']), 3))
