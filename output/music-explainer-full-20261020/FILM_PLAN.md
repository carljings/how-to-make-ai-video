# 《这首开智小曲，为什么上头？》 full film: plan, storyboard, colours (Opus 5.5)

The film runs **40.467 s** (1214 frames, 1080×1920 at 30 fps) as flat 2D graphics, drawn in Canvas 2D. It is built on the user's approved 10 s preview, with the user's latest notes applied: a flat Clawd in the official colour, the whole film completed, and attention to colour.

## Clawd and colour reference
- **Clawd's silhouette.** The 12×8 pixel grid was measured from the official Claude.app install animation (`clawd-laptop.mov`): body 8×6, eyes 1×1, arms 2×2, four legs 1×2. Clawd is drawn **flat**: solid rectangles, no light, shading, blur, blend or tint.
- **Clawd's colours.**
  - Body `#d97757`: Anthropic's published brand orange, from claude.com's skills article, Skill example 2 "brand-guidelines" (verified by Codex).
  - Eyes `#141413`: the brand dark from the same page.
  - The exact RGB of the Claude Code CLI mascot was **not** independently confirmed, so it is not claimed.
- **The whole film uses only that brand set:**

  | Colour | Role |
  |---|---|
  | `#141413`, `#1d1c1a`, `#262522` | Dark grounds |
  | `#faf9f5` | Text |
  | `#e8e6dc` | Expectation rings |
  | `#b0aea5` | Loudness bars, footnotes |
  | `#d97757` | Payoff, bass, Clawd |
  | `#6a9bcc` | The missing beat, the waiting phase |
  | `#788c5d` | Familiarity |

- **Encoding.** RGB→YUV is converted with the BT.709 matrix, the same one the stream is tagged with. A test round trip of `#d97757` returned (215,118,86); the previous default path gave (224,126,82). `verify.mjs` samples Clawd on the first and last frames.

## Music: original BGM only (`tools/bgm_full.py`)
- **A:** source 15.810–39.2359 s → film 0–23.426.
- **B:** source 9.4505–26.471 s → film 23.426–40.446.
- **The join:** one equal-power 25 ms crossfade that ends 2 ms before B's measured downbeat. That downbeat lands exactly where A's next downbeat would have been. B's bar 4 follows the song's "lighter" bar type, as bar 17 does.
- **Processing:** a 2.6 s raised-cosine fade-out ends the film, the picture holds 20 ms past the sound, and one constant gain keeps the true peak ≤ −1 dBTP.
- **Integrity:** original speed and pitch. No new music, voice or sound effects.

## Storyboard (film seconds; each claim appears after the moment that shows it)

| Time (s) | Music | Picture / text |
|---|---|---|
| 0–1.66 | Thin bar, eighth-note attacks | Measured strip (grey loudness, orange bass base) scrolls past 现在. Rings (示意) fill as attacks meet them. Title "这首开智小曲 / 为什么上头？". Callouts 听到的 · 实测, then 预期的 · 示意 |
| 1.62–2.98 | The one missing attack | The ring stays hollow, blue: "这一下没出现". Clawd startles. "少了一下，你却在等它" |
| 2.98–4.26 | Build | "节拍一重复，大脑就预期下一拍". The downbeat ring swells: "重拍 · 该来了" |
| 4.28–6.35 | Drop 2 | The ring fills orange, a shock ring, warm bloom, Clawd spins: "等到了！重拍正落在预期的那一拍". "低音回来 · 实测" |
| 6.35–9.9 | Groove → recap | Clawd dances on the beat. The record zooms out with brackets 规律 / 少一下 / 等到: "原因① 听出规律 → 预期 → 等到" |
| 9.9–12.8 | Groove | The brain draws in (flat sagittal schematic, 示意): "那'等'的那几秒，为什么也上头？" |
| 12.8–17.04 | The song's next thin bar and build | The caudate glows blue; the mini timeline marks 期待: "等的时候：尾状核更活跃". Source footnote |
| 17.04–19.17 | Drop 3 | The nucleus accumbens glows orange; 高潮 is marked: "落下的那一刻：伏隔核更活跃", then "原因② 等待本身，也在奖赏里" |
| 19.17–23.43 | Groove | "那么，越意外越好听？", then "不一定。" The uncertainty × surprise map draws in |
| 23.43–27.68 | Groove (after the join) | Clawd, as the map's probe, hops to the warm corners: "很好猜的时候，来点意外更好听", then "很难猜的时候，落回预期更好听". Footnote |
| 27.68–29.81 | Groove | "原因③ 再听一遍会怎样？" |
| 29.81–34.07 | The opening thin bar and build, again | A green "第一遍" ghost row of the opening bars lines up exactly with "这一遍": "同一段原曲 · 实测". "这一段，开头听过", then "这一次，你知道它要来" |
| 34.07–35.3 | Drop 2 again | "又等到了！" Shock ring, Clawd spins |
| 35.3–40.47 | Groove, fading out | "为什么上头？" Four reasons arrive one per beat (①②③④), then "这些是一部分原因，因人而异". The record shrinks to a band, Clawd waves, the music fades, and the image holds |
