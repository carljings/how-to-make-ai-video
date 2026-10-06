# 1 · The pipeline

**English** · [简体中文](zh-CN/01-pipeline.md)

Every video in this repo, generated or code-drawn, went through the same ten steps. The tools change between the two paths; the steps don't.

```mermaid
flowchart LR
  A[Idea] --> B[Brief] --> C[Script] --> D[Storyboard] --> E[Assets]
  E --> F[Shots] --> G[Review] --> H[Sound] --> I[Edit & master] --> J[Publish]
  G -- "fails" --> F
```

| # | Step | You produce | Template |
|---|---|---|---|
| 1 | **Idea** | One sentence: who is it for, and what should they feel or know at the end? | |
| 2 | **Brief** | Length, aspect ratio, platform, language, tone, references, must-haves, no-gos | [`templates/brief.md`](../templates/brief.md) |
| 3 | **Script** | Narration or dialogue, timed | |
| 4 | **Storyboard** | A shot list: time, picture, words, sound for every shot | [`templates/storyboard.md`](../templates/storyboard.md) |
| 5 | **Assets** | Path A: character and location reference images. Path B: fonts, data, palette | |
| 6 | **Shots** | Path A: one generated clip per shot. Path B: one scene module per act | [`templates/shot-prompt.md`](../templates/shot-prompt.md) |
| 7 | **Review** | A contact sheet per shot; a list of shots to redo | [`tools/review.sh`](../tools/review.sh) |
| 8 | **Sound** | Voice, music, effects, mixed | [Chapter 4](04-sound.md) |
| 9 | **Edit & master** | One file: picture joined, subtitles, sound at −14 LUFS | [`tools/stitch.sh`](../tools/stitch.sh), [Chapter 5](05-edit-and-export.md) |
| 10 | **Publish** | The upload, a poster frame, a description, the AI-content label switched on | |

## Rules that saved the most time

**Write the brief before anything else.** Most re-dos come from a missing decision, not a bad generation: vertical or horizontal? Subtitles burned in or not? Chinese, English or both? Settle these in step 2 and put them at the top of every file you hand to an AI.

**Time the script out loud.** Narration runs at roughly 150 English words or 250–300 Chinese characters per minute. A 2-minute film has room for about 250 English words, fewer if the pictures need pauses. If the script doesn't fit, cut words, not pauses.

**Storyboard in a table, not in prose.** One row per shot, with a start time. Both an AI model and an AI assistant follow a table far more reliably than a paragraph, and the table becomes your edit list later.

**Lock the assets before making shots.** In Path A, character sheets and location images are what keep the same face and the same room across sixteen separate generations. In Path B, the palette, fonts and timeline file play the same role.

**Review with stills, not by "it looked fine".** A contact sheet (one frame per second, timestamped) shows drift, glitches and garbled text in a few seconds, and it is the only way an AI assistant that can read images but not video can check a clip. Make one for every shot before you edit.

**Fix the plan, not the output.** When a shot fails twice, simplify the shot (fewer people, less motion, a closer framing) instead of re-rolling a third time.

**Keep a production log.** One table: shot → prompt → references → file → status. It tells you, or the assistant you hand the project to tomorrow, exactly what exists and what is approved. See [`templates/production-log.md`](../templates/production-log.md).

## How long things take

From the projects in [`examples/`](../examples/README.md), on a 4-core machine with no GPU:

| Work | Time |
|---|---|
| Brief + script + storyboard with an assistant | 1–2 hours of back and forth |
| Path A: reference sheets | 1–2 generations per character or place |
| Path A: a 3-minute episode in 16 clips of 10–15 s | one generation each, plus re-dos |
| Path B: a 2–3 minute film's code | a few sessions, checked through contact sheets |
| Path B: rendering 1080p30 frames | about 40 ms per frame with 4 workers, so ~3 minutes for 2:30 |
| Sound, edit, master, export | under an hour with the scripts here |
