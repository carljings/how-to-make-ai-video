# Roadster v6 AIR, REVEALED — text-led, no spoken narration

> Scientific follow-up2026-10-18: retained as an older draft. Technical/pixel QA did not verify as-built internals. V7 corrects suction wording, inferred fan/vessel placement, seal loss and force/motion statements. See[science audit](../../docs/roadster-science-audit-2026-10-18.md).

Completed:54.1s,1080×1920,30fps,1623frames. Opus5.5(max) directed and authored the code; Codex provided native Metal rendering and independent evidence review. Music and SFX are original procedural synthesis; no spoken voice,TTS,old mixed master or speech ducking.

[FullMP4 (not included; see archive status)](../archive-20261025/README.md) · [QA](QA.md) · [Actual English collaboration](CLAUDE_COLLABORATION.md) · [Chinese publish copy](PUBLISH.zh-CN.md)

The opening shows the inverted car and question on frame0. Fifteen short explanatory cards accompany pressure/air/jet/torque reveals; reading windows drive both picture and sound through `web/engine/cues.js`. Gold denotes outside pressure; cyan denotes carried gas. The ending preserves the finite-reserve limitation.

Complete decoding,46actual encoded-frame checks,font coverage,text layout/reading checks and loudness metering passed. Encoded audio:-14.1LUFS/-2.1dBTP. Subjective listening,physical-phone continuous playback and user aesthetic acceptance are not established. SeeQA.md.

`out/delivery-v6/` contains the fullMP4,two actual encoded covers,text inventory,publish draft,verificationJSON and encoded contacts. Direction/storyboard are inTREATMENT.en.md/storyboard.zh-CN.md; production-log.md records actual steps. Exact render/encode commands are inout/full-render-01/command.json andout/delivery-v6/encode-command.json. Audio and text tools aretools/score.mjs,mix.mjs,text_inventory.mjs.

Geometry/poses preserve the inferred source fit and finite flat ceiling. Internals/forces/particles are schematic,not factoryCAD/CFD/performance data. The kickflip stays a separate demonstration with visible cables of unknown role. Source release:2026-10-16. Versions1–5 remain; the v5MP4 hash is unchanged. NoGitpush/publication in this revision.
