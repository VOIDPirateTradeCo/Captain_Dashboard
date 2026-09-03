# STEALTHATTACK Fleet Bootstrap — Sir Azure GPU/Art

This package mirrors the master SQUIDSTATION Mission Control setup for STEALTHATTACK.

## What this contains
- `env.stealthattack` — STEALTHATTACK `.env` template
- `docker-compose.stealth.yml` — STEALTHATTACK crew container overrides
- `setup-shared-vault.ps1` — create shared vault directories on STEALTHATTACK
- `shared-libraries.md` — shared library sync instructions
- `shared-workflows.md` — shared workflow setup
- `shared-agents.json` — GPU/art scoped agents for Sir Azure
- `fleet-mesh-setup.md` — full mesh network verification steps

## Setup order
1. Clone `VOIDPirateTradeCo/Captain_Dashboard` to `S:\Sir_Azure\Sir_Azure_Stuff\Sir_Azure_Mission_Control`
2. `cd S:\Sir_Azure\Sir_Azure_Stuff\Sir_Azure_Mission_Control\mission-control`
3. Copy `env.stealthattack` → `.env`
4. Run `npx next build --webpack`
5. Run `npx next dev --hostname 0.0.0.0 --port 3000`
6. Run `setup-shared-vault.ps1`
7. Register `sir-azure` with master
8. Verify mesh connectivity

## Master connection
- Master URL: `https://192.168.0.39:3100`
- Local MC: `http://localhost:3000`
- Auth: cookie-based (`captain`/`captain`)
- Do NOT use `x-api-key` headers for master endpoints

## Important notes
- STEALTHATTACK must NOT run MC on port 3100
- Master SQUIDSTATION owns 3100
- STEALTHATTACK local MC runs on 3000 and reports to master
- All code lives on S: drive: `S:\Sir_Azure\Sir_Azure_Stuff\Sir_Azure_Mission_Control`
- Tailscale IP: `100.110.238.68`
- LAN IP: `192.168.0.68`
