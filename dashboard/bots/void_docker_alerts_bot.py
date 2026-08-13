"""Void Docker Alerts bot — monitors local Docker stack and posts to Discord webhook.

Behavior:
- Runs periodic health checks
- Posts a single summary embed instead of one message per container
- Respects a quiet window to reduce noise
- Remembers unhealthy state so alerts only transition when state changes
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print("ERROR: requests not installed. Run: pip install requests")
    raise SystemExit(1)

try:
    from canonical_paths import VAULT_PATH
except Exception:
    VAULT_PATH = Path(__file__).resolve().parents[2] / "Obsidian_Vault"

STATE_FILE = VAULT_PATH / "02_Business_Operations" / "state" / "void_docker_alerts_state.json"
DEFAULT_WEBHOOK_ENV = "VOID_DOCKER_ALERTS_WEBHOOK"
DEFAULT_QUIET_MINUTES = 30
DEFAULT_INTERVAL_SECONDS = 300


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _load_state() -> dict[str, Any]:
    try:
        if STATE_FILE.exists():
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return {"last_sent": None, "last_containers": {}}


def _write_state(state: dict[str, Any]) -> None:
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")
    except Exception as exc:
        print(f"void_docker_alerts_bot: state write failed: {exc}")


def _container_summary() -> tuple[list[dict[str, Any]], list[str], list[str]]:
    healthy: list[dict[str, Any]] = []
    unhealthy: list[str] = []
    missing_expected: list[str] = []

    expected_containers = {
        "void-comfyui-local",
        "void-whisper-local",
        "void-tts-local",
        "void-ffmpeg-local",
        "void-api-server",
        "void-prometheus",
        "void-grafana",
        "void-webhooks",
        "void-watcher",
        "void-watcher-verify",
    }

    try:
        response = requests.get("http://127.0.0.1/containers/json", timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException:
        return healthy, unhealthy, sorted(expected_containers)

    seen = set()
    for item in data:
        names = item.get("Names", [])
        name = names[0].lstrip("/") if names else item.get("Id", "")[:12]
        state_raw = item.get("State", "").lower()
        seen.add(name)
        entry = {"name": name, "state": state_raw}
        healthy.append(entry)
        if "unhealthy" in state_raw or "restarting" in state_raw or "exited" in state_raw:
            unhealthy.append(name)

    missing_expected = sorted(expected_containers - seen)
    return healthy, unhealthy, missing_expected


def _should_send(state: dict[str, Any], quiet_minutes: int) -> bool:
    last_sent = state.get("last_sent")
    if last_sent is None:
        return True
    try:
        last_dt = dt.datetime.fromisoformat(last_sent)
        return _now() - last_dt >= dt.timedelta(minutes=quiet_minutes)
    except Exception:
        return True


def _build_embed(healthy: list[dict[str, Any]], unhealthy: list[str], missing: list[str]) -> dict[str, Any]:
    lines = []
    if unhealthy:
        lines.append(f"**Unhealthy/restarting:** {', '.join(unhealthy)}")
    if missing:
        lines.append(f"**Missing expected:** {', '.join(missing)}")
    if not lines:
        lines.append("All monitored containers healthy.")

    description = "\n".join(lines)
    return {
        "title": "🐳 Void Docker Alerts",
        "description": description,
        "color": 11699071 if (unhealthy or missing) else 3731968,
        "timestamp": _now().isoformat(),
        "footer": {"text": "Sir Green · Captain Dashboard"},
    }


def post_alert(webhook: str, quiet_minutes: int = DEFAULT_QUIET_MINUTES) -> bool:
    healthy, unhealthy, missing = _container_summary()
    state = _load_state()
    previous = state.get("last_containers", {})

    current = {
        "healthy": [c["name"] for c in healthy],
        "unhealthy": unhealthy,
        "missing": missing,
    }

    changed = (
        previous.get("unhealthy") != current["unhealthy"]
        or previous.get("missing") != current["missing"]
        or not _should_send(state, quiet_minutes)
    )

    _write_state({**state, "last_containers": current})

    if not changed or not (unhealthy or missing):
        return False

    payload = {"embeds": [_build_embed(healthy, unhealthy, missing)]}
    response = requests.post(webhook, json=payload, timeout=20)
    response.raise_for_status()
    state["last_sent"] = _now().isoformat()
    _write_state(state)
    return True


if __name__ == "__main__":
    webhook = os.environ.get(DEFAULT_WEBHOOK_ENV)
    if not webhook:
        print(f"ERROR: set {DEFAULT_WEBHOOK_ENV}")
        sys.exit(2)
    try:
        post_alert(webhook)
    except requests.RequestException as exc:
        print(f"void_docker_alerts_bot: post failed: {exc}")
        sys.exit(1)
