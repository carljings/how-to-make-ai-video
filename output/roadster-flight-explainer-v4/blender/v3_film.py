"""v3_film.py: the v3 film 「比墙还陡」 as pure Python (no bpy): film clock -> source event -> car pose, camera, lights,
plumes, cloud; plus every vector overlay projected through the SAME camera, and the per-frame plate manifest.

Everything reads v3/cues.json (edit) and, when present, v3/timing.json (measured narration; retime_v3.py). Overlay
reveals key to spoken words through cues 'anchors'. The ramp event is v3_ramp (fits to the Tesla ramp clip). The
kickflip sections reuse v2 plates 1:1 and v2_film's validated state for their overlays.

Coordinates: world metres (see v3_ramp); overlay pixels are 1080 x 1920 output pixels. Poster sections render at
POSTER_W x POSTER_H and are cropped/zoomed in 2D; their overlay goes through the same crop.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import roadster  # noqa: E402
import v3_ramp as R  # noqa: E402
from geom import add, clamp, cross, dot, length, mul, norm, sub  # noqa: E402

CUES_PATH = os.path.join(ROOT, 'v3', 'cues.json')
TIMING_PATH = os.path.join(ROOT, 'v3', 'timing.json')
CUES = json.load(open(CUES_PATH, encoding='utf-8'))
FPS = CUES['fps']
DURATION = CUES['duration_s']
W_PX, H_PX = CUES['width'], CUES['height']
N_FRAMES = int(round(DURATION * FPS))
SECTIONS = CUES['sections']
SEC = {s['id']: s for s in SECTIONS}
SENSOR_V = 36.0
POSTER_W, POSTER_H = 1620, 2880
SYMBOLS = {'EV_OFF': R.EV_OFF}

smooth, ramp, window, lerp = R.smooth, R.ramp, R.window, (lambda a, b, x: a + (b - a) * x)


def lerp3(a, b, x):
    return (a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x, a[2] + (b[2] - a[2]) * x)


def h(i, k=0):
    x = math.sin(i * 127.1 + k * 311.7) * 43758.5453
    return x - math.floor(x)


# ----------------------------------------------------------------------------------------------- clocks
def section_at(t):
    for s in SECTIONS:
        if s['start'] <= t < s['end']:
            return s
    return SECTIONS[-1] if t >= SECTIONS[-1]['end'] else SECTIONS[0]


def map_clock(keys, t):
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, e0), (t1, e1) in zip(keys, keys[1:]):
        if t <= t1:
            return e0 + (e1 - e0) * (t - t0) / (t1 - t0)
    return keys[-1][1]


def event_time(t, sec=None):
    sec = sec or section_at(t)
    c = sec['clock']
    if c['kind'] == 'map':
        return map_clock(c['keys'], t)
    if c['kind'] == 'frozen':
        return c['ev']
    return None


def v2_frame_at(t, sec=None):
    """Exact integer v2 plate frame for a v3 time in a k1/k2/k3 section (1:1 frames, no retiming)."""
    sec = sec or section_at(t)
    f3 = int(round(t * FPS))
    first3 = int(round(sec['start'] * FPS))
    return sec['v2_first'] + (f3 - first3)


# ----------------------------------------------------------------------------------------------- anchors
def _load_timing():
    if not os.path.isfile(TIMING_PATH):
        return None
    try:
        tm = json.load(open(TIMING_PATH, encoding='utf-8'))
    except (OSError, ValueError):
        return None
    return {l['id']: l for l in tm.get('lines', [])}


TIMING = _load_timing()
HAN = lambda s: [ch for ch in s if '一' <= ch <= '鿿']  # noqa: E731


def word_time(line_id, target):
    """Start time of `target` (chars) inside a measured line, '<end>' for the clip end; None if not measured."""
    if TIMING is None or line_id not in TIMING:
        return None
    l = TIMING[line_id]
    if target == '<end>':
        return l['end_s']
    flat = []
    for w in l['words']:
        for k, ch in enumerate(HAN(w['text'])):
            n = max(1, len(HAN(w['text'])))
            flat.append((ch, w['start_s'] + (w['end_s'] - w['start_s']) * k / n))
    chars = ''.join(c for c, _ in flat)
    i = chars.find(''.join(HAN(target)))
    return None if i < 0 else flat[i][1]


def anchor(name):
    a = CUES['anchors'][name]
    if 'fixed' in a:
        return a['fixed']
    t = word_time(a['line'], a['word'])
    return (a['nominal'] if t is None else t + a.get('offset', 0.0))


A = {k: anchor(k) for k in CUES['anchors']}


def line_window(line_id):
    """(start, end) of a voice line: measured if available, else nominal start + nominal duration."""
    if TIMING and line_id in TIMING:
        return TIMING[line_id]['start_s'], TIMING[line_id]['end_s']
    v = next(x for x in CUES['vo'] if x['id'] == line_id)
    return v['start'], v['start'] + CUES['nominal_durations_s'][line_id]


# ----------------------------------------------------------------------------------------------- cameras
def make_cam(eye, target, lens, fstop=None, focus=None, roll=0.0):
    """roll (radians, v4): rotation of the picture about the view axis (positive turns the image's right edge up);
    used only by source-matched cameras fitted to native frames. Film cameras keep the horizon level."""
    return {'eye': tuple(eye), 'target': tuple(target), 'lens_mm': float(lens), 'fstop': fstop,
            'focus_m': focus if focus is not None else length(sub(target, eye)), 'roll': float(roll)}


def basis(cam):
    f = norm(sub(cam['target'], cam['eye']))
    r = norm(cross(f, (0.0, 0.0, 1.0)))
    u = cross(r, f)
    rl = cam.get('roll', 0.0)
    if rl:
        c, s_ = math.cos(rl), math.sin(rl)
        r, u = add(mul(r, c), mul(u, s_)), add(mul(r, -s_), mul(u, c))
    return r, u, f


def project(cam, p, width=W_PX, height=H_PX):
    r, u, f = basis(cam)
    v = sub(p, cam['eye'])
    x, y, z = dot(v, r), dot(v, u), dot(v, f)
    if z <= 1e-4:
        return None
    fpx = cam['lens_mm'] / SENSOR_V * height
    return (width / 2 + fpx * x / z, height / 2 - fpx * y / z, z)


def lens_for_vfov(deg):
    return (SENSOR_V / 2) / math.tan(math.radians(deg) / 2)


def car_at(ev):
    return R.RampState(ev)


def com_at(ev):
    return car_at(ev).com


# smoothed tracking targets (pure functions of ev; no state between frames)
def track(ev_fn_points, ev, span=0.35, n=7):
    acc = (0.0, 0.0, 0.0)
    wsum = 0.0
    for k in range(n):
        e = ev - span * k / (n - 1)
        w = 1.0 - 0.6 * k / (n - 1)
        acc = add(acc, mul(ev_fn_points(e), w))
        wsum += w
    return mul(acc, 1.0 / wsum)


# v4 source cameras: FITTED (v4/tools/check_profile.py, profile v3_ramp.SEGMENTS) to native 1920x1080 frames with
# camera-only solves under physical bounds: main wide at 8.0 s (floor tripod, long-ish lens; the camera is close
# and nearly frontal -- the deck widens toward its free end in the source, which a far camera cannot do) and the
# elevated wide at 44 s (drone a little above deck height). Edge rms 8.5 px / 4.8 px (median 1.7 / 1.2 px). These
# are fitting aids, not camera metadata. The source main wide holds still until about 9.25 s; the film's evidence
# shot only uses ev <= 9.0.
def _cam_from_fit(eye, yaw_deg, pitch_deg, roll_deg, f_px, height_px=1080.0, dist=40.0):
    yw, pt = math.radians(yaw_deg), math.radians(pitch_deg)
    d = (math.cos(pt) * math.cos(yw), math.cos(pt) * math.sin(yw), math.sin(pt))
    return make_cam(eye, add(eye, mul(d, dist)), f_px / height_px * SENSOR_V, roll=math.radians(roll_deg))


SRC_WIDE = _cam_from_fit((-24.13, -8.08, 0.3), 20.62, 15.84, -1.64, 1170.9)
SRC_ELEV = _cam_from_fit((-26.05, -36.98, 19.78), 77.88, -31.27, 0.01, 1072.9)
SRC_ELEV_EV = 28.0        # the elevated wide (31-44 s) runs at real time: ev ~ source time - 28.0 (car under the
#                           deck's free end at 37.25 s ~ ev 9.25); approximate, for compare renders only
WIDE_EYE = SRC_WIDE['eye']
# Replay angle B (source 19.5-23.5 s, a slowed replay of ev ~10.0-11.6): low and far on the approach side, the ramp
# face nearly face-on at frame right, the car's front three-quarter from below; zooms about 55 -> 90 mm while it tilts
# down with the car. v4: moved back with the corrected deck (the car now leaves about 6 m further toward the
# approach); to be refitted against replay frames in milestone 2.
RB_EYE = (-42.0, -8.0, 1.5)
RB_SOURCE = (19.5, 10.0, 0.4)    # replay time r -> ev = 10.0 + (r - 19.5) * 0.4 (source-match aid only)


def _spline(keys, u):
    """Catmull-Rom through key vectors at u in [0, 1] (keys evenly spaced in u)."""
    n = len(keys) - 1
    x = clamp(u) * n
    i = min(int(x), n - 1)
    f = x - i
    p0, p1, p2, p3 = keys[max(i - 1, 0)], keys[i], keys[i + 1], keys[min(i + 2, n)]
    f2, f3 = f * f, f * f * f
    return tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * f + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * f2
                        + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * f3) for k in range(len(p1)))


# HOOK (v4 S1 「倒悬」): ONE continuous move. Frame 0 sits under the level deck, a little ahead of the car and below
# it, looking up at the car driving upside down toward the lens (headlights, black canopy facing down, wheels on the
# ceiling, the crimson deck edges running back to the curl). After the title lands the camera pulls back and down
# through the void to a high three-quarter view of the whole ramp (echoing the source's elevated wide): the flat top,
# the inverted car under it, the floor far below. Level horizon throughout (gravity must read).
HOOK_EYE = [(-6.3, -4.7, 12.25), (-8.0, -7.4, 11.7), (-10.4, -11.8, 11.2), (-12.8, -16.9, 11.7),
            (-14.2, -20.6, 12.5)]
# proof01 review: frame 0 pans toward the free end on a wider lens so the deck reads as a FINITE slab (its near corner
# in frame, the curl corner still in at the right); the landing frame is tighter so the flat top reads at size
HOOK_TGT = [(-2.3, 0.1, 13.9), (-1.3, 0.1, 13.4), (-0.6, 0.0, 12.0), (0.1, 0.0, 9.9), (0.6, 0.0, 9.2)]
HOOK_LENS = [(17.0,), (19.0,), (21.0,), (26.0,), (30.0,)]
HOOK_HOLD, HOOK_LAND = 0.42, 2.74         # film s: slow creep while the title lands, then the reveal lands here


def hook_u(t):
    """Move progress: a slow creep (frame-0 composition, 0..0.08) then one eased reveal (0.08..1)."""
    if t <= HOOK_HOLD:
        return 0.08 * smooth(t / HOOK_HOLD) * 0.5 + 0.04 * (t / HOOK_HOLD)
    k = clamp((t - HOOK_HOLD) / (HOOK_LAND - HOOK_HOLD))
    k = k * k * k * (k * (6 * k - 15) + 10)          # smootherstep: soft start, fast middle, soft landing
    return 0.08 + 0.92 * k


def cam_hook(t, sec):
    u = hook_u(t - sec['start'])
    eye, tgt, (lens,) = _spline(HOOK_EYE, u), _spline(HOOK_TGT, u), _spline(HOOK_LENS, u)
    c = com_at(event_time(t, sec))
    return make_cam(eye, tgt, lens, 4.0, length(sub(c, eye)))


def cam_wide(ev, portrait=True, push=0.0):
    """The source main-wide camera (static for ev <= 9.25). portrait: the 9:16 strip of the same view -- pan/tilt
    and a slight push only, so the ramp fills the height (the fitted roll is kept so the frame matches the source)."""
    cam = dict(SRC_WIDE)
    if portrait:
        e = cam['eye']
        f = norm(sub(cam['target'], e))
        yw, pt = math.atan2(f[1], f[0]), math.asin(f[2])
        pt += math.radians(1.2 + 0.6 * push)
        d = (math.cos(pt) * math.cos(yw), math.cos(pt) * math.sin(yw), math.sin(pt))
        cam = make_cam(e, add(e, mul(d, 40.0)), cam['lens_mm'] * (1.0 + 0.10 * push), roll=cam['roll'])
    return cam


def truss_lines():
    """The steel structure as (a, b, radius) members, shared by render_v3.lattice_mesh and the previz (v4): a lattice
    tower behind the wall, and a gantry truss over the level deck out past its free end, hangers holding the deck
    (source: elevated wide 31-44 s, replay 18-20 s). Proportions inferred from the frames; not a drawing."""
    out = []
    W2 = R.RAMP_W / 2 + 0.15
    xs = max(R.profile(R.S_LIP * k / 300)[0] for k in range(301)) + R.SLAB_T + 0.45
    xb = xs + 2.1
    z_bot = R.DECK_H + R.SLAB_T + 0.95          # gantry bottom chord
    z_top = z_bot + 1.55                        # gantry top chord (also the tower top)
    x_end = R.LIP[0] - 0.6
    for x in (xs, xb):
        for y in (-W2, W2):
            out.append(((x, y, 0.0), (x, y, z_top), 0.075))
    z, k = 0.0, 0
    while z <= z_top + 1e-6:
        for y in (-W2, W2):
            out.append(((xs, y, z), (xb, y, z), 0.045))
        for x in (xs, xb):
            out.append(((x, -W2, z), (x, W2, z), 0.045))
        z += 2.0
        k += 1
    z = 0.0
    while z + 2.0 <= z_top + 1e-6:
        for y in (-W2, W2):
            out.append(((xs, y, z), (xb, y, z + 2.0), 0.035))
            out.append(((xb, y, z), (xs, y, z + 2.0), 0.035))
        out.append(((xb, -W2, z), (xb, W2, z + 2.0), 0.035))
        z += 2.0
    # cantilever arms from the tower's front columns to the slab back along the wall and curl
    s = 3.0
    while s < R.S_DECK - 0.4:
        p, _, nrm, _ = R.surface_frame(s)
        back = R.sub(p, R.mul(nrm, R.SLAB_T))
        if back[2] < z_bot - 0.3:
            for y in (-W2, W2):
                out.append(((back[0], y, back[2]), (xs, y, back[2]), 0.05))
        s += 1.6
    # gantry: two vertical trusses (bottom + top chords, posts, diagonals) from the tower out past the free end
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
    # hangers: gantry bottom chord down to the deck's back, every other bay over the deck and the top of the curl
    x = R.DECK_START[0] + 1.6
    while x >= R.LIP[0] + 0.2:
        for y in (-W2 + 0.25, W2 - 0.25):
            out.append(((x, y, R.DECK_H + R.SLAB_T), (x, y, z_bot), 0.05))
        x -= 1.6
    return out


FROZEN_PRESS_EV = 9.0
CUT_Y = -1.06            # cross-section plane: the ramp (slab, near neon) is cut away just outside the near wheels


def profile_cam(tgt, dist, visible_h, fstop=None):
    """Exactly side-on to the travel plane, long lens from far away (near-orthographic: the section line and the car's
    silhouette stay registered); visible_h = picture height in metres at the target."""
    return make_cam((tgt[0], -dist, tgt[2]), tgt, SENSOR_V * dist / visible_h, fstop)


def cam_p1():
    # v4: the car hangs level and inverted under the deck at the frozen moment, so the frame is wider than v3's
    # (the long axis is horizontal across the 9:16 frame); the deck sits in the upper part, the void below
    c = com_at(FROZEN_PRESS_EV)
    return profile_cam((c[0] + 0.1, 0.0, c[2] - 1.6), 18.0, 10.4)


def cam_p2():
    st = car_at(FROZEN_PRESS_EV)
    g = R.xf(st.car, (0.1, 0.0, 0.10))      # mid-gap between the floor and the deck (above the inverted car)
    return profile_cam((g[0], 0.0, g[2] - 0.35), 10.0, 3.6)


def cam_tyre(ev):
    """Near-profile cross-section at the front contact (22 deg toward the nose so the tread shows), tracking the car."""
    st = car_at(ev)
    X, Y, Z = R.axes(st.car)
    C = R.xf(st.car, (R.AXLE_F, -roadster.TRACK_Y, 0.0))
    a = math.radians(22.0)
    d = add(mul(Y, -math.cos(a)), mul(X, math.sin(a)))
    tgt = add(add(C, mul(Z, 0.36)), mul(X, -0.55))
    eye = add(add(tgt, mul(d, 9.0)), mul(Z, -0.10))
    return make_cam(eye, tgt, SENSOR_V * 9.0 / 3.1, 5.6)


# Fit the complete multi-exposure trajectory below the payoff header; scene units are illustrative, not Tesla data.
# v4 refit (metres, measured from the corrected ramp and departure): the full plate spans the landed car's nose and its
# cloud on the left (x -19.3 / -18.8; v3's frame ended at -17.5 and cut the landing) to the truss's floor outline on
# the right (11.1); the floor sits at 73 % of the frame height, under the end-card header. The 'ramp' crop holds the
# deck's free end to the back of the truss.
POSTER_X = (-20.6, 11.6)
POSTER_FLOOR = 1400.0 / 1920.0
RAMP_CROP_X, RAMP_CROP_ZC = (-7.3, 10.4), 9.0


def _poster_cam(d=88.0):
    vh = (POSTER_X[1] - POSTER_X[0]) * POSTER_H / POSTER_W
    cx, cz = 0.5 * (POSTER_X[0] + POSTER_X[1]), (POSTER_FLOOR - 0.5) * vh
    return make_cam((cx, -d, cz), (cx, 0.0, cz), SENSOR_V * d / vh)


POSTER_CAM = _poster_cam()
CROPS = {'full': (0.0, 0.0, float(POSTER_W), float(POSTER_H))}


def _ramp_crop():
    a = project(POSTER_CAM, (RAMP_CROP_X[0], 0.0, RAMP_CROP_ZC), POSTER_W, POSTER_H)
    b = project(POSTER_CAM, (RAMP_CROP_X[1], 0.0, RAMP_CROP_ZC), POSTER_W, POSTER_H)
    w = b[0] - a[0]
    hgt = w * H_PX / W_PX
    return (0.5 * (a[0] + b[0]) - w / 2, a[1] - hgt / 2, w, hgt)


CROPS['ramp'] = _ramp_crop()


def crop_at(t, sec):
    if sec.get('crop') == 'ramp':
        return CROPS['ramp']
    if sec.get('crop') == 'ramp_to_full':
        z0, z1 = sec['zoom']
        k = smooth((t - z0) / (z1 - z0))
        a, b = CROPS['ramp'], CROPS['full']
        return tuple(a[i] + (b[i] - a[i]) * k for i in range(4))
    return CROPS['full']


def cam_lip(t):
    sec = SEC['lip']
    ev = event_time(min(t, sec['end'] - 1e-6), sec)
    c = track(com_at, ev, 0.08)                     # slow motion: short smoothing span (ev s)
    return profile_cam((c[0] - 0.6, 0.0, c[2] - 1.2), 18.0, 10.4)   # v4: level, inverted car (wider frame)


def cam_replay_b(ev, portrait=True):
    c = track(com_at, ev, 0.25)
    lens = 55.0 + 35.0 * smooth((ev - 10.0) / 2.4)
    tgt = (c[0] + 1.6, 0.0, c[2] - 0.5) if portrait else (c[0] + 4.0, 0.0, c[2] - 0.4)
    return make_cam(RB_EYE, tgt, lens)


def shot_camera(sec, t, ev):
    s = sec['shot']
    if s == 'HOOK':
        return cam_hook(t, sec)
    if s == 'HANG':
        return cam_hang(t, sec)
    if s == 'WIDE_SRC':
        ws = SEC['evidence']
        return cam_wide(ev, push=smooth((min(t, ws['end']) - ws['start']) / (ws['end'] - ws['start'])))
    if s == 'P1':
        return cam_p1()
    if s == 'P2':
        return cam_p2()
    if s == 'TYRE':
        return cam_tyre(ev)
    if s == 'POSTER':
        return POSTER_CAM
    if s == 'LIP':
        return cam_lip(t)
    if s == 'XRAY':
        return cam_lip(SEC['lip']['end'] - 1e-6)
    if s == 'REPLAY_B':
        return cam_replay_b(ev)
    return None


# ----------------------------------------------------------------------------------------------- hero light rig
def hero_rig(com, X, Z, cam, up=None):
    """Car-relative studio light for the explanatory sections: cool rims behind the car (relative to the camera),
    a soft key above the camera side, and glossy-only strips placed by mirror reflection so they draw long lines
    along the shoulders and canopy as seen from THIS camera (the fix for v2's matte look).
    up (v4): the rig's 'above'; default the camera's up. The hook passes the car's roof normal: with the camera below
    a car hanging under the deck, camera-up put the key and rims above the slab, where the deck shadowed them."""
    r, u, f = basis(cam)
    if up is not None:
        w = sub(up, mul(f, dot(up, f)))
        if length(w) > 0.2:
            u = norm(w)
            r = norm(cross(f, u))
    back = mul(f, 1.0)
    out = {
        'hero_rim': (add(add(com, mul(back, 5.0)), add(mul(u, 2.6), mul(r, 2.8))), com),
        'hero_rim2': (add(add(com, mul(back, 5.0)), add(mul(u, 1.6), mul(r, -3.2))), com),
        'hero_key': (add(add(com, mul(f, -4.5)), add(mul(u, 4.2), mul(r, 1.2))), com),
    }
    # mirror the view ray about the car's roof normal and its side normal: strips along the car's long axis
    v = norm(sub(com, cam['eye']))
    for name, nrm, dist in (('hero_strip', Z, 4.2), ('hero_strip2', norm(add(Z, mul(cross(Z, X), -0.8))), 4.6)):
        refl = sub(v, mul(nrm, 2 * dot(v, nrm)))
        out[name] = (add(com, mul(refl, dist)), com)
    out['strip_axis'] = X
    # cross-section shots: a low fill on the camera side at road level, aimed into the gap, so the sill/floor edge
    # and the section line both read with the gap dark between them (studio light, not a venue light)
    Y = cross(Z, X)
    out['hero_gap'] = (add(add(com, mul(Y, -3.4)), mul(Z, 0.05 - roadster.COM[2])),
                       add(com, mul(Z, 0.16 - roadster.COM[2])))
    return out


# ----------------------------------------------------------------------------------------------- frame state
class V3Frame:
    def __init__(self, t):
        self.t = t
        self.frame = int(round(t * FPS))
        self.sec = section_at(t)
        self.section = self.sec['id']
        self.plate = self.sec['plate']
        self.ev = event_time(t, self.sec)
        self.rs = None
        self.camera = None
        self.car = None
        self.car_visible = True
        self.lights = {'venue': 1.0, 'hero': 0.0}
        self.look = dict(LOOK_BASE)
        self.hero_rig = {}
        self.xray = 0.0
        self.vessels = 0.0
        self.lamp = 1.0


# Per-section look (render_v3 applies it): venue / hero light factors; SET EMISSION factors for the ramp neon (near
# and far edge), the venue's red barrier rows and the white flood heads; exposure (EV); cut = cross-section mode (the
# near part of the slab and its neon removed at CUT_Y). Explanations dim the set emission so the force graphics lead;
# the source-matched shots keep a subdued, source-like venue.
LOOK_BASE = {'venue': 1.0, 'hero': 0.0, 'neon': 0.6, 'neon_far': 0.6, 'rows': 0.55, 'lamps': 1.0, 'exposure': 0.0,
             'cut': False, 'gap': 0.0, 'land': 1.0,
             # v4 「光切」 look: haze = world volume factor (floods draw beams); follow = the source's follow-spot on the
             # climbing car; beams = the car's own headlight spots; sheet = the light-sheet instrument (contour line
             # on every surface it cuts + its glow in the haze), sheet_y its plane, sheet_trace the arc length up to
             # which the ramp contour is lit (the profile is "written" from the floor to the free end), sheet_veil
             # the plane's haze glow; neon_white = arc length below which the edge neon is white (source)
             'haze': 0.0, 'follow': 0.0, 'beams': 0.0, 'sheet': 0.0, 'sheet_y': -1.06, 'sheet_trace': 1e3,
             'sheet_veil': 0.0, 'neon_white': 7.5, 'uplights': 0.0, 'sheet_w': 0.028}
# proof01 review (actual frames): the world haze turned every light into a milky veil with froxel checker, the hook
# uplights hit the car directly (~5x its venue light: blown body, grey canopy) and the neon clipped to pink. Now the
# air is invisible until the light-sheet cuts it (haze 0; the sheet's veil is the only lit air in the opening), the
# uplights are a soft fill from below, the neon sits back to crisp crimson, the headlights leave a small pool, and the
# source-matched shot is ~0.8 EV darker (v3's compare_ev08 already read hotter than the source concrete).
# body01 review (actual): the v3 cross-section fill ('gap', 900 W, not light-linked) sits ~2.3 m from the slab's cut
# face and ~3.4 m from the body under the v4 deck -- a radial pool on the section and a near-white body hotspot in
# P1/P2/tyre/lip; the sheet lines now define the gap, so it drops to 0.4 / 0.35 / 0.25. Venue lamp heads printed
# as stray white squares in the void: lamps 0 in every non-source shot.
SECTION_LOOK = {
    'hook': {'venue': 0.75, 'hero': 0.75, 'neon': 0.24, 'neon_far': 0.22, 'rows': 0.35, 'lamps': 0.0, 'exposure': -0.3,
             'haze': 0.0, 'beams': 0.3, 'follow': 0.0, 'uplights': 1.0},
    'evidence': {'neon': 0.32, 'neon_far': 0.32, 'rows': 0.4, 'lamps': 0.3, 'exposure': -0.8, 'haze': 0.0,
                 'follow': 1.0, 'beams': 0.25},
    'freeze': {'neon': 0.32, 'neon_far': 0.32, 'rows': 0.4, 'lamps': 0.3, 'exposure': -0.8, 'haze': 0.0,
               'follow': 1.0, 'beams': 0.25},
    'press_a': {'venue': 0.22, 'hero': 0.8, 'neon_far': 0.12, 'rows': 0.12, 'lamps': 0.0, 'cut': True, 'gap': 0.4},
    'press_gap': {'venue': 0.22, 'hero': 0.8, 'neon_far': 0.08, 'rows': 0.1, 'lamps': 0.0, 'cut': True, 'gap': 0.4},
    'press_b': {'venue': 0.22, 'hero': 0.8, 'neon_far': 0.12, 'rows': 0.12, 'lamps': 0.0, 'cut': True, 'gap': 0.4},
    'press_tyre': {'venue': 0.3, 'hero': 0.7, 'neon_far': 0.12, 'rows': 0.12, 'lamps': 0.0, 'cut': True, 'gap': 0.35},
    'chrono': {'venue': 0.32, 'hero': 0.55, 'neon': 0.2, 'neon_far': 0.2, 'rows': 0.12, 'lamps': 0.0},
    'lip': {'venue': 0.3, 'hero': 0.8, 'neon_far': 0.15, 'rows': 0.12, 'lamps': 0.0, 'cut': True, 'gap': 0.35},
    'xray': {'venue': 0.18, 'hero': 0.6, 'neon_far': 0.1, 'rows': 0.08, 'lamps': 0.0, 'cut': True, 'gap': 0.25},
    'jets': {'venue': 1.0, 'hero': 0.55, 'neon': 0.22, 'neon_far': 0.22, 'rows': 0.3, 'lamps': 0.3, 'exposure': 0.1},
    'ending': {'venue': 0.32, 'hero': 0.55, 'neon': 0.2, 'neon_far': 0.2, 'rows': 0.12, 'lamps': 0.0},
}


def section_look(sid):
    lk = dict(LOOK_BASE)
    lk.update(SECTION_LOOK.get(sid, {}))
    return lk


# The light-sheet (end of the evidence shot): it ignites just beyond the ramp's far edge, sweeps ACROSS the width
# (the source camera sees the ramp face nearly frontally: a moving cut reads as an instrument, a fixed one reads as a
# lane stripe -- proof01's sheet49) and locks in a plane through the near half of the car, clear of the painted centre
# line, with a short brightening on the lock. The whole profile is lit at once (no trace); the veil (the lit air in the
# plane) is strongest while the plane moves.
SHEET_IN = (4.58, 5.06)        # film s: ignition .. lock
SHEET_FROM_Y = R.RAMP_W / 2 + 0.55
SHEET_LOCK_Y = -0.42


def timed_look(lk, sid, t):
    """Time-varying parts of the look (pure functions of film time)."""
    if sid in ('evidence', 'freeze') and t is not None:
        a, b = SHEET_IN
        k = clamp((t - a) / (b - a))
        k = k * k * k * (k * (6 * k - 15) + 10)           # smootherstep: accelerates in, settles into the lock
        lk['sheet'] = ramp(t, a - 0.04, a + 0.06) * (1.0 + 0.5 * window(t, b - 0.03, b, b + 0.04, b + 0.14))
        lk['sheet_y'] = SHEET_FROM_Y + (SHEET_LOCK_Y - SHEET_FROM_Y) * k
        lk['sheet_trace'] = 1e3
        lk['sheet_veil'] = ramp(t, a, a + 0.1) * (0.05 - 0.03 * ramp(t, b, b + 0.12))   # proof02: a faint plane
    return lk


def rig_up(cam, Z):
    """The hero rig's 'above' (v4): the camera's up, blended toward the car's roof normal as the car turns over (smooth
    in the roof's z, so nothing jumps while the car climbs the curl or rolls). For a car hanging under the deck the key
    and rims then sit in the open void instead of above the slab, where the deck shadowed them (proof01 hook; the same
    geometry holds in every inverted press / tyre / lip / x-ray / poster pose)."""
    k = smooth(-Z[2])
    if k <= 0.0:
        return None
    _, u, _ = basis(cam)
    b = add(mul(u, 1.0 - k), mul(Z, k))
    return norm(b) if length(b) > 0.2 else Z


def apply_look(fr, sid, t=None):
    fr.look = timed_look(section_look(sid), sid, t)
    fr.lights = {'venue': fr.look['venue'], 'hero': fr.look['hero']}
    if fr.look['hero'] > 0:
        X, _, Z = R.axes(fr.car)
        up = None if sid == 'jets' else rig_up(fr.camera, Z)     # the replay-B jets keep their v3 rig
        fr.hero_rig = hero_rig(fr.rs.com, X, Z, fr.camera, up=up)


def state(t, ev_override=None):
    t = clamp(t, 0.0, DURATION - 1e-6)
    fr = V3Frame(t)
    if fr.plate in ('v2', 'black'):
        fr.car_visible = False
        return fr
    ev = ev_override if ev_override is not None else fr.ev
    if fr.plate == 'hold':
        ev = SEC[fr.sec['hold_section']]['clock']['keys'][-1][1]
    fr.ev = ev
    fr.rs = car_at(ev)
    fr.car = fr.rs.car
    sec = fr.sec if fr.plate != 'hold' else SEC[fr.sec['hold_section']]
    fr.camera = shot_camera(sec, t if fr.plate != 'hold' else sec['end'] - 1e-6, ev)
    apply_look(fr, sec['id'], t if fr.plate != 'hold' else sec['end'] - 1e-6)
    if fr.section in ('press_a', 'press_gap', 'press_b', 'press_tyre', 'chrono', 'xray', 'ending'):
        fr.lamp = 0.35
    return fr


# ----------------------------------------------------------------------------------------------- stills / layers
STILLS = {
    'P1': {'shot': 'P1', 'ev': FROZEN_PRESS_EV},
    'P2': {'shot': 'P2', 'ev': FROZEN_PRESS_EV},
    'XR_OPAQUE': {'shot': 'XRAY', 'ev': SEC['xray']['clock']['ev'], 'xray': 0.0},
    'XR_GLASS': {'shot': 'XRAY', 'ev': SEC['xray']['clock']['ev'], 'xray': 1.0},
    'POSTER_BG': {'shot': 'POSTER', 'ev': None, 'layer': 'bg'},
    'POSTER_CLOUD': {'shot': 'POSTER', 'ev': 12.6, 'layer': 'cloud'},
}


def _ramp_ghost_evs(n=7):
    s0, s1 = -1.0, R.s_rear(SEC['chrono']['clock']['keys'][1][1])
    return [R.ev_at_s_rear(s0 + (s1 - s0) * k / (n - 1)) for k in range(n)]


GHOSTS_RAMP = _ramp_ghost_evs()
GHOSTS_AIR = [9.98, 10.16, 10.36, 10.56, 10.78, 11.2, 11.75]
for _i, _e in enumerate(GHOSTS_RAMP):
    STILLS['GHOST_R%d' % _i] = {'shot': 'POSTER', 'ev': _e, 'layer': 'car'}
for _i, _e in enumerate(GHOSTS_AIR):
    STILLS['GHOST_C%d' % _i] = {'shot': 'POSTER', 'ev': _e, 'layer': 'car'}


def still_state(name):
    spec = STILLS[name]
    fr = V3Frame(0.0)
    fr.section = 'still:' + name
    sec = {'shot': spec['shot'], 'id': name, 'start': 0.0, 'end': 1.0}
    ev = spec['ev'] if spec['ev'] is not None else 9.1
    fr.ev = ev
    fr.rs = car_at(ev)
    fr.car = fr.rs.car
    fr.camera = shot_camera(sec, 0.0, ev)
    apply_look(fr, {'XRAY': 'xray', 'POSTER': 'chrono', 'P2': 'press_gap'}.get(spec['shot'], 'press_a'))
    fr.xray = spec.get('xray', 0.0)
    fr.vessels = spec.get('xray', 0.0)
    fr.lamp = 0.35
    fr.layer = spec.get('layer')
    fr.car_visible = spec.get('layer') != 'bg'
    return fr


def layer_frames():
    """Film frames that need a live-car RGBA poster layer (the strobe climb and the fly-out)."""
    out = []
    for k in range(N_FRAMES):
        t = k / FPS
        sec = section_at(t)
        if sec['plate'] != 'poster':
            continue
        keys = sec['clock']['keys']
        moving = any(abs(e1 - e0) > 1e-6 and t0 <= t <= t1 for (t0, e0), (t1, e1) in zip(keys, keys[1:]))
        if moving:
            out.append(k)
    return out


LAYER_FRAMES = layer_frames()


def render_frames():
    """Film frames rendered per frame as full plates (plate kind 'render')."""
    return [k for k in range(N_FRAMES) if section_at(k / FPS)['plate'] == 'render']


# ----------------------------------------------------------------------------------------------- plate manifest
def _last_layer_before(k):
    prev = [f for f in LAYER_FRAMES if f <= k]
    return prev[-1] if prev else None


def plate_for(k):
    t = k / FPS
    sec = section_at(t)
    p = sec['plate']
    if p == 'render':
        return {'k': 'r', 'f': k}
    if p == 'hold':
        hs = SEC[sec['hold_section']]
        return {'k': 'r', 'f': int(round(hs['end'] * FPS)) - 1}
    if p == 'black':
        return {'k': '0'}
    if p == 'v2':
        return {'k': 'v2', 'f': v2_frame_at(t, sec)}
    if p == 'still':
        a, b = sec['move']
        z = lerp(a, b, smooth((t - sec['start']) / (sec['end'] - sec['start'])))
        return {'k': 's', 'id': sec['still'], 'z': round(z, 5)}
    if p == 'wipe':
        a, b = sec['move']
        z = lerp(a, b, smooth((t - sec['start']) / (sec['end'] - sec['start'])))
        return {'k': 'w', 'a': sec['stills'][0], 'b': sec['stills'][1], 'z': round(z, 5)}
    if p == 'poster':
        crop = crop_at(t, sec)
        ev = event_time(t, sec)
        layer = k if k in LAYER_FRAMES else _last_layer_before(k)
        ghosts = poster_ghosts(t, sec, ev)
        cloud = 0.0 if sec['id'] == 'chrono' else ramp(ev, 11.55, 12.6)
        live = {'f': layer} if (layer is not None and (sec['id'] != 'ending' or t >= sec['clock']['keys'][1][0])) else None
        if sec['id'] == 'chrono' and ev >= SEC['chrono']['clock']['keys'][1][1] - 1e-6:
            live = {'still': 'GHOST_R6'}
        return {'k': 'p', 'crop': [round(v, 2) for v in crop], 'ghosts': ghosts, 'live': live, 'cloud': round(cloud, 3)}
    raise ValueError(p)


def poster_ghosts(t, sec, ev):
    out = []
    if sec['id'] == 'chrono':
        for i, ge in enumerate(GHOSTS_RAMP[:-1]):
            if ev >= ge - 1e-6:
                out.append({'id': 'GHOST_R%d' % i, 'op': round(0.62 - 0.03 * (len(GHOSTS_RAMP) - i), 3)})
        return out
    # ending: all ramp ghosts (incl. the frozen car) as exposures, then the air ghosts as the live car passes them
    for i in range(len(GHOSTS_RAMP)):
        out.append({'id': 'GHOST_R%d' % i, 'op': 0.55})
    fly0 = sec['clock']['keys'][1][0]
    if t >= fly0:
        for i, ge in enumerate(GHOSTS_AIR):
            if ev >= ge - 1e-6:
                out.append({'id': 'GHOST_C%d' % i, 'op': 0.6})
    return out


# ----------------------------------------------------------------------------------------------- overlay geometry
L_PRESS, L_GRAV = 1.55, 1.05      # drawn lengths (m): schematic, unequal, never quantified
L_REACT = 1.25
L_TRACTION = 0.65


def _r(v, k=1):
    return round(v, k)


class Proj:
    """Projector into OUTPUT pixels for a frame (applies the poster crop when needed)."""

    def __init__(self, cam, crop=None):
        self.cam, self.crop = cam, crop

    def __call__(self, p):
        if self.crop is None:
            q = project(self.cam, p)
            return None if q is None else (q[0], q[1], q[2])
        q = project(self.cam, p, POSTER_W, POSTER_H)
        if q is None:
            return None
        x0, y0, w, hh = self.crop
        s = W_PX / w
        return ((q[0] - x0) * s, (q[1] - y0) * s, q[2])

    def px_per_m(self, depth):
        base = self.cam['lens_mm'] / SENSOR_V * (POSTER_H if self.crop else H_PX)
        s = (W_PX / self.crop[2]) if self.crop else 1.0
        return base * s / max(depth, 1e-3)


def seg(P, a, b, *extra):
    qa, qb = P(a), P(b)
    if not qa or not qb:
        return None
    return [_r(qa[0]), _r(qa[1]), _r(qb[0]), _r(qb[1])] + [(_r(e, 3) if isinstance(e, float) else e) for e in extra]


# car outline (centre plane): upper silhouette from tail to nose, floor from nose back to tail
def _outline():
    up, low = [], []
    n = 64
    for k in range(n + 1):
        x = roadster.X_TAIL + (roadster.X_NOSE - roadster.X_TAIL) * k / n
        z = roadster.z_crown(x)
        if roadster.X_CANOPY_END <= x <= roadster.X_COWL:
            z = max(z, roadster.z_top(x))
        up.append((x, z))
    for k in range(n + 1):
        x = roadster.X_NOSE - (roadster.X_NOSE - roadster.X_TAIL) * k / n
        low.append((x, roadster.z_floor(x)))
    return up, low


OUT_UP, OUT_LOW = _outline()


def _normals(pts, outward_sign):
    out = []
    for i, (x, z) in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(len(pts) - 1, i + 1)]
        tx, tz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, tz) or 1.0
        out.append((outward_sign * -tz / L, outward_sign * tx / L))
    return out


N_UP = _normals(OUT_UP, 1.0)        # up curve runs tail->nose: left normal points up/out
N_LOW = _normals(OUT_LOW, 1.0)      # low curve runs nose->tail: left normal points down/out


def _inside_car(x, z):
    if not (roadster.X_TAIL < x < roadster.X_NOSE):
        return False
    top = roadster.z_crown(x)
    if roadster.X_CANOPY_END <= x <= roadster.X_COWL:
        top = max(top, roadster.z_top(x))
    return roadster.z_floor(x) - 0.01 < z < top + 0.03


def _skin_dist(x, z):
    """Rough distance (m) from a car-local (x, z) point outside the body to the centre-plane outline."""
    return min(math.hypot(x - ox, z - oz) for ox, oz in OUT_UP[::2] + OUT_LOW[::2])


def _air_points():
    """Fixed seeds for the air field in car-local x/z (y = 0 plane): a dense layer hugging the skin that thins out
    within about a metre (dust in a light beam, not confetti). Each seed carries its proximity weight. Gap points
    separate."""
    pts, i = [], 0
    while len(pts) < 200 and i < 20000:
        i += 1
        x = -3.0 + 6.0 * h(i, 1)
        z = 0.02 + 2.1 * h(i, 2)
        if _inside_car(x, z):
            continue
        d = _skin_dist(x, z)
        w = math.exp(-d / 0.38)
        if d < 1.15 and h(i, 3) < 0.12 + 0.88 * w:
            pts.append((x, z, h(i, 4), h(i, 5), w))
    gap = []
    for j in range(46):
        x = R.FLOOR_SPAN[0] + (R.FLOOR_SPAN[1] - R.FLOOR_SPAN[0]) * h(j, 7)
        gap.append((x, 0.015 + 0.10 * h(j, 8), h(j, 9), h(j, 10)))
    return pts, gap


AIR_PTS, GAP_PTS = _air_points()
FAN_POINTS = [(0.62, 0.0, 0.12), (-0.68, 0.0, 0.12)]   # schematic intake markers (car-local), not hardware


def _jit(t, a, b, amp=0.05):
    return (amp * math.sin(2 * math.pi * (0.9 + 0.7 * a) * t + 6.28 * b),
            amp * math.sin(2 * math.pi * (1.1 + 0.6 * b) * t + 6.28 * a))


def air_field(fr, P, level, pump, sealed, t):
    """Warm air streaks [x0,y0,x1,y1,w,a] around the car (car-local, y=0 plane). pump 0..1 empties the gap toward the
    schematic intakes (a remainder stays: low pressure, not vacuum); sealed < 1 lets air back into the open part."""
    out = []
    M = fr.car
    for i, (x, z, a, b, w) in enumerate(AIR_PTS):
        jx, jz = _jit(t, a, b, 0.035)
        jx2, jz2 = _jit(t - 0.09, a, b, 0.035)
        p = R.xf(M, (x + jx, 0.0, z + jz))
        q = R.xf(M, (x + jx2 + 0.04 * (a - 0.5), 0.0, z + jz2 + 0.04 * (b - 0.5)))
        s = seg(P, q, p)
        if s:
            out.append(s + [_r(1.4 + 1.2 * w, 2), _r(level * (0.2 + 0.7 * w) * (0.6 + 0.4 * a), 3)])
    for j, (x, z, a, b) in enumerate(GAP_PTS):
        keep = b < 0.22                              # remainder: low pressure is not vacuum
        u = clamp((pump - a * 0.7) / 0.3) if not keep else 0.0
        open_part = sealed < 1.0 and (x - R.FLOOR_SPAN[0]) / (R.FLOOR_SPAN[1] - R.FLOOR_SPAN[0]) > sealed
        if open_part:
            u = 0.0                                  # the open part of the gap refills from outside
        fan = min(FAN_POINTS, key=lambda f: abs(f[0] - x))
        jx, jz = _jit(t, a, b, 0.02)
        base = (x + jx, 0.0, z + jz)
        pos = lerp3(base, fan, smooth(u))
        tail = lerp3(base, fan, smooth(max(0.0, u - 0.18))) if u > 0 else (base[0] - 0.04, 0.0, base[2])
        s = seg(P, R.xf(M, tail), R.xf(M, pos))
        alpha = level * (0.55 + 0.4 * a) * (1.0 - smooth((u - 0.75) / 0.25))
        if s and alpha > 0.02:
            out.append(s + [_r(1.6, 2), _r(alpha, 3)])
    return out


def pressure_ticks(fr, P, level, pump, merge, t):
    """Impact ticks normal to the skin, pointing INTO it: long and dense outside, short in the emptied gap. merge 0..1
    slides them into the CoM (the integration into one net push)."""
    out = []
    M = fr.car
    com = fr.rs.com
    for curve, normals, gap in ((OUT_UP, N_UP, False), (OUT_LOW, N_LOW, True)):
        for i in range(0, len(curve), 1 if not gap else 2):
            x, z = curve[i]
            nx, nz = normals[i]
            in_gap = gap and R.FLOOR_SPAN[0] <= x <= R.FLOOR_SPAN[1]
            pr = (1.0 - 0.75 * pump) if in_gap else 1.0
            L = 0.24 * pr
            flick = 0.55 + 0.45 * max(0.0, math.sin(2 * math.pi * (2.3 + 1.7 * h(i, 11)) * t + 6.28 * h(i, 12)))
            tip = R.xf(M, (x, 0.0, z))
            tail = R.xf(M, (x + nx * L, 0.0, z + nz * L))
            if merge > 0:
                k = smooth(merge)
                tip, tail = lerp3(tip, com, k), lerp3(tail, com, k)
            s = seg(P, tail, tip)
            a = level * flick * (1.0 - smooth((merge - 0.55) / 0.45)) * (0.55 if in_gap else 1.0)
            if s and a > 0.02:
                out.append(s + [_r(a, 3)])
    return out


def gap_lens(fr, P, sealed):
    """Polygon of the under-floor gap still over the surface (floor line + its foot on the surface)."""
    M = fr.car
    n = 18
    x0, x1 = R.FLOOR_SPAN
    x1s = x0 + (x1 - x0) * clamp(sealed)
    if x1s - x0 < 0.05:
        return None
    top, bot = [], []
    lo = fr.rs.s_r - 1.0
    for k in range(n + 1):
        x = x0 + (x1s - x0) * k / n
        top.append(R.xf(M, (x, 0.0, roadster.z_floor(x) - 0.005)))
        bot.append(R.point(R.closest_s(R.xf(M, (x, 0.0, 0.0)), lo=lo, hi=R.S_LIP, steps=40)))   # the real (concave) surface
    pts = [P(p) for p in top + list(reversed(bot))]
    if not all(pts):
        return None
    return [[_r(p[0]), _r(p[1])] for p in pts]


def arrow(P, start, d, L, level, kind):
    return seg(P, start, add(start, mul(d, L)), level, kind)


def press_dir(fr):
    _, _, Z = R.axes(fr.car)
    return mul(Z, -1.0)


def jet_overlay(fr, P, names, level_part, level_react, t_flow, dirs=None):
    """Gas streaks inside each firing plume and the reaction arrow, exactly opposite the drawn exhaust."""
    parts, reacts = [], []
    X, Y, Z = R.axes(fr.car)
    for n in names:
        lv = fr.rs.jets.get(n, 0.0)
        if lv < 0.05:
            continue
        pos = R.xf(fr.car, roadster.NOZZLES[n][0])
        d = R.nozzle_dir_world(X, Y, Z, n) if dirs is None else dirs[n]
        L = 3.0 * fr.rs.plume_scale.get(n, 1.0)
        if level_part > 0.01:
            A_ = norm(cross(d, (0.0, 0.0, 1.0) if abs(d[2]) < 0.9 else (1.0, 0.0, 0.0)))
            B_ = cross(d, A_)
            seed = sum(ord(c) for c in n) * 97
            for i in range(22):
                s = (h(seed + i, 1) + t_flow * 1.1) % 1.0
                dist = (s ** 0.85) * L
                rad = (0.04 + 0.32 * s) * math.sqrt(h(seed + i, 2))
                ang = 6.283 * h(seed + i, 3)
                off = add(mul(A_, rad * math.cos(ang)), mul(B_, rad * math.sin(ang)))
                p = add(add(pos, mul(d, dist)), off)
                q = add(add(pos, mul(d, max(0.0, dist - 0.25 - 0.3 * s))), mul(off, 0.92))
                sg = seg(P, q, p)
                a = level_part * math.sqrt(lv) * (1.0 - s) ** 1.1 * clamp(s / 0.06)
                if sg and a > 0.02:
                    parts.append(sg + [_r(2.2, 2), _r(a, 3)])
        if level_react > 0.01:
            sg = arrow(P, pos, mul(d, -1.0), L_REACT * (0.45 + 0.55 * lv), level_react, n)
            if sg:
                reacts.append(sg)
    return parts, reacts


# ----------------------------------------------------------------------------------------------- light-sheet lines
# v4 「光切」 through the body. In the cross-sections the camera looks straight through the sheet plane -- the car's
# centre plane y = 0, where the air field, the ticks and the low-pressure lens already live -- so a surface-emission
# line would be edge-on there; the sheet's intersections are drawn as projected razor lines instead: the ramp profile
# and the car's centre section (press, lip, x-ray). At the tyre the plane slides out to the near wheel (surface line +
# tyre ring); at the end it stands edge-on at the deck's free end: the boundary between borrowed air and carried gas,
# drawn as the car leaves on 腾了空. Ice white (palette 'xray', the same as the x-ray scan bar, which is the sheet).
SHEET_STEP = 0.2


def _sheet_runs(pts):
    """Projected points -> visible polylines (points far outside the frame split the run)."""
    runs, cur = [], []
    for q in pts:
        if q is not None and -300.0 < q[0] < W_PX + 300.0 and -300.0 < q[1] < H_PX + 300.0:
            cur.append([_r(q[0]), _r(q[1])])
            continue
        if len(cur) > 1:
            runs.append(cur)
        cur = []
    if len(cur) > 1:
        runs.append(cur)
    return runs


def sheet_ramp(P, y=0.0):
    n = int((R.S_LIP + R.RUNIN) / SHEET_STEP)
    pts = []
    for k in range(n + 1):
        p = R.point(-R.RUNIN + (R.S_LIP + R.RUNIN) * k / n)
        pts.append(P((p[0], y, p[2])))
    return _sheet_runs(pts)


def sheet_car(P, M, y=0.0):
    loop = OUT_UP[::2] + OUT_LOW[::2]
    return _sheet_runs([P(R.xf(M, (x, y, z))) for x, z in loop + loop[:1]])


def sheet_ring(P, M, ax, y):
    r = R.WHEEL_R
    return _sheet_runs([P(R.xf(M, (ax + r * math.cos(math.tau * k / 48), y, r + r * math.sin(math.tau * k / 48))))
                        for k in range(49)])


def _ending_off_t():
    sec = SEC['ending']
    t = sec['clock']['keys'][1][0]
    while t < sec['end'] and event_time(t, sec) < R.EV_OFF:
        t += 1.0 / FPS / 4
    return t


ENDING_OFF_T = _ending_off_t()      # film s at which the live car leaves the free end in the ending
TYRE_SLIDE = 0.5                    # s: the plane slides from the centre plane to the near wheel


def sheet_overlay(fr, P, t, sid):
    if sid in ('press_a', 'press_gap', 'press_b'):
        lv = 0.9 * ramp(t, SEC['press_a']['start'], SEC['press_a']['start'] + 0.12)
        lv *= 1.0 - 0.4 * ramp(t, A['press_land'] - 0.3, A['press_land'] + 0.3)     # the press arrow leads
        return {'pl': sheet_ramp(P) + sheet_car(P, fr.car), 'lv': _r(lv, 3)}
    if sid == 'press_tyre':
        t0 = SEC['press_tyre']['start']
        k = smooth((t - t0) / TYRE_SLIDE)
        y = -roadster.TRACK_Y * k
        pl = sheet_ramp(P, y)
        if k > 0.98:
            pl += sum((sheet_ring(P, fr.car, ax, -roadster.TRACK_Y) for ax in (R.AXLE_F, R.AXLE_R)), [])
        return {'pl': pl, 'lv': 0.85}
    if sid == 'lip':
        return {'pl': sheet_ramp(P) + sheet_car(P, fr.car), 'lv': 0.8}
    if sid == 'xray':
        return {'pl': sheet_ramp(P) + sheet_car(P, fr.car), 'lv': 0.4}
    if sid == 'ending' and t >= ENDING_OFF_T:
        k = ease_out((t - ENDING_OFF_T) / 0.6)
        z0, z1 = -0.2, R.DECK_H + 3.4
        a, b = P((R.LIP[0], 0.0, z0)), P((R.LIP[0], 0.0, z0 + (z1 - z0) * k))
        if a and b:
            return {'pl': [[[_r(a[0]), _r(a[1])], [_r(b[0]), _r(b[1])]]], 'lv': 0.8}
    return None


# ----------------------------------------------------------------------------------------------- overlay per frame
def overlay(fr):
    t = fr.t
    o = {'f': fr.frame, 's': fr.section}
    if fr.ev is not None:
        o['ev'] = _r(fr.ev, 4)
    sec = fr.sec
    sid = sec['id']
    if fr.plate in ('black',) or sid in ('hook', 'evidence', 'freeze', 'k1', 'k3'):
        return o
    if sid == 'k2':
        return _k2_overlay(o, t, sec)
    if sid in ('press_a', 'press_gap', 'press_b'):
        P = Proj(fr.camera)
        z = plate_for(fr.frame).get('z', 1.0)
        P = ZoomProj(P, z)
        com = fr.rs.com
        pump = ramp(t, A['pump'], A['pump'] + 1.2)
        o['sheet'] = sheet_overlay(fr, P, t, sid)
        air = ramp(t, A['air_on'], A['air_on'] + 0.6)
        o['air'] = air_field(fr, P, air * (0.85 if sid != 'press_gap' else 1.0), pump, 1.0, t)
        if sid != 'press_gap':
            o['grav'] = arrow(P, com, (0.0, 0.0, -1.0), L_GRAV, ramp(t, A['grav_on'], A['grav_on'] + 0.3) * 0.85, 'g')
        if t >= A['fan_on'] - 0.05:
            lv = window(t, A['fan_on'], A['fan_on'] + 0.3, A['ticks_on'] - 0.2, A['ticks_on'] + 0.2)
            o['fan'] = [[*(_r(v) for v in P(R.xf(fr.car, f))[:2]), _r(lv, 3)] for f in FAN_POINTS if P(R.xf(fr.car, f))]
        if t >= A['gap_on'] - 0.05:
            lens = gap_lens(fr, P, 1.0)
            if lens:
                o['gap'] = {'pts': lens, 'lv': _r(ramp(t, A['gap_on'], A['gap_on'] + 0.4) * (0.4 + 0.6 * pump), 3),
                            'label': _r(window(t, A['low_label'], A['low_label'] + 0.3, A['ticks_on'] + 1.2,
                                               A['ticks_on'] + 1.6), 3)}
        if t >= A['ticks_on'] - 0.05:
            merge = clamp((t - (A['press_land'] - 0.6)) / 0.6)
            o['ticks'] = pressure_ticks(fr, P, ramp(t, A['ticks_on'], A['ticks_on'] + 0.5), pump, merge, t)
            grow = ease_out((t - (A['press_land'] - 0.45)) / 0.45)
            if grow > 0:
                pulse = 1.0 + 0.18 * math.exp(-max(0.0, t - A['ya_on']) / 0.25) * (1 if t >= A['ya_on'] else 0)
                o['press'] = arrow(P, com, press_dir(fr), L_PRESS * grow * pulse, 1.0, 'p')
                if t >= A['slope_flash']:
                    st = fr.rs
                    foot = add(com, mul(press_dir(fr), L_PRESS))
                    X, _, _ = R.axes(fr.car)
                    o['flash'] = seg(P, add(foot, mul(X, -0.9)), add(foot, mul(X, 0.9)),
                                     window(t, A['slope_flash'], A['slope_flash'] + 0.1, A['slope_flash'] + 0.35,
                                            A['slope_flash'] + 0.7))
        return o
    if sid == 'press_tyre':
        P = Proj(fr.camera)
        o['sheet'] = sheet_overlay(fr, P, t, sid)
        X, _, Z = R.axes(fr.car)
        cont, trac = [], []
        for wx, wy in ((R.AXLE_F, -roadster.TRACK_Y), (R.AXLE_R, -roadster.TRACK_Y)):
            c = R.xf(fr.car, (wx, wy, 0.0))
            q = P(c)
            if q:
                lv = ramp(t, A['contact_on'], A['contact_on'] + 0.3)
                cont.append([_r(q[0]), _r(q[1]), _r(P.px_per_m(q[2]) * 0.16), _r(lv, 3)])
                if t >= A['traction_on']:
                    s = arrow(P, add(c, mul(Z, 0.02)), X, L_TRACTION * ease_out((t - A['traction_on']) / 0.35), 1.0, 't')
                    if s:
                        trac.append(s)
        o['contact'], o['trac'] = cont, trac
        return o
    if sid in ('chrono', 'ending'):
        return _poster_overlay(o, fr, t, sec)
    if sid == 'lip':
        P = Proj(fr.camera)
        o['sheet'] = sheet_overlay(fr, P, t, sid)
        com = fr.rs.com
        sealed = fr.rs.sealed_fraction() if fr.rs.on_ramp else 0.0
        if fr.rs.on_ramp:
            o['air'] = air_field(fr, P, 0.8, 1.0, sealed, t)
        else:   # the air stays; only the drawing fades, anchored to the last pose on the slope (no rotation with the car)
            fade = 1.0 - ramp(fr.ev, R.EV_OFF, R.EV_OFF + 0.6)
            if fade > 0.01:
                g = V3Frame(t)
                g.rs = car_at(R.EV_OFF - 0.02)
                g.car = g.rs.car
                o['air'] = air_field(g, P, 0.8 * fade, 1.0, 0.0, t)
        o['grav'] = arrow(P, com, (0.0, 0.0, -1.0), L_GRAV, 0.5, 'g')
        if fr.rs.on_ramp and sealed > 0.01:
            o['press'] = arrow(P, com, press_dir(fr), L_PRESS * sealed, 1.0, 'p')
            lens = gap_lens(fr, P, sealed)
            if lens:
                o['gap'] = {'pts': lens, 'lv': 0.75, 'label': 0.0}
        if t >= A['lip_line'] - 0.05:
            _, tz, phi = R.profile(R.S_LIP)
            nrm = R.n_out(phi)
            lv = ramp(t, A['lip_line'], A['lip_line'] + 0.3)
            o['lip'] = seg(P, add(R.LIP, mul(nrm, -0.5)), add(R.LIP, mul(nrm, 0.9)), lv)
        if fr.ev >= R.EV_OFF - 0.06:
            o['shards'] = _shards(fr, P)
        return o
    if sid == 'xray':
        P = Proj(fr.camera)
        P = ZoomProj(P, plate_for(fr.frame)['z'])
        o['sheet'] = sheet_overlay(fr, P, t, sid)
        X, Y, Z = R.axes(fr.car)
        nose, tail = R.xf(fr.car, (roadster.X_NOSE + 0.1, 0.0, 0.5)), R.xf(fr.car, (roadster.X_TAIL - 0.1, 0.0, 0.5))
        prog = ease_inout((t - A['scan']) / 0.9)
        b = lerp3(nose, tail, prog)
        qa, qb = P(b), P(add(b, X))
        if qa and qb:
            dx, dy = qb[0] - qa[0], qb[1] - qa[1]
            L = math.hypot(dx, dy) or 1.0
            o['scan'] = {'p': [_r(qa[0]), _r(qa[1])], 'axis': [_r(dx / L, 4), _r(dy / L, 4)], 'prog': _r(prog, 4)}
        vc = R.xf(fr.car, (-1.05, 0.0, 0.52))
        q = P(vc)
        if q:
            o['vl'] = [_r(q[0]), _r(q[1]), _r(window(t, A['vessel_label'], A['vessel_label'] + 0.35,
                                                   SEC['xray']['end'] - 0.3, SEC['xray']['end']), 3)]
        if t >= A['relay'] - 0.1:
            src = (-1.05, 0.0, 0.52)
            dst = roadster.NOZZLES['NOSE'][0]
            mid = (0.6, 0.0, 0.62)
            pts = []
            for k in range(25):
                s = k / 24
                cl = tuple((1 - s) ** 2 * src[i] + 2 * (1 - s) * s * mid[i] + s * s * dst[i] for i in range(3))
                q = P(R.xf(fr.car, cl))
                if q:
                    pts.append([_r(q[0]), _r(q[1])])
            o['relay'] = {'pts': pts, 'prog': _r(clamp((t - A['relay']) / 0.7), 3),
                          'lv': _r(ramp(t, A['relay'], A['relay'] + 0.2) * (1 - ramp(t, SEC['xray']['end'] - 0.25,
                                                                                        SEC['xray']['end'])), 3)}
        parts, _ = jet_overlay(fr, P, ['NOSE'], ramp(t, A['relay'], A['relay'] + 0.3) * 0.8, 0.0, t - A['relay'])
        o['jet'] = parts
        return o
    if sid == 'jets':
        P = Proj(fr.camera)
        lp = ramp(t, A['down_jets'], A['down_jets'] + 0.3)
        lr = ramp(t, A['react_on'], A['react_on'] + 0.3) * (1 - ramp(t, SEC['jets']['end'] - 0.6, SEC['jets']['end'] - 0.2))
        parts, reacts = jet_overlay(fr, P, list(R.JETS), lp * (1 - ramp(t, SEC['jets']['end'] - 0.6,
                                                                      SEC['jets']['end'] - 0.2)), lr, t - A['down_jets'])
        o['jet'], o['react'] = parts, reacts
        return o
    return o


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_inout(x):
    return smooth(x)


class ZoomProj:
    """Apply the still's 2D push (scale about the frame centre) to overlay points."""

    def __init__(self, P, z):
        self.P, self.z = P, z

    def __call__(self, p):
        q = self.P(p)
        if q is None:
            return None
        return (W_PX / 2 + (q[0] - W_PX / 2) * self.z, H_PX / 2 + (q[1] - H_PX / 2) * self.z, q[2])

    def px_per_m(self, depth):
        return self.P.px_per_m(depth) * self.z


def _shards(fr, P):
    """At the moment no surface is left under the car, the (already short) press arrow's remainder breaks into warm
    specks that drift outward and fade."""
    age = (fr.ev - R.EV_OFF) / 0.5
    if age < 0 or age > 1:
        return []
    base = R.RampState(R.EV_OFF - 0.02)
    com = base.com
    d = press_dir(base)
    out = []
    for i in range(26):
        s = 0.15 + 0.5 * h(i, 21)
        p0 = add(com, mul(d, s * L_PRESS * 0.25))
        v = norm((h(i, 22) - 0.5, 0.0, h(i, 23) - 0.5))
        p = add(p0, mul(v, 0.9 * age * (0.4 + h(i, 24))))
        q = P(p)
        if q:
            out.append([_r(q[0]), _r(q[1]), _r(2.0 + 2.0 * h(i, 25), 2), _r((1 - age) ** 1.4, 3)])
    return out


def _poster_overlay(o, fr, t, sec):
    crop = crop_at(t, sec)
    P = Proj(POSTER_CAM, crop)
    ghosts = []
    n = len(GHOSTS_RAMP)
    if sec['id'] == 'chrono':
        ev = fr.ev
        for i, ge in enumerate(GHOSTS_RAMP):
            if ev < ge - 1e-6:
                continue
            st = car_at(ge)
            a_on = A['ghost_arrows'] + 0.22 * i
            g_on = A['grav_ghosts']
            lp = ramp(t, a_on, a_on + 0.3)
            lg = ramp(t, g_on, g_on + 0.4) * 0.8
            flare = 1.0 + (0.35 * window(t, A['up_flare'], A['up_flare'] + 0.15, A['up_flare'] + 0.6,
                                         A['up_flare'] + 1.0) if i == n - 1 else 0.0)
            ghosts.append(_ghost_arrows(P, st, lp, lg, flare, i == n - 1 and t >= A['up_flare']))
    else:
        warm = 1.0 + 0.3 * sum(window(t, A['warm_pulse'] + 0.12 * i, A['warm_pulse'] + 0.12 * i + 0.12,
                                      A['warm_pulse'] + 0.12 * i + 0.3, A['warm_pulse'] + 0.12 * i + 0.6)
                               for i in range(1))
        for i, ge in enumerate(GHOSTS_RAMP):
            st = car_at(ge)
            pulse = window(t, A['warm_pulse'] + 0.12 * i, A['warm_pulse'] + 0.12 * i + 0.12,
                           A['warm_pulse'] + 0.12 * i + 0.3, A['warm_pulse'] + 0.12 * i + 0.6)
            ghosts.append(_ghost_arrows(P, st, 0.9 + 0.1 * pulse, 0.55, 1.0 + 0.25 * pulse, False, pulse))
        fly0 = sec['clock']['keys'][1][0]
        cold = []
        if t >= fly0:
            for i, ge in enumerate(GHOSTS_AIR):
                if fr.ev < ge - 1e-6:
                    continue
                st = car_at(ge)
                g = V3Frame(t)
                g.rs, g.car = st, st.car
                out_k = (A['jets_out'] - 0.3) + 0.22 * i
                lv = 1.0 - ramp(t, out_k, out_k + 0.45)
                parts, reacts = jet_overlay(g, P, list(R.JETS), 0.75 * lv, 0.85 * lv, t * 0.6 + i)
                cold.append({'jet': parts, 'react': reacts, 'lv': _r(lv, 3)})
            if fr.ev > R.EV_OFF:
                g = V3Frame(t)
                g.rs, g.car = fr.rs, fr.rs.car
                lv = 1.0 - ramp(t, A['jets_out'] + 1.4, A['jets_out'] + 2.0)
                parts, reacts = jet_overlay(g, P, list(R.JETS), 0.8 * lv, 0.9 * lv, t)
                cold.append({'jet': parts, 'react': reacts, 'lv': _r(lv, 3), 'live': True})
        o['cold'] = cold
        _ = warm
        sh = sheet_overlay(fr, P, t, 'ending')
        if sh:
            o['sheet'] = sh
    o['ghosts'] = ghosts
    o['crop'] = [round(v, 2) for v in crop]
    return o


def _ghost_arrows(P, st, lp, lg, flare=1.0, vcomp=False, pulse=0.0):
    com = st.com
    d = mul(R.axes(st.car)[2], -1.0)
    g = {'press': arrow(P, com, d, L_PRESS * 0.92 * flare, lp, 'p') if lp > 0.01 else None,
         'grav': arrow(P, com, (0.0, 0.0, -1.0), L_GRAV * 0.92, lg, 'g') if lg > 0.01 else None,
         'pulse': _r(pulse, 3)}
    if vcomp and abs(d[0]) > 0.2:      # v4: on the level deck the press is already straight up; no component mark
        tip = add(com, mul(d, L_PRESS * 0.92 * flare))
        g['vcomp'] = seg(P, (tip[0], 0.0, com[2]), tip, 1.0)
    return g


# ----------------------------------------------------------------------------------------------- kickflip (v2 plates)
_V2 = None


def _v2():
    global _V2
    if _V2 is None:
        import v2_film  # noqa: WPS433 - imported lazily: only the k2 overlay needs v2's state
        _V2 = v2_film
    return _V2


def _k2_overlay(o, t, sec):
    v2 = _v2()
    f2 = v2_frame_at(t, sec)
    t2 = f2 / v2.FPS
    fr2 = v2.state(t2)
    cam = fr2.camera
    o['v2f'] = f2
    lf = ramp(t, A['k2_force'], A['k2_force'] + 0.35)
    ll = ramp(t, A['k2_lines'], A['k2_lines'] + 0.4)
    lc = ramp(t, A['k2_com'], A['k2_com'] + 0.3)
    la = ramp(t, A['k2_arc'], A['k2_arc'] + 0.2)
    end = sec['end']
    fade = 1.0 - ramp(t, end - 0.25, end - 0.02)
    lf, ll, lc, la = lf * fade, ll * fade, lc * fade, la * fade
    if lf > 0.01:
        beams = []
        for n, P0, L in v2.beam_segments(fr2, ease_out((t - A['k2_force']) / 0.45), 1.0):
            a, b = v2.project(cam, P0), v2.project(cam, add(P0, mul(v2.reaction_world(fr2, n), L)))
            if a and b:
                beams.append([_r(a[0]), _r(a[1]), _r(b[0]), _r(b[1]), _r(lf, 3), n])
        o['react'] = beams
        parts = []
        for n in v2.ACTIVE:
            parts += v2.jet_particles(fr2, cam, n, 0.8 * lf, t - A['k2_force'])
        o['jet'] = [[p[0], p[1], p[2], p[3], p[4], p[5]] for p in parts]
    if ll > 0.01:
        Rr, F = v2.resultant(fr2)
        a, b = v2.project(cam, add(Rr, mul(F, -0.7))), v2.project(cam, add(Rr, mul(F, 2.7)))
        if a and b:
            o['loa'] = [_r(a[0]), _r(a[1]), _r(b[0]), _r(b[1]), _r(ll, 3)]
    if lc > 0.01:
        com = v2.car_centre(fr2.car)
        q = v2.project(cam, com)
        if q:
            o['com'] = [_r(q[0]), _r(q[1]), _r(lc, 3)]
            Rr, F = v2.resultant(fr2)
            foot = add(Rr, mul(F, dot(sub(com, Rr), F)))
            qf = v2.project(cam, foot)
            if qf:
                o['arm'] = [_r(q[0]), _r(q[1]), _r(qf[0]), _r(qf[1]), _r(lc, 3)]
    if la > 0.01:
        pts = [v2.project(cam, p) for p in v2.arc_points(fr2)]
        if all(pts):
            o['arc'] = {'pts': [[_r(p[0]), _r(p[1])] for p in pts], 'lv': _r(la, 3),
                        'draw': _r(clamp((t - A['k2_arc']) / 0.6), 3)}
    return o


# ----------------------------------------------------------------------------------------------- checks
def torque_check_k2():
    """r x F sense of the drawn K2 forces vs the plate's rotation (v2's validated check, at the mapped v2 times)."""
    v2 = _v2()
    sec = SEC['k2']
    out = []
    for t in (A['k2_force'], A['k2_com'], A['k2_arc']):
        f2 = v2_frame_at(clamp(t, sec['start'], sec['end'] - 1e-6), sec)
        out.append((round(t, 2), f2, v2.roll_check(f2 / v2.FPS)[0]))
    return out


def report():
    print('frames %d (%.2f s), render frames %d, poster layer frames %d, measured timing %s' % (
        N_FRAMES, DURATION, len(render_frames()), len(LAYER_FRAMES), 'yes' if TIMING else 'no (nominal anchors)'))
    for s in SECTIONS:
        f0, f1 = int(round(s['start'] * FPS)), int(round(s['end'] * FPS)) - 1
        extra = ''
        if s['plate'] == 'v2':
            extra = ' v2 %d..%d (%d frames; v3 %d frames)' % (s['v2_first'], s['v2_last'], s['v2_last'] - s['v2_first'] + 1,
                                                            f1 - f0 + 1)
            assert s['v2_last'] - s['v2_first'] == f1 - f0, 'v2 range length must equal the v3 section length'
            assert v2_frame_at(f1 / FPS, s) == s['v2_last']
        ev0, ev1 = event_time(s['start'], s), event_time(s['end'] - 1e-6, s)
        print('  %-10s %6.2f-%6.2f f%05d-f%05d %-6s ev %s%s' % (
            s['id'], s['start'], s['end'], f0, f1, s['plate'],
            '-' if ev0 is None else '%.2f->%.2f' % (ev0, ev1), extra))
    print('anchors:', ', '.join('%s %.2f' % (k, v) for k, v in A.items()))
    print('ramp ghosts ev:', [round(e, 2) for e in GHOSTS_RAMP], ' air ghosts ev:', GHOSTS_AIR)
    for t in (0.0, 1.6, 3.1, 4.2, 5.15, 6.5, 8.5, 12.0, 16.4, 19.0, 22.5, 24.2, 26.6, 27.3, 28.5, 30.0, 33.0, 34.4,
              35.9, 37.8, 41.0, 48.0, 52.0):
        fr = state(t)
        if fr.camera is None:
            print('  t %5.2f %-10s %s plate (no 3D state)' % (t, fr.section, fr.plate))
            continue
        q = project(fr.camera, fr.rs.com) if fr.plate != 'poster' else None
        print('  t %5.2f %-10s ev %6.3f cam lens %5.1f car px %s lights %s' % (
            t, fr.section, fr.ev, fr.camera['lens_mm'], None if q is None else (round(q[0]), round(q[1])), fr.lights))
    print('k2 r x F sense check (+1 = drawn torque matches the plate rotation):', torque_check_k2())


if __name__ == '__main__':
    report()
