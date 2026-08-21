#!/usr/bin/env python3
"""
🎮 FODAVP DASHBOARD BUTTON COMPONENT

Add this to your Captain's Dashboard for one-click FODAVP activation:
<Button 
  onClick={() => fetch('/api/execute-foodavrur', {method: 'POST'})}
  style={{backgroundColor: '#f5c518', color: '#000', padding: '12px 24px'}}
>
  ⚔️ ACTIVATE FOOD AVRUR
</Button>

Or use the embedded HTML widget below for zero-dependency activation.
"""

import http.server
import json
import subprocess
import threading
import time
from pathlib import Path

# FODAVP engine location
ENGINE_PATH = Path(__file__).parent / "fodavp_engine.py"
DASHBOARD_PORT = 8082  # Dedicated port for dashboard integration

class FODAVPDashboardHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Custom logging
        print(f"[Dashboard] {format % args}")
    
    def do_GET(self):
        if self.path == "/" or self.path == "/dashboard":
            # Serve the button widget
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            
            html_content = '''<!DOCTYPE html>
<html>
<head>
    <title>⚔️ FODAVP COMMAND CENTER</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            background: #0a0a1a; 
            color: #e0e0e0; 
            margin: 20px; 
            padding: 0; 
        }
        .command-center { max-width: 600px; margin: 0 auto; }
        .status-board { 
            background: rgba(245, 197, 24, 0.1); 
            border: 1px solid #f5c518; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px;
        }
        .btn {
            background: #f5c518; 
            color: #000; 
            border: none; 
            padding: 15px 30px; 
            font-family: monospace; 
            font-weight: bold; 
            cursor: pointer; 
            border-radius: 4px;
            margin: 5px;
            transition: all 0.2s;
        }
        .btn:hover { background: #fff; transform: scale(1.05); }
        .btn:active { transform: scale(0.98); }
        .btn-danger { background: #ff4444; color: white; }
        .btn-danger:hover { background: #ff6666; }
        .status-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid rgba(245,197,24,0.2);
        }
        .pulse { 
            display: inline-block; 
            width: 12px; 
            height: 12px; 
            background: #f5c518; 
            border-radius: 50%; 
            margin-right: 8px;
        }
        .running { animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    </style>
</head>
<body>
    <div class="command-center">
        <h1>⚔️ SIR GREEN'S FODAVP COMMAND CENTER</h1>
        
        <div class="status-board">
            <h3>📡 SYSTEM STATUS</h3>
            <div class="status-item">
                <span><span class="pulse running"></span> FODAVP Engine</span>
                <span>READY</span>
            </div>
            <div class="status-item">
                <span><span class="pulse running"></span> Fleet Monitoring</span>
                <span>ACTIVE</span>
            </div>
            <div class="status-item">
                <span><span class="pulse running"></span> Evidence Archive</span>
                <span>✅ 0 files</span>
            </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <button class="btn" id="activateBtn" onclick="activateFodavp()">
                ⚔️ ACTIVATE FODAVP
            </button>
            <button class="btn" onclick="stopFodavp()">
                🛑 STOP ALL SYSTEMS
            </button>
        </div>
        
        <div class="status-board">
            <h3>📋 LAST CYCLE LOG</h3>
            <div id="logOutput" style="font-size: 12px; max-height: 200px; overflow-y: auto;">
                Awaiting activation...
            </div>
        </div>
        
        <p style="color: #888; font-size: 12px; text-align: center;">
            ⚡ Sir Green's Fleet Automation Protocol v1.0<br>
            Click any button above to execute FODAVP cycles
        </p>
    </div>

    <script>
        function activateFodavp() {
            document.getElementById('activateBtn').disabled = true;
            document.getElementById('activateBtn').textContent = '⚡ ACTIVATING...';
            
            fetch('/api/execute-foodavrur', {method: 'POST'})
                .then(response => response.json())
                .then(data => {
                    document.getElementById('logOutput').textContent = 
                        JSON.stringify(data, null, 2);
                    setTimeout(() => {
                        document.getElementById('activateBtn').disabled = false;
                        document.getElementById('activateBtn').textContent = '⚔️ ACTIVATE FODAVP';
                        location.reload(); // Refresh to update status
                    }, 3000);
                })
                .catch(err => {
                    document.getElementById('logOutput').textContent = 
                        'Error: ' + err.toString();
                    document.getElementById('activateBtn').disabled = false;
                    document.getElementById('activateBtn').textContent = '⚔️ ACTIVATE FODAVP';
                });
        }
        
        function stopFodavp() {
            if (confirm('🛑 STOP ALL SYSTEMS?\nThis will terminate FODAVP immediately.')) {
                fetch('/api/stop-foodavrur', {method: 'POST'})
                    .then(() => location.reload());
            }
        }
    </script>
</body>
</html>'''
            
            self.wfile.write(html_content.encode('utf-8'))
    
    def do_POST(self):
        if self.path == "/api/execute-foodavrur":
            print("[Dashboard] ⚔️ FODAVP ACTIVATION REQUESTED!")
            
            # Execute FODAVP engine in background
            def run_engine():
                try:
                    subprocess.run([
                        "python3", str(ENGINE_PATH), "--activate", "--cycles", "3"
                    ], timeout=300, capture_output=True, text=True)
                except Exception as e:
                    print(f"[Dashboard] Engine error: {e}")
            
            # Start execution in separate thread
            engine_thread = threading.Thread(target=run_engine, daemon=True)
            engine_thread.start()
            
            # Send immediate response
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            response = {
                "status": "activated",
                "message": "⚔️ FODAVP engine started!",
                "cycles": "3",
                "target": "Void Ops Trello Board",
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
            print(f"[Dashboard] Response: {json.dumps(response)}")
        
        elif self.path == "/api/stop-foodavrur":
            print("[Dashboard] 🛑 FODAVP STOP REQUESTED!")
            
            # Kill any running engine processes
            try:
                subprocess.run(["pkill", "-f", "fodavp_engine.py"], 
                              capture_output=True, timeout=5)
            except:
                pass
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            
            response = {"status": "stopped", "message": "FODAVP engine terminated"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
        
        else:
            self.send_response(404)
            self.end_headers()

def start_dashboard():
    """Start the dashboard server"""
    server = http.server.HTTPServer(("0.0.0.0", DASHBOARD_PORT), FODAVPDashboardHandler)
    print(f"🚀 FODAVP Dashboard running on port {DASHBOARD_PORT}")
    print(f"🌐 Access: http://localhost:{DASHBOARD_PORT}")
    print("⚔️ Click 'ACTIVATE FODAVP' to start automation")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Dashboard server stopped")
        server.shutdown()

if __name__ == "__main__":
    start_dashboard()