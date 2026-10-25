# Film font support

Portable, open-licensed Noto Sans SC derivatives for the current approved film. The project-specific family is **Roadster Film Sans**, with actual 500, 700 and 900 faces in WOFF2 (browser/Remotion) and TTF (Blender/FreeType). No macOS system font is redistributed.

`subset-characters.txt` is the exact 329-codepoint inventory: 199 Chinese characters, printable ASCII, punctuation and the requested math/arrow symbols. It covers approved narration in `blender/data/film_cues.json`, Chinese viewer strings in `film.py` / `diagram.py`, and the coordinator's additional source/schematic/cover candidates. Candidates are a coverage superset, not new approved visible content. Re-audit if text changes.

The existing prototype `NotoSansSC-500.woff2` missed **58** codepoints in this final inventory. All six new files cover every required codepoint. Pillow/FreeType rasterized every non-space character at all three weights: zero empty rasters and zero matches to the missing-glyph raster. `font-raster-proof.png` was visually inspected. This verifies font assets; the finished compositor still needs font-load, layout, subtitle safe-area and phone checks.

For the browser, load `fonts.css` and use `font-family: 'Roadster Film Sans'; font-weight: 500` (or 700/900). The CSS assumes the fonts stay beside it. In Remotion, copy this directory to `public/fonts` and resolve file URLs with the existing project's `staticFile` convention. Wait for `document.fonts.load('700 48px "Roadster Film Sans"')` before capturing frames. For Blender text objects, load the chosen `.ttf` using `bpy.data.fonts.load`.

The full official source TTF is 17,772,300 bytes and is kept in internal artifacts, not duplicated in this deliverable. Source URLs, SHA-256, Git blob SHA, license and inspected source-file hashes are in `provenance.json`. The SIL Open Font License is bundled. Derivative family names have been changed; upstream copyright/license records remain in each font.

This command was executed from the repository root with the existing Python fontTools runtime:

```sh
python3 output/roadster-flight-explainer/support/fonts/build-subset.py .omx/artifacts/roadster-production-20261016/font-support/NotoSansSC-full-variable.ttf
```

It checks full-source coverage, subsets once, instantiates actual weights and verifies each saved file. Two consecutive builds produced identical SHA-256 values. `coverage.json` contains output hashes and missing-character checks. `coverage-candidates.json` contains the exact input strings used for the inventory.
