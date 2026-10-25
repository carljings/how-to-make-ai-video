"""volc_balance.py: read the Volcengine account balance (billing QueryBalanceAcct, Version 2022-01-01) with the
read-only sub-user key in /root/.config/volc.env (VOLC_AK, VOLC_SK). Signs the request with Volcengine's HMAC-SHA256
scheme. Prints the result fields; never prints the key.

  python3 volc_balance.py [--method GET|POST] [--raw]
"""
import datetime as dt, hashlib, hmac, json, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HOST, REGION, SERVICE = 'open.volcengineapi.com', 'cn-beijing', 'billing'


def creds():
    env = dict(l.split('=', 1) for l in Path('/root/.config/volc.env').read_text().splitlines() if '=' in l)
    return env['VOLC_AK'].strip(), env['VOLC_SK'].strip()


def sign_and_send(action, version, method='GET', body=b''):
    ak, sk = creds()
    now = dt.datetime.now(dt.timezone.utc)
    xdate, short = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
    query = urllib.parse.urlencode(sorted({'Action': action, 'Version': version}.items()), quote_via=urllib.parse.quote)
    payload_hash = hashlib.sha256(body).hexdigest()
    headers = {'content-type': 'application/json', 'host': HOST, 'x-content-sha256': payload_hash, 'x-date': xdate}
    signed = ';'.join(sorted(headers))
    canonical = '\n'.join([method, '/', query, ''.join(f'{k}:{headers[k]}\n' for k in sorted(headers)), signed, payload_hash])
    scope = f'{short}/{REGION}/{SERVICE}/request'
    to_sign = '\n'.join(['HMAC-SHA256', xdate, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    key = sk.encode()
    for part in (short, REGION, SERVICE, 'request'):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    sig = hmac.new(key, to_sign.encode(), hashlib.sha256).hexdigest()
    req_headers = {'Content-Type': headers['content-type'], 'X-Content-Sha256': payload_hash, 'X-Date': xdate,
                   'Authorization': f'HMAC-SHA256 Credential={ak}/{scope}, SignedHeaders={signed}, Signature={sig}'}
    req = urllib.request.Request(f'https://{HOST}/?{query}', data=body if method == 'POST' else None, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'{}')


if __name__ == '__main__':
    method = 'POST' if '--method' in sys.argv and sys.argv[sys.argv.index('--method') + 1].upper() == 'POST' else 'GET'
    status, j = sign_and_send('QueryBalanceAcct', '2022-01-01', method, b'{}' if method == 'POST' else b'')
    err = (j.get('ResponseMetadata') or {}).get('Error')
    if err:
        print(f'HTTP {status}: {err.get("Code")} {err.get("Message")}')
        sys.exit(1)
    res = j.get('Result') or {}
    if '--raw' in sys.argv:
        print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        for k, v in res.items():
            print(f'{k}: {v}')
