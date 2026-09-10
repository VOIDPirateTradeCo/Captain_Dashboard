#!/usr/bin/env python3
"""
Crew agent self-registration script.

Reads agents/crew.json and registers each agent with Master MC.
Includes capability-based routing metadata (art, music, voice, code, review).

Pure stdlib, Python 3.11+, no external deps.
"""
import json
import sys
import os
import socket
from pathlib import Path
from urllib import request, error, parse

# --- Configuration ---
DEFAULT_MC_HOST = "http://192.168.0.39:3100"
DEFAULT_API_KEY = "d5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f"

MC_HOST = os.environ.get("MASTER_MC_HOST", DEFAULT_MC_HOST)
API_KEY = os.environ.get("MC_API_KEY", DEFAULT_API_KEY)

# Capability routing table: capability -> hint metadata for dispatcher
CAPABILITY_ROUTES = {
    "art":       {"pool": "creative", "gpu": True, "priority": 2},
    "music":     {"pool": "creative", "gpu": True, "priority": 2},
    "voice":     {"pool": "creative", "gpu": True, "priority": 2},
    "code":      {"pool": "compute",  "gpu": False, "priority": 1},
    "review":    {"pool": "compute",  "gpu": False, "priority": 1},
    "ops":       {"pool": "infra",    "gpu": False, "priority": 3},
    "security":  {"pool": "infra",    "gpu": False, "priority": 3},
    "workflow":  {"pool": "general",  "gpu": False, "priority": 2},
    "automation":{"pool": "general",  "gpu": False, "priority": 2},
    "n8n":       {"pool": "general",  "gpu": False, "priority": 2},
    "gpu":       {"pool": "creative", "gpu": True,  "priority": 1},
}

CAPABILITY_FILE = Path(__file__).parent.parent / "crew.json"


def load_crew(path: Path) -> dict:
    """Load crew definitions from JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def resolve_ip(hostname: str) -> str:
    """Resolve hostname to IP address."""
    try:
        return socket.gethostbyname(hostname)
    except socket.gaierror:
        return "127.0.0.1"


def api_call(method: str, path: str, data: dict | None = None, cookie: str | None = None) -> tuple[int, dict]:
    """Make an authenticated API call to Master MC.

    Returns (status_code, response_body).
    """
    url = f"{MC_HOST}{path}"
    body = json.dumps(data).encode() if data else None
    headers = {
        "Content-Type": "application/json",
        "x-agent-api-key": API_KEY,
    }
    if cookie:
        headers["Cookie"] = cookie
    req = request.Request(url, data=body, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except error.HTTPError as e:
        raw = e.read()
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {"error": raw.decode("utf-8", errors="replace")}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def get_session_cookie() -> str | None:
    """Authenticate as captain and return the session cookie string, or None on failure."""
    status, data = api_call("POST", "/api/auth/login", {
        "username": "captain",
    })
    if status in (200, 201):
        # Server may return a Set-Cookie header via urllib — we need to extract it.
        # Since urllib doesn't expose headers directly on urlopen without effort,
        # we fall back to API-key auth for subsequent calls.
        return None
    # If login fails, we still proceed with API-key auth
    return None


def build_routes(capabilities: list[str]) -> list[dict]:
    """Build capability routing metadata for an agent."""
    routes = []
    for cap in capabilities:
        entry = CAPABILITY_ROUTES.get(cap.lower())
        if entry:
            routes.append({"capability": cap, **entry})
        else:
            routes.append({"capability": cap, "pool": "general", "gpu": False, "priority": 5})
    return routes


def register_agent(agent: dict, session_cookie: str | None = None) -> bool:
    """Register a single agent with Master MC.

    Tries the node/register endpoint first (API-key auth),
    falls back to /api/agents/register (session-cookie auth).
    """
    hostname = agent["hostname"]
    ip = resolve_ip(hostname)
    routes = build_routes(agent["capabilities"])

    # Payload for the standard agent register endpoint
    payload = {
        "name": agent["name"],
        "hostname": hostname,
        "ip": ip,
        "capabilities": agent["capabilities"],
        "routes": routes,
    }

    # Try node/register endpoint (used by crew_heartbeat.py pattern)
    status, resp = api_call("POST", "/api/agents/node/register", payload, session_cookie)
    if status in (200, 201):
        return True

    # Fallback: try the generic agents/register endpoint
    status, resp = api_call("POST", "/api/agents/register", payload, session_cookie)
    if status in (200, 201):
        return True

    return False


def heartbeat_agent(agent: dict) -> bool:
    """Send a one-shot heartbeat to confirm the agent is live."""
    name = agent["name"]
    path = f"/api/agents/node/{parse.quote(name)}/heartbeat"
    status, _ = api_call("POST", path, {"status": "online"})
    return status == 200


def main():
    crew_file = Path(__file__).parent.parent / "crew.json"

    if not crew_file.exists():
        print(f"ERROR: crew file not found at {crew_file}")
        sys.exit(1)

    crew = load_crew(crew_file)
    master_cfg = crew.get("master_mc", {})
    global MC_HOST, API_KEY
    MC_HOST = master_cfg.get("host", MC_HOST)
    API_KEY = master_cfg.get("api_key", API_KEY)

    agents = crew.get("agents", [])
    if not agents:
        print("WARNING: No agents defined in crew.json")
        sys.exit(0)

    print(f"Crew Registration — Master MC: {MC_HOST}")
    print(f"Agents to register: {len(agents)}")
    print("-" * 50)

    # Attempt session auth (optional — API key is primary)
    session_cookie = get_session_cookie()

    success_count = 0
    for agent in agents:
        name = agent["name"]
        hostname = agent["hostname"]
        caps = agent["capabilities"]
        ip = resolve_ip(hostname)

        print(f"\n  [{name}] {hostname} ({ip})")
        print(f"    Capabilities: {', '.join(caps)}")

        if register_agent(agent, session_cookie):
            print(f"    Register: ✓")
            # Send initial heartbeat
            if heartbeat_agent(agent):
                print(f"    Heartbeat: ✓")
            else:
                print(f"    Heartbeat: ✗ (will retry on next cycle)")
            success_count += 1
        else:
            print(f"    Register: ✗")

    print("-" * 50)
    print(f"Registered {success_count}/{len(agents)} agents")

    if success_count < len(agents):
        sys.exit(1)


if __name__ == "__main__":
    main()
