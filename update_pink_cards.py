import urllib.request, urllib.parse, json
KEY='edb3c4349df2946a8114baadfc9e2ad7'
TOKEN='ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

def api_put_card(card_id, desc, name=None):
    url = f'https://api.trello.com/1/cards/{card_id}?key={KEY}&token={TOKEN}'
    body = 'desc=' + urllib.parse.quote(desc)
    if name:
        body += '&name=' + urllib.parse.quote(name)
    req = urllib.request.Request(url, data=body.encode(), method='PUT', headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# Update Miss Pink's TORUS card with clear workflow
api_put_card('6aa1f3f1ee4ab99c02b8d851', '''## MISS PINK — Agent Node Setup (PINKCADY)

### What You Need To Do
1. Open PowerShell as Administrator on PINKCADY
2. Go to `Z:\Work\Torus Coffee Company LLC\agent-node\sdk`
3. Run: `pip install -e .`
4. Verify: `python -c "from agents.sdk import Agent; print('OK')"`
5. Read `Z:\Work\Torus Coffee Company LLC\agent-node\INSTALL_GUIDE.md`

### Start Heartbeat Daemon
```powershell
cd Z:\Work\Torus Coffee Company LLC\agent-node
python crew_heartbeat.py
```

### Verify
- Should see: `[Miss Pink] Heartbeat daemon starting... Register: ✓`
- Master MC: http://192.168.0.39:3100 (login: captain / voidcaptain2026)

### Evidence to Post Back
After heartbeat starts, post this in the card:
1. Output from `pip install -e .`
2. Output from `python crew_heartbeat.py`
3. Screenshot/URL of Master MC showing you as online''')
print('Updated Miss Pink TORUS card')

# Update card 826 - SQUIDSTATION Master MC status
api_put_card('6aa1f488a7900fddfe4c3fb6', '''## RESOLVED: Master MC is UP

### Status (verified 2026-09-10)
- Master MC is RUNNING at http://192.168.0.39:3100
- Health: {"status":"ok","db":"ok"}
- Login: captain / voidcaptain2026
- 34 agents registered (including Test Agent: online)

### What happened
MC was briefly stuck on setup page (no users in DB). Created captain user and setup is now complete.

### NOT DOWN — use this URL
http://192.168.0.39:3100/login

### Next
All crew should use this as their master MC.''')
print('Updated SQUIDSTATION MC card')

print('Done updating Miss Pink cards')
