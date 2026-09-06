from http.server import HTTPServer, BaseHTTPRequestHandler
import socketserver
import json
import subprocess
import socket
import ipaddress
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent.parent.parent
INBOXES = ["SIR_GREEN_INBOX", "MISS_PINK_INBOX", "SIR_AZURE_INBOX"]
SUBNET = ipaddress.ip_network("192.168.0.0/24", strict=False)
PORT = 8080
ALERTS = []
MAX_ALERTS = 200
CAPTAIN_DASHBOARD_HTML = ROOT / "Developer_Brain" / "01_Projects" / "capta1n_orchestrat0r" / "dashboard" / "pirate_dashboard.html"


def _run(cmd, timeout=3):
    try:
        out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, text=True, timeout=timeout)
        return out.strip()
    except subprocess.TimeoutExpired:
        return "TIMEOUT"
    except Exception as e:
        return f"ERR: {e}"


def _is_host_alive(ip):
    ip = str(ip)
    try:
        socket.setdefaulttimeout(0.3)
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        result = s.connect_ex((ip, 445))
        s.close()
        if result == 0:
            return ip, True, "smb"
    except Exception:
        pass
    try:
        out = _run(f"ping -n 1 -w 300 {ip}")
        if "Reply from" in out or "TTL=" in out:
            return ip, True, "ping"
    except Exception:
        pass
    return ip, False, "none"


def scan_network():
    hosts = []
    with ThreadPoolExecutor(max_workers=120) as pool:
        futs = [pool.submit(_is_host_alive, ip) for ip in SUBNET.hosts()]
        for fut in as_completed(futs):
            ip, alive, proof = fut.result()
            if alive:
                hosts.append({"ip": ip, "alive": True, "proof": proof})
    hosts.sort(key=lambda x: tuple(int(p) for p in x["ip"].split(".")))
    return hosts[:50]


def service_status():
    checks = {
        "FleetWatcher": ("script", "C:/fleet/comms/fleet_comms_watcher.py", []),
        "SirGreenBot": ("script", "C:/fleet/bot/run_sir_green_bot.py", []),
        "AutomationWatcher": ("script", "C:/fleet/bot/sir_green_automation_watcher.py", []),
        "Portainer": ("url", "https://localhost:9443", ["-k"]),
        "Prometheus": ("url", "http://localhost:9090", ["-L"]),
        "Grafana": ("url", "http://localhost:3002", ["-L"]),
        "UptimeKuma": ("url", "http://localhost:3001", ["-L"]),
        "cAdvisor": ("url", "http://localhost:8081", ["-L"]),
        "NodeExporter": ("url", "http://localhost:9100", []),
        "CrowdSec": ("url", "http://localhost:8082/health", []),
        "NPM": ("url", "http://localhost:81", []),
        "TorusWebsite": ("url", "http://localhost:3005", []),
        "TorusPOS": ("url", "https://127.0.0.1:3100/health", ["-k"]),
        "TorusInventory": ("url", "http://localhost:3200", []),
    }
    out = {}
    for name, (kind, target, extra) in checks.items():
        if kind == "script":
            out[name] = "configured" if Path(target).exists() else "missing"
        else:
            curl_cmd = ["curl", "-s", "-o", "NUL", "-w", "%{http_code}"]
            curl_cmd.extend(extra)
            curl_cmd.append(target)
            code = _run(" ".join(curl_cmd))
            out[name] = code
    tailscale = _run("tailscale status")
    out["Tailscale"] = "\n".join(tailscale.splitlines()[:5]) if tailscale else "unknown"
    return out


def _add_alert(alert_type: str, message: str):
    ALERTS.insert(0, {
        "type": alert_type,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    while len(ALERTS) > MAX_ALERTS:
        ALERTS.pop()


def _collect_status_json():
    devices = scan_network()
    services = service_status()
    counts = {crew: len(list((ROOT / crew).glob("*.msg.md"))) if (ROOT / crew).exists() else -1 for crew in INBOXES}
    return {
        "inboxes": counts,
        "services": services,
        "devices": devices,
        "alerts": ALERTS[:100],
    }



class Handler(BaseHTTPRequestHandler):
    def _proxy_captain_api(self, path):
        try:
            import urllib.request
            url = f"http://127.0.0.1:8080{path}"
            req = urllib.request.Request(url)
            if getattr(self, "_captain_post", False):
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                req.data = body
                req.method = "POST"
                req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _proxy_backend_api(self, path):
        try:
            import urllib.request
            url = f"http://127.0.0.1:5000{path}"
            req = urllib.request.Request(url)
            if getattr(self, "_captain_post", False):
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                req.data = body
                req.method = "POST"
                req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def _serve_api(self):
        if self.path in ("/api/status", "/api/status/", "/api/status.json", "/api/status.json/"):
            payload = _collect_status_json()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))
            return

        if self.path in ("/api/whale", "/api/whale/"):
            Handler._captain_post = False
            self._proxy_captain_api("/api/whale")
            return

        if self.path in ("/api/crew_heartbeat", "/api/crew_heartbeat/"):
            Handler._captain_post = self.command == "POST"
            self._proxy_captain_api("/api/crew_heartbeat")
            return

        if self.path in ("/api/kuma", "/api/kuma/"):
            Handler._captain_post = False
            self._proxy_captain_api("/api/kuma")
            return

        if self.path == "/api/tools" or self.path == "/api/tools/":
            self._serve_tools_api()
            return

        if self.path == "/api/security-docs" or self.path == "/api/security-docs/":
            self._serve_security_docs_api()
            return

        if self.path == "/api/fleet" or self.path == "/api/fleet/":
            self._serve_fleet_api()
            return

        if self.path == "/api/hw" or self.path == "/api/hw/":
            self._serve_hw_api()
            return

        # Fallback: proxy unknown /api/* to backend :5000 so dashboard tabs get real JSON.
        if self.path.startswith("/api/"):
            self._proxy_backend_api(self.path)
            return

        if self.path == "/healthz" or self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            health = {
                "status": "OK",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.wfile.write(json.dumps(health).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"not found")

    def _serve_tools_api(self):
        try:
            script = ROOT / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "scripts" / "tool_status_checker.py"
            result = subprocess.run(
                ["python", str(script), "check"],
                capture_output=True,
                text=True,
                timeout=20,
            )
            payload = json.loads(result.stdout) if result.stdout.strip() else {"tools": []}
        except Exception as e:
            payload = {"error": str(e), "tools": []}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

    def _serve_security_docs_api(self):
        root = ROOT / "Developer_Brain"
        paths = [
            root / "00_Vault_Index" / "SECURITY_BRAIN.md",
            root / "00_Vault_Index" / "SECURITY_ACCESS_MATRIX.md",
            root / "00_Vault_Index" / "SECURITY_FIX_QUEUE.md",
            root / "02_Business_Operations" / "Infrastructure" / "monitoring" / "suricata.rules",
            root / "02_Business_Operations" / "Infrastructure" / "security_stack.json",
            root / "02_Business_Operations" / "Infrastructure" / "security" / "crowdsec" / "config.yaml",
            root / "02_Business_Operations" / "Tools" / "Ethical_Hacker_Toolkit" / "README.md",
        ]
        docs = []
        for path in paths:
            if path.exists():
                docs.append({
                    "name": path.name,
                    "path": str(path.relative_to(ROOT)),
                    "size_bytes": path.stat().st_size,
                    "modified": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat(),
                })
        payload = {"timestamp": datetime.now(timezone.utc).isoformat(), "docs": docs}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

    def _serve_fleet_api(self):
        try:
            script = ROOT / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "scripts" / "fleet_status_collector.py"
            result = subprocess.run(
                ["python", str(script), "collect"],
                capture_output=True,
                text=True,
                timeout=20,
            )
            payload = json.loads(result.stdout) if result.stdout.strip() else {"error": "empty"}
        except Exception as e:
            payload = {"error": str(e)}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

    def _serve_hw_api(self):
        try:
            script = ROOT / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "scripts" / "hw_monitor.py"
            result = subprocess.run(
                ["python", str(script), "collect"],
                capture_output=True,
                text=True,
                timeout=20,
            )
            payload = json.loads(result.stdout) if result.stdout.strip() else {"error": "empty"}
        except Exception as e:
            payload = {"error": str(e)}
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

    def _serve_tabbed_dashboard(self):
        counts = {crew: len(list((ROOT / crew).glob("*.msg.md"))) if (ROOT / crew).exists() else -1 for crew in INBOXES}
        devices = scan_network()
        services = service_status()

        dev_rows = "".join(
            f"<li>{d['ip']} <span class='ok'>{d['proof']}</span></li>" for d in devices
        )
        svc_rows = "".join(
            f"<li>{k}: <pre>{str(v).replace(chr(10), '<br>')}</pre></li>" for k, v in services.items()
        )

        alert_rows = "".join(
            f"<li><b>{a['type']}</b> [{a['timestamp']}] {a['message'].replace(chr(10), '<br>')}</li>"
            for a in ALERTS[:50]
        )

        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Pirate Captain's Hive Mind Dashboard</title>
    <meta http-equiv='refresh' content='30'>
    <style>
        body {{ font-family: Arial, sans-serif; background:#0b0c10; color:#c5c6c7; padding:18px; }}
        h1 {{ color:#66fcf1; }}
        .grid {{ display:grid; grid-template-columns: repeat(auto-fit,minmax(280px,1fr)); gap:16px; }}
        .card {{ background:#1f2833; border-radius:10px; padding:16px; }}
        .ok {{ color:#45a29e; }} .bad {{ color:#ff4b5c; }}
        pre {{ white-space: pre-wrap; word-break: break-word; }}
        a {{ color:#66fcf1; }}
        .alert {{ background:#2a1f1f; border-left:4px solid #ff4b5c; padding:8px; margin:4px 0; }}
        .tabs {{ display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }}
        .tab {{ background:#0b0c10; color:#c5c6c7; border:1px solid #333; padding:8px 12px; border-radius:6px; cursor:pointer; text-decoration:none; }}
        .tab.active {{ background:#66fcf1; color:#0b0c10; font-weight:bold; }}
        iframe {{ width:100%; height:78vh; border:1px solid #333; border-radius:10px; background:#000; display:none; }}
        iframe.visible {{ display:block; }}
        .panel {{ display:none; }}
        .panel.visible {{ display:block; }}
    </style>
</head>
<body>
    <h1>⚓ Pirate Captain's Hive Mind Dashboard</h1>
    <div class='tabs'>
        <a class='tab active' data-tab='hive' href='#'>Hive Mind</a>
        <a class='tab' data-tab='captain' href='#'>Captain</a>
        <a class='tab' data-tab='tools' href='#'>Tools</a>
        <a class='tab' data-tab='security' href='#'>Security</a>
        <a class='tab' data-tab='fleet' href='#'>Fleet</a>
        <a class='tab' data-tab='hardware' href='#'>Hardware</a>
        <a class='tab' data-tab='alerts' href='#'>Alerts</a>
    </div>

    <div id='tab-hive' class='panel visible'>
        <div class='grid'>
            <div class='card'>
                <h2>Inboxes</h2>
                <ul>
                    <li>SIR_GREEN_INBOX: {counts.get('SIR_GREEN_INBOX', -1)}</li>
                    <li>MISS_PINK_INBOX: {counts.get('MISS_PINK_INBOX', -1)}</li>
                    <li>SIR_AZURE_INBOX: {counts.get('SIR_AZURE_INBOX', -1)}</li>
                </ul>
                <p><a href='/api/status.json'>/api/status.json</a></p>
            </div>
            <div class='card'>
                <h2>Services</h2>
                <ul>{svc_rows}</ul>
            </div>
            <div class='card'>
                <h2>Local Network Scan</h2>
                <ul>{dev_rows}</ul>
            </div>
            <div class='card'>
                <h2>Alerts</h2>
                <ul>{alert_rows}</ul>
            </div>
        </div>
    </div>

    <div id='tab-captain' class='panel'>
        <iframe src='/tab/captain' data-base='/tab/captain' sandbox='allow-scripts allow-same-origin' class='visible'></iframe>
    </div>
    <div id='tab-tools' class='panel'>
        <iframe src='/tab/tools' data-base='/tab/tools' sandbox='allow-scripts allow-same-origin' class='visible'></iframe>
    </div>
    <div id='tab-security' class='panel'>
        <iframe src='/tab/security' data-base='/tab/security' sandbox='allow-scripts allow-same-origin' class='visible'></iframe>
    </div>
    <div id='tab-fleet' class='panel'>
        <iframe src='/tab/fleet' data-base='/tab/fleet' sandbox='allow-scripts allow-same-origin' class='visible'></iframe>
    </div>
    <div id='tab-hardware' class='panel'>
        <div id='hw-panel' class='panel visible'>
            <div class='grid'>
                <div class='card'>
                    <h2>Hardware</h2>
                    <pre id='hw-json'>Loading...</pre>
                </div>
            </div>
        </div>
    </div>
    <div id='tab-alerts' class='panel'>
        <iframe src='/tab/alerts' data-base='/tab/alerts' sandbox='allow-scripts allow-same-origin' class='visible'></iframe>
    </div>

<script>
document.querySelectorAll('.tab').forEach(el => el.addEventListener('click', e => {{
    e.preventDefault();
    const tab = el.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));
    el.classList.add('active');
    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('visible');
    const iframe = panel ? panel.querySelector('iframe') : null;
    if (iframe) {{
        const base = iframe.getAttribute('data-base') || iframe.getAttribute('src');
        iframe.setAttribute('src', base);
        iframe.addEventListener('load', function onLoad() {{
            iframe.removeEventListener('load', onLoad);
            try {{
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc && /Nginx Proxy Manager|Congratulations!/.test(doc.body.innerHTML)) {{
                    iframe.setAttribute('src', base + (base.includes('?') ? '&' : '?') + 'reload=' + Date.now());
                }}
            }} catch (e) {{}}
        }}, {{once: true}});
    }}
    if (tab === 'hardware') {{
        fetch('/api/hw').then(r => r.text()).then(t => {{
            const el2 = document.getElementById('hw-json');
            if (el2) el2.textContent = t;
        }}).catch(err => {{
            const el2 = document.getElementById('hw-json');
            if (el2) el2.textContent = 'ERR: ' + err;
        }});
    }}
}}));
</script>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))
        return

    def _local_tab_html(self, tab: str) -> str:
        if tab == "captain":
            return """<!DOCTYPE html>
<html><head><title>Captain</title><style>body{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}</style></head>
<body><h2>Captain Dashboard</h2><p>Local fallback view. Use Hive Mind for live status.</p></body></html>"""
        if tab == "tools":
            return """<!DOCTYPE html>
<html><head><title>Tools</title><style>body{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}</style></head>
<body><h2>Tools</h2><p>Local fallback view. Use Hive Mind for live status.</p></body></html>"""
        if tab == "security":
            return """<!DOCTYPE html>
<html><head><title>Security</title><style>body{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}</style></head>
<body><h2>Security</h2><p>Local fallback view. Use Hive Mind for live status.</p></body></html>"""
        if tab == "fleet":
            return """<!DOCTYPE html>
<html><head><title>Fleet</title><style>body{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}</style></head>
<body><h2>Fleet</h2><p>Local fallback view. Use Hive Mind for live status.</p></body></html>"""
        if tab == "hardware":
            return """<!DOCTYPE html>
<html><head><title>Hardware</title><style>body{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}</style></head>
<body><h2>Hardware</h2><p>Local fallback view. Use Hive Mind for live status.</p></body></html>"""
        if tab == "alerts":
            try:
                script = ROOT / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "scripts" / "unified_alert_router.py"
                result = subprocess.run(["python", str(script), "test"], capture_output=True, text=True, timeout=20)
                body = result.stdout.strip() or result.stderr.strip() or "no output"
            except Exception as e:
                body = f"ERR: {e}"
            return f"""<!DOCTYPE html>
<html><head><title>Alerts</title><style>body{{background:#0b0c10;color:#c5c6c7;font-family:Arial,sans-serif;padding:18px;}}pre{{white-space:pre-wrap;}}</style></head>
<body><h2>Alerts</h2><pre>{body}</pre></body></html>"""
        return ""

    def _serve_tab(self, tab):
        html = self._local_tab_html(tab)
        if html:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        captain_url = f"http://127.0.0.1:8080/{tab}"
        title = tab.replace("_", " ").title()
        probe_url = "http://127.0.0.1:8080/"
        probe_body = ""
        try:
            import urllib.request
            with urllib.request.urlopen(urllib.request.Request(probe_url), timeout=3) as resp:
                probe_body = resp.read().decode("utf-8", errors="ignore")
        except Exception as exc:
            probe_body = f"ERR:{exc}"

        if "Nginx Proxy Manager" in probe_body or "Congratulations!" in probe_body or probe_body.startswith("ERR:"):
            fallback = (
                "<div class='bar'>"
                f"<span class='title'>⚓ {title}</span>"
                "<a href='/'>Hive Mind</a>"
                "</div>"
                "<div style='background:#0b0c10;color:#c5c6c7;padding:18px;'>"
                "<h2>Captain dashboard backend is not serving real content on 8080.</h2>"
                "<p>Detected Nginx Proxy Manager default page or connection error.</p>"
                "<p>Use Hive Mind tab for live status, or start the captain dashboard app on 8080.</p>"
                "</div>"
            )
            html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Pirate Captain's Dashboard — {title}</title>
    <meta http-equiv='refresh' content='15'>
    <style>
        body {{ margin:0; background:#000; }}
        .bar {{ position:fixed; top:0; left:0; right:0; background:#0b0c10; padding:6px 12px; display:flex; gap:8px; align-items:center; z-index:10; border-bottom:1px solid #333; }}
        .bar a {{ color:#66fcf1; text-decoration:none; font-family:Arial,sans-serif; font-size:14px; }}
        .bar .title {{ color:#c5c6c7; margin-right:auto; }}
    </style>
</head>
<body>
    {fallback}
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Pirate Captain's Dashboard — {title}</title>
    <meta http-equiv='refresh' content='15'>
    <style>
        body {{ margin:0; background:#000; }}
        iframe {{ width:100vw; height:100vh; border:none; display:block; }}
        .bar {{ position:fixed; top:0; left:0; right:0; background:#0b0c10; padding:6px 12px; display:flex; gap:8px; align-items:center; z-index:10; border-bottom:1px solid #333; }}
        .bar a {{ color:#66fcf1; text-decoration:none; font-family:Arial,sans-serif; font-size:14px; }}
        .bar .title {{ color:#c5c6c7; margin-right:auto; }}
    </style>
</head>
<body>
    <div class='bar'>
        <span class='title'>⚓ {title}</span>
        <a href='/'>Hive Mind</a>
        <a href='/tab/captain'>Captain</a>
        <a href='/tab/tools'>Tools</a>
        <a href='/tab/security'>Security</a>
        <a href='/tab/fleet'>Fleet</a>
        <a href='/tab/hardware'>Hardware</a>
        <a href='/tab/alerts'>Alerts</a>
    </div>
    <iframe src='{captain_url}' sandbox='allow-scripts allow-same-origin'></iframe>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._serve_tabbed_dashboard()
            return

        if self.path.startswith("/tab/"):
            tab = self.path[len("/tab/"):]
            if not tab:
                tab = "/"
            self._serve_tab(tab)
            return

        if self.path.startswith("/api/"):
            self._serve_api()
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Pirate Dashboard v3.2")

    def do_POST(self):
        if self.path == "/api/alerts":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
            _add_alert(
                body.get("type", "unknown"),
                body.get("message", ""),
            )
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return

        if self.path.startswith("/api/"):
            Handler._captain_post = True
            self._serve_api()
            return

        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    import threading
    server = socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()
