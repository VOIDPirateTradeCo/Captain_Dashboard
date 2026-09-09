#!/bin/bash
# start_dashboard.sh — Start dashboard server with proper binding
cd "$(dirname "$0")"
exec python3 dashboard_server.py --host 0.0.0.0 --port 9000
