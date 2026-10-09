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

url = 'https://fonts.googleapis.com/css2?' + urlencode({
    'family': 'Noto Sans SC:wght@400;600;800', 'display': 'swap', 'text': characters})
css = read(url).decode()
urls = list(dict.fromkeys(re.findall(r'url\((https[^)]+)\)', css)))
downloads = [read(url) for url in urls]
for i, (url, data) in enumerate(zip(urls, downloads)):
    name = f'NotoSansSC-{i}.woff2'
    (root / 'fonts' / name).write_bytes(data)
    css = css.replace(url, name)
css = css.replace("'Noto Sans SC'", "'Noto Film'")
css += "\n@font-face{font-family:Inter;src:url('Inter.woff2');font-weight:100 900;font-display:block;}\n"
css += "@font-face{font-family:JetBrains;src:url('JetBrainsMono-400.woff2');font-weight:400;}\n"
(root / 'fonts/fonts.css').write_text(css)
(root / 'fonts/subset-characters.txt').write_text(characters)
print('Saved three local CJK faces:', len(characters), 'characters')
