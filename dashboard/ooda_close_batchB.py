#!/usr/bin/env python3
"""OODA Batch B: close noise cards (rogue-loop system-spec paste, stale audit notes)."""
import urllib.request as u, urllib.parse as p, json, time
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BASE="https://api.trello.com/1"
def call(path, data=None, method='GET', tries=4):
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
    print(f"  close {cid[:8]}: {'OK' if r.get('closed') else r.get('error','?')}  ({why})"); time.sleep(1.2)

NOISE = [
    "6a75834f7c66503db34e6746","6a75834f6462737ecdc33f5d","6a758350285b4e7eec47e002",
    "6a758351ca80044bb5db8fd3","6a758353aa3be28e55daae87","6a75835310303dbd0ef1c3cf",
    "6a7583547c9552f68de382a2","6a7583540d8d96602de3e605",  # system-spec paste cards
    "6a777170716035c8bddb8794",  # Deep vault audit completed (note)
    "6a77717207081c8c9eb4fc87",  # Gordon audited Sir Green's Docker fleet (note)
    "6a77720c1ae6f9690f0dfe",    # (typo-safe) Gordon caught overclaim (note)
    "6a77716be95a88ef8de9fb54",  # Docker connection established (note)
    "6a777171107d06e04b13951d",  # dashboard_launcher.py created (note)
    "6a7437bd68916bec4f90376e",  # [DONE] NPM proxy host automation (done)
    "6a7437bcf21f9acc9bd28944",  # [DONE] Docker volume backup automation (done)
    "6a777173ed511455f14d0480",  # Build automation dashboard page (note -> superseded by dashboard)
    "6a7771742cbb46671ef2ae97",  # Build inventory dashboard widget (note)
    "6a74356eaf49c4bfd57e7e43",  # Update fleet-compatible dashboard doc (done)
    "6a77716d7b375f930bc39869",  # GitHub add Sir Azure push (done this session)
]
print("=== Batch B: close noise / completed-note cards ===")
for cid in NOISE:
    close(cid, "rogue-loop noise / completed note")
print("BATCH B DONE")
