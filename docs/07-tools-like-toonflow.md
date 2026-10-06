# 7 · Tools like Toonflow: open source and closed

**English** · [简体中文](zh-CN/07-tools-like-toonflow.md)

"Like Toonflow" here means a **production studio for AI series**. You put in a story; it builds the **assets** (characters, scenes, props), breaks the script into a **storyboard**, generates **shots** (keyframes → video) that stay consistent across episodes, and **assembles** them, usually on an infinite canvas with an agent alongside. Researched on **5 October 2026** from GitHub, official sites and news coverage. These tools were assessed from their READMEs, licences and articles, not installed or paid for, and every number is a snapshot.

## First choice: open source or closed?

| | **Open source** (you run it) | **Closed** (you subscribe) |
|---|---|---|
| Setup | Install a desktop app or Docker; paste your own model API keys | Sign up, nothing to install |
| Cost | Free software; you pay each model provider per use | Monthly plan + credits; bulk deals on models, but promotional prices change often |
| Your data | Stays on your machine or server | On their servers |
| Models | Any provider the app supports, often local ComfyUI too | Whatever the platform integrates |
| Changes | Read and modify the code, write plugins | Wait for their roadmap |
| Effort | You update, debug and manage keys and queues | They do |

**"Public on GitHub" is not the same as "open source."** Check the licence before building a business on a tool:

| Licence | What it allows |
|---|---|
| **MIT**, **Apache-2.0** | Anything, including commercial use; keep the copyright notice |
| **AGPL-3.0** | Anything, but if you run a modified version as a service for others, you must publish your changes |
| **Elastic 2.0** | Use, modify and sell what you make; you may not offer the software itself as a hosted service |
| **CC BY-NC-SA** | **No commercial use** of the software |
| Custom "community" / "sustainable use" licence | Read it; usually free for personal use with limits on commercial or hosted use |
| No licence file | All rights reserved; you may read the code but have no right to reuse it |

## Open source: run it yourself

| Project | ★ | Licence | Runs as | What stands out |
|---|---|---|---|---|
| **[Toonflow](https://github.com/HBAI-Ltd/Toonflow-app)** (your current tool) | 16.5k | **MIT** | Desktop (Win/Mac), Docker, server | Infinite canvas + agent, character turnarounds, 3D director's studio, MCP, plugin market, any API or local ComfyUI, 21 UI languages |
| **[火宝短剧 Huobao Drama](https://github.com/chatfire-AI/huobao-drama)** | 15.8k | CC BY-NC-SA 4.0 (**non-commercial**) | Web + Electron desktop | "One sentence → full drama": four built-in agents with editable `SKILL.md` files, batch character and shot generation, ffmpeg compositing and subtitles |
| **[DramaClaw](https://github.com/dramaclaw/dramaclaw)** | 6.7k | Elastic 2.0 | Local | Two faces on one asset library: an infinite canvas with 18 node types and 45 drama "looks", plus a manuscript → episodes → storyboard → video pipeline; a built-in director agent drives both |
| **[ArcReel](https://github.com/ArcReel/ArcReel)** | 5.3k | AGPL-3.0 | Self-hosted | Novel, script or product material → assets → storyboard → video; checkpoints you approve, per-asset redo and rollback, **cost tracking**, **exports a 剪映 draft** for finishing |
| **[PRINTFILM](https://github.com/yi1108/printfilm)** | 4.1k | MIT | Docker | 漫剧 episodes plus template-driven marketing shorts (20+ templates); Seedance generates the voice with the picture; its own `/api/v1`. New (Sept 2026) |
| **[BigBanana AI Director](https://github.com/shuyu-labs/BigBanana-AI-Director)** | 2.3k | Custom community licence | Docker image | "Script → Asset → Keyframe", built around character consistency. New versions ship only as Docker images; full source is for paying users |
| **[本地短剧助手 LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama)** | 1.9k | MIT | Desktop download | Pure JavaScript, data never leaves your machine, canvas mode, many providers including Volcano Engine (Seedance) |
| **[融光 AI Fusion Video](https://github.com/Stonewuu/ai-fusion-video)** | 1.6k | MIT | Docker (Java + Next.js) | Agent workspace on AgentScope with Skills, MCP and sub-agents; LLMs from OpenAI-compatible APIs, Anthropic, Gemini, DashScope or Ollama |
| **[CineGen AI Director](https://github.com/Will-Water/CineGen-AI)** | 0.5k | Custom community licence | Browser (Node) | Script → assets → keyframes → video on Gemini + Veo; a start keyframe (and optional end keyframe) for each shot |
| **[PAI-Pro](https://github.com/Utopai-Research/pai-code)** | 0.4k | Sustainable-use licence | Local / Docker | **Driven from Claude Code or Codex**: filmmaking skills plus a canvas and timeline |
| **[AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2)** | 0.2k | AGPL-3.0 | Browser | English; 3D camera previs before you spend credits; local ComfyUI or Fal/Replicate cloud |
| [open-canvas](https://github.com/ZeroLu/open-canvas) · [AIGCCanvasFlow](https://github.com/MaLunan/AIGCCanvasFlow) | 0.3k · 0.1k | MIT | Local / library | Building blocks: a bring-your-own-key canvas, and a Vue Flow canvas editor |

**Skills instead of apps.** If you'd rather let Claude Code be the studio (Path A in [Chapter 2](02-path-a-generate.md), with [`tools/`](../tools/) for assembly), these packs supply the screenwriting and storyboard know-how: [shuohao-skills](https://github.com/eternityspring/shuohao-skills) (4.2k★, Apache-2.0: character bibles, outlines, scene and prop design, scripts, shot breakdowns), [drama-skills](https://github.com/zenstory-ai/drama-skills) (2.5k★, MIT: script, assets, storyboard, prompts, review), [Emily2040/seedance-2.0](https://github.com/Emily2040/seedance-2.0) (7.5k★, MIT: a Seedance 2.0 production pipeline), [Seedance2-Storyboard-Generator](https://github.com/liangdabiao/Seedance2-Storyboard-Generator) (2.5k★, no licence).

## Closed: subscribe and use

### From the model makers (own models + canvas/agent)

| Platform | Company | What's new | Notes |
|---|---|---|---|
| **即梦 Jimeng** | ByteDance | Infinite canvas with agent; Seedance 2.5 (30 s clips, 50 references) | Official CLI for agents. See [Chapter 6](06-platforms-compared.md) |
| **小云雀** | ByteDance | One-sentence agent with canvas and 3D director stage | Cheapest Seedance access. See [Chapter 6](06-platforms-compared.md) |
| **可灵 Kling** | Kuaishou | **Canvas agent** (nodes plus an agent beside you, with a timeline). Kling 4.0 announced on 29 Sept 2026 for October: 30 s per generation, up to 10 keyframes, 4K 10-bit HDR, 21:9 | Kling Agent platform: 7+ role agents, desktop apps for macOS and Windows, four plans |
| **海螺 Hailuo** | MiniMax | Hailuo Video Agent, now the **Media Agent**: one-click finished videos, global | Models: Hailuo 2.3 and MiniMax H3 (the model behind your 《半仙下山》 clips) |
| **Vidu** | 生数 Shengshu | **Vidu Q3 reference-to-video** (13 April 2026): up to 7 reference subjects, camera control, dialogue in Chinese, English and Japanese | A strong model for 漫剧 character consistency, inside many studios |
| **Seko** | SenseTime 商汤 | Agent for **multi-episode** series (up to 100 episodes); infinite canvas (June 2026) with cross-episode asset memory | Runs Seedance 2.0 with high concurrency; lip-sync tools |
| **天工短剧工作台 SkyProduction** | 昆仑万维 Kunlun | Launched March 2026: a "director agent"; agent storyboarding + infinite canvas since 16 July 2026 | English-language dramas, multi-account teams |

### Independent studios

| Platform | What it is | Notes |
|---|---|---|
| **LibTV** | Canvas studio, 20+ models, agent skills | See [Chapter 6](06-platforms-compared.md) |
| **TapNow** | Canvas for ads and commercial work | See [Chapter 6](06-platforms-compared.md) |
| **Flova** | Agent that makes the whole film | See [Chapter 6](06-platforms-compared.md) |
| **[OiiOii](https://www.oiioii.ai/)** | **Animation** agent: seven AI roles (art director, screenwriter, character / scene / prop designers, storyboard artist, sound); fully automatic or step by step; 160+ styles; turns comic panels into animation | From about ¥133/month; launched in the US in July 2026 |
| **巨日禄 Jurilu** | 漫剧 factory for long series (100+ episodes): script parsing, storyboards, character locking (reference sheets + LoRA + turnarounds), voice, music, export | Seedance 2.0 through a Volcano Engine partnership (April 2026) |

Also in roundups: 漫聚星球 and 幻舟 (both from 北京先知先行科技). Only promotional coverage of them turned up, so they aren't assessed here.

### Global canvas studios (English)

| Platform | What it is | Price (third-party reviews) |
|---|---|---|
| **LTX Studio** (Lightricks) | Script → multi-scene storyboard → adjust actors, light and 3D camera per shot → render | Free; $15 / $35 / $125 per month |
| **FLORA** | Node canvas for designers and agencies; 50+ models; reusable techniques such as Character Lock | From $19/month |
| **Figma Weave** (formerly Weavy) | Node canvas inside Figma | Free 150 credits; from $24/month |
| **Krea** | 60+ image and video models; real-time canvas; nodes | Free; Pro from $24/month |
| **Higgsfield** | Many models with strong camera-movement controls; broad all-in-one plan | Several tiers |

**Sora is gone.** OpenAI closed the Sora app on 26 April 2026 and the API on 24 September 2026. Articles that list "Sora 2" among a platform's models are out of date.

## Which one, given you already use Toonflow?

| If you want… | Try |
|---|---|
| To stay open source and local with any model | **Stay on Toonflow**, the largest and MIT-licensed. Add MiniMax H3, Seedance or Vidu as providers |
| To finish edits in 剪映, and track spend per project | **ArcReel** (AGPL) |
| A richer canvas toolset plus a manuscript-to-episodes pipeline | **DramaClaw** (Elastic 2.0) |
| A hosted studio for long series without managing API keys | **LibTV**, **Seko** or **天工短剧工作台** |
| Anime and stylized animation | **OiiOii**, or Vidu Q3 inside your studio |
| One model family with its own canvas | **可灵** canvas agent (Kling 4.0) or **即梦** canvas (Seedance 2.5) |
| To drive everything from Claude Code | **PAI-Pro**, or the skill packs above with this guide's `tools/` |

Before you commit, run the **same 15-second scene** (two characters, one line of dialogue) through your top two choices, and compare consistency, cost per kept second and how long the whole loop takes.

## Sources

- Open source: each project's README and LICENSE on GitHub (linked above), checked 5 October 2026
- 可灵: [Kling 4.0 announcement (Sina)](https://finance.sina.com.cn/roll/2026-09-30/doc-initqvci2498775.shtml) · [Kling agent and canvas (ifeng)](https://tech.ifeng.com/c/8wzmAMchTDu) · [canvas agent (Sohu)](https://www.sohu.com/a/1082222448_122014422)
- 海螺: [Hailuo 2.3 and Media Agent (MiniMax)](https://www.minimaxi.com/news/minimax-hailuo-23) · [Hailuo Video Agent (QQ News)](https://news.qq.com/rain/a/20250620A0412G00)
- Vidu: [Vidu Q3 reference-to-video (Sina)](https://finance.sina.com.cn/stock/t/2026-04-15/doc-inhuqfuz8425498.shtml)
- Seko: [infinite canvas (Sohu)](https://www.sohu.com/a/1033872566_122642385) · [Seko 2.0 (QQ News)](https://news.qq.com/rain/a/20251215A06WNA00)
- 天工: [July 2026 update (Sina)](https://finance.sina.com.cn/wm/2026-07-16/doc-inihyywc8083579.shtml) · [overview (Sohu)](https://www.sohu.com/a/1051430053_211762)
- OiiOii: [interview (NetEase)](https://www.163.com/dy/article/L803BUK605566TJY.html) · [review and pricing (AniJam)](https://www.anijam.ai/blog/oiioii-ai-review/) · [US launch](https://ohsem.me/2026/07/oiioii-ai-the-worlds-first-ai-animation-agent-platform-launches-in-the-u-s/)
- 巨日禄: [Volcano Engine partnership (China.com)](https://mtz.china.com/touzi/2026/0430/231351.html) · [overview (NetEase)](https://www.163.com/dy/article/L15V8BPS05527PMU.html)
- Global: [LTX Studio (The Rundown)](https://www.therundown.ai/tools/ltx-studio) · [Figma Weave review](https://uxmagic.ai/blog/figma-weave-review) · [FLORA alternatives](https://imaginode.ai/en/alternatives/flora) · [Krea on Higgsfield](https://www.krea.ai/blog/what-is-higgsfield-ai-pricing-free-plan-and-alternatives-in-2026) · [canvas tools overview (Fuser)](https://fuser.studio/articles/higgsfield-alternatives)
- Sora: [OpenAI Help Center](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation)
