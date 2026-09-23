import urllib.request
import json
import os

# Config
KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'
TRELLO_LIST = '6a595667ce299b73aab30f88'
MC_API = 'http://192.168.0.39:3100'

PRIORITY_MAP = {'P0':'critical', 'P1':'high', 'P2':'medium', 'P3':'low', 'P4':'backlog'}

# Login to get cookie
login_data = json.dumps({'username': 'Captain', 'password': 'voidcaptain2026'}).encode('utf-8')
req = urllib.request.Request(f'{MC_API}/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=15) as resp:
    cookie_header = resp.headers.get_all('Set-Cookie')[0].split(';')[0]

print("=== Trello → MC Import ===")

# Fetch cards
url = f'https://api.trello.com/1/lists/{TRELLO_LIST}/cards?key={KEY}&token={TOKEN}&fields=name,desc,labels'
req = urllib.request.Request(url, headers={'Accept': 'application/json'})
with urllib.request.urlopen(req, timeout=15) as resp:
    cards = json.loads(resp.read())

print(f"Fetched {len(cards)} cards")

imported = 0
skipped = 0

for card in cards:
    name = card['name']
    desc = card.get('desc', '')
    labels = card.get('labels', [])
    
    priority = 'medium'
    for l in labels:
        if l.get('name', '') in PRIORITY_MAP:
            priority = PRIORITY_MAP[l['name']]
            break
    
    if any(k in name.lower() for k in ['tr3asure', 'crownless', 'sir-cobalt', 'lore']):
        print(f"  SKIP: {name[:50]}")
        skipped += 1
        continue
    
    url = f'{MC_API}/api/tasks'
    data = json.dumps({
        'title': name[:200],
        'description': desc[:2000] if desc else '',
        'priority': priority,
        'status': 'backlog',
        'workspace_id': 1
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'Cookie': cookie_header
    }, method='POST')
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
        print(f"  IMPORT: {name[:50]}")
        imported += 1
    except Exception as e:
        print(f"  ERROR: {name[:50]}: {e}")

print(f"\n=== COMPLETE: {imported} imported, {skipped} skipped ===")

# Now verify tasks exist
req = urllib.request.Request(f'{MC_API}/api/tasks', headers={'Cookie': cookie_header, 'x-api-key': 'd5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'})
with urllib.request.urlopen(req, timeout=15) as resp:
    tasks = json.loads(resp.read())
print(f"\nTotal tasks in MC: {tasks.get('total', 0)}")
