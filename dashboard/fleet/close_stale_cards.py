import urllib.request, urllib.parse, json, time

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"
DONE_LIST_ID = "6a595669b8f8f99c93392f6c"
BASE = "https://api.trello.com/1/cards"

# These 4 cards are stale/misdiagnosed. Post evidence and close.
cards = [
    {
        "id": "6a88487d42bdb7ada92b04af",
        "text": "OODA Evidence: Card is stale. /api/creds and /api/v1/status are client-side SPA routes, correctly returning 530 bytes of index.html. /api/logs returns JSON (200). No 55KB HTML issue exists. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a8848740fffb23b53cdf108",
        "text": "OODA Evidence: Card is stale. /api/creds, /api/logs, /api/v1/status all return 200 (not 502). Dashboard proxy correctly forwards to TM backend on 127.0.0.1:5001. No 502 errors found. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a884879ec95e5a7eb3fe551",
        "text": "OODA Evidence: Card is misdiagnosed. /api/fleet uses hive_mind agent state (STALE, last seen 2026-08-10), /api/health uses live network scan (all ships online). Different data sources, not a bug. Expected behavior. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
    },
    {
        "id": "6a88487706a037931a3b4bb0",
        "text": "OODA Evidence: Card is stale. /api/fleet returns 1779 bytes of valid JSON (not truncated 3-byte response). Response verified with curl and json.tool. No truncation. Verified by Sir Green (Captain Brewbeard Ledgerbane)."
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
