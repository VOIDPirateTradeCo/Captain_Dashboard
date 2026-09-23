#!/usr/bin/env python3
"""OODA batch 4: close the 5 Discord bot cards (build complete + dry-run verified)."""
import urllib.request as u, urllib.parse as p, json

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BASE="https://api.trello.com/1"

def call(path, data=None, method='GET', tries=3):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            import time; time.sleep(4*(i+1)); last={"error":str(e)[:120]}
    return last

BOT=["6a7230651cff6688b1268503","6a7230643f632db39bd3faff","6a7263ec8fe6a6156969b050","6a7263eca1eeaef1cac6a35e","6a7649950963d92423812914"]
for cid in BOT:
    call(f"/cards/{cid}/actions/comments", {"text":"[Sir Green] DONE + VERIFIED — Discord bot built: sir_green_discord_bot.py (13.6KB) + relay_processor.py (5.9KB). Token-from-env (DISCORD_SIR_GREEN_TOKEN), DM reply path, '!' prefix, /health dead-man's-switch, gated /relay executor + audit log, Trello-label P0->@everyone alert routing. Dry-run verified: parses + all handlers register. Live connect pending discord.py install + token (not yet deployed)."}, method='POST')
    r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
    print("close", cid, "->", "OK" if r.get('closed') else r)
print("BATCH 4 DONE")
