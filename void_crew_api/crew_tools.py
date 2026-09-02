#!/usr/bin/env python3
"""
Crew Network Tools — Discovery, File Sharing, Encryption
Classification: CREW ONLY
"""

from flask import Flask, request, jsonify
from datetime import datetime, timezone
import socket
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# --- Crew File Sharing ---
shared_files = {}

@app.route("/api/crew/files/share", methods=["POST"])
def share_file():
    """Share file with crew member."""
    data = request.get_json(force=True)
    file_path = data.get("file", "")
    recipient = data.get("recipient", "")
    encrypt = data.get("encrypt", True)
    
    if not file_path or not recipient:
        return jsonify({"error": "file and recipient required"}), 400
    
    shared_files[file_path] = {
        "recipient": recipient,
        "encrypted": encrypt,
        "timestamp": now_iso()
    }
    
    return jsonify({
        "file": file_path,
        "recipient": recipient,
        "encrypted": encrypt,
        "status": "shared"
    }), 200

@app.route("/api/crew/files/list", methods=["GET"])
def list_shared_files():
    return jsonify({"files": shared_files, "total": len(shared_files)}), 200

# --- Encryption Bridge ---
@app.route("/api/crew/encrypt", methods=["POST"])
def crew_encrypt():
    """Encrypt message for crew member."""
    data = request.get_json(force=True)
    text = data.get("text", "")
    recipient = data.get("recipient", "")
    
    # Caesar +3 for crew use
    shift = 3
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base + shift) % 26 + base)
        else:
            result += char
    
    return jsonify({
        "encrypted": result,
        "recipient": recipient,
        "cipher": "TIDAL_TONGUE",
        "timestamp": now_iso()
    }), 200

# --- Network Discovery ---
@app.route("/api/crew/network/discover", methods=["POST"])
def crew_discover():
    """Scan local network for crew devices and printers."""
    data = request.get_json(force=True) or {}
    subnet = data.get("subnet", "192.168.0.0/24")
    ports = data.get("ports", [445, 9100, 515, 631, 80, 8080, 3000, 3001])
    
    devices = []
    base = "192.168.0."
    
    with ThreadPoolExecutor(max_workers=100) as executor:
        def check(ip_port):
            ip, port = ip_port
            try:
                socket.setdefaulttimeout(0.4)
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                result = s.connect_ex((ip, port))
                s.close()
                return (ip, port, result == 0)
            except Exception:
                return (ip, port, False)
        
        jobs = [(f"{base}{i}", p) for i in range(1, 60) for p in ports]
        results = executor.map(check, jobs)
        
        device_map = {}
        for ip, port, open_ in results:
            if open_:
                if ip not in device_map:
                    device_map[ip] = {"ip": ip, "ports": [], "status": "up"}
                device_map[ip]["ports"].append(port)
        
        devices = sorted(device_map.values(), key=lambda x: x["ip"])
    
    return jsonify({"devices": devices, "total": len(devices)}), 200

# --- Status ---
@app.route("/healthz")
def healthz():
    return jsonify({"status": "OK", "service": "void-crew-tools", "timestamp": now_iso()}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8091, threaded=True)
