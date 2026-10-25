"""build_scene.py: Blender 5.2 entrypoint for the source-matched model / staging / pose proof.

Builds the inferred white coupe (roadster.py), the source night lot (staging.py) and the wide-shot flight
(motion.py) with standard bpy only, then renders every requested view in ONE Blender process.

    blender --background --factory-startup --python-exit-code 1 --python blender/build_scene.py -- \
        --device METAL --out-dir /tmp/roadster-proof-01 \
        --times 6.25,7.75,8.75,10.25 --views beauty_front --width 960 --height 540 --samples 24

--times     source-clip seconds rendered from the reconstructed wide camera (source shots A/D)
--views     model-review views: beauty_front, beauty_rear, plan_top, plan_under (or 'none')
--device    METAL or CPU, required. METAL enables only Metal GPU devices for this process and fails instead of
            falling back to CPU. User preferences are never saved.
Outputs in --out-dir: wide_tXX.XX.png, <view>.png, compare_tXX.XX.png (source frame above, render below, source
anchor box in cyan; needs --reference-dir or the default relative .omx cache), manifest.json.

The car's geometry is inferred from the source video frames; it is not an official Tesla drawing. Positions are
screen-space reconstructions, not measured trajectory or performance.
"""
import argparse
import json
import math
import os
import sys
import time
import traceback

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import geom  # noqa: E402
import motion  # noqa: E402
import roadster  # noqa: E402
import staging  # noqa: E402

WARNINGS = []

# ----------------------------------------------------------------------------------------------- look (tunable)
CAR_MATERIALS = {
    'paint': dict(base=(0.80, 0.81, 0.83), metallic=0.18, rough=0.30, coat=1.0, coat_rough=0.035, rough_var=0.06),
    'glass': dict(base=(0.004, 0.0045, 0.005), rough=0.035, spec=0.6),
    'satin_black': dict(base=(0.018, 0.018, 0.020), rough=0.42),
    'underbody': dict(base=(0.040, 0.041, 0.044), rough=0.62),
    'under_frame': dict(base=(0.10, 0.10, 0.105), metallic=0.6, rough=0.42),
    'panel_gap': dict(base=(0.004, 0.004, 0.004), rough=0.85),
    'lamp_white': dict(base=(0.9, 0.9, 0.9), rough=0.2, emission=(0.92, 0.96, 1.0), emission_strength=30.0),
    'lamp_red': dict(base=(0.5, 0.0, 0.0), rough=0.2, emission=(1.0, 0.02, 0.035), emission_strength=22.0),
    'lamp_amber': dict(base=(0.6, 0.25, 0.0), rough=0.2, emission=(1.0, 0.42, 0.02), emission_strength=12.0),
    'liner': dict(base=(0.010, 0.010, 0.011), rough=0.9),
    'tyre': dict(base=(0.020, 0.020, 0.022), rough=0.78),
    'rim': dict(base=(0.045, 0.047, 0.050), metallic=0.85, rough=0.30),
    'rim_dark': dict(base=(0.010, 0.010, 0.011), rough=0.6),
    'brake': dict(base=(0.30, 0.30, 0.31), metallic=1.0, rough=0.40),
    'caliper': dict(base=(0.05, 0.05, 0.055), metallic=0.3, rough=0.40),
    'nozzle': dict(base=(0.22, 0.22, 0.23), metallic=1.0, rough=0.30),
}
SET_MATERIALS = {
    'lineup_white': dict(base=(0.74, 0.75, 0.76), metallic=0.1, rough=0.30, coat=1.0, coat_rough=0.05),
    'lineup_red': dict(base=(0.32, 0.012, 0.016), metallic=0.3, rough=0.30, coat=1.0, coat_rough=0.04),
    'truck_white': dict(base=(0.78, 0.79, 0.80), rough=0.35, coat=0.6, coat_rough=0.1),
    'steel': dict(base=(0.40, 0.41, 0.42), metallic=1.0, rough=0.38),
    'bronze': dict(base=(0.55, 0.40, 0.20), metallic=1.0, rough=0.28),
    'lineup_glass': dict(base=(0.005, 0.005, 0.006), rough=0.05),
    'lineup_under': dict(base=(0.02, 0.02, 0.02), rough=0.8),
    'lineup_rim': dict(base=(0.25, 0.25, 0.26), metallic=0.9, rough=0.3),
    'trim_dark': dict(base=(0.02, 0.02, 0.022), rough=0.6),
    'lamp_white_dim': dict(base=(0.8, 0.8, 0.8), emission=(1.0, 1.0, 1.0), emission_strength=5.0),
    'zinc': dict(base=(0.30, 0.30, 0.31), metallic=1.0, rough=0.45),
    'jack_steel': dict(base=(0.025, 0.026, 0.028), metallic=0.5, rough=0.50),
    'wood_pole': dict(base=(0.09, 0.07, 0.05), rough=0.85),
    'cable': dict(base=(0.01, 0.01, 0.01), rough=0.5),
    'pale_structure': dict(base=(0.55, 0.56, 0.57), rough=0.55),
    'tent_grey': dict(base=(0.22, 0.22, 0.23), rough=0.8),
    'equipment_orange': dict(base=(0.60, 0.18, 0.02), rough=0.5),
}
# cold-gas plume volume: nominal radius r0 → r1 over `length`; hull is `hull` × nominal so density fades to zero
# inside it. density is the peak extinction (1/m); glow a faint self-emission so thin plumes stay readable.
PLUME = {'length': 3.0, 'r0': 0.05, 'r1': 0.45, 'hull': 1.3, 'color': (0.80, 0.88, 1.0), 'density': 9.0,
         'glow': 0.10, 'glow_color': (0.72, 0.84, 1.0), 'anisotropy': 0.25}
CLOUD = {'color': (0.86, 0.87, 0.89), 'density': 1.0, 'anisotropy': 0.30}
WORLD_COLOR = (0.0006, 0.0007, 0.0010)
LOOK_CANDIDATES = ('AgX - Medium High Contrast', 'Medium High Contrast')


# ----------------------------------------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser(prog='build_scene.py', description=__doc__.split('\n')[0])
    p.add_argument('--out-dir', required=True)
    p.add_argument('--device', required=True, choices=('METAL', 'CPU'),
                   help='explicit Cycles device; METAL never falls back to CPU')
    p.add_argument('--times', default='6.25,7.75,8.75,10.25', help="source seconds for the wide camera, or 'none'")
    p.add_argument('--views', default='beauty_front', help="comma list of %s, or 'none'" % ','.join(motion.STUDIO_VIEWS))
    p.add_argument('--width', type=int, default=960)
    p.add_argument('--height', type=int, default=540)
    p.add_argument('--samples', type=int, default=24)
    p.add_argument('--no-denoise', action='store_true')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--cloud', choices=('on', 'off'), default='on')
    p.add_argument('--plumes', choices=('on', 'off'), default='on')
    p.add_argument('--reference-dir', default=None,
                   help='motion-match directory holding the source keyframe JPGs (default: relative .omx cache)')
    p.add_argument('--save-blend', default=None, help='optional .blend path to save after the last render')
    p.add_argument('--dry-run', action='store_true', help='build the scene and manifest without rendering')
    a = p.parse_args(argv)
    a.time_list = [] if a.times.strip().lower() == 'none' else [float(t) for t in a.times.split(',') if t.strip()]
    a.view_list = [] if a.views.strip().lower() == 'none' else [v.strip() for v in a.views.split(',') if v.strip()]
    for v in a.view_list:
        if v not in motion.STUDIO_VIEWS:
            p.error('unknown view %r (choose from %s)' % (v, ', '.join(motion.STUDIO_VIEWS)))
    return a


# ----------------------------------------------------------------------------------------------- device / render
def setup_device(scene, device):
    prefs = bpy.context.preferences
    if hasattr(prefs, 'use_preferences_save'):
        prefs.use_preferences_save = False          # never write the user's preferences
    info = {'requested': device}
    if device == 'CPU':
        scene.cycles.device = 'CPU'
        info.update(cycles_device='CPU', devices_enabled=['CPU'])
        return info
    if 'cycles' not in prefs.addons:
        raise RuntimeError('Cycles add-on not available; cannot select Metal')
    cprefs = prefs.addons['cycles'].preferences
    cprefs.compute_device_type = 'METAL'
    cprefs.get_devices()
    metal = [d for d in cprefs.devices if d.type == 'METAL']
    if not metal:
        raise RuntimeError('--device METAL requested but Cycles reports no Metal device; refusing to fall back to CPU')
    for d in cprefs.devices:
        d.use = d.type == 'METAL'
    scene.cycles.device = 'GPU'
    enabled = [(d.name, d.type) for d in cprefs.devices if d.use]
    if any(t != 'METAL' for _, t in enabled):
        raise RuntimeError('non-Metal device still enabled: %r' % enabled)
    info.update(cycles_device='GPU', compute_device_type=cprefs.compute_device_type,
                devices_enabled=['%s (%s)' % e for e in enabled],
                metalrt=getattr(cprefs, 'metalrt', None))
    return info


def cy(scene, name, value):
    if not hasattr(scene.cycles, name):
        WARNINGS.append('cycles.%s not present in this Blender' % name)
        return
    try:
        setattr(scene.cycles, name, value)
    except Exception as e:      # noqa: BLE001 - recorded, render continues with the default
        WARNINGS.append('cycles.%s = %r failed: %s' % (name, value, e))


def setup_render(scene, args, device_info):
    scene.render.engine = 'CYCLES'
    cy(scene, 'samples', args.samples)
    cy(scene, 'use_adaptive_sampling', True)
    cy(scene, 'adaptive_threshold', 0.015)
    cy(scene, 'use_denoising', not args.no_denoise)
    if not args.no_denoise:
        cy(scene, 'denoiser', 'OPENIMAGEDENOISE')
        cy(scene, 'denoising_input_passes', 'RGB_ALBEDO_NORMAL')
        cy(scene, 'denoising_prefilter', 'ACCURATE')
        if device_info['requested'] == 'METAL':
            cy(scene, 'denoising_use_gpu', True)
    for name, value in (('max_bounces', 8), ('diffuse_bounces', 3), ('glossy_bounces', 4),
                        ('transmission_bounces', 4), ('volume_bounces', 0), ('transparent_max_bounces', 16),
                        ('sample_clamp_indirect', 8.0), ('blur_glossy', 0.5), ('caustics_reflective', False),
                        ('caustics_refractive', False), ('seed', 0), ('use_light_tree', True)):
        cy(scene, name, value)
    for name, value in (('volume_step_rate', 1.0), ('volume_max_steps', 1024)):
        if hasattr(scene.cycles, name):
            cy(scene, name, value)
    scene.render.resolution_x, scene.render.resolution_y = args.width, args.height
    scene.render.resolution_percentage = 100
    scene.render.use_persistent_data = True
    scene.render.use_motion_blur = False
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    vs = scene.view_settings
    vs.view_transform = 'AgX'
    for look in LOOK_CANDIDATES:
        try:
            vs.look = look
            break
        except TypeError:
            continue
    else:
        WARNINGS.append('no AgX contrast look found; using None')
    vs.exposure = args.exposure
    vs.gamma = 1.0


# ----------------------------------------------------------------------------------------------- materials
def new_material(name):
    mat = bpy.data.materials.new(name)
    if hasattr(mat, 'use_nodes') and not mat.use_nodes:
        mat.use_nodes = True                         # deprecated in 5.x where trees are always used
    nt = mat.node_tree
    if nt is None:
        raise RuntimeError('material %s has no node tree' % name)
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    return mat, nt, out


def set_in(node, name, value):
    sock = node.inputs.get(name)
    if sock is None:
        WARNINGS.append('missing socket %s.%s' % (node.bl_idname, name))
        return None
    sock.default_value = value
    return sock


def rgba(c):
    return (c[0], c[1], c[2], 1.0)


def principled(name, base, metallic=0.0, rough=0.5, coat=0.0, coat_rough=0.03, spec=0.5, emission=None,
               emission_strength=0.0, rough_var=0.0):
    mat, nt, out = new_material(name)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    set_in(b, 'Base Color', rgba(base))
    set_in(b, 'Metallic', metallic)
    set_in(b, 'Roughness', rough)
    if rough_var:      # gentle large-scale roughness drift so highlights are not perfectly synthetic
        co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
        lo, hi = rough - rough_var, rough + rough_var
        nt.links.new(ramp(nt, noise(nt, co, 3.5, 3.0, 0.5), [(0.3, (lo, lo, lo)), (0.7, (hi, hi, hi))]), b.inputs['Roughness'])
    set_in(b, 'Specular IOR Level', spec)
    if coat:
        set_in(b, 'Coat Weight', coat)
        set_in(b, 'Coat Roughness', coat_rough)
    if emission:
        set_in(b, 'Emission Color', rgba(emission))
        set_in(b, 'Emission Strength', emission_strength)
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def math_node(nt, op, a=None, b=None):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def ramp(nt, src, stops):
    n = nt.nodes.new('ShaderNodeValToRGB')
    els = n.color_ramp.elements
    while len(els) < len(stops):
        els.new(0.5)
    for el, (pos, col) in zip(els, stops):
        el.position = pos
        el.color = rgba(col) if len(col) == 3 else col
    nt.links.new(src, n.inputs['Fac'])
    return n.outputs['Color']


def noise(nt, vec, scale, detail=4.0, rough=0.5):
    n = nt.nodes.new('ShaderNodeTexNoise')
    set_in(n, 'Scale', scale)
    set_in(n, 'Detail', detail)
    set_in(n, 'Roughness', rough)
    nt.links.new(vec, n.inputs['Vector'])
    return n.outputs['Fac']


def ground_material():
    """Rough night lot: darker gravel with large dusty patches and fine grain, fine bump."""
    mat, nt, out = new_material('ground')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    big = noise(nt, co, 0.06, 2.0, 0.5)
    mid = noise(nt, co, 0.35, 4.0, 0.55)
    fine = noise(nt, co, 9.0, 6.0, 0.6)
    mix = math_node(nt, 'ADD', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', big, 0.35), math_node(nt, 'MULTIPLY', mid, 0.35)),
                    math_node(nt, 'MULTIPLY', fine, 0.30))
    nt.links.new(ramp(nt, mix, [(0.32, (0.065, 0.068, 0.062)), (0.70, (0.30, 0.31, 0.29))]), b.inputs['Base Color'])
    set_in(b, 'Roughness', 0.95)
    set_in(b, 'Specular IOR Level', 0.3)
    bump = nt.nodes.new('ShaderNodeBump')
    set_in(bump, 'Strength', 0.35)
    set_in(bump, 'Distance', 0.02)
    nt.links.new(noise(nt, co, 55.0, 2.0, 0.5), bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def volume_step(mat, rate):
    if hasattr(mat, 'cycles') and hasattr(mat.cycles, 'volume_step_rate'):
        mat.cycles.volume_step_rate = rate


def plume_material():
    """Cold-gas plume, not a flame: a soft, turbulent, translucent blue-white VOLUME, densest just past the nozzle,
    widening and thinning downstream with an irregular edge. Mesh space: axis from z = 0 to z = -length; the hull is
    PLUME['hull'] × the nominal radius so density reaches zero inside it (no visible surface or facets).
    Object colour R = firing level 0..1."""
    mat, nt, out = new_material('plume')
    L, r0, r1 = PLUME['length'], PLUME['r0'], PLUME['r1']
    tc = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc, sep.inputs['Vector'])
    v = math_node(nt, 'MULTIPLY', sep.outputs['Z'], -1.0 / L)
    v = math_node(nt, 'MAXIMUM', math_node(nt, 'MINIMUM', v, 1.0), 0.0)
    rv = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', math_node(nt, 'POWER', v, 0.8), r1 - r0), r0)
    flat = nt.nodes.new('ShaderNodeVectorMath')
    flat.operation = 'MULTIPLY'
    nt.links.new(tc, flat.inputs[0])
    flat.inputs[1].default_value = (1.0, 1.0, 0.0)
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(flat.outputs['Vector'], ln.inputs[0])
    rho = math_node(nt, 'DIVIDE', ln.outputs['Value'], rv)
    mp = nt.nodes.new('ShaderNodeMapping')
    set_in(mp, 'Scale', (3.5, 3.5, 1.1))
    nt.links.new(tc, mp.inputs['Vector'])
    turb = noise(nt, mp.outputs['Vector'], 2.2, 6.0, 0.62)
    rho = math_node(nt, 'ADD', rho, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', turb, 0.5), 0.7))
    radial = ramp(nt, rho, [(0.0, (1.0, 1.0, 1.0)), (0.45, (0.55, 0.55, 0.55)), (1.0, (0.0, 0.0, 0.0))])
    along = ramp(nt, v, [(0.0, (0.0, 0.0, 0.0)), (0.015, (1.0, 1.0, 1.0)), (0.25, (0.6, 0.6, 0.6)),
                         (0.70, (0.16, 0.16, 0.16)), (1.0, (0.0, 0.0, 0.0))])
    puff = ramp(nt, noise(nt, tc, 7.0, 4.0, 0.55), [(0.30, (0.35, 0.35, 0.35)), (0.75, (1.0, 1.0, 1.0))])
    level = nt.nodes.new('ShaderNodeObjectInfo').outputs['Color']
    dens = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', radial, along),
                     math_node(nt, 'MULTIPLY', puff, math_node(nt, 'MULTIPLY', level, PLUME['density'])))
    vol = nt.nodes.new('ShaderNodeVolumePrincipled')
    set_in(vol, 'Color', rgba(PLUME['color']))
    set_in(vol, 'Anisotropy', PLUME['anisotropy'])
    set_in(vol, 'Emission Color', rgba(PLUME['glow_color']))
    nt.links.new(dens, vol.inputs['Density'])
    nt.links.new(math_node(nt, 'MULTIPLY', dens, PLUME['glow']), vol.inputs['Emission Strength'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    volume_step(mat, 0.25)
    return mat


def cloud_material():
    """Diffuse gas/dust puff in a unit sphere: noise-perturbed boundary and wispy density so it reads as backlit
    gas, not a solid. Object colour R = density level."""
    mat, nt, out = new_material('cloud')
    tc = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    ln = nt.nodes.new('ShaderNodeVectorMath')
    ln.operation = 'LENGTH'
    nt.links.new(tc, ln.inputs[0])
    rr = math_node(nt, 'ADD', ln.outputs['Value'],
                   math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', noise(nt, tc, 1.2, 3.0, 0.5), 0.5), 0.7))
    fall = ramp(nt, rr, [(0.0, (1.0, 1.0, 1.0)), (0.5, (0.6, 0.6, 0.6)), (1.0, (0.0, 0.0, 0.0))])
    wisp = ramp(nt, noise(nt, tc, 2.6, 8.0, 0.6), [(0.40, (0.0, 0.0, 0.0)), (0.80, (1.0, 1.0, 1.0))])
    level = nt.nodes.new('ShaderNodeObjectInfo').outputs['Color']
    dens = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', fall, wisp), math_node(nt, 'MULTIPLY', level, CLOUD['density']))
    vol = nt.nodes.new('ShaderNodeVolumePrincipled')
    set_in(vol, 'Color', rgba(CLOUD['color']))
    set_in(vol, 'Anisotropy', CLOUD['anisotropy'])
    nt.links.new(dens, vol.inputs['Density'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    volume_step(mat, 1.0)
    return mat


def build_materials():
    mats = {}
    for table in (CAR_MATERIALS, SET_MATERIALS):
        for name, kw in table.items():
            mats[name] = principled(name, **kw)
    mats['ground'] = ground_material()
    mats['plume'] = plume_material()
    mats['cloud'] = cloud_material()
    return mats


# ----------------------------------------------------------------------------------------------- objects
def mesh_object(name, mesh, mats, col, smooth=True, sharp_deg=35.0, parent=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(mesh.verts, [], mesh.faces)
    names = mesh.material_names()
    for n in names:
        if n not in mats:
            raise KeyError('mesh %s uses undefined material %s' % (name, n))
        me.materials.append(mats[n])
    idx = {n: i for i, n in enumerate(names)}
    if len(me.polygons) != len(mesh.faces):
        raise RuntimeError('%s: polygon count changed on import (%d → %d)' % (name, len(mesh.faces), len(me.polygons)))
    me.polygons.foreach_set('material_index', [idx[m] for m in mesh.mats])
    if any(uv is not None for uv in mesh.uvs):
        layer = me.uv_layers.new(name='UVMap')
        flat = []
        for f, uv in zip(mesh.faces, mesh.uvs):
            for c in (uv if uv else ((0.0, 0.0),) * len(f)):
                flat.extend((c[0], c[1]))
        layer.data.foreach_set('uv', flat)
    me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
    if smooth and sharp_deg is not None:
        if hasattr(me, 'set_sharp_from_angle'):
            me.set_sharp_from_angle(angle=math.radians(sharp_deg))
        else:
            WARNINGS.append('Mesh.set_sharp_from_angle unavailable; %s fully smooth' % name)
    me.update()
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    return obj


def fixed_winding(mesh):
    return mesh if geom.signed_volume(mesh) >= 0 else Mesh_flip(mesh)


def Mesh_flip(mesh):
    out = geom.Mesh()
    out.verts = list(mesh.verts)
    out.faces = [tuple(reversed(f)) for f in mesh.faces]
    out.mats = list(mesh.mats)
    out.uvs = [tuple(reversed(uv)) if uv else None for uv in mesh.uvs]
    return out


def plume_mesh():
    """Closed hull for the plume volume, PLUME['hull'] × the nominal radius (the shader fades density inside it)."""
    L, r0, r1, k = PLUME['length'], PLUME['r0'], PLUME['r1'], PLUME['hull']
    prof = [(0.0, 0.01), (k * r0, 0.0)]
    for i in range(1, 13):
        t = i / 12
        prof.append((k * (r0 + (r1 - r0) * t ** 0.8), -L * t))
    prof.append((0.0, -L - 0.02))
    return fixed_winding(geom.lathe(prof, 24, 'plume', axis='Z').weld())


def sphere_mesh(mat, rings=14, segs=24):
    prof = [(math.sin(math.pi * k / rings), -math.cos(math.pi * k / rings)) for k in range(rings + 1)]
    return fixed_winding(geom.lathe(prof, segs, mat, axis='Z').weld())


def build_car(col, mats):
    rig = bpy.data.objects.new('CarRig', None)
    col.objects.link(rig)
    parts = roadster.build()
    mesh_object('car_body', parts['body'], mats, col, sharp_deg=40.0, parent=rig)
    mesh_object('car_arch_liners', parts['arch_liners'], mats, col, parent=rig)
    mesh_object('car_lights', parts['lights'], mats, col, parent=rig)
    mesh_object('car_underbody', parts['underbody'], mats, col, smooth=False, parent=rig)
    for name, centre, side in roadster.wheel_placements():
        rot, st = roadster.wheel(rear=name.startswith('R'))
        for kind, m in (('rot', rot), ('static', st)):
            m = m if side > 0 else m.mirrored_y()
            m = m.transformed(lambda v, c=centre: (v[0] + c[0], v[1] + c[1], v[2] + c[2]))
            mesh_object('car_wheel_%s_%s' % (name, kind), m, mats, col, sharp_deg=35.0, parent=rig)
    plumes = {}
    pm = plume_mesh()
    for name, (pos, d) in roadster.NOZZLES.items():
        o = mesh_object('plume_' + name, pm, mats, col, sharp_deg=None, parent=rig)
        q = (-Vector(d).normalized()).to_track_quat('Z', 'Y')      # local -Z along the exhaust direction
        o.matrix_basis = Matrix.Translation(Vector(pos)) @ q.to_matrix().to_4x4()
        o.visible_shadow = False
        o.visible_diffuse = False
        plumes[name] = o
    return rig, plumes


def build_set(col, mats):
    for name, mesh in staging.build_props().items():
        faceted = name in ('lineup_angular_pickup', 'lineup_cab_truck', 'background')
        mesh_object(name, mesh, mats, col, smooth=not faceted, sharp_deg=35.0)
    clouds = []
    sm = sphere_mesh('cloud')
    for k in range(len(motion.CLOUD_PUFFS)):
        o = mesh_object('cloud_%d' % k, sm, mats, col, smooth=True, sharp_deg=None)
        o.hide_render = True
        o.visible_shadow = True
        clouds.append(o)
    return clouds


def point_matrix(eye, target, up=(0.0, 0.0, 1.0)):
    f = (Vector(target) - Vector(eye)).normalized()
    r = f.cross(Vector(up))
    if r.length < 1e-6:
        r = f.cross(Vector((0.0, 1.0, 0.0)))
    r.normalize()
    u = r.cross(f)
    return Matrix(((r.x, u.x, -f.x, eye[0]), (r.y, u.y, -f.y, eye[1]), (r.z, u.z, -f.z, eye[2]), (0, 0, 0, 1)))


def build_lights(col):
    """Returns (scene lights, studio-only reflection cards). No light is visible to the camera."""
    lights, studio = [], []
    for spec in staging.LIGHTS:
        ld = bpy.data.lights.new(spec['name'], type=spec['type'])
        ld.energy = spec['energy']
        ld.color = spec['color']
        if spec['type'] == 'AREA':
            ld.shape = 'RECTANGLE'
            ld.size, ld.size_y = spec['size']
        else:
            ld.shadow_soft_size = spec['radius']
        if spec['type'] == 'SPOT':
            ld.spot_size = math.radians(spec['spot_deg'])
            ld.spot_blend = spec['blend']
        o = bpy.data.objects.new(spec['name'], ld)
        col.objects.link(o)
        o.matrix_world = point_matrix(spec['location'], spec['target'])
        o.visible_camera = False
        if spec.get('glossy_only'):
            o.visible_diffuse = False
            o.visible_transmission = False
            o.visible_volume_scatter = False
        (studio if spec.get('studio') else lights).append(o)
    return lights, studio


def build_world(scene):
    w = scene.world or bpy.data.worlds.new('night')
    scene.world = w
    if hasattr(w, 'use_nodes') and not w.use_nodes:
        w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new('ShaderNodeBackground')
    set_in(bg, 'Color', rgba(WORLD_COLOR))
    set_in(bg, 'Strength', 1.0)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])


def build_cameras(col):
    spec = staging.WIDE_CAMERA
    cd = bpy.data.cameras.new(spec['name'])
    cd.lens, cd.sensor_width, cd.sensor_fit = spec['lens_mm'], spec['sensor_width_mm'], 'HORIZONTAL'
    cd.clip_start, cd.clip_end = 0.1, 1500.0
    wide = bpy.data.objects.new(spec['name'], cd)
    col.objects.link(wide)
    wide.location = spec['location']
    wide.rotation_euler = (math.radians(90.0 + spec['pitch_deg']), 0.0, math.radians(spec['yaw_deg']))
    sd = bpy.data.cameras.new('CAM_studio')
    sd.sensor_width, sd.sensor_fit = 36.0, 'HORIZONTAL'
    sd.clip_start, sd.clip_end = 0.05, 1500.0
    studio = bpy.data.objects.new('CAM_studio', sd)
    col.objects.link(studio)
    return wide, studio


# ----------------------------------------------------------------------------------------------- per-view state
def set_plumes(plumes, levels, enabled):
    for name, o in plumes.items():
        lv = levels.get(name, 0.0) if enabled else 0.0
        o.hide_render = lv <= 0.001
        o.color = (lv, lv, lv, 1.0)


def set_clouds(clouds, states):
    for o in clouds:
        o.hide_render = True
    for o, st in zip(clouds, states):
        o.location = st['centre']
        o.scale = (st['radius'], st['radius'], st['radius'] * st.get('flatten', 1.0))
        o.color = (st['density'],) * 3 + (1.0,)
        o.hide_render = False


# ----------------------------------------------------------------------------------------------- comparison sheet
def find_reference_dir(arg):
    if arg:
        return os.path.abspath(arg) if os.path.isdir(arg) else None
    rel = os.path.join('.omx', 'artifacts', 'roadster-source-review', 'motion-match')
    for up in (os.path.join(HERE, '..'), os.path.join(HERE, '..', '..', '..')):
        c = os.path.join(up, rel)
        if os.path.isdir(c):
            return os.path.abspath(c)
    return None


def _load_rgb(path):
    import numpy as np
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    ch = img.channels
    a = np.empty(w * h * ch, dtype=np.float32)
    img.pixels.foreach_get(a)
    bpy.data.images.remove(img)
    a = a.reshape(h, w, ch)[::-1]
    return (a[:, :, :3] if ch >= 3 else np.repeat(a[:, :, :1], 3, axis=2)).copy()


def _save_png(arr, path):
    import numpy as np
    h, w = arr.shape[:2]
    out = bpy.data.images.new('proof_sheet', width=w, height=h, alpha=False)
    px = np.ones((h, w, 4), dtype=np.float32)
    px[..., :3] = arr[::-1]
    out.pixels.foreach_set(px.ravel())
    out.filepath_raw = path
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)


def _crop(img, x0, y0, x1, y1, ow, oh):
    import numpy as np
    H, W = img.shape[:2]
    xs = np.clip((x0 + (np.arange(ow) + 0.5) * (x1 - x0) / ow).astype(int), 0, W - 1)
    ys = np.clip((y0 + (np.arange(oh) + 0.5) * (y1 - y0) / oh).astype(int), 0, H - 1)
    return img[ys][:, xs]


def make_pose_crop(render_path, source_path, bbox_px, out_path, ow=640, oh=360):
    """Zoomed source crop (left) beside the same window of the render (right), centred on the source anchor box,
    for judging roll/pose at the car's scale."""
    import numpy as np
    r = _load_rgb(render_path)
    s = _load_rgb(source_path)
    cx, cy = 0.5 * (bbox_px[0] + bbox_px[2]), 0.5 * (bbox_px[1] + bbox_px[3])
    half_w = max(1.25 * (bbox_px[2] - bbox_px[0]), 170.0)
    half_h = half_w * oh / ow
    win = (cx - half_w, cy - half_h, cx + half_w, cy + half_h)
    sc = r.shape[1] / staging.SOURCE_W
    a = _crop(s, *(v * s.shape[1] / staging.SOURCE_W for v in win), ow, oh)
    b = _crop(r, *(v * sc for v in win), ow, oh)
    sep = np.full((oh, 4, 3), 0.5, dtype=np.float32)
    _save_png(np.concatenate([a, sep, b], axis=1), out_path)


def make_comparison(render_path, source_path, bbox_px, out_path):
    """Source frame (resized) above the render, source anchor box drawn in cyan on both."""
    import numpy as np
    r = _load_rgb(render_path)
    s = _load_rgb(source_path)
    H, W = r.shape[:2]
    sh, sw = s.shape[:2]
    if sh % H == 0 and sw % W == 0 and sh // H == sw // W:
        k = sh // H
        s = s.reshape(H, k, W, k, 3).mean(axis=(1, 3))
    else:
        s = s[(np.arange(H) * sh // H)][:, (np.arange(W) * sw // W)]
    if bbox_px:
        sx, sy = W / staging.SOURCE_W, H / staging.SOURCE_H
        x0, y0, x1, y1 = (int(round(bbox_px[0] * sx)), int(round(bbox_px[1] * sy)),
                          int(round(bbox_px[2] * sx)), int(round(bbox_px[3] * sy)))
        x0, x1 = max(0, x0), min(W - 1, x1)
        y0, y1 = max(0, y0), min(H - 1, y1)
        for img in (s, r):
            img[y0, x0:x1 + 1] = img[y1, x0:x1 + 1] = (0.0, 0.9, 0.9)
            img[y0:y1 + 1, x0] = img[y0:y1 + 1, x1] = (0.0, 0.9, 0.9)
    _save_png(np.concatenate([s, r], axis=0), out_path)


# ----------------------------------------------------------------------------------------------- main
def main():
    t_start = time.perf_counter()
    args = parse_args()
    os.makedirs(args.out_dir, exist_ok=True)
    scene = bpy.context.scene
    for o in list(scene.objects):                  # factory cube, light and camera, including child collections
        bpy.data.objects.remove(o, do_unlink=True)
    device_info = setup_device(scene, args.device)
    setup_render(scene, args, device_info)
    col = bpy.data.collections.new('roadster_proof')
    scene.collection.children.link(col)
    mats = build_materials()
    rig, plumes = build_car(col, mats)
    clouds = build_set(col, mats)
    _, studio_lights = build_lights(col)
    build_world(scene)
    wide_cam, studio_cam = build_cameras(col)
    ref_dir = find_reference_dir(args.reference_dir)
    if ref_dir is None:
        WARNINGS.append('source reference directory not found; comparison sheets skipped')
    build_seconds = time.perf_counter() - t_start
    print('ROADSTER_PROOF build %.1fs, %d objects, device %s' % (build_seconds, len(col.objects), device_info), flush=True)

    jobs = []
    for t in args.time_list:
        pose = motion.wide_pose(t)
        jobs.append({'kind': 'wide', 'file': 'wide_t%05.2f.png' % t, 'source_time_s': t, 'pose': pose})
    for v in args.view_list:
        jobs.append({'kind': 'studio', 'file': '%s.png' % v, 'view': v, 'pose': motion.studio_pose(v)})

    frames = []
    for job in jobs:
        pose = job['pose']
        rig.matrix_world = Matrix(pose['matrix'])
        set_plumes(plumes, pose['plumes'], args.plumes == 'on' and job['kind'] == 'wide')
        for o in studio_lights:
            o.hide_render = job['kind'] != 'studio'
        if job['kind'] == 'wide':
            set_clouds(clouds, motion.cloud_state(job['source_time_s']) if args.cloud == 'on' else [])
            scene.camera = wide_cam
        else:
            set_clouds(clouds, [])
            studio_cam.data.lens = pose['lens_mm']
            studio_cam.matrix_world = point_matrix(pose['camera'], pose['target'], pose['up'])
            dof = studio_cam.data.dof
            dof.use_dof = bool(pose['fstop'])
            if pose['fstop']:
                dof.focus_distance = (Vector(pose['target']) - Vector(pose['camera'])).length
                dof.aperture_fstop = pose['fstop']
            scene.camera = studio_cam
        path = os.path.join(os.path.abspath(args.out_dir), job['file'])
        scene.render.filepath = path
        rec = {'file': job['file'], 'kind': job['kind'], 'camera': scene.camera.name,
               'roll_left_deg': round(pose['roll_left_deg'], 2), 'heading_deg': round(pose['heading_deg'], 2),
               'plumes': {k: round(v, 3) for k, v in pose['plumes'].items()}}
        if job['kind'] == 'wide':
            rec.update(source_time_s=job['source_time_s'], shot=pose['shot'],
                       pitch_down_deg=round(pose['pitch_down_deg'], 2),
                       body_centre_m=[round(c, 3) for c in pose['centre']],
                       projected_centre_source_px=[round(c, 1) for c in pose['projected_centre_px']])
        else:
            rec['view'] = job['view']
        if not args.dry_run:
            t0 = time.perf_counter()
            bpy.ops.render.render(write_still=True)
            rec['render_seconds'] = round(time.perf_counter() - t0, 2)
            print('ROADSTER_PROOF rendered %s in %.1fs' % (job['file'], rec['render_seconds']), flush=True)
            if job['kind'] == 'wide' and ref_dir:
                anchor = motion.source_anchor(job['source_time_s'])
                image = motion.source_keyframe_image(job['source_time_s'])
                src = os.path.join(ref_dir, image) if image else None
                if src and os.path.isfile(src):
                    cmp_name = 'compare_t%05.2f.png' % job['source_time_s']
                    crop_name = 'crop_t%05.2f.png' % job['source_time_s']
                    out_abs = os.path.abspath(args.out_dir)
                    try:
                        make_comparison(path, src, anchor['bbox_px'] if anchor else None, os.path.join(out_abs, cmp_name))
                        rec.update(comparison=cmp_name, source_frame=image)
                        if anchor:
                            make_pose_crop(path, src, anchor['bbox_px'], os.path.join(out_abs, crop_name))
                            rec['pose_crop'] = crop_name
                    except Exception as e:  # noqa: BLE001 - the render itself succeeded
                        WARNINGS.append('comparison for %s failed: %s' % (job['file'], e))
                else:
                    WARNINGS.append('no source keyframe within 0.13 s of %.2f s' % job['source_time_s'])
        frames.append(rec)

    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend), copy=True)

    manifest = {
        'tool': 'blender/build_scene.py',
        'blender_version': bpy.app.version_string,
        'build_hash': bpy.app.build_hash.decode() if isinstance(bpy.app.build_hash, bytes) else str(bpy.app.build_hash),
        'argv': sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [],
        'device': device_info,
        'render': {'engine': scene.render.engine, 'samples': args.samples, 'resolution': [args.width, args.height],
                   'denoise': not args.no_denoise, 'view_transform': scene.view_settings.view_transform,
                   'look': scene.view_settings.look, 'exposure': args.exposure, 'cloud': args.cloud,
                   'plumes': args.plumes},
        'scene_build_seconds': round(build_seconds, 2),
        'total_seconds': round(time.perf_counter() - t_start, 2),
        'wide_camera': staging.WIDE_CAMERA,
        'flight_fit': {'heading_deg': round(motion.HEADING_DEG, 2),
                       'depth_m_line': [round(motion.DEPTH_A, 3), round(motion.DEPTH_B, 4)],
                       'roll_keys': motion.ROLL_KEYS, 'pitch_keys': motion.PITCH_KEYS},
        'reference_dir_found': bool(ref_dir),
        'frames': frames,
        'status': ('Proof render. Car geometry inferred from the source video frames, not an official Tesla drawing; '
                   'nozzle layout schematic; flight positions are screen-space reconstructions of approximate source '
                   'anchors, not measured trajectory, height, speed or performance.'),
        'warnings': WARNINGS,
    }
    with open(os.path.join(args.out_dir, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=1, ensure_ascii=False)
    print('ROADSTER_PROOF done %.1fs, %d frames, %d warnings' % (manifest['total_seconds'], len(frames), len(WARNINGS)), flush=True)


if __name__ == '__main__':          # `blender --python build_scene.py` runs as __main__; render_film.py imports it
    try:
        main()
    except Exception:
        print('ROADSTER_PROOF_FAILED\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise
