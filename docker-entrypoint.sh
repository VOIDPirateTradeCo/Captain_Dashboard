#!/bin/sh
set -e

. /app/scripts/load-env.sh

# --- Load .env as literal configuration if present ---
if [ -f /app/.env ]; then
  printf '[entrypoint] Loading .env\n'
  load_env_file /app/.env
fi

# --- Helper: generate a random hex secret ---
generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

SECRETS_FILE="/app/.data/.generated-secrets"

# Ensure secrets file has restrictive permissions if it exists
if [ -f "$SECRETS_FILE" ]; then
  chmod 600 "$SECRETS_FILE"
fi

# Load previously generated secrets if they exist
if [ -f "$SECRETS_FILE" ]; then
  printf '[entrypoint] Loading persisted secrets from .data\n'
  load_env_file "$SECRETS_FILE"
fi

# --- AUTH_SECRET ---
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "random-secret-for-legacy-cookies" ]; then
  AUTH_SECRET=$(generate_secret)
  printf '[entrypoint] Generated new AUTH_SECRET\n'
  printf 'AUTH_SECRET=%s\n' "$AUTH_SECRET" >> "$SECRETS_FILE"
  export AUTH_SECRET
fi

# --- API_KEY ---
if [ -z "$API_KEY" ] || [ "$API_KEY" = "generate-a-random-key" ]; then
  API_KEY=$(generate_secret)
  printf '[entrypoint] Generated new API_KEY\n'
  printf 'API_KEY=%s\n' "$API_KEY" >> "$SECRETS_FILE"
  export API_KEY
fi

# --- HTTPS proxy for HSTS + Secure cookies ---
# Start the proxy in the background; Next.js still listens on 3000 internally.
printf '[entrypoint] Starting HTTPS proxy on %s\n' "${MC_PORT:-3100}"
node /app/scripts/mc-https-proxy.js > /app/.data/https-proxy.log 2>&1 &
PROXY_PID=$!

# Wait for proxy to be ready
sleep 2
if ! kill -0 "$PROXY_PID" 2>/dev/null; then
  printf '[entrypoint] HTTPS proxy failed to start; check .data/https-proxy.log\n' >&2
  exit 1
fi

printf '[entrypoint] Starting Next.js server on port %s\n' "${PORT:-3000}"
exec node server.js
