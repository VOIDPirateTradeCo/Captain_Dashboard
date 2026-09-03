import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()
list_id = '6a839af9b5e7e56792d25e8e'

def post_card(card):
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token) + '&idList=' + urllib.parse.quote(list_id)
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    conn.request('POST', '/1/cards?' + qs, json.dumps(card).encode(), {'Content-Type':'application/json'})
    r = conn.getresponse()
    data = r.read().decode()
    conn.close()
    return r.status, data

cards = [
  {'name': '[P0] STEALTHATTACK must reach master SQUIDSTATION https://192.168.0.39:3100', 'desc': 'Master SQUIDSTATION Mission Control runs on HTTPS 3100. From STEALTHATTACK, verify: curl -sS https://192.168.0.39:3100/health. If cert blocks you, add permanent exception. Do NOT run MC on 3100 on STEALTHATTACK.', 'labels': 'sir-azure,mission control'},
  {'name': 'Clone Captain_Dashboard and build Mission Control on STEALTHATTACK', 'desc': 'git clone https://github.com/VOIDPirateTradeCo/Captain_Dashboard.git. The Next.js source is Captain_Dashboard/mission-control. cd mission-control; copy src/scripts/sir-green/pinkcady-bootstrap/.env .env; npx next build --webpack; npx next dev --hostname 0.0.0.0 --port 3000.', 'labels': 'sir-azure,mission control'},
  {'name': 'Create STEALTHATTACK .env pointing to master SQUIDSTATION Mission Control', 'desc': 'Set NEXT_PUBLIC_MC_API_URL=https://192.168.0.39:3100. Local MC runs on http://localhost:3000. Master auth uses cookie login, not x-api-key.', 'labels': 'sir-azure,mission control'},
  {'name': 'Configure Sir Azure GPU/art agents and free-tier model cascade on STEALTHATTACK', 'desc': 'In master Mission Control, create agent sir-azure with framework=hermes and scope=gpu-art. Set tokenBudget mode=fallbackModels with preferFree=true. Use free-tier models first; paid escalation minimal.', 'labels': 'sir-azure,mission control'},
  {'name': 'Verify Sir Azure heartbeat and task feed from master Mission Control', 'desc': 'After registration, verify GET https://192.168.0.39:3100/api/agents shows sir-azure online. Verify /api/fleet/connectivity shows STEALTHATTACK reachable=true.', 'labels': 'sir-azure,mission control'},
  {'name': '[P2] STEALTHATTACK local runtime readiness checklist — paste output back here', 'desc': '1) npx next build --webpack -> green. 2) http://localhost:3000/health -> 200. 3) https://192.168.0.39:3100/health -> 200. 4) POST /api/auth/login captain/captain -> cookie. 5) GET /api/agents with cookie -> sir-azure listed. 6) GET /api/fleet/connectivity with cookie -> STEALTHATTACK reachable=true. Paste output back here.', 'labels': 'sir-azure,mission control'},
  {'name': 'Mesh verification: PINKCADY ↔ STEALTHATTACK full mesh connectivity', 'desc': 'After both ships are online, verify full mesh: SQUIDSTATION -> PINKCADY, SQUIDSTATION -> STEALTHATTACK, PINKCADY -> STEALTHATTACK, STEALTHATTACK -> PINKCADY. Use master /api/fleet/mesh/verify endpoint. Each ship must be able to reach the other two ships on port 3000. Paste mesh verification output here.', 'labels': 'sir-azure,mission control'},
]

for card in cards:
    s, d = post_card(card)
    print(s, card['name'][:70])
