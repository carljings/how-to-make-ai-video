#!/usr/bin/env python3
"""score.py — the preview's ORIGINAL music: composed in this file and synthesized from code (numpy + ffmpeg for metering).
No samples, no recordings, no voice, nothing from the user's reference track or any earlier film's score.

    python3 tools/score.py                → out/audio/music.wav (48 kHz stereo 24-bit) + out/audio/music-report.json
                                            + out/audio/cues.js (regenerated cue module; must equal src/cues.js byte for byte)
    python3 tools/score.py --write-cues   → also rewrites src/cues.js (the author does this before a freeze)

The piece (F minor, 120 BPM, 4/4; one beat = 0.5 s = 15 frames, one bar = 2 s):
  bar 1  0.0–2.0  THE RULE      four-on-the-floor kick, offbeat bass pluck, claps on 2 & 4, the hook (call) on a pluck
  bar 2  2.0–3.0  the rule again, the hook's answer starts (same rhythm = something to recognise)
         3.0–3.5  WITHHELD      the kick and bass stop where the grid says they belong; a snare roll + riser climb instead
         3.5–4.0  THE GAP       one accented snare (the launch), then near-silence: only a faint reversed swell
  bar 3  4.0–6.0  THE DROP      lands exactly on the predicted downbeat: hard kick, sub + distorted bass, wide chord
                                stabs, the SAME hook an octave-doubled supersaw (timing guessed right, size not)
  bar 4  6.0      FINAL HIT     the bass falls an octave; F-minor chord rings out, filtered decay; silence ≥ 0.3 s by 8.0
Mastered to ≈ −14 LUFS integrated, true peak ≤ −1.2 dBTP (static gain + a look-ahead peak limiter; measured by ffmpeg).
Deterministic: one seeded PCG64 generator.
"""
import json, os, re, subprocess, sys, hashlib
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, FPS = 48000, 30
BPM = 120.0
BEAT = 60.0 / BPM; STEP = BEAT / 4; BAR = 4 * BEAT
END = 8.0
NS = int(round(END * SR))
TARGET_LUFS, TP_MAX = -14.0, -1.2
rng = np.random.default_rng(20261020)

def at(bar, step=0.0): return round(bar * BAR + step * STEP, 6)
NOTE = {'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
def midi(s): return 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]
def hz(s): return 440.0 * 2 ** ((midi(s) - 69) / 12)

# ───────────────────────────── the composition ─────────────────────────────
DROP, FINAL = at(2), at(3)
WITHHELD = [at(1, 8), at(1, 12)]                # grid beats 3 and 4 of bar 2: no kick, no bass
LAUNCH = at(1, 12)                              # the roll's accent on beat 4 — the picture's jump
GAP = (LAUNCH + 0.02, DROP)
KICKS = [(at(0, s), 'rule') for s in (0, 4, 8, 12)] + [(at(1, s), 'rule') for s in (0, 4)] \
      + [(at(2, s), 'drop') for s in (0, 4, 8, 12)] + [(FINAL, 'final')]
CLAPS = [(at(0, 4), .55), (at(0, 12), .6), (at(1, 4), .6), (at(2, 4), 1.0), (at(2, 12), 1.0)]
HATS = [(at(0, s), .45, 'closed') for s in (2, 6, 10, 14)] + [(at(1, s), .45, 'closed') for s in (2, 6)] \
     + [(at(2, s), .9 if s % 4 == 2 else (.5 if s % 2 == 0 else .3), 'open' if s % 4 == 2 else 'closed') for s in range(16)]
ROLL = [(3.0, .35), (3.125, .42), (3.25, .5), (3.3125, .56), (3.375, .64), (3.4375, .72), (LAUNCH, 1.0)]
BASS_RULE = [(at(0, s), 'F2') for s in (2, 6, 10, 14)] + [(at(1, s), 'Db2') for s in (2, 6)]
BASS_DROP = [(at(2, 0), 1.0, 'F1'), (at(2, 8), .5, 'Db2'), (at(2, 12), .5, 'Eb2')]
FM, DB, EB = ['C4', 'F4', 'Ab4'], ['Db4', 'F4', 'Ab4'], ['Eb4', 'G4', 'Bb4']
PADS = [(0.0, 2.0, ['F3', 'C4', 'Ab4']), (2.0, 1.0, ['Db3', 'F4', 'Ab4']), (3.0, 0.5, ['Eb3', 'G4', 'Bb4'])]
STABS = [(at(2, s), ch) for s, ch in ((0, FM), (2, FM), (6, FM), (10, DB), (14, EB))]
FINAL_CHORD = ['F2', 'C3', 'F3', 'Ab3', 'C4', 'F4', 'Ab4', 'C5']
CALL = [(0, 2, 'F5'), (3, 1, 'F5'), (4, 2, 'Ab5'), (6, 2, 'C6'), (8, 3, 'Bb5'), (11, 1, 'Ab5'), (12, 2, 'F5'), (14, 2, 'Eb5')]
ANSWER = [(0, 2, 'F5'), (3, 1, 'F5'), (4, 2, 'Ab5'), (6, 2, 'Db6')]       # cut off by the withheld beats
LEAD = [(at(0, s), d * STEP, p, 'pluck') for s, d, p in CALL] + [(at(1, s), d * STEP, p, 'pluck') for s, d, p in ANSWER] \
     + [(at(2, s), d * STEP, p, 'saw') for s, d, p in CALL] + [(FINAL, 1.7, 'F5', 'final')]

# ───────────────────────────── synthesis helpers ─────────────────────────────
def tt(dur): return np.arange(int(round(dur * SR))) / SR
def _fft_filter(x, H):
    n = len(x); N = 1 << int(np.ceil(np.log2(n + 8192)))
    f = np.fft.rfftfreq(N, 1 / SR)
    return np.fft.irfft(np.fft.rfft(x, N) * H(f), N)[:n]
def lp(x, fc, order=2): return _fft_filter(x, lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order)))
def hp(x, fc, order=2): return _fft_filter(x, lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))
def bp(x, lo, hi, order=2): return hp(lp(x, hi, order), lo, order)
def svf_lp(x, fc, q=0.8):
    """time-varying 2-pole low-pass (Chamberlin state-variable); fc: array per sample"""
    y = np.zeros_like(x); low = band = 0.0; damp = 1.0 / q
    F = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    for i in range(len(x)):
        low += F[i] * band; high = x[i] - low - damp * band; band += F[i] * high; y[i] = low
    return y
def svf_bp(x, fc, q=2.0):
    y = np.zeros_like(x); low = band = 0.0; damp = 1.0 / q
    F = 2 * np.sin(np.pi * np.minimum(fc, SR / 6) / SR)
    for i in range(len(x)):
        low += F[i] * band; high = x[i] - low - damp * band; band += F[i] * high; y[i] = band
    return y
def _blep(ph, dt):
    out = np.zeros_like(ph)
    a = ph < dt; t = ph[a] / dt[a] if np.ndim(dt) else ph[a] / dt; out[a] = t + t - t * t - 1
    b = ph > 1 - dt; t = (ph[b] - 1) / (dt[b] if np.ndim(dt) else dt); out[b] = t * t + t + t + 1
    return out
def saw(f, n, ph0=0.0):
    dt = np.broadcast_to(np.asarray(f, float) / SR, (n,)).copy()
    ph = (ph0 + np.cumsum(dt) - dt[0]) % 1.0
    return 2 * ph - 1 - _blep(ph, dt)
def pulse(f, n, pw=0.5, ph0=0.0): return saw(f, n, ph0) - saw(f, n, (ph0 + pw) % 1.0)
def noise(n): return rng.standard_normal(n)
def pan2(x, p=0.0):
    a = (p + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], 1)
def add(bus, sig, t):
    i = int(round(t * SR)); sig = sig if sig.ndim == 2 else pan2(sig)
    j = min(NS, i + len(sig)); bus[i:j] += sig[:j - i]
def env_adr(n, a, d_tau, rel_at=None, rel=0.03, sus=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * (sus + (1 - sus) * np.exp(-np.maximum(t - a, 0) / d_tau))
    if rel_at is not None: e *= np.clip(1 - (t - rel_at) / rel, 0, 1)
    return e
def supersaw(f, n, voices=7, cents=20, width=0.8):
    out = np.zeros((n, 2))
    for v in range(voices):
        d = (v - (voices - 1) / 2) / ((voices - 1) / 2) if voices > 1 else 0
        x = saw(f * 2 ** (d * cents / 1200), n, rng.random())
        out += pan2(x, width * d * (1 if v % 2 else -1)) / np.sqrt(voices)
    return out

# ───────────────────────────── instruments ─────────────────────────────
def kick(kind):
    hard = kind != 'rule'; t = tt(0.8 if kind == 'final' else 0.6)
    f1, f0 = (44, 210) if hard else (50, 150)
    f = f1 + (f0 - f1) * np.exp(-t / (0.04 if hard else 0.03))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / {'rule': .17, 'drop': .3, 'final': .55}[kind]) * np.minimum(1, t / 0.001)
    click = hp(noise(len(t)) * np.exp(-t / 0.004), 1800) * (0.45 if hard else 0.3)
    drive = 2.4 if hard else 1.6
    return np.tanh(drive * (body + click)) / np.tanh(drive)
def clap(v):
    t = tt(0.4); n = noise(len(t))
    e = sum(np.exp(-np.maximum(t - d, 0) / 0.006) * (t >= d) for d in (0, .011, .022)) * .7 + np.exp(-np.maximum(t - .03, 0) / .1) * (t >= .03)
    return v * bp(n, 900, 4200) * e
def hat(v, kind):
    t = tt(0.35 if kind == 'open' else 0.08)
    metal = sum(np.sign(np.sin(2 * np.pi * f * t + rng.random() * 6)) for f in (317, 421, 563, 719, 877, 1031))
    x = hp(noise(len(t)) * .7 + metal * .15, 7000, 3) * np.exp(-t / (0.12 if kind == 'open' else 0.02))
    return v * x
def snare(v, k):
    t = tt(0.22); f = (180 + 60 * k) * (1 + .5 * np.exp(-t / .01))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .05)
    return v * (.55 * tone + bp(noise(len(t)), 1500, 9000) * np.exp(-t / (.06 + .04 * v)))
def bass_pluck(note):
    t = tt(0.3); f = hz(note)
    x = saw(f, len(t)) + .6 * np.sin(2 * np.pi * f * t)
    y = svf_lp(x, 180 + 2600 * np.exp(-t / .07), .9) * env_adr(len(t), .003, .14, rel_at=.22, rel=.06)
    return np.tanh(1.8 * y)
def bass_drop(note, dur):
    t = tt(dur + 0.06); f = hz(note); n = len(t)
    sub = np.sin(2 * np.pi * f * t)
    reese = (saw(f * 1.006, n, .1) + saw(f * .994, n, .6) + .5 * saw(2 * f * 1.003, n, .3)) / 2.5
    x = .7 * sub + lp(reese, 900, 2) * 1.5
    x = np.tanh(2.6 * x) / np.tanh(2.6)                       # harmonics for small speakers
    return x * env_adr(n, .004, 99, rel_at=dur, rel=.05, sus=1)
def pad(notes, dur):
    t = tt(dur + 0.4); n = len(t); out = np.zeros((n, 2))
    for s in notes: out += supersaw(hz(s), n, 5, 14, .7)
    e = np.minimum(1, t / .25) * np.clip(1 - (t - dur) / .4, 0, 1)
    out = np.stack([lp(out[:, c], 1400, 2) for c in (0, 1)], 1)
    return out * e[:, None] / len(notes)
def stab(notes):
    t = tt(0.32); n = len(t); out = np.zeros((n, 2))
    for s in notes: out += supersaw(hz(s), n, 7, 22, .95)
    e = env_adr(n, .004, .12, rel_at=.24, rel=.07)
    out = np.stack([svf_lp(out[:, c], 1500 + 6500 * np.exp(-t / .06), .9) for c in (0, 1)], 1)
    return out * e[:, None] / len(notes)
def lead(t0, dur, note, kind):
    f = hz(note)
    if kind == 'pluck':
        t = tt(dur + .3); n = len(t)
        x = pulse(f, n, .32) * .6 + .4 * saw(f, n) + .25 * np.sin(2 * np.pi * 2 * f * t)
        x = lp(x, 3600, 2) * env_adr(n, .003, .16, rel_at=dur, rel=.08, sus=.25)
        return pan2(x, 0)
    t = tt(dur + (.25 if kind == 'saw' else 1.4)); n = len(t)
    vib = 1 + (.0018 if kind == 'saw' else .004) * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - .15) / .3, 0, 1)
    x = supersaw(f * vib, n, 5, 12, .5) + pan2(.45 * pulse(f / 2 * vib, n, .5) + .3 * np.sin(2 * np.pi * 2 * f * t), 0)
    if kind == 'saw':
        e = env_adr(n, .005, 99, rel_at=dur, rel=.08, sus=1) * (.8 + .2 * np.exp(-t / .1))
        x = np.stack([lp(x[:, c], 7000, 2) for c in (0, 1)], 1)
    else:
        e = np.minimum(1, t / .004) * np.exp(-t / .75) * np.clip(1 - (t - dur) / .9, 0, 1)
        x = np.stack([svf_lp(x[:, c], 900 + 8000 * np.exp(-t / .5), .8) for c in (0, 1)], 1)
    return x * e[:, None]
def riser(t0, t1):
    t = tt(t1 - t0); n = len(t); u = t / t[-1]
    x = svf_bp(noise(n), 500 * (16 ** u), 1.5) * u ** 1.6
    tone = saw(hz('F3') * 2 ** (2 * u ** 1.4), n) * .25 * u ** 2
    return np.stack([x + tone, svf_bp(noise(n), 520 * (16 ** u), 1.5) * u ** 1.6 + tone], 1)
def swell(dur):
    t = tt(dur); n = len(t)
    x = np.stack([lp(noise(n), 3000, 1), lp(noise(n), 3000, 1)], 1) * ((t / t[-1]) ** 3)[:, None]
    return x
def impact(big):
    t = tt(2.2 if big else 1.6); n = len(t)
    f = 30 + 45 * np.exp(-t / .25)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (.9 if big else .6))
    crash = np.stack([hp(noise(n), 3500, 2), hp(noise(n), 3500, 2)], 1) * np.exp(-t / (1.2 if big else .9))[:, None]
    return pan2(np.tanh(1.5 * boom), 0) * .7 + crash * .26
def reverb_ir(rt60, n_sec, lpf, seed_shift=0):
    t = tt(n_sec); n = len(t); tau = rt60 / 6.9
    ir = np.stack([lp(noise(n), lpf, 1), lp(noise(n), lpf, 1)], 1) * np.exp(-t / tau)[:, None]
    ir[: int(.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True)) * .5
def convolve(x, ir):
    n = len(x) + len(ir); N = 1 << int(np.ceil(np.log2(n)))
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c], N) * np.fft.rfft(ir[:, c], N), N)[:len(x)] for c in (0, 1)], 1)
def sidechain(times, depth, tau):
    t = np.arange(NS) / SR; g = np.ones(NS)
    for tk in times:
        m = t >= tk - .003; d = np.exp(-np.maximum(t[m] - tk, 0) / tau)
        g[m] = np.minimum(g[m], 1 - depth * d)
    return g[:, None]

# ───────────────────────────── arrangement ─────────────────────────────
Z = lambda: np.zeros((NS, 2))
drums, bass, music, fx, rev_send, dly_send = Z(), Z(), Z(), Z(), Z(), Z()
for t0, kind in KICKS: add(drums, kick(kind) * {'rule': .62, 'drop': .95, 'final': 1.0}[kind], t0)
for t0, v in CLAPS:
    c = clap(v) * .32; add(drums, c, t0); add(rev_send, c * .6, t0)
for i, (t0, v, kind) in enumerate(HATS): add(drums, pan2(hat(v, kind) * .16, .25 if i % 2 else -.15), t0)
for k, (t0, v) in enumerate(ROLL):
    s = snare(v, k / 6) * .3 * (1.25 if t0 == LAUNCH else 1); add(drums, s, t0); add(rev_send, s * .5, t0)
for t0, note in BASS_RULE: add(bass, bass_pluck(note) * .32, t0)
for t0, dur, note in BASS_DROP: add(bass, bass_drop(note, dur) * .42, t0)
fin_bass = bass_drop('F1', 1.4); fin_bass *= np.exp(-np.arange(len(fin_bass)) / SR / .55)
add(bass, fin_bass * .5, FINAL)
for t0, dur, notes in PADS:
    p = pad(notes, dur) * .2; add(music, p, t0); add(rev_send, p * .5, t0)
for t0, ch in STABS:
    s = stab(ch) * .5; add(music, s, t0); add(rev_send, s * .35, t0)
fc = FINAL_CHORD; tch = tt(2.0); fin = np.zeros((len(tch), 2))
for s in fc: fin += supersaw(hz(s), len(tch), 7, 18, .9)
fin = np.stack([svf_lp(fin[:, c], 600 + 7000 * np.exp(-tch / .45), .8) for c in (0, 1)], 1) / len(fc)
fin *= (np.minimum(1, tch / .004) * np.exp(-tch / .6))[:, None]
add(music, fin * .55, FINAL); add(rev_send, fin * .5, FINAL)
for t0, dur, note, kind in LEAD:
    x = lead(t0, dur, note, kind) * {'pluck': .3, 'saw': .36, 'final': .36}[kind]
    add(music, x, t0); add(dly_send, x * (.35 if kind != 'final' else .25), t0); add(rev_send, x * .3, t0)
add(fx, riser(3.0, LAUNCH) * .16, 3.0)
add(fx, swell(DROP - 3.72) * .05, 3.72)
add(fx, impact(False) * .55, DROP); add(fx, impact(True) * .6, FINAL)
add(rev_send, impact(False) * .1, DROP)

# side-chain the bass and chords to the kicks (the drop pumps; the rule section breathes a little)
kick_t = [k[0] for k in KICKS]
bass *= sidechain([k for k in kick_t if k >= DROP], .7, .11)
music *= sidechain([k for k in kick_t if k >= DROP and k < FINAL], .55, .12) * sidechain([k for k in kick_t if k < DROP], .2, .1)
# delay: dotted-eighth ping-pong, 3 repeats, darkened
dly = Z(); D = int(round(3 * STEP * SR))
for r in range(1, 4):
    src = dly_send[:-D * r] * (.38 ** r); src = src[:, ::-1] if r % 2 else src
    dly[D * r:] += src
dly = np.stack([lp(dly[:, c], 3500, 1) for c in (0, 1)], 1)
rev = convolve(rev_send, reverb_ir(1.7, 2.0, 6000))
# THE GAP: the delay and reverb returns are cut after the launch, so the wait is a real hole (only the swell remains)
t = np.arange(NS) / SR
gap_gate = 1 - np.clip((t - (LAUNCH + .05)) / .12, 0, 1) * np.clip((DROP - .004 - t) / .004, 0, 1)
mix = drums + bass + music + fx + (dly * .8 + rev * .9) * gap_gate[:, None]
# the gap must be a gap: everything except the swell and reverb tails is already silent there; the tail end must be silence
tail = np.clip((7.7 - t) / .25, 0, 1) ** 2
mix *= tail[:, None]
def causal_hp(x, fc, q=0.7071):
    """2nd-order causal high-pass (RBJ biquad): no pre-ringing before the big attacks, unlike the zero-phase FFT filters"""
    w = 2 * np.pi * fc / SR; al = np.sin(w) / (2 * q); cw = np.cos(w); a0 = 1 + al
    b0, b1, b2, a1, a2 = (1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0, -2 * cw / a0, (1 - al) / a0
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i in range(len(x)):
        xi = x[i]; yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2, x1, y2, y1 = x1, xi, y1, yi; y[i] = yi
    return y
mix = np.stack([causal_hp(mix[:, c], 24) for c in (0, 1)], 1)

# ───────────────────────────── mastering ─────────────────────────────
def measure(x):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true', '-f', 'null', '-'],
                       input=x.astype(np.float32).tobytes(), capture_output=True)
    e = p.stderr.decode(); s = e[e.rfind('Summary'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)); LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', s).group(1))
    TP = float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))
    return I, TP, LRA
def oversampled_peak(x, k=4):
    n = len(x); N = 1 << int(np.ceil(np.log2(n)))
    X = np.fft.rfft(x, N, axis=0); Y = np.zeros((N * k // 2 + 1, x.shape[1]), complex); Y[: X.shape[0]] = X
    y = np.fft.irfft(Y, N * k, axis=0)[: n * k] * k
    return np.abs(y).max(1).reshape(n, k).max(1)
def limiter(x, ceil_db, look=0.002, rel=0.06):
    pk = oversampled_peak(x); need = np.minimum(1.0, 10 ** (ceil_db / 20) / np.maximum(pk, 1e-9))
    L = int(look * SR); g = need.copy()
    for s in range(1, L + 1): g[:-s] = np.minimum(g[:-s], need[s:])        # look-ahead: reach the gain before the peak
    out = np.empty_like(g); cur = 1.0; a = np.exp(-1 / (rel * SR))
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * a; out[i] = cur
    k = np.ones(L) / L; sm = np.convolve(np.concatenate([np.ones(L), out]), k, mode='full')[L: L + len(out)]   # soften the attack corner
    return x * np.minimum(out, sm)[:, None], float(20 * np.log10(np.min(np.minimum(out, sm))))
I0, TP0, _ = measure(mix)
gain = TARGET_LUFS - I0; master = mix * 10 ** (gain / 20); gr = 0.0
for it in range(6):
    lim, gr = limiter(master, TP_MAX - 0.5)
    I1, TP1, LRA = measure(lim)
    if TP1 <= TP_MAX and abs(I1 - TARGET_LUFS) <= 0.3: break
    gain += TARGET_LUFS - I1; master = mix * 10 ** (gain / 20)
master = lim
assert TP1 <= TP_MAX, f'true peak {TP1} > {TP_MAX}'
assert np.abs(master).max() < 1.0

# ───────────────────────────── outputs ─────────────────────────────
out = os.path.join(ROOT, 'out', 'audio'); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, 'music.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', wav], input=master.astype(np.float32).tobytes(), check=True)
def rms_db(a, b):
    seg = master[int(a * SR): int(b * SR)]; return round(float(10 * np.log10(np.mean(seg ** 2) + 1e-12)), 1)
SECTIONS = {'rule': [0.0, 3.0], 'withheld': [3.0, LAUNCH], 'gap': list(GAP), 'drop': [DROP, FINAL], 'final': [FINAL, 7.7], 'silence': [7.7, END]}
r6 = lambda x: round(float(x), 6)
cues = {
    'about': 'Shared timing for picture and music. Seconds from the first sample/frame. Generated by tools/score.py from its composition; the picture reads this file.',
    'bpm': BPM, 'beat_s': BEAT, 'bar_s': BAR, 'step_s': STEP, 'fps': FPS, 'end_s': END, 'frames': int(round(END * FPS)),
    'sections': {k: [r6(a), r6(b)] for k, (a, b) in SECTIONS.items()},
    'events': {'withheld': WITHHELD, 'launch': LAUNCH, 'gap': [r6(GAP[0]), r6(GAP[1])], 'drop': DROP, 'final': FINAL, 'silence_from': 7.7},
    'grid_beats': [r6(i * BEAT) for i in range(int(FINAL / BEAT) + 1)],
    'kicks': [{'t': r6(t0), 'kind': k} for t0, k in KICKS],
    'claps': [{'t': r6(t0), 'v': v} for t0, v in CLAPS],
    'roll': [{'t': r6(t0), 'v': v} for t0, v in ROLL],
    'lead': [{'t': r6(t0), 'dur': r6(d), 'note': p, 'midi': midi(p), 'kind': k} for t0, d, p, k in LEAD],
    'stabs': [{'t': r6(t0), 'notes': ch} for t0, ch in STABS],
    'bass': [{'t': r6(t0), 'note': n} for t0, n in BASS_RULE] + [{'t': r6(t0), 'dur': d, 'note': n} for t0, d, n in BASS_DROP] + [{'t': FINAL, 'note': 'F1'}],
}
cj = '// GENERATED by tools/score.py from its composition — do not edit by hand. The picture and the music share these times.\n' \
     + 'export const CUES = ' + json.dumps(cues, ensure_ascii=False, indent=1) + ';\n'
open(os.path.join(out, 'cues.js'), 'w').write(cj)
if '--write-cues' in sys.argv: open(os.path.join(ROOT, 'src', 'cues.js'), 'w').write(cj)
same = os.path.exists(os.path.join(ROOT, 'src', 'cues.js')) and open(os.path.join(ROOT, 'src', 'cues.js')).read() == cj
report = {
    'wav': os.path.relpath(wav, ROOT), 'sha256': hashlib.sha256(open(wav, 'rb').read()).hexdigest(), 'seconds': NS / SR, 'sample_rate': SR,
    'loudness': {'pre_master_I_lufs': I0, 'master_I_lufs': I1, 'master_TP_dbtp': TP1, 'LRA_lu': LRA, 'static_gain_db': round(gain, 2), 'limiter_max_gr_db': round(gr, 2),
                 'targets': {'I_lufs': TARGET_LUFS, 'TP_max_dbtp': TP_MAX}},
    'section_rms_dbfs': {k: rms_db(a, b) for k, (a, b) in SECTIONS.items()},
    'sample_peak_dbfs': round(float(20 * np.log10(np.abs(master).max())), 2),
    'cues_js_matches_src': same,
    'no_samples_no_voice': True,
}
json.dump(report, open(os.path.join(out, 'music-report.json'), 'w'), indent=1)
print(json.dumps(report, indent=1))
