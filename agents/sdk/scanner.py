import subprocess
import platform
import json
from pathlib import Path


def scan_system():
    """Scan system packages"""
    packages = []
    
    # OS info
    packages.append({
        "name": "os",
        "version": platform.version(),
        "type": "system"
    })
    
    # Docker
    try:
        out = subprocess.check_output(["docker", "--version"], timeout=10).decode().strip()
        packages.append({"name": "docker", "version": out, "type": "system"})
    except:
        pass
    
    # Node
    try:
        out = subprocess.check_output(["node", "--version"], timeout=10).decode().strip()
        packages.append({"name": "node", "version": out, "type": "system"})
    except:
        pass
    
    # Python
    try:
        out = subprocess.check_output(["python", "--version"], timeout=10).decode().strip()
        packages.append({"name": "python", "version": out, "type": "system"})
    except:
        pass
    
    # Git
    try:
        out = subprocess.check_output(["git", "--version"], timeout=10).decode().strip()
        packages.append({"name": "git", "version": out, "type": "system"})
    except:
        pass
    
    return packages


def scan_pip():
    """Scan pip packages"""
    try:
        out = subprocess.check_output(["pip", "list", "--format=json"], timeout=15).decode()
        return json.loads(out)
    except:
        return []


def scan_npm():
    """Scan npm global packages"""
    try:
        out = subprocess.check_output(["npm", "list", "-g", "--depth=0", "--json"], timeout=15).decode()
        return json.loads(out).get("dependencies", {})
    except:
        return {}


def scan_all():
    """Run all scans"""
    return {
        "system": scan_system(),
        "pip": scan_pip(),
        "npm": scan_npm()
    }


if __name__ == "__main__":
    results = scan_all()
    print(json.dumps(results, indent=2))
