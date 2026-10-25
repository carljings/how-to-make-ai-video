"""render_v3.py: Blender 5.2 plates for the v3 film 「比墙还陡」 (1080 x 1920 portrait; poster assets 1620 x 2880).

PICTURE ONLY: photoreal car, ramp, venue, jets and cloud; NO diagram geometry and NO text (all force arrows, air
streaks, ticks, labels and type are Remotion overlays from blender/tools/export_v3_overlay.py, projected through the
same cameras by v3_film). Each item applies v3_film.state(t) / still_state(name): camera, car pose (v3_ramp: wheels on
the curved surface, image-matched airborne fit), wheel spin, plumes, cloud, venue/hero light, x-ray.

    B=/Applications/Blender.app/Contents/MacOS/Blender
    # 1) proof: a handful of native frames + the stills (one GPU job)
    $B --background --factory-startup --python-exit-code 1 --python blender/render_v3.py -- \
        --device METAL --engine EEVEE --samples 64 --out-dir <out>/v3-proof-01 --proof
    # source match: 16:9 renders at the fitted source cameras, side by side with the native reference
    $B ... --python blender/render_v3.py -- --device METAL --out-dir <out>/v3-srcmatch-01 \
        --source-match 6,8,9.25,9.5,10,10.5,11,12,12.5 --source-video references/ramp/ramp-reference-1080.mp4
    # 2) opening motion review: frames 0-85 (hook) and 86-155 (evidence + light-sheet; 156-164 hold f155)
    $B ... --out-dir <out>/v3-frames --frames 0-155 --skip-existing
    # 3) all plates: render frames, stills, poster layers (resumable)
    $B ... --out-dir <out>/v3-frames --all-render-frames --skip-existing
    $B ... --out-dir <out>/v3-frames --stills all --skip-existing
    $B ... --out-dir <out>/v3-frames --layers --skip-existing

Outputs under --out-dir: frames/fNNNNN.png (film frame N = N/30 s), stills/<NAME>.png, layers/fNNNNN.png (RGBA live
car on the poster camera), srcmatch/ev<EV>.png and compare_ev<EV>.png, manifest_<UTC>.json.
The car and ramp are reconstructions inferred from source frames (not Tesla CAD); explanatory stills are schematic.
"""
import argparse
import json
import math
import os
import subprocess
import sys
import time
import traceback

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import build_scene as bs  # noqa: E402
import geom  # noqa: E402
import render_film as rf  # noqa: E402  (its main() only runs as a script)
import roadster  # noqa: E402
import v3_film as F  # noqa: E402
import v3_ramp as R  # noqa: E402
from geom import Mesh  # noqa: E402

WARNINGS = bs.WARNINGS
PROOF_TIMES = (0.0, 1.6, 3.1, 4.2, 5.15, 16.4, 24.2, 26.6, 27.3, 28.5, 33.0, 34.4, 35.9, 36.8)
# v4 milestone 1 (opening): hook frame 0, the title landing, the reveal, its landing on the whole ramp, the source wide,
# the light-sheet writing the profile, the last evidence frame (held for the freeze)
PROOF_V4_TIMES = (0.0, 0.4, 1.0, 1.6, 2.2, 2.8, 3.4, 4.2, 4.8, 5.0, 5.166)
PROOF_STILLS = ('P1', 'P2', 'XR_OPAQUE', 'XR_GLASS', 'POSTER_BG', 'GHOST_R3', 'GHOST_C3')

# ----------------------------------------------------------------------------------------------- look (tunable)
LOOKS = ('AgX - High Contrast', 'High Contrast', 'AgX - Medium High Contrast', 'Medium High Contrast')
XRAY_LOOK = {'color': (0.78, 0.88, 1.00), 'glow': 0.85, 'floor': 0.010, 'edge': 0.34}
VESSEL_LOOK = {'color': (0.30, 0.78, 1.00), 'glow': 1.6, 'edge_glow': 2.6, 'opacity': 0.30, 'edge_opacity': 0.62}
# proof-01 review: bloom only on true highlights (no pink haze off the neon); set emission is a per-section factor
# (v3_film.SECTION_LOOK) times these bases, so explanations can dim the red bars without darkening the car
BLOOM = {'threshold': 1.05, 'strength': 0.22, 'size': 0.45}
LAMP_RED_BASE = 22.0
NEON = {'color': (1.0, 0.05, 0.13), 'strength': 4.5}
RED_ROWS = {'color': (1.0, 0.05, 0.03), 'strength': 3.0}
LAMP_DISC = 40.0
PAINT = {'color': (0.86, 0.87, 0.88), 'glow': 0.06}
# v3 car paint: silver-white with a darker diffuse and more metal, so floods and strips draw form instead of blowing
# the body out to flat white (the shared build_scene paint stays as it is for v1/v2)
CAR_PAINT_V3 = {'Base Color': (0.66, 0.67, 0.69, 1.0), 'Metallic': 0.32, 'Coat Roughness': 0.028}
UNDERBODY_V3 = {'Base Color': (0.085, 0.086, 0.09, 1.0)}   # reads as a dark band above the black gap in the sections
CONCRETE = {'light': (0.38, 0.385, 0.385), 'dark': (0.135, 0.138, 0.142), 'line': (0.72, 0.73, 0.72)}
SECTION_FACE = (0.105, 0.102, 0.098)     # cut face of the slab in the cross-section shots: dark matte concrete
VENUE_LIGHTS = [   # night venue: hard white floods on the open side, a low base light, a cool back rim on the tower
    {'name': 'flood_a', 'type': 'SPOT', 'energy': 2.6e5, 'color': (1.0, 0.98, 0.95), 'location': (-34.0, -30.0, 16.0),
     'target': (3.0, 0.0, 8.0), 'spot_deg': 22.0, 'blend': 0.35, 'radius': 0.6},
    {'name': 'flood_b', 'type': 'SPOT', 'energy': 1.6e5, 'color': (0.95, 0.97, 1.0), 'location': (-36.0, 22.0, 14.0),
     'target': (3.0, 0.0, 7.0), 'spot_deg': 22.0, 'blend': 0.4, 'radius': 0.6},
    {'name': 'flood_base', 'type': 'SPOT', 'energy': 2.2e4, 'color': (1.0, 1.0, 1.0), 'location': (-14.0, -9.0, 2.6),
     'target': (1.0, 0.0, 1.5), 'spot_deg': 40.0, 'blend': 0.6, 'radius': 0.3},
    {'name': 'back_rim', 'type': 'SPOT', 'energy': 9.0e4, 'color': (0.80, 0.87, 1.0), 'location': (22.0, 9.0, 20.0),
     'target': (5.0, 0.0, 9.0), 'spot_deg': 28.0, 'blend': 0.5, 'radius': 0.8},
    # the descent and landing zone (source 11–12.5 s: the car and its cloud are bright under the floods)
    {'name': 'flood_land', 'type': 'SPOT', 'energy': 1.5e5, 'color': (1.0, 0.98, 0.95), 'location': (-40.0, -26.0, 13.0),
     'target': (-9.0, 0.0, 3.0), 'spot_deg': 28.0, 'blend': 0.45, 'radius': 0.6},
]
HERO_LIGHTS = [
    {'name': 'hero_rim', 'type': 'SPOT', 'energy': 4500.0, 'spot_deg': 36.0, 'blend': 0.7, 'radius': 0.8,
     'color': (0.80, 0.89, 1.00)},
    {'name': 'hero_rim2', 'type': 'SPOT', 'energy': 3000.0, 'spot_deg': 36.0, 'blend': 0.7, 'radius': 0.8,
     'color': (0.88, 0.94, 1.00)},
    {'name': 'hero_key', 'type': 'SPOT', 'energy': 650.0, 'spot_deg': 30.0, 'blend': 0.9, 'radius': 1.6,
     'color': (1.00, 0.97, 0.93)},
    # narrow glossy-only strips: crisp long lines along shoulder and canopy, not a broad wash (proof-01 review)
    {'name': 'hero_strip', 'type': 'AREA', 'energy': 560.0, 'size': (7.5, 0.12), 'color': (1.0, 1.0, 1.0),
     'glossy_only': True, 'no_shadow': True},
    {'name': 'hero_strip2', 'type': 'AREA', 'energy': 340.0, 'size': (6.0, 0.09), 'color': (0.95, 0.97, 1.0),
     'glossy_only': True, 'no_shadow': True},
]
# v4 「光切」: the light-sheet instrument, haze, the source's follow-spot and the car's headlights. The sheet is cold
# white; its contour line is a true intersection with the geometry (shader band around the plane y = sheet_y).
# proof01 review: line 55 -> 18 and width 5 -> 2.8 cm (a razor line, not a glow that bleaches the slab); the world haze
# is off in the opening (v3_film.SECTION_LOOK) and, where a section turns it on, only lights with a 'volume' factor
# scatter into it (the proof01 veil was every flood scattering); follow-spot 600 -> 220 kW (it out-lit the floods
# about 3x and blew the car and the ramp around it); hook uplights were 160/110 kW narrow spots aimed AT the car,
# now a soft wide fill on the ceiling from below.
SHEET = {'color': (0.86, 0.95, 1.0), 'line_strength': 18.0, 'head_strength': 3.0, 'veil_color': (0.80, 0.92, 1.0),
         'veil_strength': 1.6}
HAZE = {'density': 0.0016, 'anisotropy': 0.55, 'color': (0.92, 0.95, 1.0)}
FOLLOW = {'name': 'follow_spot', 'type': 'SPOT', 'energy': 2.2e5, 'color': (1.0, 0.985, 0.96), 'spot_deg': 7.5,
          'blend': 0.45, 'radius': 0.25, 'location': (-30.0, -24.0, 23.0), 'target': (0.0, 0.0, 10.0), 'volume': 0.6}
HEADLIGHT = {'energy': 900.0, 'color': (0.93, 0.96, 1.0), 'spot_deg': 36.0, 'blend': 0.65, 'radius': 0.06,
             'local': [(2.02, 0.62, 0.50), (2.02, -0.62, 0.50)], 'aim': (1.0, 0.0, -0.06)}
UPLIGHTS = [   # hook only: soft wide fill from the floor on the camera side, lifting the ceiling and the canopy
    {'name': 'up_a', 'type': 'SPOT', 'energy': 1.3e4, 'color': (0.95, 0.97, 1.0), 'location': (-8.5, -6.5, 0.4),
     'target': (-2.0, 0.0, 15.2), 'spot_deg': 38.0, 'blend': 0.85, 'radius': 0.6},
    {'name': 'up_b', 'type': 'SPOT', 'energy': 0.9e4, 'color': (1.0, 0.97, 0.94), 'location': (2.5, -7.5, 0.4),
     'target': (-3.5, 0.0, 15.2), 'spot_deg': 36.0, 'blend': 0.85, 'radius': 0.6},
]
NEON_WHITE = {'color': (0.9, 0.95, 1.0), 'strength': 3.2}     # the source's white lower neon segment

# cross-section fill (not light-linked: it must reach the section face as well as the sill and floor edge)
GAP_LIGHT = {'name': 'hero_gap', 'type': 'SPOT', 'energy': 900.0, 'spot_deg': 34.0, 'blend': 0.8, 'radius': 0.25,
             'color': (0.92, 0.95, 1.0)}


# ----------------------------------------------------------------------------------------------- arguments
def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    p = argparse.ArgumentParser(prog='render_v3.py', description=__doc__.split('\n')[0])
    p.add_argument('--out-dir', required=True)
    p.add_argument('--device', required=True, choices=('METAL', 'CPU'))
    p.add_argument('--engine', choices=('EEVEE', 'CYCLES'), default='EEVEE')
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--proof', action='store_true')
    p.add_argument('--times', default=None, help='comma list of film seconds (render-plate sections)')
    p.add_argument('--frames', default=None, help="film frame range 'a-b[:step]' (only 'render' plates are drawn)")
    p.add_argument('--all-render-frames', action='store_true', help='every per-frame plate of the film')
    p.add_argument('--stills', default=None, help="comma list of still names or 'all'")
    p.add_argument('--layers', action='store_true', help='RGBA live-car poster layers (strobe + fly-out)')
    p.add_argument('--layer-range', default=None,
                   help="restrict --layers to film frames: 'a-b', or a comma list of 'a-b' / 'k' items")
    p.add_argument('--source-match', default=None, help='comma list of SOURCE times ev for 16:9 compare renders')
    p.add_argument('--source-match-b', default=None,
                   help='comma list of SOURCE replay-B times (19.5-23.5 s) for 16:9 compare renders at camera B')
    p.add_argument('--source-match-el', default=None,
                   help='comma list of SOURCE times in the elevated wide (31-44 s) for 16:9 compare renders')
    p.add_argument('--proof-v4', action='store_true', help='v4 milestone-1 opening proof times (PROOF_V4_TIMES)')
    p.add_argument('--source-video', default=None, help='native reference video for compare sheets')
    p.add_argument('--skip-existing', action='store_true')
    p.add_argument('--format', choices=('PNG', 'JPEG'), default='PNG')
    p.add_argument('--volume-tile', choices=('1', '2', '4', '8', '16'), default='4')
    p.add_argument('--close-volume-tile', choices=('1', '2', '4', '8', '16'), default='2')
    p.add_argument('--volume-samples', type=int, default=96)
    p.add_argument('--raytrace', choices=('on', 'off'), default='on')
    p.add_argument('--bloom', choices=('on', 'off'), default='on')
    p.add_argument('--exposure', type=float, default=0.0)
    p.add_argument('--look', default=None)
    p.add_argument('--shadow-pool', default='1024')
    p.add_argument('--no-denoise', action='store_true')
    p.add_argument('--save-blend', default=None)
    p.add_argument('--dry-run', action='store_true')
    a = p.parse_args(argv)
    if a.engine == 'EEVEE' and a.device == 'CPU':
        p.error('EEVEE has no CPU device; use --engine CYCLES --device CPU for a CPU render')
    a.width, a.height = F.W_PX, F.H_PX
    jobs = []
    if a.proof:
        jobs += [('t', t) for t in PROOF_TIMES] + [('s', n) for n in PROOF_STILLS]
    if a.proof_v4:
        jobs += [('t', t) for t in PROOF_V4_TIMES]
    if a.times:
        jobs += [('t', float(t)) for t in a.times.split(',') if t.strip()]
    render_set = set(F.render_frames())
    if a.frames:
        rng, _, step = a.frames.partition(':')
        lo, _, hi = rng.partition('-')
        lo, hi, step = int(lo), int(hi or lo), int(step or 1)
        if not (0 <= lo <= hi < F.N_FRAMES) or step < 1:
            p.error('--frames must lie in 0-%d' % (F.N_FRAMES - 1))
        skipped = [k for k in range(lo, hi + 1, step) if k not in render_set]
        if skipped:
            print('ROADSTER_V3 note: %d frames in range are not per-frame plates (stills/poster/v2/black); skipped'
                  % len(skipped), flush=True)
        jobs += [('f', k) for k in range(lo, hi + 1, step) if k in render_set]
    if a.all_render_frames:
        jobs += [('f', k) for k in sorted(render_set)]
    if a.stills:
        names = list(F.STILLS) if a.stills == 'all' else [n.strip() for n in a.stills.split(',') if n.strip()]
        for n in names:
            if n not in F.STILLS:
                p.error('unknown still %s (have %s)' % (n, ', '.join(F.STILLS)))
        jobs += [('s', n) for n in names]
    if a.layers:
        lf = F.LAYER_FRAMES
        if a.layer_range:
            keep = set()
            for part in a.layer_range.split(','):
                lo, _, hi = part.strip().partition('-')
                keep.update(range(int(lo), int(hi or lo) + 1))
            lf = [k for k in lf if k in keep]
            if not lf:
                p.error('--layer-range %s selects no poster layer frame' % a.layer_range)
        jobs += [('l', k) for k in lf]
    if a.source_match:
        jobs += [('m', float(e)) for e in a.source_match.split(',') if e.strip()]
    if a.source_match_b:
        jobs += [('n', float(e)) for e in a.source_match_b.split(',') if e.strip()]
    if a.source_match_el:
        jobs += [('e', float(e)) for e in a.source_match_el.split(',') if e.strip()]
    if not jobs:
        p.error('nothing to render: give --proof, --proof-v4, --times, --frames, --all-render-frames, --stills, '
                '--layers or --source-match[-b|-el]')
    for kind, v in jobs:
        if kind == 't':
            t = v
            if not 0.0 <= t < F.DURATION:
                p.error('time %.3f outside 0-%g s' % (t, F.DURATION))
            if F.section_at(t)['plate'] not in ('render', 'hold'):
                p.error('t=%.2f is in a %s section (no per-frame plate); use --stills/--layers' % (
                    t, F.section_at(t)['plate']))
    a.jobs = jobs
    return a


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


# ----------------------------------------------------------------------------------------------- materials
def emission_material(name, color, strength):
    mat, nt, out = bs.new_material(name)
    em = nt.nodes.new('ShaderNodeEmission')
    bs.set_in(em, 'Color', bs.rgba(color))
    bs.set_in(em, 'Strength', strength)
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return mat


def sheet_group():
    """Shared node group 'v4_sheet': input S (ramp arc length, or a large negative value for surfaces without a
    trace), output Line = I * exp(-((Y - y_s) / w)^2) * (S < trace) + a brighter writing tip at S ~ trace.
    The Value nodes sheet_y / sheet_w / sheet_I / sheet_trace are set per frame (Scene3.set_sheet)."""
    ng = bpy.data.node_groups.new('v4_sheet', 'ShaderNodeTree')
    ng.interface.new_socket('S', in_out='INPUT', socket_type='NodeSocketFloat')
    ng.interface.new_socket('Line', in_out='OUTPUT', socket_type='NodeSocketFloat')
    nodes, links = ng.nodes, ng.links
    gi = nodes.new('NodeGroupInput')
    go = nodes.new('NodeGroupOutput')
    geo = nodes.new('ShaderNodeNewGeometry')
    sep = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], sep.inputs['Vector'])
    vals = {}
    for name, v in (('sheet_y', -1.06), ('sheet_w', 0.05), ('sheet_I', 0.0), ('sheet_trace', 1e3)):
        n = nodes.new('ShaderNodeValue')
        n.name = n.label = name
        n.outputs[0].default_value = v
        vals[name] = n.outputs[0]
    d = bs.math_node(ng, 'DIVIDE', bs.math_node(ng, 'SUBTRACT', sep.outputs['Y'], vals['sheet_y']), vals['sheet_w'])
    band = bs.math_node(ng, 'EXPONENT', bs.math_node(ng, 'MULTIPLY', bs.math_node(ng, 'MULTIPLY', d, d), -1.0))
    mask = bs.math_node(ng, 'LESS_THAN', gi.outputs['S'], vals['sheet_trace'])
    dt = bs.math_node(ng, 'DIVIDE', bs.math_node(ng, 'SUBTRACT', gi.outputs['S'], vals['sheet_trace']), 0.7)
    head = bs.math_node(ng, 'MULTIPLY', bs.math_node(ng, 'EXPONENT', bs.math_node(
        ng, 'MULTIPLY', bs.math_node(ng, 'MULTIPLY', dt, dt), -1.0)), SHEET['head_strength'])
    line = bs.math_node(ng, 'MULTIPLY', bs.math_node(ng, 'MULTIPLY', band, bs.math_node(ng, 'ADD', mask, head)),
                        vals['sheet_I'])
    links.new(line, go.inputs['Line'])
    return ng, {k: nodes[k] for k in vals}


def add_sheet_emission(mat, group, s_socket=None):
    """Route the sheet line into a material's Principled emission (cold white). s_socket: arc length (ramp UV v)."""
    nt = mat.node_tree
    pr = next((n for n in nt.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if pr is None:
        WARNINGS.append('%s: no Principled node; no sheet line' % mat.name)
        return
    g = nt.nodes.new('ShaderNodeGroup')
    g.node_tree = group
    if s_socket is not None:
        nt.links.new(s_socket, g.inputs['S'])
    else:
        g.inputs['S'].default_value = -1e3
    bs.set_in(pr, 'Emission Color', bs.rgba(SHEET['color']))
    nt.links.new(bs.math_node(nt, 'MULTIPLY', g.outputs['Line'], SHEET['line_strength']), pr.inputs['Emission Strength'])


def veil_material():
    """The sheet's glow in the haze: additive, brighter toward grazing views (a thin lit slab of haze looks brightest
    seen edge-on), faintly mottled, fading at the plane's borders. Not visible to other surfaces' rays."""
    mat, nt, out = bs.new_material('sheet_veil')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    bs.set_in(em, 'Color', bs.rgba(SHEET['veil_color']))
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    bs.set_in(lw, 'Blend', 0.5)
    face = lw.outputs['Facing']
    # proof02: the edge-on boost (was 0.18 + 2.4 f^3) made a wall of light beside the ramp in the source wide
    graze = bs.math_node(nt, 'ADD', 0.25, bs.math_node(nt, 'MULTIPLY', bs.math_node(nt, 'POWER', face, 3.0), 0.9))
    gen = nt.nodes.new('ShaderNodeTexCoord').outputs['Generated']
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(gen, sep.inputs['Vector'])
    fx = bs.math_node(nt, 'MULTIPLY', bs.math_node(nt, 'SUBTRACT', 1.0, bs.math_node(
        nt, 'ABSOLUTE', bs.math_node(nt, 'SUBTRACT', bs.math_node(nt, 'MULTIPLY', sep.outputs['X'], 2.0), 1.0))), 2.5)
    fz = bs.math_node(nt, 'MULTIPLY', bs.math_node(nt, 'SUBTRACT', 1.0, bs.math_node(
        nt, 'ABSOLUTE', bs.math_node(nt, 'SUBTRACT', bs.math_node(nt, 'MULTIPLY', sep.outputs['Z'], 2.0), 1.0))), 2.5)
    edge = bs.math_node(nt, 'MINIMUM', bs.math_node(nt, 'MINIMUM', fx, fz), 1.0)
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    mott = bs.math_node(nt, 'ADD', 0.55, bs.math_node(nt, 'MULTIPLY', bs.noise(nt, co, 0.35, 3.0, 0.55), 0.9))
    lvl = nt.nodes.new('ShaderNodeValue')
    lvl.name = lvl.label = 'veil_level'
    lvl.outputs[0].default_value = 0.0
    strength = bs.math_node(nt, 'MULTIPLY', bs.math_node(nt, 'MULTIPLY', bs.math_node(nt, 'MULTIPLY', graze, edge),
                                                         mott), bs.math_node(nt, 'MULTIPLY', lvl.outputs[0],
                                                                             SHEET['veil_strength']))
    nt.links.new(strength, em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tr.outputs['BSDF'], add.inputs[0])
    nt.links.new(em.outputs['Emission'], add.inputs[1])
    nt.links.new(add.outputs['Shader'], out.inputs['Surface'])
    for attr, v in (('surface_render_method', 'BLENDED'), ('use_transparent_shadow', True)):
        if hasattr(mat, attr):
            try:
                setattr(mat, attr, v)
            except Exception as e:  # noqa: BLE001
                WARNINGS.append('sheet_veil.%s: %s' % (attr, e))
    return mat, lvl


def concrete_material():
    """Ramp face: mottled pale concrete (darker patches and fine grain, as in the source), a white centre line from
    the face UV (u = metres across, centre at RAMP_W/2), satin roughness."""
    mat, nt, out = bs.new_material('ramp_concrete')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    uv = nt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'UVMap'
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    big = bs.noise(nt, co, 0.35, 3.0, 0.55)
    fine = bs.noise(nt, co, 7.0, 5.0, 0.6)
    mix = bs.math_node(nt, 'ADD', bs.math_node(nt, 'MULTIPLY', big, 0.7), bs.math_node(nt, 'MULTIPLY', fine, 0.3))
    base = bs.ramp(nt, mix, [(0.30, CONCRETE['dark']), (0.68, CONCRETE['light'])])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(uv.outputs['UV'], sep.inputs['Vector'])
    d = bs.math_node(nt, 'ABSOLUTE', bs.math_node(nt, 'SUBTRACT', sep.outputs['X'], R.RAMP_W / 2))
    line = bs.math_node(nt, 'LESS_THAN', d, 0.055)
    mixc = nt.nodes.new('ShaderNodeMix')
    mixc.data_type = 'RGBA'
    nt.links.new(line, mixc.inputs['Factor'])
    nt.links.new(base, mixc.inputs[6])
    mixc.inputs[7].default_value = bs.rgba(CONCRETE['line'])
    nt.links.new(mixc.outputs[2], b.inputs['Base Color'])
    rough = bs.ramp(nt, bs.noise(nt, co, 1.2, 3.0, 0.5), [(0.3, (0.70, 0.70, 0.70)), (0.75, (0.86, 0.86, 0.86))])
    nt.links.new(rough, b.inputs['Roughness'])
    bs.set_in(b, 'Specular IOR Level', 0.35)
    bump = nt.nodes.new('ShaderNodeBump')
    bs.set_in(bump, 'Strength', 0.25)
    bs.set_in(bump, 'Distance', 0.01)
    nt.links.new(bs.noise(nt, co, 40.0, 2.0, 0.5), bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def floor_material():
    """Venue floor: near-black sealed asphalt with a faint wet sheen (reflects the red rows and floods). proof02: the
    roughness varied 0.18-0.42 in blotches, so the lit ramp's reflection read as smoke from high angles; now an even
    soft sheen."""
    mat, nt, out = bs.new_material('venue_floor')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    n = bs.noise(nt, co, 0.12, 3.0, 0.5)
    nt.links.new(bs.ramp(nt, n, [(0.3, (0.012, 0.012, 0.013)), (0.75, (0.035, 0.035, 0.037))]), b.inputs['Base Color'])
    nt.links.new(bs.ramp(nt, bs.noise(nt, co, 0.5, 2.0, 0.5), [(0.3, (0.34, 0.34, 0.34)), (0.8, (0.44, 0.44, 0.44))]),
                 b.inputs['Roughness'])
    bs.set_in(b, 'Specular IOR Level', 0.42)
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def section_material():
    """Cut face of the slab (cross-section shots only): dark matte concrete with a faint mottle, so the driving
    surface reads as a crisp line along its top edge."""
    mat, nt, out = bs.new_material('ramp_section')
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    co = nt.nodes.new('ShaderNodeTexCoord').outputs['Object']
    lo = tuple(c * 0.8 for c in SECTION_FACE)
    nt.links.new(bs.ramp(nt, bs.noise(nt, co, 2.5, 4.0, 0.55), [(0.3, lo), (0.7, SECTION_FACE)]), b.inputs['Base Color'])
    bs.set_in(b, 'Roughness', 0.92)
    bs.set_in(b, 'Specular IOR Level', 0.2)
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def tune(mat, values):
    pr = next((n for n in mat.node_tree.nodes if n.bl_idname == 'ShaderNodeBsdfPrincipled'), None)
    if pr is None:
        WARNINGS.append('%s: no Principled node; v3 tuning skipped' % mat.name)
        return
    for k, v in values.items():
        bs.set_in(pr, k, v)


def emission_node(mat):
    return next(n for n in mat.node_tree.nodes if n.bl_idname == 'ShaderNodeEmission')


def build_v3_materials():
    mats = rf.build_film_materials(bs.build_materials())
    tune(mats['paint'], CAR_PAINT_V3)
    tune(mats['underbody'], UNDERBODY_V3)
    mats['ramp_concrete'] = concrete_material()
    group, sheet_vals = sheet_group()
    cnt = mats['ramp_concrete'].node_tree
    uv = cnt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'UVMap'
    sep = cnt.nodes.new('ShaderNodeSeparateXYZ')
    cnt.links.new(uv.outputs['UV'], sep.inputs['Vector'])
    add_sheet_emission(mats['ramp_concrete'], group, sep.outputs['Y'])      # UV v = arc length s
    add_sheet_emission(mats['paint'], group)          # the cut runs across the car body as the plane passes through it
    mats['_sheet_vals'] = sheet_vals
    mats['neon_white'] = emission_material('neon_white', NEON_WHITE['color'], NEON_WHITE['strength'])
    mats['neon_white_far'] = emission_material('neon_white_far', NEON_WHITE['color'], NEON_WHITE['strength'])
    mats['sheet_veil'], mats['_veil_level'] = veil_material()
    mats['ramp_section'] = section_material()
    mats['ramp_side'] = bs.principled('ramp_side', base=(0.05, 0.05, 0.055), rough=0.7)
    mats['ramp_back'] = bs.principled('ramp_back', base=(0.03, 0.03, 0.033), metallic=0.5, rough=0.5)
    mats['lattice'] = bs.principled('lattice', base=(0.07, 0.072, 0.078), metallic=0.85, rough=0.38)
    mats['neon_red'] = emission_material('neon_red', NEON['color'], NEON['strength'])
    mats['neon_far'] = emission_material('neon_far', NEON['color'], NEON['strength'])
    mats['red_rows'] = emission_material('red_rows', RED_ROWS['color'], RED_ROWS['strength'])
    mats['paint_line'] = bs.principled('paint_line', base=PAINT['color'], rough=0.6,
                                       emission=PAINT['color'], emission_strength=PAINT['glow'])
    mats['venue_floor'] = floor_material()
    mats['lamp_disc'] = emission_material('lamp_disc', (1.0, 0.98, 0.95), LAMP_DISC)
    return mats


# set emission driven per frame by v3_film's section look: material -> (look key, base strength)
SET_EMISSION = {'neon_red': ('neon', NEON['strength']), 'neon_far': ('neon_far', NEON['strength']),
                'red_rows': ('rows', RED_ROWS['strength']), 'lamp_disc': ('lamps', LAMP_DISC),
                'neon_white': ('neon', NEON_WHITE['strength']), 'neon_white_far': ('neon_far', NEON_WHITE['strength'])}


# ----------------------------------------------------------------------------------------------- ramp + venue
def ramp_mesh(y_cut=None):
    """Slab swept along the fitted profile: driving face (UV u across in metres from the near edge, v along), back,
    sides, lip end. y_cut: cross-section variant, the slab spans y_cut..+W/2 and the cut face is 'ramp_section'."""
    m = Mesh()
    W, T = R.RAMP_W, R.SLAB_T
    y0 = -W / 2 if y_cut is None else y_cut
    n_s, n_w = 220, 8
    s0, s1 = -R.RUNIN, R.S_LIP
    rows_top, rows_bot = [], []
    ys = [y0 + (W / 2 - y0) * j / n_w for j in range(n_w + 1)]
    for i in range(n_s + 1):
        s = s0 + (s1 - s0) * i / n_s
        p, _, nrm, _ = R.surface_frame(s)
        t = T if s > 0.0 else 0.02
        top = [m.add_vert((p[0], y, p[2])) for y in ys]
        back = R.sub(p, R.mul(nrm, t)) if s > 0.0 else (p[0], 0.0, p[2] - 0.02)
        bot = [m.add_vert((back[0], y, back[2])) for y in ys]
        rows_top.append((top, s))
        rows_bot.append(bot)
    near = 'ramp_side' if y_cut is None else 'ramp_section'
    for i in range(n_s):
        (a, sa), (b, sb) = rows_top[i], rows_top[i + 1]
        for j in range(n_w):
            u0, u1 = ys[j] + W / 2, ys[j + 1] + W / 2
            m.add_face((a[j], a[j + 1], b[j + 1], b[j]), 'ramp_concrete', ((u0, sa), (u1, sa), (u1, sb), (u0, sb)))
        c, d = rows_bot[i], rows_bot[i + 1]
        for j in range(n_w):
            m.add_face((c[j], d[j], d[j + 1], c[j + 1]), 'ramp_back')
        m.add_face((a[0], b[0], d[0], c[0]), near)
        m.add_face((a[-1], c[-1], d[-1], b[-1]), 'ramp_side')
    a, c = rows_top[-1][0], rows_bot[-1]
    for j in range(n_w):
        m.add_face((a[j], c[j], c[j + 1], a[j + 1]), 'ramp_side')
    return m


def neon_mesh(sides=(-1, 1), mat='neon_red', s_from=0.0, s_to=None):
    """Edge neon tube on the surface along the local normal, between arc lengths s_from..s_to (v4: the source shows
    the lower part of both edges white and the upper part red, so the edge is built as two runs)."""
    m = Mesh()
    s_to = R.S_LIP if s_to is None else s_to
    n = max(8, int((s_to - s_from) / 0.12))
    ss = [s_from + (s_to - s_from) * k / n for k in range(n + 1)]
    for side in sides:
        y = side * (R.RAMP_W / 2 - 0.04)
        tube_pts = []
        for s_ in ss:
            p, _, nrm, _ = R.surface_frame(s_)
            tube_pts.append(R.add((p[0], y, p[2]), R.mul(nrm, 0.035)))
        m.extend(geom.tube(tube_pts, 0.032, 10, mat))
    return m


def lattice_mesh():
    """Dark steel structure from v3_film.truss_lines (shared with the previz): a lattice tower behind the wall and a
    gantry truss over the level deck out past its free end, hangers holding the deck; red edge light along the
    gantry's top chords (source: red light along the top)."""
    m = Mesh()
    for a, b, r in F.truss_lines():
        m.extend(geom.cylinder_between(a, b, r, 8 if r >= 0.06 else 6, 'lattice'))
    W2 = R.RAMP_W / 2 + 0.15
    xs = max(R.profile(R.S_LIP * k / 300)[0] for k in range(301)) + R.SLAB_T + 0.45
    z_top = R.DECK_H + R.SLAB_T + 0.95 + 1.55
    for y in (-W2, W2):
        m.extend(geom.tube([(xs + 2.1, y, z_top + 0.09), (R.LIP[0] - 0.6, y, z_top + 0.09)], 0.035, 8, 'neon_red'))
    return m


def floor_neon_mesh():
    """Red light outline on the floor around the curve and tower footprint, open toward the run-in (source: elevated
    wide at 34/44 s, the red lines frame the base from the foot of the curve back past the tower; proof01 compare)."""
    m = Mesh()
    xs = max(R.profile(R.S_LIP * k / 300)[0] for k in range(301)) + R.SLAB_T + 0.45
    x0, x1, y0 = 0.0, xs + 2.1 + 1.4, R.RAMP_W / 2 + 1.1
    pts = [(x0, -y0, 0.04), (x1, -y0, 0.04), (x1, y0, 0.04), (x0, y0, 0.04)]
    for a, b in zip(pts[:-1], pts[1:]):
        m.extend(geom.tube([a, b], 0.03, 6, 'red_rows', caps=False))
    return m


def veil_mesh():
    """Unit plane in x-z (generated coords 0..1 across), placed per frame on the sheet plane y = sheet_y."""
    m = Mesh()
    x0, x1, z0, z1 = -10.0, 11.0, -0.2, 18.6      # the ramp's neighbourhood only (no frame-wide milky plane)
    a, b, c, d = (m.add_vert((x0, 0.0, z0)), m.add_vert((x1, 0.0, z0)), m.add_vert((x1, 0.0, z1)),
                  m.add_vert((x0, 0.0, z1)))
    m.add_face((a, b, c, d), 'sheet_veil')
    return m


def venue_mesh():
    m = Mesh()
    # Separate the floor from the flat run-in at z=0; coplanar faces produced triangular depth flicker.
    m.extend(geom.box((0.0, 0.0, -0.056), (420.0, 420.0, 0.1), 'venue_floor'))
    for ang in (31.0, -31.0):       # two long white lines crossing in front of the ramp (elevated wide, 31–44 s)
        L = 160.0
        a = math.radians(ang)
        m.extend(geom.box((-14.0, 0.0, 0.004), (L, 0.16, 0.008), 'paint_line', rot_z=a))
    m.extend(geom.box((-36.0, 26.0, 0.12), (52.0, 0.10, 0.10), 'red_rows'))     # long floor strip (wide shot, left)
    for k in range(3):     # low barrier rows far back (source: subdued, near the floor; proof-01 rows read as lasers)
        m.extend(geom.box((-18.0 + 7.0 * k, 74.0 + 2.5 * k, 0.6 + 0.55 * k), (34.0, 0.07, 0.07), 'red_rows'))
    for x, y in ((-22.0, 30.0), (-9.0, 34.0), (-30.0, 12.0), (12.0, 40.0)):       # flood heads seen as white points
        m.extend(geom.box((x, y, 4.5), (0.35, 0.35, 0.35), 'lamp_disc'))
    return m


def mesh_object(name, mesh, mats, col, smooth=True, sharp=None):
    return bs.mesh_object(name, mesh, mats, col, smooth=smooth, sharp_deg=sharp)


# ----------------------------------------------------------------------------------------------- lights
def make_lights(col, specs, hero=False):
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
        setattr_checked(ld, 'light', 'volume_factor', float(spec.get('volume', 0.0)))   # haze: designated lights only
        o = bpy.data.objects.new(spec['name'], ld)
        col.objects.link(o)
        o.visible_camera = False
        if 'location' in spec:
            o.matrix_world = bs.point_matrix(spec['location'], spec['target'])
        if spec.get('no_shadow'):
            setattr_checked(ld, 'light', 'use_shadow', False)
        if spec.get('glossy_only'):
            for name in ('diffuse_factor', 'volume_factor', 'transmission_factor'):
                if hasattr(ld, name):
                    setattr_checked(ld, 'light', name, 0.0)
            for name in ('visible_diffuse', 'visible_transmission', 'visible_volume_scatter'):
                if hasattr(o, name):
                    setattr_checked(o, 'light object', name, False)
        if hero:
            o.hide_render = True
        out.append(o)
    return out


def link_lights(lights, receivers, name):
    coll = bpy.data.collections.new(name)
    for o in receivers:
        if o.name not in coll.objects:
            coll.objects.link(o)
    linked = 0
    for o in lights:
        ll = getattr(o, 'light_linking', None)
        if ll is None or not hasattr(ll, 'receiver_collection'):
            WARNINGS.append('light linking unavailable on %s' % o.name)
            continue
        try:
            ll.receiver_collection = coll
            linked += 1
        except Exception as e:  # noqa: BLE001
            WARNINGS.append('light linking on %s failed: %s' % (o.name, e))
    return {'linked_lights': linked, 'receivers': len(coll.objects)}


def strip_matrix(pos, target, axis):
    z = (Vector(pos) - Vector(target)).normalized()
    x = Vector(axis)
    x = (x - z * x.dot(z))
    if x.length < 1e-6:
        x = Vector((1.0, 0.0, 0.0))
    x.normalize()
    y = z.cross(x)
    return Matrix(((x.x, y.x, z.x, pos[0]), (x.y, y.y, z.y, pos[1]), (x.z, y.z, z.z, pos[2]), (0, 0, 0, 1)))


def drive_lamp_by_object_red(mat):
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


def build_haze(scene):
    """World volume (v4): a thin haze in which designated lights (spec 'volume') draw beams. Returns {density socket,
    link state}; the volume is linked to the world output only while a section's look asks for haze (an unlinked
    world volume costs nothing and cannot show froxel patterns). None if this Blender's world tree refuses it."""
    try:
        nt = scene.world.node_tree
        out = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeOutputWorld')
        vol = nt.nodes.new('ShaderNodeVolumePrincipled')
        bs.set_in(vol, 'Color', bs.rgba(HAZE['color']))
        bs.set_in(vol, 'Anisotropy', HAZE['anisotropy'])
        bs.set_in(vol, 'Density', 0.0)
        setattr_checked(scene.eevee, 'eevee', 'use_volumetric_shadows', True)
        return {'density': vol.inputs['Density'], 'nt': nt, 'src': vol.outputs['Volume'], 'dst': out.inputs['Volume'],
                'link': None}
    except Exception as e:  # noqa: BLE001 - recorded; renders continue without haze
        WARNINGS.append('haze setup failed: %s' % e)
        return None


# ----------------------------------------------------------------------------------------------- the film scene
class Scene3:
    def __init__(self, args):
        self.args = args
        scene = bpy.context.scene
        self.scene = scene
        for o in list(scene.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        self.device = rf.setup_engine(scene, args)
        self.look = apply_look(scene, args.look)
        scene.view_settings.exposure = args.exposure
        if args.engine == 'EEVEE':
            setattr_checked(scene.eevee, 'eevee', 'shadow_pool_size', args.shadow_pool)
        col = bpy.data.collections.new('roadster_v3')
        scene.collection.children.link(col)
        rf.XRAY_LOOK.update(XRAY_LOOK)
        rf.VESSEL_LOOK.update(VESSEL_LOOK)
        rf.BLOOM.update(BLOOM)
        mats = build_v3_materials()
        self.lamp_driven = drive_lamp_by_object_red(mats['lamp_red'])
        self.mats = mats
        self.rig, self.plumes = bs.build_car(col, mats)
        self.car_parts = [o for o in self.rig.children if o not in self.plumes.values()]
        self.wheels = {}
        for o in self.car_parts:
            if o.name.startswith('car_wheel_') and o.name.endswith('_rot'):
                n = o.name.split('_')[2]
                self.wheels[n] = (o, dict((w[0], w[1]) for w in roadster.wheel_placements())[n])
        self.ramp = mesh_object('ramp', ramp_mesh(), mats, col, smooth=True, sharp=50.0)
        self.ramp_cut = mesh_object('ramp_cut', ramp_mesh(F.CUT_Y), mats, col, smooth=True, sharp=50.0)
        sw = F.LOOK_BASE['neon_white']          # source: white lower run, red upper run on both edges
        near = neon_mesh((-1,), 'neon_white', 0.0, sw)
        near.extend(neon_mesh((-1,), 'neon_red', sw, R.S_LIP))
        far = neon_mesh((1,), 'neon_white_far', 0.0, sw)
        far.extend(neon_mesh((1,), 'neon_far', sw, R.S_LIP))
        self.neon = mesh_object('ramp_neon', near, mats, col, smooth=True)
        self.neon_far = mesh_object('ramp_neon_far', far, mats, col, smooth=True)
        self.lattice = mesh_object('ramp_lattice', lattice_mesh(), mats, col, smooth=True, sharp=40.0)
        venue = venue_mesh()
        venue.extend(floor_neon_mesh())
        self.venue = mesh_object('venue', venue, mats, col, smooth=False)
        self.veil = mesh_object('sheet_veil', veil_mesh(), mats, col, smooth=False)
        for attr in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter',
                     'visible_shadow'):
            if hasattr(self.veil, attr):
                setattr(self.veil, attr, False)
        self.veil.hide_render = True
        self.veil_level = mats['_veil_level']
        self.sheet_vals = mats['_sheet_vals']
        self.set_objects = [self.ramp, self.ramp_cut, self.neon, self.neon_far, self.lattice, self.venue]
        self.ramp_parts = (self.ramp, self.ramp_cut, self.neon, self.neon_far)
        self.emission = {name: emission_node(mats[name]) for name in SET_EMISSION}
        self.cut = None
        sm = bs.sphere_mesh('cloud')
        self.clouds = []
        for k in range(len(R.CLOUD_PUFFS)):
            o = bs.mesh_object('cloud_%d' % k, sm, mats, col, smooth=True, sharp_deg=None)
            o.hide_render = True
            self.clouds.append(o)
        self.venue_lights = make_lights(col, VENUE_LIGHTS)
        self.hero = make_lights(col, HERO_LIGHTS, hero=True)
        self.gap_light = make_lights(col, [GAP_LIGHT], hero=True)[0]
        self.follow = make_lights(col, [FOLLOW])[0]
        self.uplights = make_lights(col, UPLIGHTS)
        heads = [dict(HEADLIGHT, name='headlight_%d' % i, type='SPOT', location=(0.0, 0.0, 0.0), target=(1.0, 0.0, 0.0))
                 for i in range(2)]
        self.headlights = make_lights(col, heads)
        self.base_energy = {o.name: o.data.energy for o in self.venue_lights + self.hero + [self.gap_light, self.follow]
                            + self.uplights + self.headlights}
        self.venue_lights_by_name = {o.name: o for o in self.venue_lights}
        bs.build_world(scene)
        self.haze = build_haze(scene)
        self.cam = rf.film_camera(col)
        scene.camera = self.cam
        self.vessels = rf.vessel_objects(col, mats, self.rig)
        self.bloom = rf.setup_bloom(scene, args.bloom == 'on')
        self.hero_linked = link_lights(self.hero, list(self.rig.children), 'v3_hero_receivers')
        self.tile = None

    # ---- per item
    def set_volume_tile(self, close):
        if self.args.engine != 'EEVEE':
            return
        tile = self.args.close_volume_tile if close else self.args.volume_tile
        if tile != self.tile:
            setattr_checked(self.scene.eevee, 'eevee', 'volumetric_tile_size', tile)
            self.tile = tile

    def set_layer_mode(self, mode):
        """mode None: full picture; 'car': RGBA car (+plumes) only, ramp as holdout; 'bg': set without car;
        'cloud': RGBA cloud only."""
        sc = self.scene
        rgba = mode in ('car', 'cloud')
        sc.render.film_transparent = rgba
        sc.render.image_settings.color_mode = 'RGBA' if rgba else 'RGB'
        for o in self.set_objects:
            o.hide_render = mode in ('cloud',) or (mode == 'car' and o not in self.ramp_parts)
            if hasattr(o, 'is_holdout'):
                o.is_holdout = (mode == 'car' and o in self.ramp_parts)
        return rgba

    def set_cut(self, cut, mode):
        """Cross-section mode (full pictures only): the full slab and the near neon give way to the cut slab. Called
        after set_layer_mode; poster layers and stills never cut, the cloud layer shows no set at all."""
        cut = bool(cut) and mode is None
        if mode != 'cloud':
            self.ramp.hide_render = cut
            self.neon.hide_render = cut
        self.ramp_cut.hide_render = not cut
        self.cut = cut

    def set_look(self, look):
        for name, (key, base) in SET_EMISSION.items():
            bs.set_in(self.emission[name], 'Strength', base * look.get(key, 1.0))
        self.scene.view_settings.exposure = self.args.exposure + look.get('exposure', 0.0)
        o = self.venue_lights_by_name.get('flood_land')
        if o is not None:
            o.data.energy = self.base_energy['flood_land'] * look.get('venue', 1.0) * look.get('land', 1.0)
        hz = self.haze
        if hz is not None:
            density = HAZE['density'] * look.get('haze', 0.0)
            hz['density'].default_value = density
            if density > 0.0 and hz['link'] is None:
                hz['link'] = hz['nt'].links.new(hz['src'], hz['dst'])
            elif density <= 0.0 and hz['link'] is not None:
                hz['nt'].links.remove(hz['link'])
                hz['link'] = None
        for o in self.uplights:
            lv = look.get('uplights', 0.0)
            o.data.energy = self.base_energy[o.name] * lv
            o.hide_render = lv <= 0.001

    def set_sheet(self, look, layer):
        on = look.get('sheet', 0.0) if layer is None else 0.0
        v = self.sheet_vals
        v['sheet_I'].outputs[0].default_value = on
        v['sheet_y'].outputs[0].default_value = look.get('sheet_y', F.CUT_Y)
        v['sheet_w'].outputs[0].default_value = look.get('sheet_w', 0.05)
        v['sheet_trace'].outputs[0].default_value = look.get('sheet_trace', 1e3)
        veil = look.get('sheet_veil', 0.0) * (1.0 if layer is None else 0.0)
        self.veil_level.outputs[0].default_value = veil
        self.veil.hide_render = veil <= 0.001
        self.veil.location = (0.0, look.get('sheet_y', F.CUT_Y), 0.0)

    def apply(self, fr, layer=None):
        st = fr.rs
        self.rig.matrix_world = Matrix(st.car)
        alpha = 1.0 - fr.xray
        show_car = fr.car_visible and layer not in ('bg', 'cloud')
        for o in self.car_parts:
            o.hide_render = not show_car
            o.color = (fr.lamp, 1.0, 1.0, alpha)
        for n, (o, c) in self.wheels.items():
            c = Vector(c)
            o.matrix_basis = Matrix.Translation(c) @ Matrix.Rotation(st.wheel_angle, 4, 'Y') @ Matrix.Translation(-c)
        X, Y, Z = R.axes(st.car)
        levels = {}
        for name, o in self.plumes.items():
            lv = st.plume_vis.get(name, 0.0) if (show_car or layer == 'car') else 0.0
            d = R.FLIGHT_DIRS.get(name, roadster.NOZZLES[name][1])
            sc = st.plume_scale.get(name, 1.0)
            o.matrix_basis = rf.plume_basis(roadster.NOZZLES[name][0], d) @ Matrix.Diagonal(
                (1.0 + 0.22 * (sc - 1.0), 1.0 + 0.22 * (sc - 1.0), sc, 1.0))
            levels[name] = lv if layer != 'bg' and layer != 'cloud' else 0.0
        bs.set_plumes(self.plumes, levels, True)
        clouds = st.clouds if layer in (None, 'cloud') else []
        if layer == 'car':
            clouds = []
        bs.set_clouds(self.clouds, clouds)
        self.set_volume_tile(fr.camera['lens_mm'] >= 30.0 and fr.section not in ('evidence', 'freeze'))
        for o in self.vessels:
            o.hide_render = fr.vessels <= 0.002 or not show_car
            o.color = (1.0, 1.0, 1.0, fr.vessels)
        venue = fr.lights.get('venue', 1.0)
        for o in self.venue_lights:
            o.data.energy = self.base_energy[o.name] * venue
            o.hide_render = venue <= 0.001
        hero = fr.lights.get('hero', 0.0)
        rig = fr.hero_rig or {}
        for o in self.hero:
            spec = rig.get(o.name)
            on = hero > 0.001 and spec is not None and show_car
            o.hide_render = not on
            if on:
                if o.data.type == 'AREA':
                    o.matrix_world = strip_matrix(spec[0], spec[1], rig.get('strip_axis', X))
                else:
                    o.matrix_world = bs.point_matrix(spec[0], spec[1])
                o.data.energy = self.base_energy[o.name] * hero
        look = getattr(fr, 'look', None) or F.section_look(None)
        self.set_cut(look['cut'], layer)
        self.set_look(look)
        self.set_sheet(look, layer)
        # the source's follow-spot on the climbing car, and the car's own headlights (beams in the haze)
        fo = self.follow
        fl = look.get('follow', 0.0) if show_car else 0.0
        fo.hide_render = fl <= 0.001
        if not fo.hide_render:
            fo.matrix_world = bs.point_matrix(FOLLOW['location'], st.com)
            fo.data.energy = self.base_energy[fo.name] * fl
        hb = look.get('beams', 0.0) if show_car else 0.0
        for o, lp in zip(self.headlights, HEADLIGHT['local']):
            o.hide_render = hb <= 0.001
            if not o.hide_render:
                pos = R.xf(st.car, lp)
                aim = R.add(pos, R.xd(st.car, HEADLIGHT['aim']))
                o.matrix_world = bs.point_matrix(pos, aim)
                o.data.energy = self.base_energy[o.name] * hb
        g = self.gap_light
        gap_on = look['gap'] > 0.001 and 'hero_gap' in rig and show_car and self.cut
        g.hide_render = not gap_on
        if gap_on:
            g.matrix_world = bs.point_matrix(rig['hero_gap'][0], rig['hero_gap'][1])
            g.data.energy = self.base_energy[g.name] * look['gap']
        cam = fr.camera
        r_, u_, f_ = F.basis(cam)          # roll-aware (source-matched cameras carry a fitted roll)
        e_ = cam['eye']
        self.cam.matrix_world = Matrix(((r_[0], u_[0], -f_[0], e_[0]), (r_[1], u_[1], -f_[1], e_[1]),
                                        (r_[2], u_[2], -f_[2], e_[2]), (0.0, 0.0, 0.0, 1.0)))
        self.cam.data.lens = cam['lens_mm']
        dof = self.cam.data.dof
        dof.use_dof = bool(cam.get('fstop'))
        if dof.use_dof:
            dof.focus_distance = cam['focus_m']
            dof.aperture_fstop = cam['fstop']

    def set_resolution(self, w, h):
        self.scene.render.resolution_x, self.scene.render.resolution_y = w, h


# ----------------------------------------------------------------------------------------------- source match
def replay_ev(r):
    r0, e0, k = F.RB_SOURCE
    return e0 + (r - r0) * k


def source_match_state(ev, which):
    fr = F.V3Frame(0.0)
    fr.section = 'srcmatch'
    fr.ev = ev
    fr.rs = F.car_at(ev)
    fr.car = fr.rs.car
    if which == 'wide':
        fr.camera = F.cam_wide(ev, portrait=False)
    elif which == 'elev':
        fr.camera = dict(F.SRC_ELEV)
    else:
        fr.camera = F.cam_replay_b(ev, portrait=False)
    fr.look = F.section_look('evidence' if which in ('wide', 'elev') else 'jets')
    fr.lights = {'venue': 1.0, 'hero': 0.0}
    return fr


def extract_source(video, ev, path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '%.3f' % ev, '-i', video, '-frames:v', '1', path], check=True)


def compare_sheet(render_path, source_path, out_path):
    """Side by side (source | render) plus a 50 % blend below, 960 px wide each."""
    import numpy as np

    def load(p):
        img = bpy.data.images.load(p, check_existing=False)
        w, h = img.size
        a = np.empty(w * h * img.channels, dtype=np.float32)
        img.pixels.foreach_get(a)
        a = a.reshape(h, w, img.channels)[:, :, :3]
        bpy.data.images.remove(img)
        return a

    src, ren = load(source_path), load(render_path)
    h, w = 540, 960

    def fit(a):
        ys = (np.arange(h) * a.shape[0] / h).astype(int)
        xs = (np.arange(w) * a.shape[1] / w).astype(int)
        return a[ys][:, xs]

    s, r = fit(src), fit(ren)
    sheet = np.zeros((2 * h, 2 * w, 3), dtype=np.float32)
    sheet[h:, :w] = s       # (pixels are bottom-up) top row in the saved image: source | render
    sheet[h:, w:] = r
    sheet[:h, :w] = 0.5 * s + 0.5 * r
    sheet[:h, w:] = np.clip(np.abs(s - r) * 2.0, 0, 1)
    img = bpy.data.images.new('compare', 2 * w, 2 * h, alpha=False)
    rgba = np.ones((2 * h, 2 * w, 4), dtype=np.float32)
    rgba[:, :, :3] = sheet
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = out_path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)


# ----------------------------------------------------------------------------------------------- main
def stem_of(kind, v):
    return {'t': 't%06.3f' % v if kind == 't' else None, 'f': 'f%05d' % v if kind == 'f' else None,
            's': str(v), 'l': 'f%05d' % v if kind == 'l' else None, 'm': 'ev%06.3f' % v if kind == 'm' else None,
            'n': 'rb%06.3f' % v if kind == 'n' else None, 'e': 'el%06.3f' % v if kind == 'e' else None}[kind]


def main():
    t_start = time.perf_counter()
    args = parse_args()
    out_dir = os.path.abspath(args.out_dir)
    for sub in ('frames', 'stills', 'layers', 'srcmatch'):
        os.makedirs(os.path.join(out_dir, sub), exist_ok=True)
    sc3 = Scene3(args)
    build_s = time.perf_counter() - t_start
    print('ROADSTER_V3 build %.1fs, engine %s, look %s, device %s, bloom %s, hero linking %s' % (
        build_s, sc3.scene.render.engine, sc3.look, sc3.device, sc3.bloom.get('status', 'off'), sc3.hero_linked),
        flush=True)
    ext = '.png' if args.format == 'PNG' else '.jpg'
    records, backend_checked, gpu_info = [], False, None
    for kind, v in args.jobs:
        stem = stem_of(kind, v)
        layer = None
        if kind in ('t', 'f'):
            t = v / F.FPS if kind == 'f' else v
            fr = F.state(t)
            path = os.path.join(out_dir, 'frames', stem + ext)
            sc3.set_resolution(F.W_PX, F.H_PX)
        elif kind == 's':
            fr = F.still_state(v)
            layer = getattr(fr, 'layer', None)
            path = os.path.join(out_dir, 'stills', stem + '.png')
            if F.STILLS[v]['shot'] == 'POSTER':
                sc3.set_resolution(F.POSTER_W, F.POSTER_H)
            else:
                sc3.set_resolution(F.W_PX, F.H_PX)
        elif kind == 'l':
            t = v / F.FPS
            fr = F.state(t)
            fr.camera = F.POSTER_CAM
            layer = 'car'
            path = os.path.join(out_dir, 'layers', stem + '.png')
            sc3.set_resolution(F.POSTER_W, F.POSTER_H)
        else:   # source match (16:9): 'm' wide at source time ev; 'n' replay B at replay time r; 'e' elevated wide
            if kind == 'e':
                fr = source_match_state(v - F.SRC_ELEV_EV, 'elev')
            else:
                fr = source_match_state(v if kind == 'm' else replay_ev(v), 'wide' if kind == 'm' else 'replay')
            path = os.path.join(out_dir, 'srcmatch', stem + '.png')
            sc3.set_resolution(1920, 1080)
        if args.skip_existing and os.path.isfile(path):
            continue
        rgba = sc3.set_layer_mode(layer)
        if rgba or kind in ('s', 'l', 'm', 'n', 'e') or kind == 't':
            sc3.scene.render.image_settings.file_format = 'PNG'
        sc3.apply(fr, layer)
        rec = {'kind': kind, 'id': v, 'file': os.path.relpath(path, out_dir), 'section': fr.section,
               'ev': None if fr.ev is None else round(fr.ev, 4), 'layer': layer,
               'camera': {'eye': [round(x, 3) for x in fr.camera['eye']], 'target': [round(x, 3) for x in fr.camera['target']],
                          'lens_mm': round(fr.camera['lens_mm'], 3)},
               'lights': fr.lights, 'jets': {k: round(x, 3) for k, x in fr.rs.jets.items() if x > 0.001},
               'clouds': len(fr.rs.clouds)}
        if not args.dry_run:
            sc3.scene.render.filepath = path
            t0 = time.perf_counter()
            bpy.ops.render.render(write_still=True)
            rec['render_seconds'] = round(time.perf_counter() - t0, 3)
            if not backend_checked and args.engine == 'EEVEE':
                gpu_info = rf.gpu_backend()
                backend_checked = True
                if args.device == 'METAL' and str(gpu_info.get('backend')).upper() != 'METAL':
                    raise RuntimeError('--device METAL requested but EEVEE rendered on %r; stopping' % gpu_info)
            print('ROADSTER_V3 rendered %s (%s, ev %s) in %.2fs' % (rec['file'], fr.section, rec['ev'],
                                                                   rec['render_seconds']), flush=True)
            if kind in ('m', 'n', 'e') and args.source_video:
                src = os.path.join(out_dir, 'srcmatch', 'source_%s.png' % stem)
                try:
                    extract_source(os.path.abspath(args.source_video), v, src)
                    compare_sheet(path, src, os.path.join(out_dir, 'srcmatch', 'compare_%s.png' % stem))
                    rec['compare'] = 'srcmatch/compare_%s.png' % stem
                except Exception as e:  # noqa: BLE001 - recorded; the render stays
                    WARNINGS.append('compare %s failed: %s' % (stem, e))
        records.append(rec)
    if args.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save_blend), copy=True)
    stamp = time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
    manifest = {
        'tool': 'blender/render_v3.py', 'blender_version': bpy.app.version_string,
        'argv': sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [],
        'cues_sha256': __import__('hashlib').sha256(open(F.CUES_PATH, 'rb').read()).hexdigest(),
        'timing_measured': F.TIMING is not None, 'device': sc3.device, 'gpu_backend_after_first_render': gpu_info,
        'render': {'engine': sc3.scene.render.engine, 'samples': args.samples, 'volume_tile': args.volume_tile,
                   'close_volume_tile': args.close_volume_tile, 'volume_samples': args.volume_samples,
                   'raytrace': args.raytrace, 'exposure': args.exposure, 'look': sc3.look},
        'bloom': sc3.bloom, 'hero_light_linking': sc3.hero_linked, 'scene_build_seconds': round(build_s, 2),
        'total_seconds': round(time.perf_counter() - t_start, 2), 'dry_run': args.dry_run, 'items': records,
        'warnings': WARNINGS,
        'status': 'v3 plates (picture only). Ramp/car reconstructed from source frames (fit, not measured); '
                  'explanatory stills are schematic.'}
    path = os.path.join(out_dir, 'manifest_%s.json' % stamp)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=1, ensure_ascii=False)
    print('ROADSTER_V3 done %.1fs, %d items, %d warnings -> %s' % (manifest['total_seconds'], len(records),
                                                                   len(WARNINGS), path), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('ROADSTER_V3_FAILED\n' + traceback.format_exc(), file=sys.stderr, flush=True)
        raise
