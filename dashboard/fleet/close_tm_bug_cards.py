import urllib.request, urllib.parse, json, time

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"

DONE_LIST_ID = "6a595669b8f8f99c93392f6c"

# TM bug cards fixed in this OODA pass
TM_BUG_CARDS = [
    "6a8631ae7d5d4e64e07a0190",
    "6a7d51be6439595bf7ac6393",
    "6a7d56dcffa0b0ac1df7ac29",
    "6a7d56d600db04a5e7443903",
    "6a7d56d019aa574cd89ceb42",
    "6a7d56cac6982b2caad6e59e",
    "6a7d56c47fb7c58075a294be",
    "6a7d51cf58c9661bfec953a5",
    "6a7d44768d81b17bbe293c34",
    "6a7d447021dde2d03ee4ac64",
    "6a7d446b14519f46ee059684",
]

BASE = "https://api.trello.com/1/cards"

failed = []
for card_id in TM_BUG_CARDS:
    data = urllib.parse.urlencode({
        "idList": DONE_LIST_ID,
        "key": KEY,
        "token": TOKEN,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/{card_id}",
        data=data,
        method="PUT",
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read())
            print(f"MOVED {card_id} to Done")
    except Exception as e:
        failed.append((card_id, str(e)))
        print(f"FAIL move {card_id}: {e}")
    time.sleep(0.3)

print(f"\nDone. Failed: {len(failed)}")
for f in failed:
    print(f)
