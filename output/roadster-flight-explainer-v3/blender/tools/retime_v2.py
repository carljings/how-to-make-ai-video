"""retime_v2.py: derive v2/timing.json from the edit (v2/cues.json) and the MEASURED narration (support/narration-v2).

    python3 blender/tools/retime_v2.py            # writes v2/timing.json, prints the schedule, fails on overlaps

For every voice line: clip file, film start/end (start = the cue's edit decision, duration = the measured usable
clip), word timings from the service's WordBoundary metadata (raw-audio ticks of 100 ns, minus the clip's exterior
trim), and caption phrase windows. Phrases are matched to words by their Chinese characters (punctuation ignored).
No audio is changed. Checks: no voice overlap, every line inside the film, the x-ray line ends before the resume cut.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
CUES = os.path.join(ROOT, 'v2', 'cues.json')
NARR = os.path.join(ROOT, 'support', 'narration-v2')
OUT = os.path.join(ROOT, 'v2', 'timing.json')
HAN = re.compile(r'[一-鿿]')
TICK = 1e-7


def chars(s):
    return HAN.findall(s)


def main():
    raw = open(CUES, 'rb').read()
    cues = json.loads(raw)
    dur = {c['id']: c for c in json.load(open(os.path.join(NARR, 'durations.json'), encoding='utf-8'))['clips']}
    lines, errors = [], []
    for v in cues['vo']:
        clip = dur[v['id']]
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
        # phrases -> word spans by characters
        phrases, wi, pos = [], 0, 0
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
            wi += 1
        for k, ph in enumerate(phrases):
            nxt = phrases[k + 1]['start_s'] if k + 1 < len(phrases) else None
            ph['end_s'] = round(nxt - 0.04 if nxt else min(end + 0.35, cues['duration_s']), 3)
        lines.append({'id': v['id'], 'file': 'support/narration-v2/' + clip['usable_file'], 'text': v['text'],
                      'caption': v['caption'], 'start_s': v['start'], 'dur_s': clip['usable_duration_s'],
                      'end_s': end, 'words': words, 'phrases': phrases})
    lines.sort(key=lambda l: l['start_s'])
    for a, b in zip(lines, lines[1:]):          # a caption never outlives the next line's first phrase
        if a['phrases'] and b['phrases']:
            a['phrases'][-1]['end_s'] = round(min(a['phrases'][-1]['end_s'], b['phrases'][0]['start_s'] - 0.04), 3)
    for a, b in zip(lines, lines[1:]):
        if b['start_s'] < a['end_s'] + 0.12:
            errors.append('%s (ends %.3f) overlaps or crowds %s (starts %.3f)' % (a['id'], a['end_s'], b['id'], b['start_s']))
    for l in lines:
        if l['start_s'] < 0 or l['end_s'] > cues['duration_s']:
            errors.append('%s outside the film' % l['id'])
    resume = cues['beats']['resume']
    l5 = next(l for l in lines if l['id'] == 'L5')
    if l5['end_s'] > resume - 0.2:
        errors.append('L5 ends %.3f, too close to the resume cut %.3f' % (l5['end_s'], resume))
    out = {'about': 'Derived by blender/tools/retime_v2.py from v2/cues.json and support/narration-v2. Do not edit.',
           'cues_sha256': hashlib.sha256(raw).hexdigest(), 'voice': cues['voice'], 'lines': lines}
    for l in lines:
        print('%-4s %6.3f-%6.3f  %s' % (l['id'], l['start_s'], l['end_s'], ' | '.join(
            '%s %.2f-%.2f' % (p['text'], p['start_s'], p['end_s']) for p in l['phrases'])))
    if errors:
        print('ERRORS:\n  ' + '\n  '.join(errors))
        sys.exit(1)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print('wrote', os.path.relpath(OUT, ROOT), 'speech %.2f s' % sum(l['dur_s'] for l in lines))


if __name__ == '__main__':
    main()
