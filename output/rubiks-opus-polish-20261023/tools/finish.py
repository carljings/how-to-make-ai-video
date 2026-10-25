#!/usr/bin/env python3
"""finish.py — master the score to −14 LUFS / true peak ≤ −1.5 dBTP, mux it with the picture, verify the result.

    python3 -I tools/finish.py out/picture.mp4 out/audio/score-raw.wav OUT.mp4

Mastering follows starter/render.mjs: gain, then a limiter at 4× sample rate, repeated until the loudness is within
0.3 LU of the target. Verification re-measures the AAC inside the delivered MP4 and checks frames and durations.
"""
import json
import subprocess
import sys

pic, raw, out = sys.argv[1:4]
master = raw.replace('-raw.wav', '-master.wav')


def run(args):
    return subprocess.run(args, capture_output=True, text=True)


def measure(f):
    r = run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-']).stderr
    j = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    return float(j['input_i']), float(j['input_tp']), float(j['input_lra'])


src_i, src_tp, src_lra = measure(raw)
gain = -14 - src_i
for _ in range(5):
    r = run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af',
             f'volume={gain:.2f}dB,aresample=192000,alimiter=limit=0.74:attack=3:release=80:level=0:latency=1,aresample=48000',
             '-c:a', 'pcm_s16le', master])
    assert r.returncode == 0, r.stderr
    i, tp, lra = measure(master)
    if abs(i + 14) < 0.3:
        break
    gain += -14 - i
print(f'master: {src_i:.1f} → {i:.1f} LUFS, true peak {tp:.1f} dBTP, LRA {lra:.1f} LU (gain {gain:+.1f} dB)')

r = run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', pic, '-i', master, '-map', '0:v', '-map', '1:a',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-shortest', out])
assert r.returncode == 0, r.stderr

# verification on the delivered file
probe = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                        'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels:format=duration,size',
                        '-of', 'json', out]).stdout)
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
fi, ftp, flra = measure(out)
dec = run(['ffmpeg', '-v', 'error', '-i', out, '-f', 'null', '-']).stderr.strip()
report = {
    'file': out, 'bytes': int(probe['format']['size']), 'duration': float(probe['format']['duration']),
    'video': {'codec': v['codec_name'], 'size': f"{v['width']}x{v['height']}", 'fps': v['r_frame_rate'], 'frames': int(v['nb_read_frames']), 'duration': float(v['duration'])},
    'audio': {'codec': a['codec_name'], 'duration': float(a['duration']), 'sample_rate': int(a['sample_rate']), 'channels': a['channels'], 'lufs': fi, 'true_peak_dbtp': ftp, 'lra': flra},
    'decode_errors': dec or None,
}
report['pass'] = (report['video']['frames'] == 4740 and report['video']['size'] == '1080x1920' and report['video']['fps'] == '30/1'
                  and v['codec_name'] == 'h264' and a['codec_name'] == 'aac' and int(a['sample_rate']) == 48000 and a['channels'] == 2
                  and abs(float(v['duration']) - 158) < 0.01 and abs(report['audio']['duration'] - report['video']['duration']) < 0.05
                  and abs(fi + 14) <= 0.5 and ftp <= -1.5 and not dec)
json.dump(report, open(out.replace('.mp4', '.verify.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps(report, ensure_ascii=False, indent=1))
assert report['pass'], 'Delivered MP4 failed the acceptance checks'
