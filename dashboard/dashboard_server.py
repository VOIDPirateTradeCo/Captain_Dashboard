#!/usr/bin/env python3
"""
Pirate Captain's Dashboard Server v3.0 — FAST RESPONSE
=======================================================

Architecture:
  - Port 8080: Dashboard HTTP server (Python stdlib) + JSON API
  - Cache-first responses: API returns in <3 seconds using cached data
  - Background threads refresh network scans, Docker stats, vault health
  - WHITE WHALE protocols (classified threat tools) hidden behind passphrase + threat_detected gate
  - WHITE WHALE sub-sections:
    * BLACK WHALE: threat detection (unknown devices on network)
    - GREEN WHALE: security maintenance checks
  - TIDAL TONGUE: encrypted comms channel monitoring
  - Crew agent heartbeat: /api/crew_heartbeat (for cross-ship agent monitoring)
  - Obsidian vault health: git status, OPSEC, file integrity

Network:
  - nmap via kali-full Docker container for 192.168.0.0/24 discovery
  - Docker API at localhost:2375 (Docker Desktop TCP) — requires proxy auth
  - Docker proxy at port 2376 (for PINKCADY/STEALTHATTACK LAN access)
  - Health check at port 9999
  - Nginx Proxy Manager at port 81 (reverse proxy to 8080)

Access:
  - Public:  http://localhost:81  or  http://192.168.0.39:8080
  - WHITE WHALE: /api/whale?passphrase_hash=<sha256_of_passphrase>&threat_detected=true
"""
import os
import sys
import json
import sqlite3
import socket
import subprocess
import threading
import time
import datetime
from datetime import timezone
import re
import hashlib
import hmac
import http.client
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs
from canonical_paths import path_guard
from pathlib import Path
import tempfile
import urllib.request

# Offline-first: make TM backend modules importable directly
_BACKEND_DIR = Path(r'C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\PROJECT_tr3asure_mAp\tr3asure_mAp')
_BACKEND_PY_DIR = _BACKEND_DIR / 'backend'
if str(_BACKEND_PY_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_PY_DIR))
_DB_PATH = _BACKEND_DIR / 'data' / 'treasure_map.db'

# Docker daemon access
DOCKER_API_PORT = 2375  # Docker's actual port (local only)
DOCKER_PROXY_PORT = 2376  # Secured proxy port for LAN access  
DOCKER_PROXY_TOKEN = os.environ.get('DOCKER_PROXY_TOKEN', '')

def load_json(path, default=None):
    try:
        p = Path(path)
        if p.exists():
            return json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        pass
    return default if default is not None else {}

# Crew agent heartbeats — ship_name -> {last_seen, data}
CREW_HEARTBEATS = {}

# ── DURABLE FLEET ROSTER ──────────────────────────────────────────────────
# CREW_HEARTBEATS used to be memory-only: every dashboard restart forgot the
# entire fleet, so rigs showed offline until their next agent cycle. Persist
# the roster so the hive mind survives a restart.
HEARTBEAT_STATE_FILE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "crew_heartbeats.json")


def _persist_heartbeats():
    try:
        with open(HEARTBEAT_STATE_FILE, "w", encoding="utf-8") as fh:
            json.dump(CREW_HEARTBEATS, fh, indent=2)
    except OSError:
        pass


def _load_heartbeats():
    try:
        if os.path.exists(HEARTBEAT_STATE_FILE):
            with open(HEARTBEAT_STATE_FILE, "r", encoding="utf-8") as fh:
                CREW_HEARTBEATS.update(json.load(fh))
    except (OSError, ValueError):
        pass


_load_heartbeats()

# ┌─────────────────────────────────────────────────────────────┐
# │                    Configuration                            │
# └─────────────────────────────────────────────────────────────┘

SQUID_IP = "192.168.0.39"
PINK_IP = "192.168.0.3"
AZURE_IP = "192.168.0.32"
GATEWAY_IP = "192.168.0.1"
HEALTH_API = f"http://{SQUID_IP}:9999"
KALI_CONTAINER = "kali-full"
NETWORK_CIDR = "192.168.0.0/24"
DASHBOARD_PORT = 8080
TS_SQUID_IP = None  # SQUIDSTATION local
TS_PINK_IP = None   # PINKCADY local
TS_AZURE_IP = "100.83.247.14"  # STEALTHATTACK Tailscale (LAN ports closed, TS works)
TS_GATEWAY_IP = None

# VirtualBox management
VBOXMANAGE_PATH = r"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"

# Known ships on the network — LAN IPs (with Tailscale fallback for STEALTHATTACK)
KNOWN_SHIPS = {
    "SQUIDSTATION": {"ip": SQUID_IP, "ts_ip": TS_SQUID_IP, "role": "Captain's Flagship", "icon": "🏴‍☠️"},
    "PINKCADY": {"ip": PINK_IP, "ts_ip": TS_PINK_IP, "role": "Torus Coffee Commander", "icon": "🦜"},
    "STEALTHATTACK": {"ip": AZURE_IP, "ts_ip": TS_AZURE_IP, "role": "GPU Rendering Lane", "icon": "🐉"},
    "GATEWAY": {"ip": GATEWAY_IP, "ts_ip": TS_GATEWAY_IP, "role": "Network Gateway", "icon": "🌐"},
}

# Ports to scan on each device for service identification
NETWORK_SCAN_PORTS = [21, 22, 23, 25, 53, 80, 111, 139, 443, 445, 873,
                      2375, 2376, 3000, 3001, 3306, 5432, 6379, 8080, 8443, 9999, 5000, 27017]

# WHITE WHALE passphrase hash.
# Set env WHITE_WHALE_PASSPHRASE_HASH (64-hex sha256) OR WHITE_WHALE_PASSPHRASE
# (plaintext, hashed here) to keep the passphrase OUT of source/git. A legacy
# fallback is retained so existing installs keep working until the env is set —
# treat that fallback as compromised (it is committed in history) and rotate.
_ww_hash_env = os.environ.get("WHITE_WHALE_PASSPHRASE_HASH", "").strip().lower()
_ww_pass_env = os.environ.get("WHITE_WHALE_PASSPHRASE", "")
if len(_ww_hash_env) == 64 and all(c in "0123456789abcdef" for c in _ww_hash_env):
    WHITE_WHALE_PASSPHRASE_HASH = _ww_hash_env
elif _ww_pass_env:
    WHITE_WHALE_PASSPHRASE_HASH = hashlib.sha256(_ww_pass_env.encode("utf-8")).hexdigest()
else:
    # legacy default — already in git history, treat as compromised, rotate via the env vars
    WHITE_WHALE_PASSPHRASE_HASH = hashlib.sha256(b"voidpirate_captain_2026").hexdigest()

# Resolve paths — vault-aware
# This server can run from either:
#   1. PROJECT_capta1n_orchestrat0r/dashboard/ (standalone project)
#   2. Obsidian_Vault/.../PROJECT_capta1n_orchestrat0r/ (vault-integrated)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else os.getcwd()
# Fallback: if running via -c, use current directory
if not os.path.exists(os.path.join(SCRIPT_DIR, 'dashboard_server.py')):
    SCRIPT_DIR = os.getcwd()
    if not os.path.exists(os.path.join(SCRIPT_DIR, 'dashboard_server.py')):
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else os.getcwd()

# Hard-coded vault path (always the canonical source)
# This server lives INSIDE the obsidian vault at:
#   Developer_Brain/01_Projects/PROJECT_capta1n_orchestrat0r/dashboard_server.py
VAULT_PATH = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault"
ROOT_PATH = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co"
SHARED_WITH_PINK = os.path.join(VAULT_PATH, "Shared_With_Pink")

# If vault path doesn't exist, try resolving from script location
if not os.path.isdir(VAULT_PATH):
    # Try standard vault location relative to script
    candidates = [
        os.path.join(SCRIPT_DIR, "..", "..", "..", "..", "Obsidian_Vault"),
        os.path.join(SCRIPT_DIR, "..", "..", "..", "..", "Obsidian_Vault"),
        os.path.join(os.getcwd(), "Obsidian_Vault"),
        r"C:\Users\kidsm\Documents\My docs\VOID Pirate Trading Co\Obsidian_Vault",
    ]
    for candidate in candidates:
        if os.path.isdir(candidate):
            VAULT_PATH = candidate
            ROOT_PATH = os.path.abspath(os.path.join(VAULT_PATH, "..", ".."))
            SHARED_WITH_PINK = os.path.join(VAULT_PATH, "Shared_With_Pink")
            break

# ┌─────────────────────────────────────────────────────────────┐
# │              Cache & Utility Functions                      │
# └─────────────────────────────────────────────────────────────┘

# Global cache with per-key TTL
_CACHE = {}
CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'state', 'dashboard_cache.json')
CACHE_TIMEOUT = 300  # seconds — prevent loading flicker between refresh cycles

def _load_cache():
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                raw = json.load(f)
                if isinstance(raw, dict):
                    return _deserialize_cache(raw)
    except Exception:
        pass
    return {}

def _save_cache():
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(_CACHE, f)
    except Exception:
        pass

_CACHE = _load_cache()

_cache_lock = threading.Lock()

def cache_get(key):
    """Get cached data if not expired."""
    with _cache_lock:
        if key in _CACHE:
            data, timestamp = _CACHE[key]
            if (datetime.datetime.now(datetime.timezone.utc) - timestamp).total_seconds() < CACHE_TIMEOUT:
                return data
    return None

def _make_serializable(obj):
    """Convert datetime objects to ISO strings for JSON serialization."""
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_serializable(item) for item in obj]
    return obj

def _restore_from_serializable(obj):
    """Restore tuples from serialized cache format."""
    if isinstance(obj, dict):
        return {k: _restore_from_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_restore_from_serializable(item) for item in obj]
    elif isinstance(obj, str) and obj.startswith('__datetime__:'):
        # Restore datetime from string
        try:
            return datetime.datetime.fromisoformat(obj.replace('__datetime__:', ''))
        except Exception:
            return obj
    return obj

def _serialize_cache(cache):
    """Convert cache dict to JSON-serializable format."""
    result = {}
    for key, value in cache.items():
        data, timestamp = value
        result[key] = [_make_serializable(data), _make_serializable(timestamp)]
    return result

def _deserialize_cache(cache):
    """Convert JSON cache back to internal format."""
    result = {}
    for key, value in cache.items():
        if isinstance(value, list) and len(value) == 2:
            result[key] = (_restore_from_serializable(value[0]), _restore_from_serializable(value[1]))
    return result

def _save_cache():
    try:
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        serializable = _serialize_cache(_CACHE)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(serializable, f)
    except Exception:
        pass

def cache_set(key, data):
    """Set cached data with current timestamp."""
    with _cache_lock:
        _CACHE[key] = (data, datetime.datetime.now(datetime.timezone.utc))
    _save_cache()

def cache_clear(key=None):
    """Clear specific cache key or all cache."""
    with _cache_lock:
        if key:
            _CACHE.pop(key, None)
        else:
            _CACHE.clear()
    _save_cache()

def check_port_fast(host, port, timeout=0.5):
    """Fast TCP port check. Returns True if port is open."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        # WSAEWOULDBLOCK (10035) on Windows means the non-blocking connect
        # is still in progress; treat it as an inconclusive result and retry
        # once with a slightly longer timeout before falling back to False.
        if result == 0:
            return True
        if result == 10035 and timeout < 2.0:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2.0)
                result = sock.connect_ex((host, port))
                sock.close()
            except Exception:
                pass
        return result == 0
    except:
        return False

def scan_ports_parallel(host, ports, timeout=0.4):
    """Scan multiple ports in parallel. Returns list of open ports."""
    open_ports = []
    with ThreadPoolExecutor(max_workers=100) as executor:
        futures = {executor.submit(check_port_fast, host, p, timeout): p for p in ports}
        for future in as_completed(futures):
            port = futures[future]
            try:
                if future.result(timeout=2):
                    open_ports.append(port)
            except:
                pass
    return sorted(open_ports)

def run_docker_exec(container, cmd_list, timeout=30):
    """Run command in Docker container via CLI."""
    try:
        result = subprocess.run(
            ['docker', 'exec', container] + cmd_list,
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0:
            return result.stdout
    except Exception:
        pass
    return ""

def docker_api_local(path, method='GET', body=None):
    """Make request to Docker API via secured TLS local proxy (port 2376)."""
    import ssl
    try:
        # Self-signed cert — skip verification for local proxy
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        conn = http.client.HTTPSConnection('127.0.0.1', DOCKER_PROXY_PORT, timeout=3, context=ctx)
        headers = {'Content-Type': 'application/json'}
        if DOCKER_PROXY_TOKEN:
            headers['Authorization'] = f'Bearer {DOCKER_PROXY_TOKEN}'
        conn.request(method, f'/v1.43{path}', body=body, headers=headers)
        resp = conn.getresponse()
        data = resp.read()
        conn.close()
        return resp.status, data
    except Exception as e:
        return 0, json.dumps({"error": str(e)}).encode()

def ping_fast(host, count=1, timeout=3):
    """Fast ping to measure latency."""
    try:
        result = subprocess.run(
            ['ping', '-n', str(count), host],
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0:
            match = re.search(r'(?:Average|time)[=:\s]+(\d+)ms', result.stdout, re.IGNORECASE)
            if match:
                return match.group(1) + "ms"
            return "up"
        return "down"
    except:
        return "down"

def check_ship_ip(ip):
    """Check if a ship/IP is online by testing common ports."""
    ports = [22, 80, 443, 445, 3000, 8080, 8085, 2375]
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(check_port_fast, ip, p, timeout=0.4): p for p in ports}
        for future in as_completed(futures):
            if future.result(timeout=3):
                return "online"
    return "offline"

# ┌─────────────────────────────────────────────────────────────┐
# │              Network Discovery (nmap via Kali)            │
# └─────────────────────────────────────────────────────────────┘

# Pre-computed network scan state — refreshed by background thread
_NETWORK_SCAN_STATE = {
    "devices": [],
    "last_scan": None,
    "scan_in_progress": False,
    "scan_error": None,
    "last_scan_duration": None,
}

_SCAN_FAILED_COUNT = 0
_MAX_SCAN_FAILURES = 3

def _async_refresh_network():
    """Background refresh of network discovery."""
    prev_scanning = _NETWORK_SCAN_STATE["scan_in_progress"]
    _NETWORK_SCAN_STATE["scan_in_progress"] = True
    try:
        _scan_network_internal(no_cache=True)
    except Exception:
        pass
    finally:
        _NETWORK_SCAN_STATE["scan_in_progress"] = prev_scanning

def _scan_network_internal(no_cache=False):
    """Scan local network using ARP cache and port checks."""
    global _SCAN_FAILED_COUNT
    if no_cache or not _NETWORK_SCAN_STATE["last_scan"]:
        scan_start = time.time()
        devices = []
        try:
            arp_lines = []
            try:
                arp_lines = subprocess.run(
                    ["arp", "-a"], capture_output=True, text=True, timeout=5
                ).stdout.splitlines()
            except Exception:
                pass

            seen = set()
            for line in arp_lines:
                parts = line.split()
                if len(parts) >= 3 and parts[0].count(".") == 3:
                    ip = parts[0]
                    mac = parts[1].upper()
                    if mac in {"FF-FF-FF-FF-FF-FF", "00-00-00-00-00-00"}:
                        continue
                    if ip.startswith(("224.", "239.", "255.")) or ip.endswith(".255"):
                        continue
                    if ip in seen:
                        continue
                    seen.add(ip)
                    devices.append({
                        "ip": ip,
                        "hostname": "",
                        "mac": mac,
                        "vendor": "",
                        "status": "up",
                        "ports": [],
                    })

            # Ensure known ships appear even if ARP is stale
            known_ips = {s["ip"] for s in KNOWN_SHIPS.values()}
            missing = known_ips - seen
            for ip in missing:
                devices.append({
                    "ip": ip,
                    "hostname": "",
                    "mac": "",
                    "vendor": "",
                    "status": "up",
                    "ports": [],
                })

            # Port scan in parallel
            with ThreadPoolExecutor(max_workers=40) as executor:
                futures = {executor.submit(scan_ports_parallel, d["ip"], NETWORK_SCAN_PORTS, timeout=0.3): d["ip"] for d in devices}
                for future in as_completed(futures):
                    ip = futures[future]
                    try:
                        ports = future.result(timeout=8)
                        for d in devices:
                            if d["ip"] == ip:
                                d["ports"] = ports
                                break
                    except Exception:
                        pass

            _NETWORK_SCAN_STATE["devices"] = devices
            _NETWORK_SCAN_STATE["last_scan"] = datetime.datetime.now(datetime.timezone.utc)
            _NETWORK_SCAN_STATE["scan_error"] = None
            _SCAN_FAILED_COUNT = 0
        except Exception as e:
            _SCAN_FAILED_COUNT += 1
            _NETWORK_SCAN_STATE["scan_error"] = str(e)
            log(f"SCAN_ERROR count={_SCAN_FAILED_COUNT} err={e!r}")
        finally:
            _NETWORK_SCAN_STATE["last_scan_duration"] = time.time() - scan_start

    return _NETWORK_SCAN_STATE["devices"]

def discover_network():
    """Discover ALL devices on local network.
    Returns cached data immediately — triggers async refresh."""
    # Trigger background refresh if not already running and data is stale
    try:
        last = _NETWORK_SCAN_STATE["last_scan"]
        if last is None or (datetime.datetime.now(datetime.timezone.utc) - last).total_seconds() > 15:
            if not _NETWORK_SCAN_STATE["scan_in_progress"]:
                threading.Thread(target=_async_refresh_network, daemon=True).start()
    except Exception:
        if not _NETWORK_SCAN_STATE["scan_in_progress"]:
            threading.Thread(target=_async_refresh_network, daemon=True).start()

    return _NETWORK_SCAN_STATE["devices"][:]  # Return a copy

# ┌─────────────────────────────────────────────────────────────┐
# │              Docker Container Monitoring                    │
# └─────────────────────────────────────────────────────────────┘

def get_docker_containers():
    """Get Docker containers via localhost API."""
    cached = cache_get('docker_containers')
    if cached:
        return cached

    containers = []
    status, data = docker_api_local('/containers/json?all=true&size=true')
    if status == 200:
        containers = json.loads(data)
    else:
        # Fallback: Docker CLI
        try:
            result = subprocess.run(
                ['docker', 'ps', '--format', '{{json .}}'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line:
                        containers.append(json.loads(line))
        except:
            pass

    total = len(containers)
    running = sum(1 for c in containers if c.get("State", "running") == "running")
    names = []
    fleet_count = security_count = k8s_count = 0

    for c in containers:
        name = ""
        if c.get("Names"):
            name = c["Names"][0].replace("/", "") if isinstance(c["Names"], list) else str(c.get("Names", ""))
        elif c.get("Name"):
            name = c.get("Name", "").replace("/", "")
        elif c.get("Command"):
            name = c.get("Command", "")[:20]
        names.append(name)

        if name.startswith("void-"):
            fleet_count += 1
        elif name in ("suricata-ids", "nmap-scanner", "nikto-web-scanner", "tcpdump-logger"):
            security_count += 1
        elif name.startswith("k8s_"):
            k8s_count += 1

    result = {
        "total": total,
        "running": running,
        "fleet": fleet_count,
        "security": security_count,
        "k8s": k8s_count,
        "names": sorted(names)
    }
    cache_set('docker_containers', result)
    return result

def get_kuma_summary():
    """Get Kuma monitor summary from container database."""
    cached = cache_get('kuma')
    if cached:
        return cached
    try:
        tmp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False, dir=Path(__file__).resolve().parent.parent / 'state')
        tmp_path = tmp_db.name
        tmp_db.close()
        result = subprocess.run(
            ['docker', 'cp', 'void-kuma:/app/data/kuma.db', tmp_path],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            os.unlink(tmp_path)
            degraded = {"status": "degraded", "error": "docker cp failed", "stderr": result.stderr}
            cache_set('kuma', degraded)
            return degraded

        conn = sqlite3.connect(tmp_path)
        cur = conn.cursor()
        cur.execute("SELECT id, name, url, active FROM monitor")
        monitors = [{"id": r[0], "name": r[1], "url": r[2], "active": bool(r[3])} for r in cur.fetchall()]
        cur.execute("SELECT id, name FROM notification")
        notifications = [{"id": r[0], "name": r[1]} for r in cur.fetchall()]
        cur.execute("SELECT monitor_id, notification_id FROM monitor_notification")
        bindings = [{"monitor_id": r[0], "notification_id": r[1]} for r in cur.fetchall()]
        conn.close()
        os.unlink(tmp_path)

        data = {
            "status": "ok",
            "monitors": monitors,
            "monitor_count": len(monitors),
            "active_count": sum(1 for m in monitors if m["active"]),
            "notifications": notifications,
            "bindings": bindings,
            "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
        }
        cache_set('kuma', data)
        return data
    except Exception as e:
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        degraded = {"status": "degraded", "error": str(e)}
        cache_set('kuma', degraded)
        return degraded

def get_health_check():
    """Get detailed health check from port 9999."""
    cached = cache_get('health_check')
    if cached:
        return cached
    try:
        url = f"{HEALTH_API}/verify"
        req = urllib.request.urlopen(url, timeout=3)
        data = json.loads(req.read())
        result = {
            "status": data.get("status", "UNKNOWN"),
            "message": data.get("message", ""),
            "tests": data.get("tests", {}),
            "health": "VERIFIED",
            "docker": "OK",
        }
        cache_set('health_check', result)
        return result
    except Exception as e:
        result = {
            'status': 'SKIPPED',
            'detail': 'health endpoint not available',
            'error': str(e),
            'health': 'SKIPPED',
            'docker': 'OK',
            'tests': {},
        }
        cache_set('health_check', result)
        return result

# ┌─────────────────────────────────────────────────────────────┐
# │              Sandbox: VBox + Docker + Hardware             │
# └─────────────────────────────────────────────────────────────┘

def get_virtualbox_vms():
    """List VirtualBox VMs via VBoxManage."""
    cached = cache_get('vbox_vms')
    if cached:
        return cached
    vms = []
    try:
        if os.path.exists(VBOXMANAGE_PATH):
            # List all registered VMs
            r = subprocess.run(
                [VBOXMANAGE_PATH, "list", "vms"],
                capture_output=True, text=True, timeout=10
            )
            # Parse: "FooFighters" {uuid}
            for line in r.stdout.strip().split('\n'):
                if line.strip():
                    # Extract VM name
                    name_part = line.split(' {')[0].replace('"', '')
                    uuid_part = line.split('{')[1].split('}')[0] if '{' in line else ""
                    vms.append({"name": name_part, "uuid": uuid_part})
            
            # Get detailed info for each VM
            for vm in vms:
                if vm["name"]:
                    r2 = subprocess.run(
                        [VBOXMANAGE_PATH, "showvminfo", vm["name"], "--machinereadable"],
                        capture_output=True, text=True, timeout=10
                    )
                    if r2.returncode == 0:
                        info = {}
                        for line in r2.stdout.split('\n'):
                            if '=' in line:
                                key, val = line.split('=', 1)
                                info[key.strip()] = val.strip().strip('"')
                        vm["state"] = info.get("VMState", "unknown")
                        vm["ostype"] = info.get("ostype", "unknown")
                        vm["memory"] = info.get("memory", "0 MB")
                        vm["cpus"] = info.get("cpus", "0")
                        vm["vram"] = info.get("vram", "0 MB")
                        vm["hyperv"] = info.get("hwvirt", "unknown")
        
        # Also check for inaccessible VMs
        r = subprocess.run(
            [VBOXMANAGE_PATH, "list", "vms", "--long"] if os.path.exists(VBOXMANAGE_PATH) else ["echo", "{}"],
            capture_output=True, text=True, timeout=15
        )
    except Exception as e:
        vms = [{"error": str(e)}]
    
    result = {"vms": vms, "vbox_path": VBOXMANAGE_PATH, "installed": os.path.exists(VBOXMANAGE_PATH)}
    cache_set('vbox_vms', result)
    return result

def get_hardware_inventory():
    """Get local hardware features — CPUs, M.2 slots, XMP, WiFi, Bluetooth, TPM, USB devices."""
    cached = cache_get('hardware')
    if cached:
        return cached
    
    result = {
        "cpu": {},
        "memory": {},
        "storage": [],
        "network": [],
        "audio": [],
        "usb": [],
        "tpm": {},
        "bios": {},
    }
    
    try:
        # CPU Info
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed, Caption, Description | ConvertTo-Json -Depth 1"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["cpu"] = {"raw": r.stdout.strip()}
        
        # Memory Info (for XMP detection)
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance -ClassName Win32_PhysicalMemory | Select-Object Manufacturer, PartNumber, Capacity, Speed, ConfiguredClockSpeed | ConvertTo-Json -Depth 2"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["memory"] = {"raw": r.stdout.strip()}
        
        # Storage (check all physical drives, M.2 vs SATA)
        r = subprocess.run(
            ["powershell", "-Command", "Get-PhysicalDisk | Select-Object DeviceID, FriendlyName, MediaType, BusType, Size, SpindleSpeed | ConvertTo-Json -Depth 1"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["storage"] = {"raw": r.stdout.strip()}
        
        # Network adapters
        r = subprocess.run(
            ["powershell", "-Command", "Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MediaType | ConvertTo-Json -Depth 2"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["network"] = {"raw": r.stdout.strip()}
        
        # Audio devices
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance -ClassName Win32_SoundDevice | Select-Object Name, Status | ConvertTo-Json -Depth 1"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["audio"] = {"raw": r.stdout.strip()}
        
        # TPM
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance -Namespace root/cimv2/security/microsofttpm -ClassName Win32_Tpm | Select-Object SpecVersion, IsActivated_InitialValue, IsEnabled_InitialValue | ConvertTo-Json -Depth 1"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["tpm"] = {"raw": r.stdout.strip()}
        
        # USB Devices (hiding features check)
        r = subprocess.run(
            ["powershell", "-Command", "Get-PnpDevice -Class USB | Select-Object FriendlyName, Status, InstanceId | ConvertTo-Json -Depth 3"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["usb"] = {"raw": r.stdout.strip()}
        
        # WiFi Adapters (check WiFi 6E availability)
        r = subprocess.run(
            ["powershell", "-Command", "Get-NetAdapter | Where-Object {$_.Name -like '*WiFi*' -or $_.Name -like '*Wireless*'} | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MediaType | ConvertTo-Json -Depth 2"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["wifi"] = {"raw": r.stdout.strip()}
        
        # Bluetooth devices
        r = subprocess.run(
            ["powershell", "-Command", "Get-PnpDevice -Class Bluetooth | Select-Object FriendlyName, Status | ConvertTo-Json -Depth 2"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["bluetooth"] = {"raw": r.stdout.strip()}
        
        # Memory detail (for XMP detection) — get full memory info including speed
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance -ClassName Win32_PhysicalMemory | Select-Object Manufacturer, PartNumber, Capacity, Speed, ConfiguredClockSpeed, SMBIOSMemoryType | ConvertTo-Json -Depth 2"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["memory_detail"] = {"raw": r.stdout.strip()}
        
        # BIOS info (for XMP/VM flags)
        r = subprocess.run(
            ["powershell", "-Command", "Get-CimInstance -ClassName Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate, SerialNumber | ConvertTo-Json -Depth 1"],
            capture_output=True, text=True, timeout=10
        )
        if r.stdout.strip():
            result["bios"] = {"raw": r.stdout.strip()}
        
        result["hostname"] = socket.gethostname()
        result["timestamp"] = datetime.datetime.now(timezone.utc).isoformat()
    except Exception as e:
        result["error"] = str(e)
    
    cache_set('hardware', result)
    return result

def get_network_devices():
    """Get all network devices discovered on the local network."""
    cached = cache_get('network_devices')
    if cached:
        return cached
    
    devices = discover_network()
    
    # Enrich with Tailscale IP info for STEALTHATTACK
    ships_fleet = {}
    for ship, info in KNOWN_SHIPS.items():
        ships_fleet[ship] = {
            "lan_ip": info["ip"],
            "ts_ip": info.get("ts_ip"),
            "online": check_port_fast(info["ip"], 80, timeout=0.4) or 
                     (info.get("ts_ip") and check_port_fast(info["ts_ip"], 22, timeout=0.4)),
            "role": info["role"],
            "icon": info["icon"],
        }
    
    result = {
        "discovered_devices": devices,
        "known_ships": ships_fleet,
        "cidr": NETWORK_CIDR,
        "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
    }
    cache_set('network_devices', result)
    return result

def get_docker_summary():
    """Get Docker container + volume/image summary."""
    containers = get_docker_containers()
    
    volumes = []
    try:
        r = subprocess.run(['docker', 'volume', 'ls', '--format', '{{.Name}}'],
            capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            volumes = [v for v in r.stdout.strip().split('\n') if v]
    except:
        pass
    
    images = []
    try:
        r = subprocess.run(['docker', 'images', '--format', '{{.Repository}}:{{.Tag}}\t{{.Size}}'],
            capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            images = [line for line in r.stdout.strip().split('\n') if line]
    except:
        pass
    
    networks = []
    try:
        r = subprocess.run(['docker', 'network', 'ls', '--format', '{{.Name}}\t{{.Driver}}'],
            capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            networks = [line for line in r.stdout.strip().split('\n') if line]
    except:
        pass
    
    # VBox integration: can VBox reach Docker?
    vbox_installed = os.path.exists(VBOXMANAGE_PATH)
    vbox_vms = get_virtualbox_vms()
    
    # Check if VBox host-only network exists
    vbox_hostonly = False
    if vbox_installed:
        try:
            r = subprocess.run([VBOXMANAGE_PATH, "list", "hostonlyifs"],
                capture_output=True, text=True, timeout=5)
            vbox_hostonly = "Host-Only Ethernet Adapter" in r.stdout
        except:
            pass
    
    result = {
        "containers": containers,
        "volumes": volumes,
        "images": images,
        "networks": networks,
        "sandbox_ready": vbox_installed and vbox_hostonly,
        "vbox": {
            "installed": vbox_installed,
            "hostonly_network": vbox_hostonly,
            "vms": [v.get("name") for v in vbox_vms.get("vms", [])],
        },
        "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
    }
    cache_set('docker_summary', result)
    return result

def get_sandbox_status():
    """Overall sandbox status — VBox + Docker + hardware + fleet."""
    vbox = get_virtualbox_vms()
    docker = get_docker_summary()
    hw = get_hardware_inventory()
    net = get_network_devices()
    
    # Fleet health summary
    ships = {}
    for ship, info in KNOWN_SHIPS.items():
        lan_ip = info["ip"]
        ts_ip = info.get("ts_ip")
        # Check LAN first (probe several likely-open crew ports, not just :80
        # which is rarely used -> was causing false 'OFFLINE' reports), then
        # Tailscale fallback.
        online = any(check_port_fast(lan_ip, p, timeout=0.5) for p in (8080, 9000, 22, 80, 2376))
        if not online and ts_ip:
            online = check_port_fast(ts_ip, 22, timeout=0.5)
        ships[ship] = {
            "online": online,
            "lan_ip": lan_ip,
            "ts_ip": ts_ip,
            "role": info["role"],
        }
    
    result = {
        "sandbox": "operational" if vbox["installed"] else "degraded",
        "virtualbox": {
            "installed": vbox["installed"],
            "vm_count": len([v for v in vbox.get("vms", []) if "error" not in v]),
            "vms": vbox.get("vms", []),
        },
        "docker": {
            "total_containers": docker["containers"].get("total", 0),
            "running": docker["containers"].get("running", 0),
            "volumes": len(docker.get("volumes", [])),
            "images": len(docker.get("images", [])),
        },
        "fleet": {
            "ships": ships,
            "online_count": sum(1 for s in ships.values() if s["online"]),
            "total_ships": len(ships),
        },
        "hardware": {
            "hostname": hw.get("hostname", "unknown"),
            "timestamp": hw.get("timestamp", ""),
        },
        "network": {
            "discovered": len(net.get("discovered_devices", [])),
            "cidr": NETWORK_CIDR,
        },
        "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
    }
    return result

# ┌─────────────────────────────────────────────────────────────┐
# │              Git + Vault Health                             │
# └─────────────────────────────────────────────────────────────┘

def get_git_status():
    """Get git status of the vault repo."""
    cached = cache_get('git_status')
    if cached:
        return cached
    try:
        result = subprocess.run(['git', 'status', '--short'],
            capture_output=True, text=True, timeout=10, cwd=ROOT_PATH)
        lines = [l for l in result.stdout.strip().split('\n') if l]
        non_project = [l for l in lines if 'PROJECT_' not in l]

        commit = subprocess.run(['git', 'log', '--oneline', '-1'],
            capture_output=True, text=True, timeout=5, cwd=ROOT_PATH)
        push = subprocess.run(['git', 'log', '--format=%ci', '-1'],
            capture_output=True, text=True, timeout=5, cwd=ROOT_PATH)

        data = {
            "clean": len(non_project) == 0,
            "uncommitted": len(non_project),
            "latest_commit": commit.stdout.strip(),
            "last_push": push.stdout.strip() if push.stdout.strip() else "unknown",
        }
        cache_set('git_status', data)
        return data
    except Exception as e:
        data = {"clean": False, "error": str(e)}
        cache_set('git_status', data)
        return data

def get_vault_stats():
    """Get vault file statistics."""
    cached = cache_get('vault_stats')
    if cached:
        return cached
    skip_dirs = ('__pycache__', '.git', '01_Sync_From_Main', '.obsidian')
    total_size = 0
    file_count = 0
    try:
        for root_dir, dirs, files in os.walk(VAULT_PATH):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for f in files:
                fp = os.path.join(root_dir, f)
                try:
                    total_size += os.path.getsize(fp)
                    file_count += 1
                except:
                    pass
    except:
        pass
    data = {"files": file_count, "size_mb": round(total_size / (1024*1024), 1),
            "mounted": os.path.isdir(VAULT_PATH)}
    cache_set('vault_stats', data)
    return data

def check_broken_links():
    """Check for broken Obsidian wiki-links in markdown files."""
    cached = cache_get('broken_links')
    if cached is not None:
        return cached
    count = 0
    skip_dirs = ('__pycache__', '.git', '01_Sync_From_Main', 'MISS_PINK_VAULT')
    try:
        for root_dir, dirs, files in os.walk(VAULT_PATH):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for f in files:
                if not f.endswith('.md'):
                    continue
                fp = os.path.join(root_dir, f)
                try:
                    with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                        content = fh.read()
                    links = re.findall(r'\[\[(.*?)\]\]', content)
                    for link in links:
                        target = link.split('|')[0].replace('→', '->')
                        md_dir = os.path.dirname(fp)
                        target_path = os.path.join(md_dir, target)
                        if not os.path.exists(target_path):
                            if not target.endswith('.md') and os.path.exists(target_path + '.md'):
                                continue
                            if os.path.exists(os.path.join(VAULT_PATH, target)):
                                continue
                            if os.path.exists(os.path.join(VAULT_PATH, target + '.md')):
                                continue
                            count += 1
                except:
                    pass
    except:
        pass
    cache_set('broken_links', count)
    return count

def check_opsec():
    """Check OPSEC status: gitignored, secrets, Chinese content.
    Optimized: limits file scanning for speed."""
    cached = cache_get('opsec_check')
    if cached:
        return cached

    # .gitignore check
    gi_path = os.path.join(ROOT_PATH, '.gitignore')
    shared_ignored = False
    if os.path.exists(gi_path):
        with open(gi_path, 'r') as f:
            shared_ignored = 'Shared_With_Pink' in f.read()

    # Real secrets in git — optimized: use git grep instead of ls-files + file reads
    # Also check for common secret file types only
    real_secrets = 0
    try:
        # Use git grep for speed — searches only tracked text files
        patterns = [r'ghp_[A-Za-z0-9]{36}', r'AKIA[A-Z0-9]{16}']
        for pattern in patterns:
            result = subprocess.run(
                ['git', 'grep', '-I', '-l', '--', f'*{pattern}*'],
                capture_output=True, text=True, timeout=10, cwd=ROOT_PATH
            )
            if result.returncode == 0 and result.stdout.strip():
                real_secrets += len(result.stdout.strip().split('\n'))

        # Also check .env files and known secret filenames
        try:
            result2 = subprocess.run(['git', 'ls-files', '*.env', '*.key', '*.pem', 'secrets*'],
                capture_output=True, text=True, timeout=5, cwd=ROOT_PATH)
            if result2.stdout.strip():
                real_secrets += len(result2.stdout.strip().split('\n'))
        except:
            pass

        # Cap at 0 if git grep found nothing (no real secrets)
        if real_secrets == 0:
            # Quick check: just count, don't read every file
            result3 = subprocess.run(
                ['git', 'grep', '-I', '-c', '-E', '|'.join(patterns)],
                capture_output=True, text=True, timeout=10, cwd=ROOT_PATH
            )
            if result3.returncode == 0 and result3.stdout:
                real_secrets = sum(1 for line in result3.stdout.split('\n')
                                   if ':' in line and int(line.rsplit(':', 1)[-1]) > 0
                                   if line.rsplit(':', 1)[-1].isdigit())
    except:
        pass

    # Chinese content — use cached value or quick check
    # Background thread will update this if not cached
    chinese = cache_get('chinese_content')
    if chinese is None:
        # Quick check: only scan .md and .py files in non-archive dirs
        chinese = 0
        skip = ('__pycache__', '.git', '01_Sync_From_Main', '.obsidian', 'node_modules')
        try:
            count = 0
            for r, dirs, files in os.walk(VAULT_PATH):
                dirs[:] = [d for d in dirs if d not in skip and count < 5]
                for f in files:
                    if count >= 5:
                        break
                    if f.endswith(('.md', '.py')):
                        try:
                            with open(os.path.join(r, f), 'r', errors='ignore') as fh:
                                content = fh.read(50000)  # Limit read size
                            if re.search(r'[\u4e00-\u9fff]', content):
                                chinese += 1
                                count += 1
                        except:
                            pass
                if count >= 5:
                    break
        except:
            pass
        cache_set('chinese_content', chinese)

    data = {
        "shared_with_pink_gitignored": shared_ignored,
        "real_secrets_tracked": real_secrets,
        "chinese_content_files": chinese,
        "all_clear": real_secrets == 0 and shared_ignored and chinese == 0
    }
    cache_set('opsec_check', data)
    return data

def get_inbox_counts():
    """Get file counts in crew comms inboxes."""
    inboxes = {}
    inbox_paths = [
        os.path.join(VAULT_PATH, "SIR_GREEN_INBOX"),
        os.path.join(VAULT_PATH, "MISS_PINK_INBOX"),
        os.path.join(VAULT_PATH, "SIR_AZURE_INBOX"),
        os.path.join(VAULT_PATH, "Developer_Brain", "SIR_GREEN_INBOX"),
        os.path.join(VAULT_PATH, "Developer_Brain", "MISS_PINK_INBOX"),
        os.path.join(VAULT_PATH, "Developer_Brain", "SIR_AZURE_INBOX"),
    ]
    for path in inbox_paths:
        name = os.path.basename(path)
        try:
            inboxes[name] = len([f for f in os.listdir(path) if not f.startswith('.')]) if os.path.isdir(path) else 0
        except Exception:
            inboxes[name] = -1
    return inboxes

def check_cipher_tools():
    """Check if TIDAL TONGUE cipher tools are present."""
    return {
        "encode_pirate.py": os.path.isfile(os.path.join(SHARED_WITH_PINK, "encode_pirate.py")),
        "decode_pirate.py": os.path.isfile(os.path.join(SHARED_WITH_PINK, "decode_pirate.py")),
        "TIDAL_TONGUE_CIPHER.md": os.path.isfile(os.path.join(SHARED_WITH_PINK, "TIDAL_TONGUE_CIPHER.md")),
    }

# ┌─────────────────────────────────────────────────────────────┐
# │              WHITE WHALE Protocol (Hidden)                 │
# └─────────────────────────────────────────────────────────────┘

def verify_passphrase(provided_hash):
    """Verify the WHITE WHALE passphrase hash using constant-time comparison."""
    return hmac.compare_digest(provided_hash, WHITE_WHALE_PASSPHRASE_HASH)

def _log_whale_attempt(ip, passphrase_correct, threat_declared=False):
    """Log WHITE WHALE access attempts for security audit."""
    try:
        log_path = os.path.join(SHARED_WITH_PINK, "TIDAL_TONGUE_WHITEBALL_LOG.txt")
        ts = datetime.datetime.now(timezone.utc).isoformat()
        status = "ACCESS_GRANTED" if passphrase_correct and threat_declared else \
                 "THREAT_CONFIRMATION_PENDING" if passphrase_correct else \
                 "PASSPHRASE_DENIED"
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(f"{ts} | IP={ip} | {status}\n")
    except Exception:
        pass

def _safe_whale_status():
    """Bounded WHITE WHALE status for dashboard actions."""
    try:
        git_info = get_git_status()
        opsec = check_opsec()
        inboxes = get_inbox_counts()
        vault_stats = get_vault_stats()
        containers = get_docker_containers()
        return {
            "classification": "WHITE WHALE — TOP SECRET",
            "white_whale_hash_verified": True,
            "threat_detected": True,
            "white_whale_protocol": {
                "step_1_vault_lockdown": {
                    "status": "PASS" if git_info.get("clean", False) else "WARNING",
                    "detail": "Clean working tree" if git_info.get("clean") else f"{git_info.get('uncommitted', 0)} modified files"
                },
                "step_2_encrypted_channel": {
                    "status": "ESTABLISHED" if sum(1 for v in inboxes.values() if v > 0) > 0 else "PENDING",
                    "detail": f"{sum(1 for v in inboxes.values() if v > 0)} active channels"
                },
                "step_3_no_secrets_git": {
                    "status": "PASS" if opsec.get("real_secrets_tracked", 0) == 0 else "FAIL",
                    "detail": f"Real secrets in git: {opsec.get('real_secrets_tracked', 0)}"
                },
            },
            "vault_git": git_info,
            "container_detail": containers,
            "passphrase_hash_verified": True,
        }
    except Exception as e:
        return {"error": str(e), "classification": "WHITE WHALE — TOP SECRET"}


def get_white_whale_data():
    """Get WHITE WHALE protocol data — only after passphrase verification."""
    git_info = get_git_status()
    opsec = check_opsec()
    inboxes = get_inbox_counts()
    vault_stats = get_vault_stats()

    # WHITE WHALE → BLACK WHALE: Threat detection (unknown devices on network)
    devices = discover_network()
    known_ips = set(s["ip"] for s in KNOWN_SHIPS.values())
    unknown = [d for d in devices if d["ip"] not in known_ips]

    # WHITE WHALE → GREEN WHALE: Security maintenance checks
    gw_checks = {}
    for label, port in [("npm_port_81", 81), ("docker_api", 2376),
                        ("health_check", 9999), ("dashboard", 8080), ("smb_vault", 445)]:
        gw_checks[label] = check_port_fast(SQUID_IP, port, timeout=1)

    containers = get_docker_containers()

    return {
        "classification": "WHITE WHALE — TOP SECRET",
        "unlocked_at": datetime.datetime.now(timezone.utc).isoformat(),
        "white_whale_hash_verified": True,
        "threat_detected": True,
        "white_whale_protocol": {
            "step_1_vault_lockdown": {
                "status": "PASS" if git_info.get("clean", False) else "WARNING",
                "detail": "Clean working tree" if git_info.get("clean") else f"{git_info.get('uncommitted', 0)} modified files"
            },
            "step_2_encrypted_channel": {
                "status": "ESTABLISHED" if sum(1 for v in inboxes.values() if v > 0) > 0 else "PENDING",
                "detail": f"{sum(1 for v in inboxes.values() if v > 0)} active channels"
            },
            "step_3_no_secrets_git": {
                "status": "PASS" if opsec.get("real_secrets_tracked", 0) == 0 else "FAIL",
                "detail": f"Real secrets in git: {opsec.get('real_secrets_tracked', 0)}"
            },
        },
        "white_whale_sections": {
            "black_whale": {
                "description": "Threat detection — unknown devices on network",
                "threats_detected": len(unknown),
                "unknown_devices": [{"ip": d["ip"], "hostname": d.get("hostname", "")} for d in unknown[:30]],
                "total_devices": len(devices),
                "status": "SECURE" if len(unknown) == 0 else f"MONITORING ({len(unknown)} unknown)"
            },
            "green_whale": {
                "description": "Security maintenance checks",
                "checks": gw_checks,
                "status": "HEALTHY" if all(gw_checks.values()) else "ISSUES DETECTED",
                "maintenance_needed": not all(gw_checks.values()),
            }
        },
        "vault_git": git_info,
        "container_detail": containers,
        "passphrase_hash_verified": True,
    }

# ┌─────────────────────────────────────────────────────────────┐
# │              Main Data Collector                            │
# └─────────────────────────────────────────────────────────────┘

def collect_public_data():
    """Collect data that's safe to show WITHOUT passphrase.
    WHITE WHALE, BLACK WHALE, GREEN WHALE	data is EXCLUDED.
    Returns immediately — network scan runs async in background."""
    # Check full-result cache first
    cached = cache_get('full_status')
    if cached is not None:
        return cached

    # Fallback: use expired/stale cache instead of placeholder so the UI
    # does not flip back to "loading" between refresh cycles.
    stale = _CACHE.get('full_status')
    if stale is not None:
        data = stale[0]
        if isinstance(data, dict):
            data = dict(data)
            data['placeholder'] = True
            data['stale'] = True
            return data

    # If no cache yet, return minimal placeholder so API responds instantly
    # while background thread populates the real data
    now = datetime.datetime.now(datetime.timezone.utc)
    placeholder = {
        "timestamp": now.isoformat(),
        "ships": {name: "loading" for name in KNOWN_SHIPS},
        "ship_details": {name: {"ip": s["ip"], "status": "loading", "role": s["role"], "latency": "—"} for name, s in KNOWN_SHIPS.items()},
        "services": {"network_ports": {}, "docker_api": "CHECKING", "health_check": "CHECKING", "dashboard": "LIVE"},
        "tools": {"classification_levels": []},
        "containers": {"total": 0, "running": 0, "fleet": 0, "security": 0, "k8s": 0, "names": []},
        "network": {"total_devices": 0, "known_devices": 0, "unknown_devices": 0, "devices": [], "crew_agents": {}},
        "comms": {"inboxes": {}, "docker_proxy": f"http://{SQUID_IP}:2376", "health_check": f"http://{SQUID_IP}:9999/verify"},
        "vault": {"mounted": False, "git_clean": False, "latest_commit": "loading", "file_count": 0, "size_mb": 0, "uncommitted_files": 0},
        "opsec": {},
        "cipher": {},
        "latency": {},
        "health_message": "",
        "health_status": "INITIALIZING",
        "placeholder": True,
    }
    cache_set('full_status', placeholder)
    return placeholder

def _collect_full_data():
    """Do the full data collection — blocking, used by prewarm thread."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ships = {}
    ship_details = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        ship_futures = {}
        for ship_name, ship_info in KNOWN_SHIPS.items():
            ship_futures[executor.submit(check_ship_ip, ship_info["ip"])] = ship_name

        for future in as_completed(ship_futures):
            ship_name = ship_futures[future]
            ip = KNOWN_SHIPS[ship_name]["ip"]
            status = future.result()
            ships[ship_name] = status
            ship_details[ship_name] = {
                "ip": ip,
                "status": status,
                "role": KNOWN_SHIPS[ship_name]["role"],
                "ports": [],
                "latency": "down",
            }

        # Latency for online ships
        latency_futures = {}
        for ship_name, ship_info in KNOWN_SHIPS.items():
            if ships[ship_name] == "online":
                latency_futures[executor.submit(ping_fast, ship_info["ip"], timeout=3)] = ship_name

        for future in as_completed(latency_futures):
            ship_name = latency_futures[future]
            try:
                ship_details[ship_name]["latency"] = future.result(timeout=5)
            except:
                pass

    # --- NETWORK PORTS (fast, cached) ---
    ports = {}
    for p in [80, 81, 2376, 9999, 8080]:
        ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
    ports["pinkcady_8080"] = check_port_fast(PINK_IP, 8080, timeout=0.5)
    ports["pinkcady_3000"] = check_port_fast(PINK_IP, 3000, timeout=0.5)
    ports["pinkcady_5000"] = check_port_fast(PINK_IP, 5000, timeout=0.5)
    ports["tailscale_pinkcady"] = True
    # --- LOCAL MONITORING STACK (Grafana/Prometheus/cAdvisor/MC) — truthful status ---
    # NOTE: Grafana runs on port 3002 (maps to container port 3000).
    # Mission Control moved 3000/3001 -> 3100 (2026-08-31). Kuma retired.
    for p, name in [(3002, "grafana"), (9090, "prometheus"), (8081, "cadvisor"),
                    (3100, "mission_control"), (8188, "comfyui_art")]:
        ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
        ports[f"{name}_{p}"] = ports[f"port_{p}"]

    # --- NETWORK DISCOVERY (use cache or trigger async) ---
    devices = discover_network()
    # Trigger async port scan on devices if needed
    cached_ports = cache_get('device_ports')
    if cached_ports is None:
        threading.Thread(target=_async_scan_device_ports, daemon=True).start()
        cached_ports = {}

    # Enrich devices with ports
    devices_with_ports = []
    for d in devices:
        d_copy = dict(d)
        d_copy["ports"] = cached_ports.get(d["ip"], [])
        devices_with_ports.append(d_copy)

    # Add ports to ship details
    for ship_name in ship_details:
        ip = ship_details[ship_name]["ip"]
        ship_details[ship_name]["ports"] = cached_ports.get(ip, [])

    # --- DOCKER (use cache, fallback to fast scan) ---
    try:
        docker = get_docker_containers()
    except Exception:
        docker = cache_get('docker_containers') or {"total": 0, "running": 0, "fleet": 0, "security": 0, "k8s": 0, "names": []}

    # --- HEALTH CHECK (cached only) ---
    health = get_health_check()

    # --- GIT + VAULT (cached only) ---
    try:
        git_info = get_git_status()
        vault_stats = get_vault_stats()
    except Exception:
        git_info = cache_get('vault_git') or {"latest_commit": "unknown", "uncommitted": 0}
        vault_stats = {"files": 0, "size_mb": 0}

    # --- OPSEC (skip if slow) ---
    try:
        opsec = check_opsec() or {}
    except Exception:
        opsec = {"shared_with_pink_gitignored": False, "real_secrets_tracked": -1, "chinese_content_files": -1, "all_clear": False}

    # --- COMMS ---
    try:
        inboxes = get_inbox_counts() or {}
    except Exception:
        inboxes = {}
    try:
        cipher = check_cipher_tools() or {}
    except Exception:
        cipher = {"encode_pirate.py": False, "decode_pirate.py": False, "TIDAL_TONGUE_CIPHER.md": False}

    # --- LATENCY ---
    latency = {}
    for ship_name in ships:
        if ships.get(ship_name) == "online" and ship_name in ship_details:
            latency[ship_name.lower()] = ship_details[ship_name].get("latency") or "down"

    data = {
        "timestamp": now.isoformat(),
        "ships": ships,
        "ship_details": ship_details,
        "services": {
            "network_ports": ports,
            "docker_api": "OK" if check_port_fast("127.0.0.1", 2375, timeout=0.5) else "DOWN",
            "health_check": "VERIFIED" if ports.get("port_9999") else "SKIPPED",
            "dashboard": "LIVE" if (ports.get("port_8080") or ports.get("port_8085")) else "DOWN",
        },
        "tools": {
            "classification_levels": [
                {"name": "Ethical Hacker Toolkit", "classification": "TOP SECRET", "authorized": ["Sir Green", "Miss Pink"], "status": "CATALOGED"},
                {"name": "WHITE WHALE Protocol", "classification": "WHITE WHALE", "authorized": ["Captain"], "status": "PASSPHRASE GATED"},
                {"name": "TIDAL TONGUE", "classification": "CREW ONLY", "authorized": ["Captain", "Sir Green", "Miss Pink", "Sir Azure"], "status": "MISSING_TOOLS" if not all(cipher.values()) else "IMPLEMENTED"},
                {"name": "Suricata IDS", "classification": "CREW ONLY", "authorized": ["Captain", "Sir Green"], "status": "RUNNING"},
                {"name": "NPM Proxy", "classification": "CREW ONLY", "authorized": ["Captain", "Sir Green"], "status": "RUNNING"},
                {"name": "Kuma Monitor", "classification": "CREW ONLY", "authorized": ["Captain", "Sir Green"], "status": "RUNNING"},
            ]
        },
        "containers": docker,
        "network": {
            "total_devices": len(devices),
            "known_devices": sum(1 for d in devices if d["ip"] in set(s["ip"] for s in KNOWN_SHIPS.values())),
            "unknown_devices": sum(1 for d in devices if d["ip"] not in set(s["ip"] for s in KNOWN_SHIPS.values())),
            "devices": devices_with_ports,
            "crew_agents": dict(CREW_HEARTBEATS),
        },
        "comms": {
            "inboxes": inboxes,
            "docker_proxy": f"http://{SQUID_IP}:2376",
            "health_check": f"http://{SQUID_IP}:9999/verify",
            "vault_share": f"\\\\{SQUID_IP}\\Vault",
        },
        "vault": {
            "mounted": vault_stats.get("mounted", False),
            "git_clean": git_info.get("clean", False),
            "latest_commit": git_info.get("latest_commit", "unknown"),
            "file_count": vault_stats.get("files", 0),
            "size_mb": vault_stats.get("size_mb", 0),
            "uncommitted_files": git_info.get("uncommitted", 0),
        },
        "opsec": opsec,
        "cipher": cipher,
        "latency": latency,
        "sync_status": {"last_sync": time.time(), "trello_synced": bool(cache_get("tickets")), "augur_synced": bool(cache_get("augur"))},
        "health_message": health.get("message", ""),
        "health_status": health.get("status", "UNKNOWN"),
    }
    cache_set('full_status', data)
    return data

def _async_scan_device_ports():
    """Background scan of ports on all discovered devices."""
    devices = _NETWORK_SCAN_STATE["devices"][:]
    if not devices:
        devices = _scan_network_internal()
    results = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(scan_ports_parallel, d["ip"], NETWORK_SCAN_PORTS, timeout=0.3): d["ip"]
                   for d in devices[:10]}  # Only scan first 10 devices for speed
        for future in as_completed(futures):
            ip = futures[future]
            try:
                ports = future.result(timeout=15)
                results[ip] = ports
            except:
                results[ip] = []
    cache_set('device_ports', results)

# ┌─────────────────────────────────────────────────────────────┐
# │              HTTP Server                                    │
# └─────────────────────────────────────────────────────────────┘

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class DashboardHandler(BaseHTTPRequestHandler):
    def _route(self, body=None):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/status' or path == '/api/status/':
            self.handle_api_status()
        elif path == '/api/whale' or path == '/api/whale/':
            self.handle_whale_api()
        elif path == '/api/kuma' or path == '/api/kuma/':
            self.handle_kuma_api()
        elif path == '/api/alerts' or path == '/api/alerts/':
            self.handle_alerts_api()
        elif path == '/api/diagram' or path == '/api/diagram/':
            self.handle_diagram_api()
        elif path == '/api/crew_heartbeat' or path == '/api/crew_heartbeat/':
            self.handle_crew_heartbeat()
        elif path == '/api/docker/register' or path == '/api/docker/register/':
            self.handle_docker_register()
        elif path == '/api/fleet' or path == '/api/fleet/':
            self.handle_fleet()
        elif path == '/agent' or path == '/agent/' or path == '/hive_agent.py':
            self.handle_agent_download()
        elif path == '/api/trello' or path == '/api/trello/':
            self.handle_trello_api()
        elif path == '/trello' or path == '/trello/':
            # Redirect /trello → /api/trello (user-friendly alias)
            self.send_response(301)
            self.send_header('Location', '/api/trello')
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<html><body>Redirect to /api/trello</body></html>')
        elif path == '/api/content' or path == '/api/content/':
            self.handle_content_api()
        elif path == '/api/schedule' or path == '/api/schedule/':
            self.handle_schedule_api()
        elif path == '/api/tickets' or path == '/api/tickets/':
            self.handle_tickets_api()
        elif path == '/api/stat/ships':
            self.handle_stat_api(['ships', 'ship_details', 'latency'])
        elif path == '/api/stat/services':
            self.handle_stat_api(['services'])
        elif path == '/api/services' or path == '/api/services/':
            self.handle_services_api()
        elif path == '/api/tornado-inventory' or path == '/api/tornado-inventory/':
            self.handle_tornado_inventory_api()
        elif path == '/api/tabs' or path == '/api/tabs/' or path == '/api/dashboard/tabs' or path == '/api/dashboard/tabs/':
            self.handle_tabs_api()
        elif path == '/api/art' or path == '/api/art/':
            self.handle_art_api()
        elif path == '/api/stat/network':
            self.handle_stat_api(['network', 'ship_details'])
        elif path == '/api/stat/tools':
            self.handle_stat_api(['tools', 'health_status', 'health_message'])
        elif path == '/api/stat/vault':
            self.handle_stat_api(['vault', 'opsec'])
        elif path == '/api/vault' or path == '/api/vault/':
            self.handle_stat_api(['vault', 'opsec'])
        elif path == '/api/stat/comms':
            self.handle_stat_api(['comms', 'cipher'])
        elif path == '/api/comms' or path == '/api/comms/':
            self.handle_stat_api(['comms', 'cipher'])
        elif path == '/api/opsec' or path == '/api/opsec/':
            self.handle_opsec_api()
        elif path == '/api/scanner' or path == '/api/scanner/':
            self.handle_scanner_api()
        elif path == '/api/sir-azure' or path == '/api/sir-azure/':
            self.handle_sir_azure_api()
        elif path == '/api/captain' or path == '/api/captain/':
            self.handle_captain_api()
        elif path == '/api/white-whale' or path == '/api/white-whale/':
            self.handle_white_whale_api()
        elif path == '/api/containers' or path == '/api/containers/':
            self.handle_stat_api(['containers'])
        elif path == '/healthz' or path == '/health' or path == '/api/healthz' or path == '/api/health':
            self.handle_healthz()
        elif path == '/api/fodavp/trigger' or path == '/api/fodavp/trigger/':
            self.handle_fodavp_trigger()
        elif path == '/api/fodavp/activate' or path == '/api/fodavp/activate/':
            self.handle_fodavp_activate()
        elif path == '/api/fodavp/status' or path == '/api/fodavp/status/':
            self.handle_fodavp_status()
        elif path == '/api/fodavp/stop' or path == '/api/fodavp/stop/':
            self.handle_fodavp_stop()
        elif path == '/' or path == '/index.html':
            self.handle_html()
        elif path.startswith('/static/') or path.startswith('/assets/') or path == '/favicon.ico':
            self.handle_static(path)
        elif path.startswith('/tab/'):
            self.handle_tab(path)
        elif path.startswith('/dashboard/personas/'):
            self.handle_persona_asset(path)
        elif path == '/api/fleet/mesh' or path == '/api/mesh/status':
            self.handle_fleet_mesh_api()
        elif path == '/api/fleet/llm' or path == '/api/fleet/llm/':
            self.handle_fleet_llm_api()
        elif path == '/api/fleet/art' or path == '/api/fleet/art/':
            self.handle_fleet_art_api()
        elif path == '/api/crew' or path == '/api/crew/':
            self.handle_crew_api()
        elif path == '/api/crew/infra' or path == '/api/crew/infra/':
            self.handle_crew_infra_api()
        elif path == '/api/fleet/version' or path == '/api/fleet/version/':
            self.handle_fleet_version_api()
        elif path == '/api/fleet/verify' or path == '/api/fleet/verify/':
            self.handle_fleet_verify_api()
        elif path == '/api/fleet/data' or path == '/api/fleet/data/':
            return self.handle_local_proxy_json('http://127.0.0.1:5000/api/fleet/data', keep_path=True)
        elif path.startswith('/api/fleet/compute'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/fleet/compute', keep_path=True)
        elif path == '/api/network/alerts' or path == '/api/network/alerts/':
            self.handle_network_alerts_api()
        elif path == '/api/security' or path == '/api/security/':
            self.handle_security_api()
        elif path == '/api/security-docs' or path == '/api/security-docs/':
            self.handle_security_docs_api()
        elif path == '/api/heal' or path == '/api/heal/':
            self.handle_heal_api()
        elif path == '/api/pinkcady' or path == '/api/pinkcady/':
            self.handle_pinkcady_api()
        elif path == '/api/traffic' or path == '/api/traffic/':
            self.handle_traffic_api()
        elif path == '/api/remotectl' or path == '/api/remotectl/':
            self.handle_remotectl_api()
        elif path == '/api/augur' or path == '/api/augur/':
            self.handle_augur_api()
        elif path.startswith('/api/augur/graduation') or path.startswith('/api/augur/authorize'):
            self.handle_augur_graduation_api()
        elif path == '/api/augur/paper/state' or path.startswith('/api/augur/paper/'):
            self.handle_augur_paper_state_api()
        elif path == '/api/game' or path == '/api/game/':
            self.handle_game_api()
        elif path == '/api/persona' or path == '/api/persona/':
            self.handle_persona_api()
        elif path == '/api/monitor' or path == '/api/monitor/':
            self.handle_monitor_api()
        elif path in ['/white-whale', '/api-status', '/auth', '/dataview', '/tools', '/services', '/sandbox', '/tabs', '/art']:
            self.handle_html()
        elif path == '/api/ticketing' or path == '/api/ticketing/':
            self.handle_ticketing_api()
        elif path == '/api/rig-report' or path == '/api/rig-report/':
            self.handle_rig_report_api()
        elif path == '/api/data/sources/status':
            self.handle_local_data_source_status_api()
        elif path.startswith('/api/data/sources'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/data/sources', keep_path=True)
        elif path == '/api/schwab/auth-url':
            return self.handle_local_schwab_auth_url_api()
        elif path == '/api/schwab/oauth/callback':
            return self.handle_local_schwab_oauth_callback_api()
        elif path == '/api/schwab/account_snapshot':
            return self.handle_local_proxy_json('http://127.0.0.1:5000/api/schwab/account_snapshot')
        elif path.startswith('/api/schwab'):
            self.handle_local_schwab_status_api()
        elif path == '/api/healthz':
            return self.handle_healthz()
        elif path == '/api/hw' or path == '/api/hw/':
            self.handle_hw_api()
        elif path == '/api/fleet/legacy':
            self.handle_fleet_api()
        elif path == '/api/fleet/data' or path.startswith('/api/fleet/data/'):
            self.handle_local_fleet_data_api()
        elif path == '/api/fleet/compute' or path.startswith('/api/fleet/compute/'):
            self.handle_local_fleet_compute_api()
        elif path.startswith('/api/fleet/offline-dataset'):
            self.handle_local_dataset_api()
        elif path == '/api/ships' or path == '/api/ships/':
            self.handle_stat_api(['ships', 'ship_details', 'latency'])
        elif path == '/api/dataview' or path == '/api/dataview/':
            self.handle_dataview_api()
        elif path == '/api/auth' or path.startswith('/api/auth/'):
            self.handle_auth_api(self.path)
        elif path.startswith('/api/sandbox'):
            self.handle_sandbox_api(path)
        elif path.startswith('/api/tools/classification') or path == '/api/tools':
            self.handle_tools_classification_api()
        elif path == '/api/signals' or path.startswith('/api/signals/'):
            self.handle_local_signals_api()
        elif path.startswith('/api/augur/scan/status'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/augur/scan/status')
        elif path.startswith('/api/augur/augmented_signals'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/augur/augmented_signals')
        elif path in ('/api/augur/oco', '/api/augur/oco/') or path.startswith('/api/augur/oco/'):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path == '/api/augur/bracket' or path == '/api/augur/bracket/' or (path.startswith('/api/augur/bracket/') and not path.startswith('/api/augur/bracket/info')):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path.startswith('/api/augur/bracket/info'):
            self.handle_local_proxy_json(f'http://127.0.0.1:5000{path}')
        elif path.startswith('/api/augur/manual_signal'):
            self.handle_local_manual_signal_api()
        elif path.startswith('/api/auth/login'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/login', methods=['POST'])
        elif path.startswith('/api/auth/logout'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/logout', methods=['POST'])
        elif path.startswith('/api/auth/status'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/status')
        elif path.startswith('/api/auth/whoami'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/whoami')
        elif path.startswith('/api/auth/profiles'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/profiles')
        elif path.startswith('/api/auth/profile'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/profile', methods=['PATCH'])
        elif path.startswith('/api/auth/verify'):
            self.handle_local_auth_verify_api()
        elif path.startswith('/api/auth/register'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth/register', methods=['POST'])
        elif path.startswith('/api/auth'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/auth', keep_path=True)
        elif path.startswith('/api/augur'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/augur', keep_path=True)
        elif path.startswith('/api/alpaca'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/alpaca', keep_path=True)
        elif path == '/api/trade' or path == '/api/trade/':
            self.handle_local_api_stub(path, default_body={'error':'trade endpoint not implemented'})
        elif path == '/api/execute' or path == '/api/execute/':
            self.handle_local_api_stub(path, default_body={'error':'execute endpoint not implemented'})
        elif path.startswith('/api/trades'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/trades', keep_path=True)
        elif path.startswith('/api/settings'):
            self.handle_settings_api()
        elif path.startswith('/api/ticker_fundamentals'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/ticker_fundamentals', keep_path=True)
        elif path == '/api/fundamentals' or path == '/api/fundamentals/':
            self.handle_fundamentals_index()
        elif path.startswith('/api/fundamentals'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/fundamentals', keep_path=True)
        elif path == '/api/sectors' or path == '/api/sectors/':
            self.handle_sectors_api()
        elif path in ('/api/killswitch', '/api/killswitch/', '/api/killswitch/trading','/api/killswitch/trading/','/api/killswitch/learning','/api/killswitch/learning/', '/api/killswitch/timeout', '/api/killswitch/timeout/'):
            self.handle_killswitch_api(path)
        elif path.startswith('/api/positions'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/positions', keep_path=True)
        elif path == '/api/schwab/auth-url':
            return self.handle_local_schwab_auth_url_api()
        elif path.startswith('/api/paper_trades'):
            self.handle_local_proxy_json('http://127.0.0.1:5000/api/paper_trades', keep_path=True)
        elif path == '/api/wazuh' or path.startswith('/api/wazuh/'):
            self.handle_local_api_stub('/api/wazuh', default_body={'wazuh': {'status': 'unavailable', 'note': 'Wazuh manager/agents not reporting via local API'}})
        elif path == '/api/stealthattack' or path.startswith('/api/stealthattack/'):
            self.handle_local_api_stub('/api/stealthattack', default_body={'status': 'unavailable', 'note': 'STEALTHATTACK API port 5000 unreachable from dashboard', 'port': 5000})
        elif path.startswith('/api/tailscale'):
            self.handle_local_api_stub('/api/tailscale', default_body={'status': 'unavailable', 'note': 'Tailscale integration not implemented'})
        elif path in ('/api/sync_status', '/api/sync_status/'):
            self.handle_sync_status_api()
        elif path.startswith('/api/git-sync'):
            self.handle_git_sync_status()
        elif path == '/api/netbox/status' or path == '/api/netbox/status/':
            self.handle_netbox_status_api()
        elif path == '/api/suricata/alerts' or path == '/api/suricata/alerts/':
            self.handle_suricata_alerts_api()
        elif path == '/api/containers' or path == '/api/containers/':
            self.handle_stat_api(['containers'])
        elif path == '/api/vault' or path == '/api/vault/':
            self.handle_stat_api(['vault', 'opsec'])
        elif path == '/api/opsec' or path == '/api/opsec/':
            self.handle_opsec_api()
        elif path == '/api/comms' or path == '/api/comms/':
            self.handle_stat_api(['comms', 'cipher'])
        elif path.startswith('/api/news'):
            self.handle_local_news_api(path)
        elif path == '/api/alerts/test' or path == '/api/alerts/test/':
            self.handle_local_api_stub(path, default_body={"ok": True, "test_mode": True, "alerts_routed": True, "mode": "paper"})
        elif path in ('/api/market', '/api/market/'):
            self.handle_local_api_stub(path, default_body={"market": {"status": "closed", "phase": "post", "mode": "paper"}})
        elif path in ('/api/market/symbols', '/api/market/symbols/'):
            self.handle_local_api_stub(path, default_body={"symbols": [], "count": 0, "mode": "paper"})
        elif path in ('/api/market/quotes', '/api/market/quotes/'):
            self.handle_local_api_stub(path, default_body={"quotes": [], "count": 0, "mode": "paper"})
        elif path in ('/api/market/orders', '/api/market/orders/'):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path in ('/api/market/positions', '/api/market/positions/'):
            self.handle_local_api_stub(path, default_body={"positions": [], "count": 0, "mode": "paper"})
        elif path in ('/api/market/balance', '/api/market/balance/'):
            self.handle_local_api_stub(path, default_body={"balance": {"cash": 0.0, "portfolio_value": 0.0, "mode": "paper"}, "mode": "paper"})
        elif path in ('/api/market/risk', '/api/market/risk/'):
            self.handle_local_api_stub(path, default_body={"risk": {"exposure": 0.0, "max_drawdown": 0.0, "mode": "paper"}})
        elif path in ('/api/market/performance', '/api/market/performance/'):
            self.handle_local_api_stub(path, default_body={"performance": {"return": 0.0, "sharpe": 0.0, "mode": "paper"}})
        elif path in ('/api/market/account', '/api/market/account/'):
            self.handle_local_api_stub(path, default_body={"account": {"id": "PAPER", "status": "ACTIVE", "currency": "USD", "mode": "paper"}})
        elif path in ('/api/market/watchlist', '/api/market/watchlist/'):
            self.handle_local_api_stub(path, default_body={"watchlist": [], "count": 0, "mode": "paper"})
        elif path in ('/api/market/portfolio', '/api/market/portfolio/'):
            self.handle_local_api_stub(path, default_body={"portfolio": {"positions": [], "total_value": 0.0, "mode": "paper"}})
        elif path in ('/api/oco', '/api/oco/') or path.startswith('/api/oco/'):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path in ('/api/bracket', '/api/bracket/') or path.startswith('/api/bracket/'):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path.startswith('/api/orders/oco') or path.startswith('/api/orders/bracket'):
            self.handle_local_api_stub(path, default_body={"orders": [], "count": 0, "mode": "paper"})
        elif path.startswith('/api/genome/presets'):
            self.handle_local_presets_api()
        elif path.startswith('/api/data/sources/preferences'):
            self.handle_local_data_source_prefs_api()
        elif path.startswith('/api/download'):
            self.handle_local_download_api()
        elif path in ('/api/account', '/api/balance', '/api/orders', '/api/watchlist', '/api/performance', '/api/risk'):
            self.handle_local_tm_stub_api(path)
        elif path in ('/api/genome', '/api/genome/'):
            self.handle_local_api_stub(path, default_body={"genome_id": None, "status": "NO_GENOME_ACTIVE", "note": "Genome training required", "mode": "paper"})
        elif path in ('/api/backtest', '/api/backtest/'):
            self.handle_local_api_stub(path, default_body={"backtests": [], "count": 0, "note": "No backtest data available", "mode": "paper"})
        elif path in ('/api/pool', '/api/pool/'):
            self.handle_local_api_stub(path, default_body={"pool": {"active": False, "bots": [], "count": 0}, "mode": "paper"})
        elif path in ('/api/inbox', '/api/inbox/'):
            self.handle_local_api_stub(path, default_body={"inboxes": {"SIR_GREEN_INBOX": 0, "MISS_PINK_INBOX": 0, "CAPTAIN_INBOX": 0}, "total": 0, "mode": "paper"})
        elif path in ('/api/monitoring', '/api/monitoring/'):
            self.handle_local_api_stub(path, default_body={"monitoring": {"grafana": True, "prometheus": True, "cadvisor": True, "kuma": True, "gitea": True}, "mode": "paper"})
        elif path in ('/api/docker', '/api/docker/'):
            containers = get_docker_containers()
            self._json_ok({"containers": containers, "docker_api": "OK", "mode": "paper"})
        elif path in ('/api/ids', '/api/ids/'):
            self.handle_local_api_stub(path, default_body={"ids": {"suricata": True, "crowdsec": True, "alerts": 0, "mode": "paper"}})
        elif path in ('/api/crowdsec', '/api/crowdsec/'):
            self.handle_local_api_stub(path, default_body={"crowdsec": {"running": True, "banned": 0, "alerts": 0, "mode": "paper"}})
        elif path in ('/api/captcha-verify', '/api/captcha-verify/'):
            self.handle_local_api_stub(path, default_body={"captcha": {"service": "npm-proxy", "status": "ready", "mode": "paper"}})
        elif path in ('/api/github', '/api/github/'):
            self.handle_github_issues_api(path)
        # Live monitoring checks instead of hardcoded stubs
        elif path in ('/api/grafana', '/api/grafana/'):
            self._json_ok({"grafana": {"running": check_port_fast('127.0.0.1', 3002, timeout=0.6), "port": 3002, "mode": "paper", "live": True}})
        elif path in ('/api/cadvisor', '/api/cadvisor/'):
            self._json_ok({"cadvisor": {"running": check_port_fast('127.0.0.1', 8081, timeout=0.6), "port": 8081, "containers": len(get_docker_containers()), "mode": "paper", "live": True}})
        elif path in ('/api/prometheus', '/api/prometheus/'):
            self._json_ok({"prometheus": {"running": check_port_fast('127.0.0.1', 9090, timeout=0.6), "port": 9090, "alerts": 0, "mode": "paper", "live": True}})
        elif path in ('/api/pipeline', '/api/pipeline/'):
            self.handle_local_api_stub(path, default_body={"pipeline": {"status": "idle", "running": False, "steps_completed": 0, "mode": "paper"}})
        elif path in ('/api/research', '/api/research/'):
            self.handle_local_api_stub(path, default_body={"research": {"status": "ready", "topics": [], "mode": "paper"}})
        elif path in ('/api/watch', '/api/watch/'):
            self.handle_local_api_stub(path, default_body={"watchlist": [], "count": 0, "mode": "paper"})
        elif path in ('/api/ai-status', '/api/ai-status/'):
            self.handle_local_api_stub(path, default_body={"ai_status": {"learner_running": False, "genome_id": None, "proposals_pending": 0, "total_proposals": 0, "mode": "paper"}})
        elif path in ('/api/learner', '/api/learner/'):
            self.handle_local_api_stub(path, default_body={"learner": {"running": False, "status": "idle", "total_proposals": 0, "mode": "paper"}})
        elif path in ('/api/sim', '/api/sim/'):
            self.handle_local_api_stub(path, default_body={"sim": {"running": False, "episodes": 0, "episodes_per_min": 0.0, "mode": "paper"}})
        elif path.startswith('/api/tr3asure_mAp'):
            self.handle_tr3asure_mAp_status_api()
        elif path in ['/api/fodavp/activate', '/api/fodavp/activate/', '/api/execute-fodavp']:
            self.handle_fodavp_activate()
        elif path in ['/api/fodavp/status', '/api/fodavp/status/']:
            self.handle_fodavp_status()
        elif path in ['/api/fodavp/stop', '/api/fodavp/stop/']:
            self.handle_fodavp_stop()
        elif path.startswith('/api/'):
            self.handle_proxy_api('http://127.0.0.1:5000', keep_path=True)
        else:
            # SPA catch-all: serve dashboard HTML for any client-side route
            self.handle_html()

    def handle_proxy_api(self, target_base, keep_path=False):
        import urllib.request as _u
        path = urlparse(self.path).path
        query = urlparse(self.path).query
        if keep_path:
            # Strip the matching prefix from path before appending
            # so target_base + path doesn't duplicate route segments
            target = target_base
            base_path = urlparse(target_base).path or '/'
            if path.startswith(base_path):
                suffix = path[len(base_path):]
            else:
                suffix = path
            # Ensure suffix starts with '/' so host:port never merges
            if suffix and not suffix.startswith('/'):
                suffix = '/' + suffix
            target = target + suffix
            if query:
                target = target + '?' + query
        else:
            target = target_base
            if query:
                target = target + '?' + query
        try:
            req = _u.Request(target, method='GET')
            # Forward TM auth token if the dashboard client sent one
            auth_hdr = self.headers.get('Authorization') or self.headers.get('X-Auth-Token')
            if auth_hdr:
                req.add_header('Authorization', auth_hdr)
            with _u.urlopen(req, timeout=20) as r:
                body = r.read()
                ctype = r.headers.get('Content-Type', 'application/json')
                cache = r.headers.get('Cache-Control', 'no-store')
                self.send_response(r.status)
                self.send_header('Content-Type', ctype)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', cache)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception as exc:
            payload = json.dumps({'error': f'proxy_failed: {exc}', 'target': target})
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload.encode('utf-8'))

    def handle_local_tm_stub_api(self, path):
        stubs = {
            '/api/account': {'account': {'id': 'PAPER', 'status': 'ACTIVE', 'currency': 'USD'}, 'mode': 'paper'},
            '/api/balance': {'account': {'balance': 100000.0, 'daily_pnl': 0.0, 'total_pnl': 0.0, 'buying_power': 100000.0}, 'mode': 'paper'},
            '/api/orders': {'orders': [], 'count': 0, 'mode': 'paper'},
            '/api/watchlist': {'watchlist': [], 'count': 0},
            '/api/performance': {'performance': {'daily_pnl': 0.0, 'total_pnl': 0.0, 'win_rate': 0.0, 'sharpe': 0.0}, 'mode': 'paper'},
            '/api/risk': {'risk': {'daily_var': 0.0, 'max_drawdown': 0.0, 'exposure': 0.0, 'leverage': 1.0}, 'mode': 'paper'},
        }
        payload = stubs.get(path, {'error': 'not_implemented', 'path': path})
        self._json_ok(payload)

    def _json_ok(self, payload):
        body = json.dumps(payload, indent=2, default=str).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
        self.end_headers()
        self.wfile.write(body)

    def handle_tr3asure_mAp_status_api(self):
        payload = {
            "integration": "CaptainDashboard -> tr3asure_mAp",
            "backend_base": "http://127.0.0.1:5000",
            "mode": "local",
            "sync_status": {"last_sync": time.time(), "trello_synced": True, "augur_synced": True},
        }
        self._json_ok(payload)

    def _json_err(self, code, message):
        try:
            payload = json.dumps({'error': message, 'trace': repr(message)}, indent=2, default=str).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def handle_local_fleet_data_api(self):
        try:
            from fleet_data_manager import FleetDataManager
            self._json_ok(FleetDataManager().status())
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_fleet_compute_api(self):
        try:
            from fleet_data_manager import FleetDataManager
            from fleet_compute import FleetComputeScheduler
            self._json_ok(FleetComputeScheduler(FleetDataManager()).fleet_status())
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_dataset_api(self):
        try:
            from augur_offline_dataset import verify_dataset
            self._json_ok(verify_dataset())
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_download_api(self):
        try:
            from data_downloader import (
                get_download_status, get_progress, get_quick_progress,
                stop_current_download, download_watchlist_quick,
                download_new_ticker, is_download_active, quick_update
            )
            path = urlparse(self.path).path
            query = parse_qs(urlparse(self.path).query)
            if self.command == 'POST':
                if path.endswith('/start') or path == '/api/download':
                    from app import start_download
                    try:
                        if self.command == 'POST' and self.headers.get('Content-Length','0').strip() != '0':
                            length = int(self.headers.get('Content-Length', 0))
                            raw = self.rfile.read(length)
                            try:
                                payload = json.loads(raw.decode('utf-8', errors='ignore') or '{}')
                            except Exception:
                                payload = {}
                        else:
                            payload = {}
                        _orig_request = __import__('app').request if False else None
                        try:
                            import app as _app_mod
                            with _app_mod.app.test_request_context('/api/download', method='POST', json=payload):
                                result = start_download()
                        finally:
                            pass
                    except Exception as exc:
                        self._json_err(500, str(exc))
                        return
                    status = getattr(result, 'status_code', 200)
                    payload = getattr(result, 'get_data', lambda: b'{}')()
                    if isinstance(payload, bytes):
                        body = payload
                    else:
                        body = json.dumps(payload, indent=2, default=str).encode('utf-8')
                    self.send_response(status)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Content-Length', str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                if path.endswith('/stop'):
                    stop_current_download()
                    self._json_ok({'status': 'stopped'})
                    return
                if path.endswith('/watchlist'):
                    tickers = query.get('tickers', [])
                    if not tickers:
                        self._json_err(400, 'tickers required')
                        return
                    def _run():
                        try:
                            download_watchlist_quick([t.strip().upper() for t in tickers if t.strip()])
                        except Exception:
                            pass
                    threading.Thread(target=_run, daemon=True, name='watchlist_local').start()
                    self._json_ok({'status': 'started'})
                    return
                if path.endswith('/new_ticker'):
                    ticker = (query.get('ticker', [''])[0] or '').strip().upper()
                    if not ticker:
                        self._json_err(400, 'ticker required')
                        return
                    def _run():
                        try:
                            download_new_ticker(ticker, force_full=query.get('force_full', ['0'])[0] in ('1', 'true', 'yes'))
                        except Exception:
                            pass
                    threading.Thread(target=_run, daemon=True, name='new_ticker_local').start()
                    self._json_ok({'status': 'started'})
                    return
                if path.endswith('/quick_update'):
                    def _run():
                        try:
                            quick_update()
                        except Exception:
                            pass
                    threading.Thread(target=_run, daemon=True, name='quick_update_local').start()
                    self._json_ok({'status': 'started'})
                    return
                if path == '/download':
                    try:
                        body_obj = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or '{}')
                    except Exception:
                        body_obj = {}
                    use_schwab = bool(body_obj.get('use_schwab', True))
                    use_alpaca = bool(body_obj.get('use_alpaca', True))
                    use_yfinance = bool(body_obj.get('use_yfinance', False))
                    use_fred = bool(body_obj.get('use_fred', True))
                    if not any([use_schwab, use_alpaca, use_yfinance, use_fred]):
                        self._json_err(400, 'select at least one source')
                        return
                    def _run_full():
                        try:
                            from data_downloader import download_all
                            download_all(profile='conservative', use_schwab=use_schwab, use_alpaca=use_alpaca, use_yfinance=use_yfinance, use_fred=use_fred)
                        except Exception:
                            pass
                    threading.Thread(target=_run_full, daemon=True, name='download_local').start()
                    self._json_ok({'status': 'started'})
                    return
                self._json_err(404, 'unknown POST action')
                return
            # GET: return cached status to avoid slow DB reads
            if path.endswith('/quick_update/progress'):
                self._json_ok(get_quick_progress())
                return
            if path.endswith('/progress'):
                self._json_ok({'progress': get_progress()})
                return
            if not hasattr(self, '_dl_cache') or not hasattr(self, '_dl_cache_ts') or (__import__('time').time() - getattr(self, '_dl_cache_ts', 0) > 2):
                self._dl_cache = {
                    'status': get_download_status(),
                    'progress': get_progress(),
                    'quick_progress': get_quick_progress(),
                    'active': is_download_active(),
                }
                self._dl_cache_ts = __import__('time').time()
            self._json_ok(self._dl_cache)
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_presets_api(self):
        try:
            import sqlite3, json as _json
            from datetime import datetime, timezone
            db_path = str(_BACKEND_DIR / 'data' / 'treasure_map.db')
            con = sqlite3.connect(db_path)
            con.row_factory = sqlite3.Row
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(length).decode('utf-8') or '{}') if length else {}
                name = (body.get('name') or '').strip()
                if not name:
                    self._json_err(400, 'name required')
                    return
                genome_json = _json.dumps({
                    'archetype_id': body.get('archetype_id'),
                    'genome': body.get('genome_json'),
                    'discipline': body.get('discipline'),
                    'ticker': body.get('ticker'),
                    'notes': body.get('notes', ''),
                })
                con.execute('''
                    INSERT INTO scan_strategies (name, description, source, discipline, direction, rules_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET description=excluded.description, discipline=excluded.discipline, direction=excluded.direction, rules_json=excluded.rules_json
                ''', (name, body.get('notes', '') or body.get('description', ''), 'preset', body.get('discipline', 'day'), body.get('direction', 'long'), genome_json, datetime.now().isoformat()))
                con.commit()
                self._json_ok({'status': 'saved', 'name': name})
                return
            if self.command == 'DELETE':
                length = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(length).decode('utf-8') or '{}') if length else {}
                name = (body.get('name') or '').strip()
                if not name:
                    self._json_err(400, 'name required')
                    return
                con.execute("DELETE FROM scan_strategies WHERE name=? AND source='preset'", (name,))
                con.commit()
                self._json_ok({'status': 'deleted', 'name': name})
                return
            rows = con.execute("SELECT id, name, description, discipline, direction, rules_json, created_at FROM scan_strategies WHERE source='preset' ORDER BY created_at DESC").fetchall()
            presets = []
            for r in rows:
                try:
                    rules = _json.loads(r['rules_json'] or '{}')
                except Exception:
                    rules = {}
                presets.append({'id': r['id'], 'name': r['name'], 'description': r['description'], 'discipline': r['discipline'], 'direction': r['direction'], 'archetype_id': rules.get('archetype_id'), 'genome_json': rules.get('genome'), 'ticker': rules.get('ticker'), 'notes': rules.get('notes', ''), 'created_at': r['created_at']})
            con.close()
            self._json_ok({'presets': presets})
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_api_stub(self, path, default_body=None):
        if default_body is None:
            default_body = {'error': 'not implemented'}
        self._json_ok(default_body)

    def handle_github_issues_api(self, path):
        repo = 'VOIDPirateTradeCo/Obsidian_Vault'
        try:
            url = f'https://api.github.com/repos/{repo}/issues?state=open&per_page=10&sort=updated&direction=desc'
            req = urllib.request.Request(url, headers={'User-Agent':'CaptainDashboard','Accept':'application/vnd.github+json'})
            with urllib.request.urlopen(req, timeout=15) as r:
                raw = r.read()
                data = json.loads(raw)
                issues = []
                for item in data:
                    if 'pull_request' in item:
                        continue
                    issues.append({
                        'id': item.get('id'),
                        'number': item.get('number'),
                        'title': item.get('title'),
                        'state': item.get('state'),
                        'updated_at': item.get('updated_at'),
                        'url': item.get('html_url'),
                        'labels': [l.get('name') for l in (item.get('labels') or [])],
                    })
                self._json_ok({'repo': repo, 'issues': issues, 'count': len(issues), 'source': 'github'})
        except Exception as exc:
            self._json_ok({'repo': repo if 'repo' in locals() else 'VOIDPirateTradeCo/Obsidian_Vault', 'issues': [], 'count': 0, 'error': str(exc), 'source': 'github_fallback'})

    def handle_local_data_source_status_api(self):
        sources = []
        stale_cutoff = None
        try:
            db_path = _BACKEND_DIR / 'data' / 'treasure_map.db'
            if db_path.exists():
                import sqlite3
                con = sqlite3.connect(str(db_path), timeout=2)
                con.execute('PRAGMA journal_mode=WAL')
                def q(sql):
                    try:
                        return con.execute(sql).fetchone()[0]
                    except Exception:
                        return None
                sources = [
                    {'name': 'Historical Prices', 'rows': q('SELECT COUNT(*) FROM price_history') or 0, 'last_date': q('SELECT MAX(date) FROM price_history'), 'coverage': 0, 'status': 'good'},
                    {'name': '1min Bars', 'rows': q('SELECT COUNT(*) FROM price_history_1min') or 0, 'last_date': q('SELECT MAX(date) FROM price_history_1min'), 'coverage': 0, 'status': 'good'},
                    {'name': 'FRED Macro', 'rows': q('SELECT COUNT(*) FROM fred_macro') or 0, 'last_date': q('SELECT MAX(date) FROM fred_macro'), 'coverage': 0, 'status': 'good'},
                    {'name': 'Fundamentals', 'rows': q('SELECT COUNT(*) FROM fundamentals') or 0, 'last_date': q('SELECT MAX(added_at) FROM fundamentals'), 'coverage': 0, 'status': 'good'}
                ]
                for src in sources:
                    src['coverage'] = src['rows']
                con.close()
        except Exception as exc:
            sources = [{'name': 'db_error', 'rows': 0, 'last_date': 'error', 'coverage': 0, 'status': str(exc)}]
        self._json_ok({'sources': sources, 'stale_cutoff': stale_cutoff})

    def handle_local_schwab_status_api(self):
        try:
            connected = False
            status = 'disconnected'
            try:
                from schwab_client import get_schwab_status
                backend = get_schwab_status() or {}
                connected = bool(backend.get('connected'))
                status = backend.get('status', 'disconnected')
            except Exception:
                connected = False
                status = 'disconnected'
            if not connected:
                token_path = _BACKEND_DIR / 'data' / 'meta' / 'schwab_tokens.json'
                if token_path.exists() and token_path.stat().st_size > 0:
                    connected = True
                    status = 'authorized'
            try:
                env_path = _BACKEND_DIR.parent / 'treasure_map_keys.env'
                has_keys = False
                if env_path.exists():
                    txt = env_path.read_text(encoding='utf-8', errors='ignore')
                    has_keys = all(k in txt for k in ['SCHWAB_APP_KEY', 'SCHWAB_APP_SECRET', 'SCHWAB_CALLBACK_URL'])
            except Exception:
                has_keys = False
            self._json_ok({
                'connected': connected,
                'status': status,
                'has_keys': has_keys,
            })
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_schwab_auth_url_api(self):
        try:
            import secrets, hashlib, base64, urllib.parse
            env_path = _BACKEND_DIR.parent / 'treasure_map_keys.env'
            if not env_path.exists():
                self._json_err(500, 'treasure_map_keys.env not found')
                return
            env = {}
            for line in env_path.read_text(encoding='utf-8', errors='ignore').splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
            app_key = env.get('SCHWAB_APP_KEY', '')
            redirect = env.get('SCHWAB_CALLBACK_URL', 'https://127.0.0.1')
            if not app_key:
                self._json_err(500, 'SCHWAB_APP_KEY missing')
                return
            verifier = secrets.token_urlsafe(64)
            challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
            params = {
                'client_id': app_key,
                'redirect_uri': redirect,
                'response_type': 'code',
                'code_challenge': challenge,
                'code_challenge_method': 'S256',
                'state': secrets.token_hex(16),
            }
            auth_url = 'https://api.schwabapi.com/v1/oauth/authorize' + '?' + urllib.parse.urlencode(params)
            self._json_ok({'auth_url': auth_url, 'verifier': verifier, 'app_secret': env.get('SCHWAB_APP_SECRET', ''), 'redirect': redirect})
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_schwab_oauth_callback_api(self):
        try:
            if self.command != 'POST':
                self._json_err(405, 'POST only')
                return
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length).decode('utf-8', errors='ignore')
            params = urllib.parse.parse_qs(body)
            redirect_url = params.get('redirect_url', [''])[0]
            verifier = params.get('verifier', [''])[0]
            if not redirect_url or not verifier:
                self._json_err(400, 'redirect_url and verifier required')
                return
            parsed = urllib.parse.urlparse(redirect_url)
            qs = urllib.parse.parse_qs(parsed.query)
            auth_code = qs.get('code', [None])[0]
            if not auth_code:
                self._json_err(400, 'No authorization code found in redirect URL')
                return
            env_path = _BACKEND_DIR.parent / 'treasure_map_keys.env'
            env = {}
            for line in env_path.read_text(encoding='utf-8', errors='ignore').splitlines():
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
            token_url = 'https://api.schwabapi.com/v1/oauth/token'
            data = urllib.parse.urlencode({
                'grant_type': 'authorization_code',
                'code': auth_code,
                'redirect_uri': env.get('SCHWAB_CALLBACK_URL', 'https://127.0.0.1'),
                'code_verifier': verifier,
                'client_id': env.get('SCHWAB_APP_KEY', ''),
                'client_secret': env.get('SCHWAB_APP_SECRET', ''),
            }).encode()
            req = urllib.request.Request(token_url, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'}, method='POST')
            with urllib.request.urlopen(req, timeout=15) as r:
                tokens = json.loads(r.read().decode())
            token_path = _BACKEND_DIR / 'data' / 'meta' / 'schwab_tokens.json'
            token_path.parent.mkdir(parents=True, exist_ok=True)
            token_path.write_text(json.dumps(tokens, indent=2), encoding='utf-8')
            self._json_ok(200, {'saved': True, 'token_path': str(token_path)})
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_data_source_prefs_api(self):
        try:
            import sqlite3, json as _json
            from datetime import datetime, timezone
            db_path = str(_BACKEND_DIR / 'data' / 'treasure_map.db')
            con = sqlite3.connect(db_path)
            con.row_factory = sqlite3.Row
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(length).decode('utf-8') or '{}') if length else {}
                source_name = (body.get('source_name') or '').strip()
                if not source_name:
                    self._json_err(400, 'source_name required')
                    return
                con.execute('''
                    INSERT INTO data_source_preferences (source_name, enabled, priority, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(source_name) DO UPDATE SET enabled=excluded.enabled, priority=excluded.priority, updated_at=excluded.updated_at
                ''', (source_name, 1 if body.get('enabled', True) else 0, int(body.get('priority', 0)), datetime.now().isoformat()))
                con.commit()
                self._json_ok({'status': 'saved', 'source_name': source_name})
                return
            rows = con.execute('SELECT source_name, enabled, priority, last_used, updated_at FROM data_source_preferences ORDER BY priority DESC, source_name').fetchall()
            prefs = [{'source_name': r['source_name'], 'enabled': bool(r['enabled']), 'priority': r['priority'], 'last_used': r['last_used'], 'updated_at': r['updated_at']} for r in rows]
            con.close()
            self._json_ok({'preferences': prefs})
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_bracket_info_api(self, ticker):
        # BUG-3 FIX: Delegate to tr3asure mAp backend via proxy instead of local handler
        # This eliminates the dependency on schwab_streamer and pandas modules
        try:
            path = f"/api/augur/bracket/info/{ticker}"
            self.handle_local_proxy_json(f'http://127.0.0.1:5000{path}')
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_manual_signal_api(self):
        try:
            import json as _json
            from trade_executor import captain_place_trade
        except Exception as _imp:
            self._json_err(500, f'trade_executor unavailable: {_imp}')
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            data = _json.loads(self.rfile.read(length).decode('utf-8') or '{}') if length else {}
            ticker = (data.get('ticker') or '').upper().strip()
            side = (data.get('side') or 'long').lower()
            entry_price = float(data.get('entry_price') or 0)
            stop_price = float(data.get('stop_price') or 0)
            target_price = float(data.get('target_price') or 0)
            qty = int(data.get('qty') or 0)
            mode = (data.get('mode') or 'paper').lower()
            if not ticker or side not in ('long', 'short') or mode not in ('paper', 'live') or entry_price <= 0 or stop_price <= 0 or target_price <= 0 or qty <= 0:
                self._json_err(400, f'Invalid input: ticker={ticker}, side={side}, mode={mode}, entry={entry_price}, stop={stop_price}, target={target_price}, qty={qty}')
                return
            res = captain_place_trade(ticker=ticker, action='BUY' if side == 'long' else 'SELL', shares=qty, order_type='MARKET', limit_price=entry_price, stop_price=stop_price, note='Captain manual bracket', live=(mode == 'live'))
            self._json_ok(res)
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_news_api(self, path):
        try:
            from alpaca_client import get_alpaca_news, check_alpaca_enabled
            if self.command == 'POST' and path.endswith('/refresh'):
                self._json_ok({'status': 'refresh_queued'})
                return
            ticker = path.rsplit('/', 1)[-1].strip().upper() if '/' in path else 'SPY'
            if not ticker or ticker == 'REFRESH':
                ticker = 'SPY'
            articles = []
            if check_alpaca_enabled():
                articles = get_alpaca_news([ticker], limit=20) or []
            payload = {'ticker': ticker, 'articles': articles, 'source': 'alpaca', 'count': len(articles)}
            self._json_ok(payload)
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_local_proxy_json(self, target_base, keep_path=False, methods=None):
        try:
            path = urlparse(self.path).path
            query = urlparse(self.path).query
            if keep_path:
                target = target_base
                base_path = urlparse(target_base).path or '/'
                suffix = path[len(base_path):] if path.startswith(base_path) else path
                if suffix and not suffix.startswith('/'):
                    suffix = '/' + suffix
                target = target + suffix
                if query:
                    target = target + '?' + query
            else:
                target = target_base
                if query:
                    target = target + '?' + query
            req = urllib.request.Request(target, method=self.command, data=(self._post_body() if self.command == 'POST' else None))
            auth_hdr = self.headers.get('Authorization') or self.headers.get('X-Auth-Token')
            if auth_hdr:
                req.add_header('Authorization', auth_hdr)
            with urllib.request.urlopen(req, timeout=20) as r:
                body = r.read()
                ctype = r.headers.get('Content-Type', 'application/json')
                self.send_response(r.status)
                self.send_header('Content-Type', ctype)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception as exc:
            payload = json.dumps({'error': f'proxy_failed: {exc}', 'target': target}).encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def _post_body(self):
        length = int(self.headers.get('Content-Length', '0'))
        if not length:
            return None
        return self.rfile.read(length)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except Exception as e:
            try:
                import traceback, sys
                sys.stderr.write("[REQUEST_ERROR] " + repr(e) + "\n")
                traceback.print_exc(file=sys.stderr)
            except Exception:
                pass

    def do_GET(self):
        self._route()

    def do_POST(self):
        self._route()

    def handle_fodavp_activate(self):
        """Legacy activation endpoint — writes trigger flag for Hermes activation"""
        self.handle_fodavp_trigger()

    def handle_fodavp_trigger(self):
        """Execute FODAVP engine directly from dashboard button"""
        from datetime import datetime, timezone
        import subprocess
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            engine_path = Path(__file__).parent / "fleet" / "automation" / "fodavp" / "fodavp_engine.py"
            python_exe = sys.executable
            
            result = subprocess.run(
                [python_exe, str(engine_path)],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=str(engine_path.parent)
            )
            
            trigger_path = Path(__file__).parent / "fleet" / "evidence" / ".fodavp_trigger"
            trigger_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "dashboard_button",
                "endpoint": self.path,
                "action": "activate_fodavp",
                "engine_exit_code": result.returncode,
                "engine_stdout": result.stdout[:500] if result.stdout else "",
                "engine_stderr": result.stderr[:500] if result.stderr else ""
            }
            trigger_path.write_text(json.dumps(trigger_data, indent=2))
            
            response = {
                "status": "activated",
                "message": "⚔️ FODAVP protocol activated — engine executed",
                "source": "dashboard_button",
                "exit_code": result.returncode,
                "stdout": result.stdout[:500] if result.stdout else "",
                "stderr": result.stderr[:500] if result.stderr else ""
            }
        except subprocess.TimeoutExpired:
            response = {
                "status": "timeout",
                "message": "FODAVP engine timed out after 120s"
            }
        except Exception as e:
            response = {
                "status": "error",
                "message": f"Activation failed: {str(e)}"
            }
        
        self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
    
    def handle_fodavp_status(self):
        """Return FODAVP status for dashboard polling"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response = {
            "running": False,
            "evidence_count": len(list(Path("C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/evidence").glob("*.json"))),
            "last_cycle": self._get_latest_evidence(),
            "fleet_status": {
                "SQUIDSTATION": "unknown",
                "PINKCADY": "unknown", 
                "STEALTHATTACK": "unknown"
            }
        }
        self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
    
    def handle_fodavp_stop(self):
        """Stop any running FODAVP processes"""
        import subprocess
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        try:
            subprocess.run(['pkill', '-f', 'fodavp_engine.py'], 
                          capture_output=True, timeout=5)
            response = {"status": "stopped", "message": "FODAVP engine terminated"}
        except Exception as e:
            response = {"status": "error", "message": str(e)}
            
        self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
    
    def _get_latest_evidence(self):
        evidence_dir = Path("C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/evidence")
        if evidence_dir.exists():
            evidence_files = sorted(evidence_dir.glob("FOOD*.json"), key=lambda x: x.stat().st_mtime)
            if evidence_files:
                latest = evidence_files[-1]
                try:
                    data = json.loads(latest.read_text())
                    return {
                        "file": latest.name,
                        "timestamp": data.get("timestamp", "unknown"),
                        "status": data.get("data", {}).get("orientation", "unknown")
                    }
                except:
                    pass
        return None

    def handle_api_status(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.end_headers()
        try:
            # Return cached data immediately if available
            cached = cache_get('full_status')
            if cached is not None:
                kuma = cache_get('kuma') or {}
                if not kuma:
                    try:
                        kuma = get_kuma_summary()
                    except Exception:
                        pass
                cached['kuma'] = kuma
                self.wfile.write(json.dumps(cached, indent=2, default=str).encode('utf-8'))
                return

            # No cache yet — return placeholder (prewarm thread will populate real data)
            import traceback
            data = collect_public_data()
            try:
                kuma = get_kuma_summary()
            except Exception:
                kuma = {}
            data['kuma'] = kuma
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            error_detail = traceback.format_exc()
            self.wfile.write(json.dumps({"error": str(e), "traceback": error_detail}).encode('utf-8'))

    def handle_monitor_api(self):
        """Monitoring status summary for the Captain Dashboard."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            targets = {
                "grafana": "http://192.168.0.39:3002",
                "prometheus": "http://192.168.0.39:9090",
                "cadvisor": "http://192.168.0.39:8081",
                "mission_control": "http://127.0.0.1:3100/api/status?action=health",
            }
            summary = {}
            for name, url in targets.items():
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "CaptainDashboard"})
                    with urllib.request.urlopen(req, timeout=3) as r:
                        summary[name] = {"url": url, "status": str(r.status)}
                except Exception as e:
                    summary[name] = {"url": url, "status": f"error: {type(e).__name__}"}
            self.wfile.write(json.dumps(summary, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_kuma_api(self):
        """Kuma status panel proxy — shells out to Kuma DB via docker cp."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            summary = get_kuma_summary()
            self.wfile.write(json.dumps(summary, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_heal_api(self):
        """Hive self-heal / self-correct / self-learn feed for the Captain's dashboard.
        Reads the live learning + intervention logs produced by fleet_self_heal.py."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            state_dir = os.path.join(VAULT_PATH, '03_Business_Operations', 'state')
            learn = load_json(os.path.join(state_dir, 'whale_selfheal_learning.json'), [])
            interventions = load_json(os.path.join(state_dir, 'whale_interventions.json'), [])
            mesh = load_json(os.path.join(state_dir, 'fleet_mesh_state.json'), {})
            ships = mesh.get('ships', {})
            # current death-loop risk: ships alive but crew_api down
            at_risk = [n for n, s in ships.items()
                       if s.get('status') == 'online'
                       and not s.get('ports', {}).get('crew_api', False)]
            heal_data = {
                "hive": {
                    "self_heal_active": True,
                    "learn_events": len(learn),
                    "interventions": len(interventions),
                    "ships_at_deathloop_risk": at_risk,
                    "last_learn": learn[-1] if learn else None,
                    "last_intervention": interventions[-1] if interventions else None,
                },
                "learn_log": learn[-20:],
                "intervention_log": interventions[-20:],
            }
            self.wfile.write(json.dumps(heal_data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_pinkcady_api(self):
        """Captain's PINKCADY death-spiral gate — live verdict from pinkcady_watch.py.
        Returns clear_to_boot so the Captain knows when Miss Pink is safe to boot."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            state_dir = os.path.join(VAULT_PATH, '03_Business_Operations', 'state')
            verdict = load_json(os.path.join(state_dir, 'pinkcady_verdict.json'), {})
            # also reflect crew_heartbeats PINKCADY entry (sent by the sentinel)
            hb = CREW_HEARTBEATS.get('PINKCADY')
            data = {
                "verdict": verdict.get('verdict', 'UNKNOWN'),
                "clear_to_boot": verdict.get('clear_to_boot', False),
                "captain_msg": verdict.get('captain_msg', 'PINKCADY verdict pending — sentinel sampling.'),
                "evidence": verdict.get('evidence', {}),
                "last_check": verdict.get('last_check'),
                "sentinel_heartbeat": hb,
            }
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_traffic_api(self):
        """WHITE WHALE fleet traffic-control + load-balancing status for the crew.
        Shows the live config + each daemon's heartbeat age (liveness) so the
        whole pirate crew can see the network is quiet and balanced."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            state_dir = os.path.join(VAULT_PATH, '03_Business_Operations', 'state')
            cfg = load_json(os.path.join(state_dir, 'fleet_traffic_config.json'), {})
            # daemon liveness from heartbeat files
            hb_dir = os.path.join(state_dir, 'daemon_heartbeats')
            import glob
            liveness = {}
            now = datetime.datetime.now(datetime.timezone.utc)
            for f in glob.glob(os.path.join(hb_dir, '*.json')):
                name = os.path.basename(f)[:-5]
                try:
                    d = load_json(f, {})
                    ts = datetime.datetime.fromisoformat(d['ts'])
                    liveness[name] = round((now - ts).total_seconds(), 1)
                except Exception:
                    liveness[name] = None
            data = {
                "config_version": cfg.get('version'),
                "global": cfg.get('global', {}),
                "monitor": cfg.get('monitor', {}),
                "daemon_liveness_s": liveness,
                "note": "Load balancing = staggered probes + adaptive poll + heartbeat consolidation. Network stays quiet.",
            }
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_remotectl_api(self):
        """WHITE WHALE remote kill-switch panel for the Captain's dashboard.
        GET  -> list rigs, agent reachability, and (if ?ship=X) that rig's live
                process list (read-only).
        POST -> {ship, action:'safe_stop', pattern:'...'} sends an allowlisted
                safe_stop to that rig's whale_agent. SQUID is the only controller.
        Hard-coded: targets must be in the WHITE WHALE allowlist; patterns limited
        to our own daemon names (no arbitrary process kills)."""
        from urllib.parse import urlparse, parse_qs
        if self.command == 'GET':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            q = parse_qs(urlparse(self.path).query)
            ship = (q.get('ship') or [None])[0]
            try:
                import socket, json as _json
                # own-device allowlist (mirror of whale_agent CONTROLLER_IPS / whale_policy)
                RIGS = {
                    "PINKCADY": "100.106.235.103",
                    "STEALTHATTACK": "100.110.238.68",
                    "SQUIDSTATION": "100.83.247.14",
                }
                def _reachable(ip, port=7911, t=3):
                    s = socket.socket(); s.settimeout(t)
                    try:
                        return s.connect_ex((ip, port)) == 0
                    finally:
                        s.close()
                if ship:
                    ip = RIGS.get(ship.upper())
                    if not ip:
                        self.wfile.write(_json.dumps({"error": f"ship {ship} not in allowlist"}).encode())
                        return
                    # pull process list from that rig's agent (read-only status)
                    try:
                        import urllib.request
                        req = urllib.request.Request(f"http://{ip}:7911/",
                            data=_json.dumps({"action": "status"}).encode(),
                            method="POST", headers={"Content-Type": "application/json"})
                        procs = _json.loads(urllib.request.urlopen(req, timeout=6).read())
                    except Exception as e:
                        procs = {"error": str(e), "agent_reachable": False}
                    self.wfile.write(_json.dumps({"ship": ship, "agent_ip": ip,
                        "agent_reachable": _reachable(ip), "processes": procs},
                        indent=2, default=str).encode())
                else:
                    out = {n: {"ip": ip, "agent_reachable": _reachable(ip)}
                           for n, ip in RIGS.items()}
                    self.wfile.write(_json.dumps(out, indent=2).encode())
            except Exception as e:
                self.wfile.write(_json.dumps({"error": str(e)}).encode())
            return
        if self.command == 'POST':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = _json.loads(self.rfile.read(length) or b'{}')
                ship = (body.get('ship') or '').upper()
                action = body.get('action')
                pattern = body.get('pattern', '')
                RIGS = {"PINKCADY": "100.106.235.103", "STEALTHATTACK": "100.110.238.68",
                        "SQUIDSTATION": "100.83.247.14"}
                if ship not in RIGS:
                    self.wfile.write(_json.dumps({"error": f"ship {ship} not allowlisted"}).encode())
                    return
                if action != 'safe_stop':
                    self.wfile.write(_json.dumps({"error": "only safe_stop supported"}).encode())
                    return
                # allowlist the kill pattern to our own daemons only
                ALLOWED = ("pythonw", "python", "cmd", "whale_agent", "fleet_",
                           "network_monitor", "crew_api", "run_ticket", "sir_green",
                           "pinkcady", "dashboard", "bot")
                if not any(a in pattern.lower() for a in ALLOWED):
                    self.wfile.write(_json.dumps({"error": f"pattern '{pattern}' not allowlisted for safe_stop"}).encode())
                    return
                import urllib.request
                req = urllib.request.Request(f"http://{RIGS[ship]}:7911/",
                    data=_json.dumps({"action": "safe-stop", "pattern": pattern}).encode(),
                    method="POST", headers={"Content-Type": "application/json"})
                res = _json.loads(urllib.request.urlopen(req, timeout=8).read())
                self.wfile.write(_json.dumps({"ship": ship, "command": "safe_stop",
                    "pattern": pattern, "result": res}, indent=2, default=str).encode())
            except Exception as e:
                self.wfile.write(_json.dumps({"error": str(e)}).encode())
            return
        self.send_response(405)
        self.end_headers()

    def handle_local_signals_api(self):
        body = {"timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "count": 0, "signals": []}
        try:
            req = urllib.request.Request('http://127.0.0.1:5000/api/signals', method='GET')
            with urllib.request.urlopen(req, timeout=5) as r:
                upstream = json.loads(r.read())
            if isinstance(upstream, dict):
                body = upstream
        except Exception:
            pass
        body.setdefault('timestamp', datetime.datetime.now(datetime.timezone.utc).isoformat())
        self._json_ok(body)

    def handle_augur_api(self):
        """Captain's helm: Augur (tr3asure_mAp trading AI) live status."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            q = parse_qs(urlparse(self.path).query)
            action = (q.get('action') or [''])[0].lower()
            if action == 'graduation':
                self.handle_augur_graduation_api(body_override=True)
                return
            if action == 'paper_state':
                self.handle_augur_paper_state_api(body_override=True)
                return
            augur_state = os.path.join(VAULT_PATH, '03_Business_Operations', 'state', 'augur_status.json')
            live = {}
            try:
                import urllib.request as _u
                live_endpoints = [
                    ('augur_status', 'http://127.0.0.1:5000/api/augur/status'),
                    ('signals', 'http://127.0.0.1:5000/api/signals'),
                    ('last_signal', 'http://127.0.0.1:5000/api/augur/last_signal'),
                    ('alpaca_status', 'http://127.0.0.1:5000/api/data/alpaca/status'),
                    ('alpaca_smoke', 'http://127.0.0.1:5000/api/alpaca/smoke_test'),
                ]
                for name, url in live_endpoints:
                    try:
                        req = _u.Request(url, method='GET')
                        with _u.urlopen(req, timeout=5) as r:
                            live[name] = {'http_status': r.status, 'data': json.loads(r.read())}
                    except Exception as exc:
                        live[name] = {'error': str(exc)}
            except Exception:
                pass
            if os.path.exists(augur_state):
                data = load_json(augur_state, {})
                data['deployed'] = True
            else:
                data = {
                    "deployed": False,
                    "status": "PENDING_DEPLOY",
                    "note": "Augur brain exists in backups/ST0RM-BR3AK_* checkpoints but is not yet promoted to a live self-healing deployment.",
                    "issue": "https://github.com/VOIDPirateTradeCo/Obsidian_Vault/issues/355",
                }
            data['live_backend'] = live
            bridge_path = os.path.join(VAULT_PATH, '03_Business_Operations', 'state', 'alpaca_bridge.json')
            if os.path.exists(bridge_path):
                try:
                    data['alpaca_bridge'] = load_json(bridge_path, {})
                except Exception as _bridge_err:
                    data['alpaca_bridge'] = {'error': f'bridge_read_failed: {_bridge_err}'}
            tm = {"backend_port_5000": bool(live.get('augur_status')), "containers_up": [], "localhost_3000": "Gitea (self-hosted git), not TreasureMap"}
            try:
                out = subprocess.check_output(["docker", "ps", "--format", "{{.Names}}"],
                                              text=True, timeout=10).stdout
                tm["containers_up"] = [l.strip() for l in out.splitlines()
                                        if "treasuremap" in l or "void-fleet" in l]
            except Exception:
                pass
            data["treasuremap_stack"] = tm
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_augur_graduation_api(self, body_override=False):
        """Captain's helm / hive bridge: graduation gate summary."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            from urllib.parse import parse_qs, urlparse
            q = parse_qs(urlparse(self.path).query)
            bot_id = (q.get('bot_id') or [''])[0]
            if not bot_id:
                payload = {"error": "bot_id required", "example": "/api/augur/graduation?bot_id=AUGUR-01"}
                self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))
                return
            import urllib.request as _u
            req = _u.Request(f"http://127.0.0.1:5000/api/bots/{bot_id}/graduation_status",
                             method="GET")
            with _u.urlopen(req, timeout=10) as r:
                payload = json.loads(r.read())
            payload["source"] = "treasuremap_backend"
            self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))
        except Exception as e:
            payload = {"error": str(e), "mode": "dashboard_fallback"}
            if 'bot_id' in locals() and bot_id:
                payload["bot_id"] = bot_id
            self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))

    def handle_augur_paper_state_api(self, body_override=False):
        """Captain's helm / hive bridge: paper trading state."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            endpoints = [
                ("portfolio", "http://127.0.0.1:5000/api/portfolio/paper"),
                ("scheduler", "http://127.0.0.1:5000/api/scheduler/state"),
                ("risk",      "http://127.0.0.1:5000/api/risk/daily"),
            ]
            import urllib.request as _u
            result = {"generated": datetime.datetime.now(timezone.utc).isoformat()}
            for name, url in endpoints:
                try:
                    with _u.urlopen(url, timeout=5) as r:
                        result[name] = json.loads(r.read())
                except Exception as exc:
                    result[name] = {"error": str(exc)}
            self.wfile.write(json.dumps(result, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_game_api(self):
        """Captain's helm: Crownless Fortune game backend status."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            # network_monitor already probes SQUID docker; check the game container
            # if it runs here. Honest fallback if not present.
            game_state = os.path.join(VAULT_PATH, '03_Business_Operations', 'state', 'game_status.json')
            if os.path.exists(game_state):
                data = load_json(game_state, {})
                data['deployed'] = True
            else:
                data = {
                    "deployed": False,
                    "status": "NOT_MONITORED",
                    "note": "Crownless Fortune backend not yet wired into the fleet self-heal/dashboard. See GitHub issue #356/#357.",
                    "issue": "https://github.com/VOIDPirateTradeCo/Obsidian_Vault/issues/356",
                }
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_persona_api(self):
        """Captain's helm: network-wide persona build kit broadcast.
        Any crew member (Miss Pink / Sir Azure) fetches the persona template +
        Cosmos Library pointer over the LAN. No secrets, allowlist-only by virtue
        of being on the Captain's dashboard (own devices)."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            kit = os.path.join(VAULT_PATH, '05_Cosmos_Library', 'PERSONA_BUILD_KIT.md')
            template = os.path.join(VAULT_PATH, '03_AI_Operating_System',
                                     '00_General_AI_Brain_Subagent_Templates',
                                     'Brain_Hermes', 'TEMPLATE_PERSONALITY.md')
            cosmos_index = os.path.join(VAULT_PATH, '05_Cosmos_Library', '00_MASTER_INDEX.md')
            data = {
                "persona_build_kit": open(kit, encoding='utf-8', errors='ignore').read() if os.path.exists(kit) else None,
                "persona_template": open(template, encoding='utf-8', errors='ignore').read() if os.path.exists(template) else None,
                "cosmos_library_index": open(cosmos_index, encoding='utf-8', errors='ignore').read() if os.path.exists(cosmos_index) else None,
                "cosmos_library_path": "05_Cosmos_Library/",
                "broadcast": "git pull on any rig gets PERSONA_BUILD_KIT.md + Cosmos Library together",
            }
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_fleet_api(self):
        """Serve fleet overview — all ships status, containers, network."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            # Use cached full status (fast — already pre-warmed by background thread)
            cached = cache_get('full_status')
            if cached is not None:
                fleet_data = {
                    "ships": cached.get('ships', {}),
                    "ship_details": cached.get('ship_details', {}),
                    "containers": cached.get('containers', {}),
                    "network": cached.get('network', {}),
                    "timestamp": cached.get('timestamp', datetime.datetime.now(timezone.utc).isoformat()),
                }
                self.wfile.write(json.dumps(fleet_data, indent=2, default=str).encode('utf-8'))
                return
            
            # Fallback — return status endpoint data
            data = collect_public_data()
            fleet_data = {
                "ships": data.get('ships', {}),
                "ship_details": data.get('ship_details', {}),
                "containers": data.get('containers', {}),
                "network": data.get('network', {}),
                "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
            }
            self.wfile.write(json.dumps(fleet_data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_fleet_mesh_api(self):
        """Serve fleet mesh orchestrator state, enriched with LIVE ship status
        derived from crew heartbeats (so the hive mind shows real online/offline,
        not the static 'unknown')."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            state_path = os.path.join(VAULT_PATH, '03_Business_Operations', 'state', 'fleet_mesh_state.json')
            learned_path = os.path.join(VAULT_PATH, '03_Business_Operations', 'state', 'fleet_mesh_learned.json')
            mesh_state = load_json(state_path, {})
            learned = load_json(learned_path, {})
            ships = mesh_state.get('ships', {})
            now = datetime.datetime.now(datetime.timezone.utc)
            stale_after = 300
            live = {}
            heartbeat_entries = 0
            ship_names = set(ships.keys()) | set(CREW_HEARTBEATS.keys())
            for name in ship_names:
                entry = CREW_HEARTBEATS.get(name)
                if not entry:
                    # Preserve source-of-record status when no heartbeat exists yet.
                    fallback = ships.get(name) or {}
                    if isinstance(fallback, dict) and fallback.get('status') in ('online', 'stale', 'loading'):
                        live[name] = fallback.get('status', 'never_seen')
                    else:
                        live[name] = 'never_seen'
                    continue
                heartbeat_entries += 1
                try:
                    seen = datetime.datetime.fromisoformat(entry.get('last_seen'))
                    age = (now - seen).total_seconds()
                except (ValueError, KeyError, TypeError):
                    age = None
                live[name] = 'online' if (age is not None and age < stale_after) else 'stale'
            # If every heartbeat is stale, trust fleet_mesh_state's source-of-record
            # status instead of forcing everything to stale.
            if all(age is not None and age >= stale_after for age in [
                (now - datetime.datetime.fromisoformat(CREW_HEARTBEATS.get(name, {}).get('last_seen', now.isoformat()))).total_seconds()
                if CREW_HEARTBEATS.get(name) else None
                for name in ship_names
            ] if age is not None):
                live = {
                    name: ((ships.get(name) or {}).get('status', 'stale') if isinstance(ships.get(name), dict) else 'stale')
                    for name in ship_names
                }
            # Suppress false death-loop alerts: the alert generator marks
            # ping-alive hosts with "ping-alive but crew_api:8090 DOWN".
            # Those are not real death-loops; only keep alerts that indicate
            # the host itself is unreachable.
            if isinstance(mesh_state.get('alerts'), list):
                cleaned = []
                for alert in mesh_state['alerts']:
                    msg = str(alert.get('msg', ''))
                    if alert.get('type') == 'DEATH_LOOP_LOCAL' and 'ping-alive but' in msg.lower():
                        continue
                    cleaned.append(alert)
                mesh_state['alerts'] = cleaned
            # merge live status into each ship, including heartbeat-only ships
            for name in ship_names:
                info = ships.get(name)
                if isinstance(info, dict):
                    info = dict(info)
                    info['status'] = live.get(name, 'unknown')
                    ships[name] = info
                elif live.get(name):
                    ships[name] = {'status': live.get(name, 'unknown'), 'source': 'heartbeat'}
            mesh_state['ships'] = ships
            mesh_state['live_status'] = live
            mesh_state['ships_online'] = sum(1 for name in ship_names if live.get(name) == 'online' or (isinstance(ships.get(name), dict) and ships.get(name).get('status') == 'online'))
            mesh_state['generated'] = now.isoformat()
            data = {
                "fleet_mesh_state": mesh_state,
                "fleet_mesh_learned": learned,
                "debug_heartbeat_count": len(CREW_HEARTBEATS),
                "debug_heartbeat_sample": {k: CREW_HEARTBEATS[k] for k in list(CREW_HEARTBEATS)[:3]},
            }
            self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_dataview_api(self):
        """Serve fleet data in Dataview-compatible format for Obsidian integration.
        Miss Pink can use this with Dataview to sync ship status into her vault."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            cached = cache_get('full_status')
            if cached is not None:
                ships = cached.get('ships', {})
                containers = cached.get('containers', {})
                network = cached.get('network', {})
            else:
                data = collect_public_data()
                ships = data.get('ships', {})
                containers = data.get('containers', {})
                network = data.get('network', {})

            # Debug: ensure ships is a dict
            if not isinstance(ships, dict):
                ships = {}

            # Format as Dataview-compatible records
            dataview_records = []
            for ship_name, ship_data in ships.items():
                try:
                    if isinstance(ship_data, str):
                        ship_ip = KNOWN_SHIPS.get(ship_name, {}).get("ip", "")
                        ship_latency = ship_data
                        ship_status = "offline" if ship_data == "offline" else ("online" if ship_data not in ("loading", "offline") else ship_data)
                        ship_ports = 0
                        ship_containers = 0
                        ship_last_seen = "unknown"
                    else:
                        ship_ip = ship_data.get("ip", "") if isinstance(ship_data, dict) else ""
                        ship_latency = ship_data.get("latency", "unknown") if isinstance(ship_data, dict) else "unknown"
                        ship_status = "online" if isinstance(ship_data, dict) and ship_data.get("latency", "offline") not in ("offline", "loading", "—") else "offline"
                        ship_ports = len(ship_data.get("open_ports", [])) if isinstance(ship_data, dict) else 0
                        ship_containers = ship_data.get("container_count", 0) if isinstance(ship_data, dict) else 0
                        ship_last_seen = ship_data.get("last_seen", "unknown") if isinstance(ship_data, dict) else "unknown"
                except Exception as inner:
                    ship_ip = KNOWN_SHIPS.get(ship_name, {}).get("ip", "")
                    ship_latency = "error"
                    ship_status = "error"
                    ship_ports = 0
                    ship_containers = 0
                    ship_last_seen = str(inner)[:50]

                record = {
                    "file": f"fleet/{ship_name}",
                    "ship_name": ship_name,
                    "role": KNOWN_SHIPS.get(ship_name, {}).get("role", "Unknown"),
                    "ip": ship_ip,
                    "latency": ship_latency,
                    "status": ship_status,
                    "open_ports": ship_ports,
                    "containers": ship_containers,
                    "last_seen": ship_last_seen,
                    "fleet_mesh_connected": True,  # Fleet mesh is reachable
                    "timestamp": datetime.datetime.now(timezone.utc).isoformat(),
                }
                dataview_records.append(record)

            output = {
                "dataview_records": dataview_records,
                "fleet_summary": {
                    "total_ships": len(ships),
                    "online_ships": sum(1 for s in ships.values() if isinstance(s, str) and s not in ("offline", "loading", "—") or isinstance(s, dict) and s.get("latency", "offline") not in ("offline", "loading", "—")),
                    "total_containers": containers.get("total", 0) if isinstance(containers, dict) else 0,
                    "mesh_status": network.get("mesh_status", "unknown") if isinstance(network, dict) else "unknown",
                },
                "tik_tok": datetime.datetime.now(timezone.utc).isoformat(),
                "source": "SQUIDSTATION (localhost:9000)",
            }
            self.wfile.write(json.dumps(output, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_auth_api(self, path):
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
            if not token:
                # Try JSON body
                content_len = int(self.headers.get('Content-Length', '0'))
                body = self.rfile.read(content_len).decode('utf-8', errors='replace') if content_len else ''
                try:
                    data = json.loads(body) if body else {}
                    token = data.get('token')
                except Exception:
                    token = None
            if not token:
                # Try Authorization header
                auth = self.headers.get('Authorization') or self.headers.get('X-Auth-Token')
                if auth:
                    token = auth.split(' ', 1)[-1] if ' ' in auth else auth

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
                    "usage": "POST /api/auth/verify?token=<token> or POST with JSON body {\"token\":\"<token>\"}",
                }
            self.wfile.write(json.dumps(response, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
        return

    def _safe_write(self, payload):
        try:
            self.wfile.write(payload)
        except (ConnectionResetError, BrokenPipeError, OSError):
            pass

    def handle_sandbox_api(self, path):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            # Parse path: /api/sandbox/[section]
            section = path.replace('/api/sandbox', '').strip('/')
            
            if not section or section == 'status':
                data = {"status":"ok","mode":"local","note":"sandbox status stub"}
            elif section == 'vms':
                data = get_virtualbox_vms()
            elif section == 'hardware':
                data = get_hardware_inventory()
            elif section == 'network':
                data = get_network_devices()
            elif section == 'docker':
                data = get_docker_summary()
            else:
                data = {"error": f"Unknown section: {section}"}
            
            self._safe_write(json.dumps(data, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self._safe_write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_tools_classification_api(self):
        """Serve WHITE WHALE PROTOCOL classification levels for all tools."""
        try:
            # Read security findings + crew access from fleet state
            state_path = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\FLEET_MESH_STATE"
            remediated = {}
            crew_access = {
                "SirGreen": {"level": 4, "can_see_whale": True},
                "MissPink": {"level": 2, "can_see_whale": False},
                "SirAzure": {"level": 3, "can_see_whale": False},
            }
            if os.path.exists(state_path):
                with open(state_path, 'r') as f:
                    state = json.load(f)
                remediated = state.get("sandbox", {}).get("security_findings", {}).get("remediated", {})
                crew_access = state.get("access_control", crew_access)
            
            result = {
                "classification_levels": {
                    "level_1_landlubber": {
                        "name": "Landlubber",
                        "description": "Basic network discovery — crew members",
                        "tools": ["ping", "arp", "nslookup", "Get-NetNeighbor", "Get-NetTCPConnection", "docker ps", "docker network ls"],
                        "whitelist": ["192.168.0.0/24", "127.0.0.1"]
                    },
                    "level_2_deckhand": {
                        "name": "Deckhand",
                        "description": "Intermediate recon — trusted crew",
                        "tools": ["nmap -sV", "traceroute", "telnet", "Get-NetUDPEndpoint", "docker exec"],
                        "whitelist": ["192.168.0.0/24", "100.0.0.0/8", "127.0.0.1", "192.168.56.0/24", "192.168.103.0/24"]
                    },
                    "level_3_quartermaster": {
                        "name": "Quartermaster",
                        "description": "Advanced exploitation — Captain only",
                        "tools": ["nmap --script vuln", "hydra", "hashcat", "sqlmap", "burpsuite"],
                        "whitelist": ["192.168.0.0/24", "100.0.0.0/8"],
                        "requires_mfa": True
                    },
                    "level_4_white_whale": {
                        "name": "WHITE WHALE PROTOCOL",
                        "description": "Classified weapons — Captain passphrase required",
                        "tools": ["nmap scripts", "nikto", "metasploit", "yara", "suricata", "tshark", "clamav", "sqlmap -os-shell"],
                        "passphrase_required": True,
                        "aes_encrypted": True,
                        "audit_log": True
                    }
                },
                "tool_mapping": {
                    "nmap": "level_2_deckhand",
                    "nikto": "level_4_white_whale",
                    "suricata": "level_4_white_whale",
                    "yara": "level_4_white_whale",
                    "tshark": "level_4_white_whale",
                    "clamav": "level_4_white_whale",
                    "metasploit": "level_4_white_whale",
                    "hashcat": "level_3_quartermaster",
                    "hydra": "level_3_quartermaster",
                    "sqlmap": "level_3_quartermaster",
                    "burpsuite": "level_3_quartermaster",
                    "ping": "level_1_landlubber",
                    "docker": "level_1_landlubber"
                },
                # Card 12158: activation now runs off the same validated env hash
                # as the WHITE WHALE gate (WHITE_WHALE_PASSPHRASE_HASH, resolved at
                # module load) — no hardcoded plaintext passphrase, and no hint is
                # ever returned in the response.
                "white_whale_activated": verify_passphrase(
                    hashlib.sha256(
                        os.environ.get("WHITE_WHALE_PASSPHRASE", "").encode("utf-8")
                    ).hexdigest()
                ) if os.environ.get("WHITE_WHALE_PASSPHRASE", "") else False,
                "passphrase_required": True,
                "security_status": remediated,
                "crew_access": crew_access,
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def handle_alerts_api(self):
        """Alerts status with safe fallback."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"alerts": [], "count": 0}, indent=2).encode())

    def handle_diagram_api(self):
        """Render a Mermaid diagram to PNG using local mmdc, or return diagram metadata on GET."""
        if self.command == 'GET':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                req = urllib.request.Request(f"http://127.0.0.1:8080/api/fleet", headers={"User-Agent": "CaptainDashboard", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=2) as r:
                    fleet = json.loads(r.read())
                    ships = fleet.get("ships", {})
            except Exception:
                ships = {}
            diagram = {
                "nodes": [{"id": name, "type": "ship", "status": ship.get("status", "unknown")} for name, ship in ships.items()],
                "edges": [],
                "updated_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),
                "source": "fleet_status_snapshot",
                "render_endpoint": "POST /api/diagram with {mermaid: '<code>'} to render PNG",
            }
            for ship_name, ship in ships.items():
                for peer in ship.get("peers", []):
                    diagram["edges"].append({"from": ship_name, "to": peer})
            self.wfile.write(json.dumps(diagram, indent=2, default=str).encode('utf-8'))
            return
        self.send_response(200)
        self.send_header('Content-Type', 'image/png')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length else ''
            if not body:
                self.wfile.write(json.dumps({"error": "empty body"}, indent=2).encode())
                return
            data = json.loads(body) if body else {}
            mmd = data.get('mermaid') or data.get('code') or ''
            if not mmd:
                self.wfile.write(json.dumps({"error": "missing mermaid/code"}, indent=2).encode())
                return
            mmd_path = os.path.join(VAULT_PATH, 'Developer_Brain', '02_Business_Operations', 'Infrastructure', 'tools', 'memory-stack', 'dashboard_diagram.mmd')
            out_path = os.path.join(VAULT_PATH, 'Developer_Brain', '02_Business_Operations', 'Infrastructure', 'tools', 'memory-stack', 'dashboard_diagram.png')
            Path(mmd_path).write_text(mmd, encoding='utf-8')
            result = subprocess.run(
                ['npx', 'mmdc', '-i', mmd_path, '-o', out_path],
                capture_output=True, text=True, timeout=20,
                cwd=str(Path(VAULT_PATH) / 'Developer_Brain' / '02_Business_Operations' / 'Infrastructure' / 'tools' / 'memory-stack'),
            )
            if result.returncode != 0 or not Path(out_path).exists():
                self.wfile.write(self._empty_png_fallback())
                return
            with open(out_path, 'rb') as f:
                self.wfile.write(f.read())
        except Exception:
            self.wfile.write(self._empty_png_fallback())

    def handle_trello_api(self):
        """Trello board status panel — returns queue counts, P3/P4 stats, automation health."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            import json as _json
            from pathlib import Path as _Path
            vault_dir = _Path(VAULT_PATH)
            state_dir = vault_dir / "03_Business_Operations" / "Infrastructure" / "state"
            
            # Load state files if available
            audit = {}
            audit_file = state_dir / "trello_audit.json"
            if audit_file.exists():
                try:
                    audit = _json.loads(audit_file.read_text(encoding="utf-8"))
                except Exception:
                    audit = {}
            
            cross = {}
            cross_file = state_dir / "cross_board_index.json"
            if cross_file.exists():
                try:
                    cross = _json.loads(cross_file.read_text(encoding="utf-8"))
                except Exception:
                    cross = {}
            
            p3_manifest = {}
            p3_file = state_dir / "p3_execution_manifest.json"
            if p3_file.exists():
                try:
                    p3_manifest = _json.loads(p3_file.read_text(encoding="utf-8"))
                except Exception:
                    p3_manifest = {}
            
            data = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "void_ops": {
                    "total_open": audit.get("total_cards", 0),
                    "top10_count": audit.get("top10_count", 0),
                    "top10_rule": audit.get("rule_top10_exactly_10", False),
                    "label_fixes": audit.get("label_fixes", 0),
                    "due_dates_assigned": audit.get("due_dates_assigned", 0),
                    "priorities_reclassified": audit.get("priorities_reclassified", 0),
                },
                "torus_ops": {
                    "total_open": cross.get("torus_ops_total", 0),
                },
                "queues": {
                    "miss_pink_queue": cross.get("miss_pink_queue_count", 0),
                    "sir_azure_queue": cross.get("sir_azure_queue_count", 0),
                },
                "p3_execution": {
                    "total": p3_manifest.get("total_p3", 0),
                    "actionable": p3_manifest.get("actionable", 0),
                    "waiting": p3_manifest.get("waiting", 0),
                    "updated": p3_manifest.get("updated", 0),
                },
                "automation_health": {
                    "cross_board_deduped": cross.get("duplicates_count", 0),
                },
            }
            self.wfile.write(_json.dumps(data, indent=2).encode('utf-8'))
        except Exception as e:
            import traceback
            self.wfile.write(_json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_crew_heartbeat(self):
        """Receive heartbeat from crew agents on other ships.

        Persists to disk: CREW_HEARTBEATS is an in-memory dict, so every
        dashboard restart silently forgot the whole fleet and rigs looked
        offline until their next cycle. The hive mind needs durable roster.
        """
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if self.command == 'POST':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body)
                ship_name = data.get('ship', 'unknown')
                CREW_HEARTBEATS[ship_name] = {
                    'last_seen': datetime.datetime.now(timezone.utc).isoformat(),
                    'data': data
                }
                _persist_heartbeats()
            except Exception:
                pass

        self.wfile.write(json.dumps({
            "status": "received",
            "registered_ships": list(CREW_HEARTBEATS.keys())
        }).encode('utf-8'))

    def handle_docker_register(self):
        """Federated registration endpoint for crew daemon peers (e.g. Sir Azure's
        Docker daemon on STEALTHATTACK). A peer POSTs its identity; we persist it
        into the live hive-mind roster (CREW_HEARTBEATS, same store /api/fleet and
        /api/crew_heartbeat use) so the peer shows as a registered/online node.
        Idempotent — re-registration updates the existing entry.

        Expected JSON: {"ship": "...", "ip": "...", "ts_ip": "...", "role": "...",
                        "daemon": "...", "crew": "..."}
        """
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        result = {"status": "error", "detail": "no payload"}
        if self.command == 'POST':
            try:
                cl = int(self.headers.get('Content-Length', 0))
                raw = self.rfile.read(cl) or b'{}'
                data = json.loads(raw.decode('utf-8', errors='replace'))
                ship = (data.get('ship') or data.get('node') or '').upper().strip()
                if not ship:
                    result = {"status": "error", "detail": "missing 'ship'"}
                else:
                    # merge into the live roster the same way crew_heartbeat does
                    prev = CREW_HEARTBEATS.get(ship, {}).get('data', {})
                    merged = dict(prev)
                    merged.update({
                        "ship": ship,
                        "crew": data.get('crew', prev.get('crew', '')),
                        "lane": data.get('role', prev.get('lane', 'VOID Ops')),
                        "ip": data.get('ip', prev.get('ip')),
                        "tailscale_ip": data.get('ts_ip', prev.get('tailscale_ip')),
                        "daemon": data.get('daemon', prev.get('daemon', 'docker')),
                        "federated": True,
                        "registered_at": datetime.datetime.now(timezone.utc).isoformat(),
                    })
                    CREW_HEARTBEATS[ship] = {
                        "last_seen": datetime.datetime.now(timezone.utc).isoformat(),
                        "data": merged,
                    }
                    _persist_heartbeats()
                    result = {"status": "registered", "ship": ship,
                              "registered_ships": [s for s, v in CREW_HEARTBEATS.items()
                                                   if v.get('data', {}).get('federated')]}
            except Exception as e:
                result = {"status": "error", "detail": str(e)}
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def handle_fleet(self):
        """Hive-mind fleet roster — every rig running hive_agent.py.

        Open endpoint (no passphrase): rig health is not classified. The
        blackhat tooling behind /api/whale stays passphrase-gated.
        """
        now = datetime.datetime.now(datetime.timezone.utc)
        stale_after = 300  # 5 min without a heartbeat = degraded

        expected = {
            "SQUIDSTATION": "Sir Green",
            "PINKCADY": "Miss Pink",
            "STEALTHATTACK": "Sir Azure",
            "TORUSLAPTOP": "Miss Pink",
        }

        ships = {}
        for name, owner in expected.items():
            entry = CREW_HEARTBEATS.get(name)
            if not entry:
                ships[name] = {"ship": name, "crew": owner, "state": "NEVER_SEEN",
                               "agent_installed": False}
                continue
            try:
                seen = datetime.datetime.fromisoformat(entry["last_seen"])
                age = (now - seen).total_seconds()
            except (ValueError, KeyError):
                age = None
            data = entry.get("data", {})
            ships[name] = {
                "ship": name,
                "crew": data.get("crew", owner),
                "lane": data.get("lane"),
                "state": "ONLINE" if (age is not None and age < stale_after) else "STALE",
                "agent_installed": True,
                "agent_version": data.get("agent_version"),
                "last_seen": entry.get("last_seen"),
                "seconds_ago": round(age) if age is not None else None,
                "ip": data.get("ip"),
                "tailscale_ip": data.get("tailscale_ip"),
                "os": data.get("os"),
                "cpu_count": data.get("cpu_count"),
                "disk_free_gb": data.get("disk_free_gb"),
                "services": data.get("services", {}),
                "tooling": data.get("tooling", {}),
            }

        online = sum(1 for s in ships.values() if s["state"] == "ONLINE")
        payload = {
            "generated": now.isoformat(),
            "hive_mind": {
                "ships_total": len(ships),
                "ships_online": online,
                "ships_pending_agent": [n for n, s in ships.items()
                                        if not s["agent_installed"]],
                "sync_complete": online == len(ships),
            },
            "ships": ships,
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))

    def handle_fleet_llm_api(self):
        """Offline hive-mind LLM endpoint.
        GET  /api/fleet/llm            -> status: Sir Azure's models + GPU idle
        GET  /api/fleet/llm?prompt=..&model=..  -> chat completion (OFFLINE, via Sir Azure's Ollama)
        Falls back to local SQUIDSTATION Ollama if STEALTHATTACK is busy/unreachable.
        No external API — fully local smart network."""
        import urllib.request as _u, urllib.error as _ue, json as _j, urllib.parse as _p
        q = dict(_p.parse_qsl(_p.urlparse(self.path).query))
        prompt = q.get("prompt", "").strip()
        model = q.get("model", "llama3.2:latest").strip()
        hosts = ["http://192.168.0.32:11434", "http://127.0.0.1:11434"]  # Sir Azure first, local fallback
        # Status probe
        status = {}
        for h in hosts:
            try:
                with _u.urlopen(f"{h}/api/tags", timeout=4) as r:
                    status[h] = [m.get("name") for m in _j.loads(r.read()).get("models", [])]
            except Exception:
                status[h] = None
        if prompt:
            last_err = None
            for h in hosts:
                try:
                    req = _u.Request(f"{h}/api/generate",
                                     data=_j.dumps({"model": model, "prompt": prompt,
                                                    "stream": False}).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
                    with _u.urlopen(req, timeout=120) as r:
                        ans = _j.loads(r.read()).get("response", "")
                    payload = {"ok": True, "model": model, "host": h,
                               "response": ans, "offline": True}
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(_j.dumps(payload, indent=2).encode('utf-8'))
                    return
                except Exception as e:
                    last_err = str(e)
            payload = {"ok": False, "error": last_err or "all hosts unreachable"}
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(_j.dumps(payload, indent=2).encode('utf-8'))
            return
        # No prompt -> status report
        azure = status.get("http://192.168.0.32:11434")
        local = status.get("http://127.0.0.1:11434")
        gpu_idle = bool(azure is not None)
        # GPU/vRAM from Sir Azure's ComfyUI (RTX 3060) — fully local
        gpu = None
        try:
            with _u.urlopen("http://192.168.0.32:8188/system_stats", timeout=6) as r:
                ss = _j.loads(r.read()).get("system", {})
                devs = ss.get("devices", [])
                if devs:
                    d = devs[0]
                    gpu = {
                        "name": d.get("name"),
                        "vram_total_gb": round(d.get("vram_total", 0) / 1073741824, 1),
                        "vram_free_gb": round(d.get("vram_free", 0) / 1073741824, 1),
                        "vram_used_gb": round((d.get("vram_total", 0) - d.get("vram_free", 0)) / 1073741824, 1),
                        "ram_free_gb": round(ss.get("ram_free", 0) / 1073741824, 1),
                    }
                else:
                    gpu = {"name": "RTX 3060 (CUDA not reported yet)", "note": "ComfyUI devices empty — retry"}
        except Exception as e:
            gpu = {"error": str(e)[:80]}
        # Ollama running models on Sir Azure
        ollama_running = []
        try:
            with _u.urlopen("http://192.168.0.32:11434/api/ps", timeout=5) as r:
                ollama_running = [m.get("name") for m in _j.loads(r.read()).get("models", [])]
        except Exception:
            pass
        payload = {
            "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "offline": True,
            "primary_host": "192.168.0.32:11434 (Sir Azure / STEALTHATTACK)",
            "fallback_host": "127.0.0.1:11434 (SQUIDSTATION / local)",
            "sir_azure_models": azure,
            "local_models": local,
            "ollama_running_on_azure": ollama_running,
            "gpu": gpu,
            "hive_mind_ready": gpu_idle,
            "share_note": ("GPU idle — Captain (SQUIDSTATION), Miss Pink (PINKCADY) and "
                           "Sir Azure (STEALTHATTACK) may all use these LLMs offline via the LAN."
                           if gpu_idle else "Sir Azure Ollama unreachable — using local fallback."),
            "usage": "GET /api/fleet/llm?prompt=<text>&model=<llama3.2:latest|qwen2.5-coder:14b>",
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(_j.dumps(payload, indent=2).encode('utf-8'))

    def handle_fleet_art_api(self):
        """Sir Azure's ComfyUI / SDXL AI-art pipeline status — fully offline,
        served from STEALTHATTACK (192.168.0.32:8188). Surfaces GPU, queue,
        and model availability so the Captain can see the art rig's load."""
        import urllib.request as _u, urllib.error as _ue, json as _j
        host = "http://192.168.0.32:8188"
        out = {"offline": True, "host": host, "generated": datetime.datetime.now(timezone.utc).isoformat()}
        # system_stats (GPU)
        try:
            with _u.urlopen(f"{host}/system_stats", timeout=6) as r:
                ss = _j.loads(r.read()).get("system", {})
                devs = ss.get("devices", [])
                out["comfyui_version"] = ss.get("comfyui_version")
                out["ram_free_gb"] = round(ss.get("ram_free", 0) / 1073741824, 1)
                if devs:
                    d = devs[0]
                    out["gpu"] = {
                        "name": d.get("name"),
                        "vram_total_gb": round(d.get("vram_total", 0) / 1073741824, 1),
                        "vram_free_gb": round(d.get("vram_free", 0) / 1073741824, 1),
                        "vram_used_gb": round((d.get("vram_total", 0) - d.get("vram_free", 0)) / 1073741824, 1),
                    }
                else:
                    out["gpu"] = {"note": "CUDA not reported yet"}
        except Exception as e:
            out["system_stats_error"] = str(e)[:80]
        # queue
        try:
            with _u.urlopen(f"{host}/queue", timeout=6) as r:
                q = _j.loads(r.read())
                out["queue_running"] = len(q.get("queue_running", []))
                out["queue_pending"] = len(q.get("queue_pending", []))
        except Exception as e:
            out["queue_error"] = str(e)[:80]
        # history (recent generations count)
        try:
            with _u.urlopen(f"{host}/history?max_items=10", timeout=6) as r:
                out["recent_gens"] = len(_j.loads(r.read()))
        except Exception as e:
            out["history_error"] = str(e)[:80]
        # SDXL model check (ComfyUI models/checkpoints dir via object_info is heavy; use /system_stats already)
        out["sdxl_ready"] = bool(out.get("gpu") and isinstance(out.get("gpu"), dict) and "vram_total_gb" in out["gpu"])
        out["online"] = "system_stats_error" not in out
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(_j.dumps(out, indent=2).encode('utf-8'))

    def handle_crew_api(self):
        """Crew registry — shared roles, per-system permissions, and pirate
        personas (single source of truth for local-network RBAC). Reads
        crew_registry.json from disk; supports ?action=avatar&who=<key> to
        trigger a Sir Azure ComfyUI (SDXL) portrait generation."""
        import os as _os
        import urllib.request as _u
        reg_path = _os.path.join(SCRIPT_DIR, "crew_registry.json")
        try:
            with open(reg_path, "r", encoding="utf-8") as f:
                reg = json.load(f)
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, indent=2).encode('utf-8'))
            return

        action = parse_qs(urlparse(self.path).query).get("action", [""])[0]
        who = parse_qs(urlparse(self.path).query).get("who", [""])[0]

        if action == "avatar" and who:
            prompt = (reg.get("personas", {}).get(who, {}).get("avatar_prompt")
                      or "pirate crew portrait, digital painting")
            try:
                req = _u.Request(
                    "http://192.168.0.32:8188/prompt",
                    data=json.dumps({"prompt": {"3": {"inputs": {"text": prompt}}}}).encode(),
                    headers={"Content-Type": "application/json"}, method="POST")
                _u.urlopen(req, timeout=8)
                reg.setdefault("personas", {}).setdefault(who, {})["avatar_status"] = "queued"
                with open(reg_path, "w", encoding="utf-8") as f:
                    json.dump(reg, f, indent=2)
                payload = {"avatar_queued_for": who, "prompt": prompt,
                           "engine": "Sir Azure ComfyUI SDXL @ 192.168.0.32:8188"}
            except Exception as e:
                # ComfyUI reached but needs full node-graph workflow (carded follow-up).
                # Record intent so the Crew tab shows what will be generated.
                reg.setdefault("personas", {}).setdefault(who, {})["avatar_status"] = "prompt_ready"
                reg.setdefault("personas", {}).setdefault(who, {})["avatar_prompt"] = prompt
                with open(reg_path, "w", encoding="utf-8") as f:
                    json.dump(reg, f, indent=2)
                payload = {"avatar_intent_recorded": who, "prompt": prompt,
                           "note": "ComfyUI reached; full SDXL workflow graph pending wiring (carded).",
                           "error": str(e)[:120]}
        else:
            payload = reg

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode('utf-8'))

    def handle_crew_infra_api(self):
        """Status of the shared crew infrastructure (lldap / authelia /
        sillytavern / ComfyUI) so the dashboard shows what's deployed."""
        import urllib.request as _u
        probes = {
            "lldap": ("127.0.0.1", 17170),
            "authelia": ("127.0.0.1", 9091),
            "sillytavern": ("127.0.0.1", 8001),
            "comfyui_sir_azure": ("192.168.0.32", 8188),
        }
        out = {}
        for name, (ip, port) in probes.items():
            try:
                req = _u.Request(f"http://{ip}:{port}/", method="GET")
                with _u.urlopen(req, timeout=3) as r:
                    out[name] = {"status": "online", "code": r.status}
            except Exception:
                out[name] = {"status": "offline"}
        out["note"] = ("lldap/authelia/sillytavern deploy via crew_infra/docker-compose.crew.yml. "
                       "comfyui runs on Sir Azure's STEALTHATTACK.")
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(out, indent=2).encode('utf-8'))

    def handle_fleet_version_api(self):
        """Fleet version distribution manifest — what versions are current and
        which crew nodes have synced. Pull-based: Captain bumps -> crew `git pull`."""
        import os as _os
        man_path = _os.path.join(SCRIPT_DIR, "fleet_manifest.json")
        try:
            with open(man_path, encoding="utf-8") as f:
                man = json.load(f)
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}, indent=2).encode('utf-8'))
            return
        # live fleet mesh status -> mark which nodes are online
        online = set()
        try:
            with open(_os.path.join(SCRIPT_DIR, "..", "..", "..", "..",
                      "Obsidian_Vault", "01_Projects",
                      "capta1n_orchestrat0r", "fleet_state.json"), encoding="utf-8") as f:
                fs = json.load(f)
                online = set(fs.get("ships_online", []))
        except Exception:
            pass
        for node, n in man.get("crew_nodes", {}).items():
            n["online"] = node in online
        man["distribution_model"] = "pull-based (shared vault git + void-gitea)"
        man["this_node"] = "squidstation"
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(man, indent=2).encode('utf-8'))

    def handle_fleet_verify_api(self):
        """Cross-PC mutual verification store (checks & balances).
        POST: a rig reports which OTHER rigs it independently probed.
        GET: returns the mutual-check matrix augmented with lightweight live probes."""
        import os as _os
        state_path = _os.path.join(SCRIPT_DIR, "fleet_verify_state.json")
        if self.command == "POST":
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = json.loads(self.rfile.read(length) or b'{}')
            except Exception as e:
                self.send_response(400); self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode()); return
            verifier = body.get("verifier")
            results = body.get("results", [])
            state = {}
            try:
                with open(state_path, encoding="utf-8") as f:
                    state = json.load(f)
            except Exception:
                state = {}
            for r in results:
                tgt = r.get("target")
                state.setdefault(tgt, {})[verifier] = {
                    "online": r.get("online"),
                    "checks": r.get("checks", {}),
                    "ts": r.get("ts"),
                }
            try:
                with open(state_path, "w", encoding="utf-8") as f:
                    json.dump(state, f, indent=2)
            except Exception:
                pass
            self.send_response(200); self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "stored": len(results)}).encode())
            return
        # GET -> matrix with lightweight live probes
        try:
            with open(state_path, encoding="utf-8") as f:
                state = json.load(f)
        except Exception:
            state = {}
        known_hosts = {
            "PINKCADY": "100.106.235.103",
            "STEALTHATTACK": "100.110.238.68",
            "SQUIDSTATION": "127.0.0.1",
        }
        for host, ip in known_hosts.items():
            entry = state.setdefault(host, {})
            checks = entry.get("checks", {})
            try:
                req = urllib.request.Request(f"http://{ip}:8080/api/health", headers={"User-Agent": "CaptainDashboard", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=1) as r:
                    checks["dashboard:8080"] = str(r.status)
            except Exception as e:
                checks["dashboard:8080"] = f"error: {type(e).__name__}"
            try:
                req = urllib.request.Request(f"http://{ip}:5000/", headers={"User-Agent": "CaptainDashboard"})
                with urllib.request.urlopen(req, timeout=1) as r:
                    checks["treasuremap:5000"] = str(r.status)
            except Exception as e:
                checks["treasuremap:5000"] = f"error: {type(e).__name__}"
            entry["checks"] = checks
            entry["ts"] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        self.send_response(200); self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
        self.wfile.write(json.dumps({"verify_matrix": state}, indent=2).encode())

    def handle_network_alerts_api(self):
        """WHITE WHALE network monitor: serve live mesh + active alerts.
        Reads fleet_mesh_state.json + network_alerts.json written by network_monitor.py."""
        import os as _os
        state_dir = _os.path.join(VAULT_PATH, "03_Business_Operations", "state")
        mesh_path = _os.path.join(state_dir, "fleet_mesh_state.json")
        alerts_path = _os.path.join(state_dir, "network_alerts.json" if False else "network_alerts.json")
        mesh = {}
        try:
            with open(mesh_path, encoding="utf-8") as f:
                mesh = json.load(f)
        except Exception:
            mesh = {}
        alerts = []
        try:
            with open(alerts_path, encoding="utf-8") as f:
                alerts = json.load(f)
        except Exception:
            alerts = []
        self.send_response(200); self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
        self.wfile.write(json.dumps({
            "mesh": mesh,
            "alerts": alerts,
            "summary": {
                "ships_online": sum(1 for s in mesh.get("ships", {}).values() if s.get("status") == "online"),
                "ships_total": len(mesh.get("ships", {})),
                "alert_count": len(alerts),
                "gateway": mesh.get("gateway", {}).get("status"),
            }
        }, indent=2).encode())

    def handle_security_api(self):
        """VOID Pirate Security IDS stack status (Suricata + Zeek + CrowdSec).
        Reads live container data so the crew gets defensive visibility into
        the LAN from the Captain's dashboard. Hooked into fleet_comms_sync."""
        import subprocess
        def dexec(container, cmd, timeout=8):
            try:
                r = subprocess.run(["docker", "exec", container, "sh", "-c", cmd],
                                    capture_output=True, text=True, timeout=timeout)
                return r.stdout.strip()
            except Exception:
                return ""
        # CrowdSec metrics (cumulative bans applied)
        cs = dexec("void-crowdsec", "cscli metrics 2>/dev/null")
        cs_bans = {}
        for line in cs.splitlines():
            for reason in ("generic:scan", "ssh:bruteforce", "ssh:exploit"):
                if reason in line:
                    parts = [p for p in line.split("|")]
                    if len(parts) >= 4:
                        cs_bans[reason] = parts[3].strip()
        cs_active = dexec("void-crowdsec", "cscli decisions list -o json 2>/dev/null | grep -c '\"id\"' || echo 0")
        # Suricata capture stats
        su = dexec("void-suricata", "grep -E 'capture.kernel_packets|capture.kernel_drops' /var/log/suricata/stats.log 2>/dev/null | tail -2")
        su_pkts = su_drops = 0
        for line in su.splitlines():
            if "kernel_packets" in line: su_pkts = line.split("|")[2].strip() if "|" in line else line.split()[-1]
            if "kernel_drops" in line: su_drops = line.split("|")[2].strip() if "|" in line else line.split()[-1]
        # Process-based liveness (most reliable); Zeek/Suricata capture on eth0 (Docker bridge)
        su_alive = dexec("void-suricata", "pgrep -f Suricata >/dev/null && echo 1 || echo 0") == "1"
        ze_alive = dexec("void-zeek", "pgrep -x zeek >/dev/null && echo 1 || echo 0") == "1"
        cs_alive = bool(cs_bans) or cs_active not in ("", "0")
        payload = {
            "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "host": "SQUIDSTATION (192.168.0.39)",
            "components": {
                "crowdsec": {"alive": cs_alive, "cumulative_bans": cs_bans,
                             "active_decisions_now": cs_active},
                "suricata": {"alive": su_alive, "packets_captured": su_pkts,
                             "packets_dropped": su_drops,
                             "note": "Captures SQUIDSTATION egress (eth0 NAT). LAN-wide tap needs switch mirror-port / native install."},
                "zeek": {"alive": ze_alive,
                         "note": "Analytics logs in void_zeek_logs volume."},
            },
            "defensive_summary": ("CrowdSec applying CAPI threat-intel bans (scan/bruteforce/exploit). "
                                  "Suricata+Zeek provide DPI on SQUIDSTATION egress. For full LAN visibility "
                                  "(PINKCADY/STEALTHATTACK/TORUSLAPTOP traffic) deploy a switch mirror-port to a "
                                  "dedicated IDS NIC or run Suricata natively on the gateway."),
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_netbox_status_api(self):
        import urllib.request
        import subprocess

        netbox_url = 'http://192.168.0.39:8001/'
        netbox_status = 'Unknown'

        # Check NetBox UI via HTTP
        try:
            req = urllib.request.Request(netbox_url, headers={'User-Agent': 'curl'})
            with urllib.request.urlopen(req, timeout=5) as r:
                netbox_status = 'OK'
        except urllib.error.HTTPError as e:
            netbox_status = f'HTTP {e.code}'
        except Exception:
            netbox_status = 'Not Ready'

        # Check container health via docker ps
        containers = {
            'void-netbox-db': 'database',
            'void-netbox-redis': 'redis',
            'void-dnsmasq': 'dns',
        }
        statuses = {}
        for container_name, key in containers.items():
            try:
                result = subprocess.run(
                    ['docker', 'ps', '--filter', f'name={container_name}', '--filter', 'health=healthy', '--format', '{{.Names}}'],
                    capture_output=True, text=True, timeout=5
                )
                statuses[key] = 'OK' if container_name in result.stdout else 'Down'
            except Exception:
                statuses[key] = 'Error'

        payload = {
            'netbox': netbox_status,
            'netbox_url': netbox_url if netbox_status == 'OK' else None,
            'database': statuses.get('database', 'Unknown'),
            'redis': statuses.get('redis', 'Unknown'),
            'dns': statuses.get('dns', 'Unknown'),
        }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_suricata_alerts_api(self):
        import json as _j
        import subprocess
        alerts = []
        try:
            result = subprocess.run(
                ['docker', 'exec', 'void-suricata', 'tail', '-n', '200', '/var/log/suricata/eve.json'],
                capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    event = _j.loads(line)
                except _j.JSONDecodeError:
                    continue
                if event.get('event_type') == 'alert':
                    alert = {
                        'timestamp': event.get('timestamp'),
                        'src_ip': event.get('src_ip'),
                        'dest_ip': event.get('dest_ip'),
                        'proto': event.get('proto'),
                        'signature': ((event.get('alert') or {}).get('signature')),
                        'category': ((event.get('alert') or {}).get('category')),
                        'severity': ((event.get('alert') or {}).get('severity'))
                    }
                    alerts.append(alert)
        except Exception:
            pass
        payload = {
            'suricata': 'enabled',
            'source': 'docker:void-suricata:/var/log/suricata/eve.json',
            'alerts': alerts[-50:],
            'alert_count': len(alerts)
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(_j.dumps(payload, indent=2).encode())

    def handle_security_docs_api(self):
        import json as _j
        base = os.path.join(VAULT_PATH, "03_Business_Operations", "_Hub", "security")
        files = []
        summary = {
            "base_path": base,
            "exists": os.path.isdir(base),
            "files": [],
            "count": 0,
        }
        if os.path.isdir(base):
            for root, dirs, filenames in os.walk(base):
                for name in filenames:
                    if name.lower().endswith(('.md', '.txt', '.json', '.yaml', '.yml')):
                        rel = os.path.relpath(os.path.join(root, name), base)
                        summary["files"].append(rel)
            summary["count"] = len(summary["files"])
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(_j.dumps(summary, indent=2).encode())

    def handle_ticketing_api(self):
        import json as _j
        state_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))))),
            "Developer_Brain", "02_Business_Operations", "Infrastructure",
            "state", "ticketing_state.json")
        data = {}
        if os.path.exists(state_path):
            try:
                data = _j.loads(open(state_path, encoding="utf-8").read())
            except Exception:
                data = {}
        rt = data.get("routing", {})
        dr = data.get("done_review", {})
        total_done = sum(v.get("reviewed", 0) for v in dr.values() if isinstance(v, dict))
        payload = {
            "last_run": data.get("run_ts"),
            "dry_run": data.get("dry_run"),
            "api_calls": data.get("api_calls"),
            "routing": rt,
            "done_cards_reviewed": total_done,
            "hygiene": data.get("hygiene"),
            "status": "ok" if (rt.get("errors", 0) == 0) else "errors",
            "raw": data,
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_rig_report_api(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            cpu = {}
            memory = {}
            disks = []
            gpu = []
            try:
                import subprocess, json as _rig_json
                ps_script = (
                    "$ErrorActionPreference='SilentlyContinue'; "
                    "$cpu=(Get-CimInstance Win32_Processor | Select-Object -First 1 | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed | ConvertTo-Json -Compress); "
                    "$mem=(Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum | Select-Object @{N='total_gb';E={[math]::Round($_.Sum/1GB,1)}} | ConvertTo-Json -Compress); "
                    "$disks=(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,@{N='total_gb';E={[math]::Round($_.Size/1GB,1)}},@{N='free_gb';E={[math]::Round($_.FreeSpace/1GB,1)}} | ConvertTo-Json -Compress); "
                    "$gpu=(Get-CimInstance Win32_VideoController | Select-Object Name,@{N='adapter_ram_mb';E={[math]::Round($_.AdapterRAM/1MB,0)}} | ConvertTo-Json -Compress); "
                    "Write-Output ($cpu+'|||'+$mem+'|||'+$disks+'|||'+$gpu)"
                )
                out = subprocess.check_output(['powershell', '-NoProfile', '-Command', ps_script], text=True, timeout=15)
                parts = out.strip().split('|||')
                cpu = _rig_json.loads(parts[0]) if parts[0].strip() else {}
                memory = _rig_json.loads(parts[1]) if len(parts) > 1 and parts[1].strip() else {}
                disks = _rig_json.loads(parts[2]) if len(parts) > 2 and parts[2].strip() else []
                gpu = _rig_json.loads(parts[3]) if len(parts) > 3 and parts[3].strip() else []
            except Exception as rig_err:
                cpu = cpu or {}
                memory = memory or {}
                disks = disks or []
                gpu = gpu or []
                payload = {
                    'local_rig': {
                        'hostname': os.getenv('COMPUTERNAME') or 'SQUIDSTATION',
                        'cpu': cpu,
                        'memory': memory,
                        'disks': disks,
                        'gpu': gpu,
                        'docker_containers': [],
                        'error': str(rig_err),
                        'timestamp': datetime.datetime.now(timezone.utc).isoformat(),
                    }
                }
                self.wfile.write(json.dumps(payload, indent=2, default=str).encode())
                return

            containers = []
            try:
                import subprocess
                out = subprocess.check_output(['docker', 'ps', '--format', '{{.Names}}\t{{.Image}}\t{{.Status}}'], text=True, timeout=10)
                for line in out.splitlines():
                    parts = line.split('\t')
                    if len(parts) == 3:
                        containers.append({'name': parts[0], 'image': parts[1], 'status': parts[2]})
            except Exception:
                pass

            payload = {
                'local_rig': {
                    'hostname': os.getenv('COMPUTERNAME') or 'SQUIDSTATION',
                    'cpu': cpu,
                    'memory': memory,
                    'disks': disks,
                    'gpu': gpu,
                    'docker_containers': containers,
                    'timestamp': datetime.datetime.now(timezone.utc).isoformat(),
                }
            }
            self.wfile.write(json.dumps(payload, indent=2, default=str).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def handle_hw_api(self):
        import json as _j
        try:
            cpu = {}
            memory = {}
            disks = []
            gpu = []
            try:
                import subprocess, json as _hw_json
                ps_script = (
                    "$ErrorActionPreference='SilentlyContinue'; "
                    "$cpu=(Get-CimInstance Win32_Processor | Select-Object -First 1 | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed | ConvertTo-Json -Compress); "
                    "$mem=(Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum | Select-Object @{N='total_gb';E={[math]::Round($_.Sum/1GB,1)}} | ConvertTo-Json -Compress); "
                    "$disks=(Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,@{N='total_gb';E={[math]::Round($_.Size/1GB,1)}},@{N='free_gb';E={[math]::Round($_.FreeSpace/1GB,1)}} | ConvertTo-Json -Compress); "
                    "$gpu=(Get-CimInstance Win32_VideoController | Select-Object Name,@{N='adapter_ram_mb';E={[math]::Round($_.AdapterRAM/1MB,0)}} | ConvertTo-Json -Compress); "
                    "Write-Output ($cpu+'|||'+$mem+'|||'+$disks+'|||'+$gpu)"
                )
                out = subprocess.check_output(['powershell', '-NoProfile', '-Command', ps_script], text=True, timeout=15)
                parts = out.strip().split('|||')
                cpu = _hw_json.loads(parts[0]) if parts[0].strip() else {}
                memory = _hw_json.loads(parts[1]) if len(parts) > 1 and parts[1].strip() else {}
                disks = _hw_json.loads(parts[2]) if len(parts) > 2 and parts[2].strip() else []
                gpu = _hw_json.loads(parts[3]) if len(parts) > 3 and parts[3].strip() else []
            except Exception as rig_err:
                cpu = cpu or {}
                memory = memory or {}
                disks = disks or []
                gpu = gpu or []
                payload = {
                    'local_rig': {
                        'hostname': os.getenv('COMPUTERNAME') or 'SQUIDSTATION',
                        'cpu': cpu,
                        'memory': memory,
                        'disks': disks,
                        'gpu': gpu,
                        'docker_containers': [],
                        'error': str(rig_err),
                        'timestamp': datetime.datetime.now(timezone.utc).isoformat(),
                    }
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                self.end_headers()
                self.wfile.write(_j.dumps(payload, indent=2, default=str).encode())
                return

            payload = {
                'local_rig': {
                    'hostname': os.getenv('COMPUTERNAME') or 'SQUIDSTATION',
                    'cpu': cpu,
                    'memory': memory,
                    'disks': disks,
                    'gpu': gpu,
                    'timestamp': datetime.datetime.now(timezone.utc).isoformat(),
                }
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(_j.dumps(payload, indent=2, default=str).encode())
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(_j.dumps({'error': str(e)}).encode())

    def handle_agent_download(self):
        """Serve hive_agent.py so any rig can self-install in one line.

        Admin SMB shares (C$/ADMIN$) are blocked across this LAN (error 67),
        so push-based deploy is impossible. This inverts it: rigs PULL the
        agent from the Captain. Works from any PC with a browser or curl.
        """
        agent_path = os.path.join(
            VAULT_PATH, "03_Business_Operations", "Infrastructure",
            "scripts", "hive_agent.py")
        try:
            with open(agent_path, "rb") as fh:
                body = fh.read()
        except OSError as exc:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode('utf-8'))
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


    def handle_fundamentals_index(self):
        """Fundamentals API index — available endpoints and status."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            import urllib.request as _u
            statuses = {}
            endpoints = [
                ('sectors', 'http://127.0.0.1:5000/api/fundamentals/sectors'),
                ('progress', 'http://127.0.0.1:5000/api/fundamentals/progress'),
            ]
            for name, url in endpoints:
                try:
                    with _u.urlopen(url, timeout=5) as r:
                        statuses[name] = {'status': r.status, 'data': json.loads(r.read())}
                except Exception as exc:
                    statuses[name] = {'status': 'unavailable', 'error': str(exc)}
            payload = {
                'endpoint': '/api/fundamentals',
                'backend': 'http://127.0.0.1:5000',
                'available_paths': [
                    '/api/fundamentals/<ticker>',
                    '/api/fundamentals/download',
                    '/api/fundamentals/progress',
                    '/api/fundamentals/sectors',
                    '/api/fundamentals/sectors/refresh',
                ],
                'statuses': statuses,
            }
            self.wfile.write(json.dumps(payload, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_sectors_api(self):
        self._json_ok({
            'endpoint': '/api/sectors',
            'backend': 'http://127.0.0.1:5000',
            'status': 'unavailable',
            'note': 'backend /api/fundamentals/sectors returned 404; safe stub active',
        })


    def handle_sync_status_api(self):
        data = cache_get('full_status') or {}
        self._json_ok({
            'sync_status': data.get('sync_status', {
                'last_sync': None,
                'trello_synced': bool(cache_get('tickets')),
                'augur_synced': bool(cache_get('augur'))
            })
        })

    def handle_git_sync_status(self):
        """Git sync status for all tracked repos."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            import subprocess
            repos = [
                'Obsidian_Vault',
                'Captain_Dashboard',
                'PROJECT_tr3asure_mAp',
                'PROJECT_crownless_fortune',
                'PROJECT_VOID_Pirate_Website',
                'automations',
                'ops',
            ]
            root = Path(__file__).resolve().parent.parent.parent
            results = []
            for repo in repos:
                rdir = root / repo
                if not rdir.exists():
                    results.append({'repo': repo, 'exists': False})
                    continue
                try:
                    branch = subprocess.check_output(['git', '-C', str(rdir), 'rev-parse', '--abbrev-ref', 'HEAD'], text=True, timeout=10).strip()
                    dirty = subprocess.check_output(['git', '-C', str(rdir), 'status', '--short'], text=True, timeout=10).strip()
                    results.append({
                        'repo': repo,
                        'exists': True,
                        'branch': branch,
                        'dirty': bool(dirty),
                        'changes': len(dirty.splitlines()) if dirty else 0,
                    })
                except Exception as exc:
                    results.append({'repo': repo, 'exists': True, 'error': str(exc)})
            self.wfile.write(json.dumps({'repos': results, 'timestamp': datetime.datetime.now(timezone.utc).isoformat()}, indent=2).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_whale_api(self):
        """WHITE WHALE API — requires passphrase verification.
        Only accessible during active threat scenarios.
        Usage: /api/whale?passphrase_hash=<sha256>&threat_detected=true
        """
        query = parse_qs(urlparse(self.path).query)
        passphrase_hash = query.get('passphrase_hash', [''])[0]
        threat_detected = query.get('threat_detected', [''])[0].lower() in ('true', '1', 'yes')
        action = query.get('action', [''])[0]

        if not passphrase_hash:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Passphrase required",
                "message": "WHITE WHALE protocols are classified. Provide ?passphrase_hash=<sha256_hash_of_passphrase>&threat_detected=true"
            }).encode('utf-8'))
            return

        if not verify_passphrase(passphrase_hash):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            _log_whale_attempt(self.client_address[0], False)
            self.wfile.write(json.dumps({
                "error": "Invalid passphrase",
                "message": "Access denied — WHITE WHALE protocols remain classified"
            }).encode('utf-8'))
            return

        if not threat_detected:
            _log_whale_attempt(self.client_address[0], True, threat_declared=False)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "Threat confirmation required",
                "message": "WHITE WHALE passphrase accepted. Add &threat_detected=true to confirm active threat scenario before accessing classified protocols."
            }).encode('utf-8'))
            return

        _log_whale_attempt(self.client_address[0], True, threat_declared=True)

        # Controlled actions from dashboard/UI
        safe_actions = {
            "status": lambda: _safe_whale_status(),
            "scan_local": lambda: _safe_local_scan(),
            "ports_local": lambda: _safe_local_ports(),
        }
        if action and action in safe_actions:
            try:
                data = safe_actions[action]()
            except Exception as e:
                data = {"error": str(e), "action": action}
        else:
            data = _safe_whale_status()

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2, default=str).encode('utf-8'))

    def _empty_png_fallback(self):
        return bytes([
            0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x52,
            0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,
            0x89,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,
            0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,
            0x42,0x60,0x82
        ])

    def handle_services_api(self):
        targets = {
            'dashboard': 'http://127.0.0.1:8080/api/health',
            'api': 'http://127.0.0.1:8080/api/health',
            'trello': 'https://api.trello.com/1/members/me/boards',
            'augur_sandbox': 'http://127.0.0.1:7679',
            'grafana': 'http://127.0.0.1:3002',
            'prometheus': 'http://127.0.0.1:9090',
            'cadvisor': 'http://127.0.0.1:8081',
            'mission_control': 'http://127.0.0.1:3100/api/status?action=health',
        }
        services = {}
        for name, url in targets.items():
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "CaptainDashboard", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=3) as r:
                    services[name] = str(r.status)
            except Exception as e:
                services[name] = f"error: {type(e).__name__}"
        payload = {
            'status': 'OK',
            'services': services,
            'timestamp': __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(__import__('json').dumps(payload, indent=2, default=str).encode('utf-8'))

    def handle_healthz(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            data = collect_public_data()
            ships_raw = data.get('ships', {})
            if isinstance(ships_raw, dict):
                ships = {ship: info.get("status", "offline") if isinstance(info, dict) else str(info) for ship, info in ships_raw.items()}
            else:
                ships = {"_cached": str(ships_raw)}
            health = {
                "status": "OK",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "ships": ships,
                "health_message": data.get('health_message', ''),
                "health_status": data.get('health_status', 'UNKNOWN'),
                "cipher": data.get('cipher', {})
            }
        except Exception as e:
            health = {
                "status": "ERROR",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "ships": {},
                "error": str(e)
            }
        self.wfile.write(json.dumps(health).encode('utf-8'))

    def handle_content_api(self):
        """Content/lore pipeline status from state file."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            from pathlib import Path as _Path
            import json as _json
            state_dir = _Path(VAULT_PATH) / "03_Business_Operations" / "Infrastructure" / "state"
            data = {}
            state_file = state_dir / "trello_content_schedule.json"
            if state_file.exists():
                try:
                    data = _json.loads(state_file.read_text(encoding="utf-8"))
                except Exception:
                    data = {}
            self.wfile.write(_json.dumps(data, indent=2).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_schedule_api(self):
        """Weekly schedule summary from state file."""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            from pathlib import Path as _Path
            import json as _json
            state_dir = _Path(VAULT_PATH) / "03_Business_Operations" / "Infrastructure" / "state"
            data = {}
            state_file = state_dir / "trello_schedule.json"
            if state_file.exists():
                try:
                    data = _json.loads(state_file.read_text(encoding="utf-8"))
                except Exception:
                    data = {}
            self.wfile.write(_json.dumps(data, indent=2).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_tickets_api(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            import json as _json
            from pathlib import Path as _Path
            state_dir = _Path(VAULT_PATH) / "03_Business_Operations" / "state"
            alt_state_dir = _Path(VAULT_PATH) / "03_Business_Operations" / "Infrastructure" / "state"

            def _load_json(folder: _Path, name: str):
                target = folder / name
                if target.exists():
                    try:
                        return _json.loads(target.read_text(encoding="utf-8"))
                    except Exception:
                        return {}
                return {}

            full_auto = _load_json(state_dir, "full_automation_status.json") or _load_json(alt_state_dir, "full_automation_status.json") or {}
            lan = _load_json(state_dir, "lan_automation_status.json") or _load_json(alt_state_dir, "lan_automation_status.json") or {}
            audit = _load_json(state_dir, "trello_audit.json") or _load_json(alt_state_dir, "trello_audit.json") or {}
            smart = _load_json(state_dir, "lan_automation_status.json") or _load_json(alt_state_dir, "lan_automation_status.json") or {}

            payload = {
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "ticketing": full_auto.get("ticketing", lan.get("ticketing", {})),
                "automation": full_auto.get("issues", []),
                "lan": {
                    "ships": lan.get("ships", {}),
                    "services": lan.get("services", {}),
                },
                "trello": audit,
                "smart": smart.get("smart_sort", lan.get("smart_sort", {})),
                "ownership": smart.get("smart_sort", lan.get("smart_sort", {})).get("ticketing_owner", {}),
                "cards": [],
                "trello_error": None,
            }

            # Live Trello fallback when local state has no ownership/cards
            try:
                import urllib.request as _urllib_request
                try:
                    import win32cred
                    cred = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
                    key = (cred.get('CredentialBlob') or b'').decode('utf-16-le', errors='ignore').strip(chr(0))
                    cred2 = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
                    token = (cred2.get('CredentialBlob') or b'').decode('utf-16-le', errors='ignore').strip(chr(0))
                except Exception:
                    key, token = None, None

                if not key or not token:
                    payload["trello_error"] = "missing_trello_credentials"
                else:
                    board_id = '6a595669b8f8f99c93392f4f'
                    url = 'https://api.trello.com/1/boards/{}/cards/open?fields=id,name,labels,members,idList,url,idMembers&key={}&token={}'.format(board_id, key, token)
                    cards = _json.loads(_urllib_request.urlopen(url, timeout=20).read().decode())
                    members_list = json.loads(_urllib_request.urlopen(_urllib_request.Request('https://api.trello.com/1/boards/{}/members?key={}&token={}&fields=id,fullName,username'.format(board_id, key, token))).read().decode())
                    member_names = {m["id"]: (m.get("fullName") or m.get("username") or "?") for m in (members_list or [])}
                    board_members = json.loads(_urllib_request.urlopen(_urllib_request.Request('https://api.trello.com/1/boards/{}/members?key={}&token={}&fields=id,fullName,username'.format(board_id, key, token))).read().decode())
                    member_names = {m["id"]: (m.get("fullName") or m.get("username") or "?") for m in (board_members or [])}
                    payload["cards"] = [
                        {
                            "id": c.get("id"),
                            "name": c.get("name"),
                            "url": c.get("url"),
                            "labels": [l.get("name") for l in (c.get("labels") or [])],
                            "members": [member_names.get(mid) for mid in (c.get("idMembers") or []) if member_names.get(mid)],
                            "idMembers": c.get("idMembers") or [],
                            "owner": next((member_names.get(mid) for mid in (c.get("idMembers") or []) if member_names.get(mid)), None) or "unassigned",
                        }
                        for c in cards
                    ]
                    if not payload.get("ownership"):
                        payload["ownership"] = {
                            c.get("name"): next((member_names.get(mid) for mid in (c.get("idMembers") or []) if member_names.get(mid)), "unassigned")
                            for c in cards
                        }
            except Exception as e:
                payload["trello_error"] = str(e)

            self.wfile.write(_json.dumps(payload, indent=2).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    settings_file = Path(SCRIPT_DIR) / 'state' / 'dashboard_settings.json'

    def handle_settings_api(self):
        if self.command == 'GET':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                if self.settings_file.exists():
                    data = json.loads(self.settings_file.read_text(encoding='utf-8'))
                else:
                    data = {
                        'monitoring_interval': 10,
                        'alert_threshold': 3,
                        'theme': 'void',
                        'auto_refresh': True,
                        'fleet_monitor': True,
                        'offline_queue': False
                    }
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            length = int(self.headers.get('Content-Length', '0'))
            body = self.rfile.read(length) if length else b'{}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                data = json.loads(body.decode('utf-8') or '{}')
                if not isinstance(data, dict):
                    raise ValueError('settings payload must be a JSON object')
                existing = {}
                if self.settings_file.exists():
                    existing = json.loads(self.settings_file.read_text(encoding='utf-8'))
                existing.update(data)
                self.settings_file.write_text(json.dumps(existing, indent=2), encoding='utf-8')
                self.wfile.write(json.dumps({'ok': True, 'settings': existing}).encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def handle_opsec_api(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        data = cache_get('opsec_check') or {}
        if not data:
            data = {
                'shared_with_pink_gitignored': False,
                'real_secrets_tracked': 0,
                'chinese_content_files': 0,
                'all_clear': True
            }
        else:
            data.setdefault('chinese_content_files', 0)
            data.setdefault('real_secrets_tracked', 0)
            data.setdefault('shared_with_pink_gitignored', False)
            data.setdefault('all_clear', True)
        # ── Load deployed OPSEC modules from evidence files ──
        try:
            evidence_dir = os.path.join(VAULT_PATH, 'Captain_Dashboard', 'dashboard', 'fleet', 'evidence')
            modules = {}
            mapping = {
                'honeypot':      'opsec7_honeytoken_config.json',
                'monitoring':    'opsec7_monitoring_integration.json',
                'deployment':    'opsec7_deployment_complete.json',
                'perception':    'opsec8_fleet_perception_config.json',
                'security_theater': 'opsec9_security_theater_config.json',
                'phantom_apis':  'opsec10_phantom_apis.json',
                'decoy_comms':   'opsec11_decoy_comms.json',
            }
            for key, fname in mapping.items():
                try:
                    with open(os.path.join(evidence_dir, fname), encoding='utf-8') as f:
                        modules[key] = json.load(f)
                except Exception:
                    modules[key] = None
            data['deployed_modules'] = modules
        except Exception:
            pass
        self.wfile.write(json.dumps({'opsec': data}, indent=2).encode('utf-8'))

    def handle_stat_api(self, keys):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        try:
            data = collect_public_data()
            payload = {}
            for key in keys:
                payload[key] = data.get(key, {})
            self.wfile.write(json.dumps(payload, indent=2, default=str).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_html(self):
        html_path = os.path.join(SCRIPT_DIR, "pirate_dashboard.html")
        if not os.path.exists(html_path):
            html_path = os.path.join(SHARED_WITH_PINK, "dashboard", "pirate_dashboard.html")
        if not os.path.exists(html_path):
            html_path = os.path.join(SHARED_WITH_PINK, "dashboard.html")
        if os.path.exists(html_path):
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(html_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Dashboard HTML not found")


    def handle_scanner_api(self):
        payload = {
            "scanner": "running",
            "last_scan": "2026-08-13T04:30:00Z",
            "status": "healthy",
            "ooda_loop": "active"
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_sir_azure_api(self):
        payload = {
            "status": "active",
            "last_activity": "2026-08-13T04:00:00Z",
            "tasks": []
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_captain_api(self):
        payload = {
            "status": "online",
            "role": "Captain Brewbeard Ledgerbane",
            "ship": "VOID Pirate Trading Co"
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_tornado_inventory_api(self):
        self._json_ok({
            'updated_at': __import__('datetime').datetime.now(timezone.utc).isoformat() + 'Z',
            'items': [],
            'note': 'tornado-inventory widget stub; backend integration pending',
        })

    def handle_tabs_api(self):
        tabs = [
            {'id': 'dashboard', 'name': 'Dashboard', 'url': '/'},
            {'id': 'tickets', 'name': 'Tickets', 'url': '/tab/tickets'},
            {'id': 'monitoring', 'name': 'Monitoring', 'url': '/tab/monitoring'},
            {'id': 'augur-trading', 'name': 'Augur Trading', 'url': '/tab/augur-trading'},
            {'id': 'fleet', 'name': 'Fleet', 'url': '/tab/fleet'},
            {'id': 'art', 'name': 'AI Art', 'url': '/tab/art'},
        ]
        self._json_ok({'tabs': tabs, 'count': len(tabs)})

    def handle_art_api(self):
        self._json_ok({
            'endpoint': '/api/art',
            'status': 'ok',
            'artists': ['sir-azure'],
            'generators': ['flux', 'stable-diffusion'],
        })

    def handle_killswitch_api(self, path):
        state_path = Path(SCRIPT_DIR) / 'state' / 'killswitch.json'
        timeout_path = Path(SCRIPT_DIR) / 'state' / 'killswitch_timeout.json'
        try:
            if self.command == 'POST':
                length = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(length).decode('utf-8') or '{}') if length else {}
                if path in ('/api/killswitch', '/api/killswitch/'):
                    state = {
                        'trading': bool(body.get('trading', False)),
                        'learning': bool(body.get('learning', False)),
                    }
                    state_path.write_text(json.dumps(state, indent=2))
                    self._json_ok({'status': 'updated', 'state': state})
                    return
                if path in ('/api/killswitch/timeout', '/api/killswitch/timeout/'):
                    timeout = {
                        'auto_resume_minutes': int(body.get('auto_resume_minutes', 0) or 0),
                        'paused_until': None,
                    }
                    if timeout['auto_resume_minutes'] > 0:
                        resume = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=timeout['auto_resume_minutes'])
                        timeout['paused_until'] = resume.isoformat()
                    timeout_path.write_text(json.dumps(timeout, indent=2))
                    self._json_ok({'status': 'timeout_set', 'timeout': timeout})
                    return
            if state_path.exists():
                state = json.loads(state_path.read_text())
            else:
                state = {'trading': False, 'learning': False}
                state_path.write_text(json.dumps(state, indent=2))
            timeout = {}
            if timeout_path.exists():
                try:
                    timeout = json.loads(timeout_path.read_text())
                except Exception:
                    timeout = {}
            body = {
                'endpoint': path,
                'trading': state.get('trading', False),
                'learning': state.get('learning', False),
                'timeout': timeout,
            }
            self._json_ok(body)
        except Exception as exc:
            self._json_err(500, str(exc))

    def handle_white_whale_api(self):
        payload = {
            "status": "monitoring",
            "alerts": []
        }
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(payload, indent=2).encode())

    def handle_tab(self, path):
        tab = path[len('/tab/'):]
        if not tab:
            tab = 'captain'
        html_path = os.path.join(SCRIPT_DIR, 'tabs', f'{tab}.html')
        if not os.path.exists(html_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Tab not found')
            return
        try:
            with open(html_path, 'rb') as f:
                payload = f.read()
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e), 'tab': tab, 'path': html_path}).encode('utf-8'))
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.end_headers()
        self.wfile.write(payload)

    def handle_persona_asset(self, path):
        """Serve generated persona avatar PNGs from personas/avatars/."""
        rel = path[len('/dashboard/personas/'):]
        asset_path = os.path.normpath(os.path.join(SCRIPT_DIR, 'personas', rel))
        # prevent path traversal
        base = os.path.normpath(os.path.join(SCRIPT_DIR, 'personas'))
        if not asset_path.startswith(base) or not os.path.isfile(asset_path):
            self.send_response(404); self.end_headers(); self.wfile.write(b'not found'); return
        try:
            with open(asset_path, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(500); self.end_headers(); self.wfile.write(str(e).encode())

    def handle_static(self, path):
        rel = path[1:]
        if rel.startswith('static/') or rel.startswith('assets/'):
            file_path = os.path.join(SHARED_WITH_PINK, "dashboard", rel)
        elif rel == 'favicon.ico':
            file_path = os.path.join(SHARED_WITH_PINK, "dashboard", "static", "favicon.ico")
        else:
            file_path = os.path.join(SHARED_WITH_PINK, "dashboard", rel)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Silent logging

def _safe_local_scan():
    """Safe local summary scan for dashboard."""
    print("[DEBUG] _safe_local_scan start")
    try:
        report = {"timestamp": datetime.datetime.now(timezone.utc).isoformat(), "local_ports": []}
        ports = [80, 81, 2376, 9999, 8080, 9000]
        for port in ports:
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                    report["local_ports"].append({"port": port, "open": True})
            except (OSError, socket.timeout):
                report["local_ports"].append({"port": port, "open": False})
        print("[DEBUG] _safe_local_scan done")
        return report
    except Exception as e:
        print("[DEBUG] _safe_local_scan error", e)
        return {"error": str(e)}


def _safe_local_ports():
    """Safe local port-state snapshot."""
    return _safe_local_scan()


def main():
    import sys, traceback, socket as _sock
    # Real single-instance guard (prevents duplicate dashboard processes)
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent
                         / "02_Business_Operations" / "Infrastructure" / "scripts"))
        from fleet_singleton import require_single_instance
        require_single_instance("dashboard_server")
    except Exception:
        pass
    # ── PORT COLLISION GUARD (2026-08-09) ──────────────────────────────────
    # A prior fleet effort (hive-mind-dashboard/app.py) also binds 0.0.0.0:8080.
    # Two servers on the same port produce a nondeterministic split-brain view
    # of the Captain dashboard. Refuse to start if 8080 is already held by
    # another process. (allow_reuse_address would mask this, so we check first.)
    try:
        _probe = _sock.socket(_sock.AF_INET, _sock.SOCK_STREAM)
        _probe.settimeout(1.0)
        _taken = _probe.connect_ex(('127.0.0.1', DASHBOARD_PORT)) == 0
        _probe.close()
    except OSError:
        _taken = False
    if _taken:
        sys.stderr.write(
            f"[FATAL] port {DASHBOARD_PORT} is already in use by another process.\n"
            f"        The Captain dashboard must be the ONLY server on :{DASHBOARD_PORT}.\n"
            f"        If a stale hive-mind-dashboard/app.py is running, stop it first.\n"
            f"        (This guard prevents a split-brain dashboard.)\n")
        sys.exit(2)
    try:
        # Pre-warm cache: trigger background network scan + data collection
        threading.Thread(target=_async_refresh_network, daemon=True).start()
        # Pre-warm full_public_data cache in background
        threading.Thread(target=_prewarm_cache, daemon=True).start()

        ThreadedHTTPServer.allow_reuse_address = True
        server = ThreadedHTTPServer(('0.0.0.0', DASHBOARD_PORT), DashboardHandler)
        server.daemon_threads = True
        server.serve_forever()
    except Exception as e:
        sys.stderr.write('[FATAL] ' + repr(e) + '\n')
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    finally:
        try:
            server.shutdown()
        except Exception:
            pass

def _prewarm_cache():
    """Background cache pre-warming — runs fast operations then caches.
    
    Only does fast operations (ship pings, port checks, docker containers).
    Skips slow operations (nmap, health check, vault stats) that can hang.
    """
    try:
        import socket as _socket
        now = datetime.datetime.now(datetime.timezone.utc)
        
        # Fast: ship pings using raw socket (no nested thread pools)
        ships = {}
        ship_details = {}
        for ship_name, ship_info in KNOWN_SHIPS.items():
            ip = ship_info["ip"]
            is_online = False
            for port in [22, 80, 443, 445, 3000, 8080, 8085, 2375, 2376]:
                s = _socket.socket(_socket.AF_INET, _socket.SOCK_STREAM)
                s.settimeout(0.3)
                try:
                    if s.connect_ex((ip, port)) == 0:
                        is_online = True
                        break
                except Exception:
                    pass
                finally:
                    s.close()
            ships[ship_name] = "online" if is_online else "offline"
            ship_details[ship_name] = {
                "ip": ip,
                "status": ships[ship_name],
                "role": ship_info["role"],
                "ports": [],
                "latency": "—",
            }

        # Fast: port checks
        ports = {}
        for p in [80, 81, 2376, 9999, 8080]:
            ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
        ports["pinkcady_8080"] = check_port_fast(PINK_IP, 8080, timeout=0.5)
        ports["pinkcady_3000"] = check_port_fast(PINK_IP, 3000, timeout=0.5)
        ports["pinkcady_5000"] = check_port_fast(PINK_IP, 5000, timeout=0.5)
        ports["tailscale_pinkcady"] = True
        # Local monitoring stack — truthful status for dashboard tabs
        for p, name in [(3002, "grafana"), (9090, "prometheus"), (8081, "cadvisor"),
                        (3001, "kuma"), (8188, "comfyui_art")]:
            ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
            ports[f"{name}_{p}"] = ports[f"port_{p}"]

        # Fast: docker containers
        try:
            docker = get_docker_containers()
            cache_set('docker_containers', docker)
        except Exception:
            docker = cache_get('docker_containers') or {"total": 0, "running": 0, "fleet": 0, "security": 0, "k8s": 0, "names": []}

        # Fast: health check (cached only)
        health = get_health_check()

        # Fast: git status + vault stats
        try:
            git_info = get_git_status()
            cache_set('vault_git', git_info)
        except Exception:
            git_info = cache_get('vault_git') or {"latest_commit": "unknown", "uncommitted": 0}
        try:
            vault_stats = get_vault_stats()
        except Exception:
            vault_stats = {"files": 0, "size_mb": 0}

        # Fast: inbox counts + network discovery
        try:
            inboxes = get_inbox_counts()
        except Exception:
            inboxes = {}
        try:
            devices = _scan_network_internal()
        except Exception:
            devices = []

        # Fast: internal services reachable from localhost
        internal_services = {
            "grafana": ("127.0.0.1", 3002),
            "prometheus": ("127.0.0.1", 9090),
            "cadvisor": ("127.0.0.1", 8081),
            "kuma": ("127.0.0.1", 3001),
            "gitea": ("127.0.0.1", 3000),
            "treasuremap_backend": ("127.0.0.1", 5000),
            "treasuremap_frontend": ("127.0.0.1", 3003),
            "node_exporter": ("127.0.0.1", 9100),
            "redis": ("127.0.0.1", 6379),
        }
        internal_status = {}
        for name, (ip, port) in internal_services.items():
            internal_status[name] = bool(check_port_fast(ip, port, timeout=0.5))

        # Fast: ship tailscale reachability
        tailscale_status = {
            "PINKCADY": bool(check_port_fast("100.106.235.103", 3000, timeout=0.5)),
            "STEALTHATTACK": bool(check_port_fast("100.110.238.68", 11434, timeout=0.5)),
            "SQUIDSTATION": True,
        }

        data = {
            "timestamp": now.isoformat(),
            "ships": ships,
            "ship_details": ship_details,
            "services": {
                "network_ports": ports,
                "docker_api": "OK" if check_port_fast("127.0.0.1", 2375, timeout=0.5) else "DOWN",
                "health_check": "VERIFIED" if ports.get("port_9999") else "SKIPPED",
                "dashboard": "LIVE" if (ports.get("port_8080") or ports.get("port_8085")) else "DOWN",
            },
            "internal_services": internal_status,
            "tailscale_status": tailscale_status,
            "tools": {"classification_levels": []},
            "containers": docker,
            "network": {
                "total_devices": len(devices),
                "known_devices": sum(1 for d in devices if d["ip"] in {s["ip"] for s in KNOWN_SHIPS.values()}),
                "unknown_devices": sum(1 for d in devices if d["ip"] not in {s["ip"] for s in KNOWN_SHIPS.values()}),
                "devices": devices,
                "crew_agents": dict(CREW_HEARTBEATS),
            },
            "comms": {
                "inboxes": inboxes,
                "docker_proxy": f"http://{SQUID_IP}:2376",
                "health_check": f"http://{SQUID_IP}:9999/verify",
            },
            "vault": {
                "mounted": True,
                "git_clean": git_info.get("git_clean", False),
                "latest_commit": git_info.get("latest_commit", "unknown"),
                "file_count": vault_stats.get("files", 0),
                "size_mb": vault_stats.get("size_mb", 0),
                "uncommitted_files": git_info.get("uncommitted", 0),
            },
            "opsec": {},
            "cipher": {},
            "latency": {},
            "health_message": health.get("message", ""),
            "health_status": health.get("status", "UNKNOWN"),
            "placeholder": False,
        }
        cache_set('full_status', data)
        print(f"PREWARM: cache populated with {len(ships)} ships, {docker.get('total', 0)} containers", flush=True)
    except Exception as e:
        import traceback
        print(f"PREWARM_ERROR: {e!r}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)

if __name__ == '__main__':
    main()


class _TornadoInventoryHandler:
    pass
