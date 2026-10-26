#!/usr/bin/env python3
"""finish.py — master the score to −14 LUFS / true peak ≤ −1.5 dBTP, mux it with the picture, verify the result.

    python3 -I tools/finish.py out/picture.mp4 out/audio/score-raw.wav OUT.mp4 [duration]

Mastering follows starter/render.mjs: gain, then a limiter at 4× sample rate, repeated until the loudness is within
0.3 LU of the target. Verification re-measures the AAC inside the delivered MP4 and checks frames and durations.
"""
import json
import math
from pathlib import Path
import re
import subprocess
import sys

if len(sys.argv) not in (4, 5):
    raise SystemExit('usage: finish.py PICTURE.mp4 SCORE-raw.wav OUTPUT.mp4 [duration]')
pic, raw, out = sys.argv[1:4]
if Path(out).resolve() in (Path(pic).resolve(), Path(raw).resolve()):
    raise SystemExit('output must be different from both inputs')
if len(sys.argv) == 5:
    duration = float(sys.argv[4])
else:
    timeline = (Path(__file__).resolve().parents[1] / 'src/timeline.js').read_text()
    match = re.search(r'export\s+const\s+DURATION\s*=\s*(\d+(?:\.\d+)?)\s*;', timeline)
    if not match:
        raise SystemExit('cannot read numeric DURATION from src/timeline.js; provide duration explicitly')
    duration = float(match.group(1))
if not math.isfinite(duration) or duration <= 0:
    raise SystemExit('duration must be positive and finite')
FPS = 30
frames = round(duration * FPS)
if abs(frames - duration * FPS) > 1e-6:
    raise SystemExit('duration must be an integer number of 30 fps frames')
master = str(Path(raw).with_name(Path(raw).stem.removesuffix('-raw') + '-master.wav'))
# limiter ceiling (linear, at 4x sample rate); r5 uses 0.68 because AAC added up to 1.1 dB of true peak at 0.74
import os
LIMIT = float(os.environ.get('FINISH_LIMIT', '0.74'))


def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f'{args[0]} failed with exit {result.returncode}')
    return result


def probe_media(f, count_frames=False):
    args = ['ffprobe', '-v', 'error']
    if count_frames:
        args.append('-count_frames')
    args += ['-show_entries',
             'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels:format=duration,size',
             '-of', 'json', f]
    return json.loads(run(args).stdout)


def measure(f):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-']).stderr
    j = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return float(j['input_i']), float(j['input_tp']), float(j['input_lra'])


# Validate complete input lengths before mastering. Never let muxing conceal a short render.
picture = probe_media(pic, count_frames=True)
pv = next(s for s in picture['streams'] if s['codec_type'] == 'video')
audio = probe_media(raw)
pa = next(s for s in audio['streams'] if s['codec_type'] == 'audio')
if (int(pv['nb_read_frames']) != frames or pv['r_frame_rate'] != '30/1'
        or (pv['width'], pv['height']) != (1080, 1920)
        or abs(float(pv['duration']) - duration) > 1 / FPS + 0.001):
    raise SystemExit(f'picture does not match {frames} frames / {duration:g} s / 1080x1920 / 30 fps')
if (abs(float(pa['duration']) - duration) > 0.001
        or int(pa['sample_rate']) != 48000 or pa['channels'] != 2):
    raise SystemExit(f'raw score does not match {duration:g} s / 48000 Hz / stereo')

src_i, src_tp, src_lra = measure(raw)
if not all(math.isfinite(x) for x in (src_i, src_tp, src_lra)):
    raise SystemExit('raw score has invalid loudness measurements')
gain = -14 - src_i
for _ in range(5):
    r = run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af',
             f'volume={gain:.2f}dB,aresample=192000,alimiter=limit={LIMIT}:attack=3:release=80:level=disabled,aresample=48000',
             '-c:a', 'pcm_s16le', master])
    i, tp, lra = measure(master)
    if abs(i + 14) < 0.3:
        break
    gain += -14 - i
print(f'master: {src_i:.1f} → {i:.1f} LUFS, true peak {tp:.1f} dBTP, LRA {lra:.1f} LU (gain {gain:+.1f} dB)')

r = run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', pic, '-i', master, '-map', '0:v', '-map', '1:a',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out])

# verification on the delivered file
probe = probe_media(out, count_frames=True)
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
fi, ftp, flra = measure(out)
decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', out, '-f', 'null', '-'], capture_output=True, text=True)
dec = decoded.stderr.strip()
report = {
    'file': out, 'bytes': int(probe['format']['size']), 'duration': float(probe['format']['duration']),
    'expected_duration': duration, 'expected_frames': frames,
    'video': {'codec': v['codec_name'], 'size': f"{v['width']}x{v['height']}", 'fps': v['r_frame_rate'], 'frames': int(v['nb_read_frames']), 'duration': float(v['duration'])},
    'audio': {'codec': a['codec_name'], 'sample_rate': int(a['sample_rate']), 'channels': a['channels'],
              'duration': float(a['duration']), 'lufs': fi, 'true_peak_dbtp': ftp, 'lra': flra},
    'decode_errors': dec or None,
}
report['pass'] = (report['video']['frames'] == frames and v['r_frame_rate'] == '30/1'
                  and (v['width'], v['height']) == (1080, 1920) and v['codec_name'] == 'h264'
                  and abs(report['video']['duration'] - duration) <= 1 / FPS + 0.001
                  and abs(report['audio']['duration'] - duration) < 0.05
                  and abs(report['audio']['duration'] - report['video']['duration']) < 0.05
                  and a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and a['channels'] == 2
                  and abs(fi + 14) <= 0.5 and ftp <= -1.5 and decoded.returncode == 0 and not dec)
with Path(out).with_suffix('.verify.json').open('w') as f:
    json.dump(report, f, ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False, indent=1))
if not report['pass']:
    raise SystemExit(1)
