# 6 · Six AI video platforms compared

即梦 · 小云雀 · LibTV · LiblibAI · TapNow · Flova, researched on **5 October 2026** from official sites, news coverage and GitHub. Prices on these platforms change almost weekly and are often promotional, so treat every number here as a snapshot and check before you buy.

> **Names.** *LibTV* (哩布TV) is LiblibAI's video studio, a separate product from LiblibAI itself. *Flova* (flova.ai) is the AI video agent; don't confuse it with *Flowva*, an unrelated brainstorming canvas without video generation.

## At a glance

| | **即梦 Jimeng** (Dreamina) | **小云雀 Xiaoyunque** | **LibTV** | **LiblibAI 哩布哩布** | **TapNow** | **Flova** |
|---|---|---|---|---|---|---|
| **Maker** | ByteDance (剪映 / CapCut team) | ByteDance (剪映 team) | LiblibAI | LiblibAI | Tamar AI | Flova AI |
| **What it is** | Generation platform: image, video, digital humans, infinite canvas + agent | Content-creation agent: one sentence → finished video | Video production studio: infinite canvas + node workflow | Model community + online generation + LoRA training | "Creative OS" for commercial visuals | All-in-one AI video agent |
| **Own models** | Yes: **Seedance** (video), **Seedream** (image) | ByteDance's (Seedance) | No, aggregator | **Star-3** image model, thousands of community LoRAs | No, aggregator | No, aggregator |
| **Video models** | Seedance 2.0, 2.5 | Seedance 2.0, 2.5 | 20+: Kling 3.0/O3, Seedance 2.0/2.5, Wan 3.0, MiniMax H3, Vidu, PixVerse… | Aggregated models (e.g. Kling) | Seedance 2.0/2.5, Kling O3, Wan 3.0, Veo… | Seedance 2.5/2.0, MiniMax H3, Veo 3.1, Kling; Suno for music |
| **How you work** | Canvas + agent chat, or single generations | Chat with the agent; canvas, 3D director stage, shot previs | Canvas + nodes (script → 9/25-grid storyboard → shots → edit), LibTV Agent, 3D-BOX | Web UI, ComfyUI-style workflows | Tapflow node canvas, storyboard extraction from reference footage, TapTV templates | Conversational agent as "executive director": script → storyboard → shots → audio → edit |
| **Agent / API access** | **Official CLI** `dreamina` (uses your account's credits) | None found | **Official agent skills** + OpenAPI key, CLI | Open API (liblib.art/apis), image-focused | None public | None public |
| **Price signal** | Standard ¥199/mo for 4,000 credits (first month ¥119); 66 free credits/day | First month ¥39; daily free credits | Seedance 2.0 720p from **¥0.46/s** (annual plan); 100 credits on sign-up | Cheapest in a 7-tool test (below) | $15 / $60 / $115 / $360 per month (1,500–36,000 "Tapies"); $1 ≈ 100 Tapies | Starter–Pro plans; Seedance 2.5 720p from **$0.045/s** on an annual promo |
| **Best for** | Newest Seedance first; best single-shot quality | Fastest finished Douyin video; cheapest way into Seedance | Short dramas and 漫剧 with recurring characters; many models in one place; agent-driven production | Custom styles and characters (LoRA); images to feed video | Ads, TVC, e-commerce; remaking a reference spot | Letting an agent drive a whole film; English UI |

## The six, briefly

**即梦 Jimeng** is ByteDance's flagship creative platform and the home of its own models. Seedance 2.0 arrived in early 2026, and **Seedance 2.5** launched on 31 July 2026: up to 30 s per clip, up to 50 reference files (30 images, 10 videos, 10 audio clips), local edits, native 4K. The infinite canvas has an agent built into its input box. Since the end of March 2026 there has been an **official command-line tool** (`curl -fsSL https://jimeng.jianying.com/cli | bash`). It has subcommands such as `text2video`, `image2video`, `frames2video` and `multimodal2video` that use your own account's credits, so an agent like Claude Code can generate directly. The weak spots are price and queues: early-2026 reports describe hours of queuing on lower tiers and fast price rises.

**小云雀 Xiaoyunque** is the 剪映 team's *agent* product. You type one sentence and it plans the script, generates the shots, adds voice and edits a finished video (智能成片), with digital humans, short-drama and marketing modes, an infinite canvas, a 3D director stage and shot previs. It gets ByteDance's newest models (Seedance 2.0, then 2.5) at a lower price than 即梦, and you sign in with your Douyin account. No public API or CLI was found, so it is for working by hand.

**LibTV** (launched 18 March 2026) is LiblibAI's answer to the canvas-studio format and the closest thing to Toonflow among the six. It turns a script into storyboards (9- or 25-panel grids), batch images and video on one canvas, and includes character turnarounds, multi-angle and relighting tools. It runs 20+ video models, so you can pick per shot. It was designed for both people and agents: the official [`libtv-labs/libtv-skills`](https://github.com/libtv-labs/libtv-skills) (1.1k★) lets an agent create sessions, send generation instructions, upload files and download results with an access key.

**LiblibAI 哩布哩布** is China's largest model-sharing community (Stable Diffusion / F.1 checkpoints and LoRAs, LoRA training, online generation), with its own **Star-3** image model and the 星流 design agent. For video it matters as the **asset shop**: train a LoRA for your character or style, generate consistent stills, then animate them in a video model. Its open API (liblib.art/apis) and the community ComfyUI nodes are image-focused. In an April 2026 cost test it was the cheapest way to run Kling 3.0 Omni.

**TapNow** (Tamar AI, 2025) targets commercial work: ads, TVCs, e-commerce. Its standout feature is **reverse storyboarding**: upload a reference ad and it breaks it into editable shots and prompts. TapTV has remixable templates. It's priced in US dollars and aimed at teams (up to 100 members, invoices, concurrency limits). At the listed rates, Seedance 2.0 720p costs 24 Tapies per second, about $0.24/s at the base top-up rate.

**Flova** is the most "agent-first" of the six: you talk to a director-agent and it runs script → storyboard → shots → music/voice → edit, choosing models per scene (Seedance 2.5, MiniMax H3, Veo 3.1, Kling, Suno). Plans include watermark-free export and commercial use, and the current Seedance 2.5 promo is among the cheapest per second. No public API exists; a community Claude Code plugin drives the website through a browser.

## Cost per second

An April 2026 test by Tencent News (same idea, 15 s at 720p where possible) gave:

| Tool | Model | ¥ per second |
|---|---|---|
| LiblibAI | Kling 3.0 Omni | **0.18** |
| OiiOii | Seedance 2.0 | 0.37 |
| Vidu | Vidu | 0.42 |
| 可灵 Kling | Kling 3.0 Omni | 0.43 |
| 拍我AI PixVerse | PixVerse V6 | 0.48 |
| 海螺 Hailuo | Hailuo 2.3 (6 s, 1080p) | 0.93 |
| 即梦 | Seedance 2.0 (member) | **1.38** |

List prices seen on 5 October 2026: LibTV Seedance 2.0 720p from ¥0.46/s (annual); TapNow Seedance 2.0 720p 24 Tapies/s; Flova Seedance 2.5 720p from $0.045/s (annual promo). These aren't like-for-like (different plans, models and discounts). The only fair test is to run **your own 15-second, 720p prompt** on each candidate and divide the cost by the seconds you'd actually keep.

## Which one should you use?

| You want to… | Use |
|---|---|
| Drive generation from Claude Code or another agent | **即梦 CLI** (Seedance only), or **LibTV skills** (many models) |
| Make a short drama / 漫剧 with the same characters across 15+ clips | **LibTV**, or open-source **Toonflow** (below) |
| Make an ad or remake a reference spot | **TapNow** |
| Get a finished Douyin video from one sentence, cheaply | **小云雀** |
| Get the newest, best Seedance results | **即梦** |
| Lock a custom character or art style | **LiblibAI** (LoRA), then animate in any of the others |
| Let an agent make the whole film, in English | **Flova** |

Whichever you pick, the shots it produces go through the same review and assembly as any other generated clip: [`tools/review.sh`](../tools/review.sh) and [`tools/stitch.sh`](../tools/stitch.sh), as in [Chapter 2](02-path-a-generate.md) and [Chapter 5](05-edit-and-export.md).

## What GitHub shows about this field

**1. The platforms are opening to agents.** 即梦's official CLI (end of March 2026) and LibTV's official skills (March 2026) mean an agent can now run generation itself. Community skills build on them: [`yuyou-dev/dreamina-cli-skill`](https://github.com/yuyou-dev/dreamina-cli-skill) (130★), [`PomeloR611/libtv-video-agent`](https://github.com/PomeloR611/libtv-video-agent) (storyboard grid → clean frames → image-to-video → ffmpeg cut).

**2. Open-source tools copy the canvas format and run locally with your own models:**

| Repo | ★ | What it is |
|---|---|---|
| [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) | 16.5k | Open-source short-drama canvas (MIT): desktop/Docker, connects to any model API or local ComfyUI, MCP, plugins, character turnarounds, 3D previs. The tool used for 《半仙下山》 in [`examples/`](../examples/README.md) |
| [ArcReel/ArcReel](https://github.com/ArcReel/ArcReel) | 5.3k | Self-hosted agent workbench: novel/script → characters, scenes, props → storyboard → video → 剪映 draft, with cost tracking |
| [ZeroLu/open-canvas](https://github.com/ZeroLu/open-canvas) | 270 | Local-first, bring-your-own-key canvas, explicitly "an open alternative to LibTV and TapNow" (alpha) |
| [MaLunan/AIGCCanvasFlow](https://github.com/MaLunan/AIGCCanvasFlow) | 119 | Vue 3 + VueFlow node canvas editor, for building your own |

**3. Prompt know-how is being packaged as agent skills:** [LearnPrompt/awesome-seedance](https://github.com/LearnPrompt/awesome-seedance) (1.7k★, 600+ sourced Seedance cases), [liyue-aigc/seedance-2-5-video-director](https://github.com/liyue-aigc/seedance-2-5-video-director) (532★), [jnMetaCode/ai-shortfilm-prompts](https://github.com/jnMetaCode/ai-shortfilm-prompts) (457★), [cclank/lanshu-awesome-ai-video-kit](https://github.com/cclank/lanshu-awesome-ai-video-kit) (412★, 411 prompts, 15 models), [A-cat-with-carrots/OnlyShot](https://github.com/A-cat-with-carrots/OnlyShot) (304★, one sentence → script → storyboard → video → edit with 即梦/Seedance). Most have **no licence**, so read and learn from them, but ask before copying.

**4. Avoid the "free API" proxies.** Repos such as `jimeng-free-api-all` and `iptag/jimeng-api` (hundreds to 1k★) reverse-engineer the website and run your logged-in session outside the official channels. They break whenever the site changes and can get the account banned. Use the official CLI or API instead. The same goes for watermark-removal tools: platform watermarks and AI labels are part of the terms, and in China labelling AI content is a legal requirement.

For many more studios like Toonflow, open source and closed, see [Chapter 7](07-tools-like-toonflow.md).

## Sources

- 即梦 / Seedance: [Seedance 2.5 launch (Sina)](https://finance.sina.com.cn/tech/2026-06-23/doc-iniekknw2058892.shtml) · [Seedance 2.5 features (SegmentFault)](https://segmentfault.com/a/1190000047897908) · [即梦 membership prices (财联社)](https://www.cls.cn/detail/2296174) · [即梦 CLI (53AI)](https://www.53ai.com/news/MultimodalLargeModel/2026040187324.html) · [CLI command reference](https://github.com/simonjiang99/dreamina-cli) · [infinite canvas + agent (woshipm)](https://www.woshipm.com/ai/6292231.html)
- 小云雀: [launch (QQ News)](https://news.qq.com/rain/a/20250530A03UYZ00) · [Baidu Baike](https://baike.baidu.com/item/%E5%B0%8F%E4%BA%91%E9%9B%80/67428202) · [Seedance 2.0 access and credits (Zhihu)](https://zhuanlan.zhihu.com/p/2005953613512586391) · [xyq.jianying.com](https://xyq.jianying.com/)
- LibTV: [launch (China.com)](https://tech.china.com/articles/20260320/202603201829146.html) · [features (AIHub)](https://www.aihub.cn/tools/libtv/) · [liblib.tv](https://www.liblib.tv/) · [libtv-skills](https://github.com/libtv-labs/libtv-skills)
- LiblibAI: [overview (aigc.cn)](https://www.aigc.cn/liblibai) · [Star-3 and API](https://ai-bot.cn/star-3-alpha/)
- TapNow: [features (AITOP100)](https://www.aitop100.cn/tools/tapnow-ai) · [pricing](https://www.tapnow.ai/pricing) · [company (U深搜)](https://unifuncs.com/s/o7TSu4Tv)
- Flova: [flova.ai](https://www.flova.ai/en/) · [pricing](https://www.flova.ai/en/pricing/) · [overview (NetEase)](https://www.163.com/dy/article/KPH3R0MM0556D7QR.html)
- Costs: [7 tools, cost per second (Tencent News, April 2026)](https://news.qq.com/rain/a/20260425A04E8B00)
