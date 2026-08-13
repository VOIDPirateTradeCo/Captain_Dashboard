#!/usr/bin/env python3
"""Close a Trello card (archive) with rate-limit retry. Usage: python close_card.py <card_id> <note>"""
import sys, urllib.request as u, urllib.parse as p, json, time
SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BASE="https://api.trello.com/1"
def call(path, data=None, method='GET'):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(6):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=20).read())
        except Exception as e:
            time.sleep(5*(i+1))
    raise SystemExit(f"failed: {path}")
cid=sys.argv[1]; note=sys.argv[2] if len(sys.argv)>2 else "verified complete (Sir Green)"
# add comment then close
call(f"/cards/{cid}/actions/comments", {"text":f"[Sir Green] {note}"}, method='POST')
r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
print(f"closed {cid[:8]}: {r.get('closed')}")
