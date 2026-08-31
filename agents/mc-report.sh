#!/usr/bin/env bash
# Report a Mission Control task's progress/outcome.
#   ./mc-report.sh <agentId> <taskId> <status> ["notes"]
#   status: in_progress | completed | failed | blocked
set -uo pipefail
AGENT_ID="${1:?usage: mc-report.sh <agentId> <taskId> <status> [notes]}"
TASK_ID="${2:?taskId required}"
STATUS="${3:?status required}"
NOTES="${4:-}"
MC="${MC_BASE:-http://localhost:3100}"
for _l in "$HOME/.claude/scripts/load-void-secrets.sh" \
          "/c/Users/kidsm/.claude/scripts/load-void-secrets.sh" \
          "/mnt/c/Users/kidsm/.claude/scripts/load-void-secrets.sh"; do
  # shellcheck disable=SC1090
  [ -r "$_l" ] && { source "$_l"; break; }
done
KEY="${MISSION_CONTROL_API_KEY:?MISSION_CONTROL_API_KEY not set}"
curl -sS -X POST "$MC/api/adapters" \
  -H "Content-Type: application/json" -H "x-api-key: $KEY" \
  -d "{\"framework\":\"generic\",\"action\":\"report\",\"payload\":{\"agentId\":\"$AGENT_ID\",\"taskId\":\"$TASK_ID\",\"status\":\"$STATUS\",\"notes\":$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$NOTES")}}"
echo
