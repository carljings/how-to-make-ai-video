# Production log — Rubik's Cube r6 (full cut with an impact layer)

Date: 2026-10-25. r5's log stays in `../rubiks-r5-20261025/PRODUCTION_LOG.md`.

## Request and scope

After r5, the user chose the full cut and asked for stronger motion: "use the full, but the motion effects is not very cool and amazing, you should let watcher eyes lit up wow". r6 keeps r5's timeline, captions, facts, cube renderer and score, and adds an effects layer (`src/lib/fx.js`, `src/hero.js`) keyed to the cue table. The score gains one whoosh under the opening camera whip.

## Checks before the full render

- Preview strips at every hero beat before the full render. Fixed from these: the solved-cube shine had hard edges (now a soft radial glint); sticker shards covered the 2.51 and 4325 numbers (now sparks, or bursts placed clear of the numbers); the bloom pulse washed out frames (pulse lowered to 0.2); the opening burst moved down to the cube.

## Render

- Started 21:01 with three Chrome lanes. The machine (4 cores, 7.9 GB, no GPU) was already short of memory because of leftovers from other sessions. From about 21:20 it thrashed swap, the OOM killer stopped one Chrome at 22:09, and the dropped SSH session closed Claude Code and the render. Twenty finished chunks survived.
- Resumed on two lanes, launched with `setsid nohup`. With the user's approval, idle leftovers were then stopped (seven finished Opus jobs, seven old headless Chromes, a vite preview server), and two RAM-disk folders were moved to `/root/shm-archive-20261025/` (counts and bytes verified). About 4.5 GB was freed. At the user's request, the last ten chunks were rendered on three lanes at nice 10; free memory stayed above 4 GB.
- Picture done 22:48. The score took 461 s, and the finished file was ready at 22:57.

## Checks on the delivered file

- `out/rubiks-r6-full.verify.json`: 3795 frames, 126.5 s, 1080×1920 at 30 fps, −14.18 LUFS, true peak −1.99 dBTP, no decode errors, pass.
- Four 1 fps contact sheets of the whole film read in full: captions, numbers and transitions match r5, and the effects appear at each beat.
- 0.1 s strips from the encoded file at the 2.51 slam, the flip to 20, 4325, the 20 slam and the "第 6" stamp: every effect fires on its cue.
- One sheet tile at 29.9 s looked washed out. It is r4's single-frame flash into the "20 steps" act, present in r5 at the same frames (luma 73 → 101). The flash frames on every hit are r5's, about 15–20 % brighter because of the bloom pulse; they are single frames seconds apart.
- Known trade-off: the red dust from the stamp crosses "广州决赛 · 第 6" for about 0.4 s before it settles. The caption above carries the same words.

Limits: no one has listened to the score; no physical-phone test; whether the effects raise retention is untested.
