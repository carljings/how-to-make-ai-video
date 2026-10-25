#!/usr/bin/env python3
"""measure_bgm.py — measure the original BGM once and write src/music-map.json for every proposal.

    python3 -I tools/measure_bgm.py <reference-audio.m4a> src/music-map.json

Everything on screen that says “实测” comes from this file:
  * beat grid: least-squares fit of low-band onsets (period, phase) -> beats and downbeats
  * sub-bass (20–100 Hz) level per beat, relative to the loudest frame
  * a 48-band log-frequency spectrogram every 50 ms (used by P3 to build the paper ridgelines)
  * bar-to-bar chroma similarity (the repeated 4-bar loop) and waveform correlation of repeated bars
  * onset spacing inside the two “drag” bars
"""
import hashlib
import json
import subprocess
import sys

import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
dur = len(x) / SR
sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()


def stft(n, hop):
    w = np.hanning(n)
    fr = 1 + (len(x) - n) // hop
    S = np.empty((fr, n // 2 + 1))
    for i in range(fr):
        S[i] = np.abs(np.fft.rfft(x[i * hop:i * hop + n] * w))
    return S, np.fft.rfftfreq(n, 1 / SR), (np.arange(fr) * hop + n / 2) / SR


# ---- beat grid ---------------------------------------------------------------------------------------------
S, f, t = stft(1024, 128)
m = (f >= 30) & (f < 150)
E = np.sqrt((S[:, m] ** 2).sum(1))
fl = np.r_[0, np.maximum(0, np.diff(np.log1p(E)))]
pk = [i for i in range(3, len(fl) - 3) if fl[i] == fl[i - 3:i + 4].max() and fl[i] > np.percentile(fl, 93)]
pt = t[pk]
P0, PH0 = 0.5318, 0.398          # coarse grid from the eighth-note autocorrelation (0.267 s) + kick-phase choice
near = [(round((v - PH0) / P0), v) for v in pt if abs(v - (PH0 + round((v - PH0) / P0) * P0)) < 0.06]
ks = np.array([k for k, _ in near], float)
vs = np.array([v for _, v in near])
P, PH = np.linalg.lstsq(np.vstack([ks, np.ones_like(ks)]).T, vs, rcond=None)[0]
beats = [PH + P * k for k in range(0, int((dur - PH) / P) + 1)]
downbeats = [PH + P * (1 + 4 * k) for k in range(0, 19)]      # bar 1 starts on beat index 1 (0.93 s)

# ---- sub-bass per beat, spectrogram -------------------------------------------------------------------------
S2, f2, t2 = stft(4096, 2205)                                   # 50 ms hop
sub = np.sqrt((S2[:, (f2 >= 20) & (f2 < 100)] ** 2).sum(1))
sub_db = 20 * np.log10(sub / sub.max() + 1e-12)
beat_sub = []
for b in beats:
    sel = (t2 >= b) & (t2 < b + P)
    beat_sub.append(round(float(sub_db[sel].mean()), 2) if sel.any() else None)

edges = np.geomspace(30, 12000, 49)
bands = np.zeros((len(t2), 48))
for i in range(48):
    mm = (f2 >= edges[i]) & (f2 < edges[i + 1])
    bands[:, i] = np.sqrt((S2[:, mm] ** 2).sum(1)) if mm.any() else 0
bands_db = 20 * np.log10(bands / (bands.max(0, keepdims=True) + 1e-12) + 1e-6)
spec = np.clip((bands_db + 36) / 36, 0, 1)                     # 0..1, 36 dB range per band

# ---- repetition -----------------------------------------------------------------------------------------------
mc = (f2 > 60) & (f2 < 4000)
pc = np.round(12 * np.log2(f2[mc] / 440.0)) % 12
C = np.stack([(S2[:, mc][:, pc == k] ** 2).sum(1) for k in range(12)], 1)
C /= C.sum(1, keepdims=True) + 1e-12
B = 4 * P
bar_chroma = []
for d in downbeats[:-1]:
    sel = (t2 >= d) & (t2 < d + B)
    v = C[sel].mean(0)
    bar_chroma.append(v / np.linalg.norm(v))


def bar_corr(i, j):
    a0 = int(round(downbeats[i] * SR))
    n = int(B * SR)
    a = x[a0:a0 + n]
    best = -1.0
    for lag in range(-900, 901, 9):
        b0 = int(round(downbeats[j] * SR)) + lag
        b = x[b0:b0 + n]
        if len(b) < n:
            continue
        best = max(best, float(np.dot(a, b) / np.sqrt(np.dot(a, a) * np.dot(b, b))))
    return round(best, 3)


# bar index here = position in downbeats (0 -> bar 1 at 0.93 s)
pairs = {'bar2~bar6': (1, 5), 'bar2~bar10': (1, 9), 'bar3~bar11': (2, 10), 'bar4~bar12': (3, 11),
         'bar6~bar10': (5, 9), 'bar2~bar16': (1, 15), 'bar8~bar14 (drag1~drag2)': (7, 13), 'bar9~bar15': (8, 14)}
repeats = {k: {'chroma_cos': round(float(bar_chroma[i] @ bar_chroma[j]), 3), 'waveform_r': bar_corr(i, j)}
           for k, (i, j) in pairs.items()}

# ---- onset spacing inside the drag bars -------------------------------------------------------------------------
S3, f3, t3 = stft(1024, 256)
fx = np.r_[0, np.maximum(0, np.diff(np.log1p(S3), axis=0)).sum(1)]
thr = np.percentile(fx, 75)
op = t3[[i for i in range(2, len(fx) - 2) if fx[i] == fx[i - 2:i + 3].max() and fx[i] > thr]]


def ioi(a, b):
    s = op[(op >= a) & (op < b)]
    return round(float(np.median(np.diff(s))), 3) if len(s) > 2 else None


db = downbeats
out = {
    'source': SRC.split('/')[-1], 'sha256': sha, 'duration_s': round(dur, 3),
    'method': 'tools/measure_bgm.py (STFT spectral flux / band energy, numpy); a measurement of the audio, not a score',
    'tempo': {'beat_s': round(float(P), 5), 'bpm': round(60 / float(P), 2), 'phase_s': round(float(PH), 4), 'bar_s': round(float(B), 4)},
    'downbeats': [round(float(v), 3) for v in downbeats],
    'beats': [round(float(v), 3) for v in beats],
    'beat_sub_db': beat_sub,
    'sections': [
        {'name': 'intro (bass thin)', 'from': 0.0, 'to': round(db[1], 3)},
        {'name': 'loop 1', 'from': round(db[1], 3), 'to': round(db[5], 3)},
        {'name': 'loop 2 (A A)', 'from': round(db[5], 3), 'to': round(db[7], 3)},
        {'name': 'drag 1 (bass thinned; 2nd bar = even 16th-note run)', 'from': round(db[7], 3), 'to': round(db[9], 3)},
        {'name': 'drop 1 / loop 3', 'from': round(db[9], 3), 'to': round(db[13], 3)},
        {'name': 'drag 2', 'from': round(db[13], 3), 'to': round(db[15], 3)},
        {'name': 'drop 2 / loop 4 (clip ends without a fade)', 'from': round(db[15], 3), 'to': round(dur, 3)},
    ],
    'drag_onset_ioi_s': {'drag1 bar 2': ioi(db[8], db[9]), 'drag2 bar 2': ioi(db[14], db[15]), 'sixteenth_note_s': round(float(P) / 4, 3)},
    'repeats': repeats,
    'spectrogram': {'hop_s': 0.05, 'bands_hz': [round(float(v), 1) for v in edges], 'range_db': 36,
                    'frames': [[round(float(v), 2) for v in row] for row in spec]},
    'sub_db_50ms': [round(float(v), 1) for v in sub_db],
}
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
print(json.dumps({k: out[k] for k in ('tempo', 'downbeats', 'sections', 'drag_onset_ioi_s', 'repeats')}, ensure_ascii=False, indent=1))
print('beat_sub_db around drag 1:', beat_sub[28:42])
print('beat_sub_db around drag 2:', beat_sub[52:66])
