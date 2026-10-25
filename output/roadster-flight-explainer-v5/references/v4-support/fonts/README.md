# v3 font resources

Five real static Noto Sans SC derivatives:300/500/600/700/900. All701 required codepoints, including570 Chinese characters, are covered in both TTF and WOFF2; there is no remaining variable axis. The full local official source and OFL provenance are recorded in provenance.json. No model/font download was needed. The Chinese raster proof was actually inspected. This verifies font resources, not final on-screen layout or phone readability.

Final exact cue text must be audited again if it introduces new glyphs. Build command executed from the repository root:

```sh
python3 output/roadster-flight-explainer-v3/support/fonts/build-subset.py .omx/artifacts/roadster-production-20261016/font-support/NotoSansSC-full-variable.ttf
```
