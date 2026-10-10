"""Generate sentence-level Mandarin speech on the approved scene timeline."""
import asyncio
import hashlib
import json
import subprocess
import wave
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
VOICE = 'zh-CN-YunxiNeural'
SR = 48000

def command(args):
    return subprocess.run(args, check=True, capture_output=True).stdout

def duration(path):
    return float(command(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                          '-of', 'default=noprint_wrappers=1:nokey=1', str(path)]))

async def main():
    cues = json.loads(command(['node', '--input-type=module', '-e',
        "import {CAPTIONS} from './src/timeline.js';console.log(JSON.stringify(CAPTIONS))"]))
    manifest = []
    mix = bytearray(75 * SR * 2)
    for i, cue in enumerate(cues):
        a, b, caption = cue[:3]
        spoken = caption.replace('2021年', '二零二一年')
        rate = -3
        path = ROOT / 'voice' / f'{i+1:02}.mp3'
        token_path = path.with_suffix('.json')
        key = hashlib.sha256((VOICE + spoken).encode()).hexdigest()
        saved = json.loads(token_path.read_text()) if token_path.exists() else {}
        if path.exists() and saved.get('key') == key:
            rate = saved['rate']
        else:
            await edge_tts.Communicate(spoken, VOICE, rate=f'{rate:+}%').save(str(path))
        seconds = duration(path)
        available = b - a - .24
        if seconds > available:
            rate = min(22, round((seconds / available * (1 + rate / 100) - 1) * 100) + 2)
            await edge_tts.Communicate(spoken, VOICE, rate=f'{rate:+}%').save(str(path))
            seconds = duration(path)
        if seconds > available + .05:
            raise RuntimeError(f'Cue {i+1} still exceeds its time window: {seconds:.2f}s')
        pcm = command(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le', '-ac', '1',
                       '-ar', str(SR), '-af', 'highpass=f=70,afade=t=in:d=0.008', '-'])
        start = round((a + .08) * SR) * 2
        mix[start:start+len(pcm)] = pcm
        record = dict(index=i+1, key=key, voice=VOICE, rate=rate, start=a+.08,
                      end=a+.08+seconds, caption=caption, spoken=spoken, file=path.name)
        token_path.write_text(json.dumps(record, ensure_ascii=False, indent=2))
        manifest.append(record)
        print(f'{i+1:02}: {seconds:.2f}s in {b-a:.2f}s, rate {rate:+}%', flush=True)
    with wave.open(str(ROOT / 'voice' / 'narration.wav'), 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes(mix)
    (ROOT / 'voice' / 'timing.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print('Saved 75-second narration.wav and measured speech timing.', flush=True)

if __name__ == '__main__':
    asyncio.run(main())
