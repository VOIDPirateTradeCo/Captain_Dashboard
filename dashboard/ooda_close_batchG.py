#!/usr/bin/env python3
"""OODA Batch G: close Sir Azure GitHub access cluster (done this session via gh)."""
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
    "6a7355e37779c76e161a2667",  # Add Sir Azure GitHub access VOID/Torus + verify -> done (gh granted)
    "6a7356b845bdcb684da4ca23",  # Sir Azure GitHub access VOID Pirate + Torus -> done
    "6a7356b9f5672c059ea3f5ff",  # Verify Torus Coffee repos shared to Sir Azure -> done
    "6a7357e74df5c9c1e2577284",  # Sir Azure connect to VOID Pirate GitHub org full rights -> done
    "6a7357e7ea4fa11b00e77e1f",  # Share Torus Coffee repos to Sir Azure -> done
    "6a7357e7b42d4ceb9ba5373d",  # Sir Azure GitHub scoped to collaboration -> done
    "6a7359498c5429c98d78918c",  # Fix SQUIDSTATION Tailscale -> infra (verified reachable)
    "6a73596e5d25b723196051e2",  # SQUIDSTATION restore Tailscale -> done (mesh reachable)
]
print("=== Batch G ===")
for cid in DONE:
    close(cid, "verified done (Sir Green, gh grant)")
print("BATCH G DONE")
