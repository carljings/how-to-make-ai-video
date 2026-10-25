"""diagram.py: schematic geometry for the explanatory acts (pure Python, no bpy).

Arrows, dashed lines of action, the centre-of-mass marker, a torque arc, the contact-surface panel, pressure-vessel
capsules and particle dots. Everything here is a principle illustration: vessel count/placement and nozzle layout
are schematic choices, not Tesla hardware.
"""
import math

from geom import Mesh, add, box, cross, lathe, length, mul, norm, signed_volume, sub, tube


def _basis(axis):
    """Orthonormal (u, v, w), w along axis."""
    w = norm(axis)
    ref = (0.0, 0.0, 1.0) if abs(w[2]) < 0.9 else (1.0, 0.0, 0.0)
    u = norm(cross(ref, w))
    return u, cross(w, u), w


def _orient(mesh, origin, axis):
    """Map a mesh built along +Z (origin at 0) onto `axis` starting at `origin`."""
    u, v, w = _basis(axis)
    return mesh.transformed(lambda p: add(origin, add(add(mul(u, p[0]), mul(v, p[1])), mul(w, p[2]))))


def _outward(mesh):
    if signed_volume(mesh) < 0:
        mesh.faces = [tuple(reversed(f)) for f in mesh.faces]
        mesh.uvs = [tuple(reversed(uv)) if uv else None for uv in mesh.uvs]
    return mesh


def arrow(start, end, radius, mat, head_len=None, head_radius=None, segs=18):
    """Solid arrow from start to end (tip at end)."""
    d = sub(end, start)
    L = length(d)
    if L < 1e-5:
        return Mesh()
    hl = min(head_len or radius * 6.0, 0.6 * L)
    hr = head_radius or radius * 2.6
    prof = [(0.0, 0.0), (radius, 0.0), (radius, L - hl), (hr, L - hl), (0.0, L)]
    return _orient(_outward(lathe(prof, segs, mat, axis='Z').weld()), start, d)


def dashed(start, end, radius, mat, dash=0.22, gap=0.14, segs=10):
    d = sub(end, start)
    L = length(d)
    m = Mesh()
    s = 0.0
    while s < L - 1e-6:
        e = min(L, s + dash)
        piece = lathe([(0.0, s), (radius, s), (radius, e), (0.0, e)], segs, mat, axis='Z')
        m.extend(piece)
        s = e + gap
    return _orient(_outward(m.weld()), start, d) if m.faces else m


def arc_arrow(radius, a0, a1, tube_r, mat, head_len=None, n=48):
    """Arc from angle a0 to a1 (radians, counter-clockwise if a1 > a0) in the local XY plane, centre at the
    origin, arrowhead at a1. Orient it with place_in_plane()."""
    sgn = 1.0 if a1 >= a0 else -1.0
    hl = head_len or tube_r * 7.0
    a_end = a1 - sgn * hl / radius
    pts = [(radius * math.cos(a0 + (a_end - a0) * k / n), radius * math.sin(a0 + (a_end - a0) * k / n), 0.0) for k in range(n + 1)]
    m = tube(pts, tube_r, 12, mat)
    base = pts[-1]
    tip = (radius * math.cos(a1), radius * math.sin(a1), 0.0)
    m.extend(arrow(base, tip, tube_r, mat, head_len=hl, head_radius=tube_r * 2.8))
    return m


def place(mesh, origin, x_axis, y_axis):
    """Map local (x, y, z) to origin + x·X + y·Y + z·(X × Y)."""
    X, Y = norm(x_axis), norm(y_axis)
    Z = cross(X, Y)
    return mesh.transformed(lambda p: add(origin, add(add(mul(X, p[0]), mul(Y, p[1])), mul(Z, p[2]))))


def com_marker(radius, light='fx_com_light', dark='fx_com_dark', segs=48):
    """Classic centre-of-mass symbol: a disc split into four alternating quadrants with a rim, in the local XY
    plane facing +Z (billboard it toward the camera)."""
    m = Mesh()
    c = m.add_vert((0.0, 0.0, 0.0))
    ring = [m.add_vert((radius * math.cos(2 * math.pi * k / segs), radius * math.sin(2 * math.pi * k / segs), 0.0))
            for k in range(segs)]
    for k in range(segs):
        quadrant = (k * 4) // segs
        m.add_face((c, ring[k], ring[(k + 1) % segs]), light if quadrant % 2 == 0 else dark)
    rim = [(1.08 * radius * math.cos(2 * math.pi * k / segs), 1.08 * radius * math.sin(2 * math.pi * k / segs), 0.0)
           for k in range(segs + 1)]
    m.extend(tube(rim, 0.08 * radius, 8, dark, caps=False))
    return m


def capsule(radius, length_, mat, segs=40, cap_rings=8):
    """Pressure-vessel capsule along +X, centred on the origin (cylinder with hemispherical ends)."""
    half = 0.5 * length_ - radius
    prof = []
    for k in range(cap_rings + 1):
        a = math.pi / 2 * k / cap_rings
        prof.append((radius * math.sin(a), -half - radius * math.cos(a)))
    for k in range(cap_rings + 1):
        a = math.pi / 2 * k / cap_rings
        prof.append((radius * math.cos(a), half + radius * math.sin(a)))
    m = _outward(lathe(prof, segs, mat, axis='Z').weld())
    return m.transformed(lambda p: (p[2], p[0], p[1]))       # axis Z → X


def dots(points, size, mat):
    """One small octahedron per point (renders as a soft dot with an emissive material)."""
    m = Mesh()
    for (x, y, z) in points:
        i = [m.add_vert(p) for p in ((x + size, y, z), (x - size, y, z), (x, y + size, z), (x, y - size, z),
                                      (x, y, z + size), (x, y, z - size))]
        for a, b, c in ((0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)):
            m.add_face((i[a], i[b], i[c]), mat)
    return m


def contact_panel(width, depth, thickness, mat='panel', edge='fx_cyan', edge_r=0.012):
    """Schematic contact surface: a slab whose TOP face is at z = 0, centred on the origin, outlined in light."""
    m = box((0.0, 0.0, -thickness / 2), (width, depth, thickness), mat)
    w, d = width / 2, depth / 2
    corners = [(-w, -d, 0.002), (w, -d, 0.002), (w, d, 0.002), (-w, d, 0.002), (-w, -d, 0.002)]
    m.extend(tube(corners, edge_r, 8, edge, caps=False))
    return m


def slab(size, mat):
    """Box centred on the origin (used for the translucent low-pressure zone)."""
    return box((0.0, 0.0, 0.0), size, mat)
