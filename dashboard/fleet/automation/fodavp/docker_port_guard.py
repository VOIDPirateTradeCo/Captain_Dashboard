import json
import subprocess
import time
import urllib.request
from typing import List

CONFLICT_PORTS = [5000, 5001, 3000, 3001, 3002, 8080, 8081, 2375, 2376]
CONTAINERS = [
    "void-treasuremap-backend",
    "void-netbox",
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


def stop_conflicting() -> None:
    for container in CONTAINERS:
        try:
            docker("stop", container)
        except subprocess.CalledProcessError:
            pass


def restart_sequence() -> None:
    stop_conflicting()
    time.sleep(5)
    for container in CONTAINERS:
        try:
            docker("start", container)
        except subprocess.CalledProcessError:
            pass


def main() -> None:
    conflicts = find_conflicts()
    print(json.dumps({"conflicts": conflicts, "timestamp": time.time()}, indent=2))
    if conflicts:
        restart_sequence()
        time.sleep(5)
        conflicts = find_conflicts()
        print(json.dumps({"conflicts_after": conflicts, "timestamp": time.time()}, indent=2))


if __name__ == "__main__":
    main()
