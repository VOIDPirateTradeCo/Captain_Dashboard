#!/usr/bin/env python3
"""
fleet_version.py — VOID Pirate Fleet Version Distribution (pull-based).

Captain (this PC) bumps a component version -> manifest committed + pushed to
the shared vault (and void-gitea). Crew PCs pull the vault and run `sync` to
apply updates (git pull + docker compose up). No remote-exec needed.

Commands:
  python fleet_version.py bump --component captain_dashboard --version 3.2.0 --notes "..." [--push]
  python fleet_version.py status
  python fleet_version.py sync      # git pull vault + docker compose up crew_infra
  python fleet_version.py manifest  # print raw manifest
"""
import argparse, json, os, sys, subprocess, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "fleet_manifest.json")
VAULT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))  # Obsidian_Vault root
CREW_INFRA = os.path.join(HERE, "..", "crew_infra")

def load():
    with open(MANIFEST, encoding="utf-8") as f:
        return json.load(f)

def save(m):
    m["updated"] = datetime.date.today().isoformat()
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(m, f, indent=2)

def git(*args, cwd=VAULT):
    return subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True)

def cmd_bump(a):
    m = load()
    comp = m["components"].get(a.component)
    if not comp:
        print(f"Unknown component '{a.component}'. Known: {list(m['components'])}")
        sys.exit(1)
    comp["version"] = a.version
    if a.notes:
        comp["notes"] = a.notes
    comp["commit"] = "head"
    save(m)
    print(f"Bumped {a.component} -> {a.version}")
    if a.push:
        git("add", os.path.relpath(MANIFEST, VAULT))
        git("commit", "-m", f"fleet_version: bump {a.component} to {a.version}")
        r = git("push", "origin", "main")
        print("push:", r.stdout.strip() or r.stderr.strip())

def cmd_status(a):
    m = load()
    print(f"Fleet: {m['fleet_name']}  (updated {m['updated']})")
    for name, c in m["components"].items():
        print(f"  {name:18} v{c['version']:12} {c['notes'][:50]}")
    print("Crew nodes:")
    for node, n in m["crew_nodes"].items():
        print(f"  {node:14} {n['role']:14} {n['ip']:16} last_seen={n.get('last_seen_version')}")

def cmd_sync(a):
    print("Pulling shared vault...")
    r = git("pull")
    print(r.stdout.strip() or r.stderr.strip())
    print("Bringing crew_infra stack up to date...")
    if os.path.exists(CREW_INFRA):
        r2 = subprocess.run(["docker", "compose", "-f",
                             os.path.join(CREW_INFRA, "docker-compose.crew.yml"),
                             "up", "-d"], capture_output=True, text=True)
        print(r2.stdout.strip() or r2.stderr.strip())
    print("Sync complete. Run `python fleet_version.py status` to verify.")

def cmd_manifest(a):
    print(json.dumps(load(), indent=2))

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd")
    b = sub.add_parser("bump"); b.add_argument("--component", required=True)
    b.add_argument("--version", required=True); b.add_argument("--notes", default="")
    b.add_argument("--push", action="store_true")
    sub.add_parser("status"); sub.add_parser("sync"); sub.add_parser("manifest")
    a = ap.parse_args()
    {"bump": cmd_bump, "status": cmd_status, "sync": cmd_sync, "manifest": cmd_manifest
     }.get(a.cmd, lambda _: ap.print_help())(a)
