import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

LABELS = {
    'miss-pink': '6a95f03f8065a98ebb5cb73b',
    'mission control': '6a97a358ba401f0b04f58a92',
    'P0': '6a839af9b5e7e56792d25e9b',
    'P1': '6a839af9b5e7e56792d25e97',
    'P2': '6a87710bf076f35335eea460',
}

cards = [
  ('6a989fa4b05ad4e736393990', ['miss-pink','mission control','P0']),
  ('6a989fa50bfe0f721ba3f09b', ['miss-pink','mission control','P1']),
  ('6a989fa6fbb4eb7b8c319231', ['miss-pink','mission control','P1']),
  ('6a989fa73e088513117f4b8d', ['miss-pink','mission control','P0']),
  ('6a989fa8670136c1854d37b8', ['miss-pink','mission control','P1']),
  ('6a989fa995ffb31b3f5949de', ['miss-pink','mission control','P1']),
  ('6a989fab1b61d00c688e06cf', ['miss-pink','mission control','P2']),
  ('6a989fac5a8de3b56e344376', ['miss-pink','mission control','P2']),
  ('6a989fadd9ac6a7679bdb532', ['miss-pink','mission control','P2']),
  ('6a989fae45a25c22371ce321', ['miss-pink','mission control','P0']),
  ('6a989faf3d4717af6c61caeb', ['miss-pink','mission control','P0']),
  ('6a989fb0fc1adb8f615bdf4c', ['miss-pink','mission control','P1']),
  ('6a989fb1a53b5a0c797efaf1', ['miss-pink','mission control','P1']),
  ('6a989fb31ac46e830bf0e5c3', ['miss-pink','mission control','P2']),
  ('6a989fb4048b63ff4e5edb69', ['miss-pink','mission control','P2']),
  ('6a989fb5436898aa7f2d33ba', ['miss-pink','mission control','P1']),
]

for card_id, label_keys in cards:
    label_ids = [LABELS[k] for k in label_keys]
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    conn.request('PUT', '/1/cards/' + card_id + '?' + qs, json.dumps({'idLabels': ','.join(label_ids)}).encode(), {'Content-Type':'application/json'})
    r = conn.getresponse()
    print('label_status=', r.status, 'card=', card_id)
    conn.close()
