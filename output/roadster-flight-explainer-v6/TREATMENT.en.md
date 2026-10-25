# v6 「空气现形」 — text-led, voice-free cut · TREATMENT

Director: Opus 5.5 (creative direction delegated by the human). Render, encode and QA: Codex. Written 2026-10-18;
corrected the same day to match the implemented cut. The numbers below are the ones in `web/engine/cues.js`.

Human request for this version: *"Try without Chinese narration, explain using text only, and increase the video's
technological awe."*

This is a new, isolated v6. v1–v5 are untouched. Nothing from the v5 voice, TTS clips, word timings or mixed master is
used; the v5 files that once lived here are kept, unused, under `references/v5-legacy/`. The film stays Chinese, 9:16,
1080×1920 at 30 fps. It is rendered by the existing deterministic WebGL2/CDP engine with the frozen v4-fit geometry and
poses.

## 1. What the rejected v5 actually looked like (encoded contact sheets, 44 frames)

- **It was a narrated film with captions.** From 5 s to 53 s, almost every frame carries a full spoken sentence in a
  fixed band at y≈1395. Without the voice, this becomes a wall of subtitles. The kinetic moments (掉, 吸, 压, 借/花)
  were decorations on top of the sentences, not the explanation.
- **Frame 0 was not a poster.** The car sits small in the top-left corner. Two thirds of the frame is an empty black
  loop. There was no readable question until 1.5 s.
- **The "tech" layer looked generic.** The Tron-style floor grid (14.5–56 s), the plan-view slit drawn as a flat
  rectangle of dots (10–13 s), and the thick leader-line labels (风扇（示意）, 储气（示意）, 喷气（示意）, 重力…) read as
  a HUD, not as wonder.
- **There was a full white blow-out at 7.1 s.** Several smaller colour flashes also landed on impacts.
- **The provenance slate sat on every frame**, top left, as a full sentence.
- **The ending was thin.** 借/花 floated as stickers over a dark wide shot. The title sat on a mostly empty frame.

The physics, the gold/cyan colour semantics, the Ping (night → air vision) and the shot geography were right. v6
keeps them and rebuilds the edit, the composition, the type and the sound around **reading** instead of listening.

## 2. Idea

**The air is the invisible protagonist, and the type is its voice.** Think of a silent-film intertitle reborn as a
holographic technology reveal:

- the picture shows the cause;
- one short line of Chinese names it;
- the score hits exactly where the physics happens.

Every card states **one** causal step. It enters with motion that means something:

- 压 slams down;
- 外面压得重 drops in heavy, while 缝里压得轻 floats in light;
- 吸 cracks;
- 没了 falls away;
- 往下喷 slides down and 往上推 rises;
- 翻 flips.

Then the card holds still long enough to read.

Escalation comes from a chain of reveals. Each one opens a deeper layer of the same scene:

1. a car hangs upside down;
2. "suction?";
3. the air itself appears;
4. inside the slit;
5. one force out of many impacts;
6. the force follows the whole ramp;
7. the ramp ends and the force breaks;
8. the car's own gas;
9. a separate demonstration where off-centre thrust flips the car;
10. the summary, and the limit of the carried gas: 花完，就没了.

## 3. Structure (54.1 s, 1623 frames; the exact numbers live in `web/engine/cues.js`)

| Act | Shot | s | World | Screen text (one idea at a time) | Reveal |
|---|---|---|---|---|---|
| Hook | A1 | 0.0–3.6 | night | 它凭什么不掉？ | **Frame-0 poster.** Under the ceiling, the inverted car big and rim-lit, dust falling through flood shafts past it. The camera rides with the car (car-local), so the whole car from nose to tail light stays in frame. |
| Turn | A2 | 3.6–5.7 | night | 被吸住的？ (吸 cracks) | Head-on at the slit between car and ceiling; the fans spool up. |
| | A3 | 5.7–9.6 | → air | 是空气， / 把它【压】在顶上 | **The Ping.** The scan wave turns the venue into air vision and the air appears as glittering motes. Gold impacts hammer the exposed side, and one gold push slams into the ceiling. |
| Mechanism | B1 | 9.6–12.9 | air | 风扇抽走缝里的空气 | Oblique x-ray through the car. The slit is a thin sheet of glowing air; the two rotors light and the slit air spirals into them and leaves at the tail. |
| | B2 | 12.9–20.1 | air | 外面 压得重 / 缝里 压得轻 → 压力差 / 把车按向坡面 → 轮胎被压紧， | Outside, a rain of air hits the body (inbound streaks + gold impacts). The drained slit is nearly silent. The impacts converge into one push into the ceiling, which then splits into the four tyres. |
| | B3 | 20.1–22.6 | night | …才抓得住 | Tyre macro on the ceiling, gold contact patch; the car pulls away on the grip hit. |
| System | C1 | 22.6–27.0 | air | 这股力，始终压向坡面 / 重力，始终向下 | **Hologram ramp in a void.** A replay leaves ghost poses on the climb. A field of thin gold needles points into the surface all around the curve. White gravity arrows stay parallel and downward. |
| Free end | D1 | 27.0–29.1 | night | 坡，总有尽头 | Chase toward the deck's free end, headlights at the lens; the edge lights white. |
| | D2 | 29.1–32.0 | → air | 缝一敞开， / 压力差就没了 | Side-on at the free end. The slit opens, outside air rushes in, the gold push shrinks and shatters; only gravity remains. |
| | D3 | 32.0–32.8 | night | (the lines fall away) | From below: the car leaves the deck and drops toward us. |
| Own gas | E1 | 32.8–35.3 | → x-ray | 它自带高压冷气 | A scan plane runs nose → tail; schematic vessels of crowded, jittering gas appear. |
| | E2 | 35.3–38.3 | air | 气往下喷 ↓ / 车往上推 ↑ | Jets down; the reaction rises through the car, exactly opposite; gravity unchanged. |
| | E3 | 38.3–39.0 | night | — | Into its own white cloud under the floods. |
| Other demo | S | 39.0–40.0 | black | 另一场演示 + source line | Hard cut, silence, one tone. |
| | F1 | 40.0–45.8 | lot | 喷气偏离重心 → 车就翻了过来 (+ cable note at top) | Rise on jets. Time freezes in air vision: the off-centre push and the twist about 重心 (small mark). Then the car flips. |
| Close | G1 | 45.8–54.1 | night/air | 坡上，借空气的力 / 空中，花自己的气 → 花完，就没了 → **空气现形** | The ramp wide, the cloud thinning. Gold sweeps the driving surface and the cyan airborne path appears. Then the limit of the carried gas, and the camera rises away for the title and sources. |

**Prototype proof: 0.0–12.9 s (frames 0–386).** It covers A1–B1: the poster, the question, the misconception, the
Ping/压 reveal and the fan evacuation. That is the opening plus the first full causal step. It is selected with
`render.mjs --proof` (picture) and `mix.mjs --proof` (sound).

## 4. Visual language

**Two worlds, as before, but better shot and graded.**

- **Night** is the photoreal CG reconstruction: floods, haze shafts, red edge neon, dust.
- **Air vision** is a scientific hologram:
  - deep navy void;
  - ice rim light;
  - the air as motes;
  - pressure as gold impacts;
  - the car's own gas in cyan.

The Ping is the only transition between them.

**Changes for awe:**

- **Composition first.** Every shot reserves one clean text zone, and the card sits where the picture is quiet. There
  is no fixed subtitle band.
  - Frame 0 works as a complete poster: subject, light, question.
  - The opener's camera is defined in the car's own frame, so the car (≈84–87 % of the frame width) cannot drift out.
- **Pressure as bombardment.** Each gold impact is preceded by a short ice-white inbound streak travelling along the
  surface normal. Outside you see a storm of air hitting the body; in the drained slit, almost nothing. This follows
  NASA's "pressure force acts perpendicular to the surface".
- **The hologram ramp.** v5's heavy floor grid is gone. Air vision gets:
  - a fine 1 m dot lattice with faint 5 m lines, fading with distance;
  - a field of thin gold needles along the whole driving surface, so "always into the surface" is something you see
    as a field, not five arrows.
- **No white flashes.** Impacts are carried by a short camera shake, a bloom swell and the sound. Flash uniforms stay at
  zero.
- **Fewer labels.**
  - Leader lines are dropped.
  - Colour coding links words to forces: gold = outside air pressure / the push, ice = low pressure in the slit,
    cyan = the car's own gas, white = gravity.
  - The only callouts left are:
    - the required cable note, a still footnote at the top during the kickflip;
    - the small 重心 mark during the F1 freeze.
- **Provenance tags.**
  - A compact top-left tag follows the world: 「CG重建」 / 「原理示意 · 非实拍」.
  - The full source line appears at the start (Tesla) and at the separator (Musk).
  - Both sources and 「风扇、储气、喷口与受力为示意」 return on the title card.

## 5. Typography

Bundled Roadster Film Sans, a Noto Sans SC OFL subset, shipped as `web/assets/fonts/V5Sans-{300,500,700,900}.woff2`.
Weights: 300, 500, 700, 900. There is no system font fallback.

| Role | Weight / size | Use |
|---|---|---|
| Hero | 900, 122 px, tracking 4 (auto-fit to ≤ 800 px line width) | the statement of the step |
| Support | 500, 60 px, tracking 6 | the context half of a card |
| Contrast pair | 900 gold vs 300 ice, 112 px, tracking 10 | 外面 压得重 / 缝里 压得轻: weight is pressure |
| Big glyph | 1.5× inline (压 slams); 1.22× (吸 cracks) | the key verb |
| Chapter | 700, 76 px, tracking 16 | 另一场演示 |
| Tag | 500, 26 px, 62 % opacity, top left | provenance |
| Source / credit | 500, 28 / 27 px | source lines on the separator and the title card |
| Note | 500, 32 px on a dark plate | 画面中可见细线，作用未公开 |
| Title | 900, 156 px, gold → white → cyan | 空气现形 |

**Reading rule** (the formula is in `cues.js`; `landed()` defines when a line is in).

- Entry 0.3 s, characters staggered 0.03 s.
- After the last line lands, the card holds still for ≥ R(that line). From the first line's landing to the exit it
  holds for ≥ R(whole card). Here R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters).
- Exit 0.25 s. C10 falls away instead, and is gone by 32.895 s; 吸 cracks.
- At most 2 lines and ≤ 10 CJK characters per line.
- Safe area: x 110–970, y 200–1460, clear of Douyin's top bar, right rail and bottom caption.

`tools/text_inventory.mjs` checks every card against this rule. It also writes `TEXT_INVENTORY.zh-CN.json`. That file
lists every on-screen string (35), its window and its unique characters (121). It records:

- glyph coverage, read from the four shipped WOFF2 faces;
- the layout boxes, computed with the faces' own advance widths;
- the collision check.

All 15 explanatory cards pass and every card is inside the safe area. No two cards share screen space while both are
visible, and no card shares it with the top-left tag or the cable note. The only time overlap, C16 → title, is a 0.1 s
handoff between separate zones.

## 6. Sound (original procedural score + SFX, no voice)

**The score.** It is cut to the same `cues.js` instants as the picture: every hit is an `E` event or a card entry.
`tools/score.mjs` also writes `score.cues.json`, a cue sheet with each hit's time and frame.

**Mastering.**

- `tools/mix.mjs` masters straight to −14 LUFS integrated / −2.0 dBTP. Both are measured by ffmpeg's BS.1770 meter on
  the written file.
- The master is exactly as long as the picture: 1623 frames = 2,596,800 samples at 48 kHz.
- Nothing ducks, because there is no voice.

The music runs on a 100 BPM grid anchored at the 压 impact (7.2 s), where the groove drops in.

| Section | Sound |
|---|---|
| Hook | A sub slam on frame 0, a low drone, glassy dust ticks, the fans idling |
| Turn | Fan spool-up and suction; the crack of 吸 as a glitch; a breath of near-silence |
| Ping | A deep thoom with a glass sonar tone; an air pad enters |
| 压 | The first big impact; the groove drops in |
| Mechanism | Groove, fan whine, suction swirl. A rain of tiny clicks for the impacts: dense outside, thinned for 缝里. A low step for 外面 and a glass tone for 缝里. A riser into the lock hit for 压力差, with a chord under it; a second lock for 按 / 轮胎被压紧 |
| Grip | A rubber rumble and a stab |
| System | A swell, the stations ticking, a low step for 重力, the slam on 始终压向坡面 |
| Free end | The groove drops out; ticking hats accelerate; a ting on 尽头, a ping on 敞开, a shatter on 没了; wind, then the sub drop |
| Own gas | A scanner sweep, a cold low tone, crowded crackle, cold hiss; a low push on 往下喷, the impact on 往上推 |
| Plunge | A whoosh into the cloud boom |
| Separator | A hard silence and one tone |
| Kickflip | A half-time pulse; time freeze (reverse swell, suspended cluster) and a rising glide for the twist; an impact on 翻 |
| Close | A resolving chord. A stab on 借, a ting on 花自己的气. The reserve runs out in seven thinner, shorter puffs, the last on 花完, and the music thins to a breath on 就没了. Then the title impact and a long tail that fades with the picture |

**Card ticks.** A card landing gets a very soft air tick, on hero lines only, and never where a causal hit already
marks that instant. In this cut that leaves C09 and the second line of C13.

**Big hits.** These are reserved for causal moments: 压, 压力差, 按, 压向坡面, 没了, 推, 翻 and the title. The
frame-0 slam and the cloud boom frame the film.

## 7. Locked facts (unchanged) and how the picture keeps them

- **Car and ramp.** They match the v4 source fit, including the finite flat ceiling deck and its free end
  (x = −5.77 m), and the floor 6 mm under the run-in (no z-fighting).
- **Gravity.** Every white arrow is world-down.
- **The fans.** They lower the gap pressure. The outside pressure then pushes the car toward the nearby surface, which
  increases tyre load and grip. The push is drawn into the surface and turns with it; gravity never turns. The push
  is not shown as propulsion along the ramp.
- **The seal opening.** The slit refills and the pressure difference disappears. The push breaks; gravity remains.
- **The stored cold gas.** It produces a reaction opposite to the exhaust. The jets are white or cyan mist, never
  flames.
- **The finite reserve.** The carried gas runs out: 花完，就没了.
- **The kickflip.**
  - It is a separate demonstration, with a hard separator and its own source line.
  - The off-centre push has r×F matching the pose's actual roll.
  - The visible cables stay, with the note 「画面中可见细线，作用未公开」.
- **Not shown:**
  - antigravity, maglev, untethered-flight proof, unverified numbers, or the word 今天;
  - any claim that fan, vessel, nozzle or force geometry is factory CAD or CFD (it is marked schematic).
- **Dates.** Source releases are 2026-10-16. The client date is 2026-10-18.

## 8. Production

**Cue schedule.**

- `web/engine/cues.js` is the single source of picture events, text cards and sound cues. It is pure, with no DOM, and
  is imported by the browser and by every Node tool.
- `timeline.js` maps the existing shot functions onto it.
- `text.js` draws only what `cues.js` lists. It contains no Chinese literals.

**Tools.**

| Tool | What it does |
|---|---|
| `render.mjs` | The frames. `--info` prints the full schedule; `--proof` renders frames 0–386. |
| `score.mjs` | Writes `out/audio/score.wav` and `score.cues.json`. |
| `mix.mjs` | Writes `out/audio/master.wav` and `master.json` (`--proof`: `master.proof.*`). |
| `text_inventory.mjs` | Writes `TEXT_INVENTORY.zh-CN.json`. |

**Determinism and fonts.** Rendering and the score are deterministic per frame and per sample. Fonts are bundled.

**Freeze and handoff.**

- `PICTURE_READY.md` and `PICTURE_LOCK.json` (sha256 of every file under `web/`) mark the picture freeze.
- `FULL_READY.md` is the final handoff.

**What runs where.**

- On the server, Opus checks only compile and framing (Node projection checks and a few SwiftShader stills). The look
  is judged on Codex's native Metal frames.
- Codex renders the proof, reports essential issues, then renders the full film and does technical QA.
