import urllib.request as u, urllib.parse as p, json, win32cred

KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
BOARD = '6a595669b8f8f99c93392f4f'

search_url = 'https://api.trello.com/1/search?key={}&token={}&query=HEAL-1&modelTypes=cards&boardLimits=10&boards_limit=1&card_fields=id,name,closed'.format(KEY, TOKEN)
data = json.loads(u.urlopen(search_url, timeout=20).read().decode('utf-8'))
cards = data.get('cards', [])
print('HEAL-1 search count', len(cards))
for c in cards:
    print(c.get('id'), c.get('name'), c.get('closed'))
