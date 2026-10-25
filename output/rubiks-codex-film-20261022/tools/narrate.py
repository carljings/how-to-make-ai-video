from pathlib import Path
import asyncio, hashlib, html, json, math, re, subprocess, sys
from array import array

ROOT = Path(__file__).resolve().parents[1]
try:
    import edge_tts
except ImportError:
    sys.path.insert(0, str(ROOT.parents[1] / '.omx/artifacts/music-catchy-remake-20261020/tts-runtime'))
    import edge_tts

SR = 48000
SOURCE = json.loads((ROOT / 'src/segments.json').read_text())
VOICE = ROOT / 'audio/voice'
VOICE.mkdir(parents=True, exist_ok=True)
LIMIT = asyncio.Semaphore(2)

def run(args, data=None):
    r = subprocess.run(args, input=data, capture_output=True, check=True)
    return r.stdout

def normal(s):
    return re.sub(r'[^a-z0-9\u4e00-\u9fff]', '', html.unescape(s).lower()).replace('f二l', 'f2l').replace('roux', '')

async def synth(row):
    settings = {'voice': SOURCE['voice'], 'rate': SOURCE['rate'], 'pitch': '+0Hz', 'volume': '+0%'}
    key = hashlib.sha256(json.dumps([row['ttsText'], settings], ensure_ascii=False).encode()).hexdigest()[:12]
    name = row['id'] + '-' + key
    raw, wav, meta = [VOICE / (name + x) for x in ['.mp3', '.wav', '.json']]
    if meta.exists() and wav.exists():
        result = json.loads(meta.read_text())
        assert hashlib.sha256(wav.read_bytes()).hexdigest() == result['sha256']
        print(json.dumps({'id': row['id'], 'cached': True, 'seconds': result['duration'] }), flush=True)
        return result
    async with LIMIT:
        boundaries = []
        part = raw.with_suffix('.mp3.part')
        with part.open('wb') as f:
            async for chunk in edge_tts.Communicate(row['ttsText'], boundary='WordBoundary', **settings).stream():
                if chunk['type'] == 'audio': f.write(chunk['data'])
                elif chunk['type'] == 'WordBoundary': boundaries.append({k: chunk[k] for k in ['offset', 'duration', 'text']})
        assert part.stat().st_size > 1000, 'Empty TTS response'
        part.replace(raw)
        pcm = run(['ffmpeg', '-v', 'error', '-i', str(raw), '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'])
        a = array('f', pcm)
        threshold = 10 ** (-50 / 20)
        first = next((i for i, x in enumerate(a) if abs(x) > threshold), None)
        assert first is not None, 'No actual speech'
        last = len(a) - next(i for i, x in enumerate(reversed(a)) if abs(x) > threshold)
        first, last = max(0, first - 2880), min(len(a), last + 6720)
        run(['ffmpeg', '-v', 'error', '-n', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s24le', str(wav)], a[first:last].tobytes())
        result = {'id': row['id'], 'file': str(wav.relative_to(ROOT)), 'duration': (last - first) / SR,
                  'sha256': hashlib.sha256(wav.read_bytes()).hexdigest(), 'voice': SOURCE['voice'], 'rate': SOURCE['rate'],
                  'text': row['ttsText'], 'trimStart': first / SR, 'rawDuration': len(a) / SR,
                  'words': [{'t': b['offset'] / 1e7 - first / SR, 'd': b['duration'] / 1e7, 'text': b['text']} for b in boundaries],
                  'tool': 'edge-tts', 'version': edge_tts.__version__, 'timeStretch': False, 'listened': False}
        meta.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({'id': row['id'], 'seconds': round(result['duration'], 3), 'words': len(boundaries)}, ensure_ascii=False), flush=True)
        return result

def stamp(t):
    n = round(t * 1000)
    return f'{n // 3600000:02}:{n // 60000 % 60:02}:{n // 1000 % 60:02},{n % 1000:03}'

async def main():
    results = await asyncio.gather(*[synth(row) for row in SOURCE['segments']])
    cursor = SOURCE['lead']
    scenes, captions, fallback = [], [], 0
    for row, audio in zip(SOURCE['segments'], results):
        start = math.ceil(cursor * 30) / 30
        end = math.ceil((start + audio['duration'] + row['gapAfter']) * 30) / 30
        scene = {**row, **{'start': start, 'end': end, 'audio': audio}}
        scenes.append(scene)
        text, pos, located = normal(row['text']), 0, []
        for word in audio['words']:
            token = normal(word['text'])
            at = text.find(token, pos)
            if at >= 0 and token:
                located.append({'a': at, 'b': at + len(token), 't': max(0, word['t']), 'end': word['t'] + word['d']})
                pos = at + len(token)
        fragments = [x.strip() for x in re.split(r'[，。？！；：—]+', row['text']) if x.strip()]
        parts = []
        for fragment in fragments:
            while len(fragment) > 30:
                parts.append(fragment[:16]); fragment = fragment[16:]
            if fragment: parts.append(fragment)
        pos = 0
        for part in parts:
            token = normal(part); at = text.find(token, pos)
            if at < 0: at = pos
            matches = [w for w in located if w['b'] > at and w['a'] < at + len(token)]
            if matches:
                t0, t1 = matches[0]['t'], matches[-1]['end']
            else:
                t0, t1 = audio['duration'] * at / len(text), audio['duration'] * (at + len(token)) / len(text)
                fallback += 1
            captions.append({'text': part, 'start': start + max(0, t0 - .04), 'end': start + min(audio['duration'] + .10, t1 + .16), 'scene': row['id']})
            pos = at + len(token)
        cursor = end
    for a, b in zip(captions, captions[1:]):
        a['end'] = min(a['end'], b['start'] - .02)
    duration = math.ceil((cursor + SOURCE['tail']) * 30) / 30
    timeline = {'title': SOURCE['title'], 'width': 1080, 'height': 1920, 'fps': 30, 'cutoffDate': SOURCE['cutoffDate'],
                'duration': duration, 'frames': round(duration * 30), 'scenes': scenes, 'captions': captions,
                'captionFallbackCount': fallback, 'voice': SOURCE['voice'], 'rate': SOURCE['rate'], 'listened': False}
    (ROOT / 'src/timeline.json').write_text(json.dumps(timeline, ensure_ascii=False, indent=2) + '\n')
    srt = '\n\n'.join(f'{i + 1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i, c in enumerate(captions)) + '\n'
    (ROOT / 'out/字幕.srt').write_text(srt)
    print(json.dumps({'duration': duration, 'frames': timeline['frames'], 'captionFallbackCount': fallback, 'captions': len(captions)}, ensure_ascii=False), flush=True)

asyncio.run(main())
