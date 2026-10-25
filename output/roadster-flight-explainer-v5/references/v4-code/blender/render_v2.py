"""render_v2.py: Blender 5.2 plates for the v2 film 「一口气」 (1080 x 1920, 30 fps, duration from v2/cues.json).

    # proof stills (film seconds), native portrait, one process
    blender --background --factory-startup --python-exit-code 1 --python blender/render_v2.py -- \
        --device METAL --engine EEVEE --samples 64 --out-dir <out>/v2-proof-01 --proof

    # motion preview / bulk (resumable): frame N = film time N/30 s
    blender --background --factory-startup --python-exit-code 1 --python blender/render_v2.py -- \
        --device METAL --engine EEVEE --samples 64 --out-dir <out>/v2-frames --frames 0-404 --skip-existing

The picture only: photoreal car, gas, cloud, lot, jet frost and the x-ray. NO diagram geometry and NO text: force lines,
gas particles, the CoM dot, the torque arc, flow lines, labels and captions are vector overlays drawn by Remotion
from blender/tools/export_v2_overlay.py, projected through the same camera (v2_film.project). Each frame applies
v2_film.state(t): camera (with dutch and depth of field), car pose and x-ray, plume levels and directions, cloud
puffs, lot/hero light levels and positions, frozen jet frost, tail-lamp level.

Reuses v1's validated scene code (build_scene.py: car, lot, materials, plume and cloud volumes, lights; render_film.py:
engine setup, x-ray wrap, vessels, bloom). Car and staging are inferred from the source frames, not Tesla CAD;
everything in the frozen sections is a principle illustration (schematic jet asymmetry, vessel layout).
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

import build_scene as bs  # noqa: E402
import render_film as rf  # noqa: E402  (its main() only runs as a script)
import roadster  # noqa: E402
import v2_film as v2  # noqa: E402
from geom import Mesh  # noqa: E402

WARNINGS = bs.WARNINGS
FPS = v2.FPS
N_FRAMES = v2.N_FRAMES
PROOF_TIMES = (0.0, 1.9, 3.96, 5.0, 6.84, 7.4, 8.1, 9.4, 11.6, 14.9, 16.0, 18.6, 21.9, 23.0, 27.0)

# ----------------------------------------------------------------------------------------------- v2 look (tunable)
LOOKS = ('AgX - High Contrast', 'High Contrast', 'AgX - Medium High Contrast', 'Medium High Contrast')
# x-ray: dark glass with cool-white fresnel edges (not v1's blue hologram); vessels glow ice blue (= gas)
XRAY_LOOK = {'color': (0.78, 0.88, 1.00), 'glow': 0.85, 'floor': 0.010, 'edge': 0.34}
VESSEL_LOOK = {'color': (0.30, 0.78, 1.00), 'glow': 1.6, 'edge_glow': 2.6, 'opacity': 0.30, 'edge_opacity': 0.62}
BLOOM = {'threshold': 0.85, 'strength': 0.42, 'size': 0.6}
FROST = {'color': (0.86, 0.94, 1.00), 'strength': 3.4}
LAMP_RED_BASE = 22.0          # build_scene CAR_MATERIALS lamp_red emission; scaled per frame by v2_film's fr.lamp
# car-relative hero lights for the frozen / slow-motion sections; positions come from v2_film.hero_rig()
HERO_LIGHTS = [
    {'name': 'hero_rim', 'type': 'SPOT', 'energy': 8000.0, 'spot_deg': 34.0, 'blend': 0.7, 'radius': 0.8,
     'color': (0.80, 0.89, 1.00)},
    {'name': 'hero_rim2', 'type': 'SPOT', 'energy': 5200.0, 'spot_deg': 34.0, 'blend': 0.7, 'radius': 0.8,
     'color': (0.88, 0.94, 1.00)},
    {'name': 'hero_key', 'type': 'SPOT', 'energy': 650.0, 'spot_deg': 28.0, 'blend': 0.9, 'radius': 1.6,
     'color': (1.00, 0.97, 0.93)},
    {'name': 'hero_under', 'type': 'AREA', 'energy': 220.0, 'size': (4.0, 2.0), 'color': (0.92, 0.95, 1.00),
     'no_shadow': True},
    {'name': 'hero_strip', 'type': 'AREA', 'energy': 900.0, 'size': (7.0, 0.35), 'color': (1.0, 1.0, 1.0),
     'glossy_only': True, 'no_shadow': True},
]
LOT_LIGHTS = ('flood_left', 'flood_right', 'tower_right', 'back_left', 'back_centre', 'back_right')
CLOSE_SECTIONS = ('teaser', 'flyin', 'explain')


# ----------------------------------------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser(prog='render_v2.py', description=__doc__.split('\n')[0])
    p.add_argument('--out-dir', required=True)
    p.add_argument('--device', required=True, choices=('METAL', 'CPU'))
    p.add_argument('--engine', choices=('EEVEE', 'CYCLES'), default='EEVEE')
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--proof', action='store_true', help='render %s' % ','.join('%g' % t for t in PROOF_TIMES))
    p.add_argument('--times', default=None, help='comma list of film seconds')
    p.add_argument('--frames', default=None, help="film frame range 'a-b' (inclusive, 30 fps), optional ':step'")
    p.add_argument('--skip-existing', action='store_true')
    p.add_argument('--width', type=int, default=v2.W_PX)
    p.add_argument('--height', type=int, default=v2.H_PX)
    p.add_argument('--format', choices=('PNG', 'JPEG'), default='PNG')
    p.add_argument('--volume-tile', choices=('1', '2', '4', '8', '16'), default='4',
                   help='EEVEE volume tile for wide shots; close shots use --close-volume-tile')
    p.add_argument('--close-volume-tile', choices=('1', '2', '4', '8', '16'), default='2')
    p.add_argument('--volume-samples', type=int, default=96)
    p.add_argument('--raytrace', choices=('on', 'off'), default='on')
    p.add_argument('--bloom', choices=('on', 'off'), default='on')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--look', default=None, help='AgX look name (default: High Contrast, falling back)')
    p.add_argument('--frost', choices=('on', 'off'), default='on')
    p.add_argument('--shadow-pool', default='1024', help="EEVEE shadow pool MB ('512', '1024', '2048'...)")
    p.add_argument('--no-denoise', action='store_true', help='Cycles only')
    p.add_argument('--save-blend', default=None)
    p.add_argument('--dry-run', action='store_true')
    a = p.parse_args(argv)
    if a.engine == 'EEVEE' and a.device == 'CPU':
        p.error('EEVEE has no CPU device; use --engine CYCLES --device CPU for a CPU render')
    jobs = []
    if a.proof:
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
        p.error('nothing to render: give --proof, --times or --frames')
    for kind, v in jobs:
        t = v / FPS if kind == 'f' else v
        if not 0.0 <= t < v2.DURATION:
            p.error('time %.3f outside 0-%g s' % (t, v2.DURATION))
    a.jobs = jobs
    return a


def job_time(kind, v):
    return v / FPS if kind == 'f' else v


def job_stem(kind, v):
    return 'f%05d' % v if kind == 'f' else 't%06.3f' % v


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


def apply_look(scene, name):
    vs = scene.view_settings
    vs.view_transform = 'AgX'
    for look in ((name,) if name else ()) + LOOKS:
        try:
            vs.look = look
            return look
        except TypeError:
            continue
    WARNINGS.append('no AgX contrast look accepted; using None')
    return 'None'


# ----------------------------------------------------------------------------------------------- scene
_PHI = (1.0 + 5.0 ** 0.5) / 2.0
_ICO_V = [(-1, _PHI, 0), (1, _PHI, 0), (-1, -_PHI, 0), (1, -_PHI, 0), (0, -1, _PHI), (0, 1, _PHI), (0, -1, -_PHI),
          (0, 1, -_PHI), (_PHI, 0, -1), (_PHI, 0, 1), (-_PHI, 0, -1), (-_PHI, 0, 1)]
_ICO_F = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
          (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
          (8, 6, 7), (9, 8, 1)]


def frost_mesh():
    """One small icosahedron per frost grain (v2_film.FROST: world position, radius)."""
    m = Mesh()
    k = 1.0 / (1.0 + _PHI * _PHI) ** 0.5
    for (x, y, z), r in v2.FROST:
        i = [m.add_vert((x + a * k * r, y + b * k * r, z + c * k * r)) for a, b, c in _ICO_V]
        for a, b, c in _ICO_F:
            m.add_face((i[a], i[b], i[c]), 'frost')
    return m


def make_hero_lights(col):
    out = []
    for spec in HERO_LIGHTS:
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
        o.visible_camera = False
        if spec.get('no_shadow'):
            setattr_checked(ld, 'light', 'use_shadow', False)
        if spec.get('glossy_only'):
            # EEVEE reads the light-data factors; Cycles the object ray visibility
            for name in ('diffuse_factor', 'volume_factor', 'transmission_factor'):
                if hasattr(ld, name):
                    setattr_checked(ld, 'light', name, 0.0)
            for name in ('visible_diffuse', 'visible_transmission', 'visible_volume_scatter'):
                if hasattr(o, name):
                    setattr_checked(o, 'light object', name, False)
        o.hide_render = True
        out.append(o)
    return out


def link_hero_lights(lights, receivers):
    """Light linking: the car-relative hero lights illuminate only the car, its plumes, vessels and frost, never the
    parked lineup or the lot (which keep their own dimmed lot light: theatre lights down at the freeze). Missing API ->
    recorded warning, lights unchanged."""
    coll = bpy.data.collections.new('v2_hero_receivers')
    for o in receivers:
        if o.name not in coll.objects:
            coll.objects.link(o)
    linked = 0
    for o in lights:
        ll = getattr(o, 'light_linking', None)
        if ll is None or not hasattr(ll, 'receiver_collection'):
            WARNINGS.append('light linking unavailable on %s; hero light unrestricted' % o.name)
            continue
        try:
            ll.receiver_collection = coll
            linked += 1
        except Exception as e:  # noqa: BLE001 - recorded; the light stays unrestricted
            WARNINGS.append('light linking on %s failed: %s' % (o.name, e))
    return {'linked_lights': linked, 'receivers': len(coll.objects)}


def drive_lamp_by_object_red(mat):
    """Tail-lamp emission strength = object colour R x LAMP_RED_BASE, an object attribute, so changing it per frame
    never recompiles the shader. The other car materials read only the object alpha (x-ray), so R is free."""
    nt = mat.node_tree
    pr = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if pr is None or 'Emission Strength' not in pr.inputs:
        WARNINGS.append('lamp_red: no Principled emission input; tail lamp not dimmed')
        return False
    info = nt.nodes.new('ShaderNodeObjectInfo')
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(info.outputs['Color'], sep.inputs[0])
    nt.links.new(bs.math_node(nt, 'MULTIPLY', sep.outputs[0], LAMP_RED_BASE), pr.inputs['Emission Strength'])
    return True


class Film:
    def __init__(self, args):
        self.args = args
        scene = bpy.context.scene
        self.scene = scene
        for o in list(scene.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        self.device = rf.setup_engine(scene, args)
        self.look = apply_look(scene, args.look)
        scene.view_settings.exposure = args.exposure
        if args.engine == 'EEVEE':        # the close shots overflowed the default virtual shadow pool (Codex log)
            setattr_checked(scene.eevee, 'eevee', 'shadow_pool_size', args.shadow_pool)
        col = bpy.data.collections.new('roadster_v2')
        scene.collection.children.link(col)
        rf.XRAY_LOOK.update(XRAY_LOOK)
        rf.VESSEL_LOOK.update(VESSEL_LOOK)
        rf.BLOOM.update(BLOOM)
        mats = rf.build_film_materials(bs.build_materials())
        mats['frost'] = rf.fx_material('frost', FROST['color'], FROST['strength'], 1.0)
        self.lamp_driven = drive_lamp_by_object_red(mats['lamp_red'])
        self.mats = mats
        self.rig, self.plumes = bs.build_car(col, mats)
        self.car_parts = [o for o in self.rig.children if o not in self.plumes.values()]
        self.clouds = bs.build_set(col, mats)
        lights, studio = bs.build_lights(col)
        for o in studio:
            o.hide_render = True
        self.lot = [o for o in lights if o.name in LOT_LIGHTS]
        other = [o.name for o in lights if o.name not in LOT_LIGHTS]
        if other:
            WARNINGS.append('scene lights not in the lot group (left at full energy): %s' % other)
        self.hero = make_hero_lights(col)
        self.base_energy = {o.name: o.data.energy for o in self.lot + self.hero}
        bs.build_world(scene)
        self.cam = rf.film_camera(col)
        scene.camera = self.cam
        self.vessels = rf.vessel_objects(col, mats, self.rig)
        self.frost = bs.mesh_object('frost', frost_mesh(), mats, col, smooth=True, sharp_deg=None)
        self.frost.visible_shadow = False
        self.frost.hide_render = True
        self.bloom = rf.setup_bloom(scene, args.bloom == 'on')
        self.hero_linked = link_hero_lights(self.hero, [o for o in self.rig.children] + [self.frost])
        self.tile = None

    def set_volume_tile(self, section):
        if self.args.engine != 'EEVEE':
            return
        tile = self.args.close_volume_tile if section in CLOSE_SECTIONS else self.args.volume_tile
        if tile != self.tile:
            setattr_checked(self.scene.eevee, 'eevee', 'volumetric_tile_size', tile)
            self.tile = tile

    def apply(self, t):
        fr = v2.state(t)
        self.set_volume_tile(fr.section)
        self.rig.matrix_world = Matrix(fr.car)
        alpha = 1.0 - fr.xray
        for o in self.car_parts:
            o.hide_render = not fr.car_visible
            o.color = (fr.lamp, 1.0, 1.0, alpha)      # R drives the tail lamp only; A the x-ray
        for name, o in self.plumes.items():
            o.matrix_basis = rf.plume_basis(roadster.NOZZLES[name][0], fr.nozzle_dirs[name])
        bs.set_plumes(self.plumes, fr.plumes if fr.car_visible else {}, True)
        bs.set_clouds(self.clouds, fr.clouds)
        for o in self.vessels:
            o.hide_render = fr.vessels <= 0.002 or not fr.car_visible
            o.color = (1.0, 1.0, 1.0, fr.vessels)
        lot = fr.lights.get('lot', 1.0)
        for o in self.lot:
            o.data.energy = self.base_energy[o.name] * lot
            o.hide_render = lot <= 0.001
        hero = fr.lights.get('hero', 0.0)
        for o in self.hero:
            rig = fr.hero_rig.get(o.name)
            on = hero > 0.001 and rig is not None
            o.hide_render = not on
            if on:
                o.matrix_world = bs.point_matrix(rig[0], rig[1])
                o.data.energy = self.base_energy[o.name] * hero
        use_frost = self.args.frost == 'on' and fr.frost > 0.002
        self.frost.hide_render = not use_frost
        self.frost.color = (1.0, 1.0, 1.0, fr.frost)
        cam = fr.camera
        self.cam.matrix_world = bs.point_matrix(cam['eye'], cam['target']) @ \
            Matrix.Rotation(math.radians(cam.get('dutch_deg', 0.0)), 4, 'Z')
        self.cam.data.lens = cam['lens_mm']
        dof = self.cam.data.dof
        dof.use_dof = bool(cam.get('fstop'))
        if dof.use_dof:
            dof.focus_distance = cam['focus_m']
            dof.aperture_fstop = cam['fstop']
        return fr


def record(t, fr):
    cam = fr.camera
    return {'t': round(t, 4), 'frame': int(round(t * FPS)), 'section': fr.section, 'ev': round(fr.ev, 4),
            'camera': {'eye': [round(v, 4) for v in cam['eye']], 'target': [round(v, 4) for v in cam['target']],
                       'lens_mm': round(cam['lens_mm'], 3), 'fstop': None if cam['fstop'] is None else round(cam['fstop'], 2),
                       'dutch_deg': round(cam.get('dutch_deg', 0.0), 2)},
            'car_visible': fr.car_visible, 'xray': round(fr.xray, 3), 'vessels': round(fr.vessels, 3),
            'frost': round(fr.frost, 3), 'lamp': round(fr.lamp, 3), 'lights': {k: round(v, 3) for k, v in fr.lights.items()},
            'plumes': {k: round(v, 3) for k, v in fr.plumes.items() if v > 0.001}}


# ----------------------------------------------------------------------------------------------- main
def main():
    t_start = time.perf_counter()
    args = parse_args()
    out_dir = os.path.abspath(args.out_dir)
    os.makedirs(os.path.join(out_dir, 'frames'), exist_ok=True)
    flm = Film(args)
    build_s = time.perf_counter() - t_start
    print('ROADSTER_V2 build %.1fs, engine %s, look %s, device %s, bloom %s' % (
        build_s, flm.scene.render.engine, flm.look, flm.device, flm.bloom.get('status', 'off')), flush=True)
    ext = '.png' if args.format == 'PNG' else '.jpg'
    records, backend_checked, gpu_info = [], False, None
    for kind, v in args.jobs:
        t = job_time(kind, v)
        stem = job_stem(kind, v)
        png = os.path.join(out_dir, 'frames', stem + ext)
        if args.skip_existing and os.path.isfile(png):
            continue
        fr = flm.apply(t)
        rec = record(t, fr)
        rec['file'] = os.path.relpath(png, out_dir)
        if not args.dry_run:
            flm.scene.render.filepath = png
            t0 = time.perf_counter()
            bpy.ops.render.render(write_still=True)
            rec['render_seconds'] = round(time.perf_counter() - t0, 3)
            if not backend_checked and args.engine == 'EEVEE':
                gpu_info = rf.gpu_backend()
                backend_checked = True
                if args.device == 'METAL' and str(gpu_info.get('backend')).upper() != 'METAL':
                    raise RuntimeError('--device METAL requested but EEVEE rendered on %r; stopping' % gpu_info)
            print('ROADSTER_V2 rendered %s (t %.3f, %s, ev %.3f) in %.2fs' % (
                stem, t, fr.section, fr.ev, rec['render_seconds']), flush=True)
        records.append(rec)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend), copy=True)
    stamp = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
    manifest = {
        'tool': 'blender/render_v2.py', 'blender_version': bpy.app.version_string,
        'build_hash': bpy.app.build_hash.decode() if isinstance(bpy.app.build_hash, bytes) else str(bpy.app.build_hash),
        'argv': sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [],
        'cues': os.path.relpath(v2.CUES_PATH, os.path.dirname(HERE)), 'device': flm.device,
        'gpu_backend_after_first_render': gpu_info,
        'render': {'engine': flm.scene.render.engine, 'samples': args.samples, 'resolution': [args.width, args.height],
                   'format': args.format, 'volume_tile': args.volume_tile, 'close_volume_tile': args.close_volume_tile,
                   'volume_samples': args.volume_samples, 'raytrace': args.raytrace, 'exposure': args.exposure,
                   'view_transform': flm.scene.view_settings.view_transform, 'look': flm.look, 'frost': args.frost,
                   'shadow_pool': args.shadow_pool},
        'bloom': flm.bloom, 'hero_light_linking': flm.hero_linked, 'scene_build_seconds': round(build_s, 2),
        'total_seconds': round(time.perf_counter() - t_start, 2), 'dry_run': args.dry_run,
        'frames': records, 'warnings': WARNINGS,
        'status': ('v2 plates (picture only; vector overlay and text are composited later). Source sections reconstruct '
                   'the clip from inferred geometry; frozen sections are principle illustrations.'),
    }
    path = os.path.join(out_dir, 'manifest_%s.json' % stamp)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=1, ensure_ascii=False)
    print('ROADSTER_V2 done %.1fs, %d frames, %d warnings -> %s' % (
        manifest['total_seconds'], len(records), len(WARNINGS), path), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('ROADSTER_V2_FAILED\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise
