#!/usr/bin/env python3
"""sync_check.py — independent check of the DELIVERED file: do the picture's cuts sit on the music's beats, and is the
sound the user's music along the declared edit (v5: one splice into the song's own opening two bars and its stop)?

    python3 tools/sync_check.py out/liangci-qifei.mp4 [out/cues.json] [--ref PATH/reference-original.m4a]   → out/sync-check.json
    exit 0 = every gate below passed, 2 = a gate failed (the report says which)

1. picture: decode the MP4 at 90×160 grey; a hard cut = a frame whose mean absolute difference to the previous frame
   is a local maximum and ≥ 3× the median difference of the surrounding ±15 frames and ≥ 6 grey levels.
2. sound: decode the MP4's AAC (mono, 44.1 kHz) and detect onsets with four-band normalised spectral flux (as music_analyze.py).
   Peaks are separated down to 25 ms, so two real hits a 32nd note apart (53 ms at 142 BPM) are both kept; v1 merged
   them with ±90 ms non-maximum suppression (it is still reported, as "legacy_nms90").
   The adaptive threshold (local median + 0.35 × (local max − median) over ±0.5 s) is unchanged, so weak micro-peaks
   are still rejected. Onsets are found in the MP4's own audio, i.e. in FILM time — after the splice too.
3. for every planned cut in cues.json: the detected picture cut nearest to its frame (Δ frames), the nearest onset to
   that frame's time (Δ ms), every peak within ±70 ms with its band profile and local dominance (its flux ÷ the
   strongest flux within ±0.25 s; information only), and the legacy nearest onset. Planned reveals that are not cuts
   (e.g. the touchdown on the ending's first hit) get the same onset measure ("hits"). The music's own stops (the break
   at 3.46 s and the ending's stop) are measured where the MP4's audio falls under −30 dBFS.
4. chance baseline, so the finer separation cannot pass for precision: the same nearest-onset error for 3000 random
   times in the music body and for the planned cuts shifted by half a beat.
5. audio map (v5): the MP4's audio against the source music, 0.5 s windows every 0.25 s, each window at the source time
   the declared map (cues.json music_map) gives; best lag within ±5 ms, correlation and level difference. Windows inside
   the 15 ms crossfade or the tail fade are skipped and listed; windows where the source is silent must stay silent.
   Plus: the film after the splice must NOT be the source's own continuation (that holds the source's mid-bar hard cut
   and the platform end-card sound), and the map must never reach those source times.
6. the ending: the picture fade measured frame by frame against the designed fade (from the plateau before the stop),
   and digital silence from the end of the audio fade to the end.
Nothing here reads the timeline's own numbers except cues.json (the list of cues, the declared map and the ending times).

Gates (fixed in advance; not tuned to a render):
  cuts       every planned cut found within ±1 frame (unchanged since v1)
  onsets     |frame − nearest MP4 onset| ≤ 20 ms for every planned cut and hit: rounding a cue to a frame costs ≤ 16.7 ms,
             onset detection is quantised to one 128-sample hop (2.9 ms)
  stops      |frame − stop measured in the MP4| ≤ 33 ms (one frame)
  map        every audible window: |lag| ≤ 1 ms, r ≥ 0.9 (as verify.mjs), |level difference| ≤ 0.5 dB (verify.mjs: 0.5 LU);
             silent windows: MP4 ≤ −45 dBFS
  excluded   r ≤ 0.5 against the source's own continuation, in every window after the splice; map source times < hard cut
  fade       every fade frame within 0.1 of the designed level (fraction of the plateau); frames after the fade at black
             (Y ≤ 16.5); the half-way crossing within ±1 frame of the design
  silence    MP4 audio from the end of the audio fade + 50 ms to the end ≤ −90 dBFS
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
REF = os.path.join(ROOT, '..', '..', '.omx', 'artifacts', 'roadster-reference-bgm-20261019', 'reference-original.m4a')
if '--ref' in args:
    i = args.index('--ref'); REF = args[i + 1]; del args[i:i + 2]
MP4 = args[0]
CUES = args[1] if len(args) > 1 else os.path.join(ROOT, 'out', 'cues.json')
cues = json.load(open(CUES))
FPS = 30.0
# ---- picture
w, h = 90, 160
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, dtype=np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.r_[0, np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))]
cuts = []
for i in range(1, len(d)):
    lo, hi = max(1, i - 15), min(len(d), i + 16)
    med = np.median(d[lo:hi])
    if d[i] >= 6 and d[i] >= 3 * med and d[i] == d[max(1, i - 2):i + 3].max(): cuts.append(i)
# ---- sound
SR = 44100
a = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-map', '0:a:0', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(a, dtype=np.float32).astype(np.float64)
N, H = 1024, 128; afps = SR / H
F = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N)), N)[::H][: len(x) // H]
S = np.log1p(1000 * np.abs(np.fft.rfft(F * np.hanning(N), axis=1)))
fq = np.fft.rfftfreq(N, 1 / SR)
rms = 20 * np.log10(np.sqrt((F ** 2).mean(1)) + 1e-12)
def band(lo, hi):   # per-band flux, each normalised by its 99th percentile over the audible part (as in music_analyze.py)
    sel = (fq >= lo) & (fq < hi); v = np.maximum(np.diff(S[:, sel], axis=0, prepend=S[:1, sel]), 0).sum(1)
    return v / (np.percentile(v[rms > -40], 99) + 1e-9)
BANDS = [band(30, 150), band(150, 1500), band(1500, 6000), band(6000, 16000)]
flux = sum(BANDS)
def peaks(gap):
    out, wv, g = [], int(0.5 * afps), max(1, int(gap * afps))
    for i in range(1, len(flux) - 1):
        loc = flux[max(0, i - wv):i + wv]; med = np.median(loc)
        if rms[i] > -45 and flux[i] >= med + 0.35 * (loc.max() - med) and flux[i] == flux[max(0, i - g):i + g + 1].max(): out.append(i)
    return out
legacy = np.array(peaks(0.09)) / afps                                   # v1 behaviour, for comparison only
fine = peaks(0.025)
wd = int(0.25 * afps)
dom = {i: flux[i] / flux[max(0, i - wd):i + wd + 1].max() for i in fine}
ons = np.array(fine) / afps
def stop_in_mp4(tf):   # the music's own stop: where the MP4's audio falls under −30 dBFS, searching from 0.5 s before the frame
    k0 = int((tf - 0.5) * afps); return next(i for i in range(k0, len(rms)) if rms[i] < -30) / afps
rows = []
for c in cues['cues']:
    if c['frame'] == 0: continue
    f = c['frame']; tf = f / FPS
    is_cut = bool(c.get('cut'))
    if c['cue'] in ('stop', 'end'):
        ts = stop_in_mp4(tf)
        nc = min(cuts, key=lambda k: abs(k - f)) if (cuts and is_cut) else None
        rows.append({'cue': c['cue'], 'cut': c.get('cut'), 'planned_frame': f, 'detected_picture_cut_frame': nc,
                     'picture_delta_frames': None if nc is None else nc - f, 'music_stop_in_mp4_s': round(ts, 4),
                     'frame_minus_stop_ms': round((tf - ts) * 1000), 'kind': 'music stop'})
        continue
    if c.get('detected_onset_s') is None: continue          # not asked for at a musical position
    nc = min(cuts, key=lambda k: abs(k - f)) if (cuts and is_cut) else None
    nh = float(ons[np.argmin(np.abs(ons - tf))]); nl = float(legacy[np.argmin(np.abs(legacy - tf))])
    near = [{'t': round(i / afps, 4), 'strength': round(float(flux[i]), 2), 'local_dominance': round(float(dom[i]), 2),
             'bands_low_mid_snare_high': [round(float(B[i]), 2) for B in BANDS]} for i in fine if abs(i / afps - tf) <= 0.07]
    rows.append({'cue': c['cue'], 'cut': c.get('cut'), 'planned_frame': f, 'detected_picture_cut_frame': nc, 'picture_delta_frames': None if nc is None else nc - f,
                 'nearest_onset_in_mp4_s': round(nh, 4), 'frame_minus_onset_ms': round((tf - nh) * 1000), 'peaks_within_70ms': near,
                 'legacy_nms90_nearest_onset_s': round(nl, 4), 'legacy_nms90_frame_minus_onset_ms': round((tf - nl) * 1000),
                 'kind': 'onset' if is_cut else 'hit'})
cut_rows = [r for r in rows if r['cut']]
on_rows = [r for r in rows if r['kind'] == 'onset']
hit_rows = [r for r in rows if r['kind'] == 'hit']
stop_rows = [r for r in rows if r['kind'] == 'music stop']
err = lambda ts: np.array([abs(t - ons[np.argmin(np.abs(ons - t))]) * 1000 for t in ts])
rng = np.random.default_rng(1)
END_ = cues['ending']
body = (cues['music_events'][0]['s'][1], END_['splice_s'])
rand = err(rng.uniform(body[0], body[1], 3000))
half = err([r['planned_frame'] / FPS + cues['tempo']['beat_s'] / 2 for r in on_rows])
real = err([r['planned_frame'] / FPS for r in on_rows])
real_hits = err([r['planned_frame'] / FPS for r in hit_rows])

# ---- 5. audio map: the MP4 against the source music along the declared map
SR2 = 48000
def pcm48(path):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-map', '0:a:0', '-ac', '1', '-ar', str(SR2), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, dtype=np.float32).astype(np.float64)
m48, r48 = pcm48(MP4), pcm48(REF)
LAG = int(0.005 * SR2)
db = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-12)
def match(t_film, t_src, win):
    """best normalised correlation of MP4 [t_film, +win] against source [t_src ± 5 ms, +win]; None if out of range"""
    i0, n, j0 = int(round(t_film * SR2)), int(round(win * SR2)), int(round(t_src * SR2))
    if i0 + n > len(m48) or j0 - LAG < 0 or j0 + n + LAG > len(r48): return None
    xw, yw = m48[i0:i0 + n], r48[j0 - LAG:j0 + n + LAG]
    num = np.correlate(yw, xw, 'valid')                                         # lag k ↔ source offset k − LAG
    e = np.concatenate([[0], np.cumsum(yw ** 2)]); ey = e[n:] - e[:-n]
    c = num / np.sqrt((xw ** 2).sum() * ey + 1e-20); k = int(np.argmax(c))
    ys = yw[k:k + n]
    return {'r': float(c[k]), 'lag_ms': (k - LAG) / SR2 * 1000, 'mp4_db': db(xw), 'src_db': db(ys), 'gain_db': db(xw) - db(ys)}
MAP = cues['music_map']; SPL, XF = END_['splice_s'], END_['xfade_s']; FA0, FA1 = END_['fade_audio_s']; OFF = END_['off_end_s']
WIN, HOP = 0.5, 0.25
win_rows, skipped = [], []
t = 0.0
while t + WIN <= FA0 + 1e-9:
    segs = [m for m in MAP if t >= m['film'][0] - 1e-9 and t + WIN <= m['film'][1] + 1e-9]
    if t < SPL + XF and t + WIN > SPL: skipped.append({'film_s': round(t, 3), 'why': 'crossfade'}); t += HOP; continue
    if len(segs) != 1: skipped.append({'film_s': round(t, 3), 'why': 'not inside one map segment'}); t += HOP; continue
    m = segs[0]; ts = m['src0'] + (t - m['film'][0]); q = match(t, ts, WIN)
    if q is None: skipped.append({'film_s': round(t, 3), 'why': 'source out of range'}); t += HOP; continue
    silent = bool(q['src_db'] < -50)
    ok = (q['mp4_db'] <= -45) if silent else (abs(q['lag_ms']) <= 1.0 and q['r'] >= 0.9 and abs(q['gain_db']) <= 0.5)
    win_rows.append({'film_s': round(t, 3), 'source_s': round(ts, 4), 'segment': MAP.index(m), 'silent': silent, 'r': round(q['r'], 5),
                     'lag_ms': round(q['lag_ms'], 3), 'mp4_db': round(q['mp4_db'], 2), 'src_db': round(q['src_db'], 2), 'gain_db': round(q['gain_db'], 3), 'ok': bool(ok)})
    t += HOP
skipped += [{'film_s': [FA0, FA1], 'why': 'tail fade (designed)'}]
aud = [r for r in win_rows if not r['silent']]
# excluded material: after the splice, the film must not be the source's own continuation (hard cut, platform sound)
excl, t = [], SPL + XF
while t + WIN <= FA0 + 1e-9:
    q = match(t, t, WIN)
    if q is not None and q['src_db'] > -50: excl.append({'film_s': round(t, 3), 'r_vs_source_same_time': round(q['r'], 4)})
    t += HOP
map_src_max = max(m['src0'] + (m['film'][1] - m['film'][0]) for m in MAP)
plat = END_['source_platform_sound_s']
map_touches_excluded = map_src_max >= END_['source_hard_cut_s'] or any(m['src0'] < plat[1] and m['src0'] + (m['film'][1] - m['film'][0]) > plat[0] for m in MAP)

# ---- 6. the ending: picture fade and silence
FV0, FV1 = END_['fade_picture_s']; STOP_F = END_['song_stop_film_s']
# limited-range luma (black = 16), read as the raw Y plane of yuv420p frames (first w×h bytes of each w×h×3/2 frame):
# no conversion to gray at all — `format=gray` expands tv range on some ffmpeg builds and not others (v5: M4 vs Linux)
rawy = subprocess.run(['ffmpeg', '-v', 'error', '-i', MP4, '-vf', f'scale={w}:{h}', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
Y = np.frombuffer(rawy, dtype=np.uint8).reshape(-1, w * h * 3 // 2)[:, :w * h].astype(np.float64).mean(axis=1)
title_f = next(c['frame'] for c in cues['cues'] if c['cue'] == 'title')
p0, p1 = title_f + 12, int(round(FV0 * FPS))                                    # plateau: the title image before the fade
plateau = max(float((Y[p0:p1] - 16).mean()), 1e-6)   # a black plateau cannot show a fade: the level checks then fail
fade_rows = []
for f in range(p1 - 3, len(Y)):
    tf = f / FPS; want = 1 - min(1, max(0, (tf - FV0) / (FV1 - FV0)))
    got = float((Y[f] - 16) / plateau)
    fade_rows.append({'frame': f, 'designed_level': round(want, 3), 'measured_level': round(got, 3), 'Y': round(float(Y[f]), 2)})
cross = None                                                                     # fractional frame where the measured level crosses 0.5
for r0, r1 in zip(fade_rows, fade_rows[1:]):
    if r0['measured_level'] >= 0.5 > r1['measured_level']:
        cross = round(r0['frame'] + (r0['measured_level'] - 0.5) / (r0['measured_level'] - r1['measured_level']), 2); break
cross_design = (FV0 + FV1) / 2 * FPS
after = [r for r in fade_rows if r['frame'] / FPS > FV1 + 1e-6]
tail = m48[int((FA1 + 0.05) * SR2):]
tail_db = round(float(20 * np.log10(np.abs(tail).max() + 1e-12)), 1) if len(tail) else None

gates = {
    'cuts_within_1_frame': all(r['picture_delta_frames'] is not None and abs(r['picture_delta_frames']) <= 1 for r in cut_rows),
    'cut_onsets_within_20ms': bool(len(real) and real.max() <= 20),
    'hit_onsets_within_20ms': bool(len(real_hits) == 0 or real_hits.max() <= 20),
    'stops_within_1_frame': all(abs(r['frame_minus_stop_ms']) <= 33 for r in stop_rows),
    'map_windows_all_pass': bool(win_rows) and all(r['ok'] for r in win_rows),
    'ending_is_not_source_continuation': bool(excl) and max(r['r_vs_source_same_time'] for r in excl) <= 0.5,
    'map_avoids_hard_cut_and_platform_sound': not map_touches_excluded,
    'fade_follows_design': all(abs(r['measured_level'] - r['designed_level']) <= 0.1 for r in fade_rows),
    'fade_halfway_within_1_frame': cross is not None and abs(cross - cross_design) <= 1,
    'black_after_fade': bool(after) and all(r['Y'] <= 16.5 for r in after),
    'silent_after_audio_fade': tail_db is not None and tail_db <= -90,
}
res = {'file': MP4, 'reference': REF, 'frames': int(len(fr)), 'picture_cuts_detected': cuts,
       'audio_onsets_25ms': int(len(ons)), 'audio_onsets_per_s': round(len(ons) / (len(x) / SR), 2), 'audio_onsets_legacy_nms90': int(len(legacy)), 'cuts': rows,
       'all_planned_cuts_found_within_1_frame': gates['cuts_within_1_frame'],
       'max_abs_frame_minus_onset_ms': int(real.max()) if len(real) else None, 'mean_abs_frame_minus_onset_ms': round(float(real.mean()), 1),
       'hits_max_abs_frame_minus_onset_ms': int(real_hits.max()) if len(real_hits) else None,
       'legacy_nms90_max_abs_frame_minus_onset_ms': max(abs(r['legacy_nms90_frame_minus_onset_ms']) for r in on_rows) if on_rows else None,
       'chance_baseline_ms': {'random_times_median': round(float(np.median(rand)), 1), 'random_times_p95': round(float(np.percentile(rand, 95)), 1),
                              'random_within_17ms_share': round(float((rand <= 17).mean()), 3),
                              'cuts_shifted_half_beat_mean': round(float(half.mean()), 1), 'cuts_shifted_half_beat_max': round(float(half.max()), 1)},
       'audio_map': {'declared': MAP, 'windows': win_rows, 'skipped': skipped,
                     'audible_windows': len(aud), 'silent_windows': len(win_rows) - len(aud),
                     'min_r': round(min(r['r'] for r in aud), 5) if aud else None, 'max_abs_lag_ms': round(max(abs(r['lag_ms']) for r in aud), 3) if aud else None,
                     'max_abs_gain_db': round(max(abs(r['gain_db']) for r in aud), 3) if aud else None,
                     'per_segment': [{'segment': k, 'audible_windows': sum(1 for r in aud if r['segment'] == k),
                                      'min_r': round(min([r['r'] for r in aud if r['segment'] == k] or [float('nan')]), 5),
                                      'max_abs_lag_ms': round(max([abs(r['lag_ms']) for r in aud if r['segment'] == k] or [float('nan')]), 3),
                                      'median_gain_db': round(float(np.median([r['gain_db'] for r in aud if r['segment'] == k] or [float('nan')])), 4)} for k in range(len(MAP))],
                     'after_splice_vs_source_continuation': excl, 'map_max_source_s': round(map_src_max, 4)},
       'ending': {'plateau_Y_minus_16': round(plateau, 2), 'fade': fade_rows, 'halfway_frame': cross, 'halfway_design_frame': round(cross_design, 2),
                  'audio_after_fade_max_db': tail_db},
       'gates': gates, 'pass': all(gates.values())}
out = os.path.join(os.path.dirname(os.path.abspath(CUES)), 'sync-check.json')
json.dump(res, open(out, 'w'), indent=1)
for r in rows:
    au = f"onset {r['nearest_onset_in_mp4_s']} s  frame−onset {r['frame_minus_onset_ms']:+d} ms  (legacy ±90 ms NMS: {r['legacy_nms90_frame_minus_onset_ms']:+d} ms)" if r['kind'] != 'music stop' else f"stop {r['music_stop_in_mp4_s']} s  frame−stop {r['frame_minus_stop_ms']:+d} ms"
    pc = f"picture cut f{r['detected_picture_cut_frame']}  ({r['picture_delta_frames']:+d})" if r['picture_delta_frames'] is not None else 'no cut planned'
    print(f"{(r['cut'] or r['cue']):6s} planned f{r['planned_frame']:4d}  {pc}  {au}  [{r['kind']}]")
print(f"picture cuts found within ±1 frame: {gates['cuts_within_1_frame']}; |frame − onset| cuts max {res['max_abs_frame_minus_onset_ms']} ms, "
      f"mean {res['mean_abs_frame_minus_onset_ms']} ms, hits max {res['hits_max_abs_frame_minus_onset_ms']} ms (legacy ±90 ms NMS max {res['legacy_nms90_max_abs_frame_minus_onset_ms']} ms); {res['audio_onsets_25ms']} onsets = {res['audio_onsets_per_s']}/s")
print(f"chance baseline: random times median {res['chance_baseline_ms']['random_times_median']} ms, p95 {res['chance_baseline_ms']['random_times_p95']} ms, "
      f"{res['chance_baseline_ms']['random_within_17ms_share'] * 100:.0f}% within 17 ms; cuts shifted ½ beat: mean {res['chance_baseline_ms']['cuts_shifted_half_beat_mean']} ms")
am = res['audio_map']
print(f"audio map: {am['audible_windows']} audible + {am['silent_windows']} silent windows; min r {am['min_r']}, max |lag| {am['max_abs_lag_ms']} ms, max |gain| {am['max_abs_gain_db']} dB; "
      f"per segment {[(s['segment'], s['audible_windows'], s['min_r'], s['max_abs_lag_ms'], s['median_gain_db']) for s in am['per_segment']]}; "
      f"after splice vs source continuation max r {max([e['r_vs_source_same_time'] for e in excl] or [float('nan')])}; map source max {am['map_max_source_s']} s")
print(f"ending: fade halfway f{cross} (design {cross_design:.2f}), max |measured − designed| {max(abs(r['measured_level'] - r['designed_level']) for r in fade_rows):.3f}, audio after fade {tail_db} dB")
for k, v in gates.items(): print(f"  {'pass' if v else 'FAIL'}  {k}")
print(f"{'PASS' if res['pass'] else 'FAIL'} → {out}")
sys.exit(0 if res['pass'] else 2)
