#!/usr/bin/env python3
"""edit.py — build the film's soundtrack from the user-supplied music, using only its own material. numpy + ffmpeg.

    python3 tools/edit.py [path/to/reference-audio.m4a] [--write-plan]   → out/audio/master.wav + out/audio/edit-plan.json
    (--write-plan also overwrites the frozen assets/edit-plan.json; only the author does that, before a freeze)

Every splice point comes from assets/source-analysis.json (detected onsets of the drops and bar lines), never typed in.
Film map (source time → film time), equal-power 25 ms crossfades that END 2 ms before the next downbeat attack:
  S1  source [0, D3)                          → film [0, D3)            the song as is up to its 3rd drop
  S2  source [BUILD3, BAR_AFTER_2)            → film + (D3 − BUILD3)    the 3rd drop's build bar AGAIN (demonstration: the
                                                                         last wait is one bar longer), then the drop and
                                                                         two bars of it
  S3  source [D1, D1 + TAIL)                  → film from the next bar   the song's own first-drop hit as the final
                                                                         downbeat; after HOLD it is low-passed 12 kHz→150 Hz
                                                                         and faded exponentially (−43 dB at the end), then
                                                                         a 60 ms linear fade to zero: a landing, not a cut
Gain: the source is an AAC screen-recording track at −8.3 LUFS with a +1.7 dBTP true peak (decoded overs). One static
trim of −3.0 dB is applied to everything for headroom (reason: avoid clipping/AAC overload); no compression, no limiter,
no duck. If the trimmed master still has a true peak above −1.3 dBTP, the trim is increased to reach it (reported).
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = ARGS[0] if ARGS else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-anticipation-original-20261020', 'assets', 'reference-audio.m4a')
SR = 48000
A = json.load(open(os.path.join(ROOT, 'assets', 'source-analysis.json')))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
src = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)

XF, PRE = 0.025, 0.002            # crossfade length; it ends PRE seconds before the downbeat attack
HOLD, SWEEP, TAU, TAIL = 0.35, 1.6, 0.45, 2.75
GAIN_DB = -3.0
drops = A['drops']
D1, D3 = drops[0]['t'], drops[2]['t']
onsets = np.array([o['t'] for o in A['onsets']])
def onset_near(g, tol=0.07):
    j = int(np.argmin(np.abs(onsets - g))); assert abs(onsets[j] - g) <= tol, f'no onset near {g}'; return float(onsets[j])
BUILD3 = onset_near(drops[2]['build_bar_t0'])
BAR = A['tempo']['bar_s']
BAR_AFTER_2 = onset_near(D3 + 2 * BAR)          # the bar line two bars after the 3rd drop
OFF2 = D3 - BUILD3                              # ≈ one bar
HIT_F = BAR_AFTER_2 + OFF2                      # film time of the final downbeat
OFF3 = HIT_F - D1
END = HIT_F + TAIL + 0.45                       # ≥ 0.3 s of digital silence after the tail
S = lambda sec: int(round(sec * SR))

def segment(s0, s1):
    return src[S(s0):S(s1)].copy()
def splice(a, b, xf):
    """a then b, overlapping the last xf of a with the first xf of b (equal-power)."""
    n = S(xf); th = np.linspace(0, np.pi / 2, n)[:, None]
    mid = a[-n:] * np.cos(th) + b[:n] * np.sin(th)
    return np.vstack([a[:-n], mid, b[n:]])

# S1: up to (D3 − PRE); S2 starts XF earlier in source so its overlap sits before BUILD3's attack
c1 = D3 - PRE
s1 = segment(0, c1)
s2 = segment(BUILD3 - PRE - XF, BAR_AFTER_2 - PRE)
m = splice(s1, s2, XF)
# S3: the final hit
s3 = segment(D1 - PRE - XF, D1 - PRE - XF + TAIL + XF + PRE)
# tail processing on s3 (time 0 = its first sample; the hit is at XF + PRE)
n3 = len(s3); tt = np.arange(n3) / SR - (XF + PRE)
g = np.where(tt < HOLD, 1.0, np.exp(-(tt - HOLD) / TAU))
fc = 12000.0 * (150.0 / 12000.0) ** np.clip((tt - 0.2) / SWEEP, 0, 1)
# time-varying 2-pole low-pass (state-variable, Chamberlin), q = 0.707
out3 = np.zeros_like(s3)
for ch in range(2):
    low = band = 0.0
    xs = s3[:, ch]; ys = out3[:, ch]
    F = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR); Qd = 1.414
    for i in range(n3):
        high = xs[i] - low - Qd * band
        band += F[i] * high
        low += F[i] * band
        ys[i] = low
out3 *= g[:, None]
fade_n = S(0.06); out3[-fade_n:] *= np.linspace(1, 0, fade_n)[:, None]
m = splice(m, out3, XF)
total = S(END)
if len(m) < total: m = np.vstack([m, np.zeros((total - len(m), 2))])
m = m[:total]

def measure(arr):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true', '-f', 'null', '-'],
                       input=arr.astype(np.float32).tobytes(), capture_output=True)
    e = p.stderr.decode(); s = e[e.rfind('Summary'):]
    import re
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); TP = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))
    return I, TP
gain = GAIN_DB
I0, TP0 = measure(m * 10 ** (gain / 20))
if TP0 > -1.3: gain -= TP0 + 1.3
mast = m * 10 ** (gain / 20)
I1, TP1 = measure(mast)
os.makedirs(os.path.join(ROOT, 'out', 'audio'), exist_ok=True)
wav = os.path.join(ROOT, 'out', 'audio', 'master.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', wav], input=mast.astype(np.float32).tobytes(), check=True)
Isrc, TPsrc = measure(src)
# splice check: largest sample step within ±30 ms of each splice vs the 99.9th percentile of all steps
steps = np.abs(np.diff(mast, axis=0)).max(1); p999 = float(np.percentile(steps, 99.9))
def step_at(tf): a, b = S(tf - 0.03), S(tf + 0.03); return float(steps[a:b].max())
plan = {
    'about': 'Film soundtrack = the user-supplied music, its own material only. Times in seconds. film = source + offset per segment.',
    'source': os.path.basename(SRC), 'sample_rate': SR,
    'segments': [
        {'name': 'S1 song as is', 'source': [0.0, round(c1, 4)], 'film': [0.0, round(c1, 4)], 'offset': 0.0},
        {'name': 'S2 3rd build bar again + drop + 2 bars', 'source': [round(BUILD3 - PRE - XF, 4), round(BAR_AFTER_2 - PRE, 4)], 'film': [round(c1 - XF, 4), round(BAR_AFTER_2 - PRE + OFF2, 4)], 'offset': round(OFF2, 4)},
        {'name': 'S3 final downbeat = the song’s first-drop hit, low-pass sweep + exponential fade', 'source': [round(D1 - PRE - XF, 4), round(D1 - PRE + TAIL + PRE, 4)], 'film': [round(HIT_F - PRE - XF, 4), round(HIT_F + TAIL, 4)], 'offset': round(OFF3, 4),
         'tail': {'hold_s': HOLD, 'lowpass_hz': [12000, 150], 'sweep_s': SWEEP, 'decay_tau_s': TAU, 'final_linear_fade_s': 0.06}},
    ],
    'crossfade_s': XF, 'crossfade_ends_before_attack_s': PRE,
    'events_film': {'drop1': D1, 'drop2': drops[1]['t'], 'build3_original': BUILD3, 'build3_repeat': round(BUILD3 + OFF2, 4), 'drop3': round(D3 + OFF2, 4), 'final_hit': round(HIT_F, 4), 'end': round(END, 4)},
    'bars_film': sorted({round(b['t0'], 4) for b in A['bars'] if b['t0'] < c1} | {round(b['t0'] + OFF2, 4) for b in A['bars'] if BUILD3 - 0.01 <= b['t0'] < BAR_AFTER_2 - 0.01} | {round(HIT_F, 4)}),
    'gain_db': round(gain, 3), 'gain_reason': 'source decoded true peak +1.7 dBTP (AAC overs); static trim for headroom; no compression/limiter/duck',
    'loudness': {'source_I_lufs': Isrc, 'source_TP_dbtp': TPsrc, 'master_I_lufs': I1, 'master_TP_dbtp': TP1},
    'splice_step_check': {'p999_all': round(p999, 5), 'at_S2': round(step_at(c1), 5), 'at_S3': round(step_at(HIT_F), 5)},
    'master': os.path.relpath(wav, ROOT), 'end_s': round(END, 4),
}
json.dump(plan, open(os.path.join(ROOT, 'out', 'audio', 'edit-plan.json'), 'w'), indent=1, ensure_ascii=False)
if '--write-plan' in sys.argv: json.dump(plan, open(os.path.join(ROOT, 'assets', 'edit-plan.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps(plan, ensure_ascii=False, indent=1))
