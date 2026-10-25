#!/usr/bin/env python3
"""compare_audio.py — measure the two candidate copies of the song before choosing one (no audio is written).

    python3 -I tools/compare_audio.py RECORDING.m4a CLEAN.mp3 OUT.json

For each file: EBU R128 integrated loudness and true peak (ffmpeg ebur128), duration, spectral roll-off (frequency
below which 99 % of the energy lies, full-band 0-22 kHz) and the energy above 16 kHz. Then the offset between them,
measured at full sample rate (44.1 kHz, mono) by cross-correlation in many windows across the whole song, so a loop
restart or an edit in the recording would show up as an offset jump or a correlation drop.
"""
import json
import re
import subprocess
import sys

import numpy as np

rec, clean, out = sys.argv[1], sys.argv[2], sys.argv[3]
SR = 44100


def decode(f, sr=SR, ch=1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).astype(np.float64)
    return x.reshape(-1, ch) if ch > 1 else x


def loud(f):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True).stderr.decode()
    s = e[e.rfind('Summary'):]
    return {'I_lufs': float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)),
            'LRA_lu': float(re.search(r'LRA:\s+(-?[\d.]+) LU', s).group(1)),
            'TP_dbtp': float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))}


def spectrum(x):
    n = 1 << 15
    hop = n
    acc = np.zeros(n // 2 + 1)
    win = np.hanning(n)
    for i in range(0, len(x) - n, hop):
        acc += np.abs(np.fft.rfft(x[i:i + n] * win)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR)
    c = np.cumsum(acc) / acc.sum()
    return {'rolloff99_hz': float(f[np.searchsorted(c, 0.99)]), 'rolloff999_hz': float(f[np.searchsorted(c, 0.999)]),
            'energy_above_16k_db': float(10 * np.log10(acc[f > 16000].sum() / acc.sum() + 1e-30)),
            'energy_above_19k_db': float(10 * np.log10(acc[f > 19000].sum() / acc.sum() + 1e-30))}


R, C = decode(rec), decode(clean)
res = {'recording': {'file': rec, 'seconds': len(R) / SR, **loud(rec), **spectrum(R)},
       'clean': {'file': clean, 'seconds': len(C) / SR, **loud(clean), **spectrum(C)}}

# offset per window: clean_time = recording_time + offset
wins = []
L = int(4.0 * SR)
search = int(0.6 * SR)
for t0 in np.arange(1.0, len(R) / SR - 4.5, 6.0):
    a = int(t0 * SR)
    x = R[a:a + L]
    if np.sqrt(np.mean(x ** 2)) < 1e-4:
        continue
    lo = max(0, a - search)
    y = C[lo:a + L + search]
    # FFT cross-correlation of x against y
    nfft = 1 << int(np.ceil(np.log2(len(y) + len(x))))
    cc = np.fft.irfft(np.fft.rfft(y, nfft) * np.conj(np.fft.rfft(x, nfft)), nfft)[:len(y) - len(x) + 1]
    # normalise by local energy of y
    ey = np.sqrt(np.convolve(y ** 2, np.ones(len(x)), 'valid'))
    r = cc / (ey * np.sqrt(np.sum(x ** 2)) + 1e-12)
    k = int(np.argmax(r))
    wins.append({'rec_t': round(float(t0), 2), 'offset_s': round((lo + k - a) / SR, 6), 'r': round(float(r[k]), 4)})
res['windows'] = wins
offs = np.array([w['offset_s'] for w in wins])
res['offset_summary'] = {'median_s': float(np.median(offs)), 'min_s': float(offs.min()), 'max_s': float(offs.max()),
                         'min_r': min(w['r'] for w in wins), 'n': len(wins)}
# tail: RMS envelope of the last 6 s of each (aligned)
off = float(np.median(offs))
tail = []
for t in np.arange(len(R) / SR - 6.0, len(R) / SR, 0.25):
    a = int(t * SR); b = a + int(0.25 * SR)
    ca, cb = int((t + off) * SR), int((t + off) * SR) + int(0.25 * SR)
    rr = np.sqrt(np.mean(R[a:b] ** 2)) if b <= len(R) else float('nan')
    rc = np.sqrt(np.mean(C[ca:cb] ** 2)) if cb <= len(C) else float('nan')
    tail.append({'rec_t': round(float(t), 2), 'rec_db': round(float(20 * np.log10(rr + 1e-9)), 1), 'clean_db': round(float(20 * np.log10(rc + 1e-9)), 1)})
res['tail_rms'] = tail
# head: first 1.5 s of the recording vs clean
head = []
for t in np.arange(0.0, 1.5, 0.125):
    a = int(t * SR); b = a + int(0.125 * SR)
    ca, cb = int((t + off) * SR), int((t + off) * SR) + int(0.125 * SR)
    head.append({'rec_t': round(float(t), 3), 'rec_db': round(float(20 * np.log10(np.sqrt(np.mean(R[a:b] ** 2)) + 1e-9)), 1),
                 'clean_db': round(float(20 * np.log10(np.sqrt(np.mean(C[ca:cb] ** 2)) + 1e-9)), 1)})
res['head_rms'] = head
# clean file: where does sound start / end
env = np.array([np.sqrt(np.mean(C[i:i + 2205] ** 2)) for i in range(0, len(C) - 2205, 2205)])
db = 20 * np.log10(env + 1e-9)
nz = np.where(db > -60)[0]
res['clean_sound_span_s'] = [float(nz[0] * 0.05), float((nz[-1] + 1) * 0.05)]
json.dump(res, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ('windows', 'tail_rms', 'head_rms')}, indent=1))
print('windows:', ' '.join(f"{w['rec_t']}:{w['offset_s']*1000:.2f}ms/r{w['r']}" for w in wins))
print('tail:', ' '.join(f"{w['rec_t']}:{w['rec_db']}/{w['clean_db']}" for w in tail))
print('head:', ' '.join(f"{w['rec_t']}:{w['rec_db']}/{w['clean_db']}" for w in head))
