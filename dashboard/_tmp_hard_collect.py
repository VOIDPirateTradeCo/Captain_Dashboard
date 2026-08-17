from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
old = '''def _collect_full_data():
    """Do the full data collection — blocking, used by prewarm thread."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ships = {}
    ship_details = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        ship_futures = {}
        for ship_name, ship_info in KNOWN_SHIPS.items():
            ship_futures[executor.submit(check_ship_ip, ship_info["ip"])] = ship_name

        for future in as_completed(ship_futures):
            ship_name = ship_futures[future]
            ip = KNOWN_SHIPS[ship_name]["ip"]
            status = future.result()
            ships[ship_name] = status
            ship_details[ship_name] = {
                "ip": ip,
                "status": status,
                "role": KNOWN_SHIPS[ship_name]["role"],
                "ports": [],
                "latency": "down",
            }

        # Latency for online ships
        latency_futures = {}
        for ship_name, ship_info in KNOWN_SHIPS.items():
            if ships[ship_name] == "online":
                latency_futures[executor.submit(ping_fast, ship_info["ip"], timeout=3)] = ship_name

        for future in as_completed(latency_futures):
            ship_name = latency_futures[future]
            try:
                ship_details[ship_name]["latency"] = future.result(timeout=5)
            except:
                pass

    # --- NETWORK PORTS (fast, cached) ---
    ports = {}
    for p in [80, 81, 2376, 9999, 8080]:
        ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
    ports["pinkcady_8080"] = check_port_fast(PINK_IP, 8080, timeout=0.5)
    # --- LOCAL MONITORING STACK (Grafana/Prometheus/cAdvisor/Kuma) — truthful status ---
    for p, name in [(3002, "grafana"), (9090, "prometheus"), (8081, "cadvisor"),
                    (3001, "kuma"), (8188, "comfyui_art")]:
        ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
        ports[f"{name}_{p}"] = ports[f"port_{p}"]

    # --- NETWORK DISCOVERY (use cache or trigger async) ---
    devices = discover_network()
    # Trigger async port scan on devices if needed
    cached_ports = cache_get('device_ports')
    if cached_ports is None:
        threading.Thread(target=_async_scan_device_ports, daemon=True).start()
        cached_ports = {}

    # Enrich devices with ports
    devices_with_ports = []
    for d in devices:
        d_copy = dict(d)
        d_copy["ports"] = cached_ports.get(d["ip"], [])
        devices_with_ports.append(d_copy)

    # Add ports to ship details
    for ship_name in ship_details:
        ip = ship_details[ship_name]["ip"]
        ship_details[ship_name]["ports"] = cached_ports.get(ip, []) or cached_ports.get(ship_name.lower(), [])

    # --- DOCKER (use cache, fallback to fast scan) ---
    try:
        docker = get_docker_containers()
    except Exception:
        docker = cache_get('docker_containers') or {"total": 0, "running": 0, "fleet": 0, "security": 0, "k8s": 0, "names": []}

    # --- HEALTH CHECK (cached only) ---
    health = get_health_check()

    # --- GIT + VAULT (cached only) ---
    try:
        git_info = get_git_status()
        vault_stats = get_vault_stats()
    except Exception:
        git_info = cache_get('vault_git') or {"latest_commit": "unknown", "uncommitted": 0}
        vault_stats = {"files": 0, "size_mb": 0}

    # --- OPSEC (skip if slow) ---
    try:
        opsec = check_opsec()
    except Exception:
        opsec = {}

    # --- COMMS ---
    try:
        inboxes = get_inbox_counts()
    except Exception:
        inboxes = {}'''
new = '''def _collect_full_data():
    """Do the full data collection — blocking, used by prewarm thread."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ships = {}
    ship_details = {}
    try:
        with ThreadPoolExecutor(max_workers=8) as executor:
            ship_futures = {}
            for ship_name, ship_info in KNOWN_SHIPS.items():
                ship_futures[executor.submit(check_ship_ip, ship_info["ip"])] = ship_name

            for future in as_completed(ship_futures):
                ship_name = ship_futures[future]
                ip = KNOWN_SHIPS[ship_name]["ip"]
                try:
                    status = future.result(timeout=8)
                except Exception:
                    status = "offline"
                ships[ship_name] = status
                ship_details[ship_name] = {
                    "ip": ip,
                    "status": status,
                    "role": KNOWN_SHIPS[ship_name]["role"],
                    "ports": [],
                    "latency": "down",
                }

            # Latency for online ships
            latency_futures = {}
            for ship_name, ship_info in KNOWN_SHIPS.items():
                if ships.get(ship_name) == "online":
                    latency_futures[executor.submit(ping_fast, ship_info["ip"], timeout=3)] = ship_name

            for future in as_completed(latency_futures):
                ship_name = latency_futures[future]
                try:
                    ship_details[ship_name]["latency"] = future.result(timeout=5)
                except Exception:
                    pass
    except Exception:
        for ship_name, ship_info in KNOWN_SHIPS.items():
            ships.setdefault(ship_name, "offline")
            ship_details.setdefault(ship_name, {
                "ip": ship_info["ip"],
                "status": "offline",
                "role": ship_info["role"],
                "ports": [],
                "latency": "down",
            })

    # --- NETWORK PORTS (fast, cached) ---
    ports = {}
    try:
        for p in [80, 81, 2376, 9999, 8080]:
            ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
        ports["pinkcady_8080"] = check_port_fast(PINK_IP, 8080, timeout=0.5)
        # --- LOCAL MONITORING STACK (Grafana/Prometheus/cAdvisor/Kuma) — truthful status ---
        for p, name in [(3002, "grafana"), (9090, "prometheus"), (8081, "cadvisor"),
                        (3001, "kuma"), (8188, "comfyui_art")]:
            ports[f"port_{p}"] = check_port_fast(SQUID_IP, p, timeout=0.5)
            ports[f"{name}_{p}"] = ports[f"port_{p}"]
    except Exception:
        pass

    # --- NETWORK DISCOVERY (use cache or trigger async) ---
    devices = []
    try:
        devices = discover_network()
    except Exception:
        devices = []
    # Trigger async port scan on devices if needed
    cached_ports = cache_get('device_ports')
    if cached_ports is None:
        try:
            threading.Thread(target=_async_scan_device_ports, daemon=True).start()
        except Exception:
            pass
        cached_ports = {}

    # Enrich devices with ports
    devices_with_ports = []
    for d in devices:
        d_copy = dict(d)
        d_copy["ports"] = cached_ports.get(d["ip"], [])
        devices_with_ports.append(d_copy)

    # Add ports to ship details
    for ship_name in ship_details:
        ip = ship_details[ship_name]["ip"]
        ship_details[ship_name]["ports"] = cached_ports.get(ip, []) or cached_ports.get(ship_name.lower(), [])

    # --- DOCKER (use cache, fallback to fast scan) ---
    try:
        docker = get_docker_containers()
    except Exception:
        docker = cache_get('docker_containers') or {"total": 0, "running": 0, "fleet": 0, "security": 0, "k8s": 0, "names": []}

    # --- HEALTH CHECK (cached only) ---
    try:
        health = get_health_check()
    except Exception:
        health = cache_get('health_check') or {"status": "unknown"}

    # --- GIT + VAULT (cached only) ---
    try:
        git_info = get_git_status()
        vault_stats = get_vault_stats()
    except Exception:
        git_info = cache_get('vault_git') or {"latest_commit": "unknown", "uncommitted": 0}
        vault_stats = {"files": 0, "size_mb": 0}

    # --- OPSEC (skip if slow) ---
    try:
        opsec = check_opsec()
    except Exception:
        opsec = {}

    # --- COMMS ---
    try:
        inboxes = get_inbox_counts()
    except Exception:
        inboxes = {}'''
if old not in text:
    raise SystemExit('collect_public_data block not found')
p.write_text(text.replace(old, new), encoding='utf-8')
print('hardened _collect_full_data')
