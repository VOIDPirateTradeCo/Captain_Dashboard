#!/usr/bin/env python3
"""
fleet_comms_sync.py  —  VOiD Pirate "smart sync" local-network comms automation
================================================================================
Keeps Captain (SQUIDSTATION / Sir Green), Miss Pink (PINKCADY) and Sir Azure
(STEALTHATTACK) in sync on what shared LLM compute is available.

What it does (every INTERVAL minutes):
  1. Polls STEALTHATTACK Ollama at 192.168.0.32:11434  -> list of models
  2. Detects GPU idle/busy via Ollama /api/ps (empty = idle, GPU free to share)
  3. Reads fleet mesh heartbeats (our dashboard /api/fleet)
  4. Writes state/fleet_llm_sync.json
  5. Posts a compact FLEET SYNC summary to crew-ops Discord (throttled: only
     when something changed, or every HEARTBEAT_POST_MIN minutes)

Safe: DRY_RUN posts nothing; --apply enables Discord broadcast. Runs forever
as a supervised service (service_runner.py).

Usage:
  fleet_comms_sync.py --daemon --interval 5 --apply
  fleet_comms_sync.py --once            # single pass, print only
"""
import argparse, json, os, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path

VAULT = Path(r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault")
STATE = VAULT / "02_Business_Operations" / "state" / "fleet_llm_sync.json"
LOG_DIR = VAULT / "01_Projects" / "capta1n_orchestrat0r" / "logs"
OLLAMA = "http://192.168.0.32:11434"
DASHBOARD = "http://127.0.0.1:9000/api/fleet"
CREW_OPS_CHANNEL = 1535382124746637462

# Discord token for Sir Green (used to post fleet-sync)
_ENV_PATH = VAULT / "02_Business_Operations" / "Communications" / "Discord" / ".env"
def _load_token():
    try:
        for l in _ENV_PATH.read_text(errors='ignore').splitlines():
            if l.startswith('DISCORD_SIR_GREEN_TOKEN'):
                return l.split('=',1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return os.environ.get('DISCORD_SIR_GREEN_TOKEN','')

def _get(url, timeout=6):
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None

def poll_ollama():
    tags = _get(f"{OLLAMA}/api/tags")
    ps = _get(f"{OLLAMA}/api/ps")
    models = [m.get('name') for m in (tags or {}).get('models', [])]
    running = (ps or {}).get('models', [])
    gpu_idle = (len(running) == 0)
    return {"reachable": tags is not None, "models": models,
            "gpu_idle": gpu_idle, "running": [m.get('name') for m in running]}

def poll_fleet():
    d = _get(DASHBOARD)
    if not d:
        return {"online": 0, "total": 0, "ships": {}}
    hm = d.get('hive_mind', {})
    ships = {k: v.get('state') for k, v in d.get('ships', {}).items()}
    return {"online": hm.get('ships_online', 0), "total": hm.get('ships_total', 0), "ships": ships}

def poll_security():
    d = _get("http://127.0.0.1:9000/api/security")
    if not d:
        return None
    comp = d.get('components', {})
    cs = comp.get('crowdsec', {})
    su = comp.get('suricata', {})
    ze = comp.get('zeek', {})
    return {
        "crowdsec_alive": cs.get('alive'),
        "bans": cs.get('cumulative_bans', {}),
        "suricata_alive": su.get('alive'),
        "suricata_pkts": su.get('packets_captured'),
        "zeek_alive": ze.get('alive'),
    }

def build_report():
    oll = poll_ollama()
    flt = poll_fleet()
    sec = poll_security()
    return {
        "ts": datetime.now(timezone.utc).isoformat(),
        "ollama": oll,
        "fleet": flt,
        "security": sec,
        "share_status": ("GPU IDLE — LLMs ready for Captain/Miss Pink/Sir Azure"
                         if oll.get('gpu_idle') else f"GPU BUSY ({','.join(oll.get('running',[]))}) — shared LLMs paused"),
    }

def post_discord(token, text):
    import asyncio, discord
    ok = {"sent": False}
    async def run():
        client = discord.Client(intents=discord.Intents.default())
        @client.event
        async def on_ready():
            ch = client.get_channel(CREW_OPS_CHANNEL)
            if ch:
                await ch.send(text); ok["sent"] = True
            await client.close()
        try:
            client.run(token)
        except Exception:
            pass
    asyncio.new_event_loop().run_until_complete(run())
    return ok["sent"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--daemon", action="store_true")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--interval", type=float, default=5.0)
    ap.add_argument("--apply", action="store_true", help="enable Discord broadcast")
    ap.add_argument("--heartbeat-post", type=float, default=30.0, help="min between Discord posts")
    args = ap.parse_args()

    last_post = 0.0
    def once():
        nonlocal last_post
        rep = build_report()
        STATE.parent.mkdir(parents=True, exist_ok=True)
        prev = json.loads(STATE.read_text()) if STATE.exists() else {}
        STATE.write_text(json.dumps(rep, indent=2))
        print(json.dumps(rep, indent=2))
        # decide if we should post: change detected OR heartbeat elapsed
        changed = (prev.get('ollama',{}).get('models') != rep['ollama'].get('models')
                   or prev.get('ollama',{}).get('gpu_idle') != rep['ollama'].get('gpu_idle')
                   or prev.get('fleet',{}).get('online') != rep['fleet'].get('online'))
        now = time.time()
        if args.apply and (changed or (now - last_post) > args.heartbeat_post * 60):
            tok = _load_token()
            if tok:
                msg = (f"🛰️ **FLEET SYNC** {rep['ts'][:19]}Z\n"
                       f"LLMs @ STEALTHATTACK: {', '.join(rep['ollama'].get('models',[])) or 'NONE'}\n"
                       f"Status: {rep['share_status']}\n"
                       f"Mesh: {rep['fleet'].get('online')}/{rep['fleet'].get('total')} ships online\n"
                       f"All crew may use shared LLMs when GPU idle. ⚓")
                sec = rep.get('security') or {}
                bans = sec.get('bans', {})
                sec_line = (f"🛡️ SECURITY: CrowdSec {'🟢' if sec.get('crowdsec_alive') else '🔴'} "
                            f"(bans applied: {bans}), Suricata {'🟢' if sec.get('suricata_alive') else '🔴'} "
                            f"({sec.get('suricata_pkts')} pkts), Zeek {'🟢' if sec.get('zeek_alive') else '🔴'}")
                msg = (f"🛰️ **FLEET SYNC** {rep['ts'][:19]}Z\n"
                       f"LLMs @ STEALTHATTACK: {', '.join(rep['ollama'].get('models',[])) or 'NONE'}\n"
                       f"Status: {rep['share_status']}\n"
                       f"Mesh: {rep['fleet'].get('online')}/{rep['fleet'].get('total')} ships online\n"
                       f"{sec_line}\n"
                       f"All crew may use shared LLMs when GPU idle. ⚓")
                # THROTTLE FIX: update last_post on EVERY attempt (success or fail)
                # so a failing post does not spam every cycle.
                last_post = now
                if post_discord(tok, msg):
                    print("[comms] posted fleet-sync to crew-ops")
                else:
                    print("[comms] fleet-sync post failed (throttled retry in 30m)")
        return rep

    if args.once or not args.daemon:
        once(); return
    print(f"[fleet_comms_sync] daemon every {args.interval}m, apply={args.apply}", flush=True)
    while True:
        try:
            once()
        except Exception as e:
            print(f"[comms] error: {e}", flush=True)
        time.sleep(max(30, int(args.interval * 60)))

if __name__ == "__main__":
    main()
