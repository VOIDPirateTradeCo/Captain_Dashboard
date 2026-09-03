# Fleet Mesh Verification — PINKCADY

Run these from PINKCADY and paste output back to your Trello card.

## 1. Local Mission Control health
curl -sS http://localhost:3000/health

## 2. Master Mission Control reachable from PINKCADY
curl -sS https://192.168.0.39:3100/health

## 3. Login to master SQUIDSTATION Mission Control
curl -sS -X POST https://192.168.0.39:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"captain","password":"captain"}' \
  --cookie-jar cookies.txt

## 4. Verify master sees PINKCADY agents
curl -sS https://192.168.0.39:3100/api/agents -b cookies.txt

## 5. Verify master fleet connectivity
curl -sS https://192.168.0.39:3100/api/fleet/connectivity -b cookies.txt

## 6. Self-reachability from PINKCADY
curl -sS http://localhost:3000/api/agents

## 7. Cross-ship PINKCADY → STEALTHATTACK
curl -sS http://192.168.0.68:3000/health
curl -sS http://192.168.0.68:3000/api/health

## 8. Cross-ship PINKCADY → SQUIDSTATION master
curl -sS https://192.168.0.39:3100/health

## 9. Mesh verification from master
curl -sS https://192.168.0.39:3100/api/fleet/mesh/verify -b cookies.txt

## Expected results
- Steps 1, 6, 7, 8 should show reachable endpoints
- Step 5 should eventually show PINKCADY reachable=true from master
- Step 9 should show all ships reachable from master perspective

## Troubleshooting
- If cert blocks you, add permanent exception in Firefox/Chrome
- If `192.168.0.68:3000` fails, try Tailscale: `http://100.110.238.68:3000/health`
- If master `3100` fails, check master is running: `https://192.168.0.39:3100/health`
