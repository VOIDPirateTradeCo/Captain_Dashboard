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
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) != 0


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


EXPECTED_PORTS = {5001, 3002, 8080, 8081, 2375, 2376, 9090, 5453}

def main() -> None:
    all_used = [port for port in CONFLICT_PORTS if not is_port_free(port)]
    unexpected = [port for port in all_used if port not in EXPECTED_PORTS]
    print(json.dumps({
        "expected_ports_in_use": [p for p in all_used if p in EXPECTED_PORTS],
        "unexpected_conflicts_initial": unexpected,
        "timestamp": time.time(),
    }, indent=2))
    if unexpected:
        restart_sequence()
        time.sleep(5)
        remaining_all = [port for port in CONFLICT_PORTS if not is_port_free(port)]
        remaining_unexpected = [port for port in remaining_all if port not in EXPECTED_PORTS]
        print(json.dumps({
            "unexpected_conflicts_remaining": remaining_unexpected,
            "healthy_containers": verify_containers(),
            "timestamp": time.time(),
        }, indent=2))


if __name__ == "__main__":
    main()
