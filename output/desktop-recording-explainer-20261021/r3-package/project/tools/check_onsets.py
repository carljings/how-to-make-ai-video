#!/usr/bin/env python3
"""check_onsets.py — do the shifted kick times (src/timing.json) sit on real low-frequency attacks in the recording?

    python3 -I tools/check_onsets.py RECORDING.m4a src/timing.json OUT.json

Detects attacks independently in the user's recording: 30-120 Hz band energy (2048-sample frames, 128 hop at
44.1 kHz = 2.9 ms), half-wave-rectified log-energy rise, peak-picked. For every kick in timing.json the nearest
detected attack within +-60 ms is reported; also a random-time baseline, so a match rate can be judged.
"""
import json
import subprocess
import sys

import numpy as np

rec, tj, out = sys.argv[1], sys.argv[2], sys.argv[3]
SR, N, HOP = 44100, 2048, 128
x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', rec, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout, np.float32).astype(np.float64)
win = np.hanning(N)
freqs = np.fft.rfftfreq(N, 1 / SR)
band = (freqs >= 30) & (freqs <= 120)
nfr = (len(x) - N) // HOP
E = np.empty(nfr)
for i in range(nfr):
    seg = x[i * HOP:i * HOP + N] * win
    E[i] = np.sum(np.abs(np.fft.rfft(seg))[band] ** 2)
logE = 10 * np.log10(E + 1e-12)
flux = np.maximum(0, np.diff(logE, prepend=logE[0]))
# smooth a little and pick peaks
k = np.ones(3) / 3
fl = np.convolve(flux, k, 'same')
times = (np.arange(nfr) * HOP + N / 2) / SR
thr = np.percentile(fl, 90)
pk = [i for i in range(2, nfr - 2) if fl[i] > thr and fl[i] == fl[i - 2:i + 3].max()]
att = times[pk]
T = json.load(open(tj))
kicks = np.array([k[0] for k in T['onsets']['kick']])


def match(ts):
    d = []
    for t in ts:
        j = np.searchsorted(att, t)
        c = [att[i] - t for i in (j - 1, j) if 0 <= i < len(att)]
        c = [v for v in c if abs(v) <= 0.06]
        d.append(min(c, key=abs) if c else None)
    return d


dk = match(kicks)
m = np.array([v for v in dk if v is not None])
rng = np.random.default_rng(1)
rt = rng.uniform(17, 150, len(kicks))
dr = match(rt)
mr = np.array([v for v in dr if v is not None])
res = {'kicks': len(kicks), 'matched_within_60ms': int(len(m)), 'median_delta_ms': round(float(np.median(m)) * 1000, 1),
       'iqr_ms': [round(float(np.percentile(m, 25)) * 1000, 1), round(float(np.percentile(m, 75)) * 1000, 1)],
       'within_15ms': int(np.sum(np.abs(m) <= 0.015)),
       'random_baseline': {'matched_within_60ms': int(len(mr)), 'within_15ms': int(np.sum(np.abs(mr) <= 0.015))},
       'detector': '30-120 Hz log-energy rise, 2.9 ms hop; delta = detected attack - timing.json kick (film time)'}
json.dump(res, open(out, 'w'), indent=1)
print(json.dumps(res, indent=1))
