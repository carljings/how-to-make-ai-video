"""rampfit.py: multi-view silhouette fit of the ramp profile to native frames of Tesla's "The Ramp | Roadster" clip.

Pure numpy + PIL (no scipy). The ramp is a slab of width W swept along a 2D profile in the x-z plane:
flat run-in (s < 0), tangent-continuous circular arcs from tangent angle 0 to PHI_DECK, then a STRAIGHT upper deck of
length L_DECK at that angle. Each view has a pinhole camera (eye, yaw, pitch, roll, focal); the two main-wide frames
share one eye (the source camera only pans/zooms there). The fit minimises the distance between the projected neon
edges (and the deck's free end) and the boundary of the bright ramp mask in each frame, plus the reverse distance
(mask boundary -> model edges) so the model cannot shrink into part of the outline. Robust (Cauchy) weights.

Scale is fixed by the slab width W (3.05 m, v3's estimate against the car's width); every length is therefore a
FIT IN UNITS OF THAT ESTIMATE, not a measured dimension.

    python3 -I v4/tools/rampfit.py FRAMES_DIR OUT_DIR [--iters N] [--profile k]

FRAMES_DIR holds src_<t>.jpg frames extracted from the native 1920x1080 reference. Writes OUT_DIR/fit.json and
overlay_<view>.png (model edges drawn over the source: green near edge, cyan far edge, yellow deck end).
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

W_SLAB = 3.05
IMG_W, IMG_H = 1920, 1080
DS = 2                                     # analysis downsample (masks / distance transforms at 960 x 540)

# --------------------------------------------------------------------------------------------- views
# roi: (x0, y0, x1, y1) source px where the ramp is; ignore: rectangles removed from the mask (car, venue lights);
# s_min: first arc length used (the run-in/floor junction is cluttered in some views)
VIEWS = {
    'W4': {'file': 'src_4.0.jpg', 'roi': (760, 60, 1220, 860), 'ignore': [(940, 780, 1080, 860)], 'group': 'wide',
           's_min': 2.5},
    'W8': {'file': 'src_8.0.jpg', 'roi': (760, 20, 1240, 900), 'ignore': [(960, 220, 1080, 340)], 'group': 'wide',
           's_min': 2.5},
    'EL': {'file': 'src_44.0.jpg', 'roi': (1250, 15, 1640, 400), 'ignore': [], 'group': None, 's_min': 1.0},
    'RB': {'file': 'src_18.0.jpg', 'roi': (880, 360, 1270, 1079), 'ignore': [(890, 330, 1075, 580)], 'group': None,
           's_min': 4.0},
}


def load_mask(path, roi, ignore, thr=88.0):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    L = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    red = (a[..., 0] > 110) & (a[..., 0] > 1.7 * a[..., 1]) & (a[..., 0] > 1.5 * a[..., 2])
    m = (L > thr) | red
    keep = np.zeros_like(m)
    x0, y0, x1, y1 = roi
    keep[y0:y1, x0:x1] = True
    for (a0, b0, a1, b1) in ignore:
        keep[b0:b1, a0:a1] = False
    m &= keep
    # downsample (any)
    h, w = m.shape
    m = m[:h - h % DS, :w - w % DS].reshape(h // DS, DS, w // DS, DS).any(axis=(1, 3))
    m = largest_component(m)
    return m, keep[::DS, ::DS]


def largest_component(m):
    """4-connected largest component (iterative flood fill on the downsampled mask)."""
    h, w = m.shape
    lab = np.zeros(m.shape, dtype=np.int32)
    best, best_n, cur = 0, 0, 0
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        if lab[y, x]:
            continue
        cur += 1
        stack = [(y, x)]
        lab[y, x] = cur
        n = 0
        while stack:
            cy, cx = stack.pop()
            n += 1
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur
                    stack.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    return lab == best


def boundary(m):
    b = np.zeros_like(m)
    b[1:-1, 1:-1] = m[1:-1, 1:-1] & ~(m[:-2, 1:-1] & m[2:, 1:-1] & m[1:-1, :-2] & m[1:-1, 2:])
    return b


def edt_1d(f):
    """Felzenszwalb squared-distance transform of a 1D array of squared costs (inf where no seed)."""
    n = len(f)
    d = np.empty(n)
    v = np.zeros(n, dtype=np.int64)
    z = np.empty(n + 1)
    k = 0
    v[0] = 0
    z[0], z[1] = -np.inf, np.inf
    for q in range(1, n):
        if not np.isfinite(f[q]):
            continue
        if not np.isfinite(f[v[k]]):
            v[k] = q
            continue
        while True:
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
            if s <= z[k] and k > 0:
                k -= 1
                continue
            break
        if s <= z[k]:
            v[k] = q
            z[k + 1] = np.inf
            continue
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = np.inf
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d


def edt(seed):
    INF = 1e12
    f = np.where(seed, 0.0, INF)
    g = np.empty_like(f)
    for x in range(f.shape[1]):
        g[:, x] = edt_1d(f[:, x])
    out = np.empty_like(f)
    for y in range(f.shape[0]):
        out[y, :] = edt_1d(g[y, :])
    return np.sqrt(np.minimum(out, INF))


def sample_dt(dt, px, py):
    """Bilinear lookup of a downsampled distance transform at SOURCE pixel coords (returns source px)."""
    h, w = dt.shape
    x = np.clip(px / DS, 0, w - 1.001)
    y = np.clip(py / DS, 0, h - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    v = (dt[y0, x0] * (1 - fx) * (1 - fy) + dt[y0, x0 + 1] * fx * (1 - fy) + dt[y0 + 1, x0] * (1 - fx) * fy
         + dt[y0 + 1, x0 + 1] * fx * fy)
    return v * DS


# --------------------------------------------------------------------------------------------- profile
class Profile:
    """arcs: [(phi_end_deg, radius)], deck: straight length after the last arc."""

    def __init__(self, arcs, deck):
        self.arcs, self.deck = arcs, deck
        segs, p, phi, s = [], np.array([0.0, 0.0]), 0.0, 0.0
        for phi1, r in arcs:
            a0, a1 = math.radians(phi), math.radians(phi1)
            c = np.array([p[0] - r * math.sin(a0), p[1] + r * math.cos(a0)])
            ln = r * (a1 - a0)
            segs.append(('arc', s, s + ln, a0, a1, r, c))
            p = np.array([c[0] + r * math.sin(a1), c[1] - r * math.cos(a1)])
            s += ln
            phi = phi1
        self.s_arc_end = s
        self.p_arc_end = p
        self.phi_deck = math.radians(phi)
        segs.append(('line', s, s + deck, p))
        self.segs = segs
        self.s_end = s + deck

    def at(self, s):
        """(x, z, phi) for arrays of s in [0, s_end]."""
        s = np.asarray(s, dtype=float)
        x, z, ph = np.zeros_like(s), np.zeros_like(s), np.zeros_like(s)
        done = np.zeros(s.shape, dtype=bool)
        for seg in self.segs:
            if seg[0] == 'arc':
                _, s0, s1, a0, a1, r, c = seg
                sel = ~done & (s <= s1 + 1e-9)
                a = a0 + (s[sel] - s0) / r
                x[sel], z[sel], ph[sel] = c[0] + r * np.sin(a), c[1] - r * np.cos(a), a
            else:
                _, s0, s1, p = seg
                sel = ~done
                d = s[sel] - s0
                x[sel] = p[0] + d * math.cos(self.phi_deck)
                z[sel] = p[1] + d * math.sin(self.phi_deck)
                ph[sel] = self.phi_deck
            done |= sel
        return x, z, ph


# --------------------------------------------------------------------------------------------- camera
def cam_axes(yaw, pitch, roll):
    d = np.array([math.cos(pitch) * math.cos(yaw), math.cos(pitch) * math.sin(yaw), math.sin(pitch)])
    r0 = np.cross(d, [0.0, 0.0, 1.0])
    r0 /= np.linalg.norm(r0)
    u0 = np.cross(r0, d)
    r = math.cos(roll) * r0 + math.sin(roll) * u0
    u = -math.sin(roll) * r0 + math.cos(roll) * u0
    return r, u, d


def project(cam, P):
    eye, yaw, pitch, roll, f = cam
    r, u, d = cam_axes(yaw, pitch, roll)
    v = P - eye
    zc = v @ d
    zc = np.where(zc < 1e-3, 1e-3, zc)
    return IMG_W / 2 + f * (v @ r) / zc, IMG_H / 2 - f * (v @ u) / zc


def cam_from_look(eye, target, lens_px, roll=0.0):
    v = np.array(target, float) - np.array(eye, float)
    yaw = math.atan2(v[1], v[0])
    pitch = math.atan2(v[2], math.hypot(v[0], v[1]))
    return [np.array(eye, float), yaw, pitch, roll, lens_px]


# --------------------------------------------------------------------------------------------- parameter vector
N_ARCS = 3


def unpack(x, layout):
    i = 0
    arcs = []
    for k in range(N_ARCS):
        arcs.append((x[i], abs(x[i + 1]) + 0.3))
        i += 2
    deck = abs(x[i])
    i += 1
    cams = {}
    eyes = {}
    for name in layout:
        g = VIEWS[name]['group']
        if g is not None and g in eyes:
            eye = eyes[g]
        else:
            eye = np.array(x[i:i + 3])
            i += 3
            if g is not None:
                eyes[g] = eye
        yaw, pitch, roll, f = x[i:i + 4]
        i += 4
        cams[name] = [eye, yaw, pitch, roll, f]
    return Profile(arcs, deck), cams


def pack(arcs, deck, cams, layout):
    x = []
    for a, r in arcs:
        x += [a, r - 0.3]
    x.append(deck)
    seen = set()
    for name in layout:
        g = VIEWS[name]['group']
        eye, yaw, pitch, roll, f = cams[name]
        if not (g is not None and g in seen):
            x += list(eye)
            if g is not None:
                seen.add(g)
        x += [yaw, pitch, roll, f]
    return np.array(x, float)


# --------------------------------------------------------------------------------------------- residuals
def model_edges(prof, s_min, n=90):
    s = np.linspace(s_min, prof.s_end, n)
    x, z, _ = prof.at(s)
    near = np.stack([x, np.full_like(x, -W_SLAB / 2), z], 1)
    far = np.stack([x, np.full_like(x, W_SLAB / 2), z], 1)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    yy = np.linspace(-W_SLAB / 2, W_SLAB / 2, 12)
    end = np.stack([np.full_like(yy, xe[0]), yy, np.full_like(yy, ze[0])], 1)
    return near, far, end


def seg_dist(px, py, ax, ay, bx, by):
    """distance from points (px,py) [N] to segments a->b [M]: returns [N] minimum."""
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy + 1e-9
    t = ((px[:, None] - ax[None]) * dx[None] + (py[:, None] - ay[None]) * dy[None]) / L2[None]
    t = np.clip(t, 0, 1)
    qx, qy = ax[None] + t * dx[None], ay[None] + t * dy[None]
    return np.sqrt(((px[:, None] - qx) ** 2 + (py[:, None] - qy) ** 2).min(1))


def residuals(x, layout, data, priors):
    prof, cams = unpack(x, layout)
    res = []
    for name in layout:
        V, D = VIEWS[name], data[name]
        near, far, end = model_edges(prof, V['s_min'])
        cam = cams[name]
        polys = []
        for P in (near, far, end):
            u, v = project(cam, P)
            res.append(sample_dt(D['dt'], u, v) / 4.0)
            polys.append((u, v))
        # reverse: boundary samples to nearest model edge segment
        ax = np.concatenate([p[0][:-1] for p in polys])
        ay = np.concatenate([p[1][:-1] for p in polys])
        bx = np.concatenate([p[0][1:] for p in polys])
        by = np.concatenate([p[1][1:] for p in polys])
        d = seg_dist(D['bx'], D['by'], ax, ay, bx, by)
        res.append(d / 4.0 * 0.7)
    r = np.concatenate(res)
    # Cauchy robust weighting (scale c), applied as sqrt-weight on the raw residual
    c = 3.0
    r = c * np.sqrt(np.log1p((r / c) ** 2))
    # weak priors (keep degenerate directions near the start)
    pri = [(x[k] - v) / s for k, v, s in priors]
    return np.concatenate([r, np.array(pri)])


def lm(fun, x0, iters=60, lam=1e-2, verbose=True):
    x = x0.copy()
    r = fun(x)
    cost = 0.5 * r @ r
    for it in range(iters):
        J = np.empty((len(r), len(x)))
        for k in range(len(x)):
            h = 1e-4 * max(1.0, abs(x[k]))
            xp = x.copy()
            xp[k] += h
            J[:, k] = (fun(xp) - r) / h
        g = J.T @ r
        A = J.T @ J
        improved = False
        for _ in range(12):
            step = np.linalg.solve(A + lam * np.diag(np.diag(A) + 1e-9), -g)
            xn = x + step
            rn = fun(xn)
            cn = 0.5 * rn @ rn
            if cn < cost:
                x, r, cost = xn, rn, cn
                lam = max(lam / 3, 1e-7)
                improved = True
                break
            lam *= 4
        if verbose:
            print('  it %2d cost %.2f lam %.1e' % (it, cost, lam), flush=True)
        if not improved:
            break
    return x, cost


# --------------------------------------------------------------------------------------------- drawing
def draw_overlay(path, out, prof, cam, roi, s_min=0.0):
    im = Image.open(path).convert('RGB')
    d = ImageDraw.Draw(im)
    s = np.linspace(0.0, prof.s_end, 240)
    x, z, _ = prof.at(s)
    for y, col in ((-W_SLAB / 2, (60, 255, 90)), (W_SLAB / 2, (40, 220, 255))):
        P = np.stack([x, np.full_like(x, y), z], 1)
        u, v = project(cam, P)
        d.line(list(zip(u.tolist(), v.tolist())), fill=col, width=2)
    # run-in (s < 0) hint and the arc/deck junction marker
    sj = np.array([prof.s_arc_end])
    xj, zj, _ = prof.at(sj)
    for y in (-W_SLAB / 2, W_SLAB / 2):
        u, v = project(cam, np.array([[xj[0], y, zj[0]]]))
        d.ellipse([u[0] - 5, v[0] - 5, u[0] + 5, v[0] + 5], outline=(255, 60, 255), width=2)
    xe, ze, _ = prof.at(np.array([prof.s_end]))
    P = np.array([[xe[0], -W_SLAB / 2, ze[0]], [xe[0], W_SLAB / 2, ze[0]]])
    u, v = project(cam, P)
    d.line(list(zip(u.tolist(), v.tolist())), fill=(255, 230, 40), width=3)
    x0, y0, x1, y1 = roi
    pad = 40
    im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(IMG_W, x1 + pad), min(IMG_H, y1 + pad)))
    sc = 900.0 / max(im.size)
    if sc > 1.0:
        im = im.resize((int(im.size[0] * sc), int(im.size[1] * sc)), Image.LANCZOS)
    im.save(out)


# --------------------------------------------------------------------------------------------- main
def init_cams():
    f_wide8 = 115.8 / 36.0 * 1080
    cams = {
        'W8': cam_from_look((-38.1, -52.0, 1.6), (2.76, 0.0, 6.31), f_wide8),
        'W4': cam_from_look((-38.1, -52.0, 1.6), (2.4, 0.0, 7.4), f_wide8 * 0.86),
        'RB': cam_from_look((-30.0, -6.5, 1.5), (0.0, 0.0, 10.5), 55.0 / 36.0 * 1080),
    }
    return cams


def main():
    frames_dir, out_dir = sys.argv[1], sys.argv[2]
    iters = int(sys.argv[sys.argv.index('--iters') + 1]) if '--iters' in sys.argv else 40
    os.makedirs(out_dir, exist_ok=True)
    layout = [v for v in ('W4', 'W8', 'EL', 'RB') if v in VIEWS]
    data = {}
    for name in layout:
        V = VIEWS[name]
        m, keep = load_mask(os.path.join(frames_dir, V['file']), V['roi'], V['ignore'])
        b = boundary(m)
        dt = edt(b)
        ys, xs = np.nonzero(b)
        step = max(1, len(xs) // 260)
        data[name] = {'dt': dt, 'bx': xs[::step] * DS + 0.5 * DS, 'by': ys[::step] * DS + 0.5 * DS, 'mask': m}
        Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask_%s.png' % name))
        print('view %s: mask px %d, boundary px %d' % (name, m.sum(), b.sum()), flush=True)
    arcs0 = [(85.0, 5.5), (95.0, 12.0), (130.0, 9.0)]
    deck0 = 6.0
    cams0 = init_cams()
    results = []
    # the elevated camera is unknown: multi-start over its azimuth / elevation around the ramp
    starts = []
    for az in (-60.0, -90.0, -120.0, -150.0):
        for el in (18.0, 30.0):
            dist = 75.0
            c = np.array([2.0, 0.0, 9.0])
            eye = c + dist * np.array([math.cos(math.radians(el)) * math.cos(math.radians(az)),
                                       math.cos(math.radians(el)) * math.sin(math.radians(az)),
                                       math.sin(math.radians(el))])
            starts.append((az, el, eye, c))
    for az, el, eye, c in starts:
        cams = dict(cams0)
        # aim below-left of the ramp so it lands top-right in frame (rough), then let the fit roll/yaw
        cams['EL'] = cam_from_look(eye, c, 2200.0)
        cams['EL'][1] -= math.radians(14.0) * (1 if az > -90 else -1)
        cams['EL'][2] -= math.radians(8.0)
        x0 = pack(arcs0, deck0, cams, layout)
        # priors: focal lengths loosely (factor ~1.6), wide eye height (camera on a tripod), roll small
        pri = []
        k = 2 * N_ARCS + 1
        idx = {}
        seen = set()
        for name in layout:
            g = VIEWS[name]['group']
            if not (g is not None and g in seen):
                idx[name + '_eye'] = k
                k += 3
                if g is not None:
                    seen.add(g)
            idx[name] = k
            k += 4
        for name in layout:
            pri.append((idx[name] + 3, x0[idx[name] + 3], x0[idx[name] + 3] * 0.6))
            pri.append((idx[name] + 2, 0.0, math.radians(6.0)))
        pri.append((idx['W4_eye'] + 2, 1.6, 1.5))
        fun = lambda x: residuals(x, layout, data, pri)  # noqa: E731
        x1, cost = lm(fun, x0, iters=iters, verbose=False)
        prof, cams = unpack(x1, layout)
        print('start az %4.0f el %3.0f -> cost %.1f arcs %s deck %.2f' % (
            az, el, cost, [(round(a, 1), round(r, 2)) for a, r in prof.arcs], prof.deck), flush=True)
        results.append((cost, x1, az, el))
    results.sort(key=lambda r: r[0])
    cost, xb, az, el = results[0]
    fun = lambda x: residuals(x, layout, data, [])  # noqa: E731
    prof, cams = unpack(xb, layout)
    out = {'cost': cost, 'start': [az, el], 'W': W_SLAB,
           'arcs': [[round(a, 3), round(r, 4)] for a, r in prof.arcs], 'deck': round(prof.deck, 4),
           's_arc_end': round(prof.s_arc_end, 4), 's_end': round(prof.s_end, 4),
           'arc_end_xz': [round(v, 4) for v in prof.p_arc_end],
           'deck_end_xz': [round(float(v[0]), 4) for v in prof.at(np.array([prof.s_end]))[:2]],
           'cams': {n: {'eye': [round(float(v), 3) for v in c[0]], 'yaw_deg': round(math.degrees(c[1]), 3),
                        'pitch_deg': round(math.degrees(c[2]), 3), 'roll_deg': round(math.degrees(c[3]), 3),
                        'f_px': round(c[4], 1)} for n, c in cams.items()},
           'per_view_rms_px': {}}
    for name in layout:
        V, D = VIEWS[name], data[name]
        near, far, end = model_edges(prof, V['s_min'])
        rs = []
        for P in (near, far, end):
            u, v = project(cams[name], P)
            rs.append(sample_dt(D['dt'], u, v))
        rs = np.concatenate(rs)
        out['per_view_rms_px'][name] = round(float(np.sqrt(np.mean(np.minimum(rs, 30) ** 2))), 2)
        draw_overlay(os.path.join(frames_dir, V['file']), os.path.join(out_dir, 'overlay_%s.png' % name), prof,
                     cams[name], V['roi'])
    out['all_starts'] = [[round(c, 1), a, e] for c, _, a, e in results]
    json.dump(out, open(os.path.join(out_dir, 'fit.json'), 'w'), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
