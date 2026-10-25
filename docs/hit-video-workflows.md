# What tools actually make hit AI videos?

**English** · [简体中文](zh-CN/hit-video-workflows.md)

Checked **16 October 2026** against Chapters [6](06-platforms-compared.md) and [7](07-tools-like-toonflow.md), creator interviews, official product pages, the LibTV Skills repository and this repository's Nobel V3 source. This was documentary research: no paid generations, installations, subscriptions or same-script quality tests. The third-party films were not replayed or independently audited in this round.

**A production studio and a model API are compatible parts of a workflow.** A creator can operate a studio manually, ask an agent to use its published interface, or call a model API directly. These cases do not establish which route most studios use.

## Keep the layers separate

| Layer | Examples | Its job |
|---|---|---|
| Viewing and distribution | Hongguo, Douyin | Deliver finished work to viewers; a listing does not identify production tools |
| Writing and planning | Human writer/director with a language-model assistant | Topic, script, storyboard, prompts and review decisions |
| Production studio | LibTV, TapNow, Xiaoyunque; open-source alternatives in Chapter 7 | Organize characters, references, shots and generation tasks; automation varies |
| Generation model and access | Seedance, Kling, etc.; hosted UI, official CLI or API | Generate pictures, motion and sometimes audio; the interface is an access route |
| Editing and finishing | Remotion, Jianying, Blender, ffmpeg, etc. | Timing, compositing, accurate text, sound, captions and export |

Hongguo carries live-action work as well as AI content. Do not treat every Hongguo success as an AI-generation case. Live-action and AI are explicitly distinguished in [this report of Douyin's response, 7 March](https://www.ithome.com/0/926/825.htm).

## Named works and the evidence behind them

Reach below is **the cited source's publication-time claim**, not a fresh platform counter or independently verified analytics. Series views, cross-platform views and likes are different measures. Interviews document what creators say they used; promotional support and unpublished extra tools remain possible.

| Work | Disclosed production route | Reach and evidence boundary |
|---|---|---|
| **《万兽独尊》**, 创翊传媒 | Xiaoyunque short-drama Agent; the report identifies its Seedance 2.0 integration. The producer describes script upload, character/scene planning and shot corrections. | The **21 March** interview reports over 100 million Douyin series views and first place on Hongguo's animation heat chart. **Creator-written API use is not disclosed.** [Producer interview, 文娱价值官 / 澎湃号](https://www.thepaper.cn/newsDetail_forward_32801618) |
| **《纸手机》**, 李婷 / 杨选 | The director names **Kling 3.0 Omni**: subject/image references and joint audio/video generation. The paper-phone prop was hand-drawn and photographed, then integrated with AI footage. | A direct **11 April** interview identifies the model; API access is unspecified. Kuaishou's **2 June** account reports over 100 million **cross-platform** views, not Douyin-only views. [Creator interview, 短剧内行人 / 澎湃号](https://www.thepaper.cn/newsDetail_forward_32941242) · [Kuaishou's account](https://www.kuaishou.com/csr/news34.html) |
| **《牌子》**, DiDi_OK | **TapNow** with Nano Banana Pro and access to Veo, Jimeng and Kling; **Gemini + Suno** for music. Some shots combined screen recording, AI and compositing; the text-eating shot used **Blender**. The interview does not map every final shot to a model version. | The **1 April** interview reports nearly 18 million Bilibili views and over 2.31 million **Douyin likes**. No creator-written API workflow is established. [Director interview, FoST / 澎湃号](https://www.thepaper.cn/newsDetail_forward_32866137) |
| **《百匠：纸契灵》**, 万梦生 | **Xiaoyunque canvas**, human script, action design and editing; creator-program credit support. The interview does not give a complete model/version list or establish custom API use. | The **18 July** interview reports over 100 million cross-platform views, 13 production days and roughly ¥10,000 in compute. Credit support means this is not a normal subscriber's verified cash bill. [Creator interview, FoST / 澎湃号](https://www.thepaper.cn/newsDetail_forward_33608824) |
| **《挺好的》**, 站立起来的影子 | Appears in **LibTV's official showcase**. | The homepage labels it over one million **cross-platform likes**. This verifies a vendor showcase claim, **not** a complete production breakdown, exclusive LibTV use, model attribution or API use. [LibTV homepage](https://www.liblib.tv/) |
| **《凡世尘缘》** | Volcengine says **火山剧创 + Seedance 2.0** produced the script-to-edit workflow, with Jianying export supported. | This is a vendor demonstration; the source establishes **no million-view result**. It illustrates that an integrated Agent can sit above a video model. [Official demonstration](https://developer.volcengine.com/articles/7622325633040793641) |

The 澎湃号 interview publishers are named above. Hosting on thepaper.cn does not turn them into independent platform analytics or a 澎湃 newsroom endorsement. A tutorial recreating a successful film is not evidence about the original film's tools.

## Where LibTV fits

The official [libtv-labs/libtv-skills repository](https://github.com/libtv-labs/libtv-skills) exposes session creation/messages, file upload, progress queries and result downloads, returning a project/canvas link. This permits **agent → LibTV OpenAPI → media result** as well as manual studio use.

Its MIT licence covers the **Skills code**; it does not make the hosted service or underlying models open source. The published session interface does not establish a complete editable timeline API, precise per-shot model parameters or persistence of every partial revision. No authenticated generation or export round trip was tested here.

The evidence supports considering LibTV for **visual shot organization and multi-model work**, not declaring it the highest-quality generator or the tool behind most Hongguo hits. Xiaoyunque has clearer named long-drama production evidence in this sample; that is an evidence difference, not a quality benchmark.

## This repository already has an API-based example

The [Nobel V3 credits](../output/nobel-econ-2026-v3/CREDITS.md), [production log](../output/nobel-econ-2026-v3/production-log.md), [API script](../output/nobel-econ-2026-v3/scripts/ark.py) and [composition](../output/nobel-econ-2026-v3/src/Film.tsx) record:

**Opus 5.5 / Claude Code planning → reference images → official Volcengine Ark Seedance 2.5 tasks → generated Mandarin/audio → speech checks and a line repair → Remotion composition → ffmpeg finishing.**

The source identifies `doubao-seedance-2-5-260628` and the Ark `contents/generations/tasks` endpoint. This establishes the implementation and documented production route; it is **not** an independently verified viral result or proof of today's service availability. Raw model clips/stems are not all in the repository, and the film was not replayed in this research pass.

The historical log estimates about **¥245** for a draft/final/retry workflow, rather than providing an invoice. New production follows [the user's updated budget rules](../CLAUDE.md): approved storyboard, direct **720p**, no 480p drafts or 1080p generation, reuse references, and itemized approval before spending. The historical recipe does not override those rules.

## Choices for this account

These are workflow recommendations based on the disclosed cases and existing project, **not tested winners**.

| Priority | Recommended next route | What must improve |
|---|---|---|
| **Science first** | Retain Opus-assisted research/planning and Remotion/Canvas for exact explanations; generate only footage that helps the explanation. Keep direct API generation where its records and control are useful. | Facts, causal explanation, readable units/text, synchronized sound and advancing motion; assess the complete film on a phone |
| **Inventor Cat** | Fixed character references and one short action; compare LibTV's visual workspace with the existing generation route before subscribing | Stable face/fur/goggles, believable paw-object contact and emotional timing |
| **AI drama** | Compare Xiaoyunque's Agent for script-to-episode work with LibTV/TapNow for shot-directed work; consider Toonflow/ArcReel when self-hosting or integration solves a concrete need | Character/voice continuity, performance, dialogue, shot revisions and editable export |

**API access does not inherently raise image quality.** Compare the exact model/version, parameters, references, prompt rewriting and output compression. A hosted studio can improve asset handling and prompts; direct API access can improve reproducibility and automation. Neither establishes a viral outcome.

The content lesson from these cases is an interpretation: a clear premise, specific emotion, purposeful action and deliberate editing are worth testing. It is not a causal finding that a named tool, fast cutting or a fixed three-second formula produces a hit. Keep the account's [truthful title, relevant tags, opening and measurement standards](08-douyin-science-growth.md).

## Comparing cost fairly

On **16 October**, LibTV's [homepage banner](https://www.liblib.tv/) advertised **Seedance 2.5 720p from ¥0.19/s with reference and ¥0.46/s without reference**, subject to a premium membership and limited-time terms. This differs from Chapter 6's older Seedance 2.0 annual-plan snapshot. The full membership payment, reference definition, billable inputs and effective redemption were not verified; these are **advertised floors**, not an approved production budget.

Compare the same 15-second, 720p brief, exact model/version, reference/audio conditions and export rights. Count required membership payments, credits actually redeemed, reference images, failed takes, redos and finishing. Record cash paid and credits consumed separately; do not charge the entire membership to each clip or count the same credit expense twice.

**Effective cost per accepted second = attributable production cost / seconds retained in the final edit.** Unused or expiring credits and the minimum upfront payment must remain visible. A comparison run has not been performed; any paid run first needs an approved itemized budget. There is no verified cheapest or highest-quality winner in this report.
