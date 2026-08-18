"""Fix Windows hosts file DNS entries for crew hostnames.
Requires Administrator privileges.
"""
import os
import sys

HOSTS_PATH = r'C:\Windows\System32\drivers\etc\hosts'
ENTRIES = [
    '\n# VOID Pirate Fleet DNS entries',
    '192.168.0.39 squidstation.void.local',
    '100.106.235.103 pinkcady.taile6676f.ts.net pinkcady',
    '100.110.238.68 stealthattack.taile6676f.ts.net stealthattack',
    '100.71.174.28 squidstation-docker-desktop.taile6676f.ts.net toruslaptop',
]

def main():
    if os.name != 'nt':
        print('This script is for Windows only')
        sys.exit(1)
    
    # Check admin
    try:
        is_admin = os.getuid() == 0
    except AttributeError:
        import ctypes
        is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
    
    if not is_admin:
        print('ERROR: This script requires Administrator privileges')
        print('Right-click PowerShell > Run as Administrator, then run:')
        print(f'  python {os.path.abspath(__file__)}')
        sys.exit(1)
    
    # Read existing hosts
    with open(HOSTS_PATH, 'r') as f:
        content = f.read()
    
    # Check if entries already exist
    existing = []
    for entry in ENTRIES:
        if entry and not entry.startswith('#') and entry in content:
            existing.append(entry)
    
    if existing:
        print(f'Entries already exist: {existing}')
        print('Skipping...')
        return
    
    # Append entries
    with open(HOSTS_PATH, 'a') as f:
        f.write('\n'.join(ENTRIES) + '\n')
    
    print('Hosts file updated successfully')
    print('Verify with: nslookup pinkcady, nslookup stealthattack')

if __name__ == '__main__':
    main()
