# Shared Libraries — Fleet Sync

## Goal
Keep these libraries identical across all ships:
- `mission-control/src/lib/agent-templates.ts`
- `mission-control/src/lib/task-dispatch.ts`
- `mission-control/src/lib/backup-replication.ts`
- `mission-control/src/lib/trello-bridge.ts`
- `mission-control/src/lib/config.ts`

## Sync method
1. Pull latest from `VOIDPirateTradeCo/Captain_Dashboard` master branch
2. If you have local changes, merge carefully
3. Run `npx next build --webpack` to verify

## Verification
- Build exits 0
- `/api/agents` returns expected agents
- `/api/fleet/connectivity` shows all reachable ships

## Troubleshooting
- If build fails, check for merge conflicts in `src/lib/`
- Do NOT edit `agent-templates.ts` unless coordinating with Sir Green
- Token budget schema must match master exactly
