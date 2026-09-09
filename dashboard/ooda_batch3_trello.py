#!/usr/bin/env python3
"""OODA batch 3: board hygiene tracking cards + bot-card progress comments."""
import urllib.request as u, urllib.parse as p, json

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
env={}
for line in open(SRC,encoding='utf-8'):
    line=line.strip()
    if line.startswith('TRELLO_') and '=' in line:
        k,v=line.split('=',1); env[k]=v.strip()
KEY=env['TRELLO_KEY']; TOK=env['TRELLO_TOKEN']
BOARD="6a595669b8f8f99c93392f4f"
BASE="https://api.trello.com/1"

def call(path, data=None, method='GET', tries=3):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            import time; time.sleep(4*(i+1))
            last={"error":str(e)[:120]}
    return last

# Find Sir Green's Queue list id
lists=call(f"/boards/{BOARD}/lists")
if isinstance(lists, dict):
    print("Trello error:", lists); raise SystemExit(1)
sgq=[l for l in lists if 'sir green' in l['name'].lower() and 'queue' in l['name'].lower()]
if not sgq:
    sgq=[l for l in lists if 'sir green' in l['name'].lower()]
sgq_id=sgq[0]['id'] if sgq else lists[0]['id']
print("Sir Green Queue list id:", sgq_id, "(name:", (sgq[0]['name'] if sgq else '?')+")")

# Create dedupe plan card
r=call("/cards", {"name":"[OODA] Dedupe Sir Green's Queue (554 -> ~90) + kill rogue OODA loops","idList":sgq_id,
    "desc":"Sir Green's Queue has 554 cards; ~460 are 7 rogue-loop templates repeated ~67x each:\n"
           "- Audit Sir Azure build template x68\n- GitHub: add Sir Azure collaborator x68\n"
           "- Document Sir Azure Queue Mapping x67\n- Webhook Event x67\n- Deploy website to free hosting x67\n"
           "- Generate social templates with Sir Azure x67\n- Docker connection established x67\n"
           "PLUS ~58 Torus-repo-sharing near-dupes.\n\nACTION PLAN (needs Captain go):\n"
           "1. First kill rogue OODA loops spawning these (check for stray bash/python loops).\n"
           "2. Keep ONE earliest card per template; bulk-archive the rest via Trello API.\n"
           "3. Verify board 1350 -> ~850.\nSir Green will run the archive script only after Captain approval (destructive).",
    "labels":"yellow"}, method='POST')
print("dedupe card:", r.get('id','ERR'), r.get('error',''))

# Comment progress on the 5 bot cards
BOT=["6a7230651cff6688b1268503","6a7230643f632db39bd3faff","6a7263ec8fe6a6156969b050","6a7263eca1eeaef1cac6a35e","6a7649950963d92423812914"]
for cid in BOT:
    call(f"/cards/{cid}/actions/comments", {"text":"[Sir Green] IN PROGRESS — consolidated into a single Discord bot build (sir_green_discord_bot.py + relay_processor.py) by subagent. Token-from-env, DM path, /health switch, gated relay executor, Trello-label alert routing. Will verify dry-run + close when built."}, method='POST')
    print("commented bot card", cid)
print("BATCH 3 TRACKING DONE")
