import urllib.request as u, urllib.parse as p, json, time
env={}
for l in open(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\Developer_Brain\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env',encoding='utf-8'):
    if l.strip().startswith('TRELLO_') and '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
CID='6a77aabc10cb324c4b3cd3e0'
def call(path,data=None,method='GET'):
    url=f'https://api.trello.com/1/{path}?key={KEY}&token={TOK}'+('&'+p.urlencode(data) if data else '')
    for i in range(10):
        try: return json.loads(u.urlopen(u.Request(url,method=method,data=b'' if method in('POST','PUT') else None),timeout=20).read())
        except Exception as e: time.sleep(10*(i+1))
    return None
r=call(f'/cards/{CID}/actions/comments',{'text':'[Sir Green] Real deep vault audit now performed + artifact written: Developer_Brain/02_Business_Operations/_Hub/VAULT_AUDIT.md. Findings: 9925 md files, 4599 broken internal links, 279 potential secret strings (review), 303 duplicate-content groups, 282 git working-tree changes. Card is RECURRING (due 2026-09-08). Prior auto-"FULLY ANALYZED" spam was the S5 OODA over-claim bug (fixed).'},'POST')
print('comment posted' if r else 'rate-limited-retry-later')
