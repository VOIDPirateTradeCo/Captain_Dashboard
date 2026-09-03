# PINKCADY Shared Vault Layout — Torus Coffee Company

Mirror this structure under the Mission Control repo or a shared SMB path.

## Required dirs
- `PINKCADY_Shared/vault/skills`
- `PINKCADY_Shared/vault/memory`
- `PINKCADY_Shared/vault/hive-mind`
- `PINKCADY_Shared/vault/security`

## Mount/volume rules
- If using Docker, mount each dir read-write for Miss Pink only.
- If using SMB, map `\\192.168.0.39\Backups\MissionControl\PINKCADY_Shared` to `PINKCADY_Shared`.
- Do not cross-mount SQUIDSTATION-only vault files.

## Sync policy
- Skills and memory sync from master to crew on demand, not continuously.
- Hive-mind state is append-only; do not rewrite history.
- Security vault contains Torus Coffee credentials only; no shared secrets from other ships.
