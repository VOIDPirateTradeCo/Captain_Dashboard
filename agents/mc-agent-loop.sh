#!/usr/bin/env bash
# Mission Control pull-model agent loop.
#   ./mc-agent-loop.sh sir-cobalt "Sir Cobalt (Claude)" code,review,research,ops,composio
#   ./mc-agent-loop.sh sir-cobalt "Sir Cobalt (Claude)" code,review --once   # register + one poll, exit
#
# register -> heartbeat (5m) -> poll assignments -> (print them) -> repeat.
# The agent (a human or a Claude session) picks up printed task text, does the
# work, then reports with:  ./mc-report.sh <agentId> <taskId> completed "notes"
set -uo pipefail

AGENT_ID="${1:?usage: mc-agent-loop.sh <agentId> <name> [caps] [--once]}"
AGENT_NAME="${2:-$AGENT_ID}"
CAPS="${3:-code,review}"
ONCE=""
[ "${4:-}" = "--once" ] && ONCE=1

MC="${MC_BASE:-http://localhost:3100}"
# find the secrets loader at $HOME (Git Bash) or the fixed Windows path (WSL/other)
for _l in "$HOME/.claude/scripts/load-void-secrets.sh" \
          "/c/Users/kidsm/.claude/scripts/load-void-secrets.sh" \
          "/mnt/c/Users/kidsm/.claude/scripts/load-void-secrets.sh"; do
  # shellcheck disable=SC1090
  [ -r "$_l" ] && { source "$_l"; break; }
done
KEY="${MISSION_CONTROL_API_KEY:?MISSION_CONTROL_API_KEY not in _KEY_VAULT/secrets.env}"

_caps_json() { printf '%s' "$1" | awk -F, '{for(i=1;i<=NF;i++){printf "%s\"%s\"",(i>1?",":""),$i}}'; }

_call() { # action  payload-json
  curl -sS -X POST "$MC/api/adapters" \
    -H "Content-Type: application/json" -H "x-api-key: $KEY" \
    -H "X-Agent-Name: $AGENT_NAME" \
    -d "{\"framework\":\"generic\",\"action\":\"$1\",\"payload\":$2}"
}

echo "[mc] register $AGENT_ID -> $MC"
_call register "{\"agentId\":\"$AGENT_ID\",\"name\":\"$AGENT_NAME\",\"metadata\":{\"capabilities\":[$(_caps_json "$CAPS")],\"host\":\"$(hostname)\"}}"
echo

poll() {
  _call heartbeat "{\"agentId\":\"$AGENT_ID\",\"status\":\"online\"}" >/dev/null
  # also poke the agents table so the MC UI shows 'online' (adapter heartbeat
  # alone doesn't update agent.status/last_seen in this MC build)
  curl -sS -X POST "$MC/api/agents" -H "Content-Type: application/json" -H "x-api-key: $KEY" \
    -d "{\"name\":\"$AGENT_ID\",\"status\":\"online\"}" >/dev/null 2>&1 || true
  local r; r=$(_call assignments "{\"agentId\":\"$AGENT_ID\"}")
  local n; n=$(printf '%s' "$r" | python3 -c "import sys,json;d=json.load(sys.stdin);a=d.get('assignments',[]);print(len(a));[print('  TASK',t.get('taskId'),'| p'+str(t.get('priority')),'|',(t.get('description') or '').splitlines()[0][:100]) for t in a]" 2>/dev/null || echo 0)
  echo "[mc] $(date +%H:%M:%S) assignments: $n"
}

poll
[ -n "$ONCE" ] && exit 0
while true; do sleep 300; poll; done
