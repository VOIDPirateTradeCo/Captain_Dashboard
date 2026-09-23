#!/usr/bin/env python3
"""
Independent Hermes Proxy Launcher - PID 8645
Parent: pythonw.exe (NO hermes.exe in ancestry)
Uses hermes_cli.proxy directly to avoid hermes.exe wrapper.
"""

import asyncio
import sys
import os

# Configure paths for hermes-agent editable install
HERMES_HOME = r"C:\Users\kidsm\AppData\Local\hermes\hermes-agent"
sys.path.insert(0, HERMES_HOME)
sys.path.insert(0, os.path.join(HERMES_HOME, "venv", "Lib", "site-packages"))

from hermes_cli.proxy.adapters import get_adapter
from hermes_cli.proxy.server import run_server

PROVIDER = "nous"
HOST = "127.0.0.1"
PORT = 8645

async def main():
    adapter = get_adapter(PROVIDER)
    if not adapter.is_authenticated():
        print(f"Not authenticated. Run: hermes auth add {PROVIDER}", file=sys.stderr)
        return 1
    print(f"Proxy :{PORT} -> {adapter.display_name}", file=sys.stderr)
    await run_server(adapter, host=HOST, port=PORT)
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
