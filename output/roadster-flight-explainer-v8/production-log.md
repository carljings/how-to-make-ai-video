# Production log — v8《空气现形》

Revision date: 2026-10-19, Asia/Taipei. The user requested a less abrupt ending, improved pacing and deeper study of compelling science films, then explicitly gave Opus 5.5 final aesthetic and pacing authority. V8 is separate from v7 and earlier editions.

## Direction and implementation

The initial v8 timing was engineered by Codex and workers. Opus then inspected actual native Metal contact sheets, edited the final source and supplied the [director lock](DIRECTOR_LOCK.md). Its final directive used Opus 5.5 with high effort. An earlier max-effort, read-only advisory stopped without a verdict and is not presented as that final pass. [Actual public collaboration](CLAUDE_COLLABORATION.md) records the dialogue.

Opus retained the first 55 seconds after reviewing rendered stills. The opening carries one question across two shots, with the first air reveal at 4.3 seconds. Reading holds for the fan/seal, stored-gas and torque diagrams remain. The separate kickflip demonstration and its visible-lines caveat remain explicit.

The initial callback still froze before its fade. Opus changed the ending itself: return at 55 seconds; gold load arrow at 55.8; answer at 57.1; gravity at 58.0; gentle air reveal at 59.2. The camera continues its orbit and decelerates toward the opening composition. Air vision holds while the answer remains visible, then picture and text fade from 62.2 to 63.4. The cut ends at 63.5 seconds: 1,905 frames at 30fps, 1080 × 1920. Opus's final review also kept the callback's gap at the already-established lower-but-nonempty air state, without adding a new claim.

The score follows the same event schedule. Its answer motif begins at 54.7 seconds and resolves at 57.1. The softer reveal tone returns at 59.2; the home chord and air layer release from 60.8; the safety fade ends at 63.3. No spoken narration is used. The four-stem PCM master measures −20.0 LUFS / −6.2 dBTP, with 9,761 trailing zero samples at 48kHz (about 0.203 seconds), recorded in [the master report](out/audio/master.json).

## Evidence and limits

The [ownership record](CREATIVE_OWNERSHIP.md) distinguishes Opus's source edits and image judgment from Codex's factual/technical work. Shared timing and text live in `web/engine/cues.js`; the ending animation is in `web/engine/timeline.js`; music events are in `tools/score.mjs`.

The scientific basis is the inherited [v7 audit](SCIENCE_AUDIT.en.md), not a new complete manufacturer/factory re-verification. V8 retains the corrected pressure, seal/leakage, gravity, thrust, torque and finite-reserve claims. It does not establish real hardware placement, measured forces, full vehicle dynamics or the role of source-visible cables.

Native rendered stills were inspected, including the revised callback. The final MP4, complete decode, encoded-frame checks, audio measurements, source/hash checks and remaining limitations belong in [QA.md](QA.md) and [verification.json](out/delivery-v8/verification.json); this process log does not declare them passed ahead of those records. V7 source and video hashes were checked unchanged during this revision.

No human listening, continuous physical-phone review, audience aesthetic approval or retention improvement is established. The [English](../../docs/science-video-storytelling-2026-10-19.md) / [中文](../../docs/zh-CN/science-video-storytelling-2026-10-19.md) learning notes distinguish published learning research, creator experience and this film's editorial proposals. No commit, push or publication was performed for this delivery.


## Delivery result

The final MP4 now exists. Complete decoding exited 0; Codex actually viewed all 67 encoded review frames across 8 contact sheets. Encoded AAC measures −20.0 LUFS / −6.2 dBTP. Exact size, hash and checks are in QA.md and out/delivery-v8/verification.json. V7 video and source hashes remain unchanged. Human listening, physical-phone review and audience acceptance remain unverified.
