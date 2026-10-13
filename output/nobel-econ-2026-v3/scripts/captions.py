"""captions.py: subtitle timings for the film. The text is the script as spoken (so homophone slips in the
transcription never reach the screen); the timing comes from the word timestamps of a Whisper transcription of each
clip, matched character by character. Writes src/captions.json with absolute times.

  python3 scripts/captions.py
"""
import json, re, difflib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# (spoken, shown) per caption chunk; spoken is what the narrator says, shown is what appears on screen
CHUNKS = {
    'clipA': [('一句话，', None), ('让整个小镇破产了。', None), ('三天前，', None), ('有人小声说了一句：', None), ('听说明年，', '“听说明年，'),
              ('日子要不好过了。', '日子要不好过了”'), ('这句话，', None), ('一下传遍了整个小镇。', None), ('于是每个人都想：', None), ('先省着点吧。', None)],
    'clipB': [('面馆没客人，', None), ('就不进面粉；', None), ('面粉店没生意，', None), ('就辞掉伙计；', None), ('伙计没了工资，', None), ('更不敢花。', None),
              ('谣言，', None), ('自己变成了真的。', None), ('这背后的道理，', None), ('刚刚拿了诺贝尔经济学奖。', None)],
    'clipC': [('得主霍尔和伍德福德发现：', None), ('人花不花钱，', None), ('看的是对明天的判断。', None), ('所以今天的央行，', None), ('除了调利率，', None),
              ('还有一件武器：说话。', None), ('我们会稳住经济！', None), ('一句让人相信的话，', None), ('又让大家敢花钱了。', None),
              ('下次再听到“日子要不好过了”，', None), ('你会先省钱吗？', None)],
}
# the first transcription that exists, per clip: clip C's last line was re-recorded (scripts/patch_vo.py)
ASR = {'clipA': ['tasks/clipA-final.asr-medium.json'], 'clipB': ['tasks/clipB-final.asr-medium.json', 'tasks/clipB-draft.asr-medium.json'],
       'clipC': ['tasks/clipC-patched.asr-medium.json', 'tasks/clipC-final.asr-medium.json', 'tasks/clipC-draft.asr-medium.json']}
PUNCT = re.compile(r'[，。：；？！、,.:;?!\s﹐—“”]')

clips = json.loads((ROOT / 'src/clips.json').read_text())['clips']
out = []
offset = 0.0
for c in clips:
    asr_file = next(ROOT / f for f in ASR[c['id']] if (ROOT / f).exists())
    words = [w for s in json.loads(asr_file.read_text()) for w in s['words']]
    asr = []  # (char, start, end)
    for w in words:
        chars = [ch for ch in w['w'] if not PUNCT.match(ch)]
        for k, ch in enumerate(chars):
            d = (w['e'] - w['s']) / max(1, len(chars))
            asr.append((ch, w['s'] + k * d, w['s'] + (k + 1) * d))
    canon = []  # (char, chunk index)
    for j, (say, _) in enumerate(CHUNKS[c['id']]):
        canon += [(ch, j) for ch in say if not PUNCT.match(ch)]
    sm = difflib.SequenceMatcher(None, ''.join(ch for ch, _ in canon), ''.join(ch for ch, _, _ in asr), autojunk=False)
    t = [None] * len(canon)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n): t[a + k] = (asr[b + k][1], asr[b + k][2])
    # characters the transcription missed (homophones, slips): interpolate between matched neighbours
    for i in range(len(t)):
        if t[i] is None:
            prev = next((t[k] for k in range(i - 1, -1, -1) if t[k]), None)
            nxt = next((t[k] for k in range(i + 1, len(t)) if t[k]), None)
            if prev and nxt: t[i] = (prev[1], nxt[0])
            elif prev: t[i] = (prev[1], prev[1] + 0.15)
            else: t[i] = (max(0, nxt[0] - 0.15), nxt[0])
    matched = sum(n for _, _, n in sm.get_matching_blocks())
    spans = []
    for j, (say, shown) in enumerate(CHUNKS[c['id']]):
        idx = [i for i, (_, jj) in enumerate(canon) if jj == j]
        spans.append([t[idx[0]][0], t[idx[-1]][1], shown or say])
    for j, (a, b, text) in enumerate(spans):
        nxt = spans[j + 1][0] if j + 1 < len(spans) else c['dur']
        out.append({'clip': c['id'], 'a': round(offset + max(0, a - 0.08), 3), 'b': round(offset + min(nxt - 0.02, b + 0.45, c['dur']), 3), 'text': text})
    print(f"{c['id']}: {matched}/{len(canon)} characters matched to {asr_file.relative_to(ROOT)}")
    offset += c['dur']
(ROOT / 'src/captions.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
for x in out: print(f"{x['a']:6.2f}–{x['b']:6.2f}  {x['text']}")
