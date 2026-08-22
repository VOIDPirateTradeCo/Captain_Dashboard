import urllib.request, urllib.parse, json

KEY = "1ede6cfdfee020a9c91f6ed85966d5b1"
TOKEN = "ATTA6a197ccb7af9b048cb30f0b872d950f0277b3d3c6a5293dff075b871626d2bf545A68BD3"

card_data = {
  "name": "[P0] 🐛 TM backend import hangs — /api/health never loads",
  "idList": "6a595b03d5f62f2d71f51d0e",
  "idLabels": ["6a74dd63452761014e981f23"],
  "desc": "**Observed:** `import app` from `/app/backend/app.py` hangs indefinitely inside the container. Even `python3 -c 'import app'` with a 180s timeout never completes.\n\n**Impact:** Backend container stays `unhealthy`. All `/api/*` endpoints return 000/connection refused from host. Frontend shows empty/404 states.\n\n**Root cause:** Module-level import of `schwab_streamer` at line 141 of `app.py` triggers a blocking import chain. The `try/except` should catch it, but `schwab_streamer.py` itself may contain unbounded import-time code or a network-bound import.\n\n**Evidence:**\n- `docker exec void-treasuremap-backend python3 -c 'import app'` → timeout at 180s\n- Container health: `unhealthy`, FailingStreak 18+, `/api/health` unreachable from host\n- Flask basic test works when started with a minimal app, confirming port mapping is fine\n\n**Next step:** Audit `schwab_streamer.py`, `schwab_streamer` imports, and any module-level network/blocking code in `app.py`. Make import lazy or move streamer init to app startup.\n\n**Card created:** 2026-08-21",
  "pos": "top"
}
data = urllib.parse.urlencode(card_data).encode()
req = urllib.request.Request(f"https://api.trello.com/1/cards?key={KEY}&token={TOKEN}", data=data)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print("Created card:", result['id'], result['name'])
