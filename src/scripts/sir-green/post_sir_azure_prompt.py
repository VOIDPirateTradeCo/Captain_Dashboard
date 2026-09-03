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

prompt = """CORRECTED POWERSHELL PROMPT FOR STEALTHATTACK — run these EXACTLY in order:

IMPORTANT: Run from S:\\Sir_Azure\\Captain_Dashboard\\mission-control
DO NOT use C:\\WINDOWS\\system32
DO NOT use Y: drive
USE curl.exe (not curl)
USE -k for master HTTPS because cert is self-signed

Step 1: cd into mission-control
cd S:\\Sir_Azure\\Captain_Dashboard\\mission-control

Step 2: Copy .env from local bootstrap
copy S:\\Sir_Azure\\Captain_Dashboard\\mission-control\\src\\scripts\\sir-green\\fleet-bootstrap\\stealthattack\\env.stealthattack .env

Step 3: Build
npx next build --webpack

Step 4: Start dev server
npx next dev --hostname 0.0.0.0 --port 3000
# Leave this running. Open a NEW PowerShell window for steps 5-8.

Step 5: In NEW window, create local agent
curl.exe -sS -X POST http://localhost:3000/api/agents -H "Content-Type: application/json" -d "{\\"agentId\\":\\"sir-azure\\",\\"name\\":\\"Sir Azure\\",\\"framework\\":\\"hermes\\",\\"ship\\":\\"STEALTHATTACK\\",\\"scope\\":\\"gpu-art\\"}"

Step 6: Login to master SQUIDSTATION (note the -k flag)
curl.exe -sS -X POST https://192.168.0.39:3100/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"captain\\",\\"password\\":\\"captain\\"}" --cookie-jar C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

Step 7: Create master agent
curl.exe -sS -X POST https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -H "Content-Type: application/json" -d "{\\"agentId\\":\\"sir-azure\\",\\"name\\":\\"Sir Azure\\",\\"framework\\":\\"hermes\\",\\"ship\\":\\"STEALTHATTACK\\",\\"scope\\":\\"gpu-art\\"}" -k

Step 8: Verify
curl.exe -sS https://192.168.0.39:3100/api/agents -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k
curl.exe -sS https://192.168.0.39:3100/api/fleet/connectivity -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k
curl.exe -sS https://192.168.0.39:3100/api/fleet/mesh/verify -b C:\\Users\\kidsm\\AppData\\Local\\Temp\\mc-cookies.txt -k

PASTE ALL OUTPUT BACK HERE."""

cards = [
  '6a989c24941683a3c2da9aae',
  '6a989c26f0c4073a47e8e1f7',
  '6a989c2a88e43351c19643a0',
  '6a989b33a54abc8a763cd7a1',
  '6a989b333c31c1580da0ce38',
]

for card_id in cards:
    try:
        post_comment(card_id, prompt)
    except Exception as e:
        print('ERROR', card_id, e)
