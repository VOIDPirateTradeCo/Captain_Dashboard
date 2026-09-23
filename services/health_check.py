#!/usr/bin/env python3
"""
VOID Pirate Trading Co — Health Check Server
Runs on port 9999, verifies Docker daemon + fleet services.
Accessible from local LAN for PINKCADY connection confirmation.
Optimized for fast response (~5s max).
"""
import http.server
import socketserver
import json
import urllib.request
import os
import time

# Configuration
DOCKER_LAN = "http://192.168.0.39:2376"
HEALTH_PORT = 9999

# Fleet services to monitor (only externally accessible ports)
FLEET_SERVICES = {
    "void-npm": ("localhost", 81),
    "void-gitea": ("localhost", 3000),
    "void-kuma": ("localhost", 3001),
}


class HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/verify':
            result = self._build_health_report()
        elif self.path == '/healthz':
            try:
                r = urllib.request.urlopen(f'{DOCKER_LAN}/_ping', timeout=2)
                status = "OK" if r.read().decode().strip() == "OK" else "DOWN"
            except:
                status = "DOWN"
            result = {"status": status, "timestamp": time.ctime()}
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"error": "not found. Use /verify or /healthz"}')
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result, indent=2).encode())

    def _build_health_report(self):
        """Build comprehensive health report — optimized for sub-5s response."""
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # Check Docker daemon via LAN proxy (2s timeout)
        docker_status = "FAIL"
        try:
            r = urllib.request.urlopen(f'{DOCKER_LAN}/_ping', timeout=2)
            docker_status = r.read().decode().strip()
        except Exception:
            pass

        # Get container list via LAN proxy (2s timeout)
        containers = []
        try:
            r = urllib.request.urlopen(f'{DOCKER_LAN}/containers/json?all=true', timeout=2)
            containers = json.loads(r.read())
        except Exception:
            pass

        # Categorize containers
        running_containers = [c for c in containers if c.get('State') == 'running']
        k8s_names = [c['Names'][0].lstrip('/') for c in running_containers if c['Names'][0].lstrip('/').startswith('k8s_')]
        non_k8s_running = [c for c in running_containers if not c['Names'][0].lstrip('/').startswith('k8s_')]
        non_k8s_names = [c['Names'][0].lstrip('/') for c in non_k8s_running]

        # Check fleet service ports (1s timeout each — fast)
        fleet_status = {}
        for name, (host, port) in FLEET_SERVICES.items():
            try:
                r = urllib.request.urlopen(f'http://{host}:{port}', timeout=1)
                fleet_status[name] = "UP"
            except Exception:
                fleet_status[name] = "DOWN"

        return {
            "status": "VERIFIED" if docker_status == "OK" else "ERROR",
            "message": "SQUIDSTATION is live and ready for PINKCADY connection" if docker_status == "OK" else "SQUIDSTATION health check failed",
            "timestamp": timestamp,
            "tests": {
                "docker_api": f"http://192.168.0.39:2376/_ping -> {docker_status}",
                "docker_lan_proxy": f"http://192.168.0.39:2376/_ping -> OK" if docker_status == "OK" else "FAIL",
                "containers": {
                    "total": len(containers),
                    "running": len(running_containers),
                    "k8s_pods": len(k8s_names),
                    "fleet_services": len(non_k8s_running),
                },
                "containers_list": non_k8s_names,
                "fleet_services_status": fleet_status,
            },
            "pinks_access": {
                "docker_proxy": "http://192.168.0.39:2376",
                "health_check": "http://192.168.0.39:9999/verify",
                "vault_share": "\\\\192.168.0.39\\Vault",
            },
        }

    def log_message(self, format, *args):
        """Silent logging."""
        pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    timeout = 1


if __name__ == "__main__":
    server = ThreadingHTTPServer(('0.0.0.0', HEALTH_PORT), HealthHandler)
    print(f"Health check server running on http://0.0.0.0:{HEALTH_PORT}")
    print(f"  VERIFIED: curl http://192.168.0.39:{HEALTH_PORT}/verify")
    print(f"  SIMPLE:   curl http://192.168.0.39:{HEALTH_PORT}/healthz")
    server.serve_forever()
