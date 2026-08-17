import urllib.request as u, urllib.parse as p, json, win32cred
KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
BASE='https://api.trello.com/1/cards'

def api_call(path, data):
    body = json.dumps(data).encode()
    params = p.urlencode({'key': KEY, 'token': TOKEN})
    url = f"{BASE}{path}?{params}"
    req = u.Request(url, data=body, headers={'Content-Type':'application/json','User-Agent':'curl'}, method='PUT')
    return u.urlopen(req, timeout=20)

cards = [
    '6a7d446b14519f46ee059684',
    '6a7d447021dde2d03ee4ac64',
    '6a7d51cf58c9661bfec953a5',
]
for cid in cards:
    try:
        r = api_call(f'/{cid}', {'closed': True})
        print(cid, 'close', r.status)
    except Exception as e:
        print(cid, 'ERR', type(e).__name__, e)
