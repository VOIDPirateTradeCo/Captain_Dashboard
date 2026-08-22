import json
with open('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/void_ops_cards.json') as f:
    cards = json.load(f)
keywords = ['tr3asure', 'treasuremap', 'treasure map', 'augur', 'backend', 'tm api', 'frontend', 'alpaca', 'data', 'portfolio']
for c in cards:
    text = (c['name'] + ' ' + c.get('desc','')).lower()
    if any(k in text for k in keywords):
        labels = [l['name'] for l in c.get('labels',[]) if l['name'].startswith('P')]
        labels.sort(key=lambda x: {'P0':0,'P1':1,'P2':2,'P3':3,'P4':4}.get(x,99))
        pri = labels[0] if labels else '-'
        print(f'{pri:4} | {c["name"][:85]}')
