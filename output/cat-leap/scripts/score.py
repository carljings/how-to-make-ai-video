"""score.py: the original score for 一跃 · One Leap, synthesised from nothing (no samples, no loops, no AI music).

F major, 120 BPM, 24 fps (one beat = 12 frames). The chords walk the "royal road" IV–V–iii–vi (Bb–C–Am–Dm) and only
resolve to the tonic F once, after the sneeze. Every section matches a shot in storyboard.md: a music-box intro, a snare
build into the leap, a drop whose colour changes with each world (guzheng for the koi, bubbles for the milk, sleigh
bells for the snow globe), a breakdown with the kitten's own meow (cut from clip A2, pitched to the melody) in space, a second drop with a choir on the moon, a
tape stop for the fall, and a music-box outro that pauses for the sneeze and leads back into the first bar so the video
loops. Cue times that depend on the footage (wake, sneeze) come from src/timeline.json.

  python3 scripts/score.py                → audio/score.wav (+ audio/stems/*.wav)
  python3 scripts/score.py --solo meow    → render a single test sound to audio/test-meow.wav (meow, box, kick, jingle, guzheng)

Needs numpy, scipy, soundfile and pedalboard (in the scratch venv, not the project).
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy import signal
from pedalboard import Pedalboard, Reverb, Delay, Compressor, Limiter, HighpassFilter, Chorus, Gain, LowShelfFilter, HighShelfFilter, PeakFilter

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
BPM = 120
BEAT = 60 / BPM
S16 = BEAT / 4
BAR = 4 * BEAT
TL = json.loads((ROOT / 'src' / 'timeline.json').read_text())
LENGTH = TL['length'] + 2.5          # seconds rendered (reverb tail after the last frame is cut later)
N = int(LENGTH * SR)
rng = np.random.default_rng(20261016)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def at(bar, pos16=0.0):
    """Seconds at bar (0-based) and 16th-note position."""
    return bar * BAR + pos16 * S16


# ---------------------------------------------------------------- building blocks

_tables = {}


def table(kind, f):
    """One period of a band-limited waveform with harmonics up to ~18 kHz (no aliasing)."""
    K = int(max(1, min(400, 18000 // max(f, 1))))
    key = (kind, K)
    if key not in _tables:
        x = np.arange(4096) / 4096
        out = np.zeros(4096)
        ks = range(1, K + 1) if kind == 'saw' else range(1, K + 1, 2)
        for k in ks:
            out += np.sin(2 * np.pi * k * x) / k
        out /= np.abs(out).max()
        _tables[key] = np.append(out, out[0])
    return _tables[key]


def osc(kind, freq, n, phase0=0.0):
    """Oscillator; freq is a number or an array of n frequencies (for bends and vibrato)."""
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    ph = (phase0 + np.cumsum(f) / SR) % 1.0
    if kind == 'sine':
        return np.sin(2 * np.pi * ph)
    tab = table(kind, float(np.median(f)))
    return np.interp(ph * 4096, np.arange(4097), tab)


def adsr(n, a, d, s, r, hold):
    """Envelope n samples long: attack a, decay d to level s, held until `hold` seconds, then release r."""
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rel_level = e[min(int(hold * SR), n - 1)]
    e = np.where(t > hold, rel_level * np.exp(-(t - hold) / max(r, 1e-4) * 3), e)
    fade = min(n, int(0.003 * SR))
    e[-fade:] *= np.linspace(1, 0, fade)
    return e


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def tv_lp(x, fc, q=0.8, block=16):
    """Low-pass whose cutoff follows the array fc (one value per sample), as a block-wise biquad with carried state.
    Blocks of 16 samples (3 kHz update rate): at 128 the coefficient steps made an audible zipper on fast sweeps."""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    for i in range(0, len(x), block):
        f = float(np.clip(fc[min(i + block // 2, len(fc) - 1)], 30, SR * 0.45))
        w = 2 * np.pi * f / SR
        alpha = np.sin(w) / (2 * q)
        cw = np.cos(w)
        b = np.array([(1 - cw) / 2, 1 - cw, (1 - cw) / 2])
        a = np.array([1 + alpha, -2 * cw, 1 - alpha])
        y[i:i + block], zi = signal.lfilter(b / a[0], a / a[0], x[i:i + block], zi=zi)
    return y


def ring_out(y, t, dur, rel):
    """Let a struck sound ring for `dur` seconds, then damp it smoothly to silence over `rel` (no clicks)."""
    return y * np.where(t < dur, 1.0, np.cos(np.clip((t - dur) / rel, 0, 1) * np.pi / 2) ** 2)


def noise(n):
    return rng.standard_normal(n)


def pan(x, p):
    """Mono → stereo, equal power; p from -1 (left) to 1 (right)."""
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def stereo(x):
    return x if x.ndim == 2 else pan(x, 0)


class Track:
    """A stereo bus the length of the film; sounds are added at times in seconds."""

    def __init__(self, name):
        self.name = name
        self.y = np.zeros((N, 2))

    def add(self, t, x, gain=1.0, p=None):
        x = stereo(x) if p is None else pan(x, p)
        f = min(len(x) // 4, int(0.005 * SR))       # safety net: no sound may end on a hard edge
        if f > 1:
            x = x.copy()
            x[-f:] *= np.linspace(1, 0, f)[:, None]
        i = int(round(t * SR))
        if i >= N:
            return
        if i < 0:
            x, i = x[-i:], 0
        j = min(N, i + len(x))
        self.y[i:j] += gain * x[:j - i]


def fx(y, *plugins):
    return Pedalboard(list(plugins))(y.T.astype(np.float32), SR).T.astype(np.float64)


# ---------------------------------------------------------------- instruments

def supersaw(notes, dur, cutoff=5200, voices=7, spread=0.22, a=0.004, d=0.25, s=0.75, r=0.12, env_amt=0.0):
    """Stacked detuned saws for each note, spread across the stereo field, then low-passed."""
    n = int((dur + r + 0.05) * SR)
    out = np.zeros((n, 2))
    det = np.linspace(-spread, spread, voices)
    for m in notes:
        for v, dv in enumerate(det):
            g = 1.0 if v == voices // 2 else 0.62
            x = osc('saw', mtof(m + dv), n, rng.random())
            out += pan(x * g, (v / (voices - 1)) * 2.0 - 1.0)
    e = adsr(n, a, d, s, r, dur)
    if env_amt:
        fc = cutoff * (1 + env_amt * np.exp(-np.arange(n) / SR / 0.08))
        out = np.stack([tv_lp(out[:, c], fc) for c in range(2)], axis=1)
    else:
        out = lp(out, cutoff)
    return out * e[:, None] / (len(notes) * voices ** 0.5 * 1.2)


def pluck(m, dur, bright=7000, decay=0.22):
    """Saw + square through a fast-closing low-pass: the lead."""
    n = int((dur + 0.35) * SR)
    f = mtof(m)
    x = (0.5 * osc('saw', f * 2 ** (0.08 / 12), n, 0.1) + 0.5 * osc('saw', f * 2 ** (-0.08 / 12), n, 0.6)
         + 0.2 * osc('square', f, n, 0.3))
    fc = 700 + bright * np.exp(-np.arange(n) / SR / decay)
    y = tv_lp(x, fc, q=0.8)
    return y * adsr(n, 0.002, 0.35, 0.35, 0.12, dur)


def bell(m, dur=1.2, bright=1.0):
    """Struck metal bar (glockenspiel): inharmonic partials of a free bar."""
    n = int((dur + 0.45) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    y = np.zeros(n)
    for ratio, amp, dec in [(1, 1, 1.4), (2.756, 0.42 * bright, 0.45), (5.404, 0.22 * bright, 0.18), (8.933, 0.1 * bright, 0.07)]:
        if f * ratio < 16000:
            y += amp * np.sin(2 * np.pi * f * ratio * t + rng.random()) * np.exp(-t / dec)
    y += lp(hp(noise(n), 4000), 10000) * np.exp(-t / 0.002) * 0.1
    a = np.minimum(1, t / 0.0015)
    return ring_out(y * a * 0.5, t, dur, 0.4)


def musicbox(m, dur=1.6):
    """Music-box tine: a cantilever (partials 1, 6.27, 17.55) with a slightly detuned twin for sweetness."""
    n = int((dur + 0.65) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    y = np.zeros(n)
    for det in (-3, 3):
        ff = f * 2 ** (det / 1200)
        y += np.sin(2 * np.pi * ff * t + rng.random()) * np.exp(-t / 1.5)
        y += 0.10 * np.sin(2 * np.pi * 2 * ff * t) * np.exp(-t / 0.5)
        if ff * 6.267 < 19000:
            y += 0.28 * np.sin(2 * np.pi * 6.267 * ff * t) * np.exp(-t / 0.12)
        if ff * 17.55 < 19000:
            y += 0.08 * np.sin(2 * np.pi * 17.55 * ff * t) * np.exp(-t / 0.03)
    y += lp(hp(noise(n), 5000), 11000) * np.exp(-t / 0.0015) * 0.12
    return ring_out(y * np.minimum(1, t / 0.001) * 0.32, t, dur, 0.6)


def guzheng(m, dur=0.5, vib=False):
    """Plucked silk-steel string: bright additive partials with slight stiffness, optional vibrato on long notes."""
    n = int((dur + 0.6) * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    if vib:
        f = f * 2 ** ((25 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.25) / 0.3, 0, 1)) / 1200)
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, (n,))) / SR
    y = np.zeros(n)
    for k in range(1, 14):
        stiff = np.sqrt(1 + 0.0004 * k * k)
        if np.max(f) * k * stiff > 18000:
            break
        y += (1 / k ** 0.9) * np.sin(k * stiff * ph) * np.exp(-t * (1.6 + 0.9 * k))
    y += bp(noise(n), 1500, 6000) * np.exp(-t / 0.004) * 0.25
    return y * np.minimum(1, t / 0.0008) * 0.35


def sub(m, dur):
    n = int((dur + 0.1) * SR)
    x = osc('sine', mtof(m), n)
    x = np.tanh(1.4 * x) / np.tanh(1.4)
    return x * adsr(n, 0.004, 0.3, 0.9, 0.05, dur)


def midbass(m, dur, cutoff=900):
    n = int((dur + 0.1) * SR)
    f = mtof(m)
    x = osc('saw', f, n, 0.3) + 0.6 * osc('square', f * 1.003, n, 0.7)
    fc = cutoff + 1800 * np.exp(-np.arange(n) / SR / 0.06)
    return tv_lp(x, fc, q=0.9) * adsr(n, 0.003, 0.12, 0.6, 0.04, dur) * 0.5


def pad(notes, dur, cutoff=1800, a=0.6, r=1.2):
    return supersaw(notes, dur, cutoff=cutoff, voices=5, spread=0.12, a=a, d=1.0, s=0.9, r=r)


_meows = {}
MEOWS = {'a2': ('meow-a2.wav', 79), 'b': ('meow-b.wav', 74)}   # file, the note it sounds at


def meow_s(which, shift=0, gain=1.0):
    """The kitten's own voice: a meow from clip A2 (~G5) or the chirp from clip B (~D5), cut from the footage
    (audio/sfx/). Placed where its natural pitch fits the chord; `shift` (semitones, resampled) stays small so the
    formants don't turn into a chipmunk."""
    if which not in _meows:
        _meows[which] = sf.read(ROOT / 'audio' / 'sfx' / MEOWS[which][0])[0]
    x = _meows[which]
    if shift:
        x = np.interp(np.arange(0, len(x) - 1, 2 ** (shift / 12)), np.arange(len(x)), x)
    return x * gain


def airpad(notes, dur, a=0.6, r=1.4):
    """A soft, breathy pad an octave up (replaces the formant choir, which sounded dated)."""
    n = int((dur + r + 0.1) * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in notes:
        for v in range(4):
            f = mtof(m + 12) * 2 ** ((rng.uniform(-7, 7) + 6 * np.sin(2 * np.pi * rng.uniform(0.2, 0.5) * t + rng.random() * 6)) / 1200)
            x = 0.7 * osc('sine', f, n, rng.random()) + 0.3 * lp(osc('saw', f, n, rng.random()), 2600)
            out += pan(x, rng.uniform(-0.9, 0.9))
    breath = bp(noise(n), 3000, 9000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)) * 0.08
    out += np.stack([breath, np.roll(breath, 999)], axis=1)
    return out * adsr(n, a, 1.0, 1.0, r, dur)[:, None] / (len(notes) * 4 ** 0.5 * 1.6)


# drums ------------------------------------------------------------------

def kick(punch=1.0):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 44 + 115 * np.exp(-t / 0.045) + 300 * np.exp(-t / 0.005)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.38) * np.clip((0.5 - t) / 0.1, 0, 1)
    knock = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.012) * 0.22
    click = lp(hp(noise(n), 2500), 9000) * np.exp(-t / 0.0015) * 0.18 * punch
    x = body + knock + click
    return np.tanh(0.9 * x) / np.tanh(0.9) * 0.85     # a touch of warmth, no square-wave buzz (drive was 2.2)


def clap():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    nz = bp(noise(n), 900, 2600)
    e = np.zeros(n)
    for k, d in enumerate([0, 0.010, 0.021]):
        e += np.where(t >= d, np.exp(-(t - d) / 0.006), 0) * (0.8 + 0.1 * k)
    e += np.where(t >= 0.028, np.exp(-(t - 0.028) / 0.11), 0) * 0.55
    return nz * e * 0.55


def snare(tone=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * 190 * t) + 0.5 * np.sin(2 * np.pi * 330 * t)) * np.exp(-t / 0.06) * tone
    nz = bp(noise(n), 1500, 9000) * np.exp(-t / 0.10)
    return ring_out((0.5 * body + 0.7 * nz) * 0.5, t, 0.18, 0.12)


_hat_osc = None


def hat(open_=False):
    """808-style hat: six square waves at inharmonic pitches, high-passed, plus noise."""
    global _hat_osc
    if _hat_osc is None:
        n = int(0.6 * SR)
        x = sum(osc('square', f, n, rng.random()) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
        _hat_osc = hp(x / 6 + 0.4 * noise(n), 7500, order=4)
    dec = 0.16 if open_ else 0.028
    n = int((0.55 if open_ else 0.12) * SR)
    t = np.arange(n) / SR
    return _hat_osc[:n] * np.exp(-t / dec) * 0.45


def crash(length=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = sum(osc('square', f, n, rng.random()) for f in (233.0, 351.0, 412.7, 590.2, 773.4, 1003.0, 1210.0))
    x = hp(x / 7 * 0.6 + noise(n), 4200, order=2)
    e = np.exp(-t / (length / 4.0)) * np.minimum(1, t / 0.002)
    return np.stack([x * e, np.roll(x, 37) * e], axis=1) * 0.28


def reverse_crash(length):
    return crash(length)[::-1] * np.linspace(0.6, 1, int(length * SR))[:, None] ** 2


def riser(length, lo=300, hi=9000):
    n = int(length * SR)
    u = np.linspace(0, 1, n)
    fc = lo * (hi / lo) ** (u ** 1.6)
    x = noise(n)
    y = tv_lp(x, fc, q=2.5) - 0.6 * tv_lp(x, fc * 0.5, q=0.7)
    return np.stack([y, np.roll(y, 211)], axis=1) * (u ** 2.2)[:, None] * 0.35


def downlifter(length=1.2):
    n = int(length * SR)
    u = np.linspace(0, 1, n)
    fc = 9000 * (180 / 9000) ** u
    y = tv_lp(noise(n), fc, q=2.0)
    return np.stack([y, np.roll(y, 173)], axis=1) * ((1 - u) ** 1.5)[:, None] * 0.4


def impact():
    n = int(1.8 * SR)
    t = np.arange(n) / SR
    f = 30 + 45 * np.exp(-t / 0.12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    nz = lp(noise(n), 1800) * np.exp(-t / 0.18) * 0.5
    return np.tanh(1.5 * (boom + nz)) * 0.7


def woodblock(pitch=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * 820 * pitch * t) + 0.5 * np.sin(2 * np.pi * 2190 * pitch * t)) * np.exp(-t / 0.025)
    return y * np.minimum(1, t / 0.0005) * 0.35


def tick(high=True):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    f = 3200 if high else 2500
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) + hp(noise(n), 6000) * np.exp(-t / 0.002) * 0.3) * 0.25


def jingle(n_bells=3, length=0.5):
    """The kitten's collar bell: a small jingle bell (rattling inharmonic partials), sometimes a few at once."""
    n = int(length * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for b in range(n_bells):
        f = rng.uniform(2300, 3300)
        d = int(rng.uniform(0, 0.03) * SR)
        part = sum(a * np.sin(2 * np.pi * f * r * t + rng.random() * 6) for r, a in [(1, 1), (1.52, 0.6), (2.31, 0.4), (3.17, 0.2)])
        rattle = 1 + 0.5 * np.sin(2 * np.pi * rng.uniform(28, 40) * t)
        e = np.exp(-t / rng.uniform(0.12, 0.22)) * rattle
        y[d:] += (part * e)[:n - d] / n_bells
    return ring_out(y * np.minimum(1, t / 0.0008) * 0.3, t, length - 0.15, 0.15)


def sleigh(length=0.18):
    n = int(length * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for _ in range(9):
        f = rng.uniform(5200, 9000)
        d = int(rng.uniform(0, 0.02) * SR)
        y[d:] += (np.sin(2 * np.pi * f * t) * np.exp(-t / rng.uniform(0.02, 0.06)))[:n - d]
    return hp(y, 4000) * 0.08


def bloop(f0=500, length=0.16):
    """A bubble: a sine sweeping quickly upward."""
    n = int(length * SR)
    t = np.arange(n) / SR
    f = f0 * (1 + 2.5 * (t / length) ** 1.5)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (length / 3)) * np.minimum(1, t / 0.002) * 0.3


def thump():
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = 70 + 60 * np.exp(-t / 0.03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 0.7


# ---------------------------------------------------------------- the score

CH = {  # chord voicings (pad / stab notes) and bass roots
    'Bb': dict(pad=[58, 62, 65, 69], stab=[70, 74, 77, 81], root=34),
    'C': dict(pad=[60, 64, 67, 74], stab=[72, 76, 79, 86], root=36),
    'Am': dict(pad=[57, 60, 64, 67], stab=[69, 72, 76, 79], root=33),
    'Dm': dict(pad=[62, 65, 69, 72, 76], stab=[74, 77, 81, 84], root=38),
    'F': dict(pad=[53, 60, 65, 69, 72, 79], stab=[77, 81, 84, 89], root=29),
}
#            bar: 0     1    2     3    4     5     6     7    8     9     10    11   12    13   14    15    16    17
CHORDS = ['Bb', 'C', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C']

# the hook, as (16th position, length in 16ths, MIDI note) per bar
HOOK = {
    'A': [(0, 2, 86), (2, 2, 89), (4, 3, 93), (7, 1, 91), (8, 2, 89), (10, 2, 86), (12, 4, 89)],
    'B': [(0, 3, 88), (3, 1, 89), (4, 4, 91), (8, 2, 88), (10, 2, 84), (12, 2, 86), (14, 2, 88)],
    'C': [(0, 2, 88), (2, 2, 84), (4, 2, 81), (6, 2, 84), (8, 3, 88), (11, 1, 86), (12, 4, 84)],
    'D': [(0, 2, 86), (2, 2, 81), (4, 4, 89), (8, 2, 88), (10, 2, 86), (12, 2, 84), (14, 2, 81)],
    'C2': [(0, 2, 93), (2, 2, 91), (4, 2, 88), (6, 2, 91), (8, 4, 93), (12, 2, 96), (14, 2, 93)],
    'D2': [(0, 6, 89), (6, 2, 88), (8, 8, 86)],
}
STAB_RHYTHM = [(0, 3), (3, 3), (6, 4), (10, 2), (12, 4)]   # 3-3-4-2-4: the bouncing chord chops

DROP1, DROP2 = range(2, 10), range(12, 14)


def third_below(m, chord):
    """The diatonic note a third below m (for the harmony line in the second drop)."""
    scale = [0, 2, 4, 5, 7, 9, 10]   # F major from F
    pc = (m - 65) % 12
    idx = scale.index(pc) if pc in scale else 0
    target = scale[(idx - 2) % 7]
    d = (pc - target) % 12
    return m - d


def render():
    T = {k: Track(k) for k in ['kick', 'drums', 'roll', 'perc', 'bass', 'stabs', 'pad', 'air', 'lead', 'guz', 'box', 'fx', 'meow']}
    kicks = []
    hum = lambda: rng.uniform(-0.006, 0.006)            # music-box timing, a few ms off the grid
    vel = lambda lo=0.8: rng.uniform(lo, 1.0)

    def kick_at(t, g=1.0):
        T['kick'].add(t, kick(), g)
        kicks.append((t, g))

    def box_phrase(b, phrase, g=0.9, stop=None):
        for p, l, m in phrase:
            t = at(b, p)
            if stop is None or t < stop:
                T['box'].add(t + hum(), musicbox(m), g * vel())

    # --- intro (bar 0) and build (bar 1)
    T['pad'].add(at(0), pad(CH['Bb']['pad'], BAR - 0.1, cutoff=900, a=0.3), 0.55)
    T['pad'].add(at(1), pad(CH['C']['pad'], BAR * 0.86, cutoff=1400, a=0.05, r=0.1), 0.5)
    box_phrase(0, HOOK['A'])
    box_phrase(1, HOOK['B'][:5])
    for i in range(8):                                   # the clock: tick-tock on 8ths through the intro
        T['perc'].add(at(0, 2 * i), tick(i % 2 == 0), 0.32 * vel(0.85), p=0.3 if i % 2 else -0.3)
    T['perc'].add(at(0), jingle(3, 0.7), 0.9, p=0.2)
    # snare roll: 8ths → 16ths → 32nds, rising; a noise riser and a pitched saw riser under it
    roll = [at(1, p) for p in (0, 2, 4, 6)] + [at(1, 8 + p) for p in range(4)] + [at(1, 12 + p / 2) for p in range(6)]
    for i, t in enumerate(roll):
        g = (0.25 + 0.6 * i / len(roll)) * vel(0.9)
        T['roll'].add(t, snare(1.4), g)
        T['roll'].add(t, clap(), g * 0.5)
    T['fx'].add(at(1), riser(1.75), 1.4)
    n = int(1.75 * SR)
    sweep = osc('saw', mtof(48) * 2 ** (np.linspace(0, 24, n) / 12), n) * np.linspace(0, 1, n) ** 2
    T['fx'].add(at(1), lp(sweep, 3000) * 0.18, 1.0)
    T['fx'].add(at(1, 8), reverse_crash(0.75)[: int(0.74 * SR)], 0.6)
    # 3.75–4.0: the gap (mixed to silence in mix()); the kitten's own meow from the footage fills it

    # --- drops
    def drop_bar(b, energy=1.0):
        ch = CH[CHORDS[b]]
        for beat in range(4):
            kick_at(at(b, 4 * beat), 1.0)
        for p in (4, 12):
            T['drums'].add(at(b, p), clap(), 0.8 * energy * vel(0.9))
            T['drums'].add(at(b, p), snare(0.6), 0.25 * energy)
        for p in range(16):
            v = [0.42, 0.18, 0.7, 0.18][p % 4] * vel(0.8)
            swing = 0.008 if p % 2 else 0.0
            T['drums'].add(at(b, p) + swing, hat(False), v * 0.45, p=0.25)
        for p in (2, 6, 10, 14):
            T['drums'].add(at(b, p), hat(True), 0.3 * vel(0.85), p=-0.2)
        for p, l in STAB_RHYTHM:
            T['stabs'].add(at(b, p), supersaw(ch['stab'] + [ch['stab'][0] - 12], l * S16 * 0.85, cutoff=3200 + 900 * energy, env_amt=0.9), 0.9)
        T['bass'].add(at(b), sub(ch['root'], BAR - 0.02), 0.9)          # the real sub: Bb1 58 Hz … D2 73 Hz
        for i in range(8):
            m = ch['root'] + 12 + (12 if i % 2 else 0)
            T['bass'].add(at(b, 2 * i), midbass(m, S16 * 1.7, cutoff=500 + 400 * energy), 0.5)
        T['pad'].add(at(b), pad(ch['pad'], BAR - 0.05, cutoff=2000, a=0.08, r=0.3), 0.3)

    for b in DROP1:
        drop_bar(b)
    for b in DROP2:
        drop_bar(b, 1.25)

    # lead: hook over drop 1 (A B C D A B C2 D2) and drop 2 (A B, with a harmony a third below)
    for b, name in zip(DROP1, ['A', 'B', 'C', 'D', 'A', 'B', 'C2', 'D2']):
        for p, l, m in HOOK[name]:
            T['lead'].add(at(b, p), pluck(m, l * S16 * 0.9, bright=5200), 0.55 * vel(0.88), p=rng.uniform(-0.12, 0.12))
            T['lead'].add(at(b, p), bell(m + 12 if m < 90 else m, 0.6, 0.7), 0.13)
    for b, name in zip(DROP2, ['A', 'B']):
        for p, l, m in HOOK[name]:
            T['lead'].add(at(b, p), pluck(m, l * S16 * 0.9, bright=6500), 0.6 * vel(0.88), p=0.1)
            T['lead'].add(at(b, p), pluck(third_below(m, CHORDS[b]), l * S16 * 0.9, bright=5500), 0.33, p=-0.35)
            T['lead'].add(at(b, p), bell(m + 12 if m < 90 else m, 0.7, 0.9), 0.17)

    # world changes: crash on every two-bar downbeat, a reverse swell into it, an impact on the big ones
    for b in (2, 4, 6, 8, 12):
        T['fx'].add(at(b), crash(2.4), 0.5)
        if b not in (2, 12):
            T['fx'].add(at(b) - 1.0, reverse_crash(1.0), 0.4)
    for b in (2, 12):
        T['fx'].add(at(b), impact(), 1.3)

    # bars 4–5, the koi: a guzheng glissando up into the bar, a long ringing note, and woodblocks
    for i, m in enumerate([65, 67, 69, 72, 74, 77, 79, 81]):
        T['guz'].add(at(3, 12) + i * S16 / 2, guzheng(m, 0.15), 0.5 * vel(0.85), p=-0.3 + 0.08 * i)
    T['guz'].add(at(4), guzheng(93, 1.2, vib=True), 0.55, p=0.1)
    for b in (4, 5):
        for p, pitch in [(0, 1.0), (3, 1.0), (6, 1.25), (10, 1.0), (11, 1.25)]:
            T['perc'].add(at(b, p), woodblock(pitch), 0.45 * vel(0.8), p=-0.4)
    # bars 6–7, the milk: bubbles
    for i, f in enumerate([420, 560, 700, 520]):
        T['fx'].add(at(6) + i * 0.07, bloop(f), 0.45, p=-0.3 + 0.2 * i)
    # bars 8–9, the snow globe: sleigh bells and celesta arpeggios
    for b in (8, 9):
        for p in range(16):
            T['perc'].add(at(b, p), sleigh(), (0.5 if p % 4 == 0 else 0.25) * vel(0.8), p=0.45)
        notes = CH[CHORDS[b]]['stab']
        for i in range(8):
            T['box'].add(at(b, 2 * i) + hum(), musicbox(notes[i % len(notes)] - 12 + (12 if i >= 4 else 0), 0.6), 0.3 * vel())
    for p in range(12, 16):                              # fill into the breakdown
        T['drums'].add(at(9, p), snare(), 0.5 + 0.1 * (p - 12))
    # the kitten's meow, pitched to the hook, answering at the ends of phrases
    for t, which, shift, g in [(at(5, 14), 'b', 0, 0.6), (at(7, 14), 'a2', 0, 0.55), (at(9, 12), 'a2', 2, 0.6)]:
        T['meow'].add(t, meow_s(which, shift), g, p=0.2)
    T['air'].add(at(8), airpad([69, 72, 76], 2 * BAR - 0.4, a=1.0), 0.4)

    # --- breakdown (bars 10–11): space. Pads, the music box, meows, a heartbeat kick; then the build.
    T['pad'].add(at(10), pad(CH['Bb']['pad'] + [74], BAR - 0.1, cutoff=1500, a=0.4, r=1.0), 0.55)
    T['pad'].add(at(11), pad(CH['C']['pad'], BAR * 0.86, cutoff=2100, a=0.2, r=0.1), 0.5)
    T['air'].add(at(10), airpad(CH['Bb']['pad'], BAR * 1.8, a=0.8, r=0.3), 0.55)
    T['bass'].add(at(10), sub(CH['Bb']['root'], BAR - 0.05), 0.7)
    T['bass'].add(at(11), sub(CH['C']['root'], BAR * 0.85), 0.6)
    box_phrase(10, HOOK['A'], 0.85)
    box_phrase(11, HOOK['B'][:5], 0.6)
    T['meow'].add(at(10, 8), meow_s('b'), 0.5, p=-0.35)
    T['meow'].add(at(10, 12), meow_s('a2'), 0.5, p=0.35)
    kick_at(at(10), 0.6)
    kick_at(at(10, 8), 0.45)
    roll = [at(11, p) for p in (0, 4, 8, 10, 12)] + [at(11, 13 + p / 2) for p in range(5)]
    for i, t in enumerate(roll):
        g = (0.25 + 0.6 * i / len(roll)) * vel(0.9)
        T['roll'].add(t, snare(1.4), g)
        T['roll'].add(t, clap(), g * 0.5)
    T['fx'].add(at(11), riser(1.75, lo=200), 1.4)
    sweep = osc('saw', mtof(48) * 2 ** (np.linspace(0, 24, n) / 12), n) * np.linspace(0, 1, n) ** 2
    T['fx'].add(at(11), lp(sweep, 3000) * 0.18, 1.0)
    T['fx'].add(at(11, 4), reverse_crash(1.25)[: int(1.24 * SR)], 0.5)

    # --- drop 2 (bars 12–13): the moon. A wide air pad, and a sparkle when the kitten catches the butterfly.
    T['air'].add(at(12), airpad([65, 69, 74, 77], BAR - 0.2, a=0.15, r=0.6), 0.7)
    T['air'].add(at(13), airpad([64, 67, 72, 76], BAR - 0.3, a=0.15, r=0.4), 0.7)
    tc = TL['cues']['catch']
    for i, m in enumerate([89, 93, 96, 98, 101, 105]):
        T['box'].add(tc + i * 0.035, bell(m, 0.9, 0.8), 0.28, p=-0.5 + 0.2 * i)
    T['fx'].add(tc, crash(2.0), 0.35)

    # --- the fall (bar 14): the tape stop (in mix()) at the end of bar 13; falling stars and a downlifter
    T['fx'].add(at(14), downlifter(1.4), 0.7)
    for i, m in enumerate([93, 91, 88, 86, 84, 81, 79, 76]):
        T['box'].add(at(14, 2 * i) + hum(), musicbox(m, 1.2), (0.6 - 0.04 * i) * vel(0.9))
    T['pad'].add(at(14), pad(CH['Am']['pad'], BAR - 0.4, cutoff=700, a=0.5, r=1.0), 0.35)

    # --- the wake (cue), the outro, the sneeze, the tonic at last, and the pickup into the loop
    tw, ts = TL['cues']['wake'], TL['cues']['sneeze']
    T['perc'].add(tw, thump(), 0.7)
    T['pad'].add(at(15), pad(CH['Dm']['pad'], BAR - 0.2, cutoff=1000, a=0.6, r=0.6), 0.4)
    T['pad'].add(at(16), pad(CH['Bb']['pad'], ts - at(16) - 0.15, cutoff=1100, a=0.4, r=0.1), 0.45)
    for i in range(int((ts - 0.25 - at(15)) / (BEAT / 2))):  # the clock comes back, so the end meets the start
        T['perc'].add(at(15) + i * BEAT / 2, tick(i % 2 == 0), 0.25 * vel(0.85), p=0.3 if i % 2 else -0.3)
    box_phrase(16, HOOK['A'], 0.85, stop=ts - 0.2)
    T['box'].add(ts + 0.18, bell(101, 1.5, 0.6), 0.3)
    T['perc'].add(ts + 0.18, jingle(2, 0.6), 0.7)
    T['pad'].add(ts + 0.18, pad(CH['F']['pad'], 1.6, cutoff=1300, a=0.05, r=1.6), 0.5)
    for i, m in enumerate([77, 81, 84, 89]):
        T['box'].add(ts + 0.18 + i * 0.06, musicbox(m, 1.6), 0.6)
    T['box'].add(TL['length'] - 0.5, musicbox(84), 0.75)  # pickup: C6, then the loop starts on D6
    T['perc'].add(TL['length'] - 0.5, tick(True), 0.25, p=-0.3)

    return T, kicks


def sidechain(kicks, depth=0.75, rel=0.32):
    g = np.ones(N)
    for t, k in kicks:
        i = int(t * SR)
        n = int(rel * SR)
        u = np.arange(n) / n
        shape = 1 - depth * k * (1 - u) ** 1.5
        att = int(0.008 * SR)
        shape[:att] = np.minimum(shape[:att], np.linspace(1, shape[att], att))
        j = min(N, i + n)
        g[i:j] = np.minimum(g[i:j], shape[:j - i])
    return g[:, None]


def tape_stop(y, t0, length=0.5):
    """Slow a bus to a stop between t0 and t0 + length (a turntable powering down), then silence."""
    i0, n = int(t0 * SR), int(length * SR)
    u = np.arange(n) / n
    speed = (1 - u) ** 1.6
    pos = i0 + np.cumsum(speed)
    seg = np.stack([np.interp(pos, np.arange(len(y)), y[:, c]) for c in range(2)], axis=1)
    seg *= np.clip((1 - u) * 3, 0, 1)[:, None]
    y = y.copy()
    y[i0:i0 + n] = seg
    y[i0 + n:i0 + n + int(2.0 * SR)] = 0
    return y


def gap(t0, t1, floor_db=-45):
    """A gain curve that drops the whole mix to near silence between t0 and t1 (the breath before a drop)."""
    g = np.ones(N)
    a, b = int(t0 * SR), int(t1 * SR)
    f = int(0.012 * SR)
    lo = 10 ** (floor_db / 20)
    g[a:b] = lo
    g[a:a + f] = np.linspace(1, lo, f)
    g[b - f:b] = np.linspace(lo, 1, f)
    return g[:, None]


def mix(T, kicks):
    duck = sidechain(kicks)
    soft = sidechain(kicks, depth=0.35, rel=0.18)
    stop_at = at(14) - 0.5
    bus = {}
    bus['kick'] = fx(T['kick'].y, HighpassFilter(28), Gain(-1))
    bus['drums'] = fx(T['drums'].y, HighpassFilter(150), Reverb(room_size=0.25, wet_level=0.12, dry_level=0.9, width=0.8))
    bus['roll'] = fx(T['roll'].y, HighpassFilter(120), Reverb(room_size=0.6, wet_level=0.3, dry_level=0.85, width=1.0))
    bus['perc'] = fx(T['perc'].y, Reverb(room_size=0.5, wet_level=0.25, dry_level=0.85))
    bus['bass'] = fx(T['bass'].y * duck, HighpassFilter(26), Compressor(threshold_db=-14, ratio=3, attack_ms=5, release_ms=80))
    bus['stabs'] = fx(T['stabs'].y * duck, HighpassFilter(180), PeakFilter(cutoff_frequency_hz=3200, gain_db=-3.5, q=0.9),
                      Chorus(rate_hz=0.6, depth=0.15, mix=0.3), Reverb(room_size=0.6, wet_level=0.25, dry_level=0.85, width=1.0))
    bus['pad'] = fx(T['pad'].y * soft, HighpassFilter(120), Reverb(room_size=0.8, wet_level=0.35, dry_level=0.75, width=1.0))
    bus['air'] = fx(T['air'].y * soft, HighpassFilter(250), Chorus(rate_hz=0.3, depth=0.3, mix=0.4),
                    Reverb(room_size=0.9, wet_level=0.5, dry_level=0.6, width=1.0))
    bus['lead'] = fx(T['lead'].y, HighpassFilter(200), Delay(delay_seconds=0.375, feedback=0.28, mix=0.2),
                     Reverb(room_size=0.5, wet_level=0.2, dry_level=0.9, width=0.9))
    bus['guz'] = fx(T['guz'].y, HighpassFilter(220), Delay(delay_seconds=0.25, feedback=0.25, mix=0.18),
                    Reverb(room_size=0.85, wet_level=0.4, dry_level=0.75, width=1.0))
    bus['box'] = fx(T['box'].y, HighpassFilter(250), Delay(delay_seconds=0.375, feedback=0.25, mix=0.15),
                    Reverb(room_size=0.82, wet_level=0.38, dry_level=0.8, width=1.0))
    bus['fx'] = fx(T['fx'].y, HighpassFilter(25))
    bus['meow'] = fx(T['meow'].y, HighpassFilter(300), Delay(delay_seconds=0.25, feedback=0.2, mix=0.15),
                     Reverb(room_size=0.55, wet_level=0.25, dry_level=0.85))
    for k in ('kick', 'drums', 'roll', 'bass', 'stabs', 'lead'):      # only the groove stops; pads and tails ring on
        bus[k] = tape_stop(bus[k], stop_at, 0.5)
    levels = dict(kick=0.95, drums=1.5, roll=1.4, perc=0.85, bass=1.0, stabs=1.7, pad=0.8, air=0.9, lead=0.4, guz=0.7, box=0.28, fx=0.65, meow=0.8)
    y = sum(bus[k] * levels[k] for k in bus) * 10 ** (-6 / 20)   # headroom before the master chain
    y *= gap(at(1, 15), at(2)) * gap(at(11, 15), at(12))
    y = fx(y, HighpassFilter(24), LowShelfFilter(cutoff_frequency_hz=70, gain_db=1.0), HighShelfFilter(cutoff_frequency_hz=11000, gain_db=-1.5),
           Compressor(threshold_db=-18, ratio=2.0, attack_ms=25, release_ms=150), Limiter(threshold_db=-3.0, release_ms=80))
    return y, bus


def main():
    if '--solo' in sys.argv:
        what = sys.argv[sys.argv.index('--solo') + 1]
        x = {'meow': lambda: np.concatenate([meow_s('a2'), meow_s('b'), meow_s('a2', 2)]),
             'box': lambda: np.concatenate([musicbox(m, 0.5)[:int(0.5 * SR)] for m in (86, 89, 93, 91)]),
             'kick': lambda: np.concatenate([kick()] * 2), 'jingle': lambda: jingle(3, 0.8),
             'guzheng': lambda: guzheng(93, 1.2, True)}[what]()
        sf.write(ROOT / 'audio' / f'test-{what}.wav', (x / np.abs(x).max() * 0.8).astype(np.float32), SR)
        return
    T, kicks = render()
    y, bus = mix(T, kicks)
    out = ROOT / 'audio'
    (out / 'stems').mkdir(parents=True, exist_ok=True)
    for k, v in bus.items():
        sf.write(out / 'stems' / f'{k}.wav', v.astype(np.float32), SR)
    y = y[: int((TL['length'] + 1.5) * SR)]
    sf.write(out / 'score.wav', y.astype(np.float32), SR)
    peak = 20 * np.log10(np.abs(y).max() + 1e-9)
    print(f'score.wav: {len(y) / SR:.2f} s, peak {peak:.1f} dBFS')


if __name__ == '__main__':
    main()
