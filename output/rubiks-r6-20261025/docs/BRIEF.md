# Brief: 2.51 秒的世界纪录，为什么没拿冠军？——魔方里的三个数

Remake of the Rubik's cube explainer (Opus 5.5 directs, writes, animates and reviews). Replaces Codex v1/v2
(`output/rubiks-codex-film-20261022`, `output/rubiks-codex-film-v2-20261022`), which the user rejected:
“动效不够惊艳，讲解的也不够精彩，bgm也没有”.

| | |
|---|---|
| **One sentence** | For Douyin viewers who have held a cube but never thought about it: by the end they can say why there are 4325亿亿 states, why 20 moves always suffice, and why the 2.51 s world-record holder finished 6th in the same competition. |
| **Path** | B — code-drawn. Canvas 2D, every frame a pure function of `t`, rendered frame by frame in headless Chrome (the user's default since 21 Oct). |
| **Length** | ≈ 2:38 (user asked for 2–3 min) |
| **Aspect & size** | 9:16, 1080×1920 |
| **Frame rate** | 30 |
| **Platform** | Douyin (小川科普) |
| **Language** | No voice-over. Big kinetic Chinese headlines carry the explanation (the format of the approved 《AI也会刷分》 and music film C); small footnotes carry sources and limits. |
| **Tone** | Fast, punchy, a little cinematic. One clear visual action per idea; cuts land on the beat. |
| **Look** | Near-black stage, a single “act light” that changes colour per act, a glossy stickerless speed cube with real layer turns, motion trails at speed. Headlines top-left (Noto Sans SC Black, one accent word), giant numbers in a condensed face. Must NOT look like Codex v2: no repeating “title / centred cube / caption” slide layout, no navy panels, no tiny text. |
| **Sound** | Original electronic score composed in code (Web Audio, offline, 120 BPM), one arc for the whole film with a drop on “20”, plus sound effects tied to the picture (each real layer turn clicks, timer beep, card flips, impacts). No voice. |
| **Must include** | Origin (1974/1975/1980) · 43,252,003,274,489,856,000 and why · God's number 20 and how it was proven · human records 2.51 / 3.51 · LBL, CFOP, Roux · Geng Xuanyi and Wang Yiheng's recent competitions. |
| **Must avoid** | Photos of real people; “every scramble needs 20”; “35 years of computing”; 20÷2.51 speed maths; calling the demo solve the record solve; “Roux is faster”; any fact not in `FACTS.md`. |
| **Budget** | ¥0 of generation (no paid video, image or voice). Local render on the M4. |

## Story in three lines

1. **Beginning** — a cube is solved in 2.51 seconds, a world record… and the same solver finishes 6th in that competition's final. Why?
2. **Middle** — to answer, understand the cube's three numbers: 4325亿亿 states, 20 moves (proven, from both sides), 2.51 seconds (and how competitions score it).
3. **End** — the record solve was the fastest of five, and the rules drop the fastest: it never counted toward the average. Rankings reward five consistent solves. Mathematics closed at 20; the human number is still open.
