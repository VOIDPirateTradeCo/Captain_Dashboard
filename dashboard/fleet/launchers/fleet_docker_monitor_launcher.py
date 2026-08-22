"""VOID_FleetDockerMonitor launcher - monitors Docker daemon health."""
import datetime, subprocess, sys
from pathlib import Path

LOG = Path(__file__).resolve().parent.parent / "evidence" / "fleet_monitor.log"
LOG.parent.mkdir(parents=True, exist_ok=True)

def main():
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        out = subprocess.run(["docker", "info", "--format", "{{.ServerVersion}}"], capture_output=True, text=True, timeout=10)
        status = "OK" if out.returncode == 0 else "ERROR"
        version = out.stdout.strip() if out.returncode == 0 else out.stderr.strip()[:100]
        LOG.write_text(f"[{ts}] {status} version={version}\n", encoding="utf-8")
    except Exception as exc:
        LOG.write_text(f"[{ts}] ERROR {exc}\n", encoding="utf-8")
    sys.exit(0)

if __name__ == "__main__":
    main()
