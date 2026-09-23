#!/usr/bin/env python3
"""
Standalone Hermes Proxy Service
Runs hermes.exe proxy as an independent process.
Auto-restarts on crash. Designed to run as a background process via pythonw.exe.
"""

import subprocess
import sys
import time
import os
import signal
import logging

# Configuration
HERMES_EXE = r"C:\Users\kidsm\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe"
PROXY_PORT = 8644
LOG_DIR = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Captain_Dashboard\mission-control\logs"
RESTART_DELAY = 5

# Setup logging
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(LOG_DIR, "proxy-service.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

def kill_existing_proxy():
    """Kill any existing proxy on our port"""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.splitlines():
            if f":{PROXY_PORT}" in line and "LISTEN" in line:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[4]
                    subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True, timeout=5)
                    logging.info(f"Killed existing proxy PID {pid}")
    except Exception as e:
        logging.error(f"Error killing existing: {e}")

def start_proxy():
    """Start the hermes proxy subprocess"""
    kill_existing_proxy()
    time.sleep(1)
    
    proc = subprocess.Popen(
        [HERMES_EXE, "proxy", "start", "--port", str(PROXY_PORT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
        close_fds=True
    )
    logging.info(f"Started proxy PID {proc.pid}")
    return proc

def main():
    logging.info("=== Proxy Service Starting ===")
    
    # Handle signals
    def handle_signal(signum, frame):
        logging.info("Received shutdown signal")
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    
    proxy_proc = start_proxy()
    
    while True:
        # Check if proxy is still running
        if proxy_proc.poll() is not None:
            logging.warning(f"Proxy exited with code {proxy_proc.returncode}. Restarting in {RESTART_DELAY}s...")
            time.sleep(RESTART_DELAY)
            proxy_proc = start_proxy()
        
        # Check if port is listening
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True, timeout=10
            )
            if f":{PROXY_PORT}" not in result.stdout:
                logging.warning("Port not listening. Restarting proxy...")
                proxy_proc.terminate()
                time.sleep(RESTART_DELAY)
                proxy_proc = start_proxy()
        except:
            pass
        
        time.sleep(30)

if __name__ == "__main__":
    main()
