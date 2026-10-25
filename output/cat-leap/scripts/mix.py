"""mix.py: score + the footage's sound effects → two masters.

The score dips by up to 5 dB wherever the kitten's own sounds (the leap meow, the chirp, the wake bell, the sneeze) are
loud, so they read through the music. Mastering: gain, then a true-peak limiter run at 192 kHz (ffmpeg alimiter between
two resamples), measured with ffmpeg's EBU R128 meter and adjusted until it lands on target.

  python3 scripts/mix.py   → public/mix-10.wav (−10 LUFS, the loud Douyin version) and public/mix-14.wav (−14 LUFS)
Both keep true peak ≤ −1.5 dBTP.
"""
import json, re, subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'src' / 'timeline.json').read_text())
SR = 48000
CEILING_DB = -2.6          # limiter ceiling; AAC encoding adds ~0.5–0.8 dB of true peak, so the MP4 stays under −1.5 dBTP


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-9))


def measure(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    summary = out[out.rfind('Summary:'):]
    lufs = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summary).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summary).group(1))
    return lufs, tp


def master(src, dst, target):
    gain = target - measure(src)[0]
    for _ in range(4):
        lim = 10 ** (CEILING_DB / 20)
        af = f'volume={gain:.2f}dB,aresample=192000,alimiter=limit={lim:.4f}:attack=1:release=60:level=disabled,aresample=48000'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', af, '-c:a', 'pcm_s24le', str(dst)], check=True)
        lufs, tp = measure(dst)
        if abs(lufs - target) < 0.2:
            break
        gain += target - lufs
    print(f'{dst.name}: {lufs:.1f} LUFS, true peak {tp:.1f} dBTP (gain {gain:+.1f} dB)')


def main():
    score, _ = sf.read(ROOT / 'audio' / 'score.wav')
    sfx, _ = sf.read(ROOT / 'audio' / 'sfx-track.wav')
    n = int(TL['length'] * SR)
    score, sfx = score[:n], sfx[:n]
    # duck the score under loud sound effects: 20 ms RMS → up to 5 dB, fast attack, 150 ms release
    w = int(0.02 * SR)
    env = np.sqrt(ndimage.uniform_filter1d((sfx ** 2).mean(1), w))
    duck_db = -np.clip((db(env) + 30) * 0.5, 0, 5)
    duck_db = ndimage.minimum_filter1d(duck_db, int(0.15 * SR), origin=-int(0.06 * SR))
    duck_db = ndimage.uniform_filter1d(duck_db, int(0.03 * SR))
    y = score * 10 ** (duck_db / 20)[:, None] + sfx
    fade = int(0.02 * SR)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]
    raw = ROOT / 'audio' / 'mix-raw.wav'
    sf.write(raw, y.astype(np.float32), SR, subtype='FLOAT')
    print(f'premaster: {measure(raw)[0]:.1f} LUFS; score ducked up to {-duck_db.min():.1f} dB')
    master(raw, ROOT / 'public' / 'mix-10.wav', -10.0)
    master(raw, ROOT / 'public' / 'mix-14.wav', -14.0)


if __name__ == '__main__':
    main()
