#!/usr/bin/env python3
"""mix.py — the soundtrack: the user's music (the v1 master, unchanged in time) + the narration (real edge-tts files, placed
by src/narration.js). numpy + ffmpeg. No time-stretch, no pitch change, no compressor/limiter on either stem.

    python3 tools/mix.py [--narr <narration dir>]   → out/audio/{voice_stem,music_stem,master}.wav + out/audio/mix.json

Rules (fixed here, reported in mix.json):
  voice   each line's trimmed WAV at its film time, one static gain for all lines so that the voice stem alone measures
          VOICE_LUFS (EBU R128 over the voice stem's own active span), then a peak limiter on the voice stem only (ceiling
          VOICE_LIMIT_DBFS; the TTS voice's peaks sit ≈ 19 dB above its loudness); no compressor, no EQ.
  music   the v1 master as is (its own −3 dB static trim, measured −11.4 LUFS / −1.3 dBTP), with — ONLY while a line is
          spoken (word span + 0.12 s before, 0.10 s after, 120 ms / 150 ms ramps) — (a) a duck whose depth is set per line
          from measurement: the music under that line is brought to MARGIN_LU below that line's voice, but never less than
          DUCK_MIN nor more than DUCK_MAX dB; and (b) a −EQ_DB peaking dip at 2.4 kHz (Q 0.9) that frees the voice's
          presence band. Outside those windows the music stem is
          the master sample for sample (checked: max abs difference reported). The three music-only windows (the drops)
          therefore keep the full music.
  master  voice + music; if its true peak exceeds −1.5 dBTP (headroom for the AAC encode) a single static trim brings it
          there (reported).
"""
import json, os, subprocess, sys, re, hashlib
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
NARR_DIR = args[args.index('--narr') + 1] if '--narr' in args else os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'music-catchy-remake-20261020', 'narration')
SR = 48000
VOICE_LIMIT_DBFS = -3.0
VOICE_LUFS, MARGIN_LU, DUCK_MIN, DUCK_MAX, EQ_DB, EQ_F, EQ_W = -16.0, 5.0, 4.0, 12.0, 4.0, 2400, 0.9
PRE, POST, ATT, REL = 0.12, 0.10, 0.12, 0.15
OUT = os.path.join(ROOT, 'out', 'audio'); os.makedirs(OUT, exist_ok=True)
MUSIC = os.path.abspath(args[args.index('--music') + 1]) if '--music' in args else os.path.join(ROOT, 'assets', 'music', 'v1-master.wav')
# the v1 master exists as two documented decodes of the same AAC through the same v1 edit plan (different ffmpeg builds):
# the server's (cdb63c50…) and the M4's (fc68d53f…). Either is accepted; which one was used is reported in mix.json.
ACCEPTED_MUSIC = {'cdb63c5060e77f5090550f269a87f882020f980327a296a9558c9f17361bad43': 'server v1 master', 'fc68d53f2519c5bb32abc9f57f127505beb086817dc1a1305faefdfd5e9d4c6b': 'M4 v1 master'}

def node_json(expr):
    js = f"import('./src/timeline.js').then(m => import('./src/narration.js').then(n => console.log(JSON.stringify({expr}))))"
    return json.loads(subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
info = node_json("{ NARR: n.NARR, STATUS: n.NARR_STATUS, END: m.END, MUSIC_ONLY: m.MUSIC_ONLY }")
if info['STATUS'] != 'REAL': sys.exit('narration is not REAL yet (src/narration.js) — run tools/place_narration.mjs with the real files')
END = info['END']; N = int(round(END * SR))
def decode(path, ch, extra=()):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, *extra, '-ac', str(ch), '-ar', str(SR), '-f', 'f64le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float64).reshape(-1, ch)
def write(path, x, codec='pcm_s24le'):   # temporary measurement files are float (no clipping hides a peak)
    p = subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f64le', '-ar', str(SR), '-ac', str(x.shape[1]), '-i', '-', '-c:a', codec, path], input=np.ascontiguousarray(x).tobytes())
    if p.returncode: sys.exit('ffmpeg write failed')
def meter(path):
    e = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'aformat=sample_fmts=dbl,ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = e[e.rfind('Summary'):]
    return {'I': float(re.search(r'I:\s+(-?[\d.]+) LUFS', s).group(1)), 'TP': float(re.search(r'Peak:\s+(-?[\d.inf]+) dBFS', s[s.find('True peak'):]).group(1))}
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
pad = lambda x: np.vstack([x[:N], np.zeros((max(0, N - len(x)), x.shape[1]))])

import hashlib as _h
_ms = _h.sha256(open(MUSIC, 'rb').read()).hexdigest()
if _ms not in ACCEPTED_MUSIC: sys.exit(f'music master sha256 {_ms} is not one of the two accepted v1 masters')
music = pad(decode(MUSIC, 2))
music_eq = pad(decode(MUSIC, 2, ['-af', f'equalizer=f={EQ_F}:t=q:w={EQ_W}:g={-EQ_DB}']))
# ---- voice stem (unity first, then one static gain)
voice = np.zeros((N, 1)); spans = []
for L in info['NARR']:
    v = decode(os.path.join(NARR_DIR, L['file']), 1)
    assert sha(os.path.join(NARR_DIR, L['file'])) == L['sha256'], L['id']
    i0 = int(round(L['at'] * SR)); assert i0 + len(v) <= N, f"{L['id']} runs past the end"
    voice[i0:i0 + len(v)] += v
    w = L['words']; a = w[0]['t'] if w else L['at'] + 0.1; b = (w[-1]['t'] + w[-1]['d']) if w else L['at'] + L['dur'] - 0.1
    spans.append((L['id'], a, b))
tmp = os.path.join(OUT, '_voice_unity.wav')
# loudness of the voice over its active span only (concatenate the line spans so silence does not count)
act = np.concatenate([voice[int(a * SR):int(b * SR)] for _, a, b in spans]); write(tmp, act, 'pcm_f32le')
v_lufs = meter(tmp)['I']; os.remove(tmp)
vg_db = VOICE_LUFS - v_lufs; voice *= 10 ** (vg_db / 20)
# the TTS voice has a high crest factor (≈ 19 dB from loudness to peak): a transparent peak limiter on the VOICE stem only
# (ffmpeg alimiter, 5 ms attack, 50 ms release, look-ahead latency compensated) so its peaks cannot force the music down
lim_in = os.path.join(OUT, '_v_in.wav'); write(lim_in, voice, 'pcm_f32le')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', lim_in, '-af', f'alimiter=limit={10 ** (VOICE_LIMIT_DBFS / 20):.4f}:attack=5:release=50:level=0:latency=1', '-ac', '1', '-ar', str(SR), '-f', 'f64le', '-'], capture_output=True, check=True).stdout
os.remove(lim_in); lv = np.frombuffer(raw, dtype=np.float64).reshape(-1, 1)
voice = np.vstack([lv[:N], np.zeros((max(0, N - len(lv)), 1))])
# ---- duck + EQ envelope for the music (1 = full music, 0 = fully ducked/EQ'd), only around spoken words
def seg_lufs(x, a, b, ch):
    p = os.path.join(OUT, '_seg.wav'); write(p, x[int(a * SR):int(b * SR)].reshape(-1, ch), 'pcm_f32le'); r = meter(p)['I']; os.remove(p); return r
env = np.zeros(N); duck_db = np.zeros(N); depth = {}
for lid, a, b in spans:
    need = seg_lufs(music, a, b, 2) - (seg_lufs(voice, a, b, 1) - MARGIN_LU)
    d = float(np.clip(need, DUCK_MIN, DUCK_MAX)); depth[lid] = round(d, 2)
    s0, s1 = a - PRE, b + POST
    idx = np.arange(max(0, int((s0 - ATT) * SR)), min(N, int((s1 + REL) * SR))); t = idx / SR   # integer sample indices
    k = np.clip(np.minimum((t - (s0 - ATT)) / ATT, ((s1 + REL) - t) / REL), 0, 1); k = k * k * (3 - 2 * k)
    env[idx] = np.maximum(env[idx], k); duck_db[idx] = np.maximum(duck_db[idx], d * k)
g = 10 ** (-duck_db / 20)
music_stem = (music * (1 - env)[:, None] + music_eq * env[:, None]) * g[:, None]
mix = music_stem + voice   # mono voice to both channels
# ---- safety: static trim if needed
write(os.path.join(OUT, '_mix.wav'), mix, 'pcm_f32le'); m0 = meter(os.path.join(OUT, '_mix.wav')); os.remove(os.path.join(OUT, '_mix.wav'))
trim_db = min(0.0, -1.5 - m0['TP'])
if trim_db < 0: mix *= 10 ** (trim_db / 20); music_stem *= 10 ** (trim_db / 20); voice *= 10 ** (trim_db / 20)
paths = {k: os.path.join(OUT, f'{k}.wav') for k in ('voice_stem', 'music_stem', 'master')}
write(paths['voice_stem'], voice); write(paths['music_stem'], music_stem); write(paths['master'], mix)
# ---- report
untouched = env == 0
diff = float(np.max(np.abs(music_stem[untouched] - music[untouched] * 10 ** (trim_db / 20)))) if untouched.any() else None
lines = []
for (lid, a, b) in spans:
    lines.append({'id': lid, 'speech_s': [round(a, 3), round(b, 3)], 'duck_db': depth[lid], 'voice_lufs': seg_lufs(voice, a, b, 1), 'music_under_voice_lufs': seg_lufs(music_stem, a, b, 2), 'music_unducked_same_span_lufs': seg_lufs(music, a, b, 2)})
for L in lines: L['voice_minus_music_lu'] = round(L['voice_lufs'] - L['music_under_voice_lufs'], 1)
mo = [{'window_s': w, 'music_stem_equals_master_music': bool(np.all(env[int(w[0] * SR):int(w[1] * SR)] == 0)), 'lufs': seg_lufs(mix, w[0], w[1], 2)} for w in info['MUSIC_ONLY']]
rep = {'about': __doc__.strip().splitlines()[0], 'rules': {'voice_target_lufs': VOICE_LUFS, 'voice_gain_db': round(vg_db, 2), 'duck_rule': {'margin_lu': MARGIN_LU, 'min_db': DUCK_MIN, 'max_db': DUCK_MAX}, 'eq': {'type': 'peaking', 'f_hz': EQ_F, 'q': EQ_W, 'gain_db': -EQ_DB},
         'voice_peak_limiter': {'tool': 'ffmpeg alimiter', 'ceiling_dbfs': VOICE_LIMIT_DBFS, 'attack_ms': 5, 'release_ms': 50, 'applies_to': 'voice stem only'}, 'window_pad_s': [PRE, POST], 'ramps_s': [ATT, REL], 'master_static_trim_db': round(trim_db, 2), 'compressor': 'none', 'limiter_on_music_or_master': 'none', 'time_stretch': 'none'},
       'inputs': {'music': {'file': MUSIC, 'sha256': sha(MUSIC), 'which': ACCEPTED_MUSIC[sha(MUSIC)]}, 'narration_dir': os.path.relpath(NARR_DIR, ROOT), 'lines': [{'id': L['id'], 'file': L['file'], 'sha256': L['sha256'], 'at': L['at']} for L in info['NARR']]},
       'outputs': {k: {'file': os.path.relpath(p, ROOT), 'sha256': sha(p), **meter(p)} for k, p in paths.items()},
       'music_stem_outside_voice_windows_max_abs_diff_vs_master': diff, 'music_only_windows': mo, 'lines': lines, 'end_s': END}
rep['checks'] = {'true_peak_master_le_-1.5': rep['outputs']['master']['TP'] <= -1.5 + 0.05, 'music_untouched_outside_voice': diff is not None and diff < 1e-6,
                 'music_only_windows_untouched': all(w['music_stem_equals_master_music'] for w in mo), 'voice_above_music_every_line_ge_4lu': all(L['voice_minus_music_lu'] >= 4 for L in lines)}
json.dump(rep, open(os.path.join(OUT, 'mix.json'), 'w'), ensure_ascii=False, indent=1)
print(json.dumps({k: rep[k] for k in ('rules', 'checks')}, ensure_ascii=False, indent=1))
for L in lines: print(L['id'], 'voice', L['voice_lufs'], 'music', L['music_under_voice_lufs'], 'Δ', L['voice_minus_music_lu'])
print('master', rep['outputs']['master'])
sys.exit(0 if all(rep['checks'].values()) else 2)
