"""Host-side relay worker: reads prompts from Docker volume, runs hermes, writes reply."""
import json
import os
from dotenv import load_dotenv
load_dotenv(str(Path(__file__).with_name(".env.sirgreen")))
import subprocess
import time
from pathlib import Path

HERMES = os.environ.get("HERMES_CMD", "C:/Users/kidsm/AppData/Local/hermes/hermes-agent/venv/Scripts/hermes")
TIMEOUT = int(os.environ.get("HERMES_TIMEOUT", "1800"))
BASE = Path(os.environ.get("RELAY_BASE", "C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/bots/relay"))
INBOX = BASE / "inbound" / "sir_green"
OUTBOX = BASE / "outbound" / "sir_green"
PROCESSED = BASE / "processed" / "sir_green"
for d in [INBOX, OUTBOX, PROCESSED]:
    d.mkdir(parents=True, exist_ok=True)

seen = set()
while True:
    try:
        for path in sorted(INBOX.iterdir()):
            if path.suffix.lower() != ".json":
                continue
            if path.name in seen:
                continue
            seen.add(path.name)
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                prompt = (data.get("prompt") or "").strip()
                if not prompt:
                    continue
                result = subprocess.run(
                    [HERMES, "-z", prompt],
                    capture_output=True,
                    text=True,
                    timeout=TIMEOUT,
                    check=False,
                )
                reply = (result.stdout or "").strip() or "(no response)"
                out = {
                    "prompt": prompt,
                    "reply": reply,
                    "created_at": data.get("created_at"),
                    "processed_at": time.strftime("%Y%m%dT%H%M%S"),
                }
                out_path = OUTBOX / f"{path.stem}_reply.json"
                out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
                path.rename(PROCESSED / path.name)
            except Exception as e:
                print(f"[WORKER] error {path.name}: {e}")
        time.sleep(1)
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"[WORKER] loop error: {e}")
        time.sleep(2)
