#!/usr/bin/env python3
"""bgm.py — the preview's soundtrack is the user's ORIGINAL BGM: one contiguous 10.000 s passage of the reference audio,
at its original speed and pitch. Nothing is composed, synthesized, remixed or replaced. numpy + ffmpeg only.

    python3 tools/bgm.py [path/to/reference-audio.m4a]               → out/audio/bgm.wav (48 kHz stereo 24-bit)
                                                                         + out/audio/bgm-report.json + out/audio/cues.js
    python3 tools/bgm.py [...] --write-cues                           → also rewrites src/cues.js (author, before a freeze)

The reference stays OUTSIDE the project (default: ../../.omx/artifacts/music-anticipation-original-20261020/assets/
reference-audio.m4a, sha256 6987131e…4b61, extracted without re-encoding from the user's screen recording).

Passage: source [15.810, 25.810) s, decoded by ffmpeg at 44.1 kHz (the source's own rate). It starts 26 ms before the
downbeat of the song's thin bar (the bass drops out — measured, sub 36.1 dB vs median 41.5 dB), runs through the build
bar and the drop (source 20.091 s → preview 4.281 s) and two bars of the drop's groove, and ends in the lighter bar after
it. Processing, all recorded in the report:
  · one constant gain (dB) so the 48 kHz master's true peak is ≤ −1.0 dBTP (the source decodes to +1.7 dBTP: AAC overs);
  · an 8 ms raised-cosine fade-in (the cut lands in sustained material; avoids a click);
  · a 0.20 s raised-cosine fade-out at the very end (the preview stops inside a bar; no inserted silence);
  · resampling 44.1 → 48 kHz for the video's audio track (ffmpeg's default resampler).
No compression, limiting, EQ, ducking, time-stretch or pitch-shift.

Measurement (for the picture's cues; nothing here is a listening judgement): log-magnitude spectral flux (STFT 1024/256,
four bands), adaptive-threshold onsets — the same method as the earlier analysis (output/music-anticipation-original-
20261020/tools/analyze_source.py, read only) — on the WHOLE source, then windowed to the passage; sub-bass (25–70 Hz) and
low (30–150 Hz) energy per video frame.
"""
import hashlib, json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = ARGS[0] if ARGS else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-anticipation-original-20261020', 'assets', 'reference-audio.m4a')
SRC_SHA = '6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61'
SR, OUT_SR, FPS = 44100, 48000, 30
START, DUR = 15.810, 10.0
FADE_IN, FADE_OUT, TP_MAX = 0.008, 0.20, -1.0
S = lambda sec: int(round(sec * SR))

sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
assert sha == SRC_SHA, f'reference audio sha256 {sha} != {SRC_SHA}'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)
seg = st[S(START): S(START) + S(DUR)].copy()
assert len(seg) == S(DUR)

# ───────── measurement on the whole source (method of analyze_source.py) ─────────
x = st.mean(1); N, H = 1024, 256; afps = SR / H
fr = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N)), N)[::H][: len(x) // H]
mag = np.abs(np.fft.rfft(fr * np.hanning(N), axis=1)); f = np.fft.rfftfreq(N, 1 / SR); L = np.log1p(1000 * mag)
ta = np.arange(len(fr)) / afps
def flux(lo, hi):
    sel = (f >= lo) & (f < hi); d = np.maximum(np.diff(L[:, sel], axis=0, prepend=L[:1, sel]), 0).sum(1)
    return d / (np.percentile(d, 99) + 1e-9)
full = flux(30, 150) + flux(150, 2000) + flux(2000, 6000) + flux(6000, 16000)
def peaks(nov, gap=0.06, delta=0.35):
    w, g, out = int(0.5 * afps), max(1, int(gap * afps)), []
    for i in range(1, len(nov) - 1):
        loc = nov[max(0, i - w):i + w]; med = np.median(loc)
        if nov[i] > 0 and nov[i] >= med + delta * (loc.max() - med) and nov[i] == nov[max(0, i - g):i + g + 1].max(): out.append(i)
    return out
ons = [(float(ta[i]), float(full[i])) for i in peaks(full)]
P = 0.532                                         # fitted beat period of the song (analyze_source.py: 112.78 BPM)
win = [(round(t - START, 4), round(s, 3)) for t, s in ons if START <= t < START + DUR]
def strongest(a, b):
    c = [o for o in win if a <= o[0] < b]; assert c, f'no onset in [{a}, {b})'; return max(c, key=lambda o: o[1])[0]
def nearest(t, tol=0.04):
    o = min(win, key=lambda o: abs(o[0] - t)); assert abs(o[0] - t) <= tol, f'no onset within {tol}s of {t}'; return o[0]
k100 = int(0.1 * afps)
subE = 10 * np.log10(np.convolve((mag[:, (f >= 25) & (f < 70)] ** 2).sum(1), np.ones(k100) / k100, 'same') + 1e-12)
lowE = (mag[:, (f >= 30) & (f < 150)] ** 2).sum(1)

E = {}
E['thin_downbeat'] = nearest(0.026)                                   # the thin bar: bass withheld
E['chain'] = [o[0] for o in win if 0 <= o[0] < 1.5]                    # the thin bar's eighth-note onsets
gap_from = E['chain'][-1]
E['pickup'] = strongest(1.6, 2.05)                                     # the hit after the missing eighth
E['gap'] = [gap_from, E['pickup']]
E['build_downbeat'] = nearest(2.151)
E['build'] = [o[0] for o in win if E['build_downbeat'] - 0.01 <= o[0] < 4.2]
E['drop'] = nearest(20.091 - START)
# the sub returns at the drop (measured): steepest 100 ms rise of sub energy within ±0.15 s
ia = np.searchsorted(ta, START + E['drop'] - 0.15); ib = np.searchsorted(ta, START + E['drop'] + 0.15)
rise = subE[ia + k100: ib] - subE[ia: ib - k100]; E['drop_sub_rise_db'] = round(float(rise.max()), 2)
E['drop_beats'] = []
for k in range(0, 40):
    g = E['drop'] + k * P
    if g >= DUR - 0.05: break
    c = min(win, key=lambda o: abs(o[0] - g)); E['drop_beats'].append(round(c[0] if abs(c[0] - g) <= 0.04 else g, 4))
E['bar_lines'] = [b for b in E['drop_beats'][::4]]                     # drop, +1 bar, +2 bars
E['fade_out'] = [round(DUR - FADE_OUT, 4), DUR]
# per-frame envelopes (0..1) for the picture: sub-bass level and low-band attack energy, from the source
tf = START + (np.arange(int(DUR * FPS)) + 0.5) / FPS
def per_frame(v):
    out = np.interp(tf, ta, v); return out
sub_f = per_frame(subE); sub_n = np.clip((sub_f - np.percentile(subE, 10)) / (np.percentile(subE, 99) - np.percentile(subE, 10)), 0, 1)
low_f = per_frame(np.log10(lowE + 1e-9)); low_n = np.clip((low_f - np.percentile(np.log10(lowE + 1e-9), 20)) / (np.percentile(np.log10(lowE + 1e-9), 99.5) - np.percentile(np.log10(lowE + 1e-9), 20)), 0, 1)

# ───────── the soundtrack ─────────
n = len(seg); tt = np.arange(n) / SR
fade = np.ones(n)
fi = tt < FADE_IN; fade[fi] = 0.5 - 0.5 * np.cos(np.pi * tt[fi] / FADE_IN)
fo = tt > DUR - FADE_OUT; fade[fo] = 0.5 + 0.5 * np.cos(np.pi * (tt[fo] - (DUR - FADE_OUT)) / FADE_OUT)
def to48(a):
    return subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-ar', str(OUT_SR), '-f', 'f64le', '-'],
                          input=a.astype(np.float64).tobytes(), capture_output=True, check=True).stdout
def measure(b, sr=OUT_SR):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f64le', '-ar', str(sr), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'], input=b, capture_output=True)
    e = p.stderr.decode(); s = e[e.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))
I0, TP0 = measure(to48(seg * fade[:, None]))
gain = min(0.0, round(TP_MAX - TP0 - 0.05, 2))
out48 = to48(seg * fade[:, None] * 10 ** (gain / 20))
I1, TP1 = measure(out48)
assert TP1 <= TP_MAX, TP1
os.makedirs(os.path.join(ROOT, 'out', 'audio'), exist_ok=True)
wav = os.path.join(ROOT, 'out', 'audio', 'bgm.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(OUT_SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', wav], input=out48, check=True)
# provenance check: the written WAV, decoded back to 44.1 kHz, against the source passage (fades excluded): lag + correlation
back = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ar', str(SR), '-f', 'f64le', '-'], capture_output=True, check=True).stdout, np.float64).reshape(-1, 2)
a = back[S(0.05): S(DUR - FADE_OUT - 0.05)].mean(1); b0 = seg[:, :].mean(1)
best = None
for lag in range(-200, 201):
    bb = b0[S(0.05) + lag: S(DUR - FADE_OUT - 0.05) + lag]
    r = float(np.dot(a, bb) / np.sqrt(np.dot(a, a) * np.dot(bb, bb)))
    if best is None or r > best[1]: best = (lag, r)
ratio_db = 20 * np.log10(np.std(a) / np.std(b0[S(0.05): S(DUR - FADE_OUT - 0.05)]))

r4 = lambda v: round(float(v), 4)
cues = {
    'about': 'Shared timing for picture and music. Preview seconds (0 = first frame / first sample). The music is the user\'s original BGM, source [15.810, 25.810) s; every event below is MEASURED on that audio by tools/bgm.py.',
    'fps': FPS, 'frames': int(DUR * FPS), 'end_s': DUR, 'source_start_s': START, 'beat_s': P,
    'events': E,
    'onsets': [{'t': t, 's': s} for t, s in win],
    'sub': [round(float(v), 3) for v in sub_n],
    'low': [round(float(v), 3) for v in low_n],
}
cj = '// GENERATED by tools/bgm.py from the user\'s original BGM — do not edit by hand. Picture and music share these times.\n' \
     + 'export const CUES = ' + json.dumps(cues, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(ROOT, 'out', 'audio', 'cues.js'), 'w').write(cj)
if '--write-cues' in sys.argv: open(os.path.join(ROOT, 'src', 'cues.js'), 'w').write(cj)
srcc = os.path.join(ROOT, 'src', 'cues.js')
report = {
    'source': {'file': os.path.abspath(SRC), 'sha256': sha, 'decoded_sr': SR, 'seconds': round(len(st) / SR, 4)},
    'passage_source_s': [START, START + DUR], 'passage_source_samples_44k1': [S(START), S(START) + S(DUR)],
    'processing': {'gain_db': gain, 'fade_in_s': FADE_IN, 'fade_out_s': FADE_OUT, 'resample': f'{SR}→{OUT_SR} Hz (ffmpeg default)', 'other': 'none (no compression, limiting, EQ, ducking, stretch, pitch)'},
    'loudness': {'passage_before_gain': {'I_lufs': I0, 'TP_dbtp': TP0}, 'bgm_wav': {'I_lufs': I1, 'TP_dbtp': TP1}},
    'provenance_check': {'lag_samples_44k1': best[0], 'correlation': round(best[1], 6), 'level_ratio_db': round(float(ratio_db), 3), 'expected_level_ratio_db': gain},
    'events_preview_s': {k: v for k, v in E.items()}, 'events_source_s': {k: r4(v + START) for k, v in E.items() if isinstance(v, float) and k != 'drop_sub_rise_db'},
    'wav': os.path.relpath(wav, ROOT), 'wav_sha256': hashlib.sha256(open(wav, 'rb').read()).hexdigest(),
    'cues_js_matches_src': os.path.exists(srcc) and open(srcc).read() == cj,
    'listening': 'none — measurements only',
}
json.dump(report, open(os.path.join(ROOT, 'out', 'audio', 'bgm-report.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps(report, indent=1, ensure_ascii=False))
