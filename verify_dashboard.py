import json, datetime, os

with open('mesh_response.json', 'r') as f:
    data = json.load(f)

ships = data['fleet_mesh_state']['ships']
live_status = data['fleet_mesh_state']['live_status']
ships_online = data['fleet_mesh_state']['ships_online']
heartbeat_count = data['debug_heartbeat_count']

mismatches = []
all_online = all(v == 'online' for v in live_status.values())
if not all_online:
    mismatches.append(f'live_status_not_all_online: { {k:v for k,v in live_status.items()} }')

if ships_online != len(ships):
    mismatches.append(f'ships_online_mismatch: got {ships_online}, expected {len(ships)}')

if heartbeat_count <= 0:
    mismatches.append(f'debug_heartbeat_count={heartbeat_count}')

ts = datetime.datetime.now().isoformat()
status = 'SUCCESS' if not mismatches else 'FAILURE'
msg = '; '.join(mismatches) if mismatches else f'all_checks_passed ships_online={ships_online}'

line = f'{ts} | {status} | {msg}\n'
log_dir = 'Obsidian_Vault/Developer_Brain/02_Business_Operations/state'
os.makedirs(log_dir, exist_ok=True)
with open(os.path.join(log_dir, 'dashboard_heartbeat_verify.log'), 'a') as f:
    f.write(line)

print(f'Written: {line.strip()}')
