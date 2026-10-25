"""render_film.py: Blender 5.2 entrypoint for the 75 s portrait film plates (1080 x 1920, 30 fps).

    # the eleven proof times, native portrait
    blender --background --factory-startup --python-exit-code 1 --python blender/render_film.py -- \
        --device METAL --engine EEVEE --samples 64 --out-dir <out>/film-proof-01 --proof-times

    # bulk, resumable; split the 2250 frames over several runs if wanted (e.g. 0-749, 750-1499, 1500-2249)
    blender --background --factory-startup --python-exit-code 1 --python blender/render_film.py -- \
        --device METAL --engine EEVEE --samples 64 --out-dir <out>/film-frames --frames 0-2249 --skip-existing

One Blender process builds the scene once (build_scene.py: inferred car, source lot, lights, materials, plume and
cloud volumes) plus the film-only parts (portrait camera, film key/rim lights, schematic contact panel, x-ray shell
shading, pressure vessels, shot-B foreground car, shot-C moon disc, bloom), then for every requested time applies
film.state(t): camera, car pose and visibility, plume levels and directions, cloud puffs, panel, x-ray, vessels,
diagram meshes and light levels. It writes one PNG per time (bloom included; NO text: Chinese labels and captions
are composited later, after bloom) and one JSON per time with the projected overlay anchors and notes.

--device METAL|CPU is required and never falls back silently. EEVEE runs on the GPU backend Blender started with;
with --device METAL the first render's backend must report METAL or the run stops. EEVEE has no CPU device: use
--engine CYCLES --device CPU for a CPU render. User preferences are never saved.

Outputs in --out-dir: frames/f00000.png (bulk) or frames/t021.000.png (--times / --proof-times), labels/<same>.json,
compare/<same>.png for source-shot proof times (source keyframe with the portrait window outlined, above the
render), manifest_<UTC time>.json.

Everything drawn after 14 s is a principle illustration on the same inferred exterior model: internal layout, nozzle
ports, vessels, force lengths and slow-motion factors are schematic, not Tesla data.
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

import build_scene as bs  # noqa: E402  (its proof main() only runs as a script)
import diagram  # noqa: E402
import film  # noqa: E402
import motion  # noqa: E402
import roadster  # noqa: E402
import shots  # noqa: E402

WARNINGS = bs.WARNINGS
PROOF_TIMES = (0.2, 1.5, 3.2, 6.25, 8.75, 10.25, 21.0, 34.0, 47.0, 58.0, 69.0)
FPS = film.FPS
N_FRAMES = int(round(film.DURATION * FPS))
LABEL_W, LABEL_H = film.W_PX, film.H_PX            # overlay coordinates are always 1080 x 1920

# ----------------------------------------------------------------------------------------------- film look (tunable)
# schematic overlay geometry: (emission colour, strength, opacity at level 1); fades use the object colour's alpha
FX = {
    'fx_white': ((0.92, 0.95, 1.00), 2.2, 1.0),
    'fx_cyan': ((0.10, 0.72, 1.00), 2.4, 0.95),
    'fx_cyan_strong': ((0.20, 0.85, 1.00), 4.0, 1.0),
    'fx_amber': ((1.00, 0.52, 0.10), 3.4, 1.0),
    'fx_air': ((0.70, 0.86, 1.00), 1.5, 0.85),
    'fx_low': ((0.05, 0.30, 0.65), 0.9, 0.32),
    'fx_gas': ((0.45, 0.85, 1.00), 3.2, 1.0),
    'fx_com_light': ((0.95, 0.95, 0.95), 1.6, 1.0),
    'fx_com_dark': ((0.0, 0.0, 0.0), 0.0, 1.0),
}
PANEL_LOOK = {'base': (0.022, 0.034, 0.048), 'rough': 0.28, 'opacity': 0.82}
VESSEL_LOOK = {'color': (0.025, 0.52, 1.00), 'glow': 1.4, 'edge_glow': 2.4, 'opacity': 0.30, 'edge_opacity': 0.65}
XRAY_LOOK = {'color': (0.08, 0.40, 1.00), 'glow': 1.2, 'floor': 0.015, 'edge': 0.30}
MOON_LOOK = {'color': (1.0, 0.97, 0.90), 'strength': 9.0}
BLOOM = {'threshold': 1.1, 'strength': 0.32, 'size': 0.5}
LIGHT_GROUPS = {'floods': ('flood_left', 'flood_right', 'tower_right'),
                'backs': ('back_left', 'back_centre', 'back_right')}


# ----------------------------------------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser(prog='render_film.py', description=__doc__.split('\n')[0])
    p.add_argument('--out-dir', required=True)
    p.add_argument('--device', required=True, choices=('METAL', 'CPU'))
    p.add_argument('--engine', choices=('EEVEE', 'CYCLES'), default='EEVEE')
    p.add_argument('--samples', type=int, default=64, help='EEVEE TAA render samples or Cycles max samples')
    p.add_argument('--proof-times', action='store_true', help='render %s' % ','.join('%g' % t for t in PROOF_TIMES))
    p.add_argument('--times', default=None, help='comma list of film seconds')
    p.add_argument('--frames', default=None, help="film frame range 'a-b' (inclusive, 30 fps), optional ':step'")
    p.add_argument('--skip-existing', action='store_true', help='skip times whose PNG and label JSON exist')
    p.add_argument('--width', type=int, default=1080)
    p.add_argument('--height', type=int, default=1920)
    p.add_argument('--format', choices=('PNG', 'JPEG'), default='PNG')
    p.add_argument('--volume-tile', choices=('1', '2', '4', '8', '16'), default='4', help='EEVEE volume tile size')
    p.add_argument('--volume-samples', type=int, default=96, help='EEVEE volume samples')
    p.add_argument('--raytrace', choices=('on', 'off'), default='on', help='EEVEE screen-space ray tracing')
    p.add_argument('--bloom', choices=('on', 'off'), default='on')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--no-denoise', action='store_true', help='Cycles only')
    p.add_argument('--compare', choices=('on', 'off'), default='on', help='source comparison sheets for t < 14 s')
    p.add_argument('--reference-dir', default=None, help='motion-match directory with the source keyframe JPGs')
    p.add_argument('--save-blend', default=None)
    p.add_argument('--dry-run', action='store_true', help='build, apply every state and write labels; no render')
    a = p.parse_args(argv)
    if a.engine == 'EEVEE' and a.device == 'CPU':
        p.error('EEVEE has no CPU device; use --engine CYCLES --device CPU for a CPU render')
    jobs = []
    if a.proof_times:
        jobs += [('t', t) for t in PROOF_TIMES]
    if a.times:
        jobs += [('t', float(t)) for t in a.times.split(',') if t.strip()]
    if a.frames:
        rng, _, step = a.frames.partition(':')
        lo, _, hi = rng.partition('-')
        lo, hi, step = int(lo), int(hi or lo), int(step or 1)
        if not (0 <= lo <= hi < N_FRAMES) or step < 1:
            p.error('--frames must lie in 0-%d' % (N_FRAMES - 1))
        jobs += [('f', k) for k in range(lo, hi + 1, step)]
    if not jobs:
        p.error('nothing to render: give --proof-times, --times or --frames')
    for kind, v in jobs:
        t = v / FPS if kind == 'f' else v
        if not 0.0 <= t < film.DURATION:
            p.error('time %.3f outside 0-%g s' % (t, film.DURATION))
    a.jobs = jobs
    return a


def job_time(kind, v):
    return v / FPS if kind == 'f' else v


def job_stem(kind, v):
    return 'f%05d' % v if kind == 'f' else 't%07.3f' % v


# ----------------------------------------------------------------------------------------------- engine / device
def setattr_checked(owner, label, name, value):
    if not hasattr(owner, name):
        WARNINGS.append('%s.%s not present in this Blender' % (label, name))
        return False
    try:
        setattr(owner, name, value)
        return True
    except Exception as e:  # noqa: BLE001 - recorded; the default stays
        WARNINGS.append('%s.%s = %r failed: %s' % (label, name, value, e))
        return False


def color_management(scene, exposure):
    vs = scene.view_settings
    vs.view_transform = 'AgX'
    for look in bs.LOOK_CANDIDATES:
        try:
            vs.look = look
            break
        except TypeError:
            continue
    else:
        WARNINGS.append('no AgX contrast look found; using None')
    vs.exposure = exposure
    vs.gamma = 1.0


def setup_engine(scene, args):
    prefs = bpy.context.preferences
    if hasattr(prefs, 'use_preferences_save'):
        prefs.use_preferences_save = False          # never write the user's preferences
    if args.engine == 'CYCLES':
        info = bs.setup_device(scene, args.device)
        ns = argparse.Namespace(samples=args.samples, no_denoise=args.no_denoise, width=args.width,
                                height=args.height, exposure=args.exposure)
        bs.setup_render(scene, ns, info)
        info['engine'] = 'CYCLES'
    else:
        for ident in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
            try:
                scene.render.engine = ident
                break
            except TypeError:
                continue
        else:
            raise RuntimeError('no EEVEE render engine identifier accepted')
        ee = scene.eevee
        for name, value in (('taa_render_samples', args.samples), ('use_raytracing', args.raytrace == 'on'),
                            ('ray_tracing_method', 'SCREEN'), ('volumetric_tile_size', args.volume_tile),
                            ('volumetric_samples', args.volume_samples), ('volumetric_end', 150.0),
                            ('use_shadows', True), ('shadow_ray_count', 2), ('shadow_step_count', 6),
                            ('clamp_surface_indirect', 10.0)):
            setattr_checked(ee, 'eevee', name, value)
        info = {'requested': args.device, 'engine': scene.render.engine,
                'note': 'EEVEE uses the GPU backend Blender started with; checked after the first render'}
        scene.render.resolution_x, scene.render.resolution_y = args.width, args.height
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = False
        scene.render.use_motion_blur = False
        color_management(scene, args.exposure)
    scene.render.resolution_x, scene.render.resolution_y = args.width, args.height
    scene.render.resolution_percentage = 100
    scene.render.use_persistent_data = True
    scene.render.use_motion_blur = False
    settings = scene.render.image_settings
    settings.file_format = args.format
    settings.color_mode = 'RGB'
    if args.format == 'PNG':
        settings.color_depth = '8'
        settings.compression = 15
    else:
        settings.quality = 95
    return info


def gpu_backend():
    try:
        import gpu
        return {'backend': gpu.platform.backend_type_get(), 'renderer': gpu.platform.renderer_get(),
                'vendor': gpu.platform.vendor_get(), 'version': gpu.platform.version_get()}
    except Exception as e:  # noqa: BLE001
        return {'backend': None, 'error': str(e)}


# ----------------------------------------------------------------------------------------------- film materials
def blended(mat):
    """Smooth alpha in EEVEE (no dither noise) and no doubled back faces; Cycles ignores both."""
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    elif hasattr(mat, 'blend_method'):
        mat.blend_method = 'BLEND'
    if hasattr(mat, 'use_backface_culling'):
        mat.use_backface_culling = True


def object_alpha(nt):
    return nt.nodes.new('ShaderNodeObjectInfo').outputs['Alpha']


def mix_shader(nt, fac, a, b):
    m = nt.nodes.new('ShaderNodeMixShader')
    if isinstance(fac, (int, float)):
        m.inputs[0].default_value = fac
    else:
        nt.links.new(fac, m.inputs[0])
    nt.links.new(a, m.inputs[1])
    nt.links.new(b, m.inputs[2])
    return m.outputs['Shader']


def emission(nt, color, strength):
    em = nt.nodes.new('ShaderNodeEmission')
    bs.set_in(em, 'Color', bs.rgba(color))
    if isinstance(strength, (int, float)):
        bs.set_in(em, 'Strength', strength)
    else:
        nt.links.new(strength, em.inputs['Strength'])
    return em.outputs['Emission']


def transparent(nt):
    return nt.nodes.new('ShaderNodeBsdfTransparent').outputs['BSDF']


def facing(nt, blend=0.35):
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    bs.set_in(lw, 'Blend', blend)
    return lw.outputs['Facing']


def fx_material(name, color, strength, opacity):
    mat, nt, out = bs.new_material(name)
    alpha = bs.math_node(nt, 'MULTIPLY', object_alpha(nt), opacity)
    nt.links.new(mix_shader(nt, alpha, transparent(nt), emission(nt, color, strength)), out.inputs['Surface'])
    blended(mat)
    return mat


def panel_material():
    mat, nt, out = bs.new_material('panel')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bs.set_in(b, 'Base Color', bs.rgba(PANEL_LOOK['base']))
    bs.set_in(b, 'Roughness', PANEL_LOOK['rough'])
    alpha = bs.math_node(nt, 'MULTIPLY', object_alpha(nt), PANEL_LOOK['opacity'])
    nt.links.new(alpha, b.inputs['Alpha'])
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    blended(mat)
    return mat


def vessel_material():
    """Schematic carbon-wound pressure vessel: translucent, cool edge glow, faint diagonal winding bands."""
    mat, nt, out = bs.new_material('fx_vessel')
    fc = facing(nt, 0.3)
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    wave = nt.nodes.new('ShaderNodeTexWave')
    for prop, val in (('wave_type', 'BANDS'), ('bands_direction', 'DIAGONAL')):
        setattr_checked(wave, 'TexWave', prop, val)
    bs.set_in(wave, 'Scale', 9.0)
    nt.links.new(co, wave.inputs['Vector'])
    bands = bs.math_node(nt, 'ADD', bs.math_node(nt, 'MULTIPLY', wave.outputs['Fac'], 0.45), 0.55)
    glow = bs.math_node(nt, 'MULTIPLY', bands,
                        bs.math_node(nt, 'ADD', bs.math_node(nt, 'MULTIPLY', fc, VESSEL_LOOK['edge_glow']), VESSEL_LOOK['glow']))
    opac = bs.math_node(nt, 'ADD', bs.math_node(nt, 'MULTIPLY', fc, VESSEL_LOOK['edge_opacity']), VESSEL_LOOK['opacity'])
    alpha = bs.math_node(nt, 'MULTIPLY', object_alpha(nt), opac)
    nt.links.new(mix_shader(nt, alpha, transparent(nt), emission(nt, VESSEL_LOOK['color'], glow)), out.inputs['Surface'])
    blended(mat)
    return mat


def add_xray(mat):
    """Wrap a car material: object colour alpha 1 → the authored surface; alpha 0 → a translucent ghost shell with a
    cool fresnel edge, so the schematic vessels inside read through the body. Returns False if nothing to wrap."""
    nt = mat.node_tree
    out = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputMaterial'), None)
    if out is None or not out.inputs['Surface'].is_linked:
        return False
    sock = out.inputs['Surface']
    link = sock.links[0]
    src = link.from_socket
    nt.links.remove(link)
    xray = bs.math_node(nt, 'SUBTRACT', 1.0, object_alpha(nt))
    fc = facing(nt, 0.35)
    edge = bs.math_node(nt, 'POWER', fc, 1.6)
    ghost_alpha = bs.math_node(nt, 'ADD', bs.math_node(nt, 'MULTIPLY', edge, XRAY_LOOK['edge']), XRAY_LOOK['floor'])
    ghost = mix_shader(nt, ghost_alpha, transparent(nt),
                       emission(nt, XRAY_LOOK['color'], bs.math_node(nt, 'MULTIPLY', fc, XRAY_LOOK['glow'])))
    nt.links.new(mix_shader(nt, xray, src, ghost), sock)
    return True


def build_film_materials(mats):
    for name, (color, strength, opacity) in FX.items():
        mats[name] = fx_material(name, color, strength, opacity)
    mats['panel'] = panel_material()
    mats['fx_vessel'] = vessel_material()
    moon, nt, out = bs.new_material('moon_disc')
    nt.links.new(emission(nt, MOON_LOOK['color'], MOON_LOOK['strength']), out.inputs['Surface'])
    mats['moon_disc'] = moon
    wrapped = [name for name in bs.CAR_MATERIALS if add_xray(mats[name])]
    if len(wrapped) != len(bs.CAR_MATERIALS):
        WARNINGS.append('x-ray wrap skipped for %s' % sorted(set(bs.CAR_MATERIALS) - set(wrapped)))
    return mats


# ----------------------------------------------------------------------------------------------- film objects
def build_lights(col, specs):
    out = []
    for spec in specs:
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
        o.matrix_world = bs.point_matrix(spec['location'], spec['target'])
        o.visible_camera = False
        out.append(o)
    return out


def film_camera(col):
    cd = bpy.data.cameras.new('CAM_film')
    cd.sensor_fit = 'VERTICAL'
    cd.sensor_height = 36.0                       # film.project() uses the same vertical 36 mm sensor
    cd.sensor_width = 36.0
    cd.clip_start, cd.clip_end = 0.05, 2000.0
    cam = bpy.data.objects.new('CAM_film', cd)
    col.objects.link(cam)
    return cam


def vessel_objects(col, mats, rig):
    objs = []
    for name, centre, axis, radius, length_ in film.VESSELS:
        m = diagram.capsule(radius, length_, 'fx_vessel')
        if axis == 'y':
            m = m.transformed(lambda p: (-p[1], p[0], p[2]))
        m = m.transformed(lambda p, c=centre: (p[0] + c[0], p[1] + c[1], p[2] + c[2]))
        o = bs.mesh_object('vessel_' + name, m, mats, col, smooth=True, sharp_deg=None, parent=rig)
        o.visible_shadow = False
        o.hide_render = True
        objs.append(o)
    return objs


def panel_object(col, mats):
    w, d, thick = film.PANEL_SIZE
    m = diagram.contact_panel(w, d, thick).transformed(lambda p: (p[0], p[1], p[2] + film.PANEL_TOP))
    o = bs.mesh_object('contact_panel', m, mats, col, smooth=False)
    o.hide_render = True
    return o


def set_piece_objects(col, mats):
    b = bs.mesh_object('b_foreground_car', shots.b_foreground_mesh(), mats, col, smooth=True, sharp_deg=35.0)
    b.hide_render = True
    sphere = bs.sphere_mesh('moon_disc', rings=12, segs=20)
    moon = bs.mesh_object('moon_disc', sphere, mats, col, smooth=True, sharp_deg=None)
    moon.location = shots.MOON['centre']
    moon.scale = (shots.MOON['radius'],) * 3
    moon.visible_shadow = False
    return {'b_foreground': b, 'moon': moon}


class ItemPool:
    """Per-frame schematic meshes (arrows, dots, lines, markers). Each mesh is re-centred on its own origin so
    EEVEE's per-object transparency sorting works."""

    def __init__(self, col, mats):
        self.col, self.mats, self.objs = col, mats, []

    def clear(self):
        for o in self.objs:
            me = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if me is not None and me.users == 0:
                bpy.data.meshes.remove(me)
        self.objs = []

    def add(self, ident, mesh, level):
        n = len(mesh.verts)
        c = tuple(sum(v[k] for v in mesh.verts) / n for k in range(3))
        local = mesh.transformed(lambda p: (p[0] - c[0], p[1] - c[1], p[2] - c[2]))
        o = bs.mesh_object('fx_' + ident, local, self.mats, self.col, smooth=True, sharp_deg=None)
        o.location = c
        o.color = (1.0, 1.0, 1.0, level)
        o.visible_shadow = False
        self.objs.append(o)


# ----------------------------------------------------------------------------------------------- bloom
def socket_summary(s):
    try:
        v = s.default_value
        v = list(v) if hasattr(v, '__len__') and not isinstance(v, str) else v
    except Exception:  # noqa: BLE001 - sockets without a value
        v = None
    return [s.name, s.bl_idname, v if isinstance(v, (int, float, str, list, type(None))) else repr(v)]


def setup_bloom(scene, enabled):
    """Compositor glare (bloom) on the render, before any text: the compositor overlays come later and stay crisp.
    Blender 5.x: scene.compositing_node_group + NodeGroupOutput, glare settings as input sockets. Failure is recorded
    and the render continues without bloom."""
    info = {'requested': 'on' if enabled else 'off'}
    if not enabled:
        return info
    try:
        tree = bpy.data.node_groups.new('film_bloom', 'CompositorNodeTree')
        rl = tree.nodes.new('CompositorNodeRLayers')
        gl = tree.nodes.new('CompositorNodeGlare')
        out = tree.nodes.new('NodeGroupOutput')
        tree.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        set_ok = []
        if hasattr(gl, 'glare_type'):
            gl.glare_type = 'BLOOM'
            set_ok.append('glare_type=BLOOM')
        else:
            sock = gl.inputs.get('Type')
            for value in ('Bloom', 'BLOOM'):
                try:
                    sock.default_value = value
                    set_ok.append('Type=%s' % value)
                    break
                except Exception:  # noqa: BLE001 - try the other spelling
                    continue
            else:
                raise RuntimeError('cannot set glare type to bloom (inputs: %s)' % [s.name for s in gl.inputs])
        for key, value in (('threshold', BLOOM['threshold']), ('strength', BLOOM['strength']), ('size', BLOOM['size'])):
            sock = next((s for s in gl.inputs if s.name.lower() == key or s.name.lower().endswith(' ' + key)), None)
            if sock is None:
                WARNINGS.append('glare input %r not found; default kept' % key)
                continue
            try:
                sock.default_value = value
                set_ok.append('%s=%g' % (sock.name, value))
            except Exception as e:  # noqa: BLE001 - keep the node default for this one setting
                WARNINGS.append('glare %s = %r failed: %s' % (sock.name, value, e))
        tree.links.new(rl.outputs['Image'], gl.inputs['Image'])
        tree.links.new(gl.outputs['Image'], out.inputs[0])
        scene.compositing_node_group = tree
        scene.render.use_compositing = True
        info.update(status='ok', settings=set_ok, glare_inputs=[socket_summary(s) for s in gl.inputs])
    except Exception as e:  # noqa: BLE001 - recorded; render continues without bloom
        WARNINGS.append('bloom setup failed: %s' % e)
        info['status'] = 'failed: %s' % e
        try:
            scene.compositing_node_group = None
        except Exception:  # noqa: BLE001
            pass
    return info


# ----------------------------------------------------------------------------------------------- per-frame state
def plume_basis(pos, direction):
    q = (-Vector(direction).normalized()).to_track_quat('Z', 'Y')      # plume mesh local -Z along the exhaust
    return Matrix.Translation(Vector(pos)) @ q.to_matrix().to_4x4()


def cab_rear_materials(col):
    """Codex finish: C's cab back is shadowed in the source; retain the authored white edge/sides and all geometry.
    Original polygon slots are restored outside C, so this finish never changes another shot's cab materials.
    """
    mesh = col.objects['lineup_cab_truck'].data
    original = [p.material_index for p in mesh.polygons]
    kind, bbox, heading, _ = next(s for s in bs.staging.LINEUP if s[0] == 'cab_truck')
    origin = Vector(bs.staging.lineup_origin(bbox, heading, bs.staging.VEHICLE_LWH[kind]))
    a = math.radians(heading)
    front, side = Vector((math.cos(a), math.sin(a), 0.0)), Vector((-math.sin(a), math.cos(a), 0.0))
    white = mesh.materials.find('truck_white')
    rear = [p.index for p in mesh.polygons if p.material_index == white and p.normal.dot(front) < -0.9
            and (p.center - origin).dot(front) < -1.3 and abs((p.center - origin).dot(side)) < 1.15
            and 0.86 < p.center.z - origin.z < 3.70]
    if not rear:
        raise RuntimeError('no authored cab rear faces found for shot-C material finish')
    dark = bs.principled('truck_rear_C_shadow', base=(0.008, 0.010, 0.012), rough=0.85, spec=0.12)
    slot = len(mesh.materials)
    mesh.materials.append(dark)
    shadowed = list(original)
    for i in rear:
        shadowed[i] = slot
    return mesh, original, shadowed


class Film:
    def __init__(self, args):
        self.args = args
        scene = bpy.context.scene
        self.scene = scene
        for o in list(scene.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        self.device = setup_engine(scene, args)
        col = bpy.data.collections.new('roadster_film')
        scene.collection.children.link(col)
        mats = build_film_materials(bs.build_materials())
        self.mats = mats
        self.rig, self.plumes = bs.build_car(col, mats)
        self.car_parts = [o for o in self.rig.children if o not in self.plumes.values()]
        self.clouds = bs.build_set(col, mats)
        self.cab_rear = cab_rear_materials(col)
        self.cab_rear_active = False
        self.lights, studio = bs.build_lights(col)
        for o in studio:
            o.hide_render = True
        self.film_lights = build_lights(col, film.FILM_LIGHTS)
        self.base_energy = {o.name: o.data.energy for o in self.lights + self.film_lights}
        bs.build_world(scene)
        self.cam = film_camera(col)
        scene.camera = self.cam
        self.panel = panel_object(col, mats)
        self.vessels = vessel_objects(col, mats, self.rig)
        self.pieces = set_piece_objects(col, mats)
        self.items = ItemPool(col, mats)
        self.bloom = setup_bloom(scene, args.bloom == 'on')

    def light_level(self, name, lv):
        if name in ('film_key', 'film_rim'):
            return lv.get(name, 0.0)
        for group, names in LIGHT_GROUPS.items():
            if name in names:
                return lv.get(group, 1.0)
        return 1.0

    def apply(self, t):
        fr = film.state(t)
        if (fr.shot == 'C') != self.cab_rear_active:
            self.cab_rear_active = fr.shot == 'C'
            mesh, original, shadowed = self.cab_rear
            mesh.polygons.foreach_set('material_index', shadowed if self.cab_rear_active else original)
            mesh.update()
        rig = self.rig
        rig.matrix_world = Matrix(fr.car)
        alpha = 1.0 - fr.xray
        for o in self.car_parts:
            o.hide_render = not fr.car_visible
            o.color = (1.0, 1.0, 1.0, alpha)
        for name, o in self.plumes.items():
            o.matrix_basis = plume_basis(roadster.NOZZLES[name][0], fr.nozzle_dirs[name])
        bs.set_plumes(self.plumes, fr.plumes, True)
        bs.set_clouds(self.clouds, fr.clouds)
        if fr.panel and fr.panel[1] > 0.002:
            self.panel.matrix_world = Matrix(fr.panel[0])
            self.panel.color = (1.0, 1.0, 1.0, fr.panel[1])
            self.panel.hide_render = False
        else:
            self.panel.hide_render = True
        for o in self.vessels:
            o.hide_render = fr.vessels <= 0.002
            o.color = (1.0, 1.0, 1.0, fr.vessels)
        self.items.clear()
        for ident, mesh, level in fr.items:
            self.items.add(ident, mesh, level)
        for o in self.lights + self.film_lights:
            k = self.light_level(o.name, fr.lights)
            # Let the emissive internals separate from the lot during the existing x-ray reveal.
            k *= 1.0 - 0.85 * fr.xray
            o.data.energy = self.base_energy[o.name] * k
            o.hide_render = k <= 0.001
        for key, o in self.pieces.items():
            o.hide_render = not fr.set_pieces.get(key, False)
        cam = fr.camera
        self.cam.matrix_world = bs.point_matrix(cam['eye'], cam['target'])
        self.cam.data.lens = cam['lens_mm']
        dof = self.cam.data.dof
        dof.use_dof = bool(cam.get('fstop'))
        if dof.use_dof:
            dof.focus_distance = (Vector(cam['target']) - Vector(cam['eye'])).length
            dof.aperture_fstop = cam['fstop']
        return fr


def overlay_record(t, fr):
    """Projected anchors (1080 x 1920 px) and notes for the compositor. The same math as film.anchors_for()."""
    labels = []
    for ident, (p, lv, text) in fr.anchors.items():
        q = film.project(fr.camera, p, LABEL_W, LABEL_H)
        if q:
            labels.append({'id': ident, 'text': text, 'x': round(q[0], 1), 'y': round(q[1], 1),
                           'depth_m': round(q[2], 2), 'level': round(lv, 3)})
    cam = fr.camera
    return {'t': round(t, 4), 'frame': int(round(t * FPS)), 'act': fr.act, 'shot': fr.shot,
            'event_s': None if fr.event_s is None else round(fr.event_s, 4),
            'camera': {'eye': [round(v, 4) for v in cam['eye']], 'target': [round(v, 4) for v in cam['target']],
                       'lens_mm': round(cam['lens_mm'], 3), 'fstop': cam.get('fstop')},
            'car_visible': fr.car_visible, 'xray': round(fr.xray, 3), 'vessels': round(fr.vessels, 3),
            'reserve': None if fr.reserve is None else round(fr.reserve, 4),
            'plumes': {k: round(v, 3) for k, v in fr.plumes.items() if v > 0.001},
            'items': [i for i, _, _ in fr.items], 'labels': labels,
            'notes': [{'id': i, 'text': s, 'level': round(lv, 3)} for i, s, lv in fr.notes]}


# ----------------------------------------------------------------------------------------------- comparison sheets
def portrait_outline(cam, shot, n=24):
    """Source-frame pixels of the portrait frame border (what the 9:16 camera sees inside the 16:9 source)."""
    r, u, f = film.camera_basis(cam)
    fp = cam['lens_mm'] / 36.0 * LABEL_H
    pts = []
    border = ([(LABEL_W * k / n, 0.0) for k in range(n)] + [(LABEL_W, LABEL_H * k / n) for k in range(n)] +
              [(LABEL_W * (1 - k / n), LABEL_H) for k in range(n)] + [(0.0, LABEL_H * (1 - k / n)) for k in range(n + 1)])
    for px, py in border:
        d = tuple(f[i] + r[i] * (px - LABEL_W / 2) / fp - u[i] * (py - LABEL_H / 2) / fp for i in range(3))
        q = shots.PIN[shot].project(tuple(cam['eye'][i] + d[i] for i in range(3)))
        if q[2] > 0:
            pts.append((q[0], q[1]))
    return pts


def compare_sheet(render_path, source_path, outline, out_path):
    import numpy as np
    r = bs._load_rgb(render_path)
    s = bs._load_rgb(source_path)
    H, W = r.shape[:2]
    sh, sw = s.shape[:2]
    oh = int(round(W * sh / sw))
    s = s[(np.arange(oh) * sh // oh)][:, (np.arange(W) * sw // W)]
    k = W / float(sw)
    for (x0, y0), (x1, y1) in zip(outline, outline[1:]):
        for j in range(12):
            x = (x0 + (x1 - x0) * j / 12.0) * k
            y = (y0 + (y1 - y0) * j / 12.0) * k
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi < W and 0 <= yi < oh:
                s[max(0, yi - 1):yi + 2, max(0, xi - 1):xi + 2] = (0.0, 0.9, 0.9)
    sep = np.full((6, W, 3), 0.5, dtype=np.float32)
    bs._save_png(np.concatenate([s, sep, r], axis=0), out_path)


# ----------------------------------------------------------------------------------------------- main
def main():
    t_start = time.perf_counter()
    args = parse_args()
    out_dir = os.path.abspath(args.out_dir)
    for sub in ('frames', 'labels', 'compare'):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    flm = Film(args)
    ref_dir = bs.find_reference_dir(args.reference_dir) if args.compare == 'on' else None
    build_s = time.perf_counter() - t_start
    print('ROADSTER_FILM build %.1fs, engine %s, device %s, bloom %s' % (
        build_s, flm.scene.render.engine, flm.device, flm.bloom.get('status', 'off')), flush=True)
    ext = '.png' if args.format == 'PNG' else '.jpg'
    records, backend_checked, gpu_info = [], False, None
    for kind, v in args.jobs:
        t = job_time(kind, v)
        stem = job_stem(kind, v)
        png = os.path.join(out_dir, 'frames', stem + ext)
        lab = os.path.join(out_dir, 'labels', stem + '.json')
        if args.skip_existing and os.path.isfile(png) and os.path.isfile(lab):
            continue
        fr = flm.apply(t)
        rec = overlay_record(t, fr)
        rec['file'] = os.path.relpath(png, out_dir)
        if not args.dry_run:
            flm.scene.render.filepath = png
            t0 = time.perf_counter()
            bpy.ops.render.render(write_still=True)
            rec['render_seconds'] = round(time.perf_counter() - t0, 3)
            if not backend_checked and args.engine == 'EEVEE':
                gpu_info = gpu_backend()
                backend_checked = True
                if args.device == 'METAL' and str(gpu_info.get('backend')).upper() != 'METAL':
                    raise RuntimeError('--device METAL requested but EEVEE rendered on %r; stopping' % gpu_info)
            print('ROADSTER_FILM rendered %s (t %.3f, %s%s) in %.2fs' % (
                stem, t, fr.act, '/' + fr.shot if fr.shot else '', rec['render_seconds']), flush=True)
            if ref_dir and t < shots.SOURCE_END and kind == 't':
                image = motion.source_keyframe_image(t, tol=0.3)
                src = os.path.join(ref_dir, image) if image else None
                if src and os.path.isfile(src):
                    cmp_path = os.path.join(out_dir, 'compare', stem + '.png')
                    try:
                        compare_sheet(png, src, portrait_outline(fr.camera, fr.shot), cmp_path)
                        rec['compare'] = os.path.relpath(cmp_path, out_dir)
                        rec['source_frame'] = image
                    except Exception as e:  # noqa: BLE001 - the render itself succeeded
                        WARNINGS.append('comparison for %s failed: %s' % (stem, e))
                else:
                    WARNINGS.append('no source keyframe within 0.3 s of %.3f s' % t)
        with open(lab, 'w', encoding='utf-8') as fh:
            json.dump(rec, fh, ensure_ascii=False, indent=1)
        records.append(rec)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend), copy=True)
    stamp = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
    manifest = {
        'tool': 'blender/render_film.py', 'blender_version': bpy.app.version_string,
        'build_hash': bpy.app.build_hash.decode() if isinstance(bpy.app.build_hash, bytes) else str(bpy.app.build_hash),
        'argv': sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [],
        'device': flm.device, 'gpu_backend_after_first_render': gpu_info,
        'render': {'engine': flm.scene.render.engine, 'samples': args.samples, 'resolution': [args.width, args.height],
                   'format': args.format, 'volume_tile': args.volume_tile, 'volume_samples': args.volume_samples,
                   'raytrace': args.raytrace, 'exposure': args.exposure,
                   'view_transform': flm.scene.view_settings.view_transform, 'look': flm.scene.view_settings.look},
        'bloom': flm.bloom, 'scene_build_seconds': round(build_s, 2),
        'total_seconds': round(time.perf_counter() - t_start, 2), 'dry_run': args.dry_run,
        'frames': records, 'warnings': WARNINGS,
        'status': ('Film plates. 0-14 s: reconstruction of the source clip (car geometry inferred from its frames, '
                   'not an official Tesla drawing; screen-space fitted poses, not measured trajectory). 14-75 s: '
                   'principle illustration; nozzle ports, vessels, force lengths and slow-motion are schematic.'),
    }
    path = os.path.join(out_dir, 'manifest_%s.json' % stamp)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=1, ensure_ascii=False)
    print('ROADSTER_FILM done %.1fs, %d frames, %d warnings -> %s' % (
        manifest['total_seconds'], len(records), len(WARNINGS), path), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('ROADSTER_FILM_FAILED\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise
