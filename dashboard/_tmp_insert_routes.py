from pathlib import Path
p=Path('dashboard_server.py')
text=p.read_text(encoding='utf-8')
old="    def handle_healthz(self):\n        try:\n            self.send_response(200)\n"
new="    def handle_ping_api(self):\n        self._json_ok({'ping': 'pong', 'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()})\n\n    def handle_latency_api(self):\n        ships = (cache_get('full_status') or {}).get('ships', {})\n        latency = {}\n        for ship, info in ships.items():\n            if isinstance(info, dict):\n                latency[ship] = info.get('latency') or info.get('latency_ms') or '—'\n            else:\n                latency[ship] = '—'\n        self._json_ok({'latency': latency, 'timestamp': datetime.datetime.now(datetime.timezone.utc).isoformat()})\n\n    def handle_tailscale_api(self):\n        self._json_ok({'tailscale': {'status': 'unknown', 'peers': []}, 'mode': 'stub'})\n\n    def handle_healthz(self):\n        try:\n            self.send_response(200)\n"
if old not in text:
    raise SystemExit('target block not found')
p.write_text(text.replace(old, new), encoding='utf-8')
print('inserted ping/latency/tailscale handlers')
PY