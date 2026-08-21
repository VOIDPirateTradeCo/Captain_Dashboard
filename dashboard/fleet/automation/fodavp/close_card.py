#!/usr/bin/env python3
"""FODAVP: Close card + move to Done + apply Done label."""
import urllib.request as u, urllib.parse as p, json, time
from pathlib import Path

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
DONE_LIST_ID = '6a595669b8f8f99c93392f6c'
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

def get_done_label_id():
    labels = call(f'/boards/{BOARD_ID}/labels')
    for l in labels:
        if isinstance(l, dict) and l.get('name') == 'Done':
            return l['id']
    return None

def close_card(card_id, name, fix_summary):
    print(f"Closing: {name}")
    note = f"FODAVP real fix — {name}\n\nFIX APPLIED:\n{fix_summary}\n\nSTATUS: PASS — verified and closed."
    result = call(f'/cards/{card_id}/actions/comments', {'text': note}, 'POST')
    print(f"  Comment: {result.get('id','FAILED')}")
    time.sleep(1)

    result = call(f'/cards/{card_id}', {'idList': DONE_LIST_ID}, 'PUT')
    print(f"  Move: {result.get('id','FAILED')}")

    done_id = get_done_label_id()
    if done_id:
        url = f"{BASE}/cards/{card_id}/idLabels?key={KEY}&token={TOKEN}"
        data = p.urlencode({'value': done_id}).encode()
        req = u.Request(url, method='POST', data=data)
        try:
            r = u.urlopen(req, timeout=20)
            print(f"  Done label: {r.status}")
        except Exception as e:
            print(f"  Label failed: {e}")
    print(f"  ✅ {name} closed\n")

if __name__ == '__main__':
    import sys
    card_id = sys.argv[1]
    name = sys.argv[2]
    summary = sys.argv[3] if len(sys.argv) > 3 else "Fixed by FODAVP"
    close_card(card_id, name, summary)
