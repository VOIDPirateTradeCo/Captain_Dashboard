"""
Git sync utilities for Agent SDK
"""
import subprocess
import os
from pathlib import Path
from datetime import datetime


AGENTS_SDK = Path(__file__).parent


def check_git_status():
    """Check if working tree is clean"""
    try:
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            cwd=AGENTS_SDK,
            capture_output=True,
            text=True,
            timeout=10
        )
        changes = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        return {
            'clean': len(changes) == 0,
            'changes': changes
        }
    except Exception:
        return {'clean': False, 'changes': []}


def get_git_branch():
    """Get current git branch"""
    try:
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            cwd=AGENTS_SDK,
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return 'unknown'


def get_git_commit():
    """Get current commit hash"""
    try:
        result = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            cwd=AGENTS_SDK,
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip()[:8]
    except Exception:
        return 'unknown'


def pull_latest():
    """Pull latest changes from remote"""
    try:
        result = subprocess.run(
            ['git', 'pull', '--rebase'],
            cwd=AGENTS_SDK,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            'success': result.returncode == 0,
            'message': result.stdout.strip() or result.stderr.strip()
        }
    except Exception as e:
        return {'success': False, 'message': str(e)}


def sync_check():
    """Run full sync check"""
    status = check_git_status()
    branch = get_git_branch()
    commit = get_git_commit()
    
    return {
        'branch': branch,
        'commit': commit,
        'clean': status['clean'],
        'changes': status['changes'],
        'timestamp': datetime.utcnow().isoformat()
    }
