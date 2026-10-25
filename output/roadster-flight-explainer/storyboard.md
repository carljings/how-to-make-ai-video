# Roadster flight principles — reviewed storyboard proposal

[简体中文](storyboard.zh-CN.md)

**Status: structure approved on 16 October; source-fidelity revisions explicitly directed by the user on 17 October. Production may proceed under the updated requirements below.**

Opus 5.5 authored the initial brief/storyboard in a verified English Claude Code conversation on GreenCloud. Codex reviewed it and corrected force directions, hover wording and the gas-reserve visualization below. Preserve the raw conversation (private runtime record retained locally) for provenance; this reviewed version supersedes its uncorrected physical descriptions.


## Source-fidelity revision — 17 October

The user requires the vehicle, staging, motion and poses to match Musk’s exact original clip. The generic red/sunset/ramp prototype is superseded. The target is the 15.4-second kickflip edit in [Musk’s post](https://x.com/elonmusk/status/2110913107094606330), media 2110913027490934784: white/light-silver coupe, dark paved night lot, parked lineup/tall truck and four source camera shots. The first 14 seconds of the film should preserve source-time ordering and visible poses/cuts; omitted trailing cloud is an edit, not a new motion. Source matching is reviewed in 16:9 before portrait reframing. Explanatory cutaways remain explicitly schematic, using the same exterior model. No exact hidden structure or independently measured performance is claimed.

Opus leads at the CLI’s highest listed effort, **max**. Blender 5.2.2 is installed locally; actual source-scene Cycles/Metal proof frames rendered successfully on the M4 GPU. Remotion remains available for text/audio/editing. Production continued in an isolated project copy.

## Brief and responsibilities

- Audience: Chinese Douyin viewers interested in the Roadster post Musk published on 16 October 2026, Asia/Taipei.
- Outcome: distinguish surface attachment, jet reaction and rotational torque, and understand why brief airborne motion does not establish practical sustained flight.
- Proposed specification: 75 seconds, 9:16, 1080×1920, 30 fps final code render; Mandarin narration and Chinese subtitles.
- Production lead: the user's GreenCloud Claude Code, reported canonical model `claude-opus-5-5`. Codex owns factual and audiovisual acceptance review.
- Production approach: Opus authors deterministic Blender model, scene and motion Python; Codex runs actual local M4 proof renders and reviews source comparisons. Text/audio/editing can use Remotion. The source-scene proof passed at 960×540/24 samples; this does not establish final-film quality or full-resolution render time.
- Look: one coherent source-matched night test-site scene, a carefully drawn metallic roadster, controlled warm/cool lighting, ground contact and camera depth. Cutaways and force diagrams transform the same scene. Particles explain airflow or exhaust.
- Persistent label: **「原理示意 · 非现场画面」**. Internal layout, nozzle positions and firing sequences are conceptual, not authenticated Tesla engineering.
- Narration: the seven approved rows have been synthesized through free edge-tts 7.3.1, zh-CN-YunxiNeural at −3%, sending the public script to Microsoft's service. The first clip is reused exactly. Exterior-silence trimming retains 100 ms pads and all internal pauses; usable voice totals 66.429 seconds. Full decoding and offline ASR checks are complete; subjective sound review remains separate.
- Sound: code-generated score and physical cues; initially master to −14 LUFS, true peak ≤ −1.5 dBTP. Prior per-film loudness exceptions do not automatically apply here.
- Proposed new paid-media expenditure: ¥0. Existing Claude usage/server resources are separate. Any paid substitution first needs an itemized approved budget.

## Storyboard — 75 seconds

| Time | Picture and explanatory motion | Exact Chinese narration | Sound |
|---|---|---|---|
| **0–5.5 s** | Reconstruct source 0–5.5 seconds: the original wide/close/behind-truck cuts and observed airborne poses, using the white/light-silver source car. Match the source occlusions, plume directions and staging. No invented ramp launch or clean touchdown. Question and meaningful motion start immediately. | 没有翅膀，这辆车凭什么离开地面？ | Immediate gas hiss and low impact, then room for the voice |
| **5.5–14 s** | Continue the source’s wide replay-like view from source 5.5–14 seconds, preserving its pose sequence and cloud occlusion, with restrained source/date labels. Attribute the systems description to Tesla. Do not turn this replay into a second independent flight or derive a duration from it. | 马斯克发帖：原来未来真有飞行汽车。特斯拉称，它用到了多模式吸力系统和冷气推进器。 | Short label clicks; music stays below narration |
| **14–27 s** | Transition explicitly into a principle cutaway of the same car. Use a simple contact-surface diagram to explain reduced underbody pressure; do not claim this was a preceding ramp shot in the Musk clip. Attachment arrows point toward the contact surface, gravity remains down. | 先分清贴地和腾空。抽走车底一些空气，气压变低，外界压力把车压向路面。吸附朝向路面，不一定朝下。 | Rewind cue, pump airflow, surface-contact cue |
| **27–41 s** | Remove the nearby surface: the attachment arrows disappear. A short exhaust pulse changes the car's motion, followed by a ballistic segment. Exhaust particles travel outward; reaction arrows point oppositely. Never present a hypothetical hover as demonstration footage. | 可离开路面，就不能靠这样吸附。压缩气体从喷口冲出，车受到相反的推力。这里不靠燃烧，靠的是喷气的反作用。 | Inrush, a brief drop in music, then a clearly timed gas pulse |
| **41–52 s** | Orbit to show a conceptual thrust line missing the centre of mass, producing a correctly directed rotation. Compare a different pulse and attitude response. Mark nozzle layout and sequence as illustrative. | 推力的作用线偏离重心，就会产生力矩，让车转动。不同喷口配合调节，可以改变姿态。腾空翻转，却不等于稳定悬停。 | Valve clicks follow the pictured pulses; no continuous jet during ballistic motion |
| **52–64 s** | Reveal multiple conceptual pressure vessels, attributed to Tesla's statement. Show gas particles filling each vessel's full volume, with fewer particles after expulsion. A reserve indicator is labelled 「气量余量示意」; it is not a pressure/thrust/endurance calibration. No liquid-style falling fill line or invented units. | 气从哪来？特斯拉称，车内可用的空间里，分布着多个碳纤维缠绕的压力容器。每喷一次，气就少一点；用掉的，不会自己回来。 | Pulse-linked discharge sounds; no claimed calibrated pitch/pressure relationship |
| **64–75 s** | Resolve the car back onto the surface. Show brief airborne motion and controlled hover as different concepts; any hover balance is hypothetical. End on finite stored gas/energy and practical limits. Do not depict an empty airborne car simply becoming safely stationary. A replay cut, if used, must clearly start a new illustration. | 悬停，不只要推力平衡重力，还得控制运动。演示不等于能通勤。飞多久，还得看气量、能量和安全。 | Final valve closure, a clear landing/contact cue, then space for the last sentence |

Measured timing revision: preserve source 0–14 seconds and the approved wording; use narration starts **0, 5.5, 14, 27, 40, 52.1, 64.5 seconds**. The final voice ends at 74.586 seconds with no overlaps or speech acceleration. Thus the last three explanatory scene boundaries become 40–52.1, 52.1–64.5 and 64.5–75 seconds. The table above records the original proposed slots; the measured cue manifest takes precedence for assembly.

## Title, cover and tags

- Title: **马斯克说“未来真有飞行汽车”：它靠什么离开地面？**
- Cover: **没有翅膀，靠什么飞？**
- Tags: **#飞行汽车 #特斯拉 #马斯克 #冷气推进 #物理科普**
- These are content-matched proposals, not guaranteed traffic techniques.

## Source and claim boundary

- [Musk's current post](https://x.com/elonmusk/status/2110913107094606330): original author/date/text verified through public X oEmbed; 09:57:58 Asia/Taipei on 16 October.
- [Tesla system statement](https://x.com/Tesla/status/2110907035571401174) and [pressure-vessel statement](https://x.com/Tesla/status/2110904290743402880): manufacturer claims verified through public X oEmbed, not independently measured specifications.
- [Tesla event](https://www.youtube.com/watch?v=qt5p-_tE8d0), [ramp](https://www.youtube.com/watch?v=7p5LxFdc-Qg), [kickflip](https://www.youtube.com/watch?v=r5vsHHPVhJg): actual frame samples inspected. These related edits are secondary references; the exact 15.4-second Musk clip and its observed pose/cut manifest are the primary fidelity target. Sampled frames do not independently validate performance.
- [NASA cold-gas propulsion](https://www.nasa.gov/smallsat-institute/sst-soa/in-space_propulsion/): general mechanism, not Tesla's exact hardware.
- [2018 proposal](https://x.com/elonmusk/status/1005577738332172289): distinguish an earlier concept from current publicity.
- No verified tank pressure, volume, mass, thrust, hover duration, range, production delivery or certification claims are included.

## Acceptance gates

1. **Before code:** user confirms this storyboard; verify the source footage and existing rendering/voice environment. Preserve existing cuts and unrelated work.
2. **Opening:** inspect a contact sheet through 0–3 seconds and play the actual opening with sound. The question and meaningful motion start immediately.
3. **Physics:** attachment follows the surface; gravity stays down; exhaust/reaction and torque directions agree. A jump is not hover. Equal vertical forces mean zero vertical acceleration, not automatically zero velocity. Gas fills its container; reserve indicators do not fabricate endurance.
4. **Technical:** Chinese glyphs and safe areas, no clipping/overlap, measured narration/subtitle synchronization, final loudness/peak measurements, seeded clock-free rendering and reproducible output.
5. **Actual film:** review the complete audiovisual export with intelligible voice, purposeful camera moves and a clear new reveal per act. Phone viewing and the user's aesthetic acceptance remain separate from passing code checks.
