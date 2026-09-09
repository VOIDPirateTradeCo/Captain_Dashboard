# sqlite-vec + Local Embeddings — Offline Message Memory (Research)

**Status:** Researched. Free, local, no external API.

## What it is
- **sqlite-vec**: a SQLite extension (single `.so`/`.dll`) that adds vector
  similarity search (cosine/dot) to SQLite. ~free, embedded, no server.
- Pairs with a **local embedding model** (e.g. `all-MiniLM-L6-v2` via
  sentence-transformers, or Ollama's `nomic-embed-text` on Sir Azure's rig)
  to embed crew messages/offline memory entirely offline.

## Why it supercharges the hive mind
- Crew chat / OODA history becomes **semantic-searchable** without sending
  anything off-LAN.
- Enables "remember when we discussed X" across the 3 PCs via the shared vault.
- No OpenAI/API cost — embeddings run on Sir Azure's local Ollama.

## Free path to deploy
1. `pip install sqlite-vec` (or load the prebuilt extension).
2. Store crew messages + `nomic-embed-text` vectors in a vault-side SQLite DB.
3. Query: `SELECT ... ORDER BY vec_distance_cosine(embed, ?) LIMIT 5`.

## Decision
Recommended. Add `crew_memory.db` (sqlite-vec) to the vault; embed via Sir
Azure's Ollama `nomic-embed-text`. Low risk, fully offline. Next: scaffold
the DB + embed script (tracked card).
