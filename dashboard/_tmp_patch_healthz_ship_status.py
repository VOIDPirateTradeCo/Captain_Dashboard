from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
needle = '''    def handle_healthz(self):
        try:
            full = cache_get('full_status')
            ships = {}
            if isinstance(full, dict):
                raw = full.get('ships', {})
                if not raw:
                    raw = full.get('ship_details', {})
                for ship, info in raw.items():
                    if isinstance(info, dict):
                        ships[ship] = info.get('status', 'offline')
                    elif isinstance(info, str):
                        ships[ship] = info
                    else:
                        ships[ship] = 'offline'
            services = {}
            if isinstance(full, dict):
                services = full.get('services', {})
            self._json_ok({
                'status': 'ok',
                'ships': ships,
                'services': services,
            })
        except Exception:
            try:
                full = cache_get('full_status')
                ships = {}
                if isinstance(full, dict):
                    for ship, info in (full.get('ships') or {}).items():
                        ships[ship] = info.get('status', 'offline') if isinstance(info, dict) else str(info)
                    services = full.get('services', {})
                else:
                    services = {}
                self._json_ok({'status': 'ok', 'ships': ships, 'services': services})
            except Exception as exc:
                self._json_err(500, {'status': 'error', 'message': str(exc)})'''
if needle not in text:
    raise SystemExit('needle not found')
text = text.replace(needle, '''    def handle_healthz(self):
        try:
            full = cache_get('full_status')
            services = {}
            ships = {}
            if isinstance(full, dict):
                services = full.get('services') or {}
                raw = full.get('ships') or full.get('ship_details') or {}
                for ship, info in raw.items():
                    if isinstance(info, dict):
                        ships[ship] = info.get('status', 'offline')
                    elif isinstance(info, str):
                        ships[ship] = info
                    else:
                        ships[ship] = 'offline'
                if ships and all(v == 'loading' for v in ships.values()):
                    ships = {ship: 'offline' for ship in ships}
            self._json_ok({'status': 'ok', 'ships': ships, 'services': services})
        except Exception:
            try:
                full = cache_get('full_status')
                services = {}
                ships = {}
                if isinstance(full, dict):
                    services = full.get('services') or {}
                    raw = full.get('ships') or full.get('ship_details') or {}
                    for ship, info in raw.items():
                        if isinstance(info, dict):
                            ships[ship] = info.get('status', 'offline')
                        elif isinstance(info, str):
                            ships[ship] = info
                        else:
                            ships[ship] = 'offline'
                self._json_ok({'status': 'ok', 'ships': ships, 'services': services})
            except Exception as exc:
                self._json_err(500, {'status': 'error', 'message': str(exc)})''')
p.write_text(text, encoding='utf-8')
print('patched handle_healthz')
