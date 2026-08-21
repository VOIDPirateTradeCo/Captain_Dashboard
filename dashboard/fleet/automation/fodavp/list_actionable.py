#!/usr/bin/env python3
"""FODAVP: Investigate P2 actionable cards and fix what we can."""
import urllib.request as u, urllib.parse as p, json, time

SECRETS_PATH = r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env'
env = {}
with open(SECRETS_PATH) as f:
    for line in f:
        line = line.strip()
        if line.startswith('TRELLO_') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

KEY, TOKEN = env['TRELLO_KEY'], env['TRELLO_TOKEN']
BASE = "https://api.trello.com/1"
BOARD_ID = '6a595669b8f8f99c93392f4f'

def call(path, data=None, method='GET'):
    url = f"{BASE}{path}?key={KEY}&token={TOKEN}"
    if data:
        url += "&" + p.urlencode(data)
    try:
        body = b'' if method in ('POST','PUT') else None
        req = u.Request(url, method=method, data=body)
        result = u.urlopen(req, timeout=20).read().decode()
        return json.loads(result)
    except Exception as e:
        return {"error": str(e)}

# Get all open cards
cards = call(f'/boards/{BOARD_ID}/cards', {'fields': 'name,shortLink,idList,labels,desc'})
open_cards = [c for c in cards if not c.get('closed')]

print(f"Total open cards: {len(open_cards)}")

# Group by priority
by_prio = {}
for c in open_cards:
    labels = [l.get('name','') for l in c.get('labels', [])]
    prio = 'None'
    for p in ['P0','P1','P2','P3','P4','P5']:
        if p in labels:
            prio = p
            break
    by_prio.setdefault(prio, []).append(c)

for prio in ['P0','P1','P2','P3','P4','P5','None']:
    if prio not in by_prio:
        continue
    cards_list = by_prio[prio]
    print(f"\n{prio}: {len(cards_list)} cards")
    for c in cards_list[:10]:
        print(f"  {c['id']} | {c['name'][:60]}")
    if len(cards_list) > 10:
        print(f"  ... and {len(cards_list)-10} more")

# Find actionable cards (exclude CF, Captain approval needed, etc.)
actionable = []
for c in open_cards:
    name = c.get('name', '')
    desc = c.get('desc', '')
    labels = [l.get('name','') for l in c.get('labels', [])]
    
    # Skip CF cards
    if name.startswith('CF-') or 'CF-' in name[:5]:
        continue
    
    # Skip if needs captain approval
    if 'needs captain' in desc.lower() or 'captain approval' in desc.lower():
        continue
    
    # Skip if marked needs_captain
    if 'needs_captain' in labels:
        continue
    
    actionable.append(c)

print(f"\nActionable cards: {len(actionable)}")
for c in actionable[:20]:
    print(f"  {c['id']} | {c['name'][:70]}")
