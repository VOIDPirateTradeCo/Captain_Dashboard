#!/usr/bin/env python3
"""
Crew Agent Runtime Connector — STEALTHATTACK / PINKCADY / SQUIDSTATION
Registers + heartbeats this Hermes crew agent to Mission Control.
"""

import json
import os
import sys
import time
import urllib3
from datetime import datetime
import requests

# --- Config ---
MC_URL = os.getenv("MC_URL", "http://localhost:3100")
MC_API_KEY = os.getenv("MC_API_KEY", "")
AGENT_ID = os.getenv("AGENT_ID", os.getenv("COMPUTERNAME", "unknown").lower())
AGENT_NAME = os.getenv("AGENT_NAME", AGENT_ID)
AGENT_ROLE = os.getenv("AGENT_ROLE", "agent")
FRAMEWORK = "hermes"
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "60"))

# Optional crew context
SHIP = os.getenv("SHIP", AGENT_ID)
CAPABILITIES = os.getenv("CAPABILITIES", "code,review,ops").split(",")
CURRENT_TASK = os.getenv("CURRENT_TASK", "")
STATUS = os.getenv("STATUS", "idle")

urllib3.disable_warnings()

# --- MC helpers ---
def mc_headers():
    h = {"Content-Type": "application/json"}
    if MC_API_KEY:
        h["x-api-key"] = MC_API_KEY
    return h

def register():
    payload = {
        "name": AGENT_ID,
        "role": AGENT_ROLE,
        "capabilities": [c.strip() for c in CAPABILITIES if c.strip()],
        "framework": FRAMEWORK,
    }
    try:
        r = requests.post(
            f"{MC_URL}/api/agents/register",
            headers=mc_headers(),
            json=payload,
            timeout=10,
            verify=False,
        )
        print(f"[{datetime.now().isoformat()}] register -> {r.status_code} {r.text[:200]}")
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] register FAILED: {e}")
        return False

def heartbeat():
    payload = {
        "connection_id": f"{AGENT_ID}:runtime",
        "status": STATUS,
        "last_activity": CURRENT_TASK or f"{AGENT_NAME} heartbeat",
        "token_usage": None,
        "ship": SHIP,
        "framework": FRAMEWORK,
        "agent_name": AGENT_NAME,
    }
    try:
        r = requests.post(
            f"{MC_URL}/api/agents/{AGENT_ID}/heartbeat",
            headers=mc_headers(),
            json=payload,
            timeout=10,
            verify=False,
        )
        print(f"[{datetime.now().isoformat()}] heartbeat -> {r.status_code} {r.text[:200]}")
        return r.status_code == 200
    except Exception as e:
        print(f"[{datetime.now().isoformat()}] heartbeat FAILED: {e}")
        return False

# --- Main loop ---
def main():
    print(f"=== Crew Agent Runtime Connector ===")
    print(f"Agent: {AGENT_ID} ({AGENT_NAME})")
    print(f"Ship: {SHIP}")
    print(f"MC: {MC_URL}")
    print(f"Interval: {HEARTBEAT_INTERVAL}s")
    print()

    # Initial register
    if not register():
        print("Initial registration failed; retrying in next loop.")

    # Heartbeat loop
    while True:
        try:
            heartbeat()
        except KeyboardInterrupt:
            print("Stopping.")
            sys.exit(0)
        except Exception as e:
            print(f"Loop error: {e}")
        time.sleep(HEARTBEAT_INTERVAL)

if __name__ == "__main__":
    main()
