#!/usr/bin/env python3
"""bgm_full.py — the full film's soundtrack = the user's ORIGINAL BGM only: two contiguous passages of the reference audio,
joined once on a bar line, at original speed and pitch. Nothing is composed, synthesized, remixed or replaced. numpy+ffmpeg.

    python3 tools/bgm_full.py REF.m4a                  → out/audio/bgm.wav (48 kHz stereo 24-bit) + bgm-report.json + cues.js
    python3 tools/bgm_full.py REF.m4a --cues-only      → only out/audio/cues.js (+ src/cues.js with --write-cues); no WAV
                                                          (the server has no disk for audio; the M4 makes the WAV)
Map (seconds; film = what the viewer hears):
  A  source [15.810, 39.2359)  → film [0, 23.4259)    the thin bar → build → drop 2 → groove → thin → build → drop 3 → groove,
                                                       as recorded (the first 10 s are the approved preview)
  B  source [9.4505, 26.471)   → film [23.4259, 40.4464) bar 4 (the bar that follows the "lighter" bar types 3/11/17 in the song)
                                                       → bars 5, 6 → the thin bar → build → drop 2 AGAIN → two bars of groove.
  The join: an equal-power 25 ms crossfade that ends 2 ms before B's measured downbeat attack, which lands at film 23.4259 =
  exactly where A's own next downbeat (source 39.2359) would have been. Hearing the opening's build a second time is the
  film's familiarity demonstration (measured: identical source audio).
Processing, all recorded: one constant gain so the 48 kHz true peak ≤ −1.0 dBTP; 8 ms raised-cosine fade-in; a 2.6 s
raised-cosine fade-out to the end (a complete ending, no cut); 44.1 → 48 kHz resample; the WAV is padded with digital silence
to a whole number of video frames. No EQ, compression, limiting, ducking, stretch or pitch-shift.
Cues: spectral-flux onsets (method of the earlier analyze_source.py / bgm.py) on the WHOLE source, mapped through the map
above; per-frame measured loudness and sub-bass; a beat grid fitted to the first six measured onsets (conceptual 示意).
"""
import hashlib, json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
SRC = ARGS[0] if ARGS else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-anticipation-original-20261020', 'assets', 'reference-audio.m4a')
SRC_SHA = '6987131efbeb44cc19e106b9db1d4f0b10aba55263c8f37531b973b0ef144b61'
SR, OUT_SR, FPS = 44100, 48000, 30
A0, A1, B0, B1 = 15.810, 39.2359, 9.4505, 26.471
XF, PRE, FADE_IN, FADE_OUT, TP_MAX = 0.025, 0.002, 0.008, 2.6, -1.0
CUT = A1 - A0                         # film time of the join (B's downbeat lands here)
OFF_A, OFF_B = -A0, CUT - B0          # film = source + offset
AUDIO_END = CUT + (B1 - B0)
FRAMES = int(np.ceil(AUDIO_END * FPS)); END = FRAMES / FPS
S = lambda sec: int(round(sec * SR))
CUES_ONLY = '--cues-only' in sys.argv

sha = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
assert sha == SRC_SHA, f'reference audio sha256 {sha} != {SRC_SHA}'
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)

# ───────── the soundtrack ─────────
a = st[S(A0): S(A1 - PRE)].copy()
b = st[S(B0 - PRE - XF): S(B1)].copy()
n = S(XF); th = np.linspace(0, np.pi / 2, n)[:, None]
mix = np.vstack([a[:-n], a[-n:] * np.cos(th) + b[:n] * np.sin(th), b[n:]])
tt = np.arange(len(mix)) / SR
fade = np.ones(len(mix))
fi = tt < FADE_IN; fade[fi] = 0.5 - 0.5 * np.cos(np.pi * tt[fi] / FADE_IN)
T_FO = tt[-1] - FADE_OUT; fo = tt > T_FO; fade[fo] = 0.5 + 0.5 * np.cos(np.pi * (tt[fo] - T_FO) / FADE_OUT)
mix *= fade[:, None]
print(f'join at film {CUT:.4f} s; audio {len(mix) / SR:.4f} s; frames {FRAMES} ({END:.4f} s)', file=sys.stderr)

def to48(x):
    return subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-ar', str(OUT_SR), '-f', 'f64le', '-'],
                          input=x.astype(np.float64).tobytes(), capture_output=True, check=True).stdout
def measure(buf):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f64le', '-ar', str(OUT_SR), '-ac', '2', '-i', '-', '-af', 'ebur128=peak=true', '-f', 'null', '-'], input=buf, capture_output=True)
    e = p.stderr.decode(); s = e[e.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))
report = {'source': {'file': os.path.abspath(SRC), 'sha256': sha, 'seconds': round(len(st) / SR, 4)},
          'map': [{'name': 'A', 'source_s': [A0, A1], 'film_s': [0.0, round(CUT, 4)]}, {'name': 'B', 'source_s': [B0, B1], 'film_s': [round(CUT, 4), round(AUDIO_END, 4)]}],
          'join': {'film_s': round(CUT, 4), 'crossfade_s': XF, 'ends_before_attack_s': PRE, 'type': 'equal-power'},
          'frames': FRAMES, 'end_s': round(END, 4)}
if not CUES_ONLY:
    I0, TP0 = measure(to48(mix)); gain = min(0.0, round(TP_MAX - TP0 - 0.05, 2))
    out48 = np.frombuffer(to48(mix * 10 ** (gain / 20)), np.float64).reshape(-1, 2)
    pad = int(round(END * OUT_SR)) - len(out48)
    out48 = np.vstack([out48, np.zeros((max(0, pad), 2))])[: int(round(END * OUT_SR))]
    I1, TP1 = measure(out48.tobytes()); assert TP1 <= TP_MAX, TP1
    os.makedirs(os.path.join(ROOT, 'out', 'audio'), exist_ok=True)
    wav = os.path.join(ROOT, 'out', 'audio', 'bgm.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(OUT_SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', wav], input=out48.tobytes(), check=True)
    # provenance: decode the WAV back to 44.1 kHz; each segment (away from the join and the fades) against the source
    back = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-ar', str(SR), '-f', 'f64le', '-'], capture_output=True, check=True).stdout, np.float64).reshape(-1, 2).mean(1)
    # the EXACT integer sample offsets the construction above used (film index = source index + off). Rounding each time
    # independently (S(film) − S(source)) can disagree with the construction by one sample — r1's "B lag −1" was that.
    OFF_A_N = -S(A0)
    OFF_B_N = (S(A1 - PRE) - S(A0)) - S(XF) - S(B0 - PRE - XF)
    def corr(f0, f1, off_n, nominal_off_s):
        i0, i1 = S(f0), S(f1); x = back[i0:i1]; best = None
        for lag in range(-100, 101):
            j0 = i0 - off_n + lag; y = st[j0: j0 + len(x)].mean(1); r = float(np.dot(x, y) / np.sqrt(np.dot(x, x) * np.dot(y, y)))
            if best is None or r > best[1]: best = (lag, r)
        return {'film_s': [f0, f1], 'offset_samples_44k1': off_n, 'source_s0': round((i0 - off_n) / SR, 6), 'lag_samples_44k1': best[0], 'correlation': round(best[1], 6),
                'placement_vs_nominal_map_us': round((off_n / SR - nominal_off_s) * 1e6, 2)}
    report['processing'] = {'gain_db': gain, 'fade_in_s': FADE_IN, 'fade_out_s': FADE_OUT, 'resample': f'{SR}→{OUT_SR} Hz (ffmpeg default)', 'pad_to_frames': True,
                            'other': 'none (no EQ, compression, limiting, ducking, stretch, pitch)'}
    report['loudness'] = {'before_gain': {'I_lufs': I0, 'TP_dbtp': TP0}, 'bgm_wav': {'I_lufs': I1, 'TP_dbtp': TP1}}
    report['provenance_check'] = [corr(0.05, CUT - 0.1, OFF_A_N, OFF_A), corr(CUT + 0.1, AUDIO_END - FADE_OUT - 0.1, OFF_B_N, OFF_B)]
    report['wav'] = os.path.relpath(wav, ROOT); report['wav_sha256'] = hashlib.sha256(open(wav, 'rb').read()).hexdigest()

# ───────── measurement on the whole source (method of analyze_source.py / bgm.py), mapped to film time ─────────
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
src_on = [(float(ta[i]), float(full[i])) for i in peaks(full)]
def to_film(s):    # a source moment can be heard twice (source 15.8–26.5 s is in both A and B)
    out = []
    if A0 <= s < A1 - 0.01: out.append(s + OFF_A)
    if B0 - 0.01 <= s < B1: out.append(s + OFF_B)
    return out
film_on = sorted({(round(ft, 4), round(v, 3)) for s, v in src_on for ft in to_film(s)})
def src_of(tf):  # film → source time (for envelopes)
    return tf - OFF_A if tf < CUT else tf - OFF_B
k100 = int(0.1 * afps)
subE = 10 * np.log10(np.convolve((mag[:, (f >= 25) & (f < 70)] ** 2).sum(1), np.ones(k100) / k100, 'same') + 1e-12)
rmsE = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
def norm(v, lo, hi): return np.clip((v - np.percentile(v, lo)) / (np.percentile(v, hi) - np.percentile(v, lo)), 0, 1)
sub_n, rms_n = norm(subE, 10, 99), norm(rmsE, 5, 99.5)
tf = (np.arange(FRAMES) + 0.5) / FPS
gain_f = np.array([1.0 if t < AUDIO_END - FADE_OUT else (0.5 + 0.5 * np.cos(np.pi * min(1, (t - (AUDIO_END - FADE_OUT)) / FADE_OUT))) for t in tf])
src_t = np.array([src_of(t) for t in tf])
sub_f = np.interp(src_t, ta, sub_n) * gain_f; rms_f = np.interp(src_t, ta, rms_n) * gain_f
def near(t, tol=0.045):
    o = min(film_on, key=lambda o: abs(o[0] - t)); assert abs(o[0] - t) <= tol, f'no onset within {tol}s of film {t}'; return o[0]
P = 0.532
E = {}
E['chain'] = [o[0] for o in film_on if 0 <= o[0] < 1.5]
ch = np.array(E['chain']); PER, PH = np.polyfit(np.arange(len(ch)), ch, 1)
E['pickup'] = max([o for o in film_on if 1.6 <= o[0] < 2.05], key=lambda o: o[1])[0]
E['build_downbeat'] = near(17.9606 + OFF_A)
E['build'] = [o[0] for o in film_on if E['build_downbeat'] - 0.01 <= o[0] < 4.2]
E['drop'] = near(20.0911 + OFF_A)
E['drop_beats'] = [round(E['drop'] + k * P, 4) for k in range(0, 11)]
E['bar_lines'] = [round(E['drop'] + k * 4 * P, 4) for k in range(0, 3)]
E['thin2'] = near(28.601 + OFF_A); E['build2'] = near(30.729 + OFF_A); E['drop3'] = near(32.8504 + OFF_A)
E['bar16'] = near(34.985 + OFF_A); E['bar17'] = near(37.113 + OFF_A); E['join'] = round(CUT, 4)
E['bar5b'] = near(11.577 + OFF_B); E['bar6b'] = near(13.705 + OFF_B); E['thinB'] = near(15.836 + OFF_B)
E['buildB'] = near(17.9606 + OFF_B); E['dropB'] = near(20.0911 + OFF_B); E['bar10b'] = near(22.217 + OFF_B); E['bar11b'] = near(24.345 + OFF_B)
E['dropB_beats'] = [round(E['dropB'] + k * P, 4) for k in range(0, 13) if E['dropB'] + k * P < AUDIO_END]
E['fade_out'] = [round(AUDIO_END - FADE_OUT, 4), round(AUDIO_END, 4)]
grid8 = [round(float(PH + PER * i), 4) for i in range(0, 40)]
def g_on(g): o = min(film_on, key=lambda o: abs(o[0] - g)); return o[0] if abs(o[0] - g) <= 0.035 else None
shiftB = E['thinB'] - E['chain'][0]
PRED = {'period_s': round(float(PER), 5), 'phase_s': round(float(PH), 4), 'fit_from': 'first six measured onsets (E.chain)',
        'gridA': [{'t': g, 'onset': g_on(g)} for g in grid8 if g < 10.0],
        'gridB': [{'t': round(g + shiftB, 4), 'onset': g_on(g + shiftB)} for g in grid8 if g + shiftB < AUDIO_END - 0.2],
        'shiftB_s': round(shiftB, 4)}
cues = {'about': 'Shared timing for picture and music (film seconds). Original BGM only; see tools/bgm_full.py for the source map. Onsets/envelopes are MEASURED; prediction grids are conceptual (示意).',
        'fps': FPS, 'frames': FRAMES, 'end_s': round(END, 4), 'audio_end_s': round(AUDIO_END, 4), 'beat_s': P, 'map': report['map'],
        'events': E, 'onsets': [{'t': t, 's': v} for t, v in film_on if t < AUDIO_END],
        'rms': [round(float(v), 3) for v in rms_f], 'sub': [round(float(v), 3) for v in sub_f], 'prediction': PRED}
cj = "// GENERATED by tools/bgm_full.py from the user's original BGM — do not edit by hand.\nexport const CUES = " + json.dumps(cues, ensure_ascii=False, separators=(',', ':')) + ';\n'
os.makedirs(os.path.join(ROOT, 'out', 'audio'), exist_ok=True)
open(os.path.join(ROOT, 'out', 'audio', 'cues.js'), 'w').write(cj)
if '--write-cues' in sys.argv: open(os.path.join(ROOT, 'src', 'cues.js'), 'w').write(cj)
report['cues_js_matches_src'] = os.path.exists(os.path.join(ROOT, 'src', 'cues.js')) and open(os.path.join(ROOT, 'src', 'cues.js')).read() == cj
report['events'] = E; report['listening'] = 'none — measurements only'
if not CUES_ONLY: json.dump(report, open(os.path.join(ROOT, 'out', 'audio', 'bgm-report.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: report[k] for k in report if k != 'events'}, ensure_ascii=False, indent=1))
print(json.dumps(E, ensure_ascii=False))
