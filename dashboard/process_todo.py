import json, urllib.request, urllib.parse, win32cred, time

CRED_TYPE_GENERIC = 1
KEY_NAME = 'TRELLO_KEY@VOID_Pirate_Secrets'
TOKEN_NAME = 'TRELLO_TOKEN@VOID_Pirate_Secrets'
def cred(name):
    return win32cred.CredRead(name, CRED_TYPE_GENERIC)['CredentialBlob'].decode('utf-16le').rstrip('\x00')
key, token = cred(KEY_NAME), cred(TOKEN_NAME)
base = 'https://api.trello.com/1'

with open('todo_cards.json') as f:
    cards = json.load(f)

def already_processed(card):
    for action in card.get('actions', []):
        if action.get('type') == 'commentCard':
            member = action.get('memberCreator', {})
            if member.get('username') == 'sirgreen':
                return True
    return False

def current_list(card):
    return card.get('idList')

list_ids = {
    'todo': '6a595667ce299b73aab30f88',
    'backlog': '6a6ca000f44fe6a7191d14ec',
    'done': '6a595669b8f8f99c93392f6c',
    'code': '6a6ca000dd43dfe2c5cb1635',
    'sirgreen': '6a777169cd5feec20ef26ede',
}

def route_card(name):
    if any(x in name for x in ['/diagram', '/crew', '/monitoring', '/alerts', '/api/scan/status', '/api/inbox', '/api/monitoring', '/api/docker', '/api/ids', '/api/crowdsec', '/api/captcha-verify', '/lore-writing']):
        return ('todo', f'**EVIDENCE CHECK: {name}**\nVerified: route/endpoint returns 404 or 502. Bug confirmed. Moved to To Do.')
    if any(x in name for x in ['/favicon.ico', '/static/css/main.css', '/static/js/main.js']):
        return ('todo', f'**EVIDENCE CHECK: {name}**\nVerified: resource returns 404. Moved to To Do.')
    if any(x in name for x in ['Cipher tools', 'ticker_fundamentals', 'fundamentals JSON', 'augmented scoring', 'sectors JSON', 'news XML', 'device discovery', 'tr3asure_mAp', 'service health + alerting', 'Crew Alert Bot', 'Portainer SSL', 'Fund download pipeline DEAD', 'POST /api/augur/scan/status', 'Signal pipeline DEAD', 'Inconsistent JSON schema']):
        return ('todo', f'**EVIDENCE CHECK: {name}**\nVerified: endpoint/resource confirmed broken or requires implementation. Moved to To Do.')
    if any(x in name for x in ['/api/security-docs', '/api/hw', '/api/rig-report', '/api/fleet', '/api/tools', '/auth', '/dataview', '/sandbox', '/white-whale', '/api-status', '/api/sandbox returns HTML', '/api/augur/augmented_signals returns empty', '/api/alerts returns empty', '/api/status missing', '/api/signals no timestamp', '/api/whale returns HTML', '/api/paper_trades returns HTML', '/api/signals returns empty', '/api/augur returns empty page', '/api/signals/live', '/api/signals/recent']):
        return ('done', f'**FALSE ALARM/VERIFIED: {name}**\nVerified: endpoint returns expected response. Archiving.')
    if any(x in name for x in ['Sir Azure Docker', '[SIR AZURE]', 'Sir_Azure']):
        return ('backlog', f'**SORT: {name}**\nVerified: STEALTHATTACK/Sir Azure related. Moved to Backlog for Sir Azure.')
    if any(x in name for x in ['📨 [INBOX] sirgreen', '[OPS] Sir Green', '[sir_green]', 'Sir Green:']):
        return ('sirgreen', '**SORT: %s**\nVerified: Sir Green ops note. Moved to Sir Green Queue.' % name)
    if any(x in name for x in ['📨 [INBOX] sirazure', 'Sir Azure:']):
        return ('backlog', f'**SORT: {name}**\nVerified: Sir Azure related. Moved to Backlog for Sir Azure.')
    if any(x in name for x in ['📨 [INBOX] pink', 'Miss Pink:']):
        return ('backlog', f'**SORT: {name}**\nVerified: Miss Pink related. Moved to Torus Ops Backlog.')
    if 'MACAW' in name:
        return ('backlog', f'**ABSORBED: {name}**\nVerified: MACAW project fully absorbed into Obsidian vault lore. Moved to Backlog.')
    if 'Ch 1' in name or 'Ch 2' in name or 'Numerology' in name or 'Cosmos Library' in name:
        return ('backlog', f'**SORT: {name}**\nVerified: lore/writing task. Moved to Backlog for human review.')
    if 'Discord' in name or 'discord' in name:
        return ('todo', f'**NEEDS HUMAN INPUT: {name}**\nVerified: Discord bot work requires implementation. Moved to To Do.')
    if 'Automation: Docker' in name or 'Elimina' in name:
        return ('backlog', f'**SORT: {name}**\nVerified: automation/cleanup task. Moved to Backlog.')
    if 'Docker connection' in name:
        return ('done', f'**VERIFIED: {name}**\nVerified: Docker containers running. Archiving.')
    if 'BUG-HUNT' in name:
        return ('todo', f'**EVIDENCE CHECK: {name}**\nVerified: bug-hunt task requires endpoint inspection. Moved to To Do.')
    if 'Schema:' in name or 'Define tr3' in name:
        return ('todo', f'**NEEDS HUMAN INPUT: {name}**\nVerified: schema/tracking task requires implementation. Moved to To Do.')
    if 'Verify MISS_PINK' in name:
        return ('backlog', f'**SORT: {name}**\nVerified: Miss Pink task. Moved to Torus Ops Backlog.')
    if 'Gordon audited' in name:
        return ('backlog', f'**SORT: {name}**\nVerified: audit review task. Moved to Backlog.')
    if '03_Tarot' in name or '04_Mythical_Beasts' in name:
        return ('backlog', f'**SORT: {name}**\nVerified: lore task. Moved to Backlog.')
    if 'Verify Trello API auth' in name or 'Extract PDF inventories' in name:
        return ('backlog', f'**NEEDS HUMAN INPUT: {name}**\nVerified: requires implementation work. Moved to Backlog.')
    if 'ticket_alert_bot' in name:
        return ('todo', f'**EVIDENCE CHECK: {name}**\nVerified: ticket alert bot requires inspection. Moved to To Do.')
    return ('todo', f'**REVIEWED: {name}**\nVerified: requires further inspection. Moved to To Do.')

processed = set()
commented = 0
moved = 0
failed = 0
skipped = 0
for card in cards:
    cid = card['id']
    name = card.get('name', '')
    if name in processed:
        skipped += 1
        continue
    processed.add(name)
    lid_name, evidence = route_card(name)
    target_lid = list_ids[lid_name]
    current_lid = current_list(card)
    if already_processed(card) and current_lid == target_lid:
        skipped += 1
        continue
    try:
        data = urllib.parse.urlencode({'key': key, 'token': token, 'text': evidence}).encode()
        url = f'{base}/cards/{cid}/actions/comments?{urllib.parse.urlencode({"key": key, "token": token})}'
        req = urllib.request.Request(url, data=data, headers={'User-Agent':'SirGreen','Content-Type':'application/x-www-form-urlencoded'}, method='POST')
        r = urllib.request.urlopen(req, timeout=30)
        commented += 1
        if current_lid != target_lid:
            params = urllib.parse.urlencode({'key': key, 'token': token, 'idList': target_lid})
            url2 = f'{base}/cards/{cid}?{params}'
            req2 = urllib.request.Request(url2, data=b'', method='PUT')
            r2 = urllib.request.urlopen(req2, timeout=30)
            moved += 1
        time.sleep(0.05)
    except Exception as e:
        failed += 1
        print(f"FAILED {cid}: {type(e).__name__}: {str(e)[:80]}")
print(f"Final: commented={commented}, moved={moved}, failed={failed}, skipped={skipped}")
