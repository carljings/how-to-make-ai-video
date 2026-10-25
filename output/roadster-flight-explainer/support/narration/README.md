# Narration and caption support

[中文说明](README.zh-CN.md)

`../../blender/data/film_cues.json` is the read-only timing/text authority. This package supports the main Opus production; it does not establish final picture, sound, or aesthetic acceptance.

- `clip-01-usable.wav` through `clip-07-usable.wav`: existing 24 kHz mono PCM narration, copied with matching SHA-256 hashes. Only exterior silence was trimmed previously, with 100 ms pads; all internal pauses remain.
- `source-hash-manifest.json`: voice/provider/package provenance, original MP3 hashes, usable WAV hashes, and trim records. Voice: `zh-CN-YunxiNeural`, synthesis rate `-3%`, unmodified public `edge-tts 7.3.1`. Clip 01 reuses the exact original probe. This packaging makes no TTS requests.
- `narration-stem-75s.wav`: exactly 75 seconds, 48 kHz stereo PCM. Mono is explicitly duplicated to both channels; resampling does not change playback speed. Canonical audio starts are preserved. This is a narration-only stem, without music, sound effects, gain normalization, loudness normalization, or final mastering.
- `narration.zh-CN.srt` and `caption-cues.json`: 40 canonical phrase cues. Phrase text is preserved; phrases longer than 15 Chinese characters receive one readable line break. Timing follows the canonical ASR-index estimates and is not independently verified forced alignment. Final caption typography/design belongs to the main production.
- `verification.json`, `stem-ffprobe.json`, `stem-loudness.log`: technical checks and measured audio properties. The stem measures **−20.8 LUFS integrated / −3.7 dBTP true peak**, before any final mix. All seven source hashes, full stem decode, duration/sample format, subtitle parsing, and audio/caption non-overlap checks passed. No subjective listening is claimed.

## Regenerate

Requires existing Python 3, FFmpeg, and FFprobe. From the repository root:

```sh
python3 output/roadster-flight-explainer/support/narration/build_support.py
```

The tested script reads the canonical cue file and this directory's seven WAVs/provenance manifest, then regenerates support assets locally. It does not edit canonical cues, call external services, or accelerate narration. Hash checks fail if canonical audio references and source WAVs disagree.
