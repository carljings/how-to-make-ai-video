"""patch_name.py: clip 1's narrator blurs the last syllable of 伍德福德 (it sounds like 伍德福顿). Replace that one
syllable with the same narrator's clear 德 from clip 3, under clip 1's own sound effects.

  python3 scripts/patch_name.py VOC1 NOVOC1 VOC3 → audio/seg1.wav (48 kHz stereo)
VOC1/NOVOC1: Demucs vocals / no_vocals of clips/seg1-1080p.mp4; VOC3: Demucs vocals of clips/seg3-1080p.mp4.
Times come from the vocal loudness envelope (see production-log.md).
"""
import sys, subprocess
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
def load(p, filt=None):
    a = ['ffmpeg', '-v', 'error', '-i', str(p)] + (['-af', filt] if filt else []) + ['-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(a, capture_output=True, check=True).stdout, dtype=np.float32).reshape(-1, 2).copy()

voc1, novoc1, mix1 = load(sys.argv[1]), load(sys.argv[2]), load(ROOT / 'clips/seg1-1080p.mp4')
A, B = 14.775, 15.042                      # clip 1: the blurred last syllable, to the end of the clip
SRC_A, SRC_B = 7.505, 7.78                 # clip 3: its clear 德
tempo = (SRC_B - SRC_A) / (B - A)
syl = load(sys.argv[3], f'atrim={SRC_A}:{SRC_B},asetpts=PTS-STARTPTS,atempo={tempo:.4f}')
n = int(round((B - A) * SR)); syl = syl[:n] if len(syl) >= n else np.pad(syl, ((0, n - len(syl)), (0, 0)))
# match loudness to clip 1's previous 德 (14.50–14.60)
ref = voc1[int(14.50 * SR):int(14.60 * SR)]
gain = np.sqrt((ref ** 2).mean() / max(1e-12, (syl[:int(0.1 * SR)] ** 2).mean()))
syl *= min(gain, 2.0)
voc = voc1.copy(); i0 = int(A * SR)
fade = int(0.008 * SR); w = np.linspace(0, 1, fade)[:, None]
voc[i0:i0 + n] = 0
voc[i0 - fade:i0] *= (1 - w)               # the old syllable fades out
syl[:fade] *= w                            # the new one fades in
voc[i0:i0 + n] += syl
patched = novoc1[:len(voc)] + voc
# keep the original mix everywhere except the window, crossfading 20 ms on the way in
out = mix1[:len(patched)].copy(); j0 = int(14.72 * SR); xf = int(0.02 * SR); v = np.linspace(0, 1, xf)[:, None]
out[j0:j0 + xf] = out[j0:j0 + xf] * (1 - v) + patched[j0:j0 + xf] * v
out[j0 + xf:] = patched[j0 + xf:len(out)]
dst = ROOT / 'audio/seg1.wav'; dst.parent.mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', str(dst)], input=out.astype(np.float32).tobytes(), check=True)
print(f'tempo {tempo:.3f}, gain {min(gain, 2.0):.2f} → {dst.relative_to(ROOT)}')
