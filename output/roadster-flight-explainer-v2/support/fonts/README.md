# v2 font support

The new v2 faces are **Roadster Film Sans 300 / 600 / 900**, real static instances of the already-local official Noto Sans SC variable source. Both TTF and WOFF2 are supplied here and in `public/fonts/roadster/`. Copied 500/700 legacy faces remain untouched for compatibility. The copied legacy `fonts.css` is unchanged; Opus owns the v2 font-loading code and visual styles.

`subset-characters.txt` contains **521 required codepoints, including 404 Chinese characters**. The inventory covers every printable character in the complete v2 `CREATIVE_DIRECTION.en.md` and `storyboard-v2.zh-CN.md`, plus printable ASCII. No fresh `v2/cues.json` or `src/v2` cue/spec JSON existed at build time; audit future text against this inventory when those files arrive. The coverage superset does not authorize additional screen text.

Checks passed for all six assets: complete cmap coverage; actual OS/2 weight 300/600/900; static fonts with no remaining `fvar` axis; successful WOFF2 reopen. Every non-space character was rasterized at all three weights with Pillow/FreeType. There were no empty or missing-glyph rasters, and decoded-WOFF2 rasters exactly matched their TTF counterparts. `font-raster-proof.png` was visually inspected. Two consecutive builds produced identical hashes. These checks verify font resources, not final subtitle readability or aesthetic acceptance.

`coverage.json` records every asset's size, weight and SHA-256. `provenance.json` records source/license URLs, the already-local official source hash and exact inspected document hashes. The SIL Open Font License is bundled. No network, installation, v1 mutation or remote upload was performed for this build.

Executed from the repository root with the existing Python/fontTools runtime:

```sh
python3 output/roadster-flight-explainer-v2/support/fonts/build-subset.py .omx/artifacts/roadster-production-20261016/font-support/NotoSansSC-full-variable.ttf
```

Use filenames `RoadsterFilmSans-300`, `RoadsterFilmSans-600`, `RoadsterFilmSans-900`; family name `Roadster Film Sans`. The source's full TTF remains an internal dependency rather than a second 17.8 MB copy in the film deliverable.
