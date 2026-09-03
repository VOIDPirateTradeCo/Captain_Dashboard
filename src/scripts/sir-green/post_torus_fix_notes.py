import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

notes = {
  '6a987701b4c29d8cc5a807e5': """Sir Green source-path correction:
- Use THIS repo: VOIDPirateTradeCo/Captain_Dashboard
- The Next.js Mission Control source is the mission-control/ folder inside that repo.
- If your cloned folder is Vite/React, you cloned the wrong repo.
- Correct clone: git clone https://github.com/VOIDPirateTradeCo/Captain_Dashboard.git
- Then cd Captain_Dashboard/mission-control
- Run: npx next build --webpack
- Run: npx next dev --hostname 0.0.0.0 --port 3000""",
  '6a98798b24355bf40e186dbc': """Sir Green auth correction:
- Do NOT use x-api-key headers for /api/fleet/*.
- Master uses cookie auth. Login once with captain/captain and reuse the cookie.
- Example login: POST https://192.168.0.39:3100/api/auth/login with username=captain, password=captain
- Then reuse that cookie for /api/fleet/connectivity and /api/agents""",
  '6a987ae1b64a45fb980e4ad3': """Sir Green master ingress confirmation:
- Master SQUIDSTATION Mission Control runs on https://192.168.0.39:3100
- PINKCADY local instance runs on http://localhost:3000
- PINKCADY must NOT run MC on 3100. Only master owns 3100.""",
  '6a987702c0e462d43f7eb766': """Sir Green register instructions:
- From PINKCADY, after login to master:
POST https://192.168.0.39:3100/api/agents/register
Body: {"agentId":"miss-pink","name":"Miss Pink","framework":"hermes","metadata":{"host":"PINKCADY","scope":"torus-coffee"}}""",
  '6a9877011423f5ea72b96b74': """Sir Green .env for PINKCADY:
NEXT_PUBLIC_MC_API_URL=https://192.168.0.39:3100
NEXT_PUBLIC_APP_NAME=Torus Coffee Mission Control
Do NOT set any API key header unless master explicitly requires it.""",
  '6a987703dbd2f62bd4bf7ec8': """Sir Green agent config:
- In master Mission Control, set miss-pink tokenBudget mode to fallbackModels with preferFree=true.
- Use free-tier models first; paid escalation array should be minimal.""",
  '6a987703717e926f5a466ab2': """Sir Green heartbeat verification:
- From PINKCADY, after registration, verify:
GET https://192.168.0.39:3100/api/agents with master cookie
- miss-pink should show online once local MC starts heartbeating.""",
}

for card_id, note in notes.items():
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    conn.request('POST', '/1/cards/' + card_id + '/actions/comments?' + qs, json.dumps({'text': note}).encode(), {'Content-Type':'application/json'})
    r = conn.getresponse()
    print(card_id, r.status)
    conn.close()
