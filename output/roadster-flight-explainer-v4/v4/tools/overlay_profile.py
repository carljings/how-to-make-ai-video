"""overlay_profile.py: draw a candidate ramp profile (both neon edges, deck end, arc/deck junction) over a native
source frame through a given camera, for visual fitting.

    python3 -I v4/tools/overlay_profile.py FRAME.jpg OUT.png ARCS_JSON DECK_LEN CAM_JSON [x0 y0 x1 y1]

ARCS_JSON: '[[85,5.5],[95,12],[145,11]]'; CAM_JSON: '{"eye":[..],"target":[..],"f_px":..}' or
'{"eye":[..],"yaw":deg,"pitch":deg,"roll":deg,"f_px":..}'.
"""
import importlib.util
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('rampfit', os.path.join(HERE, 'rampfit.py'))
rf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rf)


def cam_from(spec):
    if 'target' in spec:
        return rf.cam_from_look(spec['eye'], spec['target'], spec['f_px'], math.radians(spec.get('roll', 0.0)))
    return [np.array(spec['eye'], float), math.radians(spec['yaw']), math.radians(spec['pitch']),
            math.radians(spec.get('roll', 0.0)), spec['f_px']]


def main():
    frame, out, arcs, deck, cam = sys.argv[1], sys.argv[2], json.loads(sys.argv[3]), float(sys.argv[4]), json.loads(sys.argv[5])
    roi = tuple(int(v) for v in sys.argv[6:10]) if len(sys.argv) > 9 else (0, 0, 1920, 1080)
    prof = rf.Profile([tuple(a) for a in arcs], deck)
    rf.draw_overlay(frame, out, prof, cam_from(cam), roi)
    print(out, 's_end %.2f deck start %s end %s' % (prof.s_end, prof.p_arc_end.round(2),
                                                     [round(float(v[0]), 2) for v in prof.at(np.array([prof.s_end]))[:2]]))


if __name__ == '__main__':
    main()
