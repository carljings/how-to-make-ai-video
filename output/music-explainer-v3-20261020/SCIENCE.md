# SCIENCE: what the 10 s preview claims, and how strongly

The preview teaches **one contributor** to 上头 (expectation), and the ending says it is "原因之一".

| On screen | Supported by | Strength / limit |
|---|---|---|
| 节拍重复，大脑就预期下一拍 | Fujioka et al. 2012, *J Neurosci* 32:1791, doi:10.1523/JNEUROSCI.4107-11.2012: MEG, 12 passive listeners; beta-band timing anticipates the next sound in regular sequences. Wacongne et al. 2011, *PNAS*, doi:10.1073/pnas.1117807108: EEG and MEG regularity and omission responses consistent with predictions of upcoming sounds. | Plain-language summary of "a regularity → an expectation of the next sound". The rings are a **conceptual** guess grid (示意), not a recording of any brain. |
| 少了一下，你却在等它 + “这一下没出现 · 实测” (cyan ring that stays empty) | **Measured on the original BGM:** no onset where the grid fitted to the first six onsets predicts one (1.62 s; the onset spacing there is 0.53 s instead of 0.267 s). Omission work (Wacongne 2011) is the basis for "you still expect it". | The music is **not silent** there; the label says only that the expected onset is absent. No claim of a fixed response in every viewer. |
| 重拍该来了 · 示意 | The bar-level positions of the same grid (every 8th mark). | Conceptual. |
| 等到了！重拍正落在预期的那一拍 | **Measured on the track:** the drop onset (4.2811 s) falls on the bar position of the grid extrapolated from the first six onsets (`src/cues.js`). | A fact about this track's timing vs a **fitted grid**, not a measurement of any listener's prediction accuracy. So the preview shows **no number**: the earlier “实测：与预测只差 4 毫秒” was removed because viewers would read it as brain accuracy. No claim that a met expectation always feels good. |
| 低音回来 · 实测 (callout on the bass wall) | **Measured:** the sub-bass rises 3.98 dB within 100 ms at the drop. | No dopamine claim; the separate “期待被兑现” headline was merged away. Reward evidence (Salimpoor 2011) and uncertainty × surprise (Cheung 2019) are left for the full film. |
| 上头的原因之一：听出规律 → 预期 → 等到 | Synthesis of the above. | Explicitly partial ("之一"). No IQ claim; 开智 is the user's playful name. |

**What is measured and what is drawn (r2 「声音长廊」).**
- **Measured from the audio:**
  - the loudness bars (`rms`);
  - their orange base (sub-bass, `sub`);
  - the moments the rings fill (measured onsets);
  - the hollow cyan ring (no onset at that grid point).
- **Conceptual (示意):** the rings themselves, i.e. the grid fitted to the first six onsets, and their fill/glow animation.
- **Past and future.** The future side of the strip shows **no** sound bars, only expectations, because a listener does not know the future audio.

## Timing of claims (r2)
- **The miss.** The last chain onset is at 1.355 s and the predicted eighth at 1.620 s. The callout "这一下没出现" appears at 1.66 s, after the missed point; the headline "少了一下，你却在等它" appears at 1.80 s.
- **Callouts one at a time.** "听到的 · 实测" at 0.15 s, then "预期的 · 示意" at 0.62 s, then "重拍 · 该来了" at 3.45 s, then "低音回来 · 实测" at 4.78 s.
- **Headlines.** Each carries one causal sentence and stays up for at least 1.17 s. The recap (8.45–10 s) holds the takeaway over the whole record, with brackets 规律 / 少一下 / 等到.
