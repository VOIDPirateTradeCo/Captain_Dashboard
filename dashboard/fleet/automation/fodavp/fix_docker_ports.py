import json
import subprocess
import time
import urllib.request
from typing import List, Tuple

CONFLICT_PORTS = [53709, 53755, 54400, 54332, 53912, 53554, 53699, 53571, 54501]
CONTAINERS = [
    "void-treasuremap-backend",
    "void-netbox",
    "void-netbox-db",
    "void-netbox-redis",
    "void-prometheus",
    "void-cadvisor-hardened",
    "void-grafana",
    "void-dnsmasq",
]


def docker(*args: str) -> str:
    result = subprocess.run(["docker", *args], capture_output=True, text=True, check=True)
    return result.stdout


def is_port_free(port: int) -> bool:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}", timeout=0.5) as resp:
            return False
    except Exception:
        return True


def find_conflicts() -> List[int]:
    return [port for port in CONFLICT_PORTS if not is_port_free(port)]


def stop_all_containers() -> None:
    for container in CONTAINERS:
        try:
            docker("stop", container)
        except subprocess.CalledProcessError:
            pass


def start_containers_ordered() -> None:
    order = [
        "void-netbox-db",
        "void-netbox-redis",
        "void-dnsmasq",
        "void-treasuremap-backend",
        "void-prometheus",
        "void-cadvisor-hardened",
        "void-grafana",
        "void-netbox",
    ]
    for container in order:
        if container in CONTAINERS:
            try:
                docker("start", container)
                time.sleep(2)
            except subprocess.CalledProcessError:
                pass


def verify_containers() -> List[str]:
    healthy = []
    for container in CONTAINERS:
        try:
            status = docker("ps", "--filter", f"name={container}", "--format", "{{.Names}}: {{.Status}}")
            if "Up" in status or "healthy" in status:
                healthy.append(container)
        except subprocess.CalledProcessError:
            pass
    return healthy


def main() -> None:
    print("=== DOCKER PORT CONFLICT FIX ===")
    
    # Step 1: Find conflicts
    conflicts = find_conflicts()
    print(f"Initial conflicts: {conflicts}")
    
    # Step 2: Stop all containers
    stop_all_containers()
    time.sleep(3)
    
    # Step 3: Start in dependency order
    start_containers_ordered()
    time.sleep(5)
    
    # Step 4: Verify
    remaining = find_conflicts()
    healthy = verify_containers()
    
    result = {
        "initial_conflicts": conflicts,
        "remaining_conflicts": remaining,
        "healthy_containers": healthy,
        "fixed": len(conflicts) > 0 and len(remaining) == 0,
        "timestamp": time.time(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
