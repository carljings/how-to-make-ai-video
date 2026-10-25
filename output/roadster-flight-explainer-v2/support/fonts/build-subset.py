#!/usr/bin/env python3
"""Build this film's 300/600/900 Noto Sans SC subset from an official full variable TTF."""
import argparse
import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, help='Official NotoSansSC[wght].ttf; see provenance.json')
args = parser.parse_args()
characters = (HERE / 'subset-characters.txt').read_text(encoding='utf-8')
required = {ord(c) for c in characters}
font = TTFont(args.source, recalcTimestamp=False)
source_cmap = font.getBestCmap()
missing = sorted(required - source_cmap.keys())
if missing:
    raise SystemExit('Source lacks: ' + ''.join(chr(c) for c in missing))
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_languages = ['*']
options.recalc_bounds = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=required)
subsetter.subset(font)
outputs = []
for weight in (300, 600, 900):
    face = instantiateVariableFont(font, {'wght': weight}, inplace=False)
    face.recalcTimestamp = False
    # Rename derivatives to a project-specific family; keep source copyright and license records.
    family = 'Roadster Film Sans'
    style = {300: 'Light', 600: 'SemiBold', 900: 'Black'}[weight]
    names = {1: family, 2: style, 3: f'RoadsterFilmSans-{weight}',
             4: f'{family} {style}', 6: f'RoadsterFilmSans-{weight}', 16: family, 17: style}
    face['OS/2'].usWeightClass = weight
    face['OS/2'].fsSelection &= ~((1 << 5) | (1 << 6))
    face['OS/2'].fsSelection |= (1 << 5) if weight >= 700 else (1 << 6)
    face['head'].macStyle = (face['head'].macStyle & ~1) | (1 if weight >= 700 else 0)
    for ident, text in names.items():
        face['name'].setName(text, ident, 3, 1, 0x409)
        face['name'].setName(text, ident, 1, 0, 0)
    for ext in ('ttf', 'woff2'):
        path = HERE / f'RoadsterFilmSans-{weight}.{ext}'
        face.flavor = 'woff2' if ext == 'woff2' else None
        face.save(path)
        check = TTFont(path)
        absent = sorted(required - check.getBestCmap().keys())
        if absent:
            raise SystemExit(f'{path.name} lacks characters')
        if check['OS/2'].usWeightClass != weight or 'fvar' in check:
            raise SystemExit(f'{path.name} has incorrect static weight metadata')
        outputs.append({'file': path.name, 'weight': weight, 'actual_weight': check['OS/2'].usWeightClass, 'size_bytes': path.stat().st_size,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'covered_required_codepoints': len(required), 'missing_required_codepoints': []})
report = {'required_unique_codepoints': len(required),
          'required_cjk_unique': sum(0x3400 <= c <= 0x9fff for c in required),
          'source_sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
          'outputs': outputs}
(HERE / 'coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
