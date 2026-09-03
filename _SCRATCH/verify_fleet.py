import requests
import urllib3
urllib3.disable_warnings()

with open('.env') as f:
    for line in f:
        if line.startswith('API_KEY='):
            key = line.strip().split('=', 1)[1]

base = 'https://127.0.0.1:3100'
headers = {'x-api-key': key}

endpoints = [
    '/api/fleet/resources',
    '/api/fleet/storage', 
    '/api/fleet/security',
    '/api/fleet/tasks'
]

for path in endpoints:
    try:
        r = requests.get(f'{base}{path}', headers=headers, verify=False, timeout=10)
        print(f'{path}: {r.status_code} ({r.headers.get("content-type", "unknown")})')
        if r.status_code == 200 and 'application/json' in r.headers.get('content-type', ''):
            data = r.json()
            print(f'  -> {data.get("count", "?")} items')
        else:
            print(f'  -> non-JSON response')
    except Exception as e:
        print(f'{path}: FAILED - {e}')
