from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import re, hashlib, json, subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
source = ''.join(p.read_text() for p in [ROOT/'src/film.js', ROOT/'src/segments.json'])
chars = ''.join(sorted(set(source) | set(chr(i) for i in range(32,127)) | set('≤≥×÷⁷¹²⁰°≠→✓')))
url = 'https://fonts.googleapis.com/css2?' + urlencode({'family':'Noto Sans SC:wght@400;700','text':chars})
ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
def get(url):
    return subprocess.run(['curl','--fail','--silent','--show-error','--location','--connect-timeout','10','--max-time','45','--user-agent',ua,url],capture_output=True,check=True).stdout
css = get(url).decode()
receipt=[]
for block in re.findall(r'@font-face\s*\{([^}]+)\}',css):
    weight=int(re.search(r'font-weight:\s*(\d+)',block)[1])
    asset=re.search(r'url\(([^)]+)\)',block)[1]
    data=get(asset)
    path=ROOT/f'assets/fonts/NotoSC-{weight}.woff2';path.write_bytes(data)
    font=TTFont(path); cmap=font.getBestCmap()
    required={ord(c) for c in chars if '\u4e00'<=c<='\u9fff'}
    assert required<=set(cmap), 'Missing CJK glyphs'
    if 'fvar' in font: instantiateVariableFont(font,{'wght':weight},inplace=True)
    font.flavor=None;ttf=path.with_suffix('.ttf');font.save(ttf)
    receipt.append(dict(weight=weight,cjkGlyphs=len(required),sha256=hashlib.sha256(ttf.read_bytes()).hexdigest(),source=asset))
(ROOT/'assets/fonts/font-subset-v2.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps([{k:v for k,v in r.items() if k!='source'} for r in receipt]))
