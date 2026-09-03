# Mission Control — Local Crew AGENTS.md

This file is auto-loaded by Mission Control when the working directory is
`Captain_Dashboard/mission-control/`. It defines the **Pirate Captain's
Dashboard hive-mind crew** and how every agent should register, heartbeat,
and report back to MC.

---

## CREW ROSTER (local network + Docker)

| Agent ID | Name | Framework | Ship | Role | Default Caps |
|----------|------|-----------|------|------|--------------|
| captain | Captain Brewbeard Ledgerbane | generic | SQUIDSTATION | Owner | all |
| sir-green | Sir Green | hermes | SQUIDSTATION | VOID Ops + LAN + Dashboard | code,review,ops,dashboard |
| sir-cobalt | Sir Cobalt | claude | SQUIDSTATION | Logistics + Bug Hunt | code,review,research,ops |
| sir-azure | Sir Azure | claude | STEALTHATTACK | GPU Rendering + AI Art | code,review,art,gpu |
| sir-violet | Sir Violet | hermes | SQUIDSTATION | Intel + Research | research,intel,osint,cybersec |
| miss-pink | Miss Pink | hermes | PINKCADY | Torus Coffee Commander | ops,torus,dashboard,comms |
| mr-blue | Mr. Blue | codex | SQUIDSTATION | New Crew (TBD) | code,review,research |

---

## REGISTRATION

Every agent must register with MC before it will appear on the dashboard.

```bash
curl -sS -X POST "http://localhost:3100/api/adapters" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${MISSION_CONTROL_API_KEY}" \
  -H "X-Agent-Name: <Agent Name>" \
  -d '{
    "framework": "generic",
    "action": "register",
    "payload": {
      "agentId": "<agent-id>",
      "name": "<Agent Name>",
      "metadata": {
        "capabilities": ["code","review"],
        "host": "'$(hostname)'"
      }
    }
  }'
```

---

## HEARTBEAT

Keepalive every **5 minutes** so MC shows the agent as `online`:

```bash
curl -sS -X POST "http://localhost:3100/api/adapters" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${MISSION_CONTROL_API_KEY}" \
  -d '{
    "framework": "generic",
    "action": "heartbeat",
    "payload": {"agentId": "<agent-id>", "status": "online"}
  }'
```

---

## TASK ASSIGNMENTS

Poll for assigned tasks:

```bash
curl -sS -X POST "http://localhost:3100/api/adapters" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${MISSION_CONTROL_API_KEY}" \
  -d '{
    "framework": "generic",
    "action": "assignments",
    "payload": {"agentId": "<agent-id>"}
  }'
```

Report completion:

```bash
curl -sS -X POST "http://localhost:3100/api/adapters" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${MISSION_CONTROL_API_KEY}" \
  -d '{
    "framework": "generic",
    "action": "report",
    "payload": {
      "agentId": "<agent-id>",
      "taskId": "<task-id>",
      "status": "completed",
      "notes": "Done. Evidence: ..."
    }
  }'
```

---

## DOCKER AGENT LOOP

Each crew agent runs as a Docker service using `mc-agent-loop.sh`:

```bash
# One-liner per agent
docker compose -f docker-compose.yml -f docker-compose.void.yml \
  --profile <agent-id> up -d
```

Profiles defined in `docker-compose.crew.yml`.

---

## DESKTOP APP CONFIG

| App | Config Path | Crew Profile |
|-----|-------------|--------------|
| Hermes Desktop | `~/AppData/Local/hermes/` | `default` + `sir-green` |
| Claude Desktop | `~/AppData/Roaming/Claude/claude_desktop_config.json` | Per-project |
| Codex CLI | `~/.codex/AGENTS.md` | Per-directory |

Each desktop app should point its working directory to this Mission Control
repo so this `AGENTS.md` is auto-discovered.

---

## RULES

1. **Captain approves all Done moves** — no agent closes a Trello card without evidence + captain approval.
2. **Sir Cobalt owns PROJECT_tr3asure_mAp/** — no other agent touches that repo.
3. **OPSEC first** — never expose `.env`, tokens, keys, or secrets in logs/comments.
4. **Verify before claim** — every fix must be tested with real commands before reporting done.
5. **Rate-limit Trello** — 20–75s waits between card mutations; verify board state after each batch.
6. **No Captain's Watch label changes** — that label is reserved for the Captain only.

---

*Standing orders by Sir Green — 2026-09-01.*
