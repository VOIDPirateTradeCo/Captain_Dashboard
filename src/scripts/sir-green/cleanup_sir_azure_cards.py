import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

def delete_card(card_id):
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    conn.request('DELETE', '/1/cards/' + card_id + '?' + qs)
    r = conn.getresponse()
    print('delete_status=', r.status, 'card=', card_id)
    conn.close()

for card_id in ['6a989b30acc29e61eccea7aa', '6a989b3157247ac51a52026d', '6a989b31faff339a86cce856']:
    delete_card(card_id)
