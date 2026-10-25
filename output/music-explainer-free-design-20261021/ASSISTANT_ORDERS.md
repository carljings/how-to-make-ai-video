# ORDERS r6: execute exactly (Opus directs; Codex runs verbatim, no decisions, no source edits, no deletions)

Run on the M4 in `/Users/guchuan/Desktop/how-to-make-ai-video/output/music-explainer-free-design-20261021`.
- `PY` = `/Users/guchuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
- A `grep -c` that returns 0 (exit 1) is success: report the count and continue.
- Any other failure: report the output verbatim and stop.

r6 changes (Opus, ending only): the ending camera aims lower so all of Clawd and the car front sit below the answer (r5 cut the car off); rings fade out earlier as the ending camera flies through them (r5 had a big white ring blob at f1213).

## 1. Sync and freeze
Copy `src/film.js` and `ASSISTANT_ORDERS.md` from the server project, overwriting the M4 copies.
```bash
node tools/freeze.mjs --check || true          # report the diff lines (expected: exactly those 2 files)
node tools/freeze.mjs                          # report the manifest sha256
```

## 2. Checks and render (to NEW file names; nothing is deleted)
```bash
node tools/render.mjs --textcheck --gl metal > out/textcheck-r6.txt 2>&1; tail -1 out/textcheck-r6.txt; grep -c OUTSIDE out/textcheck-r6.txt
node tools/render.mjs --video --gl metal --workers 2 --out out/picture-r6.mp4
node tools/verify.mjs --picture out/picture-r6.mp4 --out out/music-explainer-free-design-r6.mp4 > out/verify-r6.txt 2>&1; tail -1 out/verify-r6.txt; grep -c FAIL out/verify-r6.txt
```
Reuse the existing original-BGM WAV; do not regenerate it.

## 3. Evidence (a new directory)
```bash
$PY tools/evidence.py out/music-explainer-free-design-r6.mp4 out/ev-r6
```
Upload ONE batch, then confirm the upload's exit code and each remote sha256 before reporting.
- → `.omx/artifacts/music-explainer-free-design-20261021/ev-r6/b1/`: `overview-2.jpg`, `m-end.jpg`, `full-1100.jpg`, `full-1160.jpg`, `full-1213.jpg`, `out/verify-r6.txt`.

Report the r6 MP4's sha256 and size and the lines printed by `evidence.py`. Keep the r3–r6 MP4s on the M4.
