import urllib.request as u, urllib.parse as p, json, time, os
env={}
for l in open(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV',encoding='utf-8'):
    if l.strip().startswith('TRELLO_') and '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
B='6a595669b8f8f99c93392f4f'
OUT=r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\01_Projects\capta1n_orchestrat0r\dashboard\survey_result.txt'
def call(path,data=None,method='GET'):
    url=f'https://api.trello.com/1/{path}?key={KEY}&token={TOK}'+('&'+p.urlencode(data) if data else '')
    for i in range(12):
        try:
            return json.loads(u.urlopen(u.Request(url,method=method,data=b'' if method in('POST','PUT') else None),timeout=25).read())
        except Exception as e:
            time.sleep(12*(i+1))
    return None
# ONE efficient call: open cards, minimal fields
cards=call(f'boards/{B}/cards?filter=open&fields=name,id,idMembers,idList,closed')
if cards is None:
    open(OUT,'w').write('RATE_LIMITED - retry later\n')
    print('RATE_LIMITED')
else:
    # members of board (to map id->name)
    mem=call(f'boards/{B}/members?fields=username') or []
    memmap={m['id']:m.get('username') for m in mem}
    me_id=None
    for mid,u in memmap.items():
        if u in ('void_pirate_capta1n','sir_green'): me_id=mid
    unassigned=[]; mine=[]
    for c in cards:
        members=c.get('idMembers',[])
        if not members: unassigned.append(c)
        elif me_id and me_id in members: mine.append(c)
    lines=[f"TOTAL OPEN: {len(cards)}", f"UNASSIGNED: {len(unassigned)}", f"MINE(sir_green/captain): {len(mine)}", ""]
    lines.append("=== UNASSIGNED (first 40) ===")
    for c in unassigned[:40]:
        lines.append(f"{c['id']} | {c['name'][:75]}")
    lines.append("")
    lines.append("=== ASSIGNED TO ME/CAPTAIN (first 40) ===")
    for c in mine[:40]:
        lines.append(f"{c['id']} | {c['name'][:75]}")
    out='\n'.join(lines)
    open(OUT,'w').write(out)
    print(out)
