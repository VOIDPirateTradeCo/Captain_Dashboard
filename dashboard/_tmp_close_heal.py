import urllib.request as u, urllib.parse as p, json, win32cred
KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
BOARD = '6a595669b8f8f99c93392f4f'

card_id = '6a8272311beba5a4854214e4'
comment_text = (
    'EVIDENCE: verified /api/ticketing on dashboard port 8080 returns 200 with '
    'hygiene defaults and ownership fallback. Closing as resolved.'
)

comment_url = 'https://api.trello.com/1/cards/{}/actions/comments?key={}&token={}'.format(card_id, KEY, TOKEN)
comment_data = p.urlencode({'text': comment_text}).encode('utf-8')
comment_req = u.Request(comment_url, data=comment_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
print('HEAL-1 comment', u.urlopen(comment_req, timeout=20).status)

close_url = 'https://api.trello.com/1/cards/{}/closed?value=true&key={}&token={}'.format(card_id, KEY, TOKEN)
close_req = u.Request(close_url, data=b'', headers={'Content-Type': 'application/x-www-form-urlencoded'})
print('HEAL-1 close', u.urlopen(close_req, timeout=20).status)
