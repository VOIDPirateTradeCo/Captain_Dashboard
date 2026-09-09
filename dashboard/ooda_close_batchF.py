#!/usr/bin/env python3
"""OODA Batch F: close cards addressed by new artifacts this loop."""
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
    "6a76528e2eea3e269a5a9fc6",  # ComfyUI Queue System pause/resume -> addressed (comfyui_queue_manager.py)
    "6a744d8826493b8ee73bd535",  # sqlite-vec embeddings research -> addressed (SQLITE_VEC_RESEARCH.md)
]
print("=== Batch F ===")
for cid in DONE:
    close(cid, "addressed by new artifact (Sir Green)")
print("BATCH F DONE")
