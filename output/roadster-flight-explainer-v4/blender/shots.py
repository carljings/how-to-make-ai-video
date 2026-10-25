"""shots.py: film seconds 0–14, the source clip's four shots A/B/C/D reframed for the 9:16 film (pure Python, no bpy).

Film time equals source time here, with the canonical cuts at 0.85085, 2.20220 and 5.15515 s. Every shot shows the
SAME reconstructed manoeuvre from a different camera, never a second flight:

  A  0.000–0.851  wide camera; the low white car moves left behind the foreground post, then rises through cloud
  B  0.851–2.202  close camera just above a foreground white car's bonnet, looking up past its windscreen and roof
                  header; the car passes right to left overhead (side → canopy → inverted → underside)
  C  2.202–5.155  close low camera behind the tall truck cab, looking back toward the wide camera, so the screen
                  direction reverses; the car rolls back upright above the cab and descends out at the right
  D  5.155–14.0   the wide camera again: the fuller replay-like pass from motion.py and the growing cloud

A has its own early source-frame fit: the car is visible from frame zero, before cloud obscures its wheels. D uses
motion.wide_pose(). A's EVENT clock runs ~1.5x for plume/cloud growth only. B and C also have source-camera fits:
the car centre is back-projected from the
source screen track at a depth derived from its apparent length, and roll keys are fitted to the visible surfaces
(canopy, underside, red tail). These are visual fits to observed silhouettes and occlusions, not photogrammetry, and
not a trajectory, speed or height measurement.

Portrait reframing: each shot renders through a 9:16 camera at the SAME position as its source camera, aimed at a
source-pixel point that pans with the action like a camera operator and stays inside the source frame where the
source itself crops the action (hidden liftoff, car leaving frame, no landing).
"""
import math

import motion
import roadster
import staging
from geom import add, mul, norm, sub

SOURCE_END = 14.0
CUTS = tuple(motion.REFERENCE['cuts_s'])          # 0.85085, 2.2022, 5.15515
SOURCE_DIRS = {n: d for n, (_, d) in roadster.NOZZLES.items()}
PORTRAIT_H = 1920


def pchip_keys(keys):
    return motion.pchip(keys)


# ----------------------------------------------------------------------------------------------- source cameras
# Wide A/D: staging.WIDE_CAMERA. B and C are fits (see module doc); sensor 36 mm wide, as in the source frame.
CAM_B = {'name': 'CAM_B_close', 'location': (-2.0, 15.0, 1.0), 'yaw_deg': 0.0, 'pitch_deg': 25.0,
         'lens_mm': 20.0, 'sensor_width_mm': 36.0}
# C: least-squares fit (rms ≈ 31 source px) of four corners of the truck-cab back to their source pixels at 3.0 s
# (top 760,395 / 1150,470; low edges 1228,870 / 655,930); camera roll was ~0.5° and is dropped.
CAM_C = {'name': 'CAM_C_close', 'location': (1.015, 34.005, 1.345), 'yaw_deg': 168.33, 'pitch_deg': 21.18,
         'lens_mm': 14.36, 'sensor_width_mm': 36.0}
PIN = {'A': staging.WIDE, 'D': staging.WIDE, 'B': staging.Pinhole(CAM_B), 'C': staging.Pinhole(CAM_C)}
SPEC = {'A': staging.WIDE_CAMERA, 'D': staging.WIDE_CAMERA, 'B': CAM_B, 'C': CAM_C}


def shot_at(t):
    if t < CUTS[0]:
        return 'A'
    if t < CUTS[1]:
        return 'B'
    if t < CUTS[2]:
        return 'C'
    return 'D'


def event_time(shot, t):
    """Time on D's (motion.py) clock for plume windows, cloud growth and the wide-shot pose."""
    if shot == 'A':
        return 5.15 + 1.5 * t                 # effects only; A's low initial pose must not extrapolate D's flight
    if shot == 'B':
        return 6.6 + 2.8 * (t - 1.0)
    if shot == 'C':
        return 8.85 + 1.33 * (t - 2.25)
    return t


# ----------------------------------------------------------------------------------------------- source-shot fits
# A: visible body centres and apparent widths from the original 0/.2/.4/.6/.8 s frames. The .4 s centre is
# interpolated through the post/cloud occlusion; it does not establish wheel contact or a liftoff instant.
# Depths fit the inferred car's apparent width (~145→180 source px), not measured distance/height. Keep the
# early side pose: exposing motion.wide_pose() before D's anchors would instead put this car below the ground.
A_TRACK = [(0.0, 1827, 680), (0.2, 1775, 680), (0.4, 1703, 675), (0.6, 1630, 650),
           (0.8, 1540, 598), (0.85085, 1512, 582)]
A_DEPTH = [(0.0, 49.8), (0.2, 47.6), (0.4, 44.7), (0.6, 41.8), (0.8, 37.5), (0.85085, 36.5)]
_a = [pchip_keys([(k[0], k[i]) for k in A_TRACK]) for i in (1, 2)]
_a_depth = pchip_keys(A_DEPTH)
_a_roll = pchip_keys([(0.0, 0.0), (0.6, 0.0), (0.85085, 4.0)])

# D starts after the car has already moved behind the post. Its own source frames (not an assumed A offset)
# show a low body at 5.155/5.2, mostly occluded at 5.5, and rising through cloud at 5.8/6.1. Join the retained
# Opus wide fit exactly at 6.25; pre-anchor extrapolation otherwise places the first car below ground.
D_EARLY_END = 6.25
_d_join = motion.wide_pose(D_EARLY_END)
_d_join_px = staging.WIDE.project(_d_join['centre'])
D_EARLY_TRACK = [(CUTS[2], 1735, 680), (5.2, 1720, 680), (5.5, 1665, 674), (5.8, 1615, 647),
                 (6.1, 1540, 602), (D_EARLY_END, _d_join_px[0], _d_join_px[1])]
D_EARLY_DEPTH = [(CUTS[2], 42.9), (5.2, 42.7), (5.5, 41.0), (5.8, 36.0),
                 (6.1, 32.0), (D_EARLY_END, _d_join_px[2])]
_d_early = [pchip_keys([(k[0], k[i]) for k in D_EARLY_TRACK]) for i in (1, 2)]
_d_early_depth = pchip_keys(D_EARLY_DEPTH)

# (source time s, source px x, y) of the car body centre, measured on the source frames (±20–30 px), plus the
# entry/exit points where the car is cut by the frame edge.
B_TRACK = [(0.851, 1850, 570), (1.0, 1675, 535), (1.25, 1330, 440), (1.5, 1000, 385), (1.75, 640, 345),
           (2.0, 315, 375), (2.2022, 60, 420)]
B_DEPTH = 10.0           # m along the camera axis: the ~470 px body length at f = 1067 px
# roll to the left (deg), fitted so the camera ~25–30° below the car sees: side (1.0), canopy (1.25), more
# oblique canopy (1.5), inverted (1.75), underside with red tail (2.0)
B_ROLL = [(0.851, 5.0), (1.0, 18.0), (1.25, 100.0), (1.5, 150.0), (1.75, 205.0), (2.0, 265.0), (2.2022, 300.0)]
B_PITCH = [(0.851, -2.0), (1.5, 0.0), (2.2022, 3.0)]
C_TRACK = [(2.2022, 560, 190), (2.25, 640, 200), (2.5, 950, 240), (2.75, 1160, 325), (3.0, 1340, 430),
           (3.25, 1570, 540), (3.5, 1720, 665), (3.75, 1880, 760), (4.1, 2080, 880)]
C_DEPTH = [(2.2022, 6.8), (2.25, 7.0), (2.5, 8.6), (2.75, 10.0), (3.0, 11.3), (3.25, 12.4), (3.5, 14.5), (4.1, 18.5)]
# camera below and behind: canopy faces it near roll 225° (2.25 s), then the car rolls back upright with the red
# tail toward the camera (3.0 s) and is level by ~3.5 s
C_ROLL = [(2.2022, 216.0), (2.25, 222.0), (2.5, 250.0), (2.75, 290.0), (3.0, 322.0), (3.25, 348.0), (3.5, 360.0),
          (5.2, 360.0)]
C_PITCH = [(2.2022, 2.0), (3.0, 4.0), (3.5, 1.0), (4.1, 0.0)]
C_HIDE_AFTER = 3.95      # by then the car is past the source's right edge (and the portrait's); never seen again in C
D_HIDE_AFTER = 11.6      # D: the car has left past the left edge into the low cloud (no landing is shown)

_b = [pchip_keys([(k[0], k[i]) for k in B_TRACK]) for i in (1, 2)]
_c = [pchip_keys([(k[0], k[i]) for k in C_TRACK]) for i in (1, 2)]
_b_roll, _b_pitch = pchip_keys(B_ROLL), pchip_keys(B_PITCH)
_c_roll, _c_pitch, _c_depth = pchip_keys(C_ROLL), pchip_keys(C_PITCH), pchip_keys(C_DEPTH)


def close_pose(shot, t):
    """(body centre, roll, pitch) for close shots B/C at source time t."""
    if shot == 'B':
        u, v, depth = _b[0](t), _b[1](t), B_DEPTH
        roll, pitch = _b_roll(t), _b_pitch(t)
    else:
        u, v, depth = _c[0](t), _c[1](t), _c_depth(t)
        roll, pitch = _c_roll(t), _c_pitch(t)
    return PIN[shot].at_depth(u, v, depth), roll, pitch


# ----------------------------------------------------------------------------------------------- shot-only set pieces
# B: the foreground white car whose bonnet carries the camera; nose toward the camera, roof header 1.6 m ahead.
B_FOREGROUND = {'kind': 'sedan', 'material': 'lineup_white', 'heading_deg': -90.0,
                'origin': (CAM_B['location'][0], CAM_B['location'][1] + 1.79, 0.0)}


def b_foreground_mesh():
    m = staging.car_prop(B_FOREGROUND['kind'], B_FOREGROUND['material'], glass_roof=False)
    return staging.place(m, B_FOREGROUND['origin'], B_FOREGROUND['heading_deg'])


# C: the small bright disc at source px (850, 300) in every C frame. It never moves, is behind the wide camera's
# view and lights nothing, so it is drawn as a distant moon-like disc (identity of the light not established).
MOON = {'centre': PIN['C'].at_depth(850, 300, 800.0), 'radius': 3.4}


# ----------------------------------------------------------------------------------------------- portrait reframing
# H_SRC: source-pixel height covered by the portrait at its axis (1080 = the source's own vertical field).
# AIM: (t, source px x, y) the portrait axis points at; it pans with the action and is clamped so the portrait never
# looks past the source frame's sides.
FRAMING = {
    'A': {'h_src': 700, 'aim': [(0.0, 1827, 625), (0.2, 1775, 625), (0.4, 1703, 625),
                                (0.6, 1630, 625), (0.8, 1540, 610), (0.85085, 1512, 600)]},
    'B': {'h_src': 1400, 'aim': [(0.851, 1520, 560), (1.0, 1480, 555), (1.25, 1250, 520), (1.5, 980, 505),
                                 (1.75, 690, 505), (2.0, 450, 520), (2.2022, 400, 530)]},
    'C': {'h_src': 1300, 'aim': [(2.2022, 760, 470), (2.5, 900, 470), (3.0, 1180, 500), (3.5, 1450, 540),
                                 (3.9, 1460, 545), (4.5, 1300, 530), (5.155, 1150, 520)]},
    'D': {'h_src': 1150, 'aim': [(5.155, 1360, 540), (5.9, 1420, 540), (6.5, 1400, 535), (7.25, 1240, 520),
                                 (8.0, 1040, 510), (8.75, 830, 505), (9.5, 610, 515), (10.25, 420, 530),
                                 (10.75, 345, 540), (11.4, 330, 545), (12.2, 420, 545), (13.2, 760, 540),
                                 (14.0, 900, 540)]},
}
_aim = {s: (pchip_keys([(k[0], k[1]) for k in f['aim']]), pchip_keys([(k[0], k[2]) for k in f['aim']]))
        for s, f in FRAMING.items()}
_d_early_aim = (pchip_keys([(CUTS[2], 1735), (5.5, 1665), (5.8, 1540), (6.1, 1450),
                           (D_EARLY_END, _aim['D'][0](D_EARLY_END))]),
                pchip_keys([(CUTS[2], 540), (6.1, 540), (D_EARLY_END, _aim['D'][1](D_EARLY_END))]))


def f_src_px(shot):
    spec = SPEC[shot]
    return spec['lens_mm'] / spec['sensor_width_mm'] * staging.SOURCE_W


def portrait_camera(shot, t):
    """Film camera dict (eye, target, lens_mm; vertical 36 mm sensor, as film.project / the renderer use).

    The aim is clamped in ANGLE, not source pixels: the portrait's own side edge may reach, but never pass, the
    source frame's side edge (a rectilinear wide source lens compresses angles toward its edges, so a pixel clamp
    would let the portrait see past the source crop, e.g. the car descending toward the ground in C)."""
    fr = FRAMING[shot]
    aim = _d_early_aim if shot == 'D' and t < D_EARLY_END else _aim[shot]
    f_src = f_src_px(shot)
    lens = f_src * 36.0 / fr['h_src']
    f_p = lens / 36.0 * PORTRAIT_H                           # portrait focal length in portrait px
    edge = math.atan(0.5 * staging.SOURCE_W / f_src)         # source half-FOV (horizontal)
    half = math.atan(540.0 / f_p)                            # portrait half-FOV (horizontal, 1080 px wide)
    theta = math.atan((aim[0](t) - 0.5 * staging.SOURCE_W) / f_src)
    theta = max(-(edge - half), min(edge - half, theta))
    u = 0.5 * staging.SOURCE_W + f_src * math.tan(theta)
    v = aim[1](t)
    pin = PIN[shot]
    eye = pin.loc
    target = add(eye, norm(pin.ray(u, v)))
    return {'eye': eye, 'target': target, 'lens_mm': lens, 'fstop': None, 'shot': shot,
            'aim_px': (round(u, 1), round(v, 1))}


# ----------------------------------------------------------------------------------------------- state
def source_state(fr, t):
    """Fill a film.Frame for film time t < SOURCE_END."""
    shot = shot_at(t)
    ev = event_time(shot, t)
    fr.shot = shot
    fr.event_s = ev
    fr.camera = portrait_camera(shot, t)
    fr.nozzle_dirs = SOURCE_DIRS
    fr.clouds = motion.cloud_state(ev)
    if shot == 'A':
        # Headlamp bloom alone is not a jet. Obvious cloud/stream starts around .38–.40 s in the source.
        cloud_gain = max(0.0, min(1.0, (t - 0.35) / 0.05))
        for cloud in fr.clouds:
            cloud['density'] *= cloud_gain
    fr.lights = {'film_key': 0.0, 'film_rim': 0.0, 'floods': 1.0, 'backs': 0.15 if shot == 'C' else 1.0}
    fr.set_pieces = {'b_foreground': shot == 'B', 'moon': True}
    if shot == 'A':
        centre = staging.WIDE.at_depth(_a[0](t), _a[1](t), _a_depth(t))
        roll = _a_roll(t)
        fr.car = motion.pose_matrix(centre, motion.HEADING_DEG, 0.0, roll)
        fr.car_visible = True                # post and cloud provide the observed occlusion, not a hide gate
        fr.pose = {'roll_left_deg': roll, 'pitch_down_deg': 0.0,
                   'heading_deg': motion.HEADING_DEG, 'centre': centre}
    elif shot == 'D':
        pose = motion.wide_pose(ev)
        if t < D_EARLY_END:
            pose['centre'] = staging.WIDE.at_depth(_d_early[0](t), _d_early[1](t), _d_early_depth(t))
            pose['matrix'] = motion.pose_matrix(pose['centre'], pose['heading_deg'],
                                               pose['pitch_down_deg'], pose['roll_left_deg'])
        fr.car = pose['matrix']
        fr.car_visible = ev <= D_HIDE_AFTER
        fr.pose = {'roll_left_deg': pose['roll_left_deg'], 'pitch_down_deg': pose['pitch_down_deg'],
                   'heading_deg': pose['heading_deg'], 'centre': pose['centre']}
    else:
        centre, roll, pitch = close_pose(shot, t)
        fr.car = motion.pose_matrix(centre, motion.HEADING_DEG, pitch, roll)
        fr.car_visible = not (shot == 'C' and t > C_HIDE_AFTER)
        fr.pose = {'roll_left_deg': roll, 'pitch_down_deg': pitch, 'heading_deg': motion.HEADING_DEG,
                   'centre': centre}
    plumes_on = fr.car_visible
    for n in roadster.NOZZLES:
        fr.plumes[n] = motion.plume_level(n, ev) if plumes_on else 0.0
        if shot == 'A' and n == 'NOSE':
            rise = max(0.0, min(1.0, (t - 0.35) / 0.05))
            fr.plumes[n] = rise * motion.plume_level(n, max(ev, 5.85))
        if shot == 'D' and t < D_EARLY_END and n == 'NOSE':
            rise = max(0.0, min(1.0, (t - 5.30) / 0.10))
            fr.plumes[n] = rise * motion.plume_level(n, max(ev, 5.85))
    if shot == 'D':
        fr.note('replay', '原片同段回放', min(1.0, max(0.0, (t - CUTS[2]) / 0.25)) * min(1.0, max(0.0, (7.6 - t) / 0.4)))
    return fr


if __name__ == '__main__':
    import film
    for t in (0.0, 0.5, 0.8, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0, 2.19, 2.25, 2.5, 3.0, 3.25, 3.5, 4.0, 5.0, 5.2, 6.25,
              7.75, 8.75, 10.25, 11.0, 12.0, 13.9):
        fr = film.state(t)
        c = fr.pose['centre']
        p = film.project(fr.camera, c)
        print('t %5.2f %s ev %5.2f car (%6.2f %6.2f %5.2f) roll %5.1f vis %d  portrait px %s  lens %.1f  aim %s' % (
            t, fr.shot, fr.event_s, c[0], c[1], c[2], fr.pose['roll_left_deg'], fr.car_visible,
            None if p is None else (round(p[0]), round(p[1])), fr.camera['lens_mm'], fr.camera['aim_px']))
    print('moon', [round(v, 1) for v in MOON['centre']])
