"""listen.py: ask a multimodal model (Gemini via api.laozhang.ai) to listen to an audio file and answer a question.
I can't hear, so this is a second pair of ears for the score and the sound effects; its answers are opinions to check
against the spectrogram, not facts. The key is read from /root/.config/laozhang.env.

  python3 scripts/listen.py FILE.(mp3|wav|mp4|jpg) "question" [--model gemini-3.1-pro-preview]
"""
import base64, json, sys, urllib.request, urllib.error
from pathlib import Path

def key():
    for line in Path('/root/.config/laozhang.env').read_text().splitlines():
        if line.startswith('LAOZHANG_API_KEY='):
            return line.split('=', 1)[1].strip()

def main():
    f, q = sys.argv[1], sys.argv[2]
    model = sys.argv[sys.argv.index('--model') + 1] if '--model' in sys.argv else 'gemini-3.1-pro-preview'
    mime = {'.mp3': 'audio/mp3', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png'}[Path(f).suffix]
    # Gemini's native request shape: the OpenAI-style input_audio part is silently dropped by the proxy (tested 2026-10-16)
    body = {'contents': [{'role': 'user', 'parts': [{'text': q}, {'inline_data': {'mime_type': mime, 'data': base64.b64encode(Path(f).read_bytes()).decode()}}]}]}
    req = urllib.request.Request(f'https://api.laozhang.ai/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(), method='POST',
                                 headers={'Authorization': f'Bearer {key()}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            j = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode(errors="replace")[:800]}')
    print(''.join(p.get('text', '') for p in j['candidates'][0]['content']['parts'] if not p.get('thought')))
    print('usage:', json.dumps(j.get('usageMetadata', {})), file=sys.stderr)

if __name__ == '__main__':
    main()
