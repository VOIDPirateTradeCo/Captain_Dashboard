#!/usr/bin/env python3
"""Search Trello board for specific cards by name/ID."""
import urllib.request as u, urllib.parse as p, json, time
from pathlib import Path

SECRETS_PATH = r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env'

def load_secrets():
    secrets = {}
    with open(SECRETS_PATH) as f:
        for line in f:
            line = line.strip()
            if line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            secrets[k.strip()] = v.strip().strip("'\"")
    return secrets

def trello_get(path):
    s = load_secrets()
    url = f"https://api.trello.com/1{path}?key={s['TRELLO_KEY']}&token={s['TRELLO_TOKEN']}"
    for attempt in range(3):
        try:
            with u.urlopen(url, timeout=30) as r:
                return json.loads(r.read())
        except Exception as e:
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                raise

BOARD = '6a595669b8f8f99c93392f4f'
LISTS = trello_get(f'/boards/{BOARD}/lists')

print(f"Total lists: {len(LISTS)}\n")

# Find Done list
done_list = [l for l in LISTS if 'done' in l['name'].lower()]
print(f"Done lists: {[l['name'] for l in done_list]}\n")

# Search all cards for G3/Operational Security
for lst in LISTS:
    cards = trello_get(f'/lists/{lst["id"]}/cards')
    for card in cards:
        name = card['name']
        if 'G3' in name or 'Operational Security' in name.lower() or 'OODAVRUR' in name:
            print(f"FOUND: {name} | ID: {card['id']} | List: {lst['name']} | Labels: {[l['name'] for l in card.get('labels', [])]}")
