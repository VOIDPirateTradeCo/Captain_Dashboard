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

sir_azure_prompt = """Sir Green mesh update — Tailscale-first connection:

Your Mission Control is already reachable via Tailscale from SQUIDSTATION:
- http://100.110.238.68:3000/health → 200 OK

Master SQUIDSTATION now probes Tailscale IPs FIRST, so you don't need LAN access.

EXECUTE THESE COMMANDS ON STEALTHATTACK from S:\\Sir_Azure\\Captain_Dashboard\\mission-control:

1) Verify local MC is running:
curl.exe -sS http://localhost:3000/health

2) Login to master SQUIDSTATION (note -k for self-signed cert):
curl.exe -sS -X POST https://192.168.0.39:3100/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"captain\\",\\"password\\":\\"captain\\"}" --cookie-jar C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

3) Create master agent sir-azure:
curl.exe -sS -X POST https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -H "Content-Type: application/json" -d "{\\"agentId\\":\\"sir-azure\\",\\"name\\":\\"Sir Azure\\",\\"framework\\":\\"hermes\\",\\"ship\\":\\"STEALTHATTACK\\",\\"scope\\":\\"gpu-art\\"}" -k

4) Verify master sees you:
curl.exe -sS https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

5) Verify fleet connectivity:
curl.exe -sS https://192.168.0.39:3100/api/fleet/connectivity -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

6) Verify full mesh:
curl.exe -sS https://192.168.0.39:3100/api/fleet/mesh/verify -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

PASTE ALL OUTPUT BACK HERE."""

miss_pink_prompt = """Sir Green mesh update — Tailscale-first connection:

Your Mission Control is already reachable via Tailscale from SQUIDSTATION:
- http://100.106.235.103:3000/health → 200 OK

Master SQUIDSTATION now probes Tailscale IPs FIRST, so you don't need LAN access.

EXECUTE THESE COMMANDS ON PINKCADY:

1) Verify local MC is running:
curl.exe -sS http://localhost:3000/health

2) Login to master SQUIDSTATION (note -k for self-signed cert):
curl.exe -sS -X POST https://192.168.0.39:3100/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"captain\\",\\"password\\":\\"captain\\"}" --cookie-jar C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

3) Create master agent miss-pink:
curl.exe -sS -X POST https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -H "Content-Type: application/json" -d "{\\"agentId\\":\\"miss-pink\\",\\"name\\":\\"Miss Pink\\",\\"framework\\":\\"hermes\\",\\"ship\\":\\"PINKCADY\\",\\"scope\\":\\"torus-coffee\\"}" -k

4) Verify master sees you:
curl.exe -sS https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

5) Verify fleet connectivity:
curl.exe -sS https://192.168.0.39:3100/api/fleet/connectivity -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

6) Verify full mesh:
curl.exe -sS https://192.168.0.39:3100/api/fleet/mesh/verify -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

PASTE ALL OUTPUT BACK HERE."""

# Sir Azure cards
sir_azure_cards = [
  '6a989c24941683a3c2da9aae',
  '6a989c26f0c4073a47e8e1f7',
  '6a989c27048b63ff4e5837b7',
  '6a98929557c5a0274684be0',
  '6a989c2a88e43351c19643a0',
  '6a989b33a54abc8a763cd7a1',
  '6a989b333c31c1580da0ce38',
]
for card_id in sir_azure_cards:
    try:
        post_comment(card_id, sir_azure_prompt)
    except Exception as e:
        print('ERROR', card_id, e)

# Miss Pink cards
miss_pink_cards = [
  '6a98798b24355bf40e186dbc',
  '6a986f2c00f9b564696eb06d',
  '6a989fa4b05ad4e736393990',
  '6a989fa50bfe0f721ba3f09b',
  '6a989fa73e088513117f4b8d',
]
for card_id in miss_pink_cards:
    try:
        post_comment(card_id, miss_pink_prompt)
    except Exception as e:
        print('ERROR', card_id, e)
