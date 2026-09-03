# Shared Workflows — Fleet Sync

## Goal
Keep these workflows identical across all ships:
- Mission Control build: `npx next build --webpack`
- Dev server start: `npx next dev --hostname 0.0.0.0 --port 3000`
- Backup replication: run `POST /api/backup` from master
- Fleet probe update: when adding new ship, update both `connectivity/route.ts` and `resources/route.ts`
- Token budget schema: use `mode`, `contextWindowHardCap`, `paidEscalation` only

## Verification
- Build exits 0 on all ships
- Master `/api/fleet/connectivity` shows all reachable ships
- Agent panels show correct token-budget badges on all ships

## Troubleshooting
- If crew containers can't reach LAN, add `extra_hosts` or host networking
- If Trello API returns 400/401, re-extract credentials from Windows Credential Manager
- If mesh verify returns HTML, check auth middleware and panel catch-all route
