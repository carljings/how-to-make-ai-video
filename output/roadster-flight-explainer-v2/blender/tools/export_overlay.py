"""export_overlay.py: film.state() for every frame → the compositor's overlay data and the sound's event timeline.

    python3 blender/tools/export_overlay.py            # writes src/data/overlay.json and src/data/events.json

Pure Python (no Blender): the same states and the same camera projection the renderer uses, so Remotion's labels sit
on the rendered anchors and the sound follows the drawn valves.

overlay.json: per frame the act, shot, reserve level, anchored labels with a laid-out chip box (1080 x 1920 px) and
unanchored notes. The layout is solved frame by frame IN ORDER with hysteresis (a label keeps its side unless it
would collide), so chips do not jitter; boxes avoid each other, the top-left tag stack, the caption band, the right
icon column and the screen edges.

events.json: per-frame valve levels for every port (gas sound), valve open/close edges (clicks), the source cuts,
act starts, the explanatory cuts and the two touchdowns, all on the canonical 30 fps film clock.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
ROOT = os.path.dirname(BLENDER)
sys.path.insert(0, BLENDER)

import film  # noqa: E402
import roadster  # noqa: E402
import shots  # noqa: E402

W, H = film.W_PX, film.H_PX
FPS = film.FPS
N = int(round(film.DURATION * FPS))

# ----------------------------------------------------------------------------------------------- layout geometry
# phone-safe zones in 1080 x 1920 (Douyin: status/tabs at the top, icon column at the right, description and music
# ticker at the bottom). Chips must stay inside SAFE and out of the RESERVED boxes.
SAFE = (44, 430, 900, 1290)                    # x0, y0, x1, y1
RESERVED = [(0, 0, 1080, 425),                 # top: platform UI + chapter / tag / chip stack
            (0, 1300, 1080, 1920),             # caption band and platform description
            (905, 640, 1080, 1520)]            # right icon column
LABEL_PX = 40                                  # chip text size (Roadster Film Sans 700)
SUB_PX = 26                                    # second line (attribution) size
PAD_X, PAD_Y = 16, 9


def text_w(s, px):
    w = 0.0
    for c in s:
        w += px * (1.0 if ord(c) > 0x2E7F else (0.33 if c == ' ' else 0.58))
    return w


def chip_size(text):
    lines = text.split('\n')
    w = text_w(lines[0], LABEL_PX)
    h = LABEL_PX * 1.25
    for sub in lines[1:]:
        w = max(w, text_w(sub, SUB_PX))
        h += SUB_PX * 1.3
    return w + 2 * PAD_X, h + 2 * PAD_Y


SIDES = {   # chip box top-left from the anchor (ax, ay) and the chip size (w, h)
    'r': lambda ax, ay, w, h: (ax + 30, ay - h / 2),
    'l': lambda ax, ay, w, h: (ax - 30 - w, ay - h / 2),
    'ur': lambda ax, ay, w, h: (ax + 18, ay - h - 26),
    'ul': lambda ax, ay, w, h: (ax - 18 - w, ay - h - 26),
    'dr': lambda ax, ay, w, h: (ax + 18, ay + 26),
    'dl': lambda ax, ay, w, h: (ax - 18 - w, ay + 26),
    'u': lambda ax, ay, w, h: (ax - w / 2, ay - h - 34),
    'd': lambda ax, ay, w, h: (ax - w / 2, ay + 34),
}


def overlap(a, b):
    return max(0.0, min(a[2], b[2]) - max(a[0], b[0])) * max(0.0, min(a[3], b[3]) - max(a[1], b[1]))


def clamp_box(x, y, w, h):
    x = min(max(x, SAFE[0]), SAFE[2] - w)
    y = min(max(y, SAFE[1]), SAFE[3] - h)
    return x, y


def layout(labels, prev):
    """labels: [(id, text, ax, ay, level)]; prev: {id: side}. Greedy by level, hysteresis toward prev sides."""
    placed, out = [], []
    for ident, text, ax, ay, level in sorted(labels, key=lambda r: (-r[4], r[0])):
        w, h = chip_size(text)
        best = None
        for side, f in SIDES.items():
            x, y = f(ax, ay, w, h)
            cx, cy = clamp_box(x, y, w, h)
            box = (cx, cy, cx + w, cy + h)
            cost = 0.0
            cost += 25.0 * sum(overlap(box, p) for p in placed)
            cost += 8.0 * sum(overlap(box, r) for r in RESERVED)
            cost += 0.02 * ((cx - x) ** 2 + (cy - y) ** 2)                # pushed away from its preferred spot
            cost += 6.0 * sum(1 for (_, _, _, _, (pax, pay)) in out
                              if box[0] - 10 < pax < box[2] + 10 and box[1] - 10 < pay < box[3] + 10) * w * h / 100.0
            if prev.get(ident) not in (None, side):
                cost += 2500.0                                                 # hysteresis: keep the side
            if best is None or cost < best[0]:
                best = (cost, side, box)
        _, side, box = best
        placed.append(box)
        out.append((ident, text, side, box, (ax, ay)))
    return {i: (t, s, b, a) for i, t, s, b, a in out}


# ----------------------------------------------------------------------------------------------- export
def r1(v):
    return round(v, 1)


def main():
    texts, frames, prev = {}, [], {}
    valve_names = [n for n in roadster.NOZZLES]
    levels = {n: [] for n in valve_names}
    meta = []
    for k in range(N):
        t = k / FPS
        fr = film.state(t)
        raw = []
        for ident, (p, lv, text) in fr.anchors.items():
            q = film.project(fr.camera, p, W, H)
            if q is None or lv <= 0.01:
                continue
            raw.append((ident, text, q[0], q[1], lv))
            if texts.setdefault(ident, text) != text:
                raise ValueError('label %s changes text: %r vs %r' % (ident, texts[ident], text))
        lay = layout(raw, prev)
        prev = {i: v[1] for i, v in lay.items()}
        lab = []
        for ident, text, ax, ay, lv in raw:
            _, side, box, _ = lay[ident]
            lab.append([ident, r1(ax), r1(ay), r1(box[0]), r1(box[1]), r1(box[2] - box[0]), r1(box[3] - box[1]),
                        side, round(lv, 3)])
        notes = []
        for ident, text, lv in fr.notes:
            if texts.setdefault('note:' + ident, text) != text:
                raise ValueError('note %s changes text' % ident)
            notes.append([ident, round(lv, 3)])
        frames.append({'a': fr.act, 's': fr.shot, 'r': None if fr.reserve is None else round(fr.reserve, 4),
                       'v': round(fr.vessels, 3), 'l': lab, 'n': notes})
        for n in valve_names:
            levels[n].append(round(fr.plumes.get(n, 0.0), 4))
        c = film.xf(fr.car, film.COM)
        meta.append({'act': fr.act, 'shot': fr.shot, 'com': c, 'visible': fr.car_visible, 'cam': fr.camera})
    out_dir = os.path.join(ROOT, 'src', 'data')
    os.makedirs(out_dir, exist_ok=True)
    overlay = {'about': 'Generated by blender/tools/export_overlay.py from film.state(); do not edit by hand.',
               'fps': FPS, 'width': W, 'height': H, 'frames_total': N, 'texts': texts,
               'safe': SAFE, 'reserved': RESERVED, 'label_px': LABEL_PX, 'sub_px': SUB_PX,
               'pad': [PAD_X, PAD_Y], 'frames': frames}
    with open(os.path.join(out_dir, 'overlay.json'), 'w', encoding='utf-8') as fh:
        json.dump(overlay, fh, ensure_ascii=False, separators=(',', ':'))
    events = build_events(levels, meta)
    with open(os.path.join(out_dir, 'events.json'), 'w', encoding='utf-8') as fh:
        json.dump(events, fh, ensure_ascii=False, separators=(',', ':'))
    n_lab = sum(len(f['l']) for f in frames)
    print('overlay.json: %d frames, %d label placements, %d distinct texts' % (N, n_lab, len(texts)))
    print('events.json: %d valve edges, %d impacts' % (len(events['valve_edges']), len(events['impacts'])))


def screen_pan(cam, p):
    q = film.project(cam, p, W, H)
    if q is None:
        return 0.0
    return max(-0.85, min(0.85, (q[0] / W) * 2.0 - 1.0))


def build_events(levels, meta):
    """Sound events on the film clock, all derived from the drawn states."""
    edges = []
    for n, lv in levels.items():
        on = False
        for k, v in enumerate(lv):
            if not on and v > 0.12:
                on = True
                m = meta[k]
                edges.append({'t': round(k / FPS, 4), 'port': n, 'kind': 'open', 'act': m['act'],
                              'pan': round(screen_pan(m['cam'], m['com']), 3)})
            elif on and v < 0.06:
                on = False
                m = meta[k]
                edges.append({'t': round(k / FPS, 4), 'port': n, 'kind': 'close', 'act': m['act'],
                              'pan': round(screen_pan(m['cam'], m['com']), 3)})
    edges.sort(key=lambda e: (e['t'], e['port']))
    ev = film.EV
    # touchdowns of the drawn motion: the reaction hop lands at the end of its cushion, the hypothetical hover at d1
    hop_land = None
    for k in range(int(ev['reaction'] * FPS), int(ev['torque'] * FPS)):
        tau = (k / FPS - ev['gas_out']) * film.SLOW4
        if film._hop(tau)[3] == 'landed':
            hop_land = k / FPS
            break
    hover_land = film.hover_times()[3]
    impacts = [{'t': round(hop_land, 4), 'kind': 'touchdown', 'what': 'reaction hop lands on the panel (slow motion)'},
               {'t': round(hover_land, 4), 'kind': 'touchdown', 'what': 'hypothetical hover sets down on the lot'}]
    pans = [round(screen_pan(m['cam'], m['com']), 3) for m in meta]
    vis = [1 if m['visible'] else 0 for m in meta]
    return {
        'about': 'Generated by blender/tools/export_overlay.py from film.state(); sound reads only this and the cue table.',
        'fps': FPS, 'frames_total': N,
        'source_cuts': list(shots.CUTS), 'source_end': shots.SOURCE_END,
        'acts': [{'name': n, 'start': round(a, 4), 'end': round(b, 4)} for n, a, b in film.ACTS],
        'hard_cuts': [shots.SOURCE_END, ev['torque'], ev['reserve']],      # explicit cuts: camera/CoM jump
        'beats': {k: round(v, 4) for k, v in ev.items()},
        'valve_levels': levels, 'car_pan': pans, 'car_visible': vis,
        'valve_edges': edges, 'impacts': impacts,
    }


if __name__ == '__main__':
    main()
