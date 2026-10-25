#!/usr/bin/env python3
"""finish.py — picture + the recording's own soundtrack → the delivered MP4, with the technical checks.

    python3 -I tools/finish.py PICTURE.mp4 AUDIO.m4a OUT.mp4 [--tp -1.0] [--fade 0.5] [--work DIR]

Audio (same treatment as the earlier films): one constant gain so the ENCODED file's true peak is <= --tp dBTP
(no compression, no limiting, no ducking), then a half-sine fade over the last --fade seconds that only follows
the song's own decay, padded/trimmed to exactly the picture's length (frames / fps). Muxed by stream copy
(the picture is never re-encoded). Then: full decode of every stream, frame count, durations, start times,
colour tags, loudness of the delivered file, sha256. Writes OUT.json next to OUT.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

ap = argparse.ArgumentParser()
ap.add_argument('picture'); ap.add_argument('audio'); ap.add_argument('out')
ap.add_argument('--tp', type=float, default=-1.0)
ap.add_argument('--fade', type=float, default=0.5)
ap.add_argument('--work', default=None)
a = ap.parse_args()
work = a.work or os.path.dirname(os.path.abspath(a.out))
os.makedirs(work, exist_ok=True)


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-4000:]); raise SystemExit('failed: ' + ' '.join(cmd[:6]))
    return r


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]).stdout)


def loud(path):
    """integrated loudness, LRA and true peak (ebur128, 4x oversampled peak) of the first audio stream"""
    err = run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr
    summ = err[err.rfind('Summary:'):]
    g = lambda pat: float(re.search(pat, summ, re.S).group(1))
    return {'I_lufs': g(r'I:\s+(-?[\d.]+) LUFS'), 'LRA_lu': g(r'LRA:\s+(-?[\d.]+) LU'), 'TP_dbtp': g(r'True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS')}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


pv = probe(a.picture)
vs = [s for s in pv['streams'] if s['codec_type'] == 'video'][0]
num, den = map(int, vs['r_frame_rate'].split('/'))
fps = num / den
nframes = int(run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', a.picture]).stdout.strip())
dur = nframes / fps
src_audio = probe(a.audio)
sas = [s for s in src_audio['streams'] if s['codec_type'] == 'audio'][0]
sr = int(sas['sample_rate'])
nsamp = round(dur * sr)
src_loud = loud(a.audio)
print(f'picture: {nframes} frames @ {fps:g} fps = {dur:.6f} s | audio in: {sas["codec_name"]} {sr} Hz {sas["channels"]} ch, {src_loud}')

wav = os.path.join(work, 'audio_src.wav')
run(['ffmpeg', '-y', '-v', 'error', '-i', a.audio, '-map', '0:a:0', '-c:a', 'pcm_f32le', wav])
gain = a.tp - 0.25 - src_loud['TP_dbtp']          # start a little under the target; AAC re-encoding can lift peaks
enc = os.path.join(work, 'audio_final.m4a')
for it in range(6):
    af = (f'volume={gain:.3f}dB,afade=t=out:st={dur - a.fade:.6f}:d={a.fade:.6f}:curve=hsin,'
          f'apad=whole_len={nsamp},atrim=end_sample={nsamp}')
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', af, '-c:a', 'aac', '-b:a', '320k', '-ar', str(sr), enc])
    el = loud(enc)
    print(f'  pass {it + 1}: gain {gain:+.2f} dB → encoded TP {el["TP_dbtp"]:+.2f} dBTP, I {el["I_lufs"]:.1f} LUFS')
    if a.tp - 0.3 <= el['TP_dbtp'] <= a.tp + 1e-9:      # inside [target − 0.3, target]: done
        break
    gain += (a.tp - 0.1 - el['TP_dbtp']) if el['TP_dbtp'] < a.tp - 0.3 else -((el['TP_dbtp'] - a.tp) + 0.05)
else:
    raise SystemExit('could not reach the true-peak target')
os.remove(wav)

run(['ffmpeg', '-y', '-v', 'error', '-i', a.picture, '-i', enc, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy',
     '-movflags', '+faststart', a.out])

# ---- checks on the delivered file
po = probe(a.out)
v = [s for s in po['streams'] if s['codec_type'] == 'video'][0]
au = [s for s in po['streams'] if s['codec_type'] == 'audio'][0]
dec = subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', a.out, '-map', '0', '-f', 'null', '-'], capture_output=True, text=True)
vframes = int(run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', a.out]).stdout.strip())
fl = loud(a.out)
rep = {
    'file': os.path.abspath(a.out), 'bytes': os.path.getsize(a.out), 'sha256': sha256(a.out),
    'video': {k: v.get(k) for k in ('codec_name', 'profile', 'width', 'height', 'pix_fmt', 'r_frame_rate', 'avg_frame_rate', 'nb_frames',
                                    'duration', 'start_time', 'bit_rate', 'color_range', 'color_space', 'color_transfer', 'color_primaries')},
    'video_frames_decoded': vframes,
    'audio': {k: au.get(k) for k in ('codec_name', 'sample_rate', 'channels', 'channel_layout', 'duration', 'start_time', 'bit_rate')},
    'container_duration': po['format'].get('duration'),
    'full_decode_errors': dec.stderr.strip()[-2000:], 'full_decode_rc': dec.returncode,
    'audio_in': {'file': os.path.abspath(a.audio), 'sha256': sha256(a.audio), **src_loud},
    'audio_treatment': {'constant_gain_db': round(gain, 3), 'fade_out_s': a.fade, 'fade_curve': 'hsin (half-sine)', 'aac_kbps': 320,
                        'length_samples': nsamp, 'sample_rate': sr},
    'loudness_out': fl,
    'picture_in': {'file': os.path.abspath(a.picture), 'sha256': sha256(a.picture), 'frames': nframes},
}
ok = (rep['full_decode_rc'] == 0 and not rep['full_decode_errors'] and vframes == nframes
      and abs(float(au['duration']) - dur) < 0.03 and abs(float(v['duration']) - dur) < 1e-3
      and float(v.get('start_time', 0)) == 0 and abs(float(au.get('start_time', 0))) < 1e-3 and fl['TP_dbtp'] <= a.tp + 1e-9)
rep['technical_pass'] = ok
json.dump(rep, open(os.path.splitext(a.out)[0] + '.json', 'w'), ensure_ascii=False, indent=1)
print(json.dumps(rep, ensure_ascii=False, indent=1))
sys.exit(0 if ok else 1)
