"""gptimage.py: GPT Image 2.5 (OpenAI-compatible, via api.laozhang.ai) for key frames and edits, following the
gpt-image-2 skill the user supplied. The key is read from /root/.config/laozhang.env, never from the project.

  python3 scripts/gptimage.py gen NAME --prompt-file prompts/NAME.txt [--size 1024x1536] [--quality high]
  python3 scripts/gptimage.py edit NAME --prompt-file prompts/NAME.txt --image refs/source.png [--model sunburst]
Writes refs/NAME.png and tasks/NAME-gpt.json (prompt, model, size; no key).
"""
import argparse, base64, json, sys, time, urllib.request, urllib.error, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://api.laozhang.ai/v1'
MODELS = {'flare': 'gpt-image-2.5-flare-vip', 'sunburst': 'gpt-image-2.5-sunburst-vip'}


def key():
    for line in Path('/root/.config/laozhang.env').read_text().splitlines():
        if line.startswith('LAOZHANG_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('LAOZHANG_API_KEY missing')


def post(path, data, content_type):
    req = urllib.request.Request(BASE + path, data=data, method='POST', headers={'Authorization': f'Bearer {key()}', 'Content-Type': content_type})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode(errors="replace")[:1200]}')


def save(r, out):
    d = r['data'][0]
    if d.get('b64_json'):
        out.write_bytes(base64.b64decode(d['b64_json']))
    else:
        with urllib.request.urlopen(d['url'], timeout=300) as f:
            out.write_bytes(f.read())
    print(f'saved {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['gen', 'edit'])
    ap.add_argument('name')
    ap.add_argument('--prompt-file', required=True)
    ap.add_argument('--image', action='append', default=[])
    ap.add_argument('--size', default='1024x1536')
    ap.add_argument('--quality', default='high')
    ap.add_argument('--model', default=None, choices=list(MODELS))
    a = ap.parse_args()
    prompt = (ROOT / a.prompt_file).read_text(encoding='utf-8').strip()
    out = ROOT / 'refs' / f'{a.name}.png'; out.parent.mkdir(exist_ok=True)
    t0 = time.time()
    if a.cmd == 'gen':
        model = MODELS[a.model or 'flare']
        r = post('/images/generations', json.dumps({'model': model, 'prompt': prompt, 'size': a.size, 'quality': a.quality}).encode(), 'application/json')
    else:
        model = MODELS[a.model or 'sunburst']
        b = uuid.uuid4().hex
        parts = []
        for k, v in [('model', model), ('prompt', prompt), ('size', a.size), ('quality', a.quality)]:
            parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for p in a.image:
            parts.append(f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="{Path(p).name}"\r\nContent-Type: image/png\r\n\r\n'.encode() + (ROOT / p).read_bytes() + b'\r\n')
        parts.append(f'--{b}--\r\n'.encode())
        r = post('/images/edits', b''.join(parts), f'multipart/form-data; boundary={b}')
    save(r, out)
    (ROOT / 'tasks' / f'{a.name}-gpt.json').write_text(json.dumps({'cmd': a.cmd, 'model': model, 'size': a.size, 'quality': a.quality, 'images': a.image,
        'prompt': prompt, 'seconds': round(time.time() - t0, 1), 'usage': r.get('usage'), 'created': time.strftime('%Y-%m-%d %H:%M:%S')}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
