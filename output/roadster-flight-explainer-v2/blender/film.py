"""film.py: the 75 s film timeline for the explanatory acts (pure Python, no bpy).

state(t) returns everything the renderer needs at film time t (seconds, 30 fps): portrait camera, car pose,
plume levels, X-ray amount, contact-panel transform, schematic items (arrows, markers, particles: world-space
geo.Mesh objects with a fade level), film-light levels and label anchors for the Remotion overlay. Every beat is
keyed to the single cue table (data/film_cues.json), so picture, captions and sound share times.

All of 14–75 s is a PRINCIPLE ILLUSTRATION using the same exterior model: the suction region, nozzle layout,
vessel count/placement, force magnitudes and slow-motion factors are schematic, not Tesla data. Force arrows are
drawn to a consistent visual scale inside each act (weight = 1.2 m), not measured values. Gravity always points
down; attachment points into the contact surface; reaction thrust is opposite to the exhaust.
"""
import json
import math
import os

import diagram
import motion
import roadster
import shots
from geom import Mesh, add, cross, length, mul, norm, sub

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, 'data', 'film_cues.json'), encoding='utf-8') as fh:
    CUES = json.load(fh)
FPS = CUES['fps']
DURATION = CUES['duration_s']
W_PX, H_PX = 1080, 1920


def phrase(line_id, k):
    return next(l for l in CUES['lines'] if l['id'] == line_id)['phrases'][k]['start_s']


def scene_start(line_id):
    return next(s for s in CUES['scenes'] if s['id'] == line_id)['start_s']


# named beats (film seconds), all derived from the cue table
EV = {
    'attach': scene_start('03'), 'pump': phrase('03', 1), 'low': phrase('03', 2), 'outside': phrase('03', 3),
    'toward': phrase('03', 4), 'not_down': phrase('03', 5),
    'reaction': scene_start('04'), 'no_attach': phrase('04', 1), 'gas_out': phrase('04', 2), 'push': phrase('04', 3),
    'no_burn': phrase('04', 4), 'react_word': phrase('04', 5),
    'torque': scene_start('05'), 'moment': phrase('05', 1), 'turns': phrase('05', 2), 'combo': phrase('05', 3),
    'attitude': phrase('05', 4), 'flip': phrase('05', 5), 'not_hover': phrase('05', 6),
    'reserve': scene_start('06'), 'tesla': phrase('06', 1), 'inside': phrase('06', 2), 'vessels': phrase('06', 3),
    'puff1': phrase('06', 4), 'less': phrase('06', 5), 'used': phrase('06', 6), 'gone': phrase('06', 7),
    'limits': scene_start('07'), 'balance': phrase('07', 1), 'control': phrase('07', 2), 'demo': phrase('07', 3),
    'howlong': phrase('07', 4), 'gas': phrase('07', 5), 'energy': phrase('07', 6),
}
ACTS = [('source', 0.0, EV['attach']), ('attach', EV['attach'], EV['reaction']),
        ('reaction', EV['reaction'], EV['torque']), ('torque', EV['torque'], EV['reserve']),
        ('reserve', EV['reserve'], EV['limits']), ('limits', EV['limits'], DURATION)]

D0 = (0.0, 14.0, 0.0)          # demo spot on the lot, ~14 m in front of the parked lineup
PANEL_TOP = 0.10
PANEL_SIZE = (7.0, 4.0, PANEL_TOP)     # schematic contact surface: width, depth, thickness; top face at PANEL_TOP
HEADING = 180.0                # nose toward -X: the camera at -Y sees the car's left side, as in the source
WEIGHT_LEN = 1.2               # drawn length of the weight arrow; other forces scale from it
COM = roadster.COM

# Explanatory acts use a SCHEMATIC exhaust direction for the four under-body ports: the fitted source plumes lean
# 0.12 forward, which would tilt every reaction arrow ~10° off car-up. Here the fore-aft lean is removed (the outward
# splay stays), so each left/right pair's resultant is exactly car-up and every drawn force is exactly opposite to
# its drawn exhaust. The source reconstruction (0–14 s) keeps roadster.NOZZLES unchanged.
EXPLAIN_DIRS = {n: ((0.0, d[1], d[2]) if n != 'NOSE' else d) for n, (_, d) in roadster.NOZZLES.items()}
# Front and rear pair thrust shares whose pitch moments about the CoM cancel (lever arms |x| 1.02 m and 1.50 m), so
# a four-port push is a pure translation. Schematic ratio, not a Tesla specification.
REAR_SHARE = abs(roadster.NOZZLES['FL'][0][0] - COM[0]) / abs(roadster.NOZZLES['RL'][0][0] - COM[0])


def reaction(name):
    """Unit reaction force on the car (car-local) from one schematic port: opposite to its exhaust."""
    return mul(norm(EXPLAIN_DIRS[name]), -1.0)


# film-only lights for the explanatory acts (the source lot keeps staging.LIGHTS); levels are set per frame
FILM_LIGHTS = [
    {'name': 'film_key', 'type': 'AREA', 'location': (-5.5, 6.5, 7.5), 'target': (0.0, 14.0, 0.8),
     'energy': 5200.0, 'size': (5.0, 3.0), 'color': (1.0, 0.97, 0.93)},
    {'name': 'film_rim', 'type': 'SPOT', 'location': (6.0, 24.0, 5.5), 'target': (0.0, 14.0, 1.2),
     'energy': 9000.0, 'spot_deg': 40.0, 'blend': 0.6, 'radius': 0.6, 'color': (0.80, 0.90, 1.0)},
]


# ----------------------------------------------------------------------------------------------- small helpers
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smooth(x):
    x = clamp(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ramp(t, t0, t1):
    return smooth((t - t0) / (t1 - t0)) if t1 > t0 else float(t >= t0)


def window(t, a, b, c, d):
    """0 before a, rises to 1 by b, holds, falls to 0 by d."""
    return min(ramp(t, a, b), 1.0 - ramp(t, c, d))


def lerp(a, b, x):
    return a + (b - a) * x


def lerp3(a, b, x):
    return tuple(lerp(a[k], b[k], x) for k in range(3))


def lerp_nested(a, b, x):
    """lerp() at the leaves of equally shaped nested tuples, e.g. camera keys ((eye), (target), (lens,))."""
    if isinstance(a, (tuple, list)):
        return tuple(lerp_nested(p, q, x) for p, q in zip(a, b))
    return lerp(a, b, x)


def keyed(keys, t):
    """Piecewise eased interpolation of (nested) tuples between (time, value) keys."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return lerp_nested(v0, v1, smooth((t - t0) / (t1 - t0)))
    return keys[-1][1]


def h(i, k=0):
    """Deterministic hash → [0, 1)."""
    x = math.sin(i * 12.9898 + k * 78.233 + 0.5) * 43758.5453
    return x - math.floor(x)


def xf(M, p):
    return tuple(M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2] + M[r][3] for r in range(3))


def xd(M, d):
    return tuple(M[r][0] * d[0] + M[r][1] * d[1] + M[r][2] * d[2] for r in range(3))


def matmul4(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def translate(v):
    return [[1, 0, 0, v[0]], [0, 1, 0, v[1]], [0, 0, 1, v[2]], [0, 0, 0, 1]]


def rot_y(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]


def car_matrix(centre, pitch=0.0, roll=0.0, heading=HEADING):
    return motion.pose_matrix(centre, heading, pitch, roll)


REST_CENTRE = add(D0, (0.0, 0.0, PANEL_TOP + COM[2]))       # body centre with the wheels on the panel


# body envelope (centre line top, half width) for placing items and culling particles
_ENV = []
for _k in range(45):
    _x = -2.2 + 4.4 * _k / 44
    _pts = roadster.half_section(_x)
    _ENV.append((_x, max(p[1] for p in _pts), roadster.half_w(_x), roadster.z_floor(_x)))


def body_top(x):
    k = clamp((x + 2.2) / 4.4) * 44
    i = min(43, int(k))
    f = k - i
    return lerp(_ENV[i][1], _ENV[i + 1][1], f)


def inside_body(p, margin=0.06):
    x, y, z = p
    if not -2.2 - margin < x < 2.2 + margin:
        return False
    k = clamp((x + 2.2) / 4.4) * 44
    i = min(43, int(k))
    _, top, hw, fl = _ENV[i]
    return abs(y) < hw + margin and fl - margin < z < top + margin


# ----------------------------------------------------------------------------------------------- frame state
class Frame:
    def __init__(self, t):
        self.t = t
        self.items = []          # (id, Mesh in world space, level 0..1)
        self.anchors = {}        # id → (world point, level, text)
        self.plumes = {n: 0.0 for n in roadster.NOZZLES}
        self.xray = 0.0
        self.vessels = 0.0
        self.panel = None        # (matrix, level)
        # light levels (multipliers): film key/rim exist only for the explanatory acts; the source lot's floods
        # and back lights are dimmed there so the subject separates from the parked lineup
        self.lights = {'film_key': 1.0, 'film_rim': 1.0, 'floods': 0.55, 'backs': 0.6}
        self.notes = []          # overlay notes (text, level), not anchored
        self.nozzle_dirs = EXPLAIN_DIRS   # plume directions (car-local) for this frame
        self.clouds = []         # source-shot gas cloud puffs (motion.cloud_state records)
        self.set_pieces = {'b_foreground': False, 'moon': True}
        self.car_visible = True
        self.shot = None         # source shot A/B/C/D for t < 14 s
        self.event_s = None      # time on motion.py's clock for source shots
        self.pose = None

    def item(self, ident, mesh, level):
        if level > 0.002 and mesh.faces:
            self.items.append((ident, mesh, clamp(level)))

    def anchor(self, ident, point, level, text):
        if level > 0.002:
            self.anchors[ident] = (point, clamp(level), text)

    def note(self, ident, text, level):
        if level > 0.002:
            self.notes.append((ident, text, clamp(level)))


def arrow_item(fr, ident, start, end, level, mat, radius=0.03):
    fr.item(ident, diagram.arrow(start, end, radius, mat), level)


def gravity_arrow(fr, centre, toward_cam, level, length_=WEIGHT_LEN, ident='gravity', label=True):
    s = add(centre, toward_cam)
    e = add(s, (0.0, 0.0, -length_))
    arrow_item(fr, ident, s, e, level, 'fx_white', 0.032)
    if label:
        fr.anchor(ident, e, level, '重力')


# ----------------------------------------------------------------------------------------------- act 3: suction
def _air_points(t, n=230, seed=11):
    """Ambient air dots around the car, car-local, jittering; points inside the body are skipped."""
    pts = []
    for i in range(n):
        p = (-3.4 + 6.8 * h(i, seed), -1.7 + 3.4 * h(i, seed + 1), 0.05 + 1.95 * h(i, seed + 2))
        j = (0.05 * math.sin(t * (1.3 + h(i, 4)) + 6.28 * h(i, 5)), 0.05 * math.sin(t * (1.1 + h(i, 6)) + 6.28 * h(i, 7)),
             0.04 * math.sin(t * (1.7 + h(i, 8)) + 6.28 * h(i, 9)))
        p = add(p, j)
        if not inside_body(p):
            pts.append(p)
    return pts


def _gap_points(t, t_pump, n=80, seed=31):
    """Air in the floor gap (car-local, panel top at z = 0 relative to the wheels). From the pump beat 75 % of the
    dots are drawn out sideways and fade; 25 % stay (lower density = lower pressure)."""
    keep, leaving = [], []
    for i in range(n):
        base = (-1.45 + 2.9 * h(i, seed), -0.68 + 1.36 * h(i, seed + 1), 0.02 + 0.10 * h(i, seed + 2))
        jit = (0.03 * math.sin(t * 2.1 + 6.28 * h(i, 3)), 0.03 * math.sin(t * 1.7 + 6.28 * h(i, 4)), 0.0)
        p = add(base, jit)
        if h(i, 9) < 0.25:
            keep.append(p)
            continue
        u = clamp((t - t_pump - 0.6 * h(i, 10)) / 1.6)
        if u <= 0:
            keep.append(p)
            continue
        side = 1.0 if p[1] >= 0 else -1.0
        out = (p[0], p[1] + side * (0.9 * u + 1.2 * u * u), p[2] + 0.5 * u * u)
        if u < 1:
            leaving.append(out)
    return keep, leaving


def act_attach(fr, t):
    a = EV['attach']
    tilt_deg = 68.0 * ramp(t, EV['not_down'], EV['not_down'] + 1.4)
    pivot = add(D0, (3.6, 0.0, 0.0))
    T = matmul4(translate(pivot), matmul4(rot_y(math.radians(tilt_deg)), translate(mul(pivot, -1.0))))
    M = matmul4(T, car_matrix(REST_CENTRE))
    fr.car = M
    fr.panel = (matmul4(T, translate(D0)), ramp(t, a, a + 0.8))
    toward = (0.0, -1.35, 0.0)          # world offset toward the camera for free-standing arrows
    lift = 0.0                          # car-local z of the panel top relative to the wheels = 0
    # air: ambient + floor gap; pump outflow arrows; low-pressure slab
    air_level = ramp(t, a + 0.4, a + 1.6)
    fr.item('air', diagram.dots([xf(M, p) for p in _air_points(t)], 0.016, 'fx_air'), air_level)
    keep, leaving = _gap_points(t, EV['pump'])
    fr.item('gap_air', diagram.dots([xf(M, p) for p in keep], 0.013, 'fx_air'), air_level)
    fr.item('gap_leaving', diagram.dots([xf(M, p) for p in leaving], 0.013, 'fx_air'), air_level)
    pump = window(t, EV['pump'], EV['pump'] + 0.4, EV['low'] + 0.6, EV['low'] + 1.2)
    for k, x in enumerate((-0.9, 0.0, 0.9)):
        for s in (1, -1):
            p0, p1 = (x, s * 0.55, lift + 0.07), (x, s * 1.25, lift + 0.07)
            arrow_item(fr, 'pump_%d_%d' % (k, s), xf(M, p0), xf(M, p1), pump, 'fx_cyan', 0.014)
    low = ramp(t, EV['low'], EV['low'] + 0.8)
    zone = diagram.slab((3.0, 1.45, 0.11), 'fx_low').transformed(lambda p: xf(M, add(p, (-0.02, 0.0, lift + 0.065))))
    fr.item('low_zone', zone, 0.55 * low)
    fr.anchor('low', xf(M, (0.2, 0.9, lift + 0.06)), low * (1 - ramp(t, EV['not_down'] - 0.4, EV['not_down'])), '低压')
    # outside pressure on the upper surfaces (into the body) and the net attachment toward the surface
    out_level = ramp(t, EV['outside'], EV['outside'] + 0.9)
    for k, x in enumerate((-1.75, -1.15, -0.55, 0.05, 0.65, 1.25, 1.8)):
        lv = ramp(t, EV['outside'] + 0.09 * k, EV['outside'] + 0.09 * k + 0.5)
        z = body_top(x)
        arrow_item(fr, 'press_%d' % k, xf(M, (x, 0.0, z + 0.95)), xf(M, (x, 0.0, z + 0.08)), lv, 'fx_cyan', 0.022)
    fr.anchor('outside', xf(M, (0.4, 0.0, body_top(0.4) + 1.15)), out_level, '外界压力')
    net = ramp(t, EV['outside'] + 0.9, EV['outside'] + 1.6)
    emph = 1.0 + 0.3 * window(t, EV['toward'], EV['toward'] + 0.3, EV['toward'] + 0.9, EV['toward'] + 1.4)
    arrow_item(fr, 'net', xf(M, (0.0, 1.25, 1.75)), xf(M, (0.0, 1.25, lift + 0.03)), net, 'fx_cyan_strong', 0.034 * emph)
    fr.anchor('net', xf(M, (0.0, 1.25, 1.0)), net, '压向路面')
    # gravity stays straight down while the surface tilts
    g = ramp(t, EV['not_down'], EV['not_down'] + 0.6)
    gravity_arrow(fr, xf(M, COM), add(toward, (0.0, -0.4, 0.0)), g)
    # panel-local (-1.0, -1.8): the near panel edge, inside the portrait for the whole label window (math review)
    fr.anchor('surface', xf(matmul4(T, translate(D0)), (-1.0, -1.8, 0.0)), window(t, a + 0.5, a + 1.2, EV['pump'] - 0.4, EV['pump']), '接触面')
    # camera: establishing 3/4 → low side (gap) → wide side for the tilt
    cam = keyed([(a, ((-6.0, -6.4, 3.0), (0.0, 0.0, 0.7), (26.0,))),
                 (a + 1.8, ((-0.6, -8.2, 1.15), (0.0, 0.0, 0.75), (28.0,))),
                 (EV['pump'] - 0.2, ((-0.3, -7.8, 0.55), (0.1, 0.0, 0.42), (26.0,))),     # whole car + margins
                 (EV['toward'] - 0.3, ((-0.3, -7.8, 0.55), (0.1, 0.0, 0.42), (26.0,))),
                 (EV['toward'] + 1.0, ((0.6, -10.0, 1.6), (0.8, 0.0, 1.3), (30.0,))),
                 (EV['not_down'] + 1.6, ((2.0, -11.2, 2.8), (2.0, 0.0, 2.7), (30.0,)))], t)
    fr.camera = {'eye': add(D0, cam[0]), 'target': add(D0, cam[1]), 'lens_mm': cam[2][0], 'fstop': 2.8}


# ----------------------------------------------------------------------------------------------- act 4: reaction
SLOW4 = 0.25           # slow-motion factor for the hop (event seconds per film second)
A_PULSE, T_PULSE = 4.0, 0.8            # net upward acceleration and duration of the liftoff pulse (event s)
G = 9.81


def _hop(tau):
    """Event-time hop: pulse (net +4 m/s² for 0.8 s), ballistic, then a cushion pulse (net +g) that brings the car
    down to -0.3 m/s at touchdown. Returns (height, velocity, thrust/weight, phase)."""
    if tau <= 0:
        return 0.0, 0.0, 0.0, 'rest'
    if tau <= T_PULSE:
        return 0.5 * A_PULSE * tau * tau, A_PULSE * tau, (A_PULSE + G) / G, 'pulse'
    z1, v1 = 0.5 * A_PULSE * T_PULSE ** 2, A_PULSE * T_PULSE
    tp = T_PULSE + v1 / G
    zp = z1 + v1 * v1 / (2 * G)
    hc = (2 * G * zp - 0.09) / (4 * G)          # cushion start height for net decel g and 0.3 m/s at contact
    tc = tp + math.sqrt(2 * (zp - hc) / G)
    if tau <= tc:
        d = tau - T_PULSE
        return z1 + v1 * d - 0.5 * G * d * d, v1 - G * d, 0.0, 'ballistic'
    vc = -math.sqrt(2 * G * (zp - hc))
    d = tau - tc
    te = (-0.3 - vc) / G
    if d <= te:
        return hc + vc * d + 0.5 * G * d * d, vc + G * d, 2.0, 'cushion'
    return 0.0, 0.0, 0.0, 'landed'


def act_reaction(fr, t):
    a = EV['reaction']
    back = 68.0 * (1.0 - ramp(t, a, a + 1.3))
    pivot = add(D0, (3.6, 0.0, 0.0))
    T = matmul4(translate(pivot), matmul4(rot_y(math.radians(back)), translate(mul(pivot, -1.0))))
    tau = (t - EV['gas_out']) * SLOW4
    z, v, tw, phase = _hop(tau)
    centre = add(REST_CENTRE, (0.0, 0.0, z))
    M = matmul4(T, car_matrix(centre))
    fr.car = M
    fr.panel = (matmul4(T, translate(D0)), 1.0)
    # the attachment diagram goes away: "can't rely on this once off the surface"
    fade = 1.0 - ramp(t, EV['no_attach'], EV['no_attach'] + 1.0)
    if fade > 0:
        for k, x in enumerate((-1.75, -1.15, -0.55, 0.05, 0.65, 1.25, 1.8)):
            zt = body_top(x)
            arrow_item(fr, 'press_%d' % k, xf(M, (x, 0.0, zt + 0.95)), xf(M, (x, 0.0, zt + 0.08)), fade, 'fx_cyan', 0.022)
        arrow_item(fr, 'net', xf(M, (0.0, 1.45, 1.75)), xf(M, (0.0, 1.45, 0.03)), fade, 'fx_cyan_strong', 0.05)
        fr.item('low_zone', diagram.slab((3.0, 1.45, 0.11), 'fx_low').transformed(lambda p: xf(M, add(p, (-0.02, 0.0, 0.065)))), 0.55 * fade)
        fr.item('air', diagram.dots([xf(M, p) for p in _air_points(t)], 0.016, 'fx_air'), fade)
    firing = phase in ('pulse', 'cushion')
    level = 1.0 if firing else 0.0
    for n in ('FL', 'FR'):
        fr.plumes[n] = level
    for n in ('RL', 'RR'):
        fr.plumes[n] = level * REAR_SHARE      # pitch moments cancel: the push is a pure translation
    toward = (0.0, -1.3, 0.0)
    ex = window(t, EV['gas_out'] + 0.15, EV['gas_out'] + 0.6, EV['gas_out'] + T_PULSE / SLOW4 - 0.3, EV['gas_out'] + T_PULSE / SLOW4 + 0.2)
    for n in ('FL', 'RL'):
        p0 = xf(M, roadster.NOZZLES[n][0])
        dd = norm(xd(M, EXPLAIN_DIRS[n]))        # exactly the drawn plume direction
        arrow_item(fr, 'exhaust_' + n, add(p0, (0.0, -0.75, -0.15)), add(add(p0, (0.0, -0.75, -0.15)), mul(dd, 0.95)), ex, 'fx_cyan_strong', 0.03)
    fr.anchor('exhaust', add(xf(M, roadster.NOZZLES['FL'][0]), (0.0, -0.75, -1.2)), ex, '喷气')
    com = xf(M, COM)
    # resultant of the four schematic ports: each pair sums to car-up and the shares put it through the CoM
    up = norm(xd(M, (0.0, 0.0, 1.0)))
    th = ramp(t, EV['push'], EV['push'] + 0.5) * (1.0 if phase == 'pulse' else 0.0)
    th = max(th, 1.0 if phase == 'cushion' else 0.0)
    th *= 1.0 - ramp(t, EV['gas_out'] + T_PULSE / SLOW4, EV['gas_out'] + T_PULSE / SLOW4 + 0.35) if phase != 'cushion' else 1.0
    if tw > 0 or th > 0:
        L = WEIGHT_LEN * (tw if tw > 0 else (A_PULSE + G) / G)
        arrow_item(fr, 'thrust', add(com, toward), add(add(com, toward), mul(up, L)), th, 'fx_amber', 0.045)
        fr.anchor('thrust', add(add(com, toward), mul(up, L + 0.15)), th, '推力')
    g = ramp(t, EV['push'], EV['push'] + 0.5)
    gravity_arrow(fr, com, add(toward, (0.0, -0.2, 0.0)), g)
    fr.note('cold', '冷气 · 非燃烧', window(t, EV['no_burn'], EV['no_burn'] + 0.4, EV['reaction'] + 12.4, EV['reaction'] + 12.9))
    fr.note('react', '喷气的反作用', window(t, EV['react_word'], EV['react_word'] + 0.4, EV['reaction'] + 12.4, EV['reaction'] + 12.9))
    fr.note('slowmo', '慢放示意', window(t, EV['gas_out'], EV['gas_out'] + 0.3, EV['torque'] - 1.2, EV['torque'] - 0.8))
    # camera a little above the car looking down ~10°: the car reads against the lit lot below the parked
    # lineup instead of merging with it (render diagnostic, 34 s); it rises with the hop
    cam = keyed([(a, ((2.0, -11.2, 2.8), (2.0, 0.0, 2.7), (30.0,))),
                 (a + 1.6, ((0.3, -9.6, 2.8), (0.2, 0.0, 0.95), (30.0,))),
                 (EV['gas_out'] - 0.3, ((0.3, -9.6, 2.8), (0.2, 0.0, 0.95), (30.0,))),
                 (EV['gas_out'] + 1.2, ((0.2, -9.4, 2.9), (0.1, 0.0, 1.05), (30.0,)))], t)
    eye, tgt = add(D0, cam[0]), add(D0, cam[1])
    if t > EV['gas_out']:
        eye, tgt = add(eye, (0.0, 0.0, 0.85 * z)), add(tgt, (0.0, 0.0, 0.85 * z))
    fr.lights['floods'] = 0.6
    fr.camera = {'eye': eye, 'target': tgt, 'lens_mm': cam[2][0], 'fstop': 2.8}


# ----------------------------------------------------------------------------------------------- act 5: torque
C5 = add(D0, (0.0, 0.0, 3.2))
SLOW_FALL = 0.18        # schematic slow motion of the fall (labelled 慢放示意): keeps the CoM above the lot, in frame
PITCH_PULSE = 1.0       # s, length of each pitch pulse (schematic)
PITCH_PEAK = 20.0       # deg nose-down once the front pair has stopped the rotation
ROLL_TIME = 1.6         # s, one full roll: FR/RR accelerate the first half, FL/RL brake the second half


def pitch_schedule():
    """(t_rear, t_front, angular acceleration deg/s²). The rear pair fires at t_rear and starts a nose-down rotation,
    the car turns at a constant rate, the front pair fires at t_front and stops it at PITCH_PEAK."""
    t1, t2, T = EV['moment'], EV['combo'], PITCH_PULSE
    return t1, t2, PITCH_PEAK / (T * (T + (t2 - t1 - T)))


def roll_schedule():
    t0 = EV['attitude'] + 0.05
    return t0, t0 + 0.5 * ROLL_TIME, t0 + ROLL_TIME


def _pitch_roll(t):
    """Attitude driven only by the pictured pulses (schematic rigid-body kinematics): constant angular acceleration
    while a pair fires, constant rate in between, at rest otherwise. Rear pair → nose-down pitch, front pair stops it.
    The roll is one full turn to the left, the source kickflip direction: Rx(-roll) needs NEGATIVE car-local X torque,
    which the right-hand ports FR/RR give; FL/RL give positive X torque and brake it (math review, item 2)."""
    t1, t2, a = pitch_schedule()
    T = PITCH_PULSE
    w = a * T
    if t <= t1:
        pitch = 0.0
    elif t <= t1 + T:
        pitch = 0.5 * a * (t - t1) ** 2
    elif t <= t2:
        pitch = 0.5 * a * T * T + w * (t - t1 - T)
    elif t <= t2 + T:
        d = t - t2
        pitch = 0.5 * a * T * T + w * (t2 - t1 - T) + w * d - 0.5 * a * d * d
    else:
        pitch = PITCH_PEAK
    r0, rm, r1 = roll_schedule()
    alpha = 360.0 / ((rm - r0) ** 2)            # deg/s²: half the turn accelerating, half braking
    if t <= r0:
        roll = 0.0
    elif t <= rm:
        roll = 0.5 * alpha * (t - r0) ** 2
    elif t <= r1:
        roll = 360.0 - 0.5 * alpha * (r1 - t) ** 2
    else:
        roll = 360.0
    return pitch, roll


def pulse(t, a, b, edge=0.06):
    """Valve level of a pulse open from a to b (short open/close ramps inside the interval)."""
    return window(t, a, a + edge, b - edge, b)


def torque_pulses(t):
    """Valve levels of the torque act. Pairs that fire together across the front and rear use REAR_SHARE so the
    unwanted pitch and yaw moments cancel; the roll pulses therefore turn the car about its long axis only."""
    t1, t2, _ = pitch_schedule()
    r0, rm, r1 = roll_schedule()
    rear, front = pulse(t, t1, t1 + PITCH_PULSE), pulse(t, t2, t2 + PITCH_PULSE)
    roll_on, roll_brake = pulse(t, r0, rm), pulse(t, rm, r1)
    # the rear pair also fires at REAR_SHARE strength for pitch: its 1.50 m lever arm then gives the same angular
    # impulse as the front pair's full-strength pulse on 1.02 m, so start and stop are symmetric (review-02, P2)
    return {'rear': rear, 'front': front, 'roll_on': roll_on, 'roll_brake': roll_brake,
            'FL': max(front, roll_brake), 'FR': max(front, roll_on),
            'RL': REAR_SHARE * max(rear, roll_brake), 'RR': REAR_SHARE * max(rear, roll_on)}


def act_torque(fr, t):
    e = EV
    fall_t0 = e['flip'] + 0.25
    fall = 0.0
    if t > fall_t0:
        tau = (t - fall_t0) * SLOW_FALL
        fall = 0.5 * G * tau * tau
    pitch, roll = _pitch_roll(t)
    centre = add(C5, (0.0, 0.0, -fall))
    M = car_matrix(centre, pitch, roll)
    fr.car = M
    fr.lights['floods'] = 0.35
    com = xf(M, COM)
    toward = (0.0, -1.4, 0.0)
    up = norm(xd(M, (0.0, 0.0, 1.0)))
    fwd = norm(xd(M, (1.0, 0.0, 0.0)))
    c_t = add(com, toward)
    # CoM marker (billboard handled by the renderer: item id 'com')
    cm = ramp(t, e['torque'], e['torque'] + 0.6)
    fr.item('com', diagram.com_marker(0.13).transformed(lambda p: add(c_t, (p[0], 0.0, p[1]))), cm)
    fr.anchor('com', add(c_t, (0.18, 0.0, 0.22)), cm, '重心')
    lv = torque_pulses(t)
    for n in ('FL', 'FR', 'RL', 'RR'):
        fr.plumes[n] = lv[n]
    # pitch pulses: each pair's resultant is car-up at its station (schematic ports), so the arrow lies on its line
    # of action; the arrows sit beside the body toward the camera (the side view is unchanged by that offset)
    for tag, nz, strength in (('rear', 'RL', REAR_SHARE), ('front', 'FL', 1.0)):
        if lv[tag] <= 0:
            continue
        p = add(xf(M, (roadster.NOZZLES[nz][0][0], 0.0, roadster.NOZZLES[nz][0][2])), toward)
        arrow_item(fr, 'thrust_' + tag, p, add(p, mul(up, 1.3 * strength)), lv[tag], 'fx_amber', 0.042)
        fr.anchor('thrust_' + tag, add(p, mul(up, 1.3 * strength + 0.15)), lv[tag], '推力')
    # roll pulses: each port's own reaction, exactly opposite its exhaust, drawn ON its line of action (tail out in
    # the gas, tip at the port)
    for n in ('FL', 'FR', 'RL', 'RR'):
        lr = lv['roll_on'] if n in ('FR', 'RR') else lv['roll_brake']
        if lr <= 0:
            continue
        p = xf(M, roadster.NOZZLES[n][0])
        d = norm(xd(M, EXPLAIN_DIRS[n]))
        size = 0.08 + 0.87 * (REAR_SHARE if n[0] == 'R' else 1.0)      # drawn length ∝ that port's thrust
        arrow_item(fr, 'port_' + n, add(p, mul(d, size)), add(p, mul(d, 0.08)), lr, 'fx_amber', 0.026)
    # the rear pair's line of action (dashed) and its offset from the CoM, before and during the first pulse
    t1, t2, _ = pitch_schedule()
    line = window(t, e['torque'] + 0.6, e['torque'] + 1.2, t1 + PITCH_PULSE, t1 + PITCH_PULSE + 0.5)
    p_r = add(xf(M, (roadster.NOZZLES['RL'][0][0], 0.0, roadster.NOZZLES['RL'][0][2])), toward)
    fr.item('line', diagram.dashed(add(p_r, mul(up, -1.2)), add(p_r, mul(up, 3.0)), 0.012, 'fx_amber'), line)
    fr.anchor('line', add(p_r, mul(up, 2.7)), line, '作用线')
    off = window(t, e['torque'] + 1.2, e['torque'] + 1.8, t1 + PITCH_PULSE, t1 + PITCH_PULSE + 0.5)
    foot = add(c_t, mul(fwd, (roadster.NOZZLES['RL'][0][0] - COM[0])))
    fr.item('offset', diagram.dashed(c_t, foot, 0.009, 'fx_white', dash=0.08, gap=0.06), off)
    fr.anchor('offset', lerp3(c_t, foot, 0.5), off, '偏离')
    # torque arcs only while a pair fires (torque → angular acceleration); between pulses a thin white arc shows the
    # rotation continuing at a constant rate with no torque
    x_ax, z_ax = (-1.0, 0.0, 0.0), (0.0, 0.0, 1.0)
    if lv['rear'] > 0:
        arc = diagram.arc_arrow(0.62, math.radians(200), math.radians(-60), 0.02, 'fx_amber')     # nose-down sense
        fr.item('torque', diagram.place(arc, c_t, x_ax, z_ax), lv['rear'])
        fr.anchor('torque', add(c_t, (0.0, 0.0, 0.85)), lv['rear'], '力矩')
    if lv['front'] > 0:
        arc = diagram.arc_arrow(0.62, math.radians(-60), math.radians(200), 0.02, 'fx_amber')     # nose-up sense
        fr.item('torque_back', diagram.place(arc, c_t, x_ax, z_ax), lv['front'])
        fr.anchor('torque_back', add(c_t, (0.0, 0.0, 0.85)), lv['front'], '力矩')
    spin = window(t, t1 + PITCH_PULSE - 0.1, t1 + PITCH_PULSE + 0.2, t2 - 0.2, t2 + 0.1)
    if spin > 0:
        arc = diagram.arc_arrow(0.48, math.radians(170), math.radians(10), 0.011, 'fx_white')
        fr.item('spin', diagram.place(arc, c_t, x_ax, z_ax), spin)
        fr.anchor('spin', add(c_t, (0.0, 0.0, 0.66)), spin, '转动')
    fr.note('rotation_only', '只示意转动（暂未画下落）', window(t, e['torque'] + 0.4, e['torque'] + 0.9, e['flip'] - 0.1, e['flip'] + 0.3))
    g = ramp(t, e['flip'] + 0.05, e['flip'] + 0.5)
    gravity_arrow(fr, com, add(toward, (0.0, -0.1, 0.0)), g)
    fr.note('slowmo_fall', '慢放示意', ramp(t, fall_t0, fall_t0 + 0.3))
    fr.note('not_hover', '翻转 ≠ 悬停', ramp(t, e['not_hover'] - 0.1, e['not_hover'] + 0.4))
    fr.camera = {'eye': add(C5, (0.2, -8.4, 0.45)), 'target': add(C5, (0.1, 0.0, 0.1)), 'lens_mm': 32.0, 'fstop': 4.0}


# ----------------------------------------------------------------------------------------------- act 6: reserve
VESSELS = [   # (name, centre car-local, axis, radius, length): schematic placement in available space
    ('tunnel', (0.05, 0.0, 0.30), 'x', 0.105, 2.10),
    ('sill_left', (0.0, 0.60, 0.27), 'x', 0.085, 1.80),
    ('sill_right', (0.0, -0.60, 0.27), 'x', 0.085, 1.80),
    ('rear', (-1.05, 0.0, 0.52), 'y', 0.15, 1.30),
    ('front', (1.55, 0.0, 0.42), 'y', 0.115, 1.00),
]
RESERVE_STEPS = [(None, 1.0), ('puff1', 0.82), ('used', 0.66)]


def reserve_level(t):
    lv = 1.0
    for key, val in RESERVE_STEPS[1:]:
        lv = lerp(lv, val, ramp(t, EV[key] + 0.2, EV[key] + 0.9))
    if t > EV['limits']:
        lv = lerp(lv, 0.40, ramp(t, EV['limits'] + 0.6, EV['demo'] + 1.2))
    return lv


def vessel_points(level, t, seed=51):
    """Gas dots filling each vessel's full volume (no liquid-style fill line); count follows the reserve level."""
    pts = []
    for vi, (_, c, axis, r, L) in enumerate(VESSELS):
        n_full = int(70 * (r * r * L) / (0.105 * 0.105 * 2.1)) + 12
        n = int(round(n_full * level))
        for i in range(n_full):
            if i >= n:
                break
            k = vi * 1000 + i
            a, rr, s = 6.283 * h(k, seed), r * 0.85 * math.sqrt(h(k, seed + 1)), (h(k, seed + 2) - 0.5) * (L - 2 * r)
            wob = 0.02 * math.sin(t * (2.0 + h(k, 7)) + 6.28 * h(k, 8))
            if axis == 'x':
                p = (c[0] + s + wob, c[1] + rr * math.cos(a), c[2] + rr * math.sin(a))
            else:
                p = (c[0] + rr * math.cos(a), c[1] + s + wob, c[2] + rr * math.sin(a))
            pts.append(p)
    return pts


def act_reserve(fr, t):
    e = EV
    centre = add(D0, (0.0, 0.0, COM[2]))
    M = car_matrix(centre)
    fr.car = M
    fr.xray = ramp(t, e['reserve'] + 0.3, e['reserve'] + 1.4)
    fr.vessels = ramp(t, e['tesla'], e['tesla'] + 1.0)
    lv = reserve_level(t)
    fr.reserve = lv
    fr.item('gas', diagram.dots([xf(M, p) for p in vessel_points(lv, t)], 0.011, 'fx_gas'), fr.vessels)
    for key in ('puff1', 'used'):
        p = window(t, e[key] + 0.15, e[key] + 0.3, e[key] + 0.75, e[key] + 1.0)
        for n in ('FL', 'FR', 'RL', 'RR'):
            fr.plumes[n] = max(fr.plumes[n], 0.75 * p * (REAR_SHARE if n[0] == 'R' else 1.0))
    fr.anchor('vessels', xf(M, (0.2, 0.9, 0.45)), ramp(t, e['tesla'] + 0.6, e['tesla'] + 1.2) * (1 - ramp(t, e['puff1'] - 0.5, e['puff1'])), '压力容器\n特斯拉称 · 位置示意')
    fr.anchor('nozzle', xf(M, (roadster.NOZZLES['FL'][0][0], 0.9, -0.05)), window(t, e['puff1'], e['puff1'] + 0.3, e['gone'] + 0.6, e['gone'] + 1.0), '每次喷气')
    cam = keyed([(e['reserve'], ((-1.0, -8.6, 1.4), (0.0, 0.0, 0.6), (30.0,))),
                 (e['tesla'] + 0.6, ((-5.6, -7.0, 4.3), (-0.3, 0.0, 0.35), (30.0,))),
                 (e['puff1'] - 0.3, ((-5.9, -6.2, 3.3), (-0.25, 0.0, 0.3), (30.0,))),
                 (e['limits'], ((-5.0, -7.5, 2.6), (-0.1, 0.0, 0.5), (30.0,)))], t)
    fr.camera = {'eye': add(D0, cam[0]), 'target': add(D0, cam[1]), 'lens_mm': cam[2][0], 'fstop': 4.0}


# ----------------------------------------------------------------------------------------------- act 7: limits
HOVER_H = 1.3           # m, height of the HYPOTHETICAL hover (labelled 假设)


def hover_times():
    e = EV
    return e['limits'] + 0.3, e['balance'] + 0.9, e['demo'] + 0.1, e['demo'] + 1.4      # up, steady, down, landed


def hover_height(t):
    u0, u1, d0, d1 = hover_times()
    return HOVER_H * ramp(t, u0, u1) * (1.0 - ramp(t, d0, d1))


def hover_accel(t, h=1e-3):
    """Vertical acceleration of the drawn hover path (m/s²): thrust/weight = 1 + a/g is what the arrows show."""
    return (hover_height(t + h) - 2.0 * hover_height(t) + hover_height(t - h)) / (h * h)


def act_limits(fr, t):
    e = EV
    u0, u1, d0, d1 = hover_times()
    hgt = hover_height(t)
    # attitude disturbance damped by control pulses while the height stays constant (no vertical bob, so the
    # vertical forces really are equal there); math review item 6
    wob = ramp(t, e['control'], e['control'] + 0.3) * math.exp(-max(0.0, t - e['control']) / 1.3) * (1.0 - ramp(t, d0 - 0.4, d0))
    pitch = 2.0 * math.sin(4.1 * t + 0.6) * wob
    roll = 2.5 * math.sin(3.3 * t) * wob
    centre = add(D0, (0.0, 0.0, COM[2] + hgt))
    M = car_matrix(centre, pitch, roll)
    fr.car = M
    fr.xray = 1.0 - ramp(t, e['limits'], e['limits'] + 0.8)
    fr.vessels = fr.xray
    fr.reserve = reserve_level(t)
    airborne = ramp(t, u0 - 0.1, u0 + 0.2) * (1.0 - ramp(t, d1 - 0.1, d1 + 0.2))
    tw = 1.0 + hover_accel(t) / G                      # thrust / weight of the drawn motion
    base = clamp(0.78 * tw)
    for n in ('FL', 'FR'):
        fr.plumes[n] = airborne * base
    for n in ('RL', 'RR'):
        fr.plumes[n] = airborne * base * REAR_SHARE
    com = xf(M, COM)
    toward = (0.0, -1.4, 0.0)
    # force pair: thrust length follows the actual vertical acceleration (longer while speeding up upward or
    # braking a descent, shorter while braking the climb), equal to the weight only while the height is steady
    forces = ramp(t, u0, u0 + 0.4) * (1.0 - ramp(t, d1 - 0.2, d1 + 0.1))
    arrow_item(fr, 'thrust', add(com, toward), add(add(com, toward), (0.0, 0.0, WEIGHT_LEN * tw)), forces, 'fx_amber', 0.045)
    fr.anchor('thrust', add(add(com, toward), (0.0, 0.0, WEIGHT_LEN * tw + 0.15)), forces, '推力')
    gravity_arrow(fr, com, add(toward, (0.0, -0.05, 0.0)), forces)
    steady = forces * clamp(1.0 - abs(tw - 1.0) / 0.03) * ramp(t, e['balance'], e['balance'] + 0.4)
    fr.anchor('balance', add(add(com, toward), (0.55, 0.0, 0.0)), steady, '推力 = 重力')
    ctl = ramp(t, e['control'], e['control'] + 0.3) if wob > 0.02 else 0.0
    for k, n in enumerate(('FL', 'RR', 'FR', 'RL')):
        blink = ctl * max(0.0, math.sin(5.0 * t - 1.6 * k)) ** 3 * min(1.0, 4.0 * wob)
        if blink <= 0.002:
            continue
        p = xf(M, roadster.NOZZLES[n][0])
        d = norm(xd(M, EXPLAIN_DIRS[n]))
        arrow_item(fr, 'ctl_' + n, add(p, mul(d, 0.6)), add(p, mul(d, 0.06)), blink, 'fx_amber', 0.02)
    fr.anchor('control', add(xf(M, roadster.NOZZLES['RL'][0]), (0.35, -1.3, -0.55)), window(t, e['control'], e['control'] + 0.3, e['demo'] - 0.2, e['demo'] + 0.2), '姿态控制')
    fr.note('hypothesis', '假设：持续推力悬停', window(t, e['limits'] + 0.2, e['limits'] + 0.6, d1 - 0.3, d1 + 0.2))
    fr.note('demo', '演示 ≠ 通勤', window(t, e['demo'] + 0.2, e['demo'] + 0.6, e['howlong'] - 0.3, e['howlong']))
    fr.note('limits', '气量 · 能量 · 安全', ramp(t, e['howlong'] + 0.3, e['howlong'] + 0.8))
    cam = keyed([(e['limits'], ((-5.0, -7.5, 2.6), (-0.1, 0.0, 0.5), (30.0,))),
                 (e['limits'] + 1.6, ((-0.8, -8.6, 1.5), (0.0, 0.0, 1.3), (30.0,))),
                 (e['demo'] + 0.2, ((-0.8, -8.6, 1.5), (0.0, 0.0, 1.0), (30.0,))),
                 (e['howlong'] + 1.0, ((7.0, -20.0, 3.4), (0.0, 9.0, 1.4), (28.0,)))], t)
    fr.camera = {'eye': add(D0, cam[0]), 'target': add(D0, cam[1]), 'lens_mm': cam[2][0], 'fstop': 4.0}


# ----------------------------------------------------------------------------------------------- dispatch
def act_at(t):
    for name, a, b in ACTS:
        if a <= t < b:
            return name
    return ACTS[-1][0]


def state(t):
    fr = Frame(t)
    fr.act = act_at(t)
    fr.car = car_matrix(REST_CENTRE)
    fr.camera = None
    fr.reserve = None
    if fr.act == 'attach':
        act_attach(fr, t)
    elif fr.act == 'reaction':
        act_reaction(fr, t)
    elif fr.act == 'torque':
        act_torque(fr, t)
    elif fr.act == 'reserve':
        act_reserve(fr, t)
    elif fr.act == 'limits':
        act_limits(fr, t)
    else:
        shots.source_state(fr, t)  # source reconstruction, shots A/B/C/D (0–14 s)
    return fr


# ----------------------------------------------------------------------------------------------- projection
def camera_basis(cam):
    f = norm(sub(cam['target'], cam['eye']))
    r = norm(cross(f, (0.0, 0.0, 1.0)))
    u = cross(r, f)
    return r, u, f


def project(cam, p, width=W_PX, height=H_PX, sensor_v=36.0):
    """Blender camera with sensor_fit VERTICAL, sensor_height 36 mm (same as the renderer)."""
    r, u, f = camera_basis(cam)
    v = sub(p, cam['eye'])
    x, y, z = sum(a * b for a, b in zip(v, r)), sum(a * b for a, b in zip(v, u)), sum(a * b for a, b in zip(v, f))
    if z <= 1e-6:
        return None
    fpx = cam['lens_mm'] / sensor_v * height
    return (width / 2 + fpx * x / z, height / 2 - fpx * y / z, z)


def anchors_for(t):
    fr = state(t)
    out = {'act': fr.act, 'reserve': fr.reserve, 'labels': [], 'notes': [{'id': i, 'text': s, 'level': round(l, 3)} for i, s, l in fr.notes]}
    if fr.camera:
        for ident, (p, lv, text) in fr.anchors.items():
            q = project(fr.camera, p)
            if q:
                out['labels'].append({'id': ident, 'text': text, 'x': round(q[0], 1), 'y': round(q[1], 1), 'level': round(lv, 3)})
    return out


if __name__ == '__main__':
    for name, a, b in ACTS:
        print('%-9s %6.2f – %6.2f' % (name, a, b))
    for t in (14.5, 17.0, 19.5, 22.5, 24.5, 28.0, 31.0, 33.0, 35.0, 37.0, 41.0, 43.0, 46.0, 48.0, 50.5, 53.0, 56.0, 60.2, 63.0, 66.0, 68.0, 70.0, 73.0):
        fr = state(t)
        c = xf(fr.car, COM)
        print('t %5.2f %-8s com (%5.2f, %5.2f, %5.2f) items %2d anchors %s plumes %s xray %.2f' % (
            t, fr.act, c[0], c[1], c[2], len(fr.items), sorted(fr.anchors), {k: round(v, 2) for k, v in fr.plumes.items() if v}, fr.xray))
