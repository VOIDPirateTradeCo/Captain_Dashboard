import http.client, json, ssl, urllib.parse, win32cred, sys
c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
key = c['CredentialBlob'].decode('utf-16le')[:-1]
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
token = c['CredentialBlob'].decode('utf-16le')[:-1]
board = '6a70a3157d0db4214ac3f9a3'
ctx = ssl.create_default_context()
conn = http.client.HTTPSConnection('api.trello.com', 443, context=ctx)
def api(path, body=None):
    url = f"/1{path}?key={urllib.parse.quote(key)}&token={urllib.parse.quote(token)}"
    if body is not None:
        conn.request('POST', url, body=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
    else:
        conn.request('GET', url)
    r = conn.getresponse()
    print('URL', path, 'STATUS', r.status)
    data = r.read().decode()
    return json.loads(data) if data.strip() else {}

# Get miss-pink cards
cards = api(f'/boards/{board}/cards?fields=id,name,idList,labels&label=m&limit=50')
if isinstance(cards, dict) and 'message' in cards:
    print(json.dumps(cards, indent=2))
    sys.exit(1)
print(f'MISS_PINK_CARDS {len(cards)}')
for card in cards:
    print(f"  {card['id']} | {card.get('name','')[:80]} | list={card.get('idList')} | labels={[l['name'] for l in card.get('labels',[])]}")
