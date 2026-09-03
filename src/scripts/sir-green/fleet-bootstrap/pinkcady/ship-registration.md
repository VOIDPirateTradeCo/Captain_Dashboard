# Ship Registration Helper — PINKCADY

## Register PINKCADY with master SQUIDSTATION

Run these from PINKCADY:

```bash
# 1. Login to master
curl -sS -X POST https://192.168.0.39:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"captain","password":"captain"}' \
  --cookie-jar cookies.txt

# 2. Register PINKCADY ship
curl -sS -X POST https://192.168.0.39:3100/api/fleet/register \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "ship": "PINKCADY",
    "ip": "192.168.0.180",
    "tailscale_ip": "100.106.235.103",
    "port": 3000,
    "mc_url": "http://localhost:3000",
    "agents": ["miss-pink", "torus-coffee-bot"]
  }'

# 3. Verify registration
curl -sS https://192.168.0.39:3100/api/fleet/connectivity -b cookies.txt
```

## Create local agents on PINKCADY

```bash
# Create miss-pink agent locally
curl -sS -X POST http://localhost:3000/api/agents \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "miss-pink",
    "name": "Miss Pink",
    "framework": "hermes",
    "ship": "PINKCADY",
    "scope": "torus-coffee"
  }'

# Create torus-coffee-bot agent locally
curl -sS -X POST http://localhost:3000/api/agents \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "torus-coffee-bot",
    "name": "Torus Coffee Bot",
    "framework": "hermes",
    "ship": "PINKCADY",
    "scope": "torus-coffee"
  }'
```

## Verify full mesh

```bash
# From PINKCADY, check all ships
curl -sS http://localhost:3000/api/fleet/mesh/verify
```

## Expected output
- `miss-pink` agent shows online
- `torus-coffee-bot` agent shows online
- Master connectivity shows PINKCADY reachable=true
- Mesh verify shows all ships reachable
