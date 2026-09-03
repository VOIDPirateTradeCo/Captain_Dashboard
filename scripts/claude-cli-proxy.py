#!/usr/bin/env python3
"""Local OpenAI-compatible proxy that shells out to the authenticated Claude CLI."""
import json
import os
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

CLAUD_CMD = r"C:\Users\kidsm\AppData\Roaming\npm\claude.cmd"
DEFAULT_MODEL = os.environ.get("CLAUDE_PROXY_MODEL", "claude-sonnet-5")
CHEAP_MODEL = os.environ.get("CLAUDE_CHEAP_MODEL", "claude-haiku-4-5")
PORT = int(os.environ.get("CLAUDE_PROXY_PORT", "30000"))
HOST = os.environ.get("CLAUDE_PROXY_HOST", "127.0.0.1")


def run_claude(prompt: str, model: str) -> str:
    cmd = [CLAUD_CMD, "-p", prompt, "--model", model]
    try:
        p = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
            shell=False,
        )
    except Exception as exc:
        return json.dumps({
            "status": "error",
            "message": str(exc),
            "code": 500,
        })

    out = (p.stdout or p.stderr or "").strip()
    if not out:
        return json.dumps({
            "status": "error",
            "message": "empty response from claude",
            "code": 502,
        })

    return json.dumps({
        "status": "success",
        "data": {
            "model": model,
            "text": out,
            "returncode": p.returncode,
        },
    })


class ClaudeProxyHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8") if length else "{}")
        except Exception as exc:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"message": str(exc), "code": 400}).encode())
            return

        route = self.path or "/"
        model = body.get("model") or DEFAULT_MODEL
        prompt = (
            body.get("prompt")
            or body.get("messages", [{}])[-1].get("content", "")
            or ""
        )

        if route.endswith("/models"):
            payload = json.dumps({
                "status": "success",
                "data": {
                    "models": [
                        {"id": DEFAULT_MODEL, "provider": "anthropic-claude-cli"},
                        {"id": CHEAP_MODEL, "provider": "anthropic-claude-cli"},
                    ]
                }
            })
        else:
            payload = run_claude(prompt, model)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload.encode())

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"status": "ok", "proxy": "claude-cli", "model": DEFAULT_MODEL}).encode())

    def log_message(self, format, *args):
        return


def main():
    server = HTTPServer((HOST, PORT), ClaudeProxyHandler)
    print(f"Claude CLI proxy listening on {HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
