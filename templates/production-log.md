# Production log: <title>

Spec: <model> · <aspect> · <resolution> · native audio on/off · max <n> s per clip
Approvals: <date>: <what the director approved>

## References (locked)

| Name | Used for | File | Status |
|---|---|---|---|
| heroine | Main character | refs/heroine.jpg | locked |
| place-gate | Scenes 1–3 | refs/place-gate.jpg | locked |

## Shots

| # | Name | Length | References (in order) | Prompt | Take | Output | Status |
|---|---|---|---|---|---|---|---|
| 1 | Gate at dawn | 12 s | place-gate | prompts/01.md | 1 | clips/01.mp4 | ✓ approved |
| 2 | Farewell | 10 s | heroine, place-gate | prompts/02.md | 2 | clips/02.mp4 | ⟳ redo: face drifts at 0:07 |
| 3 | Down the steps | 10 s | heroine | prompts/03.md | 1 | clips/03.mp4 | ☐ to review |

Status keys: ☐ to review · ✓ approved · ⟳ redo (say why) · ✗ cut

## Notes

- If a generation times out, check the output folder before running it again; it may have finished anyway.
- Contact sheets: `tools/review.sh clips/*.mp4`
- Assembly: `tools/stitch.sh shots.txt out/episode.mp4 --size 1080x1920 --srt episode.srt`
