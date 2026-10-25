#!/usr/bin/env python3
"""bgm.py — a film's soundtrack = the user's ORIGINAL BGM only, one contiguous passage from 0 s, at original speed and pitch.

    python3 -I tools/bgm.py REF.m4a OUT.wav --end 28.582 --fade-from 26.455 --frames 858 [--fps 30]

  * passage: source [0, END) (END is a measured bar line from src/music-map.json); film time = source time
  * 8 ms raised-cosine fade-in (click guard); raised-cosine fade-out over [fade-from, END) — the last bar dies away,
    so the ending is a decay, not a cut
  * ONE constant gain for the whole file so that the 48 kHz true peak is <= -1.0 dBTP (no ducking: the music is never
    lowered under captions; no EQ, compression, limiting, stretch or pitch-shift)
  * 44.1 -> 48 kHz, 24-bit stereo WAV, padded with digital silence to exactly FRAMES / FPS seconds
  * provenance: the WAV is decoded back and correlated with the source over the unfaded region (expect lag 0, r ~ 1)
Writes OUT.wav and OUT.json (report). Nothing is composed or synthesized.
"""
import argparse
import hashlib
import json
import re
import subprocess

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--end', type=float, required=True); ap.add_argument('--fade-from', type=float, required=True)
ap.add_argument('--frames', type=int, required=True); ap.add_argument('--fps', type=int, default=30)
a = ap.parse_args()
SRC_SHA = '6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61'
SR, OSR, FADE_IN, TP_MAX = 44100, 48000, 0.008, -1.0

sha = hashlib.sha256(open(a.src, 'rb').read()).hexdigest()
assert sha == SRC_SHA, f'source sha256 {sha} is not the original BGM'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.src, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
n_end = int(round(a.end * SR))
assert n_end <= len(st), 'end beyond the source'
x = st[:n_end].copy()
t = np.arange(len(x)) / SR
g = np.ones(len(x))
fi = t < FADE_IN
g[fi] = 0.5 - 0.5 * np.cos(np.pi * t[fi] / FADE_IN)
fo = t >= a.fade_from
g[fo] = 0.5 + 0.5 * np.cos(np.pi * (t[fo] - a.fade_from) / (a.end - a.fade_from))
x *= g[:, None]


def to48(buf):
    return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-ar', str(OSR), '-f', 'f64le', '-'],
                                        input=buf.astype(np.float64).tobytes(), capture_output=True, check=True).stdout, np.float64).reshape(-1, 2)


def measure(y):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f64le', '-ar', str(OSR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       input=y.tobytes(), capture_output=True)
    e = p.stderr.decode(); s = e[e.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))


y = to48(x)
I0, TP0 = measure(y)
gain = min(0.0, round(TP_MAX - TP0 - 0.05, 2))
y = to48(x * 10 ** (gain / 20))
total = int(round(a.frames / a.fps * OSR))
y = np.vstack([y, np.zeros((max(0, total - len(y)), 2))])[:total]
I1, TP1 = measure(y)
assert TP1 <= TP_MAX + 1e-6, TP1
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(OSR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', a.out], input=y.tobytes(), check=True)

back = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', a.out, '-ar', str(SR), '-f', 'f64le', '-'], capture_output=True, check=True).stdout, np.float64).reshape(-1, 2).mean(1)
mono = st.mean(1)
i0, i1 = int(0.05 * SR), int((a.fade_from - 0.05) * SR)
best = None
for lag in range(-50, 51):
    xa = back[i0:i1]; yb = mono[i0 + lag:i1 + lag]
    r = float(np.dot(xa, yb) / np.sqrt(np.dot(xa, xa) * np.dot(yb, yb)))
    if best is None or r > best[1]:
        best = (lag, r)
rep = {'source': {'file': a.src, 'sha256': sha, 'seconds': round(len(st) / SR, 4)},
       'map': {'source_s': [0.0, a.end], 'film_s': [0.0, a.end], 'note': 'film time = source time; one contiguous passage, no joins'},
       'fade_in_s': FADE_IN, 'fade_out_s': [a.fade_from, a.end], 'fade_shape': 'raised cosine',
       'gain_db': gain, 'other_processing': 'none (no ducking, EQ, compression, limiting, stretch or pitch-shift)',
       'loudness': {'before_gain': {'I_lufs': I0, 'TP_dbtp': TP0}, 'wav': {'I_lufs': I1, 'TP_dbtp': TP1}},
       'wav': {'file': a.out, 'sample_rate': OSR, 'seconds': round(total / OSR, 6), 'frames_at_fps': a.frames, 'fps': a.fps,
               'sha256': hashlib.sha256(open(a.out, 'rb').read()).hexdigest()},
       'provenance_check': {'film_s': [0.05, round(a.fade_from - 0.05, 3)], 'lag_samples_44k1': best[0], 'correlation': round(best[1], 6)},
       'listening': 'none - measurements only'}
json.dump(rep, open(a.out.rsplit('.', 1)[0] + '.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(rep, indent=1, ensure_ascii=False))
