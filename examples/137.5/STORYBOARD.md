# 137.5° · storyboard

An original short film, made without reference material. One rule (turn 137.5° and grow one more seed) builds a sunflower, hides the Fibonacci numbers inside it, shows why no other angle works as well, appears in other plants, and finally emerges by itself from a simple growth model. Every frame is drawn by JavaScript on a canvas and every sound is synthesized with Web Audio.

## Idea

The picture and the sound come from the same numbers. Each seed, scale, leaf and bud plays a note chosen by its angle on a two-octave pentatonic scale. A simple-fraction angle such as 90° or 144° is heard as a short loop at the same moment its spokes appear; the golden angle is heard as a melody that never repeats.

## Acts (30 fps, 120 BPM grid)

| Time | Act | Picture | On screen (ZH / EN) | Sound |
|---|---|---|---|---|
| 0:00–0:21 | I · One rule | One seed; a protractor marks 137.5° between seeds 1–8; growth accelerates to 1,500 seeds | 一颗种子。/ 转 137.5°，再长一颗。/ 就这一条规则，一遍又一遍。 | each seed's note: bells, then a cascade of plucks |
| 0:21–0:41 | II · Hidden numbers | 34 spiral arms counted one by one in gold, then 55 in rose; zoom from the centre outward through the families 8, 13, 21, 34, 55, 89 | 34 条螺旋朝一边，55 条朝另一边。/ 从中心往外数……/ 每个数都是前两个数之和 | counting ticks rise in pitch; a bell per family |
| 0:41–0:52 | II · φ | Ratios 2/1 … 89/55 hop across a number line that zooms in on φ; a full turn split into 222.5° and 137.5° | 相邻两个数的比，越来越接近 φ。/ 用 φ 把一整圈分开…… | each ratio is a tone whose distance from a steady A shrinks |
| 0:52–1:06 | III · Other angles | The head regrows at 90°, 120°, 144°, 138.46° and 137.2°: spokes and gaps; then the golden angle | 换一个角度试试。/ 简单的分数都会重复…… | audible loops of 4, 3, 5 and 13 notes, then the wandering golden melody |
| 1:06–1:17 | III · Why | φ as a continued fraction of ones, receding into depth | φ 是最难被分数逼近的数……/ 所以黄金角永远不会对齐。 | one bell per level, sinking in pitch |
| 1:17–1:24 | III · Bloom | The head tilts into 3D; 55 petals unfold in golden-angle order | 每一颗都挤得下，一点空间都不浪费。 | the golden melody's first full statement |
| 1:24–1:48 | IV · Everywhere | A pinecone (8 / 13), a pineapple with a golden-angle crown, a succulent rosette | 同一个角度，长在许多植物上。/ 叶子这样错开…… | a light groove; every scale, fruitlet and leaf sounds its angle |
| 1:48–2:11 | V · Nobody calculates | A growing tip; each new bud forms where it has the most room; the angle between buds falls from 180° and settles near 137.5° on a live chart | 可是，植物怎么知道 137.5°？/ 它不知道……/ 角度自己落到了 137.5° 附近。 | the buds' melody starts as an octave seesaw and becomes the golden melody |
| 2:11–2:30 | Finale | One sunflower backlit at dusk; the camera rises over a field of silhouettes; title | 自然不会计算。它只是一直在长。/ 137.5° · 一个角度 · 360° ÷ φ² ≈ 137.5° | full pads and the golden melody twice |

## Facts used on screen

- Golden angle = 360° × (1 − 1/φ) = 360° ÷ φ² ≈ 137.5078°, with φ = (1 + √5) / 2 ≈ 1.6180339887.
- Seed model: seed k at angle k · 137.5° and radius ∝ √k (H. Vogel, 1979). In this model the arms of seeds 34 apart wind one way (−4.7° per step) and those 55 apart the other (+2.9°), matching the on-screen counts.
- Parastichy families grow with radius: roughly 8/13 near the centre up to 55/89 at the rim of a 1,500-seed head.
- Rational angles form spokes: 90° → 4, 120° → 3, 144° = 2/5 turn → 5, 138.46° = 5/13 turn → 13.
- φ's continued fraction is [1; 1, 1, 1, …], so it is the irrational number worst approximated by fractions.
- Act V uses a repulsion model after S. Douady & Y. Couder (1992, 1996): buds form on the rim of a growing apex where the summed repulsion 1/d³ from earlier buds is weakest, while the growth parameter slowly falls (0.9 → 0.08). The simulated divergence starts at 180° and settles between about 136.5° and 140.5°, closing in on 137.5°. Precomputed by `tools/emerge.mjs`.
- Pinecones and pineapples commonly show 8 and 13 spirals (sometimes 5 and 8); the drawn models use the golden angle on surfaces of revolution and their nearest neighbours are 8 and 13 apart.
