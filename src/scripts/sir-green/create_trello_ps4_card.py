import json, urllib.parse, http.client, ssl
import win32cred

def cred(target):
    c = win32cred.CredRead(target, 1)
    return c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')

key = cred('TRELLO_KEY@VOID_Pirate_Secrets')
token = cred('TRELLO_TOKEN@VOID_Pirate_Secrets')
board_id = '6a595669b8f8f99c93392f4f'

ctx = ssl.create_default_context()

def trello(path, method='GET', body=None):
    qs = urllib.parse.urlencode({'key': key, 'token': token})
    url = urllib.parse.urlparse('https://api.trello.com' + path)
    conn = http.client.HTTPSConnection(url.hostname, url.port, context=ctx)
    body_data = json.dumps(body).encode() if body else None
    headers = {'Content-Type': 'application/json'}
    if body_data:
        headers['Content-Length'] = str(len(body_data))
    conn.request(method, url.path + '?' + qs, body=body_data, headers=headers)
    r = conn.getresponse()
    data = r.read().decode()
    conn.close()
    return r.status, data

status, data = trello('/1/members/me/boards?fields=id,name,url')
print('boards_status=', status)
print('board_found=', board_id in data)

status, data = trello('/1/boards/' + board_id + '/lists?fields=id,name,pos')
lists = json.loads(data)
inbox = next((l for l in lists if l['name'] == "Sir Green's Inbox"), None)
print('inbox_found=', bool(inbox))
if not inbox:
    raise SystemExit(1)

status, data = trello('/1/boards/' + board_id + '/labels?fields=id,name,color')
labels = json.loads(data)
labels_map = {l['name'].lower(): l['id'] for l in labels}
print('labels=', {k: bool(v) for k,v in labels_map.items()})
needed = ['sir-green', "captain's dashboard", 'sir-cobalt']
missing = [n for n in needed if n not in labels_map]
if missing:
    raise SystemExit('MISSING_LABELS=' + ','.join(missing))

card = {
    'name': 'PS4 → Omarchy Linux AI crew nodes — research card',
    'desc': 'Investigate wiping 2 PS4s and loading Omarchy Linux AI OS to use their GPUs for tr3asure mAp software + a dedicated LLM node.',
    'idList': inbox['id'],
    'idLabels': [labels_map[n] for n in needed]
}
status, data = trello('/1/cards', 'POST', card)
print('card_status=', status)
print('card_body=', data[:500])
