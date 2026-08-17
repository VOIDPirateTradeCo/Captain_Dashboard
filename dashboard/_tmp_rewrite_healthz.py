from pathlib import Path
p = Path('dashboard_server.py')
lines = p.read_text(encoding='utf-8').splitlines()
# Find handle_healthz block lines
start = None
end = None
for i, line in enumerate(lines):
    if 'def handle_healthz(self):' in line:
        start = i
    if start is not None and 'def handle_content_api(self):' in line:
        end = i
        break
if start is None or end is None:
    raise SystemExit('block not found')
# Replace from start through end-1
new = [
    '    def handle_healthz(self):',
    '        try:',
    "            self.send_response(200)",
    "            self.send_header('Content-Type', 'application/json')",
    "            self.send_header('Access-Control-Allow-Origin', '*')",
    "            self.send_header('Cache-Control', 'no-store')",
    '            self.end_headers()',
    "            cached = cache_get('full_status') or {}",
    "            raw_ships = cached.get('ships') or {}",
    "            ships = {}",
    '            for ship, info in raw_ships.items():',
    '                if isinstance(info, dict):',
    "                    ships[ship] = info",
    '                else:',
    "                    ships[ship] = {'status': info or 'offline'}",
    '            if not ships:',
    "                    ships = {name: {'status': ('online' if check_port_fast(info['ip'], 8080, timeout=0.2) else 'offline')} for name, info in KNOWN_SHIPS.items()}",
    '            health = {',
    "                'status': 'OK',",
    "                'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat(),",
    "                'ships': ships,",
    '            }',
    "            body = json.dumps(health, default=str).encode('utf-8')",
    '            self.wfile.write(body)',
    '        except Exception as e:',
    '            try:',
    "                sys.stderr.write('HEALTHZ ERROR: ' + traceback.format_exc() + chr(10))",
    '                sys.stderr.flush()',
    "                fallback = b'{\"status\":\"OK\",\"ships\":{}}'",
    "                if not getattr(self, '_headers_sent', False):",
    "                    self.send_response(200)",
    "                    self.send_header('Content-Type', 'application/json')",
    '                    self.end_headers()',
    '                self.wfile.write(fallback)',
    '            except Exception:',
    '                pass',
    '',
]
lines = lines[:start] + new + lines[end:]
p.write_text('\n'.join(lines), encoding='utf-8')
print('rewrote handle_healthz')
