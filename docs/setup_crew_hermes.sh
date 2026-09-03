#!/usr/bin/env bash
# Setup script for crew Hermes profiles on remote machines
# Run this on each crew machine to configure their Hermes desktop app profile
# Usage: ./setup_crew_hermes.sh <agent-id> <agent-name> <ship> <skills>
# Example: ./setup_crew_hermes.sh sir-azure "Sir Azure" STEALTHATTACK "flux-best-practices,comfyui,code-review"

set -euo pipefail

AGENT_ID="${1:?Usage: $0 <agent-id> <agent-name> <ship> <skills>}"
AGENT_NAME="${2:?Usage: $0 <agent-id> <agent-name> <ship> <skills>}"
SHIP="${3:?Usage: $0 <agent-id> <agent-name> <ship> <skills>}"
SKILLS="${4:?Usage: $0 <agent-id> <agent-name> <ship> <skills>}"

echo "=== Setting up Hermes profile for $AGENT_NAME ($AGENT_ID) on $SHIP ==="

# Create profile directory
PROFILE_DIR="$HOME/AppData/Local/hermes/profiles/$AGENT_ID"
mkdir -p "$PROFILE_DIR"

# Create profile.yaml
cat > "$PROFILE_DIR/profile.yaml" << EOF
# $AGENT_NAME — Hermes Profile
name: $AGENT_ID
description: $AGENT_NAME — $SHIP crew member

# Crew context
crew:
  role: $AGENT_NAME
  ship: $SHIP
  captain: Captain Brewbeard Ledgerbane

# Skills loaded by default
skills:
$(echo "$SKILLS" | tr ',' '\n' | sed 's/^/  - /')

# Working directory
workdir: C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/mission-control

# Memory
memory:
  user: USER.md
  memory: MEMORY.md

# Rules
rules:
  - Always verify before claiming
  - Rate-limit Trello: 20-75s waits
  - OPSEC: never expose secrets in logs
  - No Captain's Watch label changes
EOF

echo "✓ Created profile: $PROFILE_DIR/profile.yaml"

# Verify Hermes config
if [ -f "$HOME/AppData/Local/hermes/config.yaml" ]; then
    echo "✓ Hermes config found at $HOME/AppData/Local/hermes/config.yaml"
else
    echo "⚠ Hermes config not found. Install Hermes desktop app first."
    exit 1
fi

# Register with Mission Control
echo ""
echo "=== Registering with Mission Control ==="
MC_KEY=$(grep "^API_KEY=" "$HOME/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/mission-control/.env" 2>/dev/null | cut -d= -f2 || echo "")

if [ -z "$MC_KEY" ]; then
    echo "⚠ Could not find Mission Control API key. Register manually:"
    echo "  curl -X POST http://localhost:3100/api/agents/register \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -H 'x-api-key: YOUR_KEY' \\"
    echo "    -d '{\"name\":\"$AGENT_ID\",\"role\":\"agent\",\"capabilities\":[\"code\",\"review\"],\"framework\":\"hermes\"}'"
else
    curl -s -X POST http://localhost:3100/api/agents/register \
      -H "Content-Type: application/json" \
      -H "x-api-key: $MC_KEY" \
      -d "{\"name\":\"$AGENT_ID\",\"role\":\"agent\",\"capabilities\":[\"code\",\"review\"],\"framework\":\"hermes\"}" || true
    echo "✓ Registered with MC"
fi

echo ""
echo "=== Setup complete for $AGENT_NAME ==="
echo "Next steps:"
echo "1. Restart Hermes desktop app"
echo "2. Select the '$AGENT_ID' profile"
echo "3. Verify online in Mission Control UI"
