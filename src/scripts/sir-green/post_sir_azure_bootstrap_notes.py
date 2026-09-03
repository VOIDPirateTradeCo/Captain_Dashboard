import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

def post_comment(card_id, text):
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    conn.request('POST', '/1/cards/' + card_id + '/actions/comments?' + qs, json.dumps({'text': text}).encode(), {'Content-Type':'application/json'})
    r = conn.getresponse()
    print('comment_status=', r.status, 'card=', card_id)
    conn.close()

clone_card_id = '6a98924941683a3c2da9aae'
env_card_id = '6a98926f0c4073a47e8e1f7'
ready_card_id = '6a989b33a54abc8a763cd7a1'
mesh_card_id = '6a989b333c31c1580da0ce38'
sir_azure_agent_card_id = '6a98929557c5a0274684be0'

notes = """Sir Green fleet bootstrap update — exact next steps:
1) Clone `VOIDPirateTradeCo/Captain_Dashboard` to STEALTHATTACK.
2) `cd Captain_Dashboard/mission-control`.
3) Copy `src/scripts/sir-green/fleet-bootstrap/stealthattack/env.stealthattack` → `.env`.
4) Run `npx next build --webpack`.
5) Run `npx next dev --hostname 0.0.0.0 --port 3000`.
6) Open http://localhost:3000 and create local agent `sir-azure` with `scope=gpu-art`.
7) Login to master: `POST https://192.168.0.39:3100/api/auth/login` with `captain`/`captain` and save cookie.
8) Create master agent `sir-azure` with `scope=gpu-art`.
9) Verify: `GET https://192.168.0.39:3100/api/agents` with cookie -> `sir-azure` online.
10) Run `src/scripts/sir-green/fleet-bootstrap/stealthattack/fleet-mesh-setup.md` and paste output back here."""

for card_id in [clone_card_id, env_card_id, sir_azure_agent_card_id, ready_card_id, mesh_card_id]:
    post_comment(card_id, notes)
