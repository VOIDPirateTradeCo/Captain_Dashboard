"""VOID_FleetGuardian launcher - fleet guard watchdog."""
import datetime, subprocess, sys
from pathlib import Path

LOG = Path(__file__).resolve().parent.parent / "evidence" / "fleet_guardian.log"
LOG.parent.mkdir(parents=True, exist_ok=True)

def main():
    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        out = subprocess.run(["docker", "ps", "--filter", "status=exited", "--format", "{{.Names}}"], capture_output=True, text=True, timeout=10)
        exited = [l for l in out.stdout.strip().splitlines() if l] if out.returncode == 0 else []
        LOG.write_text(f"[{ts}] OK exited_containers={len(exited)}\n", encoding="utf-8")
    except Exception as exc:
        LOG.write_text(f"[{ts}] ERROR {exc}\n", encoding="utf-8")
    sys.exit(0)

if __name__ == "__main__":
    main()
