#!/usr/bin/env python3
"""
dashboard_watchdog.py — VOID Pirate Captain's Dashboard dead-man's switch.
Pings localhost:8080 every CHECK_SEC. If the dashboard is dark: restarts it,
logs the event, and alerts the crew Discord webhook once per outage with a
recovery notice when it comes back.
"""
import urllib.request as u, json, time, subprocess, os, sys, datetime

DASH_URL = "http://127.0.0.1:8080/"
CHECK_SEC = 60
DASH_DIR = os.path.dirname(os.path.abspath(__file__))
LAUNCHER = os.path.abspath(
    os.path.join(DASH_DIR, "..", "..", "Automation", "launchers", "launch_dashboard.ps1")
)
LOG = os.path.join(DASH_DIR, "logs", "dashboard_watchdog.log")


def log(msg):
    line = f"[{datetime.datetime.now().isoformat()}] {msg}"
    print(line, flush=True)
    try:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def discord_alert(text):
    try:
        sys.path.insert(
            0,
            os.path.abspath(
                os.path.join(
                    DASH_DIR,
                    "..",
                    "..",
                    "Developer_Brain",
                    "02_Business_Operations",
                    "Infrastructure",
                    "scripts",
                )
            ),
        )
        from void_discord_webhook import post_text

        env_src = os.path.abspath(
            os.path.join(
                DASH_DIR,
                "..",
                "..",
                "Developer_Brain",
                "02_Business_Operations",
                "_Hub",
                "_KEY_VAULT",
                "secrets.env",
            )
        )
        for line in open(env_src, encoding="utf-8"):
            if line.strip().startswith("VOID_DISCORD_OODA_WEBHOOK="):
                os.environ["VOID_DISCORD_OODA_WEBHOOK"] = line.strip().split("=", 1)[1].strip()
        return post_text("VOID_DISCORD_OODA_WEBHOOK", text)
    except Exception as e:
        log(f"discord alert failed: {e}")
        return False


def is_up():
    try:
        req = u.Request(DASH_URL, method="GET")
        with u.urlopen(req, timeout=8) as r:
            return r.status == 200
    except Exception:
        return False


def restart_dash():
    log("Attempting dashboard restart...")
    try:
        if not os.path.exists(LAUNCHER):
            log(f"launcher missing: {LAUNCHER}")
            return False
        subprocess.Popen(
            [
                "powershell.exe",
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                LAUNCHER,
            ],
            cwd=DASH_DIR,
            stdout=open(os.path.join(DASH_DIR, "logs", "dash_restart.log"), "a"),
            stderr=subprocess.STDOUT,
        )
        time.sleep(10)
        return is_up()
    except Exception as e:
        log(f"restart failed: {e}")
        return False


def main():
    log("Watchdog started. Monitoring " + DASH_URL)
    was_up = True
    alerted = False
    while True:
        up = is_up()
        if up:
            if not was_up:
                log("Dashboard RECOVERED.")
                if alerted:
                    discord_alert(
                        "🟢 CAPTAIN DASHBOARD RECOVERED — localhost:8080 is back online, Sir Green."
                    )
                alerted = False
            was_up = True
        else:
            if was_up or not alerted:
                log("Dashboard DOWN detected!")
                revived = restart_dash()
                if revived:
                    log("Restart succeeded.")
                    discord_alert(
                        "🟡 CAPTAIN DASHBOARD was DOWN — auto-restarted by watchdog (localhost:8080 back up), Sir Green."
                    )
                    was_up = True
                    alerted = False
                else:
                    discord_alert(
                        "🔴 CAPTAIN DASHBOARD DOWN — localhost:8080 not responding and auto-restart failed. Check SQUIDSTATION, Sir Green!"
                    )
                    alerted = True
                    was_up = False
        time.sleep(CHECK_SEC)


if __name__ == "__main__":
    main()
