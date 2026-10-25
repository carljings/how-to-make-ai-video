# Final v3 QA — 2026-10-17

PASS: encoded-output technical verification and sampled final picture/cover inspection.

- Master video: `../roadster-v3-steeper-than-a-wall.mp4`
- SHA256: `05ed04490d42c4c913cbb4867fdde02a3c647b3f35063b2b74b0e823a271d2ba`
- Actual58.300seconds,1749decodedframes,1080×1920,30fps,H.264/yuv420p/BT709; full decode clean.
- AAC48kHz stereo; encoded loudness−14.1LUFS,truepeak−1.9dBTP. See `../verification.json`.
- Exact master WAV hash `eb311fae6b7d8e296e609643100fed88e4d996cf8a70fcc2d26a2c124ec3c57e` matches the completed LOCAL mixed-master recognition report. All clauses and critical negations are recognized; five remaining substitutions are homophones. The report documents the time-preserving mono16k ASR derivative. This is technical recognition, not subjective hearing.

## Actual final visual inspection

The parent inspected the full19-sample actual encoded contact sheet, native encoded8.9s(low-pressure gap) and53.8s(complete end poster), and both cover ratios at243px and324px widths. Opening/title, pressure/grip, normal-vs-gravity, lip hand-off, vessels, jets/reaction, separate kickflip/torque and the complete end-poster trajectory are present and legible in the reviewed samples. The last black sample follows the intended fade, not a missing frame. Covers keep the whole car and the complete question.

[Encoded samples](encoded-contact.jpg) · [Cover thumbnails](covers-phone-grid.jpg)

## Scope and provenance

Visual inspection is sampled; there is no claim of checking every frame by eye. There is no subjective listening or physical-phone review, user aesthetic acceptance, publication or view-count guarantee.

The original artist's source is Opus5.5/max. Codex made narrow completeness/occlusion corrections under that existing design and verified them with actual revised renders. The156opening frames and4non-poster stills were reused only after comparing every physical input state and unchanged renderer/material/geometry dependencies; details in `opening-reuse-validation.json`. All other assets are source-locked and hash-recorded. See `poster-completeness-fix.json` and the full plate manifest.
