# How to Make AI Video · 如何制作 AI 视频

A practical guide to making videos with AI, built from finished projects. It covers both ways it's done today, with templates, tested ffmpeg scripts and a starter film you can build in about a minute.

[![The starter film: 610 seeds on the golden angle gather into a title](docs/media/starter-preview.gif)](https://github.com/carljings/how-to-make-ai-video/releases/download/v0.1/starter-film.mp4)

*The starter film (15 s), drawn entirely by code: [▶ MP4 with sound](https://github.com/carljings/how-to-make-ai-video/releases/download/v0.1/starter-film.mp4) · [source](starter/)*

## Two ways to make an AI video

| | **Path A: Generate** | **Path B: Code** |
|---|---|---|
| How | Describe each shot; a video model (Sora, Veo, Kling, Hailuo, Seedance, Runway, Wan…) paints it | An AI assistant writes a program that draws every frame; a browser renders it; ffmpeg encodes it |
| Best for | People, places, stories, short dramas, ads, live-action or anime looks | Explainers, data, maths and science, timelines, titles, motion graphics |
| Strengths | Photoreal or stylized footage from a sentence; native audio | Exact, repeatable, text always correct, a change costs one re-render, free to render |
| Weak spots | Consistency between clips, on-screen text, hands, cost per take | No real people or places, no photorealism |
| Clip length | 5–15 s per generation, joined in the edit | Any length, one continuous timeline |
| Guide | [Chapter 2](docs/02-path-a-generate.md) | [Chapter 3](docs/03-path-b-code.md) · [`starter/`](starter/) |

Many good films mix them: generated footage, plus code-drawn titles, charts and maps.

## The pipeline (both paths)

```mermaid
flowchart LR
  A[Idea] --> B[Brief] --> C[Script] --> D[Storyboard] --> E[Assets]
  E --> F[Shots] --> G[Review] --> H[Sound] --> I[Edit & master] --> J[Publish]
  G -- "fails" --> F
```

Details, rules of thumb and time estimates: [Chapter 1](docs/01-pipeline.md).

## Quick start

**Path B: build the starter film** (Node.js 18+, Chrome or Chromium, ffmpeg):

```sh
cd starter
npm install
npm run build              # → out/film.mp4, 1080p30, about a minute on 4 CPU cores, no GPU
node render.mjs --serve    # studio at http://localhost:8123: scrub and play while you edit
```

**Path A: assemble generated clips** (ffmpeg):

```sh
tools/review.sh clips/*.mp4                     # a time-stamped contact sheet per clip: check before editing
tools/stitch.sh shots.txt episode.mp4 --size 1080x1920 --srt episode.srt
```

`stitch.sh` trims each clip, fits mismatched sizes and frame rates to one format, fills missing sound with silence, burns in subtitles, adds an optional music bed (`--music`), and masters to −14 LUFS.

## Contents

| | |
|---|---|
| [1 · The pipeline](docs/01-pipeline.md) | Ten steps from idea to upload, and the habits that save the most time |
| [2 · Path A: generate](docs/02-path-a-generate.md) | Choosing a model, reference sheets, shot prompts, continuity, common failures, rights and labels |
| [3 · Path B: code](docs/03-path-b-code.md) | `render(t)`, frame-pure rules, working with an assistant, performance, sound and fonts |
| [4 · Sound](docs/04-sound.md) | Voice, music, effects, −14 LUFS, ducking, finding clicks, subtitles |
| [5 · Edit and export](docs/05-edit-and-export.md) | The scripts, tested ffmpeg recipes, export settings, pre-upload checklist |
| [`templates/`](templates/) | [Brief](templates/brief.md) · [storyboard](templates/storyboard.md) · [shot prompt](templates/shot-prompt.md) · [production log](templates/production-log.md) · [`shots.txt`](templates/shots.txt) |
| [`tools/`](tools/) | [`stitch.sh`](tools/stitch.sh) (assemble and master) · [`review.sh`](tools/review.sh) (contact sheets) |
| [`starter/`](starter/) | A complete code-drawn film to copy: timeline, scenes, synthesized score, renderer |
| [`examples/`](examples/README.md) | Finished films and what each one teaches |

## Working with an AI assistant

Both paths go faster with an assistant such as Claude doing the writing, prompting, coding and assembly. Three habits matter most:

1. **Brief first, storyboard second, shots third.** Approve the storyboard before any generation or code.
2. **Review with contact sheets.** An assistant can read images but not video; a sheet of one frame per second lets it check its own work, and lets you give notes with timestamps.
3. **Keep a production log.** What exists, what's approved and what's next, in one table any session can pick up.

[`CLAUDE.md`](CLAUDE.md) gives Claude Code these conventions automatically when it works in this repo.
