from pathlib import Path
import hashlib, json, math, re, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'src/timeline.json').read_text())
EVENTS = json.loads((ROOT / 'out/events.json').read_text())
SR, N = 48000, round(T['duration'] * 48000)
OUT = ROOT / 'audio'
RNG = np.random.default_rng(20261022)
VOICE = np.zeros(N, np.float32)
MUSIC = np.zeros((N, 2), np.float32)
FX = np.zeros((N, 2), np.float32)
DUCK = np.ones(N, np.float32)

def run(args, data=None):
    return subprocess.run(args, input=data, capture_output=True, check=True)

def write(path, samples):
    channels = 1 if samples.ndim == 1 else samples.shape[1]
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(channels), '-i', '-', '-c:a', 'pcm_f32le', str(path)], np.asarray(samples, dtype='<f4').tobytes())

def place(target, signal, at, gain=1, pan=0):
    a = max(0, round(at * SR)); size = min(len(signal), len(target) - a)
    if size <= 0: return
    signal = signal[:size]
    if target.ndim == 1: target[a:a + size] += signal * gain
    else:
        target[a:a + size, 0] += signal * gain * math.sqrt((1 - pan) / 2)
        target[a:a + size, 1] += signal * gain * math.sqrt((1 + pan) / 2)

active = []
for scene in T['scenes']:
    p = ROOT / scene['audio']['file']
    assert hashlib.sha256(p.read_bytes()).hexdigest() == scene['audio']['sha256']
    raw = run(['ffmpeg', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']).stdout
    data = np.frombuffer(raw, dtype='<f4')
    place(VOICE, data, scene['start'])
    active.append(data)
    a, b = round(scene['start'] * SR), min(N, round((scene['start'] + len(data) / SR) * SR))
    DUCK[a:b] = .32
    ramp = round(.13 * SR)
    lo, hi = max(0, a - ramp), min(N, b + ramp)
    DUCK[lo:a] = np.minimum(DUCK[lo:a], np.linspace(1, .32, a - lo, endpoint=False))
    DUCK[b:hi] = np.minimum(DUCK[b:hi], np.linspace(.32, 1, hi - b, endpoint=False))
reference = np.concatenate(active)
gain = min(.10 / np.sqrt(np.mean(reference ** 2)), .76 / np.max(np.abs(reference)))
VOICE *= gain
voice_rms = np.sqrt(np.mean((reference * gain) ** 2))

def note(freq, duration, attack=.02, decay=.65, harmonics=True):
    t = np.arange(round(duration * SR), dtype=np.float32) / SR
    env = np.minimum(1, t / attack) * np.exp(-t / decay) * np.minimum(1, (duration - t) / .06)
    wave = np.sin(2 * np.pi * freq * t)
    if harmonics: wave += .18 * np.sin(2 * np.pi * freq * 2 * t) + .055 * np.sin(2 * np.pi * freq * 3 * t)
    return wave * env

def pad(freq, duration):
    t = np.arange(round(duration * SR), dtype=np.float32) / SR
    env = np.minimum(1, t / .8) * np.minimum(1, (duration - t) / .9)
    return (.55 * np.sin(2 * np.pi * freq * t) + .30 * np.sin(2 * np.pi * freq * 1.002 * t + .6) + .15 * np.sin(2 * np.pi * freq * 2 * t)) * env

# Original score, D-minor / B-flat / F / C. The final cadence resolves at the cube's landing.
beat = 60 / 92
chords = [[146.832, 174.614, 220], [116.541, 146.832, 174.614], [130.813, 174.614, 220], [130.813, 164.814, 195.998]]
ending = T['scenes'][-1]
for bar in range(math.ceil(ending['start'] / (beat * 8))):
    at = bar * beat * 8; duration = min(beat * 8 + .8, ending['start'] + .8 - at)
    for i, freq in enumerate(chords[bar % 4]): place(MUSIC, pad(freq, duration), at, .10, (i - 1) * .42)
    for tick in range(8):
        at_note = at + tick * beat
        if at_note >= ending['start']: break
        freq = chords[bar % 4][[0, 2, 1, 2, 0, 1, 2, 1][tick]] * (2 if tick % 3 else 1)
        place(MUSIC, note(freq, beat * 1.8, attack=.012, decay=.42), at_note, .16, -.25 if tick % 2 else .25)
        if tick % 2 == 0:
            tt = np.arange(round(.18 * SR), dtype=np.float32) / SR
            kick = np.sin(2 * np.pi * (47 * tt + 18 * (1 - np.exp(-tt * 22)) / 22)) * np.exp(-tt * 24)
            place(MUSIC, kick, at_note, .15)

for event in EVENTS:
    if event['kind'] == 'turn':
        tt = np.arange(round(.048 * SR), dtype=np.float32) / SR
        grain = RNG.normal(0, 1, len(tt)).astype(np.float32)
        click = (.6 * np.sin(2 * np.pi * 760 * tt) + .16 * (grain - np.roll(grain, 1))) * np.exp(-tt * 125) * np.minimum(1, tt / .001)
        volume = .057 if event.get('method') in ['hook', 'ending'] else .014
        place(FX, click, event['time'], volume)
    elif event['kind'] == 'goal':
        place(FX, note(880, .24, attack=.007, decay=.07), event['time'], .017)

for scene in T['scenes']:
    if scene['id'] not in ['history', 'pieces', 'metric', 'average', 'lbl', 'hefei', 'ending']: continue
    tt = np.arange(round(.28 * SR), dtype=np.float32) / SR
    whoosh = RNG.normal(0, 1, len(tt)).astype(np.float32)
    whoosh = np.convolve(whoosh, np.ones(24, np.float32) / 24, mode='same')
    whoosh *= np.sin(np.pi * tt / .28) ** 2
    place(FX, whoosh, scene['start'] - .13, .025)

landing = next(e['time'] for e in EVENTS if e['kind'] == 'landing')
for at, frequencies in [(ending['start'], [146.832, 174.614, 220]), (ending['start'] + 3, [110, 138.591, 164.814, 195.998]), (landing, [146.832, 184.997, 220, 293.665])]:
    for i, f in enumerate(frequencies): place(MUSIC, note(f, T['duration'] - at + .01, attack=.045, decay=1.6), at, .25, (i / (len(frequencies) - 1) - .5) * .7)
place(FX, note(155, .18, attack=.005, decay=.045), landing, .078)

music_rms = np.sqrt(np.mean(MUSIC ** 2))
MUSIC *= voice_rms * .55 / max(music_rms, 1e-8)
MUSIC *= DUCK[:, None]
fade = round(.65 * SR); MUSIC[:round(.12 * SR)] *= np.linspace(0, 1, round(.12 * SR))[:, None]
MUSIC[-fade:] *= np.linspace(1, 0, fade)[:, None]
FX[-round(.12 * SR):] *= np.linspace(1, 0, round(.12 * SR))[:, None]
mix = MUSIC + FX + VOICE[:, None]
write(OUT / 'voice-stem.wav', VOICE); write(OUT / 'music-stem.wav', MUSIC); write(OUT / 'fx-stem.wav', FX); write(OUT / 'mix-input.wav', mix)
analysis = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(OUT / 'mix-input.wav'), '-af', 'loudnorm=I=-14:TP=-2:LRA=10:print_format=json', '-f', 'null', '-']).stderr.decode()
meter = json.loads(re.findall(r'\{[^{}]+\}', analysis)[-1])
settings = 'loudnorm=I=-14:TP=-2:LRA=10:linear=true:' + ':'.join(f'{dst}={meter[src]}' for dst, src in [('measured_I', 'input_i'), ('measured_TP', 'input_tp'), ('measured_LRA', 'input_lra'), ('measured_thresh', 'input_thresh'), ('offset', 'target_offset')])
run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'mix-input.wav'), '-af', settings, '-ar', str(SR), '-c:a', 'pcm_s24le', str(OUT / 'master-pretrim.wav')])
check = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(OUT / 'master-pretrim.wav'), '-af', 'loudnorm=I=-14:TP=-2:LRA=10:print_format=json', '-f', 'null', '-']).stderr.decode()
pretrim = json.loads(re.findall(r'\{[^{}]+\}', check)[-1])
adjust = -14 - float(pretrim['input_i'])
run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'master-pretrim.wav'), '-af', f'volume={adjust:.4f}dB,alimiter=limit=0.794328:level=0:attack=5:release=50:latency=1', '-ar', str(SR), '-c:a', 'pcm_s24le', str(OUT / 'master.wav')])
report = {'sampleRate': SR, 'samples': N, 'duration': N / SR, 'voiceGainDb': round(20 * math.log10(gain), 3), 'voiceFiles': 18,
          'music': 'Original deterministic synthesis, D minor to D major cadence', 'seed': 20261022, 'events': len(EVENTS),
          'landingSeconds': landing, 'targetLufs': -14, 'masterTargetTruePeak': -2, 'loudnormFirstPass': meter, 'pretrim': pretrim, 'finalGainDb': adjust,
          'masterSha256': hashlib.sha256((OUT / 'master.wav').read_bytes()).hexdigest(), 'timeStretch': False, 'subjectiveListeningPerformed': False}
(OUT / 'audio-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False), flush=True)
