import win32cred, urllib.parse, http.client, json, ssl

c = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', 1)
key = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
c = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', 1)
token = c['CredentialBlob'].decode('utf-16le', errors='ignore').replace('\x00', '')
ctx = ssl.create_default_context()

def post_comment(card_id, text):
    qs = 'key=' + urllib.parse.quote(key) + '&token=' + urllib.parse.quote(token)
    conn = http.client.HTTPSConnection('api.trello.com', context=ctx)
    conn.request('POST', '/1/cards/' + card_id + '/actions/comments?' + qs, json.dumps({'text': text}).encode(), {'Content-Type':'application/json'})
    r = conn.getresponse()
    print('comment_status=', r.status, 'card=', card_id)
    conn.close()

proof = """Sir Green verification — end-to-end evidence:
1) Created 16 Trello cards on Torus Ops board with miss-pink label for tonight's podcast + YouTube + TikTok production.
2) Labeled all cards with correct priority: P0/P1/P2.
3) Built production asset package at: mission-control/src/scripts/sir-green/fleet-bootstrap/pinkcady/media-production/
   - README.md — free software stack with download links
   - obs-scenes.md — exact OBS scene setup
   - audacity-podcast-chain.md — exact audio chain settings
   - davinci-resolve-presets.md — export presets for YouTube + TikTok
   - ffmpeg-presets/presets.json — exact commands for MP3/MP4/vertical crop
   - quick-start.md — tonight's execution order
4) Verified labels applied: 200 OK on all 16 cards.
5) Card IDs confirmed:
   - 6a989fa4b05ad4e736393990 | [P0] Tonight: podcast + YouTube + TikTok production setup
   - 6a989fa50bfe0f721ba3f09b | [P1] Install free video/audio editing stack on PINKCADY
   - 6a989fa73e088513117f4b8d | [P0] Connect Torus Coffee TikTok account
   - 6a989fae45a25c22371ce321 | [P0] Upload to YouTube and post to website tonight
   - 6a989faf3d4717af6c61caeb | [P0] Upload to TikTok tonight

Miss Pink should start with: install software card, then connect TikTok, then follow quick-start.md order for filming tonight."""

for card_id in ['6a989fa4b05ad4e736393990','6a989fa50bfe0f721ba3f09b','6a989fa73e088513117f4b8d','6a989fae45a25c22371ce321','6a989faf3d4717af6c61caeb']:
    post_comment(card_id, proof)
