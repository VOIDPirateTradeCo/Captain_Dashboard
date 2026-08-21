import urllib.request as u, urllib.parse as p, json

SECRETS_PATH = r'C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/02_Business_Operations/_Hub/_KEY_VAULT/secrets.env'

def load_secrets(path):
    s = {}
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            s[k.strip()] = v.strip().strip('"').strip("'")
    return s

secrets = load_secrets(SECRETS_PATH)
api_key    = secrets['TRELLO_API_KEY']
api_secret = secrets['TRELLO_API_SECRET']
token      = secrets['TRELLO_TOKEN']
board_id   = secrets.get('TRELLO_VOID_OPS_BOARD_ID', '6a595669b8f8f99c93392f4f')

label_map = {
    'sir-green': '6a74dd63452761014e981f23',
    'P0': '6a74dd63452761014e981f24',
    'P1': '6a74dd63452761014e981f25',
    'P2': '6a74dd63452761014e981f26',
    'P3': '6a74dd63452761014e981f27',
    'P4': '6a74dd63452761014e981f28',
}

def trello_request(path, data=None, method='GET'):
    url = f'https://api.trello.com/1{path}'
    if data is not None:
        data['key'] = api_key
        data['token'] = token
        encoded = p.urlencode(data).encode()
        req = u.Request(url, data=encoded, method='POST')
    else:
        sep = '&' if '?' in url else '?'
        url = f'{url}{sep}key={api_key}&token={token}'
        req = u.Request(url, method=method)
    with u.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

lists = trello_request(f'/boards/{board_id}/lists')
for lst in lists:
    if lst['name'] == 'To Do Next':
        list_id = lst['id']
        break

card = trello_request('/cards', {
    'idList': list_id,
    'name': '🐛 PINKCADY unreachable — cannot move data for Augur AI simulator',
    'desc': 'PING 192.168.0.3 returns "Destination host unreachable" and SSH fails. PINKCADY is offline, so we cannot transfer the ~647GB of historical data to her rig for Augur AI trading-practice simulation. Need to bring PINKCADY online or use an alternative transfer path.',
    'idLabels': [label_map['sir-green'], label_map['P1']],
})
print('Created card:', card['id'], card['name'])
