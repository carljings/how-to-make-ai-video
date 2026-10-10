# Examples

**English** · [简体中文](README.zh-CN.md)

Real projects made with the methods in this guide. Repositories marked *private* require the appropriate GitHub access.

The user has completed three practice science films with Opus 5.5: AI History, entropy and neutrinos, and will make new works next. GitHub API reads verified their source and film assets on 8 October 2026; the neutrino CREDITS also record model attribution. Specifications below come from repository documentation/code. This round did not replay/probe the films or comprehensively audit scientific claims.

**Douyin is the audience publishing platform; GitHub archives projects and versions.** The supplied profile screenshot shows all three films, with counts of 208 for neutrinos, 653 for entropy and 224 for AI History. The screenshot was received on 8 October 2026; capture/publication times are unknown, so these are snapshot records only. The Douyin uploads have not been matched to specific GitHub master versions.

| Film | Path | Spec | How it was made | Where |
|---|---|---|---|---|
| **The History of AI in 120 seconds** | B · code | 16:9 · 1080p60 · 2:00 | Canvas animation captured by headless Chrome (Python + Playwright); score and effects synthesized in Python; mastered to −14 LUFS | [carljings/ai-history-video](https://github.com/carljings/ai-history-video) ([MP4](https://github.com/carljings/ai-history-video/releases/download/v1.0/ai_history.mp4)) |
| **熵 · Borrowed Light** | B · code | 16:9 · 1080p30 · 2:50 | A cinematic entropy remake: `render(t)` canvas frames and Web Audio score; finished film and remake sources are on main | [carljings/entropy-video](https://github.com/carljings/entropy-video) · [remade MP4](https://github.com/carljings/entropy-video/blob/main/entropy-remake.mp4) (*private*) |
| **ν · 中微子 · The Ghost Particle** | B · code | 16:9 · 1080p30 · 3:12 (v1.2) | Opus 5.5-assisted storyboard/code, Canvas, Web Audio, Chrome/ffmpeg; bilingual captions, separate SRT, modular scenes and version revisions | [carljings/neutrino-film](https://github.com/carljings/neutrino-film) · [v1.2 film/captions/poster](https://github.com/carljings/neutrino-film/releases/tag/v1.2) (*private*) |
| **A light switch for neurons · Optogenetics V2** | B · code | 9:16 · 1080p30 · 1:15 | Rebuilt independently after the user rejected V1 quality: Mandarin narration, perspective camera, depth of field and organic cell volumes; drawing methods adapted from the user’s neutrino film, Codex-assisted implementation, no successful new Opus 5.5 call; full subjective listening/viewing pending | [V2 MP4](../output/optogenetics-film-v2/out/optogenetics-v2.mp4) · [Source notes](../output/optogenetics-film-v2/README.md) (GitHub archive; not published to Douyin) |
| **A light switch for neurons · Optogenetics V3** | B · code (Remotion) | 9:16 · 1080p30 · 1:04 | No voiceover at the user's request: kinetic on-screen text, a synthesized 120 BPM score with a drop and a tape-stop brake, and Douyin structure (the phenomenon on frame 0, a question answered at 51 s, a mid-film quiz, a closing discussion card). Made with Claude Code (Opus 5.5); technical checks pass, listening and viewing on a phone pending | [V3 MP4](../output/optogenetics-film-v3/out/optogenetics-v3.mp4) · [Source notes](../output/optogenetics-film-v3/README.md) (not published to Douyin) |
| **《半仙下山》 Episode 1** | A · generated | 9:16 · 768p · 3:16 | Script → 2 character sheets + 5 location plates → 16 segments of 10–14 s, each generated once with references in a fixed order (MiniMax, native audio) → hard-cut assembly list | [carljings/Toonflow](https://github.com/carljings/Toonflow) (*private*) |
| **137.5°** | B · code | 16:9 · 1080p30 · 2:30 | An original film with no reference material: a sunflower's seeds, the Fibonacci numbers, wrong angles that leave gaps, a pinecone, a pineapple and a succulent, and a growth simulation that finds 137.5° by itself. The seeds' angles play the melody; bilingual subtitles | [`137.5/`](137.5/README.md) · [▶ MP4](https://github.com/carljings/how-to-make-ai-video/releases/download/film-137.5/137.5.mp4) |
| **Starter: *How to make AI video*** | B · code | 16:9 · 1080p30 · 0:15 | 610 seeds on the golden angle gather into a title; bells ring on Fibonacci counts | [`starter/`](../starter/README.md) |

## What each one teaches

AI History also has a [five-minute bilingual edition](https://github.com/carljings/ai-history-video/releases/tag/5min-v1.0), with sources on the [5min branch](https://github.com/carljings/ai-history-video/tree/5min). Do not apply the two-minute edition’s specifications to that version without checking.

**The History of AI**: a timeline film. One visual per chapter and a score with one section per chapter; the sound effects are placed from a cue list exported by the renderer, so picture and sound can't drift apart.

**熵 · Borrowed Light**: remaking a reference. Study the reference's structure (acts, beats, length) and keep it, then rebuild every frame in your own visual language. The engine's contact sheets let every act be checked without a full render.

**Neutrinos**: shared timing for visuals, captions, chapters and sound, with fact sources, scene code, partial previews with audio, contact sheets and resumable rendering. The v1.2 notes describe ending pauses, title formation, opening/ending echoes and musical resolution: useful revision patterns. File/release existence does not establish scientific accuracy or visual quality; time-sensitive claims such as recent awards still require authoritative verification.

**137.5°**: an original idea, made rigorous. One rule drives the picture, the music and the facts at the same time: the seeds' angles choose the notes, so a wrong angle is *heard* as a short loop and the golden angle as a melody that never repeats. [`STORYBOARD.md`](137.5/STORYBOARD.md) shows the five-act plan and every fact on screen, and [`CREDITS.md`](137.5/CREDITS.md) lists the scientific sources. The source rebuilds the whole film with four commands.

**《半仙下山》**: consistency across a story. Lock the reference images before generating any shot, attach them in the same order in every segment, keep one action per clip, and keep a production log so a timed-out generation is never paid for twice.
