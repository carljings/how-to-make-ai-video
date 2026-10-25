# Cue sheet —《两次起飞》（由 `tools/cues.mjs` 生成，勿手改）

音乐：用户指定参考视频 BGM，实测 141.945 BPM（拍 0.4227 s，小节 1.6908 s，首小节线 0.0606 s）。片时间 = 曲时间；帧 = round(t×30)。
“检测起音”来自 `tools/music_analyze.py` 对实际音轨的谱通量检测（不是网格）；“帧−起音”是该帧时刻与最近检测起音之差。

| cue | 剪切 | 要求的位置 | 网格 s | 检测起音 s | 帧 | 帧时刻 s | 帧−起音 ms | 强度 | 频带 |
|---|---|---|---|---|---|---|---|---|---|
| hook | A1 | film start = music 0 s (first onset) |  | 0.0497 | 0 | 0 | -50 | 21.773 |  |
| q |  | bar 0 beat 2 | 0.906 | 0.9069 | 27 | 0.9 | -7 | 3.864 | mid+snare+high |
| inv | A2 | bar 1 beat 0 | 1.7514 | 1.7507 | 53 | 1.7667 | 16 | 4.683 | mid+snare+high |
| run | A3 | bar 1 beat 2 | 2.5968 | 2.5966 | 78 | 2.6 | 3 | 3.756 | mid+snare+high |
| stop | A4 | music stop (measured: RMS < −30 dBFS) |  | 3.46 | 104 | 3.4667 | 7 |  |  |
| slam | A5 | bar 3 beat 0 | 5.133 | 5.1321 | 154 | 5.1333 | 1 | 2.522 | low+snare+high |
| rew | A6 | bar 3 beat 3 | 6.4011 | 6.3835 | 192 | 6.4 | 17 | 5.157 | mid+snare+high |
| cut | P1 | bar 4 beat 1 | 7.2465 | 7.228 | 217 | 7.2333 | 5 | 6.822 | mid+snare+high |
| gap |  | bar 5 beat 0 | 8.5146 | 8.515 | 255 | 8.5 | -15 | 6.087 | mid+snare+high |
| press | P2 | bar 5 beat 2 | 9.36 | 9.358 | 281 | 9.3667 | 9 | 5.632 | mid+snare+high |
| weight |  | bar 6 beat 0 | 10.2054 | 10.2048 | 306 | 10.2 | -5 | 3.278 | mid+snare+high |
| lip | P3 | bar 7 beat 0 | 11.8962 | 11.895 | 357 | 11.9 | 5 | 3.378 | low+mid+snare+high |
| jets | P4 | bar 8 beat 1 | 14.0097 | 13.9925 | 420 | 14 | 8 | 5.034 | mid+snare+high |
| gas |  | bar 9 beat 0 | 15.2778 | 15.2624 | 458 | 15.2667 | 4 | 3.119 | mid+snare+high |
| map | M1 | bar 10 beat 0 | 16.9686 | 16.968 | 509 | 16.9667 | -1 | 2.952 | snare+high |
| mapL |  | bar 10 beat 1 | 17.3913 | 17.3913 | 522 | 17.4 | 9 | 3.946 | mid+snare+high |
| mapR |  | bar 10 beat 2 | 17.814 | 17.8128 | 534 | 17.8 | -13 | 3.348 | low+mid+snare+high |
| mapN |  | bar 10 beat 3 | 18.2367 | 18.2348 | 547 | 18.2333 | -1 | 2.754 | low+mid+snare+high |
| lift | B2 | bar 11 beat 0 | 18.6594 | 18.6809 | 560 | 18.6667 | -14 | 2.033 | low |
| roll | B3 | bar 12 beat 0 | 20.3502 | 20.3473 | 610 | 20.3333 | -14 | 3.962 | mid+snare+high |
| btIn |  | bar 12 beat 1 | 20.7729 | 20.7556 | 623 | 20.7667 | 11 | 2.94 | mid+snare+high |
| btOut |  | bar 12 beat 3 | 21.6183 | 21.6004 | 648 | 21.6 | 0 | 4.605 | mid+snare+high |
| wide | B4 | bar 13 beat 0 | 22.041 | 22.039 | 661 | 22.0333 | -6 | 4.538 | mid+snare+high |
| lab | L1 | bar 14 beat 0 | 23.7318 | 23.7311 | 712 | 23.7333 | 2 | 3.397 | low+mid+snare |
| fireA |  | bar 14 beat 1 | 24.1545 | 24.1545 | 725 | 24.1667 | 12 | 2.446 | low+mid+snare |
| fireB |  | bar 15 beat 0 | 25.4226 | 25.4244 | 763 | 25.4333 | 9 | 2.812 | mid+snare+high |
| brake |  | bar 16 beat 0 | 27.1134 | 27.11 | 813 | 27.1 | -10 | 6.684 | mid+snare+high |
| replay | B5 | bar 17 beat 0 | 28.8042 | 28.8222 | 865 | 28.8333 | 11 | 3.182 | low+mid |
| lines | B6 | bar 18 beat 0 | 30.495 | 30.4982 | 915 | 30.5 | 2 | 2.274 | mid+snare+high |
| sum1 | S1 | bar 19 beat 0 | 32.1858 | 32.2055 | 966 | 32.2 | -5 | 1.87 | low+mid |
| sum2 | S2 | bar 19 beat 2 | 33.0312 | 33.0318 | 991 | 33.0333 | 2 | 3.067 | mid+snare+high |
| sum3 | S3 | bar 19 beat 3 +1/2 | 33.6653 | 33.6653 | 1010 | 33.6667 | 1 | 3.36 | low+mid+snare+high |
| outro | S4 | bar 20 beat 2 | 34.722 | 34.7196 | 1042 | 34.7333 | 14 | 3.078 | mid+snare+high |
| land |  | ending: song bar 0 beat 0 (source 0.0497 s + 35.5144) | 35.575 | 35.5641 | 1067 | 35.5667 | 3 | 21.773 | low+mid+snare+high |
| title | E1 | ending: song bar 1 beat 0 (source 1.7507 s + 35.5144) | 37.2658 | 37.2651 | 1118 | 37.2667 | 2 | 4.683 | mid+snare+high |
| end |  | the song’s own stop again, at the end (source 3.46 s + OFF_END) |  | 38.9744 | 1169 | 38.9667 | -8 |  |  |

最大 |帧−起音| = 17 ms，平均 7.2 ms（1 帧 = 33.3 ms）。

## 音乐自身的事件与片尾

| 事件 | 时间 s | 说明 |
|---|---|---|
| music stop (its own break) | [3.46,4.815] | leave-the-deck slow motion sits in it; not an edit |
| bass drop-out (in the music) | [[30.495,31.763]] | the "visible lines" caveat sits in it |
| splice into the song’s own opening (15 ms crossfade, the opening is silent there) | [35.5401,35.5551] | film = source + 35.5144 s from here |
| the song’s own stop (ending) | 38.9744 |  |
| stop tail to digital zero | [38.9744,39.2244] |  |
| picture fade to black | [38.9944,39.4744] |  |
| digital silence + black | [39.2244,39.8] |  |
| music hard cut in the source (never used) | 36.014 |  |
| platform end-card sound (never used) | [37.068,37.483] |  |
