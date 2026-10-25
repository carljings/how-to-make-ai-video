"""preview.py: a tiny numpy z-buffer rasteriser for geometry checks on a machine without Blender.

It is NOT the renderer and never evidence of visual acceptance: flat Lambert shading by material colour, no
shadows, reflections, volumes or anti-aliasing. It exists so silhouettes, proportions and the projected position
of the posed car can be compared with the source frames before Blender time is spent.

    python3 blender/tools/preview.py --out /tmp/car-views.png            # orthographic side/top/front/rear/under
    python3 blender/tools/preview.py --out /tmp/wide.png --wide 6.25,7.75  # source wide camera at those times
"""
import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

import roadster  # noqa: E402

MAT_RGB = {
    'paint': (0.86, 0.87, 0.89), 'glass': (0.04, 0.05, 0.06), 'satin_black': (0.06, 0.06, 0.06),
    'underbody': (0.16, 0.16, 0.17), 'under_frame': (0.30, 0.30, 0.31), 'panel_gap': (0.02, 0.02, 0.02),
    'lamp_white': (1.0, 1.0, 1.0), 'lamp_red': (1.0, 0.05, 0.08), 'lamp_amber': (1.0, 0.55, 0.05),
    'liner': (0.03, 0.03, 0.03), 'tyre': (0.05, 0.05, 0.05), 'rim': (0.20, 0.20, 0.22),
    'rim_dark': (0.05, 0.05, 0.05), 'brake': (0.35, 0.35, 0.35), 'caliper': (0.15, 0.15, 0.16),
    'nozzle': (0.45, 0.45, 0.47), 'plume': (0.70, 0.80, 1.0),
}
EMISSIVE = {'lamp_white', 'lamp_red', 'lamp_amber', 'plume'}


def mesh_arrays(mesh, matrix=None):
    """Triangulated numpy arrays (verts (N,3), tris (M,3), material name per triangle)."""
    v = np.asarray(mesh.verts, dtype=np.float64)
    if matrix is not None:
        m = np.asarray(matrix, dtype=np.float64)
        v = v @ m[:3, :3].T + m[:3, 3]
    tris, mats = [], []
    for f, mt in zip(mesh.faces, mesh.mats):
        for k in range(1, len(f) - 1):
            tris.append((f[0], f[k], f[k + 1]))
            mats.append(mt)
    return v, np.asarray(tris, dtype=np.int64), mats


class Camera:
    """Perspective (f_px) or orthographic (ortho_w metres across the image) camera; image y grows downward."""

    def __init__(self, eye, right, up, fwd, width, height, f_px=None, ortho_w=None):
        self.eye = np.asarray(eye, float)
        self.R = np.stack([np.asarray(right, float), np.asarray(up, float), np.asarray(fwd, float)])
        self.w, self.h, self.f, self.ortho_w = width, height, f_px, ortho_w

    def project(self, p):
        c = (np.asarray(p, float) - self.eye) @ self.R.T          # (x right, y up, z forward)
        if self.ortho_w:
            s = self.w / self.ortho_w
            return np.stack([self.w / 2 + c[:, 0] * s, self.h / 2 - c[:, 1] * s, c[:, 2]], axis=1)
        z = np.maximum(c[:, 2], 1e-6)
        return np.stack([self.w / 2 + self.f * c[:, 0] / z, self.h / 2 - self.f * c[:, 1] / z, c[:, 2]], axis=1)


def ortho_camera(view, width, height, span, center=(0.0, 0.0, 0.55)):
    c = np.asarray(center, float)
    axes = {   # (eye offset direction, right, up)
        'side_left': ((0, 1, 0), (1, 0, 0), (0, 0, 1)),     # looking at the car's left side, nose to the right
        'side_right': ((0, -1, 0), (-1, 0, 0), (0, 0, 1)),  # right side, nose to the left
        'top': ((0, 0, 1), (1, 0, 0), (0, 1, 0)),           # plan, nose right, left side up
        'under': ((0, 0, -1), (1, 0, 0), (0, -1, 0)),
        'front': ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
        'rear': ((-1, 0, 0), (0, -1, 0), (0, 0, 1)),
    }
    d, r, u = (np.asarray(a, float) for a in axes[view])
    return Camera(c + d * 50, r, u, -d, width, height, ortho_w=span)


def rasterize(cam, items, light=(0.35, -0.55, 0.75), bg=(0.0, 0.0, 0.0), alpha_mats=()):
    """items: [(verts (N,3), tris (M,3), mats)]. Returns an HxWx3 float image."""
    W, H = cam.w, cam.h
    img = np.empty((H, W, 3))
    img[:] = bg
    zbuf = np.full((H, W), np.inf)
    L = np.asarray(light, float)
    L /= np.linalg.norm(L)
    for verts, tris, mats in items:
        if len(tris) == 0:
            continue
        sp = cam.project(verts)
        a, b, c = verts[tris[:, 0]], verts[tris[:, 1]], verts[tris[:, 2]]
        n = np.cross(b - a, c - a)
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        view = cam.R[2] if cam.ortho_w else None
        for t in range(len(tris)):
            i0, i1, i2 = tris[t]
            p0, p1, p2 = sp[i0], sp[i1], sp[i2]
            if min(p0[2], p1[2], p2[2]) <= 1e-4:
                continue
            x0 = max(int(math.floor(min(p0[0], p1[0], p2[0]))), 0)
            x1 = min(int(math.ceil(max(p0[0], p1[0], p2[0]))), W - 1)
            y0 = max(int(math.floor(min(p0[1], p1[1], p2[1]))), 0)
            y1 = min(int(math.ceil(max(p0[1], p1[1], p2[1]))), H - 1)
            if x1 < x0 or y1 < y0:
                continue
            den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
            if abs(den) < 1e-12:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            w0 = ((p1[1] - p2[1]) * (xs - p2[0]) + (p2[0] - p1[0]) * (ys - p2[1])) / den
            w1 = ((p2[1] - p0[1]) * (xs - p2[0]) + (p0[0] - p2[0]) * (ys - p2[1])) / den
            w2 = 1 - w0 - w1
            inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not inside.any():
                continue
            z = w0 * p0[2] + w1 * p1[2] + w2 * p2[2]
            sub = zbuf[y0:y1 + 1, x0:x1 + 1]
            hit = inside & (z < sub)
            if not hit.any():
                continue
            mt = mats[t]
            base = np.asarray(MAT_RGB.get(mt, (1.0, 0.0, 1.0)))
            nn = n[t]
            if mt in EMISSIVE:
                col = base
            else:
                eye_dir = -view if view is not None else cam.eye - (verts[i0] + verts[i1] + verts[i2]) / 3
                eye_dir = eye_dir / max(np.linalg.norm(eye_dir), 1e-9)
                if np.dot(nn, eye_dir) < 0:
                    nn = -nn
                lam = max(0.0, float(np.dot(nn, L)))
                rim = (1 - abs(float(np.dot(nn, eye_dir)))) ** 3
                col = base * (0.28 + 0.72 * lam) + 0.12 * rim
            sub[hit] = z[hit]
            img[y0:y1 + 1, x0:x1 + 1][hit] = col
    return np.clip(img, 0, 1)


def to_image(arr):
    return Image.fromarray((np.clip(arr, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8))


def car_items(matrix=None, with_wheels=True, plumes=None):
    parts = roadster.build()
    items = [mesh_arrays(m, matrix) for m in parts.values()]
    if with_wheels:
        for name, (cx, cy, cz), side in roadster.wheel_placements():
            rot, st = roadster.wheel(rear=name.startswith('R'))
            for wm in (rot, st):
                w = wm if side > 0 else wm.mirrored_y()
                w = w.transformed(lambda p, cx=cx, cy=cy, cz=cz: (p[0] + cx, p[1] + cy, p[2] + cz))
                items.append(mesh_arrays(w, matrix))
    if plumes:
        items.append(mesh_arrays(plumes, matrix))
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--size', type=int, default=640, help='width of each orthographic panel')
    ap.add_argument('--wide', default='', help='comma-separated source times for the wide-camera check')
    args = ap.parse_args()
    if args.wide:
        import motion
        import staging
        times = [float(t) for t in args.wide.split(',') if t.strip()]
        cam_spec = staging.WIDE_CAMERA
        W, H = 960, 540
        pc = staging.pinhole(cam_spec, W, H)
        cam = Camera(pc.loc, pc.right, pc.up, pc.fwd, W, H, f_px=pc.f_px)
        base = [mesh_arrays(m, None) for m in staging.build_props().values()]
        panels = []
        for t in times:
            pose = motion.wide_pose(t)
            items = base + car_items(pose['matrix'], plumes=motion.plume_mesh(pose))
            img = to_image(rasterize(cam, items, light=(-0.3, -0.8, 0.5), bg=(0.01, 0.01, 0.012)))
            d = ImageDraw.Draw(img)
            ref = motion.source_anchor(t)
            if ref:
                x0, y0, x1, y1 = (v / 2 for v in ref['bbox_px'])
                d.rectangle((x0, y0, x1, y1), outline=(0, 230, 230))
            d.text((8, 8), f'{t:.2f}s  roll {pose["roll_deg"]:.0f}', fill=(255, 255, 0))
            panels.append(img)
        sheet = Image.new('RGB', (W * min(2, len(panels)), H * ((len(panels) + 1) // 2)))
        for i, p in enumerate(panels):
            sheet.paste(p, ((i % 2) * W, (i // 2) * H))
        sheet.save(args.out)
        print(args.out, sheet.size)
        return
    S = args.size
    views = ['side_right', 'side_left', 'top', 'under', 'front', 'rear']
    items = car_items()
    panels = []
    for v in views:
        span = 5.0 if v not in ('front', 'rear') else 2.6
        h = int(S * (0.42 if v not in ('front', 'rear', 'top', 'under') else (0.55 if v in ('top', 'under') else 0.62)))
        cam = ortho_camera(v, S, h, span)
        img = to_image(rasterize(cam, items))
        ImageDraw.Draw(img).text((6, 6), v, fill=(255, 255, 0))
        panels.append(img)
    W = S * 2
    rows = [panels[i:i + 2] for i in range(0, len(panels), 2)]
    H = sum(max(p.height for p in r) for r in rows)
    sheet = Image.new('RGB', (W, H), (40, 40, 40))
    y = 0
    for r in rows:
        for i, p in enumerate(r):
            sheet.paste(p, (i * S, y))
        y += max(p.height for p in r)
    sheet.save(args.out)
    print(args.out, sheet.size)


if __name__ == '__main__':
    main()
