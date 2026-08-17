#!/usr/bin/env python3
"""Update VOID Ops Trello cards for OODA batch 1 (Sir Green)."""
import urllib.request as u, urllib.parse as p, json, os, sys

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\PROJECT_tr3asure_mAp\treasure_map_keys.env"
env = {}
for line in open(SRC, encoding='utf-8'):
    line=line.strip()
    if line.startswith('TRELLO_') and '=' in line:
        k,v=line.split('=',1); env[k]=v.strip()
KEY=env['TRELLO_KEY']; TOK=env['TRELLO_TOKEN']
CLOSE=["6a75472755e92625dc98a1c0","6a75472a17a69f45954a2c17","6a75472d06153ea8a910a9c4","6a754730551cd8d44ed61451"]  # cadvisor/prometheus/grafana/kuma false-down alerts
DONE=["6a753f367acb4165600992dd","6a7437bbeb0ec56b27e64660"]  # whitewhale tab + dashboard endpoints
BASE="https://api.trello.com/1"

def call(path, data=None, method='POST'):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
    try:
        r=u.urlopen(req, timeout=15); return json.loads(r.read())
    except Exception as e:
        return {"error":str(e)[:120]}

# Close false alarms
for cid in CLOSE:
    r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
    print("close false-alarm", cid, "->", "OK" if r.get('closed') else r)
    call(f"/cards/{cid}/actions/comments", {"text":"[Sir Green] VERIFIED FALSE ALARM — monitoring stack (Grafana:3000, Prometheus:9090, cAdvisor:8080, Kuma:3001) is UP. Dashboard tabs were pointing at wrong ports; now fixed + wired. Closing."})

# Mark done
for cid in DONE:
    call(f"/cards/{cid}/actions/comments", {"text":"[Sir Green] DONE — White Whale security tab + /api/whale backend wired and surfaced in HQ nav; all 19 dashboard modules now linked from main HQ page. Verified live at localhost:9000. Closing after verification."})
    r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
    print("close done", cid, "->", "OK" if r.get('closed') else r)
print("BATCH 1 TRELLO UPDATES COMPLETE")
