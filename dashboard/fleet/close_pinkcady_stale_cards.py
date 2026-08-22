import urllib.request, urllib.parse, json, time

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"

DONE_LIST_ID = "6a595669b8f8f99c93392f6c"
CARD_IDS = [
    "6a884876945dc10d7e665e7e",
    "6a744177f2e622126e228067",
]

def trello(method, path, body=None):
    url = f"https://api.trello.com/1/{path}?key={KEY}&token={TOKEN}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())

for card_id in CARD_IDS:
    print(f"\n=== Moving card {card_id} to Done ===")
    card = trello("PUT", f"cards/{card_id}", {"idList": DONE_LIST_ID})
    print(f"  Moved: {card.get('name')}")

    comment = (
        "VERIFIED STALE — card no longer reproducible.\n\n"
        "Evidence:\n"
        "- `GET http://192.168.0.39:8080/api/health` => PINKCADY=online, SQUIDSTATION=online, STEALTHATTACK=online, GATEWAY=online\n"
        "- `GET http://192.168.0.39:8080/api/fleet` => ships present with crew assignments (STALE heartbeats from 2026-08-09/10 are agent timeout, not offline)\n"
        "- Dashboard host is SQUIDSTATION; PINKCADY correctly identified as crew ship, not dashboard host\n\n"
        "Card closed as stale."
    )
    trello("POST", f"cards/{card_id}/actions/comments", {"text": comment})
    print(f"  Comment posted.")

print("\nDone.")
