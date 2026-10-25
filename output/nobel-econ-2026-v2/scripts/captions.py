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
    'seg1': [('多给你一千块，', '多给你1000块，'), ('你会花掉，还是存下来？', None), ('先别急：只发一次，', None), ('和每月都有，', None), ('答案一样吗？', None),
             ('这个问题背后的道理，', None), ('刚拿了诺贝尔经济学奖。', None), ('获奖的是霍尔和伍德福德。', None)],
    'seg2': [('霍尔发现：', None), ('一次性的钱，', None), ('人们会摊到很多年慢慢花；', None), ('每月都有，才会马上多花。', None),
             ('能预料的，早就算进去了；', None), ('只有意外，才会让人改主意。', None)],
    'seg3': [('他还算出：约八成家庭', None), ('会这样往前看，', None), ('两成挣多少花多少。', None), ('另一位得主，伍德福德，', None),
             ('发现：商家定价也看明天。', None), ('都觉得要涨价，就会提前涨，', None), ('涨价就真来了。', None)],
    'seg4': [('所以，央行最厉害的武器，', None), ('除了利率，', None), ('还有一句让人相信的话。', None), ('经济的起落，', None),
             ('就是千千万万个你，', None), ('对明天的判断。', None), ('那一千块，你会花吗？', '那1000块，你会花吗？'), ('评论区说说你是哪种人。', None)],
}
ASR = {'seg1': 'tasks/seg1-patched.asr-medium.json', 'seg2': 'tasks/seg2-final.asr-medium.json', 'seg3': 'tasks/seg3-final.asr-medium.json', 'seg4': 'tasks/seg4-final.asr-medium.json'}
PUNCT = re.compile(r'[，。：；？！、,.:;?!\s﹐—]')

clips = json.loads((ROOT / 'src/clips.json').read_text())['clips']
out = []
offset = 0.0
for c in clips:
    words = [w for s in json.loads((ROOT / ASR[c['id']]).read_text()) for w in s['words']]
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
    print(f"{c['id']}: {matched}/{len(canon)} characters matched to the transcription")
    offset += c['dur']
(ROOT / 'src/captions.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
for x in out: print(f"{x['a']:6.2f}–{x['b']:6.2f}  {x['text']}")
