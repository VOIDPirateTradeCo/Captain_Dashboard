"""Canonical path guard for VOID Pirate / Captain Dashboard automation.

Approved roots:
- Business root: C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co
- Vault:        <business root>\Obsidian_Vault
- Dashboard:    <business root>\Captain_Dashboard

Any write/read outside these roots is rejected by path_guard().
"""
from pathlib import Path

BUSINESS_ROOT = Path(r"C:\Users\kidsm\Documents\My Docs\VOID Pirate Trading Co")
VAULT_PATH = BUSINESS_ROOT / "Obsidian_Vault"
DASHBOARD_PATH = BUSINESS_ROOT / "Captain_Dashboard"

SECRETS_ENV = VAULT_PATH / "02_Business_Operations" / "_Hub" / "_KEY_VAULT" / "secrets.env"
SIR_GREEN_INBOX = VAULT_PATH / "Developer_Brain" / "SIR_GREEN_INBOX"
MISS_PINK_INBOX = VAULT_PATH / "Developer_Brain" / "MISS_PINK_INBOX"
SIR_AZURE_INBOX = VAULT_PATH / "Developer_Brain" / "SIR_AZURE_INBOX"
VAULT_AUDIT_PATH = VAULT_PATH / "Developer_Brain" / "02_Business_Operations" / "_Hub" / "VAULT_AUDIT.md"
DASHBOARD_DIAGRAM_MMD = VAULT_PATH / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "tools" / "memory-stack" / "dashboard_diagram.mmd"
DASHBOARD_DIAGRAM_PNG = VAULT_PATH / "Developer_Brain" / "02_Business_Operations" / "Infrastructure" / "tools" / "memory-stack" / "dashboard_diagram.png"
DASHBOARD_DIAGRAM_DIR = DASHBOARD_DIAGRAM_MMD.parent
FLEET_MESH_STATE = VAULT_PATH / "02_Business_Operations" / "state" / "fleet_mesh_state.json"

APPROVED_ROOTS = {
    BUSINESS_ROOT,
    VAULT_PATH,
    DASHBOARD_PATH,
    DASHBOARD_DIAGRAM_DIR,
    VAULT_PATH / "02_Business_Operations" / "state",
}


def path_guard(target, mode="read"):
    """Reject paths outside approved roots."""
    try:
        p = Path(target).resolve()
    except Exception:
        raise ValueError(f"Bad path: {target}")

    if mode == "read":
        allowed = APPROVED_ROOTS
    elif mode == "write":
        allowed = APPROVED_ROOTS
    else:
        raise ValueError(f"Unknown mode: {mode}")

    if not any(str(p).startswith(str(root)) for root in allowed):
        raise PermissionError(f"Blocked {mode} outside approved root: {p} -> {target}")
    return p
