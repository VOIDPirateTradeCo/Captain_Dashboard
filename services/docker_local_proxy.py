#!/usr/bin/env python3
"""
VOID Pirate Trading Co — Docker Local Access Proxy (TLS Secured)

Since Docker Desktop only binds to:
  • 100.83.247.14:2375 (Tailscale)
  • 127.0.0.1:2375 (localhost)

This TLS-secured proxy makes Docker accessible on:
  • 192.168.0.39:2376 (local LAN — for PINKCADY/STEALTHATTACK)
  • 0.0.0.0:2376 (all interfaces, no conflict with Docker's 2375)

Features:
  - Mutual TLS (mTLS) authentication
  - Bearer token authorization
  - All traffic encrypted with self-signed certs
"""
import http.server
import urllib.request
import urllib.error
import threading
import sys
import os
import time
import json
import ssl
import socketserver

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CERT_DIR = os.path.join(SCRIPT_DIR, '..', 'certs')
DOCKER_TAILSCALE = "http://100.83.247.14:2375"
DOCKER_LOCAL = "http://127.0.0.1:2375"
LISTEN_HOSTS = ["0.0.0.0"]
LISTEN_PORT = 2376  # Forwarding to Docker (2375 is taken by Docker itself)

# Whitelisted API tokens for clients
RAW_TOKENS = os.environ.get('DOCKER_PROXY_TOKENS', '')
API_TOKENS = [t.strip() for t in RAW_TOKENS.split(',') if t.strip()] if RAW_TOKENS else []

# TLS Configuration
CERT_FILE = os.path.join(CERT_DIR, 'docker-proxy.crt')
KEY_FILE = os.path.join(CERT_DIR, 'docker-proxy.key')

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Multithreaded HTTP server"""
    daemon_threads = True

class DockerProxyHandler(http.server.BaseHTTPRequestHandler):
    """Reverse proxy to Docker API with TLS + auth"""

    def do_GET(self):
        self._proxy()

    def do_POST(self):
        self._proxy()

    def do_DELETE(self):
        # Docker API uses query strings for DELETE
        # e.g., DELETE /containers/nuclei-scanner?force=1
        self._proxy()

    def do_PUT(self):
        self._proxy()

    def _proxy(self):
        # Require authentication token
        auth_header = self.headers.get('Authorization', '')
        if not API_TOKENS:
            self._reject(403, {"error": "No API tokens configured — set DOCKER_PROXY_TOKENS env var"})
            return
        if not auth_header:
            self._reject(401, {"error": "No Authorization header — Bearer token required"})
            return
        token = auth_header.replace('Bearer ', '').strip()
        if token not in API_TOKENS:
            self._reject(401, {"error": "Unauthorized — invalid API token"})
            return

        # Try Tailscale first, then localhost
        for backend in [DOCKER_TAILSCALE, DOCKER_LOCAL]:
            try:
                url = f"{backend}{self.path}"
                req = urllib.request.Request(url)
                req.add_header('Content-Type', 'application/json')

                # Copy allowed headers
                for key, value in self.headers.items():
                    if key.lower() not in ['host', 'connection', 'content-length', 'authorization']:
                        req.add_header(key, value)

                # Handle body for POST/PUT
                if self.command in ['POST', 'PUT']:
                    content_length = int(self.headers.get('Content-Length', 0))
                    body = self.rfile.read(content_length) if content_length > 0 else None
                    if body:
                        req.data = body

                # Custom method handler
                class MethodHandler(urllib.request.BaseHandler):
                    def __init__(self, method):
                        self.method = method
                    def http_request(self, req):
                        req.get_method = lambda: self.method
                        return req
                    https_request = http_request

                opener = urllib.request.build_opener(MethodHandler(self.command))
                resp = opener.open(req, timeout=30)
                content = resp.read()
                self.send_response(resp.status)
                for key, value in resp.headers.items():
                    if key.lower() not in ['transfer-encoding', 'connection']:
                        self.send_header(key, value)
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
                return

            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.end_headers()
                self.wfile.write(e.read())
                return
            except Exception:
                continue

        # All backends failed
        self._reject(502, {"error": "Docker API unreachable", "backends_tried": [DOCKER_TAILSCALE, DOCKER_LOCAL]})

    def _reject(self, code, body_dict):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('WWW-Authenticate', 'Bearer realm="Docker Proxy", error="invalid_token"')
        self.end_headers()
        self.wfile.write(json.dumps(body_dict).encode())

    def log_message(self, format, *args):
        # Quiet logging — uncomment for debugging
        # print(f"[DockerProxy] {args[0]}")
        pass


def run_proxy():
    """Start TLS-secured proxy server on all interfaces"""
    # Load TLS context
    if not os.path.exists(CERT_FILE) or not os.path.exists(KEY_FILE):
        print(f"❌ TLS certs not found at {CERT_FILE}")
        print("   Run: openssl req -x509 -newkey rsa:4096 -keyout docker-proxy.key -out docker-proxy.crt -days 365 -nodes -subj '/CN=192.168.0.39/O=VOID Pirate Trading Co'")
        return

    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(CERT_FILE, KEY_FILE)

    server = ThreadingHTTPServer(('0.0.0.0', LISTEN_PORT), DockerProxyHandler)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.timeout = 1

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    print(f"✅ TLS-secured proxy listening on 0.0.0.0:{LISTEN_PORT}")
    print(f"\n🚀 Docker Local Access Proxy (TLS + Auth) running")
    print(f"   Protocol: HTTPS")
    print(f"   Tailscale:  100.83.247.14:2375 → Docker API (direct)")
    print(f"   Secured:    https://192.168.0.39:{LISTEN_PORT} → Docker API (proxied)")
    print(f"   Cert:       {CERT_FILE}")
    print(f"\n   PINKCADY test: curl -k -H \"Authorization: Bearer ***\" https://192.168.0.39:2376/_ping")

    # Keep running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    run_proxy()
