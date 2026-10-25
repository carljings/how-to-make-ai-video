# Faithful Opus revision r3 — production log

- User explicitly requested the Opus aesthetic and production method after rejecting Codex r2’s additional styling and pipeline changes.
- This build starts from the original Opus project, not r2. It keeps the original timeline, shot/camera functions, palette, fonts, geometry, move timing and score.
- Only three technical corrections: moved lock anchors follow the animated piece; F2L labels count 1–4; stage labels reserve room for their check marks.
- Original Chrome renderer and Web Audio composition remain unchanged. Reuse the existing original AAC track without re-synthesis or re-encoding.
- Copied 43 original encoded picture chunks. Ten chunks (900 frames) covering the corrections will be rendered with the original Chrome/FFmpeg command; no native Canvas or Node audio engine.
- Preserve the original and r2. Source and original chunk checksums are recorded in baseline.json.

## Completed

- Preflight used the unchanged original Chrome export script. Renderer: ANGLE / Apple M4 / Metal. Thirteen PNGs inspected before the movie render.
- Original renderer rendered exactly 10 missing chunks / 900 frames in approximately 146 s; 43 original chunks / 3840 frames were reused.
- FFmpeg assembled video with the original AAC stream, with no audio re-encoding. All 7408 AAC packet payloads and timestamps match r1; all 3840 retained video packet payloads and timestamps also match r1.
- Final movie: 158 s audio/video, 4740 frames, 1080×1920 H.264 at 30 fps, stereo 48 kHz AAC, −14.3 LUFS / −1.98 dBTP. Full decode passed.
- Viewed 17 encoded frames via the lock, method and delivery sheets, including 1–4 pair labels and fully completed stage rows. Original opening/end remain preserved.
- Original source and original movie checksums unchanged. Final rendering inputs match the recorded snapshot.
- Status: ready for user review. No subjective listening, complete continuous viewing or physical-phone test claimed. No publication or Git push.
- Movie SHA-256: 5838ecde67a48f0820d61e60e7ee0b9eead4bb2e1847bf46444b2d142c50c3f1
