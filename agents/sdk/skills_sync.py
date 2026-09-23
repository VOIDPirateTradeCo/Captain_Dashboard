"""
Skills vault sync utilities for Agent SDK
Syncs skills from master vault to agent nodes
"""
import os
import shutil
import hashlib
import json
from pathlib import Path
from datetime import datetime

DEFAULT_VAULT = Path(__file__).resolve().parent.parent.parent / "Obsidian_Vault" / "04_AI_Operating_System" / "Skills Vault"


def get_skills_index(vault_path=None):
    """Get index of all skills in vault"""
    vault = Path(vault_path) if vault_path else DEFAULT_VAULT
    skills = []
    if not vault.exists():
        return skills
    for skill_dir in vault.iterdir():
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
            skill_file = skill_dir / "SKILL.md"
            content = skill_file.read_text(encoding='utf-8', errors='ignore')
            skills.append({
                'name': skill_dir.name,
                'path': str(skill_dir),
                'size': len(content),
                'hash': hashlib.md5(content.encode()).hexdigest()[:8],
            })
    return sorted(skills, key=lambda x: x['name'])


def sync_skills_to_agent(agent_node_path, vault_path=None):
    """Sync skills vault to agent node"""
    vault = Path(vault_path) if vault_path else DEFAULT_VAULT
    agent_skills = Path(agent_node_path) / "skills"
    agent_skills.mkdir(parents=True, exist_ok=True)
    
    if not vault.exists():
        return {'status': 'error', 'message': f'Vault not found: {vault}'}
    
    synced = []
    for skill_dir in vault.iterdir():
        if skill_dir.is_dir() and (skill_dir / "SKILL.md").exists():
            dest = agent_skills / skill_dir.name
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(skill_dir, dest)
            synced.append(skill_dir.name)
    
    return {
        'status': 'ok',
        'synced': len(synced),
        'skills': sorted(synced),
        'timestamp': datetime.now().isoformat(),
    }


def verify_skills(agent_node_path, vault_path=None):
    """Verify agent node has latest skills"""
    vault = Path(vault_path) if vault_path else DEFAULT_VAULT
    agent_skills = Path(agent_node_path) / "skills"
    
    if not vault.exists() or not agent_skills.exists():
        return {'status': 'error', 'message': 'Vault or agent skills not found'}
    
    master = get_skills_index(vault_path)
    agent = get_skills_index(agent_skills)
    
    master_names = {s['name'] for s in master}
    agent_names = {s['name'] for s in agent}
    
    missing = master_names - agent_names
    extra = agent_names - master_names
    
    return {
        'status': 'ok',
        'master_count': len(master),
        'agent_count': len(agent),
        'missing': sorted(missing),
        'extra': sorted(extra),
        'in_sync': len(missing) == 0 and len(extra) == 0,
    }
