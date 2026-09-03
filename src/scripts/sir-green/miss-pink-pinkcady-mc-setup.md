# Miss Pink — PINKCADY Mission Control Setup for Torus Coffee Company

Use this checklist on PINKCADY to mirror SQUIDSTATION's Captain Dashboard and connect into the master hive.

## Prereqs on PINKCADY
- Docker Desktop installed and running
- Git + Node.js 18+ installed
- LAN reachable to SQUIDSTATION `192.168.0.39:3100`
- Vault path available: `\\192.168.0.39\Backups\MissionControl` or local equivalent

## Exact Steps

1. **Clone the mission-control repo**
   - `git clone git@github.com:VOIDPirateTradeCo/Captain_Dashboard.git`
   - `cd Captain_Dashboard/mission-control`

2. **Create local `.env`**
   - Copy `.env.example` if present, otherwise create `.env`
   - Set `NEXT_PUBLIC_MC_API_URL=https://192.168.0.39:3100`
   - Set `MISSION_CONTROL_API_KEY` to the shared crew key from vault
   - Set Torus Coffee specific integrations only; do **not** add paid APIs

3. **Point crew compose to master ingress**
   - Edit `docker-compose.crew.yml`
   - Change any `MC_BASE` or `localhost:3100` references to `https://192.168.0.39:3100`
   - Keep PINKCADY local runtime on `localhost:3000`; master aggregates via `192.168.0.39:3100`

4. **Install deps and build**
   - `npm install`
   - `npx next build --webpack`
   - Fix any TypeScript errors before proceeding

5. **Create shared vault dirs for Torus Coffee**
   - Create `PINKCADY_Shared/vault/skills`
   - Create `PINKCADY_Shared/vault/memory`
   - Create `PINKCADY_Shared/vault/hive-mind`
   - Create `PINKCADY_Shared/vault/security`
   - Mount or map these into Docker volumes if running containerized

6. **Register Miss Pink with master Mission Control**
   - `curl -sS -X POST https://192.168.0.39:3100/api/agents/register -H "Content-Type: application/json" -H "x-api-key: $MISSION_CONTROL_API_KEY" -d '{"agentId":"miss-pink","name":"Miss Pink","framework":"hermes","metadata":{"host":"PINKCADY","scope":"torus-coffee"}}'`

7. **Verify heartbeat and task feed**
   - Send heartbeat every 5 minutes via `/api/adapters`
   - Confirm Miss Pink appears on master `https://192.168.0.39:3100/agents`
   - Confirm Torus Coffee scoped tasks appear

8. **Security baseline**
   - Apply Windows ACL or equivalent to `.env` and vault files
   - Enable sandbox mode `agents.defaults.sandbox.mode = "all"`
   - Set `tools.profile` to `coding`
   - Do not expose `.env` or vault contents to git

9. **End-to-end proof**
   - Capture `/health`, `/api/auth/me`, `/api/agents`, `/api/tokens` outputs
   - Post evidence to this Trello card as a comment

## Notes
- Do not modify `tr3asure mAp` cards; Sir Cobalt owns that scope.
- Stay on free-tier models unless already paid for.
- If push to GitHub fails from PINKCADY, use local commits only until connectivity is restored.
