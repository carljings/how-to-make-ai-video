# 8 · Skills, plugins and tools from GitHub

**English** · [简体中文](zh-CN/08-skills-plugins-tools.md)

What GitHub offers for making AI video with an agent like Claude Code: what to install, what to read, and what these projects teach. Researched on **6 October 2026**. Stars and licences were checked on GitHub that day; nothing here has been installed on the machine this guide was written on.

## Four kinds of add-on

| Kind | What it is | How it's installed in Claude Code |
|---|---|---|
| **Skill** | A folder with a `SKILL.md`: instructions and scripts the agent loads when a task matches | `npx skills add <owner/repo>` (the `skills` tool needs Node.js 22+; on older Node, copy the skill folder into `~/.claude/skills/` instead) |
| **Plugin** | A package of skills, commands and sometimes MCP servers, with updates | `claude plugin marketplace add <owner/repo>`, then `claude plugin install <name>@<marketplace>` |
| **MCP server** | A connector that gives the agent tools for an app or API (a video model, ComfyUI, an editor) | `claude mcp add <name> -e KEY=value -- <command>` |
| **CLI** | A command-line program the agent runs like any other command | `npm install -g …`, or the vendor's install script |

**Read before you install.** A skill or plugin runs with your agent's permissions, on your files and keys. Prefer official repos (the company that makes the tool), check the licence, and skim the `SKILL.md` and any scripts first.

## For code-drawn video (Path B)

These are the industrial versions of this guide's [`starter/`](../starter/README.md): the film is a function of time, written as web code and rendered to MP4.

| Project | ★ | Licence | What it gives you |
|---|---|---|---|
| **[HyperFrames](https://github.com/heygen-com/hyperframes)** (HeyGen) | 57.4k | Apache-2.0 | HTML + CSS + seekable animations → deterministic MP4. **Official Claude Code plugin** with 21 skills: a `/hyperframes` router plus workflows such as product-launch video, faceless explainer and PR-to-video. Plan → write HTML → lint → preview → render. **Needs Node.js 22+** |
| **[Remotion](https://github.com/remotion-dev/remotion)** + **[remotion-dev/skills](https://github.com/remotion-dev/skills)** | 62.1k · 4.9k | Remotion licence: free for individuals, non-profits and companies of up to 3 people; larger companies need a paid licence | Video as React components; the official agent skills cover creating, markup, studio preview and rendering |
| **[video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)** | 10.4k | Apache-2.0 | Claude Code / Codex skill for cinematic product videos on Remotion: 157 shot recipe cards, 214 styles, beat-synced cuts, sound effects, and a browser workbench for edits after delivery. Sister project **video-talkcraft** does narration videos |
| **[brag](https://github.com/latent-spaces/brag)** | 13.7k | MIT | `/brag` turns the project you just built into a short launch video with music and share copy (built on HyperFrames) |
| **[html-video](https://github.com/nexu-io/html-video)** | 4.6k | Apache-2.0 | HTML, CSS and data → MP4 on your laptop, for coding agents |
| **[video-spec-builder](https://github.com/feicaiclub/video-spec-builder)** | 1.0k | MIT | A director-style interviewer: it keeps asking until "I want a video" becomes a `video-spec.md` timed to the second, then hands it to HyperFrames |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) · [Manim](https://github.com/ManimCommunity/manim) ([3b1b](https://github.com/3b1b/manim)) | 19.2k · 41.3k (94.6k) | MIT | Code animation engines; Manim is the standard for maths explainers |

## For generated video (Path A)

**Let the agent generate, through official channels:**

| Project | ★ | Licence | What it gives you |
|---|---|---|---|
| **[MiniMax CLI `mmx`](https://github.com/MiniMax-AI/cli)** (official) | 2.2k | none stated | Text, image, **video**, speech and music from the terminal or an agent. Supports **MiniMax-H3** with a start image, `--reference-image` and `--reference-video`. Ships two skills, `mmx-cli` and an H3-specific `mmx-h3-video`. Install with `npx skills add MiniMax-AI/cli -y -g`, plus `npm install -g mmx-cli` for the program. Text, image and speech use a Token Plan, but **H3 video needs a pay-as-you-go (credit) API key**. China accounts use `api.minimaxi.com` |
| **[MiniMax-MCP](https://github.com/MiniMax-AI/MiniMax-MCP)** (official) | 1.6k | MIT | The same MiniMax capabilities as MCP tools. MiniMax now recommends the CLI above |
| **即梦 CLI** `dreamina` (official) | — | — | Seedance from the command line; see [Chapter 6](06-platforms-compared.md) |
| **[libtv-skills](https://github.com/libtv-labs/libtv-skills)** (official) | 1.1k | MIT (README) | LibTV's 20+ models from an agent; see [Chapter 6](06-platforms-compared.md) |
| **[comfyui-mcp](https://github.com/artokun/comfyui-mcp)** | 0.8k | MIT | Drive a local ComfyUI from any LLM: 38 MCP tools and 42 skills (WAN, LTX, MiniMax H3…). Now in limited maintenance |
| [Pixelle-MCP](https://github.com/ATH-MaaS/Pixelle-MCP) | 1.1k | MIT | ComfyUI workflows exposed as MCP tools; last updated December 2025 |

**Skills that know how to direct a model:**

| Project | ★ | Licence | What it gives you |
|---|---|---|---|
| **[h3-storyboard-skill](https://github.com/phileiny/h3-storyboard-skill)** | 175 | MIT | Script → **MiniMax H3** shot lists with acting that actually renders; every rule is marked with how it was tested ([lessons below](#what-these-projects-teach)) |
| [short-drama-production](https://github.com/suihe1/short-drama-production) | 177 | Apache-2.0 | A Codex skill that runs a whole H3 short-drama pipeline: outline, characters, art, script, technical storyboard, H3 jobs, sound, rough cut, QC. Its README carries referral links |
| [seedance-prompt-skill](https://github.com/songguoxs/seedance-prompt-skill) | 2.9k | none | Turns an idea into structured Chinese prompts for Seedance 2.0 (ten modes: consistency, camera replication, extension, sound…) |
| [awesome-seedance](https://github.com/LearnPrompt/awesome-seedance) | 1.7k | MIT | 600+ Seedance 2.5 / 2.0 prompt cases traced to their original posts |
| Short-drama skill packs | | | [shuohao-skills](https://github.com/eternityspring/shuohao-skills), [drama-skills](https://github.com/zenstory-ai/drama-skills) and more in [Chapter 7](07-tools-like-toonflow.md) |

## For editing and finishing

| Project | ★ | Licence | What it gives you |
|---|---|---|---|
| **[ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill)** | 1.9k | MIT | `npx ffmpeg-skill`: 42 FFmpeg tools for Claude Code / Cursor / Codex (also as MCP), probe → edit → verify, offline, 53 before/after demos |
| [Pireel](https://github.com/pireel/pireel) | 1.3k | AGPL-3.0 | Open-source CapCut-style editor (canvas + timeline) an agent can drive over MCP |
| [hyperframes-student-kit](https://github.com/nateherkai/hyperframes-student-kit) | 1.2k | custom | 14 skills for editing talking videos, reels and Shorts with Claude Code or Codex, on HyperFrames |
| [VideoLingo](https://github.com/Huanshere/VideoLingo) | 18.7k | Apache-2.0 | Subtitle cutting, translation, alignment and dubbing |
| [NarratoAI](https://github.com/linyqh/NarratoAI) | 11.3k | MIT | AI narration and editing for existing footage (解说剪辑) |
| [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 128.7k | MIT | Topic → script → stock footage, voice-over, subtitles and music → short video |

## Open models you can run yourself

All of these need a strong NVIDIA GPU. Check the licence before commercial use: several are custom.

| Project | ★ | Licence | Notes |
|---|---|---|---|
| [ComfyUI](https://github.com/Comfy-Org/ComfyUI) | 136.2k | GPL-3.0 | The node-graph app most open video models run in |
| [Wan 2.2](https://github.com/Wan-Video/Wan2.2) (Alibaba) | 17.7k | Apache-2.0 | Text / image → video; [ComfyUI-WanVideoWrapper](https://github.com/kijai/ComfyUI-WanVideoWrapper) (6.7k) for ComfyUI |
| [LTX-2](https://github.com/Lightricks/LTX-2) (Lightricks) | 9.6k | custom | Audio and video together; includes a LoRA trainer |
| [HunyuanVideo](https://github.com/Tencent-Hunyuan/HunyuanVideo) · [1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5) (Tencent) | 12.6k · 4.6k | custom | 1.5 is the lightweight version |
| [Open-Sora](https://github.com/hpcaitech/Open-Sora) | 29.9k | Apache-2.0 | Open training and inference code |

## Reading lists

| Project | ★ | For |
|---|---|---|
| [awesome-video-generation](https://github.com/AlonzoLeeeooo/awesome-video-generation) | 786 | Research papers, by topic |
| [awesome-text-to-video](https://github.com/jianzhnie/awesome-text-to-video) · [video-generation-survey](https://github.com/yzhang2016/video-generation-survey) | 747 · 731 | Surveys and reading lists |
| [awesome-ai-video-models](https://github.com/Anil-matcha/awesome-ai-video-models) | 199 | Which model, through which API, at what price |
| [lanshu-awesome-ai-video-kit](https://github.com/cclank/lanshu-awesome-ai-video-kit) | 412 | From real client projects: 411 prompts, 15 models, 7 Claude skills, 14 method articles (Chinese) |

## What these projects teach

Lessons worth carrying into your own work, with where they come from:

1. **One facial beat per shot (MiniMax H3).** When a 7-second close-up holds nine expression beats, H3 averages them away and the face barely moves, with no error. Split into 2–3-second shots with one main beat each and the expressions render. A line of dialogue helps further, because H3 gives that shot more frames. Large body movement (fighting, being knocked back) tolerates many more beats per shot. *Source: h3-storyboard-skill, controlled tests with fixed seed and references, 26 Aug and 3 Oct 2026.*
2. **Composition before content.** Decide what the audience should feel, then where the camera is, and only then what happens in frame. A neutral, centred, eye-level shot reads as an interview however good the prompt is. *Source: h3-storyboard-skill.*
3. **Interrogate the idea before storyboarding.** Refuse words like "premium" and "high-impact" until they become concrete shots with durations. This is this guide's [brief → storyboard](01-pipeline.md) step, done as a conversation. *Source: video-spec-builder.*
4. **Track what's stale.** When a character sheet or scene changes, every shot made from it is out of date. The [production log](../templates/production-log.md) already lists each shot's references; when one changes, mark every shot that used it for re-approval. *Source: short-drama-production, which tracks this automatically.*
5. **HTML is now the standard way for agents to draw video.** HyperFrames, Remotion's skills and html-video all formalise the same loop as [Chapter 3](03-path-b-code.md): seekable animation, lint, preview, render.
6. **Official CLIs are how agents generate.** MiniMax `mmx` and 即梦 `dreamina` both put video generation in a single command an agent can run and poll, with your own account's credits. Use them instead of reverse-engineered "free API" proxies.

## A starter kit for this guide's workflow

If you make both kinds of video with Claude Code, these four cover most of the work:

| Need | Install | Command |
|---|---|---|
| Code-drawn video | HyperFrames plugin (needs Node.js 22+ to render) | `claude plugin marketplace add heygen-com/hyperframes` then `claude plugin install hyperframes@hyperframes` |
| Generate MiniMax H3 shots from the agent | MiniMax CLI skills + `mmx` | `npx skills add MiniMax-AI/cli -y -g` and `npm install -g mmx-cli`, then `mmx auth login` with a pay-as-you-go API key |
| Direct H3 performances | h3-storyboard skill | `npx skills add https://github.com/phileiny/h3-storyboard-skill --skill h3-storyboard` |
| Edit and finish locally | ffmpeg-skill | `npx ffmpeg-skill` |

Then keep using this guide's [`tools/review.sh`](../tools/review.sh) for contact sheets and [`tools/stitch.sh`](../tools/stitch.sh) for assembly and loudness.
