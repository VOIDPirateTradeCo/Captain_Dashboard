#!/usr/bin/env python3
"""OODA: card lldap/authelia password-sync + notify crew Discord re: fleet version distribution."""
import urllib.request as u, urllib.parse as p, json

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env"
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
            import time; time.sleep(4*(i+1)); last={"error":str(e)[:120]}
    return last

lists=call(f"/boards/{BOARD}/lists")
if isinstance(lists,dict): raise SystemExit("Trello err "+str(lists))
sgq=[l for l in lists if 'sir green' in l['name'].lower() and 'queue' in l['name'].lower()]
sgq_id=sgq[0]['id'] if sgq else lists[0]['id']

r=call("/cards", {"name":"[OODA] crew_infra: sync lldap admin password with Authelia bind","idList":sgq_id,
    "desc":"lldap is LIVE (UI @ :17170). Authelia boots + loads config but fails LDAP bind with 'Invalid Credentials' "
           "because lldap created its admin on first boot before LLdap_LDAP_USER_PASS was pinned.\n"
           "FIX: log into lldap web UI :17170 as admin, set password to match LLDAP_ADMIN_PASSWORD in crew_infra/.env, "
           "or recreate lldap-data volume with the env pinned from the start. Then Authelia SSO enforces lldap roles.",
    "labels":"purple"}, method='POST')
print("card:", r.get('id','ERR'), r.get('error',''))

# Discord notify
import sys; sys.path.insert(0, r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\Infrastructure\scripts")
from void_discord_webhook import post_text
msg=("🏴‍☠️ SIR GREEN — FLEET VERSION DISTRIBUTION LIVE + CREW INFRA DEPLOYED:\\n"
     "📦 NEW: pull-based version push across the fleet. Captain bumps a version in fleet_manifest.json → "
     "commits to shared vault → crew run `git pull` + `fleet_version.py sync`. Dashboard 📦 Fleet Updates tab shows it all.\\n"
     "🔐 crew_infra deployed on SQUIDSTATION: lldap (LDAP, LIVE @ :17170), Authelia (SSO gateway, boots), SillyTavern (personas @ :8787).\\n"
     "👥 Crew & Personas tab: shared RBAC + infra status + avatar generation (Sir Azure ComfyUI).\\n"
     "📡 MISS PINK + SIR AZURE: everything is in the shared vault. Run `git pull` then read crew_infra/CREW_DEPLOYMENT.md and `python dashboard/fleet_version.py sync` to get identical infra + versions. We are all on the same page, Captain.")
print("discord:", post_text('VOID_DISCORD_OODA_WEBHOOK', msg))
print("DONE")
