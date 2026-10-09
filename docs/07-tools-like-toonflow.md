# 7 · AI video tools: open source, special licences and hosted studios

**English** · [简体中文](zh-CN/07-tools-like-toonflow.md)

Checked **8 October 2026**. This chapter records the research, price snapshots and choices for an “Inventor Cat” Douyin account, replacing its 5 October list. Evidence comes from official repositories, licences, documentation, releases and selected source files. **The newly researched tools were not installed, paid for or tested on the same film.** A documented feature is not proof that it works on this machine.

## Existing science-production baseline

The user has completed three practice science films with **Opus 5.5**: AI History, entropy, and neutrinos, and explicitly wants new videos next. Retain these as technical experience; see [Chapter 8](08-douyin-science-growth.md) for the million-view experiment plan. Model attribution comes from the user; the [neutrino credits](https://github.com/carljings/neutrino-film/blob/main/CREDITS.md) also record Claude Opus 5.5 / Claude Code. Authenticated GitHub API reads verified repositories, READMEs, source entry points and release assets. The films were not replayed or rendered in this round; specifications below come from repository documentation/code, not a new media probe.

| Film | GitHub record | Existing pipeline and evidence |
|---|---|---|
| **AI History** | Public [ai-history-video](https://github.com/carljings/ai-history-video); [two-minute](https://github.com/carljings/ai-history-video/releases/tag/v1.0) and [five-minute bilingual](https://github.com/carljings/ai-history-video/releases/tag/5min-v1.0) releases both contain MP4 assets | Canvas, Python/Playwright-driven Chrome, Python synthesized score/effects and ffmpeg; two-minute edition documented as 1080p60 |
| **Entropy / 熵 · Borrowed Light** | Private [entropy-video](https://github.com/carljings/entropy-video); [remade film](https://github.com/carljings/entropy-video/blob/main/entropy-remake.mp4) and remake sources on main; PR #1 merged | Canvas, Web Audio, Chrome/ffmpeg; documented 2:50, 1080p30. entropy.mp4 is the original reference; entropy-remake.mp4 is the completed remake |
| **Neutrinos / The Ghost Particle** | Private [neutrino-film](https://github.com/carljings/neutrino-film); [v1.2](https://github.com/carljings/neutrino-film/releases/tag/v1.2) contains MP4, SRT and poster | Canvas, Web Audio, puppeteer-core/Chrome and ffmpeg; timeline/README specify 3:12, 1080p30. Storyboards, fact sources, modular scenes, partial previews, resumable rendering and version revisions already exist |

Use these real projects as the science baseline: **iterate the existing Opus 5.5-assisted coded-animation, audio and rendering workflow**. Keep starter and 137.5° as reusable examples. Evaluate Manim/Motion Canvas when a concrete requirement arises. Tool research mainly serves later cat/drama production and identified workflow gaps.

## Audience publishing: Douyin; project archive: GitHub

The user explicitly identifies **Douyin as the audience-facing video publishing platform**. GitHub retains source, assets, masters, subtitles and version history. Track production completion, GitHub archiving, Douyin publication and audience feedback separately.

The supplied Douyin profile screenshot shows entries for neutrinos, entropy and AI History. This is only a **screenshot received on 8 October 2026**; its capture time, each film’s publication date and current analytics were not provided:

| Film | Play count displayed in the screenshot |
|---|---|
| Neutrinos | 208 |
| Entropy | 653 |
| AI History | 224 |

These counts alone do not establish quality or recommendation performance. Compare a consistent post-publication window, recording dates and available analytics such as exposure, watch time, completion and engagement.

Keep the existing Opus 5.5 science workflow and add Douyin viewing checks: readable diagrams/captions on a phone, covers/titles accurately identifying the topic, a clear opening question, and understandable narration/pacing. Repository masters are documented as 16:9; profile covers do not establish the playback aspect ratio. If a 9:16 edition is needed, re-layout diagrams, captions and subjects, checking scientific meaning and readability after cropping.

## Choices to test first

**Current production priority: high-quality science explainers → cute cats → AI drama.** For explainers, prioritize facts, explanation and diagrams before model aesthetics or speed. AI-assisted research, scripting, coded animation, narration and editing are also AI production. Precise visual control still requires scientific verification.

| Goal | Compare first | Reason and verification boundary |
|---|---|---|
| **First: high-quality science explainers** | **Retain Opus 5.5 and the three-film production workflow**; compare Manim for mathematics/geometry or Motion Canvas for vector/narration needs | Improve topics, fact-checking, visual explanation, sound and Douyin adaptation first; new tools should demonstrate a concrete benefit |
| **Second: cute cats** | **Toonflow** or **OiiOii**; ComfyUI for deeper control | Fixed references, short actions and per-shot revision; test identity, fur, goggles and paw/prop interaction |
| **Third: AI drama** | **ArcReel, PRINTFILM**, with Toonflow as baseline | Assets, script/storyboard, dialogue and shot revision; verify story, performance and continuity |
| Generate and edit on a Mac | **LTX Desktop**; ComfyUI for deeper control | Explicit Apple Silicon path, with a free-memory requirement; model licences are separate |
| An agent edits existing cat clips | **FireRed-OpenStoryline**; NarratoAI for commentary | Post-production, not character or shot generation |
| Hosted production workflow | **Flova**; OiiOii for animation, Seko for series | Subscription services with platform-specific models, credits and export entitlements |

**There is no measured “best-looking” winner.** OiiOii is a suggested animation trial; Flova is a suggested workflow-convenience trial. Neither won a controlled test. Free software does not mean free production: APIs, retries, compute, speech, licensed media and learning time can all cost money.

## Comparison method

Compare four routes separately: **story/asset/storyboard studios; topic videos and AI editing; local shot generation and model frameworks; coded animation and compositing**. The first is closest to Toonflow. The others can complete a workflow without being equivalent competitors.

Licences are separated into standard open-source licence texts, special/restricted terms, and README claims without a located software licence text. **Check software, model weights, APIs, music and assets separately.** A MIT badge does not grant commercial rights to everything used in a film.

Local project storage is not fully offline generation: cloud providers receive the relevant prompts and references. Default-branch features may not be in a released package. Source, release and actual operation are separate evidence.

## A · Story, character and storyboard workspaces

| Project / software licence | Confirmed capabilities | Setup and adoption boundary |
|---|---|---|
| **[Toonflow](https://github.com/HBAI-Ltd/Toonflow-app)** · [MIT](https://github.com/HBAI-Ltd/Toonflow-app/blob/master/LICENSE) | Canvas, scripts/assets, media generation, agents, MCP and plugins; external APIs or local ComfyUI/LLMs | Desktop, Docker or server. Historical versions retain their applicable terms. Baseline for comparison |
| **[ArcReel](https://github.com/ArcReel/ArcReel)** · [AGPL-3.0](https://github.com/ArcReel/ArcReel/blob/main/LICENSE) + [NOTICE](https://github.com/ArcReel/ArcReel/blob/main/NOTICE) | Reusable assets, episodes/storyboards, per-shot generation, rollback and cost tracking; voice/subtitles/music/transitions, finished video and Jianying drafts | Docker, configured agent/media providers. Read attribution and source obligations. **Primary cat-story candidate** |
| **[LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama)** · [MIT](https://github.com/xuanyustudio/LocalMiniDrama/blob/main/LICENSE) | Character/scene/prop assets, list/canvas, references/start-end frames, vertical video, assembly and project ZIP | Node, SQLite, Electron; packaged desktop mainly Windows. Mac source/Docker untested. Cloud APIs/image hosting are not offline |
| **[AI Fusion Video](https://github.com/Stonewuu/ai-fusion-video)** · [MIT](https://github.com/Stonewuu/ai-fusion-video/blob/main/LICENSE) | Projects/teams, scripts/storyboards, agents, Skills/MCP, generation and FFmpeg; ComfyUI in release notes | Java, Next.js, MySQL and Redis make deployment heavier. Good extension target; complete narration/final-delivery loop unconfirmed |
| **[PRINTFILM](https://github.com/yi1108/printfilm)** · [MIT](https://github.com/yi1108/printfilm/blob/main/LICENSE) | Template shorts and drama routes; assets, storyboards, shot redo, background tasks and FFmpeg; [episode rules](https://github.com/yi1108/printfilm/blob/main/docs/EPISODE_RULES.md) include 9:16 | FastAPI, React, PostgreSQL, Redis. Default text/media use TokenFree New API with a key/balance; mock mode only previews the UI. Docker image ARM64 compatibility unverified. **Important new candidate** |
| **[AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2)** · [AGPL-3.0](https://github.com/Heroesjouney/AIMovieStudiov2/blob/main/LICENSE) | 3D camera previs, multiple references, LoRA, retakes, timeline/audio; timeline XML and previs MP4 documented | Python/Node, Docker; ComfyUI or Fal/Replicate. Explicit WIP; OTIO/FCPXML remain roadmap items. For learning camera control |
| **[Open Canvas / ZeroLu](https://github.com/ZeroLu/open-canvas)** · [MIT](https://github.com/ZeroLu/open-canvas/blob/main/LICENSE) | Text/image/video/audio nodes, upstream connections, BYOK, disk JSON and import/export | Alpha, Node/pnpm; no templates, execution queue or model catalogue, with manual model names. **JSON is not a finished MP4 or editing project** |
| **[AI Video Generation System / hh591](https://github.com/hh591/ai-video-generation-system)** · [MIT](https://github.com/hh591/ai-video-generation-system/blob/main/LICENSE) | Gradio vertical workflow, character references/empty scenes/first frames, video and MoviePy; caching and failed-shot recovery | [Backends](https://github.com/hh591/ai-video-generation-system/blob/main/VIDEO_BACKENDS.md) include ComfyUI and cloud APIs. Mac models unconfirmed; reusing one first frame per character/scene limits variation. Research prototype |
| **[AI Drama Canvas / BB20260410](https://github.com/BB20260410/ai-drama-canvas)** · [Apache-2.0](https://github.com/BB20260410/ai-drama-canvas/blob/main/LICENSE) | Story/assets/start-end frames, review, queue, timeline, versions, FFmpeg MP4 and Codex MCP | Electron, Node, FFmpeg; Mac packaging script, no public installer located. Many author-specific workflow conventions; research candidate |

## B · Topic shorts, commentary and AI post-production

| Project / software licence | Inputs, outputs and strengths | Boundary for the cat account |
|---|---|---|
| **[MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)** · [MIT](https://github.com/harry0703/MoneyPrinterTurbo/blob/main/LICENSE) | Topic/script to assets, TTS, captions, music and vertical/landscape video; WebUI/API/CLI. Current main also uses cloud image/video generation, **not just stock footage** | Mac/Linux or Docker; GPU not required, cloud keys separate. Good for explanations; dedicated cross-shot identity management unconfirmed. Main may differ from releases |
| **[MoneyPrinterV2](https://github.com/FujiwaraChoki/MoneyPrinterV2)** · [AGPL-3.0](https://github.com/FujiwaraChoki/MoneyPrinterV2/blob/main/LICENSE) | Topic/script to AI-image sequences, TTS/music/MP4 and publishing automation. [Source](https://github.com/FujiwaraChoki/MoneyPrinterV2/blob/main/src/classes/YouTube.py) implements subtitles despite an old TODO | Not continuous-action generation; cat references/Chinese speech untested. Python, Ollama, cloud images, TTS/Whisper. Research does not authorize login or automatic publishing |
| **[NarratoAI](https://github.com/linyqh/NarratoAI)** · [MIT](https://github.com/linyqh/NarratoAI/blob/main/LICENSE) | Understands existing film/documentary footage, matches narration and cuts; TTS/captions/music, [Jianying drafts](https://github.com/linyqh/NarratoAI/blob/main/app/services/jianying_draft_builder.py) | Existing-media commentary, not new consistent cat-story shots. Mac path and no mandatory GPU documented; vision/text APIs and asset rights separate |
| **[ShortGPT](https://github.com/RayVentura/ShortGPT)** · [MIT](https://github.com/RayVentura/ShortGPT/blob/stable/LICENSE) | Facts/stories, Pexels/background media, TTS/captions/music, MoviePy and translated voiceovers | Colab/Docker/Gradio, some cloud keys. No cat-asset workflow confirmed; stable commit/release last dated February 2025. Lower priority |
| **[FireRed-OpenStoryline](https://github.com/FireRedTeam/FireRed-OpenStoryline)** · [Apache-2.0](https://github.com/FireRedTeam/FireRed-OpenStoryline/blob/main/LICENSE) | Search/split/understand/select footage, conversational editing, TTS/music/captions/rendering, style Skills, MCP/CLI/Web and optional AI transitions | Mac/Linux paths; **generate cat footage first, then let the agent edit**. General image/video generation remains TODO; cloud transitions cost extra |
| **[OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut)** · [MIT](https://github.com/OpenCut-app/OpenCut/blob/main/LICENSE) | Existing-media editor undergoing a rewrite | Editor API, MCP, headless mode and plugins are “coming”; [classic](https://github.com/opencut-app/opencut-classic) is archived. Not a mature AI production pipeline |
| **[OpenCut for Premiere](https://github.com/SysAdminDoc/OpenCut)** · [MIT](https://github.com/SysAdminDoc/OpenCut/blob/main/LICENSE) | **Different project**: silence/filler removal, captions, audio repair, search and some AI B-roll; CLI/MCP | Requires separately priced Premiere; Mac AI extras have limits. Not a zero-cost beginner setup |

## C · Local generation and model development

| Project / software licence | Capabilities | Mac and adoption boundary |
|---|---|---|
| **[ComfyUI](https://github.com/Comfy-Org/ComfyUI)** · [GPL-3.0](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE) | Reusable, partially executable media workflows, references, LoRA and interpolation; strong model control | Mac/Apple Silicon paths exist; **not all models/nodes are Mac-compatible**. You assemble the asset/shot workflow; no default complete drama studio |
| **[LTX Desktop](https://github.com/Lightricks/LTX-Desktop)** · [Apache-2.0](https://github.com/Lightricks/LTX-Desktop/blob/main/LICENSE.txt) | Desktop generation/editing, image/audio conditioning, LoRA and projects; retake/extend depend on the model | Beta; Apple Silicon, macOS 13+, **at least 15GB free RAM at startup, not total RAM**. Paid API mode otherwise. Full character-library/script breakdown unconfirmed; [weights have separate terms](https://github.com/Lightricks/LTX-Desktop/blob/main/NOTICES.md) |
| **[DiffSynth-Studio](https://github.com/modelscope/DiffSynth-Studio)** · [Apache-2.0](https://github.com/modelscope/DiffSynth-Studio/blob/main/LICENSE) | Python inference/training, quantization, memory management and LoRA/Adapters | [Official setup](https://github.com/modelscope/DiffSynth-Studio/blob/main/docs/en/Pipeline_Usage/Setup.md) includes Apple Silicon and mps/cpu. Model compatibility still needs testing. Framework, not a finished story GUI |

## D · Coded animation for a science-explainer cat

| Project / software licence | Suitable content | Boundary |
|---|---|---|
| **[Motion Canvas](https://github.com/motion-canvas/motion-canvas)** · [MIT](https://github.com/motion-canvas/motion-canvas/blob/main/LICENSE) | TypeScript, live preview, vector animation synchronized with narration; fixed cat artwork plus diagrams | No built-in generation model; prepare character assets and sound. For inventions, processes and science |
| **[Manim Community](https://github.com/ManimCommunity/manim)** · [MIT](https://github.com/ManimCommunity/manim/blob/main/LICENSE.community) | Precise Python mathematics, geometry and physics animations | Mac installation documented; formula rendering needs LaTeX. Not a cat-story model; licence does not grant rights to other creators’ characters |
| **[Revideo](https://github.com/midrender/revideo)** · [MIT](https://github.com/midrender/revideo/blob/main/LICENSE) | TypeScript media/text/animation, React preview and parallel headless rendering; video templates | Former redotvideo URL redirects. Write scene code; does not generate the cat. Local rendering untested |

## E · Public source with special or restricted terms

These may be useful. A special licence does not automatically prohibit all commercial uses: read the actual terms for the chosen version.

| Project | Findings and adoption boundary |
|---|---|
| **[DramaClaw](https://github.com/dramaclaw/dramaclaw)** | [Elastic License 2.0](https://github.com/dramaclaw/dramaclaw/blob/main/LICENSES/Elastic-2.0.txt). Canvas/episode pipeline, shared assets, speech and compositing. Standalone use differs from hosting for others; preserve attribution. Gateway setup adds work |
| **[waoowaoo](https://github.com/waooAI/waoowaoo)** | New preview uses [Elastic License 2.0](https://github.com/waooAI/waoowaoo/blob/main/LICENSE); Assistant/references/media canvas, **no music/voiceover controls in this preview**. Heavier Docker dependencies; old complete-film reviews do not establish current functionality |
| **[CineGen ShortDrama](https://github.com/UllrAI/CineGen-ShortDrama)** | Former Will-Water URL redirects; custom [AniKuku Community License](https://github.com/UllrAI/CineGen-ShortDrama/blob/main/license.md). Assets/storyboards/shots; [StageExport](https://github.com/UllrAI/CineGen-ShortDrama/blob/main/components/StageExport.tsx) MP4/EDL/XML buttons lack execution handlers, so final export is not established |
| **[PAI-Code / PAI-Pro](https://github.com/Utopai-Research/pai-code)** | [Sustainable Use License](https://github.com/Utopai-Research/pai-code/blob/main/LICENSE.md) has commercial/enterprise conditions. Agent/Skills, canvas/timeline and default PAI API. BYOK means replacing calls, not a ready multi-provider menu |
| **[Wan2GP / WanGP](https://github.com/DeepBeepMeep/Wan2GP)** | Current [Community License 2.0](https://github.com/DeepBeepMeep/Wan2GP/blob/main/LICENSE.txt), not the old Apache label. Self-use/outputs, software resale/white-labelling, paid services and direct output sales have distinct terms. README focuses Nvidia/AMD, source has MPS adaptations; Mac coverage/stability untested |
| **[Remotion](https://github.com/remotion-dev/remotion)** | [Special Remotion Licence](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). React/agent production and compositing; individuals, commercial entities with up to three employees, and nonprofits can use it free within its terms; larger commercial entities need a company licence. Not MIT |
| **[Huobao Drama](https://github.com/chatfire-AI/huobao-drama)** | [CC BY-NC-SA 4.0](https://github.com/chatfire-AI/huobao-drama/blob/master/LICENSE). Broad production flow and Mac packages; official terms require written permission before commercial use |
| **[BigBanana](https://github.com/shuyu-labs/BigBanana-AI-Director)** | Later versions mainly ship official Docker images, with source in the commercial edition. README conflicts with the [actual Community Licence](https://github.com/shuyu-labs/BigBanana-AI-Director/blob/main/LICENSE); non-OSI terms restrict unauthorized revenue activity, commercial production and hosting |

## F · Watch list with incomplete licence evidence

| Project | Observed features | Why it is not a primary recommendation |
|---|---|---|
| **[CineGen / christopherjohnogden](https://github.com/christopherjohnogden/CineGen)** | Mac AVFoundation/Electron, Elements/storyboard/NLE, FFmpeg MP4 and 9:16 | Different from ShortDrama. README claims MIT, but a separate software licence text and release installer were not located |
| **[AID / unclewongwong](https://github.com/unclewongwong/aid)** | Character cards/series/storyboards, generation/FFmpeg, 9:16, Mac/Windows Companion packages | README says MIT, separate licence text not found. The optional H3 Director 30/60-second continuous-video mode is experimental; authorization and output remain to be checked |
| **[Hailuo AI Short Drama Studio](https://github.com/Marshmallowc/Hailuo-AI-Short-Drama-Studio)** | Character library, compatible LLM and parallel MiniMax shots | README claims MIT, text not located; one observed commit, no release. export_service produces DOCX scripts, not evidence of MP4 assembly |

## Hosted studios and verified automation access

| Platform | Capabilities to compare | Still to verify |
|---|---|---|
| **[Flova](https://www.flova.ai/en/docs/introduction/quick-start/)** | Script/storyboard/media/timeline, 9:16, [comment regeneration](https://www.flova.ai/en/docs/features/comment-generation/), [video/assets/project export](https://www.flova.ai/en/docs/features/download-export/), [whole-project CLI](https://www.flova.ai/en/docs/features/flova-cli/) | Actual recurring-cat quality, checkout amount and model charges; convenience is an inference |
| **[OiiOii](https://www.oiioii.ai/en/story-anime)** | Story animation, asset reuse, shot revision and MP4; [FAQ](https://www.oiioii.ai/faq)/[plans](https://www.oiioii.ai/en/price) list CLI and watermark-free/1080p benefits | CLI coverage, complex paw/prop interaction and usable seconds |
| **[Seko](https://sensetime.com/cn/products/seko/)** | Script to film, [cross-episode/project assets](https://www.sensetime.com/cn/news/51170693), [agent/canvas/Skills](https://www.sensetime.com/cn/news/seko-3-0-ai-1) | Public project API, editing-project format, 9:16 and specific commercial terms |
| **[TapNow](https://docs.tapnow.ai/en/docs/canvas/create-and-use-elements)** | Elements, [local media edits](https://docs.tapnow.ai/en/docs/canvas/generate-and-edit-video), [Playlist MP4 assembly](https://docs.tapnow.ai/en/docs/canvas/use-playlists), [official MCP](https://docs.tapnow.ai/en/docs/mcp/use-tapnow-in-other-agents) | Multi-shot currently cannot reference Elements; image/audio nodes cannot directly be Playlist video clips |
| **[LibTV](https://www.liblib.tv/wappro)** | Chinese canvas/assets/director Skills/community; [Skills repo](https://github.com/libtv-labs/libtv-skills) has sessions/uploads/status/results | Project format and saved revision behavior insufficiently verified; session API is not a complete editing-project API |
| **[LTX Studio](https://ltx.io/studio/platform/ai-storyboard-generator)** | Storyboards/Elements, [Retake](https://ltx.io/studio/platform/shot-video-editor), timeline and [aspect ratios](https://ltx.io/glossary/video-aspect-ratio) | **Hosted Studio differs from open-source Desktop**. [Model API](https://ltx.io/model/api) differs from project API; separate billing |

### Price snapshots, not a production-cost winner

| Product | Readable official price and conditions | Comparison boundary |
|---|---|---|
| [OiiOii BASE](https://www.oiioii.ai/en/price) | Promotional **$17/month**; 1,000 credits immediately, 310 after full check-ins; watermark-free/1080p | Check-ins are not immediate credit. Maximum generated seconds depend on the model, not kept footage |
| [Seko entry annual plan](https://seko.sensetime.com/pricing) | First-order **¥576/year, paid upfront**; 6,000 annual credits; equivalent to ¥48/month | Monthly price unverified, repeat purchases at regular price, promotion subject to checkout; not a ¥48 monthly payment |
| [LTX Studio Standard](https://website.ltx.studio/studio/pricing) | **$35/month** or $336/year, equivalent to $28/month; commercial use | Free/Lite are personal-use tiers; $15 Lite is not a commercial-production quote |
| [Flova](https://www.flova.ai/en/pricing/) | Subscription credits, watermark-free export and commercial benefits confirmed; animated price digits unreadable | Credits valid for 30 days; model/duration/resolution affect charges; check checkout |
| [LibTV](https://www.liblib.tv/wappro) | Specific-model member promotional per-second prices with varying conditions | Minimum full plan payment unverified; rate times film duration is not the total budget |
| [TapNow](https://www.tapnow.ai/pricing) | Dynamic checkout unconfirmed; old index only an annual snapshot | [26 August–7 September campaign](https://docs.tapnow.ai/en/docs/account/creative-os-creation-festival) ended; do not quote its $9 monthly deal as current |

Lowest subscription, lowest generated-second rate and lowest finished-film cost are different. **No lowest-total-cost platform was established.**

## Maintenance and maturity snapshot

| Project | Verified status | Implication |
|---|---|---|
| [ArcReel releases](https://github.com/ArcReel/ArcReel/releases) | 2 October notes include editing, finished video and Jianying drafts | Prioritize delivery verification; not a bug-free guarantee |
| [MoneyPrinterTurbo releases](https://github.com/harry0703/MoneyPrinterTurbo/releases) | Main commit 7 October; v1.3.8 released 3 October | Compare default branch and packages separately |
| [PRINTFILM releases](https://github.com/yi1108/printfilm/releases) | Main commit 24 September; v0.2.0 released 17 September | Release record does not establish Mac image architecture |
| [AI Movie Studio 2](https://github.com/Heroesjouney/AIMovieStudiov2) / [Open Canvas](https://github.com/ZeroLu/open-canvas) | Explicit WIP / alpha | Test export and per-shot revision first |
| [ShortGPT releases](https://github.com/RayVentura/ShortGPT/releases) | Stable commit and v0.3.0 dated 10 February 2025 | Validate dependency/API compatibility first |
| [OpenCut](https://github.com/OpenCut-app/OpenCut) / [classic](https://github.com/opencut-app/opencut-classic) | New rewrite, archived classic | Dependency-build releases are not mature editor releases |

No star ranking; repository pushed time is not the default branch’s last commit. Maintenance signals do not prove reliability or image quality.

## Three content types: selection and verification

### Phase one: high-quality science explainers

The three films have production, GitHub archive and Douyin profile records. Review AI History’s chapters, entropy’s visual metaphors and the neutrino film’s diagrams/revisions, then extract reusable timing, scenes, fonts, audio cues, fact-source records and render checks while preserving each original’s reproducibility. Next-film workflow: **verify sources/calculations → one central question → narration/storyboard → Opus 5.5-assisted coded diagrams and necessary generated assets → speech/captions → editing/export → Douyin publication and feedback records**. Choose the next topic and duration in its brief.

Evaluate Manim for mathematics/geometry and Motion Canvas for narration-synchronized vector explanation when a concrete requirement warrants it. The [starter](../starter/README.md) and [137.5°](../examples/137.5/README.md) remain reuse/learning resources. MoneyPrinterTurbo can support media, speech and captions; automatic assembly does not establish scientific quality. Inventor Cat may be a presenter, identifier or avatar only; using it as the science presenter remains undecided.

Five acceptance criteria for explainers:

1. **Traceable facts:** reliable sources for key numbers, formulae and conclusions; check calculations and label simulations or simplified models.
2. **Complete explanation:** ask one clear question and answer it; each act supports a step, without visuals changing the scientific meaning.
3. **Accurate, readable diagrams:** correct units, axes, directions, proportions and labels; text, legends and motion readable at phone size.
4. **Sound and pacing:** complete playback with narration, captions and picture synchronized; no omissions/mispronunciations or music masking speech.
5. **Usable export and revision:** open and play the MP4 completely; retain sources, script, storyboard, code and assets, and verify editing/re-exporting one segment.

### Phases two and three: cute cats and AI drama

Cute cats emphasize recognizable identity and appealing natural actions. Drama adds dialogue, performance, shot continuity and a complete story. Compare Toonflow against ArcReel/PRINTFILM for self-hosting, or choose Flova/OiiOii for hosted production. Check LTX Desktop memory/model terms before local Mac use.

An avatar is only a visual reference. Fix front/side/full-body views, fur, goggles, clothing and workshop; complete and approve the [brief](../templates/brief.md) and [storyboard](../templates/storyboard.md) before generation.

For cat/drama tool comparisons, use the same 20–30-second, 9:16, four-to-six-shot film, matching resolution, references, script and sound. Check:

- Identity, fur, goggles and clothing across shots.
- Paws touching tools, prop interactions and action continuity.
- Independent failed-shot redo and original-version retention.
- Assets/reference bindings after save and reopen.
- Actual source-media, film and promised project export, including re-editing.
- Full playback with sound: captions, lip-sync, music, black frames and pacing.

| Candidate | Setup time | Generation/retry cost | Kept seconds | Retries | Identity/action | Save/reopen/export | Total time |
|---|---|---|---|---|---|---|---|
| Baseline | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested |
| Alternative | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested | Not tested |

**Cost per kept second = generation/retry spending for this film ÷ final kept seconds.** Record subscription allocation and labor separately; do not add the plan fee twice when it is already included in credit valuation. Use the [production log](../templates/production-log.md). Media readiness, project persistence, film export and publication are separate acceptance steps.

## Remaining uncertainties

- No matched quality/usability test or measured quality/cost winner.
- PRINTFILM ARM64 image, experimental Mac installations and some local models untested.
- Conflicting licence claims or badges without texts need further authorization checks.
- Model outputs, media, speech and music commercial terms remain separate.
- Official links can change: recheck version and checkout before installing, buying or using commercially. Chapter 6 retains its 5 October snapshot; use this chapter’s newer verification notes.
