#!/usr/bin/env python3
"""OODA: create Crew&Personas follow-up card + notify crew via Discord."""
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

# find Sir Green's Queue
lists=call(f"/boards/{BOARD}/lists")
if isinstance(lists,dict): raise SystemExit("Trello err "+str(lists))
sgq=[l for l in lists if 'sir green' in l['name'].lower() and 'queue' in l['name'].lower()]
sgq_id=sgq[0]['id'] if sgq else lists[0]['id']

r=call("/cards", {"name":"[OODA] Crew & Personas: wire full ComfyUI SDXL avatar workflow","idList":sgq_id,
    "desc":"Crew & Personas tab + /api/crew live. Avatar 'Generate' currently records intent (ComfyUI reached, 400 on bare payload).\n"
           "TODO: build a proper ComfyUI workflow graph (checkpoint loader -> CLIP -> text-encode -> KSampler -> VAE decode -> save image) "
           "pointing at Sir Azure's SDXL model, POST to /prompt, poll /history, save PNG to vault personas/ folder, display in Crew tab.\n"
           "Also consider: lldap (free LDAP) for true shared auth, Authelia gateway, SillyTavern for persona chat management.",
    "labels":"purple"}, method='POST')
print("card:", r.get('id','ERR'), r.get('error',''))
print("DONE")
