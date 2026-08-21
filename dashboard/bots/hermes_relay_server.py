"""Tiny HTTP relay: container -> host -> hermes -z -> response."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import os

HERMES = os.environ.get("HERMES_CMD", "hermes")
TIMEOUT = int(os.environ.get("HERMES_TIMEOUT", "1800"))
PORT = int(os.environ.get("HERMES_RELAY_PORT", "5002"))
ALLOWED = os.environ.get("HERMES_RELAY_ALLOWED", "").split(",")
ALLOWED = [a.strip() for a in ALLOWED if a.strip()]

class RelayHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('content-length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
            prompt = data.get('prompt', '').strip()
        except Exception:
            prompt = ''
        if not prompt:
            self._respond({'error': 'missing prompt'}, 400)
            return
        if ALLOWED and (self.client_address[0] not in ALLOWED):
            self._respond({'error': 'not allowed'}, 403)
            return
        try:
            result = subprocess.run(
                [HERMES, '-z', prompt],
                capture_output=True,
                text=True,
                timeout=TIMEOUT,
                check=False,
            )
            out = (result.stdout or '').strip() or '(no response)'
            self._respond({'reply': out})
        except Exception as e:
            self._respond({'error': str(e)}, 500)

    def _respond(self, obj, code=200):
        payload = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', PORT), RelayHandler)
    print(f'[RELAY] Hermes relay on http://127.0.0.1:{PORT}/')
    server.serve_forever()
