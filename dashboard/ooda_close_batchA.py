#!/usr/bin/env python3
"""OODA Batch A: close rogue-loop DUPLICATES (keep 1) + verifiably-DONE P0/P1 cards.
Rate-limited to avoid Trello 429."""
import urllib.request as u, urllib.parse as p, json, time

SRC = r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\SECRETS_ENV"
env={}
for line in open(SRC,encoding='utf-8'):
    if line.strip().startswith('TRELLO_') and '=' in line:
        k,v=line.strip().split('=',1); env[k]=v.strip()
KEY,TOK=env['TRELLO_KEY'],env['TRELLO_TOKEN']
BASE="https://api.trello.com/1"
def call(path, data=None, method='GET', tries=4):
    url=f"{BASE}{path}?key={KEY}&token={TOK}"
    if data: url+="&"+p.urlencode(data)
    for i in range(tries):
        try:
            req=u.Request(url, method=method, data=b'' if method in ('POST','PUT') else None)
            return json.loads(u.urlopen(req,timeout=15).read())
        except Exception as e:
            time.sleep(3*(i+1)); last={"error":str(e)[:120]}
    return last

def close(cid, why):
    r=call(f"/cards/{cid}", {"closed":"true"}, method='PUT')
    print(f"  close {cid[:8]}: {'OK' if r.get('closed') else r.get('error','?')}  ({why})")
    time.sleep(1.5)

# KEEP one of each dupe group; close the rest
DUPES_TO_CLOSE = [
    "6a77a2b8781ef22bd831071a",  # rogue OODA loops dup
    "6a77a24b00d7026979c3fa00",  # rogue OODA loops dup
    "6a779d62c2882e7559fa7a83",  # rogue OODA loops dup
    "6a77aabba86cf53e64c7eb93",  # rogue OODA loops dup
    "6a7772e88fc1c112ec805f13",  # Sir Azure Queue Mapping dup
    "6a7772e82da695ddf6a82596",  # Webhook Event dup
]
print("=== Close rogue-loop DUPLICATES (keep 1) ===")
for cid in DUPES_TO_CLOSE:
    close(cid, "duplicate of canonical rogue-loop / Webhook Event card")

# Session-DONE P0/P1 cards
DONE = [
    "6a76499662076d03ae73277d",  # White Whale Defense Bot -> built (whitewhale.html+/api/whale)
    "6a7437bc88c5b3a7990bea5d",  # Dashboard integrate all automations -> done
    "6a77c0cdf8abff122b83984b",  # GPU/vRAM+Ollama display -> done
    "6a77c0cc5e9b31708666f17d",  # fleet mesh unknown -> fixed
    "6a729a0c75ab2a74974fc9ee",  # Discord bot global error handler -> built
    "6a729474366aab00589d35cb",  # Discord bot startup logging -> built
    "6a729b4fa15391304514173f",  # Discord bot OODA cycle 2 -> built
    "6a72ab55ff0ae56984be6b4c",  # Discord bot OODA cycle 3 -> built
]
print("=== Close session-DONE P0/P1 cards ===")
for cid in DONE:
    close(cid, "verified complete this session (Sir Green)")

print("BATCH A DONE")
