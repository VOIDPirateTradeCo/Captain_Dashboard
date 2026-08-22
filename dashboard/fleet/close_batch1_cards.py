import urllib.request, urllib.parse, json, time

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"
DONE_LIST_ID = "6a59566b8f8f99c93392f6c"

# Cards to close: 4 scheduled task fixes
cards = [
    ("6a88bab920db61b9d29c6c36", "Fixed: created launcher scripts + verified execution"),
    ("6a88babb022fc4775e241c50", "Fixed: created launcher scripts + verified execution"),
    ("6a88babba180273fcc7a7edb", "Fixed: created launcher scripts + verified execution"),
    ("6a88babc38529028ed5985ab", "Fixed: created launcher scripts + verified execution"),
]

def post_comment(card_id, text):
    url = f"https://api.trello.com/1/cards/{card_id}/actions/comments?key={KEY}&token={TOKEN}"
    data = json.dumps({"text": text}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        print(f"  Comment posted to {card_id}: {r.status}")

def close_card(card_id):
    url = f"https://api.trello.com/1/cards/{card_id}?key={KEY}&token={TOKEN}"
    data = json.dumps({"idList": DONE_LIST_ID}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="PUT")
    with urllib.request.urlopen(req, timeout=20) as r:
        print(f"  Closed card {card_id}: {r.status}")

evidence = """EVIDENCE: Scheduled task launcher scripts created and verified.

**Root cause:** Scheduled tasks referenced missing launcher scripts in C:\\\\VOID\\\\ (e.g., fleet_docker_balance_launcher.py, fleet_docker_monitor_launcher.py, fleet_guardian_launcher.py). The .bat file for VOID_Pirate_Docker_Startup also referenced a missing Python script.

**Fix:**
1. Created working launcher scripts in Captain_Dashboard/dashboard/fleet/launchers/
   - fleet_docker_balance_launcher.py
   - fleet_docker_monitor_launcher.py  
   - fleet_guardian_launcher.py
2. Recreated scheduled tasks pointing to existing scripts
3. Verified scripts execute successfully

**Verification logs:**
- fleet_balance.log: [2026-08-22T00:03:26] OK containers=11 (including void-treasuremap-backend healthy)
- fleet_monitor.log: [2026-08-22T00:03:28] OK version=29.7.2
- fleet_guardian.log: [2026-08-22T00:03:31] OK exited_containers=14

**Scripts location:** C:\\Users\\kidsm\\Documents\\My Docs\\VOID Pirate Trading Co\\Captain_Dashboard\\dashboard\\fleet\\launchers\\

Fixed by Captain Brewbeard Ledgerbane via Sir Green automation."""

for card_id, note in cards:
    print(f"Processing {card_id}: {note}")
    post_comment(card_id, evidence)
    time.sleep(1)
    close_card(card_id)
    time.sleep(1)

print("DONE: 4 scheduled task cards closed with evidence.")