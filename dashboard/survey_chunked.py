import urllib.request as u, urllib.parse as p, json, time, os
env={}
for l in open(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env',encoding='utf-8'):
    if l.strip().startswith('TRELLO_') and '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
B='6a595669b8f8f99c93392f4f'
OUT=r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\01_Projects\capta1n_orchestrat0r\dashboard\survey_result.txt'
def call(path,data=None,method='GET'):
    url=f'https://api.trello.com/1/{path}?key={KEY}&token={TOK}'+('&'+p.urlencode(data) if data else '')
    for i in range(5):
        try:
            return json.loads(u.urlopen(u.Request(url,method=method,data=b'' if method in('POST','PUT') else None),timeout=20).read())
        except Exception as e:
            time.sleep(15*(i+1))
    return None
# 1) lists (1 call)
lists=call(f'boards/{B}/lists?fields=name,id')
if not lists:
    open(OUT,'w').write('LISTS_RATE_LIMITED\n'); print('LISTS_RATE_LIMITED'); raise SystemExit
mem=call(f'boards/{B}/members?fields=username') or []
memmap={m['id']:m.get('username') for m in mem}
me_id=None
for mid,u in memmap.items():
    if u in ('void_pirate_capta1n','sir_green'): me_id=mid
unassigned=[]; mine=[]
for lst in lists:
    time.sleep(8)  # spread load
    cards=call(f"lists/{lst['id']}/cards?filter=open&fields=name,id,idMembers")
    if cards is None:
        open(OUT,'w').write(f"LIST_RATE_LIMITED at {lst['name']}\n"); print('LIST_RATE_LIMITED'); raise SystemExit
    for c in cards:
        m=c.get('idMembers',[])
        if not m: unassigned.append((lst['name'],c))
        elif me_id and me_id in m: mine.append((lst['name'],c))
lines=[f"LISTS: {len(lists)}","UNASSIGNED: %d"%len(unassigned),"MINE: %d"%len(mine),""]
lines.append("=== UNASSIGNED ===")
for ln,c in unassigned[:60]:
    lines.append(f"{c['id']} | [{ln[:25]}] {c['name'][:70]}")
lines.append("=== MINE ===")
for ln,c in mine[:60]:
    lines.append(f"{c['id']} | [{ln[:25]}] {c['name'][:70]}")
open(OUT,'w').write('\n'.join(lines)); print('\n'.join(lines[:5]),'\n...(%d unassigned, %d mine)'%(len(unassigned),len(mine)))
