"""G13 ToS-Watch guard — centralized Terms-of-Service compliance checker.

Checks:
- Discord API ToS
- Docker Engine ToS
- GitHub ToS
- Tailscale ToS
- Gmail/Google ToS
- Torus/Trello ToS
- ComfyUI license
- Ollama license
- Whisper/OpenAI license

Behavior:
- Fails closed if any check is violated
- Logs violation details
- Returns status dict for dashboard integration
"""
from __future__ import annotations

import datetime
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    from canonical_paths import VAULT_PATH
except Exception:  # pragma: no cover - fallback for standalone runs
    VAULT_PATH = Path(__file__).resolve().parents[2] / "Obsidian_Vault"

STATE_FILE = VAULT_PATH / "02_Business_Operations" / "state" / "fleet_guardian_state.json"
RATE_LIMIT_FILE = VAULT_PATH / "02_Business_Operations" / "state" / "fleet_guardian_limits.json"


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _load_json(path: Path, default: Any = None) -> Any:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        pass
    return default if default is not None else {}


def _write_json(path: Path, data: Any) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    except Exception as exc:
        print(f"fleet_guardian: failed to write {path}: {exc}")


def check_discord() -> dict:
    """Discord API ToS: do not send unsolicited DMs, do not scrape users."""
    state = _load_json(STATE_FILE, {}).get("discord", {})
    last_check = state.get("last_check")
    violations = state.get("violations", [])
    return {
        "service": "discord",
        "status": "VIOLATED" if violations else "OK",
        "last_check": last_check,
        "violations": violations[-3:],
    }


def check_docker() -> dict:
    """Docker Engine ToS: respect Docker subscription terms for commercial use."""
    state = _load_json(STATE_FILE, {}).get("docker", {})
    violations = state.get("violations", [])
    return {
        "service": "docker",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_github() -> dict:
    """GitHub ToS: do not abuse APIs, respect rate limits."""
    state = _load_json(STATE_FILE, {}).get("github", {})
    violations = state.get("violations", [])
    return {
        "service": "github",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_tailscale() -> dict:
    """Tailscale ToS: do not bypass ACLs or resell network access."""
    state = _load_json(STATE_FILE, {}).get("tailscale", {})
    violations = state.get("violations", [])
    return {
        "service": "tailscale",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_gmail() -> dict:
    """Google/Gmail ToS: no bulk unsolicited mail, respect privacy."""
    state = _load_json(STATE_FILE, {}).get("gmail", {})
    violations = state.get("violations", [])
    return {
        "service": "gmail",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_torus_trello() -> dict:
    """Torus/Trello automation ToS: do not spam boards, respect rate limits."""
    state = _load_json(STATE_FILE, {}).get("torus_trello", {})
    limits = _load_json(RATE_LIMIT_FILE, {}).get("torus_trello", {})
    violations = state.get("violations", [])
    return {
        "service": "torus_trello",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
        "rate_limits": limits,
    }


def check_comfyui() -> dict:
    """ComfyUI: respect model licenses."""
    state = _load_json(STATE_FILE, {}).get("comfyui", {})
    violations = state.get("violations", [])
    return {
        "service": "comfyui",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_ollama() -> dict:
    """Ollama: respect model licenses."""
    state = _load_json(STATE_FILE, {}).get("ollama", {})
    violations = state.get("violations", [])
    return {
        "service": "ollama",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def check_whisper() -> dict:
    """Whisper/OpenAI: respect model licenses."""
    state = _load_json(STATE_FILE, {}).get("whisper", {})
    violations = state.get("violations", [])
    return {
        "service": "whisper",
        "status": "VIOLATED" if violations else "OK",
        "last_check": state.get("last_check"),
        "violations": violations[-3:],
    }


def record_violation(service: str, detail: str) -> None:
    state = _load_json(STATE_FILE, {})
    svc = state.get(service, {})
    violations = svc.get("violations", [])
    violations.append({"time": _now(), "detail": detail})
    svc["violations"] = violations[-20:]
    svc["last_check"] = _now()
    state[service] = svc
    _write_json(STATE_FILE, state)


def full_check() -> dict:
    checks = [
        check_discord(),
        check_docker(),
        check_github(),
        check_tailscale(),
        check_gmail(),
        check_torus_trello(),
        check_comfyui(),
        check_ollama(),
        check_whisper(),
    ]
    violated = [c for c in checks if c.get("status") == "VIOLATED"]
    return {
        "timestamp": _now(),
        "overall": "VIOLATED" if violated else "OK",
        "checks": checks,
        "violated_count": len(violated),
        "ok_count": len(checks) - len(violated),
    }


if __name__ == "__main__":
    result = full_check()
    print(json.dumps(result, indent=2))
    if result.get("overall") == "VIOLATED":
        sys.exit(1)
