#!/usr/bin/env python3
"""analyze_source.py — measure the SOURCE music (the user-supplied reference audio) so the edit can be planned on its
real bars. numpy + ffmpeg only; nothing here is a listening judgement.

    python3 tools/analyze_source.py [path/to/reference-audio.m4a]      → assets/source-analysis.json

1. stereo → mono 44.1 kHz; STFT 1024/256; log-magnitude spectral flux in four bands (low 30–150, mid 150–2000,
   pres 2000–6000, high 6000–16000 Hz), each normalised by its 99th percentile; onsets = adaptive-threshold peaks.
2. tempo: beat period P fitted to the summed flux (P searched 0.40–0.70 s) between the first drop and 28.5 s.
3. bar line: the onset nearest the steepest rise of sub-bass (25–70 Hz, 100 ms smoothed) energy in 0.5–4 s — the moment
   the sub returns after the intro build (the first drop) — carried along P. (Anchoring on the strongest low-FLUX onset
   picked an off-beat 808 note; the three sub returns are exactly 8 and 6 bars apart on the sub-rise phase.)
4. sections: mean sub energy per bar; bars ≥ 3 dB under the median are 'thin'. A DROP = the first bar line after a thin
   bar (or a thin bar + one rising 'build' bar) where the sub returns; the intro's sub return is drop 1.
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-anticipation-original-20261020', 'assets', 'reference-audio.m4a')
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
x = st.mean(1)
DUR = len(x) / SR
N, H = 1024, 256
fps = SR / H
fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N)), N)[::H][: len(x) // H]
mag = np.abs(np.fft.rfft(fr * np.hanning(N), axis=1))
f = np.fft.rfftfreq(N, 1 / SR)
L = np.log1p(1000 * mag)
t = np.arange(len(fr)) / fps
rms_db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-12)

def flux(lo, hi):
    sel = (f >= lo) & (f < hi)
    d = np.maximum(np.diff(L[:, sel], axis=0, prepend=L[:1, sel]), 0).sum(1)
    return d / (np.percentile(d, 99) + 1e-9)
BANDS = {'low': flux(30, 150), 'mid': flux(150, 2000), 'pres': flux(2000, 6000), 'high': flux(6000, 16000)}
full = sum(BANDS.values())

def peaks(nov, gap=0.06, delta=0.35):
    w, g, out = int(0.5 * fps), max(1, int(gap * fps)), []
    for i in range(1, len(nov) - 1):
        loc = nov[max(0, i - w):i + w]; med = np.median(loc)
        if nov[i] > 0 and nov[i] >= med + delta * (loc.max() - med) and nov[i] == nov[max(0, i - g):i + g + 1].max():
            out.append(i)
    return out
onsets = []
for i in peaks(full):
    lo, hi = max(0, i - int(4 * fps)), min(len(t), i + int(4 * fps))
    tags = [k for k, v in BANDS.items() if v[i] >= np.percentile(v[lo:hi], 85)]
    onsets.append({'t': round(float(t[i]), 4), 'strength': round(float(full[i]), 3), 'bands': tags})
on_t = np.array([o['t'] for o in onsets])
def nearest(g, tol=0.07):
    j = int(np.argmin(np.abs(on_t - g))); return float(on_t[j]) if abs(on_t[j] - g) <= tol else None

# sub energy and the anchor
k100 = int(0.1 * fps)
subE = 10 * np.log10(np.convolve((mag[:, (f >= 25) & (f < 70)] ** 2).sum(1), np.ones(k100) / k100, 'same') + 1e-12)
rise = np.r_[np.zeros(k100), subE[k100:] - subE[:-k100]]
w = (t > 0.5) & (t < 4.0)
i_rise = int(np.argmax(np.where(w, rise, -1e9)))
anchor = float(on_t[int(np.argmin(np.abs(on_t - t[i_rise])))])

# tempo
best = None
for P in np.arange(0.40, 0.70, 0.0005):
    for ph in np.arange(0, P, 0.002):
        ts = np.arange(anchor + 0.3 + ph, 28.5, P)
        sc = np.interp(ts * fps, np.arange(len(full)), full).mean()
        if best is None or sc > best[0]: best = (sc, P, anchor + 0.3 + ph)
_, P, _ = best
BAR = 4 * P
first_bar = anchor - np.floor(anchor / BAR) * BAR
grid = []
for i, g in enumerate(np.arange(first_bar, DUR, P)):
    n = nearest(g)
    grid.append({'bar': i // 4, 'beat': i % 4, 'grid': round(float(g), 4), 'onset': None if n is None else round(n, 4)})

cen = (mag * f).sum(1) / (mag.sum(1) + 1e-12)
bars = []
for b in range(int((DUR - first_bar) / BAR) + 1):
    a0 = first_bar + b * BAR; a1 = min(DUR, a0 + BAR)
    m = (t >= a0) & (t < a1)
    if m.sum() == 0: continue
    bars.append({'bar': b, 't0': round(float(a0), 4), 't1': round(float(a1), 4), 'sub_db': round(float(subE[m].mean()), 2),
                 'centroid_hz': round(float(cen[m].mean()), 1), 'rms_db': round(float(rms_db[m].mean()), 2), 'complete': bool(a1 - a0 > BAR - 0.01)})
med = float(np.median([b['sub_db'] for b in bars if b['complete']]))
for b in bars: b['thin'] = b['sub_db'] < med - 3
drops = [{'bar': 0, 't': anchor, 'grid': round(float(first_bar), 4) if abs(first_bar - anchor) < 0.01 else anchor, 'build_bar_t0': round(float(anchor - BAR), 4), 'thin_bars': ['intro']}]
for i in range(1, len(bars)):
    if bars[i]['t0'] <= anchor + 0.01: continue
    if not bars[i]['thin'] and (bars[i - 1]['thin'] or (i >= 2 and bars[i - 2]['thin'])) and bars[i]['sub_db'] >= med - 1:
        if bars[i]['t0'] - drops[-1]['t'] < BAR * 1.5: continue
        n = nearest(bars[i]['t0'])
        drops.append({'bar': bars[i]['bar'], 't': round(n if n is not None else bars[i]['t0'], 4), 'grid': bars[i]['t0'],
                      'build_bar_t0': bars[i - 1]['t0'], 'thin_bars': [b['bar'] for b in bars[max(0, i - 2):i] if b['thin']]})
res = {
    'about': 'Measured from the user-supplied reference audio (an AAC screen-recording track). Onsets are spectral-flux candidates; the grid only labels bars/beats. No listening judgement.',
    'source': os.path.basename(SRC), 'duration_s': round(DUR, 4), 'stereo_peak_abs': [round(float(v), 4) for v in np.abs(st).max(0)],
    'tempo': {'beat_s': round(float(P), 5), 'bpm': round(60 / float(P), 3), 'bar_s': round(float(BAR), 5), 'anchor_sub_rise_s': anchor, 'first_bar_s': round(float(first_bar), 4)},
    'bars': bars, 'sub_median_db': round(med, 2), 'drops': drops, 'grid': grid, 'onsets': onsets,
}
os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
json.dump(res, open(os.path.join(ROOT, 'assets', 'source-analysis.json'), 'w'), indent=1, ensure_ascii=False)
print(f"{len(onsets)} onsets; beat {P:.4f} s = {60/P:.2f} BPM; bar {BAR:.4f} s; anchor (sub rise) {anchor} s; first bar line {first_bar:.4f} s")
print('drops:', [(d['bar'], d['t'], d['build_bar_t0'], d['thin_bars']) for d in drops])
for b in bars:
    print(f"bar {b['bar']:2d} {b['t0']:7.3f}–{b['t1']:7.3f}  sub {b['sub_db']:5.1f}  cent {b['centroid_hz']:6.0f}  rms {b['rms_db']:6.1f}  {'THIN' if b['thin'] else ''}{'' if b['complete'] else ' (partial)'}")
