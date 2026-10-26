# Production log — Rubik's Cube r5 (three cuts)

Date: 2026-10-25. r4's own log stays in `../rubiks-recut-20261025/PRODUCTION_LOG.md`.

## Authorization and scope

The user asked to optimise r4 "from the aspects of motion effects, subtitles, and logic, so that it can retain viewers in the first few seconds and increase the completion rate". The r5 storyboard was proposed with three options (full ~120 s, light fix ~180 s, middle ~150 s) and a choice of hook. The user chose the 2.51 → 20 hook and asked for all three options ("123 do all for me"). Earlier lessons kept: r2 was rejected for added styling, pauses and an engine change, so r5 keeps the Opus renderer, fonts, camera language and score method and adds no new UI.

## Method

- Independent copy of r4's source (`rubiks-recut-20261025`); r4 itself untouched.
- One codebase, three cuts: `src/timeline.js` holds a cue table, a plan and act kickers per cut; `src/film.js` builds the scene order from the plan; scenes, move sequences (`src/seqs.js`) and the score (`src/score.js`) read only cues, so every hard-coded second in r4's opening, origin, sequence and rule code was converted to cue-relative time.
- New scenes and beats reuse existing pieces: the split-flap (r4's 20 → 2.51 in reverse), the opening's stamp style for “广州决赛 · 第 6”, r4's origin act compressed to three seconds for the mid cut.
- Score: same instruments and patterns, each section anchored to its cue; loops clip at section ends (`until`); search notes sit on their moves; new hits for the flip landing and the stamp. The flip hit was lowered after measuring that it peaked 1.8 dB above the record slam.
- Fonts: the 89 characters each weight needs beyond the base subsets were cut from Noto Sans SC 2.004 (Google Fonts `NotoSansSC[wght].ttf`, SHA-256 `a3041811…`, identical to r4's recorded master) with `tools/extend-fonts.py`; the 13 original font files are byte-identical.
- Renderer: Chrome headless with SwiftShader on this CPU-only Linux machine. A 30-frame test against r4's Metal render of the same time range gave SSIM 0.985 (PSNR 36 dB), with no visible difference at 1:1.

## Checks before the full render

- Syntax of every module; a still from each cut with no page errors.
- One frame per second of every cut (23 contact sheets) read in full: captions, overlaps, continuity. Fixed from these: the counting-rule demo now scales with its beat (in the 3-second full-cut beat the 180° chip had appeared with only 0.7 s left); the mid cut's history footnote moved off the callout lines.
- 0.1-second strips across 14 scene boundaries (flip, hand-offs into the count and origin acts, scramble → explosion, rule, slam → hook, stamp, hook → methods, methods → average, average → race, race → ending, mid's colour flood). Fixed: the departing 20 now clears before the rising cube reaches it; the methods label waits for the cube.
- A code-review workflow (four reviewers: timing, score, scene logic, captions and facts; two independent verifiers per finding) ran during the first render. It stopped when the session paused, after all four reviews; the verifiers had confirmed the main bug and found every other reported defect already fixed in the current code.

## First render and what the review changed

The first full render (all three cuts, ~2.5 h with three Chrome processes) produced correct pictures: frame counts, durations and full decode passed, loudness −14.15 LUFS. Two cuts failed one gate: true peak in the delivered AAC was −1.32 dBTP (full) and −1.28 dBTP (light), above the −1.5 limit, although the masters measured −2.2/−2.4 dBTP. AAC added up to 1.1 dB.

Fixed from the review, then re-rendered as 25 three-second chunks plus all three scores:
- `label()`, `bigNumber()` and `odometer()` set `globalAlpha` themselves, so fades applied through an outer alpha never took effect. Effects: the departing “20 步 · 上帝之数” stayed opaque over the rising cube until the cut, the “单次世界纪录” stamp text popped off, the slot machine's “？” popped on, and mid's year ticker and name flip ignored their fades. Every fade is now passed to the helper.
- Brief text: the record card's name line now fades in with the stamp, and the “2.51 秒” caption starts at the slam with a tighter stagger. In mid's history beat the callouts read about 0.75 s (was 0.53 s), the disclaimer stays across the beat, and the 1980 end state holds.
- The camera's pitch change at the start of LBL is eased over 0.3 s (r4 jumped in one frame).
- The “第 6” stamp lands on beat 4 of the half-time bar with the groove's snare (it was 0.1 s after it, a double hit).
- Mid and light search moves are now 0.5 s apart on the beat grid, so the notes that follow them stay in time.
- Full cut harmony: the race turnaround and the bar before the ending keep their cadence into the next chord.
- Mastering: limiter ceiling 0.68 (was 0.74) through `FINISH_LIMIT`, masters at −3.1 dBTP.

Captions and facts, a third pass of six chunks: “4325 亿亿种打乱” became “超 4325 亿亿种打乱” (the fact table forbids the figure without an approximation marker; the exact count is 4325.2003 亿亿), and “人手最快 2.51 秒” became “人类纪录 2.51 秒” (2.51 is the official best as of the check date, not a human limit), with the dated WCA footnote kept on screen under it.

Limits: the score has not been listened to by anyone; no physical-phone test has been made; retention gains are a design intent, not a measured result.
