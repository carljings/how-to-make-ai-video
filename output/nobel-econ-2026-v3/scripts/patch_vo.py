"""patch_vo.py: replace the narrator's last line in clip C.

In clip C the narrator garbles the quoted phrase: two Whisper models, with and without a prompt, both hear
"下次再听到药包不好过了" with high confidence. The picture is kept. The line was generated again on its own as a 5-second
Seedance clip with the same voice reference (prompts/vo-end.txt → clips/vo-end-draft.mp4), now with 日子 added:
"下次再听到“日子要不好过了”，你会先省钱吗？".

Both soundtracks are split into voice and everything else with Demucs (htdemucs, two stems) first:
  python -m demucs --two-stems=vocals -n htdemucs -o audio/sep audio/sep/clipC.wav audio/sep/vo-end.wav
(audio/sep/*.wav are the clips' soundtracks at 44.1 kHz.) Then:
  python3 scripts/patch_vo.py   → audio/clipC.wav (48 kHz stereo, as long as the clip's soundtrack)

Up to SWAP the clip's own soundtrack plays. After it, the clip's music and effects without the voice play, with the new
line on top, starting at LINE_AT. The voice track is near silence from 17.0 to 18.7 s (measured), so the swap is inaudible.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SWAP, XFADE = 17.1, 0.2       # seconds into clip C; the previous line ends at 17.0
LINE_AT = 17.6                # where the new line starts in clip C
VO_ONSET = 0.54               # where the voice starts in vo-end (Whisper word timing)
GAIN_DB = 0.0                 # the new line measures −14.6 LUFS, like the clip's own narration (−14.1 to −14.6)

sep = ROOT / 'audio/sep/htdemucs'
out = ROOT / 'audio/clipC.wav'
graph = (f'[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st={SWAP}:d={XFADE}[orig];'
         f'[1:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st={SWAP}:d={XFADE}[bed];'
         f'[2:a]aresample=48000,aformat=channel_layouts=stereo,volume={GAIN_DB}dB,adelay={round((LINE_AT - VO_ONSET) * 1000)}:all=1[vo];'
         '[orig][bed][vo]amix=inputs=3:normalize=0:duration=first[o]')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'clips/clipC-1080p.mp4'), '-i', str(sep / 'clipC/no_vocals.wav'), '-i', str(sep / 'vo-end/vocals.wav'),
                '-filter_complex', graph, '-map', '[o]', '-c:a', 'pcm_f32le', str(out)], check=True)
print(f'{out.relative_to(ROOT)}: clip C soundtrack, new last line from {LINE_AT} s')
