from pathlib import Path
import hashlib, json, re, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'src/timeline.json').read_text())
VIDEO = ROOT / 'out/rubiks-codex-v2.mp4'
PICTURE = ROOT / 'out/picture.mp4'
picture_sha256 = hashlib.sha256(PICTURE.read_bytes()).hexdigest()

def run(args):
    r = subprocess.run(args, capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode(errors='replace')[-3000:])
    return r

run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(ROOT / 'out/picture.mp4'), '-i', str(ROOT / 'audio/master.wav'),
     '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(T['duration']),
     '-metadata', 'title=2.51 seconds, but no championship', '-movflags', '+faststart', str(VIDEO)])
def video_hash(path):
    return run(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-c','copy','-f','hash','-hash','sha256','-']).stdout.decode().strip()
source_stream_hash, delivered_stream_hash = video_hash(PICTURE), video_hash(VIDEO)
assert source_stream_hash == delivered_stream_hash, 'Delivered video differs from the current rendered picture'
probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(VIDEO)]).stdout)
video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
assert (video['width'], video['height'], video['r_frame_rate']) == (1080, 1920, '30/1')
assert int(video['nb_frames']) == T['frames']
assert abs(float(video['duration']) - float(audio['duration'])) < 1 / 30
decode = run(['ffmpeg', '-v', 'error', '-nostats', '-i', str(VIDEO), '-progress', 'pipe:1', '-f', 'null', '-'])
frames = [int(x) for x in re.findall(rb'frame=(\d+)', decode.stdout)]
assert frames and frames[-1] == T['frames']
meter = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(VIDEO), '-af', 'loudnorm=I=-14:TP=-2:LRA=10:print_format=json', '-f', 'null', '-']).stderr.decode()
loudness = json.loads(re.findall(r'\{[^{}]+\}', meter)[-1])
assert abs(float(loudness['input_i']) + 14) < .3, loudness
assert float(loudness['input_tp']) <= -1.5, loudness

def samples(path, start, length):
    raw = run(['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(path), '-t', str(length), '-ar', '48000', '-ac', '2', '-f', 'f32le', '-']).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2)

alignment = []
for at in [1, 82, 169]:
    a, b = samples(VIDEO, at, 3).mean(axis=1), samples(ROOT / 'audio/master.wav', at, 3).mean(axis=1)
    n = min(len(a), len(b)); a, b = a[:n], b[:n]
    fft_n = 1 << (2 * n - 1).bit_length()
    corr = np.fft.irfft(np.fft.rfft(a, fft_n) * np.conj(np.fft.rfft(b, fft_n)), fft_n)
    lags = np.arange(-2400, 2401); lag = int(lags[np.argmax(corr[lags % fft_n])])
    if lag > 0: x, y = a[lag:], b[:-lag]
    elif lag < 0: x, y = a[:lag], b[-lag:]
    else: x, y = a, b
    rho = float(np.corrcoef(x, y)[0, 1])
    assert abs(lag) <= 96 and rho > .99, (lag, rho)
    alignment.append({'at': at, 'lagSamples': lag, 'lagMs': lag / 48, 'correlation': rho})

tail = samples(VIDEO, T['duration'] - 1, 1)
tail_levels = []
for a, b in [(0, .5), (.5, .75), (.75, .9), (.9, 1)]:
    v = tail[round(a * 48000):round(b * 48000)]
    tail_levels.append({'window': [a, b], 'rmsDbfs': round(float(20 * np.log10(max(1e-12, np.sqrt(np.mean(v ** 2))))), 2)})

review = ROOT / 'out/review'
by_id = {s['id']: s for s in T['scenes']}
def cue(scene,fragment,fallback):
    return next((c['start'] for c in T['captions'] if c['scene']==scene and fragment in c['text']),by_id[scene]['start']+fallback)

windows = [('encoded-opening', 0, 2.51), ('encoded-hook-reveal', cue('hook','第六',5.8)-.7, 2.1),
           ('encoded-explosion', by_id['pieces']['start'] + 1.1, 4),
           ('encoded-states', by_id['count']['start']+.1, 4),
           ('encoded-proof', by_id['bound']['start']+1, by_id['bound']['end']-by_id['bound']['start']-1),
           ('encoded-methods', by_id['cfop']['start'] + 2, 8), ('encoded-average', by_id['average']['start'] + 5.5, 4),
           ('encoded-results', cue('guangzhou','可决赛',5.5)-.3, 2.8), ('encoded-ending', T['duration'] - 8, 8)]
for name, start, duration in windows:
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', str(VIDEO), '-t', str(duration), '-an',
         '-vf', f'fps={8 / duration},scale=180:320,tile=8x1', '-frames:v', '1', str(review / (name + '.jpg'))])
run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.034', '-i', str(VIDEO), '-an', '-frames:v', '1', '-vf', 'scale=360:640', str(review / 'encoded-final-mobile.png')])
run(['ffmpeg', '-v', 'error', '-y', '-ss', str(by_id['cfop']['start'] + 4), '-i', str(VIDEO), '-an', '-frames:v', '1', '-vf', 'scale=360:640', str(review / 'encoded-method-mobile.png')])
report = {'file': str(VIDEO), 'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(), 'bytes': VIDEO.stat().st_size,
          'sourcePictureSha256': picture_sha256, 'videoStreamHash': delivered_stream_hash, 'sameEncodedPictureStream': True,
          'width': 1080, 'height': 1920, 'fps': 30, 'decodedFrames': frames[-1], 'expectedFrames': T['frames'],
          'videoDuration': float(video['duration']), 'audioDuration': float(audio['duration']),
          'avDurationDifferenceMs': abs(float(video['duration']) - float(audio['duration'])) * 1000,
          'fullDecodePassed': True, 'integratedLufs': float(loudness['input_i']), 'truePeakDbtp': float(loudness['input_tp']),
          'aacVsMasterAlignment': alignment, 'lastSecondRms': tail_levels,
          'encodedMotionSheets': [name + '.jpg' for name, _, _ in windows],
          'subjectiveListeningPerformed': False, 'physicalPhoneReview': False, 'paidImageVideoGenerationCalls': 0}
assert hashlib.sha256(PICTURE.read_bytes()).hexdigest() == picture_sha256, 'Rendered picture changed during finishing'
(ROOT / 'out/media-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False), flush=True)
