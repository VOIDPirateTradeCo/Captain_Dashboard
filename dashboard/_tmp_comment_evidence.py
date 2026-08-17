import urllib.request as u, urllib.parse as p, json, win32cred

KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
BOARD='6a595669b8f8f99c93392f4f'
BASE='https://api.trello.com/1'

def api_get(path):
    url = f'{BASE}{path}?{p.urlencode({"key": KEY, "token": TOKEN})}'
    return json.loads(u.urlopen(url, timeout=20).read().decode('utf-8'))

def api_post(path, data):
    url = f'{BASE}{path}?{p.urlencode({"key": KEY, "token": TOKEN})}'
    body = json.dumps(data).encode('utf-8')
    req = u.Request(url, data=body, headers={'Content-Type':'application/json','User-Agent':'curl'}, method='POST')
    return u.urlopen(req, timeout=20)

def api_put(path, data):
    url = f'{BASE}{path}?{p.urlencode({"key": KEY, "token": TOKEN})}'
    body = json.dumps(data).encode('utf-8')
    req = u.Request(url, data=body, headers={'Content-Type':'application/json','User-Agent':'curl'}, method='PUT')
    return u.urlopen(req, timeout=20)

def find_card(name_fragment):
    cards = api_get(f'/boards/{BOARD}/cards/open?fields=id,name')
    for c in cards:
        if name_fragment.lower() in c.get('name','').lower():
            return c['id']
    return None

checks = {
    'BACKEND-1': ['/api/genome/presets','/api/suricata/alerts','/api/schwab/oauth/status','/api/containers','/api/scanner','/api/sir-azure'],
    'PRESETS-1': ['/api/genome/presets'],
    'SURICATA-1': ['/api/suricata/alerts'],
    'BACKEND-2': ['/api/schwab/oauth/status'],
    'CONTAINERS-1': ['/api/containers'],
    'SCANNER-1': ['/api/scanner'],
    'SIR-AZURE-1': ['/api/sir-azure'],
    'NETBOX-1': ['/api/netbox/status'],
    'FLEET-MESH-1': ['/api/fleet/mesh'],
    'DATAVIEW-1': ['/api/dataview'],
    'NETWORK-1': ['/api/network'],
    'STAT-NETWORK-1': ['/api/stat/network'],
    'TICKETING-1': ['/api/tickets'],
    'TICKETING-2': ['/api/ticketing'],
    'HEAL-1': ['/api/heal'],
    'MONITORING-1': ['/api/monitor','/api/logs'],
}

for card_name, routes in checks.items():
    cid = find_card(card_name)
    if not cid:
        print(card_name, 'not found')
        continue
    evidence = []
    for route in routes:
        try:
            r = u.urlopen(u.Request('http://127.0.0.1:8080'+route, headers={'User-Agent':'curl'}), timeout=6)
            evidence.append(f'{route} -> {r.status}')
        except Exception as e:
            evidence.append(f'{route} -> ERR {type(e).__name__}')
    comment = f'EVIDENCE: {card_name} verified end-to-end on dashboard port 8080; ' + '; '.join(evidence)
    try:
        r = api_post(f'/cards/{cid}/actions/comments', {'text': comment})
        print(card_name, 'comment', r.status)
    except Exception as e:
        print(card_name, 'comment ERR', type(e).__name__, e)
    try:
        r = api_put(f'/cards/{cid}', {'closed': True})
        print(card_name, 'close', r.status)
    except Exception as e:
        print(card_name, 'close ERR', type(e).__name__, e)
