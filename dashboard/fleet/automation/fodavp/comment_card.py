import urllib.request as u, urllib.parse as p, json

SECRETS_PATH = r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault\02_Business_Operations\_Hub\_KEY_VAULT\secrets.env'
env = {}
with open(SECRETS_PATH, 'r', encoding='utf-8') as f:
    for line in f:
        line=line.strip()
        if line.startswith('TRELLO_') and '=' in line:
            k,v=line.split('=',1)
            env[k.strip()]=v.strip().strip('"').strip("'")

KEY = env.get('TRELLO_KEY') or env.get('TRELLO_API_KEY')
TOKEN = env.get('TRELLO_TOKEN')
AUTH = f"?key={p.quote(KEY)}&token={p.quote(TOKEN)}"
BASE = "https://api.trello.com/1"

def call(path, body, method='GET'):
    data = None
    if body:
        data = json.dumps(body).encode()
    req = u.Request(f"{BASE}{path}{AUTH}", data=data, headers={'Content-Type':'application/json'}, method=method)
    with u.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

import sys
card_id = sys.argv[1]
note = sys.argv[2]
result = call(f'/cards/{card_id}/actions/comments', {'text': note}, 'POST')
print('comment_id:', result.get('id'))
