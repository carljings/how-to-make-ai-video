"""staging.py: the source night lot for the wide shot (source shots A and D), in pure Python (no bpy).

Fitted by eye to the clean wide frame at source 0.0 s (motion-keyframe-01.jpg, 1920x1080): parked lineup in the
centre with the tall white cab truck, diagonal overhead lines to a pole behind the truck, a trailer-tongue jack
post (crank, bracket, safety chain, tongue beam, foot plate) in the right foreground, a partial pale curved
structure at the far right, rough pale lot, black sky.

Every placement is measured in SOURCE PIXELS on that frame and back-projected through WIDE_CAMERA, so the
composition matches the source by construction. Lens and camera height are ASSUMPTIONS (no calibration exists);
all sizes and distances are inferred. The lineup vehicles are generic stand-ins for scale and composition, not
models of specific products.

World axes: +Z up; the wide camera looks along +Y; +X is image right. Ground plane z = 0.
"""
import math

from geom import Mesh, add, box, catmull, cross, dot, lathe, mul, norm, sub, tube

SOURCE_W, SOURCE_H = 1920, 1080

WIDE_CAMERA = {
    'name': 'CAM_wide_A_D',
    'location': (0.0, 0.0, 1.25),  # assumed tripod height; with the lens below the lineup sits ≈27 m away
    'yaw_deg': 0.0,                # looks along +Y
    'pitch_deg': 5.8,              # tilted up: horizon ≈ 675 px, below frame centre as in the source
    'lens_mm': 25.0,               # assumed (horizontal FOV ≈ 71.5° on a 36 mm sensor)
    'sensor_width_mm': 36.0,
}


class Pinhole:
    """The same camera as Blender's (rotation_euler XYZ = (90° + pitch, 0, yaw), sensor fit horizontal), in pure
    Python, so props and the flight path can be placed from source pixel measurements."""

    def __init__(self, spec, width=SOURCE_W, height=SOURCE_H):
        p, y = math.radians(spec['pitch_deg']), math.radians(spec['yaw_deg'])
        cy, sy = math.cos(y), math.sin(y)

        def rz(v):
            return (v[0] * cy - v[1] * sy, v[0] * sy + v[1] * cy, v[2])
        self.loc = tuple(spec['location'])
        self.right = rz((1.0, 0.0, 0.0))
        self.up = rz((0.0, -math.sin(p), math.cos(p)))
        self.fwd = rz((0.0, math.cos(p), math.sin(p)))
        self.w, self.h = width, height
        self.f_px = spec['lens_mm'] / spec['sensor_width_mm'] * width

    def project(self, P):
        v = sub(P, self.loc)
        xc, yc, zc = dot(v, self.right), dot(v, self.up), dot(v, self.fwd)
        return (self.w / 2 + self.f_px * xc / zc, self.h / 2 - self.f_px * yc / zc, zc)

    def ray(self, x_px, y_px):
        a = (x_px - self.w / 2) / self.f_px
        b = -(y_px - self.h / 2) / self.f_px
        return add(self.fwd, add(mul(self.right, a), mul(self.up, b)))

    def at_depth(self, x_px, y_px, depth):
        """Point on the pixel's ray whose camera-forward depth is `depth`."""
        return add(self.loc, mul(self.ray(x_px, y_px), depth))

    def on_ground(self, x_px, y_px, z=0.0):
        d = self.ray(x_px, y_px)
        if d[2] >= -1e-9:
            raise ValueError('pixel (%g, %g) does not look at the ground' % (x_px, y_px))
        return add(self.loc, mul(d, (z - self.loc[2]) / d[2]))

    def ground_below(self, x_px, y_px, depth):
        """For props whose base is hidden near the horizon: the pixel's ray point at `depth`, dropped to z = 0."""
        p = self.at_depth(x_px, y_px, depth)
        return (p[0], p[1], 0.0)


WIDE = Pinhole(WIDE_CAMERA)


def heading_vec(deg):
    return (math.cos(math.radians(deg)), math.sin(math.radians(deg)), 0.0)


def place(mesh, origin, heading_deg):
    """Rotate a mesh built nose-along-+X about Z to heading_deg, then move it to origin."""
    c, s = math.cos(math.radians(heading_deg)), math.sin(math.radians(heading_deg))
    ox, oy, oz = origin
    return mesh.transformed(lambda p: (ox + p[0] * c - p[1] * s, oy + p[0] * s + p[1] * c, oz + p[2]))


# ----------------------------------------------------------------------------------------------- lineup
# measured on source frame 0.0 s: kind, bbox (x0, y0, x1, y1) px, heading (deg; -90 = nose toward the camera),
# body material. Left vehicles are angled with their noses toward image right, right ones toward image left.
LINEUP = [
    ('sedan', (555, 668, 720, 735), -62.0, 'lineup_white'),
    ('crossover', (725, 662, 857, 740), -80.0, 'lineup_red'),
    ('cab_truck', (897, 562, 1042, 742), -90.0, 'truck_white'),
    ('angular_pickup', (1077, 655, 1215, 740), -112.0, 'steel'),
    ('compact_coupe', (1218, 672, 1348, 733), -116.0, 'bronze'),
]
VEHICLE_LWH = {'sedan': (4.72, 1.85, 1.44), 'crossover': (4.75, 1.92, 1.62), 'cab_truck': (6.4, 2.55, 3.75),
               'angular_pickup': (5.68, 2.03, 1.79), 'compact_coupe': (4.25, 1.90, 1.17)}


def lineup_origin(bbox, heading_deg, lwh):
    """Ground point under the bbox's bottom centre is the nearest visible contact; push the footprint centre back
    along the view by half its depth extent."""
    x0, y0, x1, y1 = bbox
    p = WIDE.on_ground(0.5 * (x0 + x1), y1)
    L, W, _ = lwh
    h = math.radians(heading_deg)
    depth_extent = abs(L * math.sin(h)) + abs(W * math.cos(h))
    d = norm((p[0] - WIDE.loc[0], p[1] - WIDE.loc[1], 0.0))
    return add(p, mul(d, 0.5 * depth_extent))


def wheel_mesh(r, w, mat_tyre='tyre', mat_rim='lineup_rim', segs=40):
    """Simple wheel in wheel space (axle along Y, centre at origin)."""
    m = Mesh()
    rr = r * 0.66
    m.extend(lathe([(rr, -w / 2), (r - 0.02, -w / 2 + 0.01), (r, -w / 2 + 0.04), (r, w / 2 - 0.04),
                    (r - 0.02, w / 2 - 0.01), (rr, w / 2)], segs, mat_tyre, axis='Y', flip=True))
    m.extend(lathe([(rr, w / 2), (rr * 0.25, w / 2 - 0.02), (0.0, w / 2 - 0.02)], segs, mat_rim, axis='Y', flip=True))
    m.extend(lathe([(0.0, -w / 2 + 0.02), (rr, -w / 2)], segs, mat_rim, axis='Y', flip=True))
    return m


def add_wheels(m, wheel_xs, half_track, r, w, mat_rim='lineup_rim', dual=False):
    for x in wheel_xs:
        for side in (1, -1):
            wm = wheel_mesh(r, w, mat_rim=mat_rim)
            if side < 0:
                wm = wm.mirrored_y()
            offs = [0.0] if not dual else [0.0, -side * (w + 0.02)]
            for o in offs:
                m.extend(wm.transformed(lambda p, x=x, o=o, side=side: (p[0] + x, p[1] + side * half_track + o, p[2] + r)))
    return m


def lofted_vehicle(L, W, H, body_mat, keys, glass_roof=False, n_x=56):
    """A smooth generic car body, nose along +X, centred on the origin, wheels on z = 0.
    keys: u (-0.5 tail … +0.5 nose) splines for 'top' (roof/hood/deck height), 'belt', 'bottom' and the glass
    span (u_rear_glass_end, u_roof_rear, u_roof_front, u_windscreen_base)."""
    top, belt, bottom = catmull(keys['top']), catmull(keys['belt']), catmull(keys['bottom'])
    halfw = catmull([(-0.5, 0.80), (-0.46, 0.95), (-0.38, 1.0), (0.36, 1.0), (0.46, 0.93), (0.5, 0.76)])
    g0, g1, g2, g3 = keys['glass']
    roof_w = keys.get('roof_w', 0.70)
    counts = (3, 3, 4, 3, 4, 3, 3)    # bottom, lower corner, side, shoulder, greenhouse side, roof corner, roof

    def section(u):
        w = 0.5 * W * halfw(u)
        zb, zbelt, ztop = bottom(u), belt(u), max(top(u), belt(u))
        r1 = min(0.12, 0.45 * (zbelt - zb))
        r2 = 0.06
        pts = []
        for k in range(counts[0] + 1):
            pts.append(((w - r1) * k / counts[0], zb))
        for k in range(1, counts[1] + 1):
            a = -math.pi / 2 + (math.pi / 2) * k / counts[1]
            pts.append((w - r1 + r1 * math.cos(a), zb + r1 + r1 * math.sin(a)))
        for k in range(1, counts[2] + 1):
            pts.append((w, zb + r1 + (zbelt - r2 - zb - r1) * k / counts[2]))
        for k in range(1, counts[3] + 1):
            a = (math.pi / 2) * k / counts[3]
            pts.append((w - r2 + r2 * math.cos(a) * 0.9 + r2 * 0.1, zbelt - r2 + r2 * math.sin(a)))
        yb = pts[-1][0]
        yr = w * roof_w
        hg = ztop - zbelt
        r3 = min(0.10, 0.5 * hg)
        for k in range(1, counts[4] + 1):
            t = k / counts[4]
            pts.append((yb + (yr + r3 * 0.3 - yb) * t, zbelt + (hg - r3) * t))
        for k in range(1, counts[5] + 1):
            a = (math.pi / 2) * k / counts[5]
            pts.append((yr + 0.3 * r3 * math.cos(a), zbelt + hg - r3 + r3 * math.sin(a)))
        y_last = pts[-1][0]
        for k in range(1, counts[6] + 1):
            pts.append((y_last * (1 - k / counts[6]), ztop))
        return pts

    seg_of = [s for s, n in enumerate(counts) for _ in range(n)]
    us = [-0.5 + k / n_x for k in range(n_x + 1)]
    secs = [section(u) for u in us]
    nh = len(secs[0])
    ring = 2 * nh - 2

    def pt(i, j):
        y, z = secs[i][j] if j < nh else secs[i][ring - j]
        return (us[i] * L, y if j < nh else -y, z)

    def mat(i, j):
        u = 0.5 * (us[i] + us[i + 1])
        s = seg_of[j] if j < nh - 1 else seg_of[ring - j - 1]
        if s == 4 and g0 <= u <= g3:
            return 'lineup_glass'
        if s in (5, 6) and g0 <= u <= g3 and (glass_roof or u < g1 or u > g2):
            return 'lineup_glass'
        if s == 0:
            return 'lineup_under'
        return body_mat

    from geom import grid_surface, fan_cap
    m = grid_surface(len(us), ring, pt, mat, wrap_cols=True, flip=True)
    fan_cap(m, list(range(ring)), (us[0] * L, 0.0, 0.5 * (bottom(-0.5) + top(-0.5))), body_mat)
    fan_cap(m, [(len(us) - 1) * ring + j for j in range(ring)], (us[-1] * L, 0.0, 0.5 * (bottom(0.5) + top(0.5))), body_mat, reverse=True)
    m.weld()
    return m


def car_prop(kind, body_mat, glass_roof=True):
    """glass_roof=False keeps a body-colour roof between the rear glass and the windscreen (the white roof header
    seen above the foreground windscreen in close source shot B)."""
    L, W, H = VEHICLE_LWH[kind]
    if kind == 'sedan':
        keys = {'top': [(-0.5, 0.86), (-0.44, 1.00), (-0.34, 1.07), (-0.16, 1.40), (0.02, H), (0.18, 1.12), (0.30, 0.94), (0.44, 0.80), (0.5, 0.62)],
                'belt': [(-0.5, 0.86), (-0.40, 0.98), (0.0, 0.96), (0.30, 0.92), (0.44, 0.80), (0.5, 0.62)],
                'bottom': [(-0.5, 0.30), (-0.42, 0.16), (0.42, 0.16), (0.5, 0.30)],
                'glass': (-0.34, -0.14, 0.04, 0.26), 'roof_w': 0.72}
        m = lofted_vehicle(L, W, H, body_mat, keys, glass_roof=glass_roof)
        for s_ in (1, -1):    # slim headlamps at the front corners
            m.extend(box((0.5 * L - 0.10, s_ * 0.62, 0.70), (0.06, 0.34, 0.035), 'lamp_white_dim'))
        m.extend(box((0.5 * L - 0.02, 0.0, 0.40), (0.04, 1.10, 0.10), 'trim_dark'))
        add_wheels(m, (1.45, -1.43), 0.80, 0.34, 0.24)
    elif kind == 'crossover':
        keys = {'top': [(-0.5, 0.95), (-0.45, 1.20), (-0.36, 1.46), (-0.20, H), (0.04, H), (0.20, 1.22), (0.30, 1.02), (0.44, 0.88), (0.5, 0.66)],
                'belt': [(-0.5, 0.95), (-0.40, 1.04), (0.0, 1.02), (0.30, 1.00), (0.44, 0.88), (0.5, 0.66)],
                'bottom': [(-0.5, 0.34), (-0.42, 0.18), (0.42, 0.18), (0.5, 0.34)],
                'glass': (-0.44, -0.20, 0.06, 0.28), 'roof_w': 0.74}
        m = lofted_vehicle(L, W, H, body_mat, keys, glass_roof=True)
        m.extend(box((0.5 * L - 0.03, 0.0, 0.66), (0.04, 1.62, 0.022), 'lamp_white_dim'))   # full-width light bar
        m.extend(box((0.5 * L - 0.02, 0.0, 0.42), (0.04, 1.20, 0.12), 'trim_dark'))
        add_wheels(m, (1.45, -1.44), 0.83, 0.36, 0.25)
    else:   # compact_coupe: two-door, low fastback teardrop
        keys = {'top': [(-0.5, 0.80), (-0.44, 0.90), (-0.30, 1.02), (-0.08, H), (0.08, H), (0.24, 0.96), (0.34, 0.80), (0.46, 0.70), (0.5, 0.56)],
                'belt': [(-0.5, 0.80), (-0.40, 0.86), (0.0, 0.82), (0.30, 0.78), (0.46, 0.70), (0.5, 0.56)],
                'bottom': [(-0.5, 0.28), (-0.42, 0.15), (0.42, 0.15), (0.5, 0.26)],
                'glass': (-0.40, -0.12, 0.08, 0.32), 'roof_w': 0.70}
        m = lofted_vehicle(L, W, H, body_mat, keys, glass_roof=True)
        m.extend(box((0.5 * L - 0.03, 0.0, 0.56), (0.04, 1.50, 0.02), 'lamp_white_dim'))    # front light bar
        add_wheels(m, (1.30, -1.25), 0.82, 0.33, 0.23)
    return m


def cab_truck(body_mat):
    """Tall tractor cab as in the source front view: near-vertical rounded-corner box, huge dark wraparound
    windscreen, white upper fairing, thin lit strip, black bumper, camera wings; chassis, fifth wheel and wheels."""
    from geom import grid_surface, fan_cap
    W, x_back = 2.55, -1.40
    front = catmull([(0.30, 1.24), (0.85, 1.24), (1.85, 1.20), (2.85, 1.06), (3.30, 0.80), (3.75, 0.25)])
    bands = [(0.30, 'trim_dark'), (0.86, body_mat), (1.40, 'lamp_white_dim'), (1.46, body_mat),
             (1.86, 'lineup_glass'), (2.84, body_mat)]
    zs = [0.30, 0.55, 0.86, 1.10, 1.40, 1.46, 1.66, 1.86, 2.20, 2.55, 2.84, 3.05, 3.30, 3.55, 3.75]
    n_ring = 48

    def pt(i, j):
        z = zs[i]
        xf = front(z)
        cx, ax = 0.5 * (xf + x_back), 0.5 * (xf - x_back)
        t = 2 * math.pi * j / n_ring
        c, sn = math.cos(t), math.sin(t)
        e = 2 / 7.0
        return (cx + ax * math.copysign(abs(c) ** e, c), 0.5 * W * math.copysign(abs(sn) ** e, sn), z)

    def mat(i, j):
        z = 0.5 * (zs[i] + zs[i + 1])
        x = pt(i, j)[0]
        m = body_mat
        for z0, mt in bands:
            if z >= z0:
                m = mt
        if m == 'trim_dark' and x < front(z) - 0.6:
            return body_mat
        if m == 'lamp_white_dim' and x < front(z) - 0.15:
            return body_mat
        if m == 'lineup_glass' and x < front(z) - 1.05:
            return body_mat
        return m

    m = grid_surface(len(zs), n_ring, pt, mat, wrap_cols=True, flip=True)
    fan_cap(m, [(len(zs) - 1) * n_ring + j for j in range(n_ring)], (0.5 * (front(3.75) + x_back), 0.0, 3.75), body_mat)
    fan_cap(m, list(range(n_ring)), (0.5 * (front(0.3) + x_back), 0.0, 0.30), 'trim_dark', reverse=True)
    m.weld()
    for s_ in (1, -1):    # camera wings at the lower windscreen corners
        m.extend(box((1.02, s_ * (W / 2 + 0.16), 1.98), (0.10, 0.34, 0.05), 'trim_dark'))
        m.extend(box((1.02, s_ * (W / 2 + 0.33), 1.92), (0.12, 0.05, 0.16), 'trim_dark'))
    for s_ in (1, -1):    # chassis behind the cab: frame rails, side boxes
        m.extend(box((-3.0, s_ * 0.45, 0.95), (3.4, 0.12, 0.28), 'trim_dark'))
        m.extend(box((-1.9, s_ * 1.05, 0.85), (0.9, 0.42, 0.55), 'trim_dark'))
    m.extend(box((-3.6, 0.0, 1.16), (1.1, 1.6, 0.10), 'trim_dark'))
    add_wheels(m, (0.45,), 1.03, 0.52, 0.32)
    add_wheels(m, (-3.25, -4.55), 0.80, 0.52, 0.30, dual=True)
    return m


def angular_pickup(body_mat):
    """Flat-faceted pickup: one side profile extruded across the width, dark glass band and wheels."""
    from geom import extrude_profile
    m = Mesh()
    hw = 1.0
    prof = [(-2.84, 0.48), (2.84, 0.48), (2.84, 0.98), (0.55, 1.79), (-2.84, 1.16)]
    m.extend(extrude_profile(prof[::-1], -hw, hw, body_mat))     # extrude_profile wants clockwise (x right, z up)
    for s in (1, -1):
        y0, y1 = (hw, hw + 0.006) if s > 0 else (-hw - 0.006, -hw)
        m.extend(extrude_profile([(1.62, 1.24), (0.56, 1.66), (-0.95, 1.43), (-0.95, 1.24)][::-1], y0, y1, 'lineup_glass'))
        m.extend(box((1.85, s * (hw - 0.02), 0.62), (1.05, 0.06, 0.34), 'trim_dark'))
        m.extend(box((-1.85, s * (hw - 0.02), 0.62), (1.05, 0.06, 0.34), 'trim_dark'))
    # windscreen on the front slope
    a, b = (1.66, 1.23), (0.62, 1.70)
    n = norm((b[1] - a[1], 0.0, -(b[0] - a[0])))
    off = 0.008
    q = Mesh()
    pts = [(a[0] + n[0] * off * 0 + 0.0, -0.9, a[1]), (a[0], 0.9, a[1]), (b[0], 0.9, b[1]), (b[0], -0.9, b[1])]
    pts = [(p[0] - n[2] * off, p[1], p[2] + abs(n[0]) * off + off) for p in pts]
    idx = [q.add_vert(p) for p in pts]
    q.add_face(idx, 'lineup_glass')
    m.extend(q)
    m.extend(box((2.85, 0.0, 0.955), (0.02, 1.96, 0.035), 'lamp_white_dim'))     # full-width front light bar
    add_wheels(m, (1.85, -1.85), 0.86, 0.43, 0.30, mat_rim='trim_dark')
    return m


# ----------------------------------------------------------------------------------------------- foreground jack
JACK_FOOT_PX = (1707, 1040)


def trailer_jack():
    """Trailer-tongue jack post at the right foreground: outer tube, polished inner tube, foot plate, top housing
    with crank handle, side bracket blocks, hanging safety chain and the tongue beam leaving frame right."""
    base = WIDE.on_ground(*JACK_FOOT_PX)
    m = Mesh()

    def at(p):
        return add(base, p)
    m.extend(lathe([(0.0, 0.0), (0.27, 0.0), (0.27, 0.022), (0.10, 0.04), (0.0, 0.045)], 48, 'zinc', axis='Z', flip=True).transformed(at))
    m.extend(lathe([(0.072, 0.03), (0.072, 0.86)], 32, 'zinc', axis='Z', flip=True).transformed(at))
    m.extend(lathe([(0.0, 0.80), (0.11, 0.80), (0.11, 1.56), (0.122, 1.58), (0.122, 1.66), (0.06, 1.70), (0.0, 1.70)], 40, 'jack_steel', axis='Z', flip=True).transformed(at))
    crank = [(0.0, 0.0, 1.70), (0.0, 0.0, 1.76), (-0.10, 0.0, 1.78), (-0.30, -0.02, 1.78), (-0.32, -0.02, 1.70)]
    m.extend(tube([at(p) for p in crank], 0.014, 10, 'jack_steel'))
    m.extend(tube([at((-0.32, -0.02, 1.70)), at((-0.32, -0.02, 1.61))], 0.022, 12, 'trim_dark'))
    m.extend(box(at((0.17, 0.0, 1.33)), (0.14, 0.20, 0.16), 'jack_steel'))
    m.extend(box(at((0.17, 0.0, 1.10)), (0.10, 0.16, 0.22), 'jack_steel'))
    m.extend(box(at((0.85, 0.05, 0.70)), (1.60, 0.16, 0.13), 'jack_steel'))      # tongue beam toward frame right
    m.extend(box(at((1.80, 0.40, 0.70)), (0.20, 0.90, 0.13), 'jack_steel'))
    links = []
    for k in range(17):
        t = k / 16
        links.append(at((0.19 + 0.02 * math.sin(t * 3), -0.11, 1.28 - 0.55 * t + 0.10 * t * t)))
    m.extend(tube(links, 0.011, 6, 'zinc'))
    m.extend(lathe([(0.03, -0.006), (0.045, 0.0), (0.03, 0.006)], 16, 'zinc', axis='Y', closed_profile=True).transformed(lambda p: at((p[0] + 0.24, p[1] - 0.11, p[2] + 0.80))))
    return m


# ----------------------------------------------------------------------------------------------- poles and lines
POLE_TOP_PX = (915, 508)
POLE_DEPTH = 62.0
TOWER_TOP_PX = (1478, 608)
TOWER_DEPTH = 95.0
LINE_LEFT_PX = [(0, 371), (0, 386), (0, 399), (0, 446)]   # where the four lines leave frame left
LINE_LEFT_DEPTH = 16.0


def poles_and_lines():
    m = Mesh()
    top = WIDE.at_depth(*POLE_TOP_PX, POLE_DEPTH)
    m.extend(tube([(top[0], top[1], 0.0), top], 0.19, 12, 'wood_pole'))
    m.extend(box((top[0], top[1], top[2] - 0.45), (0.12, 2.4, 0.12), 'wood_pole'))
    tower = WIDE.at_depth(*TOWER_TOP_PX, TOWER_DEPTH)
    m.extend(tube([(tower[0], tower[1], 0.0), tower], 0.12, 10, 'trim_dark'))
    m.extend(box((tower[0], tower[1], tower[2] + 0.15), (0.6, 0.3, 0.35), 'trim_dark'))
    left_pole = None
    for k, (px, py) in enumerate(LINE_LEFT_PX):
        far = WIDE.at_depth(px - 260, py - 90, LINE_LEFT_DEPTH)     # off-frame anchor up and to the left
        end = add(top, (0.0, -1.1 + 0.55 * k, -0.40 - 0.2 * (k == 3)))
        m.extend(catenary(far, end, sag=0.012, mat='cable', radius=0.02))
        left_pole = far
        if k < 3:   # far span to the right: thicker so it resolves at ~60–95 m like the source lines
            m.extend(catenary(end, add(tower, (0.0, -0.3 + 0.3 * k, -0.2)), sag=0.010, mat='cable', radius=0.05))
    if left_pole:
        m.extend(tube([(left_pole[0], left_pole[1], 0.0), left_pole], 0.16, 12, 'wood_pole'))
    return m


def catenary(a, b, sag, mat, n=48, radius=0.02):
    span = math.dist(a, b)
    pts = []
    for k in range(n + 1):
        t = k / n
        p = add(a, mul(sub(b, a), t))
        pts.append((p[0], p[1], p[2] - 4 * sag * span * t * (1 - t)))
    return tube(pts, radius, 6, mat, caps=False)


# ----------------------------------------------------------------------------------------------- background bits
def background():
    m = Mesh()
    # small pale curved plate just behind the jack top with a dark frame to its right (purpose not established;
    # it is only partly visible in the source). Far props with hidden bases are placed at an assumed depth.
    bottom, top = WIDE.at_depth(1752, 645, 8.0), WIDE.at_depth(1772, 402, 8.0)
    plate = Mesh()
    rows = []
    for k in range(13):
        t = k / 12
        p = add(bottom, mul(sub(top, bottom), t))
        p = add(p, (0.10 * math.sin(t * math.pi * 0.5) ** 2, 0.0, 0.0))
        rows.append([plate.add_vert(add(p, (dx, 0.06 * dx * dx, 0.0))) for dx in (-0.21, 0.0, 0.21)])
    for k in range(12):
        for c in range(2):
            plate.add_face((rows[k][c], rows[k][c + 1], rows[k + 1][c + 1], rows[k + 1][c]), 'pale_structure')
    m.extend(plate)
    m.extend(tube([WIDE.at_depth(1815, 440, 8.6), WIDE.at_depth(1920, 700, 8.6)], 0.035, 8, 'jack_steel'))
    # low gray pop-up canopy mostly hidden behind the white sedan and a low barrier
    tent = WIDE.ground_below(594, 674, 48.0)
    m.extend(box(add(tent, (0.0, 0.0, 1.62)), (3.0, 3.0, 0.18), 'tent_grey'))
    for dx in (-1.4, 1.4):
        for dy in (-1.4, 1.4):
            m.extend(box(add(tent, (dx, dy, 0.78)), (0.05, 0.05, 1.56), 'trim_dark'))
    bar = WIDE.ground_below(482, 690, 40.0)
    for k in range(6):
        m.extend(box(add(bar, (-1.8 + 0.7 * k, 0.0, 0.55)), (0.04, 0.04, 1.1), 'trim_dark'))
    m.extend(box(add(bar, (0.0, 0.0, 1.05)), (3.8, 0.04, 0.05), 'trim_dark'))
    equip = WIDE.ground_below(1590, 680, 70.0)
    m.extend(box(add(equip, (0.0, 0.0, 1.0)), (4.0, 2.0, 2.0), 'equipment_orange'))
    return m


def ground():
    m = Mesh()
    s = 420.0
    idx = [m.add_vert(p) for p in ((-s, -40.0, 0.0), (s, -40.0, 0.0), (s, 2 * s, 0.0), (-s, 2 * s, 0.0))]
    m.add_face(idx, 'ground', uv=((-s, -40.0), (s, -40.0), (s, 2 * s), (-s, 2 * s)))   # UVs in metres
    return m


def build_props():
    """{object name: Mesh} for the whole static wide-shot set (car excluded)."""
    props = {'ground': ground(), 'jack_post': trailer_jack(), 'poles_lines': poles_and_lines(), 'background': background()}
    for kind, bbox, heading, mat in LINEUP:
        lwh = VEHICLE_LWH[kind]
        if kind == 'cab_truck':
            mesh = cab_truck(mat)
        elif kind == 'angular_pickup':
            mesh = angular_pickup(mat)
        else:
            mesh = car_prop(kind, mat)
        props['lineup_' + kind] = place(mesh, lineup_origin(bbox, heading, lwh), heading)
    return props


# ----------------------------------------------------------------------------------------------- lights
# Hard white night lighting. Positions/energies are look-development values (W in Blender units), not measured.
# Front floods sit far behind and above the camera so the lot falls off gently (proof-01's nearer floods burned the
# foreground ground white). Three backlights behind the lineup cast the radiating shadows that run from the parked
# vehicles toward the camera in the source and rim-light the car and gas. 'studio' lights are glossy-only reflection
# cards used for the model-review views only (area radiance ≈ P / (π·A) ≈ 15–20, i.e. coat reflections ≈ 1).
LIGHTS = [
    {'name': 'flood_left', 'type': 'SPOT', 'location': (-22.0, -48.0, 19.0), 'target': (-3.0, 27.0, 3.0),
     'energy': 95000.0, 'spot_deg': 52.0, 'blend': 0.5, 'radius': 1.0, 'color': (0.96, 0.98, 1.0)},
    {'name': 'flood_right', 'type': 'SPOT', 'location': (18.0, -50.0, 20.0), 'target': (4.0, 27.0, 4.0),
     'energy': 95000.0, 'spot_deg': 52.0, 'blend': 0.5, 'radius': 1.0, 'color': (0.96, 0.98, 1.0)},
    {'name': 'back_left', 'type': 'SPOT', 'location': (-16.0, 78.0, 9.0), 'target': (2.0, 8.0, 0.0),
     'energy': 40000.0, 'spot_deg': 60.0, 'blend': 0.6, 'radius': 0.5, 'color': (0.95, 0.97, 1.0)},
    {'name': 'back_centre', 'type': 'SPOT', 'location': (0.0, 85.0, 10.0), 'target': (0.0, 8.0, 0.0),
     'energy': 40000.0, 'spot_deg': 60.0, 'blend': 0.6, 'radius': 0.5, 'color': (0.95, 0.97, 1.0)},
    {'name': 'back_right', 'type': 'SPOT', 'location': (17.0, 78.0, 9.0), 'target': (-2.0, 8.0, 0.0),
     'energy': 40000.0, 'spot_deg': 60.0, 'blend': 0.6, 'radius': 0.5, 'color': (0.95, 0.97, 1.0)},
    {'name': 'tower_right', 'type': 'SPOT', 'location': (26.0, 40.0, 11.0), 'target': (0.0, 22.0, 0.0),
     'energy': 12000.0, 'spot_deg': 75.0, 'blend': 0.5, 'radius': 0.4, 'color': (1.0, 0.98, 0.95)},
    {'name': 'studio_top', 'type': 'AREA', 'location': (-3.0, 13.0, 9.0), 'target': (-3.0, 13.0, 0.0),
     'energy': 2300.0, 'size': (9.0, 4.0), 'color': (1.0, 1.0, 1.0), 'studio': True, 'glossy_only': True},
    {'name': 'studio_side', 'type': 'AREA', 'location': (-11.0, 4.0, 3.0), 'target': (-3.0, 13.0, 0.6),
     'energy': 700.0, 'size': (6.0, 2.5), 'color': (0.95, 0.97, 1.0), 'studio': True, 'glossy_only': True},
]


if __name__ == '__main__':
    props = build_props()
    for k, v in props.items():
        (x0, y0, z0), (x1, y1, z1) = v.bounds()
        print(f'{k:24s} {len(v.verts):6d} v {len(v.faces):6d} f  x {x0:7.2f}…{x1:7.2f}  y {y0:7.2f}…{y1:7.2f}  z {z0:5.2f}…{z1:5.2f}')
    for kind, bbox, heading, mat in LINEUP:
        o = lineup_origin(bbox, heading, VEHICLE_LWH[kind])
        print(f'{kind:16s} origin ({o[0]:6.2f}, {o[1]:6.2f})  projected base x {WIDE.project(o)[0]:7.1f}px')
