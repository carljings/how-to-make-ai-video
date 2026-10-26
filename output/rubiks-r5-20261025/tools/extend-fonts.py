#!/usr/bin/env python3
"""Add local Noto Sans SC glyph subsets without replacing the Opus font files.

Run after scene text is frozen, with the existing rubiks-opus-polish .font-env.
--check-only reads sources/fonts and prints coverage; it writes nothing.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import tempfile
import unicodedata

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / 'src/fonts'
MASTER = Path(os.environ.get('NOTO_SANS_SC_MASTER', str(ROOT / 'font-source/NotoSansSC-full-variable.ttf')))
BEGIN = '/* BEGIN EXTRA GLYPHS: tools/extend-fonts.py */'
END = '/* END EXTRA GLYPHS: tools/extend-fonts.py */'
TOKEN = re.compile(r'''//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`''')
LITERAL = r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)'''


def sha(data):
    return hashlib.sha256(data).hexdigest()


def literal_text(token):
    text = token[1:-1]
    text = re.sub(r'\\u\{([0-9a-fA-F]+)\}', lambda m: chr(int(m[1], 16)), text)
    text = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m[1], 16)), text)
    return re.sub(r'\\([\\\'"`])', r'\1', text)


def chars_text(codes):
    return ''.join(chr(c) for c in sorted(codes))


def atomic_write(path, data):
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.extra-', delete=False) as out:
        temporary = Path(out.name)
        out.write(data)
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    css_path = FONT_DIR / 'fonts.css'
    css = css_path.read_text()
    if css.count(BEGIN) != css.count(END) or css.count(BEGIN) > 1:
        raise SystemExit('Unexpected generated CSS block; inspect fonts.css before continuing.')
    base_css = re.sub(r'\n?' + re.escape(BEGIN) + r'.*?' + re.escape(END) + r'\n?', '', css, flags=re.S)

    sources = {p: p.read_bytes() for p in sorted((ROOT / 'src').rglob('*.js'))}
    source_hashes = {str(p.relative_to(ROOT)): sha(data) for p, data in sources.items()}
    required = set(range(32, 127))
    known_calls = []
    for path, data in sources.items():
        text = data.decode('utf-8')
        # Literal/template text only; comments do not request glyphs. Template expressions
        # may add redundant ASCII characters, which the original subsets already contain.
        for token in TOKEN.finditer(text):
            if token[0][0] in '\'"`':
                required.update(ord(c) for c in literal_text(token[0]) if c >= ' ' and not c.isspace() and c != '\ufeff')
        for match in re.finditer(r'\b(label|bigNumber|odometer)\(ctx,\s*(' + LITERAL + r')[^\n]*', text):
            helper, token = match[1], match[2]
            family_match = re.search(r'family:\s*(MONO|COND|SANS|SERIF)\b', match[0])
            family = ('F-Cond' if helper != 'label' else
                      {'MONO': 'F-Mono', 'COND': 'F-Cond', 'SANS': 'F-Sans', 'SERIF': 'F-Serif'}.get(family_match[1] if family_match else '', 'F-Sans'))
            value = re.sub(r'\$\{[^}]*\}', '', literal_text(token))
            suffix = match[0][match.end(2) - match.start():]
            replace = re.match(r'\s*\.replace\(\s*(' + LITERAL + r')\s*,\s*(' + LITERAL + r')\s*\)', suffix)
            if replace:
                value = value.replace(literal_text(replace[1]), literal_text(replace[2]), 1)
            known_calls.append({'file': str(path.relative_to(ROOT)), 'line': text.count('\n', 0, match.start()) + 1, 'family': family, 'text': value})

    faces, coverage, original_hashes = [], {}, {}
    for block in re.findall(r'@font-face\s*\{(.*?)\}', base_css, flags=re.S):
        family = re.search(r'font-family:\s*[\'"]([^\'"]+)', block)[1]
        weight = int(re.search(r'font-weight:\s*(\d+)', block)[1])
        filename = re.search(r'url\([\'"]?([^\'"\)]+)', block)[1]
        path = FONT_DIR / filename
        if path.name.startswith('extra-'):
            raise SystemExit('An extra font is referenced outside the managed CSS block.')
        with TTFont(path) as font:
            codes = set(font.getBestCmap())
        range_match = re.search(r'unicode-range:\s*([^;]+)', block)
        if range_match:
            ranges = []
            for part in range_match[1].split(','):
                parts = part.strip().removeprefix('U+').split('-')
                ranges.append((int(parts[0], 16), int(parts[-1], 16)))
            codes = {c for c in codes if any(a <= c <= b for a, b in ranges)}
        coverage.setdefault((family, weight), set()).update(codes)
        original_hashes[filename] = sha(path.read_bytes())
        faces.append({'family': family, 'weight': weight, 'file': filename, 'actual_codepoints_in_css_range': len(codes)})

    with TTFont(MASTER) as master:
        master_codes = set(master.getBestCmap())
        master_version = master['name'].getDebugName(5)
    # Some accents (e.g. the ő in Ernő Rubik) are intentionally drawn in Plex Mono,
    # whose cmap contains them although Noto Sans SC does not. Preserve that choice.
    known_sans = {ord(c) for call in known_calls if call['family'] == 'F-Sans' for c in call['text']}
    other_only = set()
    for call in known_calls:
        if call['family'] != 'F-Sans':
            covered = set().union(*(codes for (family, _), codes in coverage.items() if family == call['family']))
            other_only.update({ord(c) for c in call['text']} & covered - master_codes - known_sans)
    sans_required = required - other_only
    missing = {w: sans_required - coverage.get(('F-Sans', w), set()) for w in (400, 700, 900)}
    unfillable = set().union(*missing.values()) - master_codes
    symbols = {c for c in required if c >= 127 and unicodedata.category(chr(c)) in ('Sm', 'So')}
    other_faces = []
    errors = []
    for (family, weight), codes in sorted(coverage.items()):
        if family == 'F-Sans':
            continue
        calls = []
        for call in known_calls:
            if call['family'] == family:
                absent = {ord(c) for c in call['text'] if c >= ' ' and not c.isspace()} - codes
                if absent:
                    calls.append({**call, 'missing': chars_text(absent)})
                    errors.append(f"{call['file']}:{call['line']}: {family} {weight} lacks {chars_text(absent)!r}")
        other_faces.append({'family': family, 'weight': weight, 'missing_ascii': chars_text(set(range(32, 127)) - codes),
                            'source_symbols_missing_candidate_only': chars_text(symbols - codes), 'known_literal_failures': calls})

    report = {'source_hashes': source_hashes, 'source_literal_codepoints': len(required),
              'known_other_family_glyphs_excluded_from_sans': chars_text(other_only),
              'master': {'path': str(MASTER), 'sha256': sha(MASTER.read_bytes()), 'version': master_version},
              'original_font_sha256': original_hashes, 'original_faces': faces,
              'sans_missing_before': {str(w): chars_text(c) for w, c in missing.items()},
              'unfillable': chars_text(unfillable), 'other_faces': other_faces,
              'static_check_limit': 'Other-family literal checks cover direct single-line calls; dynamic text must also be checked in the rendered film.',
              'errors': sorted(set(errors)), 'generated': []}
    summary = {'sans_extra_counts': {str(w): len(c) for w, c in missing.items()}, 'unfillable': report['unfillable'],
               'other_family_errors': report['errors'], 'other_family_symbol_candidates': other_faces, 'check_only': args.check_only}
    if args.check_only:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        return 1 if unfillable or errors else 0
    if unfillable or errors:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        raise SystemExit('Uncovered glyphs require an explicit source/font choice; original fonts were not modified.')

    buffers, rules = {}, []
    for weight, codes in missing.items():
        if not codes:
            continue
        font = TTFont(MASTER)
        options = subset.Options()
        options.layout_features = ['*']
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=codes)
        worker.subset(font)
        font = instantiateVariableFont(font, {'wght': weight}, inplace=True)
        font.flavor = 'woff2'
        stream = io.BytesIO()
        font.save(stream)
        data = stream.getvalue()
        with TTFont(io.BytesIO(data)) as check:
            assert codes <= set(check.getBestCmap()), 'Serialized subset is missing glyphs.'
            assert check['OS/2'].usWeightClass == weight
        filename = f'extra-sans-{weight}.woff2'
        buffers[filename] = data
        unicode_range = ','.join(f'U+{c:X}' for c in sorted(codes))
        rules.append(f'@font-face {{ font-family: "F-Sans"; font-style: normal; font-weight: {weight}; font-display: block; src: url("{filename}") format("woff2"); unicode-range: {unicode_range}; }}')
        report['generated'].append({'file': filename, 'weight': weight, 'codepoints': len(codes), 'sha256': sha(data), 'bytes': len(data)})

    # Do not publish font/CSS changes against a moving set of scene text.
    for path, data in sources.items():
        if path.read_bytes() != data:
            raise SystemExit(f'Source changed during font preparation: {path}; rerun after text is frozen.')
    if set(sources) != set((ROOT / 'src').rglob('*.js')):
        raise SystemExit('Source files changed during font preparation; rerun after text is frozen.')
    for filename, data in buffers.items():
        atomic_write(FONT_DIR / filename, data)
    extra_css = '\n'.join(rules) + '\n'
    atomic_write(FONT_DIR / 'extra.css', extra_css.encode())
    managed = '\n' + BEGIN + '\n' + extra_css + END + '\n'
    atomic_write(css_path, (base_css + managed).encode())
    report['pass'] = all(sans_required <= (coverage[('F-Sans', w)] | missing[w]) for w in (400, 700, 900))
    report['original_fonts_unchanged'] = all(sha((FONT_DIR / name).read_bytes()) == digest for name, digest in original_hashes.items())
    assert report['pass'] and report['original_fonts_unchanged']
    atomic_write(FONT_DIR / 'extra-coverage.json', (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode())
    print(json.dumps({'pass': report['pass'], 'original_fonts_unchanged': True, 'generated': report['generated'],
                      'coverage_report': str(FONT_DIR / 'extra-coverage.json')}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
