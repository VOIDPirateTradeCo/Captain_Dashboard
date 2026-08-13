#!/usr/bin/env python3
"""Survey VOID Ops board: list all lists + card counts + open cards (id, name, list)."""
import urllib.request as u, urllib.parse as p, json

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BOARD="6a595669b8f8f99c93392f4f"; BASE="https://api.trello.com/1"
def call(path, data=None, method='GET', tries=3):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            import time; time.sleep(3*(i+1)); last={"error":str(e)[:120]}
    return last

lists=call(f"/boards/{BOARD}/lists")
if isinstance(lists,dict): raise SystemExit("err "+str(lists))
print(f"LISTS ({len(lists)}):")
for l in lists:
    print(f"  [{l['id'][:6]}] {l['name']}")
# cards per list
allc=call(f"/boards/{BOARD}/cards", {"fields":"id,name,idList,closed,labels"})
if isinstance(allc,dict): raise SystemExit("err "+str(allc))
open_cards=[c for c in allc if not c.get('closed')]
print(f"\nOPEN CARDS: {len(open_cards)}")
by_list={}
for c in open_cards:
    by_list.setdefault(c['idList'],[]).append(c)
for l in lists:
    cards=by_list.get(l['id'],[])
    if cards:
        print(f"\n## {l['name']} ({len(cards)})")
        for c in cards[:60]:
            labs=",".join(lb.get('name','') for lb in c.get('labels',[]) if lb.get('name'))
            print(f"  {c['id']} | {c['name'][:70]} | {labs}")
print("\nTOTAL OPEN:", len(open_cards))
