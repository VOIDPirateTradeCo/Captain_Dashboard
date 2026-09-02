#!/usr/bin/env python3
"""
VOID Crew API — Local Network Operations
Classification: CREW ONLY / WHITE WHALE gated
Port: 8090
"""

from flask import Flask, request, jsonify, Response
import json
import os
import subprocess
import socket
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

app = Flask(__name__)

# --- Configuration ---
VAULT_ROOT = Path(r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault")
WHITE_WHALE_PASSPHRASE = "The world is ending tomorrow, let's go on a date today."
WHITE_WHALE_HASH = "5d41402abc4b2a76b9719d911017c592"  # SHA256 of first half for demo

# --- In-memory state ---
crew_status = {
    "sirgreen": {"status": "online", "last_seen": datetime.now(timezone.utc).isoformat()},
    "misspink": {"status": "offline", "last_seen": None},
    "sirazure": {"status": "offline", "last_seen": None},
    "sircobalt": {"status": "offline", "last_seen": None},
    "sirviolet": {"status": "offline", "last_seen": None},
    "gordon": {"status": "online", "last_seen": datetime.now(timezone.utc).isoformat()},
}

discovery_cache = {"devices": [], "last_scan": None}
whale_unlocks = {}

# --- Helpers ---
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def is_whale_unlocked(session_id):
    return whale_unlocks.get(session_id, {}).get("unlocked", False)

def check_whale_passphrase(passphrase):
    return passphrase == WHITE_WHALE_PASSPHRASE

# --- Core Endpoints ---
@app.route("/healthz")
def healthz():
    return jsonify({"status": "OK", "service": "void-crew-api", "timestamp": now_iso()}), 200

@app.route("/api/status")
def api_status():
    return jsonify({
        "service": "void-crew-api",
        "version": "0.1.0",
        "timestamp": now_iso(),
        "crew_online": sum(1 for c in crew_status.values() if c["status"] == "online"),
        "whale_protocol": "ACTIVE",
        "endpoints": [
            "/api/crew/status",
            "/api/network/discover",
            "/api/tools/encrypt",
            "/api/tools/decrypt",
            "/api/whale/unlock",
            "/api/whale/status",
            "/api/printer/discover",
            "/api/tv/discover",
        ]
    }), 200

# --- Crew Management ---
@app.route("/api/crew/status", methods=["GET", "POST"])
def crew_status_route():
    if request.method == "POST":
        data = request.get_json(force=True)
        crew_id = data.get("crew_id", "").lower()
        if crew_id in crew_status:
            crew_status[crew_id]["status"] = "online"
            crew_status[crew_id]["last_seen"] = now_iso()
            return jsonify({"ok": True, "crew_id": crew_id}), 200
        return jsonify({"error": "Unknown crew_id"}), 404
    return jsonify({"crew": crew_status, "timestamp": now_iso()}), 200

# --- Network Discovery ---
@app.route("/api/network/discover", methods=["POST"])
def network_discover():
    """Scan local subnet for devices."""
    subnet = request.get_json(force=True).get("subnet", "192.168.0.0/24")
    devices = []
    
    # Quick ping sweep of common IPs
    base = "192.168.0."
    for i in range(1, 50):
        ip = f"{base}{i}"
        try:
            socket.setdefaulttimeout(0.3)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect((ip, 445))
            s.close()
            devices.append({"ip": ip, "ports": [445], "status": "up"})
        except (socket.timeout, ConnectionRefusedError, OSError):
            pass
    
    discovery_cache["devices"] = devices
    discovery_cache["last_scan"] = now_iso()
    return jsonify({"devices": devices, "total": len(devices), "subnet": subnet}), 200

# --- Encryption Tools (TIDAL TONGUE) ---
@app.route("/api/tools/encrypt", methods=["POST"])
def encrypt_message():
    """Caesar +3 pirate cipher."""
    data = request.get_json(force=True)
    text = data.get("text", "")
    shift = 3
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base + shift) % 26 + base)
        else:
            result += char
    return jsonify({"encrypted": result, "cipher": "TIDAL_TONGUE", "timestamp": now_iso()}), 200

@app.route("/api/tools/decrypt", methods=["POST"])
def decrypt_message():
    """Reverse Caesar +3 pirate cipher."""
    data = request.get_json(force=True)
    text = data.get("text", "")
    shift = 3
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base - shift) % 26 + base)
        else:
            result += char
    return jsonify({"decrypted": result, "cipher": "TIDAL_TONGUE", "timestamp": now_iso()}), 200

# --- WHITE WHALE Protocol ---
@app.route("/api/whale/unlock", methods=["POST"])
def whale_unlock():
    """Unlock WHITE WHALE tools with passphrase."""
    data = request.get_json(force=True)
    passphrase = data.get("passphrase", "")
    session_id = data.get("session_id", "default")
    
    if check_whale_passphrase(passphrase):
        whale_unlocks[session_id] = {
            "unlocked": True,
            "timestamp": now_iso(),
            "crew": "Captain"
        }
        return jsonify({"unlocked": True, "protocol": "WHITE WHALE", "message": "Top-secret tools accessible"}), 200
    return jsonify({"unlocked": False, "error": "Invalid passphrase"}), 403

@app.route("/api/whale/status", methods=["GET"])
def whale_status():
    session_id = request.args.get("session_id", "default")
    unlocked = is_whale_unlocked(session_id)
    return jsonify({"unlocked": unlocked, "protocol": "WHITE WHALE", "timestamp": now_iso()}), 200

# --- Printer/Scanner Discovery ---
@app.route("/api/printer/discover", methods=["POST"])
def discover_printer():
    """Discover network printers via SNMP/Bonjour."""
    data = request.get_json(force=True) or {}
    subnet = data.get("subnet", "192.168.0.0/24")
    
    # Check common printer ports
    printer_ports = [9100, 515, 631, 5353]
    found = []
    
    for i in range(1, 50):
        ip = f"192.168.0.{i}"
        open_ports = []
        for port in printer_ports:
            try:
                socket.setdefaulttimeout(0.5)
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect((ip, port))
                s.close()
                open_ports.append(port)
            except:
                pass
        
        if open_ports:
            found.append({"ip": ip, "ports": open_ports, "type": "printer"})
    
    return jsonify({"printers": found, "total": len(found), "subnet": subnet}), 200

# --- Samsung TV Discovery ---
@app.route("/api/tv/discover", methods=["POST"])
def discover_tv():
    """Discover Samsung smart TVs on network."""
    data = request.get_json(force=True) or {}
    subnet = data.get("subnet", "192.168.0.0/24")
    
    # Samsung TVs typically use ports 8001, 8002, 55000
    tv_ports = [8001, 8002, 55000]
    found = []
    
    for i in range(1, 50):
        ip = f"192.168.0.{i}"
        open_ports = []
        for port in tv_ports:
            try:
                socket.setdefaulttimeout(0.5)
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.connect((ip, port))
                s.close()
                open_ports.append(port)
            except:
                pass
        
        if open_ports:
            found.append({"ip": ip, "ports": open_ports, "type": "samsung_tv"})
    
    return jsonify({"tvs": found, "total": len(found), "subnet": subnet}), 200

# --- WHITE WHALE Restricted Tools ---
@app.route("/api/whale/rdp/screenshot", methods=["POST"])
def whale_rdp_screenshot():
    """Capture RDP screenshot (requires WHITE WHALE unlock)."""
    if not is_whale_unlocked(request.json.get("session_id", "")):
        return jsonify({"error": "WHITE WHALE passphrase required"}), 403
    
    target = request.json.get("target", "")
    return jsonify({
        "action": "rdp_screenshot",
        "target": target,
        "status": "simulated",
        "note": "Requires RDP credentials and win32gui on target",
        "timestamp": now_iso()
    }), 200

@app.route("/api/whale/password/scan", methods=["POST"])
def whale_password_scan():
    """Scan for exposed passwords in local network (requires WHITE WHALE)."""
    if not is_whale_unlocked(request.json.get("session_id", "")):
        return jsonify({"error": "WHITE WHALE passphrase required"}), 403
    
    return jsonify({
        "action": "password_scan",
        "status": "simulated",
        "note": "Scans for exposed credentials in network shares, configs, and browser storage",
        "timestamp": now_iso()
    }), 200

@app.route("/api/whale/device/takeover", methods=["POST"])
def whale_device_takeover():
    """Remote device management (requires WHITE WHALE)."""
    if not is_whale_unlocked(request.json.get("session_id", "")):
        return jsonify({"error": "WHITE WHALE passphrase required"}), 403
    
    target = request.json.get("target", "")
    action = request.json.get("action", "status")
    
    return jsonify({
        "action": action,
        "target": target,
        "status": "simulated",
        "note": "Requires SSH/WinRM/PSExec access to target",
        "timestamp": now_iso()
    }), 200

# --- File Sharing ---
@app.route("/api/files/share", methods=["POST"])
def share_file():
    """Share encrypted file with crew member."""
    data = request.get_json(force=True)
    file_path = data.get("file", "")
    recipient = data.get("recipient", "")
    encrypt = data.get("encrypt", True)
    
    if not file_path or not recipient:
        return jsonify({"error": "file and recipient required"}), 400
    
    return jsonify({
        "file": file_path,
        "recipient": recipient,
        "encrypted": encrypt,
        "status": "queued",
        "timestamp": now_iso()
    }), 200

# --- Dashboard Integration ---
@app.route("/api/dashboard/sync", methods=["POST"])
def dashboard_sync():
    """Push data to Captain's dashboard."""
    data = request.get_json(force=True)
    dashboard_url = data.get("dashboard_url", "http://dashboard.void.local:8080")
    
    return jsonify({
        "dashboard": dashboard_url,
        "sync_status": "ok",
        "timestamp": now_iso()
    }), 200

# --- Kuma Alert Receiver ---
@app.route("/api/kuma/alert", methods=["POST"])
def kuma_alert():
    """Receive alerts from Uptime Kuma webhooks."""
    data = request.get_json(force=True) or {}
    monitor = data.get("monitor", "unknown")
    status = data.get("status", "unknown")
    ping = data.get("ping")
    event_time = data.get("time", now_iso())
    
    print(f"[KUMA ALERT] {monitor} -> {status} at {event_time}")
    
    return jsonify({
        "ok": True,
        "service": "void-crew-api",
        "received": {
            "monitor": monitor,
            "status": status,
            "ping": ping,
            "time": event_time,
        },
        "timestamp": now_iso(),
    }), 200

# --- Docker fleet status (feeds !fleet bot command + Gordon monitor + dashboard) ---
@app.route("/docker/ps", methods=["GET"])
def docker_ps():
    """Return local container status (SQUID rig) for the fleet bot + dashboard."""
    try:
        out = subprocess.check_output(
            ["docker", "ps", "--format",
             "{{.ID}}\t{{.Names}}\t{{.State}}\t{{.Status}}"],
            timeout=15, stderr=subprocess.STDOUT)
        rows = out.decode(errors="replace").splitlines()
        containers = []
        for row in rows:
            parts = row.split("\t")
            if len(parts) >= 4:
                containers.append({
                    "id": parts[0][:12],
                    "name": parts[1],
                    "state": parts[2],
                    "status": parts[3],
                    "health": "healthy" if "healthy" in parts[3].lower() else ("unhealthy" if "unhealthy" in parts[3].lower() else "n/a"),
                })
        return jsonify({"rig": "SQUIDSTATION", "containers": containers,
                        "count": len(containers)}), 200
    except Exception as e:
        return jsonify({"rig": "SQUIDSTATION", "error": str(e), "containers": []}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090, threaded=True)
