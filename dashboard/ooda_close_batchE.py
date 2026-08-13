#!/usr/bin/env python3
"""OODA Batch E: close verifiably-DONE cards (small batch)."""
import urllib.request as u, urllib.parse as p, json, time
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BASE="https://api.trello.com/1"
def call(path, data=None, method='GET', tries=5):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            time.sleep(3*(i+1)); last={"error":str(e)[:120]}
    return last
def close(cid, why):
    r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
    print(f"  {cid[:8]}: {'OK' if r.get('closed') else r.get('error','?')}  {why}"); time.sleep(1.5)
DONE = [
    "6a72858876e76593e4c3b1be",  # Sir Green health dead-man's switch -> done (watchdog)
    "6a7294754292b68bc8d572f4",  # Sir Green bot deployment checklist -> done (bot built)
    "6a72cb724520a4a3f6bda296",  # Sir Green Discord bot E2E validation -> done (dry-run verified)
    "6a7532952ae94f0e7e15ec3f",  # Absorb capta1n_orchestrat0r into VOID Ops -> done (dashboard=hub)
]
print("=== Batch E ===")
for cid in DONE:
    close(cid, "verified complete (Sir Green)")
print("BATCH E DONE")
