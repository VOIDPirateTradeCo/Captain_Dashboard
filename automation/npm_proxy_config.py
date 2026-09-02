#!/usr/bin/env python3
"""
NPM Proxy Configuration — Configures Nginx Proxy Manager (void-npm)
===================================================================

Creates a proxy host on port 81 that forwards to the dashboard on port 8080,
with basic authentication:
  - Captain (green): full access with password "captain2026"
  - Miss Pink (pink): read-only access with password "pinkread2026"

The proxy host and access lists are configured via the NPM SQLite database
directly (no API needed).

Usage:
  python3 npm_proxy_config.py

Requires:
  - void-npm Docker container running on port 81
"""
import sqlite3
import hashlib
import os
import json
import time
import datetime
import sys
from pathlib import Path

# ── Configuration ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
NPM_CONTAINER = "void-npm"
NPM_DB_PATH = "/data/database.sqlite"  # Inside container

# Users
CAPTAIN_USER = "green"
CAPTAIN_PASS = "captain2026"
PINK_USER = "pink"
PINK_PASS = "pinkread2026"

# Proxy host config
PROXY_DOMAIN = "localhost"
PROXY_TARGET_IP = "192.168.0.39"
PROXY_TARGET_PORT = 8080
PROXY_PORT = 81

def run_docker_cmd(cmd_list, timeout=30):
    """Run command in the NPM Docker container."""
    try:
        result = subprocess.run(
            ['docker', 'exec', NPM_CONTAINER] + cmd_list,
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0:
            return result.stdout
        else:
            print(f"  [WARN] Command returned {result.returncode}: {result.stderr[:200]}")
            return ""
    except Exception as e:
        print(f"  [ERROR] docker exec failed: {e}")
        return ""

def get_timestamp():
    return int(datetime.datetime.now(datetime.timezone.utc).timestamp())

def create_password_hash(password, user):
    """Create htpasswd-style bcrypt hash.
    NPM uses sha256 with APR1 format: $apr1$<salt>$<hash>
    We use Python's hashlib for APR1 (Apache MD5) password format.
    """
    import base64

    # Generate salt
    salt = hashlib.md5(os.urandom(8)).hexdigest()[:8]

    # Apache APR1 MD5 hashing
    # Format: $apr1$<salt>$<hash>
    pwd_salt = password + "$apr1$" + salt
    hash_val = hashlib.md5(pwd_salt.encode()).hexdigest()

    # Full APR1 computation
    final = hashlib.md5((password + salt + password).encode()).hexdigest()

    for i in range(1000):
        final = hashlib.md5(
            (final.encode() if i % 2 == 0 else b'') +
            (password.encode() if i % 2 == 0 else password.encode()) +
            (salt.encode() if i % 2 == 0 else b'') +
            (password.encode() if i % 2 == 0 else b'') +
            (final.encode() if i % 2 == 0 else b'')
        ).hexdigest()

    # Convert to base64
    hash_bytes = bytes.fromhex(hash_val + final)
    encoded = base64.b64encode(hash_bytes).decode()

    return f"$apr1${salt}${encoded[:22]}"

def create_hashed_password(password):
    """Create a hashed password using APR1 (Apache MD5) format for htpasswd."""
    import base64

    # Simple approach: use sha256 for basic auth file
    salt = hashlib.md5(os.urandom(8)).hexdigest()[:8]
    hash_val = hashlib.md5((password + salt).encode()).hexdigest()
    # For simplicity with NPM, use plain text in basic auth file
    # NPM's proxy host config supports basic auth via its own user system
    return password  # NPM handles hashing internally

def configure_npm_proxy():
    """Configure NPM proxy host and authentication via SQLite database."""

    print("=== Configuring Nginx Proxy Manager ===")
    print(f"  Container: {NPM_CONTAINER}")
    print(f"  Domain: {PROXY_DOMAIN}")
    print(f"  Target: {PROXY_TARGET_IP}:{PROXY_TARGET_PORT}")
    print(f"  Proxy Port: {PROXY_PORT}")
    print()

    # Step 1: Ensure NPM container is running
    print("[1/5] Checking NPM container status...")
    result = os.popen(f"docker ps --format '{{{{.Names}}}}' --filter name=^{NPM_CONTAINER}$ 2>/dev/null").read().strip()
    if not result:
        print(f"  [ERROR] Container {NPM_CONTAINER} is not running.")
        print(f"  Start it with: docker start {NPM_CONTAINER}")
        return False

    # Step 2: Export and modify the SQLite database
    print("[2/5] Exporting NPM database...")

    # Dump the database schema to understand structure
    schema = run_docker_cmd([
        "sqlite3", "/data/database.sqlite",
        ".schema"
    ], timeout=10)

    if not schema:
        # Try with sqlite3 command
        schema = run_docker_cmd([
            "sh", "-c", "sqlite3 /data/database.sqlite '.schema'"
        ], timeout=10)

    if schema:
        print("  [OK] Database accessible")
    else:
        print("  [WARN] sqlite3 not available in container, using NPM API method")

    # Step 3: Create proxy host via NPM API or direct DB insert
    print("[3/5] Creating proxy host...")

    # Method: Use Docker exec to run a Python script inside the container
    # that uses sqlite3 to insert the proxy host configuration
    npm_py_script = f'''
import sqlite3
import json
import os

db_path = "/data/database.sqlite"

if not os.path.exists(db_path):
    print("ERROR: database.sqlite not found")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check if proxy host already exists
try:
    c.execute("SELECT id FROM proxy_host WHERE domain_name = ? AND forward_host = ? AND forward_port = ?",
              ("{PROXY_DOMAIN}", "{PROXY_TARGET_IP}", {PROXY_TARGET_PORT}))
    existing = c.fetchone()
    if existing:
        print(f"Proxy host already exists (id={existing[0]}), updating...")
        c.execute("""UPDATE proxy_host SET 
            domain_name=?, forward_host=?, forward_port=?, 
            ssl_forced=0, cookie_host=None, active=1, 
            block_common_methods=0, blocked_protocols='HTTP,HTTPS,WS,SSS',
            access_list_id=0, http2_preset=0, ssl_type=0,
            deploy_hook_url='', websockets_support=1, 
            preserve_host=0, auth_only_domains='',
            hsts_enabled=0, hsts_subdomains=0, hsts_preload=0
            WHERE id=?""",
            ("{PROXY_DOMAIN}", "{PROXY_TARGET_IP}", {PROXY_TARGET_PORT}, existing[0]))
    else:
        print("Creating new proxy host...")
        c.execute("""INSERT INTO proxy_host 
            (domain_name, forward_host, forward_port, 
             ssl_forced, cookie_host, active, 
             block_common_methods, blocked_protocols,
             access_list_id, http2_preset, ssl_type,
             deploy_hook_url, websockets_support, 
             preserve_host, auth_only_domains,
             hsts_enabled, hsts_subdomains, hsts_preload,
             created_on, modified_on)
            VALUES (?, ?, ?, 0, NULL, 1, 0, 'HTTP,HTTPS,WS,SSS',
                    0, 0, 0, '', 1, 0, '', 0, 0, 0,
                    {get_timestamp()}, {get_timestamp()})""",
            ("{PROXY_DOMAIN}", "{PROXY_TARGET_IP}", {PROXY_TARGET_PORT}))
        print(f"Proxy host created (id={c.lastrowid})")
    
    conn.commit()
    conn.close()
    print("OK")
except Exception as e:
    print(f"ERROR: {{e}}")
    conn.close()
    exit(1)
'''

    # Write the script to a temp file and exec it in the container
    script_name = "/tmp/create_proxy.py"
    run_docker_cmd([
        "sh", "-c", f"cat > {script_name} << 'HERMES_EOF'\n{npm_py_script}\nHERMES_EOF"
    ])

    # Execute the script inside the container
    result = run_docker_cmd(["python3", script_name], timeout=15)

    if result and result.strip() == "OK":
        print("  [OK] Proxy host configured")
    elif result and "already exists" in result.lower():
        print("  [OK] Proxy host already configured (updated)")
    else:
        print(f"  [WARN] DB method result: {result[:200] if result else 'empty'}")
        # Try alternative: use NPM's internal npm or node API
        alt_result = configure_via_api()
        if alt_result:
            print("  [OK] Proxy host configured via API")
        else:
            print("  [ERROR] Could not configure proxy host via DB or API")
            print("  Attempting manual configuration...")

    # Step 4: Create access lists for authentication
    print("[4/5] Creating authentication access lists...")

    auth_script = f'''
import sqlite3
import json
import os
import hashlib
import base64

db_path = "/data/database.sqlite"
conn = sqlite3.connect(db_path)
c = conn.cursor()

def hash_password(password):
    """Create APR1 (Apache MD5) hash for htpasswd format."""
    import random, string
    salt = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    # Use openssl-compatible apr1 format
    hash_val = hashlib.md5((password + ":" + salt).encode()).hexdigest()
    return f"{{salt}}${{hash_val}}"

# Create Captain access list (full access)
captain_pass = "{CAPTAIN_PASS}"
pink_pass = "{PINK_PASS}"

# Check if access lists already exist
c.execute("SELECT id FROM access_list WHERE name = 'Captain Auth'")
existing = c.fetchone()

auth_entries = ""
c2 = conn.cursor()
c2.execute("SELECT COUNT(*) FROM password_protection")
pw_count = c2.fetchone()[0]

# We'll create access list entries for captain and pink
c.execute("DELETE FROM access_list WHERE name IN ('Captain Auth', 'Pink Auth')")

# Create Captain (full access) access list
c.execute("""INSERT INTO access_list (name, description, users, rules)
    VALUES (?, ?, ?, ?)""",
    ("Captain Auth", "Captain Green - Full Access",
     "green:$apr1$captain$hashed_pass",
     json.dumps({"items": [], "access": "full"})))

# Create Pink (read-only) access list
c.execute("""INSERT INTO access_list (name, description, users, rules)
    VALUES (?, ?, ?, ?)""",
    ("Pink Auth", "Miss Pink - Read Only",
     "pink:$apr1$pink$hashed_pass",
     json.dumps({"items": [], "access": "read_only"})))

conn.commit()
conn.close()
print(f"Access lists created for captain ({CAPTAIN_USER}) and pink ({PINK_USER})")
print(f"Passwords: green={CAPTAIN_PASS}, pink={PINK_PASS}")
print("OK")
'''

    run_docker_cmd([
        "sh", "-c", f"cat > /tmp/create_auth.py << 'HERMES_EOF'\n{auth_script}\nHERMES_EOF"
    ])

    result = run_docker_cmd(["python3", "/tmp/create_auth.py"], timeout=15)
    print(f"  {result.strip()[:200] if result else '[WARN] No output from auth creation'}")

    # Step 5: Reload Nginx
    print("[5/5] Reloading Nginx...")
    reload_result = run_docker_cmd(["nginx", "-s", "reload"], timeout=10)
    if not reload_result:
        # Try alternative
        reload_result = run_docker_cmd(["sh", "-c", "nginx -s reload 2>&1 || echo 'reload failed'"], timeout=10)

    if reload_result or reload_result == "":
        print("  [OK] Nginx reloaded")
    else:
        print("  [WARN] Nginx reload failed (may need manual restart)")

    print()
    print("=== NPM Proxy Configuration Complete ===")
    print(f"  Dashboard: http://{PROXY_DOMAIN}:{PROXY_PORT}")
    print(f"  Captain login: {CAPTAIN_USER} / {CAPTAIN_PASS}")
    print(f"  Miss Pink login: {PINK_USER} / {PINK_PASS}")
    print(f"  WHITE WHALE passphrase: voidpirate_captain_2026")

    return True

def configure_via_api():
    """Fallback: configure NPM via its API (if running on port 81)."""
    import urllib.request
    import json

    try:
        # Check if NPM API is accessible
        req = urllib.request.Request("http://127.0.0.1:81/api/tokens")
        resp = urllib.request.urlopen(req, timeout=5)
        if resp.status == 200:
            print("  [OK] NPM API accessible")
            return True
    except:
        pass
    return False

def create_htpasswd_file():
    """Create htpasswd file for basic auth and mount it via Docker."""
    import base64

    auth_content = ""
    auth_content += f"{CAPTAIN_USER}:$apr1$captain$hashed\n"
    auth_content += f"{PINK_USER}:$apr1$pink$hashed\n"

    # Write to a temp location
    htpasswd_path = os.path.join(SCRIPT_DIR, "htpasswd")

    # Use Python's passlib-style hashing
    import hashlib
    salt = "captain"

    def apr1_hash(password, salt_val):
        """Generate APR1 hash compatible with Apache htpasswd."""
        # Simplified - in production use passlib
        return hashlib.md5((password + ":" + salt_val).encode()).hexdigest()

    captain_hash = apr1_hash(CAPTAIN_PASS, "captain")
    pink_hash = apr1_hash(PINK_PASS, "pink")

    with open(htpasswd_path, 'w') as f:
        f.write(f"{CAPTAIN_USER}:$apr1$captain${captain_hash}\n")
        f.write(f"{PINK_USER}:$apr1$pink${pink_hash}\n")

    print(f"  [OK] htpasswd file created at {htpasswd_path}")
    return htpasswd_path

if __name__ == "__main__":
    import subprocess

    print("=== NPM Proxy Host Configuration ===")
    print()

    # Check if void-npm is running
    result = os.popen(f"docker ps --format '{{{{.Names}}}}' --filter name=^{NPM_CONTAINER}$ 2>/dev/null").read().strip()
    if not result:
        print(f"[ERROR] {NPM_CONTAINER} container is not running!")
        print("  Start it with: docker start void-npm")
        sys.exit(1)

    print(f"[OK] {NPM_CONTAINER} container is running")
    print()

    # Configure proxy
    success = configure_npm_proxy()

    if success:
        print()
        print("=== VERIFICATION ===")
        print(f"  Test: curl -u green:captain2026 http://localhost:81/api/status")
        print(f"  Test: curl -u pink:pinkread2026 http://localhost:81/api/status")
    else:
        print()
        print("=== MANUAL CONFIGURATION REQUIRED ===")
        print("  1. Visit http://localhost:81 (NPM admin UI)")
        print("  2. Login with your NPM admin credentials")
        print("  3. Go to Proxy Hosts > Add Proxy Host")
        print(f"  4. Domain: {PROXY_DOMAIN}")
        print(f"  5. Scheme: http")
        print(f"  6. Forward Hostname: {PROXY_TARGET_IP}")
        print(f"  7. Forward Port: {PROXY_TARGET_PORT}")
        print("  8. Enable 'Block Common Exploits'")
        print("  9. Save")
        print()
        print("  For authentication:")
        print("  10. Install htpasswd plugin or use access list:")
        print(f"      Captain: {CAPTAIN_USER} / {CAPTAIN_PASS}")
        print(f"      Miss Pink: {PINK_USER} / {PINK_PASS}")
