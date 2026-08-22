import urllib.request, json, time

BASE = "http://192.168.0.39:5001"
endpoints = [
    "/api/health",
    "/api/status",
    "/api/version",
    "/api/market/status",
    "/api/positions",
    "/api/balance",
    "/api/account",
    "/api/orders",
    "/api/watchlist",
    "/api/risk",
    "/api/performance",
    "/api/trade",
    "/api/execute",
    "/api/signals",
    "/api/augur",
    "/api/portfolio",
    "/api/alpaca/account_info",
    "/api/alpaca/positions",
    "/api/alpaca/orders",
    "/api/quarters/accounts",
    "/api/genome/presets",
    "/api/backtest",
    "/api/sim/last_full_result",
]

results = []
for ep in endpoints:
    try:
        req = urllib.request.Request(f"{BASE}{ep}", headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(body)
                keys = list(data.keys())[:5] if isinstance(data, dict) else (str(data)[:60] if not isinstance(data, list) else f"list[{len(data)}]")
                results.append((ep, resp.status, "JSON", keys))
            except:
                results.append((ep, resp.status, "NON-JSON", body[:60]))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:80]
        results.append((ep, e.code, "ERROR", body))
    except Exception as e:
        results.append((ep, "FAIL", "EXCEPTION", str(e)[:60]))

print(f"{'ENDPOINT':<35} {'STATUS':<8} {'TYPE':<10} {'DETAIL'}")
print("-" * 100)
for ep, status, typ, detail in results:
    print(f"{ep:<35} {str(status):<8} {typ:<10} {detail}")
