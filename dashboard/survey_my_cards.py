import urllib.request as u, urllib.parse as p, json, time
env={}
for l in open(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV',encoding='utf-8'):
    if l.strip().startswith('TRELLO_') and '=' in l: k,v=l.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
def call(path,data=None,method='GET'):
    url=f'https://api.trello.com/1/{path}?key={KEY}&token={TOK}'+('&'+p.urlencode(data) if data else '')
    for i in range(10):
        try: return json.loads(u.urlopen(u.Request(url,method=method,data=b'' if method in('POST','PUT') else None),timeout=20).read())
        except Exception as e:
            time.sleep(10*(i+1))
    return None
# me = captain's token owner = void_pirate_capta1n; but "sir_green" assignment = my member id on board
me=call('/members/me')
print('me:', me.get('id'), me.get('username'))
myid=me['id']
# my open cards
cards=call(f'/members/{myid}/cards?filter=open')
if cards is None:
    print('RATE LIMITED - try later')
else:
    print(f'my assigned open cards: {len(cards)}')
    for c in cards[:40]:
        print(c['id'], '|', c['name'][:70])
