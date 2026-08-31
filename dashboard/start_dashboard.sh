#!/bin/bash
# start_dashboard.sh — Start dashboard server with proper binding
cd "$(dirname "$0")"

# Load fleet secrets into the environment before the server starts.
# dashboard_server.py reads WHITE_WHALE_PASSPHRASE_HASH (+ other keys) from
# os.environ only — without this the WHITE WHALE gate silently falls back to
# the committed (burned) legacy hash. Canonical vault path; WSL fallback too.
for _kv in \
  "/c/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/03_Business_Operations/_Hub/_KEY_VAULT/secrets.env" \
  "/mnt/c/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/03_Business_Operations/_Hub/_KEY_VAULT/secrets.env" \
  "${VOID_KEY_VAULT_SECRETS:-}" ; do
  if [ -n "$_kv" ] && [ -r "$_kv" ]; then
    set -a; . "$_kv" 2>/dev/null; set +a
    break
  fi
done
unset _kv

exec python3 dashboard_server.py --host 0.0.0.0 --port 9000
