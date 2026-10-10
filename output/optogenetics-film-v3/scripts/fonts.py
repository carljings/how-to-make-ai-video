"""Subset the film's fonts from Google Fonts into public/fonts/ (run again after changing on-screen text).

Only the characters used in src/ are requested (Google Fonts' `text=` parameter), so the CJK fonts stay small.
Writes public/fonts/<family>-<weight>.woff2 plus the licence texts; src/lib/fonts.ts loads them.
"""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import re

root = Path(__file__).resolve().parent.parent
out = root / 'public' / 'fonts'
out.mkdir(parents=True, exist_ok=True)
corpus = ''.join(p.read_text(encoding='utf-8') for p in sorted((root / 'src').rglob('*.ts*')))
# every non-ASCII character in the source, plus ASCII printable and a few typographic marks
chars = sorted(set(c for c in corpus if ord(c) > 0x7f) | set(chr(i) for i in range(0x20, 0x7f)) | set('·–—“”‘’…→×÷±≈≤≥°μ'))
text = ''.join(chars)
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'


def get(url):
    return urlopen(Request(url, headers={'User-Agent': UA}), timeout=60).read()


FACES = [('Noto Sans SC', 'NotoSansSC', [400, 700, 900]), ('Noto Serif SC', 'NotoSerifSC', [900]), ('JetBrains Mono', 'JetBrainsMono', [400, 700])]
for family, stem, weights in FACES:
    for w in weights:
        css = get('https://fonts.googleapis.com/css2?' + urlencode({'family': f'{family}:wght@{w}', 'text': text, 'display': 'block'})).decode()
        urls = re.findall(r'url\((https[^)]+)\)', css)
        assert len(urls) == 1, (family, w, urls)
        data = get(urls[0])
        assert data[:4] == b'wOF2', (family, w, data[:4])
        (out / f'{stem}-{w}.woff2').write_bytes(data)
        print(f'{stem}-{w}.woff2  {len(data) // 1024} KB')

for name, url in [('OFL-NotoSansSC.txt', 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE'),
                  ('OFL-NotoSerifSC.txt', 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/LICENSE'),
                  ('OFL-JetBrainsMono.txt', 'https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt')]:
    (out / name).write_bytes(get(url))
(out / 'subset-characters.txt').write_text(text, encoding='utf-8')
print(len(text), 'characters')
