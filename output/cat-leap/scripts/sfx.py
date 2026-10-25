"""sfx.py: the footage's own sound effects (paws, meows, splashes, birds, the sneeze) laid on the film timeline.

Seedance added little piano tunes to four clips (A1, B, G, H2) despite "无bgm" in the prompts. Those clips use only
the vocals + drums stems from Demucs (htdemucs; audio/sep/CLIP/), which keep the meows, the sneeze and the footsteps
and drop the melodies. The other clips use their full sound. Gains and speeds come from src/timeline.json.

  python3 scripts/sfx.py   → audio/sfx-track.wav (48 kHz stereo)
"""
import json
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'src' / 'timeline.json').read_text())
SR = 48000


def source(clip, kind):
    if kind == 'clean':
        parts = [sf.read(ROOT / 'audio' / 'sep' / clip / f'{st}.wav')[0] for st in ('vocals', 'drums')]
        return parts[0] + parts[1]
    return sf.read(ROOT / 'audio' / 'sfx' / f'{clip}.wav')[0]


def main():
    out = np.zeros((int((TL['length'] + 1) * SR), 2))
    segs = TL['segments']
    for i, s in enumerate(segs):
        x = source(s['clip'], s['audio'])
        dur = s['b'] - s['a']
        n = int(dur * SR)
        pos = s['in'] * SR + np.arange(n) * s['rate']              # resample when the picture is retimed
        idx = np.arange(len(x))
        y = np.stack([np.interp(pos, idx, x[:, c], right=0) for c in range(2)], axis=1)
        y *= 10 ** (s['gain'] / 20)
        f = int(0.008 * SR)
        y[:f] *= np.linspace(0, 1, f)[:, None]
        y[-f:] *= np.linspace(1, 0, f)[:, None]
        nxt = segs[i + 1] if i + 1 < len(segs) else None
        if nxt and nxt['a'] < s['b']:                                 # overlapping tail (the moon under the room): fade it out
            k0 = int((nxt['a'] - s['a']) * SR)
            k1 = min(n, k0 + int(0.6 * SR))
            y[k0:k1] *= np.linspace(1, 0, k1 - k0)[:, None]
            y[k1:] = 0
        a = int(s['a'] * SR)
        out[a:a + n] += y
    sf.write(ROOT / 'audio' / 'sfx-track.wav', out.astype(np.float32), SR)
    print(f'sfx-track.wav: {len(out) / SR:.1f} s, peak {20 * np.log10(np.abs(out).max() + 1e-9):.1f} dBFS')


if __name__ == '__main__':
    main()
