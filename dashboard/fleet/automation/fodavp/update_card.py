import urllib.request as u, urllib.parse as p, json, sys

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
if not KEY or not TOKEN:
    print("missing trello creds")
    sys.exit(1)

AUTH = f"?key={p.quote(KEY)}&token={p.quote(TOKEN)}"
BASE = "https://api.trello.com/1"

def api(method, path, body=None):
    data = None
    headers = {"Content-Type":"application/json"}
    if body is not None:
        data = json.dumps(body).encode()
    req = u.Request(f"{BASE}{path}{AUTH}", data=data, headers=headers, method=method)
    with u.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

card_id = sys.argv[1] if len(sys.argv) > 1 else ""
note = sys.argv[2] if len(sys.argv) > 2 else "Updated with evidence."
if not card_id:
    print("usage: update_card.py <card_id> <note>")
    sys.exit(1)

result = api("POST", f"/cards/{card_id}/actions/comments", {"text": note})
print("comment_id:", result.get("id"))
