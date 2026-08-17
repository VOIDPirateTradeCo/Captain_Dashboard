from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
old = '''    def handle_auth_api(self, path):
        """Serve crew bot authentication endpoint.
        POST /api/auth/verify?token=<TOKEN> — verify a crew bot auth token
        GET  /api/auth/scopes — list available auth scopes"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        try:
            parsed = urlparse(path)
            query = parse_qs(parsed.query)
            token = query.get('token', [None])[0]

            # Crew auth tokens — share with Miss Pink via Dataview
            # Each crew bot has a token that maps to their allowed scopes
            CREW_AUTH_TOKENS = {
                "green_tide": {"name": "Sir Green", "scopes": ["fleet", "ships", "containers", "dataview"]},
                "pink_wave": {"name": "Miss Pink", "scopes": ["fleet", "ships", "dataview", "vault_health"]},
                "azure_storm": {"name": "Sir Azure", "scopes": ["fleet", "ships", "dataview"]},
            }

            if token and token in CREW_AUTH_TOKENS:
                info = CREW_AUTH_TOKENS[token]
                response = {
                    "authenticated": True,
                    "crew_member": info["name"],
                    "scopes": info["scopes"],
                    "expires": None,  # Tokens don't expire — fleet mesh is local
                    "endpoints": [
                        "/api/status",
                        "/api/fleet",
                        "/api/ships",
                        "/api/dataview",
                        "/api/fleet/mesh",
                    ],
                }
            else:
                response = {
                    "authenticated": False,
                    "error": "Invalid or missing token",
                    "valid_tokens": list(CREW_AUTH_TOKENS.keys()),
                    "usage": "POST /api/auth/verify?token=<token>",
                }
            self.wfile.write(json.dumps(response, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        return'''
new = '''    def handle_auth_api(self, path):
        """Serve crew bot authentication endpoint.
        POST /api/auth/verify?token=<TOKEN> — verify a crew bot auth token
        GET  /api/auth/scopes — list available auth scopes"""
        try:
            parsed = urlparse(path)
            query = parse_qs(parsed.query)
            token = query.get('token', [None])[0]

            CREW_AUTH_TOKENS = {
                "green_tide": {"name": "Sir Green", "scopes": ["fleet", "ships", "containers", "dataview"]},
                "pink_wave": {"name": "Miss Pink", "scopes": ["fleet", "ships", "dataview", "vault_health"]},
                "azure_storm": {"name": "Sir Azure", "scopes": ["fleet", "ships", "dataview"]},
            }

            if token and token in CREW_AUTH_TOKENS:
                info = CREW_AUTH_TOKENS[token]
                response = {
                    "authenticated": True,
                    "crew_member": info["name"],
                    "scopes": info["scopes"],
                    "expires": None,
                    "endpoints": [
                        "/api/status",
                        "/api/fleet",
                        "/api/ships",
                        "/api/dataview",
                        "/api/fleet/mesh",
                    ],
                }
                status_code = 200
            else:
                response = {
                    "authenticated": False,
                    "error": "Invalid or missing token",
                }
                status_code = 401
            payload = json.dumps(response, indent=2, default=str).encode('utf-8')
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        return'''
if old not in text:
    raise SystemExit('old block not found')
text = text.replace(old, new)
p.write_text(text, encoding='utf-8')
print('patched auth verify 401/no token disclosure')
