# v9 TREATMENT — 「空气现形 · 翻身」 (Opus 5.5, lead creator and implementer)

Codex is the production assistant: native Metal renders, measurements, builds and fact checks, as ordered in PICTURE_READY.md.

## Diagnosis of v8 (from the real v8 contacts and the native 1080 source)
- The single most spectacular thing in the source is the car leaving the deck upside down and rolling over in mid-air:
  roof → white flank → patterned underside → level, lamps toward camera, then the jets come on. v8 cut it into three
  views and a 3.5 s diagram. It spent 1.75 s on an almost static inverted car, gave the roll 0.8 s from a dark angle,
  and then came back after the diagram with the car already upright. About 59° of the roll was never seen.
- The model's roll was also shaped backwards: slow start, then a snap (60° per 0.1 s), upright by 10.5. The source turns
  quickly onto its side, then **eases out** through a long underside reveal, and is level at about 10.6–10.7.
- There is no moment of scale. Almost every shot is tight on the car, so the 15 m deck never feels high.

## The WOW: 「翻身」, one unbroken shot
The departure itself is the payoff. No flashes, booms or particles are added for effect.

- **Camera:** on the floor below and ahead of the deck's free end, looking up and back at the lip. This is the
  source's close-replay geometry: a long lens, the deck running down the 9:16 frame, the lip at the top. The car comes
  *toward us* as it falls, so a pure longitudinal roll shows exactly the source's order of surfaces, and it ends nose-on
  with the lamps in our eyes. The deck lip stays in frame as the reference until the car is level.
- **Time:** a speed ramp. The shot opens at about ⅓ speed with the car still upside down at the lip. It slows to about
  ¼ speed through the roll (3.3 s on screen for about 0.85 s of source) and stays slow through the underside reveal. It
  returns toward real time once the jets are full, and the car drops into its own cloud. That is tension, then release.
  The slow motion is labelled (tag 「CG重建 · 慢放」), so it is not presented as real flight duration.
- **Camera motion:** locked at first (stillness at the edge). It starts a slow tilt down as the car tips off, then
  *settles* as the car levels and the jets catch it. Once the car plunges, it follows it down to the floor. The floor,
  the columns reaching it and the cloud rolling toward the lens are the scale reveal.
- **Light:** the floor floods light whatever faces down, and from below that is the roof, then the flank, then the
  underside, in the order they turn toward us. A fill on the camera side keeps the white flank and wheels readable.
  Bright lamps alone are not allowed to carry the orientation.
- **Type:** 「密封被破坏，吸附减弱」 is still on screen when the shot starts, and its glyphs *fall away* as the car tips off
  the lip. After that the shot has no text.
- **Sound (sparse, additive, no noise):** the pad drains to near silence at the lip, a held breath. The four rising
  notes of the film's question motif (A–D–E–F#) land one per visible surface: roof, flank, underside, level. At full
  jets a wide, warm G chord blooms with the softest low accent (the catch). The pad then follows the plunge down,
  without resolving: home (D) stays reserved for the final answer.

## New order around it (everything else is retained; A1–D1 and F1–G2 are unchanged in content)
| Film s | Shot | Content |
|---|---|---|
| 0–26.35 | A1–C1 | unchanged |
| 26.35–28.45 | D1 | chase to the free end, 「坡，总有尽头」 (unchanged) |
| 28.45–30.90 | D2 | seal breaks progressively in air vision, 「密封被破坏，吸附减弱」 (1.75 s of the almost static inverted car removed) |
| **30.90–37.40** | **D3 翻身** | **the WOW, one unbroken night shot, source ev 9.62 → 12.55** |
| 37.40–40.40 | E2 | air-vision replay of the catch: 「喷气向下 / 推力向上」, the car still descending |
| 40.40–43.90 | E1 | plate 2: 「车载高压气体」. It now *answers where the gas comes from* after we have seen it work. Before, it interrupted the fall |
| 43.90–68.05 | S, F1, G1, G2 | unchanged in content, shifted +4.55 s; END 68.05 s, 2042 frames |

The film is 4.55 s longer. All of that time goes to the uninterrupted departure, and nothing is padded.

## Science boundaries kept
- The pose is an image-informed fit (POSE_MATCH.md), not measured dynamics. Slow motion is labelled.
- No cause of the roll is claimed. The x-ray replay starts after the car is almost level, so the jets are not shown as
  rolling it (A16/A17). The jets inherit emitter velocity in E2 (unchanged). Thrust up ≠ rising: the car keeps descending.
- Seal loss is progressive (A10). Gravity is white and world-down. No internal hardware is drawn on the car.
