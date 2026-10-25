"""Build local narration/caption support from canonical cues; no network or TTS."""
import hashlib
import json
import re
import subprocess
import unicodedata
import wave
from pathlib import Path

BASE = Path(__file__).resolve().parent
CANONICAL = BASE.parents[1] / "blender/data/film_cues.json"
RATE, CHANNELS, WIDTH = 48000, 2, 2


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def srt_time(seconds):
    ms = round(seconds * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def wrap(text):
    # Readable phrase boundaries for the two long phrases in the approved script.
    breaks = {"它用到了多模式吸力系统和冷气推进器": "它用到了多模式吸力系统\n和冷气推进器",
              "分布着多个碳纤维缠绕的压力容器": "分布着多个\n碳纤维缠绕的压力容器"}
    chinese = lambda s: len(re.findall(r"[\u3400-\u9fff]", s))
    if chinese(text) <= 15:
        return text
    result = breaks[text] if text in breaks else text[:len(text) // 2] + "\n" + text[len(text) // 2:]
    assert result.replace("\n", "") == text and len(result.splitlines()) == 2
    assert all(chinese(line) <= 15 for line in result.splitlines())
    return result


canonical_sha = sha(CANONICAL)
cues = json.loads(CANONICAL.read_text())
provenance = json.loads((BASE / "source-hash-manifest.json").read_text())
sources = {c["id"]: c for c in provenance["clips"]}
frames = round(cues["duration_s"] * RATE)
pcm = bytearray(frames * CHANNELS * WIDTH)
placements, captions = [], []
previous_end = 0
for line in cues["lines"]:
    audio = BASE / line["audio_file"]
    assert sha(audio) == line["audio_sha256"] == sources[line["id"]]["sha256"]
    with wave.open(str(audio)) as wav:
        exact_duration = wav.getnframes() / wav.getframerate()
    assert abs(line["audio_end_s"] - line["audio_start_s"] - exact_duration) < 0.001
    # Resample without tempo change; duplicate mono explicitly to avoid upmix gain changes.
    converted = run(["ffmpeg", "-v", "error", "-xerror", "-i", str(audio), "-af",
                     "aresample=48000,pan=stereo|c0=c0|c1=c0", "-c:a", "pcm_s16le", "-f", "s16le", "-"]).stdout
    start_frame = round(line["audio_start_s"] * RATE)
    count = len(converted) // (CHANNELS * WIDTH)
    assert start_frame >= previous_end and start_frame + count <= frames
    offset = start_frame * CHANNELS * WIDTH
    pcm[offset:offset + len(converted)] = converted
    previous_end = start_frame + count
    placements.append({"id": line["id"], "file": audio.name, "sha256": sha(audio),
                       "start_sample": start_frame, "end_sample": previous_end, "start_s": line["audio_start_s"],
                       "exact_end_s": previous_end / RATE, "canonical_rounded_end_s": line["audio_end_s"], "playback_rate": 1.0})
    unpunctuated = "".join(c for c in line["text"] if unicodedata.category(c)[0] not in "PZS")
    assert "".join(p["text"] for p in line["phrases"]) == unpunctuated
    for phrase in line["phrases"]:
        assert line["audio_start_s"] <= phrase["start_s"] < phrase["end_s"] <= line["audio_end_s"]
        captions.append({"id": len(captions) + 1, "line_id": line["id"], "start_s": phrase["start_s"],
                         "end_s": phrase["end_s"], "text": phrase["text"], "display_text": wrap(phrase["text"]),
                         "timing_method": line["timing_method"]})
assert all(a["end_s"] <= b["start_s"] for a, b in zip(captions, captions[1:]))
caption_data = {"canonical_cues": "../../blender/data/film_cues.json", "canonical_sha256": canonical_sha,
                "duration_s": cues["duration_s"], "fps": cues["fps"], "encoding": "UTF-8",
                "timing_note": "Approved phrase text; canonical ASR-index estimates, not forced alignment.", "cues": captions}
(BASE / "caption-cues.json").write_text(json.dumps(caption_data, ensure_ascii=False, indent=2) + "\n")
(BASE / "narration.zh-CN.srt").write_text("\n\n".join(f"{c['id']}\n{srt_time(c['start_s'])} --> {srt_time(c['end_s'])}\n{c['display_text']}" for c in captions) + "\n", encoding="utf-8")
parsed = json.loads(run(["ffprobe", "-v", "error", "-show_packets", "-of", "json", str(BASE / "narration.zh-CN.srt")]).stdout)["packets"]
assert len(parsed) == len(captions)
assert all(abs(float(p["pts_time"]) - c["start_s"]) < 0.001 for p, c in zip(parsed, captions))
temporary = BASE / ".narration-unmetadata.wav"
with wave.open(str(temporary), "wb") as wav:
    wav.setparams((CHANNELS, WIDTH, RATE, frames, "NONE", "not compressed"))
    wav.writeframes(pcm)
stem = BASE / "narration-stem-75s.wav"
try:
    run(["ffmpeg", "-v", "error", "-y", "-i", str(temporary), "-c:a", "copy",
         "-metadata", "title=Roadster explainer narration stem - 75 seconds",
         "-metadata", "artist=zh-CN-YunxiNeural",
         "-metadata", "comment=Microsoft speech via edge-tts 7.3.1; synthesis rate -3%; no music or mastering; no tempo or gain normalization",
         str(stem)])
finally:
    temporary.unlink(missing_ok=True)
measurement = run(["ffmpeg", "-hide_banner", "-nostats", "-xerror", "-i", str(stem),
                   "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.decode()
(BASE / "stem-loudness.log").write_text(measurement)
lufs = float(re.findall(r"Integrated loudness:\s+I:\s+([-\d.]+) LUFS", measurement)[-1])
peak = float(re.findall(r"True peak:\s+Peak:\s+([-\d.]+) dBFS", measurement)[-1])
probe = json.loads(run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(stem)]).stdout)
(BASE / "stem-ffprobe.json").write_text(json.dumps(probe, indent=2) + "\n")
with wave.open(str(stem)) as wav:
    assert (wav.getframerate(), wav.getnchannels(), wav.getnframes()) == (RATE, CHANNELS, frames)
assert sha(CANONICAL) == canonical_sha
verification = {"canonical_sha256": canonical_sha, "canonical_unchanged": True, "role": "narration-only stem, not final music mix or master",
                "stem": stem.name, "stem_sha256": sha(stem), "sample_rate": RATE, "channels": CHANNELS, "sample_frames": frames,
                "duration_s": frames / RATE, "full_decode": "passed", "audio_overlaps": False, "caption_overlaps": False,
                "loudness_normalization_applied": False, "gain_normalization_applied": False, "tempo_change_applied": False,
                "integrated_loudness_lufs": lufs, "true_peak_dbtp": peak, "subjective_listening": False,
                "caption_count": len(captions), "srt_parser": "passed via ffprobe", "approved_phrase_characters_preserved": True,
                "placements": placements, "voice_provenance": "source-hash-manifest.json"}
(BASE / "verification.json").write_text(json.dumps(verification, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: v for k, v in verification.items() if k != "placements"}, ensure_ascii=False, indent=2))
