#!/usr/bin/env python3
"""
VOID Pirate Trading Co — Docker Local Access Proxy

Since Docker Desktop only binds to:
  • 100.83.247.14:2375 (Tailscale)
  • 127.0.0.1:2375 (localhost)

This lightweight proxy makes Docker accessible on:
  • 192.168.0.39:2376 (local LAN — for PINKCADY/STEALTHATTACK)
  • 0.0.0.0:2376 (all interfaces, no conflict with Docker's 2375)

No admin rights required — runs as a standard user process.
"""
import http.server
import urllib.request
import urllib.error
import threading
import sys
import os
import time
import json

# Configuration
DOCKER_TAILSCALE = "http://100.83.247.14:2375"
DOCKER_LOCAL = "http://127.0.0.1:2375"
LISTEN_HOSTS = ["192.168.0.39", "0.0.0.0"]
LISTEN_PORT = 2376  # Forwarding to Docker (2375 is taken by Docker itself)

class DockerProxyHandler(http.server.BaseHTTPRequestHandler):
    """Reverse proxy to Docker API"""
    
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
        # Try Tailscale first, then localhost
        for backend in [DOCKER_TAILSCALE, DOCKER_LOCAL]:
            try:
                url = f"{backend}{self.path}"
                # Build the request with proper method
                req = urllib.request.Request(url)
                req.add_header('Content-Type', 'application/json')
                
                # Copy headers
                for key, value in self.headers.items():
                    if key.lower() not in ['host', 'connection', 'content-length']:
                        req.add_header(key, value)
                
                # Handle body for POST/PUT
                if self.command in ['POST', 'PUT']:
                    content_length = int(self.headers.get('Content-Length', 0))
                    body = self.rfile.read(content_length) if content_length > 0 else None
                    if body:
                        req.data = body
                
                # Use opener to handle the HTTP method
                opener = urllib.request.build_opener(urllib.request.HTTPSHandler())
                # Create a custom handler that respects the method
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
        self.send_response(502)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error = json.dumps({"error": "Docker API unreachable", "backends_tried": [DOCKER_TAILSCALE, DOCKER_LOCAL]})
        self.wfile.write(error.encode())
    
    def log_message(self, format, *args):
        # Quiet logging — uncomment for debugging
        # print(f"[DockerProxy] {args[0]}")
        pass

def run_proxy():
    """Start proxy servers on all interfaces"""
    servers = []
    
    for host in LISTEN_HOSTS:
        try:
            server = http.server.HTTPServer((host, LISTEN_PORT), DockerProxyHandler)
            server.timeout = 1
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            servers.append(server)
            print(f"✅ Proxy listening on {host}:{LISTEN_PORT}")
        except PermissionError:
            print(f"⚠️ Cannot bind {host}:{LISTEN_PORT} (need admin)")
        except Exception as e:
            print(f"❌ {host}:{LISTEN_PORT}: {e}")
    
    if not servers:
        # Fallback: try a higher port
        try:
            server = http.server.HTTPServer(("0.0.0.0", 2376), DockerProxyHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            servers.append(server)
            print(f"✅ Proxy listening on 0.0.0.0:2376 (fallback)")
        except Exception as e:
            print(f"❌ Cannot bind any port: {e}")
            return
    
    print(f"\n🚀 Docker Local Access Proxy running")
    print(f"   Tailscale:  100.83.247.14:2375 → Docker API (direct)")
    print(f"   Local LAN:  192.168.0.39:{LISTEN_PORT} → Docker API (proxied)")
    print(f"   Fallback:   0.0.0.0:2376 → Docker API (proxied)")
    print(f"\n   PINKCADY test: curl http://192.168.0.39:2376/_ping")
    
    # Keep running
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nShutting down...")
        for s in servers:
            s.shutdown()

if __name__ == "__main__":
    run_proxy()
