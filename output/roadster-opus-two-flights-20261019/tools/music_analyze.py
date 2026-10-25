#!/usr/bin/env python3
"""music_analyze.py — measure the user's chosen music so the picture can be cut to its real drums. numpy + ffmpeg only.

    python3 -I tools/music_analyze.py <reference-original.m4a>

Writes assets/music/analysis.json (everything measured) and src/music.js (the subset the film imports).

Method (all from the audio, nothing typed in by hand):
  1. decode mono 44.1 kHz; STFT 1024/128 (2.9 ms hop); log-magnitude spectral flux in four bands:
     low 30–150 Hz (kick/808), mid 150–1500, snare 1500–6000 (clap/snare/hat body), high 6–16 kHz (hats/cymbals).
  2. onsets = adaptive-threshold peaks of the summed normalised flux, parabolic sub-hop refinement; each onset is tagged
     with the bands in which it is locally strong (≥ 85th percentile within ±4 s).
  3. a tempo grid (period + phase) is fitted to the novelty over the body only to *label* positions (bar/beat numbers);
     the bar phase is chosen as the eighth-note position with the strongest low-band (kick) flux.
  4. for every grid beat, the *detected* onset nearest to it (±70 ms) is recorded; the film snaps its cuts to these
     detected onsets, never to the grid itself. Beats without a detected onset are marked null.
  5. structure: the music's own stop (RMS < −40 dBFS), bass drop-outs (low-band energy ≥ 10 dB under its median for
     ≥ 1 beat), the hard cut at the end of the music and the platform end-card sound that must not be used.
"""
import json, os, subprocess, sys
import numpy as np

SRC = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
N, H = 1024, 128
fps = SR / H
fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N)), N)[::H][: len(x) // H]
S = np.abs(np.fft.rfft(fr * np.hanning(N), axis=1))
f = np.fft.rfftfreq(N, 1 / SR)
L = np.log1p(1000 * S)
t = np.arange(len(S)) / fps
rms_db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-12)

# ---- 5a. where the music is: last frame above −40 dBFS before the platform sound, the stop inside the song
loud = rms_db > -40
# the hard cut: the first ≥ 0.25 s run of quiet after 30 s
hard_cut = None
for i in range(int(30 * fps), len(t)):
    if not loud[i] and not loud[i:i + int(0.25 * fps)].any():
        hard_cut = float(t[i]); break
quiet_runs, i = [], 0
while i < len(t):
    if not loud[i]:
        j = i
        while j < len(t) and not loud[j]: j += 1
        if (j - i) / fps >= 0.25: quiet_runs.append([round(float(t[i]), 3), round(float(t[min(j, len(t) - 1)]), 3)])
        i = j
    else: i += 1
# the song's own break: the run under −30 dBFS inside the song (its swell back in rises through −40…−30 dBFS)
q30, i = [], 0
while i < len(t):
    if rms_db[i] < -30 and t[i] < hard_cut:
        j = i
        while j < len(t) and rms_db[j] < -30: j += 1
        if (j - i) / fps >= 0.25: q30.append([round(float(t[i]), 3), round(float(t[min(j, len(t) - 1)]), 3)])
        i = j
    else: i += 1
stop = next(r for r in q30 if r[0] > 1.0)
after = [r for r in quiet_runs if r[0] >= hard_cut - 0.01]
platform = None
if len(after) >= 2: platform = [after[0][1], after[1][0]]                    # the sound between two silences after the cut
USE_END = hard_cut - 0.02

def flux(lo, hi):
    sel = (f >= lo) & (f < hi)
    d = np.diff(L[:, sel], axis=0, prepend=L[:1, sel])
    v = np.maximum(d, 0).sum(1)
    body = (t > stop[1]) & (t < USE_END)
    return v / (np.percentile(v[body], 99) + 1e-9)
B = {'low': flux(30, 150), 'mid': flux(150, 1500), 'snare': flux(1500, 6000), 'high': flux(6000, 16000)}
full = sum(B.values())

# ---- 2. onsets
def pick(nov, delta=0.35, gap=0.09):
    w, g, out = int(0.5 * fps), int(gap * fps), []
    for i in range(1, len(nov) - 1):
        a, b = max(0, i - w), min(len(nov), i + w)
        loc = nov[a:b]; med = np.median(loc)
        if nov[i] > 0 and nov[i] >= med + delta * (loc.max() - med) and nov[i] == nov[max(0, i - g):i + g + 1].max():
            out.append(i)
    return out
def refine(v, i):
    if 0 < i < len(v) - 1:
        a, b, c = v[i - 1], v[i], v[i + 1]; den = a - 2 * b + c
        return i + (0.5 * (a - c) / den if den != 0 else 0.0)
    return float(i)
onsets = []
for i in pick(full):
    tt = refine(full, i) / fps
    if tt > USE_END or rms_db[i] < -45: continue
    lo, hi = int(max(0, (tt - 4) * fps)), int(min(len(t), (tt + 4) * fps))
    tags = [k for k, v in B.items() if v[i] >= np.percentile(v[lo:hi], 85)]
    onsets.append({'t': round(float(tt), 4), 'strength': round(float(full[i]), 3), 'bands': tags})
kicks = [o['t'] for o in onsets if 'low' in o['bands']]

# ---- 3. grid (labels only), fitted on the body between the stop and the hard cut
best = None
for P in np.arange(0.415, 0.430, 0.00005):
    E = P / 2
    for ph in np.arange(0, E, 0.001):
        ts = np.arange(stop[1] + 0.3 + ph, USE_END - 0.1, E)
        sc = np.interp(ts * fps, np.arange(len(full)), full).mean()
        if best is None or sc > best[0]: best = (sc, P, stop[1] + 0.3 + ph)
_, P, e0 = best
BAR = 4 * P
# bar line: the song's first hit (its strongest onset) is a downbeat; carry it onto the fitted eighth grid. Evidence
# printed below: folded over the bar from that line, the clap band (1–4 kHz) peaks on beat 3 (a half-time backbeat).
first_hit = onsets[0]['t']
e_first = e0 + np.round((first_hit - e0) / (P / 2)) * (P / 2)
bar0 = e_first - np.floor(e_first / BAR) * BAR
clap = flux(1000, 4000)
def fold(v):
    acc = np.zeros(8)
    for k, tt in enumerate(np.arange(bar0 + 3 * BAR, USE_END - 0.2, P / 2)):
        a, b = int((tt - 0.02) * fps), int((tt + 0.02) * fps); acc[k % 8] += v[a:b].max()
    return [round(float(z), 3) for z in acc / max(1, len(np.arange(bar0 + 3 * BAR, USE_END - 0.2, P / 2)) / 8)]
by_pos = {'clap_1_4k': fold(clap), 'snare': fold(B['snare']), 'high': fold(B['high']), 'low': fold(B['low'])}

# ---- 4. detected onset nearest every grid beat
on_t = np.array([o['t'] for o in onsets])
def nearest(tt, tol=0.07, pool=None):
    arr = on_t if pool is None else np.array(pool)
    if len(arr) == 0: return None
    j = int(np.argmin(np.abs(arr - tt)))
    return float(arr[j]) if abs(arr[j] - tt) <= tol else None
beats = []
for k in range(int((USE_END - bar0) / P) + 1):
    g = bar0 + k * P
    if g > USE_END: break
    d = nearest(g)
    kick = nearest(g, pool=kicks)
    o = next((o for o in onsets if d is not None and o['t'] == d), None)
    beats.append({'bar': k // 4, 'beat': k % 4, 'grid': round(float(g), 4), 'onset': None if d is None else round(d, 4),
                  'kick': kick is not None, 'strength': None if o is None else o['strength'],
                  'in_stop': bool(stop[0] - 0.02 <= g < stop[1] - 0.05)})

# ---- 5b. bass drop-outs (inside the song; not edits): beats whose mean 30–120 Hz energy is ≥ 6 dB under the body's
# median beat, two or more beats in a row
lowP = (S[:, (f >= 30) & (f < 120)] ** 2).sum(1)
bins = [(b['grid'], b['grid'] + P) for b in beats]
bE = np.array([10 * np.log10(lowP[int(g0 * fps):int(g1 * fps)].mean() + 1e-12) for g0, g1 in bins])
bodyb = np.array([stop[1] + 0.3 < g0 and g1 < USE_END for g0, g1 in bins])
med = float(np.median(bE[bodyb]))
drop, k = [], 0
while k < len(bins):
    if bodyb[k] and bE[k] < med - 6:
        j = k
        while j < len(bins) and bodyb[j] and bE[j] < med - 6: j += 1
        if j - k >= 2: drop.append([round(bins[k][0], 3), round(bins[j - 1][1], 3)])
        k = j
    else: k += 1

res = {
    'about': 'Measured from the user-chosen reference audio. Onsets are detected (spectral flux, four bands); the tempo grid only labels bar/beat numbers. The film snaps its cuts to detected onsets.',
    'source': os.path.basename(SRC), 'sample_rate': SR, 'hop_s': round(H / SR, 6),
    'structure': {'intro': [0.0, stop[0]], 'stop': stop, 'body': [stop[1], round(USE_END, 3)], 'hard_cut_s': round(hard_cut, 3),
                  'platform_sound_s': platform, 'quiet_runs_s': quiet_runs, 'bass_dropouts_s': drop,
                  'note': 'stop = the song\'s own break (present in the user\'s reference video); nothing after the hard cut is used'},
    'grid': {'beat_s': round(float(P), 5), 'bpm': round(60 / float(P), 3), 'bpm_half_time': round(30 / float(P), 3),
             'bar_s': round(float(BAR), 5), 'first_bar_s': round(float(bar0), 4), 'first_hit_s': first_hit, 'flux_by_eighth_in_bar': by_pos},
    'beats': beats, 'onsets': onsets, 'kicks': kicks,
}
os.makedirs(os.path.join(ROOT, 'assets', 'music'), exist_ok=True)
json.dump(res, open(os.path.join(ROOT, 'assets', 'music', 'analysis.json'), 'w'), indent=1, ensure_ascii=False)
js = {'source': res['source'], 'structure': res['structure'], 'grid': res['grid'],
      'beats': [[b['grid'], b['onset'], 1 if b['kick'] else 0] for b in beats],
      'onsets': [[o['t'], o['strength'], ''.join(k[0] for k in o['bands'])] for o in onsets]}
with open(os.path.join(ROOT, 'src', 'music.js'), 'w') as fh:
    fh.write('// music.js — GENERATED by tools/music_analyze.py from the measured audio; do not edit by hand.\n')
    fh.write('// beats: [grid_s, detected_onset_s | null, kick 0/1]; onsets: [t_s, strength, bands (l m s h)]\n')
    fh.write('export const MUSIC = ' + json.dumps(js, separators=(',', ':')) + ';\n')
nb = sum(1 for b in beats if b['onset'] is not None and not b['in_stop'])
print(f"{len(onsets)} onsets ({len(kicks)} kick-band); beat {P:.5f} s = {60/P:.2f} BPM; first bar {bar0:.4f} s; "
      f"{nb}/{sum(1 for b in beats if not b['in_stop'])} beats matched to a detected onset")
print('stop', stop, 'hard cut', round(hard_cut, 3), 'platform', platform, 'bass drop-outs', drop)
for b in beats:
    if b['beat'] == 0: print(f"bar {b['bar']:2d}  grid {b['grid']:7.3f}  onset {b['onset']}  kick {b['kick']}  {'(stop)' if b['in_stop'] else ''}")
