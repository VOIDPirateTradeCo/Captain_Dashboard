import urllib.request as u, urllib.parse as p, json, win32cred

KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
card_id = '6a827052af084fbf76095eb1'
url = f'https://api.trello.com/1/cards/{card_id}?fields=id,name,closed&key={KEY}&token={TOKEN}'
r = u.urlopen(url, timeout=20)
data = json.loads(r.read().decode('utf-8'))
print('HEAL-1 closed:', data.get('closed'))
print('HEAL-1 name:', data.get('name'))
