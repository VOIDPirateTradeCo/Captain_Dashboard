import urllib.request, urllib.parse, json, time

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"
DONE_LIST_ID = "6a595669b8f8f99c93392f6c"
BASE = "https://api.trello.com/1/cards"

cards = [
    {
        "id": "6a88487e66064d6ac9ce920a",
        "text": "OODA Evidence: Card is stale/misdiagnosed. Action buttons tested: /api/fodavp/activate, /api/fodavp/status, /api/fodavp/stop all return 200. Server does NOT crash. ConnectionResetError handlers already exist in dashboard_server.py. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a88487f81cc8296a7af4a36",
        "text": "OODA Evidence: Card is stale. Action buttons execute correctly: activateFodavp() calls /api/fodavp/trigger and returns JSON status. unlockWhale() calls /api/whale with SHA-256 hash and returns proper auth response. Buttons do NOT silently accept POST — they execute real logic. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a88487ba5331007a85898a3",
        "text": "OODA Evidence: Card is a style nitpick, not a functional bug. console.error() calls exist but do NOT crash the dashboard. All JS error handling uses try/catch with UI error displays. No production impact. Closing as non-blocking. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a88487a995e93fc0ea16e2d",
        "text": "OODA Evidence: Card is stale. Port 3002 serves Grafana (verified: curl returns Grafana HTML). Port 8081 serves cadvisor (verified: curl returns cadvisor UI + /metrics endpoint + /healthz returns ok). Both services running. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
]

failed = []
for item in cards:
    card_id = item["id"]
    # Post evidence comment
    data = urllib.parse.urlencode({
        "id": card_id,
        "text": item["text"],
        "key": KEY,
        "token": TOKEN,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/{card_id}/actions/comments",
        data=data,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read())
            print(f"COMMENT OK {card_id}: {body.get('id')}")
    except Exception as e:
        failed.append((card_id, str(e)))
        print(f"COMMENT FAIL {card_id}: {e}")
    time.sleep(0.3)

    # Move to Done
    data2 = urllib.parse.urlencode({
        "idList": DONE_LIST_ID,
        "key": KEY,
        "token": TOKEN,
    }).encode("utf-8")
    req2 = urllib.request.Request(
        f"{BASE}/{card_id}",
        data=data2,
        method="PUT",
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req2, timeout=20) as r:
            body = json.loads(r.read())
            print(f"MOVED {card_id} to Done")
    except Exception as e:
        failed.append((card_id, str(e)))
        print(f"MOVE FAIL {card_id}: {e}")
    time.sleep(0.3)

print(f"\nDone. Failed: {len(failed)}")
for f in failed:
    print(f)
