#!/usr/bin/env bash
# VOID Pirate wrapper for the local Mission Control stack.
#   ./void-mc.sh up -d        # start on http://localhost:3100
#   ./void-mc.sh ps | logs -f | down | restart
# Pins the compose project name (keeps the existing mc-data volume: admin acct +
# API key + DB) and uses explicit -f so docker-compose.override.yml is NOT loaded.
set -euo pipefail
cd "$(dirname "$0")"
exec docker compose \
  -p builderz-mission-control-repo \
  -f docker-compose.yml \
  -f docker-compose.void.yml \
  "$@"
