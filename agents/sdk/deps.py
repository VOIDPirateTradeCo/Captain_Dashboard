"""
Dependency tracker utilities for Agent SDK
Scans installed packages and reports to master MC
"""
import os
import sys
import json
import platform
import subprocess
from pathlib import Path
from datetime import datetime


def get_installed_python():
    """Get list of installed Python packages"""
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'list', '--format=json'],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return json.loads(result.stdout)
    except Exception:
        pass
    return []


def get_installed_node():
    """Get list of installed Node packages"""
    packages = []
    try:
        result = subprocess.run(['npm', 'list', '-g', '--json'], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if 'dependencies' in data:
                packages = [{'name': k, 'version': v, 'manager': 'npm-global'} for k, v in data['dependencies'].items()]
    except Exception:
        pass
    return packages


def get_system_info():
    """Get system information"""
    return {
        'hostname': platform.node(),
        'platform': platform.system(),
        'platform_version': platform.version(),
        'architecture': platform.machine(),
        'python_version': platform.python_version(),
    }


def scan_dependencies():
    """Scan all dependencies on this machine"""
    return {
        'timestamp': datetime.now().isoformat(),
        'system': get_system_info(),
        'python': get_installed_python(),
        'node': get_installed_node(),
    }


def format_report():
    """Format dependency report for display"""
    deps = scan_dependencies()
    lines = []
    lines.append(f'# Dependency Report - {deps["system"]["hostname"]}')
    lines.append(f'Generated: {deps["timestamp"]}')
    lines.append('')
    lines.append(f'Platform: {deps["system"]["platform"]} {deps["system"]["platform_version"]}')
    lines.append(f'Python: {deps["system"]["python_version"]}')
    lines.append('')
    lines.append(f'## Python Packages ({len(deps["python"])})')
    for pkg in sorted(deps['python'], key=lambda x: x['name']):
        lines.append(f'- {pkg["name"]} {pkg["version"]}')
    lines.append('')
    lines.append(f'## Node Packages ({len(deps["node"])})')
    for pkg in sorted(deps['node'], key=lambda x: x['name']):
        lines.append(f'- {pkg["name"]} {pkg["version"]}')
    return '\n'.join(lines)


if __name__ == '__main__':
    print(format_report())
