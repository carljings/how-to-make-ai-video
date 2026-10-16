"""ark.py: generate images and videos on Volcengine Ark (Seedream 5.0 Pro, Seedance 2.5) and keep a record of every task.

  python3 scripts/ark.py image NAME --prompt-file prompts/NAME.txt [--size 1440x2560]          → refs/NAME.png
  python3 scripts/ark.py cost 15 15 22 [--resolution 720p]                                  → estimated tokens and yuan, per clip and in all
  python3 scripts/ark.py video NAME --prompt-file prompts/NAME.txt [--image refs/x.png ...]
                                    [--audio refs/x.mp3 ...] [--duration 15]                 → clips/NAME-720p.mp4
  python3 scripts/ark.py wait NAME                                                           → resume polling a submitted task
Since 2026-10-15 (the user's choice) clips go straight to 720p once the storyboard is approved: no 480p drafts, no
1080p. Remotion still sets the text at 1080p. Quote `cost` to the user and get the budget approved before any `video`.
Older paths kept for the record: `video … --draft` (480p, → clips/NAME-draft.mp4), `final NAME [--resolution]` (a
final made from a draft's task ID) and `wait NAME --final`.

The API key is read from /root/.config/ark.env (ARK_API_KEY=…), never from the project. Every task is written to
tasks/NAME[-final].json before polling, so a timed-out run can be resumed with `wait` instead of being paid for twice.
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = 'https://ark.cn-beijing.volces.com/api/v3'
VIDEO_MODEL, IMAGE_MODEL = 'doubao-seedance-2-5-260628', 'doubao-seedream-5-0-pro-260628'


def key():
    for line in Path('/root/.config/ark.env').read_text().splitlines():
        if line.startswith('ARK_API_KEY='):
            return line.split('=', 1)[1].strip()
    sys.exit('ARK_API_KEY missing in /root/.config/ark.env')


def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'{method} {path} → HTTP {e.code}: {e.read().decode(errors="replace")[:1500]}')


def data_url(path):
    mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(Path(path).read_bytes()).decode()


def download(url, out):
    out.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(url, timeout=300) as r:
        out.write_bytes(r.read())
    print(f'saved {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)')


def poll(record_path, out):
    rec = json.loads(record_path.read_text())
    t0 = time.time()
    while True:
        r = call('GET', f'/contents/generations/tasks/{rec["id"]}')
        status = r.get('status')
        if status == 'succeeded':
            rec.update(status=status, result=r, finished=time.strftime('%Y-%m-%d %H:%M:%S'))
            record_path.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
            download(r['content']['video_url'], out)
            print('usage:', json.dumps(r.get('usage', {})), 'seconds:', r.get('duration'), 'resolution:', r.get('resolution'))
            return r
        if status in ('failed', 'expired', 'cancelled'):
            rec.update(status=status, result=r)
            record_path.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
            sys.exit(f'task {rec["id"]} {status}: {json.dumps(r.get("error"), ensure_ascii=False)}')
        print(f'{status} … {int(time.time() - t0)} s', flush=True)
        time.sleep(15)


# Ark bills Seedance by tokens = width × height × frames / 1024 (frames = 24 per second + 1; checked against every task's
# usage). Yuan per million tokens: 70 at 480p and 1080p's 77 come from the tasks' bills; 720p at 70 matches the published
# "about ¥1.51 a second". Estimates: the real bill is in the Volcengine console.
SIZES = {'480p': (480, 854), '720p': (720, 1280), '1080p': (1080, 1920)}
YUAN_PER_M = {'480p': 70, '720p': 70, '1080p': 77}


def estimate(seconds, res):
    w, h = SIZES[res]
    tokens = round(w * h * (seconds * 24 + 1) / 1024)
    return tokens, tokens * YUAN_PER_M[res] / 1e6


def print_cost(durations, res):
    total = 0
    for i, d in enumerate(durations, 1):
        tokens, yuan = estimate(d, res); total += yuan
        print(f'clip {i}: {d:g} s at {res} ≈ {tokens:,} tokens ≈ ¥{yuan:.1f}')
    print(f'all {len(durations)} clips ≈ ¥{total:.1f} (one redo of a 15 s clip ≈ ¥{estimate(15, res)[1]:.1f})')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['image', 'video', 'final', 'wait', 'cost'])
    ap.add_argument('name', nargs='+', help='task name, or clip lengths in seconds for cost')
    ap.add_argument('--prompt-file')
    ap.add_argument('--image', action='append', default=[])
    ap.add_argument('--first-frame', help='image used as the first frame (ratio becomes adaptive: it follows the image)')
    ap.add_argument('--audio', action='append', default=[])
    ap.add_argument('--duration', type=int, default=15)
    ap.add_argument('--size', default='1440x2560')
    ap.add_argument('--draft', action='store_true')
    ap.add_argument('--final', action='store_true')
    ap.add_argument('--resolution', default='720p', choices=['720p', '1080p'], help='resolution of a clip (or of a final made from a draft)')
    ap.add_argument('--seed', type=int)
    a = ap.parse_args()
    if a.cmd == 'cost':
        return print_cost([float(x) for x in a.name], '480p' if a.draft else a.resolution)
    a.name = a.name[0]
    tasks = ROOT / 'tasks'; tasks.mkdir(exist_ok=True)

    if a.cmd == 'image':
        prompt = (ROOT / a.prompt_file).read_text(encoding='utf-8').strip()
        body = {'model': IMAGE_MODEL, 'prompt': prompt, 'size': a.size, 'response_format': 'url', 'watermark': False}
        if a.image:   # reference images (style, character); JPEG uploads, as large PNGs time out
            body['image'] = [data_url(ROOT / p) for p in a.image]
        r = call('POST', '/images/generations', body)
        (tasks / f'{a.name}-image.json').write_text(json.dumps({'prompt': prompt, 'size': a.size, 'images': a.image, 'result': r}, ensure_ascii=False, indent=2))
        download(r['data'][0]['url'], ROOT / 'refs' / f'{a.name}.png')
        print('usage:', json.dumps(r.get('usage', {})))
        return

    if a.cmd == 'video':
        out = ROOT / 'clips' / f'{a.name}-{"draft" if a.draft else a.resolution}.mp4'
        rec_path = tasks / f'{a.name}.json'
        if rec_path.exists() and json.loads(rec_path.read_text()).get('status') != 'failed':
            sys.exit(f'{rec_path.relative_to(ROOT)} exists: use `wait {a.name}` to resume, or delete it to generate again')
        prompt = (ROOT / a.prompt_file).read_text(encoding='utf-8').strip()
        content = [{'type': 'text', 'text': prompt}]
        if a.first_frame:
            content.append({'type': 'image_url', 'image_url': {'url': data_url(ROOT / a.first_frame)}, 'role': 'first_frame'})
        content += [{'type': 'image_url', 'image_url': {'url': data_url(ROOT / p)}, 'role': 'reference_image'} for p in a.image]
        content += [{'type': 'audio_url', 'audio_url': {'url': data_url(ROOT / p)}, 'role': 'reference_audio'} for p in a.audio]
        body = {'model': VIDEO_MODEL, 'content': content, 'generate_audio': True, 'ratio': 'adaptive' if a.first_frame else '9:16', 'duration': a.duration, 'watermark': False}
        body.update(draft=True, resolution='480p') if a.draft else body.update(resolution=a.resolution)
        if a.seed is not None: body['seed'] = a.seed
        r = call('POST', '/contents/generations/tasks', body)
        rec = {'id': r['id'], 'name': a.name, 'draft': a.draft, 'resolution': '480p' if a.draft else a.resolution, 'prompt': prompt, 'first_frame': a.first_frame, 'images': a.image, 'audios': a.audio, 'duration': a.duration,
               'created': time.strftime('%Y-%m-%d %H:%M:%S'), 'status': 'submitted'}
        rec_path.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
        print('submitted', r['id'])
        poll(rec_path, out)
        return

    if a.cmd == 'final':
        draft = json.loads((tasks / f'{a.name}.json').read_text())
        assert draft.get('draft') and draft.get('status') == 'succeeded', 'the draft must have succeeded first'
        rec_path = tasks / f'{a.name}-final.json'
        if rec_path.exists() and json.loads(rec_path.read_text()).get('status') != 'failed':
            sys.exit(f'{rec_path.relative_to(ROOT)} exists: use `wait {a.name} --final` to resume')
        r = call('POST', '/contents/generations/tasks', {'model': VIDEO_MODEL, 'content': [{'type': 'draft_task', 'draft_task': {'id': draft['id']}}],
                                                          'resolution': a.resolution, 'watermark': False})
        rec = {'id': r['id'], 'name': a.name, 'from_draft': draft['id'], 'resolution': a.resolution, 'created': time.strftime('%Y-%m-%d %H:%M:%S'), 'status': 'submitted'}
        rec_path.write_text(json.dumps(rec, ensure_ascii=False, indent=2))
        print('submitted', r['id'])
        poll(rec_path, ROOT / 'clips' / f'{a.name}-{a.resolution}.mp4')
        return

    if a.cmd == 'wait':
        rec_path = tasks / f'{a.name}{"-final" if a.final else ""}.json'
        rec = json.loads(rec_path.read_text())
        out = ROOT / 'clips' / f'{a.name}-{"draft" if rec.get("draft") else rec.get("resolution", "1080p")}.mp4'
        poll(rec_path, out)


if __name__ == '__main__':
    main()
