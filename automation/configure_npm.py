#!/usr/bin/env python3
"""Configure NPM proxy host for dashboard on port 81 -> 8080 with auth.
Replaces NPM admin interface on port 81 with dashboard proxy + auth.
Auth: Captain (captain:password1 full), Pink (pink:pinkread2026 read-only)
"""
import subprocess
import tempfile
import os

NPM_CONTAINER = "void-npm"
DASHBOARD_HOST = "192.168.0.39"
DASHBOARD_PORT = "8080"

def configure_npm():
    """Write nginx config directly to override NPM's admin interface on port 81."""

    # Generate htpasswd file with both users
    captain_hash = subprocess.run(
        ['openssl', 'passwd', '-apr1', 'password1'],
        capture_output=True, text=True
    ).stdout.strip()

    pink_hash = subprocess.run(
        ['openssl', 'passwd', '-apr1', 'pinkread2026'],
        capture_output=True, text=True
    ).stdout.strip()

    htpasswd_content = f"captain:{captain_hash}\npink:{pink_hash}\n"

    # Write htpasswd file to temp and copy into container
    with tempfile.NamedTemporaryFile(mode='w', suffix='.htpasswd', delete=False, dir=Path(__file__).resolve().parent.parent / 'state') as f:
        f.write(htpasswd_content)
        tmp_htpasswd = f.name

    try:
        subprocess.run(['docker', 'exec', NPM_CONTAINER, 'mkdir', '-p', '/data/nginx/htpasswd'],
                       capture_output=True, timeout=10)
        subprocess.run(['docker', 'cp', tmp_htpasswd, f'{NPM_CONTAINER}:/data/nginx/htpasswd/dashboard.htpasswd'],
                       capture_output=True, timeout=10)
    finally:
        os.unlink(tmp_htpasswd)

    # Create nginx config that overrides the NPM admin on port 81
    # Using default_server to take precedence over NPM's default
    nginx_config = f"""# Void Pirate Captain Dashboard - Proxy with Auth
# Overrides NPM admin interface on port 81
server {{
    listen 81 default_server;
    listen [::]:81 default_server;
    server_name _;

    auth_basic "VOID Pirate Captain — WHITE WHALE Access Required";
    auth_basic_user_file /data/nginx/htpasswd/dashboard.htpasswd;

    location / {{
        proxy_pass http://{DASHBOARD_HOST}:{DASHBOARD_PORT};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Scheme $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
    }}
}}
"""

    # Write config to temp file and copy into container
    with tempfile.NamedTemporaryFile(mode='w', suffix='.conf', delete=False, dir=Path(__file__).resolve().parent.parent / 'state') as f:
        f.write(nginx_config)
        tmp_conf = f.name

    try:
        subprocess.run(['docker', 'cp', tmp_conf, f'{NPM_CONTAINER}:/etc/nginx/conf.d/dashboard_proxy.conf'],
                       capture_output=True, timeout=10)
    finally:
        os.unlink(tmp_conf)

    print("✅ Nginx config written")
    print(f"  Port 81 (default_server) -> {DASHBOARD_HOST}:{DASHBOARD_PORT}")
    print(f"  Auth: captain/password1 (full), pink/pinkread2026 (read-only)")

    # Fix the production.conf to remove conflicting default_server on IPv6
    fix_production_conf()

    # Test nginx config
    print("Testing nginx config...")
    t = subprocess.run(['docker', 'exec', NPM_CONTAINER, 'nginx', '-t'],
                       capture_output=True, text=True, timeout=10)
    print(f"  nginx -t: {t.stdout.strip()} {t.stderr.strip()}")

    if t.returncode == 0:
        # Reload Nginx
        print("Reloading Nginx...")
        r = subprocess.run(['docker', 'exec', NPM_CONTAINER, 'nginx', '-s', 'reload'],
                           capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            print("✅ Nginx reloaded successfully")
        else:
            print(f"⚠️ Nginx reload: {r.stderr.strip() or 'OK'}")
    else:
        print("❌ nginx -t failed — check config")


def fix_production_conf():
    """Remove conflicting default_server from production.conf on port 81."""
    try:
        # Fix IPv4: remove 'default_server' if it's there
        subprocess.run(['docker', 'exec', NPM_CONTAINER, 'sed', '-i',
                        's/listen 81 default_server;/listen 81;/g',
                        '/etc/nginx/conf.d/production.conf'],
                       capture_output=True, timeout=10)
        # Fix IPv6: remove 'default_server' if it's there
        subprocess.run(['docker', 'exec', NPM_CONTAINER, 'sed', '-i',
                        's/listen \\[::\\]:81 default_server;/listen [::]:81;/g',
                        '/etc/nginx/conf.d/production.conf'],
                       capture_output=True, timeout=10)
        # Also handle without explicit 'default_server' text (production.conf might just have 'default')
        subprocess.run(['docker', 'exec', NPM_CONTAINER, 'sed', '-i',
                        's/listen [::]:81 default;/listen [::]:81;/g',
                        '/etc/nginx/conf.d/production.conf'],
                       capture_output=True, timeout=10)
    except Exception as e:
        print(f"⚠️  Could not fix production.conf: {e}")


if __name__ == "__main__":
    configure_npm()
