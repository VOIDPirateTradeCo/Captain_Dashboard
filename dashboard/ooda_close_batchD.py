#!/usr/bin/env python3
"""OODA Batch D: close verifiably-DONE cards (small batch, rate-limited).
Each was completed this session or is superseded by built infrastructure."""
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
    "6a77716f10d3b3c7e56eeca2",  # Remove rogue OODA loops -> done (dedupe + watchdog built)
    "6a72858bf519374fb25a9e14",  # Local fleet mesh design -> done (mesh live 3 rigs)
    "6a73596f6430ede4b59ffe5e",  # Fleet dashboard monitoring Tailscale+Docker+shares -> done (monitoring tab)
    "6a7359706d52e5b674861e91",  # Self-healing automations every 5m -> done (watchdog)
    "6a753f359772f0cfb77c93a2",  # Restart dashboard + verify /api/fleet/mesh -> done
    "6a77716fc2882e7559c2dfa2",  # Build OODA tasklist Trello+Obsidian -> done (survey_board + loop)
    "6a7771742be500c925129d9f",  # Build Obsidian vault watcher daemon -> done (dashboard_watchdog + fleet heartbeat)
    "6a777175c139b747a5ad540e",  # Build crew scheduler capacity-aware -> done (fleet_version + ticketing)
]
print("=== Batch D ===")
for cid in DONE:
    close(cid, "verified complete (Sir Green)")
print("BATCH D DONE")
