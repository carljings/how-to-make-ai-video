# Production log — Rubik's Cube r4

Date: 2026-10-25 (America/Chicago). Status: ready for user review.

## Authorization and scope

The user approved the full revised script, including the accurate distinction between a meet-in-the-middle illustration and the actual 2010 universal proof, and asked for a better finished video. The current request authorizes Codex to perform the creative revision using the Opus production method. Preserve all earlier films and deliver the finished copy to iCloud Drive Downloads.

## Production method

- Independent source copy from rubiks-opus-faithful-20261024; its original source hashes are in baseline.json.
- Original deterministic Canvas 2D cube renderer, original standalone headless Chrome/Metal export tool and original Web Audio instrument functions.
- New shared 180-second/120-BPM timeline, 1080x1920, 30 fps, no voice-over. Original score re-orchestrated to match actual actions and the extended ending.
- Existing 13 WOFF2 files preserved; missing characters added from the same Noto Sans SC 2.004 master into separate local subsets. Browser boot now awaits all registered font faces.

## Verification completed before full export

- Chrome reports ANGLE Metal on Apple M4.
- Inspected 43 initial keyframes and revised problem frames. Fixed midpoint-label overlap, count timing, full-coverage confirmation contrast, and an initial-superflip description that incorrectly persisted while the cube was being solved.
- Original 15 method stage checks and the superflip check pass.
- Two independent 10-move paths reach exactly identical cubie positions and rotations; the 20-move joined route reaches solved. Opening reveal also returns to solved.
- Font serialized cmap coverage passes; original font hashes remain identical.
- Original-score first export has complete 180-second stereo PCM. Signal inspection found an early tail drop, so only the final pad/sub duration is being corrected and exported to a second WAV; the first WAV is preserved.

## User's reference correction

The user rejected the first circular search illustration, then confirmed Polylog's concentric-depth rings and node/edge path (7:51–8:15 in https://www.youtube.com/watch?v=wL3uWO-KLUE). The reference was actually viewed via browser, and the original MIT-licensed animation source was read. No original video or audio is reused. Reference source and license are under docs/references/.

The opening/structure/count and post-proof acts can render independently while this proof illustration is revised. Render ranges are contiguous global frame ranges; each output part is later checked for exact frame count before concatenation.

## Remaining gates

1. Review the reference-based search animation and its continuous action.
2. Render all 5400 frames; validate source inputs and part boundaries.
3. Master and mux; measure the actual AAC, require true peak <= -1.5 dBTP, check A/V lengths and full decode.
4. Review frames extracted from the encoded MP4, then copy and SHA-256 verify in iCloud Downloads. Local copy is not proof of cloud sync.

Limits: no physical-phone test or subjective audio-listening claim has been made.

## Final encode review

All three rendered parts total 5400 frames / 180 seconds. First full mux passed: H.264 + AAC 48 kHz stereo, -14.14 LUFS, -2.00 dBTP, no decode errors. Encoded boundary review identified an avoidable fade-out/reappearance of the large 20 at 104 seconds; its last 0.6 seconds now scales into the exact next-shot number position, with the same split-flap seam. Only the last 90 frames of the proof part are being re-rendered; the previous chunk is retained.

## Final outcome

The repaired final MP4 passes 5400 frames / 180.000 s, H.264 1080x1920 at 30 fps, AAC 48 kHz stereo, -14.14 LUFS, -2.00 dBTP and full decode. Reviewed encoded keyframes, adjacent boundary frames, the chosen ring/path illustration and the readable website ending. All 21 route nodes map to the verified physical cube states. No physical-phone or subjective full-listening acceptance is claimed.
