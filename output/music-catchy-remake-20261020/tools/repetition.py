#!/usr/bin/env python3
"""repetition.py — how much does the ORIGINAL song repeat itself? Bar-by-bar spectral similarity (measured, not a
transcription). numpy + ffmpeg.

    python3 tools/repetition.py [reference-audio.m4a]   → assets/music/repetition.json

Each complete bar (bar lines from assets/music/source-analysis.json) → its mean log-power spectrum in 48 log-spaced bands
(60 Hz–12 kHz) on 8 beat-aligned slices (so the rhythm inside the bar counts), minus the across-bar mean (the shared tilt), z-normalised; similarity = Pearson r
between two bars' vectors. Bars are grouped greedily: a bar joins the first group whose founding bar it matches with
r ≥ R_MIN. Nothing here identifies notes, chords or melody.
"""
import json, os, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-anticipation-original-20261020', 'assets', 'reference-audio.m4a')
A = json.load(open(os.path.join(ROOT, 'assets', 'music', 'source-analysis.json')))
SR = 44100; R_MIN = 0.80
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout, dtype=np.float32).astype(np.float64)
N, H = 2048, 512
fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N)), N)[::H][: len(x) // H]
P = np.abs(np.fft.rfft(fr * np.hanning(N), axis=1)) ** 2; f = np.fft.rfftfreq(N, 1 / SR); t = np.arange(len(fr)) * H / SR
edges = np.geomspace(60, 12000, 49)
def bins(i):   # the lowest bands are narrower than one FFT bin (21.5 Hz) → nearest bin
    m = np.where((f >= edges[i]) & (f < edges[i + 1]))[0]
    return m if len(m) else np.array([int(np.argmin(np.abs(f - np.sqrt(edges[i] * edges[i + 1]))))])
B = np.stack([10 * np.log10(P[:, bins(i)].mean(1) + 1e-12) for i in range(48)], 1)
bars = [b for b in A['bars'] if b['complete']]
vecs = []
for b in bars:
    sl = np.linspace(b['t0'], b['t1'], 9); v = []
    for k in range(8):
        m = (t >= sl[k]) & (t < sl[k + 1]); v.append(B[m].mean(0))
    vecs.append(np.concatenate(v))
V = np.stack(vecs); V = V - V.mean(0)   # remove what every bar shares (spectral tilt), keep what makes a bar distinctive
V = (V - V.mean(1, keepdims=True)) / (V.std(1, keepdims=True) + 1e-9); S = (V @ V.T) / V.shape[1]
groups = []; gid = []
for i in range(len(bars)):
    for g, f0 in enumerate(groups):
        if S[i, f0] >= R_MIN: gid.append(g); break
    else: groups.append(i); gid.append(len(groups) - 1)
sizes = [gid.count(g) for g in range(len(groups))]
res = {'about': 'Measured on the original track: bar-to-bar spectral similarity (Pearson r of beat-sliced log-spectra). Not a transcription; says nothing about notes or chords.',
       'r_min': R_MIN, 'bars': [{'bar': b['bar'], 't0': b['t0'], 't1': b['t1'], 'group': gid[i], 'thin': b['thin']} for i, b in enumerate(bars)],
       'group_sizes': sizes, 'similarity': [[round(float(v), 3) for v in row] for row in S]}
json.dump(res, open(os.path.join(ROOT, 'assets', 'music', 'repetition.json'), 'w'), indent=1)
print('groups', gid, 'sizes', sizes)
print('mean off-diagonal r', round(float((S.sum() - len(S)) / (len(S) ** 2 - len(S))), 3))
for i, b in enumerate(bars): print(b['bar'], b['t0'], 'group', gid[i], 'max r to others', round(float(np.max(np.delete(S[i], i))), 3), 'THIN' if b['thin'] else '')
