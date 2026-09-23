"""
Self-contained heartbeat daemon for crew agent nodes.
Run on each machine to report status to Master MC.
"""
import time
import sys
import os
import json
import subprocess
from pathlib import Path
from urllib import request, error, parse


MASTER_HOST = os.environ.get('MASTER_HOST', 'http://192.168.0.39:3100')
AGENT_ID = os.environ.get('CREW_AGENT_ID', '')
AGENT_NAME = os.environ.get('CREW_AGENT_NAME', '')
API_KEY = os.environ.get('AGENT_API_KEY', 'd5136b530f878123aba1d321c6972888b5181f7f13d0afa58d55c732f0bf989f')
CAPABILITIES = [c for c in (os.environ.get('CREW_CAPABILITIES', '').split(',')) if c]
INTERVAL = int(os.environ.get('HEATBEAT_INTERVAL', '30'))


def api_call(method, path, data=None):
    url = f'{MASTER_HOST}{path}'
    body = json.dumps(data).encode() if data else None
    headers = {
        'Content-Type': 'application/json',
        'x-agent-api-key': API_KEY,
        'Origin': os.environ.get('AGENT_ORIGIN', 'http://192.168.0.39:3100')
    }
    req = request.Request(url, data=body, method=method, headers=headers)
    try:
        with request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except error.HTTPError as e:
        return e.code, {'error': str(e)}
    except Exception as e:
        return 0, {'error': str(e)}


def get_container_count():
    try:
        result = subprocess.run(['docker', 'ps', '--format', '{{.Names}}'], capture_output=True, text=True)
        if result.returncode == 0:
            return len([l for l in result.stdout.strip().split('\n') if l])
    except Exception:
        pass
    return 0


def get_system_info():
    try:
        result = subprocess.run(['wmic', 'os', 'get', 'Caption,TotalVisibleMemorySize', '/format:csv'], capture_output=True, text=True)
        lines = [l.strip() for l in result.stdout.strip().split('\n') if l.strip() and 'Caption' not in l]
        if lines:
            parts = lines[-1].split(',')
            return {'os': parts[1] if len(parts) > 1 else 'unknown', 'containers': get_container_count()}
    except Exception:
        pass
    return {'os': 'unknown', 'containers': 0}


def register():
    status, data = api_call('POST', '/api/agents/node/register', {
        'agentId': AGENT_ID,
        'name': AGENT_NAME,
        'capabilities': CAPABILITIES
    })
    return status in (200, 201)


def heartbeat():
    path = '/api/agents/node/' + parse.quote(AGENT_NAME) + '/heartbeat'
    status, data = api_call('POST', path, {'status': 'online'})
    return status == 200


def poll_tasks():
    path = '/api/agents/node/' + parse.quote(AGENT_NAME)
    status, data = api_call('GET', path)
    if status == 200:
        return data.get('tasks', [])
    return []


def main():
    if not AGENT_ID or not AGENT_NAME:
        print('ERROR: Set CREW_AGENT_ID and CREW_AGENT_NAME')
        sys.exit(1)
    print(f'[{AGENT_NAME}] Heartbeat daemon starting...')
    print(f'  Master MC: {MASTER_HOST}')
    print(f'  Agent ID: {AGENT_ID}')
    print(f'  Interval: {INTERVAL}s')
    
    # Register
    if register():
        print(f'  Register: ✓')
    else:
        print(f'  Register: ✗ (will retry)')
    
    # Main loop
    while True:
        try:
            if heartbeat():
                print(f'  Heartbeat: ✓')
            else:
                print(f'  Heartbeat: ✗')
            
            # Check for tasks
            tasks = poll_tasks()
            if tasks:
                print(f'  Tasks: {len(tasks)} pending')
        except Exception as e:
            print(f'  Error: {e}')
        
        time.sleep(INTERVAL)


if __name__ == '__main__':
    main()
