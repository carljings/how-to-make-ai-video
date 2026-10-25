from pathlib import Path
import hashlib, json, re, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'src/timeline.json').read_text())
VIDEO = ROOT / 'out/rubiks-codex.mp4'

def run(args):
    r = subprocess.run(args, capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode(errors='replace')[-3000:])
    return r

run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(ROOT / 'out/picture.mp4'), '-i', str(ROOT / 'audio/master.wav'),
     '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(T['duration']),
     '-metadata', 'title=Rubiks Cube: 20 moves and 2.51 seconds', '-movflags', '+faststart', str(VIDEO)])
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
windows = [('encoded-opening', 0, 2), ('encoded-explosion', by_id['pieces']['start'] + .1, 2),
           ('encoded-methods', by_id['cfop']['start'] + 2, 8), ('encoded-average', by_id['average']['start'] + 5.5, 4),
           ('encoded-results', by_id['guangzhou']['start'] + .1, 8), ('encoded-ending', T['duration'] - 8, 8)]
for name, start, duration in windows:
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', str(VIDEO), '-t', str(duration), '-an',
         '-vf', f'fps={8 / duration},scale=180:320,tile=8x1', '-frames:v', '1', str(review / (name + '.jpg'))])
run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.034', '-i', str(VIDEO), '-an', '-frames:v', '1', '-vf', 'scale=360:640', str(review / 'encoded-final-mobile.png')])
run(['ffmpeg', '-v', 'error', '-y', '-ss', str(by_id['cfop']['start'] + 4), '-i', str(VIDEO), '-an', '-frames:v', '1', '-vf', 'scale=360:640', str(review / 'encoded-method-mobile.png')])
report = {'file': str(VIDEO), 'sha256': hashlib.sha256(VIDEO.read_bytes()).hexdigest(), 'bytes': VIDEO.stat().st_size,
          'width': 1080, 'height': 1920, 'fps': 30, 'decodedFrames': frames[-1], 'expectedFrames': T['frames'],
          'videoDuration': float(video['duration']), 'audioDuration': float(audio['duration']),
          'avDurationDifferenceMs': abs(float(video['duration']) - float(audio['duration'])) * 1000,
          'fullDecodePassed': True, 'integratedLufs': float(loudness['input_i']), 'truePeakDbtp': float(loudness['input_tp']),
          'aacVsMasterAlignment': alignment, 'lastSecondRms': tail_levels,
          'encodedMotionSheets': [name + '.jpg' for name, _, _ in windows],
          'subjectiveListeningPerformed': False, 'physicalPhoneReview': False, 'paidImageVideoGenerationCalls': 0}
(ROOT / 'out/media-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False), flush=True)
