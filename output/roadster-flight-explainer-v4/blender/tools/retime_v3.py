"""retime_v3.py: derive v3/timing.json from the edit (v3/cues.json) and the MEASURED narration (support/narration-v3).

    python3 blender/tools/retime_v3.py            # writes v3/timing.json, prints the schedule, fails on any error
    python3 blender/tools/retime_v3.py --check    # same checks, writes nothing

Per voice line: clip file, film start/end (start = the cue's edit decision, duration = the measured usable clip),
word times from the service's WordBoundary metadata (100 ns ticks minus the clip's exterior trim), caption phrase
windows (phrases matched to words by Chinese characters, punctuation ignored). No audio is changed.
Checks: clip text == cue text; no overlap (>= 0.12 s gap); every line inside the film; every cues 'sync_rules' entry
(word on an event moment, word inside an event window, line inside a section); anchors resolve.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
CUES = os.path.join(ROOT, 'v3', 'cues.json')
NARR = os.path.join(ROOT, 'support', 'narration-v3')
OUT = os.path.join(ROOT, 'v3', 'timing.json')
HAN = re.compile(r'[一-鿿]')
TICK = 1e-7


def chars(s):
    return HAN.findall(s)


def build():
    raw = open(CUES, 'rb').read()
    cues = json.loads(raw)
    dur = {c['id']: c for c in json.load(open(os.path.join(NARR, 'durations.json'), encoding='utf-8'))['clips']}
    lines, errors = [], []
    for v in cues['vo']:
        clip = dur.get(v['id'])
        if clip is None:
            errors.append('%s: no measured clip' % v['id'])
            continue
        if clip['text'] != v['text']:
            errors.append('%s: clip text %r differs from cue text %r' % (v['id'], clip['text'], v['text']))
        trim = clip['trim_start_s']
        words = []
        with open(os.path.join(NARR, '%s-word-boundaries.jsonl' % v['id']), encoding='utf-8') as fh:
            for row in fh:
                d = json.loads(row)
                if d.get('type') != 'WordBoundary':
                    continue
                a = d['offset'] * TICK - trim
                words.append({'text': d['text'], 'start_s': round(v['start'] + a, 3),
                              'end_s': round(v['start'] + a + d['duration'] * TICK, 3)})
        end = round(v['start'] + clip['usable_duration_s'], 3)
        phrases, pos = [], 0
        flat = [(w, c) for w in words for c in chars(w['text'])]
        for ph in v['phrases']:
            n = len(chars(ph['text']))
            span = flat[pos:pos + n]
            if len(span) != n or ''.join(c for _, c in span) != ''.join(chars(ph['text'])):
                errors.append('%s: phrase %r does not match word boundaries' % (v['id'], ph['text']))
                break
            phrases.append({'text': ph['text'], 'tone': ph['tone'], 'start_s': span[0][0]['start_s'],
                            'words_end_s': span[-1][0]['end_s']})
            pos += n
        for k, ph in enumerate(phrases):
            nxt = phrases[k + 1]['start_s'] if k + 1 < len(phrases) else None
            ph['end_s'] = round(nxt - 0.04 if nxt else min(end + 0.35, cues['duration_s']), 3)
        lines.append({'id': v['id'], 'file': 'support/narration-v3/' + clip['usable_file'], 'text': v['text'],
                      'display': v['display'], 'start_s': v['start'], 'dur_s': clip['usable_duration_s'], 'end_s': end,
                      'usable_sha256': clip.get('usable_sha256'), 'words': words, 'phrases': phrases})
    lines.sort(key=lambda l: l['start_s'])
    for a, b in zip(lines, lines[1:]):
        if a['phrases'] and b['phrases']:
            a['phrases'][-1]['end_s'] = round(min(a['phrases'][-1]['end_s'], b['phrases'][0]['start_s'] - 0.04), 3)
        if b['start_s'] < a['end_s'] + 0.12:
            errors.append('%s (ends %.3f) overlaps or crowds %s (starts %.3f)' % (a['id'], a['end_s'], b['id'], b['start_s']))
    for l in lines:
        if l['start_s'] < 0 or l['end_s'] > cues['duration_s']:
            errors.append('%s outside the film' % l['id'])
    return cues, raw, lines, errors


def word_start(line, target):
    flat = []
    for w in line['words']:
        cs = chars(w['text'])
        for k, ch in enumerate(cs):
            flat.append((ch, w['start_s'] + (w['end_s'] - w['start_s']) * k / max(1, len(cs))))
    s = ''.join(c for c, _ in flat)
    i = s.find(''.join(chars(target)))
    return None if i < 0 else flat[i][1]


def check_rules(cues, lines, errors):
    import v3_film as F            # pure Python; only its clock functions and EV symbols are used here
    byid = {l['id']: l for l in lines}
    notes = []
    for r in cues.get('sync_rules', []):
        l = byid.get(r['line'])
        if l is None:
            errors.append('rule %s: line missing' % r)
            continue
        if 'ends_before' in r and l['end_s'] > r['ends_before']:
            errors.append('%s ends %.3f, must end before %.2f' % (l['id'], l['end_s'], r['ends_before']))
        if 'within_section' in r:
            s = F.SEC[r['within_section']]
            lo = s['start'] + r.get('after_start_s', 0.0)
            if l['start_s'] < lo or l['end_s'] > s['end']:
                errors.append('%s (%.3f-%.3f) must lie inside %s (%.3f-%.3f)' % (l['id'], l['start_s'], l['end_s'],
                                                                             s['id'], lo, s['end']))
        if 'word' in r:
            t = word_start(l, r['word'])
            if t is None:
                errors.append('%s: word %r not found' % (l['id'], r['word']))
                continue
            s = F.SEC[r['section']]
            if not s['start'] <= t < s['end']:
                errors.append('%s %r at %.3f falls outside section %s' % (l['id'], r['word'], t, s['id']))
                continue
            ev = F.event_time(t, s)
            if 'at_ev' in r:
                target = F.SYMBOLS.get(r['at_ev'], r['at_ev'])
                keys = s['clock']['keys']
                tt = None
                for (t0, e0), (t1, e1) in zip(keys, keys[1:]):
                    if min(e0, e1) <= target <= max(e0, e1) and e1 != e0:
                        tt = t0 + (target - e0) * (t1 - t0) / (e1 - e0)
                        break
                if tt is None or abs(tt - t) > r['tol_s']:
                    errors.append('%s %r at %.3f; event %s=%.3f happens at %s (tol %.2f): move the clock key or the line'
                                  % (l['id'], r['word'], t, r['at_ev'], target, None if tt is None else round(tt, 3),
                                     r['tol_s']))
                else:
                    notes.append('%s %r %.3f ~ %s at %.3f' % (l['id'], r['word'], t, r['at_ev'], tt))
            if 'ev_range' in r:
                lo, hi = r['ev_range']
                if not lo <= ev <= hi:
                    errors.append('%s %r at %.3f has ev %.3f, want %.2f..%.2f' % (l['id'], r['word'], t, ev, lo, hi))
                else:
                    notes.append('%s %r %.3f ev %.3f' % (l['id'], r['word'], t, ev))
    for name, a in cues['anchors'].items():
        if 'line' in a and a['word'] != '<end>':
            if a['line'] in byid and word_start(byid[a['line']], a['word']) is None:
                errors.append('anchor %s: %r not in %s' % (name, a['word'], a['line']))
    return notes


def main():
    cues, raw, lines, errors = build()
    notes = check_rules(cues, lines, errors)
    for l in lines:
        print('%-4s %6.3f-%6.3f  %s' % (l['id'], l['start_s'], l['end_s'], ' | '.join(
            '%s %.2f-%.2f' % (p['text'], p['start_s'], p['end_s']) for p in l['phrases'])))
    for n in notes:
        print('  ok  ' + n)
    if errors:
        print('ERRORS:\n  ' + '\n  '.join(errors))
        sys.exit(1)
    if '--check' in sys.argv:
        print('check passed (nothing written)')
        return
    out = {'about': 'Derived by blender/tools/retime_v3.py from v3/cues.json and support/narration-v3. Do not edit.',
           'cues_sha256': hashlib.sha256(raw).hexdigest(), 'voice': cues['voice'], 'lines': lines}
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print('wrote', os.path.relpath(OUT, ROOT), 'speech %.2f s' % sum(l['dur_s'] for l in lines))


if __name__ == '__main__':
    main()
