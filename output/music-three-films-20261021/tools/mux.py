#!/usr/bin/env python3
"""mux.py — put the original-BGM WAV under a rendered picture and verify the result.

    python3 -I tools/mux.py PICTURE.mp4 BGM.wav OUT.mp4

Checks written to OUT.verify.json (and printed): stream codecs/params, frame count, video vs audio duration,
the encoded audio against the WAV (lag and correlation, i.e. A/V alignment of the soundtrack), loudness/true peak
of the encoded audio, first/last frame brightness (no black head/tail), file size and sha256.
"""
import hashlib
import json
import re
import subprocess
import sys

import numpy as np

pic, wav, out = sys.argv[1], sys.argv[2], sys.argv[3]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pic, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart',
                '-metadata', 'comment=Original BGM (sha256 6987131e...144b61), no narration. Picture: Claude Opus 5.5 code animation.', out], check=True)


def probe(f):
    return json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', f], capture_output=True, check=True).stdout)


P = probe(out)
v = next(s for s in P['streams'] if s['codec_type'] == 'video'); au = next(s for s in P['streams'] if s['codec_type'] == 'audio')
checks = {}
nf = int(v['nb_read_frames']); fps = eval(v['r_frame_rate'])
vd, ad = float(v['duration']), float(au['duration'])
checks['video'] = {'codec': v['codec_name'], 'profile': v.get('profile'), 'size': f"{v['width']}x{v['height']}", 'pix_fmt': v['pix_fmt'], 'fps': v['r_frame_rate'],
                   'frames': nf, 'duration_s': vd, 'color': [v.get('color_space'), v.get('color_primaries'), v.get('color_transfer'), v.get('color_range')]}
checks['audio'] = {'codec': au['codec_name'], 'sample_rate': au['sample_rate'], 'channels': au['channels'], 'duration_s': ad}
checks['duration_match_s'] = round(abs(nf / fps - ad), 4)

# encoded audio vs the WAV: alignment (lag) and identity (correlation)
dec = lambda f: np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout, np.float32).astype(np.float64)
A, Wv = dec(out), dec(wav)
i0, i1 = 48000 // 2, min(len(A), len(Wv)) - 48000 * 3
best = None
for lag in range(-480, 481, 1):
    x = A[i0:i1]; y = Wv[i0 + lag:i1 + lag]
    r = float(np.dot(x, y) / np.sqrt(np.dot(x, x) * np.dot(y, y)))
    if best is None or r > best[1]:
        best = (lag, r)
checks['audio_vs_wav'] = {'lag_samples_48k': best[0], 'lag_ms': round(best[0] / 48, 3), 'correlation': round(best[1], 5)}
e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', out, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True).stderr.decode()
s = e[e.rfind('Summary'):]
checks['audio_loudness'] = {'I_lufs': float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), 'TP_dbtp': float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))}


def frame_mean(t):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', out, '-frames:v', '1', '-vf', 'scale=108:192', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    return round(float(np.frombuffer(b, np.uint8).mean()), 1)


checks['luma_mean'] = {'first_frame': frame_mean(0), 'last_frame': frame_mean(max(0, nf / fps - 1.5 / fps))}
dl = subprocess.run(['ffmpeg', '-v', 'error', '-i', out, '-f', 'null', '-'], capture_output=True).stderr.decode().strip()
checks['decode_errors'] = dl or 'none'
checks['file'] = {'path': out, 'bytes': int(P['format']['size']), 'sha256': hashlib.sha256(open(out, 'rb').read()).hexdigest()}
ok = (checks['duration_match_s'] <= 1 / fps + 0.03 and abs(best[0]) <= 2 and best[1] > 0.99 and checks['decode_errors'] == 'none'
      and checks['luma_mean']['last_frame'] > 8 and checks['audio_loudness']['TP_dbtp'] <= -0.5)
checks['PASS'] = bool(ok)
json.dump(checks, open(out.rsplit('.', 1)[0] + '.verify.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(checks, indent=1, ensure_ascii=False))
sys.exit(0 if ok else 1)
