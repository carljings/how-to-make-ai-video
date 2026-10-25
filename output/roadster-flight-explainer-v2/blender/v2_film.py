"""v2_film.py: the v2 film 「一口气」 as a pure function of film time (no bpy).

state(t) -> V2Frame: camera, car pose, plume levels, cloud puffs, light levels, x-ray, frost, tail-lamp level and the levels of the
vector overlay. overlay(fr) -> the 2D primitives (force lines, gas particles, line of action, CoM dot, torque arc,
flow lines, label anchors) projected through the SAME camera, so Remotion can draw crisp graphics exactly on the
rendered nozzles. Timing comes only from v2/cues.json.

Event clock: every section maps film time to a time `ev` on the source clip's clock (shot D of Musk's 15.4 s
clip). The car, plumes and cloud at any ev are v1's validated reconstruction (shots.source_state), so the motion,
roll sign and pose order are exactly v1's corrected source fit. v2 only changes cameras, clocks, light and graphics:
  teaser   slow-motion close view of the apex (ev 8.30 -> 8.62), labelled CG 慢放重建
  source   the source wide camera at real speed (ev 5.55 -> 8.60)
  flyin    time frozen at ev 8.60; the camera flies from the source camera to the car
  explain  near-frozen slow clock (ev 8.60 -> ~8.99); schematic overlays
  resume   the source wide camera again, continuing from the explain clock (real speed, then slow motion)
The event is never shown twice in forward time, never reversed, and never touches down on screen.

Physics conventions (schematic, not Tesla data): each force line is exactly opposite its drawn exhaust (car-local
nozzle direction rotated by the car pose); the torque sense is r x F about roadster.COM, checked by roll_check().
"""
import json
import math
import os

import film as v1
import motion
import roadster
import shots
import staging
from geom import add, cross, dot, length, mul, norm, sub

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CUES_PATH = os.path.join(ROOT, 'v2', 'cues.json')
with open(CUES_PATH, encoding='utf-8') as fh:
    CUES = json.load(fh)
FPS = CUES['fps']
DURATION = CUES['duration_s']
W_PX, H_PX = CUES['width'], CUES['height']
N_FRAMES = int(round(DURATION * FPS))
SECTIONS = CUES['sections']
SEC = {s['id']: s for s in SECTIONS}
BEAT = CUES['beats']
COM = roadster.COM
SENSOR_V = 36.0                     # vertical sensor (mm), same as the Blender camera (sensor_fit VERTICAL)

# schematic: the right-side under-body ports produce the observed roll sense (verified by roll_check());
# the left-side ports are dimmed while the torque is explained. Rear share balances the pitch moments (v1 review).
ACTIVE = ('FR', 'RR')
DIMMED = ('FL', 'RL')
UNDER = ('FL', 'FR', 'RL', 'RR')
SHARE = {'FR': 1.0, 'RR': v1.REAR_SHARE, 'FL': 1.0, 'RL': v1.REAR_SHARE}
BEAM_LEN = 2.0                     # metres for share 1.0 (drawn scale only): pokes out past the roof


# ----------------------------------------------------------------------------------------------- small helpers
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def smooth(x):
    x = clamp(x)
    return x * x * x * (x * (6 * x - 15) + 10)


def ramp(t, t0, t1):
    return smooth((t - t0) / (t1 - t0)) if t1 > t0 else float(t >= t0)


def window(t, a, b, c, d):
    return min(ramp(t, a, b), 1.0 - ramp(t, c, d))


def lerp(a, b, x):
    return a + (b - a) * x


def lerp3(a, b, x):
    return tuple(lerp(a[k], b[k], x) for k in range(3))


def h(i, k=0):
    x = math.sin(i * 12.9898 + k * 78.233 + 0.5) * 43758.5453
    return x - math.floor(x)


def xf(M, p):
    return tuple(M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2] + M[r][3] for r in range(3))


def xd(M, d):
    return tuple(M[r][0] * d[0] + M[r][1] * d[1] + M[r][2] * d[2] for r in range(3))


def channels(keys):
    """keys [(t, a, b, ...)] -> list of monotone-cubic interpolators, one per channel."""
    n = len(keys[0]) - 1
    if len(keys) == 1:
        return [lambda t, v=keys[0][k + 1]: v for k in range(n)]
    return [motion.pchip([(k[0], k[i + 1]) for k in keys]) for i in range(n)]


# ----------------------------------------------------------------------------------------------- clocks
def section_at(t):
    for s in SECTIONS:
        if s['start'] <= t < s['end']:
            return s
    return SECTIONS[-1] if t >= SECTIONS[-1]['end'] else SECTIONS[0]


def speed_integral(keys, t):
    """Integral of a piecewise-linear speed [(t, v)] from keys[0] to t."""
    total = 0.0
    for (t0, v0), (t1, v1_) in zip(keys, keys[1:]):
        if t <= t0:
            break
        te = min(t, t1)
        ve = v0 + (v1_ - v0) * (te - t0) / (t1 - t0)
        total += 0.5 * (v0 + ve) * (te - t0)
    if t > keys[-1][0]:
        total += keys[-1][1] * (t - keys[-1][0])
    return total


FREEZE_EV = SEC['source']['clock']['ev0'] + (SEC['source']['end'] - SEC['source']['start'])
EXPLAIN_END_EV = FREEZE_EV + speed_integral(SEC['explain']['clock']['speed'], SEC['explain']['end'])


def event_time(t):
    s = section_at(t)
    c = s['clock']
    if c['kind'] == 'linear':
        return c['ev0'] + (c['ev1'] - c['ev0']) * clamp((t - s['start']) / (s['end'] - s['start']))
    if c['kind'] == 'realtime':
        return c['ev0'] + (t - s['start'])
    if c['kind'] == 'frozen':
        return FREEZE_EV
    if s['id'] == 'explain':
        return FREEZE_EV + speed_integral(c['speed'], t)
    if s['id'] == 'resume':
        return EXPLAIN_END_EV + speed_integral(c['speed'], t)
    raise ValueError('no clock for section %s' % s['id'])


# ----------------------------------------------------------------------------------------------- source event (v1)
def source_event(ev):
    """v1's validated reconstruction at source time ev (shot D clock): car matrix, visibility, plumes, cloud."""
    fr = v1.Frame(ev)
    shots.source_state(fr, ev)
    return fr


def car_centre(M):
    return xf(M, COM)


# ----------------------------------------------------------------------------------------------- cameras
def make_cam(eye, target, lens, fstop=None, dutch=0.0):
    return {'eye': tuple(eye), 'target': tuple(target), 'lens_mm': float(lens), 'fstop': fstop,
            'dutch_deg': float(dutch), 'focus_m': length(sub(target, eye))}


def basis(cam, with_dutch=True):
    """(right, up, forward) of the Blender camera point_matrix(eye, target) @ RotZ(dutch)."""
    f = norm(sub(cam['target'], cam['eye']))
    r = norm(cross(f, (0.0, 0.0, 1.0)))
    u = cross(r, f)
    d = math.radians(cam.get('dutch_deg', 0.0)) if with_dutch else 0.0
    if d:
        cd, sd = math.cos(d), math.sin(d)
        r, u = add(mul(r, cd), mul(u, sd)), add(mul(r, -sd), mul(u, cd))
    return r, u, f


def project(cam, p, width=W_PX, height=H_PX):
    """World point -> (x px, y px, depth m) for the film camera (vertical 36 mm sensor), or None behind it."""
    r, u, f = basis(cam)
    v = sub(p, cam['eye'])
    x, y, z = dot(v, r), dot(v, u), dot(v, f)
    if z <= 1e-4:
        return None
    fpx = cam['lens_mm'] / SENSOR_V * height
    return (width / 2 + fpx * x / z, height / 2 - fpx * y / z, z)


def orbit_cam(c, az, el, d, lens, dutch=0.0, toff=(0.0, 0.0, 0.0), fstop=None):
    """Camera on a sphere round point c. az 0: on the -Y side (the source camera's side); az 90: on +X, behind the
    car (its nose points about -X); el > 0 above."""
    a, e = math.radians(az), math.radians(el)
    eye = add(c, mul((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)), d))
    return make_cam(eye, add(c, toff), lens, fstop, dutch)


def sph_of(c, eye):
    v = sub(eye, c)
    d = length(v)
    return math.degrees(math.atan2(v[0], -v[1])), math.degrees(math.asin(clamp(v[2] / d, -1.0, 1.0))), d


# Source wide camera (A/D position), portrait reframed: h_src = source-pixel height covered by the portrait at its
# axis (the source's own vertical field is 1080 px). Aim keys in source px follow the car like an operator and are
# clamped in angle so the portrait never sees past the source's side edges (no reveal of what the source hides).
SOURCE_FRAMING = [   # (ev, aim x, aim y, h_src): opens left of the foreground post, on the car bursting out of its cloud
    (5.70, 1420, 600, 1000), (6.25, 1400, 565, 960), (7.0, 1270, 505, 900), (7.75, 1100, 470, 860),
    (8.60, 905, 455, 820),
]
RESUME_FRAMING = [
    (8.99, 840, 465, 820), (9.6, 650, 480, 850), (10.25, 470, 500, 880), (10.9, 360, 520, 910),
    (11.6, 360, 525, 940), (12.6, 520, 520, 1000), (13.9, 700, 510, 1060),
]
_src_ch = channels(SOURCE_FRAMING)
_res_ch = channels(RESUME_FRAMING)
F_SRC = staging.WIDE_CAMERA['lens_mm'] / staging.WIDE_CAMERA['sensor_width_mm'] * staging.SOURCE_W


def wide_cam(aim_x, aim_y, h_src):
    lens = F_SRC * SENSOR_V / h_src
    f_p = lens / SENSOR_V * H_PX
    edge = math.atan(0.5 * staging.SOURCE_W / F_SRC)
    half = math.atan(0.5 * W_PX / f_p)
    theta = math.atan((aim_x - 0.5 * staging.SOURCE_W) / F_SRC)
    theta = max(-(edge - half), min(edge - half, theta))
    u = 0.5 * staging.SOURCE_W + F_SRC * math.tan(theta)
    eye = staging.WIDE.loc
    target = add(eye, mul(norm(staging.WIDE.ray(u, aim_y)), 30.0))
    return make_cam(eye, target, lens)


def source_cam(ev):
    return wide_cam(*(f(ev) for f in _src_ch))


def resume_cam(ev):
    return wide_cam(*(f(ev) for f in _res_ch))


# teaser: slow dolly round the apex. (t, az, el, d, lens, dutch, target z offset)
TEASER_KEYS = [   # (t, az, el, d, lens, dutch, target z offset, target offset along camera-right)
    (0.0, 28.0, -14.0, 10.9, 40.0, -5.0, -0.30, 0.18), (3.95, 20.0, -11.0, 9.9, 40.0, -3.0, -0.30, 0.15)]
# explain: one continuous orbit. (t, az, el, d, lens, dutch)
EXPLAIN_KEYS = [   # (t, az, el, d, lens, dutch, target z offset: < 0 lifts the car in frame)
    (9.35, 0.0, -6.0, 9.0, 36.0, 0.0, 0.0),
    (12.75, -5.0, -4.0, 8.7, 36.0, 0.0, 0.0),
    (13.85, 88.0, 1.0, 7.6, 36.0, 0.0, -0.55),
    (16.45, 95.0, 2.0, 7.3, 36.0, 0.0, -0.55),
    (17.75, 128.0, -14.0, 8.0, 34.0, 0.0, 0.0),
    (21.85, 142.0, -17.0, 7.6, 34.0, 0.0, 0.0),
]
_exp_ch = channels(EXPLAIN_KEYS)
FLYIN_HOLD = 0.30                    # the "停" beat: a held frozen frame before the push begins
TEASER_FSTOP, EXPLAIN_FSTOP = 2.8, 4.0


def teaser_cam(t, c):
    k = clamp(t / SEC['teaser']['end'])
    a, b = TEASER_KEYS
    az, el, d, lens, dutch, tz, tr = (lerp(a[i], b[i], k) for i in range(1, 8))
    right = (math.cos(math.radians(az)), math.sin(math.radians(az)), 0.0)
    return orbit_cam(c, az, el, d, lens, dutch=dutch, toff=add(mul(right, tr), (0.0, 0.0, tz)), fstop=TEASER_FSTOP)


def explain_cam(t, c):
    az, el, d, lens, dutch, tz = (f(t) for f in _exp_ch)
    return orbit_cam(c, az, el, d, lens, dutch=dutch, toff=(0.0, 0.0, tz), fstop=EXPLAIN_FSTOP)


def flyin_cam(t, c):
    s = SEC['flyin']
    u = smooth((t - s['start'] - FLYIN_HOLD) / (s['end'] - s['start'] - FLYIN_HOLD))
    ut = smooth((t - s['start'] - FLYIN_HOLD) / (0.75 * (s['end'] - s['start'] - FLYIN_HOLD)))
    c0 = source_cam(FREEZE_EV)
    c1 = explain_cam(s['end'], c)
    az0, el0, d0 = sph_of(c, c0['eye'])
    az1, el1, d1 = sph_of(c, c1['eye'])
    az, el = lerp(az0, az1, u), lerp(el0, el1, u)
    d = math.exp(lerp(math.log(d0), math.log(d1), u))
    a, e = math.radians(az), math.radians(el)
    eye = add(c, mul((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)), d))
    fwd0 = norm(sub(c0['target'], c0['eye']))
    t0 = add(c0['eye'], mul(fwd0, d0))
    target = lerp3(t0, c1['target'], ut)
    lens = lerp(c0['lens_mm'], c1['lens_mm'], u)
    inv = lerp(1.0 / 22.0, 1.0 / EXPLAIN_FSTOP, u)
    return make_cam(eye, target, lens, fstop=1.0 / inv, dutch=lerp(0.0, c1['dutch_deg'], u))


# ----------------------------------------------------------------------------------------------- hero light rig
# Car-relative lights for the frozen / slow-motion close shots, placed in the camera's (dutch-free) frame so the look
# holds as the camera orbits: cool back rims make the gas glow, a soft top key, an under-fill standing in for the
# ground floods, and one glossy-only strip that draws a long specular line on the body. Energies live in the
# renderer (render_v2.HERO_LIGHTS); here only placement.
def hero_rig(c, cam):
    r, u, f = basis(cam, with_dutch=False)

    def at(df, du, dr):
        return add(c, add(add(mul(f, df), mul(u, du)), mul(r, dr)))
    return {
        'hero_rim': (at(7.5, 4.5, 3.5), c),
        'hero_rim2': (at(8.0, 1.5, -4.5), c),
        'hero_key': (at(-6.0, 1.8, 1.8), c),      # low front key: its beam carries on into empty distance, not onto the lineup
        'hero_under': (at(-2.5, -5.5, 0.5), c),
        'hero_strip': (at(-5.5, 3.5, 0.0), c),
    }


# ----------------------------------------------------------------------------------------------- frost
# Frozen-time cue: glitter caught INSIDE the four under-body jets at the freeze (cold-gas plumes are white because
# expanding gas condenses), placed along each drawn plume at the freeze pose. Nothing in the empty sky: the source
# shows a black sky, and a starfield would invent surroundings. Static in the world, so as the car keeps turning on
# the slow clock the frost stays where that gas was released, a trail.
def _frost():
    fr0 = source_event(FREEZE_EV)
    out = []
    for j, n in enumerate(UNDER):
        pos, d = roadster.NOZZLES[n]
        P, D = xf(fr0.car, pos), norm(xd(fr0.car, d))
        A = norm(cross(D, (0.0, 0.0, 1.0) if abs(D[2]) < 0.9 else (1.0, 0.0, 0.0)))
        B = cross(D, A)
        for i in range(120):
            k = 1000 * j + i
            s_ = h(k, 1) ** 0.8
            dist = 0.25 + 3.3 * s_
            rad = (0.05 + 0.38 * s_) * math.sqrt(h(k, 2))
            ang = 2 * math.pi * h(k, 3)
            p = add(add(P, mul(D, dist)), add(mul(A, rad * math.cos(ang)), mul(B, rad * math.sin(ang))))
            out.append((p, lerp(0.004, 0.011, h(k, 4) ** 1.6)))
    return out


FROST = _frost()


# ----------------------------------------------------------------------------------------------- frame state
class V2Frame:
    def __init__(self, t):
        self.t = t
        self.frame = int(round(t * FPS))
        self.section = None
        self.ev = None
        self.camera = None
        self.car = None
        self.car_visible = True
        self.plumes = {}
        self.nozzle_dirs = dict(shots.SOURCE_DIRS)
        self.clouds = []
        self.lights = {'lot': 1.0, 'hero': 0.0}
        self.hero_rig = {}
        self.xray = 0.0
        self.vessels = 0.0
        self.frost = 0.0
        self.lamp = 1.0           # tail-lamp emission level (dimmed in the frozen sections)
        self.fx = {}          # overlay levels


def state(t):
    t = clamp(t, 0.0, DURATION - 1e-6)
    fr = V2Frame(t)
    sec = section_at(t)
    fr.section = sec['id']
    fr.ev = event_time(t)
    src = source_event(fr.ev)
    fr.car = src.car
    fr.car_visible = src.car_visible
    fr.plumes = dict(src.plumes)
    fr.clouds = src.clouds
    c = car_centre(fr.car)
    sid = sec['id']
    if sid == 'teaser':
        fr.camera = teaser_cam(t, c)
        fr.lights = {'lot': 0.12, 'hero': 1.0}
    elif sid == 'source':
        fr.camera = source_cam(fr.ev)
        fr.lights = {'lot': 1.0, 'hero': 0.0}
    elif sid == 'flyin':
        fr.camera = flyin_cam(t, c)
        k = ramp(t, BEAT['freeze'], BEAT['freeze'] + 0.6)
        fr.lights = {'lot': lerp(1.0, 0.10, k), 'hero': k}
        fr.frost = ramp(t, BEAT['freeze'], BEAT['freeze'] + 0.25)
        fr.lamp = lerp(1.0, 0.08, k)
    elif sid == 'explain':
        fr.camera = explain_cam(t, c)
        xr = ramp(t, BEAT['xray_on'], BEAT['xray_on'] + 0.7)
        fr.lights = {'lot': lerp(0.10, 0.06, xr), 'hero': lerp(1.0, 0.40, xr)}
        fr.frost = 1.0 - 0.5 * xr
        fr.lamp = 0.08                  # the rear strip must not compete with the red force line
        dim = window(t, BEAT['far_dim'], BEAT['far_dim'] + 0.5, BEAT['xray_on'] - 0.3, BEAT['xray_on'] + 0.2)
        for n in DIMMED:
            fr.plumes[n] *= 1.0 - 0.8 * dim
        for n in UNDER:
            fr.plumes[n] *= 1.0 - 0.25 * xr
        fr.xray = xr
        fr.vessels = ramp(t, BEAT['xray_on'] + 0.3, BEAT['xray_on'] + 1.0)
    else:   # resume
        fr.camera = resume_cam(fr.ev)
        fr.lights = {'lot': 1.0, 'hero': 0.0}
    if fr.lights['hero'] > 0.0:
        fr.hero_rig = hero_rig(c, fr.camera)
    fr.fx = fx_levels(t)
    return fr


def fx_levels(t):
    """Overlay levels (0..1) and draw-on progress for the vector graphics. All fade before the x-ray settles, except
    the flow and vessel label, which belong to it. Nothing is drawn outside the frozen sections."""
    b = BEAT
    end_explain = SEC['explain']['end']
    gone = b['xray_on'] - 0.2
    return {
        'particles': window(t, b['particles_on'], b['particles_on'] + 0.5, end_explain - 0.25, end_explain),
        'beams': window(t, b['beams_on'], b['beams_on'] + 0.5, gone, gone + 0.5),
        'beams_grow': ramp(t, b['beams_on'], b['beams_on'] + 0.55),
        'merge': ramp(t, b['merge_on'], b['merge_on'] + 0.9),
        'lines': window(t, b['lines_on'], b['lines_on'] + 0.6, gone, gone + 0.4),
        'com': window(t, b['com_on'], b['com_on'] + 0.3, gone, gone + 0.4),
        'arc': window(t, b['arc_on'], b['arc_on'] + 0.2, gone, gone + 0.4),
        'arc_draw': ramp(t, b['arc_on'], b['arc_on'] + 0.75),
        'flow': window(t, b['flow_on'], b['flow_on'] + 0.6, end_explain - 0.25, end_explain),
        'vessel_label': window(t, b['vessel_label'], b['vessel_label'] + 0.4, end_explain - 0.35, end_explain),
        'all_jets': window(t, b['particles_on'], b['particles_on'] + 0.5, b['beams_on'] - 0.3, b['beams_on'] + 0.3)
                    + ramp(t, b['xray_on'], b['xray_on'] + 0.6),
    }


# ----------------------------------------------------------------------------------------------- physics helpers
def nozzle_world(fr, n):
    pos, _ = roadster.NOZZLES[n]
    return xf(fr.car, pos), norm(xd(fr.car, fr.nozzle_dirs[n]))


def reaction_world(fr, n):
    """Unit reaction force on the car (world): exactly opposite to the drawn exhaust."""
    return mul(nozzle_world(fr, n)[1], -1.0)


def torque_about_com(fr, names=ACTIVE):
    com = car_centre(fr.car)
    tau = (0.0, 0.0, 0.0)
    for n in names:
        p, _ = nozzle_world(fr, n)
        tau = add(tau, cross(sub(p, com), mul(reaction_world(fr, n), SHARE[n])))
    return tau


def roll_check(t, dt=0.25):
    """+1 if the schematic torque of the active ports has the same sense as the car's actual rotation between t and
    t + dt (projected on the long axis), else -1. Must be +1 throughout the torque beat."""
    a, b = state(t), state(t + dt)
    axis = norm(xd(a.car, (1.0, 0.0, 0.0)))
    tau = dot(torque_about_com(a), axis)
    # rotation of the car's local +Z about the long axis between a and b
    za, zb = norm(xd(a.car, (0.0, 0.0, 1.0))), norm(xd(b.car, (0.0, 0.0, 1.0)))
    turn = dot(cross(za, zb), axis)
    return (1 if tau * turn > 0 else -1), tau, turn


# ----------------------------------------------------------------------------------------------- overlay (2D)
PARTICLES_PER_JET = 26
PARTICLE_LEN = 3.2          # m along the exhaust (the plume volume is 3 m)
FLOW_RATE = 1.15            # cycles per second (schematic time)


def _r(v, k=1):
    return round(v, k)


def _pt(cam, p):
    q = project(cam, p)
    return None if q is None else (_r(q[0]), _r(q[1]), _r(q[2], 2))


def _px_size(cam, size_m, depth):
    return cam['lens_mm'] / SENSOR_V * H_PX * size_m / max(depth, 1e-3)


def jet_particles(fr, cam, n, level, t_flow):
    out = []
    P, D = nozzle_world(fr, n)
    A = norm(cross(D, (0.0, 0.0, 1.0) if abs(D[2]) < 0.9 else (1.0, 0.0, 0.0)))
    B = cross(D, A)
    seed = sum(ord(ch) for ch in n) * 101
    for i in range(PARTICLES_PER_JET):
        s = (h(seed + i, 1) + t_flow * FLOW_RATE) % 1.0
        dist = (s ** 0.85) * PARTICLE_LEN
        rad = (0.04 + 0.36 * s) * math.sqrt(h(seed + i, 2))
        ang = 2 * math.pi * h(seed + i, 3)
        off = add(mul(A, rad * math.cos(ang)), mul(B, rad * math.sin(ang)))
        p = add(add(P, mul(D, dist)), off)
        tail = add(add(P, mul(D, max(0.0, dist - 0.22 - 0.25 * s))), mul(off, 0.92))
        q, qt = project(cam, p), project(cam, tail)
        if not q or not qt:
            continue
        a = level * (1.0 - s) ** 1.1 * clamp(s / 0.06)
        if a < 0.02:
            continue
        out.append([_r(q[0]), _r(q[1]), _r(qt[0]), _r(qt[1]), _r(max(1.2, _px_size(cam, 0.03, q[2])), 2), _r(a, 3)])
    return out


def resultant(fr):
    """Point of application and unit direction of the summed active-port reaction (share-weighted)."""
    tot = sum(SHARE[n] for n in ACTIVE)
    R = (0.0, 0.0, 0.0)
    F = (0.0, 0.0, 0.0)
    for n in ACTIVE:
        P, _ = nozzle_world(fr, n)
        R = add(R, mul(P, SHARE[n] / tot))
        F = add(F, mul(reaction_world(fr, n), SHARE[n]))
    return R, norm(F)


MERGED_LEN = 2.1       # drawn length of the summed force in the torque view (scale changes with the view)


def beam_segments(fr, grow, merge):
    """(port, start, length) per active port. merge 0: each force at its own nozzle; merge 1: the same two vectors
    added tip-to-tail at the resultant's point of application, one line whose length is their sum."""
    tot = sum(SHARE[n] for n in ACTIVE)
    R, F = resultant(fr)
    out, along = [], 0.0
    for n in ACTIVE:
        P, _ = nozzle_world(fr, n)
        L0 = BEAM_LEN * SHARE[n]
        L1 = MERGED_LEN * SHARE[n] / tot
        start = lerp3(P, add(R, mul(F, along)), merge)
        out.append((n, start, lerp(L0, L1, merge) * grow))
        along += L1
    return out


def arc_points(fr, radius=1.45, span_deg=100.0, n=40):
    """World points of the torque arc round the CoM, in the car's cross-section plane, centred on the side of the
    CoM AWAY from the force's line of action (free space: no crossing with the force line or the active jets), ordered
    in the sense of the active torque (arrowhead at the end)."""
    com = car_centre(fr.car)
    e1 = norm(xd(fr.car, (0.0, 1.0, 0.0)))
    e2 = norm(xd(fr.car, (0.0, 0.0, 1.0)))
    axis = norm(xd(fr.car, (1.0, 0.0, 0.0)))
    sense = 1.0 if dot(torque_about_com(fr), axis) > 0 else -1.0     # + : rotation from e1 toward e2
    R, F = resultant(fr)
    foot = add(R, mul(F, dot(sub(com, R), F)))
    away = sub(com, foot)                                   # from the line of action through the CoM and beyond
    away = sub(away, mul(axis, dot(away, axis)))
    centre = math.atan2(dot(away, e2), dot(away, e1))
    a0 = centre - sense * math.radians(span_deg) / 2
    a1 = centre + sense * math.radians(span_deg) / 2
    return [add(com, add(mul(e1, radius * math.cos(a0 + (a1 - a0) * k / n)), mul(e2, radius * math.sin(a0 + (a1 - a0) * k / n))))
            for k in range(n + 1)]


def flow_paths(fr):
    """Schematic gas paths from the tunnel vessel to each under-body port (car-local quadratic curves)."""
    out = []
    for n in UNDER:
        pos, _ = roadster.NOZZLES[n]
        a = (0.55 if pos[0] > 0 else -0.55, 0.0, 0.30)
        mid = ((a[0] + pos[0]) / 2, pos[1] * 0.7, 0.18)
        pts = []
        for k in range(17):
            s = k / 16
            p = tuple((1 - s) ** 2 * a[i] + 2 * (1 - s) * s * mid[i] + s * s * pos[i] for i in range(3))
            pts.append(xf(fr.car, p))
        out.append((n, pts))
    return out


def overlay(fr):
    """Per-frame 2D primitives in 1080x1920 px. Empty outside the flyin/explain sections."""
    cam = fr.camera
    o = {'f': fr.frame, 's': fr.section, 'ev': _r(fr.ev, 4)}
    fx = fr.fx
    if fr.section not in ('flyin', 'explain'):
        return o
    t_flow = fr.t - BEAT['particles_on']
    if fx['particles'] > 0.01:
        parts = []
        for n in UNDER:
            lvl = fx['particles'] * (1.0 if n in ACTIVE else max(clamp(fx['all_jets']), 0.0))
            lvl *= fr.plumes.get(n, 0.0) and 1.0
            if lvl > 0.02:
                parts += jet_particles(fr, cam, n, lvl, t_flow)
        o['p'] = parts
    if fx['beams'] > 0.01:
        beams = []
        for n, P, L in beam_segments(fr, fx['beams_grow'], fx['merge']):
            a, b = _pt(cam, P), _pt(cam, add(P, mul(reaction_world(fr, n), L)))
            if a and b:
                beams.append([n, a[0], a[1], b[0], b[1], _r(fx['beams'], 3)])
        o['b'] = beams
    if fx['lines'] > 0.01:
        R, F = resultant(fr)
        a, b = _pt(cam, add(R, mul(F, -0.7))), _pt(cam, add(R, mul(F, 2.7)))
        if a and b:
            o['l'] = [['R', a[0], a[1], b[0], b[1], _r(fx['lines'], 3)]]
    if fx['com'] > 0.01:
        com = car_centre(fr.car)
        q = _pt(cam, com)
        if q:
            o['c'] = [q[0], q[1], _r(fx['com'], 3)]
            R, F = resultant(fr)
            foot = add(R, mul(F, dot(sub(com, R), F)))
            qf = _pt(cam, foot)
            if qf:
                o['arm'] = [q[0], q[1], qf[0], qf[1], _r(fx['com'], 3)]
    if fx['arc'] > 0.01:
        pts = [project(cam, p) for p in arc_points(fr)]
        if all(pts):
            o['a'] = {'pts': [[_r(p[0]), _r(p[1])] for p in pts], 'lv': _r(fx['arc'], 3), 'draw': _r(fx['arc_draw'], 3)}
    if fx['flow'] > 0.01:
        flows = []
        for n, pts in flow_paths(fr):
            q = [project(cam, p) for p in pts]
            if all(q):
                flows.append([n, [[_r(p[0]), _r(p[1])] for p in q]])
        o['fl'] = {'paths': flows, 'lv': _r(fx['flow'], 3), 'phase': _r((fr.t - BEAT['flow_on']) * 1.4 % 1.0, 3)}
    if fx['vessel_label'] > 0.01:
        name, c, _, _, _ = v1.VESSELS[3]          # the rear transverse vessel
        q = _pt(cam, xf(fr.car, c))
        if q:
            o['vl'] = [q[0], q[1], _r(fx['vessel_label'], 3)]
    return o


# ----------------------------------------------------------------------------------------------- report
if __name__ == '__main__':
    print('freeze ev %.3f, explain end ev %.3f, frames %d, frost %d' % (FREEZE_EV, EXPLAIN_END_EV, N_FRAMES, len(FROST)))
    for t in (0.0, 1.9, 3.79, 3.8, 5.0, 6.84, 6.85, 7.2, 8.1, 9.34, 9.35, 11.5, 13.6, 14.2, 15.8, 17.6, 19.5, 21.59,
              21.6, 23.0, 24.4, 26.0, 29.9):
        fr = state(t)
        c = car_centre(fr.car)
        q = project(fr.camera, c)
        print('t %5.2f %-7s ev %6.3f roll %6.1f  car (%6.2f %6.2f %5.2f) vis %d  px %s  lens %5.1f f/%s  lights %s' % (
            t, fr.section, fr.ev, motion.roll_at(fr.ev), c[0], c[1], c[2], fr.car_visible,
            None if q is None else (round(q[0]), round(q[1])), fr.camera['lens_mm'],
            None if fr.camera['fstop'] is None else round(fr.camera['fstop'], 1),
            {k: round(v, 2) for k, v in fr.lights.items()}))
    for t in (13.5, 14.5, 15.5, 16.5):
        print('roll_check t %.1f -> %s' % (t, roll_check(t)))
