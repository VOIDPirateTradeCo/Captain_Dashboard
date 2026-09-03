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

notes = """Sir Green fleet bootstrap update — PINKCADY next steps:
1) Copy `env.pinkcady` to `.env` in `Captain_Dashboard/mission-control`.
2) Restart dev server with LAN bind: `npx next dev --hostname 0.0.0.0 --port 3000`.
3) Open http://localhost:3000 and create a local account for Miss Pink.
4) Create local agent `miss-pink` with `scope=torus-coffee`.
5) Login to master: `POST https://192.168.0.39:3100/api/auth/login` with `captain`/`captain` and save cookie.
6) Create master agent `miss-pink` with `scope=torus-coffee`.
7) Verify: `GET https://192.168.0.39:3100/api/agents` with cookie -> `miss-pink` online.
8) Run mesh verification from `fleet-bootstrap/pinkcady/fleet-mesh-setup.md` and paste output back here.

If PINKCADY port 3000 already serves another site, stop it first or use port 3001 and update `.env` accordingly."""

for card_id in ['6a98798b24355bf40e186dbc', '6a986f2c00f9b564696eb06d']:
    post_comment(card_id, notes)
