# Faithful Opus production revision r3

The user requested that Codex follow the Opus aesthetic and method. This revision starts from the preserved
Opus r1 project and reverses the aesthetic/pipeline changes in the separately retained Codex r2.

## Fixed scope

1. Constraint markers use the animated placement of the same corner/edge identity. Keep the small original
   red lock and caption, stacked compactly above the actual piece to clear the headline.
2. F2L numbering is 1–4. Keep the original camera, highlights, timings and drawing style.
3. Stage labels reserve enough width for check marks. Keep the original font, size, colors and pill component;
   the reserved positions are stable as stages finish.

Only `src/scenes/count.js` and `src/scenes/methods.js` change among the original rendering inputs. The original
158-second timeline, move sequence, score, fonts, core renderer and Chrome export script remain identical.
Use the original standalone headless Chrome rendering command explicitly requested by the user; it renders
only this local film, in a fresh temporary profile. No account or ordinary user browser profile is involved.

Reuse the original Web Audio-generated AAC stream without re-synthesis or re-encoding. Reuse 43 original
picture chunks (3840 frames), and render the ten affected chunks (900 frames) using the original renderer.
Assemble with FFmpeg, verify picture/audio packets, timestamps, decode, loudness and corrected encoded frames.

This is a Codex mechanical correction of the Opus original, not a new Opus-produced or Opus-approved film.
