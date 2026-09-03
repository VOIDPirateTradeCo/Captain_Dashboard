import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

def trello(path, method='GET', body=None):
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    url = urllib.parse.urlparse('https://api.trello.com' + path)
    conn = http.client.HTTPSConnection(url.hostname, context=ctx)
    body_data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if body_data:
        headers['Content-Length'] = str(len(body_data))
    conn.request(method, url.path + '?' + qs, body=body_data, headers=headers)
    r = conn.getresponse()
    data = r.read().decode()
    conn.close()
    return r.status, data

card_notes = {
  '6a987702c0e462d43f7eb766': '''Sir Green notes — Register miss-pink agent:\n- Master reachable: https://100.83.247.14:3100/health (Tailscale) and https://192.168.0.39:3100/health (LAN) both ok.\n- PINKCADY Tailscale IP: 100.106.235.103, LAN IP: 192.168.0.180, local MC: 3000.\n- Use captain/captain auth; create agent miss-pink in master with Torus Coffee scope and free-tier model cascade.''',
  '6a987ae1b64a45fb980e4ad3': '''Sir Green notes — HTTPS only for master:\n- Verified from PINKCADY: https://192.168.0.39:3100 and https://100.83.247.14:3100 both open.\n- Do NOT use HTTP for master. Add permanent cert exception if browser blocks self-signed cert.''',
  '6a987701b4c29d8cc5a807e5': '''Sir Green notes — Clone and build on PINKCADY:\n- Verified PINKCADY ports 3000 and 3100 reachable from SQUIDSTATION.\n- git clone Captain_Dashboard; cd mission-control; copy pinkcady-bootstrap/.env; run npx next build --webpack. Paste exact errors if any.''',
  '6a9877011423f5ea72b96b74': '''Sir Green notes — PINKCADY .env:\n- NEXT_PUBLIC_MC_API_URL=https://192.168.0.39:3100\n- Local MC: http://localhost:3000\n- Master auth cookie domain: 192.168.0.39:3100 or 100.83.247.14:3100''',
  '6a987703dbd2f62bd4bf7ec8': '''Sir Green notes — Torus Coffee agents + free-tier cascade:\n- Use tokenBudget mode: fallbackModels with preferFree + hardStopPaid rules.\n- Paid escalation array should be minimal; default template updated for free-first routing.''',
  '6a987703717e926f5a466ab2': '''Sir Green notes — Heartbeat verification:\n- After agent creation, verify GET /api/agents on master shows miss-pink online.\n- Connectivity probe confirmed PINKCADY→SQUIDSTATION 3100/3000 OK from SQUIDSTATION side.''',
  '6a98798b24355bf40e186dbc': '''Sir Green notes — PINKCADY local runtime readiness checklist:\n1) npx next build --webpack → green\n2) http://localhost:3000/health → 200\n3) https://192.168.0.39:3100/health → 200\n4) POST /api/auth/login captain/captain → cookie\n5) GET /api/agents with cookie → 200 with miss-pink listed\nPaste terminal output back here.'''
}

for card_id, note in card_notes.items():
    s, d = trello(f'/1/cards/{card_id}/actions/comments', method='POST', body={'text': note})
    print(card_id, s)
