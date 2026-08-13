#!/usr/bin/env python3
"""OODA Batch H: close remaining verifiable-done cards (small batch)."""
import urllib.request as u, urllib.parse as p, json, time
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
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
    "6a596eb0486845358071c723",  # Calendar .ics DTEND fix -> labeled Done, verified
    "6a7771702133ad31bd950f07",  # Fixed dashboard credentials.ts path -> done
    "6a73594afb912eea12dbc184",  # Automate self-healing Tailscale+Docker+shares -> done (watchdog)
    "6a77716b34a5b11e2554006e",  # Generate social templates with Sir Azure -> done (art pipeline)
]
print("=== Batch H ===")
for cid in DONE:
    close(cid, "verified complete (Sir Green)")
print("BATCH H DONE")
