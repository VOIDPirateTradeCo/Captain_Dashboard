#!/bin/bash
# 🚀 FODAVP One-Click Activation Script
# Usage: ./launch_fodavp.sh OR python3 launch_fodavp.py

import os
import sys
import subprocess
import time

ENGINE_DIR = "/c/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/automation/fodavp"

def main():
    print("⚔️ SIR GREEN'S FODAVP LAUNCHER")
    print("=" * 45)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Requires Python 3.8+")
        sys.exit(1)
    
    # Activate FODAVP engine
    print("🚀 Starting FODAVP Engine...")
    engine_process = subprocess.Popen([
        sys.executable,
        "fodavp_engine.py",
        "--activate",
        "--continuous"
    ], cwd=ENGINE_DIR)
    
    print(f"✅ Engine started with PID: {engine_process.pid}")
    
    # Start dashboard
    print("🌐 Starting Dashboard...")
    dashboard_process = subprocess.Popen([
        sys.executable,
        "fodavp_dashboard.py"
    ], cwd=ENGINE_DIR)
    
    print(f"✅ Dashboard started with PID: {dashboard_process.pid}")
    print(f"🌐 Dashboard URL: http://localhost:8082")
    print(f"⚔️ FODAVP is now running and ready for commands!")
    
    # Monitor status
    try:
        while True:
            # Check if processes are still alive
            if engine_process.poll() is not None:
                print(f"⚠️ Engine process ended with code: {engine_process.returncode}")
                break
            if dashboard_process.poll() is not None:
                print(f"⚠️ Dashboard process ended with code: {dashboard_process.returncode}")
                break
            
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down FODAVP...")
        engine_process.terminate()
        dashboard_process.terminate()
        print("✅ All processes terminated")

if __name__ == "__main__":
    main()