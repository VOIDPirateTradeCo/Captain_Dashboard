#!/usr/bin/env python3
"""Lookup specific Void Ops cards by substring, print id+name+list+labels+desc(head)."""
import urllib.request as u, urllib.parse as p, json
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
B="6a595669b8f8f99c93392f4f"
def get(path):
    import time
    url=f"https://api.trello.com/1/{path}?key={KEY}&token={TOK}"
    for i in range(5):
        try:
            return json.loads(u.urlopen(url,timeout=20).read())
        except Exception as e:
            time.sleep(4*(i+1))
    raise e
terms=["VirtualBox","calendar import workflow for Mrs","Onboard Miss Pink","Design a VOID Pirate flag","OODA loop Discord spam","Gordon caught Sir Green","Deep vault audit"]
allc=get(f"boards/{B}/cards?fields=name,closed,idList,idLabels,desc")
lists={l['id']:l['name'] for l in get(f"boards/{B}/lists")}
labels={l['id']:l['name'] for l in get(f"boards/{B}/labels")}
for t in terms:
    for c in allc:
        if t.lower() in c['name'].lower() and not c['closed']:
            print(f"{c['id']} | {c['name']}")
            print(f"   list={lists.get(c['idList'],'?')} labels={[labels.get(x,'?') for x in c.get('idLabels',[])]}")
            print(f"   desc: {c.get('desc','')[:160].replace(chr(10),' ')}")
            break
    else:
        print(f"[NOT FOUND] {t}")
