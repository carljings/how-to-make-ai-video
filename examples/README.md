# Examples

Real projects made with the methods in this guide. Repos marked *private* are visible only to their owner.

| Film | Path | Spec | How it was made | Where |
|---|---|---|---|---|
| **The History of AI in 120 seconds** | B · code | 16:9 · 1080p60 · 2:00 | Canvas animation captured by headless Chrome (Python + Playwright); score and effects synthesized in Python; mastered to −14 LUFS | [carljings/ai-history-video](https://github.com/carljings/ai-history-video) ([MP4](https://github.com/carljings/ai-history-video/releases/download/v1.0/ai_history.mp4)) |
| **熵 · Borrowed Light** | B · code | 16:9 · 1080p30 · 2:50 | A cinematic remake of a reference video about entropy: `render(t)` canvas frames + Web Audio score, the same engine as [`starter/`](../starter/README.md) | [carljings/entropy-video PR #1](https://github.com/carljings/entropy-video/pull/1) (*private*) |
| **《半仙下山》 Episode 1** | A · generated | 9:16 · 768p · 3:16 | Script → 2 character sheets + 5 location plates → 16 segments of 10–14 s, each generated once with references in a fixed order (MiniMax, native audio) → hard-cut assembly list | [carljings/Toonflow](https://github.com/carljings/Toonflow) (*private*) |
| **137.5°** | B · code | 16:9 · 1080p30 · 2:30 | An original film with no reference material: a sunflower's seeds, the Fibonacci numbers, wrong angles that leave gaps, a pinecone, a pineapple and a succulent, and a growth simulation that finds 137.5° by itself. The seeds' angles play the melody; bilingual subtitles | [`137.5/`](137.5/README.md) · [▶ MP4](https://github.com/carljings/how-to-make-ai-video/releases/download/film-137.5/137.5.mp4) |
| **Starter: *How to make AI video*** | B · code | 16:9 · 1080p30 · 0:15 | 610 seeds on the golden angle gather into a title; bells ring on Fibonacci counts | [`starter/`](../starter/README.md) |

## What each one teaches

**The History of AI**: a timeline film. One visual per chapter and a score with one section per chapter; the sound effects are placed from a cue list exported by the renderer, so picture and sound can't drift apart.

**熵 · Borrowed Light**: remaking a reference. Study the reference's structure (acts, beats, length) and keep it, then rebuild every frame in your own visual language. The engine's contact sheets let every act be checked without a full render.

**137.5°**: an original idea, made rigorous. One rule drives the picture, the music and the facts at the same time: the seeds' angles choose the notes, so a wrong angle is *heard* as a short loop and the golden angle as a melody that never repeats. [`STORYBOARD.md`](137.5/STORYBOARD.md) shows the five-act plan and every fact on screen, and [`CREDITS.md`](137.5/CREDITS.md) lists the scientific sources. The source rebuilds the whole film with four commands.

**《半仙下山》**: consistency across a story. Lock the reference images before generating any shot, attach them in the same order in every segment, keep one action per clip, and keep a production log so a timed-out generation is never paid for twice.
