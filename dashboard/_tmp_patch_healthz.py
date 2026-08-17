from pathlib import Path
p = Path('dashboard_server.py')
lines = p.read_text(encoding='utf-8').splitlines()
# Replace lines 4181-4194 (0-indexed 4180-4194)
new = [
    "                raw_ships = cached.get('ships') or {}",
    "                ships = {}",
    "                for ship, info in raw_ships.items():",
    "                    if isinstance(info, dict):",
    "                        ships[ship] = info",
    "                    else:",
    "                        ships[ship] = {'status': info or 'offline'}",
    "                if not ships:",
    "                    ships = {name: {'status': ('online' if check_port_fast(info['ip'], 8080, timeout=0.2) else 'offline')} for name, info in KNOWN_SHIPS.items()}",
    "                health = {",
    "                    'status': 'OK',",
    "                    'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),",
    "                    'ships': ships,",
    "                }",
]
lines = lines[:4180] + new + lines[4195:]
p.write_text('\n'.join(lines), encoding='utf-8')
print('patched')
