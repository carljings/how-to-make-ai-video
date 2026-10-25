#!/usr/bin/env python3
"""Recombine the original Google Fonts subsets for native Canvas, keeping their glyph outlines.

The HTML preview retains its original WOFF2 unicode ranges. Native Skia needs each weight in one font.
Run with the optional requirements-fonts.txt environment only when the WOFF2 sources change.
"""
from collections import defaultdict
from pathlib import Path
import hashlib
import json
from fontTools.merge import Merger, Options
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
fonts = root / 'src/fonts'
groups = defaultdict(list)
for face in json.loads((fonts / 'fonts.json').read_text())['faces']:
    if face['family_in_page'] in ('F-Sans', 'F-Serif'):
        groups[(face['family_in_page'], face['weight'])].append(face['file'])
target = fonts / 'native'
target.mkdir(exist_ok=True)
manifest = []
for (family, weight), files in groups.items():
    options = Options()
    options.drop_tables = ['BASE', 'STAT']  # no vertical typesetting or variable-font axes in this film
    merged = Merger(options=options).merge([str(fonts / f) for f in files])
    out = target / f'{"sans" if family == "F-Sans" else "serif"}-{weight}.ttf'
    merged.save(out)
    cmap = TTFont(out).getBestCmap()
    expected = set().union(*(set(TTFont(fonts / f).getBestCmap()) for f in files))
    assert expected <= set(cmap), f'Lost glyphs in {out.name}'
    manifest.append({'family': family, 'weight': weight, 'file': out.name, 'sources': files,
                     'codepoints': len(cmap), 'sha256': hashlib.sha256(out.read_bytes()).hexdigest()})
    print(out.name, len(cmap), 'codepoints')
(target / 'manifest.json').write_text(json.dumps({'licence': 'SIL OFL 1.1, same source glyphs as fonts.json', 'fonts': manifest}, indent=2))
