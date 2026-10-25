"""make_film_cues.py: build the film's single cue table (blender/data/film_cues.json) from the measured narration.

Input: the narration support directory (proposed-75s-cues.json with measured clip timing and offline-ASR word
estimates). Output: one portable JSON read by Blender (picture beats), Remotion (captions/labels) and the sound
script, so picture, text and sound share the same times.

Captions always use the APPROVED text. ASR is only used for timing: each approved character takes the start time
of the ASR word covering the same character index (the ASR differences are same-length homophone substitutions; a
proportional fallback is used if lengths ever differ). Phrase starts are therefore estimates, not forced alignment.

    python3 blender/tools/make_film_cues.py .omx/codex-support/narration blender/data/film_cues.json
"""
import json
import os
import sys
import unicodedata

PUNCT = '，。？！：；、,.?!:;'
FPS = 30


def norm_chars(s):
    return [c for c in unicodedata.normalize('NFKC', s) if not (unicodedata.category(c)[0] in 'PZS')]


def char_times(text, words, clip_start, clip_end):
    chars = norm_chars(text)
    flat = []
    for w in words:
        wc = norm_chars(w['word'])
        n = max(1, len(wc))
        dur = (w['video_end_s'] - w['video_start_s']) / n
        for k in range(len(wc)):
            flat.append(w['video_start_s'] + k * dur)
    if len(flat) == len(chars):
        return flat, 'asr-index'
    span = clip_end - clip_start
    return [clip_start + span * i / max(1, len(chars)) for i in range(len(chars))], 'proportional-fallback'


def phrases(text, times, end_s):
    out, cur, idx, start = [], '', 0, None
    for c in text:
        if c in PUNCT:
            if cur.strip():
                out.append({'text': cur.strip(), 'start_s': round(start, 3)})
            cur, start = '', None
            continue
        if not (unicodedata.category(c)[0] in 'PZS'):
            if start is None:
                start = times[idx]
            idx += 1
        cur += c
    if cur.strip():
        out.append({'text': cur.strip(), 'start_s': round(start, 3)})
    for i, p in enumerate(out):
        p['end_s'] = round(out[i + 1]['start_s'] if i + 1 < len(out) else end_s, 3)
    return out


def main(src_dir, out_path):
    with open(os.path.join(src_dir, 'proposed-75s-cues.json'), encoding='utf-8') as fh:
        plan = json.load(fh)
    lines = []
    for c in plan['clips']:
        start, end = c['proposed_start_s'], c['audio_end_s']
        times, method = char_times(c['text'], c['estimated_asr_word_cues'], start, end)
        lines.append({
            'id': c['id'], 'scene_start_s': start, 'scene_end_s': c['slot_end_s'], 'audio_start_s': start,
            'audio_end_s': round(end, 3), 'audio_file': c['audio_file'], 'audio_sha256': c['audio_sha256'],
            'text': c['text'], 'timing_method': method, 'phrases': phrases(c['text'], times, end),
        })
    out = {
        'about': ('Single cue table for picture, captions and sound. Times are seconds on the 75 s film timeline '
                  '(30 fps). Narration starts/ends are measured from the usable WAVs; phrase starts are offline-ASR '
                  'estimates mapped onto the approved text (not forced alignment). Source shot cuts are the '
                  'canonical clip times (first 14 s unchanged).'),
        'fps': FPS, 'duration_s': plan['picture_duration_s'], 'voice': 'zh-CN-YunxiNeural, rate -3%',
        'source_cuts_s': [0.85085, 2.2022, 5.15515],
        'scenes': [{'id': c['id'], 'start_s': c['proposed_start_s'], 'end_s': c['slot_end_s']} for c in plan['clips']],
        'lines': lines,
    }
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    for ln in lines:
        print(ln['id'], ln['timing_method'], ' | '.join('%s@%.2f' % (p['text'], p['start_s']) for p in ln['phrases']))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
