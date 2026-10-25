#!/usr/bin/env python3
"""Stream-copy the original Opus audio and verify the limited Chrome-rendered correction."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'out'
BASE = json.loads((ROOT / 'baseline.json').read_text())
MOVIE = OUT / 'rubiks-opus-faithful-r3.mp4'


def run(args):
    result = subprocess.run(args, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr[-4000:]
    return result


def packets(file, stream):
    return json.loads(run(['ffprobe', '-v', 'error', '-select_streams', stream, '-show_packets',
                           '-show_entries', 'packet=pts_time,duration_time,data_hash',
                           '-show_data_hash', 'sha256', '-of', 'json', str(file)]).stdout)['packets']


run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', str(OUT / 'picture.mp4'),
     '-i', str(OUT / 'audio/original-score.m4a'), '-map', '0:v:0', '-map', '1:a:0',
     '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', str(MOVIE)])
original = Path(BASE['original_movie'])
old_audio, new_audio = packets(original, 'a:0'), packets(MOVIE, 'a:0')
audio_same = old_audio == new_audio
assert audio_same, 'Original AAC packets/timestamps changed'
old_video, new_video = packets(original, 'v:0'), packets(MOVIE, 'v:0')
old_by_frame = {round(float(p['pts_time']) * 30): p for p in old_video}
new_by_frame = {round(float(p['pts_time']) * 30): p for p in new_video}
assert set(old_by_frame) == set(new_by_frame) == set(range(4740))
reused = []
for part in BASE['parts']:
    if part['file'] in BASE['reused_parts']:
        reused.extend(range(part['first'], part['last'] + 1))
unchanged_picture = all(old_by_frame[n] == new_by_frame[n] for n in reused)
assert unchanged_picture, 'A picture packet outside the correction chunks changed'
for part in BASE['parts']:
    if part['file'] in BASE['reused_parts']:
        assert hashlib.sha256((OUT / 'picture.parts' / part['file']).read_bytes()).hexdigest() == part['sha256']
assert hashlib.sha256(original.read_bytes()).hexdigest() == BASE['original_movie_sha256']

probe = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_entries',
                       'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration,sample_rate,channels:format=duration,size',
                       '-of', 'json', str(MOVIE)]).stdout)
video = next(x for x in probe['streams'] if x['codec_type'] == 'video')
audio = next(x for x in probe['streams'] if x['codec_type'] == 'audio')
measure = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(MOVIE), '-vn', '-af',
               'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-']).stderr
stats = json.loads(measure[measure.rindex('{'):measure.rindex('}') + 1])
decode = run(['ffmpeg', '-v', 'error', '-i', str(MOVIE), '-f', 'null', '-']).stderr.strip()
report = {
    'movie': str(MOVIE), 'bytes': int(probe['format']['size']),
    'sha256': hashlib.sha256(MOVIE.read_bytes()).hexdigest(),
    'video': {'codec': video['codec_name'], 'size': f"{video['width']}x{video['height']}",
              'fps': video['r_frame_rate'], 'frames': int(video['nb_read_frames']), 'duration': float(video['duration'])},
    'audio': {'codec': audio['codec_name'], 'sample_rate': int(audio['sample_rate']), 'channels': audio['channels'],
              'duration': float(audio['duration']), 'lufs': float(stats['input_i']), 'true_peak_dbtp': float(stats['input_tp'])},
    'fidelity': {'original_audio_packets_and_timestamps_identical': audio_same, 'audio_packets': len(new_audio),
                 'reused_video_packets_and_timestamps_identical': unchanged_picture, 'reused_video_frames': len(reused),
                 'redrawn_video_frames': BASE['redrawn_frames'], 'original_movie_unchanged': True},
    'decode_errors': decode or None,
}
report['pass'] = (video['codec_name'] == 'h264' and video['width'] == 1080 and video['height'] == 1920
                  and video['r_frame_rate'] == '30/1' and int(video['nb_read_frames']) == 4740
                  and abs(float(video['duration']) - 158) < 0.01
                  and abs(float(audio['duration']) - float(video['duration'])) < 0.01
                  and audio['codec_name'] == 'aac' and int(audio['sample_rate']) == 48000 and audio['channels'] == 2
                  and abs(float(stats['input_i']) + 14) <= 0.5 and float(stats['input_tp']) <= -1.5
                  and audio_same and unchanged_picture and not decode)
(OUT / 'fidelity-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False, indent=2))
assert report['pass'], 'Final technical/fidelity checks failed'
