# v7 「空气现形」 — text-led, voice-free, science-corrected cut · TREATMENT

> **Implemented (2026-10-18).** The cut is 59.0 s / 1770 frames. `web/engine/cues.js` is the authority for every time
> and string, and `TEXT_INVENTORY.zh-CN.json` lists them. §3 now matches the implemented cut (corrected at
> `FULL_READY.md`). §6 (sound) is implemented as written; see `AUDIO_READY.md`. The picture freeze after native
> proof01 is `PICTURE_READY.md`.

Director: Opus 5.5 (creative direction delegated by the human). Render, encode, independent QA and source-grounded
fact-check: Codex. Written 2026-10-18, **before** implementation; §3 times are the plan, and `web/engine/cues.js` is the
final authority once the picture is frozen (this file is corrected to match at FULL_READY).

Human steering for this version (the latest two messages):

- *"Background music is not nice, a bit noisy."*
- *"Every principle must stand up; carefully verify, including car structure."*

Plus the director brief built on Codex's 22-claim audit (`SCIENCE_AUDIT.en.md`, `science-claims.json`). v7 is a
separate copy; v1–v6 are untouched. Chinese on-screen text only, no spoken voice, 9:16, 1080×1920, 30 fps, the same
deterministic WebGL2/CDP engine, the same external car/ramp/pose fit. No new engine, no photogrammetry, no new geometry.

## 1. What v6 got wrong (from the audit and the encoded v6 contacts in `references/encoded-v6`)

| v6 picture / text | Problem | Audit |
|---|---|---|
| 「被吸住的？」, then 吸 cracks apart, then 「是空气，把它压在顶上」 | A false "not suction — pressure instead" twist. Suction *is* pressure-difference adhesion. The crack visually says suction is physically wrong. | A04 |
| Two glowing rotors in the floor (B1 x-ray, B2 side view), slit air spiralling into them, a wake out of the tail | Invented hardware: count, position and size are not verified. The patent's claim 1 (underbody inlet → airpath → rear outlet, one or more fans) does not establish the built car's layout. | A02, A21 |
| 「风扇抽走缝里的空气」 with no seal | Fan-only magic. Low pressure is *maintained* by powered airflow **and** ground sealing against leakage. | A03, A20 |
| Gold push "splits into the four tyres" | Conflates the pressure load on the body with the tyre–surface contact force. | A06, A07 |
| 「缝一敞开，压力差就没了」 and the push shattering | A universal instant zero at the first gap. Leakage grows and support weakens progressively; only after fully clearing the surface is the old adhesion unavailable. | A10 |
| 「它自带高压冷气」 and two long capsules inside the car, cyan plumbing to the nozzles | 冷气 also reads as air-conditioning; tank count, placement, shape and plumbing are invented. | A11, A12, A13 |
| 「气往下喷 / 车往上推」 and plumes stretched to reach the floor | Upward thrust does not mean the car rises; jets do not need to push on the ground. | A14, A15 |
| 「喷气偏离重心 → 车就翻了过来」, one cyan beam + arc on the real car | A nozzle away from the COM is not the criterion — the thrust **line** must miss the COM; and one drawn jet is not proof of what flipped the real car (net torque of all jets and other loads, cables of unknown role). | A16, A17, A18 |
| 「花完，就没了」 | Irreversible framing. Stored gas is finite and needs replenishing; endurance unknown. | A19 |
| Small 26 px tag as the only provenance marker | CG reconstruction vs schematic must be unmistakable; force arrows must be marked as direction-only. | A21 |

v6's QA was a technical QA, not a scientific sign-off. v7 treats it that way.

## 2. Idea (kept) and the one structural change

**The air is the invisible protagonist and the type is its voice.** One short Chinese line names one causal step;
the picture shows the cause; the sound is quiet and gives the reading room.

The structural change: **v7 never draws guessed internals inside the car.** Wherever the explanation needs internals,
the film steps *out* of the reconstruction into a framed, clearly abstract **functional diagram** — boxes, a fan
symbol, a valve symbol, a nozzle symbol, flowing dots — whose header reads 「功能示意 · 非实车布局」 in readable type.
The car itself stays an external, source-fitted CG reconstruction (body, wheels, ramp, poses), labelled 「CG重建」.

Three worlds, three labels:

| World | What it is | Label (top left, or panel header) |
|---|---|---|
| Night | the CG reconstruction of the demo (external fit) | 「CG重建」 (with the source line at the start) |
| Air vision | the same reconstruction in a pressure/force view | 「原理示意 · 非实拍」 + 「箭头只示方向，长度不按比例」 whenever force arrows are on screen |
| Diagram plate | a separate abstract system, not the car | panel header 「功能示意 · 非实车布局」 (fans, gas) or 「原理示意 · 长度不按比例」 (torque) |

Night shots that carry a schematic overlay (the tyre contact glow, the closing sweep) say 「CG重建 · 叠加示意」.

## 3. Structure (as implemented: 59.0 s = 1770 frames at 30 fps; every time and string from `web/engine/cues.js`)

| Act | Shot | s | World | Screen text | Picture |
|---|---|---|---|---|---|
| Hook | A1 | 0.0–3.6 | night | 它凭什么不掉？ (+ 「CG重建 · 据特斯拉 2026.10.16 发布的视频」 until 3.3 s) | Frame-0 poster, unchanged: the inverted car big and rim-lit under the finite flat ceiling, dust falling past it, whole car in frame. |
| Question | A2 | 3.6–5.85 | night | 吸附从何而来？ (吸附 gold) | Head-on at the slit between car and ceiling. No crack: the question is legitimate. |
| Air | A3 | 5.85–9.55 | → air (Ping 5.95) | 空气， / 从四面八方压着它 | The Ping turns the venue into air vision. On 压 (7.15 s) a storm of gold impacts lands on every exposed face: pressure acts on all surfaces. No net push yet. |
| Mechanism | B1 | 9.55–13.8 | diagram | 风扇 + 密封 / 维持车底低压 | **Diagram plate 1**, header 「功能示意 · 非实车布局」 (surface on top, like the ceiling): hatched 坡面; an abstract 车体 block; the gap between them tinted ice, labelled 低压区·有空气 (lower pressure, air still in it); 密封 marks at both ends where a trickle of air leaks in; inlet → duct → a generic 风扇 symbol → outflow arrow. Dots flow continuously: the fan must keep running because the seal leaks. |
| | B2 | 13.8–21.1 | air | 外面 气压高 / 车底 气压低 → 压力差 / 把车压向坡面 → 轮胎被压紧， | Side view of the external car in air vision (no rotors, no wake). Dense gold impacts outside; the drained gap nearly quiet. The impacts converge into one gold push toward the ceiling (17.55 s). On 压紧 the push **stays on the body**; the four contact patches light lilac, short lilac reaction arrows point away from the ceiling into the tyres, and a white gravity arrow points down — three distinct forces. |
| | B3 | 21.1–23.6 | night (+overlay) | 才抓得住 | Tyre macro on the ceiling, lilac contact glow; the car pulls away on the grip hit. |
| System | C1 | 23.6–28.0 | air | 这股力，始终压向坡面 / 重力，始终向下 | Hologram ramp, ghost poses; gold needles into the surface all around the curve; white gravity arrows parallel and down. |
| Free end | D1 | 28.0–30.1 | night | 坡，总有尽头 | Chase toward the finite deck's free end; the edge lights (28.6 s). |
| | D2 | 30.1–33.0 | → air | 密封被破坏， / 吸附减弱 | As the floor crosses the edge, outside air pours into the opened gap (leakage) and the gold push **shrinks with the share of floor still over the deck** — no shatter, no instant zero. When the floor is fully clear the push is gone; gravity remains and the car begins to sink. |
| | D3 | 33.0–33.8 | night | (the card falls away, glyph by glyph) | From below: the car leaves the deck and drops. |
| Own gas | E1 | 33.8–37.3 | diagram | 车载高压气体 | **Diagram plate 2**, header 「功能示意 · 非实车布局」: a crowded 储气 vessel → 控制阀 (valve symbol) → 喷口 (nozzle symbol); when the valve opens (35.0 s), 喷气 streams out downward and a cyan 推力 arrow points up. No flame. The vessel thins slightly as gas leaves (finite). |
| | E2 | 37.3–40.3 | air | 喷气向下 ↓ / 推力向上 ↑ | The external car in air vision, still descending: short cyan plumes straight down from the under-body, drawn relative to the car (gas leaving a moving nozzle inherits its velocity; no flow simulated) and never reaching the floor; a cyan thrust arrow up through the car; white gravity down. The car keeps moving down while thrust points up — the picture itself shows thrust ≠ rising. The source fit's forward nose jet is left to the night reconstruction (E3). No internal vessels or plumbing; no nozzle count implied. |
| | E3 | 40.3–41.0 | night | — | Into its own white cloud (as in the source). |
| Other demo | S | 41.0–42.0 | black | 另一场演示 + 「CG重建 · 据马斯克 2026.10.16 发布的视频」 | Hard cut, quiet. |
| | F1 | 42.0–49.95 | night → plate → night | 推力线不过重心， / 就产生转矩 → 实际翻转看合转矩 (+ the note 「画面中可见细线，作用未公开」, 42.5–49.75 s) | The kickflip rises on jets; at 43.1 s time freezes, a dark veil drops over the frozen frame and **Diagram plate 3**, header 「原理示意 · 长度不按比例」, appears: two identical abstract bodies with the nozzle at the same off-centre spot. Left: thrust line through 重心 → 无转矩. Right: the line misses 重心 → 力臂 → 有转矩 (curved arrow). At 47.05 s the veil lifts and time resumes; 实际翻转看合转矩; the car flips (47.9 s). The cables stay in the reconstruction; the note's leader is hidden while the plate is up. |
| Close | G1 | 49.95–59.0 | night (+overlay) | 坡上，借大气压 / 空中，花自带的气 → 储气有限，需补气 → **空气现形** | The ramp wide. Gold sweeps the driving surface; the cyan airborne path appears. Then the finite, refillable reserve, and the title (56.4 s) with both source lines, 「车与坡道按视频外形拟合，未做力学验证」 and 「风扇与储气为功能示意，非实车布局；箭头不按比例」. Picture and type fade out together over 58.55–58.98 s. |

**Proof range:** frames 0–413 = 0.0–13.8 s (A1–B1): the poster, the corrected question, the pressure reveal and diagram
plate 1 (`render.mjs --proof`, `out/audio/master.proof.wav`).

## 4. Visual language

- **Night** — the photoreal CG reconstruction (floods, haze, dust, red neon). Unchanged look.
- **Air vision** — navy void, ice rim light, the air as motes, pressure as gold impacts, own gas in cyan.
- **Diagram plates (new)** — drawn as clean vector line art over the air-vision void: a thin framed plate with corner
  ticks and a dark glass fill; 2.5 px glowing strokes; engineering symbols (hatched surface, fan, valve, nozzle,
  ⊕ for the centre of mass); dots that flow along the paths. They are deliberately *not car-shaped*: an abstract
  block stands for the body. The header label is 34 px, not a footnote.
- **Force colours** — gold = air-pressure load (always toward the nearby surface); white = gravity (always world
  down); **lilac (new)** = tyre–surface contact force (reaction away from the surface; never gold); cyan = thrust /
  own gas. Arrow lengths are not to scale, and the tag says so whenever arrows are on screen.
- **Removed:** the floor rotors (shader discards the `fan` material, so the intact underbody shows), the x-ray fan
  overlay, slit-air spirals into fan positions, the leak-to-fan streams, the tail wake, the in-car gas vessels and
  their plumbing, the push "shatter", the 吸 crack, the 3D COM mark/beam/arc on the real kickflip car.
- **Kept:** the finite flat ceiling and free end, source poses and camera geography, the frame-0 poster framing,
  the Ping, the impacts, the convergence, C1's needle field, the kickflip cables and note, no white flashes.

## 5. Typography and reading

Bundled Roadster Film Sans (Noto Sans SC OFL subset), weights 300/500/700/900, rebuilt from the same official source
(sha256 `a3041811…`, identical to v3–v6 provenance) to add the new characters (功, 控制, 破坏, 减, 而, 限, 需, 臂 …).
Roles and sizes are unchanged from v6; the top-left tag grows from 26 px to 28 px and gains the arrow note line.

Reading rule unchanged: R(n) = max(1.2 s, 0.4 s + 0.2 s × n CJK characters); after the last line lands the card holds
≥ R(that line), and from the first landing ≥ R(whole card). ≤ 2 lines, ≤ 10 CJK per line, safe area x 110–970,
y 200–1460. Diagram plates are additionally held long enough for their labels (checked and reported by
`tools/text_inventory.mjs`), and cards never share screen space with a plate.

## 6. Sound (rebuilt from zero)

The v6 score was judged noisy. v7 replaces it with a **sparse, warm technological ambient bed**: a soft pad on a
consonant chord progression (no clusters), a small five-note motif on a gentle mallet/glass tone that returns at the
three turns (the question, the low-pressure diagram, the close), lots of space, and **no** rain, crackle, hats, dust
ticks, high whines, industrial noise or glitches. Booms are gone; at most a few soft low accents mark causal turns
(the pressure reveal, the push, the seal breaking, the thrust, the flip, the title). No voice. Master ≈ −20 LUFS
integrated, true peak ≤ −6 dBTP, moderate low end, sample-locked to the picture. Stems (pad, motif, accents, air)
are written alongside the master for future balancing.

## 7. Locked facts and their limits

- **Adhesion:** fans plus ground sealing maintain a lower pressure under the car; the outside (atmospheric)
  pressure is higher; the difference presses the car toward the nearby surface. Suction is this mechanism. The gap still holds
  air at a lower pressure: a partial vacuum in the engineering sense, never empty space (on screen 「低压区·有空气」).
  Maintaining it takes continuous power (no figures given).
- **Forces:** pressure load toward the surface; gravity world-down; tyre normal reaction away from the surface;
  tyre traction tangential. Static flat ceiling: N = Fp − mg, so Fp must exceed mg for positive tyre load — the
  film never asserts a measured margin, force size or performance.
- **Seal loss:** leakage grows as the seal opens and adhesion weakens; fully off the surface the old adhesion cannot
  support the car in the same way. No universal instant zero.
- **Cold gas:** high-pressure gas expelled through nozzles gives a reaction opposite to the exhaust momentum; no
  combustion, no flames; jets do not need to push on the ground; thrust up does not imply the car rises. The
  reserve is finite and needs replenishing; endurance unknown.
- **Torque:** τ = r × F; a thrust line that misses the COM gives a torque about it; a nozzle merely being away from
  the COM is not enough; the real manoeuvre follows the net torque of all jets and other loads. The kickflip is a
  separate demonstration with visible lines of unknown role.
- **Not shown or claimed:** actual fan/tank/valve/nozzle layout, counts, pressures, gas species, temperatures,
  materials, control laws, masses, inertia, forces or endurance; that the flying demo is a stock feature of every
  Roadster configuration; that older Tesla/SpaceX material describes this 2026 build; that the visual fit was
  force-solved or structurally validated.

## 8. Production

- `web/engine/cues.js` stays the single source of time, strings and colours; `timeline.js` maps shots onto it;
  `text.js` draws the cards, tags and notes; the new `web/engine/diagram.js` draws the three plates (Canvas2D in the
  existing type layer — no new engine). No Chinese literals outside `cues.js`.
- Sequence: picture first → `PICTURE_READY.md` + `PICTURE_LOCK.json` (web/ frozen) → Codex native Metal spot proof and
  full render, while Opus finishes the audio, `TEXT_INVENTORY.zh-CN.json` and the docs → `FULL_READY.md`.
- On this server only compile/framing checks (Node projections, a few SwiftShader stills). The look is judged on
  Codex's native frames. No approvals are claimed by Opus.
