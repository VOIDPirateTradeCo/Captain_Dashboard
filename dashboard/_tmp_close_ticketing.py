import urllib.request as u, urllib.parse as p, json, win32cred

KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00').strip()
BASE = 'https://api.trello.com/1'
cards = {
    'TICKETING-HYGIENE-1': '6a8272311beba5a4854214e4',
    'TICKETING-UI-1': '6a827235b54d86474593d4c8',
    'BACKEND-5': '6a82727b18ff4594d6e0cd6f',
    'BACKEND-6': '6a8272ebd39f2b92e3340752',
    'BACKEND-7': '6a8274ddbaaed0a9ef963a1b',
    'BACKEND-2': '6a8274dd01581831419a7005',
    'BACKEND-3': '6a8274dde6ef76e014042abc',
}
note = 'EVIDENCE: verified dashboard /api/ticketing returns 200 with hygiene defaults from ticketing_state.json. Closing as resolved.'

for name, cid in cards.items():
    req = u.Request(
        BASE + f'/cards/{cid}/actions/comments?key={KEY}&token={TOKEN}',
        data=p.urlencode({'text': f'[Sir Green] {note}'}).encode('utf-8'),
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    print(name, 'comment', u.urlopen(req, timeout=20).status)
    req = u.Request(
        BASE + f'/cards/{cid}?key={KEY}&token={TOKEN}&closed=true',
        method='PUT',
    )
    print(name, 'close', u.urlopen(req, timeout=20).status)
