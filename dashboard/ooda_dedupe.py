#!/usr/bin/env python3
"""OODA Dedupe: close exact-name duplicate open cards (keep first), except
Top 10 - Focus Fleet (HARD RULE: never touch). Rate-limited."""
import urllib.request as u, urllib.parse as p, json, time
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BOARD="6a595669b8f8f99c93392f4f"; BASE="https://api.trello.com/1"
def call(path, data=None, method='GET', tries=5):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            time.sleep(4*(i+1)); last={"error":str(e)[:120]}
    return last

lists=call(f"/boards/{BOARD}/lists")
if isinstance(lists,dict): raise SystemExit("err "+str(lists))
focus=[l['id'] for l in lists if 'focus fleet' in l['name'].lower()]
print("Protected Focus Fleet lists:", focus)
allc=call(f"/boards/{BOARD}/cards", {"fields":"id,name,idList,closed"})
if isinstance(allc,dict): raise SystemExit("err "+str(allc))
open_c=[c for c in allc if not c.get('closed') and c['idList'] not in focus]
print("Open (excl Focus Fleet):", len(open_c))

seen={}
dups=[]
for c in open_c:
    nm=c['name'].strip()
    if nm in seen:
        dups.append(c)   # extra copy
    else:
        seen[nm]=c['id']

print(f"Exact-name groups with dups: {sum(1 for n in set(c['name'].strip() for c in dups))}")
print(f"Cards to close (extras): {len(dups)}")
closed=0
for c in dups:
    r=call(f"/cards/{c['id']}", {"closed":"true"}, method='PUT')
    if r.get('closed'): closed+=1
    time.sleep(1.0)
print(f"CLOSED duplicates: {closed} / {len(dups)}")
