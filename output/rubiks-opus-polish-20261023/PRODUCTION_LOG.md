# Production log — Codex polish of the Opus cube film

- User approved the preceding review and asked Codex to revise one film directly. Approved scope: `REVISION.md` and `REVISION.zh-CN.md`.
- Created a separate project from `rubiks-opus-20261023`; original source and MP4 fingerprints saved in `baseline-sha256.json`. Upstream log copied to `docs/base-production-log.md`.
- Retimed eight acts while keeping 158 seconds. Added approximately one second of settled result after each constrained last piece; increased real method-stage holds; recent results have six seconds instead of four.
- Fixed constraint anchors to use the animated placement of the same piece ID, F2L labels to show 1–4, and stage-chip measurement to include the completed check mark. First F2L pair stays highlighted through its result hold; camera faces that pair’s target slot.
- Added local dark backing for opening text/timer. Reduced the state-space counter to three readable milestones. Simplified the two record-owner cards and enlarged recent-results copy.
- Offline rendering uses pinned @napi-rs/canvas 1.0.13 and node-web-audio-api 2.2.0. No raw browser automation is used for this build.
- First native-font review caught split-subset glyph loss, including a blank full-width question mark. Recombined the original subsets with FontTools 4.63.0; punctuation and all three Chinese font weights passed a regression check. A missing scientific superscript was replaced with explicitly positioned digits.
- Music theme and instruments preserved; notes/effects retimed from shared cues, long noise effects loop safely, final bus fades with the picture. Offline raw score: 48 kHz stereo, 158 s, 260.23 s render; waveform peak was normalised safely before PCM export. Subjective listening not performed.
- Viewed 67 per-act frames and 17 targeted correction frames, then five final constraint/exponent frames. Checked opening contrast, origin, shifted locks and settled results, state milestones, exact 2008 bound readout, F2L numbering/facing, checked-chip spacing, both score rounds, recent events and closing/fade.
- Last visual adjustments: constraint halo/body emphasis follows the same identity; the 2008 caption now follows the chart reaching its final year. Scientific notation uses an ASCII exponent drawn above the base.
- Preflight: all 15 original solve-stage checks and the superflip check pass; 11 revision checks cover fonts, ordered cues, target anchors/holds, F2L identity/labels, result holds, chip bounds, render-order determinism and preserved original hashes.
- 2026-10-24 (America/Chicago): full 4740-frame render started in two isolated native workers. Source changes are frozen for this render. Final encode and encoded-frame review pending.

## Completed delivery

- Full picture rendered in 85.111 s: 40 chunks, 4740 frames; final source fingerprint is recorded in `out/render-report.json`.
- Finished MP4: 79,499,989 bytes, exactly 158 s video/audio, 1080×1920 H.264 at 30 fps, stereo 48 kHz AAC. Full decode passed. Final AAC measured −14.2 LUFS, −2.06 dBTP, LRA 4.6 LU.
- Four master-to-AAC comparison windows: detected lag 0 samples at four-sample search resolution; correlations all above 0.9995. Last 20 ms PCM RMS is approximately −94.6 dBFS. These do not substitute for subjective listening.
- Extracted 67 final keyframes and 129 consecutive frames across five motion windows. Inspected both encoded overview sheets, the delivery contact sheet, opening, corner completion, F2L completion, rule reveal and sampled ending. Re-extracted motion JPEGs at fixed quality to avoid review-image rate-control artifacts.
- Scope and limits: encoded-frame checks only, no full continuous viewing, subjective listening or physical-phone test. See `out/visual-review.json`.
- Final movie SHA-256: 9ec6c610098f380e7da717cab84296a80d6a12de090e5215cee96c4cfbc0e841
- Status: ready for the user to watch this first revision. No publication or Git push performed.
