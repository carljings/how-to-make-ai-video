"""prep.py: cut every segment in src/timeline.json out of its Seedance clip, retime it, and upscale it to 1080×1920.

Each segment becomes public/seg/ID.mp4 with exactly (b − a) × 24 frames, so Remotion only has to play them in order.
Upscaling is Lanczos plus a light unsharp mask (a CPU-only machine can't run an AI upscaler over 864 frames in time).
Also writes public/seg/ID-last.png (the final frame), used where a transition needs a freeze.

  python3 scripts/prep.py [ID ...]
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'src' / 'timeline.json').read_text())
OUT = ROOT / 'public' / 'seg'


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stderr[-1500:])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = set(sys.argv[1:])
    for s in TL['segments']:
        if only and s['id'] not in only:
            continue
        n = round((s['b'] - s['a']) * TL['fps'])
        src = ROOT / 'clips' / f'{s["clip"]}-720p.mp4'
        vf = (f'trim=start={s["in"]},setpts=(PTS-STARTPTS)/{s["rate"]},fps={TL["fps"]},'
              f'scale={TL["w"]}:{TL["h"]}:flags=lanczos,unsharp=5:5:0.55:5:5:0.0,format=yuv420p')
        out = OUT / f'{s["id"]}.mp4'
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', vf, '-frames:v', str(n), '-an',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-g', '12', str(out)])
        got = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                                  'stream=nb_read_frames', '-of', 'csv=p=0', str(out)], capture_output=True, text=True).stdout.strip())
        run(['ffmpeg', '-v', 'error', '-y', '-sseof', '-0.05', '-i', str(out), '-frames:v', '1', '-update', '1', str(OUT / f'{s["id"]}-last.png')])
        flag = '' if got == n else f'  ← expected {n}'
        print(f'{s["id"]:>4}: {s["clip"]} from {s["in"]:.3f} s × {s["rate"]} → {got} frames{flag}')


if __name__ == '__main__':
    main()
