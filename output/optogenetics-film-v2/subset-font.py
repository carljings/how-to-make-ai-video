from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, build_opener, ProxyHandler
import re

root = Path(__file__).resolve().parent
corpus = ''.join(p.read_text() for p in (root / 'src').glob('*.js'))
corpus += (root / 'index.html').read_text()
corpus += ''.join(p.read_text() for p in root.glob('*.md'))
characters = ''.join(sorted(set(c for c in corpus if ord(c) >= 0x2e80)))
characters += '0123456789 ·：，。？！＋−≠→/()ChR2'
opener = build_opener(ProxyHandler({}))

def read(url):
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'})
    return opener.open(request, timeout=25).read()

faces = []
for family, stem, local in [('Noto Sans SC','NotoSansSC','Noto Film'),('Noto Serif SC','NotoSerifSC','Noto Cinema')]:
    url = 'https://fonts.googleapis.com/css2?' + urlencode({
        'family': family + ':wght@400;600;800', 'display': 'block', 'text': characters})
    css = read(url).decode()
    urls = list(dict.fromkeys(re.findall(r'url\((https[^)]+)\)', css)))
    for i, url in enumerate(urls):
        name = f'{stem}-{i}.woff2'
        (root / 'fonts' / name).write_bytes(read(url))
        css = css.replace(url, name)
    faces.append(css.replace("'" + family + "'", "'" + local + "'"))
faces.append("@font-face{font-family:Inter;src:url('Inter.woff2');font-weight:100 900;font-display:block;}")
faces.append("@font-face{font-family:JetBrains;src:url('JetBrainsMono-400.woff2');font-weight:400;}")
(root / 'fonts/fonts.css').write_text('\n'.join(faces))
(root / 'fonts/subset-characters.txt').write_text(characters)
license_url = 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Serif/LICENSE'
(root / 'fonts/OFL-NotoSerif.txt').write_bytes(read(license_url))
print('Saved local Sans/Serif CJK faces:', len(characters), 'characters')
