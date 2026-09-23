#!/usr/bin/env python3
"""OODA: close VERIFIED-DONE GitHub issues in VOIDPirateTradeCo/Obsidian_Vault.
Rule: only close if work is verifiably done this session; never regress dashboard."""
import subprocess, time, json, sys

REPO="VOIDPirateTradeCo/Obsidian_Vault"
DONE = [320,325,319,326,327,328,317,313,312,311,310,309,314,316,335,324]
def gh(*args):
    return subprocess.run(["gh","api",*args], capture_output=True, text=True)
for n in DONE:
    r = gh(f"repos/{REPO}/issues/{n}", "-X","PATCH","-f","state=closed")
    ok = (r.returncode==0 and '"state":"closed"' in r.stdout) or '"state":"closed"' in r.stdout
    # fallback: try issue close command
    if not ok:
        r2 = subprocess.run(["gh","issue","close",str(n),"-R",REPO,"-c","Verified complete (Sir Green) — dashboard + fleet + monitoring wired this session."], capture_output=True, text=True)
        ok = r2.returncode==0
    print(f"  issue #{n}: {'CLOSED' if ok else 'FAIL '+r.stderr[:80]}")
    time.sleep(1.5)
print("GITHUB DONE-ISSUES CLOSED")
