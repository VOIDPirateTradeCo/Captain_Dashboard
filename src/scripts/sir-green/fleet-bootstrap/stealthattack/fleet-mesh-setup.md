# Fleet Mesh Verification — STEALTHATTACK

Run these from STEALTHATTACK and paste output back to your Trello card.

## 1. Local Mission Control health
curl -sS http://localhost:3000/health

## 2. Master Mission Control reachable from STEALTHATTACK
curl -sS https://192.168.0.39:3100/health

## 3. Login to master SQUIDSTATION Mission Control
curl -sS -X POST https://192.168.0.39:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"captain","password":"captain"}' \
  --cookie-jar cookies.txt

## 4. Verify master sees STEALTHATTACK agents
curl -sS https://192.168.0.39:3100/api/agents -b cookies.txt

## 5. Verify master fleet connectivity
curl -sS https://192.168.0.39:3100/api/fleet/connectivity -b cookies.txt

## 6. Self-reachability from STEALTHATTACK
curl -sS http://localhost:3000/api/agents

## 7. Cross-ship STEALTHATTACK → PINKCADY
curl -sS http://192.168.0.180:3000/health
curl -sS http://192.168.0.180:3000/api/health

## 8. Cross-ship STEALTHATTACK → SQUIDSTATION master
curl -sS https://192.168.0.39:3100/health

## 9. Mesh verification from master
curl -sS https://192.168.0.39:3100/api/fleet/mesh/verify -b cookies.txt

## Expected results
- Steps 1, 6, 7, 8 should show reachable endpoints
- Step 5 should eventually show STEALTHATTACK reachable=true from master
- Step 9 should show all ships reachable from master perspective

## Troubleshooting
- If cert blocks you, add permanent exception in Firefox/Chrome
- If `192.168.0.180:3000` fails, try Tailscale: `http://100.106.235.103:3000/health`
- If master `3100` fails, check master is running: `https://192.168.0.39:3100/health`
