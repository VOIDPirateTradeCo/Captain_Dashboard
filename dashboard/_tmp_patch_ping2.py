from pathlib import Path
p = Path('dashboard_server.py')
lines = p.read_text(encoding='utf-8').splitlines()
# replace lines 336-350 inclusive
new = [
    'def ping_fast(host, count=1, timeout=3):',
    '    """Fast ping to measure latency."""',
    '    try:',
    '        result = subprocess.run(',
    "            ['ping', '-n', str(count), host],",
    '            capture_output=True, text=True, timeout=timeout',
    '        )',
    '        if result.returncode == 0:',
    "            m = re.search(r'Average\\s*=?\\s*(\\d+)ms', result.stdout, re.IGNORECASE)",
    "            if not m:",
    "                m = re.search(r'Minimum\\s*=?\\s*(\\d+)ms', result.stdout, re.IGNORECASE)",
    "            if not m:",
    "                m = re.search(r'time[<=]\\s*(\\d+)ms', result.stdout, re.IGNORECASE)",
    '            if m:',
    '                return m.group(1) + "ms"',
    '            return "—"',
    '        return "—"',
    '    except Exception:',
    '        return "—"',
]
if lines[335].strip() != 'def ping_fast(host, count=1, timeout=3):':
    raise SystemExit('unexpected start line: ' + repr(lines[335]))
lines[335:351] = new
p.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('patched ping_fast')
