import urllib.request as u, urllib.parse as p, json, win32cred

TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
BOARD = '6a595669b8f8f99c93392f4f'

def _list_open_cards():
    url = 'https://api.trello.com/1/boards/{}/cards/open?fields=id,name,labels,desc,members&key={}&token={}'.format(BOARD, KEY, TOKEN)
    return json.loads(u.urlopen(url, timeout=20).read().decode('utf-8'))

if __name__ == '__main__':
    cards = _list_open_cards()
    print('cards', len(cards))
    for c in cards[:3]:
        print(c['id'], '|', c['name'])
