"""geom.py: a small pure-Python mesh toolkit (no bpy), so the geometry can be generated and checked outside Blender.

A Mesh holds vertices, polygon faces (outward winding = counter-clockwise seen from outside), one material name
per face and optional per-corner UVs. build_scene.py turns Meshes into Blender objects; tools/preview.py rasterises
them for checks on a machine without Blender.
"""
import math


class Mesh:
    def __init__(self):
        self.verts = []   # [(x, y, z)]
        self.faces = []   # [(i, j, k[, l])]
        self.mats = []    # material name per face
        self.uvs = []     # per face: tuple of (u, v) per corner, or None

    def add_vert(self, p):
        self.verts.append((float(p[0]), float(p[1]), float(p[2])))
        return len(self.verts) - 1

    def add_face(self, idx, mat, uv=None):
        self.faces.append(tuple(idx))
        self.mats.append(mat)
        self.uvs.append(tuple(uv) if uv else None)

    def extend(self, other):
        base = len(self.verts)
        self.verts.extend(other.verts)
        for f, m, uv in zip(other.faces, other.mats, other.uvs):
            self.faces.append(tuple(i + base for i in f))
            self.mats.append(m)
            self.uvs.append(uv)
        return self

    def transformed(self, fn):
        out = Mesh()
        out.verts = [tuple(fn(v)) for v in self.verts]
        out.faces, out.mats, out.uvs = list(self.faces), list(self.mats), list(self.uvs)
        return out

    def mirrored_y(self):
        """Mirror across the car's centre plane (y → −y); winding is reversed so normals stay outward."""
        out = Mesh()
        out.verts = [(x, -y, z) for x, y, z in self.verts]
        out.faces = [tuple(reversed(f)) for f in self.faces]
        out.mats = list(self.mats)
        out.uvs = [tuple(reversed(uv)) if uv else None for uv in self.uvs]
        return out

    def remove_unused(self):
        used = sorted({i for f in self.faces for i in f})
        remap = {o: n for n, o in enumerate(used)}
        self.verts = [self.verts[o] for o in used]
        self.faces = [tuple(remap[i] for i in f) for f in self.faces]
        return self

    def weld(self, eps=1e-7, min_area=1e-12):
        """Merge coincident vertices, then drop faces left with < 3 distinct corners or ~zero area (collapsed
        section spans), so smooth normals never average in degenerate faces."""
        key_of = {}
        remap = []
        for p in self.verts:
            k = (round(p[0] / eps), round(p[1] / eps), round(p[2] / eps))
            if k not in key_of:
                key_of[k] = len(key_of)
            remap.append(key_of[k])
        verts = [None] * len(key_of)
        for i, p in enumerate(self.verts):
            verts[remap[i]] = p
        faces, mats, uvs = [], [], []
        for f, m, uv in zip(self.faces, self.mats, self.uvs):
            g, guv = [], []
            for c, i in enumerate(f):
                j = remap[i]
                if g and g[-1] == j:
                    continue
                g.append(j)
                guv.append(uv[c] if uv else None)
            if len(g) > 1 and g[0] == g[-1]:
                g.pop()
                guv.pop()
            if len(g) < 3 or len(set(g)) != len(g):
                continue
            if length(face_normal(verts, g)) < 2 * min_area:
                continue
            faces.append(tuple(g))
            mats.append(m)
            uvs.append(tuple(guv) if uv else None)
        self.verts, self.faces, self.mats, self.uvs = verts, faces, mats, uvs
        return self

    def bounds(self):
        xs, ys, zs = zip(*self.verts)
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

    def material_names(self):
        seen = []
        for m in self.mats:
            if m not in seen:
                seen.append(m)
        return seen


# ---------------------------------------------------------------------------------------------- vectors
def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def length(a): return math.sqrt(dot(a, a))


def norm(a):
    n = length(a)
    return (a[0] / n, a[1] / n, a[2] / n) if n > 1e-12 else (0.0, 0.0, 1.0)


def lerp(a, b, t): return a + (b - a) * t
def clamp(x, a=0.0, b=1.0): return a if x < a else b if x > b else x


def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a))
    return t * t * (3 - 2 * t)


def face_normal(verts, f):
    """Newell's method: robust for quads and degenerate corners."""
    nx = ny = nz = 0.0
    for i in range(len(f)):
        x0, y0, z0 = verts[f[i]]
        x1, y1, z1 = verts[f[(i + 1) % len(f)]]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    return (nx, ny, nz)


def signed_volume(mesh):
    """Positive when a closed mesh's faces wind outward."""
    v = 0.0
    for f in mesh.faces:
        p0 = mesh.verts[f[0]]
        for i in range(1, len(f) - 1):
            p1, p2 = mesh.verts[f[i]], mesh.verts[f[i + 1]]
            v += dot(p0, cross(p1, p2)) / 6.0
    return v


# ---------------------------------------------------------------------------------------------- curves
def catmull(points):
    """Catmull-Rom through (x, y) control points, clamped at the ends; tangents scaled to uneven spacing."""
    pts = sorted(points)

    def f(x):
        if x <= pts[0][0]:
            return pts[0][1]
        if x >= pts[-1][0]:
            return pts[-1][1]
        i = 0
        while x > pts[i + 1][0]:
            i += 1
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        h = p2[0] - p1[0]
        t = (x - p1[0]) / h
        m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h if p2[0] != p0[0] else 0.0
        m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h if p3[0] != p1[0] else 0.0
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2
    return f


def hermite2(p0, p1, m0, m1, t):
    t2, t3 = t * t, t * t * t
    h00, h10, h01, h11 = 2 * t3 - 3 * t2 + 1, t3 - 2 * t2 + t, -2 * t3 + 3 * t2, t3 - t2
    return (h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0], h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1])


def keyed_polyline(keys, counts, creases=()):
    """2D polyline through key points with smooth (Catmull-Rom) tangents, except at crease keys where each side
    uses its own chord direction. counts[i] = number of segments between key i and key i+1."""
    n = len(keys)
    tan_in, tan_out = [], []
    for i in range(n):
        a = keys[max(0, i - 1)]
        b = keys[min(n - 1, i + 1)]
        smooth_t = ((b[0] - a[0]) * 0.5, (b[1] - a[1]) * 0.5)
        if i in creases or i == 0 or i == n - 1:
            ti = (keys[i][0] - keys[max(0, i - 1)][0], keys[i][1] - keys[max(0, i - 1)][1])
            to = (keys[min(n - 1, i + 1)][0] - keys[i][0], keys[min(n - 1, i + 1)][1] - keys[i][1])
            tan_in.append(ti if i > 0 else to)
            tan_out.append(to if i < n - 1 else ti)
        else:
            tan_in.append(smooth_t)
            tan_out.append(smooth_t)
    out = [keys[0]]
    key_index = [0]
    for i in range(n - 1):
        c = counts[i]
        for s in range(1, c + 1):
            out.append(hermite2(keys[i], keys[i + 1], tan_out[i], tan_in[i + 1], s / c))
        key_index.append(len(out) - 1)
    return out, key_index


# ---------------------------------------------------------------------------------------------- builders
def grid_surface(rows, cols, point, mat, wrap_cols=False, uv=None, flip=False):
    """rows × cols grid of points point(i, j) → quads. mat(i, j) gives the material of quad (i, j)–(i+1, j+1).
    flip reverses winding (use it when the parametrisation runs the other way round)."""
    m = Mesh()
    ncols = cols if wrap_cols else cols
    idx = [[m.add_vert(point(i, j)) for j in range(cols)] for i in range(rows)]
    jmax = cols if wrap_cols else cols - 1
    for i in range(rows - 1):
        for j in range(jmax):
            j1 = (j + 1) % cols
            q = (idx[i][j], idx[i + 1][j], idx[i + 1][j1], idx[i][j1])
            corner_uv = None
            if uv:
                corner_uv = (uv(i, j), uv(i + 1, j), uv(i + 1, j + 1), uv(i, j + 1))
            if flip:
                q = tuple(reversed(q))
                corner_uv = tuple(reversed(corner_uv)) if corner_uv else None
            m.add_face(q, mat(i, j) if callable(mat) else mat, corner_uv)
    del ncols
    return m


def lathe(profile, segments, mat, axis='Y', uv_scale=1.0, closed_profile=False, flip=False):
    """Revolve a profile [(r, a)] (radius, position along axis) around `axis` through the origin.
    The profile runs so that its outward side is on the left when walking along it in (a, r) space."""
    m = Mesh()
    rings = []
    for (r, a) in profile:
        ring = []
        for s in range(segments):
            t = 2 * math.pi * s / segments
            c, sn = math.cos(t), math.sin(t)
            if axis == 'Y':
                p = (r * c, a, r * sn)
            elif axis == 'X':
                p = (a, r * c, r * sn)
            else:
                p = (r * c, r * sn, a)
            ring.append(m.add_vert(p))
        rings.append(ring)
    nprof = len(profile) if closed_profile else len(profile) - 1
    for i in range(nprof):
        i1 = (i + 1) % len(profile)
        for s in range(segments):
            s1 = (s + 1) % segments
            q = (rings[i][s], rings[i][s1], rings[i1][s1], rings[i1][s])
            uv = ((s / segments * uv_scale, i), ((s + 1) / segments * uv_scale, i), ((s + 1) / segments * uv_scale, i + 1), (s / segments * uv_scale, i + 1))
            if flip:
                q, uv = tuple(reversed(q)), tuple(reversed(uv))
            m.add_face(q, mat, uv)
    return m


def box(center, size, mat, rot_z=0.0):
    cx, cy, cz = center
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    c, s = math.cos(rot_z), math.sin(rot_z)
    m = Mesh()
    for dz in (-sz, sz):
        for dy in (-sy, sy):
            for dx in (-sx, sx):
                m.add_vert((cx + dx * c - dy * s, cy + dx * s + dy * c, cz + dz))
    # vertex index = ix + 2·iy + 4·iz
    for f in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
        m.add_face(f, mat)
    return m


def frames_along(points):
    """Parallel-transport frames (tangent, normal, binormal) along a polyline."""
    n = len(points)
    tangents = []
    for i in range(n):
        a, b = points[max(0, i - 1)], points[min(n - 1, i + 1)]
        tangents.append(norm(sub(b, a)))
    t0 = tangents[0]
    ref = (0.0, 0.0, 1.0) if abs(t0[2]) < 0.9 else (1.0, 0.0, 0.0)
    nrm = norm(cross(cross(t0, ref), t0))
    frames = []
    for i in range(n):
        t = tangents[i]
        nrm = norm(sub(nrm, mul(t, dot(nrm, t))))
        frames.append((t, nrm, cross(t, nrm)))
    return frames


def tube(points, radius, segments, mat, caps=True, radius_fn=None):
    """Sweep a circle along a polyline (wires, light strips, rails). radius_fn(i) overrides the radius per point."""
    m = Mesh()
    fr = frames_along(points)
    rings = []
    for i, (p, (t, nrm, bn)) in enumerate(zip(points, fr)):
        r = radius_fn(i) if radius_fn else radius
        ring = []
        for s in range(segments):
            a = 2 * math.pi * s / segments
            off = add(mul(nrm, math.cos(a) * r), mul(bn, math.sin(a) * r))
            ring.append(m.add_vert(add(p, off)))
        rings.append(ring)
    for i in range(len(points) - 1):
        for s in range(segments):
            s1 = (s + 1) % segments
            m.add_face((rings[i][s], rings[i + 1][s], rings[i + 1][s1], rings[i][s1]), mat)
    if caps:
        c0 = m.add_vert(points[0])
        c1 = m.add_vert(points[-1])
        for s in range(segments):
            s1 = (s + 1) % segments
            m.add_face((c0, rings[0][s1], rings[0][s]), mat)
            m.add_face((c1, rings[-1][s], rings[-1][s1]), mat)
    return m


def cylinder_between(p0, p1, radius, segments, mat, caps=True):
    return tube([p0, p1], radius, segments, mat, caps)


def fan_cap(mesh, ring_indices, center, mat, reverse=False):
    """Close a ring of existing vertices with a triangle fan around a new centre vertex."""
    c = mesh.add_vert(center)
    n = len(ring_indices)
    for k in range(n):
        a, b = ring_indices[k], ring_indices[(k + 1) % n]
        mesh.add_face((c, b, a) if reverse else (c, a, b), mat)
    return c


def extrude_profile(profile_xz, y0, y1, mat, side_mat=None):
    """Extrude a closed 2D polygon (x, z), counter-clockwise when viewed from +y looking toward −y… i.e. seen
    with x to the right and z up from the −y side, between y0 < y1. Used for faceted props."""
    m = Mesh()
    n = len(profile_xz)
    a = [m.add_vert((x, y0, z)) for x, z in profile_xz]
    b = [m.add_vert((x, y1, z)) for x, z in profile_xz]
    for k in range(n):
        k1 = (k + 1) % n
        m.add_face((a[k], a[k1], b[k1], b[k]), side_mat or mat)
    m.add_face(tuple(reversed(a)), mat)
    m.add_face(tuple(b), mat)
    return m
