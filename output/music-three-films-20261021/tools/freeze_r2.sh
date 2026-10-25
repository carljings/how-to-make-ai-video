#!/bin/sh
# freeze_r2.sh — sha256 manifest of everything that draws, times or sounds the r2 films, and one tarball for the M4.
# Run from the project root.  Output: out/r2-source.sha256, out/r2-bundle.tar
set -e
FILES=$(find src vendor -type f | sort; echo tools/render.mjs tools/mux.py tools/review.py tools/sheet.py tools/bgm.py tools/fonts.py tools/freeze_r2.sh; echo out/audio/A-bgm.wav out/audio/A-bgm.json out/audio/B-bgm.wav out/audio/B-bgm.json; find LICENSES -type f | sort)
sha256sum $FILES > out/r2-source.sha256
tar -cf out/r2-bundle.tar out/r2-source.sha256 $FILES
sha256sum out/r2-source.sha256 out/r2-bundle.tar
