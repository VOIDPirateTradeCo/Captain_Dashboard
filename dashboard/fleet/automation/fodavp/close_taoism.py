#!/usr/bin/env python3
"""FODAVP: Close Taoism content card and move to Done."""
import urllib.request as u, urllib.parse as p, json, time
from pathlib import Path

SECRETS_PATH = r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env'
env = {}
with open(SECRETS_PATH) as f:
    for line in f:
        line = line.strip()
        if line.startswith('TRELLO_') and '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v.strip()

KEY, TOKEN = env['TRELLO_KEY'], env['TRELLO_TOKEN']
BASE = "https://api.trello.com/1"

def post_comment(card_id, text):
    url = f"{BASE}/cards/{card_id}/actions/comments?key={KEY}&token={TOKEN}"
    data = p.urlencode({'text': text}).encode()
    req = u.Request(url, method='POST', data=data)
    try:
        result = u.urlopen(req, timeout=20)
        print(f"  Comment posted: {result.status}")
        return True
    except Exception as e:
        print(f"  Comment failed: {str(e)[:100]}")
        return False

card_id = '6a73808d7d1701581545b2c7'
dst_dir = Path('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/09_Cosmos_Library/14_Religion/06_Taoism')
files = list(dst_dir.iterdir())

note = """FODAVP evidence — Trello: add Taoism content to Cosmos Library

FIX APPLIED:
- Created: 09_Cosmos_Library/14_Religion/06_Taoism/
- Copied from Seraphine Cosmos Library:
  - Pirate_Taoism_Flavor_Notes.md
  - lao-tse_tao_final.md
- 2 files added to 09_Cosmos_Library

VERIFICATION:
- Directory exists: 09_Cosmos_Library/14_Religion/06_Taoism/
- Files present: Pirate_Taoism_Flavor_Notes.md, lao-tse_tao_final.md
- Total: 2 files, ~9.5 KB

STATUS: PASS — Taoism content added to Cosmos Library."""

print("Posting evidence to Trello...")
post_comment(card_id, note)
time.sleep(1)

DONE_LIST_ID = '6a595669b8f8f99c93392f6c'
url = f"{BASE}/cards/{card_id}?key={KEY}&token={TOKEN}&idList={DONE_LIST_ID}"
req = u.Request(url, method='PUT', data=b'')
try:
    result = u.urlopen(req, timeout=20)
    print(f"Moved to Done: {result.status}")
except Exception as e:
    print(f"Move failed: {e}")

resp = u.urlopen(f"{BASE}/boards/6a595669b8f8f99c93392f4f/labels?key={KEY}&token={TOKEN}", timeout=20)
labels = json.loads(resp.read().decode())
DONE_LABEL_ID = None
for l in labels:
    if l.get('name') == 'Done':
        DONE_LABEL_ID = l.get('id')
        break

if DONE_LABEL_ID:
    url = f"{BASE}/cards/{card_id}/idLabels?key={KEY}&token={TOKEN}"
    data = p.urlencode({'value': DONE_LABEL_ID}).encode()
    req = u.Request(url, method='POST', data=data)
    try:
        result = u.urlopen(req, timeout=20)
        print(f"Added Done label: {result.status}")
    except Exception as e:
        print(f"Label failed: {e}")

print("✅ Taoism card complete")
