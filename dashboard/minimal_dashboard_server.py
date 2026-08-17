#!/usr/bin/env python3
"""Minimal local-only Captain Dashboard server."""
import json, os, sqlite3, time, urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / '..' / 'PROJECT_tr3asure_mAp' / 'tr3asure_mAp' / 'data' / 'treasure_map.db'
HTML_FILE = ROOT / 'pirate_dashboard.html'
PORT = 8080

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        
        # API routes first
        if path.startswith('/api/'):
            self._handle_api(path)
            return
        
        # SPA routes
        if path in {'/', '/index.html'} or '.' not in os.path.basename(path):
            self._serve_html()
            return
        
        self.send_error(404)

    def _serve_html(self):
        try:
            data = HTML_FILE.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    def _handle_api(self, path):
        try:
            if path == '/api/health' or path == '/api/healthz':
                self._json({'status': 'OK', 'timestamp': time.time(), 'ships': {}})
            elif path == '/api/status':
                self._json(self._local_status())
            elif path == '/api/tickets':
                self._json(self._local_tickets())
            elif path == '/api/alerts':
                self._json({'alerts': [], 'count': 0})
            elif path == '/api/signals':
                self._json({'count': 0, 'signals': [], 'timestamp': time.time()})
            elif path == '/api/opsec':
                self._json({'opsec': {'shared_with_pink_gitignored': True, 'real_secrets_tracked': 0, 'chinese_content_files': 0, 'all_clear': True}})
            elif path == '/api/tools':
                self._json({'classification_levels': {'level_1_landlubber': {'name': 'Landlubber', 'status': 'OK'}}, 'security_status': {}, 'crew_access': []})
            elif path == '/api/wazuh':
                self._json({'wazuh': {'status': 'unavailable', 'note': 'Wazuh not installed locally'}})
            elif path == '/api/stealthattack':
                self._json({'status': 'unavailable', 'note': 'STEALTHATTACK not reachable'})
            elif path == '/api/tailscale':
                self._json({'status': 'unavailable', 'note': 'Tailscale not configured locally'})
            elif path == '/api/monitor':
                self._json({'grafana': {'url': 'http://192.168.0.39:3002', 'status': 'unknown'}, 'prometheus': {'url': 'http://192.168.0.39:9090', 'status': 'unknown'}})
            elif path == '/api/diagram':
                self._json({'nodes': [], 'edges': []})
            elif path == '/api/sandbox/status':
                self._json({'status': 'ok', 'mode': 'local', 'note': 'sandbox status stub'})
            elif path == '/api/augur':
                self._json({'status': 'PENDING_DEPLOY', 'deployed': False, 'data': {}})
            elif path == '/api/hw':
                self._json({'local_rig': {'hostname': os.uname().nodename if hasattr(os, 'uname') else 'localhost'}})
            elif path == '/api/fleet':
                self._json({'hive_mind': {'ships': {}}, 'generated': time.time()})
            elif path == '/api/crew':
                self._json({'registry_version': '1.0', 'updated': '2026-08-08', 'owner': 'VOID Pirate Captain Brewbeard Ledgerbane'})
            else:
                self._json({'error': 'not_implemented', 'path': path}, status=501)
        except Exception as e:
            self._json({'error': str(e)}, status=500)

    def _local_status(self):
        try:
            conn = sqlite3.connect(str(DB_PATH), timeout=2)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            tables = [r[0] for r in cur.fetchall()]
            conn.close()
        except Exception:
            tables = []
        return {
            'timestamp': time.time(),
            'ships': {'SQUIDSTATION': 'loading', 'PINKCADY': 'loading', 'STEALTHATTACK': 'loading'},
            'ship_details': {},
            'services': {'dashboard': 'LIVE', 'network_ports': {}, 'docker_api': 'DOWN', 'health_check': 'SKIPPED'},
            'tools': {'classification_levels': []},
            'containers': {'total': 0, 'running': 0, 'names': []},
            'network': {'total_devices': 0, 'known_devices': 0, 'unknown_devices': 0, 'devices': [], 'crew_agents': {}},
            'comms': {'inboxes': {}},
            'vault': {'mounted': False, 'git_clean': False, 'latest_commit': 'unknown', 'file_count': 0, 'size_mb': 0, 'uncommitted_files': 0},
            'opsec': {},
            'cipher': {},
            'latency': {},
            'health_message': 'Minimal local server',
            'health_status': 'OK',
            'tables': tables,
        }

    def _local_tickets(self):
        # Placeholder: real Trello integration requires server-side auth
        return {'timestamp': time.time(), 'cards': [], 'count': 0, 'source': 'local'}

    def _json(self, obj, status=200):
        payload = json.dumps(obj, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        if args and '200' not in str(args) and '404' not in str(args):
            print(fmt % args)

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    print(f'Minimal dashboard on http://0.0.0.0:{PORT}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
