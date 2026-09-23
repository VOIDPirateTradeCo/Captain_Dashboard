import json, datetime, os, sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent            # <business>/Captain_Dashboard
_BUSINESS_ROOT = _HERE.parent                       # <business>

# Resolve the vault via canonical_paths; fall back to the business root layout.
# canonical_paths.py moved out of the retired dashboard/ subdir in the 2026-09
# reorg — it now sits next to this file under Captain_Dashboard/.
sys.path.insert(0, str(_HERE))
sys.path.insert(0, str(_HERE / 'dashboard'))   # legacy fallback
try:
    from canonical_paths import VAULT_PATH
except Exception:
    VAULT_PATH = _BUSINESS_ROOT / 'Obsidian_Vault'

with open(_HERE / 'mesh_response.json', 'r') as f:
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
log_dir = Path(VAULT_PATH) / 'Developer_Brain' / '02_Business_Operations' / 'state'
log_dir.mkdir(parents=True, exist_ok=True)
with open(log_dir / 'dashboard_heartbeat_verify.log', 'a', encoding='utf-8') as f:
    f.write(line)

print(f'Written: {line.strip()}')
