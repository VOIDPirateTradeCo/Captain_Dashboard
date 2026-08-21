#!/usr/bin/env python3
"""
FODAVP Trigger Watcher — Docker container
Watches for .fodavp_trigger flag and activates Hermes agent
"""
import time
import json
import os
import sys
from pathlib import Path
from datetime import datetime

TRIGGER_FILE = Path("/fleet/automation/fodavp/.fodavp_trigger")
LOG_FILE = Path("/fleet/evidence/watcher.log")
ENGINE_PATH = Path("/fleet/automation/fodavp/fodavp_engine.py")
POLL_INTERVAL = 5  # seconds

def log(msg):
    timestamp = datetime.utcnow().isoformat()
    line = f"[{timestamp}] WATCHER: {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")
    except:
        pass

def run_fodavp_engine():
    """Execute the FODAVP engine"""
    log("🚀 ACTIVATING FODAVP PROTOCOL")
    try:
        import subprocess
        result = subprocess.run(
            ["python3", str(ENGINE_PATH)],
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(ENGINE_PATH.parent)
        )
        log(f"Engine stdout: {result.stdout[:500]}")
        if result.stderr:
            log(f"Engine stderr: {result.stderr[:500]}")
        log(f"Engine exit code: {result.returncode}")
        return result.returncode == 0
    except Exception as e:
        log(f"❌ Engine execution failed: {e}")
        return False

def main():
    log("👁️ FODAVP Watcher started — monitoring for trigger flag")
    log(f"Trigger file: {TRIGGER_FILE}")
    log(f"Engine path: {ENGINE_PATH}")
    
    while True:
        try:
            if TRIGGER_FILE.exists():
                log("⚡ TRIGGER DETECTED!")
                
                # Read trigger data
                try:
                    trigger_data = json.loads(TRIGGER_FILE.read_text())
                    log(f"Trigger source: {trigger_data.get('source', 'unknown')}")
                    log(f"Trigger timestamp: {trigger_data.get('timestamp', 'unknown')}")
                except:
                    log("⚠️ Could not parse trigger file")
                
                # Execute FODAVP protocol
                success = run_fodavp_engine()
                
                # Remove trigger file
                try:
                    TRIGGER_FILE.unlink()
                    log("✅ Trigger file removed")
                except:
                    log("⚠️ Could not remove trigger file")
                
                if success:
                    log("✅ FODAVP cycle complete")
                else:
                    log("❌ FODAVP cycle failed")
            else:
                # No trigger, just wait
                pass
                
        except Exception as e:
            log(f"❌ Watcher error: {e}")
        
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("🛑 Watcher stopped by user")
        sys.exit(0)
