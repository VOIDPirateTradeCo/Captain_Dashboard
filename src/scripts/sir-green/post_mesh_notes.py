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

torus_notes = """Sir Green mesh verification instructions for PINKCADY:
After your Mission Control is running on http://localhost:3000, run these from PINKCADY and paste output back here.

1) Local health:
curl -sS http://localhost:3000/health

2) Master login:
curl -sS -X POST https://192.168.0.39:3100/api/auth/login -H 'Content-Type: application/json' -d '{"username":"captain","password":"captain"}' --cookie-jar cookies.txt

3) Master agents:
curl -sS https://192.168.0.39:3100/api/agents -b cookies.txt

4) Master connectivity:
curl -sS https://192.168.0.39:3100/api/fleet/connectivity -b cookies.txt

5) Self-reachability from PINKCADY:
curl -sS http://localhost:3000/api/agents

6) Cross-ship from PINKCADY to STEALTHATTACK:
curl -sS http://192.168.0.68:3000/health
curl -sS http://192.168.0.68:3000/api/health

7) Cross-ship from PINKCADY to SQUIDSTATION master:
curl -sS https://192.168.0.39:3100/health

Expected:
- Steps 1, 5, 6, 7 should show reachable endpoints.
- Step 4 should eventually show PINKCADY reachable=true from master after master is restarted with the corrected fleet probe IP."""

sir_azure_notes = """Sir Green mesh verification instructions for STEALTHATTACK:
After your Mission Control is running on http://localhost:3000, run these from STEALTHATTACK and paste output back here.

1) Local health:
curl -sS http://localhost:3000/health

2) Master login:
curl -sS -X POST https://192.168.0.39:3100/api/auth/login -H 'Content-Type: application/json' -d '{"username":"captain","password":"captain"}' --cookie-jar cookies.txt

3) Master agents:
curl -sS https://192.168.0.39:3100/api/agents -b cookies.txt

4) Master connectivity:
curl -sS https://192.168.0.39:3100/api/fleet/connectivity -b cookies.txt

5) Self-reachability from STEALTHATTACK:
curl -sS http://localhost:3000/api/agents

6) Cross-ship from STEALTHATTACK to PINKCADY:
curl -sS http://192.168.0.180:3000/health
curl -sS http://192.168.0.180:3000/api/health

7) Cross-ship from STEALTHATTACK to SQUIDSTATION master:
curl -sS https://192.168.0.39:3100/health

Expected:
- Steps 1, 5, 6, 7 should show reachable endpoints.
- Step 4 should eventually show STEALTHATTACK reachable=true from master."""

post_comment('6a98798b24355bf40e186dbc', torus_notes)
post_comment('6a989b33a54abc8a763cd7a1', sir_azure_notes)
post_comment('6a989b333c31c1580da0ce38', sir_azure_notes)
