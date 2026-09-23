import urllib.request
import json
import os

# Config
KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'
TRELLO_LIST = '6a595667ce299b73aab30f88'  # To Do Next
MC_API = 'http://192.168.0.39:3100'
MC_API_KEY = 'd5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f'

PRIORITY_MAP = {
    'P0': 'critical',
    'P1': 'high', 
    'P2': 'medium',
    'P3': 'low',
    'P4': 'backlog'
}

print("="*60)
print("Trello → Mission Control Task Import")
print("="*60)

url = f'https://api.trello.com/1/lists/{TRELLO_LIST}/cards?key={KEY}&token={TOKEN}&fields=name,desc,labels'
req = urllib.request.Request(url, headers={'Accept': 'application/json'})
with urllib.request.urlopen(req, timeout=15) as resp:
    cards = json.loads(resp.read())

print(f"Fetched {len(cards)} cards")

for card in cards:
    name = card['name']
    desc = card.get('desc', '')
    labels = card.get('labels', [])
    
    priority = 'medium'
    for l in labels:
        if l.get('name', '') in PRIORITY_MAP:
            priority = PRIORITY_MAP[l['name']]
            break
    
    # Skip keywords
    skip_keywords = ['tr3asure', 'crownless', 'sir-cobalt', 'lore']
    if any(k in name.lower() for k in skip_keywords):
        print(f"  SKIP: {name[:50]}")
        continue
    
    url = f'{MC_API}/api/tasks'
    data = json.dumps({
        'title': name[:200],
        'description': desc[:2000] if desc else '',
        'priority': priority,
        'status': 'pending',
        'workspace_id': 1
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={
        'Content-Type': 'application/json',
        'x-api-key': MC_API_KEY
    }, method='POST')
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
        print(f"  IMPORT: {name[:50]}")
    except Exception as e:
        print(f"  ERROR: {name[:50]}: {e}")
