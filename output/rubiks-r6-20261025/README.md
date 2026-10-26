# Rubik's Cube r6: the full cut with an impact layer

**English** · [简体中文](README.zh-CN.md)

r6 is r5's `full` cut (126.5 s, same timeline, captions and score) with motion built to make viewers say "wow". The user's note on r5: "the motion effects is not very cool and amazing, you should let watcher eyes lit up". Movie: `out/rubiks-r6-full.mp4`.

New in `src/lib/fx.js` and `src/hero.js`, all pure functions of film time (seeded randomness, no state):

- **Every frame:** a quarter-resolution bloom (a blurred, contrast-lifted copy screened back over the frame) and drifting dust with parallax.
- **On every hit:** camera shake with a zoom punch, expanding shockwave rings, cube-sticker shards, bright sparks, and an RGB split on the hero numbers.
- **Hero beats:**
  - a camera whip-in with speed lines on the opening solve
  - red rays behind the 2.51 slam, violet rays when 20 lands
  - a gold shockwave on the explosion, gold rays on 4325 亿亿
  - a light comet on each growing search ring, with a pulse for every step
  - a burst where the two searches meet
  - proof tiles flipping in a wave as the sweep passes
  - the biggest burst of the film on the 20 drop
  - a shockwave on the 2.51 landing and red dust under the stamp
  - a ring at every completed solving stage, and a glint across each solved cube
  - sparks on the 3.51, 4.20 and 4.81 reveals
  - slow spotlight beams at the ending

The cube renderer, captions, layout and facts are r5's. The score gains one whoosh under the opening whip-in.

Render: `tools/render-r6.sh` (three Chrome processes on disjoint chunk ranges, then concat, score, master, verify). Three lanes need about 5.4 GB of free memory; check `free -m` first. Checks made, the out-of-memory incident during the render, and the limits are in [PRODUCTION_LOG.md](PRODUCTION_LOG.md). The score has not been listened to by anyone.
