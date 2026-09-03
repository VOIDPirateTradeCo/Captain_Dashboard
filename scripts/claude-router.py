#!/usr/bin/env python3
"""Smart Claude CLI proxy: routes routine prompts to a cheap model, hard prompts to Sonnet."""
import json
import os
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

CLAUD_CMD = r"C:\Users\kidsm\AppData\Roaming\npm\claude.cmd"
DEFAULT_MODEL = os.environ.get("CLAUDE_DEFAULT_MODEL", "claude-sonnet-5")
CHEAP_MODEL = os.environ.get("CLAUDE_CHEAP_MODEL", "claude-haiku-4-5")
PORT = int(os.environ.get("CLAUDE_PROXY_PORT", "30000"))
HOST = os.environ.get("CLAUDE_PROXY_HOST", "127.0.0.1")

# Simple complexity heuristics
_HARD_KEYWORDS = re.compile(
    r"\b(design|refactor|architecture|implement|build|create|migrate|deploy|audit|security|optimize|integrate|fix|debug|complex|system|architecture|pipeline|workflow)\b",
    re.I,
)
_LONG_PROMPT = 400


def estimate_complexity(prompt: str) -> str:
    score = 0
    if _HARD_KEYWORDS.search(prompt):
        score += 1
    if len(prompt or "") > _LONG_PROMPT:
        score += 1
    return DEFAULT_MODEL if score >= 1 else CHEAP_MODEL


def run_claude(prompt: str, model: str) -> dict:
    cmd = [CLAUD_CMD, "-p", prompt or "", "--model", model]
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
        return {"status": "error", "message": str(exc), "code": 500}

    out = (p.stdout or p.stderr or "").strip()
    if not out:
        return {"status": "error", "message": "empty response from claude", "code": 502}

    return {
        "status": "success",
        "data": {
            "model": model,
            "text": out,
            "returncode": p.returncode,
        },
    }


class RouterHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            body = json.loads(raw)
        except Exception as exc:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(json.dumps({"message": str(exc), "code": 400}).encode())
            return

        route = self.path or "/"
        requested_model = body.get("model")
        prompt = (
            body.get("prompt")
            or next((m.get("content", "") for m in body.get("messages", []) if isinstance(m, dict)), "")
            or ""
        )

        if route.endswith("/models"):
            payload = {
                "status": "success",
                "data": {
                    "models": [
                        {"id": DEFAULT_MODEL, "provider": "anthropic-claude-cli", "tier": "hard"},
                        {"id": CHEAP_MODEL, "provider": "anthropic-claude-cli", "tier": "routine"},
                    ]
                },
            }
        else:
            model = requested_model or estimate_complexity(prompt)
            result = run_claude(prompt, model)
            result.setdefault("data", {})["routed"] = model
            payload = result

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "status": "ok",
            "proxy": "claude-cli-router",
            "default_model": DEFAULT_MODEL,
            "cheap_model": CHEAP_MODEL,
        }).encode())

    def log_message(self, format, *args):
        return


def main():
    server = HTTPServer((HOST, PORT), RouterHandler)
    print(f"Claude CLI router listening on {HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
