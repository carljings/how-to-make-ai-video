#!/usr/bin/env python3
"""timing.py — the film's clock: the MV's published beat/word analysis, moved onto the user's recording.

    python3 -I tools/timing.py AUDIO_JSON LYRICS_JSON OUT_JSON [--offset 0.221905] [--end 155.4667]

Film time = time in the user's recording (reference-original-audio.m4a, 155.467 s). The pdoom-video analysis
(data/audio.json, data/lyrics.json at commit fa164b7) is on the clean repo MP3's clock; tools/compare_audio.py measured
clean = recording + 0.221905 s in 25 windows (1-145 s, r >= 0.95, no drift), so every time here is (clean - offset).
Writes: beats, downbeats, sections, kick/snare/hat onsets (with strength), every sung word, and 20 fps envelopes
(rms, low, drums, vocal) for the few elements that breathe with the mix. Times rounded to 1 ms.
"""
import argparse
import json

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('lyrics'); ap.add_argument('out')
ap.add_argument('--offset', type=float, default=0.221905)
ap.add_argument('--end', type=float, default=155.4667)
a = ap.parse_args()
A = json.load(open(a.audio)); L = json.load(open(a.lyrics))
o = a.offset
f = lambda x: round(x - o, 3)
keep = lambda x: -0.5 <= x - o <= a.end + 0.5

out = {
    'source': {'audio_json': 'pdoom-video data/audio.json @fa164b7', 'lyrics_json': 'pdoom-video data/lyrics.json @fa164b7',
               'offset_s': o, 'film_end_s': a.end,
               'note': 'film time = recording time = clean-MP3 time - offset (measured by tools/compare_audio.py)'},
    'bpm': A['bpm'], 'beat_s': A['beat_period'],
    'beats': [f(x) for x in A['beats'] if keep(x)],
    'downbeats': [f(x) for x in A['downbeats'] if keep(x)],
    'sections': [{'name': s['name'], 't0': f(s['start']), 't1': min(f(s['end']), a.end)} for s in A['sections']],
    'onsets': {k: [[f(t), round(s, 3)] for t, s in v if keep(t)] for k, v in A['onsets'].items() if k in ('kick', 'snare', 'hat')},
}
words = []
for li, line in enumerate(L['lines']):
    for w in line['words']:
        words.append({'w': w['w'], 't0': f(w['start']), 't1': f(w['end']), 'line': li})
out['words'] = words
out['lines'] = [{'text': ln['text'], 't0': f(ln['start']), 't1': f(ln['end'])} for ln in L['lines']]
fps = A['fps']; step = int(fps // 20)
for k in ('rms', 'low', 'drums', 'vocal'):
    env = A[k]
    i0 = int(round(o * fps))
    out.setdefault('env20', {})[k] = [round(env[i], 3) for i in range(i0, min(len(env), i0 + int((a.end + 0.5) * fps)), step)]
out['env20_note'] = 'env20[k][i] = envelope at film time i/20 s (0..1, see audio.json notes)'
json.dump(out, open(a.out, 'w'), separators=(',', ':'))
print('beats', len(out['beats']), 'downbeats', len(out['downbeats']), 'words', len(words),
      'kicks', len(out['onsets']['kick']), 'snares', len(out['onsets']['snare']))
for s in out['sections']:
    print(f"{s['name']:8s} {s['t0']:8.3f} {s['t1']:8.3f}")
