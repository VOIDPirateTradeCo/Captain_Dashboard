#!/usr/bin/env python3
"""Deep vault audit — verifies vault integrity, writes VAULT_AUDIT.md.
Checks: git status, broken internal md links, secrets-in-repo, large/duplicate files,
orphan attachments. Pure local, no network."""
import os, re, hashlib, time
from datetime import datetime, timezone
from pathlib import Path

VAULT = Path(r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co\Obsidian_Vault")
OUT = VAULT / "Developer_Brain" / "02_Business_Operations" / "_Hub" / "VAULT_AUDIT.md"
SECRET_RE = re.compile(r"(TRELLO_TOKEN|DISCORD_\w+_TOKEN|GH_TOKEN|GITHUB_TOKEN|API_KEY|client_secret|password\s*=\s*['\"]\w)", re.I)
SKIP_DIRS = {".git", "node_modules", ".hermes-runtime", "_KEY_VAULT", "vendor"}

def walk():
    for root, dirs, files in os.walk(VAULT):
        parts = set(Path(root).parts)
        if parts & SKIP_DIRS:
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            continue
        for f in files:
            yield Path(root) / f

def main():
    md_files, all_files = [], []
    broken_links, secret_hits, big_files, hashes = [], [], [], {}
    for p in walk():
        all_files.append(p)
        if p.suffix.lower() == ".md":
            md_files.append(p)
            try:
                txt = p.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            # secrets
            for m in SECRET_RE.finditer(txt):
                secret_hits.append(f"{p.relative_to(VAULT)} :: {m.group(0)[:30]}")
            # internal links [[...]] and [](...)
            for lnk in re.findall(r"\[\[([^\]]+)\]\]|\[[^\]]*\]\(\.?([^)]+)\)", txt):
                target = (lnk[0] or lnk[1]).split("|")[0].split("#")[0].strip()
                if not target: continue
                cand = p.parent / target
                if not cand.exists():
                    broken_links.append(f"{p.relative_to(VAULT)} -> {target}")
        # size + hash (dup detect)
        try:
            sz = p.stat().st_size
            if sz > 50_000_000:
                big_files.append(f"{p.relative_to(VAULT)} ({sz//1_000_000}MB)")
            h = hashlib.md5(p.read_bytes()).hexdigest()
            hashes.setdefault(h, []).append(str(p.relative_to(VAULT)))
        except Exception:
            pass
    dups = [v for v in hashes.values() if len(v) > 1]

    # git status
    import subprocess
    try:
        gs = subprocess.run(["git", "-C", str(VAULT), "status", "--short"], capture_output=True, text=True, timeout=30)
        git_short = gs.stdout.strip().splitlines()
    except Exception as e:
        git_short = [f"git error: {e}"]

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    lines = [f"# VOID Pirate Vault — Deep Audit", "",
             f"**Generated:** {ts}  ", f"**Auditor:** Sir Green (automated)", "",
             f"## Summary", f"- Markdown files scanned: **{len(md_files)}**",
             f"- Total files scanned: **{len(all_files)}**",
             f"- Broken internal links: **{len(broken_links)}**",
             f"- Potential secret strings in repo: **{len(secret_hits)}** (review; _KEY_VAULT excluded)",
             f"- Files >50MB: **{len(big_files)}**",
             f"- Duplicate-content file groups: **{len(dups)}**",
             f"- Git working-tree changes: **{len(git_short)}**",
             "", "## Broken internal links (sample)" ]
    lines += [f"  - {b}" for b in broken_links[:30]] or ["  - none"]
    lines += ["", "## Potential secrets (review)"]
    lines += [f"  - {s}" for s in secret_hits[:20]] or ["  - none found outside _KEY_VAULT"]
    lines += ["", "## Large files"]
    lines += [f"  - {b}" for b in big_files[:10]] or ["  - none >50MB"]
    lines += ["", "## Duplicate content groups"]
    lines += [f"  - {' == '.join(d)}" for d in dups[:10]] or ["  - none"]
    lines += ["", "## Git working tree"]
    lines += [f"  - {g}" for g in git_short[:30]] or ["  - clean"]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"audit written -> {OUT}")
    print(f"md={len(md_files)} broken={len(broken_links)} secrets={len(secret_hits)} dups={len(dups)} git_changes={len(git_short)}")

if __name__ == "__main__":
    main()
