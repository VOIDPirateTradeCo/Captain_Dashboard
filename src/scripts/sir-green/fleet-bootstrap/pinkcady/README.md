# PINKCADY Fleet Bootstrap — Torus Coffee Company

This package mirrors the master SQUIDSTATION Mission Control setup for PINKCADY.

## What this contains
- `env.pinkcady` — PINKCADY `.env` template
- `docker-compose.pink.yml` — PINKCADY crew container overrides
- `setup-shared-vault.ps1` — create shared vault directories on PINKCADY
- `shared-libraries.md` — shared library sync instructions
- `shared-workflows.md` — shared workflow setup
- `shared-agents.json` — Torus Coffee scoped agents for Miss Pink
- `fleet-mesh-setup.md` — full mesh network verification steps

## Setup order
1. Clone `VOIDPirateTradeCo/Captain_Dashboard` to PINKCADY
2. `cd Captain_Dashboard/mission-control`
3. Copy `env.pinkcady` → `.env`
4. Run `npx next build --webpack`
5. Run `npx next dev --hostname 0.0.0.0 --port 3000`
6. Run `setup-shared-vault.ps1`
7. Register `miss-pink` with master
8. Verify mesh connectivity

## Master connection
- Master URL: `https://192.168.0.39:3100`
- Local MC: `http://localhost:3000`
- Auth: cookie-based (`captain`/`captain`)
- Do NOT use `x-api-key` headers for master endpoints

## Important notes
- PINKCADY must NOT run MC on port 3100
- Master SQUIDSTATION owns 3100
- PINKCADY local MC runs on 3000 and reports to master
- Tailscale IP: `100.106.235.103`
- LAN IP: `192.168.0.180`
