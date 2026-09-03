import requests, urllib3, json
urllib3.disable_warnings()

with open('.env') as f:
    for line in f:
        if line.startswith('API_KEY='):
            key = line.strip().split('=', 1)[1]

base = 'https://127.0.0.1:3100'
headers = {'x-api-key': key}

for path in ['/api/fleet/resources', '/api/fleet/storage']:
    try:
        r = requests.get(f'{base}{path}', headers=headers, verify=False, timeout=10)
        print(f'\n=== {path} ===')
        print(f'Status: {r.status_code}')
        print(r.text[:500])
    except Exception as e:
        print(f'{path} FAILED: {e}')
