"""v3_ramp.py: the ramp demonstration as geometry and an event clock, pure Python (no bpy), so every pose, contact,
jet and overlay can be computed and checked without Blender.

World frame: +X points from the approach toward the ramp, +Z up, +Y across the ramp. The driving-surface centreline
lies in the plane y = 0. The car climbs in +X/+Z up the wall, the curl turns it over, and the LEVEL UPPER DECK carries
it upside down back toward -X (over the approach) to the deck's free end (the lip). Source: Tesla, "The Ramp |
Roadster" (2026-10-16); `ev` is the continuous wide take's time in seconds. The profile, climb keys and airborne keys
below are FITS to native source frames (v4: main wide 8.0 s and the elevated wide 31-44 s, where the car is seen
hanging under the flat deck at 36.5-37.25 s; see production-log.md and v4/tools/check_profile.py), not measured
dimensions; they are tuned by compare renders (render_v3.py --source-match / --source-match-el) and must not be
quoted as numbers in the film.

    python3 blender/v3_ramp.py        # self-test: profile, contact, clearance (wall, curl, ceiling), airborne, jets
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import roadster  # noqa: E402  (pure: car dimensions, nozzle ports, profile splines)
from geom import add, clamp, cross, dot, length, mul, norm, sub  # noqa: E402

G = 9.81
WHEEL_R = roadster.WHEEL_R
AXLE_F, AXLE_R = roadster.AXLE_F, roadster.AXLE_R
WB = AXLE_F - AXLE_R
COM_LOCAL = roadster.COM

# ----------------------------------------------------------------------------------------------- profile (fit)
RAMP_W = 3.05           # driving surface width: v3 estimate against the car's width (the scale of every fit below)
SLAB_T = 0.36           # slab thickness behind the surface
RUNIN = 6.0             # flat transition plate in front of x = 0 (v4 proof01 elevated compare: the source's lit
#                         plate, centre line continuing onto it, runs about twice v3's 3 m; flat at z = 0, so no
#                         contact or clearance change -- mesh extent only)
# v4 profile (fit, two native views; Opus 5.5): tangent-continuous segments from the floor (tangent angle 0):
#   ('arc', end tangent angle deg, radius m) | ('line', length m). Floor transition, the wall reaching vertical, a
#   short vertical run, the curl (tightening) over the top, then the STRAIGHT LEVEL DECK back over the approach. The
#   deck is level: in the elevated wide it is parallel to the horizontal gantry chord and is seen edge-on as one line.
SEGMENTS = [('arc', 60.0, 6.0), ('arc', 90.0, 12.0), ('arc', 180.0, 6.27), ('line', 6.3)]
#   (curl radius >= ~6 m: a tighter curl would put the car's overhangs into the surface; the "straight" run in the
#   source image also includes the top of the curl, which deviates from the deck line by under a pixel there)
V_BEND_R = 24.0         # past the free end the VIRTUAL surface (front-wheel carrier only) bends gently toward the car
#                         side, so the nose dips as the front wheels leave the deck before the rear ones


def _build_segments():
    out, x, z, phi, s = [], 0.0, 0.0, 0.0, 0.0
    for seg in SEGMENTS:
        if seg[0] == 'arc':
            a0, a1, r = phi, math.radians(seg[1]), seg[2]
            c = (x - r * math.sin(a0), z + r * math.cos(a0))
            ln = r * (a1 - a0)
            out.append({'kind': 'arc', 's0': s, 's1': s + ln, 'a0': a0, 'a1': a1, 'r': r, 'c': c})
            x, z, phi = c[0] + r * math.sin(a1), c[1] - r * math.cos(a1), a1
        else:
            ln = seg[1]
            out.append({'kind': 'line', 's0': s, 's1': s + ln, 'a0': phi, 'p': (x, z)})
            x, z = x + ln * math.cos(phi), z + ln * math.sin(phi)
        s += ln
    return out, s, (x, z), phi


_SEGS, S_LIP, _LIP_XZ, PHI_LIP_RAD = _build_segments()
PHI_LIP = math.degrees(PHI_LIP_RAD)
LIP = (_LIP_XZ[0], 0.0, _LIP_XZ[1])            # the deck's free end (where the car leaves)
LIP_H = _LIP_XZ[1]
DECK_LEN = SEGMENTS[-1][1] if SEGMENTS[-1][0] == 'line' else 0.0
S_DECK = S_LIP - DECK_LEN                     # where the curl ends and the level deck begins
DECK_START = (_LIP_XZ[0] - DECK_LEN * math.cos(PHI_LIP_RAD), 0.0, _LIP_XZ[1] - DECK_LEN * math.sin(PHI_LIP_RAD))
DECK_H = LIP_H
PHI_DECK = PHI_LIP


def profile(s):
    """Surface centreline at arc length s: (x, z, phi radians). s < 0: the flat run-in/floor; s > S_LIP: a virtual
    continuation past the free end (bending gently toward the open side; used only to carry the front wheels off
    the edge so the nose dips before the rear wheels leave)."""
    if s <= 0.0:
        return s, 0.0, 0.0
    if s >= S_LIP:
        d = s - S_LIP
        a0 = PHI_LIP_RAD
        k = d / V_BEND_R
        c = (_LIP_XZ[0] - V_BEND_R * math.sin(a0), _LIP_XZ[1] + V_BEND_R * math.cos(a0))
        a = a0 + k
        return c[0] + V_BEND_R * math.sin(a), c[1] - V_BEND_R * math.cos(a), a
    for seg in _SEGS:
        if s <= seg['s1'] + 1e-9:
            if seg['kind'] == 'arc':
                a = seg['a0'] + (s - seg['s0']) / seg['r']
                c, r = seg['c'], seg['r']
                return c[0] + r * math.sin(a), c[1] - r * math.cos(a), a
            d = s - seg['s0']
            return seg['p'][0] + d * math.cos(seg['a0']), seg['p'][1] + d * math.sin(seg['a0']), seg['a0']
    raise ValueError(s)


def segment_breaks():
    """Arc lengths where the profile changes segment (for meshing and overlays)."""
    return [seg['s0'] for seg in _SEGS] + [S_LIP]


def point(s):
    x, z, _ = profile(s)
    return (x, 0.0, z)


def tangent(phi):
    return (math.cos(phi), 0.0, math.sin(phi))


def n_out(phi):
    """Unit surface normal pointing OUT of the surface, into the open side where the car rides."""
    return (-math.sin(phi), 0.0, math.cos(phi))


def surface_frame(s):
    x, z, phi = profile(s)
    return (x, 0.0, z), tangent(phi), n_out(phi), phi


def wheel_centre_curve(s):
    p, _, n, _ = surface_frame(s)
    return add(p, mul(n, WHEEL_R))


def closest_s(p, lo=-6.0, hi=None, steps=240):
    """Arc length of the surface point nearest to world point p (coarse scan + refine; real surface only)."""
    hi = S_LIP if hi is None else hi
    best, bs = 1e9, lo
    for k in range(steps + 1):
        s = lo + (hi - lo) * k / steps
        d = length(sub(p, point(s)))
        if d < best:
            best, bs = d, s
    step = (hi - lo) / steps
    for _ in range(30):
        step *= 0.5
        for cand in (bs - step, bs + step):
            if lo <= cand <= hi:
                d = length(sub(p, point(cand)))
                if d < best:
                    best, bs = d, cand
    return bs


def signed_height(p):
    """Height of p above the NEAREST real surface along its local outward normal (negative = inside the ramp/floor).
    The open floor (beyond the run-in) and the ramp (including the level deck that hangs over the approach) are
    both candidates; points beyond the lip (nearest surface point at the lip edge) return their distance to the
    edge."""
    s = closest_s(p)
    q, _, n, _ = surface_frame(s)
    h_ramp = length(sub(p, q)) if s >= S_LIP - 1e-6 else dot(sub(p, q), n)
    if p[0] < -RUNIN and abs(p[2]) < abs(h_ramp):   # over the open floor, and the floor is the nearer surface
        return p[2]
    return h_ramp


# ----------------------------------------------------------------------------------------------- car on the surface
def car_matrix(X, Z, O):
    Y = cross(Z, X)
    return ((X[0], Y[0], Z[0], O[0]), (X[1], Y[1], Z[1], O[1]), (X[2], Y[2], Z[2], O[2]), (0.0, 0.0, 0.0, 1.0))


def xf(M, p):
    return tuple(M[i][0] * p[0] + M[i][1] * p[1] + M[i][2] * p[2] + M[i][3] for i in range(3))


def xd(M, d):
    return tuple(M[i][0] * d[0] + M[i][1] * d[1] + M[i][2] * d[2] for i in range(3))


def axes(M):
    return (M[0][0], M[1][0], M[2][0]), (M[0][1], M[1][1], M[2][1]), (M[0][2], M[1][2], M[2][2])


def pose_on_ramp(s_r):
    """Rigid car with both axles' wheels touching the surface. Rear contact at arc length s_r; the front contact s_f
    is found so the wheel centres (offset curve) are exactly one wheelbase apart. Returns (matrix, s_f)."""
    Wr = wheel_centre_curve(s_r)
    lo, hi = s_r + 0.6 * WB, s_r + 1.6 * WB
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if length(sub(wheel_centre_curve(mid), Wr)) < WB:
            lo = mid
        else:
            hi = mid
    s_f = 0.5 * (lo + hi)
    Wf = wheel_centre_curve(s_f)
    X = norm(sub(Wf, Wr))
    Z = (-X[2], 0.0, X[0])
    O = sub(sub(Wr, mul(X, AXLE_R)), mul(Z, WHEEL_R))
    return car_matrix(X, Z, O), s_f


# ----------------------------------------------------------------------------------------------- interpolation
def pchip(keys):
    """Monotone cubic (Fritsch–Carlson) through (x, y) keys, clamped at the ends."""
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


def smooth(x):
    t = clamp(x)
    return t * t * (3 - 2 * t)


def ramp(x, a, b):
    return smooth((x - a) / (b - a)) if b > a else (1.0 if x >= a else 0.0)


def window(x, a, b, c, d):
    return min(ramp(x, a, b), 1.0 - ramp(x, c, d))


# ----------------------------------------------------------------------------------------------- climb (fit)
EV_START = 2.5           # wide take: the car starts from rest at the base
EV_OFF = 9.80            # rear wheels leave the deck's free end (source: nose past the end 9.25-9.5, clear by 9.75)
# rear-contact arc length vs source time (v4 fit: car centre positions in the main wide, 6.0-8.5 s within 1-8 px
# through the fitted camera; 9.0-9.25 weighted down while the source camera starts to zoom). The car climbs at about
# 5 m/s, its front wheels reach the level deck about 8.0, the rear about 8.5, the front reaches the free end about
# 9.25 and the rear leaves at EV_OFF.
CLIMB_KEYS = [(0.0, -1.35), (EV_START, -1.35), (3.0, -1.15), (3.5, -0.55), (4.0, 0.45), (4.5, 2.2), (5.0, 4.6),
              (5.5, 7.5), (6.0, 10.4), (6.5, 12.6), (7.0, 14.6), (7.5, 17.3), (8.0, 19.9), (8.5, 22.5),
              (9.0, 25.0), (9.25, 26.2), (9.5, 27.4), (EV_OFF, S_LIP)]
s_rear = pchip(CLIMB_KEYS)


def s_rear_rate(ev, h=1e-3):
    return (s_rear(ev + h) - s_rear(ev - h)) / (2 * h)


def ev_at_s_rear(s):
    lo, hi = EV_START, EV_OFF
    for _ in range(60):
        mid = 0.5 * (lo + hi)
        if s_rear(mid) < s:
            lo = mid
        else:
            hi = mid
    return 0.5 * (lo + hi)


# ----------------------------------------------------------------------------------------------- airborne (fit)
# v4 reading (the level deck changes v3's): the car leaves the deck's free end UPSIDE DOWN, heading -X (back over the
# approach), its nose dipped a few degrees by the front wheels leaving first (V_BEND_R). It then ROLLS about its long
# axis to upright: roof seen from below on the deck (9.0) and just past the end (9.75), side-on mid-roll (10.0-10.15),
# upright and near level by 10.5, level and facing away from the ramp by 10.75 with the plumes down (11-12 s side views). v3's large pitch
# sweep came from reading the deck's foreshortened image as a 145-degree lip; with a level deck it is not needed.
PITCH_KEYS = [(EV_OFF, None), (10.0, 186.0), (10.25, 185.0), (10.5, 182.0), (10.75, 180.0), (13.5, 180.0)]
ROLL_KEYS = [(EV_OFF, 0.0), (9.97, 4.0), (10.05, 30.0), (10.15, 90.0), (10.27, 150.0), (10.4, 176.0), (10.5, 180.0),
             (13.5, 180.0)]
# the roll waits until the tail has cleared the free end (~10.0; rolling under the deck would put the body's side into
# it) and passes side-on about 10.15 (source main wide: side-on 10.0-10.125, coming level 10.25)
ROLL_SIGN = 1.0          # sense of the roll (fit by compare render; a sign flip mirrors the roof's path)
Z_REST = COM_LOCAL[2]    # CoM height of the car standing on the floor


def _launch_pitch():
    M, _ = pose_on_ramp(S_LIP)
    X = (M[0][0], M[1][0], M[2][0])
    return math.degrees(math.atan2(X[2], X[0])) % 360.0


PITCH_KEYS[0] = (EV_OFF, _launch_pitch())       # continuity with the last pose on the deck (nose already dipping)
pitch_at = pchip(PITCH_KEYS)
roll_at = pchip(ROLL_KEYS)


def air_axes(ev):
    phi = math.radians(pitch_at(ev))
    psi = math.radians(roll_at(ev)) * ROLL_SIGN
    X = tangent(phi)
    Y0, Z0 = (0.0, 1.0, 0.0), n_out(phi)
    Y = add(mul(Y0, math.cos(psi)), mul(Z0, math.sin(psi)))
    Z = add(mul(Y0, -math.sin(psi)), mul(Z0, math.cos(psi)))
    return X, Y, Z


# jets: (ev on, ev full, ev fade, ev off, peak level) per port, from the source plumes: a forward jet near the nose at
# the lip (9.5) and again once level (10.75–11.25); the under-body jets come on through the turn (down-left at 10.5),
# carry the descent at a cruise level (columns to the floor at 11.0) and rise to full near the floor (big cloud).
JETS = {
    'NOSE': [(9.45, 9.52, 9.95, 10.1, 0.9), (10.55, 10.7, 11.35, 11.55, 0.6)],
    'FL': [(10.3, 10.75, 13.45, 13.8, 1.0)],
    'FR': [(10.3, 10.75, 13.45, 13.8, 1.0)],
    'RL': [(10.32, 10.78, 13.45, 13.8, 1.0)],
    'RR': [(10.32, 10.78, 13.45, 13.8, 1.0)],
}
UNDER = ('FL', 'FR', 'RL', 'RR')
CRUISE = 0.7
CUSHION = (11.7, 11.95)   # columns strong through the descent (source 11.0), full near the floor


def jet_levels(ev):
    out = {}
    for n, spans in JETS.items():
        lv = 0.0
        for a, b, c, d, peak in spans:
            lv = max(lv, peak * window(ev, a, b, c, d))
        if n in UNDER:
            lv *= CRUISE + (1.0 - CRUISE) * ramp(ev, *CUSHION)
        out[n] = lv
    return out


# Airborne CENTRE-OF-MASS path: an IMAGE-INFORMED FIT, not a physics simulation. The car leaves a level ceiling with
# no upward velocity, so it drops at nearly free-fall at first (about 7 m by 11.0 s), then the downward columns brake
# the descent into the cloud (source: three columns to the floor at 11.0, low in the cloud at 12.0-12.5; touchdown
# hidden). Horizontal speed carries over from the deck (about 5 m/s) and decays. The film claims no measured physics;
# jets keep the observed schedule; every drawn reaction is exactly opposite its drawn exhaust.
AIR_KEYS = None          # filled below from the deck launch pose (position continuity at EV_OFF)
EV_LAND = 12.9


def _air_keys():
    M, _ = pose_on_ramp(S_LIP)
    x0, _, z0 = xf(M, COM_LOCAL)
    dz = [(EV_OFF + 0.07, -0.03), (10.0, -0.22), (10.25, -0.95), (10.5, -2.3), (10.75, -4.3)]
    dx = {EV_OFF + 0.07: -0.36, 10.0: -1.0, 10.25: -2.2, 10.5: -3.3, 10.75: -4.4}
    keys = [(EV_OFF, x0, z0)] + [(e, x0 + dx[e], z0 + d) for e, d in dz]
    keys += [(11.0, x0 - 5.4, 8.0), (11.25, x0 - 6.3, 6.0), (11.5, x0 - 7.1, 4.4), (12.0, x0 - 8.4, 2.3),
             (12.5, x0 - 9.3, 1.16), (12.75, x0 - 9.6, 0.66), (EV_LAND, x0 - 9.75, COM_LOCAL[2]),
             (13.6, x0 - 10.3, COM_LOCAL[2])]
    return keys


AIR_KEYS = _air_keys()
_air_x = pchip([(k[0], k[1]) for k in AIR_KEYS])
_air_z = pchip([(k[0], k[2]) for k in AIR_KEYS])


# Port positions are v1's schematic ports (roadster.NOZZLES); exhaust directions for the RAMP flight follow its
# source plumes: the descent columns are straight down (no fore-aft lean), splayed slightly outward.
FLIGHT_DIRS = {'NOSE': roadster.NOZZLES['NOSE'][1], 'FL': (0.0, 0.12, -1.0), 'FR': (0.0, -0.12, -1.0),
               'RL': (0.0, 0.12, -1.0), 'RR': (0.0, -0.12, -1.0), 'SL': roadster.NOZZLES['SL'][1]}


def nozzle_dir_world(X, Y, Z, n):
    d = FLIGHT_DIRS[n]
    return norm(add(add(mul(X, d[0]), mul(Y, d[1])), mul(Z, d[2])))


def air_com(ev, h=1e-3):
    p = (_air_x(ev), 0.0, _air_z(ev))
    v = ((_air_x(ev + h) - _air_x(ev - h)) / (2 * h), 0.0, (_air_z(ev + h) - _air_z(ev - h)) / (2 * h))
    return p, v


# ----------------------------------------------------------------------------------------------- the event
class RampState:
    """Car pose and effects at source time ev (the continuous wide take's clock)."""

    def __init__(self, ev):
        self.ev = ev
        self.on_ramp = ev < EV_OFF
        if self.on_ramp:
            self.s_r = s_rear(ev)
            self.car, self.s_f = pose_on_ramp(self.s_r)
            self.wheel_angle = self.s_r / WHEEL_R
        else:
            X, Y, Z = air_axes(ev)
            com, _ = air_com(ev)
            # place the car so its CoM sits on the integrated track
            O = sub(com, add(add(mul(X, COM_LOCAL[0]), mul(Y, COM_LOCAL[1])), mul(Z, COM_LOCAL[2])))
            self.car = ((X[0], Y[0], Z[0], O[0]), (X[1], Y[1], Z[1], O[1]), (X[2], Y[2], Z[2], O[2]),
                        (0.0, 0.0, 0.0, 1.0))
            self.s_r, self.s_f = S_LIP, None
            w0 = S_LIP / WHEEL_R
            omega = s_rear_rate(EV_OFF - 0.02) / WHEEL_R
            self.wheel_angle = w0 + omega * 1.4 * (1.0 - math.exp(-(ev - EV_OFF) / 1.4))
        self.com = xf(self.car, COM_LOCAL)
        self.jets = jet_levels(ev)
        # visible plume density: a thin cold-gas column is visible well below full thrust, so the picture uses
        # sqrt(level); force arrows use the level itself (both schematic, never quantified)
        self.plume_vis = {n: math.sqrt(lv) for n, lv in self.jets.items()}
        self.plume_scale = {n: self._plume_scale(n) for n in self.jets}
        self.clouds = cloud_puffs(ev)

    def _plume_scale(self, n):
        """Under-body columns stretch to reach the floor during the descent (the source shows columns from car to
        ground at 11.0–11.25); otherwise the validated v1 plume length."""
        if n not in UNDER or self.on_ramp or self.jets[n] < 0.05:
            return 1.0
        p = xf(self.car, roadster.NOZZLES[n][0])
        return clamp(p[2] / 3.0, 1.0, 3.6)

    def sealed_fraction(self):
        """Share of the under-floor gap still over the real surface (1 = fully sealed, 0 = no surface under the
        car). Schematic: the suction region is taken as the flat floor between the skirts, x in FLOOR_SPAN."""
        if not self.on_ramp:
            return 0.0
        n, inside = 24, 0
        for k in range(n):
            x = FLOOR_SPAN[0] + (FLOOR_SPAN[1] - FLOOR_SPAN[0]) * (k + 0.5) / n
            p = xf(self.car, (x, 0.0, 0.0))
            s = closest_s(p, lo=max(-6.0, self.s_r - 4.0), hi=S_LIP, steps=60)
            if s < S_LIP - 0.02:
                inside += 1
        return inside / n


FLOOR_SPAN = (-1.55, 1.50)    # flat floor length (roadster.z_floor ≈ 0.13 m between these stations)


# ----------------------------------------------------------------------------------------------- cloud
CLOUD_PUFFS = []


def _hash(i, k=0):
    x = math.sin(i * 12.9898 + k * 78.233) * 43758.5453
    return x - math.floor(x)


def _init_cloud():
    base_x = None
    for i in range(16):
        birth = 11.15 + 0.1 * i + 0.05 * _hash(i, 1)
        com, _ = air_com(min(birth, EV_LAND))
        bx = com[0] + (_hash(i, 2) - 0.5) * 2.6
        by = (_hash(i, 3) - 0.5) * 3.2
        r1 = 1.8 + 2.2 * _hash(i, 4)
        rise = 0.4 + 1.6 * _hash(i, 5)
        drift = (_hash(i, 6) - 0.5) * 1.6
        CLOUD_PUFFS.append({'birth': birth, 'x': bx, 'y': by, 'r1': r1, 'rise': rise, 'drift': drift})
        base_x = bx if base_x is None else base_x
    return base_x


_init_cloud()


def cloud_puffs(ev):
    out = []
    for p in CLOUD_PUFFS:
        age = ev - p['birth']
        if age <= 0:
            continue
        g = 1.0 - math.exp(-age / 0.55)
        r = 0.6 + (p['r1'] - 0.6) * g
        out.append({'centre': (p['x'] + p['drift'] * g, p['y'], 0.35 * r + p['rise'] * g), 'radius': r,
                    'flatten': 0.62, 'density': 0.95 * smooth(age / 0.35)})
    return out


# ----------------------------------------------------------------------------------------------- self-test
def _body_samples():
    """Car-local points on the lower body and canopy (centre plane and both sides), for clearance checks."""
    pts = []
    for k in range(41):
        x = roadster.X_TAIL + (roadster.X_NOSE - roadster.X_TAIL) * k / 40
        wf, wb = roadster.w_floor(x) * 0.98, roadster.half_w(x) * 0.95
        for y in (-wf, 0.0, wf):
            pts.append((x, y, roadster.z_floor(x)))
        for y in (-wb, wb):
            pts.append((x, y, roadster.z_rocker(x)))
            pts.append((x, y, roadster.z_crown(x)))
    return pts


def report():
    print('profile: S_LIP %.3f m, lip (x %.3f, z %.3f), lip tangent %.1f deg (%.1f past vertical)' % (
        S_LIP, LIP[0], LIP[2], PHI_LIP, PHI_LIP - 90.0))
    xmax = max(profile(S_LIP * k / 400)[0] for k in range(401))
    print('         wall bulge x max %.3f; overhang setback at lip %.3f m' % (xmax, xmax - LIP[0]))
    body = _body_samples()
    worst = (1e9, None)
    for k in range(0, 60):
        ev = EV_START + (EV_OFF - 0.02 - EV_START) * k / 59
        st = RampState(ev)
        for wx, side in ((AXLE_F, 1), (AXLE_R, 1)):
            c = xf(st.car, (wx, 0.0, WHEEL_R))
            h = signed_height(c)
            if abs(h - WHEEL_R) > 0.004 and not (wx == AXLE_F and st.s_f and st.s_f > S_LIP):
                print('  CONTACT ERROR ev %.2f axle %.2f: centre height %.4f (want %.3f)' % (ev, wx, h, WHEEL_R))
        for p in body:
            h = signed_height(xf(st.car, p))
            if h < worst[0]:
                worst = (h, ev)
    print('climb: min body clearance to the surface %.3f m (ev %.2f); wheels on surface within 4 mm' % worst)
    print('climb: speed at 6.0 %.2f m/s, at 9.0 %.2f m/s, at lip %.2f m/s' % (
        s_rear_rate(6.0), s_rear_rate(9.0), s_rear_rate(EV_OFF - 0.02)))
    for ev in (9.2, 9.45, 9.6, 9.75, 9.84):
        print('  sealed fraction at ev %.2f: %.2f' % (ev, RampState(ev).sealed_fraction()))
    print('air (image-matched fit): touchdown ev %.2f at x %.2f; CoM z at 10.0 %.2f, 10.5 %.2f, 11.0 %.2f, 12.0 %.2f' % (
        EV_LAND, _air_x(EV_LAND), _air_z(10.0), _air_z(10.5), _air_z(11.0), _air_z(12.0)))
    worst = (1e9, None)
    for k in range(80):
        ev = EV_OFF + (11.2 - EV_OFF) * k / 79
        st = RampState(ev)
        for p in body:
            h = signed_height(xf(st.car, p))      # nearest surface: the deck's underside, its free edge, or floor
            if h < worst[0]:
                worst = (h, ev)
    print('air: min body distance to any surface EV_OFF..11.2: %.3f m (ev %.2f)' % worst)
    # the level deck: both axles on it, car fully inverted (roof straight down) -- the hook / press moments
    on = [ev for ev in [8.0 + 0.02 * k for k in range(70)] if RampState(ev).on_ramp and RampState(ev).s_r >= S_DECK
          and (RampState(ev).s_f or 0) <= S_LIP]
    if on:
        print('deck: both axles on the level deck for ev %.2f..%.2f (car inverted, roof (%.2f, %.2f))' % (
            on[0], on[-1], axes(RampState(on[0]).car)[2][0], axes(RampState(on[0]).car)[2][2]))
    for ev in (9.9, 10.0, 10.25, 10.5, 10.75, 11.0, 11.5, 12.0, 12.5, EV_LAND):
        st = RampState(ev)
        X, Y, Z = axes(st.car)
        lv = {k: round(v, 2) for k, v in st.jets.items() if v > 0.01}
        print('  ev %5.2f CoM (%6.2f, %5.2f) nose (%5.2f %5.2f %5.2f) roof (%5.2f %5.2f %5.2f) jets %s clouds %d' % (
            ev, st.com[0], st.com[2], X[0], X[1], X[2], Z[0], Z[1], Z[2], lv, len(st.clouds)))
    for ev in (2.5, 4.0, 6.0, 8.0, 9.0, 9.5):
        st = RampState(ev)
        X, _, Z = axes(st.car)
        print('  ev %5.2f s_r %6.2f CoM (%6.2f, %5.2f) pitch %6.1f roof (%5.2f, %5.2f)' % (
            ev, st.s_r, st.com[0], st.com[2], math.degrees(math.atan2(X[2], X[0])), Z[0], Z[2]))


if __name__ == '__main__':
    report()
