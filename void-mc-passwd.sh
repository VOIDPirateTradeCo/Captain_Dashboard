#!/usr/bin/env bash
# VOID Pirate — Mission Control admin credential tool.
#
# MC has no in-app "forgot password" and no CLI user command. The admin account
# (username + scrypt password hash) lives in the SQLite DB inside the running
# container at /app/.data/mission-control.db. This wraps the DB ops so the
# Captain never has to hand-write a scrypt hash.
#
#   ./void-mc-passwd.sh list
#       Show every MC user (id / username / email / role / last login). No secrets.
#
#   ./void-mc-passwd.sh set <username> <password>
#       Reset <username>'s password (>=12 chars). Creates the user as admin if it
#       does not exist. Hash format + scrypt params match src/lib/password.ts.
#
#   ./void-mc-passwd.sh reset
#       DELETE every row from users so http://<host>:3100/setup reopens and you
#       create a fresh admin in the browser. Agents / tasks / workspaces /
#       API keys are in other tables and are NOT touched.
#
# Every mutating action snapshots the DB to .backups/ first (gitignored).
# Requires: the `mission-control` container running (./void-mc.sh up -d).
set -euo pipefail

CONTAINER="mission-control"
DB="/app/.data/mission-control.db"
HERE="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$HERE/.backups"

die() { echo "ERR: $*" >&2; exit 1; }

docker inspect "$CONTAINER" >/dev/null 2>&1 || die "container '$CONTAINER' not found — run ./void-mc.sh up -d"
[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = "true" ] || die "container '$CONTAINER' is not running"

backup() {
  mkdir -p "$BACKUP_DIR"
  local ts stamp dest
  ts="$(date +%Y%m%d-%H%M%S)"
  dest="$BACKUP_DIR/mission-control.$ts.db"
  docker cp "$CONTAINER:$DB" "$dest"
  echo "backup: $dest"
}

# Run a Node snippet inside the container. Node + better-sqlite3 ship in the image;
# crypto is built in. $1 = JS. Extra args are process.argv[1..].
node_in() {
  local js="$1"; shift
  docker exec -i "$CONTAINER" node -e "$js" "$@"
}

cmd="${1:-}"; shift || true

case "$cmd" in
  list)
    node_in '
      const D = require("better-sqlite3");
      const db = new D("/app/.data/mission-control.db", { readonly: true });
      const rows = db.prepare(
        "SELECT id, username, email, role, provider, is_approved, last_login_at FROM users ORDER BY id"
      ).all();
      if (!rows.length) { console.log("(no users - /setup is open)"); process.exit(0); }
      for (const r of rows) {
        const last = r.last_login_at ? new Date(r.last_login_at * 1000).toISOString() : "never";
        console.log("#" + r.id + "  " + r.username + "  <" + (r.email || "") + ">  role=" + r.role +
                    "  provider=" + r.provider + "  approved=" + r.is_approved + "  last_login=" + last);
      }
    '
    ;;

  set)
    user="${1:-}"; pass="${2:-}"
    [ -n "$user" ] && [ -n "$pass" ] || die "usage: $0 set <username> <password>"
    [ "${#pass}" -ge 12 ] || die "password must be at least 12 characters (MC rule)"
    backup
    MC_USER="$user" MC_PASS="$pass" docker exec -i \
      -e MC_USER -e MC_PASS "$CONTAINER" node -e '
      const { scryptSync, randomBytes } = require("crypto");
      const D = require("better-sqlite3");
      const N = 65536, KEYLEN = 32, MAXMEM = 128 * 65536 * 8 * 2; // src/lib/password.ts
      const user = process.env.MC_USER, pass = process.env.MC_PASS;
      const salt = randomBytes(16).toString("hex");
      const hash = scryptSync(pass, salt, KEYLEN, { N, maxmem: MAXMEM }).toString("hex");
      const stored = salt + ":" + hash;
      const db = new D("/app/.data/mission-control.db");
      const row = db.prepare("SELECT id FROM users WHERE username = ?").get(user);
      if (row) {
        db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
          .run(stored, Math.floor(Date.now()/1000), row.id);
        console.log("password reset for existing user: " + user);
      } else {
        const wsRow = db.prepare("SELECT id FROM workspaces ORDER BY id LIMIT 1").get();
        const ws = wsRow ? wsRow.id : 1;
        db.prepare(
          "INSERT INTO users (username, display_name, password_hash, role, provider, is_approved, workspace_id) " +
          "VALUES (?,?,?,?,?,?,?)"
        ).run(user, user, stored, "admin", "local", 1, ws);
        console.log("created new admin user: " + user);
      }
    '
    echo "done — log in at the MC /login page with: $user / <the password you set>"
    echo "tip: docker restart $CONTAINER  (optional, forces a clean reload)"
    ;;

  reset)
    backup
    node_in '
      const D = require("better-sqlite3");
      const db = new D("/app/.data/mission-control.db");
      const n = db.prepare("DELETE FROM users").run().changes;
      console.log("deleted " + n + " user row(s)");
    '
    echo "done — open  http://<host>:3100/setup  in a browser and create a fresh admin."
    echo "tip: docker restart $CONTAINER"
    ;;

  ""|-h|--help|help)
    sed -n '2,32p' "$0"
    ;;

  *)
    die "unknown command '$cmd' — try: list | set <user> <pass> | reset"
    ;;
esac
