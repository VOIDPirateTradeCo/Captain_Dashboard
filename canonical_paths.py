#!/usr/bin/env python3
"""Canonical path guards for the VOID Pirate Captain business directory.

Everything an agent or automation writes must live inside BUSINESS_ROOT.
Throwaway / scratch files go under SCRATCH_DIR (``_SCRATCH/<agent>/``), never
in ``C:\\tmp``, ``%TEMP%``, or the business root itself. See _SCRATCH/README.md.

Usage:
    from canonical_paths import path_guard, ensure_in_business, scratch_path
    path_guard('/some/path')                       # raises ValueError if outside
    out = ensure_in_business('Captain_Dashboard/data/output.json')
    tmp = scratch_path('probe.json', agent='sir-cobalt')
"""

import tempfile
from pathlib import Path

BUSINESS_ROOT = Path('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co').resolve()
VAULT_PATH = BUSINESS_ROOT / 'Obsidian_Vault'
# Scratch lives UNDER Captain_Dashboard (the ops/tooling area), never the business root
# and never the Obsidian vault (that is the knowledge source-of-truth).
SCRATCH_DIR = BUSINESS_ROOT / 'Captain_Dashboard' / '_SCRATCH'

# The OS temp dir is tolerated by path_guard(allow_temp=True) for legacy callers,
# but new code should use scratch_path() so the files stay visible in-tree.
_SYSTEM_TEMP = Path(tempfile.gettempdir()).resolve()

ALLOWED_OUTSIDE = set()  # no hardcoded outside paths


def _normalize(path_str):
    return Path(path_str).expanduser().resolve()


def _is_within(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def path_guard(path_str, allow_temp=True):
    """Return True if the path is safe for business operations.

    Safe = inside BUSINESS_ROOT (which includes _SCRATCH/), or — when
    ``allow_temp`` — inside the OS temp dir. Raises ValueError otherwise.
    """
    p = _normalize(path_str)

    if _is_within(p, BUSINESS_ROOT):
        return True

    if allow_temp and _is_within(p, _SYSTEM_TEMP):
        return True

    raise ValueError(
        f"Path outside business directory: {path_str}\n"
        f"Business root: {BUSINESS_ROOT}\n"
        f"Put scratch files under {SCRATCH_DIR} (see _SCRATCH/README.md)."
    )


def ensure_in_business(path_str):
    """Return an absolute path inside the business dir, creating parent dirs."""
    p = Path(path_str)
    if not p.is_absolute():
        p = BUSINESS_ROOT / p
    p = p.resolve()
    path_guard(p, allow_temp=False)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def scratch_path(name, agent=None):
    """Return a path under _SCRATCH/[<agent>/]<name>, creating the dir.

    Use this for every probe / verification / dump / debug artifact instead of
    C:\\tmp, /tmp, or %TEMP%.
    """
    base = SCRATCH_DIR / agent if agent else SCRATCH_DIR
    base.mkdir(parents=True, exist_ok=True)
    return base / name


if __name__ == '__main__':
    print('BUSINESS_ROOT:', BUSINESS_ROOT)
    print('VAULT_PATH   :', VAULT_PATH)
    print('SCRATCH_DIR  :', SCRATCH_DIR)
    print('system temp  :', _SYSTEM_TEMP)
    print('example      :', scratch_path('probe.json', agent='sir-cobalt'))
