import urllib.request as u, urllib.parse as p, json, win32cred
KEY = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
TOKEN = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC).get('CredentialBlob').decode('utf-16-le', errors='ignore').strip('\x00')
url='https://api.trello.com/1/members/me?'+p.urlencode({'key':KEY,'token':TOKEN})
try:
    r=u.urlopen(url, timeout=20)
    print('auth', r.status, r.read().decode()[:120])
except Exception as e:
    print('auth ERR', type(e).__name__, getattr(e,'code',''), str(e)[:160])
